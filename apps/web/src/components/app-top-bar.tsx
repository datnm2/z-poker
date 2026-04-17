"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppTopBar() {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-40 flex items-center gap-2 sm:right-4 sm:top-4">
      <div className="pointer-events-auto">
        <ThemeSwitcher />
      </div>
      <div className="pointer-events-auto">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
