import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface SeasonRecapProse {
  slides: Record<string, LocalizedText>;
  personaId?: string;
  personaName?: LocalizedText;
  model: string;
  generatedAt: string;
}

@Entity("season_recaps")
export class SeasonRecap {
  @PrimaryColumn({ type: "text" })
  domain!: string;

  @PrimaryColumn({ name: "season_key", type: "text" })
  seasonKey!: string;

  @Column({ type: "jsonb", nullable: true })
  prose!: SeasonRecapProse | null;

  @Column({ name: "prose_by_persona", type: "jsonb", nullable: true })
  proseByPersona!: Record<string, SeasonRecapProse> | null;

  @Column({ name: "recap_visible", type: "boolean", default: true })
  recapVisible!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
