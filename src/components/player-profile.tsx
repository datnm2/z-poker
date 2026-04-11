"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useI18n } from "@/providers/i18n-provider";
import type { Player } from "@/types/database";

interface SessionRecord {
  id: string;
  session_id: string;
  chips_end: number | null;
  elo_before: number;
  elo_after: number | null;
  session: {
    id: string;
    played_date: string;
    buy_in: number;
    is_locked: boolean;
  };
}

export function PlayerProfile({
  playerId,
}: {
  playerId: string;
  isOwnProfile?: boolean;
}) {
  const { t } = useI18n();
  const supabase = createClient();
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const [{ data: p }, { data: sp }] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single(),
      supabase
        .from("session_players")
        .select("id, session_id, chips_end, elo_before, elo_after, session:sessions(id, played_date, buy_in, is_locked)")
        .eq("player_id", playerId)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);
    if (!p) return;
    setPlayer(p);
    if (sp) setSessions(sp as unknown as SessionRecord[]);

    const { count } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("domain", p.domain)
      .gt("elo", p.elo);

    setRank(count != null ? count + 1 : null);
    setLoading(false);
  }, [playerId, supabase]);

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
    (s) => s.chips_end != null && s.chips_end > s.session.buy_in
  ).length;
  const winRate =
    sessions.length > 0 ? Math.round((wins / sessions.length) * 100) : 0;

  const eloHistory = sessions
    .filter((s) => s.elo_after != null)
    .map((s) => s.elo_after!)
    .reverse();

  const eloMin = eloHistory.length > 0 ? Math.min(...eloHistory) - 20 : 1180;
  const eloMax = eloHistory.length > 0 ? Math.max(...eloHistory) + 20 : 1220;
  const eloRange = eloMax - eloMin || 1;

  return (
    <div>
      {/* Player info */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-slate-900">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="mt-3 text-xl font-bold">{player.name}</h1>
        <p className="text-sm text-muted">{player.email}</p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: t("session.elo"), value: player.elo },
          { label: t("profile.winRate"), value: `${winRate}%` },
          { label: t("profile.rank"), value: rank ? `#${rank}` : "-" },
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
                s.elo_after != null ? s.elo_after - s.elo_before : null;
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.session_id}`}
                  className="flex items-center justify-between rounded-xl border border-card-border bg-card p-3 transition hover:border-accent/30"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {s.session.played_date}
                    </div>
                    <div className="text-xs text-muted">
                      {t("session.buyIn")}: {s.session.buy_in}
                      {" · "}
                      {t("session.chips")}: {s.chips_end ?? "-"}
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
