// Pure functions extracted for unit testing. Mirrors migration 002.

// Asymmetric K factor: winners use the full K, losers use a softened K so the
// "self-braking" effect on high-ELO players (who otherwise lose far more than
// they can earn back) is reduced. Skill still matters (loss > 0), but a 75%
// winrate player should net positive over time even at high ELO.
export const K = 70;
export const K_LOSS = 65;

// ELO scaling factor in the expected-score formula. Arpad standard is 400;
// we use 1000 to flatten expectations while keeping the curve steep enough that
// high-ELO players brake naturally: they earn less on small wins and shed more
// on losses, so only 1-2 players reach the top tier per season (~48 games).
export const ELO_SCALE = 1000;

// Flat bonus added to every player who finishes with more chips than buy-in.
// Drives mild ELO inflation so the pool spreads into higher tiers over time
// instead of clustering around the 1200 starting value (zero-sum equilibrium).
// Losers are not softened by a flat amount — losing still costs rank.
export const WINNER_FLAT_BONUS = 2;

// Floor applied to chip-winners before the flat bonus. Ensures any win is
// worth at least WINNER_RAW_FLOOR + WINNER_FLAT_BONUS = 3 ELO, so chip-positive
// volume is always rewarded — even when the formula would otherwise round to 0.
export const WINNER_RAW_FLOOR = 1;

// Symmetric floors for chip-losers. A low-ELO player can have actual ≈ expected
// when they lose modestly, making raw round to 0 — which paints a chip-loser
// as "+0 ELO" in the UI. Guarantee at least -1 for any chip loss, and at least
// -5 for a full bust (chips_end = 0).
export const LOSER_MIN_PENALTY = -1;
export const BUST_MIN_PENALTY = -5;

// Streak bonus: applied when |nextStreak| >= STREAK_THRESHOLD.
// Win streak grows unbounded (3→+6, 4→+8, 5→+10, …) to reward hot runs.
// Loss streak grows by 1 then caps at LOSS_STREAK_BONUS_CAP (3→-3, 4→-4,
// 5→-5, 6→-5, 7→-5, …) so ELO stays inflationary but losses still sting
// enough to separate ranks within the pool.
export const STREAK_THRESHOLD = 3;
export const WIN_STREAK_BONUS_PER_STEP = 2;
export const LOSS_STREAK_BONUS_CAP = 5;

// Jackpot tuning constants.
// - A player becomes jackpot-eligible after this many consecutive losses.
// - Payout requires finishing within this top rank bracket.
// - Payout requires a strong comeback finish at this buy-in multiple.
// - Each loss contributes this fraction of base loss * loss-streak length.
export const JACKPOT_ELIGIBLE_LOSS_STREAK_MIN = 3;
export const JACKPOT_PAYOUT_TOP_RANK_MAX = 3;
export const JACKPOT_PAYOUT_MIN_BUYIN_MULTIPLIER = 1.5;
export const JACKPOT_ACCUMULATION_RATE = 0.1;

export interface EloInput {
  playerId: string;
  chipsEnd: number;
  elo: number;
  currentStreak: number;
  jackpot: number;
}

export interface EloOutput {
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

export function computeEloChanges(
  rows: EloInput[],
  buyIn: number,
): EloOutput[] {
  const numPlayers = rows.length;
  const avgElo = rows.reduce((acc, r) => acc + r.elo, 0) / numPlayers;
  const sortedByChips = [...rows].sort((a, b) => b.chipsEnd - a.chipsEnd);

  return rows.map((r) => {
    const expected = 1 / (1 + Math.pow(10, (avgElo - r.elo) / ELO_SCALE));
    const actual =
      0.5 + (0.5 * (r.chipsEnd - buyIn)) / (buyIn * (numPlayers - 1));

    const isWin = r.chipsEnd > buyIn;
    const isLoss = r.chipsEnd < buyIn;
    const kFactor = isWin ? K : K_LOSS;

    // 1. Base ELO change calculation
    const raw =
      Math.round(kFactor * (numPlayers / 2) * (actual - expected) * 1e6) / 1e6;
    let change = Math.round(raw);
    let jackpotChange = 0;

    // 5. Update Streak & Old Streak Bonus
    let streakAfter = 0;
    if (isWin) streakAfter = r.currentStreak >= 0 ? r.currentStreak + 1 : 1;
    else if (isLoss)
      streakAfter = r.currentStreak <= 0 ? r.currentStreak - 1 : -1;

    // 2. Loss Streak Comeback (Nổ Hũ)
    const L_before = r.currentStreak < 0 ? Math.abs(r.currentStreak) : 0;
    if (isWin) {
      const rank =
        sortedByChips.findIndex((p) => p.playerId === r.playerId) + 1;
      if (
        L_before >= JACKPOT_ELIGIBLE_LOSS_STREAK_MIN &&
        rank <= JACKPOT_PAYOUT_TOP_RANK_MAX &&
        r.chipsEnd >= buyIn * JACKPOT_PAYOUT_MIN_BUYIN_MULTIPLIER
      ) {
        change += r.jackpot;
        jackpotChange = -r.jackpot; // Cash out
        streakAfter = 0; // Reset streak on jackpot payout (nổ hũ)
      }
    } else if (isLoss) {
      // 3. Jackpot Accumulation (no ELO mitigation — losses hit at full weight;
      // the jackpot is funded on top of the full loss to curb inflation).
      const L_after = Math.abs(streakAfter);
      if (L_after >= 1) {
        // Accumulate to jackpot: rate * L * baseEloLoss
        jackpotChange = Math.round(
          Math.abs(change) * (JACKPOT_ACCUMULATION_RATE * L_after),
        );
      }
    }

    // 4. Apply floors and flat bonuses
    if (isWin) {
      if (change < WINNER_RAW_FLOOR) change = WINNER_RAW_FLOOR;
      change += WINNER_FLAT_BONUS;
    } else if (isLoss) {
      if (change > LOSER_MIN_PENALTY) change = LOSER_MIN_PENALTY;
      if (r.chipsEnd === 0 && change > BUST_MIN_PENALTY)
        change = BUST_MIN_PENALTY;
    } else {
      change = 0; // Tie
    }

    let streakBonus = 0;
    if (streakAfter >= STREAK_THRESHOLD) {
      streakBonus = streakAfter * WIN_STREAK_BONUS_PER_STEP;
    } else if (streakAfter <= -STREAK_THRESHOLD) {
      const rawLossBonus = Math.abs(streakAfter);
      const cappedLossBonus = Math.min(rawLossBonus, LOSS_STREAK_BONUS_CAP);
      streakBonus = -cappedLossBonus;
    }

    change += streakBonus;

    return {
      playerId: r.playerId,
      eloBefore: r.elo,
      eloAfter: r.elo + change,
      change,
      streakBefore: r.currentStreak,
      streakAfter,
      streakBonus,
      jackpotBefore: r.jackpot,
      jackpotAfter: Math.max(0, r.jackpot + jackpotChange),
      jackpotChange,
    };
  });
}
