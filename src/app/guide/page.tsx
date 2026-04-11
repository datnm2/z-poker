"use client";

import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { TranslationKey } from "@/i18n/translations";

type Section = {
  titleKey: TranslationKey;
  items: { titleKey: TranslationKey; bodyKey: TranslationKey }[];
  introKey?: TranslationKey;
};

const sections: Section[] = [
  {
    titleKey: "guide.howToPlay.title",
    introKey: "guide.howToPlay.intro",
    items: [
      {
        titleKey: "guide.howToPlay.step1.title",
        bodyKey: "guide.howToPlay.step1.body",
      },
      {
        titleKey: "guide.howToPlay.step2.title",
        bodyKey: "guide.howToPlay.step2.body",
      },
      {
        titleKey: "guide.howToPlay.step3.title",
        bodyKey: "guide.howToPlay.step3.body",
      },
      {
        titleKey: "guide.howToPlay.step4.title",
        bodyKey: "guide.howToPlay.step4.body",
      },
    ],
  },
  {
    titleKey: "guide.bestPractices.title",
    items: [
      {
        titleKey: "guide.bestPractices.item1.title",
        bodyKey: "guide.bestPractices.item1.body",
      },
      {
        titleKey: "guide.bestPractices.item2.title",
        bodyKey: "guide.bestPractices.item2.body",
      },
      {
        titleKey: "guide.bestPractices.item3.title",
        bodyKey: "guide.bestPractices.item3.body",
      },
      {
        titleKey: "guide.bestPractices.item4.title",
        bodyKey: "guide.bestPractices.item4.body",
      },
    ],
  },
  {
    titleKey: "guide.elo.title",
    introKey: "guide.elo.intro",
    items: [
      { titleKey: "guide.elo.starting.title", bodyKey: "guide.elo.starting.body" },
      { titleKey: "guide.elo.howWorks.title", bodyKey: "guide.elo.howWorks.body" },
      { titleKey: "guide.elo.kfactor.title", bodyKey: "guide.elo.kfactor.body" },
      { titleKey: "guide.elo.formula.title", bodyKey: "guide.elo.formula.body" },
      { titleKey: "guide.elo.example.title", bodyKey: "guide.elo.example.body" },
    ],
  },
  {
    titleKey: "guide.strategy.title",
    introKey: "guide.strategy.intro",
    items: [
      { titleKey: "guide.strategy.chip1.title", bodyKey: "guide.strategy.chip1.body" },
      { titleKey: "guide.strategy.chip2.title", bodyKey: "guide.strategy.chip2.body" },
      { titleKey: "guide.strategy.chip3.title", bodyKey: "guide.strategy.chip3.body" },
      { titleKey: "guide.strategy.chip4.title", bodyKey: "guide.strategy.chip4.body" },
      { titleKey: "guide.strategy.chip5.title", bodyKey: "guide.strategy.chip5.body" },
    ],
  },
  {
    titleKey: "guide.poker101.title",
    introKey: "guide.poker101.intro",
    items: [
      { titleKey: "guide.poker101.hand1.title", bodyKey: "guide.poker101.hand1.body" },
      { titleKey: "guide.poker101.hand2.title", bodyKey: "guide.poker101.hand2.body" },
      { titleKey: "guide.poker101.hand3.title", bodyKey: "guide.poker101.hand3.body" },
      { titleKey: "guide.poker101.hand4.title", bodyKey: "guide.poker101.hand4.body" },
      { titleKey: "guide.poker101.hand5.title", bodyKey: "guide.poker101.hand5.body" },
      { titleKey: "guide.poker101.hand6.title", bodyKey: "guide.poker101.hand6.body" },
      { titleKey: "guide.poker101.hand7.title", bodyKey: "guide.poker101.hand7.body" },
      { titleKey: "guide.poker101.hand8.title", bodyKey: "guide.poker101.hand8.body" },
      { titleKey: "guide.poker101.hand9.title", bodyKey: "guide.poker101.hand9.body" },
      { titleKey: "guide.poker101.hand10.title", bodyKey: "guide.poker101.hand10.body" },
    ],
  },
];

function GuideContent() {
  const { t } = useI18n();
  const { isLoggedIn } = useAuth();

  const sectionIds = sections.map((s) =>
    s.titleKey.replace(/\./g, "-")
  );

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("guide.title")}</h1>
        <LanguageSwitcher />
      </div>

      {!isLoggedIn && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-sm text-muted">{t("guide.signInPrompt")}</p>
          <Link
            href="/login"
            className="ml-4 shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:brightness-110"
          >
            {t("guide.signInBtn")}
          </Link>
        </div>
      )}

      {/* TOC */}
      <nav className="mt-4 rounded-xl border border-card-border bg-card p-4">
        <ol className="space-y-1">
          {sections.map((section, i) => (
            <li key={section.titleKey}>
              <a
                href={`#${sectionIds[i]}`}
                className="flex items-center gap-2 text-sm text-muted hover:text-accent transition"
              >
                <span className="text-xs font-mono text-accent/60 w-5 shrink-0">{i + 1}.</span>
                {t(section.titleKey)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 space-y-8">
        {sections.map((section, i) => (
          <section key={section.titleKey} id={sectionIds[i]} className="scroll-mt-4">
            <h2 className="text-lg font-bold text-accent">
              {t(section.titleKey)}
            </h2>
            {section.introKey && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(section.introKey)}
              </p>
            )}
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.titleKey}
                  className="rounded-xl border border-card-border bg-card p-4"
                >
                  <h3 className="font-semibold text-foreground">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {t(item.bodyKey)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}

export default function GuidePage() {
  return <GuideContent />;
}
