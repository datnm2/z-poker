"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { Loading } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api";
import type { Player } from "@/types/database";
import { getEloTier, getDivisionInfo, ELO_TIERS } from "@/lib/ranks";

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
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const [p, history] = await Promise.all([
        api.get<PlayerWithRank>(`/players/${playerId}`),
        api.get<SessionRecord[]>(`/players/${playerId}/history?limit=20`),
      ]);
      setPlayer(p);
      setSessions(history);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;
      setError({ message, status });
    } finally {
      setLoading(false);
    }
  }, [playerId, api]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return <Loading fullscreen />;
  }

  if (error || !player) {
    return (
      <ErrorState
        fullscreen
        message={error?.message}
        status={error?.status}
        onRetry={() => {
          setLoading(true);
          fetchProfile();
        }}
      />
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

  const peakElo = eloHistory.length > 0 ? Math.max(...eloHistory) : null;
  const lowestElo = eloHistory.length > 0 ? Math.min(...eloHistory) : null;
  const showLowest = lowestElo != null && peakElo != null && peakElo - lowestElo >= 20;

  const tier = getEloTier(player.elo);
  const divInfo = getDivisionInfo(player.elo);
  const tierStars = divInfo.stars > 0 ? "★".repeat(divInfo.stars) + "☆".repeat(3 - divInfo.stars) : null;

  return (
    <div>
      {/* Player info */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-contrast overflow-hidden">
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            player.name.charAt(0).toUpperCase()
          )}
        </div>
        <h1 className="mt-3 text-xl font-bold">{player.name}</h1>
        <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-semibold ${tier.bgClass} ${tier.colorClass} ${tier.key === "rank.godlike" ? "rank-godlike-glow" : ""}`}>
          <span>{tier.icon}</span>
          <span>{t(tier.key)}</span>
          {tierStars && (
            <span className="ml-1 tracking-tight">
              <span className={tier.colorClass}>{tierStars.slice(0, divInfo.stars)}</span>
              <span className="opacity-25">{tierStars.slice(divInfo.stars)}</span>
            </span>
          )}
        </div>
        {player.jackpot > 0 && (
          <div className="mt-2 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 px-4 py-1 text-xs font-black text-amber-400 shadow-[0_0_15px_-3px_rgba(251,191,36,0.4)] animate-pulse-glow">
              <span className="text-sm">💰</span>
              <span className="uppercase tracking-wider">{t("session.jackpotTotal")}:</span>
              <span className="text-sm tabular-nums">{player.jackpot}</span>
            </div>
          </div>
        )}
        <p className="mt-2 text-sm text-muted">
          {player.email.replace(/^(.{2})[^@]+(@.+)$/, "$1***$2")}
        </p>
      </div>

      {/* Rank progress card */}
      {divInfo.eloToNext !== null && (() => {
        const fillPct = tier.hasDivisions
          ? (divInfo.stars - 1) * 33.33 + divInfo.progressPct * 0.3333
          : divInfo.progressPct;
        const nextTier = divInfo.nextTierKey
          ? ELO_TIERS.find((tt) => tt.key === divInfo.nextTierKey)
          : null;
        const targetStars = "★".repeat(Math.min(3, divInfo.stars + 1));
        const labelText = nextTier
          ? t("rank.toNextRank").replace("{n}", String(divInfo.eloToNext))
          : t("rank.toNextDiv")
              .replace("{n}", String(divInfo.eloToNext))
              .replace("{stars}", targetStars);
        return (
          <div className="mt-4 rounded-xl border border-card-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted">{t("profile.rankProgress")}</span>
            </div>
            <div className="relative h-7 w-full overflow-hidden rounded-md bg-slate-800/80 ring-1 ring-inset ring-white/5">
              <div
                className={`absolute inset-y-0 left-0 rounded-md ${tier.fillClass} animate-bar-fill`}
                style={{
                  ["--bar-target" as string]: `${fillPct}%`,
                  boxShadow: `0 0 8px -2px var(--accent)`,
                }}
              >
                <div
                  className="absolute inset-y-0 -inset-x-4 animate-bar-shimmer pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
                  }}
                />
              </div>
              {tier.hasDivisions && (
                <>
                  <div className="absolute inset-y-0 w-[2px] bg-black/40" style={{ left: "33.33%" }} />
                  <div className="absolute inset-y-0 w-[2px] bg-black/40" style={{ left: "66.66%" }} />
                </>
              )}
              <span className="absolute inset-y-0 left-2 flex items-center pr-[100px] text-[11px] font-semibold leading-none text-white/95 truncate drop-shadow">
                {labelText}
              </span>
              {nextTier && (
                <span
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded bg-black/45 px-1.5 py-[3px] text-[11px] font-bold leading-none ${nextTier.colorClass}`}
                >
                  <span>{nextTier.icon}</span>
                  <span className="max-w-[80px] truncate">{t(nextTier.key)}</span>
                </span>
              )}
            </div>
          </div>
        );
      })()}

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
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted">
              {t("profile.eloHistory")}
            </h2>
            <div className="flex items-center gap-1.5">
              {peakElo != null && (
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  📈 {t("profile.peak")} {peakElo}
                </span>
              )}
              {showLowest && lowestElo != null && (
                <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  📉 {t("profile.lowest")} {lowestElo}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-card-border bg-card p-4">
            {(() => {
              const points = eloHistory.map((elo, i) => {
                const x = (i / (eloHistory.length - 1)) * 296 + 2;
                const y = 96 - ((elo - eloMin) / eloRange) * 92;
                return { x, y, elo };
              });
              const polyStr = points.map((p) => `${p.x},${p.y}`).join(" ");
              const areaPath = `M ${points[0].x},${points[0].y} ${points.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ")} L ${points[points.length - 1].x},96 L ${points[0].x},96 Z`;

              const peakIdx = peakElo != null ? eloHistory.indexOf(peakElo) : -1;
              const lowestIdx = showLowest && lowestElo != null ? eloHistory.indexOf(lowestElo) : -1;
              const lastIdx = points.length - 1;

              const TIER_BOUNDARIES = [
                { elo: 1600, color: "#a78bfa" },
                { elo: 1450, color: "#60a5fa" },
                { elo: 1300, color: "#34d399" },
                { elo: 1150, color: "#facc15" },
                { elo: 1000, color: "#fb923c" },
              ];

              return (
                <svg viewBox="0 0 300 100" className="w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="eloArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d946ef" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Tier boundary dashed lines */}
                  {TIER_BOUNDARIES.filter((b) => b.elo >= eloMin && b.elo <= eloMax).map((b) => {
                    const y = 96 - ((b.elo - eloMin) / eloRange) * 92;
                    return (
                      <line
                        key={b.elo}
                        x1="0"
                        x2="300"
                        y1={y}
                        y2={y}
                        stroke={b.color}
                        strokeWidth="1"
                        strokeDasharray="2,3"
                        opacity="0.22"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                  {/* Area fill */}
                  <path
                    d={areaPath}
                    fill="url(#eloArea)"
                    className="animate-elo-fade-in"
                    style={{ opacity: 0 }}
                  />

                  {/* Trend line with reveal */}
                  <polyline
                    points={polyStr}
                    fill="none"
                    stroke="#d946ef"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="animate-elo-draw"
                    style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
                  />

                  {/* Dots */}
                  {points.map((p, i) => {
                    const isPeak = i === peakIdx;
                    const isLowest = i === lowestIdx;
                    const isCurrent = i === lastIdx;
                    const isHighlight = isPeak || isLowest;
                    const ringColor = isPeak ? "#34d399" : isLowest ? "#f87171" : "#d946ef";
                    return (
                      <g key={i}>
                        {isHighlight && (
                          <circle cx={p.x} cy={p.y} r="5" fill="none" stroke={ringColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHighlight ? 3 : isCurrent ? 3.5 : 2.5}
                          fill={isPeak ? "#34d399" : isLowest ? "#f87171" : "#d946ef"}
                        />
                      </g>
                    );
                  })}

                  {/* Current point pulse */}
                  {points.length > 0 && (
                    <circle
                      cx={points[lastIdx].x}
                      cy={points[lastIdx].y}
                      r="3"
                      fill="none"
                      stroke="#d946ef"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    >
                      <animate attributeName="r" values="3;10" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                </svg>
              );
            })()}
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

              // Outcome badge — derived from chipsEnd vs buyIn
              let outcome: { icon: string; labelKey: "profile.resultWin" | "profile.resultLose" | "profile.resultBroke" | "profile.resultBreakeven"; color: string } | null = null;
              if (s.chipsEnd != null) {
                const d = s.chipsEnd - s.session.buyIn;
                if (s.chipsEnd === 0) outcome = { icon: "💸", labelKey: "profile.resultBroke", color: "text-red-400" };
                else if (d > 0) outcome = { icon: "📈", labelKey: "profile.resultWin", color: "text-green-400" };
                else if (d === 0) outcome = { icon: "⚖️", labelKey: "profile.resultBreakeven", color: "text-yellow-400" };
                else outcome = { icon: "📉", labelKey: "profile.resultLose", color: "text-orange-400" };
              }

              // Tier / division change
              const tierChanged =
                s.eloBefore != null && s.eloAfter != null &&
                getEloTier(s.eloBefore).key !== getEloTier(s.eloAfter).key;
              const newTier = s.eloAfter != null ? getEloTier(s.eloAfter) : null;
              const isRankUp = s.eloBefore != null && s.eloAfter != null && s.eloAfter > s.eloBefore;

              // Division change within the same tier (sao tăng/giảm)
              let divisionChange: { up: boolean; toStars: number; tier: ReturnType<typeof getEloTier> } | null = null;
              if (!tierChanged && s.eloBefore != null && s.eloAfter != null) {
                const beforeDiv = getDivisionInfo(s.eloBefore);
                const afterDiv = getDivisionInfo(s.eloAfter);
                if (beforeDiv.stars > 0 && afterDiv.stars > 0 && beforeDiv.stars !== afterDiv.stars) {
                  divisionChange = {
                    up: afterDiv.stars > beforeDiv.stars,
                    toStars: afterDiv.stars,
                    tier: getEloTier(s.eloAfter),
                  };
                }
              }

              return (
                <Link
                  key={s.id}
                  href={`/session/${s.sessionId}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-card-border bg-card p-3 transition-all duration-150 hover:border-accent/30 active:scale-[0.98] active:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
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
                    {(outcome || tierChanged || divisionChange) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {outcome && (
                          <span className={`text-[10px] font-semibold ${outcome.color}`}>
                            {outcome.icon} {t(outcome.labelKey)}
                          </span>
                        )}
                        {tierChanged && newTier && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${newTier.bgClass} ${newTier.colorClass} ${newTier.key === "rank.godlike" ? "rank-godlike-glow" : ""}`}>
                            {isRankUp ? "⬆" : "⬇"} {newTier.icon} {t(newTier.key)}
                          </span>
                        )}
                        {!tierChanged && divisionChange && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${divisionChange.tier.bgClass} ${divisionChange.tier.colorClass} ${divisionChange.tier.key === "rank.godlike" ? "rank-godlike-glow" : ""}`}>
                            {divisionChange.up ? "⬆" : "⬇"}{" "}
                            <span className={divisionChange.tier.colorClass}>
                              {"★".repeat(divisionChange.toStars)}
                            </span>
                            <span className="opacity-25">{"★".repeat(3 - divisionChange.toStars)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
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
                    <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
