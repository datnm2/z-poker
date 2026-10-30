import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import { stackBuyIns, stackDelta } from "./stack.math";

export interface StackQuarterDto {
  year: number;
  quarter: number;
  netChips: number;
  netBuyIns: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  bestGame: number;
  worstGame: number;
  startStack: number;
  endStack: number;
  peakStack: number;
}

export interface StackTimelineEntryDto {
  sessionId: string;
  lockedAt: string;
  buyIn: number;
  chipsEnd: number;
  delta: number;
  stackAfter: number;
}

export interface PlayerStackDto {
  total: {
    chips: number;
    buyIns: number;
    games: number;
    wins: number;
    losses: number;
    ties: number;
    peak: number;
    trough: number;
    avgBuyIns: number;
    winRate: number;
    bestGame: number;
    worstGame: number;
    bestGameBuyIns: number;
    worstGameBuyIns: number;
  };
  rank: {
    byStack: number | null;
    byAvg: number | null;
    of: number;
  };
  quarters: StackQuarterDto[];
  timeline: StackTimelineEntryDto[];
}

@Injectable()
export class StacksService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * Applies every locked session in the domain that hasn't been added to the
   * players' stacks yet, oldest first. Idempotent: rows with stack_after set
   * are skipped, so a missed event is healed by the next call.
   * Returns the ids of players whose stack changed.
   */
  async applyPending(domain: string): Promise<string[]> {
    return this.ds.transaction(async (m) => {
      await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`stack:${domain}`]);
      const sessions: { id: string; buyIn: number }[] = await m.query(
        `SELECT DISTINCT s.id, s.buy_in AS "buyIn", s.locked_at
         FROM sessions s
         JOIN session_players sp ON sp.session_id = s.id
         WHERE s.domain = $1 AND s.is_locked = true AND s.locked_at IS NOT NULL
           AND sp.chips_end IS NOT NULL AND sp.stack_after IS NULL
         ORDER BY s.locked_at, s.id`,
        [domain],
      );
      const affected = new Set<string>();
      for (const s of sessions) {
        const rows: { id: string; playerId: string; chipsEnd: number }[] = await m.query(
          `SELECT id, player_id AS "playerId", chips_end AS "chipsEnd"
           FROM session_players
           WHERE session_id = $1 AND chips_end IS NOT NULL AND stack_after IS NULL
           ORDER BY player_id`,
          [s.id],
        );
        for (const r of rows) {
          const delta = stackDelta(r.chipsEnd, s.buyIn);
          const bi = stackBuyIns(delta, s.buyIn);
          // Row lock on the player serializes concurrent applications.
          const [updated]: [{ total: string; bi: string }[], number] = await m.query(
            `UPDATE players
             SET stack_total = stack_total + $2, stack_buyins = stack_buyins + $3
             WHERE id = $1
             RETURNING stack_total AS total, stack_buyins AS bi`,
            [r.playerId, delta, bi],
          );
          const p = updated[0];
          if (!p) continue;
          await m.query(
            `UPDATE session_players
             SET stack_delta = $2, stack_after = $3, stack_after_buyins = $4
             WHERE id = $1`,
            [r.id, delta, p.total, p.bi],
          );
          affected.add(r.playerId);
        }
      }
      if (affected.size) await this.recomputeQuarterly(m, [...affected]);
      return [...affected];
    });
  }

  private async recomputeQuarterly(m: EntityManager, playerIds: string[]): Promise<void> {
    await m.query(
      `INSERT INTO player_stack_quarterly
         (player_id, year, quarter, net_chips, net_buyins, games, wins, losses, ties,
          best_game, worst_game, start_stack, end_stack, peak_stack, updated_at)
       SELECT player_id, yr, qtr,
              SUM(delta), ROUND(SUM(bi), 3), COUNT(*),
              COUNT(*) FILTER (WHERE delta > 0),
              COUNT(*) FILTER (WHERE delta < 0),
              COUNT(*) FILTER (WHERE delta = 0),
              MAX(delta), MIN(delta),
              MIN(start_stack), MIN(end_stack), MAX(stack_after), now()
       FROM (
         SELECT sp.player_id,
                EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC')::int AS yr,
                EXTRACT(QUARTER FROM s.locked_at AT TIME ZONE 'UTC')::int AS qtr,
                sp.stack_delta AS delta,
                CASE WHEN s.buy_in = 0 THEN 0 ELSE sp.stack_delta::numeric / s.buy_in END AS bi,
                sp.stack_after,
                first_value(sp.stack_after - sp.stack_delta) OVER y AS start_stack,
                last_value(sp.stack_after) OVER y AS end_stack
         FROM session_players sp
         JOIN sessions s ON s.id = sp.session_id
         WHERE sp.stack_after IS NOT NULL AND sp.player_id = ANY($1)
         WINDOW y AS (
           PARTITION BY sp.player_id, EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC'), EXTRACT(QUARTER FROM s.locked_at AT TIME ZONE 'UTC')
           ORDER BY s.locked_at, s.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
       ) t
       GROUP BY player_id, yr, qtr
       ON CONFLICT (player_id, year, quarter) DO UPDATE SET
         net_chips = EXCLUDED.net_chips, net_buyins = EXCLUDED.net_buyins,
         games = EXCLUDED.games, wins = EXCLUDED.wins, losses = EXCLUDED.losses,
         ties = EXCLUDED.ties, best_game = EXCLUDED.best_game,
         worst_game = EXCLUDED.worst_game, start_stack = EXCLUDED.start_stack,
         end_stack = EXCLUDED.end_stack, peak_stack = EXCLUDED.peak_stack,
         updated_at = now()`,
      [playerIds],
    );
  }

  /** Wipes and recomputes stacks from scratch (ops safety net). */
  async rebuild(domain: string): Promise<string[]> {
    await this.ds.transaction(async (m) => {
      await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`stack:${domain}`]);
      await m.query(
        `UPDATE session_players SET stack_delta = NULL, stack_after = NULL, stack_after_buyins = NULL
         WHERE session_id IN (SELECT id FROM sessions WHERE domain = $1)`,
        [domain],
      );
      await m.query(
        `DELETE FROM player_stack_quarterly WHERE player_id IN (SELECT id FROM players WHERE domain = $1)`,
        [domain],
      );
      await m.query(`UPDATE players SET stack_total = 0, stack_buyins = 0 WHERE domain = $1`, [domain]);
    });
    return this.applyPending(domain);
  }

  async getForPlayer(playerId: string, domain: string): Promise<PlayerStackDto | null> {
    const [player] = await this.ds.query(
      `SELECT stack_total AS chips, stack_buyins AS bi FROM players WHERE id = $1 AND domain = $2`,
      [playerId, domain],
    );
    if (!player) return null;
    const quarterRows: Record<string, string | number>[] = await this.ds.query(
      `SELECT * FROM player_stack_quarterly WHERE player_id = $1 ORDER BY year DESC, quarter DESC`,
      [playerId],
    );
    const quarters: StackQuarterDto[] = quarterRows.map((r) => ({
      year: Number(r.year),
      quarter: Number(r.quarter),
      netChips: Number(r.net_chips),
      netBuyIns: Number(r.net_buyins),
      games: Number(r.games),
      wins: Number(r.wins),
      losses: Number(r.losses),
      ties: Number(r.ties),
      bestGame: Number(r.best_game),
      worstGame: Number(r.worst_game),
      startStack: Number(r.start_stack),
      endStack: Number(r.end_stack),
      peakStack: Number(r.peak_stack),
    }));
    const tl: {
      sessionId: string;
      lockedAt: Date;
      buyIn: number;
      chipsEnd: number;
      delta: number;
      stackAfter: string;
    }[] = await this.ds.query(
      `SELECT s.id AS "sessionId", s.locked_at AS "lockedAt", s.buy_in AS "buyIn",
              sp.chips_end AS "chipsEnd", sp.stack_delta AS delta, sp.stack_after AS "stackAfter"
       FROM session_players sp
       JOIN sessions s ON s.id = sp.session_id
       WHERE sp.player_id = $1 AND sp.stack_after IS NOT NULL
       ORDER BY s.locked_at, s.id`,
      [playerId],
    );
    const timeline: StackTimelineEntryDto[] = tl.map((r) => ({
      sessionId: r.sessionId,
      lockedAt: new Date(r.lockedAt).toISOString(),
      buyIn: r.buyIn,
      chipsEnd: r.chipsEnd,
      delta: r.delta,
      stackAfter: Number(r.stackAfter),
    }));
    const [rk] = await this.ds.query(
      `WITH g AS (
         SELECT p.id, p.stack_total, p.stack_buyins, SUM(y.games) AS games
         FROM players p
         JOIN player_stack_quarterly y ON y.player_id = p.id
         WHERE p.domain = $2
         GROUP BY p.id
       ), r AS (
         SELECT id,
                RANK() OVER (ORDER BY stack_total DESC) AS by_stack,
                RANK() OVER (ORDER BY stack_buyins / games DESC) AS by_avg,
                COUNT(*) OVER () AS total
         FROM g
       )
       SELECT by_stack, by_avg, total FROM r WHERE id = $1`,
      [playerId, domain],
    );
    const sum = (k: "games" | "wins" | "losses" | "ties") => quarters.reduce((a, y) => a + y[k], 0);
    const gameBi = timeline.map((t) => stackBuyIns(t.delta, t.buyIn));
    const stacks = timeline.map((t) => t.stackAfter);
    return {
      total: {
        chips: Number(player.chips),
        buyIns: Number(player.bi),
        games: sum("games"),
        wins: sum("wins"),
        losses: sum("losses"),
        ties: sum("ties"),
        peak: stacks.length ? Math.max(0, ...stacks) : 0,
        trough: stacks.length ? Math.min(0, ...stacks) : 0,
        avgBuyIns: sum("games") ? Math.round((Number(player.bi) / sum("games")) * 1000) / 1000 : 0,
        winRate: sum("games") ? Math.round((sum("wins") / sum("games")) * 100) : 0,
        bestGame: quarters.length ? Math.max(...quarters.map((y) => y.bestGame)) : 0,
        worstGame: quarters.length ? Math.min(...quarters.map((y) => y.worstGame)) : 0,
        bestGameBuyIns: gameBi.length ? Math.max(...gameBi) : 0,
        worstGameBuyIns: gameBi.length ? Math.min(...gameBi) : 0,
      },
      rank: {
        byStack: rk ? Number(rk.by_stack) : null,
        byAvg: rk ? Number(rk.by_avg) : null,
        of: rk ? Number(rk.total) : 0,
      },
      quarters,
      timeline,
    };
  }
}
