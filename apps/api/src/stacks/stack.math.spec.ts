import { stackBuyIns, stackDelta, stackResult, utcYear } from "./stack.math";

describe("stack.math", () => {
  it("computes delta and buy-in normalization", () => {
    expect(stackDelta(150, 100)).toBe(50);
    expect(stackBuyIns(-50, 100)).toBe(-0.5);
    expect(stackBuyIns(333, 1000)).toBe(0.333);
    expect(stackBuyIns(10, 0)).toBe(0);
  });

  it("uses UTC for year boundaries", () => {
    expect(utcYear(new Date("2025-12-31T23:59:59Z"))).toBe(2025);
    expect(utcYear(new Date("2026-01-01T00:00:00Z"))).toBe(2026);
  });

  it("classifies results", () => {
    expect(stackResult(1)).toBe("W");
    expect(stackResult(-1)).toBe("L");
    expect(stackResult(0)).toBe("T");
  });
});
