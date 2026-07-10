import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropPlayedDate1761350000005 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_sessions_domain_date`);
    await qr.query(`ALTER TABLE sessions DROP COLUMN IF EXISTS played_date`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE sessions ADD COLUMN played_date date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await qr.query(`ALTER TABLE sessions ALTER COLUMN played_date DROP DEFAULT`);
    await qr.query(
      `CREATE INDEX idx_sessions_domain_date ON sessions (domain, played_date)`,
    );
  }
}
