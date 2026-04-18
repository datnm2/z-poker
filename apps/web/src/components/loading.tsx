"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";

type LoadingProps = {
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
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

export function Loading({ size = "md", fullscreen, className = "" }: LoadingProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }, []);

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
          className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
        >
          <CardOrbit variant="full" />
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
