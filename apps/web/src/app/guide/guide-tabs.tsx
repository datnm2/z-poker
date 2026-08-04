"use client";

import { useState } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { getStreakStyle } from "@/lib/ranks";
import type { TranslationKey } from "@/i18n/translations";
import { Disclosure, GuideCard } from "./guide-cards";
import { TierLadder } from "./tier-ladder";
import { EloExampleCard } from "./elo-example-card";

type TabId = "gameplay" | "elo" | "jackpot" | "poker101";

const TABS: { id: TabId; labelKey: TranslationKey }[] = [
  { id: "gameplay", labelKey: "guide.tab.gameplay" },
  { id: "elo", labelKey: "guide.tab.elo" },
  { id: "jackpot", labelKey: "guide.tab.jackpot" },
  { id: "poker101", labelKey: "guide.tab.poker101" },
];

type Item = { titleKey: TranslationKey; bodyKey: TranslationKey };

type Group = {
  titleKey: TranslationKey;
  introKey?: TranslationKey;
  items: Item[];
};

const GAMEPLAY_GROUPS: Group[] = [
  {
    titleKey: "guide.howToPlay.title",
    introKey: "guide.howToPlay.intro",
    items: ([1, 2, 3, 4] as const).map((n) => ({
      titleKey: `guide.howToPlay.step${n}.title` as const,
      bodyKey: `guide.howToPlay.step${n}.body` as const,
    })),
  },
  {
    titleKey: "guide.roles.title",
    introKey: "guide.roles.intro",
    items: (["player", "dealer", "gameMode"] as const).map((k) => ({
      titleKey: `guide.roles.${k}.title` as const,
      bodyKey: `guide.roles.${k}.body` as const,
    })),
  },
  {
    titleKey: "guide.bestPractices.title",
    items: ([1, 2, 3, 4] as const).map((n) => ({
      titleKey: `guide.bestPractices.item${n}.title` as const,
      bodyKey: `guide.bestPractices.item${n}.body` as const,
    })),
  },
];

const STRATEGY_GROUP: Group = {
  titleKey: "guide.strategy.title",
  introKey: "guide.strategy.intro",
  items: ([1, 2, 3, 4, 5] as const).map((n) => ({
    titleKey: `guide.strategy.chip${n}.title` as const,
    bodyKey: `guide.strategy.chip${n}.body` as const,
  })),
};

const POKER101_GROUP: Group = {
  titleKey: "guide.poker101.title",
  introKey: "guide.poker101.intro",
  items: ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) => ({
    titleKey: `guide.poker101.hand${n}.title` as const,
    bodyKey: `guide.poker101.hand${n}.body` as const,
  })),
};

const ELO_DETAIL_ITEMS: Item[] = (
  ["howWorks", "kfactor", "formula", "example"] as const
).map((k) => ({
  titleKey: `guide.elo.${k}.title` as const,
  bodyKey: `guide.elo.${k}.body` as const,
}));

function GroupSection({ group }: { group: Group }) {
  const { t } = useI18n();
  return (
    <section>
      <h2 className="text-lg font-bold text-accent">{t(group.titleKey)}</h2>
      {group.introKey && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t(group.introKey)}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {group.items.map((it) => (
          <GuideCard key={it.titleKey} titleKey={it.titleKey} bodyKey={it.bodyKey} />
        ))}
      </div>
    </section>
  );
}

