import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { SessionHighlights } from "./highlights/highlights.types";

@Entity("sessions")
@Index("idx_sessions_domain_date", ["domain", "playedDate"])
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "played_date", type: "date" })
  playedDate!: string;

  @Column({ name: "buy_in", type: "int", default: 1000 })
  buyIn!: number;

  @Column({ type: "text" })
  domain!: string;

  @Column({ name: "created_by", type: "text" })
  createdBy!: string; // Player.id (Clerk user ID)

  @Column({ name: "is_locked", type: "boolean", default: false })
  isLocked!: boolean;

  @Column({ name: "locked_at", type: "timestamptz", nullable: true })
  lockedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "jsonb", nullable: true })
  highlights!: SessionHighlights | null;
}
