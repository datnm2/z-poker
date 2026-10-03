import {
  BUST_MIN_PENALTY,
  computeEloChanges,
  ELO_SCALE,
  EloInput,
  JACKPOT_ACCUMULATION_RATE,
  JACKPOT_CAP,
  JACKPOT_ELIGIBLE_LOSS_STREAK_MIN,
  JACKPOT_PAYOUT_MIN_BUYIN_MULTIPLIER,
  JACKPOT_PAYOUT_TOP_RANK_MAX,
  K,
  K_LOSS,
  LOSER_MIN_PENALTY,
  LOSS_STREAK_BONUS_CAP,
  STREAK_THRESHOLD,
  WIN_STREAK_BONUS_PER_STEP,
  WINNER_FLAT_BONUS,
  WINNER_RAW_FLOOR,
} from "./elo.math";

// All expectations derive from the exported tuning constants, so retuning
// elo.math.ts should not require touching this file.

const START_ELO = 1200;

const player = (
  playerId: string,
  chipsEnd: number,
  opts: Partial<EloInput> = {},
): EloInput => ({
  playerId,
  chipsEnd,
  elo: START_ELO,
  currentStreak: 0,
  jackpot: 0,
  ...opts,
});

const expectedScore = (elo: number, avgElo: number) =>
  1 / (1 + Math.pow(10, (avgElo - elo) / ELO_SCALE));

const actualScore = (chips: number, buyIn: number, n: number) =>
  0.5 + (0.5 * (chips - buyIn)) / (buyIn * (n - 1));

const baseRaw = (k: number, n: number, actual: number, expected = 0.5) =>
  Math.round(Math.round(k * (n / 2) * (actual - expected) * 1e6) / 1e6);

const winnerFloor = (raw: number) =>
  Math.max(raw, WINNER_RAW_FLOOR) + WINNER_FLAT_BONUS;

const loserFloor = (raw: number, bust: boolean) => {
  const c = Math.min(raw, LOSER_MIN_PENALTY);
  return bust ? Math.min(c, BUST_MIN_PENALTY) : c;
};

const lossStreakBonus = (len: number) =>
  len >= STREAK_THRESHOLD ? -Math.min(len, LOSS_STREAK_BONUS_CAP) : 0;

const accrual = (raw: number, lossStreakLen: number) =>
  Math.round(Math.abs(raw) * (JACKPOT_ACCUMULATION_RATE * lossStreakLen));

// Change for a player with no streak and no jackpot.
const plainChange = (
  chips: number,
  buyIn: number,
  n: number,
  elo = START_ELO,
  avgElo = START_ELO,
) => {
  const a = actualScore(chips, buyIn, n);
  const e = expectedScore(elo, avgElo);
  if (chips > buyIn) return winnerFloor(baseRaw(K, n, a, e));
  if (chips < buyIn) return loserFloor(baseRaw(K_LOSS, n, a, e), chips === 0);
  return 0;
};

const expectPlainTable = (chips: number[], buyIn: number) => {
  const result = computeEloChanges(
    chips.map((c, i) => player(`p${i}`, c)),
    buyIn,
  );
  result.forEach((r, i) =>
    expect(r.change).toBe(plainChange(chips[i], buyIn, chips.length)),
  );
  return result;
};

// Two-player blowout at buyIn 1000: winner takes everything, loser busts.
const BLOWOUT_BUYIN = 1000;
const blowoutWinRaw = baseRaw(K, 2, 1);
const blowoutLossRaw = baseRaw(K_LOSS, 2, 0);

