import type { TranslationKey } from "@/i18n/translations";

export interface EloTier {
  key: TranslationKey;
  icon: string;
  colorClass: string;
  bgClass: string;
  fillClass: string; // solid bg for progress bar fill — must be a complete static class
  minElo: number;
  maxElo: number; // exclusive, Infinity for top rank
  hasDivisions: boolean;
}

// 6 ranks, each 150-elo span except Thần Bài (open-ended).
// Divisions split each span into 3 equal parts (50 elo each).
export const ELO_TIERS: EloTier[] = [
  {
    key: "rank.godlike",
    icon: "👑",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-400/20",
    fillClass: "bg-violet-400",
    minElo: 1600,
    maxElo: Infinity,
    hasDivisions: false,
  },
  {
    key: "rank.predator",
    icon: "🦈",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-400/15",
    fillClass: "bg-blue-400",
    minElo: 1450,
    maxElo: 1600,
    hasDivisions: true,
  },
  {
    key: "rank.veteran",
    icon: "💰",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-400/15",
    fillClass: "bg-emerald-400",
    minElo: 1300,
    maxElo: 1450,
    hasDivisions: true,
  },
  {
    key: "rank.novice",
    icon: "🎯",
    colorClass: "text-yellow-400",
    bgClass: "bg-yellow-400/15",
    fillClass: "bg-yellow-400",
    minElo: 1150,
    maxElo: 1300,
    hasDivisions: true,
  },
  {
    key: "rank.rookie",
    icon: "🃏",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-400/15",
    fillClass: "bg-orange-400",
    minElo: 1000,
    maxElo: 1150,
    hasDivisions: true,
  },
  {
    key: "rank.fish",
    icon: "🐟",
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-400/15",
    fillClass: "bg-zinc-400",
    minElo: -Infinity,
    maxElo: 1000,
    hasDivisions: false,
  },
];

export function getEloTier(elo: number): EloTier {
  return ELO_TIERS.find((t) => elo >= t.minElo) ?? ELO_TIERS[ELO_TIERS.length - 1];
}

export interface DivisionInfo {
  stars: number; // 1, 2, 3 — or 0 for ranks without divisions
  progressPct: number; // 0–100 within current division (or within rank for no-div ranks)
  eloToNext: number | null; // null at top rank
  nextTierKey: TranslationKey | null; // key of next rank (when about to rank up), null within same rank div
  isRankUp: boolean; // true if next boundary is a rank change (not just div change)
}

export function getDivisionInfo(elo: number): DivisionInfo {
  const tierIndex = ELO_TIERS.findIndex((t) => elo >= t.minElo);
  const tier = ELO_TIERS[tierIndex];
  const nextTier = tierIndex > 0 ? ELO_TIERS[tierIndex - 1] : null;

  // Top rank — no divisions, no ceiling
  if (!tier.hasDivisions && tier.maxElo === Infinity) {
    return { stars: 0, progressPct: 100, eloToNext: null, nextTierKey: null, isRankUp: false };
  }

  // Bottom rank — no divisions, show progress toward first rank
  if (!tier.hasDivisions) {
    const floor = 850;
    const span = tier.maxElo - floor;
    const progressPct = Math.min(100, Math.max(0, Math.round(((elo - floor) / span) * 100)));
    return { stars: 0, progressPct, eloToNext: tier.maxElo - elo, nextTierKey: nextTier?.key ?? null, isRankUp: true };
  }

  const span = tier.maxElo - tier.minElo;
  const divSize = span / 3;
  const posInTier = elo - tier.minElo;
  const divIndex = Math.min(2, Math.floor(posInTier / divSize)); // 0=★, 1=★★, 2=★★★

  const divStart = tier.minElo + divIndex * divSize;
  const progressPct = Math.min(99, Math.round(((elo - divStart) / divSize) * 100));

  const isRankUp = divIndex === 2;
  const nextBoundary = isRankUp ? tier.maxElo : divStart + divSize;
  const eloToNext = Math.ceil(nextBoundary - elo);

  return {
    stars: divIndex + 1,
    progressPct,
    eloToNext,
    nextTierKey: isRankUp ? (nextTier?.key ?? null) : null,
    isRankUp,
  };
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

  if (isFirst && chipsEnd >= buyIn * 3) return { key: "game.dominator", icon: "🔥", colorClass: "text-purple-400" };
  if (isFirst) return { key: "game.tableBoss", icon: "👑", colorClass: "text-amber-400" };
  if (isLast || chipsEnd === 0) return { key: "game.sponsor", icon: "💸", colorClass: "text-red-400" };
  if (delta > buyIn * 0.1) return { key: "game.profitHunter", icon: "📈", colorClass: "text-green-400" };
  if (delta >= -buyIn * 0.1) return { key: "game.survivor", icon: "⚖️", colorClass: "text-yellow-400" };
  return { key: "game.bleeder", icon: "🩸", colorClass: "text-orange-400" };
}
