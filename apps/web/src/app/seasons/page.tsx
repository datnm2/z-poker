"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api";
import type { SeasonListItemDto } from "@/types/database";

export default function SeasonsListPage() {
  const { api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const [seasons, setSeasons] = useState<SeasonListItemDto[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const fetchSeasons = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<SeasonListItemDto[]>("/seasons");
      setSeasons(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;
      setError({ message, status });
    } finally {
      setInitialized(true);
    }
  }, [api]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) fetchSeasons();
  }, [authLoading, isLoggedIn, fetchSeasons]);

  if (authLoading || !initialized) return <Loading fullscreen />;
  if (error && seasons.length === 0) {
    return <ErrorState fullscreen message={error.message} status={error.status} onRetry={fetchSeasons} />;
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-safe-nav pt-12">
      <div className="mb-4 flex items-center gap-3 pr-24">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-card/60 text-muted transition active:scale-95 active:bg-accent/10 active:text-foreground"
          aria-label={t("back")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-xl font-bold text-transparent">
          {t("seasons.list.title")}
        </h1>
      </div>

      {seasons.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{t("seasons.list.empty")}</p>
      ) : (
        <div className="space-y-2">
          {seasons.map((s) => (
            <Link
              key={s.seasonKey}
              href={`/seasons/${s.seasonKey}`}
              className="animate-slide-in flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-4 transition-all duration-150 active:scale-[0.98] active:border-accent/40"
            >
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground">{s.seasonKey}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {s.champion ? `🏆 ${s.champion.playerName} · ` : ""}
                  {t("seasons.list.games").replace("{n}", String(s.totalGames))} ·{" "}
                  {t("seasons.list.players").replace("{n}", String(s.playerCount))}
                </p>
                <p className="mt-0.5 text-[10px] text-muted/60">
                  {new Date(s.closedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <svg
                className="h-4 w-4 flex-shrink-0 text-accent/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
