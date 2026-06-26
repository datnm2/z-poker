"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import { createApiClient, type ApiClient } from "@/lib/api";
import type { Player } from "@/types/database";

interface AuthData {
  session: { userId: string } | null;
  player: Player | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  api: ApiClient;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePlayerName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthData | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, userId, getToken, signOut: clerkSignOut } =
    useClerkAuth();
  const { user } = useUser();
  const clerk = useClerk();

  // Clerk's getToken identity changes on every render, which would invalidate
  // every consumer that memoizes on it (including `api` below + useSseStream).
  // Pin it through a ref so downstream memos stay stable for the session.
  const getTokenRef = useRef(getToken);
  // eslint-disable-next-line react-hooks/refs -- keep latest getToken without destabilizing memos
  getTokenRef.current = getToken;
  const getTokenStable = useCallback(async () => {
    if (!clerkLoaded) return null;
    return getTokenRef.current();
  }, [clerkLoaded]);

  const api = useMemo(
    // eslint-disable-next-line react-hooks/refs -- getTokenStable only reads the ref when invoked, not during render
    () => createApiClient(getTokenStable),
    [getTokenStable],
  );

  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);

  useEffect(() => {
    if (!clerkLoaded) return;
    if (!userId) {
      setPlayer(null);
      return;
    }
    let cancelled = false;
    setIsLoadingPlayer(true);
    // GET /players/me auto-upserts on the API side
    api
      .get<Player>("/players/me")
      .then((p) => {
        if (!cancelled) setPlayer(p);
      })
      .catch(() => {
        if (!cancelled) setPlayer(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPlayer(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, userId, api]);

  const signInWithGoogle = useCallback(async () => {
    await clerk.openSignIn({
      afterSignInUrl: "/",
      afterSignUpUrl: "/",
    });
  }, [clerk]);

  const signOut = useCallback(async () => {
    await clerkSignOut();
    setPlayer(null);
  }, [clerkSignOut]);

  const updatePlayerName = useCallback(
    async (name: string) => {
      const updated = await api.patch<Player>("/players/me", { name });
      setPlayer(updated);
    },
    [api],
  );

  const value: AuthData = {
    session: userId ? { userId } : null,
    player,
    isLoading: !clerkLoaded || isLoadingPlayer,
    isLoggedIn: !!userId,
    api,
    signInWithGoogle,
    signOut,
    updatePlayerName,
  };

  // `user` exposed via Clerk hook if callers need it later
  void user;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
