"use client";

import { useAuth } from "@/providers/auth-provider";
import { type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
