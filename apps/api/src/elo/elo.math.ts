// Pure functions extracted for unit testing. Mirrors migration 002.

export const K = 70;

// Streak bonus: applied when |nextStreak| >= STREAK_THRESHOLD.
// bonus = nextStreak * STREAK_BONUS_PER_STEP (signed: +win streak, -loss streak)
export const STREAK_THRESHOLD = 3;
export const STREAK_BONUS_PER_STEP = 2;

export interface EloInput {
  playerId: string;
  chipsEnd: number;
  elo: number;
  currentStreak: number;
}

export interface EloOutput {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
  streakBefore: number;
  streakAfter: number;
  streakBonus: number;
}

export function computeEloChanges(
  rows: EloInput[],
  buyIn: number,
): EloOutput[] {
  const numPlayers = rows.length;
  const avgElo = rows.reduce((acc, r) => acc + r.elo, 0) / numPlayers;

  return rows.map((r) => {
    const expected = 1 / (1 + Math.pow(10, (avgElo - r.elo) / 400));
    const actual =
      0.5 + (0.5 * (r.chipsEnd - buyIn)) / (buyIn * (numPlayers - 1));
    // Scale K by numPlayers/2 so ELO changes stay meaningful at large tables.
    // N=2 is unchanged (×1), N=9 scales up ×4.5.
    // Round to 6 decimals first to wash out float noise (e.g. 63.0000004).
    const raw = Math.round(K * (numPlayers / 2) * (actual - expected) * 1e6) / 1e6;
    let change = Math.round(raw);
    // Winning chips never costs ELO — minimum +1 reward.
    if (r.chipsEnd > buyIn && change < 1) change = 1;
    // Losing or tying chips never gains ELO — cap at 0.
    if (r.chipsEnd <= buyIn && change > 0) change = 0;

    // Streak: extends if same sign as this game's outcome, resets on tie.
    const isWin = r.chipsEnd > buyIn;
    const isLoss = r.chipsEnd < buyIn;
    let streakAfter: number;
    if (isWin) {
      streakAfter = r.currentStreak >= 0 ? r.currentStreak + 1 : 1;
    } else if (isLoss) {
      streakAfter = r.currentStreak <= 0 ? r.currentStreak - 1 : -1;
    } else {
      streakAfter = 0;
    }

    const streakBonus =
      Math.abs(streakAfter) >= STREAK_THRESHOLD
        ? streakAfter * STREAK_BONUS_PER_STEP
        : 0;

    const finalChange = change + streakBonus;

    return {
      playerId: r.playerId,
      eloBefore: r.elo,
      eloAfter: r.elo + finalChange,
      change: finalChange,
      streakBefore: r.currentStreak,
      streakAfter,
      streakBonus,
    };
  });
}
