"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { ApiError } from "@/lib/api";
import { localDate } from "@/lib/date";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";
import type { Session, Player, SessionPlayer, SessionHighlights } from "@/types/database";
import { HighlightsStory } from "@/components/highlights-story";
import { ShareButton } from "@/components/share-button";
import type { TFunction } from "@/providers/i18n-provider";
import { getSessionTitle, getEloTier, getDivisionInfo } from "@/lib/ranks";

interface PlayerRow extends SessionPlayer {
  player: Pick<Player, "id" | "name" | "elo" | "avatarUrl" | "jackpot">;
}

interface SessionDetail {
  session: Session;
  players: PlayerRow[];
  highlights: SessionHighlights | null;
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

function EloDisplay({
  before,
  after,
  streakBonus,
  jackpotPaid,
  delay = 0,
  t,
}: {
  before: number;
  after: number | null;
  streakBonus?: number | null;
  jackpotPaid?: number | null;
  delay?: number;
  t: TFunction;
}) {
  const [revealed, setRevealed] = useState(false);
  const animatedElo = useCountUp(revealed && after != null ? after : before, 800);

  useEffect(() => {
    if (after == null) return;
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [after, delay]);

  const delta = after != null ? after - before : null;
  const showStreak = streakBonus != null && Math.abs(streakBonus) >= 6;
  const streakLabel = showStreak
    ? t(streakBonus! > 0 ? "session.streakIncluded.win" : "session.streakIncluded.loss")
        .replace(
          "{bonus}",
          `${streakBonus! > 0 ? "🔥 +" : "❄️ "}${streakBonus}`,
        )
    : null;

  const isJackpot = jackpotPaid != null && jackpotPaid > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Elo</span>
        <span
          className={`font-mono font-bold tabular-nums transition-colors duration-300 ${
            isJackpot && revealed ? "animate-jackpot-text text-yellow-400" :
            revealed && delta != null
              ? delta >= 0 ? "text-green-400" : "text-red-400"
              : "text-foreground"
          }`}
        >
          {animatedElo ?? before}
        </span>
        {revealed && delta != null && (
          <span
            className={`text-xs font-bold ${
              isJackpot ? "animate-poker-pop text-yellow-400" :
              delta >= 0 ? "animate-elo-up text-green-400" : "animate-elo-down text-red-400"
            }`}
            style={{ animationDelay: `${delay + 100}ms`, opacity: 0 }}
          >
            {delta >= 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      {revealed && (
        <div className="flex flex-col gap-0.5">
          {streakLabel && (
            <span
              className={`text-[10px] italic ${streakBonus! > 0 ? "text-orange-300/80" : "text-blue-300/80"}`}
            >
              {streakLabel}
            </span>
          )}
          {isJackpot && (
            <span className="animate-jackpot-pop text-[10px] font-bold text-yellow-400">
              {t("session.jackpotWon")} {t("session.jackpotBonus").replace("{amount}", String(jackpotPaid))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const HYPE_KEYS = [
  "session.hype1", "session.hype2", "session.hype3",
  "session.hype4", "session.hype5", "session.hype6",
] as const;

function WaitingBanner({ t }: { t: TFunction }) {
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
        <span className="poker-chip animate-chip-spin inline-block h-4 w-4 flex-shrink-0" />
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
  const { t } = useI18n();
  const canEdit = isCreator || playerId === myId;
  if (!canEdit) return <div className="font-mono text-sm text-muted">{chipVal || "–"}</div>;

  if (confirmed) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-green-400">{chipVal || "\u2013"}</span>
        {isCreator ? (
          <button
            onClick={onReEdit}
            aria-label={t("session.edit")}
            className="inline-flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border border-card-border bg-card/60 px-2 text-xs font-medium text-muted transition active:scale-95 active:border-accent active:bg-accent/10 active:text-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
            </svg>
            <span>{t("session.edit")}</span>
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
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={chipVal}
        placeholder={placeholder}
        className="h-10 w-36 rounded-lg border border-card-border bg-slate-800 px-2 text-right font-mono text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none sm:w-40"
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
      <button
        onClick={onConfirm}
        disabled={!chipVal}
        className="inline-flex h-10 flex-shrink-0 items-center gap-1 rounded-lg bg-green-500/20 px-2.5 text-xs font-semibold text-green-400 transition active:scale-95 active:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{t("session.confirm")}</span>
      </button>
    </div>
  );
}

function SessionContent() {
  const { id } = useParams<{ id: string }>();
  const { player: me, api } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [highlights, setHighlights] = useState<SessionHighlights | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const storyAutoShown = useRef(false);
  const [localChips, setLocalChips] = useState<Record<string, string>>({});
  const focusedSpId = useRef<string | null>(null);
  const prevLockedRef = useRef<boolean>(false);
  const [justLocked, setJustLocked] = useState(false);
  const [confirmedSpIds, setConfirmedSpIds] = useState<Set<string>>(new Set());
  const [reEditingSpIds, setReEditingSpIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [personas, setPersonas] = useState<
    Array<{ id: string; displayName: { vi: string; en: string }; sample: string }>
  >([]);
  // null = random (default); otherwise specific persona id
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  const inFlightRef = useRef<Promise<void> | null>(null);
  const fetchSession = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    const p = (async () => {
      try {
        const detail = await api.get<SessionDetail>(`/sessions/${id}`);
        setLoadError(null);
        setSession(detail.session);
        if (!prevLockedRef.current && detail.session.isLocked) {
          setJustLocked(true);
        }
        prevLockedRef.current = detail.session.isLocked;
        setPlayers(detail.players);
        setHighlights(detail.highlights);
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = err instanceof ApiError ? err.status : undefined;
        setLoadError({ message, status });
      } finally {
        setLoading(false);
      }
    })();
    inFlightRef.current = p;
    try {
      await p;
    } finally {
      inFlightRef.current = null;
    }
  }, [id, api]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Fetch MC personas once so the creator can pick one before locking
  // (or regenerating highlights).
  useEffect(() => {
    let cancelled = false;
    api
      .get<Array<{ id: string; displayName: { vi: string; en: string }; sample: string }>>(
        "/sessions/personas",
      )
      .then((list) => {
        if (!cancelled) setPersonas(list);
      })
      .catch(() => {
        /* non-fatal — picker just stays empty, defaults to random */
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Auto-show story once per (session, user) when highlights arrive
  useEffect(() => {
    if (!highlights || !me || !session?.isLocked || storyAutoShown.current) return;
    storyAutoShown.current = true;
    const key = `highlights.seen.${session.id}.${me.id}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    const t = setTimeout(() => setStoryOpen(true), 400);
    return () => clearTimeout(t);
  }, [highlights, me, session?.id, session?.isLocked]);

  const sseHandlers = useMemo<SseHandlers>(
    () => ({
      "session.player_joined": (data) => {
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
      },
      "session.chips_updated": (data) => {
        // Skip echo of our own action — UI already reflects it, and re-applying
        // would flicker the confirmed state if we're mid-focus on another row.
        if (me && data.actorId === me.id) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === data.sessionPlayerId ? { ...p, chipsEnd: data.chipsEnd } : p,
          ),
        );
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
      },
      "session.locked": (data) => {
        if (!prevLockedRef.current) {
          setJustLocked(true);
          // Trigger haptic feedback for Jackpot payout if any
          if (data.results.some((r) => r.jackpotChange > 0)) {
            if (typeof window !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate([100, 50, 100, 50, 200]);
            }
          }
        }
        prevLockedRef.current = true;
        setSession((prev) =>
          prev ? { ...prev, isLocked: true, lockedAt: new Date().toISOString() } : prev,
        );
        const byId = new Map(data.results.map((r) => [r.playerId, r]));
        setPlayers((prev) =>
          prev.map((p) => {
            const r = byId.get(p.playerId);
            if (!r) return p;
            return {
              ...p,
              eloBefore: r.eloBefore,
              eloAfter: r.eloAfter,
              streakBonus: r.streakBonus,
              jackpotPaid: r.jackpotChange < 0 ? Math.abs(r.jackpotChange) : 0,
              player: {
                ...p.player,
                jackpot: r.jackpotAfter,
              },
            };
          }),
        );
      },
      "session.highlights_ready": (data) => {
        setHighlights(data.highlights);
      },
    }),
    [me],
  );

  useSseStream({
    path: id ? `/sessions/${id}/stream` : null,
    handlers: sseHandlers,
    onResync: fetchSession,
    enabled: !!id && !!me,
  });

  const joinSession = async () => {
    if (!session || !me) return;
    await api.post(`/sessions/${session.id}/players`, { self: true });
    // The joiner's own SSE connection may have been opened after the server
    // published session.player_joined, so they'd miss their own join event.
    // Other tabs get the SSE patch; this tab needs a refetch to see itself.
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
      await api.post(`/sessions/${session.id}/lock`, {
        personaId: selectedPersonaId,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to lock session");
    }
    setLocking(false);
  };

  const regenerateHighlights = async (personaIdArg?: string | null) => {
    if (!session || regenerating) return;
    const pid = personaIdArg !== undefined ? personaIdArg : selectedPersonaId;
    setRegenerating(true);
    try {
      await api.post(`/sessions/${session.id}/highlights/regenerate`, {
        personaId: pid,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to regenerate");
      setRegenerating(false);
      return;
    }
    // Stay in loading state until session.highlights_ready SSE event arrives;
    // that handler calls setHighlights() which flips the banner.
    setTimeout(() => setRegenerating(false), 15_000);
  };

  if (loading) {
    return <Loading fullscreen />;
  }

  if (loadError || !session) {
    return (
      <ErrorState
        fullscreen
        message={loadError?.message}
        status={loadError?.status}
        onRetry={() => {
          setLoading(true);
          fetchSession();
        }}
      />
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

  // Share data — only meaningful once the session is locked. The text is
  // personalized to the current user's result (win/loss/even) when they're a
  // participant; non-participants get a generic spectator copy.
  const shareData = (() => {
    if (typeof window === "undefined" || !session.isLocked) return null;
    const url = window.location.href;
    const winner = resultPlayers[0];
    const ogTitle = t("share.og.title")
      .replace("{date}", localDate(session.createdAt))
      .replace("{winner}", winner?.player.name ?? "?");
    const personaName = highlights?.personaName?.[locale] ?? highlights?.personaName?.en ?? null;
    const ogDesc = personaName
      ? t("share.og.description")
          .replace("{buyIn}", String(session.buyIn))
          .replace("{players}", String(players.length))
          .replace("{mc}", personaName)
      : t("share.og.descriptionNoMc")
          .replace("{buyIn}", String(session.buyIn))
          .replace("{players}", String(players.length));

    const myResultRow = myRow ?? null;
    let text: string;
    if (myResultRow && myResultRow.chipsEnd != null && myResultRow.eloAfter != null && myResultRow.eloBefore != null) {
      const chipDelta = myResultRow.chipsEnd - session.buyIn;
      const eloDelta = myResultRow.eloAfter - myResultRow.eloBefore;
      const chipStr = chipDelta > 0 ? `+${chipDelta}` : String(chipDelta);
      const eloStr = eloDelta > 0 ? `+${eloDelta}` : String(eloDelta);
      const key =
        chipDelta > 0 ? "share.recap.win" : chipDelta < 0 ? "share.recap.loss" : "share.recap.even";
      text = t(key).replace("{chips}", chipStr).replace("{elo}", eloStr);
    } else {
      text = t("share.recap.spectator");
    }

    return { title: ogTitle, text, url, description: ogDesc };
  })();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label={t("back")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-card-border bg-card/60 text-muted transition active:scale-95 active:bg-accent/10 active:text-foreground"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t("session.title")}</h1>
          <p className="text-xs text-muted">{localDate(session.createdAt)} {localTime} &middot; {t("session.buyIn")}: {session.buyIn}</p>
        </div>
        <div className="flex items-center gap-2">
          {shareData && (
            <ShareButton
              data={{ title: shareData.title, text: shareData.text, url: shareData.url }}
            />
          )}
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
      </div>

      {/* Waiting banner — non-creator once they've confirmed their chips */}
      {showWaiting && <WaitingBanner t={t} />}

      {/* Session ELO stakes — visible to all while session is open */}
      {!session.isLocked && players.length > 0 && (() => {
        const K = 70;
        const N = players.length;
        const avgElo = Math.round(
          players.reduce((s, p) => s + (p.eloBefore ?? p.player.elo), 0) / N,
        );
        const myPlayerRow = players.find((p) => p.playerId === me?.id);
        const myElo = myPlayerRow?.eloBefore ?? myPlayerRow?.player.elo ?? me?.elo ?? null;
        const canShowStakes = myElo != null && N >= 2;
        const expected = canShowStakes
          ? 1 / (1 + Math.pow(10, (avgElo - myElo) / 400))
          : null;
        const actualMin = N >= 2 ? 0.5 - 0.5 / (N - 1) : 0;
        const maxGain = expected != null ? Math.max(1, Math.ceil(K * (N / 2) * (1 - expected))) : null;
        const maxLoss = expected != null ? Math.max(1, -Math.ceil(K * (N / 2) * (actualMin - expected))) : null;

        return (
          <div className="mt-4 rounded-2xl border border-card-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted">{t("session.stakes")}</p>
              <span className="text-[10px] text-muted">
                {N} {t("session.playersCount")}
              </span>
            </div>
            <div className={canShowStakes ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 gap-2"}>
              <div className="rounded-lg bg-card-border/30 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted">{t("session.avgElo")}</p>
                <p className="mt-0.5 font-mono text-lg font-bold text-foreground">{avgElo}</p>
              </div>
              {canShowStakes && maxGain != null && (
                <div className="rounded-lg bg-emerald-500/10 p-2 text-center ring-1 ring-emerald-500/20">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-400/80">{t("session.maxGain")}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-emerald-400">+{maxGain}</p>
                </div>
              )}
              {canShowStakes && maxLoss != null && (
                <div className="rounded-lg bg-red-500/10 p-2 text-center ring-1 ring-red-500/20">
                  <p className="text-[10px] uppercase tracking-wide text-red-400/80">{t("session.maxLoss")}</p>
                  <p className="mt-0.5 font-mono text-lg font-bold text-red-400">−{maxLoss}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Chip validation bar — visible to all players for transparency */}
      {!session.isLocked && players.length > 0 && (() => {
        const confirmedCount = players.filter((p) => confirmedSpIds.has(p.id) && !reEditingSpIds.has(p.id)).length;
        const delta = actualTotal - expectedTotal;
        const isCheating = allChipsEntered && delta < 0;
        const isExtra = allChipsEntered && delta > 0;
        const ratio = expectedTotal > 0 ? Math.min(100, (actualTotal / expectedTotal) * 100) : 0;
        const borderClass = isValid
          ? "border-green-500/40 bg-green-500/5"
          : isCheating
          ? "border-red-500/40 bg-red-500/5"
          : isExtra
          ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-card-border bg-card";
        const fillClass = isValid
          ? "bg-green-500"
          : isCheating
          ? "bg-red-500"
          : isExtra
          ? "bg-yellow-500"
          : "bg-accent";
        const headlineColor = isValid
          ? "text-green-400"
          : isCheating
          ? "text-red-400"
          : isExtra
          ? "text-yellow-400"
          : "text-foreground";
        return (
          <div className={`mt-4 rounded-xl border p-3 text-sm ${borderClass}`}>
            {/* Primary: chips entered / expected */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span>💰</span>
                <span>{t("session.chipsEntered")}</span>
              </span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${headlineColor}`}>
                {actualTotal.toLocaleString()} / {expectedTotal.toLocaleString()}
              </span>
            </div>
            {/* Progress bar — fills with chips, not with head count */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
                style={{ width: `${ratio}%` }}
              />
            </div>
            {/* Sub-rows */}
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              {isValid ? (
                <span className="font-semibold text-green-400">✓ {t("session.readyToLock")}</span>
              ) : isCheating ? (
                <span className="font-semibold text-red-400">
                  {t("session.cheatWarning")} {Math.abs(delta).toLocaleString()}
                </span>
              ) : isExtra ? (
                <span className="font-semibold text-yellow-400">
                  {t("session.extraWarning")} {delta.toLocaleString()}
                </span>
              ) : (
                <span>
                  {t("session.remainingToAccount")}:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {Math.max(0, expectedTotal - actualTotal).toLocaleString()}
                  </span>
                </span>
              )}
              <span className={confirmedCount === players.length ? "font-semibold text-green-400" : ""}>
                👥 {confirmedCount}/{players.length}
              </span>
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

      {/* AI highlights banner */}
      {session.isLocked && (
        <>
          {highlights ? (
            <>
              <button
                onClick={() => setStoryOpen(true)}
                className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 via-purple-500/15 to-indigo-500/15 px-4 py-3 text-left transition hover:from-fuchsia-500/25 hover:via-purple-500/25 hover:to-indigo-500/25"
              >
                <div className="flex -space-x-2">
                  {highlights.items.slice(0, 3).map((it, i) => (
                    <span
                      key={i}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-black/40 text-lg"
                    >
                      {it.emoji}
                    </span>
                  ))}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{t("session.highlights.title")}</p>
                  <p className="text-xs text-muted">{t("session.highlights.cta")}</p>
                  {highlights.personaName && (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-300">
                      {t("session.highlights.hostedBy")} &ldquo;{highlights.personaName[locale] ?? highlights.personaName.en}&rdquo;
                    </p>
                  )}
                </div>
                <span className="text-muted">›</span>
              </button>

              {personas.length > 0 && (
                <div className="relative mt-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {/* Random option */}
                    {(() => {
                      const isActive = !highlights.personaId && !selectedPersonaId;
                      return (
                        <button
                          key="random"
                          disabled={regenerating}
                          onClick={() => {
                            setSelectedPersonaId(null);
                            regenerateHighlights(null);
                          }}
                          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 disabled:opacity-40 ${
                            isActive
                              ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-300"
                              : "border-card-border bg-card/60 text-muted"
                          }`}
                        >
                          {regenerating && isActive ? (
                            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-fuchsia-400 border-t-transparent" />
                          ) : (
                            "🎲 Random"
                          )}
                        </button>
                      );
                    })()}

                    {personas.map((p) => {
                      const isActive = highlights.personaId
                        ? highlights.personaId === p.id
                        : selectedPersonaId === p.id;
                      const label = p.displayName[locale as keyof typeof p.displayName] ?? p.displayName.en;
                      return (
                        <button
                          key={p.id}
                          disabled={regenerating}
                          onClick={() => {
                            setSelectedPersonaId(p.id);
                            regenerateHighlights(p.id);
                          }}
                          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 disabled:opacity-40 ${
                            isActive
                              ? "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-300"
                              : "border-card-border bg-card/60 text-muted"
                          }`}
                        >
                          {regenerating && isActive ? (
                            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-fuchsia-400 border-t-transparent" />
                          ) : (
                            label
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-card-border bg-card/60 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-500/20 text-lg animate-pulse">
                🤖
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("session.highlights.loading")}</p>
                <p className="text-xs text-muted">{t("session.highlights.loadingHint")}</p>
              </div>
              {isCreator ? (
                <button
                  onClick={() => regenerateHighlights()}
                  disabled={regenerating}
                  className="min-h-9 rounded-lg bg-fuchsia-500/20 px-3 text-xs font-semibold text-fuchsia-300 transition active:scale-95 active:bg-fuchsia-500/30 disabled:opacity-50"
                >
                  {regenerating ? "..." : t("session.highlights.regenerate")}
                </button>
              ) : (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />
              )}
            </div>
          )}
        </>
      )}

      {storyOpen && highlights && (
        <HighlightsStory
          items={highlights.items}
          players={players}
          personaName={highlights.personaName}
          onClose={() => setStoryOpen(false)}
        />
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
                session.isLocked && sp.jackpotPaid && sp.jackpotPaid > 0
                  ? "border-yellow-400/60 ring-2 ring-yellow-400/20 bg-yellow-400/5"
                  : session.isLocked && rank === 0
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
                  <EloDisplay before={sp.eloBefore ?? sp.player.elo} after={sp.eloAfter} streakBonus={sp.streakBonus} jackpotPaid={sp.jackpotPaid} delay={animDelay + 400} t={t} />
                  {!session.isLocked && (() => {
                    const tier = getEloTier(sp.player.elo);
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-xs ${tier.colorClass}`}>
                          {tier.icon} {t(tier.key)}
                        </div>
                        {sp.player.jackpot > 0 && (
                          <div className="flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 px-1.5 py-0.5 text-[10px] font-black text-amber-400 shadow-[0_0_12px_-2px_rgba(251,191,36,0.3)] animate-pulse-glow">
                            <span className="text-[11px] drop-shadow-sm">💰</span>
                            <span className="tabular-nums">{sp.player.jackpot}</span>
                          </div>
                        )}
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
                        <div
                          className={`mt-1 flex flex-col gap-1 ${justLocked ? "animate-slide-in" : ""}`}
                          style={justLocked ? { animationDelay: `${animDelay + 800}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${afterTier.bgClass} ${afterTier.colorClass} ${afterTier.key === "rank.godlike" ? "rank-godlike-glow" : ""}`}>
                              {tierChanged && <span className="mr-0.5">{isRankUp ? "⬆" : "⬇"}</span>}
                              {afterTier.icon} {t(afterTier.key)}
                              {stars && (
                                <span className="ml-1 tracking-tight">
                                  <span className={afterTier.colorClass}>{stars.slice(0, divInfo.stars)}</span>
                                  <span className="opacity-25">{stars.slice(divInfo.stars)}</span>
                                </span>
                              )}
                            </span>
                            {tierChanged && (
                              <span className={`text-[10px] font-semibold ${afterTier.colorClass}`}>
                                {t(isRankUp ? "session.rankedUp" : "session.rankedDown")}
                              </span>
                            )}
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
              <button onClick={joinSession} className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast transition hover:bg-accent-strong active:scale-[0.98]">
                {t("session.joinSession")}
              </button>
              <p className="mt-1.5 text-center text-xs text-muted italic">{t("session.joinHype")}</p>
            </div>
          )}
          {canJoin && isCreator && (
            <div>
              <div className="flex gap-2">
                <button onClick={joinSession} className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast transition hover:bg-accent-strong active:scale-[0.98]">
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
            <>
              {/* MC persona picker — collapsed by default; expands to show all
                  personas. Default selection is "random" (null). */}
              {personas.length > 0 && (
                <div className="rounded-xl border border-card-border bg-card/60 p-3">
                  <button
                    type="button"
                    onClick={() => setShowPersonaPicker((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {t("session.mcPicker.label")}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                        {selectedPersonaId
                          ? (personas.find((p) => p.id === selectedPersonaId)?.displayName[locale] ??
                              personas.find((p) => p.id === selectedPersonaId)?.displayName.en ??
                              t("session.mcPicker.random"))
                          : t("session.mcPicker.random")}
                      </p>
                    </div>
                    <span className={`text-muted transition-transform ${showPersonaPicker ? "rotate-90" : ""}`}>
                      ›
                    </span>
                  </button>
                  {showPersonaPicker && (
                    <div className="mt-3 grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPersonaId(null)}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition active:scale-[0.98] ${
                          selectedPersonaId === null
                            ? "border-accent bg-accent/10"
                            : "border-card-border bg-background/40"
                        }`}
                      >
                        <span className="text-base leading-none">🎲</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {t("session.mcPicker.random")}
                          </p>
                          <p className="text-[11px] text-muted">
                            {t("session.mcPicker.randomHint")}
                          </p>
                        </div>
                      </button>
                      {personas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPersonaId(p.id)}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition active:scale-[0.98] ${
                            selectedPersonaId === p.id
                              ? "border-accent bg-accent/10"
                              : "border-card-border bg-background/40"
                          }`}
                        >
                          <span className="text-base leading-none">🎤</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {p.displayName[locale] ?? p.displayName.en}
                            </p>
                            <p className="line-clamp-2 text-[11px] italic text-muted">
                              &ldquo;{p.sample}&rdquo;
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={handleLockClick}
                  className={`w-full rounded-xl px-4 py-3 font-semibold transition active:scale-[0.98] ${
                    isValid && !locking
                      ? "bg-accent text-accent-contrast hover:bg-accent-strong"
                      : locking
                      ? "bg-slate-700 text-slate-400 cursor-wait"
                      : "bg-accent/60 text-accent-contrast/70 hover:bg-accent/70"
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
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default SessionContent;
