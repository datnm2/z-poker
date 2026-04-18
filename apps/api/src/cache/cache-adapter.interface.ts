export interface CacheEntryInfo {
  key: string;
  expiresAt: number | null;
  ttlMs: number | null;
  size: number;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  list?(prefix?: string): Promise<CacheEntryInfo[]>;
}

export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const CacheKeys = {
  leaderboard: (domain: string) => `leaderboard:${domain}`,
  sessionDetail: (sessionId: string) => `session:${sessionId}`,
  profile: (domain: string, playerId: string) =>
    `profile:${domain}:${playerId}`,
  profileHistory: (domain: string, playerId: string, limit: number) =>
    `profile-history:${domain}:${playerId}:${limit}`,
  sessionsHistory: (domain: string, cursor: string | undefined, limit: number) =>
    `sessions-history:${domain}:${cursor ?? ""}:${limit}`,
  sessionsActive: (domain: string) => `sessions-active:${domain}`,
  sessionsStats: (domain: string) => `sessions-stats:${domain}`,

  profilePrefix: (domain: string) => `profile:${domain}:`,
  profileHistoryPrefix: (domain: string) => `profile-history:${domain}:`,
  sessionsHistoryPrefix: (domain: string) => `sessions-history:${domain}:`,
} as const;
