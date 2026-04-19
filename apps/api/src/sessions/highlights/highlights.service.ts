import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { Session } from "../session.entity";
import { SessionPlayer } from "../session-player.entity";
import { Player } from "../../players/player.entity";
import {
  PlayersService,
  type PlayerHistoryEntryDto,
} from "../../players/players.service";
import { AiService } from "../../ai/ai.service";
import { SessionsEventsService } from "../sessions.events";
import type { SessionHighlights } from "./highlights.types";
import { selectPersonaByDate, type McPersona } from "./personas";

interface PlayerContext {
  playerId: string;
  name: string;
  chipsEnd: number;
  chipDelta: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  isFirstTimer: boolean;
  history: Array<{
    playedDate: string;
    buyIn: number;
    chipsEnd: number;
    eloBefore: number;
    eloAfter: number;
    result: "win" | "loss" | "tie";
  }>;
}

const localizedSchema = () => ({
  type: SchemaType.OBJECT as const,
  properties: {
    vi: { type: SchemaType.STRING as const },
    en: { type: SchemaType.STRING as const },
  },
  required: ["vi", "en"],
});

const HIGHLIGHTS_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          playerId: { type: SchemaType.STRING },
          playerName: { type: SchemaType.STRING },
          title: localizedSchema(),
          body: localizedSchema(),
          emoji: { type: SchemaType.STRING },
        },
        required: ["playerId", "playerName", "title", "body", "emoji"],
      },
    },
  },
  required: ["items"],
};

@Injectable()
export class HighlightsService {
  private readonly logger = new Logger(HighlightsService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @InjectRepository(SessionPlayer)
    private readonly sessionPlayers: Repository<SessionPlayer>,
    private readonly playersService: PlayersService,
    private readonly ai: AiService,
    private readonly events: SessionsEventsService,
  ) {}

  async generateForSession(sessionId: string, domain: string): Promise<void> {
    try {
      const contexts = await this.buildPlayerContexts(sessionId, domain);
      if (contexts.length === 0) {
        this.logger.warn(`No players in session ${sessionId}, skipping`);
        return;
      }

      const session = await this.sessions.findOne({ where: { id: sessionId } });
      if (!session) return;

      const targetCount = Math.max(2, Math.min(6, Math.ceil(contexts.length / 2)));
      const persona = selectPersonaByDate(session.playedDate);
      const prompt = this.buildPrompt(
        session.buyIn,
        session.playedDate,
        contexts,
        targetCount,
        persona,
      );
      const raw = await this.ai.generateJson<{
        items: SessionHighlights["items"];
      }>(prompt, { schema: HIGHLIGHTS_SCHEMA });

      const highlights: SessionHighlights = {
        generatedAt: new Date().toISOString(),
        model: this.ai.getDefaultModel(),
        items: (raw.items ?? []).slice(0, targetCount),
        personaId: persona.id,
        personaName: persona.displayName,
      };

      await this.sessions.update({ id: sessionId }, { highlights });
      this.events.publish({ type: "session.highlights_ready", domain, sessionId });
      this.logger.log(`Highlights generated for session ${sessionId}`);
    } catch (err) {
      this.logger.error(`Highlights generation failed for ${sessionId}`, err);
    }
  }

  private async buildPlayerContexts(
    sessionId: string,
    domain: string,
  ): Promise<PlayerContext[]> {
    const rows = await this.sessionPlayers
      .createQueryBuilder("sp")
      .innerJoin(Player, "p", "p.id = sp.player_id")
      .innerJoin(Session, "s", "s.id = sp.session_id")
      .select([
        'sp.player_id AS "playerId"',
        'p.name AS "name"',
        'sp.chips_end AS "chipsEnd"',
        'sp.elo_before AS "eloBefore"',
        'sp.elo_after AS "eloAfter"',
        's.buy_in AS "buyIn"',
      ])
      .where("sp.session_id = :sessionId", { sessionId })
      .andWhere("s.domain = :domain", { domain })
      .getRawMany<{
        playerId: string;
        name: string;
        chipsEnd: number | null;
        eloBefore: number | null;
        eloAfter: number | null;
        buyIn: number;
      }>();

    const contexts: PlayerContext[] = [];
    for (const r of rows) {
      if (r.chipsEnd === null || r.eloBefore === null || r.eloAfter === null) {
        continue;
      }
      const history = await this.playersService.getHistory(r.playerId, domain, 10);
      const mapped = this.mapHistory(r.playerId, history, sessionId);
      contexts.push({
        playerId: r.playerId,
        name: r.name,
        chipsEnd: r.chipsEnd,
        chipDelta: r.chipsEnd - Number(r.buyIn),
        eloBefore: r.eloBefore,
        eloAfter: r.eloAfter,
        eloChange: r.eloAfter - r.eloBefore,
        isFirstTimer: mapped.length === 0,
        history: mapped,
      });
    }
    return contexts;
  }

