"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/providers/i18n-provider";

// Next reset = end of current quarter (Jun 30, Sep 30, Dec 31, Mar 31) at 23:59:59 local.
function nextResetAt(now: Date): Date {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0–11
  // Quarter ends: month index 2 (Mar 31), 5 (Jun 30), 8 (Sep 30), 11 (Dec 31).
  const quarterEndMonth = [2, 5, 8, 11].find((m) => m >= month) ?? 11;
  const endOfMonthDay = new Date(year, quarterEndMonth + 1, 0).getDate();
  const candidate = new Date(year, quarterEndMonth, endOfMonthDay, 23, 59, 59, 999);
  if (candidate.getTime() <= now.getTime()) {
    // We're past this quarter's end → wrap to next quarter (Mar 31 of next year).
    return new Date(year + 1, 2, 31, 23, 59, 59, 999);
  }
  return candidate;
}

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
    <p className="mt-4 text-center text-[11px] text-muted">
      {t("leaderboard.resetIn")}{" "}
      <span className="font-mono font-semibold text-accent tabular-nums">
        {parts.days}d {String(parts.hours).padStart(2, "0")}h{" "}
        {String(parts.minutes).padStart(2, "0")}m{" "}
        {String(parts.seconds).padStart(2, "0")}s
      </span>
      {t("leaderboard.resetInSuffix")}
    </p>
  );
}
