import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerfIndexes1745000000000 implements MigrationInterface {
  name = "AddPerfIndexes1745000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // sessions.created_by — used in joins when listing sessions with creator info
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sessions_created_by" ON "sessions" ("created_by")`,
    );

    // sessions(domain, is_locked, created_at) — used by listActiveForDomain
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_sessions_domain_locked_created" ON "sessions" ("domain", "is_locked", "created_at" DESC)`,
    );

    // session_players(player_id, updated_at) — used by getHistory ORDER BY
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_session_players_player_updated" ON "session_players" ("player_id", "updated_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_session_players_player_updated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_domain_locked_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sessions_created_by"`);
  }
}
