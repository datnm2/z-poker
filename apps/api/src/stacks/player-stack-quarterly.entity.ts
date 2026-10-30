import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

const bigintNum = { to: (v?: number) => v, from: (v: string) => Number(v) };

@Entity("player_stack_quarterly")
export class PlayerStackQuarterly {
  @PrimaryColumn({ name: "player_id", type: "text" })
  playerId!: string;

  @PrimaryColumn({ type: "int" })
  year!: number;

  @PrimaryColumn({ type: "int" })
  quarter!: number;

  @Column({ name: "net_chips", type: "bigint", transformer: bigintNum })
  netChips!: number;

  @Column({ name: "net_buyins", type: "numeric", precision: 12, scale: 3, transformer: bigintNum })
  netBuyins!: number;

  @Column({ type: "int" })
  games!: number;

  @Column({ type: "int" })
  wins!: number;

  @Column({ type: "int" })
  losses!: number;

  @Column({ type: "int" })
  ties!: number;

  @Column({ name: "best_game", type: "int" })
  bestGame!: number;

  @Column({ name: "worst_game", type: "int" })
  worstGame!: number;

  @Column({ name: "start_stack", type: "bigint", transformer: bigintNum })
  startStack!: number;

  @Column({ name: "end_stack", type: "bigint", transformer: bigintNum })
  endStack!: number;

  @Column({ name: "peak_stack", type: "bigint", transformer: bigintNum })
  peakStack!: number;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
