"use client";

import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import type { Player } from "@/types/database";
import { getEloTier, getDivisionInfo } from "@/lib/ranks";

type PodiumPlayer = Pick<Player, "id" | "name" | "elo" | "avatarUrl">;

function divisionStars(stars: number): string {
  if (stars <= 0) return "";
  return "★".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
}

const PODIUM_URL = `url("/images/winners-box.webp")`;
const MARK_URL = `url("/images/mark-winners-box.webp")`;

interface Tone {
  textColor: string;
  trophy: string;
  trophyShadow: string;
  avatarRing: string;
}

const TONES: Record<number, Tone> = {
  0: {
    textColor: "text-amber-300",
    trophy: "🏆",
    trophyShadow: "drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]",
    avatarRing: "ring-amber-300/80",
  },
  1: {
    textColor: "text-sky-200",
    trophy: "🏆",
    trophyShadow: "drop-shadow-[0_0_12px_rgba(186,230,253,0.95)]",
    avatarRing: "ring-sky-200",
  },
  2: {
    textColor: "text-orange-400",
    trophy: "🏆",
    trophyShadow: "drop-shadow-[0_0_10px_rgba(234,88,12,0.8)]",
    avatarRing: "ring-orange-400/80",
  },
};

interface Props {
  players: PodiumPlayer[];
  currentPlayerId?: string;
}

export function TopThreePodium({ players, currentPlayerId }: Props) {
  const { t } = useI18n();
  if (players.length < 3) return null;

  // Grid columns (left→right): #2, #1, #3 (classic 2-1-3 podium).
  // bottomPct = distance from the stage bottom to the top-face center of that
  // podium (as % of stage height). Avatar bottom aligns to that line.
  // bottomPct measured against the new shorter (1024/560) stage.
  const columns: Array<{ rank: number; bottomPct: number; avatarSize: number; tone: Tone }> = [
    { rank: 1, bottomPct: 53, avatarSize: 60, tone: TONES[1] }, // #2 silver — left
    { rank: 0, bottomPct: 60, avatarSize: 70, tone: TONES[0] }, // #1 gold — center, tallest
    { rank: 2, bottomPct: 51, avatarSize: 57, tone: TONES[2] }, // #3 bronze — right
  ];

  return (
    <div className="mt-6">
      {/* Stage container — shorter aspect ratio crops the empty top area of
          the image. The image is enlarged + shifted down via background-size/
          position so the podiums fill the visible box. */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1024 / 640" }}>
        {/* Layer 1 — podium image (the box itself) */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage: PODIUM_URL,
            backgroundSize: "100% auto",
            backgroundPosition: "center bottom",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Layer 2 — rotating conic-gradient masked by mark-winners-box.
            mark-winners-box is white only on the edges/highlights of the
            podiums, so when we mask a rotating gradient with it we get the
            "light traveling along the rims" effect Beincom uses. Slow speed
            keeps it classy. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            maskImage: MARK_URL,
            WebkitMaskImage: MARK_URL,
            maskSize: "100% auto",
            WebkitMaskSize: "100% auto",
            maskPosition: "center bottom",
            WebkitMaskPosition: "center bottom",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskMode: "luminance",
          }}
        >
          {/* 3 overlay gradients, one per medal color, masked by mark.
              Each is a mostly-transparent conic with one bright arc; they all
              rotate at the same speed but with phase offsets so silver/gold/
              bronze pulse in sequence around the podium edges. */}
          <div
            className="absolute inset-0 animate-podium-spin"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(226,232,240,0) 280deg, rgb(241,245,249) 330deg, rgb(226,232,240) 360deg)",
              filter: "blur(5px)",
              mixBlendMode: "screen",
              willChange: "transform",
            }}
          />
          <div
            className="absolute inset-0 animate-podium-spin"
            style={{
              background:
                "conic-gradient(from 120deg at 50% 50%, transparent 0deg, rgba(253,224,71,0) 280deg, rgb(253,224,71) 330deg, rgb(250,204,21) 360deg)",
              filter: "blur(5px)",
              mixBlendMode: "screen",
              willChange: "transform",
            }}
          />
          <div
            className="absolute inset-0 animate-podium-spin"
            style={{
              background:
                "conic-gradient(from 240deg at 50% 50%, transparent 0deg, rgba(253,186,116,0) 280deg, rgb(253,186,116) 330deg, rgb(251,146,60) 360deg)",
              filter: "blur(5px)",
              mixBlendMode: "screen",
              willChange: "transform",
            }}
          />
        </div>

        {/* Layer 3 — players (3-column grid, each cell self-centers its avatar).
            Avatar bottom-edge is anchored at bottomPct% from the stage bottom,
            so it appears to be standing on its podium's top-face. */}
        <div className="absolute inset-0 grid grid-cols-3">
          {columns.map(({ rank, bottomPct, avatarSize, tone }) => {
            const p = players[rank];
            if (!p) return null;
            const isMe = currentPlayerId === p.id;
            return (
              <div key={p.id} className="relative flex justify-center">
                <Link
                  href={`/player/${p.id}`}
                  className="absolute flex flex-col items-center animate-slide-in"
                  style={{
                    bottom: `${bottomPct}%`,
                    animationDelay: `${rank * 100}ms`,
                  }}
                >
                  <span
                    className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-800 ring-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.7)] ${tone.avatarRing} ${isMe ? "ring-4 ring-offset-2 ring-offset-background ring-accent/70" : ""}`}
                    style={{ width: avatarSize, height: avatarSize }}
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-bold text-slate-300 text-xl">
                        {(p.name?.[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Names + ELO row — pulled up so the text sits INSIDE the podium front-face.
          #1 (center) gets an extra lift because its podium is taller. */}
      <div className="relative z-10 grid grid-cols-3 -mt-[23%]">
        {columns.map(({ rank, tone }) => {
          const p = players[rank];
          if (!p) return null;
          const isMe = currentPlayerId === p.id;
          const liftClass = rank === 0 ? "-mt-[18%]" : "";
          const tier = getEloTier(p.elo);
          const div = getDivisionInfo(p.elo);
          const stars = divisionStars(div.stars);
          const showTrophy = rank === 0;
          return (
            <div key={p.id} className={`flex flex-col items-center text-center px-1 ${liftClass}`}>
              {showTrophy && (
                <span aria-hidden className={`mb-0.5 text-lg leading-none ${tone.trophyShadow}`}>
                  {tone.trophy}
                </span>
              )}
              <p className={`truncate text-xs font-semibold ${tone.textColor}`}>
                {p.name}
                {isMe && (
                  <span className="ml-1 inline-flex rounded-full border border-accent/50 bg-accent/15 px-1 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent">
                    {t("leaderboard.you")}
                  </span>
                )}
              </p>
              <p className={`mt-0.5 font-mono text-lg font-black tabular-nums leading-tight ${tone.textColor}`}>
                {p.elo}
              </p>
              <span
                className={`mt-0.5 inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ring-1 ring-inset ring-white/10 ${tier.bgClass} ${tier.colorClass}`}
              >
                <span aria-hidden>{tier.icon}</span>
                <span className="truncate">{t(tier.key)}</span>
                {stars && (
                  <span aria-hidden className="tracking-tight">
                    <span>{stars.slice(0, div.stars)}</span>
                    <span className="opacity-30">{stars.slice(div.stars)}</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
