"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { AuthGuard } from "@/components/auth-guard";
import { BottomNav } from "@/components/bottom-nav";
import { streamUrl } from "@/lib/api";
import type { Session, Player, SessionPlayer } from "@/types/database";
import type { SessionEvent } from "@/types/events";
import type { TranslationKey } from "@/i18n/translations";
import { getSessionTitle, getEloTier, getDivisionInfo } from "@/lib/ranks";

interface PlayerRow extends SessionPlayer {
  player: Pick<Player, "id" | "name" | "elo" | "avatarUrl">;
}

interface SessionDetail {
  session: Session;
  players: PlayerRow[];
}

// Animates a number from `from` to `to` over `duration`ms
function useCountUp(to: number | null, duration = 900) {
  const [display, setDisplay] = useState<number | null>(to);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (to === null) { setDisplay(null); return; }
    const start = display ?? to;
    if (start === to) { setDisplay(to); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (to - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  return display;
}

function EloDisplay({ before, after, delay = 0 }: { before: number; after: number | null; delay?: number }) {
  const [revealed, setRevealed] = useState(false);
  const animatedElo = useCountUp(revealed && after != null ? after : before, 800);

  useEffect(() => {
    if (after == null) return;
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [after, delay]);

  const delta = after != null ? after - before : null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">Elo</span>
      <span
        className={`font-mono font-bold tabular-nums transition-colors duration-300 ${
          revealed && delta != null
            ? delta >= 0 ? "text-green-400" : "text-red-400"
            : "text-foreground"
        }`}
      >
        {animatedElo ?? before}
      </span>
      {revealed && delta != null && (
        <span
          className={`text-xs font-bold ${delta >= 0 ? "animate-elo-up text-green-400" : "animate-elo-down text-red-400"}`}
          style={{ animationDelay: `${delay + 100}ms`, opacity: 0 }}
        >
          {delta >= 0 ? "+" : ""}{delta}
        </span>
      )}
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const HYPE_KEYS = [
  "session.hype1", "session.hype2", "session.hype3",
  "session.hype4", "session.hype5", "session.hype6",
] as const;

function WaitingBanner({ t }: { t: (key: TranslationKey) => string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * HYPE_KEYS.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % HYPE_KEYS.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent flex-shrink-0" />
        <p className="text-sm font-medium text-accent">{t("session.allChipsReady")}</p>
      </div>
      <p
        className={`mt-2 text-xs text-accent/70 italic transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
      >
        {t(HYPE_KEYS[idx])}
      </p>
    </div>
  );
}

interface ChipInputProps {
  spId: string;
  playerId: string;
  myId: string | undefined;
  isCreator: boolean;
  confirmed: boolean;
  chipVal: string;
  placeholder: string;
  onChange: (val: string) => void;
  onFocus: () => void;
  onConfirm: () => void;
  onReEdit: () => void;
}

function ChipInput({ spId: _spId, playerId, myId, isCreator, confirmed, chipVal, placeholder, onChange, onFocus, onConfirm, onReEdit }: ChipInputProps) {
  const canEdit = isCreator || playerId === myId;
  if (!canEdit) return <div className="font-mono text-sm text-muted">{chipVal || "–"}</div>;

  if (confirmed) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-medium text-green-400">{chipVal || "\u2013"}</span>
        {isCreator ? (
          <button
            onClick={onReEdit}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-accent transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
            </svg>
          </button>
        ) : (
          <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={chipVal}
        placeholder={placeholder}
        className="w-24 rounded-lg border border-card-border bg-slate-800 px-2 py-2 text-right font-mono text-sm text-foreground focus:border-accent focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
      <button
        onClick={onConfirm}
        disabled={!chipVal}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-400 transition hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}

function SessionContent() {
  const { id } = useParams<{ id: string }>();
  const { player: me, api } = useAuth();
  const { getToken } = useClerkAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [localChips, setLocalChips] = useState<Record<string, string>>({});
  const focusedSpId = useRef<string | null>(null);
  const prevLockedRef = useRef<boolean>(false);
  const [justLocked, setJustLocked] = useState(false);
  const [confirmedSpIds, setConfirmedSpIds] = useState<Set<string>>(new Set());
  const [reEditingSpIds, setReEditingSpIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    const detail = await api.get<SessionDetail>(`/sessions/${id}`);
    setSession(detail.session);
    if (!prevLockedRef.current && detail.session.isLocked) {
      setJustLocked(true);
    }
    prevLockedRef.current = detail.session.isLocked;
    setPlayers(detail.players);
    setLocalChips((prev) => {
      const next = { ...prev };
      for (const row of detail.players) {
        if (row.id !== focusedSpId.current) {
          next[row.id] = row.chipsEnd != null ? String(row.chipsEnd) : "";
        } else if (!(row.id in next)) {
          next[row.id] = row.chipsEnd != null ? String(row.chipsEnd) : "";
        }
      }
      return next;
    });
    setConfirmedSpIds((prev) => {
      const next = new Set(prev);
      for (const row of detail.players) {
        if (row.chipsEnd != null && row.id !== focusedSpId.current) next.add(row.id);
      }
      return next;
    });
    setLoading(false);
  }, [id, api]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // SSE subscription — typed events with in-place state patches.
  // Falls back to a full refetch on error (covers reconnect drift).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let es: EventSource | null = null;

    (async () => {
      const token = await getToken();
      if (cancelled || !token) return;
      es = new EventSource(streamUrl(`/sessions/${id}/stream`, token));

      es.addEventListener("session.player_joined", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.player_joined") return;
          setPlayers((prev) => {
            if (prev.some((p) => p.id === data.sessionPlayer.id)) return prev;
            return [...prev, data.sessionPlayer];
          });
          setLocalChips((prev) => ({
            ...prev,
            [data.sessionPlayer.id]:
              data.sessionPlayer.chipsEnd != null
                ? String(data.sessionPlayer.chipsEnd)
                : "",
          }));
        } catch {
          /* noop */
        }
      });

      es.addEventListener("session.chips_updated", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.chips_updated") return;
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === data.sessionPlayerId
                ? { ...p, chipsEnd: data.chipsEnd }
                : p,
            ),
          );
          // Don't clobber the local input if this user is currently editing it
          if (focusedSpId.current !== data.sessionPlayerId) {
            setLocalChips((prev) => ({
              ...prev,
              [data.sessionPlayerId]:
                data.chipsEnd != null ? String(data.chipsEnd) : "",
            }));
            if (data.chipsEnd != null) {
              setConfirmedSpIds((prev) => {
                const next = new Set(prev);
                next.add(data.sessionPlayerId);
                return next;
              });
            }
          }
        } catch {
          /* noop */
        }
      });

      es.addEventListener("session.locked", (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
          if (data.type !== "session.locked") return;
          if (!prevLockedRef.current) setJustLocked(true);
          prevLockedRef.current = true;
          setSession((prev) =>
            prev ? { ...prev, isLocked: true, lockedAt: new Date().toISOString() } : prev,
          );
          // Apply ELO results to local rows
          const byId = new Map(data.results.map((r) => [r.playerId, r]));
          setPlayers((prev) =>
            prev.map((p) => {
              const r = byId.get(p.playerId);
              if (!r) return p;
              return { ...p, eloBefore: r.eloBefore, eloAfter: r.eloAfter };
            }),
          );
        } catch {
          /* noop */
        }
      });

      es.onerror = () => {
        // Browser auto-reconnects; refetch once to clear any drift
        fetchSession();
      };
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [id, getToken, fetchSession]);

  const joinSession = async () => {
    if (!session || !me) return;
    await api.post(`/sessions/${session.id}/players`, { self: true });
    fetchSession();
  };

  const updateChips = async (spId: string, chips: number | null) => {
    if (!session) return;
    await api.patch(`/sessions/${session.id}/players/${spId}`, { chipsEnd: chips });
  };

  const confirmChips = async (spId: string) => {
    const val = localChips[spId] ? parseInt(localChips[spId], 10) : null;
    focusedSpId.current = null;
    setConfirmedSpIds((prev) => new Set([...prev, spId]));
    setReEditingSpIds((prev) => { const n = new Set(prev); n.delete(spId); return n; });
    await updateChips(spId, val);
  };

  const startReEdit = (spId: string) => {
    setReEditingSpIds((prev) => new Set([...prev, spId]));
    setConfirmedSpIds((prev) => { const n = new Set(prev); n.delete(spId); return n; });
  };

  const lockSession = async () => {
    if (!session) return;
    setLocking(true);
    try {
      await api.post(`/sessions/${session.id}/lock`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to lock session");
    }
    setLocking(false);
    fetchSession();
  };

  if (loading || !session) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const isCreator = session.createdBy === me?.id;
  const isParticipant = players.some((p) => p.playerId === me?.id);
  const canJoin = !isParticipant && !session.isLocked && !!me;
  const expectedTotal = session.buyIn * players.length;
  const actualTotal = players.reduce((sum, p) => sum + (parseInt(localChips[p.id] ?? "", 10) || 0), 0);
  const allChipsEntered = players.length > 0 && players.every((p) => (localChips[p.id] ?? "").trim() !== "");
  const isValid = players.length >= 2 && allChipsEntered && actualTotal === expectedTotal;
  const existingPlayerIds = new Set(players.map((p) => p.playerId));

  // Sorted by chipsEnd desc for results, by Elo desc for open sessions
  const resultPlayers = session.isLocked
    ? [...players].sort((a, b) => (b.chipsEnd ?? 0) - (a.chipsEnd ?? 0))
    : [...players].sort((a, b) => b.player.elo - a.player.elo);

  const localTime = new Date(session.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleLockClick = () => {
    if (locking) return;
    if (!allChipsEntered) {
      setLockError(t("session.lockErrorNotReady"));
      setTimeout(() => setLockError(null), 3000);
      return;
    }
    if (!isValid) {
      setLockError(t("session.lockErrorInvalid"));
      setTimeout(() => setLockError(null), 3000);
      return;
    }
    setLockError(null);
    lockSession();
  };

  // Non-creator participant sees waiting banner once they've confirmed their own chips
  const myRow = players.find((p) => p.playerId === me?.id);
  const showWaiting = !session.isLocked && isParticipant && !isCreator &&
    myRow != null && confirmedSpIds.has(myRow.id) && !reEditingSpIds.has(myRow.id);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t("session.title")}</h1>
          <p className="text-xs text-muted">{session.playedDate} {localTime} &middot; {t("session.buyIn")}: {session.buyIn}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${session.isLocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
            {session.isLocked ? t("session.locked") : t("session.open")}
          </span>
          {isCreator && !isParticipant && !session.isLocked && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              {t("session.dealer")}
            </span>
          )}
        </div>
      </div>

      {/* Waiting banner — non-creator once they've confirmed their chips */}
      {showWaiting && <WaitingBanner t={t} />}

      {/* Chip validation bar — visible to creator */}
      {!session.isLocked && isCreator && players.length > 0 && (() => {
        const confirmedCount = players.filter((p) => confirmedSpIds.has(p.id) && !reEditingSpIds.has(p.id)).length;
        const delta = actualTotal - expectedTotal;
        const isCheating = allChipsEntered && delta < 0;
        const isExtra = allChipsEntered && delta > 0;
        return (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${
            allChipsEntered && isValid
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : isCheating
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-card-border bg-card text-muted"
          }`}>
            <div className="flex items-center justify-between">
              <span className={isCheating ? "text-red-400" : isExtra ? "text-yellow-400" : ""}>
                {t("session.chips")}: {actualTotal} / {expectedTotal}
              </span>
              <span className={confirmedCount === players.length ? "text-green-400" : ""}>
                {confirmedCount}/{players.length} {t("session.confirmed")}
              </span>
            </div>
            {isCheating && (
              <div className="mt-1.5 flex items-center gap-1 font-semibold text-red-400">
                {t("session.cheatWarning")} {Math.abs(delta)}
              </div>
            )}
            {isExtra && (
              <div className="mt-1.5 text-yellow-400">
                {t("session.extraWarning")} {delta}
              </div>
            )}
            {/* Progress bar */}
            <div className="mt-2 h-1 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allChipsEntered && isValid ? "bg-green-500" : isCheating ? "bg-red-500" : "bg-accent"
                }`}
                style={{ width: `${players.length > 0 ? (confirmedCount / players.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Results header when just locked */}
      {session.isLocked && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-accent">{t("session.results")}</p>
        </div>
      )}

      {/* Player list */}
      <div className="mt-4">
        {!session.isLocked && (
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted">
              {t("session.fighters")} ({players.length})
            </h2>
            <span className="text-xs text-muted italic">{t("session.sortedByElo")}</span>
          </div>
        )}
        <div className="space-y-2">
        {resultPlayers.map((sp, i) => {
          const rank = session.isLocked ? i : null;
          const animDelay = justLocked ? i * 120 : 0;
          return (
            <div
              key={sp.id}
              className={`rounded-xl border bg-card p-3 transition-all ${
                session.isLocked && justLocked ? "animate-slide-in" : ""
              } ${
                session.isLocked && rank === 0
                  ? `border-amber-400/50${justLocked ? "" : " animate-pulse-glow"}`
                  : "border-card-border"
              }`}
              style={justLocked ? { animationDelay: `${animDelay}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                {session.isLocked && rank !== null && (
                  <div
                    className="flex-shrink-0 animate-pop-in"
                    style={{ animationDelay: `${animDelay + 200}ms`, opacity: 0, animationFillMode: "forwards" }}
                  >
                    {rank < 3 ? (
                      <span className="text-2xl leading-none">{RANK_MEDALS[rank]}</span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                        {rank + 1}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/player/${sp.playerId}`}
                      className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80 active:opacity-60"
                    >
                      {sp.player.avatarUrl ? (
                        <img src={sp.player.avatarUrl} alt="" className="h-6 w-6 rounded-full flex-shrink-0" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300 flex-shrink-0">
                          {sp.player.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate font-medium">{sp.player.name}</span>
                    </Link>
                    {sp.playerId === session.createdBy && (
                      <span className="flex-shrink-0 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-400">
                        {t("session.host")}
                      </span>
                    )}
                  </div>
                  {session.isLocked && rank !== null && sp.chipsEnd != null && (() => {
                    const title = getSessionTitle(rank, resultPlayers.length, sp.chipsEnd, session.buyIn);
                    return (
                      <div
                        className={`text-xs font-semibold ${title.colorClass} animate-pop-in`}
                        style={justLocked ? { animationDelay: `${animDelay + 350}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
                      >
                        {title.icon} {t(title.key)}
                      </div>
                    );
                  })()}
                  <EloDisplay before={sp.eloBefore ?? sp.player.elo} after={sp.eloAfter} delay={animDelay + 400} />
                  {!session.isLocked && (() => {
                    const tier = getEloTier(sp.player.elo);
                    return (
                      <div className={`text-xs ${tier.colorClass}`}>
                        {tier.icon} {t(tier.key)}
                      </div>
                    );
                  })()}
                  {session.isLocked && sp.eloAfter != null && sp.eloBefore != null && (() => {
                    const beforeTier = getEloTier(sp.eloBefore);
                    const afterTier = getEloTier(sp.eloAfter);
                    const tierChanged = beforeTier.key !== afterTier.key;
                    const isRankUp = sp.eloAfter > sp.eloBefore;
                    const divInfo = getDivisionInfo(sp.eloAfter);
                    const stars = divInfo.stars > 0 ? "★".repeat(divInfo.stars) + "☆".repeat(3 - divInfo.stars) : null;
                    return (
                      <>
                        {tierChanged && (
                          <div
                            className={`mt-0.5 text-xs font-semibold ${afterTier.colorClass} animate-pop-in`}
                            style={justLocked ? { animationDelay: `${animDelay + 600}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
                          >
                            {isRankUp ? "⬆" : "⬇"} {t(isRankUp ? "session.rankedUp" : "session.rankedDown")} {afterTier.icon} {t(afterTier.key)}
                          </div>
                        )}
                        <div
                          className={`mt-1 flex flex-col gap-1 ${justLocked ? "animate-slide-in" : ""}`}
                          style={justLocked ? { animationDelay: `${animDelay + 800}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${afterTier.bgClass} ${afterTier.colorClass}`}>
                              {afterTier.icon} {t(afterTier.key)}
                              {stars && (
                                <span className="ml-1 tracking-tight">
                                  <span className={afterTier.colorClass}>{stars.slice(0, divInfo.stars)}</span>
                                  <span className="opacity-25">{stars.slice(divInfo.stars)}</span>
                                </span>
                              )}
                            </span>
                          </div>
                          {divInfo.eloToNext !== null && (
                            <div className="relative h-1.5 w-full rounded-full bg-slate-700">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full ${afterTier.fillClass}`}
                                style={{
                                  width: afterTier.hasDivisions
                                    ? `${(divInfo.stars - 1) * 33.33 + divInfo.progressPct * 0.3333}%`
                                    : `${divInfo.progressPct}%`,
                                }}
                              />
                              {afterTier.hasDivisions && (
                                <>
                                  <div className="absolute inset-y-0 w-[2px] bg-black/50" style={{ left: "33.33%" }} />
                                  <div className="absolute inset-y-0 w-[2px] bg-black/50" style={{ left: "66.66%" }} />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {session.isLocked ? (
                  <div
                    className="text-right animate-pop-in"
                    style={{ animationDelay: `${animDelay + 300}ms`, opacity: 0, animationFillMode: "forwards" }}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-muted">{t("session.chips")}</div>
                    <div className="font-mono text-lg font-bold leading-tight">{sp.chipsEnd}</div>
                    {sp.chipsEnd != null && (
                      <div className={`text-xs font-semibold ${sp.chipsEnd - session.buyIn >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {sp.chipsEnd - session.buyIn >= 0 ? "+" : ""}{sp.chipsEnd - session.buyIn}
                      </div>
                    )}
                  </div>
                ) : (
                  <ChipInput
                    spId={sp.id}
                    playerId={sp.playerId}
                    myId={me?.id}
                    isCreator={isCreator}
                    confirmed={confirmedSpIds.has(sp.id) && !reEditingSpIds.has(sp.id)}
                    chipVal={localChips[sp.id] ?? ""}
                    placeholder={t("session.chipsPlaceholder")}
                    onChange={(val) => setLocalChips((prev) => ({ ...prev, [sp.id]: val }))}
                    onFocus={() => { focusedSpId.current = sp.id; }}
                    onConfirm={() => confirmChips(sp.id)}
                    onReEdit={() => startReEdit(sp.id)}
                  />
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Actions */}
      {!session.isLocked && (
        <div className="mt-4 space-y-2">
          {canJoin && !isCreator && (
            <div>
              <button onClick={joinSession} className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 active:scale-[0.98]">
                {t("session.joinSession")}
              </button>
              <p className="mt-1.5 text-center text-xs text-muted italic">{t("session.joinHype")}</p>
            </div>
          )}
          {canJoin && isCreator && (
            <div>
              <div className="flex gap-2">
                <button onClick={joinSession} className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 active:scale-[0.98]">
                  {t("session.joinSession")}
                </button>
                <div className="flex-1 rounded-xl border border-card-border bg-card px-4 py-3 text-center text-sm text-muted">
                  {t("session.dealerHint")}
                </div>
              </div>
              <p className="mt-1.5 text-center text-xs text-muted italic">{t("session.joinHype")}</p>
            </div>
          )}
          {isCreator && players.length >= 2 && (
            <div className="relative">
              <button
                onClick={handleLockClick}
                className={`w-full rounded-xl px-4 py-3 font-semibold transition active:scale-[0.98] ${
                  isValid && !locking
                    ? "bg-accent text-slate-900 hover:bg-amber-400"
                    : locking
                    ? "bg-slate-700 text-slate-400 cursor-wait"
                    : "bg-accent/60 text-slate-900/70 hover:bg-accent/70"
                }`}
              >
                {locking ? t("session.calculating") : t("session.lockCalculate")}
              </button>
              {lockError && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-center text-sm font-medium text-red-400 animate-slide-in">
                  {lockError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function SessionPage() {
  return (
    <AuthGuard>
      <SessionContent />
    </AuthGuard>
  );
}
