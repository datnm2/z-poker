// Run: `yarn workspace api elo:matrix` (or with custom params, see below).
//
// Prints ELO change matrices for multiple table sizes by calling the real
// computeEloChanges. Use this to sanity-check tuning changes BEFORE editing
// constants in elo.math.ts: run once, save the output, change a constant,
// run again, diff.
//
// Optional env overrides:
//   SIZES=6,8,10        comma-separated table sizes
//   BUY_IN=100          buy-in per player
//   GAPS=-300,-100,...  ELO gaps (player_elo - avg_elo) to render as rows
//   CHIPS=-100,-50,...  chip deltas (chips_end - buy_in) to render as columns

import {
  computeEloChanges,
  ELO_SCALE,
  K,
  K_LOSS,
  WINNER_FLAT_BONUS,
  WINNER_RAW_FLOOR,
  LOSER_MIN_PENALTY,
  BUST_MIN_PENALTY,
} from "./elo.math";

const parseList = (s: string | undefined, fallback: number[]): number[] =>
  s
    ? s
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n))
    : fallback;

const SIZES = parseList(process.env.SIZES, [6, 8, 10]);
const BUY_IN = Number(process.env.BUY_IN ?? 100);
const GAPS = parseList(
  process.env.GAPS,
  [-300, -200, -100, -50, 0, 50, 100, 200, 300],
);
const CHIPS = parseList(
  process.env.CHIPS,
  [-100, -80, -50, -20, -1, 20, 50, 80, 150, 300, 500],
);

// For each (gap, chipsDelta) we build a synthetic table where the target player
// has gap=g vs the avg, then read computeEloChanges' result for them.
// To keep avgElo stable across gaps, we set N-1 fillers to a fixed elo and
// solve for the target's elo so the avg lands exactly at FILLER_ELO.
// Trick: target.elo = FILLER_ELO + g; fillers absorb the offset by being at
// FILLER_ELO - g/(N-1) so the mean stays at FILLER_ELO.
const FILLER_ELO = 1200;

function deltaFor(gap: number, chipsDelta: number, N: number): number {
  const targetChips = BUY_IN + chipsDelta;
  // Distribute remaining chips across fillers. Target value isn't read for
  // anyone but the target; we just need a zero-sum-ish vector and matching N.
  // Spread the residual evenly so no filler outcome dominates.
  const residual = BUY_IN * N - targetChips;
  const fillerChips = residual / (N - 1);

  const fillerElo = FILLER_ELO - gap / (N - 1);
  const rows = [
    {
      playerId: "target",
      chipsEnd: targetChips,
      elo: FILLER_ELO + gap,
      currentStreak: 0,
      jackpot: 0,
    },
    ...Array.from({ length: N - 1 }, (_, i) => ({
      playerId: `f${i}`,
      chipsEnd: Math.round(fillerChips),
      elo: Math.round(fillerElo),
      currentStreak: 0,
      jackpot: 0,
    })),
  ];
  const result = computeEloChanges(rows, BUY_IN);
  return result[0].change;
}

function fmt(n: number): string {
  return (n > 0 ? "+" : "") + String(n);
}

function printConstants(): void {
  console.log("=== Current ELO constants ===");
  console.table({
    K_WIN: K,
    K_LOSS,
    ELO_SCALE,
    WINNER_FLAT_BONUS,
    WINNER_RAW_FLOOR,
    LOSER_MIN_PENALTY,
    BUST_MIN_PENALTY,
  });
}

function printMatrix(N: number): void {
  console.log(`\n=== ELO change matrix (N=${N}, buyIn=${BUY_IN}) ===`);
  console.log(
    "Rows = your ELO gap vs table avg. Cols = your chip result (chips_end − buy_in).",
  );

  const rows = GAPS.map((g) => {
    const row: Record<string, string> = { gap: g >= 0 ? `+${g}` : String(g) };
    for (const c of CHIPS) {
      const label = c > 0 ? `+${c}` : String(c);
      row[label] = fmt(deltaFor(g, c, N));
    }
    return row;
  });
  console.table(rows);
}

printConstants();
for (const N of SIZES) printMatrix(N);
