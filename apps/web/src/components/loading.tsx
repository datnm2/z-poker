"use client";

import { useEffect, useId } from "react";
import type { CSSProperties } from "react";
import { useLoading } from "@/providers/loading-provider";
import { useI18n } from "@/providers/i18n-provider";

type LoadingProps = {
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
  /**
   * "global" (default) participates in the app-wide loading registry —
   * hides attribution UI (e.g. PoweredByBadge). Use "local" for small
   * inline/partial loaders that shouldn't affect the whole app.
   */
  scope?: "global" | "local";
};

const SIZE: Record<NonNullable<LoadingProps["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

const SUITS = [
  { char: "\u2660", name: "spade" },
  { char: "\u2665", name: "heart" },
  { char: "\u2663", name: "club" },
  { char: "\u2666", name: "diamond" },
] as const;

function CardOrbit({ variant }: { variant: "md" | "lg" | "full" }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`card-orbit-stage card-orbit--${variant}`}
    >
      <div className="card-orbit-ring">
        {SUITS.map((node, i) => {
          const style: CSSProperties = {
            animationDelay: `${(-i * 3.2) / 4}s`,
          };
          return (
            <div
              key={node.name}
              className={`pcard pcard--${node.name}`}
              style={style}
            >
              <span className="pcard-corner pcard-corner--tl">
                <span className="pcard-rank">A</span>
                <span className="pcard-mini">{node.char}</span>
              </span>
              <span className="pcard-suit">{node.char}</span>
              <span className="pcard-corner pcard-corner--br">
                <span className="pcard-rank">A</span>
                <span className="pcard-mini">{node.char}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonBackdrop() {
  return (
    <div aria-hidden className="skeleton-backdrop">
      <div className="skeleton-card">
        <div className="skeleton-bar skeleton-bar--title" />
        <div className="skeleton-bar skeleton-bar--sub" />
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line" />
        </div>
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line" />
        </div>
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line-short" />
        </div>
      </div>
      <div className="skeleton-card skeleton-card--compact">
        <div className="skeleton-bar skeleton-bar--line" />
        <div className="skeleton-bar skeleton-bar--line-short" />
      </div>
      <div className="skeleton-card">
        <div className="skeleton-bar skeleton-bar--title" />
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line" />
        </div>
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line" />
        </div>
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line-short" />
        </div>
        <div className="skeleton-row">
          <div className="skeleton-dot" />
          <div className="skeleton-bar skeleton-bar--line" />
        </div>
      </div>
      <div className="skeleton-card skeleton-card--compact">
        <div className="skeleton-bar skeleton-bar--line" />
        <div className="skeleton-bar skeleton-bar--line-short" />
      </div>
    </div>
  );
}

export function Loading({ size = "md", fullscreen, className = "", scope = "global" }: LoadingProps) {
  const { begin, end } = useLoading();
  const { t } = useI18n();
  const id = useId();

  useEffect(() => {
    begin(id, scope);
    return () => end(id);
  }, [begin, end, id, scope]);

  if (size === "sm") {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <div
          role="status"
          aria-label="Loading"
          className={`poker-chip animate-chip-spin ${SIZE.sm} ${className}`}
        />
      </div>
    );
  }

  if (fullscreen) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <SkeletonBackdrop />
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center px-6 ${className}`}
        >
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-card-border/60 bg-background/70 px-8 py-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <CardOrbit variant="full" />
            <p className="max-w-[14rem] text-center text-[13px] font-medium italic tracking-wide text-muted animate-pulse">
              &ldquo;{t("loading.quote")}&rdquo;
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <div className={className}>
        <CardOrbit variant={size} />
      </div>
    </div>
  );
}
