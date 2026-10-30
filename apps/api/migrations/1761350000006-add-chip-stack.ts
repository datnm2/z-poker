import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChipStack1761350000006 implements MigrationInterface {
  name = "AddChipStack1761350000006";

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "session_players"
        ADD COLUMN IF NOT EXISTS "stack_delta" int,
        ADD COLUMN IF NOT EXISTS "stack_after" bigint,
        ADD COLUMN IF NOT EXISTS "stack_after_buyins" numeric(12,3)
    `);
    await q.query(`
      ALTER TABLE "players"
        ADD COLUMN IF NOT EXISTS "stack_total" bigint NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "stack_buyins" numeric(12,3) NOT NULL DEFAULT 0
    `);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "player_stack_yearly" (
        "player_id" text NOT NULL,
        "year" int NOT NULL,
        "net_chips" bigint NOT NULL,
        "net_buyins" numeric(12,3) NOT NULL,
        "games" int NOT NULL,
        "wins" int NOT NULL,
        "losses" int NOT NULL,
        "ties" int NOT NULL,
        "best_game" int NOT NULL,
        "worst_game" int NOT NULL,
        "start_stack" bigint NOT NULL,
        "end_stack" bigint NOT NULL,
        "peak_stack" bigint NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_player_stack_yearly" PRIMARY KEY ("player_id", "year")
      )
    `);

    // Backfill: running totals per player ordered by (locked_at, session id).
    await q.query(`
      WITH g AS (
        SELECT sp.id,
               (sp.chips_end - s.buy_in) AS delta,
               CASE WHEN s.buy_in = 0 THEN 0
                    ELSE (sp.chips_end - s.buy_in)::numeric / s.buy_in END AS bi,
               sp.player_id, s.locked_at, s.id AS sid
        FROM session_players sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE s.is_locked = true AND s.locked_at IS NOT NULL AND sp.chips_end IS NOT NULL
      ), r AS (
        SELECT id, delta,
               SUM(delta) OVER w AS stack_after,
               ROUND(SUM(bi) OVER w, 3) AS bi_after
        FROM g
        WINDOW w AS (PARTITION BY player_id ORDER BY locked_at, sid)
      )
      UPDATE session_players sp
      SET stack_delta = r.delta, stack_after = r.stack_after, stack_after_buyins = r.bi_after
      FROM r WHERE r.id = sp.id
    `);

    await q.query(`
      INSERT INTO player_stack_yearly
        (player_id, year, net_chips, net_buyins, games, wins, losses, ties,
         best_game, worst_game, start_stack, end_stack, peak_stack)
      SELECT player_id, yr,
             SUM(delta), ROUND(SUM(bi), 3), COUNT(*),
             COUNT(*) FILTER (WHERE delta > 0),
             COUNT(*) FILTER (WHERE delta < 0),
             COUNT(*) FILTER (WHERE delta = 0),
             MAX(delta), MIN(delta),
             MIN(start_stack), MIN(end_stack), MAX(stack_after)
      FROM (
        SELECT sp.player_id,
               EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC')::int AS yr,
               sp.stack_delta AS delta,
               CASE WHEN s.buy_in = 0 THEN 0
                    ELSE sp.stack_delta::numeric / s.buy_in END AS bi,
               sp.stack_after,
               first_value(sp.stack_after - sp.stack_delta) OVER y AS start_stack,
               last_value(sp.stack_after) OVER (
                 PARTITION BY sp.player_id, EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC')
                 ORDER BY s.locked_at, s.id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS end_stack
        FROM session_players sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE sp.stack_after IS NOT NULL
        WINDOW y AS (
          PARTITION BY sp.player_id, EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC')
          ORDER BY s.locked_at, s.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      ) t
      GROUP BY player_id, yr
    `);

    await q.query(`
      UPDATE players p
      SET stack_total = t.total, stack_buyins = t.bi
      FROM (
        SELECT sp.player_id,
               SUM(sp.stack_delta) AS total,
               ROUND(SUM(CASE WHEN s.buy_in = 0 THEN 0
                              ELSE sp.stack_delta::numeric / s.buy_in END), 3) AS bi
        FROM session_players sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE sp.stack_after IS NOT NULL
        GROUP BY sp.player_id
      ) t
      WHERE t.player_id = p.id
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "player_stack_yearly"`);
    await q.query(`ALTER TABLE "players" DROP COLUMN IF EXISTS "stack_total", DROP COLUMN IF EXISTS "stack_buyins"`);
    await q.query(
      `ALTER TABLE "session_players" DROP COLUMN IF EXISTS "stack_delta", DROP COLUMN IF EXISTS "stack_after", DROP COLUMN IF EXISTS "stack_after_buyins"`,
    );
  }
}
