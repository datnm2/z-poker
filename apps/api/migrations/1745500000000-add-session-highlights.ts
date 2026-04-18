import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionHighlights1745500000000 implements MigrationInterface {
  name = "AddSessionHighlights1745500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "highlights" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP COLUMN IF EXISTS "highlights"`,
    );
  }
}
