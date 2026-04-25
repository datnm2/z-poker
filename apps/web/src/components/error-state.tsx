"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";

type ErrorStateProps = {
  message?: string | null;
  status?: number;
  onRetry?: () => void;
  fullscreen?: boolean;
};

export function ErrorState({ message, status, onRetry, fullscreen }: ErrorStateProps) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const router = useRouter();
  const isUnauthorized = status === 401;

  const handleLogin = async () => {
    await signOut();
    router.push("/login");
  };

  const content = (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-card-border bg-card px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-2xl">
        {isUnauthorized ? "🔒" : "⚠️"}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {isUnauthorized ? t("error.unauthorized") : t("error.loadFailed")}
        </p>
        <p className="text-xs text-muted">
          {message ?? (isUnauthorized ? t("error.unauthorizedHint") : t("error.loadFailedHint"))}
        </p>
      </div>
      {isUnauthorized ? (
        <button
          onClick={handleLogin}
          className="min-h-11 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-all duration-150 active:scale-[0.97]"
        >
          {t("error.goToLogin")}
        </button>
      ) : (
        onRetry && (
          <button
            onClick={onRetry}
            className="min-h-11 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-all duration-150 active:scale-[0.97]"
          >
            {t("error.retry")}
          </button>
        )
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        {content}
      </div>
    );
  }

  return <div className="flex justify-center px-4 py-8">{content}</div>;
}
