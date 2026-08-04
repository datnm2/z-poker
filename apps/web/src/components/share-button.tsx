"use client";

import { useShare, type ShareData } from "@/hooks/use-share";
import { useI18n } from "@/providers/i18n-provider";

interface ShareButtonProps {
  data: ShareData;
  className?: string;
  ariaLabel?: string;
}

export function ShareButton({ data, className, ariaLabel }: ShareButtonProps) {
  const { share, status } = useShare();
  const { t } = useI18n();

  const label = ariaLabel ?? t("share.action");
  const tooltip =
    status === "copied"
      ? t("share.copied")
      : status === "shared"
      ? t("share.shared")
      : status === "error"
      ? t("share.error")
      : label;

  return (
    <button
      type="button"
      onClick={() => share(data)}
      aria-label={label}
      title={tooltip}
      className={
        className ??
        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-card-border bg-card/60 text-muted transition active:scale-95 active:bg-accent/10 active:text-accent"
      }
    >
      {status === "copied" || status === "shared" ? (
        <svg
          className="h-4.5 w-4.5 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      )}
    </button>
  );
}
