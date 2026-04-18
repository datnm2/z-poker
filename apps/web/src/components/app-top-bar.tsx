"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppTopBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
      {/* Logo */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-fuchsia-900/40">
          Z
        </span>
        <span className="font-mono text-sm font-bold tracking-tight text-foreground">
          Z-Poker
        </span>
      </div>

      {/* Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  );
}
