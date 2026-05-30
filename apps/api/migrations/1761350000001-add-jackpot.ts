import { MigrationInterface, QueryRunner } from "typeorm";

export class AddJackpot1761350000001 implements MigrationInterface {
  name = "AddJackpot1761350000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" ADD "jackpot" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_players" ADD COLUMN IF NOT EXISTS "jackpot_paid" int`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "jackpot"`);
    await queryRunner.query(
      `ALTER TABLE "session_players" DROP COLUMN IF EXISTS "jackpot_paid"`,
    );
  }
}
