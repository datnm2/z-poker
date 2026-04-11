import { Injectable } from "@nestjs/common";
import { Observable, Subject, filter, map } from "rxjs";
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
    }
  | {
      type: "session.locked";
      domain: string;
      sessionId: string;
      results: EloResult[];
    };

export interface SseMessage {
  data: string;
  type?: string;
  id?: string;
}

@Injectable()
export class SessionsEventsService {
  private readonly subject = new Subject<SessionEvent>();

  publish(event: SessionEvent): void {
    this.subject.next(event);
  }

  streamFor(sessionId: string): Observable<SseMessage> {
    return this.subject.asObservable().pipe(
      filter((e) => e.sessionId === sessionId),
      map((e) => ({ data: JSON.stringify(e), type: e.type })),
    );
  }

  streamForDomain(domain: string): Observable<SseMessage> {
    return this.subject.asObservable().pipe(
      filter((e) => e.domain === domain),
      map((e) => ({ data: JSON.stringify(e), type: e.type })),
    );
  }
}
