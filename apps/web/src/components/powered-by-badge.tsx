"use client";

import { useI18n } from "@/providers/i18n-provider";
import { useLoading } from "@/providers/loading-provider";

type Size = "sm" | "md";
type Variant = "default" | "onDark";

function DatLightMark({ size }: { size: Size }) {
  const box = size === "sm" ? "h-[18px] w-[18px] rounded-[5px]" : "h-6 w-6 rounded-[7px]";
  const fontSize = size === "sm" ? 10 : 13;
  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden shadow-[0_0_10px_-2px_rgba(var(--accent-glow),0.55)] ${box}`}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 60%, #7e22ce 100%)",
        }}
        aria-hidden
      />
      <span
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)",
        }}
        aria-hidden
      />
      <span className="relative font-semibold leading-none text-white" style={{ fontSize, letterSpacing: "-0.02em" }}>
        D
      </span>
    </span>
  );
}

interface Props {
  size?: Size;
  variant?: Variant;
  hideLabel?: boolean;
  className?: string;
}

export function PoweredByBadge({ size = "md", variant = "default", hideLabel = false, className = "" }: Props) {
  const { t } = useI18n();
  const { isLoading } = useLoading();

  if (isLoading) return null;

  const sizing =
    size === "sm"
      ? "min-h-8 gap-1.5 px-2 py-1 text-[10px]"
      : "min-h-11 gap-2 px-3 py-1.5 text-[11px]";
  const arrow = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  const surface =
    variant === "onDark"
      ? "border-white/15 bg-white/10 hover:border-white/30 hover:bg-white/15"
      : "border-accent/20 bg-card/50 hover:border-accent/50 hover:bg-card/70";

  const poweredBy =
    variant === "onDark" ? "text-white/70 group-hover:text-white/90" : "text-muted/80 group-hover:text-muted";

  const brandGradient =
    variant === "onDark"
      ? "linear-gradient(90deg, #fce7f3 0%, #ffffff 45%, #f5d0fe 55%, #fce7f3 100%)"
      : "linear-gradient(90deg, var(--accent) 0%, var(--foreground) 45%, var(--accent-strong) 55%, var(--accent) 100%)";

  const arrowColor =
    variant === "onDark" ? "text-white/60 group-hover:text-white" : "text-muted/60 group-hover:text-accent";

  return (
    <a
      href="https://dat09vn.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("footer.visitSite")}
      className={`group relative inline-flex items-center overflow-hidden rounded-full border font-medium tracking-wide backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_24px_-4px_rgba(var(--accent-glow),0.55)] active:scale-[0.97] ${sizing} ${surface} ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(120% 180% at 0% 50%, rgba(var(--accent-glow), 0.18) 0%, transparent 60%)",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -inset-y-2 left-0 w-10 animate-badge-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent"
        aria-hidden
      />

      <DatLightMark size={size} />

      {!hideLabel && (
        <span className="relative flex items-baseline gap-1.5">
          <span className={`transition-colors ${poweredBy}`}>{t("footer.poweredBy")}</span>
          <span
            className="animate-shimmer-text bg-clip-text font-semibold text-transparent"
            style={{ backgroundImage: brandGradient }}
          >
            {t("footer.brand")}
          </span>
        </span>
      )}

      <svg
        className={`relative transition-all duration-300 group-hover:translate-x-0.5 ${arrow} ${arrowColor}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    </a>
  );
}
