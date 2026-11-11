"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";

interface Entry {
  id: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  chips: number;
  avgBuyIns: number;
  games: number;
  wins: number;
  losses: number;
}

type Metric = "chips" | "avg";

const fmt = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
const tone = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-slate-400";

const PODIUM = [
  { ring: "from-yellow-200 via-amber-400 to-yellow-600", chip: "bg-amber-400", text: "text-amber-300", medal: "🥇" },
  { ring: "from-slate-100 via-slate-300 to-slate-500", chip: "bg-slate-300", text: "text-slate-200", medal: "🥈" },
  { ring: "from-orange-300 via-orange-500 to-orange-800", chip: "bg-orange-500", text: "text-orange-300", medal: "🥉" },
];

function Avatar({ e, size }: { e: Entry; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-black text-white"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {e.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        e.name.trim().charAt(0).toUpperCase()
      )}
    </div>
  );
}

function ChipTower({ count, cls }: { count: number; cls: string }) {
  return (
    <div className="flex flex-col-reverse items-center">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`-mt-1.5 block h-3 w-12 rounded-full border-2 border-black/30 ${cls} shadow-md first:mt-0`}
          style={{
            animation: "lb-rise 0.4s ease-out both",
            animationDelay: `${i * 70}ms`,
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 6px, transparent 6px 12px)",
          }}
        />
      ))}
    </div>
  );
}

