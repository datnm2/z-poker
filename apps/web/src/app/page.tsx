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
    return <Loading />;
  }

  if (!isLoggedIn) {
    return <LandingPage />;
  }


  const RANK_BADGES = [
    { label: "1ST", ringClass: "ring-2 ring-amber-400", bgClass: "bg-amber-400/20", textClass: "text-amber-400", medalBg: "bg-amber-400", medalText: "text-slate-900" },
    { label: "2ND", ringClass: "ring-2 ring-slate-400", bgClass: "bg-slate-400/20", textClass: "text-slate-300", medalBg: "bg-slate-300", medalText: "text-slate-900" },
    { label: "3RD", ringClass: "ring-2 ring-amber-700", bgClass: "bg-amber-700/20", textClass: "text-amber-600", medalBg: "bg-amber-700", medalText: "text-white" },
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
                {/* Rank number badge — top 3 get colored medals; rest get neutral badge when avatar is shown */}
                {p.avatarUrl && (
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-2 ring-background shadow-md ${
                      isTopThree ? `${badge.medalBg} ${badge.medalText}` : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Center: name + rank + progress */}
              {(() => {
                const divInfo = getDivisionInfo(p.elo);
                const stars = divInfo.stars > 0 ? "★".repeat(divInfo.stars) + "☆".repeat(3 - divInfo.stars) : null;
                return (
                  <div className="flex flex-1 min-w-0 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-foreground">{p.name}</span>
                      <span className={`font-mono text-xl font-bold tabular-nums flex-shrink-0 ${isFirst ? "text-accent" : "text-foreground"}`}>
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

const MOCK_PLAYERS = [
  { name: "Cá Mập #1", elo: 1685, tierIdx: 0 },
  { name: "Tay Săn #2", elo: 1512, tierIdx: 1 },
  { name: "Lão Làng #3", elo: 1378, tierIdx: 2 },
] as const;

const MEDAL = [
  { ring: "ring-amber-400", bg: "bg-amber-400/20", text: "text-amber-400", medalBg: "bg-amber-400", medalText: "text-slate-900", label: "1ST" },
  { ring: "ring-slate-400", bg: "bg-slate-400/20", text: "text-slate-300", medalBg: "bg-slate-300", medalText: "text-slate-900", label: "2ND" },
  { ring: "ring-amber-700", bg: "bg-amber-700/20", text: "text-amber-600", medalBg: "bg-amber-700", medalText: "text-white", label: "3RD" },
];

const HOW_STEPS = [
  { icon: "🎲", key: "landing.how1" as const },
  { icon: "⚡", key: "landing.how2" as const },
  { icon: "🏆", key: "landing.how3" as const },
];

const WHY_CARDS = [
  { icon: "🥪", titleKey: "landing.why1.title" as const, bodyKey: "landing.why1.body" as const, accent: "from-amber-400/20 to-transparent" },
  { icon: "📈", titleKey: "landing.why2.title" as const, bodyKey: "landing.why2.body" as const, accent: "from-emerald-400/20 to-transparent" },
  { icon: "🏢", titleKey: "landing.why3.title" as const, bodyKey: "landing.why3.body" as const, accent: "from-blue-400/20 to-transparent" },
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zpoker.vercel.app";

const LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Z-Poker",
  url: SITE_URL,
  description:
    "Office lunch-break poker tracker with long-term Elo rating, isolated per company email domain. Virtual chips only — for fun, not gambling.",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  inLanguage: ["vi", "en"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "Dat Light Solution",
    url: "https://dat09vn.com",
  },
};

function LandingPage() {
  const { t } = useI18n();
  const { signInWithGoogle } = useAuth();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSON_LD) }}
      />

      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <div className="animate-pop-in text-5xl">🃏</div>
        <h1 className="mt-2 bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-4xl font-black tracking-tight text-transparent">
          Z-Poker
        </h1>
        <p className="mt-3 text-balance text-xl font-bold leading-snug text-foreground">
          {t("landing.headline")}
        </p>
        <p className="mt-3 max-w-md text-balance text-sm leading-relaxed text-muted">
          {t("landing.subhead")}
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-bold text-accent-contrast shadow-lg shadow-accent/30 transition-all duration-150 active:scale-[0.97]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("login.signInGoogle")}
        </button>
        <Link
          href="/guide"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent underline underline-offset-4 active:text-accent-strong"
        >
          {t("landing.ctaGuide")}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
          </svg>
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted">
            <span>🏢</span>
            <span>{t("landing.domainPill")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            {t("landing.funPill")}
          </span>
        </div>
      </section>

      {/* Why Z-Poker — core insight */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("landing.whyTitle")}</h2>
        <div className="space-y-2">
          {WHY_CARDS.map((card, i) => (
            <div
              key={card.titleKey}
              className={`animate-slide-in relative overflow-hidden rounded-xl border border-card-border bg-card p-4`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
              <div className="relative flex gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-900/40 text-xl">
                  {card.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground">{t(card.titleKey)}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(card.bodyKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mock leaderboard preview */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("landing.previewTitle")}</h2>
        <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card/50 p-3">
          <div className="space-y-2">
            {MOCK_PLAYERS.map((p, i) => {
              const tier = ELO_TIERS[p.tierIdx];
              const medal = MEDAL[i];
              const isFirst = i === 0;
              return (
                <div
                  key={p.name}
                  className={`animate-slide-in flex items-center gap-3 rounded-xl border p-3 ${
                    isFirst
                      ? "border-accent/40 bg-gradient-to-r from-accent/10 to-card animate-pulse-glow"
                      : "border-card-border bg-card"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${medal.ring} ${medal.bg} ${medal.text}`}>
                    {medal.label}
                  </span>
                  <div className="flex flex-1 min-w-0 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{p.name}</span>
                      <span className={`font-mono text-lg font-bold tabular-nums ${isFirst ? "text-accent" : "text-foreground"}`}>
                        {p.elo}
                      </span>
                    </div>
                    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tier.bgClass} ${tier.colorClass}`}>
                      {tier.icon} {t(tier.key)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2">
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-medium text-muted backdrop-blur">
              {t("landing.previewDemo")}
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/80 to-transparent" />
        </div>
      </section>

      {/* Rank ladder */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("landing.tiersTitle")}</h2>
        <div className="space-y-1.5">
          {ELO_TIERS.map((tier, i) => (
            <div
              key={tier.key}
              className={`animate-slide-in flex items-center justify-between gap-3 rounded-xl border border-card-border ${tier.bgClass} px-3 py-2.5`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{tier.icon}</span>
                <span className={`truncate text-sm font-bold ${tier.colorClass}`}>{t(tier.key)}</span>
              </div>
              <span className="flex-shrink-0 font-mono text-[11px] font-semibold text-muted">
                {tier.minElo === -Infinity
                  ? `< ${tier.maxElo}`
                  : tier.maxElo === Infinity
                  ? `${tier.minElo}+`
                  : `${tier.minElo}–${tier.maxElo - 1}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-muted">{t("landing.howTitle")}</h2>
        <div className="space-y-2">
          {HOW_STEPS.map((step, i) => (
            <div
              key={step.key}
              className="flex items-center gap-3 rounded-xl border border-card-border bg-card px-3 py-3"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg">
                {step.icon}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">{i + 1}</span>
                <span className="text-sm text-foreground">{t(step.key)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer — for fun, no real money */}
      <section className="mt-10 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-lg">
            🎉
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-emerald-300">{t("landing.disclaimerTitle")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t("landing.disclaimerBody")}</p>
          </div>
        </div>
      </section>

      {/* Footer CTA repeat */}
      <section className="mt-6 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-5 text-center">
        <p className="text-base font-bold text-foreground">{t("landing.footerCta")}</p>
        <button
          onClick={signInWithGoogle}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-bold text-accent-contrast shadow-lg shadow-accent/30 transition-all duration-150 active:scale-[0.97]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t("login.signInGoogle")}
        </button>
      </section>
    </div>
  );
}

export default function HomePage() {
  return <LeaderboardContent />;
}
