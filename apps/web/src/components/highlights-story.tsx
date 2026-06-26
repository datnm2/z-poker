"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/providers/i18n-provider";
import { PoweredByBadge } from "@/components/powered-by-badge";
import type { HighlightItem, SessionPlayerWithPlayer } from "@/types/database";

interface Props {
  items: HighlightItem[];
  players: SessionPlayerWithPlayer[];
  onClose: () => void;
  durationMs?: number;
  personaName?: { vi: string; en: string };
}

const PALETTES = [
  "from-amber-500 via-orange-500 to-rose-500",
  "from-fuchsia-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-rose-600 via-red-500 to-orange-500",
  "from-sky-500 via-blue-600 to-indigo-700",
];

export function HighlightsStory({ items, players, onClose, durationMs = 10000, personaName }: Props) {
  const { locale } = useI18n();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const accumRef = useRef<number>(0);
  const touchStartY = useRef<number | null>(null);

  const total = items.length;
  const current = items[index];
  const playerMeta = players.find((p) => p.playerId === current?.playerId);
  const palette = PALETTES[index % PALETTES.length];
  const title = current ? current.title[locale] ?? current.title.en : "";
  const body = current ? current.body[locale] ?? current.body.en : "";
  const stepLabel = personaName
    ? (personaName[locale] ?? personaName.en)
    : (locale === "vi" ? "MC kể chuyện" : "MC's take");

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe client-only flag
  useEffect(() => { setMounted(true); }, []);

  const next = useCallback(() => {
    setProgress(0);
    accumRef.current = 0;
    if (index + 1 >= total) onClose();
    else setIndex((i) => i + 1);
  }, [index, total, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    accumRef.current = 0;
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now();
    const base = accumRef.current;
    const tick = (now: number) => {
      const elapsed = base + (now - startRef.current);
      const pct = Math.min(elapsed / durationMs, 1);
      setProgress(pct);
      accumRef.current = elapsed;
      if (pct >= 1) {
        next();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, paused, durationMs, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (!current) return null;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) prev();
    else if (x > (rect.width * 2) / 3) next();
    else setPaused((p) => !p);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY > 80) onClose();
  };

  if (!mounted || typeof document === "undefined") return null;

  const eloDelta =
    playerMeta && playerMeta.eloAfter != null && playerMeta.eloBefore != null
      ? playerMeta.eloAfter - playerMeta.eloBefore
      : null;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={`relative flex h-full w-full max-w-md flex-col overflow-hidden bg-gradient-to-br ${palette} sm:my-auto sm:h-[95vh] sm:rounded-3xl sm:shadow-2xl`}
        onClick={handleTap}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-overlay [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:20px_20px]" />

        {paused && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50 backdrop-blur-md ring-2 ring-white/40">
              <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            </div>
          </div>
        )}

        {/* Progress bars */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
          {items.map((it, i) => {
            const scale = i < index ? 1 : i === index ? progress : 0;
            return (
              <div key={`${it.playerId}-${i}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full w-full origin-left bg-white will-change-transform"
                  style={{
                    transform: `scaleX(${scale})`,
                    WebkitTransform: `scaleX(${scale})`,
                    transition: "transform 75ms linear",
                    WebkitTransition: "-webkit-transform 75ms linear",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Header row: logo + step label + close */}
        <div className="relative z-20 flex items-center justify-between px-5 pb-2 pt-6 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-sm font-black text-white shadow-md shadow-fuchsia-900/40">
              Z
            </span>
            <span className="font-mono text-sm font-black text-white drop-shadow-sm">Z-Poker</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
              · {stepLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Powered-by badge — bottom-left corner on story */}
        <div
          className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),0.75rem)] left-4 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="pointer-events-auto">
            <PoweredByBadge size="sm" variant="onDark" />
          </span>
        </div>

        {/* Centered content: player → emoji → title → body */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-white">
          {/* Player badge - centered above emoji */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/20 px-5 py-3 shadow-lg shadow-black/30 ring-1 ring-white/40 backdrop-blur-md">
            {playerMeta?.player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playerMeta.player.avatarUrl}
                alt={current.playerName}
                className="h-12 w-12 rounded-full border-2 border-white shadow-md"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 text-base font-black text-white">
                {current.playerName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col text-left leading-snug">
              <span className="text-base font-black drop-shadow-sm">{current.playerName}</span>
              {eloDelta != null && playerMeta && (
                <span className="text-sm font-medium text-white/90">
                  Elo {playerMeta.eloBefore} → {playerMeta.eloAfter}
                  <span className={`ml-1 font-black ${eloDelta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                    ({eloDelta >= 0 ? "+" : ""}{eloDelta})
                  </span>
                </span>
              )}
            </div>
          </div>

          <div
            key={`emoji-${index}`}
            className="select-none text-[7rem] leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-pop-in sm:text-[9rem]"
          >
            {current.emoji}
          </div>
          <h2
            key={`title-${index}`}
            className="text-center text-3xl font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-slide-in sm:text-4xl"
          >
            {title}
          </h2>
          <p
            key={`body-${index}`}
            className="max-w-sm text-center text-[15px] leading-relaxed text-white/95 drop-shadow-sm sm:text-base animate-slide-in"
            style={{ animationDelay: "120ms", opacity: 0, animationFillMode: "forwards" }}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