function EloTab() {
  const { t } = useI18n();
  const { player } = useAuth();
  return (
    <>
      <section>
        <h2 className="text-lg font-bold text-accent">{t("guide.elo.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("guide.elo.intro")}
        </p>
        <div className="mt-4 space-y-3">
          <GuideCard
            titleKey="guide.elo.summary.title"
            bodyKey="guide.elo.summary.body"
          />
          <TierLadder currentElo={player?.elo} />
          <EloExampleCard />
          <GuideCard
            titleKey="guide.elo.starting.title"
            bodyKey="guide.elo.starting.body"
          />
          <GuideCard
            titleKey="guide.elo.streak.title"
            bodyKey="guide.elo.streak.body"
          />
          <GuideCard
            titleKey="guide.elo.seasonReset.title"
            bodyKey="guide.elo.seasonReset.body"
          />
          <Disclosure label={t("guide.elo.detailsToggle")}>
            {ELO_DETAIL_ITEMS.map((it) => (
              <GuideCard
                key={it.titleKey}
                titleKey={it.titleKey}
                bodyKey={it.bodyKey}
              />
            ))}
          </Disclosure>
        </div>
      </section>
      <GroupSection group={STRATEGY_GROUP} />
    </>
  );
}

const JACKPOT_CONDITIONS: TranslationKey[] = [
  "guide.jackpot.cond1",
  "guide.jackpot.cond2",
  "guide.jackpot.cond3",
];

function JackpotTab() {
  const { t } = useI18n();
  const { player } = useAuth();
  const streak = player ? getStreakStyle(player.currentStreak) : null;

  const flow: { it: Item; checklist?: boolean }[] = [
    {
      it: {
        titleKey: "guide.jackpot.accumulation.title",
        bodyKey: "guide.jackpot.accumulation.body",
      },
    },
    {
      it: {
        titleKey: "guide.jackpot.payout.title",
        bodyKey: "guide.jackpot.payout.body",
      },
      checklist: true,
    },
    {
      it: {
        titleKey: "guide.jackpot.reset.title",
        bodyKey: "guide.jackpot.reset.body",
      },
    },
  ];

  return (
    <section>
      <h2 className="text-lg font-bold text-accent">{t("guide.jackpot.title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t("guide.jackpot.intro")}
      </p>
      {player && player.jackpot > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <div className="animate-pulse-glow flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-yellow-500/20 px-4 py-1 text-xs font-black text-amber-400 shadow-[0_0_15px_-3px_rgba(251,191,36,0.4)]">
            <span className="text-sm">💰</span>
            <span className="uppercase tracking-wider">
              {t("guide.jackpot.yourPot")}:
            </span>
            <span className="text-sm tabular-nums">{player.jackpot}</span>
          </div>
          {streak && player.currentStreak < 0 && (
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${streak.classes}`}
            >
              {streak.label}
            </span>
          )}
        </div>
      )}
      <div className="mt-4 space-y-3">
        {flow.map(({ it, checklist }, i) => (
          <div
            key={it.titleKey}
            className="rounded-xl border border-card-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-mono text-xs font-bold text-amber-400">
                {i + 1}
              </span>
              <h3 className="font-semibold text-foreground">{t(it.titleKey)}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(it.bodyKey)}
            </p>
            {checklist && (
              <ul className="mt-3 space-y-1.5">
                {JACKPOT_CONDITIONS.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <svg
                      className="h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <Disclosure label={t("guide.jackpot.detailsToggle")}>
          <GuideCard
            titleKey="guide.jackpot.mitigation.title"
            bodyKey="guide.jackpot.mitigation.body"
          />
        </Disclosure>
      </div>
    </section>
  );
}

export function GuideTabs() {
  const { t } = useI18n();
  const [active, setActive] = useState<TabId>("gameplay");

  return (
    <div className="mt-6">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
        <div role="tablist" className="flex gap-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition active:scale-[0.97] ${
                active === tab.id
                  ? "bg-accent text-accent-contrast"
                  : "border border-card-border bg-card text-muted"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-8">
        {active === "gameplay" &&
          GAMEPLAY_GROUPS.map((g) => <GroupSection key={g.titleKey} group={g} />)}
        {active === "elo" && <EloTab />}
        {active === "jackpot" && <JackpotTab />}
        {active === "poker101" && <GroupSection group={POKER101_GROUP} />}
      </div>
    </div>
  );
}
