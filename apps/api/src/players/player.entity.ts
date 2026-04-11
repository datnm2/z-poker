import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

@Entity("players")
@Index("idx_players_domain_elo", ["domain", "elo"])
export class Player {
  @PrimaryColumn({ type: "text" })
  id!: string; // Clerk user ID, e.g. "user_2abc..."

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  domain!: string; // derived from email at insert time

  @Column({ type: "int", default: 1200 })
  elo!: number;

  @Column({ name: "games_played", type: "int", default: 0 })
  gamesPlayed!: number;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
