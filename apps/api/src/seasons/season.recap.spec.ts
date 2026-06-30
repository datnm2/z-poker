import {
  computeRecap,
  MIN_GAMES_FOR_WINRATE,
  type RecapRow,
} from "./season.recap";

function row(p: Partial<RecapRow> & Pick<RecapRow, "playerId" | "sessionId" | "chipsEnd">): RecapRow {
  return {
    playerName: p.playerId.toUpperCase(),
    avatarUrl: null,
    buyIn: 100,
    eloBefore: 1200,
    eloAfter: 1200,
    lockedAt: new Date(),
    playedDate: "2026-04-10",
    ...p,
  } as RecapRow;
}

describe("computeRecap", () => {
  it("counts distinct sessions as totalGames", () => {
    const rows = [
      row({ playerId: "a", sessionId: "s1", chipsEnd: 150 }),
      row({ playerId: "b", sessionId: "s1", chipsEnd: 50 }),
      row({ playerId: "a", sessionId: "s2", chipsEnd: 80 }),
    ];
    expect(computeRecap("2026-Q2", rows).totalGames).toBe(2);
  });

  it("ranks hardest players by games played", () => {
    const rows = [
      row({ playerId: "a", sessionId: "s1", chipsEnd: 100 }),
      row({ playerId: "a", sessionId: "s2", chipsEnd: 100 }),
      row({ playerId: "a", sessionId: "s3", chipsEnd: 100 }),
      row({ playerId: "b", sessionId: "s1", chipsEnd: 100 }),
    ];
    const { hardest } = computeRecap("2026-Q2", rows);
    expect(hardest[0]).toMatchObject({ playerId: "a", games: 3 });
    expect(hardest[1]).toMatchObject({ playerId: "b", games: 1 });
  });

  it("applies the min-games floor to win rate", () => {
    const floor = MIN_GAMES_FOR_WINRATE;
    // a: exactly at the floor, 2 wins → included
    const aRows = Array.from({ length: floor }, (_, i) =>
      row({ playerId: "a", sessionId: `a${i}`, chipsEnd: i < 2 ? 150 : 50 }),
    );
    // c: one game below the floor, 100% win → excluded
    const cRows = Array.from({ length: floor - 1 }, (_, i) =>
      row({ playerId: "c", sessionId: `c${i}`, chipsEnd: 150 }),
    );
    const { topWinrate } = computeRecap("2026-Q2", [...aRows, ...cRows]);
    expect(topWinrate).toHaveLength(1);
    expect(topWinrate[0]).toMatchObject({ playerId: "a", wins: 2, games: floor });
    expect(topWinrate[0].pct).toBeCloseTo(2 / floor);
  });

  it("finds record holders", () => {
    const rows = [
      row({ playerId: "a", sessionId: "s1", chipsEnd: 500, buyIn: 100, eloBefore: 1200, eloAfter: 1280 }),
      row({ playerId: "b", sessionId: "s1", chipsEnd: 0, buyIn: 100, eloBefore: 1200, eloAfter: 1190 }),
      row({ playerId: "c", sessionId: "s1", chipsEnd: 0, buyIn: 100 }),
    ];
    const { records } = computeRecap("2026-Q2", rows);
    expect(records.chipRatio).toMatchObject({ playerId: "a", ratio: 5 });
    expect(records.biggestEloGain).toMatchObject({ playerId: "a", gain: 80 });
    expect(records.biggestTable).toMatchObject({ playerCount: 3 });
  });

  it("computes longest win and loss streaks chronologically", () => {
    // a wins 3 straight then loses; b loses 2 straight
    const rows = [
      row({ playerId: "a", sessionId: "s1", chipsEnd: 150 }),
      row({ playerId: "a", sessionId: "s2", chipsEnd: 150 }),
      row({ playerId: "a", sessionId: "s3", chipsEnd: 150 }),
      row({ playerId: "a", sessionId: "s4", chipsEnd: 50 }),
      row({ playerId: "b", sessionId: "s1", chipsEnd: 50 }),
      row({ playerId: "b", sessionId: "s2", chipsEnd: 50 }),
    ];
    const { records } = computeRecap("2026-Q2", rows);
    expect(records.longestWinStreak).toMatchObject({ playerId: "a", length: 3 });
    expect(records.longestLossStreak).toMatchObject({ playerId: "b", length: 2 });
  });

  it("handles an empty season", () => {
    const recap = computeRecap("2026-Q2", []);
    expect(recap.totalGames).toBe(0);
    expect(recap.hardest).toEqual([]);
    expect(recap.records.chipRatio).toBeNull();
    expect(recap.records.longestWinStreak).toBeNull();
  });
});
