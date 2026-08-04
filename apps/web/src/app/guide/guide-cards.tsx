"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/providers/i18n-provider";
import type { TranslationKey } from "@/i18n/translations";

export function GuideCard({
  titleKey,
  bodyKey,
}: {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <h3 className="font-semibold text-foreground">{t(titleKey)}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
    </div>
  );
}

export function Disclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-card-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
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
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}
