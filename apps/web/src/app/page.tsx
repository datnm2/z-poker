"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { AuthGuard } from "@/components/auth-guard";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { streamUrl } from "@/lib/api";
import type { Player, Session } from "@/types/database";
import type { SessionEvent } from "@/types/events";
import { getEloTier } from "@/lib/ranks";

interface ActiveSession extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

type LeaderboardPlayer = Pick<Player, "id" | "name" | "elo" | "gamesPlayed" | "avatarUrl">;

function LeaderboardContent() {
  const { player, api } = useAuth();
  const { getToken } = useClerkAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyIn, setBuyIn] = useState(800);

  const fetchData = useCallback(async () => {
    if (!player?.domain) return;
    const [p, s] = await Promise.all([
      api.get<Player[]>("/players"),
      api.get<ActiveSession[]>("/sessions?active=true"),
    ]);
    setPlayers(p);
    setActiveSessions(s);
    setLoading(false);
  }, [player?.domain, api]);

  const refetchPlayers = useCallback(async () => {
    const p = await api.get<Player[]>("/players");
    setPlayers(p);
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Domain-wide SSE: real-time updates for new sessions and locks
  useEffect(() => {
    if (!player?.domain) return;
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
  }, [player?.domain, getToken, fetchData, refetchPlayers]);

  const createSession = async () => {
    if (!player) return;
    const data = await api.post<Session>("/sessions", { buyIn });
    router.push(`/session/${data.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const topElo = players[0]?.elo ?? 0;
  const avgGames =
    players.length > 0
      ? Math.round(
          players.reduce((s, p) => s + p.gamesPlayed, 0) / players.length
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("leaderboard.title")}</h1>
          <p className="text-xs text-muted mt-0.5">{t("leaderboard.slogan")}</p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: t("leaderboard.players"), value: players.length },
          { label: t("leaderboard.avgGames"), value: avgGames },
          { label: t("leaderboard.topElo"), value: topElo },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-card-border bg-card p-3 text-center"
          >
            <div className="text-lg font-bold text-accent">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {t("leaderboard.activeSessions")}
          </h2>
          <div className="space-y-2">
            {activeSessions.map((s) => {
              const playerIds = s.playerIds ?? [];
              const isJoined = player ? playerIds.includes(player.id) : false;
              return (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/5 p-3 transition hover:border-green-500/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.playedDate}</span>
                    {isJoined ? (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                        {t("session.joined")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
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
              </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Session */}
      <div className="mt-4">
        {showCreateForm ? (
          <div className="rounded-xl border border-card-border bg-card p-4">
            {/* Game Mode */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border-2 border-accent bg-accent/10 p-3 cursor-default">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🃏</span>
                  <span className="text-sm font-semibold text-foreground">{t("leaderboard.modePhysical")}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{t("leaderboard.modePhysicalDesc")}</p>
              </div>
              <div className="rounded-xl border border-card-border bg-card/50 p-3 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💻</span>
                  <span className="text-sm font-semibold text-muted">{t("leaderboard.modeOnline")}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{t("leaderboard.modeOnlineDesc")}</p>
              </div>
            </div>

            <label className="block text-sm font-medium text-muted mb-2">
              {t("leaderboard.buyInLabel")}
            </label>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(parseInt(e.target.value, 10) || 0)}
              min={1}
              className="w-full rounded-lg border border-card-border bg-slate-800 px-3 py-2 font-mono text-foreground focus:border-accent focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 rounded-xl border border-card-border py-2.5 text-sm font-medium text-muted transition hover:text-foreground"
              >
                {t("cancel")}
              </button>
              <button
                onClick={createSession}
                disabled={buyIn < 1}
                className="flex-1 rounded-xl bg-accent py-2.5 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40 active:scale-[0.98]"
              >
                {t("leaderboard.create")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 active:scale-[0.98]"
          >
            {t("leaderboard.newSession")}
          </button>
        )}
      </div>

      {/* Player list */}
      <div className="mt-6 space-y-2">
        {players.map((p, i) => (
          <Link
            key={p.id}
            href={`/player/${p.id}`}
            className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-3 transition hover:border-accent/30"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                i === 0
                  ? "bg-accent text-slate-900"
                  : "bg-slate-700 text-slate-300"
              } overflow-hidden`}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                i + 1
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-xs text-muted">
                {p.gamesPlayed}{" "}
                {p.gamesPlayed === 1
                  ? t("leaderboard.game")
                  : t("leaderboard.games")}
              </div>
            </div>
            {(() => {
              const tier = getEloTier(p.elo);
              return (
                <div className="text-right">
                  <div className={`text-lg font-bold ${i === 0 ? "text-accent" : ""}`}>{p.elo}</div>
                  <div className={`text-xs font-medium ${tier.colorClass}`}>
                    {tier.icon} {t(tier.key)}
                  </div>
                </div>
              );
            })()}
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGuard>
      <LeaderboardContent />
    </AuthGuard>
  );
}
