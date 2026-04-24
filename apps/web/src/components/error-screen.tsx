"use client";

import { useI18n } from "@/providers/i18n-provider";
import { ApiError } from "@/lib/api";

type ErrorScreenProps = {
  error: unknown;
  onRetry?: () => void;
  fullscreen?: boolean;
};

export function ErrorScreen({ error, onRetry, fullscreen }: ErrorScreenProps) {
  const { t } = useI18n();
  const isRateLimited = error instanceof ApiError && error.status === 429;
  const message = isRateLimited ? t("error.rateLimited") : t("error.generic");

  const content = (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-card-border bg-card/70 px-6 py-8 text-center">
      <div className="text-3xl">{isRateLimited ? "🐢" : "⚠️"}</div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("error.title")}</h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-contrast transition active:scale-95"
        >
          {t("error.retry")}
        </button>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        {content}
      </div>
    );
  }

  return <div className="px-4 py-8">{content}</div>;
}
