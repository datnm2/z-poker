"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";
import type { Player, Session } from "@/types/database";
import { getEloTier, getDivisionInfo, ELO_TIERS } from "@/lib/ranks";
import { LandingContent } from "@/components/landing-content";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api";

interface ActiveSession extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

type LeaderboardPlayer = Pick<Player, "id" | "name" | "elo" | "gamesPlayed" | "avatarUrl">;

function LeaderboardContent() {
  const { player, api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyInInput, setBuyInInput] = useState("100");
  const buyIn = parseInt(buyInInput, 10);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [p, s, stats] = await Promise.all([
        api.get<Player[]>("/players"),
        api.get<ActiveSession[]>("/sessions?active=true"),
        api.get<{ totalSessions: number }>("/sessions/stats"),
      ]);
      setPlayers(p);
      setActiveSessions(s);
      setTotalSessions(stats.totalSessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;
      setError({ message, status });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      setLoading(true);
      fetchData();
    }
  }, [authLoading, isLoggedIn, fetchData]);

  const sseHandlers = useMemo<SseHandlers>(
    () => ({
      "session.created": (data) => {
        setActiveSessions((prev) => {
          if (prev.some((s) => s.id === data.session.id)) return prev;
          return [data.session, ...prev];
        });
      },
      "session.player_joined": (data) => {
        setActiveSessions((prev) =>
          prev.map((s) =>
            s.id === data.sessionId
              ? {
                  ...s,
                  playerIds: s.playerIds.includes(data.sessionPlayer.playerId)
                    ? s.playerIds
                    : [...s.playerIds, data.sessionPlayer.playerId],
                }
              : s,
          ),
        );
      },
      "session.locked": (data) => {
        setActiveSessions((prev) => prev.filter((s) => s.id !== data.sessionId));
        // Patch ELO locally from payload instead of refetching /players.
        const byId = new Map(data.results.map((r) => [r.playerId, r.eloAfter]));
        setPlayers((prev) => {
          const next = prev.map((p) => {
            const nextElo = byId.get(p.id);
            return nextElo != null ? { ...p, elo: nextElo, gamesPlayed: p.gamesPlayed + 1 } : p;
          });
          return [...next].sort((a, b) => b.elo - a.elo);
        });
        setTotalSessions((n) => n + 1);
      },
    }),
    [],
  );

  useSseStream({
    path: isLoggedIn ? "/sessions/stream" : null,
    handlers: sseHandlers,
    onResync: fetchData,
    enabled: isLoggedIn,
  });

  const createSession = async () => {
    if (!player) return;
    const data = await api.post<Session>("/sessions", { buyIn });
    router.push(`/session/${data.id}`);
  };

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
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-16">
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
              <p className="mt-1 text-xs text-muted">{t("leaderboard.slogan")}</p>
            </div>
            {player?.domain && (
              <span className="inline-flex max-w-[45%] flex-shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8l9-5 9 5v13M9 21V12h6v9" />
                </svg>
                <span className="truncate font-mono">@{player.domain}</span>
              </span>
            )}
          </div>

          {/* Stats row — one panel, two halves. Right half is tappable. */}
          <div className="mt-4 flex items-stretch overflow-hidden rounded-xl border border-card-border bg-background/40">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            <h2 className="text-sm font-semibold text-green-400">
              {t("leaderboard.activeSessions")}
            </h2>
          </div>
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const playerIds = s.playerIds ?? [];
              const isJoined = player ? playerIds.includes(player.id) : false;
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex min-h-[52px] items-center justify-between rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2.5 transition-all duration-150 active:scale-[0.98] active:border-green-500/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.playedDate}</span>
                      {isJoined ? (
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">
                          {t("session.joined")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400">
                          {t("session.open")}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {playerIds.length} {t("session.playersCount")}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>{t("session.buyIn")}: {s.buyIn}</span>
                      {s.creator && (
                        <>
                          <span>&middot;</span>
                          <span>{t("session.createdBy")}: {s.creator.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <svg className="ml-2 h-4 w-4 flex-shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Session */}
      {isLoggedIn && (
        <div className="mt-4">
          {showCreateForm ? (
            <div className="rounded-xl border border-card-border bg-card p-4">
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 border-accent bg-accent/10 p-3 cursor-default">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">{t("leaderboard.modePhysical")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t("leaderboard.modePhysicalDesc")}</p>
                </div>
                <div className="rounded-xl border border-card-border bg-card/50 p-3 opacity-40 cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                    <span className="text-sm font-semibold text-muted">{t("leaderboard.modeOnline")}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t("leaderboard.modeOnlineDesc")}</p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-medium text-muted">
                {t("leaderboard.buyInLabel")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={buyInInput}
                onChange={(e) => setBuyInInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => { if (!buyInInput) setBuyInInput("100"); }}
                min={1}
                className="w-full rounded-lg border border-card-border bg-slate-800 px-3 py-2.5 font-mono text-foreground focus:border-accent focus:outline-none"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="min-h-11 flex-1 rounded-xl border border-card-border py-2.5 text-sm font-medium text-muted transition-all duration-150 active:scale-[0.97]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={createSession}
                  disabled={!Number.isFinite(buyIn) || buyIn < 1}
                  className="min-h-11 flex-1 rounded-xl bg-accent py-2.5 font-semibold text-accent-contrast transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
                >
                  {t("leaderboard.create")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="min-h-11 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast transition-all duration-150 active:scale-[0.97]"
            >
              {t("leaderboard.newSession")}
            </button>
          )}
        </div>
      )}

      {/* Player Rankings */}
      <div className="mt-6 space-y-2">
        {players.map((p, i) => {
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
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-slate-400">
                      {(p.name?.[0] ?? "?").toUpperCase()}
                    </span>
                  )}
                </span>
                {/* Rank medal — top 3 get metal medals; rest get neutral number badge */}
                <span
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-background shadow-md ${
                    isTopThree ? `${badge.medalBg} ${badge.medalText}` : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {i + 1}
                </span>
              </div>

              {/* Center: name + rank + progress */}
              {(() => {
                const divInfo = getDivisionInfo(p.elo);
                const stars = divInfo.stars > 0 ? "★".repeat(divInfo.stars) + "☆".repeat(3 - divInfo.stars) : null;
                return (
                  <div className="relative flex flex-1 min-w-0 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground">{p.name}</span>
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.bgClass} ${tier.colorClass}`}>
                          {tier.icon} {t(tier.key)}
                          {stars && (
                            <span className="ml-1 tracking-tight">
                              <span className={tier.colorClass}>{stars.slice(0, divInfo.stars)}</span>
                              <span className="opacity-25">{stars.slice(divInfo.stars)}</span>
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-muted">
                          {p.gamesPlayed} {p.gamesPlayed === 1 ? t("leaderboard.game") : t("leaderboard.games")}
                        </span>
                      </div>
                      {divInfo.eloToNext !== null && (
                        <span className="flex-shrink-0 text-[10px] text-muted/60">
                          {divInfo.nextTierKey ? (
                            <>↑ {divInfo.eloToNext} → {t(divInfo.nextTierKey)}</>
                          ) : (
                            <>↑ {divInfo.eloToNext} {t("rank.eloToNext")}</>
                          )}
                        </span>
                      )}
                    </div>
                    {divInfo.eloToNext !== null && (
                      <div className="relative h-2 w-full rounded-full bg-slate-700">
                        {/* Fill: offset by completed divisions + progress within current div */}
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${tier.fillClass}`}
                          style={{
                            width: tier.hasDivisions
                              ? `${(divInfo.stars - 1) * 33.33 + divInfo.progressPct * 0.3333}%`
                              : `${divInfo.progressPct}%`,
                          }}
                        />
                        {/* Division markers */}
                        {tier.hasDivisions && (
                          <>
                            <div className="absolute inset-y-0 w-[2px] bg-black/50" style={{ left: "33.33%" }} />
                            <div className="absolute inset-y-0 w-[2px] bg-black/50" style={{ left: "66.66%" }} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Link>
          );
        })}
      </div>

      {/* Rank legend */}
      {players.length > 0 && (
        <div className="mt-5 rounded-xl border border-card-border bg-card/50 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">{t("guide.elo.tiers.title")}</p>
          <div className="flex flex-col gap-1.5">
            {ELO_TIERS.map((tier) => (
              <div key={tier.key} className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${tier.colorClass}`}>
                  {tier.icon} {t(tier.key)}
                </span>
                <span className="text-[10px] text-muted">
                  {tier.minElo === -Infinity ? `< ${tier.maxElo}` : tier.maxElo === Infinity ? `${tier.minElo}+` : `${tier.minElo} – ${tier.maxElo - 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return <LeaderboardContent />;
}
