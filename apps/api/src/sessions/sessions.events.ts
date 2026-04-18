import { Injectable, Logger } from "@nestjs/common";
import { Observable, Subject, filter, finalize, map, merge, share, interval } from "rxjs";
import type { SessionPlayerDto, SessionWithCreatorDto } from "./sessions.service";
import type { EloResult } from "../elo/elo.service";

export type SessionEvent =
  | {
      type: "session.created";
      domain: string;
      sessionId: string;
      session: SessionWithCreatorDto;
    }
  | {
      type: "session.player_joined";
      domain: string;
      sessionId: string;
      sessionPlayer: SessionPlayerDto;
    }
  | {
      type: "session.chips_updated";
      domain: string;
      sessionId: string;
      sessionPlayerId: string;
      chipsEnd: number | null;
      actorId: string;
    }
  | {
      type: "session.locked";
      domain: string;
      sessionId: string;
      results: EloResult[];
    }
  | {
      type: "session.highlights_ready";
      domain: string;
      sessionId: string;
    };

export interface SseMessage {
  data: string;
  type?: string;
  id?: string;
}

@Injectable()
export class SessionsEventsService {
  private readonly logger = new Logger(SessionsEventsService.name);
  private readonly subject = new Subject<SessionEvent>();

  // Single shared heartbeat timer — all SSE connections reuse this one interval
  // rather than each creating its own. share() makes it multicast.
  private readonly heartbeat$ = interval(15_000).pipe(
    map((): SseMessage => ({ data: "", type: "heartbeat" })),
    share(),
  );

  publish(event: SessionEvent): void {
    this.subject.next(event);
  }

  get events$(): Observable<SessionEvent> {
    return this.subject.asObservable();
  }

  streamFor(sessionId: string): Observable<SseMessage> {
    const events$ = this.subject.asObservable().pipe(
      filter((e) => e.sessionId === sessionId),
      map((e) => ({ data: JSON.stringify(e), type: e.type })),
    );
    return merge(events$, this.heartbeat$).pipe(
      finalize(() => this.logger.debug(`SSE session stream closed: ${sessionId}`)),
    );
  }

  // Domain stream skips chips_updated — that's per-session noise the leaderboard
  // doesn't need. player_joined stays because the leaderboard shows player count
  // per active session. highlights_ready is invalidation-only, not surfaced to UI.
  private static readonly DOMAIN_TYPES: ReadonlySet<SessionEvent["type"]> = new Set([
    "session.created",
    "session.player_joined",
    "session.locked",
  ]);

  streamForDomain(domain: string): Observable<SseMessage> {
    const events$ = this.subject.asObservable().pipe(
      filter((e) => e.domain === domain && SessionsEventsService.DOMAIN_TYPES.has(e.type)),
      map((e) => ({ data: JSON.stringify(e), type: e.type })),
    );
    return merge(events$, this.heartbeat$).pipe(
      finalize(() => this.logger.debug(`SSE domain stream closed: ${domain}`)),
    );
  }
}
