// A season = a calendar quarter. Boundaries match the leaderboard countdown
// (Mar 31, Jun 30, Sep 30, Dec 31 at 23:59:59.999 local). Season key: "2026-Q2".

export interface SeasonRange {
  key: string;
  start: Date; // inclusive
  end: Date; // inclusive (quarter end at 23:59:59.999)
}

const QUARTER_END_MONTH = [2, 5, 8, 11]; // 0-indexed: Mar, Jun, Sep, Dec

function quarterOfMonth(month: number): number {
  return Math.floor(month / 3) + 1; // 1..4
}

export function seasonKeyForDate(d: Date): string {
  return `${d.getFullYear()}-Q${quarterOfMonth(d.getMonth())}`;
}

export function currentSeasonKey(now: Date = new Date()): string {
  return seasonKeyForDate(now);
}

// The quarter immediately before the one containing `now`.
export function previousSeasonKey(now: Date = new Date()): string {
  const q = quarterOfMonth(now.getMonth());
  if (q === 1) return `${now.getFullYear() - 1}-Q4`;
  return `${now.getFullYear()}-Q${q - 1}`;
}

function parseKey(key: string): { year: number; quarter: number } {
  const m = /^(\d{4})-Q([1-4])$/.exec(key);
  if (!m) throw new Error(`Invalid season key: ${key}`);
  return { year: Number(m[1]), quarter: Number(m[2]) };
}

export function seasonRange(key: string): SeasonRange {
  const { year, quarter } = parseKey(key);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
  const endMonth = QUARTER_END_MONTH[quarter - 1];
  const endDay = new Date(year, endMonth + 1, 0).getDate();
  const end = new Date(year, endMonth, endDay, 23, 59, 59, 999);
  return { key, start, end };
}
