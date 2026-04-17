"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";

interface HistoryItem {
  id: string;
  playedDate: string;
  buyIn: number;
  lockedAt: string;
  playerCount: number;
  dealer: {
    playerId: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  winner: {
    playerId: string;
    name: string;
    avatarUrl: string | null;
    chipDelta: number;
  } | null;
}

interface HistoryPage {
  data: HistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SessionsHistoryPage() {
  const { api, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: "10" });
    if (cursor) params.set("cursor", cursor);
    try {
      const json = await api.get<HistoryPage>(`/sessions/history?${params.toString()}`);
      setItems((prev) => [...prev, ...json.data]);
      setCursor(json.nextCursor);
      setHasMore(json.hasMore);
    } finally {
      setLoading(false);
      setInitialized(true);
      loadingRef.current = false;
    }
  }, [api, cursor, hasMore]);

  useEffect(() => {
    if (!authLoading && isLoggedIn && !initialized && !loadingRef.current) {
      loadMore();
    }
  }, [authLoading, isLoggedIn, initialized, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (authLoading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-16">
      <div className="mb-4 flex items-center gap-3 pr-24">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-card/60 text-muted transition active:scale-95 active:bg-accent/10 active:text-foreground"
          aria-label={t("back")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-xl font-bold text-transparent">
          {t("sessions.history.title")}
        </h1>
      </div>

      {initialized && items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          {t("sessions.history.empty")}
        </p>
      )}

      <div className="space-y-2">
        {items.map((s) => (
          <Link
            key={s.id}
            href={`/session/${s.id}`}
            className="animate-slide-in block rounded-xl border border-card-border bg-card p-3 transition-all duration-150 active:scale-[0.98] active:border-accent/40"
          >
            {/* Header: dealer + date/time + chevron */}
            <div className="flex items-center gap-2">
              {s.dealer && (
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-[10px] font-bold text-slate-300 ring-1 ring-card-border">
                  {s.dealer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.dealer.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    s.dealer.name.slice(0, 1).toUpperCase()
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                {s.dealer ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted">🎰 {t("sessions.history.dealer")}</span>
                    <span className="truncate font-medium text-foreground">{s.dealer.name}</span>
                  </div>
                ) : null}
                <div className="text-xs text-muted">{formatDate(s.lockedAt, locale)}</div>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Meta: buy-in + player count */}
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <span>💰 {t("sessions.history.buyIn")}</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">{s.buyIn}</span>
              <span>•</span>
              <span>
                {s.playerCount} {t("sessions.history.players")}
              </span>
            </div>

            {/* Winner */}
            {s.winner && (
              <div className="mt-2 flex items-center gap-2 border-t border-card-border/60 pt-2">
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-400/30">
                  🏆 {t("sessions.history.topWinner")}
                </span>
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-400 ring-1 ring-amber-400/40">
                  {s.winner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.winner.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    s.winner.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {s.winner.name}
                </span>
                <span className="ml-auto flex flex-shrink-0 items-baseline gap-1 font-mono text-sm font-semibold tabular-nums text-emerald-400">
                  +{s.winner.chipDelta}
                  <span className="text-[10px] font-normal opacity-70">{t("sessions.history.chips")}</span>
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="h-8" />
      {loading && (
        <div className="py-3 text-center text-xs text-muted">
          {t("sessions.history.loading")}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
