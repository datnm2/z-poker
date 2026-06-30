"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/providers/i18n-provider";
import { PoweredByBadge } from "@/components/powered-by-badge";
import type { RecapSlide, SeasonRecapDto } from "@/types/database";

interface Props {
  recap: SeasonRecapDto;
  onClose: () => void;
  durationMs?: number;
  initialPersonaId?: string;
}

const PALETTES = [
  "from-amber-500 via-orange-500 to-rose-500",
  "from-fuchsia-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-rose-600 via-red-500 to-orange-500",
  "from-sky-500 via-blue-600 to-indigo-700",
];

const MEDAL = ["🥇", "🥈", "🥉"];

// Maps a SeasonRecapDto into the ordered slide deck. Pure — no i18n provider
// needed here since slide copy is bilingual {vi, en} resolved at render time.
// Each slide has a stable `key`; when AI prose exists for that key
// (recap.prose.slides[key]) it overrides the hardcoded fallback body.
export function buildRecapSlides(recap: SeasonRecapDto): RecapSlide[] {
  const slides: RecapSlide[] = [];
  const { records } = recap;
  const proseSlides = recap.prose?.slides;

  const push = (slide: RecapSlide) => {
    const aiBody = proseSlides?.[slide.key];
    slides.push(aiBody ? { ...slide, body: aiBody } : slide);
  };

  push({
    key: "intro",
    emoji: "🏁",
    title: { vi: `Mùa ${recap.seasonKey}`, en: `Season ${recap.seasonKey}` },
    body: {
      vi: `${recap.totalGames} ván đã khoá trong mùa này. Cùng điểm lại những cái tên nổi bật nhé.`,
      en: `${recap.totalGames} sessions locked this season. Let's relive the highlights.`,
    },
  });

  if (recap.hardest.length) {
    push({
      key: "hardest",
      emoji: "🔥",
      title: { vi: "Cày khoẻ nhất", en: "Grind kings" },
      body: {
        vi: "Những người ngồi bàn nhiều nhất mùa này.",
        en: "Who showed up to the table the most.",
      },
      rows: recap.hardest.map((h, i) => ({
        name: h.playerName,
        avatarUrl: h.avatarUrl,
        rank: i + 1,
        value: `${h.games}/${recap.totalGames}`,
      })),
    });
  }

  if (recap.topWinrate.length) {
    push({
      key: "winrate",
      emoji: "🎯",
      title: { vi: "Tỉ lệ thắng cao nhất", en: "Top win rate" },
      body: {
        vi: "Ai về bờ thường xuyên nhất (tối thiểu 10 ván).",
        en: "Most consistent winners (min 10 games).",
      },
      rows: recap.topWinrate.map((w, i) => ({
        name: w.playerName,
        avatarUrl: w.avatarUrl,
        rank: i + 1,
        value: `${Math.round(w.pct * 100)}% · ${w.wins}/${w.games}`,
      })),
    });
  }

  if (records.chipRatio) {
    const r = records.chipRatio;
    push({
      key: "chipRatio",
      emoji: "💰",
      title: { vi: "Phi vụ để đời", en: "Biggest haul" },
      body: {
        vi: `${r.playerName} ôm về ${r.ratio.toFixed(1)}× tiền cược trong một ván.`,
        en: `${r.playerName} walked away with ${r.ratio.toFixed(1)}× the buy-in in a single session.`,
      },
    });
  }

  if (records.biggestEloGain) {
    const r = records.biggestEloGain;
    push({
      key: "biggestEloGain",
      emoji: "📈",
      title: { vi: "Cú nhảy ELO lớn nhất", en: "Biggest ELO jump" },
      body: {
        vi: `${r.playerName} +${r.gain} ELO chỉ trong một ván. Đỉnh!`,
        en: `${r.playerName} gained +${r.gain} ELO in one game. Insane.`,
      },
    });
  }

  if (records.biggestTable) {
    const r = records.biggestTable;
    push({
      key: "biggestTable",
      emoji: "🪑",
      title: { vi: "Bàn đông nhất", en: "Biggest table" },
      body: {
        vi: `${r.playerCount} người cùng ngồi một bàn (${r.playedDate}).`,
        en: `${r.playerCount} players crowded one table (${r.playedDate}).`,
      },
    });
  }

  if (records.longestWinStreak) {
    const r = records.longestWinStreak;
    push({
      key: "winStreak",
      emoji: "🚀",
      title: { vi: "Chuỗi thắng dài nhất", en: "Longest win streak" },
      body: {
        vi: `${r.playerName} thắng ${r.length} ván liên tiếp. Không cản nổi!`,
        en: `${r.playerName} won ${r.length} sessions in a row. Unstoppable.`,
      },
    });
  }

  if (records.longestLossStreak) {
    const r = records.longestLossStreak;
    push({
      key: "lossStreak",
      emoji: "🪦",
      title: { vi: "Chuỗi thua dài nhất", en: "Longest cold streak" },
      body: {
        vi: `${r.playerName} thua ${r.length} ván liên tiếp — kỷ lục buồn của mùa.`,
        en: `${r.playerName} dropped ${r.length} sessions straight — the season's coldest run.`,
      },
    });
  }

  // Retrospective outro: this season has ended and is being looked back on.
  // No "next season / reset to 1200" wording — that only fits the live reset moment.
  const champ = recap.hardest[0]?.playerName ?? recap.topWinrate[0]?.playerName;
  push({
    key: "outro",
    emoji: "🏆",
    title: { vi: `Mùa ${recap.seasonKey} khép lại`, en: `Season ${recap.seasonKey} wrapped` },
    body: {
      vi: champ
        ? `Mùa giải đã đi vào sử sách. ${champ} cùng mọi người vừa tạo nên những con số giờ đã thành huyền thoại.`
        : "Mùa giải đã đi vào sử sách — những con số trên giờ đã thành huyền thoại.",
      en: champ
        ? `That's a wrap. ${champ} and the crew turned these numbers into legend.`
        : "That's a wrap — the numbers above are now legend.",
    },
  });

  return slides;
}

