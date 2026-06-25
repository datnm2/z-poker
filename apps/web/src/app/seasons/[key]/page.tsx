"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Loading } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { TopThreePodium } from "@/components/top-three-podium";
import { SeasonRecapStory } from "@/components/season-recap-story";
import { getEloTier } from "@/lib/ranks";
import { ApiError } from "@/lib/api";
import type { SeasonRecapDto, SeasonStandingsDto } from "@/types/database";
import type { Locale } from "@/i18n/translations";

function PersonaButtons({
  recapData,
  onSelect,
  locale,
}: {
  recapData: SeasonRecapDto | null;
  onSelect: (personaId: string) => void;
  locale: Locale;
}) {
  if (!recapData?.proseByPersona) {
    return (
      <button
        onClick={() => onSelect("default")}
        className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 text-sm font-bold text-white shadow-lg shadow-purple-900/40 ring-1 ring-white/20 transition hover:brightness-110 active:scale-[0.96]"
      >
        Xem highlight
      </button>
    );
  }
  const entries = Object.entries(recapData.proseByPersona);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {entries.map(([id, prose]) => {
        const label = prose.personaName
          ? (prose.personaName[locale] ?? prose.personaName.en ?? id)
          : id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="flex min-h-11 items-center justify-center rounded-full border border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/10 to-purple-600/10 px-4 text-sm font-semibold text-fuchsia-400 shadow-sm transition hover:border-fuchsia-400/70 hover:text-fuchsia-300 active:scale-[0.96]"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function SeasonDetailPage() {
  const { key } = useParams<{ key: string }>();
  const { api, player, isLoggedIn, isLoading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const [data, setData] = useState<SeasonStandingsDto | null>(null);
  const [recap, setRecap] = useState<SeasonRecapDto | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const fetchStandings = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<SeasonStandingsDto>(`/seasons/${key}/standings`);
      setData(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof ApiError ? err.status : undefined;
      setError({ message, status });
    } finally {
      setInitialized(true);
    }
  }, [api, key]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) fetchStandings();
  }, [authLoading, isLoggedIn, fetchStandings]);

  const [recapData, setRecapData] = useState<SeasonRecapDto | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);

  useEffect(() => {
    if (!data?.recapVisible) return;
    setRecapLoading(true);
    api.get<SeasonRecapDto>(`/seasons/recap?season=${key}`)
      .then(setRecapData)
      .catch(() => {})
      .finally(() => setRecapLoading(false));
  }, [api, key, data?.recapVisible]);

  const openPersona = useCallback((personaId: string) => {
    if (!recapData) return;
    setRecap(recapData);
    setActivePersonaId(personaId);
  }, [recapData]);

  if (authLoading || !initialized) return <Loading fullscreen />;
  if (error && !data) {
    return <ErrorState fullscreen message={error.message} status={error.status} onRetry={fetchStandings} />;
  }

  const rows = data?.rows ?? [];
  const podiumPlayers = rows.slice(0, 3).map((r) => ({
    id: r.playerId,
    name: r.playerName,
    elo: r.finalElo,
    avatarUrl: r.avatarUrl,
  }));
  const rest = rows.length >= 3 ? rows.slice(3) : rows;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-12">
      <div className="mb-4 flex items-center gap-3 pr-24">
        <Link
          href="/seasons"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-card/60 text-muted transition active:scale-95 active:bg-accent/10 active:text-foreground"
          aria-label={t("back")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-xl font-bold text-transparent">
          {t("seasons.detail.title").replace("{key}", key)}
        </h1>
      </div>

      {/* Season meta */}
      <p className="mb-3 text-center text-xs text-muted">
        {t("seasons.list.games").replace("{n}", String(data?.totalGames ?? 0))} ·{" "}
        {t("seasons.list.players").replace("{n}", String(rows.length))}
      </p>

      {data?.recapVisible && rows.length > 0 && (
        <div className="mb-5">
          <p className="mb-2.5 text-center text-xs font-semibold uppercase tracking-widest text-muted">
            {t("seasons.detail.chooseCommentator")}
          </p>
          {recapLoading ? (
            <div className="flex justify-center py-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : (
            <PersonaButtons
              recapData={recapData}
              onSelect={openPersona}
              locale={locale}
            />
          )}
        </div>
      )}

      {recap && activePersonaId && (
        <SeasonRecapStory
          recap={recap}
          initialPersonaId={activePersonaId}
          onClose={() => { setRecap(null); setActivePersonaId(null); }}
        />
      )}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{t("seasons.detail.empty")}</p>
      ) : (
        <>
          {podiumPlayers.length === 3 && (
            <TopThreePodium players={podiumPlayers} currentPlayerId={player?.id} />
          )}

          <div className="mt-6 space-y-2">
            {rest.map((r) => {
              const tier = getEloTier(r.finalElo);
              const isMe = player?.id === r.playerId;
              return (
                <Link
                  key={r.playerId}
                  href={`/player/${r.playerId}`}
                  className={`animate-slide-in flex min-h-[60px] items-center gap-3 rounded-xl border border-card-border bg-card p-3 transition-all duration-150 active:scale-[0.98] active:border-accent/20 ${
                    isMe ? "ring-2 ring-accent/70 ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  <span className="w-6 flex-shrink-0 text-center font-mono text-sm font-bold text-muted">
                    {r.finalRank}
                  </span>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-bold">
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      r.playerName.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{r.playerName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <span>{tier.icon}</span>
                      <span className="truncate">{t(tier.key)}</span>
                      <span className="text-muted/50">· {r.gamesPlayed} {t("seasons.detail.gamesShort")}</span>
                    </p>
                  </div>
                  <span className="flex-shrink-0 font-mono text-sm font-bold tabular-nums text-accent">
                    {r.finalElo}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
