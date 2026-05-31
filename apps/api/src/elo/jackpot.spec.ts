import { computeEloChanges } from "./elo.math";

describe("Jackpot Accumulation", () => {
  it("accumulates jackpot for a player on their 3rd loss streak", () => {
    const buyIn = 1000;
    const players = [
      {
        playerId: "winner",
        chipsEnd: 2000,
        elo: 1200,
        currentStreak: 0,
        jackpot: 0,
      },
      {
        playerId: "loser",
        chipsEnd: 0,
        elo: 1200,
        currentStreak: -2,
        jackpot: 0,
      }, // streak -2 -> -3
    ];

    const result = computeEloChanges(players, buyIn);
    const loserResult = result.find((r) => r.playerId === "loser")!;

    expect(loserResult.streakAfter).toBe(-3);
    expect(loserResult.jackpotChange).toBeGreaterThan(0);
    expect(loserResult.jackpotAfter).toBeGreaterThan(0);
  });

  it("accumulates jackpot for a player on their 1st loss streak", () => {
    const buyIn = 1000;
    const players = [
      {
        playerId: "winner",
        chipsEnd: 2000,
        elo: 1200,
        currentStreak: 0,
        jackpot: 0,
      },
      {
        playerId: "loser",
        chipsEnd: 0,
        elo: 1200,
        currentStreak: 0,
        jackpot: 0,
      }, // streak 0 -> -1
    ];

    const result = computeEloChanges(players, buyIn);
    const loserResult = result.find((r) => r.playerId === "loser")!;

    expect(loserResult.streakAfter).toBe(-1);
    expect(loserResult.jackpotChange).toBeGreaterThan(0);
    expect(loserResult.jackpotAfter).toBeGreaterThan(0);
  });

  it("adds jackpot to elo and resets it for a player who wins while having a jackpot", () => {
    const buyIn = 1000;
    const players = [
      {
        playerId: "winner",
        chipsEnd: 2000,
        elo: 1200,
        currentStreak: -3,
        jackpot: 100,
      },
      {
        playerId: "loser",
        chipsEnd: 0,
        elo: 1200,
        currentStreak: 0,
        jackpot: 0,
      },
    ];

    const result = computeEloChanges(players, buyIn);
    const winnerResult = result.find((r) => r.playerId === "winner")!;

    expect(winnerResult.jackpotChange).toBe(-100);
    expect(winnerResult.jackpotAfter).toBe(0);
    expect(winnerResult.change).toBeGreaterThan(100);
    expect(winnerResult.streakAfter).toBe(0); // Reset streak on jackpot payout
  });
});
