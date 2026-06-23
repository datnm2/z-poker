import type { Session, SessionHighlights } from "./database";

// Mirrors apps/api/src/sessions/sessions.events.ts SessionEvent union.
// Keep in sync when you add new event types.

export interface EloResult {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  streakBefore: number;
  streakAfter: number;
  streakBonus: number;
  jackpotBefore: number;
  jackpotAfter: number;
  jackpotChange: number;
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
  streakBonus: number | null;
  jackpotPaid: number | null;
  updatedAt: string;
  player: {
    id: string;
    name: string;
    elo: number;
    avatarUrl: string | null;
    jackpot: number;
  };
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
      highlights: SessionHighlights;
    }
  | {
      type: "season.reset";
      domain: string;
      seasonKey: string;
    };
