import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarUrl1744300000000 implements MigrationInterface {
  name = "AddAvatarUrl1744300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "avatar_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "players" DROP COLUMN IF EXISTS "avatar_url"`,
    );
  }
}
