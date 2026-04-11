import type { Session } from "./database";

// Mirrors apps/api/src/sessions/sessions.events.ts SessionEvent union.
// Keep in sync when you add new event types.

export interface EloResult {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
}

export interface SessionWithCreator extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

export interface SessionPlayerWithPlayer {
  id: string;
  sessionId: string;
  playerId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  updatedAt: string;
  player: { id: string; name: string; elo: number };
}

export type SessionEvent =
  | {
      type: "session.created";
      domain: string;
      sessionId: string;
      session: SessionWithCreator;
    }
  | {
      type: "session.player_joined";
      domain: string;
      sessionId: string;
      sessionPlayer: SessionPlayerWithPlayer;
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
