"use client";

import { useI18n } from "@/providers/i18n-provider";
import { useLoading } from "@/providers/loading-provider";

const REPO_URL = "https://github.com/datnm2/z-poker";

type Size = "sm" | "md";
type Variant = "default" | "onDark";

interface Props {
  size?: Size;
  variant?: Variant;
  className?: string;
}

export function GithubStarButton({ size = "md", variant = "default", className = "" }: Props) {
  const { t } = useI18n();
  const { isLoading } = useLoading();

  if (isLoading) return null;

  const sizing =
    size === "sm"
      ? "min-h-8 gap-1.5 px-2 py-1 text-[10px]"
      : "min-h-11 gap-2 px-3 py-1.5 text-[11px]";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const surface =
    variant === "onDark"
      ? "border-white/15 bg-white/10 text-white/80 hover:border-white/30 hover:bg-white/15 hover:text-white"
      : "border-accent/20 bg-card/50 text-muted/90 hover:border-accent/50 hover:bg-card/70 hover:text-foreground";

  const star =
    variant === "onDark"
      ? "text-amber-300 group-hover:text-amber-200"
      : "text-amber-500 group-hover:text-amber-400";

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("footer.starOnGithub")}
      className={`group relative inline-flex items-center rounded-full border font-medium tracking-wide backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_24px_-4px_rgba(var(--accent-glow),0.55)] active:scale-[0.97] ${sizing} ${surface} ${className}`}
    >
      <svg className={icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 2.5-.34c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.79-4.58 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
      </svg>
      <span className="relative">{t("footer.starOnGithub")}</span>
      <svg
        className={`${icon} ${star} transition-colors`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="m12 2 2.9 6.26 6.85.62-5.17 4.53 1.54 6.7L12 16.9l-6.12 3.71 1.54-6.7L2.23 8.88l6.85-.62L12 2Z" />
      </svg>
    </a>
  );
}
