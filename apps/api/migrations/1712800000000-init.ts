import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1712800000000 implements MigrationInterface {
  name = "Init1712800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "players" (
        "id" text PRIMARY KEY,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "domain" text NOT NULL,
        "elo" int NOT NULL DEFAULT 1200,
        "games_played" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_players_domain_elo" ON "players" ("domain", "elo" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "played_date" date NOT NULL DEFAULT CURRENT_DATE,
        "buy_in" int NOT NULL DEFAULT 1000,
        "domain" text NOT NULL,
        "created_by" text NOT NULL REFERENCES "players"("id"),
        "is_locked" boolean NOT NULL DEFAULT false,
        "locked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_sessions_domain_date" ON "sessions" ("domain", "played_date" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "session_players" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
        "player_id" text NOT NULL REFERENCES "players"("id"),
        "chips_end" int,
        "elo_before" int,
        "elo_after" int,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "session_players_session_id_player_id_key" UNIQUE ("session_id", "player_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_session_players_session" ON "session_players" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_session_players_player" ON "session_players" ("player_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "session_players"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players"`);
  }
}
