"use client";

import { useAuth } from "@/providers/auth-provider";
import { LandingContent } from "@/components/landing-content";
import { Loading } from "@/components/loading";

export default function Home() {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  return <LandingContent variant={isLoggedIn ? "authed" : "public"} />;
}
