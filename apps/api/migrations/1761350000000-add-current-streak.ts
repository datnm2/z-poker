import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrentStreak1761350000000 implements MigrationInterface {
  name = "AddCurrentStreak1761350000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "current_streak" int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_players" ADD COLUMN IF NOT EXISTS "streak_bonus" int`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session_players" DROP COLUMN IF EXISTS "streak_bonus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN IF EXISTS "current_streak"`,
    );
  }
}
