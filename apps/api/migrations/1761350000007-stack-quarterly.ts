import { MigrationInterface, QueryRunner } from "typeorm";

// Replaces the derived yearly aggregate with a quarterly one (UTC calendar quarters,
// same boundaries as seasons). Both tables are rebuilt purely from session_players.
const populate = (table: string, byQuarter: boolean) => {
  const qExpr = `EXTRACT(QUARTER FROM s.locked_at AT TIME ZONE 'UTC')::int`;
  const yExpr = `EXTRACT(YEAR FROM s.locked_at AT TIME ZONE 'UTC')::int`;
  const part = byQuarter
    ? `sp.player_id, ${yExpr}, ${qExpr}`
    : `sp.player_id, ${yExpr}`;
  const cols = byQuarter ? "player_id, year, quarter" : "player_id, year";
  return `
    INSERT INTO ${table}
      (${cols}, net_chips, net_buyins, games, wins, losses, ties,
       best_game, worst_game, start_stack, end_stack, peak_stack)
    SELECT ${cols},
           SUM(delta), ROUND(SUM(bi), 3), COUNT(*),
           COUNT(*) FILTER (WHERE delta > 0),
           COUNT(*) FILTER (WHERE delta < 0),
           COUNT(*) FILTER (WHERE delta = 0),
           MAX(delta), MIN(delta),
           MIN(start_stack), MIN(end_stack), MAX(stack_after)
    FROM (
      SELECT sp.player_id,
             ${yExpr} AS year,
             ${qExpr} AS quarter,
             sp.stack_delta AS delta,
             CASE WHEN s.buy_in = 0 THEN 0 ELSE sp.stack_delta::numeric / s.buy_in END AS bi,
             sp.stack_after,
             first_value(sp.stack_after - sp.stack_delta) OVER w AS start_stack,
             last_value(sp.stack_after) OVER w AS end_stack
      FROM session_players sp
      JOIN sessions s ON s.id = sp.session_id
      WHERE sp.stack_after IS NOT NULL
      WINDOW w AS (
        PARTITION BY ${part}
        ORDER BY s.locked_at, s.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    ) t
    GROUP BY ${cols}`;
};

const columns = `
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
  "updated_at" timestamptz NOT NULL DEFAULT now()`;

export class StackQuarterly1761350000007 implements MigrationInterface {
  name = "StackQuarterly1761350000007";

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "player_stack_yearly"`);
    await q.query(`
      CREATE TABLE "player_stack_quarterly" (
        "player_id" text NOT NULL,
        "year" int NOT NULL,
        "quarter" int NOT NULL,
        ${columns},
        CONSTRAINT "pk_player_stack_quarterly" PRIMARY KEY ("player_id", "year", "quarter")
      )`);
    await q.query(populate("player_stack_quarterly", true));
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "player_stack_quarterly"`);
    await q.query(`
      CREATE TABLE "player_stack_yearly" (
        "player_id" text NOT NULL,
        "year" int NOT NULL,
        ${columns},
        CONSTRAINT "pk_player_stack_yearly" PRIMARY KEY ("player_id", "year")
      )`);
    await q.query(populate("player_stack_yearly", false));
  }
}
