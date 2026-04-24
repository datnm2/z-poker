"use client";

import { ReactNode } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { t } = useI18n();
  const { pullDistance, state, threshold, bind } = usePullToRefresh(onRefresh);

  const progress = Math.min(pullDistance / threshold, 1);
  const isActive = state !== "idle";
  const isRefreshing = state === "refreshing";
  const isReady = state === "ready";

  const label = isRefreshing
    ? t("ptr.refreshing")
    : isReady
      ? t("ptr.release")
      : t("ptr.pull");

  const offset = isRefreshing ? threshold : pullDistance;

  return (
    <div
      {...bind}
      style={{
        touchAction: isActive ? "pan-x" : undefined,
        paddingTop: isActive ? `${offset}px` : undefined,
        transition: isActive && !isRefreshing ? "none" : "padding-top 200ms ease-out",
      }}
      className="flex flex-1 flex-col"
    >
      <div
        aria-hidden={!isActive}
        className="pointer-events-none fixed left-1/2 top-16 z-40 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{
          opacity: isActive ? Math.max(progress, isRefreshing ? 1 : 0) : 0,
          marginTop: `${Math.max(offset - 40, -40)}px`,
          transition: isActive && !isRefreshing ? "none" : "opacity 200ms, margin-top 200ms",
        }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-card shadow-lg">
          {isRefreshing ? (
            <svg
              className="h-5 w-5 animate-spin text-accent"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-accent transition-transform duration-150"
              style={{ transform: `rotate(${isReady ? 180 : progress * 180}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14m0 0l-5-5m5 5l5-5"
              />
            </svg>
          )}
        </div>
        <span className="rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-medium text-muted">
          {label}
        </span>
      </div>

      {children}
    </div>
  );
}