export function ChipStackLeaderboard({
  currentPlayerId,
  onClose,
}: {
  currentPlayerId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { api, player: me } = useAuth();
  const myId = me?.id ?? currentPlayerId;
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<Metric>("chips");
  const meRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [meVisible, setMeVisible] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get<Entry[]>("/stacks/leaderboard")
      .then((d) => alive && setRows(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [api]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const v = (e: Entry) => (metric === "chips" ? e.chips : e.avgBuyIns);
    return [...rows].sort((a, b) => v(b) - v(a) || b.games - a.games);
  }, [rows, metric]);

  const value = (e: Entry) => (metric === "chips" ? e.chips : e.avgBuyIns);
  const maxAbs = Math.max(1e-9, ...sorted.map((e) => Math.abs(value(e))));
  const label = (e: Entry) =>
    metric === "chips" ? fmt(e.chips) : `${e.avgBuyIns > 0 ? "+" : ""}${e.avgBuyIns.toFixed(2)}`;

  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const myIdx = sorted.findIndex((e) => e.id === myId);

  useEffect(() => {
    if (!rows) return;
    const el = meRef.current;
    const root = listRef.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([en]) => setMeVisible(en.isIntersecting), { root });
    io.observe(el);
    return () => io.disconnect();
  }, [rows, metric]);

  const podiumOrder = [1, 0, 2].filter((i) => top[i]);
  const heights = [5, 3, 2];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("stackLb.title")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-amber-400/30 text-white shadow-[0_0_60px_rgba(251,191,36,0.2)] sm:rounded-3xl"
        style={{
          animation: "lb-sheet 0.35s cubic-bezier(.2,.9,.3,1) both",
          background:
            "radial-gradient(ellipse at 50% -10%, rgba(251,191,36,.22), transparent 55%), radial-gradient(circle at 15% 100%, rgba(16,185,129,.18), transparent 50%), linear-gradient(180deg,#0b1220,#07101a)",
        }}
      >
        <div className="relative px-4 pb-3 pt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("stackLb.close")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg active:scale-90"
          >
            ✕
          </button>
          <h2
            className="bg-clip-text text-2xl font-black uppercase tracking-widest text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#fde68a,#f59e0b,#fde68a,#f59e0b)",
              backgroundSize: "200% 100%",
              animation: "lb-shine 4s linear infinite",
            }}
          >
            🏆 {t("stackLb.title")}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">{t("stackLb.subtitle")}</p>

          <div className="relative mx-auto mt-3 grid max-w-xs grid-cols-2 rounded-full border border-white/10 bg-black/40 p-1">
            <span
              className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_14px_rgba(251,191,36,.6)] transition-transform duration-300"
              style={{ transform: metric === "chips" ? "translateX(0)" : "translateX(100%)", left: 4 }}
            />
            {(["chips", "avg"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`relative z-10 min-h-9 text-xs font-bold transition-colors ${
                  metric === m ? "text-black" : "text-slate-300"
                }`}
              >
                {m === "chips" ? "🪙 " : "🎯 "}
                {t(m === "chips" ? "stackLb.byChips" : "stackLb.byAvg")}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {!rows && !error && (
            <div className="space-y-2 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )}
          {error && <p className="py-10 text-center text-sm text-red-400">{t("stackLb.error")}</p>}
          {rows && rows.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">{t("stackLb.empty")}</p>
          )}

          {top.length > 0 && (
            <div className="mb-3 flex items-end justify-center gap-2 pt-2">
              {podiumOrder.map((idx) => {
                const e = top[idx];
                const p = PODIUM[idx];
                const mine = e.id === myId;
                return (
                  <Link
                    key={e.id}
                    href={`/player/${e.id}`}
                    onClick={onClose}
                    className="flex w-[31%] flex-col items-center active:scale-95"
                    style={{ animation: "lb-rise 0.5s ease-out both", animationDelay: `${idx * 120}ms` }}
                  >
                    <span className="text-xl">{idx === 0 ? "👑" : p.medal}</span>
                    <div className={`rounded-full bg-gradient-to-br p-[3px] ${p.ring} ${mine ? "ring-2 ring-white" : ""}`}>
                      <Avatar e={e} size={idx === 0 ? 56 : 46} />
                    </div>
                    <div className="mt-1 w-full truncate text-center text-xs font-bold">{e.name}</div>
                    <div className={`text-sm font-black tabular-nums ${tone(value(e))}`}>{label(e)}</div>
                    <div className="mt-1">
                      <ChipTower count={heights[idx]} cls={p.chip} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            {rest.map((e, i) => {
              const rank = i + 4;
              const mine = e.id === myId;
              const v = value(e);
              const w = (Math.abs(v) / maxAbs) * 50;
              return (
                <div
                  key={e.id}
                  ref={mine ? meRef : undefined}
                  style={{ animation: "lb-rise 0.4s ease-out both", animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <Link
                    href={`/player/${e.id}`}
                    onClick={onClose}
                    className={`block rounded-xl border px-3 py-2 transition active:scale-[0.98] ${
                      mine
                        ? "border-amber-400/70 bg-amber-400/10 shadow-[0_0_16px_rgba(251,191,36,.25)]"
                        : "border-white/5 bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 text-center text-sm font-black tabular-nums text-slate-400">{rank}</span>
                      <Avatar e={e} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-bold">
                          {e.name}
                          {mine && (
                            <span className="rounded-full bg-amber-400 px-1.5 text-[9px] font-black uppercase text-black">
                              {t("stackLb.you")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] tabular-nums text-slate-400">
                          {e.games} {t("stack.games")} · {e.wins}W-{e.losses}L
                        </div>
                      </div>
                      <div className={`text-sm font-black tabular-nums ${tone(v)}`}>{label(e)}</div>
                    </div>
                    <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-white/5">
                      <div className="flex w-1/2 justify-end">
                        {v < 0 && <div className="h-full bg-red-400" style={{ width: `${w * 2}%` }} />}
                      </div>
                      <div className="w-1/2">
                        {v > 0 && <div className="h-full bg-emerald-400" style={{ width: `${w * 2}%` }} />}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {myIdx >= 0 && !meVisible && myIdx >= 3 && (
          <button
            type="button"
            onClick={() => meRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="flex items-center gap-2.5 border-t border-amber-400/40 bg-amber-400/15 px-4 py-2.5 text-left"
          >
            <span className="w-7 text-center text-sm font-black tabular-nums text-amber-300">{myIdx + 1}</span>
            <Avatar e={sorted[myIdx]} size={30} />
            <span className="flex-1 truncate text-sm font-bold">
              {sorted[myIdx].name} · {t("stackLb.you")}
            </span>
            <span className={`text-sm font-black tabular-nums ${tone(value(sorted[myIdx]))}`}>
              {label(sorted[myIdx])}
            </span>
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
