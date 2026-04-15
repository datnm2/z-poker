"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { streamUrl } from "@/lib/api";
import type { Player, Session } from "@/types/database";
import type { SessionEvent } from "@/types/events";
import { getEloTier, ELO_TIERS } from "@/lib/ranks";

interface ActiveSession extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

type LeaderboardPlayer = Pick<Player, "id" | "name" | "elo" | "gamesPlayed" | "avatarUrl">;

function LeaderboardContent() {
  const { player, api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { getToken } = useClerkAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyIn, setBuyIn] = useState(800);

  const fetchData = useCallback(async () => {
    const [p, s, stats] = await Promise.all([
      api.get<Player[]>("/players"),
      api.get<ActiveSession[]>("/sessions?active=true"),
      api.get<{ totalSessions: number }>("/sessions/stats"),
    ]);
    setPlayers(p);
    setActiveSessions(s);
    setTotalSessions(stats.totalSessions);
    setLoading(false);
  }, [api]);

  const refetchPlayers = useCallback(async () => {
    const p = await api.get<Player[]>("/players");
    setPlayers(p);
  }, [api]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      setLoading(true);
      fetchData();
    }
  }, [authLoading, isLoggedIn, fetchData]);

  // Domain-wide SSE: real-time updates for new sessions and locks
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    let es: EventSource | null = null;

    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      es = new EventSource(streamUrl("/sessions/stream", token));

      es.addEventListener("session.created", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.created") return;
          setActiveSessions((prev) => {
            if (prev.some((s) => s.id === data.session.id)) return prev;
            return [data.session, ...prev];
          });
        } catch {
          /* noop */
        }
      });

      es.addEventListener("session.player_joined", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.player_joined") return;
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
        } catch {
          /* noop */
        }
      });

      es.addEventListener("session.locked", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.locked") return;
          setActiveSessions((prev) =>
            prev.filter((s) => s.id !== data.sessionId),
          );
          refetchPlayers();
        } catch {
          /* noop */
        }
      });

      es.onerror = () => {
        // Browser auto-reconnects; refetch once to clear any drift
        fetchData();
      };
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [isLoggedIn, getToken, fetchData, refetchPlayers]);

  const createSession = async () => {
    if (!player) return;
    const data = await api.post<Session>("/sessions", { buyIn });
    router.push(`/session/${data.id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("leaderboard.title")}</h1>
            <p className="text-xs text-muted mt-0.5">{t("leaderboard.slogan")}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="text-muted">{t("leaderboard.signInPrompt")}</p>
          <Link
            href="/login"
            className="min-h-11 flex items-center rounded-xl bg-accent px-6 py-3 font-semibold text-slate-900 transition-all duration-150 active:scale-[0.97]"
          >
            {t("leaderboard.signInBtn")}
          </Link>
          <Link href="/guide" className="text-sm text-muted underline">
            {t("nav.guide")}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const topElo = players[0]?.elo ?? 0;

  const RANK_BADGES = [
    { label: "1ST", ringClass: "ring-2 ring-amber-400", bgClass: "bg-amber-400/20", textClass: "text-amber-400", medalBg: "bg-amber-400", medalText: "text-slate-900" },
    { label: "2ND", ringClass: "ring-2 ring-slate-400", bgClass: "bg-slate-400/20", textClass: "text-slate-300", medalBg: "bg-slate-300", medalText: "text-slate-900" },
    { label: "3RD", ringClass: "ring-2 ring-amber-700", bgClass: "bg-amber-700/20", textClass: "text-amber-600", medalBg: "bg-amber-700", medalText: "text-white" },
  ];

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-2xl font-bold text-transparent">
            {t("leaderboard.title")}
          </h1>
          <p className="mt-0.5 text-xs text-muted">{t("leaderboard.slogan")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: t("leaderboard.players"), value: players.length, accent: false },
          { label: t("leaderboard.totalGames"), value: totalSessions, accent: false },
          { label: t("leaderboard.topElo"), value: topElo, accent: true },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-3 text-center ${
              s.accent
                ? "border-accent/30 bg-accent/10"
                : "border-card-border bg-card"
            }`}
          >
            <div className={`text-lg font-bold tabular-nums ${s.accent ? "text-accent" : "text-foreground"}`}>
              {s.value}
            </div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

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
                value={buyIn}
                onChange={(e) => setBuyIn(parseInt(e.target.value, 10) || 0)}
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
                  disabled={buyIn < 1}
                  className="min-h-11 flex-1 rounded-xl bg-accent py-2.5 font-semibold text-slate-900 transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
                >
                  {t("leaderboard.create")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="min-h-11 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition-all duration-150 active:scale-[0.97]"
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
          const isFirst = i === 0;

          return (
            <Link
              key={p.id}
              href={`/player/${p.id}`}
              className={`animate-slide-in flex min-h-[60px] items-center gap-3 rounded-xl border p-3 transition-all duration-150 active:scale-[0.98] ${
                isFirst
                  ? "border-accent/40 bg-gradient-to-r from-accent/10 to-card animate-pulse-glow"
                  : "border-card-border bg-card active:border-accent/20"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Rank / Avatar */}
              <div className="relative flex-shrink-0">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold overflow-hidden ${
                    isTopThree
                      ? `${badge.ringClass} ${badge.bgClass}`
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className={isTopThree ? badge.textClass : "text-slate-400"}>
                      {isTopThree ? badge.label : i + 1}
                    </span>
                  )}
                </span>
                {/* Medal overlay for top 3 with avatars */}
                {isTopThree && p.avatarUrl && (
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${badge.medalBg} ${badge.medalText} ring-2 ring-background shadow-md`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Name + games */}
              <div className="flex-1 min-w-0">
                <div className={`truncate font-semibold ${isFirst ? "text-foreground" : "text-foreground"}`}>
                  {p.name}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {p.gamesPlayed}{" "}
                  {p.gamesPlayed === 1 ? t("leaderboard.game") : t("leaderboard.games")}
                </div>
              </div>

              {/* Elo + tier */}
              <div className="flex flex-col items-end gap-1">
                <div
                  className={`font-mono text-xl font-bold tabular-nums ${
                    isFirst ? "text-accent" : "text-foreground"
                  }`}
                >
                  {p.elo}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tier.bgClass} ${tier.colorClass}`}>
                  {t(tier.key)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Rank legend */}
      {players.length > 0 && (
        <div className="mt-5 rounded-xl border border-card-border bg-card/50 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">{t("guide.elo.tiers.title")}</p>
          <div className="flex flex-wrap gap-1.5">
            {ELO_TIERS.map((tier) => (
              <span
                key={tier.key}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.bgClass} ${tier.colorClass}`}
              >
                {tier.minElo === -Infinity ? `<${ELO_TIERS[ELO_TIERS.length - 2].minElo}` : `${tier.minElo}+`}
              </span>
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
