"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { Loading } from "@/components/loading";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";
import type { Player, Session } from "@/types/database";
import { getEloTier, getDivisionInfo, ELO_TIERS } from "@/lib/ranks";
import { LandingContent } from "@/components/landing-content";
import "./linear.css";

interface ActiveSession extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

type LeaderboardPlayer = Pick<Player, "id" | "name" | "elo" | "gamesPlayed" | "avatarUrl">;

function LinearLeaderboard() {
  const { player, api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyInInput, setBuyInInput] = useState("100");
  const buyIn = parseInt(buyInInput, 10);

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

  return (
    <div className="lnr-root">
      <div className="lnr-container">
        {/* Hero */}
        <section className="lnr-hero">
          <div className="lnr-hero-head">
            <div>
              <h1 className="lnr-display">{t("leaderboard.title")}</h1>
              <p className="lnr-subtitle">{t("leaderboard.slogan")}</p>
            </div>
            {player?.domain && (
              <span className="lnr-domain-pill">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8l9-5 9 5v13M9 21V12h6v9" />
                </svg>
                <span className="lnr-mono">@{player.domain}</span>
              </span>
            )}
          </div>

          <div className="lnr-stats">
            <div className="lnr-stat">
              <span className="lnr-stat-value">{players.length}</span>
              <span className="lnr-stat-label">{t("leaderboard.players")}</span>
            </div>
            <div className="lnr-stat-divider" aria-hidden />
            <Link href="/sessions" className="lnr-stat lnr-stat--link">
              <div>
                <span className="lnr-stat-value">{totalSessions}</span>
                <span className="lnr-stat-label lnr-stat-label--accent">
                  {t("leaderboard.totalGames")}
                </span>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <section className="lnr-section">
            <div className="lnr-section-head">
              <span className="lnr-live-dot" aria-hidden />
              <h2 className="lnr-h3 lnr-h3--live">{t("leaderboard.activeSessions")}</h2>
            </div>
            <div className="lnr-list">
              {activeSessions.map((s) => {
                const playerIds = s.playerIds ?? [];
                const isJoined = player ? playerIds.includes(player.id) : false;
                return (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}`}
                    className="lnr-active-row"
                  >
                    <div className="lnr-active-body">
                      <div className="lnr-active-title">
                        <span className="lnr-text-primary">{s.playedDate}</span>
                        {isJoined ? (
                          <span className="lnr-badge lnr-badge--accent">{t("session.joined")}</span>
                        ) : (
                          <span className="lnr-badge lnr-badge--success">{t("session.open")}</span>
                        )}
                        <span className="lnr-text-muted lnr-caption">
                          {playerIds.length} {t("session.playersCount")}
                        </span>
                      </div>
                      <div className="lnr-active-meta">
                        <span>{t("session.buyIn")}: {s.buyIn}</span>
                        {s.creator && (
                          <>
                            <span className="lnr-dot-sep">·</span>
                            <span>{t("session.createdBy")}: {s.creator.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Create session */}
        {isLoggedIn && (
          <section className="lnr-section">
            {showCreateForm ? (
              <div className="lnr-card lnr-create">
                <div className="lnr-mode-grid">
                  <div className="lnr-mode lnr-mode--active">
                    <div className="lnr-mode-head">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      <span>{t("leaderboard.modePhysical")}</span>
                    </div>
                    <p className="lnr-mode-desc">{t("leaderboard.modePhysicalDesc")}</p>
                  </div>
                  <div className="lnr-mode lnr-mode--disabled">
                    <div className="lnr-mode-head">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                      </svg>
                      <span>{t("leaderboard.modeOnline")}</span>
                    </div>
                    <p className="lnr-mode-desc">{t("leaderboard.modeOnlineDesc")}</p>
                  </div>
                </div>

                <label className="lnr-field-label">{t("leaderboard.buyInLabel")}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={buyInInput}
                  onChange={(e) => setBuyInInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => { if (!buyInInput) setBuyInInput("100"); }}
                  min={1}
                  className="lnr-input lnr-mono"
                />
                <div className="lnr-btn-row">
                  <button onClick={() => setShowCreateForm(false)} className="lnr-btn lnr-btn--ghost">
                    {t("cancel")}
                  </button>
                  <button
                    onClick={createSession}
                    disabled={!Number.isFinite(buyIn) || buyIn < 1}
                    className="lnr-btn lnr-btn--primary"
                  >
                    {t("leaderboard.create")}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreateForm(true)} className="lnr-btn lnr-btn--primary lnr-btn--block">
                {t("leaderboard.newSession")}
              </button>
            )}
          </section>
        )}

        {/* Rankings */}
        <section className="lnr-section">
          <div className="lnr-ranking-head">
            <h2 className="lnr-h3">Rankings</h2>
            <span className="lnr-text-muted lnr-caption">{players.length} players</span>
          </div>
          <div className="lnr-rank-list">
            {players.map((p, i) => {
              const tier = getEloTier(p.elo);
              const divInfo = getDivisionInfo(p.elo);
              const isMe = player?.id === p.id;
              const stars = divInfo.stars > 0
                ? "★".repeat(divInfo.stars) + "☆".repeat(3 - divInfo.stars)
                : null;
              const fillPct = tier.hasDivisions
                ? (divInfo.stars - 1) * 33.33 + divInfo.progressPct * 0.3333
                : divInfo.progressPct;

              return (
                <Link
                  key={p.id}
                  href={`/player/${p.id}`}
                  className={`lnr-rank-row${isMe ? " lnr-rank-row--me" : ""}`}
                >
                  <span className="lnr-rank-num lnr-mono">{String(i + 1).padStart(2, "0")}</span>

                  <span className="lnr-avatar">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" />
                    ) : (
                      <span>{(p.name?.[0] ?? "?").toUpperCase()}</span>
                    )}
                  </span>

                  <div className="lnr-rank-body">
                    <div className="lnr-rank-line">
                      <span className="lnr-rank-name">
                        <span>{p.name}</span>
                        {isMe && <span className="lnr-you-tag">You</span>}
                      </span>
                      <span className="lnr-elo lnr-mono">{p.elo}</span>
                    </div>
                    <div className="lnr-rank-line lnr-rank-line--meta">
                      <span className="lnr-tier">
                        <span className="lnr-tier-icon">{tier.icon}</span>
                        <span>{t(tier.key)}</span>
                        {stars && (
                          <span className="lnr-stars">
                            <span className="lnr-stars-on">{stars.slice(0, divInfo.stars)}</span>
                            <span className="lnr-stars-off">{stars.slice(divInfo.stars)}</span>
                          </span>
                        )}
                      </span>
                      <span className="lnr-games">
                        {p.gamesPlayed} {p.gamesPlayed === 1 ? t("leaderboard.game") : t("leaderboard.games")}
                      </span>
                    </div>
                    {divInfo.eloToNext !== null && (
                      <div className="lnr-progress-wrap">
                        <div className="lnr-progress">
                          <div className="lnr-progress-fill" style={{ width: `${fillPct}%` }} />
                          {tier.hasDivisions && (
                            <>
                              <span className="lnr-progress-tick" style={{ left: "33.33%" }} />
                              <span className="lnr-progress-tick" style={{ left: "66.66%" }} />
                            </>
                          )}
                        </div>
                        <span className="lnr-progress-hint lnr-mono">
                          {divInfo.nextTierKey ? (
                            <>↑ {divInfo.eloToNext} → {t(divInfo.nextTierKey)}</>
                          ) : (
                            <>↑ {divInfo.eloToNext} {t("rank.eloToNext")}</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Legend */}
        {players.length > 0 && (
          <section className="lnr-section">
            <div className="lnr-card lnr-legend">
              <p className="lnr-legend-title">{t("guide.elo.tiers.title")}</p>
              <div className="lnr-legend-list">
                {ELO_TIERS.map((tier) => (
                  <div key={tier.key} className="lnr-legend-row">
                    <span className="lnr-legend-label">
                      <span>{tier.icon}</span>
                      <span>{t(tier.key)}</span>
                    </span>
                    <span className="lnr-legend-range lnr-mono">
                      {tier.minElo === -Infinity
                        ? `< ${tier.maxElo}`
                        : tier.maxElo === Infinity
                        ? `${tier.minElo}+`
                        : `${tier.minElo} – ${tier.maxElo - 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function LinearLeaderboardPage() {
  return <LinearLeaderboard />;
}
