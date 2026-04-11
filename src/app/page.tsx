"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { AuthGuard } from "@/components/auth-guard";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Player, Session } from "@/types/database";

interface ActiveSession extends Session {
  creator: Pick<Player, "name"> | null;
}

type LeaderboardPlayer = Pick<Player, "id" | "name" | "elo" | "games_played">;

function LeaderboardContent() {
  const { player } = useAuth();
  const { t } = useI18n();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [buyIn, setBuyIn] = useState(800);

  const fetchData = useCallback(async () => {
    if (!player?.domain) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase
        .from("players")
        .select("id, name, elo, games_played")
        .eq("domain", player.domain)
        .order("elo", { ascending: false }),
      supabase
        .from("sessions")
        .select("*, creator:players!created_by(name)")
        .eq("domain", player.domain)
        .eq("is_locked", false)
        .order("created_at", { ascending: false }),
    ]);
    if (p) setPlayers(p);
    if (s) setActiveSessions(s as ActiveSession[]);
    setLoading(false);
  }, [player?.domain, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createSession = async () => {
    if (!player) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("sessions")
      .insert({
        played_date: today,
        domain: player.domain,
        created_by: player.id,
        buy_in: buyIn,
      })
      .select()
      .single();
    if (data) router.push(`/session/${data.id}`);
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
          players.reduce((s, p) => s + p.games_played, 0) / players.length
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
            {activeSessions.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/5 p-3 transition hover:border-green-500/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{s.played_date}</span>
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                      {t("session.open")}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>{t("session.buyIn")}: {s.buy_in}</span>
                    {s.creator && (
                      <>
                        <span>·</span>
                        <span>{t("session.createdBy")}: {s.creator.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Create Session */}
      <div className="mt-4">
        {showCreateForm ? (
          <div className="rounded-xl border border-card-border bg-card p-4">
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
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-xs text-muted">
                {p.games_played}{" "}
                {p.games_played === 1
                  ? t("leaderboard.game")
                  : t("leaderboard.games")}
              </div>
            </div>
            <div className={`text-lg font-bold ${i === 0 ? "text-accent" : ""}`}>
              {p.elo}
            </div>
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
