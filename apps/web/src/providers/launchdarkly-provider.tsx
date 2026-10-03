"use client";

import { LDProvider } from "launchdarkly-react-client-sdk";

const clientSideID = process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID;

export function LaunchDarklyProvider({ children }: { children: React.ReactNode }) {
  if (!clientSideID) return <>{children}</>;
  return (
    <LDProvider
      clientSideID={clientSideID}
      context={{ kind: "user", key: "z-poker-anonymous", anonymous: true }}
      timeout={5}
    >
      {children}
    </LDProvider>
  );
}
