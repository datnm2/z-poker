import {
  computeEloChanges,
  K,
  LOSS_STREAK_BONUS_CAP,
  STREAK_THRESHOLD,
  WIN_STREAK_BONUS_PER_STEP,
  WINNER_FLAT_BONUS,
} from "./elo.math";

describe("computeEloChanges", () => {
  it("keeps changes near zero-sum when everyone has equal Elo", () => {
    const result = computeEloChanges(
      [
        { playerId: "a", chipsEnd: 1500, elo: 1200, currentStreak: 0 },
        { playerId: "b", chipsEnd: 1000, elo: 1200, currentStreak: 0 },
        { playerId: "c", chipsEnd: 500, elo: 1200, currentStreak: 0 },
      ],
      1000,
    );
    const sum = result.reduce((acc, r) => acc + r.change, 0);
    // Drift = winner formula gain + WINNER_FLAT_BONUS − loser softened loss.
    // 1 winner × (~13 + 3) − 1 loser × ~9 = ~7 (positive by design).
    expect(sum).toBeGreaterThan(0);
    expect(result[0].change).toBeGreaterThan(0);
    expect(result[1].change).toBe(0);
    expect(result[2].change).toBeLessThan(0);
  });

  it("caps max change near +K for equal-Elo two-player blowout", () => {
    const result = computeEloChanges(
      [
        { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 0 },
        { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0 },
      ],
      1000,
    );
    // Winner: K*(N/2)*(1.0-0.5) = 70*1*0.5 = 35, plus WINNER_FLAT_BONUS.
    // Loser: K_LOSS*(N/2)*(0-0.5) = 50*1*(-0.5) = -25 (softened).
    expect(result[0].change).toBe(35 + WINNER_FLAT_BONUS);
    expect(result[1].change).toBe(-25);
  });

  it("penalizes the favorite for losing to the underdog", () => {
    const result = computeEloChanges(
      [
        { playerId: "fav", chipsEnd: 500, elo: 1600, currentStreak: 0 },
        { playerId: "dog", chipsEnd: 1500, elo: 1000, currentStreak: 0 },
      ],
      1000,
    );
    expect(result[0].change).toBeLessThan(0);
    expect(result[1].change).toBeGreaterThan(0);
    // Drift positive: dog wins (K=70) + bonus, fav loses softer (K_LOSS=50).
    const sum = result[0].change + result[1].change;
    expect(sum).toBeGreaterThan(WINNER_FLAT_BONUS);
  });

  it("never deducts ELO from a player who finished with more chips than buy-in", () => {
    // Reproduces the screenshot case: 7 players, host has high Elo but only +10 chips.
    const result = computeEloChanges(
      [
        { playerId: "p1", chipsEnd: 210, elo: 1188, currentStreak: 0 },
        { playerId: "p2", chipsEnd: 195, elo: 1200, currentStreak: 0 },
        { playerId: "p3", chipsEnd: 135, elo: 1197, currentStreak: 0 },
        { playerId: "host", chipsEnd: 110, elo: 1220, currentStreak: 0 },
        { playerId: "p5", chipsEnd: 50, elo: 1197, currentStreak: 0 },
        { playerId: "p6", chipsEnd: 0, elo: 1200, currentStreak: 0 },
        { playerId: "p7", chipsEnd: 0, elo: 1191, currentStreak: 0 },
      ],
      100,
    );
    for (const r of result) {
      const chipsEnd = [210, 195, 135, 110, 50, 0, 0][result.indexOf(r)];
      if (chipsEnd > 100) {
        // Floor + bonus = 5 minimum for any chip-winner.
        expect(r.change).toBeGreaterThanOrEqual(5);
      }
    }
    const host = result.find((r) => r.playerId === "host")!;
    expect(host.change).toBeGreaterThanOrEqual(5);
  });

  it("keeps drift small on zero-sum-chip games (rounding noise only)", () => {
    const scenarios: number[][] = [
      [240, 130, 110, 60, 40, 20],
      [235, 145, 105, 65, 30, 20],
    ];
    for (const chips of scenarios) {
      const result = computeEloChanges(
        chips.map((c, idx) => ({ playerId: `p${idx}`, chipsEnd: c, elo: 1200, currentStreak: 0 })),
        100,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      // With asymmetric K (winners 70, losers 50) + winner bonus + floor,
      // drift is positive but bounded by table size.
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K);
    }
  });

  it("logs ELO summary table by player count (max-skew, equal Elo 1200)", () => {
    const counts = [2, 3, 6, 8, 9, 10, 15];
    const buyIn = 100;
    const rows = counts.map((N) => {
      const chips = [buyIn * N, ...Array(N - 1).fill(0)];
      const result = computeEloChanges(
        chips.map((c, i) => ({ playerId: `p${i}`, chipsEnd: c, elo: 1200, currentStreak: 0 })),
        buyIn,
      );
      const winner = result[0];
      const loser = result[1];
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      const volume = result.reduce((acc, r) => acc + Math.abs(r.change), 0);
      const rawWinner = K * (N / 2) * 0.5;
      const rawLoser = -K * (N / 2) * (0.5 / (N - 1));
      return {
        N,
        K,
        rawWinner: rawWinner.toFixed(2),
        winnerChange: winner.change,
        rawLoser: rawLoser.toFixed(2),
        loserChange: loser.change,
        drift,
        volume,
      };
    });
    console.table(rows);
    // Drift is positive by design (asymmetric K_LOSS softening + winner bonus);
    // bounded by ~N × (K - K_LOSS) / 2 in worst-case max-skew.
    expect(rows.every((r) => r.drift >= 0)).toBe(true);
    expect(rows.every((r) => r.drift < r.N * K)).toBe(true);
  });

  describe("streak bonus", () => {
    it("does not apply bonus below threshold (streak < 3)", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 1 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: -1 },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(2);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(-2);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies +bonus when win streak reaches threshold", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 2 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0 },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(3);
      expect(result[0].streakBonus).toBe(STREAK_THRESHOLD * WIN_STREAK_BONUS_PER_STEP);
      // 35 (raw) + 6 (streak) + WINNER_FLAT_BONUS
      expect(result[0].change).toBe(35 + 6 + WINNER_FLAT_BONUS);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies -bonus when loss streak reaches threshold (step 1, capped)", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 0 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: -2 },
        ],
        1000,
      );
      expect(result[1].streakAfter).toBe(-3);
      expect(result[1].streakBonus).toBe(-STREAK_THRESHOLD); // step 1, not ×2
      // K_LOSS=50 → loser raw = -25; minus streak bonus 3.
      expect(result[1].change).toBe(-25 - 3);
    });

    it("scales win-streak bonus linearly with longer streaks (no cap)", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 4 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0 },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(5);
      expect(result[0].streakBonus).toBe(10);
      // 35 (raw winner) + 10 (streak) + WINNER_FLAT_BONUS
      expect(result[0].change).toBe(35 + 10 + WINNER_FLAT_BONUS);
    });

    it("caps loss-streak bonus at -LOSS_STREAK_BONUS_CAP for long losing runs", () => {
      // Walk losing streaks 3..8 and verify bonuses: -3, -4, -5, -5, -5, -5.
      const expected: Record<number, number> = {
        [-3]: -3,
        [-4]: -4,
        [-5]: -5,
        [-6]: -LOSS_STREAK_BONUS_CAP,
        [-7]: -LOSS_STREAK_BONUS_CAP,
        [-8]: -LOSS_STREAK_BONUS_CAP,
      };
      for (const [streakAfterStr, bonus] of Object.entries(expected)) {
        const streakAfter = Number(streakAfterStr);
        const result = computeEloChanges(
          [
            { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 0 },
            { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: streakAfter + 1 },
          ],
          1000,
        );
        expect(result[1].streakAfter).toBe(streakAfter);
        expect(result[1].streakBonus).toBe(bonus);
      }
    });

    it("flips streak sign when result reverses", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 0, elo: 1200, currentStreak: 5 },
          { playerId: "b", chipsEnd: 2000, elo: 1200, currentStreak: -4 },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(-1);
      expect(result[0].streakBonus).toBe(0);
      expect(result[1].streakAfter).toBe(1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("resets streak to 0 when player ties (chipsEnd === buyIn)", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 1500, elo: 1200, currentStreak: 5 },
          { playerId: "b", chipsEnd: 1000, elo: 1200, currentStreak: 3 },
          { playerId: "c", chipsEnd: 500, elo: 1200, currentStreak: -3 },
        ],
        1000,
      );
      const tied = result.find((r) => r.playerId === "b")!;
      expect(tied.streakAfter).toBe(0);
      expect(tied.streakBonus).toBe(0);
    });

    it("returns streakBefore reflecting input streak", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 7 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: -2 },
        ],
        1000,
      );
      expect(result[0].streakBefore).toBe(7);
      expect(result[1].streakBefore).toBe(-2);
    });
  });

  it("inflates ELO over many randomized chip distributions (drift > 0 by design)", () => {
    // Random zero-sum chip games. Drift should now be positive (winner bonus
    // injects +WINNER_FLAT_BONUS per chip-winner per game).
    const N = 6;
    const buyIn = 100;
    const total = buyIn * N;
    let totalDrift = 0;
    const games = 100;
    for (let i = 0; i < games; i++) {
      const cuts = Array.from({ length: N - 1 }, () => Math.floor(Math.random() * total)).sort((a, b) => a - b);
      const chips: number[] = [];
      let prev = 0;
      for (const cut of cuts) {
        chips.push(cut - prev);
        prev = cut;
      }
      chips.push(total - prev);
      const result = computeEloChanges(
        chips.map((c, idx) => ({ playerId: `p${idx}`, chipsEnd: c, elo: 1200, currentStreak: 0 })),
        buyIn,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      // Per-game drift bounded by table size + asymmetric K asymmetry.
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(K);
      totalDrift += drift;
    }
    const meanDrift = totalDrift / games;
    expect(meanDrift).toBeGreaterThan(0);
  });
});
