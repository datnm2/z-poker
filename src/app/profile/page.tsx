"use client";

import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { AuthGuard } from "@/components/auth-guard";
import { BottomNav } from "@/components/bottom-nav";
import { PlayerProfile } from "@/components/player-profile";
import { LanguageSwitcher } from "@/components/language-switcher";

function ProfileContent() {
  const { player, signOut, updatePlayerName } = useAuth();
  const { t } = useI18n();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);

  if (!player) return null;

  const startEdit = () => {
    setNameInput(player.name);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === player.name) { setEditingName(false); return; }
    setSaving(true);
    await updatePlayerName(trimmed);
    setSaving(false);
    setEditingName(false);
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>

      {/* Inline name editor */}
      <div className="mb-4 flex items-center gap-2">
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              placeholder={t("profile.namePlaceholder")}
              className="flex-1 rounded-lg border border-accent bg-slate-800 px-3 py-2 text-sm font-medium text-foreground focus:outline-none"
            />
            <button
              onClick={saveName}
              disabled={saving || !nameInput.trim()}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-slate-900 disabled:opacity-40 active:scale-95"
            >
              {saving ? "…" : t("profile.saveName")}
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="rounded-lg border border-card-border px-3 py-2 text-xs text-muted hover:text-foreground"
            >
              {t("cancel")}
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
            </svg>
            {t("profile.editName")}
          </button>
        )}
      </div>

      <PlayerProfile playerId={player.id} isOwnProfile />
      <button
        onClick={signOut}
        className="mt-6 w-full rounded-xl border border-red-500/30 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
      >
        {t("profile.signOut")}
      </button>
      <BottomNav />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
