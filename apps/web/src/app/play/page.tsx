"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { LandingContent } from "@/components/landing-content";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";
import type { Session } from "@/types/database";
import { ApiError } from "@/lib/api";

interface ActiveSession extends Session {
  creator: { id: string; name: string } | null;
  playerIds: string[];
}

export default function PlayPage() {
  const { player, api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyInInput, setBuyInInput] = useState("100");
  const buyIn = parseInt(buyInInput, 10);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const s = await api.get<ActiveSession[]>("/sessions?active=true");
      setActiveSessions(s);
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

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-16">
      <header className="mb-6">
        <h1 className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-2xl font-black leading-tight tracking-tight text-transparent">
          {t("play.title")}
        </h1>
        <p className="mt-1 text-xs text-muted">{t("play.slogan")}</p>
      </header>

      {/* Active Sessions */}
      {activeSessions.length > 0 ? (
        <div>
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
      ) : (
        <div className="rounded-xl border border-dashed border-card-border bg-card/30 p-6 text-center">
          <p className="text-sm text-muted">{t("play.emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted/70">{t("play.emptySubtitle")}</p>
        </div>
      )}

      {/* Create Session */}
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

      <BottomNav />
    </div>
  );
}
