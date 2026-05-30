import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("session_players")
@Unique("session_players_session_id_player_id_key", ["sessionId", "playerId"])
@Index("idx_session_players_session", ["sessionId"])
@Index("idx_session_players_player", ["playerId"])
export class SessionPlayer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "session_id", type: "uuid" })
  sessionId!: string;

  @Column({ name: "player_id", type: "text" })
  playerId!: string;

  @Column({ name: "chips_end", type: "int", nullable: true })
  chipsEnd!: number | null;

  @Column({ name: "elo_before", type: "int", nullable: true })
  eloBefore!: number | null;

  @Column({ name: "elo_after", type: "int", nullable: true })
  eloAfter!: number | null;

  @Column({ name: "streak_bonus", type: "int", nullable: true })
  streakBonus!: number | null;

  @Column({ name: "jackpot_paid", type: "int", nullable: true })
  jackpotPaid!: number | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
