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
  // Clerk's getToken identity changes on every render. Keeping it in the effect
  // deps would tear down + reopen the EventSource on every parent render, which
  // mints a new single-use ticket each time and quickly hits the rate limit.
  const getTokenRef = useRef(getToken);

  // Keep latest callbacks in refs so the SSE effect (mounted once) always
  // calls the freshest handler without re-subscribing on every render.
  /* eslint-disable react-hooks/refs */
  handlersRef.current = handlers;
  onResyncRef.current = onResync;
  getTokenRef.current = getToken;
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!enabled || !path) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let hasEverOpened = false;

    const scheduleRetry = () => {
      // Jittered backoff: 0.5s, 1s, 2s, 4s, max 8s.
      const base = Math.min(500 * 2 ** attempt, 8000);
      const delay = base * (0.7 + Math.random() * 0.6);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = async () => {
      if (cancelled) return;
      const ticket = await fetchSseTicket(() => getTokenRef.current());
      if (cancelled) return;
      if (!ticket) {
        // Ticket fetch failed (e.g. 429, transient network). Back off and retry
        // instead of bailing silently — otherwise one failure kills SSE forever.
        scheduleRetry();
        return;
      }

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
        hasEverOpened = true;
      };

      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        es = null;
        // Only resync on structural outages (3+ failed attempts ≈ 3.5s of downtime).
        // Transient blips auto-recover via EventSource reconnect; refetching then
        // just creates a stampede across N clients for no gain.
        if (hasEverOpened && attempt >= 3) {
          onResyncRef.current?.();
        }
        scheduleRetry();
      };
    };

    // Delay the initial connect so React StrictMode's synthetic
    // mount-unmount-mount cycle in dev doesn't burn two single-use tickets
    // per mount. The unmount cleanup runs first and flips `cancelled`, so the
    // first mount's connect() bails before issuing a ticket.
    const initialTimer = setTimeout(connect, 50);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [path, enabled]);
}
