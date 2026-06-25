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

interface SeasonPlayerRef {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
}

export interface SeasonRecapProse {
  slides: Record<string, LocalizedText>;
  personaId?: string;
  personaName?: LocalizedText;
  model: string;
  generatedAt: string;
}

export interface SeasonRecapDto {
  seasonKey: string;
  totalGames: number;
  hardest: (SeasonPlayerRef & { games: number })[];
  topWinrate: (SeasonPlayerRef & { wins: number; games: number; pct: number })[];
  records: {
    chipRatio: (SeasonPlayerRef & { ratio: number; sessionId: string }) | null;
    biggestTable: { sessionId: string; playerCount: number; playedDate: string } | null;
    biggestEloGain: (SeasonPlayerRef & { gain: number; sessionId: string }) | null;
    longestWinStreak: (SeasonPlayerRef & { length: number }) | null;
    longestLossStreak: (SeasonPlayerRef & { length: number }) | null;
  };
  prose?: SeasonRecapProse | null;
  proseByPersona?: Record<string, SeasonRecapProse> | null;
}

export interface SeasonLatestDto {
  seasonKey: string;
  totalGames: number;
  available: boolean;
  recapVisible: boolean;
}

export interface SeasonListItemDto {
  seasonKey: string;
  totalGames: number;
  playerCount: number;
  champion: { playerId: string; playerName: string } | null;
  recapVisible: boolean;
  closedAt: string;
}

export interface SeasonStandingRow {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  finalElo: number;
  finalRank: number;
  gamesPlayed: number;
}

export interface SeasonStandingsDto {
  seasonKey: string;
  totalGames: number;
  recapVisible: boolean;
  closedAt: string | null;
  rows: SeasonStandingRow[];
}

export interface RecapSlideRow {
  name: string;
  avatarUrl?: string | null;
  value: string;
  rank?: number;
}

export interface RecapSlide {
  key: string;
  emoji: string;
  title: LocalizedText;
  body: LocalizedText;
  rows?: RecapSlideRow[];
}
