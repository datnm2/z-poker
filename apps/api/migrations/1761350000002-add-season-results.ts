import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeasonResults1761350000002 implements MigrationInterface {
  name = "AddSeasonResults1761350000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "season_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "domain" text NOT NULL,
        "season_key" text NOT NULL,
        "player_id" text NOT NULL,
        "player_name" text NOT NULL,
        "final_elo" int NOT NULL,
        "final_rank" int NOT NULL,
        "games_played" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_season_results" PRIMARY KEY ("id"),
        CONSTRAINT "uq_season_results_domain_key_player" UNIQUE ("domain", "season_key", "player_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_season_results_domain_key" ON "season_results" ("domain", "season_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "season_results"`);
  }
}