export function SeasonRecapStory({ recap, onClose, durationMs = 7000, initialPersonaId }: Props) {
  const { locale } = useI18n();
  const activeRecap = useMemo(() => {
    if (initialPersonaId && recap.proseByPersona?.[initialPersonaId]) {
      return { ...recap, prose: recap.proseByPersona[initialPersonaId] };
    }
    return recap;
  }, [recap, initialPersonaId]);
  const items = useMemo(() => buildRecapSlides(activeRecap), [activeRecap]);
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
  const palette = PALETTES[index % PALETTES.length];
  const title = current ? current.title[locale] ?? current.title.en : "";
  const body = current ? current.body[locale] ?? current.body.en : "";
  const personaName = activeRecap.prose?.personaName
    ? (activeRecap.prose.personaName[locale] ?? activeRecap.prose.personaName.en)
    : null;
  const stepLabel = personaName ?? (locale === "vi" ? "Tổng kết mùa" : "Season recap");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe client-only flag
    setMounted(true);
  }, []);

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
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!current || !mounted || typeof document === "undefined") return null;

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
          {items.map((_, i) => {
            const scale = i < index ? 1 : i === index ? progress : 0;
            return (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
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

        {/* Header */}
        <div className="relative z-20 flex items-center justify-between px-5 pb-2 pt-3 text-white">
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
              onClick={(e) => {
                e.stopPropagation();
                setPaused((p) => !p);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Powered-by badge */}
        <div
          className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),0.75rem)] left-4 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="pointer-events-auto">
            <PoweredByBadge size="sm" variant="onDark" />
          </span>
        </div>

        {/* Centered content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-white">
          <div
            key={`emoji-${index}`}
            className="select-none text-[6rem] leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-pop-in sm:text-[8rem]"
          >
            {current.emoji}
          </div>
          <h2
            key={`title-${index}`}
            className="text-center text-3xl font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-slide-in sm:text-4xl"
          >
            {title}
          </h2>

          {current.rows && current.rows.length > 0 && (
            <div
              key={`rows-${index}`}
              className="flex w-full max-w-xs flex-col gap-2 animate-slide-in"
              style={{ animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" }}
            >
              {current.rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-white/20 px-4 py-2.5 shadow-lg shadow-black/20 ring-1 ring-white/30 backdrop-blur-md"
                >
                  <span className="w-6 flex-shrink-0 text-center text-lg">
                    {row.rank && row.rank <= 3 ? MEDAL[row.rank - 1] : row.rank}
                  </span>
                  {row.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatarUrl}
                      alt={row.name}
                      className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-white shadow"
                    />
                  ) : (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/30 text-xs font-black">
                      {row.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{row.name}</span>
                  <span className="flex-shrink-0 font-mono text-sm font-black tabular-nums">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

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
