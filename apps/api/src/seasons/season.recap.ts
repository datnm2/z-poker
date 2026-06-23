// Pure season-recap aggregation, decoupled from the DB so it can be unit-tested.

import type { SeasonRecapProse } from "./season-recap.entity";

export const MIN_GAMES_FOR_WINRATE = 3;
export const TOP_N = 3;

interface PlayerRef {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
}

export interface RecapRow {
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  sessionId: string;
  chipsEnd: number;
  buyIn: number;
  eloBefore: number | null;
  eloAfter: number | null;
  lockedAt: Date;
  playedDate: string | Date;
}

export interface SeasonRecapDto {
  seasonKey: string;
  totalGames: number;
  hardest: (PlayerRef & { games: number })[];
  topWinrate: (PlayerRef & { wins: number; games: number; pct: number })[];
  records: {
    chipRatio: (PlayerRef & { ratio: number; sessionId: string }) | null;
    biggestTable: { sessionId: string; playerCount: number; playedDate: string } | null;
    biggestEloGain: (PlayerRef & { gain: number; sessionId: string }) | null;
    longestWinStreak: (PlayerRef & { length: number }) | null;
    longestLossStreak: (PlayerRef & { length: number }) | null;
  };
  prose?: SeasonRecapProse | null;
}

function toDateStr(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// `rows` MUST be ordered chronologically (locked_at ASC) for streak computation.
export function computeRecap(seasonKey: string, rows: RecapRow[]): SeasonRecapDto {
  const refOf = (r: RecapRow): PlayerRef => ({
    playerId: r.playerId,
    playerName: r.playerName,
    avatarUrl: r.avatarUrl,
  });

  const totalGames = new Set(rows.map((r) => r.sessionId)).size;

  const byPlayer = new Map<
    string,
    { ref: PlayerRef; games: number; wins: number; rows: RecapRow[] }
  >();
  for (const r of rows) {
    let agg = byPlayer.get(r.playerId);
    if (!agg) {
      agg = { ref: refOf(r), games: 0, wins: 0, rows: [] };
      byPlayer.set(r.playerId, agg);
    }
    agg.games += 1;
    if (Number(r.chipsEnd) > Number(r.buyIn)) agg.wins += 1;
    agg.rows.push(r);
  }

  const aggs = [...byPlayer.values()];

  const hardest = aggs
    .slice()
    .sort((a, b) => b.games - a.games)
    .slice(0, TOP_N)
    .map((a) => ({ ...a.ref, games: a.games }));

  const topWinrate = aggs
    .filter((a) => a.games >= MIN_GAMES_FOR_WINRATE)
    .map((a) => ({ ...a.ref, wins: a.wins, games: a.games, pct: a.wins / a.games }))
    .sort((a, b) => b.pct - a.pct || b.games - a.games)
    .slice(0, TOP_N);

  let chipRatio: SeasonRecapDto["records"]["chipRatio"] = null;
  let biggestEloGain: SeasonRecapDto["records"]["biggestEloGain"] = null;
  for (const r of rows) {
    const ratio = Number(r.chipsEnd) / Number(r.buyIn);
    if (!chipRatio || ratio > chipRatio.ratio) {
      chipRatio = { ...refOf(r), ratio, sessionId: r.sessionId };
    }
    if (r.eloBefore != null && r.eloAfter != null) {
      const gain = Number(r.eloAfter) - Number(r.eloBefore);
      if (!biggestEloGain || gain > biggestEloGain.gain) {
        biggestEloGain = { ...refOf(r), gain, sessionId: r.sessionId };
      }
    }
  }

  const tableCount = new Map<string, { count: number; playedDate: string }>();
  for (const r of rows) {
    const entry = tableCount.get(r.sessionId);
    if (entry) entry.count += 1;
    else tableCount.set(r.sessionId, { count: 1, playedDate: toDateStr(r.playedDate) });
  }
  let biggestTable: SeasonRecapDto["records"]["biggestTable"] = null;
  for (const [sessionId, v] of tableCount) {
    if (!biggestTable || v.count > biggestTable.playerCount) {
      biggestTable = { sessionId, playerCount: v.count, playedDate: v.playedDate };
    }
  }

  let longestWinStreak: SeasonRecapDto["records"]["longestWinStreak"] = null;
  let longestLossStreak: SeasonRecapDto["records"]["longestLossStreak"] = null;
  for (const agg of aggs) {
    let win = 0;
    let loss = 0;
    let maxWin = 0;
    let maxLoss = 0;
    for (const r of agg.rows) {
      const diff = Number(r.chipsEnd) - Number(r.buyIn);
      if (diff > 0) {
        win += 1;
        loss = 0;
      } else if (diff < 0) {
        loss += 1;
        win = 0;
      } else {
        win = 0;
        loss = 0;
      }
      if (win > maxWin) maxWin = win;
      if (loss > maxLoss) maxLoss = loss;
    }
    if (maxWin > 0 && (!longestWinStreak || maxWin > longestWinStreak.length)) {
      longestWinStreak = { ...agg.ref, length: maxWin };
    }
    if (maxLoss > 0 && (!longestLossStreak || maxLoss > longestLossStreak.length)) {
      longestLossStreak = { ...agg.ref, length: maxLoss };
    }
  }

  return {
    seasonKey,
    totalGames,
    hardest,
    topWinrate,
    records: {
      chipRatio,
      biggestTable,
      biggestEloGain,
      longestWinStreak,
      longestLossStreak,
    },
  };
}
