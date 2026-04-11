import { computeEloChanges } from "./elo.math";

describe("computeEloChanges", () => {
  it("zero-sums the changes when everyone has equal Elo", () => {
    const result = computeEloChanges(
      [
        { playerId: "a", chipsEnd: 1500, elo: 1200 },
        { playerId: "b", chipsEnd: 1000, elo: 1200 },
        { playerId: "c", chipsEnd: 500, elo: 1200 },
      ],
      1000,
    );
    const sum = result.reduce((acc, r) => acc + r.change, 0);
    expect(sum).toBe(0);
    // Winner gains, loser loses, middle stays flat
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
    // expected=0.5, actual=1.0 for winner → K*(1.0-0.5)=32 → round(32)=32
    expect(result[0].change).toBe(32);
    expect(result[1].change).toBe(-32);
  });

  it("penalizes the favorite for losing to the underdog", () => {
    const result = computeEloChanges(
      [
        { playerId: "fav", chipsEnd: 500, elo: 1600 },
        { playerId: "dog", chipsEnd: 1500, elo: 1000 },
      ],
      1000,
    );
    // Favorite loses → big negative change; underdog wins → big positive
    expect(result[0].change).toBeLessThan(0);
    expect(result[1].change).toBeGreaterThan(0);
    // And the zero-sum property holds (within rounding)
    expect(Math.abs(result[0].change + result[1].change)).toBeLessThanOrEqual(1);
  });
});