describe("computeEloChanges", () => {
  describe("base formula", () => {
    it("computes exact changes for an equal-Elo 3-player game", () => {
      const result = expectPlainTable([1500, 1000, 500], 1000);
      expect(result[0].change).toBeGreaterThan(0);
      expect(result[1].change).toBe(0);
      expect(result[2].change).toBeLessThan(0);
    });

    it("two-player blowout: full K for winner, K_LOSS for loser", () => {
      const result = computeEloChanges(
        [player("a", 2000), player("b", 0)],
        BLOWOUT_BUYIN,
      );
      expect(result[0].change).toBe(winnerFloor(blowoutWinRaw));
      expect(result[1].change).toBe(loserFloor(blowoutLossRaw, true));
    });

    it("penalizes the favorite for losing to the underdog", () => {
      const avg = (1600 + 1000) / 2;
      const result = computeEloChanges(
        [
          player("fav", 500, { elo: 1600 }),
          player("dog", 1500, { elo: 1000 }),
        ],
        1000,
      );
      expect(result[0].change).toBe(plainChange(500, 1000, 2, 1600, avg));
      expect(result[1].change).toBe(plainChange(1500, 1000, 2, 1000, avg));
      expect(result[0].change).toBeLessThan(0);
      expect(result[1].change).toBeGreaterThan(0);
    });

    it("never deducts ELO from a chip-winner, never awards a chip-loser", () => {
      const chips = [210, 195, 135, 110, 50, 0, 0];
      const elos = [1188, 1200, 1197, 1220, 1197, 1200, 1191];
      const result = computeEloChanges(
        chips.map((c, i) => player(`p${i}`, c, { elo: elos[i] })),
        100,
      );
      result.forEach((r, i) => {
        if (chips[i] > 100) {
          expect(r.change).toBeGreaterThanOrEqual(
            WINNER_RAW_FLOOR + WINNER_FLAT_BONUS,
          );
        } else {
          expect(r.change).toBeLessThanOrEqual(LOSER_MIN_PENALTY);
        }
      });
    });

    it.each([
      [[240, 130, 110, 60, 40, 20]],
      [[235, 145, 105, 65, 30, 20]],
      [[350, 200, 150, 120, 100, 80, 50, 30, 20, 0, 0]],
      [[400, 250, 200, 150, 130, 110, 100, 80, 50, 30, 0, 0, 0, 0, 0]],
    ])("matches the formula for every seat: %j", (chips) => {
      expectPlainTable(chips, 100);
    });

    it("matches the formula over randomized 6-player chip distributions", () => {
      const N = 6;
      const buyIn = 100;
      const total = buyIn * N;
      for (let g = 0; g < 100; g++) {
        const cuts = Array.from({ length: N - 1 }, () =>
          Math.floor(Math.random() * total),
        ).sort((a, b) => a - b);
        const chips: number[] = [];
        let prev = 0;
        for (const cut of cuts) {
          chips.push(cut - prev);
          prev = cut;
        }
        chips.push(total - prev);
        expectPlainTable(chips, buyIn);
      }
    });

    it("logs ELO summary table by player count (max-skew, equal Elo)", () => {
      const buyIn = 100;
      const rows = [2, 3, 6, 8, 9, 10, 15].map((N) => {
        const chips = [buyIn * N, ...Array<number>(N - 1).fill(0)];
        const result = expectPlainTable(chips, buyIn);
        return {
          N,
          K,
          K_LOSS,
          winnerChange: result[0].change,
          loserChange: result[1].change,
          drift: result.reduce((acc, r) => acc + r.change, 0),
          volume: result.reduce((acc, r) => acc + Math.abs(r.change), 0),
        };
      });
      console.table(rows);
    });
  });

  describe("streak bonus", () => {
    it("does not apply bonus below threshold", () => {
      const s = STREAK_THRESHOLD - 2;
      const result = computeEloChanges(
        [
          player("a", 2000, { currentStreak: s }),
          player("b", 0, { currentStreak: -s }),
        ],
        BLOWOUT_BUYIN,
      );
      expect(result[0].streakAfter).toBe(s + 1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(-(s + 1));
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies +bonus when win streak reaches threshold", () => {
      const result = computeEloChanges(
        [
          player("a", 2000, { currentStreak: STREAK_THRESHOLD - 1 }),
          player("b", 0),
        ],
        BLOWOUT_BUYIN,
      );
      const bonus = STREAK_THRESHOLD * WIN_STREAK_BONUS_PER_STEP;
      expect(result[0].streakAfter).toBe(STREAK_THRESHOLD);
      expect(result[0].streakBonus).toBe(bonus);
      expect(result[0].change).toBe(winnerFloor(blowoutWinRaw) + bonus);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies -bonus when loss streak reaches threshold", () => {
      const result = computeEloChanges(
        [
          player("a", 2000),
          player("b", 0, { currentStreak: -(STREAK_THRESHOLD - 1) }),
        ],
        BLOWOUT_BUYIN,
      );
      const bonus = -Math.min(STREAK_THRESHOLD, LOSS_STREAK_BONUS_CAP);
      expect(result[1].streakAfter).toBe(-STREAK_THRESHOLD);
      expect(result[1].streakBonus).toBe(bonus);
      expect(result[1].change).toBe(loserFloor(blowoutLossRaw, true) + bonus);
    });

    it("scales win-streak bonus linearly with longer streaks (no cap)", () => {
      const after = STREAK_THRESHOLD + 2;
      const result = computeEloChanges(
        [player("a", 2000, { currentStreak: after - 1 }), player("b", 0)],
        BLOWOUT_BUYIN,
      );
      const bonus = after * WIN_STREAK_BONUS_PER_STEP;
      expect(result[0].streakAfter).toBe(after);
      expect(result[0].streakBonus).toBe(bonus);
      expect(result[0].change).toBe(winnerFloor(blowoutWinRaw) + bonus);
    });

    it("caps loss-streak bonus at -LOSS_STREAK_BONUS_CAP", () => {
      for (
        let len = STREAK_THRESHOLD;
        len <= Math.max(STREAK_THRESHOLD, LOSS_STREAK_BONUS_CAP) + 2;
        len++
      ) {
        const result = computeEloChanges(
          [player("a", 2000), player("b", 0, { currentStreak: -(len - 1) })],
          BLOWOUT_BUYIN,
        );
        expect(result[1].streakAfter).toBe(-len);
        expect(result[1].streakBonus).toBe(
          -Math.min(len, LOSS_STREAK_BONUS_CAP),
        );
        expect(result[1].streakBonus).toBeGreaterThanOrEqual(
          -LOSS_STREAK_BONUS_CAP,
        );
      }
    });

    it("flips streak sign when result reverses", () => {
      const result = computeEloChanges(
        [
          player("a", 0, { currentStreak: 5 }),
          player("b", 1100, { currentStreak: -4 }),
          player("c", 900),
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(-1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(1);
      expect(result[1].streakBonus).toBe(0);
    });

    it.each([5, 3, -3, -8])(
      "resets streak and strips bonus on a tie (streak %i)",
      (currentStreak) => {
        const result = computeEloChanges(
          [player("a", 1500), player("b", 1000, { currentStreak }), player("c", 500)],
          1000,
        );
        const tied = result.find((r) => r.playerId === "b")!;
        expect(tied.streakAfter).toBe(0);
        expect(tied.streakBonus).toBe(0);
        expect(tied.change).toBe(0);
      },
    );

    it("returns streakBefore reflecting input streak", () => {
      const result = computeEloChanges(
        [
          player("a", 2000, { currentStreak: 7 }),
          player("b", 0, { currentStreak: -2 }),
        ],
        BLOWOUT_BUYIN,
      );
      expect(result[0].streakBefore).toBe(7);
      expect(result[1].streakBefore).toBe(-2);
    });

    it("breaks a long loss streak: win → streak +1, no bonus", () => {
      const result = computeEloChanges(
        [player("a", 1100, { currentStreak: -7 }), player("b", 900)],
        1000,
      );
      expect(result[0].streakAfter).toBe(1);
      expect(result[0].streakBonus).toBe(0);
    });

    it("breaks a long win streak: loss → streak -1, no residual credit", () => {
      const result = computeEloChanges(
        [player("a", 2000), player("b", 0, { currentStreak: 7 })],
        BLOWOUT_BUYIN,
      );
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
      expect(result[1].change).toBe(loserFloor(blowoutLossRaw, true));
    });

    it("starts a fresh streak from 0 (→ +1 / -1)", () => {
      const result = computeEloChanges(
        [player("a", 2000), player("b", 0)],
        BLOWOUT_BUYIN,
      );
      expect(result[0].streakAfter).toBe(1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("only awards win-streak bonus once the threshold is hit again", () => {
      let currentStreak = -(STREAK_THRESHOLD + 2);
      for (let want = 1; want <= STREAK_THRESHOLD; want++) {
        const [r] = computeEloChanges(
          [player("a", 1100, { currentStreak }), player("b", 900)],
          1000,
        );
        expect(r.streakAfter).toBe(want);
        expect(r.streakBonus).toBe(
          want >= STREAK_THRESHOLD ? want * WIN_STREAK_BONUS_PER_STEP : 0,
        );
        currentStreak = r.streakAfter;
      }
    });
  });

  describe("jackpot (Nổ Hũ)", () => {
    const buyIn = 100;
    const payoutChips = Math.ceil(buyIn * JACKPOT_PAYOUT_MIN_BUYIN_MULTIPLIER);
    const eligibleStreak = -JACKPOT_ELIGIBLE_LOSS_STREAK_MIN;
    const payoutRaw = baseRaw(K, 2, actualScore(payoutChips, buyIn, 2));

    const headsUp = (hero: Partial<EloInput>, heroChips = payoutChips) =>
      computeEloChanges(
        [player("hero", heroChips, hero), player("villain", 2 * buyIn - heroChips)],
        buyIn,
      )[0];

    it("pays out the pot for an eligible top finisher and resets streak", () => {
      const r = headsUp({ currentStreak: eligibleStreak, jackpot: JACKPOT_CAP });
      expect(r.jackpotChange).toBe(-JACKPOT_CAP);
      expect(r.jackpotAfter).toBe(0);
      expect(r.streakAfter).toBe(0);
      expect(r.streakBonus).toBe(0);
      expect(r.change).toBe(winnerFloor(payoutRaw + JACKPOT_CAP));
    });

    it("clamps a legacy pot above JACKPOT_CAP on payout", () => {
      const r = headsUp({
        currentStreak: eligibleStreak,
        jackpot: JACKPOT_CAP + 70,
      });
      expect(r.jackpotChange).toBe(-JACKPOT_CAP);
      expect(r.jackpotAfter).toBe(0);
      expect(r.change).toBe(winnerFloor(payoutRaw + JACKPOT_CAP));
    });

    it("does not pay out when chips are below the buy-in multiplier", () => {
      const chips = payoutChips - 1;
      const r = headsUp(
        { currentStreak: eligibleStreak, jackpot: JACKPOT_CAP },
        chips,
      );
      expect(r.jackpotChange).toBe(0);
      expect(r.jackpotAfter).toBe(JACKPOT_CAP);
      expect(r.streakAfter).toBe(1);
      expect(r.change).toBe(
        winnerFloor(baseRaw(K, 2, actualScore(chips, buyIn, 2))),
      );
    });

    it("does not pay out when the loss streak is below the minimum", () => {
      const r = headsUp({
        currentStreak: eligibleStreak + 1,
        jackpot: JACKPOT_CAP,
      });
      expect(r.jackpotChange).toBe(0);
      expect(r.jackpotAfter).toBe(JACKPOT_CAP);
      expect(r.change).toBe(winnerFloor(payoutRaw));
    });

    it("does not pay out when rank > JACKPOT_PAYOUT_TOP_RANK_MAX", () => {
      const ahead = Array.from({ length: JACKPOT_PAYOUT_TOP_RANK_MAX }, (_, i) =>
        player(`top${i}`, payoutChips + 10 * (i + 1)),
      );
      const result = computeEloChanges(
        [
          ...ahead,
          player("hero", payoutChips, {
            currentStreak: eligibleStreak,
            jackpot: JACKPOT_CAP,
          }),
          player("bust", 0),
        ],
        buyIn,
      );
      const hero = result.find((r) => r.playerId === "hero")!;
      expect(hero.jackpotChange).toBe(0);
      expect(hero.jackpotAfter).toBe(JACKPOT_CAP);
      expect(hero.streakAfter).toBe(1);
    });

    it("accrues rate × streak × |base loss| on a loss", () => {
      const len = STREAK_THRESHOLD;
      const result = computeEloChanges(
        [player("a", 2000), player("b", 0, { currentStreak: -(len - 1) })],
        BLOWOUT_BUYIN,
      );
      const add = Math.min(accrual(blowoutLossRaw, len), JACKPOT_CAP);
      expect(result[1].jackpotChange).toBe(add);
      expect(result[1].jackpotAfter).toBe(add);
      // Accrual is on top of the full loss, not deducted from it.
      expect(result[1].change).toBe(
        loserFloor(blowoutLossRaw, true) + lossStreakBonus(len),
      );
    });

    it("caps accumulation at JACKPOT_CAP", () => {
      const start = JACKPOT_CAP - 1;
      const len = 7;
      const result = computeEloChanges(
        [
          player("a", 2000),
          player("b", 0, { currentStreak: -(len - 1), jackpot: start }),
        ],
        BLOWOUT_BUYIN,
      );
      const add = Math.min(accrual(blowoutLossRaw, len), JACKPOT_CAP - start);
      expect(result[1].jackpotChange).toBe(add);
      expect(result[1].jackpotAfter).toBe(start + add);
      expect(result[1].jackpotAfter).toBeLessThanOrEqual(JACKPOT_CAP);
    });

    it("clamps a legacy pot above JACKPOT_CAP on a loss", () => {
      const result = computeEloChanges(
        [
          player("a", 2000),
          player("b", 0, { currentStreak: -3, jackpot: JACKPOT_CAP + 50 }),
        ],
        BLOWOUT_BUYIN,
      );
      expect(result[1].jackpotChange).toBe(0);
      expect(result[1].jackpotAfter).toBe(JACKPOT_CAP);
    });
  });

  describe("loser floor", () => {
    it("guarantees at least LOSER_MIN_PENALTY for any chip loss", () => {
      const elos = [
        1219, 1256, 1165, 1175, 1207, 1239, 1154, 1229, 1145, 1225, 1224,
      ];
      const chips = [370, 245, 165, 135, 90, 60, 20, 15, 0, 0, 0];
      const result = computeEloChanges(
        elos.map((elo, i) => player(`p${i}`, chips[i], { elo })),
        100,
      );
      result.forEach((r, i) => {
        if (chips[i] < 100) expect(r.change).toBeLessThanOrEqual(LOSER_MIN_PENALTY);
      });
    });

    it("applies LOSER_MIN_PENALTY when raw rounds to 0 for a small loss", () => {
      const result = computeEloChanges(
        [
          player("winner", 1100, { elo: 1300 }),
          player("loser", 900, { elo: 1100 }),
        ],
        1000,
      );
      expect(result[1].change).toBeLessThanOrEqual(LOSER_MIN_PENALTY);
    });

    it("does NOT apply loser floor on a tie", () => {
      const result = computeEloChanges(
        [player("w", 1500), player("tie", 1000), player("l", 500)],
        1000,
      );
      expect(result[1].change).toBe(0);
    });
  });

  describe("bust floor", () => {
    it("guarantees at least BUST_MIN_PENALTY when chipsEnd === 0", () => {
      const result = computeEloChanges(
        [
          player("fav1", 1200, { elo: 1500 }),
          player("fav2", 800, { elo: 1500 }),
          player("underdog", 0, { elo: 900 }),
        ],
        500,
      );
      expect(result[2].change).toBeLessThanOrEqual(BUST_MIN_PENALTY);
    });

    it("keeps the formula loss when it is harsher than the floor", () => {
      const result = computeEloChanges(
        [player("a", 2000), player("b", 0)],
        BLOWOUT_BUYIN,
      );
      expect(result[1].change).toBe(
        Math.min(blowoutLossRaw, LOSER_MIN_PENALTY, BUST_MIN_PENALTY),
      );
    });
  });
});
