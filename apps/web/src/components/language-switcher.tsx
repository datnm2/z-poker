"use client";

import { useI18n } from "@/providers/i18n-provider";
import type { Locale } from "@/i18n/translations";

const labels: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const next: Locale = locale === "en" ? "vi" : "en";

  return (
    <button
      onClick={() => setLocale(next)}
      aria-label={`Switch language to ${labels[next]}`}
      title={`Switch to ${labels[next]}`}
      className="inline-flex h-8 min-w-[2.25rem] items-center justify-center rounded-lg border border-card-border bg-card px-2 text-[11px] font-semibold text-foreground transition active:scale-[0.95]"
    >
      {labels[locale]}
    </button>
  );
}
