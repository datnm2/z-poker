"use client";

import { useFlags } from "launchdarkly-react-client-sdk";

export function LaunchDarklyTestBanner() {
  const { physicalCardPlay } = useFlags();

  if (!process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID) return null;

  return physicalCardPlay ? (
    <div className="bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white">
      LaunchDarkly test banner (flag is on)
    </div>
  ) : (
    <div className="bg-slate-700 px-4 py-2 text-center text-sm text-slate-200">
      LaunchDarkly test banner (flag is off) ·{" "}
      <a
        href="https://app.launchdarkly.com/projects/default/flags/physical-card-play/targeting?env=test&selected-env=test"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        View flag
      </a>
    </div>
  );
}
