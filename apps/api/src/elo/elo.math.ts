// Pure functions extracted for unit testing. Mirrors migration 002.

export const K = 70;

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
    const expected = 1 / (1 + Math.pow(10, (avgElo - r.elo) / 400));
    const actual =
      0.5 + (0.5 * (r.chipsEnd - buyIn)) / (buyIn * (numPlayers - 1));
    // Scale K by numPlayers/2 so ELO changes stay meaningful at large tables.
    // N=2 is unchanged (×1), N=9 scales up ×4.5.
    const change = Math.round(K * (numPlayers / 2) * (actual - expected));
    return {
      playerId: r.playerId,
      eloBefore: r.elo,
      eloAfter: r.elo + change,
      change,
    };
  });
}