  private mapHistory(
    _playerId: string,
    history: PlayerHistoryEntryDto[],
    currentSessionId: string,
  ): PlayerContext["history"] {
    return history
      .filter((h) => h.session.id !== currentSessionId && h.session.isLocked)
      .map((h) => {
        const chipsEnd = h.chipsEnd ?? 0;
        const buyIn = h.session.buyIn;
        const result: "win" | "loss" | "tie" =
          chipsEnd > buyIn ? "win" : chipsEnd < buyIn ? "loss" : "tie";
        return {
          playedDate: h.session.playedDate,
          buyIn,
          chipsEnd,
          eloBefore: h.eloBefore ?? 0,
          eloAfter: h.eloAfter ?? 0,
          result,
        };
      });
  }

  private buildPrompt(
    buyIn: number,
    playedDate: string,
    contexts: PlayerContext[],
    targetCount: number,
    persona: McPersona,
  ): string {
    const playersJson = JSON.stringify(contexts, null, 2);
    const toneBlock = persona.toneExamples.map((t) => `- "${t}"`).join("\n");
    return `${persona.voiceIntro}

Session hôm nay (${playedDate}), buy-in ${buyIn} chip/người, ${contexts.length} người chơi. Dưới đây là data session này + lịch sử 10 session gần nhất của từng người chơi (history có thể rỗng nếu người đó mới chơi lần đầu).

Nhiệm vụ: viết ĐÚNG ${targetCount} highlight troll nhất của ngày. Mỗi highlight gán vào 1 player cụ thể. Bắt đúng pattern:
- Thắng/thua liên tục (>=3 session liên tiếp nhìn từ history) → "Thần bài nhập" / "Sao thua hoài vậy"
- Comeback (thua chuỗi rồi thắng giòn giã) → "Trở lại và lợi hại hơn xưa"
- Thắng đậm (chipDelta to nhất bàn) → "Nhà vô địch chip", "Đè bàn hốt cú lớn"
- Thua đậm (chipDelta âm nhất) → "Chip feeder của ngày", "Nhà tài trợ kim cương"
- Đang bay thì rớt (thắng streak xong thua session này) → "Đang bay sao rớt vậy?"
- Bất ngờ (người thường thua bỗng thắng) → "Cá con hoá cá mập"
- Hoà/huề vốn buồn cười → "Về đúng vạch xuất phát"
- LẦN ĐẦU RA TRẬN (history rỗng hoặc null): angle riêng → "Lính mới nhập môn" / "Tân binh chào sân" / "Khai xuân bàn poker". Nếu thắng: "newbie mà đánh như lão làng". Nếu thua: "học phí ngày đầu, từ từ lên tay". TUYỆT ĐỐI không bịa streak/lịch sử cho người mới.

Tone examples (bắt chước vibe này):
${toneBlock}

Output — SONG NGỮ (BẮT BUỘC):
- ĐÚNG ${targetCount} items
- title: object { vi, en } — mỗi ngôn ngữ là 1 câu ngắn punchy (<=8 từ), cà khịa
- body: object { vi, en } — 1-2 câu, BẮT BUỘC nêu con số cụ thể từ data (chip delta, số streak, elo change). Thêm cú troll, ẩn dụ vui, hoặc lời khuyên mỉa mai. Tiếng Anh cũng phải giữ tone troll tự nhiên — KHÔNG dịch word-by-word từ Việt, viết lại cho hợp văn hoá English trash-talk office poker.
- emoji: 1 emoji duy nhất
- playerId PHẢI khớp data
- Ưu tiên phủ nhiều người, nhưng 1 người drama cực mạnh có thể chiếm 2 slot

English tone example: "iceheart donated 100 chips again, sliding another 21 elo. Tax-deductible generosity at its finest."

Data:
${playersJson}`;
  }
}
