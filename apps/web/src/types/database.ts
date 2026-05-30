export type GameResult = "W" | "L" | "T";

export interface Player {
  id: string;
  email: string;
  name: string;
  domain: string;
  elo: number;
  gamesPlayed: number;
  currentStreak: number;
  lastResults: GameResult[]; // last 5, newest first
  jackpot: number;
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
  streakBonus: number | null;
  jackpotPaid: number | null;
  updatedAt: string;
}

export interface SessionPlayerWithPlayer extends SessionPlayer {
  player: Pick<Player, "id" | "name" | "elo" | "avatarUrl" | "jackpot">;
}

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface HighlightItem {
  playerId: string;
  playerName: string;
  title: LocalizedText;
  body: LocalizedText;
  emoji: string;
}

export interface SessionHighlights {
  generatedAt: string;
  model: string;
  items: HighlightItem[];
  personaId?: string;
  personaName?: LocalizedText;
}
