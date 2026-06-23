import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeasonRecapProse1761350000003 implements MigrationInterface {
  name = "AddSeasonRecapProse1761350000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "season_recaps" (
        "domain" text NOT NULL,
        "season_key" text NOT NULL,
        "prose" jsonb,
        "recap_visible" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_season_recaps" PRIMARY KEY ("domain", "season_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "season_recaps"`);
  }
}
