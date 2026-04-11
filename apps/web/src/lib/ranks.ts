import type { TranslationKey } from "@/i18n/translations";

export interface EloTier {
  key: TranslationKey;
  icon: string;
  colorClass: string;
  bgClass: string;
  minElo: number;
}

export const ELO_TIERS: EloTier[] = [
  { key: "rank.godlike", icon: "👑", colorClass: "text-purple-400", bgClass: "bg-purple-400/15", minElo: 1600 },
  { key: "rank.shark", icon: "🦈", colorClass: "text-cyan-400", bgClass: "bg-cyan-400/15", minElo: 1450 },
  { key: "rank.veteran", icon: "⚡", colorClass: "text-green-400", bgClass: "bg-green-400/15", minElo: 1350 },
  { key: "rank.grinder", icon: "🎯", colorClass: "text-yellow-400", bgClass: "bg-yellow-400/15", minElo: 1250 },
  { key: "rank.rookie", icon: "🐣", colorClass: "text-orange-400", bgClass: "bg-orange-400/15", minElo: 1150 },
  { key: "rank.fish", icon: "🐟", colorClass: "text-red-400", bgClass: "bg-red-400/15", minElo: -Infinity },
];

export function getEloTier(elo: number): EloTier {
  return ELO_TIERS.find((t) => elo >= t.minElo) ?? ELO_TIERS[ELO_TIERS.length - 1];
}

export interface SessionTitle {
  key: TranslationKey;
  icon: string;
  colorClass: string;
}

export function getSessionTitle(
  rank: number,
  totalPlayers: number,
  chipsEnd: number,
  buyIn: number,
): SessionTitle {
  const delta = chipsEnd - buyIn;
  const isFirst = rank === 0;
  const isLast = rank === totalPlayers - 1 && totalPlayers > 1;

  if (isFirst && chipsEnd >= buyIn * 2) return { key: "game.dominator", icon: "🔥", colorClass: "text-purple-400" };
  if (isFirst) return { key: "game.tableBoss", icon: "👑", colorClass: "text-amber-400" };
  if (isLast) return { key: "game.sponsor", icon: "💸", colorClass: "text-red-400" };
  if (delta > buyIn * 0.1) return { key: "game.profitHunter", icon: "📈", colorClass: "text-green-400" };
  if (delta >= -buyIn * 0.1) return { key: "game.survivor", icon: "⚖️", colorClass: "text-yellow-400" };
  return { key: "game.bleeder", icon: "🩸", colorClass: "text-orange-400" };
}
