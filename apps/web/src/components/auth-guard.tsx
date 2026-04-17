"use client";

import { useAuth } from "@/providers/auth-provider";
import { Loading } from "@/components/loading";
import { type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading || !isLoggedIn) {
    return <Loading fullscreen />;
  }

  return <>{children}</>;
}
