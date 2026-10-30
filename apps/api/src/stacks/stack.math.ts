export type StackResult = "W" | "L" | "T";

export function stackDelta(chipsEnd: number, buyIn: number): number {
  return chipsEnd - buyIn;
}

// Net result expressed in buy-ins so sessions with different buy-ins are comparable.
export function stackBuyIns(delta: number, buyIn: number): number {
  if (buyIn <= 0) return 0;
  return Math.round((delta / buyIn) * 1000) / 1000;
}

export function utcYear(d: Date): number {
  return d.getUTCFullYear();
}

export function stackResult(delta: number): StackResult {
  return delta > 0 ? "W" : delta < 0 ? "L" : "T";
}
