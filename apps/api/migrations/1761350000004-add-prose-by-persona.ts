import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddProseByPersona1761350000004 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE season_recaps ADD COLUMN IF NOT EXISTS prose_by_persona jsonb`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE season_recaps DROP COLUMN IF EXISTS prose_by_persona`);
  }
}
