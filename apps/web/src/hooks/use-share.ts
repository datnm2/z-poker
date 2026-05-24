"use client";

import { useCallback, useState } from "react";

export type ShareStatus = "idle" | "shared" | "copied" | "error";

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export function useShare(): {
  share: (data: ShareData) => Promise<void>;
  status: ShareStatus;
} {
  const [status, setStatus] = useState<ShareStatus>("idle");

  const share = useCallback(async (data: ShareData) => {
    const canShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    if (canShare) {
      try {
        await navigator.share(data);
        setStatus("shared");
        return;
      } catch (err) {
        // User cancelled the share sheet — silent, leave status idle
        if (err instanceof Error && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        // Fall through to clipboard fallback for any other error
      }
    }

    try {
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      setStatus("copied");
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2500);
    }
  }, []);

  return { share, status };
}
