// Season boundaries mirror apps/api/src/seasons/season.util.ts.
// A season = a calendar quarter (Mar 31, Jun 30, Sep 30, Dec 31 at 23:59:59.999 local).

const QUARTER_END_MONTH = [2, 5, 8, 11]; // 0-indexed

// Next reset = end of the current quarter at 23:59:59.999 local.
export function nextResetAt(now: Date): Date {
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarterEndMonth = QUARTER_END_MONTH.find((m) => m >= month) ?? 11;
  const endOfMonthDay = new Date(year, quarterEndMonth + 1, 0).getDate();
  const candidate = new Date(year, quarterEndMonth, endOfMonthDay, 23, 59, 59, 999);
  if (candidate.getTime() <= now.getTime()) {
    return new Date(year + 1, 2, 31, 23, 59, 59, 999);
  }
  return candidate;
}
