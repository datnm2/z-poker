import { computeEloChanges, K } from "./elo.math";

describe("computeEloChanges", () => {
  it("keeps changes near zero-sum when everyone has equal Elo", () => {
    const result = computeEloChanges(
      [
        { playerId: "a", chipsEnd: 1500, elo: 1200 },
        { playerId: "b", chipsEnd: 1000, elo: 1200 },
        { playerId: "c", chipsEnd: 500, elo: 1200 },
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
        { playerId: "a", chipsEnd: 2000, elo: 1200 },
        { playerId: "b", chipsEnd: 0, elo: 1200 },
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
        { playerId: "fav", chipsEnd: 500, elo: 1600 },
        { playerId: "dog", chipsEnd: 1500, elo: 1000 },
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
        { playerId: "p1", chipsEnd: 210, elo: 1188 },
        { playerId: "p2", chipsEnd: 195, elo: 1200 },
        { playerId: "p3", chipsEnd: 135, elo: 1197 },
        { playerId: "host", chipsEnd: 110, elo: 1220 },
        { playerId: "p5", chipsEnd: 50, elo: 1197 },
        { playerId: "p6", chipsEnd: 0, elo: 1200 },
        { playerId: "p7", chipsEnd: 0, elo: 1191 },
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

  it("produces non-negative drift on zero-sum-chip games (mild inflation)", () => {
    // Skewed chips that sum to buyIn × N. Drift should be small but >= 0.
    const scenarios: number[][] = [
      [240, 130, 110, 60, 40, 20],
      [235, 145, 105, 65, 30, 20],
      [400, 250, 150, 100, 60, 40, 0], // 7 players, sum = 1000 = 100 × 10? No: needs buyIn 1000/7
    ];
    // Use first two (6-player, buyIn 100 → 600 total).
    for (const chips of scenarios.slice(0, 2)) {
      const result = computeEloChanges(
        chips.map((c, idx) => ({ playerId: `p${idx}`, chipsEnd: c, elo: 1200 })),
        100,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      expect(drift).toBeGreaterThanOrEqual(0);
      expect(drift).toBeLessThanOrEqual(6);
    }
  });

  it("logs ELO summary table by player count (max-skew, equal Elo 1200)", () => {
    const counts = [2, 3, 6, 8, 9, 10, 15];
    const buyIn = 100;
    const rows = counts.map((N) => {
      const chips = [buyIn * N, ...Array(N - 1).fill(0)];
      const result = computeEloChanges(
        chips.map((c, i) => ({ playerId: `p${i}`, chipsEnd: c, elo: 1200 })),
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
    expect(rows.every((r) => r.drift >= 0)).toBe(true);
  });

  it("never produces deflation across many randomized chip distributions", () => {
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
        chips.map((c, idx) => ({ playerId: `p${idx}`, chipsEnd: c, elo: 1200 })),
        buyIn,
      );
      const drift = result.reduce((acc, r) => acc + r.change, 0);
      expect(drift).toBeGreaterThanOrEqual(0);
      totalDrift += drift;
    }
    // Average drift should be small (< K/N typically).
    expect(totalDrift / games).toBeLessThan(K);
  });
});
