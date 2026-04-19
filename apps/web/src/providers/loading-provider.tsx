"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Scope = "global" | "local";

interface LoadingContextValue {
  isLoading: boolean;
  begin: (key: string, scope?: Scope) => void;
  end: (key: string) => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const keysRef = useRef<Map<string, Scope>>(new Map());
  const [globalCount, setGlobalCount] = useState(0);

  const begin = useCallback((key: string, scope: Scope = "global") => {
    if (keysRef.current.has(key)) return;
    keysRef.current.set(key, scope);
    if (scope === "global") setGlobalCount((c) => c + 1);
  }, []);

  const end = useCallback((key: string) => {
    const scope = keysRef.current.get(key);
    if (scope === undefined) return;
    keysRef.current.delete(key);
    if (scope === "global") setGlobalCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo<LoadingContextValue>(
    () => ({ isLoading: globalCount > 0, begin, end }),
    [globalCount, begin, end],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    return { isLoading: false, begin: () => {}, end: () => {} };
  }
  return ctx;
}
