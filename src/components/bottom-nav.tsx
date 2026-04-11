"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import type { TranslationKey } from "@/i18n/translations";

const tabs: {
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}[] = [
  {
    href: "/",
    labelKey: "nav.leaderboard",
    requiresAuth: true,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4v11H3zM10 3h4v18h-4zM17 7h4v14h-4z" />
      </svg>
    ),
  },
  {
    href: "/guide",
    labelKey: "nav.guide",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/profile",
    labelKey: "nav.profile",
    requiresAuth: true,
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isLoggedIn } = useAuth();

  const visibleTabs = tabs.filter((tab) => !tab.requiresAuth || isLoggedIn);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-card-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg">
        {visibleTabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs transition ${
                isActive ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
