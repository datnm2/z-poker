"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { AuthGuard } from "@/components/auth-guard";
import type { Session, Player, SessionPlayer } from "@/types/database";

interface PlayerRow extends SessionPlayer {
  player: Player;
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

function ChipInput({ spId, playerId, myId, isCreator, confirmed, chipVal, placeholder, onChange, onFocus, onConfirm, onReEdit }: ChipInputProps) {
  const canEdit = isCreator || playerId === myId;
  if (!canEdit) return <div className="font-mono text-sm text-muted">{chipVal || "–"}</div>;

  if (confirmed) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-medium">{chipVal || "–"}</span>
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
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
        className="w-20 rounded-lg border border-card-border bg-slate-800 px-2 py-2 text-right font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
  const { player: me } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [localChips, setLocalChips] = useState<Record<string, string>>({});
  const focusedSpId = useRef<string | null>(null);
  const prevLockedRef = useRef<boolean>(false);
  const [justLocked, setJustLocked] = useState(false);
  const [confirmedSpIds, setConfirmedSpIds] = useState<Set<string>>(new Set());
  const [reEditingSpIds, setReEditingSpIds] = useState<Set<string>>(new Set());
  const [domainPlayers, setDomainPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [locking, setLocking] = useState(false);

  const fetchSession = useCallback(async () => {
    const { data: s } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (s) {
      setSession(s);
      if (!prevLockedRef.current && s.is_locked) {
        setJustLocked(true);
      }
      prevLockedRef.current = s.is_locked;
    }

    const { data: sp } = await supabase
      .from("session_players")
      .select("*, player:players(id, name, elo)")
      .eq("session_id", id)
      .order("chips_end", { ascending: false, nullsFirst: false });
    if (sp) {
      setPlayers(sp as PlayerRow[]);
      setLocalChips((prev) => {
        const next = { ...prev };
        for (const row of sp as PlayerRow[]) {
          if (row.id !== focusedSpId.current) {
            next[row.id] = row.chips_end != null ? String(row.chips_end) : "";
          } else if (!(row.id in next)) {
            next[row.id] = row.chips_end != null ? String(row.chips_end) : "";
          }
        }
        return next;
      });
      // Auto-confirm rows that already have chips_end saved in DB
      setConfirmedSpIds((prev) => {
        const next = new Set(prev);
        for (const row of sp as PlayerRow[]) {
          if (row.chips_end != null && row.id !== focusedSpId.current) next.add(row.id);
        }
        return next;
      });
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const channel = supabase
      .channel(`session_players:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_players", filter: `session_id=eq.${id}` }, () => fetchSession())
      .subscribe();
    // Also subscribe to session changes (for lock event)
    const sessionChannel = supabase
      .channel(`sessions:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` }, () => fetchSession())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [id, supabase, fetchSession]);

  const fetchDomainPlayers = async () => {
    if (!me?.domain) return;
    const { data } = await supabase.from("players").select("*").eq("domain", me.domain).order("name");
    if (data) setDomainPlayers(data);
  };

  const addPlayer = async (playerId: string) => {
    if (!session) return;
    await supabase.from("session_players").insert({
      session_id: session.id,
      player_id: playerId,
      elo_before: domainPlayers.find((p) => p.id === playerId)?.elo ?? 1200,
    });
    setShowAddModal(false);
    fetchSession();
  };

  const joinSession = async () => {
    if (!session || !me) return;
    await supabase.from("session_players").insert({
      session_id: session.id,
      player_id: me.id,
      elo_before: me.elo,
    });
    fetchSession();
  };

  const updateChips = async (spId: string, chips: number | null) => {
    await supabase.from("session_players").update({ chips_end: chips }).eq("id", spId);
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
    const { error } = await supabase.rpc("calculate_session_elo", { p_session_id: session.id });
    if (error) alert(error.message);
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

  const isCreator = session.created_by === me?.id;
  const isParticipant = players.some((p) => p.player_id === me?.id);
  const canJoin = !isParticipant && !session.is_locked && !!me;
  const expectedTotal = session.buy_in * players.length;
  const actualTotal = players.reduce((sum, p) => sum + (parseInt(localChips[p.id] ?? "", 10) || 0), 0);
  const allChipsEntered = players.length > 0 && players.every((p) => (localChips[p.id] ?? "").trim() !== "");
  const isValid = players.length >= 2 && allChipsEntered && actualTotal === expectedTotal;
  const existingPlayerIds = new Set(players.map((p) => p.player_id));

  // Sorted by chips_end desc for results view
  const resultPlayers = session.is_locked
    ? [...players].sort((a, b) => (b.chips_end ?? 0) - (a.chips_end ?? 0))
    : players;

  // Non-creator participant sees waiting banner once they've confirmed their own chips
  const myRow = players.find((p) => p.player_id === me?.id);
  const showWaiting = !session.is_locked && isParticipant && !isCreator &&
    myRow != null && confirmedSpIds.has(myRow.id) && !reEditingSpIds.has(myRow.id);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{t("session.title")}</h1>
          <p className="text-xs text-muted">{session.played_date} &middot; {t("session.buyIn")}: {session.buy_in}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${session.is_locked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
          {session.is_locked ? t("session.locked") : t("session.open")}
        </span>
      </div>

      {/* Waiting banner — non-creator once they've confirmed their chips */}
      {showWaiting && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent flex-shrink-0" />
          <p className="text-sm font-medium text-accent">{t("session.allChipsReady")}</p>
        </div>
      )}

      {/* Chip validation bar — visible to creator */}
      {!session.is_locked && isCreator && players.length > 0 && (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${allChipsEntered && isValid ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-card-border bg-card text-muted"}`}>
          {t("session.chips")}: {actualTotal} / {expectedTotal}
          {allChipsEntered && !isValid && (
            <span className="ml-2 text-red-400">({t("session.offBy")} {actualTotal - expectedTotal})</span>
          )}
        </div>
      )}

      {/* Results header when just locked */}
      {session.is_locked && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-accent">{t("session.results")}</p>
        </div>
      )}

      {/* Player list */}
      <div className="mt-4 space-y-2">
        {resultPlayers.map((sp, i) => {
          const rank = session.is_locked ? i : null;
          const animDelay = justLocked ? i * 120 : 0;
          return (
            <div
              key={sp.id}
              className={`rounded-xl border bg-card p-3 transition-all ${
                session.is_locked && justLocked ? "animate-slide-in" : ""
              } ${
                session.is_locked && rank === 0
                  ? "border-amber-400/50 animate-pulse-glow"
                  : "border-card-border"
              }`}
              style={justLocked ? { animationDelay: `${animDelay}ms`, opacity: 0, animationFillMode: "forwards" } : undefined}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                {session.is_locked && rank !== null && (
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
                  <div className="truncate font-medium">{sp.player.name}</div>
                  <EloDisplay before={sp.elo_before} after={sp.elo_after} delay={animDelay + 400} />
                </div>

                {session.is_locked ? (
                  <div
                    className="text-right animate-pop-in"
                    style={{ animationDelay: `${animDelay + 300}ms`, opacity: 0, animationFillMode: "forwards" }}
                  >
                    <div className="font-mono text-lg font-bold">{sp.chips_end}</div>
                    {sp.chips_end != null && (
                      <div className={`text-xs font-semibold ${sp.chips_end - session.buy_in >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {sp.chips_end - session.buy_in >= 0 ? "+" : ""}{sp.chips_end - session.buy_in}
                      </div>
                    )}
                  </div>
                ) : (
                  <ChipInput
                    spId={sp.id}
                    playerId={sp.player_id}
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

      {/* Actions */}
      {!session.is_locked && (
        <div className="mt-4 space-y-2">
          {canJoin && (
            <button onClick={joinSession} className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 active:scale-[0.98]">
              {t("session.joinSession")}
            </button>
          )}
          {isCreator && (
            <button
              onClick={() => { fetchDomainPlayers(); setShowAddModal(true); }}
              className="w-full rounded-xl border border-dashed border-card-border py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
            >
              {t("session.addPlayer")}
            </button>
          )}
          {isCreator && players.length >= 2 && (
            <button
              onClick={lockSession}
              disabled={!isValid || locking}
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {locking ? t("session.calculating") : t("session.lockCalculate")}
            </button>
          )}
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-card-border bg-card p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{t("session.addPlayerTitle")}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-foreground">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {domainPlayers.filter((p) => !existingPlayerIds.has(p.id)).map((p) => (
                <button key={p.id} onClick={() => addPlayer(p.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-slate-700">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="text-xs text-muted">{p.email}</div>
                  </div>
                  <div className="text-sm text-muted">{t("session.elo")} {p.elo}</div>
                </button>
              ))}
              {domainPlayers.filter((p) => !existingPlayerIds.has(p.id)).length === 0 && (
                <p className="py-4 text-center text-sm text-muted">{t("session.noMorePlayers")}</p>
              )}
            </div>
          </div>
        </div>
      )}
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
