"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { ChipStackLeaderboard } from "@/components/chip-stack-leaderboard";
import { useSseStream, type SseHandlers } from "@/hooks/use-sse-stream";

const qKey = (d: string | Date) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-Q${Math.floor(x.getUTCMonth() / 3) + 1}`;
};

interface StackQuarter {
  year: number;
  quarter: number;
  netChips: number;
  netBuyIns: number;
  games: number;
  wins: number;
  losses: number;
  ties: number;
  bestGame: number;
  worstGame: number;
  startStack: number;
  endStack: number;
  peakStack: number;
}

interface StackPoint {
  sessionId: string;
  lockedAt: string;
  delta: number;
  stackAfter: number;
}

export interface PlayerStack {
  total: {
    chips: number;
    buyIns: number;
    games: number;
    wins: number;
    losses: number;
    ties: number;
    peak: number;
    trough: number;
    avgBuyIns: number;
    winRate: number;
    bestGame: number;
    worstGame: number;
    bestGameBuyIns: number;
    worstGameBuyIns: number;
  };
  rank: { byStack: number | null; byAvg: number | null; of: number };
  quarters: StackQuarter[];
  timeline: StackPoint[];
}

const fmt = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
const fmtBi = (n: number, d = 1) => `${n > 0 ? "+" : ""}${n.toFixed(d)}`;
const tone = (n: number) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-muted";

function useCountUp(target: number, ms = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      setValue(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function StackChart({ points }: { points: StackPoint[] }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const W = 296;
  const H = 96;
  const values = points.map((p) => p.stackAfter);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const y = (v: number) => 4 + (1 - (v - min) / range) * (H - 8);
  const x = (i: number) =>
    points.length === 1 ? W / 2 : (i / (points.length - 1)) * W + 2;
  const zeroY = y(0);
  const line = points.map((p, i) => `${x(i)},${y(p.stackAfter)}`).join(" ");
  const last = points[points.length - 1];
  const positive = last.stackAfter >= 0;
  const stroke = positive ? "#34d399" : "#f87171";
  const area =
    `M ${x(0)},${zeroY} ` +
    points.map((p, i) => `L ${x(i)},${y(p.stackAfter)}`).join(" ") +
    ` L ${x(points.length - 1)},${zeroY} Z`;

  const yearMarks: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (
      qKey(points[i].lockedAt) !== qKey(points[i - 1].lockedAt)
    ) {
      yearMarks.push(i);
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHover(points.length === 1 ? 0 : Math.round(ratio * (points.length - 1)));
  };

  const active = hover != null ? points[Math.min(hover, points.length - 1)] : null;
  const activeIdx = active ? points.indexOf(active) : -1;
  const px = (i: number) => (x(i) / (W + 4)) * 100;
  const py = (v: number) => (y(v) / H) * 100;
  const dotIdx = activeIdx >= 0 ? activeIdx : points.length - 1;
  const dot = points[dotIdx];
  const dotColor = dot.stackAfter >= 0 ? "#34d399" : "#f87171";

  return (
    <div
      className="relative h-28 w-full select-none"
      style={{ touchAction: "pan-y" }}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W + 4} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
      >
        <line x1="0" x2={W + 4} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
        {yearMarks.map((i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 3" />
        ))}
        {points.length > 1 && <path d={area} fill={stroke} fillOpacity="0.15" />}
        {points.length > 1 && (
          <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
        {active && (
          <line x1={x(activeIdx)} x2={x(activeIdx)} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
        style={{ left: `${px(dotIdx)}%`, top: `${py(dot.stackAfter)}%`, backgroundColor: dotColor }}
      />
      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-lg border border-card-border bg-background/95 px-2 py-1 text-[11px] shadow-lg"
          style={{
            left: `${Math.min(Math.max(px(activeIdx), 22), 78)}%`,
            top: `${Math.max(py(active.stackAfter) - 6, 18)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[10px] text-muted">
            #{activeIdx + 1} · {new Date(active.lockedAt).toLocaleDateString()}
          </div>
          <div className={`font-bold tabular-nums ${tone(active.stackAfter)}`}>
            {fmt(active.stackAfter)}
          </div>
          <div className={`tabular-nums ${tone(active.delta)}`}>
            {fmt(active.delta)} {t("stack.thisGame")}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChipStackCard({ playerId, initial }: { playerId: string; initial?: PlayerStack | null }) {
  const { t } = useI18n();
  const { api, isLoggedIn } = useAuth();
  const [data, setData] = useState<PlayerStack | null>(initial ?? null);
  const [loading, setLoading] = useState(initial === undefined);
  const [year, setYear] = useState<string>("all");
  const [lbOpen, setLbOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get<PlayerStack>(`/players/${playerId}/stack`));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [api, playerId]);

  useEffect(() => {
    if (initial === undefined) load();
  }, [load, initial]);

  const handlers = useMemo<SseHandlers>(
    () => ({
      "player.stack_updated": (e) => {
        if (e.playerIds.includes(playerId)) load();
      },
    }),
    [playerId, load],
  );
  useSseStream({
    path: isLoggedIn ? "/sessions/stream" : null,
    handlers,
    onResync: load,
    enabled: isLoggedIn,
  });

  const totalChips = useCountUp(data?.total.chips ?? 0);
  const currentQ = qKey(new Date());

  const points = useMemo(() => {
    if (!data) return [];
    return year === "all"
      ? data.timeline
      : data.timeline.filter((p) => qKey(p.lockedAt) === year);
  }, [data, year]);

  if (loading) {
    return <div className="mt-6 h-40 animate-pulse rounded-xl border border-card-border bg-card" />;
  }
  if (!data) return null;

  const maxAbs = Math.max(1, ...data.quarters.map((y) => Math.abs(y.netChips)));

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-muted">🪙 {t("stack.title")}</h2>
      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="text-[11px] text-muted">{t("stack.totalLabel")}</div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-black tabular-nums ${tone(data.total.chips)}`}>
            {fmt(totalChips)}
          </span>
          <span className="text-sm text-muted">{t("stack.chips")}</span>
        </div>
        <div className="text-xs text-muted tabular-nums">
          {data.total.games} {t("stack.games")}
        </div>
        <div className="mt-1 text-xs text-muted">
          {t(data.total.avgBuyIns > 0 ? "stack.avgWin" : data.total.avgBuyIns < 0 ? "stack.avgLoss" : "stack.avgEven")}{" "}
          <span className={`font-semibold tabular-nums ${tone(data.total.avgBuyIns)}`}>
            {Math.abs(data.total.avgBuyIns).toFixed(2)} buy-in
          </span>
        </div>

        {data.total.games > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { key: "rank", label: t("stack.rank"), value: data.rank.byStack ? `#${data.rank.byStack}` : "-", sub: data.rank.of ? `/ ${data.rank.of}` : "", cls: "text-accent" },
              { key: "best", label: t("stack.bestGame"), value: `${fmt(data.total.bestGame)} ${t("stack.chips")}`, sub: `${fmtBi(data.total.bestGameBuyIns, 2)} ${t("stack.buyIns")}`, cls: "text-emerald-400" },
            ].map((k) =>
              k.key === "rank" ? (
                <button
                  key={k.key}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setLbOpen(true)}
                  className="group relative min-h-11 cursor-pointer overflow-hidden rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/20 hover:shadow-[0_6px_20px_rgba(var(--accent-glow),0.35)] focus-visible:outline-2 focus-visible:outline-accent active:translate-y-0 active:scale-[0.97]"
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted transition-colors group-hover:text-foreground">
                    {k.label}
                  </div>
                  <div className={`text-lg font-bold tabular-nums ${k.cls}`}>
                    {k.value} <span className="text-[10px] font-normal text-muted">{k.sub}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-accent">
                    {t("stackLb.view")}
                    <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">›</span>
                  </div>
                </button>
              ) : (
              <div key={k.key} className="rounded-lg bg-white/5 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted">{k.label}</div>
                <div className={`text-lg font-bold tabular-nums ${k.cls}`}>{k.value}</div>
                {k.sub && <div className="text-[10px] text-muted tabular-nums">{k.sub}</div>}
              </div>
              ),
            )}
          </div>
        )}

        {data.timeline.length === 0 ? (
          <p className="mt-3 text-xs text-muted">{t("stack.empty")}</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["all", ...[...data.quarters].reverse().map((y) => `${y.year}-Q${y.quarter}`)]).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`min-h-8 rounded-full px-3 text-xs font-semibold transition active:scale-[0.97] ${
                    year === y ? "bg-accent text-white" : "bg-white/5 text-muted"
                  }`}
                >
                  {y === "all" ? t("stack.all") : y.replace("-", " ")}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <StackChart points={points} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold">
              <span className="text-emerald-400">📈 {t("stack.peak")} {fmt(data.total.peak)}</span>
              <span className="text-red-400">📉 {t("stack.low")} {fmt(data.total.trough)}</span>
            </div>
          </>
        )}
      </div>

      {lbOpen && <ChipStackLeaderboard currentPlayerId={playerId} onClose={() => setLbOpen(false)} />}

      {data.quarters.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 text-xs font-semibold text-muted">{t("stack.quarterly")}</h3>
          <div className="space-y-2">
            {data.quarters.map((y) => (
              <div key={`${y.year}-${y.quarter}`} className="rounded-xl border border-card-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{`Q${y.quarter} ${y.year}`}</span>
                    {`${y.year}-Q${y.quarter}` === currentQ && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {t("stack.qtd")}
                      </span>
                    )}
                  </div>
                  <div className={`text-sm font-bold tabular-nums ${tone(y.netChips)}`}>
                    {fmt(y.netChips)}
                  </div>
                </div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="flex w-1/2 justify-end">
                    {y.netChips < 0 && (
                      <div className="h-full bg-red-400" style={{ width: `${(Math.abs(y.netChips) / maxAbs) * 100}%` }} />
                    )}
                  </div>
                  <div className="w-1/2">
                    {y.netChips > 0 && (
                      <div className="h-full bg-emerald-400" style={{ width: `${(y.netChips / maxAbs) * 100}%` }} />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted tabular-nums">
                  <span>{y.games} {t("stack.games")} · {y.wins}W-{y.losses}L-{y.ties}T</span>
                  <span>{t("stack.best")} {fmt(y.bestGame)}</span>
                  <span>{t("stack.startEnd")} {y.startStack.toLocaleString()} → {y.endStack.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
