import {
  computeEloChanges,
  K,
  STREAK_BONUS_PER_STEP,
  STREAK_THRESHOLD,
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
    // Slight positive drift allowed from ceil/floor + winner floor.
    expect(sum).toBeGreaterThanOrEqual(0);
    expect(sum).toBeLessThanOrEqual(3);
    expect(result[0].change).toBeGreaterThan(0);
    expect(result[1].change).toBe(0);
    expect(result[2].change).toBeLessThan(0);
  });

  it("caps max change near ±K for equal-Elo two-player blowout", () => {
    const result = computeEloChanges(
      [
        { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 0 },
        { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0 },
      ],
      1000,
    );
    // expected=0.5, actual=1.0 for winner → K*(N/2)*(1.0-0.5) = 70*1*0.5 = 35
    expect(result[0].change).toBe(35);
    expect(result[1].change).toBe(-35);
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
    // Inflation drift bounded.
    const sum = result[0].change + result[1].change;
    expect(sum).toBeGreaterThanOrEqual(0);
    expect(sum).toBeLessThanOrEqual(2);
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
        expect(r.change).toBeGreaterThanOrEqual(1);
      }
    }
    const host = result.find((r) => r.playerId === "host")!;
    expect(host.change).toBeGreaterThanOrEqual(1);
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
      // Drift bounded by rounding noise + winner-floor / loser-cap clamping,
      // not by structural inflation bias.
      expect(Math.abs(drift)).toBeLessThanOrEqual(6);
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
    // Drift bounded by rounding noise, no longer biased positive.
    expect(rows.every((r) => Math.abs(r.drift) <= K)).toBe(true);
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
      expect(result[0].streakBonus).toBe(STREAK_THRESHOLD * STREAK_BONUS_PER_STEP);
      expect(result[0].change).toBe(35 + 6);
      expect(result[1].streakAfter).toBe(-1);
      expect(result[1].streakBonus).toBe(0);
    });

    it("applies -bonus when loss streak reaches threshold", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 0 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: -2 },
        ],
        1000,
      );
      expect(result[1].streakAfter).toBe(-3);
      expect(result[1].streakBonus).toBe(-STREAK_THRESHOLD * STREAK_BONUS_PER_STEP);
      expect(result[1].change).toBe(-35 - 6);
    });

    it("scales bonus with longer streaks", () => {
      const result = computeEloChanges(
        [
          { playerId: "a", chipsEnd: 2000, elo: 1200, currentStreak: 4 },
          { playerId: "b", chipsEnd: 0, elo: 1200, currentStreak: 0 },
        ],
        1000,
      );
      expect(result[0].streakAfter).toBe(5);
      expect(result[0].streakBonus).toBe(10);
      expect(result[0].change).toBe(35 + 10);
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

  it("keeps drift bounded across many randomized chip distributions", () => {
    // Generate random zero-sum chip distributions, assert drift >= 0 every time.
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
      expect(Math.abs(drift)).toBeLessThan(K);
      totalDrift += drift;
    }
    // No structural bias either way; mean drift small in magnitude.
    expect(Math.abs(totalDrift / games)).toBeLessThan(K);
  });
});
