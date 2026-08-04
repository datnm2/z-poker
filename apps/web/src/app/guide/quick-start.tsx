"use client";

import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import type { TranslationKey } from "@/i18n/translations";

const STEPS: { titleKey: TranslationKey; bodyKey: TranslationKey; icon: string }[] = [
  { titleKey: "guide.quickStart.step1.title", bodyKey: "guide.quickStart.step1.body", icon: "🎲" },
  { titleKey: "guide.quickStart.step2.title", bodyKey: "guide.quickStart.step2.body", icon: "🪑" },
  { titleKey: "guide.quickStart.step3.title", bodyKey: "guide.quickStart.step3.body", icon: "🃏" },
  { titleKey: "guide.quickStart.step4.title", bodyKey: "guide.quickStart.step4.body", icon: "🧮" },
  { titleKey: "guide.quickStart.step5.title", bodyKey: "guide.quickStart.step5.body", icon: "🔒" },
];

export function QuickStart() {
  const { t } = useI18n();
  const { isLoggedIn, player, signInWithGoogle } = useAuth();

  // Returning players have already caught up — collapse by default.
  const collapsed = isLoggedIn && (player?.gamesPlayed ?? 0) > 0;

  const body = (
    <>
      <ol className="mt-4">
        {STEPS.map((step, i) => (
          <li
            key={step.titleKey}
            className="animate-slide-in relative flex gap-3 pb-5 last:pb-2"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {i < STEPS.length - 1 && (
              <span
                className="absolute bottom-0 left-[21px] top-11 w-px bg-card-border"
                aria-hidden
              />
            )}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-bold text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <p className="font-semibold text-foreground">
                <span className="mr-1.5">{step.icon}</span>
                {t(step.titleKey)}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">
                {t(step.bodyKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {isLoggedIn ? (
        <Link
          href="/play"
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast transition active:scale-[0.98]"
        >
          {t("guide.quickStart.ctaPlay")}
        </Link>
      ) : (
        <button
          onClick={signInWithGoogle}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent font-semibold text-accent-contrast transition active:scale-[0.98]"
        >
          {t("guide.signInBtn")}
        </button>
      )}
    </>
  );

  if (collapsed) {
    return (
      <details className="group mt-4 rounded-2xl border border-card-border bg-card px-4 py-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 [&::-webkit-details-marker]:hidden">
          <h2 className="text-lg font-bold text-accent">
            ⚡ {t("guide.quickStart.title")}
          </h2>
          <svg
            className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="pb-3">{body}</div>
      </details>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-lg font-bold text-accent">
        ⚡ {t("guide.quickStart.title")}
      </h2>
      {body}
    </section>
  );
}
