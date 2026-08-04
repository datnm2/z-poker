"use client";

import { useI18n } from "@/providers/i18n-provider";
import { getStreakStyle } from "@/lib/ranks";

// Numbers come from the worked example in guide.elo.example.body
// (elo 1300 vs table avg 1200, 6 players, buy-in 100) — formula constants, not copy.
const ROWS = [
  {
    labelKey: "guide.example.win",
    icon: "📈",
    delta: "+7",
    deltaClass: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  },
  {
    labelKey: "guide.example.loss",
    icon: "📉",
    delta: "−9",
    deltaClass: "border-red-400/40 bg-red-400/10 text-red-300",
  },
  {
    labelKey: "guide.example.streak",
    icon: "🔥",
    delta: "+13",
    deltaClass: "border-amber-400/50 bg-amber-400/15 text-amber-300",
  },
] as const;

export function EloExampleCard() {
  const { t } = useI18n();
  const streak = getStreakStyle(3);

  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("guide.example.title")}
      </h3>
      <div className="space-y-2">
        {ROWS.map((row) => (
          <div
            key={row.labelKey}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-card-border bg-card/50 px-3 py-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base">
              {row.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {t(row.labelKey)}
            </span>
            {row.labelKey === "guide.example.streak" && streak && (
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${streak.classes}`}
              >
                {streak.label}
              </span>
            )}
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums ${row.deltaClass}`}
            >
              {row.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
