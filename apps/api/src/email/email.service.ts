import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Resend } from "resend";
import { Player } from "../players/player.entity";
import { Session } from "../sessions/session.entity";
import { SessionPlayer } from "../sessions/session-player.entity";
import { EMAIL_EVENT, type SessionRecapReadyEvent } from "./email.events";
import {
  getSessionRecapTemplate,
  type RecapRow,
} from "./templates/session-recap.template";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly webOrigin: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Player)
    private readonly players: Repository<Player>,
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(SessionPlayer)
    private readonly sessionPlayers: Repository<SessionPlayer>,
  ) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.fromEmail = this.config.get<string>(
      "RESEND_FROM_EMAIL",
      "noreply@z-poker.app",
    );
    this.webOrigin = this.config.get<string>(
      "WEB_ORIGIN",
      "http://localhost:3030",
    );

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log("Email service initialized (Resend)");
    } else {
      this.resend = null;
      this.logger.warn("RESEND_API_KEY not set — emails disabled");
    }
  }

  isEnabled(): boolean {
    return this.resend !== null;
  }

  @OnEvent(EMAIL_EVENT.SESSION_RECAP_READY, { async: true })
  async handleRecapReady(event: SessionRecapReadyEvent): Promise<void> {
    if (!this.resend) return;

    try {
      await this.sendSessionRecap(event.sessionId);
    } catch (err) {
      this.logger.error(
        `Failed to send recap emails for session ${event.sessionId}: ${(err as Error).message}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private async sendSessionRecap(sessionId: string): Promise<void> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session) {
      this.logger.warn(`Session ${sessionId} not found — skipping recap`);
      return;
    }
    if (!session.isLocked) {
      this.logger.warn(`Session ${sessionId} not locked — skipping recap`);
      return;
    }

    const sps = await this.sessionPlayers.find({ where: { sessionId } });
    if (sps.length === 0) {
      this.logger.warn(`Session ${sessionId} has no players — skipping recap`);
      return;
    }

    const playerIds = sps.map((sp) => sp.playerId);
    const players = await this.players.find({ where: { id: In(playerIds) } });
    const playerById = new Map(players.map((p) => [p.id, p]));

    const buyIn = Number(session.buyIn);
    const playedDate = toDateString(session.playedDate);
    const createdAt = session.createdAt;

    const ranked = [...sps].sort(
      (a, b) => (b.chipsEnd ?? 0) - (a.chipsEnd ?? 0),
    );

    const sessionUrl = `${this.webOrigin}/session/${sessionId}`;
    const highlightsReady = Boolean(session.highlights?.items?.length);
    const mcName = session.highlights?.personaName?.vi ?? null;

    // Resend free tier: 2 req/sec. Space sends ~600ms apart to stay safely under.
    const SEND_INTERVAL_MS = 600;
    let isFirst = true;

    for (const recipient of players) {
      if (!isFirst) await sleep(SEND_INTERVAL_MS);
      isFirst = false;

      const rows: RecapRow[] = ranked.map((sp) => {
        const p = playerById.get(sp.playerId);
        const chipsEnd = sp.chipsEnd ?? 0;
        const eloBefore = sp.eloBefore ?? 0;
        const eloAfter = sp.eloAfter ?? eloBefore;
        return {
          name: p?.name ?? "—",
          chipsEnd,
          chipDelta: chipsEnd - buyIn,
          eloBefore,
          eloAfter,
          eloChange: eloAfter - eloBefore,
          isRecipient: sp.playerId === recipient.id,
        };
      });

      const template = getSessionRecapTemplate({
        recipientName: recipient.name,
        playedDate,
        createdAt,
        buyIn,
        rows,
        sessionUrl,
        highlightsReady,
        mcName,
      });

      await this.sendWithRetry(recipient.email, template, sessionId);
    }
  }

  private async sendWithRetry(
    to: string,
    template: { subject: string; html: string; text: string },
    sessionId: string,
  ): Promise<void> {
    const MAX_ATTEMPTS = 4;
    let backoffMs = 1100;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const sendResult = await this.resend!.emails.send({
          from: this.fromEmail,
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        if (!sendResult.error) {
          this.logger.debug(
            `Recap email sent to ${to} (session ${sessionId})`,
          );
          return;
        }

        const isRateLimit = sendResult.error.name === "rate_limit_exceeded";
        if (isRateLimit && attempt < MAX_ATTEMPTS) {
          this.logger.warn(
            `Rate limited sending to ${to}, retrying in ${backoffMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})`,
          );
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }

        this.logger.error(
          `Resend rejected email to ${to}: [${sendResult.error.name}] ${sendResult.error.message}`,
        );
        return;
      } catch (err) {
        this.logger.error(
          `Failed to send recap to ${to}: ${(err as Error).message}`,
        );
        return;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toDateString(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}
