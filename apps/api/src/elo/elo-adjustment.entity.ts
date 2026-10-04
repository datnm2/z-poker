import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type EloAdjustmentType = "inactivity";

@Entity("elo_adjustments")
@Index("idx_elo_adjustments_player_created", ["playerId", "createdAt"])
@Index("idx_elo_adjustments_session", ["sessionId"])
export class EloAdjustment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  domain!: string;

  @Column({ name: "player_id", type: "text" })
  playerId!: string;

  @Column({ type: "text" })
  type!: EloAdjustmentType;

  @Column({ type: "int" })
  amount!: number;

  @Column({ name: "elo_before", type: "int" })
  eloBefore!: number;

  @Column({ name: "elo_after", type: "int" })
  eloAfter!: number;

  @Column({ name: "session_id", type: "uuid", nullable: true })
  sessionId!: string | null;

  @Column({ type: "int", default: 0 })
  level!: number;

  @Column({ name: "missed_sessions", type: "int", default: 0 })
  missedSessions!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
