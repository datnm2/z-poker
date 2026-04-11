export interface Player {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  gamesPlayed: number;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  playedDate: string;
  buyIn: number;
  domain: string;
  createdBy: string;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
}

export interface SessionPlayer {
  id: string;
  sessionId: string;
  playerId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  updatedAt: string;
}

export interface SessionPlayerWithPlayer extends SessionPlayer {
  player: Pick<Player, "id" | "name" | "elo" | "avatarUrl">;
}
