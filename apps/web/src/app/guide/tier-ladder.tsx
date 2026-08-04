"use client";

import { useI18n } from "@/providers/i18n-provider";
import { ELO_TIERS, getDivisionInfo, getEloTier } from "@/lib/ranks";

export function TierLadder({ currentElo }: { currentElo?: number }) {
  const { t } = useI18n();
  const currentTier = currentElo != null ? getEloTier(currentElo) : null;
  const divInfo = currentElo != null ? getDivisionInfo(currentElo) : null;

  const fillPct =
    currentTier && divInfo
      ? currentTier.hasDivisions
        ? (divInfo.stars - 1) * 33.33 + divInfo.progressPct * 0.3333
        : divInfo.progressPct
      : 0;

  const progressLabel =
    divInfo && divInfo.eloToNext !== null
      ? divInfo.nextTierKey
        ? t("rank.toNextRank").replace("{n}", String(divInfo.eloToNext))
        : t("rank.toNextDiv")
            .replace("{n}", String(divInfo.eloToNext))
            .replace("{stars}", "★".repeat(Math.min(3, divInfo.stars + 1)))
      : null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("guide.elo.tiers.title")}
      </h3>
      <div className="space-y-1">
        {ELO_TIERS.map((tier) => {
          const isCurrent = currentTier?.key === tier.key;
          return (
            <div
              key={tier.key}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                isCurrent ? tier.bgClass : ""
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center text-base">
                {tier.icon}
              </span>
              <span
                className={`min-w-[120px] text-sm font-semibold ${tier.colorClass}`}
              >
                {t(tier.key)}
              </span>
              <span className="text-xs text-muted">
                {tier.minElo === -Infinity
                  ? `< ${ELO_TIERS[ELO_TIERS.length - 2]?.minElo ?? 1060}`
                  : `${tier.minElo}+`}
              </span>
              {isCurrent && divInfo && (
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.bgClass} ${tier.colorClass}`}
                >
                  {t("guide.elo.youAreHere")}
                  {divInfo.stars > 0 && ` · ${"★".repeat(divInfo.stars)}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {currentTier && divInfo && divInfo.eloToNext !== null && (
        <div className="mt-3">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-inset ring-white/5">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${currentTier.fillClass} animate-bar-fill`}
              style={{ ["--bar-target" as string]: `${fillPct}%` }}
            />
          </div>
          {progressLabel && (
            <p className="mt-1.5 text-xs text-muted">{progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
