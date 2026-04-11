"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import type { Player } from "@/types/database";
import { getEloTier } from "@/lib/ranks";

interface SessionRecord {
  id: string;
  sessionId: string;
  chipsEnd: number | null;
  eloBefore: number | null;
  eloAfter: number | null;
  session: {
    id: string;
    playedDate: string;
    buyIn: number;
    isLocked: boolean;
    lockedAt: string | null;
  };
}

interface PlayerWithRank extends Player {
  rank: number | null;
}

export function PlayerProfile({
  playerId,
}: {
  playerId: string;
  isOwnProfile?: boolean;
}) {
  const { t } = useI18n();
  const { api } = useAuth();
  const [player, setPlayer] = useState<PlayerWithRank | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const [p, history] = await Promise.all([
      api.get<PlayerWithRank>(`/players/${playerId}`),
      api.get<SessionRecord[]>(`/players/${playerId}/history?limit=20`),
    ]);
    setPlayer(p);
    setSessions(history);
    setLoading(false);
  }, [playerId, api]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading || !player) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const wins = sessions.filter(
    (s) => s.chipsEnd != null && s.chipsEnd > s.session.buyIn
  ).length;
  const winRate =
    sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0;

  const eloHistory = sessions
    .filter((s) => s.eloAfter != null)
    .map((s) => s.eloAfter!)
    .reverse();

  const eloMin = eloHistory.length > 0 ? Math.min(...eloHistory) - 20 : 1180;
  const eloMax = eloHistory.length > 0 ? Math.max(...eloHistory) + 20 : 1220;
  const eloRange = eloMax - eloMin || 1;

  return (
    <div>
      {/* Player info */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-slate-900 overflow-hidden">
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            player.name.charAt(0).toUpperCase()
          )}
        </div>
        <h1 className="mt-3 text-xl font-bold">{player.name}</h1>
        {(() => {
          const tier = getEloTier(player.elo);
          return (
            <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${tier.bgClass} ${tier.colorClass}`}>
              <span>{tier.icon}</span>
              <span>{t(tier.key)}</span>
            </div>
          );
        })()}
        <p className="mt-1 text-sm text-muted">
          {player.email.replace(/^(.{2})[^@]+(@.+)$/, "$1***$2")}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: t("session.elo"), value: player.elo },
          { label: t("profile.winRate"), value: `${winRate}%` },
          { label: t("profile.rank"), value: player.rank ? `#${player.rank}` : "-" },
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

      {/* Elo chart */}
      {eloHistory.length > 1 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {t("profile.eloHistory")}
          </h2>
          <div className="rounded-xl border border-card-border bg-card p-4">
            <svg viewBox="0 0 300 100" className="w-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={eloHistory
                  .map((elo, i) => {
                    const x = (i / (eloHistory.length - 1)) * 296 + 2;
                    const y = 96 - ((elo - eloMin) / eloRange) * 92;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              {eloHistory.map((elo, i) => {
                const x = (i / (eloHistory.length - 1)) * 296 + 2;
                const y = 96 - ((elo - eloMin) / eloRange) * 92;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#f59e0b"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {t("profile.recentSessions")}
          </h2>
          <div className="space-y-2">
            {sessions.map((s) => {
              const delta =
                s.eloAfter != null && s.eloBefore != null
                  ? s.eloAfter - s.eloBefore
                  : null;
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.sessionId}`}
                  className="flex items-center justify-between rounded-xl border border-card-border bg-card p-3 transition hover:border-accent/30"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {s.session.playedDate}
                      {s.session.lockedAt && (
                        <span className="ml-1.5 text-xs font-normal text-muted">
                          {new Date(s.session.lockedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {t("session.buyIn")}: {s.session.buyIn}
                      {" · "}
                      {t("session.chips")}: {s.chipsEnd ?? "-"}
                    </div>
                  </div>
                  {delta != null ? (
                    <span
                      className={`text-sm font-bold ${
                        delta >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta}
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      {t("session.open")}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
