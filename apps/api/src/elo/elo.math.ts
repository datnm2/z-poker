// Pure functions extracted for unit testing. Mirrors migration 002.

export const K = 64;

export interface EloInput {
  playerId: string;
  chipsEnd: number;
  elo: number;
}

export interface EloOutput {
  playerId: string;
  eloBefore: number;
  eloAfter: number;
  change: number;
}

export function computeEloChanges(
  rows: EloInput[],
  buyIn: number,
): EloOutput[] {
  const numPlayers = rows.length;
  const avgElo = rows.reduce((acc, r) => acc + r.elo, 0) / numPlayers;

  return rows.map((r) => {
    const expected = 1.0 / (1.0 + Math.pow(10, (avgElo - r.elo) / 400));
    const actual =
      0.5 + (0.5 * (r.chipsEnd - buyIn)) / (buyIn * (numPlayers - 1));
    const change = Math.round(K * (actual - expected));
    return {
      playerId: r.playerId,
      eloBefore: r.elo,
      eloAfter: r.elo + change,
      change,
    };
  });
}
