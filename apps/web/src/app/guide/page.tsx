"use client";

import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { QuickStart } from "./quick-start";
import { GuideTabs } from "./guide-tabs";

export default function GuidePage() {
  const { t } = useI18n();
  const { isLoggedIn, signInWithGoogle } = useAuth();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-safe-nav pt-12">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-card-border bg-card/60 px-2.5 py-1 text-sm text-muted transition active:scale-95 active:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>{t("back")}</span>
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{t("guide.title")}</h1>

      {!isLoggedIn && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-sm text-muted">{t("guide.signInPrompt")}</p>
          <button
            onClick={signInWithGoogle}
            className="ml-4 shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:brightness-110"
          >
            {t("guide.signInBtn")}
          </button>
        </div>
      )}

      <QuickStart />
      <GuideTabs />

      <BottomNav />
    </div>
  );
}
