import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

@Entity("season_results")
@Unique("uq_season_results_domain_key_player", ["domain", "seasonKey", "playerId"])
@Index("idx_season_results_domain_key", ["domain", "seasonKey"])
export class SeasonResult {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  domain!: string;

  @Column({ name: "season_key", type: "text" })
  seasonKey!: string;

  @Column({ name: "player_id", type: "text" })
  playerId!: string;

  @Column({ name: "player_name", type: "text" })
  playerName!: string;

  @Column({ name: "final_elo", type: "int" })
  finalElo!: number;

  @Column({ name: "final_rank", type: "int" })
  finalRank!: number;

  @Column({ name: "games_played", type: "int" })
  gamesPlayed!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
