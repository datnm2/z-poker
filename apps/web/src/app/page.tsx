"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";
import type {
  GameResult,
  Player,
  SeasonLatestDto,
  SeasonRecapDto,
} from "@/types/database";
import { SeasonRecapStory } from "@/components/season-recap-story";
import {
  getEloTier,
  getDivisionInfo,
  getStreakStyle,
  ELO_TIERS,
} from "@/lib/ranks";
import { LandingContent } from "@/components/landing-content";
import { ErrorState } from "@/components/error-state";
import { TopThreePodium } from "@/components/top-three-podium";
import { LeaderboardCountdown } from "@/components/leaderboard-countdown";
import { ApiError } from "@/lib/api";

type LeaderboardPlayer = Pick<
  Player,
  | "id"
  | "name"
  | "elo"
  | "gamesPlayed"
  | "avatarUrl"
  | "currentStreak"
  | "lastResults"
  | "jackpot"
>;

function LeaderboardContent() {
  const { player, api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    status?: number;
  } | null>(null);
  const [seasonLatest, setSeasonLatest] = useState<SeasonLatestDto | null>(null);
  const [recap, setRecap] = useState<SeasonRecapDto | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [p, stats, latest] = await Promise.all([
        api.get<Player[]>("/players"),
        api.get<{ totalSessions: number }>("/sessions/stats"),
        api.get<SeasonLatestDto>("/seasons/latest").catch(() => null),
      ]);
      setPlayers(p);
      setTotalSessions(stats.totalSessions);
      setSeasonLatest(latest);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;
      setError({ message, status });
    } finally {
      setLoading(false);
    }
  }, [api]);

  const openRecap = useCallback(async () => {
    try {
      const data = await api.get<SeasonRecapDto>("/seasons/recap");
      setRecap(data);
    } catch {
      // recap unavailable — ignore, button just won't open
    }
  }, [api]);

  // Auto-open the recap once per user per season when a closed season exists.
  useEffect(() => {
    if (!seasonLatest?.available) return;
    const seenKey = `z-poker-recap-seen-${seasonLatest.seasonKey}`;
    if (localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "1");
    void openRecap();
  }, [seasonLatest, openRecap]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      setLoading(true);
      fetchData();
    }
  }, [authLoading, isLoggedIn, fetchData]);

  const sseHandlers = useMemo<SseHandlers>(
    () => ({
      "session.locked": (data) => {
        // Patch ELO + streak + form locally from payload instead of refetching /players.
        const byId = new Map(data.results.map((r) => [r.playerId, r]));
        setPlayers((prev) => {
          const next = prev.map((p) => {
            const r = byId.get(p.id);
            if (!r) return p;
            const result: GameResult =
              r.eloAfter > r.eloBefore
                ? "W"
                : r.eloAfter < r.eloBefore
                  ? "L"
                  : "T";
            return {
              ...p,
              elo: r.eloAfter,
              gamesPlayed: p.gamesPlayed + 1,
              currentStreak: r.streakAfter,
              lastResults: [result, ...p.lastResults].slice(0, 5),
              jackpot: r.jackpotAfter,
            };
          });
          return [...next].sort((a, b) => b.elo - a.elo);
        });
        setTotalSessions((n) => n + 1);
      },
      "season.reset": () => {
        // ELO was reset (or recap visibility toggled) server-side. Refetch — this
        // pulls fresh /seasons/latest (incl. recapVisible) and re-surfaces the recap.
        fetchData();
      },
    }),
    [fetchData],
  );

  useSseStream({
    path: isLoggedIn ? "/sessions/stream" : null,
    handlers: sseHandlers,
    onResync: fetchData,
    enabled: isLoggedIn,
  });

  if (authLoading || loading) {
    return <Loading fullscreen />;
  }

  if (!isLoggedIn) {
    return <LandingContent variant="public" />;
  }

  if (error) {
    return (
      <ErrorState
        fullscreen
        message={error.message}
        status={error.status}
        onRetry={() => {
          setLoading(true);
          fetchData();
        }}
      />
    );
  }

  // Top 3 — breathing hairline border + rare diagonal corner glint (jewelry-like).
  const RANK_BADGES = [
    {
      // #1 Gold
      medalBg: "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600",
      medalText: "text-amber-950",
      iconColor: "text-amber-300",
      style: {
        "--rank-color": "#fbbf24",
        "--rank-speed": "4.5s",
        "--rank-glint-speed": "6.5s",
      } as React.CSSProperties,
      glintColor: "rgba(254, 243, 199, 0.85)",
    },
    {
      // #2 Silver
      medalBg: "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500",
      medalText: "text-slate-900",
      iconColor: "text-slate-200",
      style: {
        "--rank-color": "#cbd5e1",
        "--rank-speed": "5.5s",
        "--rank-glint-speed": "8s",
      } as React.CSSProperties,
      glintColor: "rgba(248, 250, 252, 0.8)",
    },
    {
      // #3 Bronze
      medalBg: "bg-gradient-to-br from-orange-400 via-orange-600 to-amber-800",
      medalText: "text-white",
      iconColor: "text-orange-400",
      style: {
        "--rank-color": "#ea580c",
        "--rank-speed": "6s",
        "--rank-glint-speed": "9s",
      } as React.CSSProperties,
      glintColor: "rgba(253, 186, 116, 0.75)",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-safe-nav pt-12">
      {/* Domain HQ hero */}
      <section className="relative overflow-hidden rounded-2xl border border-card-border bg-card p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent-strong/15 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-2xl font-black leading-tight tracking-tight text-transparent">
                {t("leaderboard.title")}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {t("leaderboard.slogan")}
              </p>
            </div>
            {player?.domain && (
              <span className="inline-flex max-w-[45%] flex-shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <svg
                  className="h-3 w-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21V8l9-5 9 5v13M9 21V12h6v9"
                  />
                </svg>
                <span className="truncate font-mono">@{player.domain}</span>
              </span>
            )}
          </div>

          {/* Stats row — one panel, two halves. Right half is tappable. */}
          <div className="mt-4 flex items-stretch overflow-hidden rounded-xl border border-accent/25 bg-background/40 shadow-[0_0_24px_-12px_var(--accent)]">
            <div className="flex flex-1 flex-col items-start justify-center px-4 py-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-foreground">
                  {players.length}
                </span>
              </div>
              <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
                {t("leaderboard.players")}
              </span>
            </div>

            <div aria-hidden className="w-px bg-card-border" />

            <Link
              href="/sessions"
              className="group flex flex-1 items-center justify-between gap-2 px-4 py-3 transition-colors active:bg-accent/10"
            >
              <div className="flex flex-col items-start">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black tabular-nums text-foreground">
                    {totalSessions}
                  </span>
                </div>
                <span className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-accent">
                  {t("leaderboard.totalGames")}
                </span>
              </div>
              <svg
                className="h-4 w-4 flex-shrink-0 text-accent/70 transition-transform group-active:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <LeaderboardCountdown />

      {seasonLatest?.available && (
        <p className="mt-2 text-center">
          <Link
            href="/seasons"
            className="text-[11px] text-muted underline decoration-dotted decoration-muted/40 underline-offset-4 transition active:text-foreground"
          >
            🏆 {t("seasons.list.title")}
          </Link>
        </p>
      )}

      {recap && <SeasonRecapStory recap={recap} onClose={() => setRecap(null)} />}

      <TopThreePodium players={players} currentPlayerId={player?.id} />

      {/* Player Rankings */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between px-3 text-[10px] font-medium uppercase tracking-wider text-muted/60">
          <span>{t("leaderboard.colPlayer")}</span>
          <span
            className="inline-flex items-center gap-1"
            title={t("leaderboard.eloTooltip")}
            aria-label={t("leaderboard.eloTooltip")}
          >
            {t("leaderboard.colElo")}
            <span aria-hidden className="text-[9px]">
              ℹ️
            </span>
          </span>
        </div>
        <div className="space-y-2">
          {(players.length >= 3 ? players.slice(3) : players).map((p, idx) => {
            const i = players.length >= 3 ? idx + 3 : idx;
            const tier = getEloTier(p.elo);
            const badge = RANK_BADGES[i];
            const isTopThree = i < 3;
            const isMe = player?.id === p.id;

            return (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className={`animate-slide-in relative flex min-h-[60px] items-center gap-3 rounded-xl border p-3 transition-all duration-150 active:scale-[0.98] ${
                  isTopThree
                    ? `border-transparent bg-card animate-rank-border-breathe`
                    : "border-card-border bg-card active:border-accent/20"
                } ${isMe ? "ring-2 ring-accent/70 ring-offset-2 ring-offset-background" : ""}`}
                style={{
                  animationDelay: `${i * 40}ms`,
                  ...(isTopThree ? badge.style : {}),
                }}
              >
                {isTopThree && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                  >
                    <span
                      className="absolute left-0 top-0 h-16 w-16 animate-rank-glint rounded-full blur-xl"
                      style={{
                        background: `radial-gradient(circle, ${badge.glintColor} 0%, transparent 70%)`,
                        animationDelay: `${i * 2.2}s`,
                      }}
                    />
                  </span>
                )}
                {/* Rank / Avatar */}
                <div className="relative flex-shrink-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold overflow-hidden bg-slate-800">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-400">
                        {(p.name?.[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                  </span>
                  {/* Rank medal — top 3 get metal medals; rest get neutral number badge */}
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-background shadow-md ${
                      isTopThree
                        ? `${badge.medalBg} ${badge.medalText}`
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Center: name + rank + progress */}
                {(() => {
                  const divInfo = getDivisionInfo(p.elo);
                  const stars =
                    divInfo.stars > 0
                      ? "★".repeat(divInfo.stars) +
                        "☆".repeat(3 - divInfo.stars)
                      : null;
                  const streak = getStreakStyle(p.currentStreak);
                  return (
                    <div className="relative flex flex-1 min-w-0 flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-semibold text-foreground">
                            {p.name}
                          </span>
                          {isMe && (
                            <span className="flex-shrink-0 rounded-full border border-accent/50 bg-accent/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent">
                              {t("leaderboard.you")}
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-mono text-xl font-bold tabular-nums flex-shrink-0 ${
                            isTopThree ? badge.iconColor : "text-foreground"
                          }`}
                        >
                          {p.elo}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.bgClass} ${tier.colorClass} ${tier.key === "rank.godlike" ? "rank-godlike-glow" : ""}`}
                          >
                            {tier.icon} {t(tier.key)}
                            {stars && (
                              <span className="ml-1 tracking-tight">
                                <span className={tier.colorClass}>
                                  {stars.slice(0, divInfo.stars)}
                                </span>
                                <span className="opacity-25">
                                  {stars.slice(divInfo.stars)}
                                </span>
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted">
                            {p.gamesPlayed}{" "}
                            {p.gamesPlayed === 1
                              ? t("leaderboard.game")
                              : t("leaderboard.games")}
                          </span>
                          {p.jackpot > 0 && (
                            <span className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-400 shadow-[0_0_12px_-2px_rgba(251,191,36,0.3)] animate-pulse-glow">
                              <span className="text-[11px] drop-shadow-sm">💰</span>
                              <span className="tabular-nums">{p.jackpot}</span>
                            </span>
                          )}
                          {p.lastResults.length > 0 && (
                            <span
                              className="flex items-center gap-0.5"
                              aria-label={`${t("leaderboard.recentForm")}: ${p.lastResults.join("")}`}
                              title={`${t("leaderboard.recentForm")}: ${p.lastResults.join("")}${streak ? ` · ${t(streak.isHot ? "leaderboard.streakHot" : "leaderboard.streakCold")}` : ""}`}
                            >
                              {p.lastResults.slice(0, 5).map((r, idx) => (
                                <span
                                  key={idx}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    r === "W"
                                      ? "bg-emerald-400"
                                      : r === "L"
                                        ? "bg-red-400/70"
                                        : "bg-slate-500"
                                  }`}
                                />
                              ))}
                              {streak && (
                                <span className="ml-0.5 text-[11px] leading-none">
                                  {streak.isHot ? "🔥" : "🧊"}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {divInfo.eloToNext !== null &&
                        (() => {
                          const fillPct = tier.hasDivisions
                            ? (divInfo.stars - 1) * 33.33 +
                              divInfo.progressPct * 0.3333
                            : divInfo.progressPct;
                          const nextTier = divInfo.nextTierKey
                            ? ELO_TIERS.find(
                                (tt) => tt.key === divInfo.nextTierKey,
                              )
                            : null;
                          const targetStars = "★".repeat(
                            Math.min(3, divInfo.stars + 1),
                          );
                          const labelText = nextTier
                            ? t("rank.toNextRank").replace(
                                "{n}",
                                String(divInfo.eloToNext),
                              )
                            : t("rank.toNextDiv")
                                .replace("{n}", String(divInfo.eloToNext))
                                .replace("{stars}", targetStars);
                          return (
                            <div className="relative h-6 w-full overflow-hidden rounded-md bg-slate-800/80 ring-1 ring-inset ring-white/5">
                              {/* Fill */}
                              <div
                                className={`absolute inset-y-0 left-0 rounded-md ${tier.fillClass} animate-bar-fill`}
                                style={{
                                  ["--bar-target" as string]: `${fillPct}%`,
                                  boxShadow: `0 0 8px -2px var(--accent)`,
                                }}
                              />
                              {/* Division markers */}
                              {tier.hasDivisions && (
                                <>
                                  <div
                                    className="absolute inset-y-0 w-[2px] bg-black/40"
                                    style={{ left: "33.33%" }}
                                  />
                                  <div
                                    className="absolute inset-y-0 w-[2px] bg-black/40"
                                    style={{ left: "66.66%" }}
                                  />
                                </>
                              )}
                              {/* Label: "còn N elo tới" — left-aligned with safe right padding so it never overlaps the next-tier badge */}
                              <span className="absolute inset-y-0 left-2 flex items-center pr-[88px] text-[10px] font-semibold leading-none text-white/95 truncate drop-shadow">
                                {labelText}
                              </span>
                              {/* Next tier — pinned far right, dimmed so it reads
                              as a faint preview rather than competing with the
                              current-tier pill. */}
                              {nextTier && (
                                <span
                                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded px-1.5 py-[2px] text-[10px] font-semibold leading-none opacity-40 ${nextTier.colorClass}`}
                                >
                                  <span aria-hidden>{nextTier.icon}</span>
                                  <span className="max-w-[72px] truncate">
                                    {t(nextTier.key)}
                                  </span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                    </div>
                  );
                })()}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Rank legend (ladder with population counts) */}
      {players.length > 0 &&
        (() => {
          const tierCounts = new Map<string, number>();
          for (const pl of players) {
            const k = getEloTier(pl.elo).key;
            tierCounts.set(k, (tierCounts.get(k) ?? 0) + 1);
          }
          return (
            <div className="mt-5 rounded-xl border border-card-border bg-card/50 p-3">
              <p className="mb-2 text-xs font-semibold text-muted">
                {t("guide.elo.tiers.title")}
              </p>
              <div className="flex flex-col gap-1.5">
                {ELO_TIERS.map((tier) => {
                  const count = tierCounts.get(tier.key) ?? 0;
                  return (
                    <div
                      key={tier.key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-semibold ${tier.colorClass}`}
                      >
                        <span>
                          {tier.icon} {t(tier.key)}
                        </span>
                        {count > 0 ? (
                          <span
                            className={`rounded-full ${tier.bgClass} px-1.5 py-0.5 text-[9px] font-black tabular-nums`}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="rounded-full border border-dashed border-muted/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted/60">
                            {t("leaderboard.tierEmpty")}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted">
                        {tier.minElo === -Infinity
                          ? `< ${tier.maxElo}`
                          : tier.maxElo === Infinity
                            ? `${tier.minElo}+`
                            : `${tier.minElo} – ${tier.maxElo - 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return <LeaderboardContent />;
}
