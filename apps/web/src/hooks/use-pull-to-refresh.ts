"use client";

import { useCallback, useRef, useState } from "react";

export type PtrState = "idle" | "pulling" | "ready" | "refreshing";

const THRESHOLD = 70;
const MAX_PULL = 120;
const DAMPING = 0.5;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [state, setState] = useState<PtrState>("idle");
  const startY = useRef<number | null>(null);
  const activeRef = useRef(false);
  const readyRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const capturedRef = useRef(false);

  const reset = useCallback(() => {
    startY.current = null;
    activeRef.current = false;
    readyRef.current = false;
    pointerIdRef.current = null;
    capturedRef.current = false;
    setPullDistance(0);
    setState("idle");
  }, []);

  const begin = useCallback((clientY: number) => {
    if (typeof window === "undefined") return;
    if (window.scrollY > 0) return;
    startY.current = clientY;
    activeRef.current = true;
    readyRef.current = false;
  }, []);

  const move = useCallback((clientY: number) => {
    if (!activeRef.current || startY.current == null) return;
    const delta = clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      setState("idle");
      return;
    }
    const damped = Math.min(delta * DAMPING, MAX_PULL);
    setPullDistance(damped);
    if (damped >= THRESHOLD) {
      if (!readyRef.current) {
        readyRef.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(10);
        }
      }
      setState("ready");
    } else {
      readyRef.current = false;
      setState("pulling");
    }
  }, []);

  const end = useCallback(async () => {
    if (!activeRef.current) {
      reset();
      return;
    }
    const wasReady = readyRef.current;
    activeRef.current = false;
    startY.current = null;
    pointerIdRef.current = null;
    if (!wasReady) {
      setPullDistance(0);
      setState("idle");
      readyRef.current = false;
      return;
    }
    setState("refreshing");
    setPullDistance(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      reset();
    }
  }, [onRefresh, reset]);

  // Touch handlers (mobile)
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) return;
      begin(e.touches[0].clientY);
    },
    [begin],
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) {
        activeRef.current = false;
        setPullDistance(0);
        setState("idle");
        return;
      }
      move(e.touches[0].clientY);
    },
    [move],
  );
  const onTouchEnd = useCallback(() => {
    void end();
  }, [end]);

  // Pointer handlers (desktop + DevTools mobile emulator using mouse)
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (typeof window === "undefined" || window.scrollY > 0) return;
      pointerIdRef.current = e.pointerId;
      capturedRef.current = false;
      begin(e.clientY);
    },
    [begin],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (!capturedRef.current && startY.current != null) {
        const delta = e.clientY - startY.current;
        if (delta > 8) {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
            capturedRef.current = true;
          } catch {}
        }
      }
      move(e.clientY);
    },
    [move],
  );
  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (capturedRef.current) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {}
      }
      void end();
    },
    [end],
  );
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      void end();
    },
    [end],
  );

  return {
    pullDistance,
    state,
    threshold: THRESHOLD,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
