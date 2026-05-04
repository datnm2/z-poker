// Pure functions extracted for unit testing. Mirrors migration 002.

// Asymmetric K factor: winners use the full K, losers use a softened K so the
// "self-braking" effect on high-ELO players (who otherwise lose far more than
// they can earn back) is reduced. Skill still matters (loss > 0), but a 75%
// winrate player should net positive over time even at high ELO.
export const K = 70;
export const K_LOSS = 50;

// ELO scaling factor in the expected-score formula. Arpad standard is 400;
// we use 700 to flatten expectations more aggressively. With realistic chip
// distributions (no full-pot blowouts in 30-min office games), high-ELO
// players were getting clamped to +1 on most wins because raw went negative.
// 700 keeps raw modestly positive on small wins while still letting upsets
// (low ELO beating high ELO) feel rewarding.
export const ELO_SCALE = 700;

// Flat bonus added to every player who finishes with more chips than buy-in.
// Drives mild ELO inflation so the pool spreads into higher tiers over time
// instead of clustering around the 1200 starting value (zero-sum equilibrium).
// Losers are not softened by a flat amount — losing still costs rank.
export const WINNER_FLAT_BONUS = 3;

// Floor applied to chip-winners before the flat bonus. Ensures any win is
// worth at least WINNER_RAW_FLOOR + WINNER_FLAT_BONUS = 5 ELO, so chip-positive
// volume is always rewarded — even when the formula would otherwise round to 0.
export const WINNER_RAW_FLOOR = 2;

// Streak bonus: applied when |nextStreak| >= STREAK_THRESHOLD.
// Win streak grows unbounded (3→+6, 4→+8, 5→+10, …) to reward hot runs.
// Loss streak grows by 1 then caps at LOSS_STREAK_BONUS_CAP (3→-3, 4→-4,
// 5→-5, 6→-5, 7→-5, …) so ELO stays inflationary but losses still sting
// enough to separate ranks within the pool.
export const STREAK_THRESHOLD = 3;
export const WIN_STREAK_BONUS_PER_STEP = 2;
export const LOSS_STREAK_BONUS_CAP = 5;

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
    const expected = 1 / (1 + Math.pow(10, (avgElo - r.elo) / ELO_SCALE));
    const actual =
      0.5 + (0.5 * (r.chipsEnd - buyIn)) / (buyIn * (numPlayers - 1));
    // Asymmetric K: winners use K (full sting), losers use K_LOSS (softened).
    // Scale K by numPlayers/2 so ELO changes stay meaningful at large tables.
    // N=2 is unchanged (×1), N=9 scales up ×4.5.
    // Round to 6 decimals first to wash out float noise (e.g. 63.0000004).
    const isChipWinner = r.chipsEnd > buyIn;
    const kFactor = isChipWinner ? K : K_LOSS;
    const raw = Math.round(kFactor * (numPlayers / 2) * (actual - expected) * 1e6) / 1e6;
    let change = Math.round(raw);
    // Winning chips guarantees a meaningful reward — floor before bonus.
    if (isChipWinner && change < WINNER_RAW_FLOOR) change = WINNER_RAW_FLOOR;
    // Losing or tying chips never gains ELO — cap at 0.
    if (!isChipWinner && change > 0) change = 0;
    // Mild inflation: every chip-winner gets a flat bonus on top of the
    // zero-sum formula, so the pool drifts upward over many games.
    if (isChipWinner) change += WINNER_FLAT_BONUS;

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

    let streakBonus = 0;
    if (streakAfter >= STREAK_THRESHOLD) {
      streakBonus = streakAfter * WIN_STREAK_BONUS_PER_STEP;
    } else if (streakAfter <= -STREAK_THRESHOLD) {
      streakBonus = Math.max(streakAfter, -LOSS_STREAK_BONUS_CAP);
    }

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
