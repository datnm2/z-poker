"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import type { Player } from "@/types/database";

interface AuthData {
  session: Session | null;
  player: Player | null;
  isLoading: boolean;
  isLoggedIn: boolean;
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
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const loadPlayer = useCallback(
    async (userId: string, email: string, name: string) => {
      try {
        const { data: existing } = await supabase
          .from("players")
          .select("*")
          .eq("id", userId)
          .single();

        if (existing) {
          setPlayer(existing);
          return;
        }

        const { data: created } = await supabase
          .from("players")
          .insert({ id: userId, email, name })
          .select()
          .single();

        if (created) setPlayer(created);
      } catch {
        // Player load failed — app will show as not logged in
      }
    },
    [supabase]
  );

  useEffect(() => {
    // Safety timeout — if auth never resolves, stop loading after 5s
    const timeout = setTimeout(() => setIsLoading(false), 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s?.user) {
        await loadPlayer(
          s.user.id,
          s.user.email!,
          s.user.user_metadata?.full_name || s.user.email!
        );
      } else {
        setPlayer(null);
      }
      if (event === "INITIAL_SESSION") {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase, loadPlayer]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPlayer(null);
  };

  const updatePlayerName = async (name: string) => {
    if (!player) return;
    const { data } = await supabase
      .from("players")
      .update({ name })
      .eq("id", player.id)
      .select()
      .single();
    if (data) setPlayer(data);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        player,
        isLoading,
        isLoggedIn: !!session && !!player,
        signInWithGoogle,
        signOut,
        updatePlayerName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
