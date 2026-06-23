import { currentSeasonKey, previousSeasonKey, seasonRange } from "./season.util";

describe("season.util", () => {
  it("derives the current season key from the quarter", () => {
    expect(currentSeasonKey(new Date(2026, 0, 15))).toBe("2026-Q1"); // Jan
    expect(currentSeasonKey(new Date(2026, 4, 1))).toBe("2026-Q2"); // May
    expect(currentSeasonKey(new Date(2026, 11, 31))).toBe("2026-Q4"); // Dec
  });

  it("wraps to the previous year for Q1", () => {
    expect(previousSeasonKey(new Date(2026, 1, 1))).toBe("2025-Q4"); // Feb 2026
    expect(previousSeasonKey(new Date(2026, 4, 1))).toBe("2026-Q1"); // May 2026
  });

  it("returns inclusive quarter ranges", () => {
    const q2 = seasonRange("2026-Q2");
    expect(q2.start).toEqual(new Date(2026, 3, 1, 0, 0, 0, 0)); // Apr 1
    expect(q2.end).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999)); // Jun 30
  });
});
