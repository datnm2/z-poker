"use client";

import { useI18n } from "@/providers/i18n-provider";
import type { Locale } from "@/i18n/translations";

const labels: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex h-8 items-center rounded-lg border border-card-border bg-card p-0.5">
      {(Object.keys(labels) as Locale[]).map((lng) => (
        <button
          key={lng}
          onClick={() => setLocale(lng)}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
            locale === lng
              ? "bg-accent text-accent-contrast"
              : "text-muted hover:text-foreground"
          }`}
        >
          {labels[lng]}
        </button>
      ))}
    </div>
  );
}
