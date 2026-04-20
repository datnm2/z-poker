import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { streamUrl, fetchSseTicket } from "@/lib/api";
import type { SessionEvent } from "@/types/events";

type Handler<T extends SessionEvent["type"]> = (
  data: Extract<SessionEvent, { type: T }>,
) => void;

export type SseHandlers = {
  [K in SessionEvent["type"]]?: Handler<K>;
};

interface Options {
  path: string | null;
  handlers: SseHandlers;
  onResync?: () => void;
  enabled?: boolean;
}

// Reconnect with fresh Clerk token + jittered backoff.
// EventSource's built-in reconnect reuses the original URL (stale token → 401 loop),
// so we tear down and rebuild with a newly minted token on every error.
export function useSseStream({ path, handlers, onResync, enabled = true }: Options) {
  const { getToken } = useClerkAuth();
  const handlersRef = useRef(handlers);
  const onResyncRef = useRef(onResync);

  handlersRef.current = handlers;
  onResyncRef.current = onResync;

  useEffect(() => {
    if (!enabled || !path) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = async () => {
      if (cancelled) return;
      const ticket = await fetchSseTicket(() => getToken());
      if (cancelled || !ticket) return;

      es = new EventSource(streamUrl(path, ticket));

      for (const type of Object.keys(handlersRef.current) as SessionEvent["type"][]) {
        es.addEventListener(type, (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as SessionEvent;
            if (data.type !== type) return;
            const handler = handlersRef.current[type] as Handler<typeof type> | undefined;
            handler?.(data as Extract<SessionEvent, { type: typeof type }>);
          } catch {
            /* noop */
          }
        });
      }

      es.onopen = () => {
        attempt = 0;
      };

      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        es = null;
        onResyncRef.current?.();
        // Jittered backoff: 0.5s, 1s, 2s, 4s, max 8s. Jitter ±30% to avoid thundering herd.
        const base = Math.min(500 * 2 ** attempt, 8000);
        const delay = base * (0.7 + Math.random() * 0.6);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [path, enabled, getToken]);
}
