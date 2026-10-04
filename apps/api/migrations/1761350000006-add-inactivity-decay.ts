import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInactivityDecay1761350000006 implements MigrationInterface {
  name = "AddInactivityDecay1761350000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "last_played_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "missed_sessions" int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "inactivity_level" int NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(`
      UPDATE "players" p
      SET "last_played_at" = x.last_at
      FROM (
        SELECT sp.player_id, MAX(s.locked_at) AS last_at
        FROM "session_players" sp
        JOIN "sessions" s ON s.id = sp.session_id
        WHERE s.is_locked = true AND s.locked_at IS NOT NULL
        GROUP BY sp.player_id
      ) x
      WHERE x.player_id = p.id AND p."last_played_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "elo_adjustments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "domain" text NOT NULL,
        "player_id" text NOT NULL,
        "type" text NOT NULL,
        "amount" int NOT NULL,
        "elo_before" int NOT NULL,
        "elo_after" int NOT NULL,
        "session_id" uuid,
        "level" int NOT NULL DEFAULT 0,
        "missed_sessions" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_elo_adjustments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_elo_adjustments_player_created" ON "elo_adjustments" ("player_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_elo_adjustments_session" ON "elo_adjustments" ("session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "elo_adjustments"`);
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN IF EXISTS "inactivity_level"`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN IF EXISTS "missed_sessions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN IF EXISTS "last_played_at"`,
    );
  }
}
