"use client";

import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { PlayerProfile } from "@/components/player-profile";
import { useI18n } from "@/providers/i18n-provider";

function PlayerContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("back")}
      </button>
      <PlayerProfile playerId={id} />
    </div>
  );
}

export default function PlayerPage() {
  return (
    <AuthGuard>
      <PlayerContent />
    </AuthGuard>
  );
}
