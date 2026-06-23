"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { nextResetAt } from "@/lib/season";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diffToParts(ms: number): Parts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function LeaderboardCountdown() {
  const { t } = useI18n();
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setParts(diffToParts(nextResetAt(now).getTime() - now.getTime()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!parts) return null;

  return (
    <Link
      href="/guide#guide-elo-title"
      className="mt-4 block text-center text-[11px] text-muted underline decoration-dotted decoration-muted/40 underline-offset-4 transition active:scale-[0.98] active:text-foreground"
      title={t("leaderboard.resetLearnMore")}
    >
      {t("leaderboard.resetIn")}{" "}
      <span className="font-mono font-semibold text-accent tabular-nums">
        {parts.days}d {String(parts.hours).padStart(2, "0")}h{" "}
        {String(parts.minutes).padStart(2, "0")}m{" "}
        {String(parts.seconds).padStart(2, "0")}s
      </span>
      {t("leaderboard.resetInSuffix")}{" "}
      <span className="text-accent/70">· {t("leaderboard.resetLearnMore")}</span>
    </Link>
  );
}
