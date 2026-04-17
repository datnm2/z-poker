"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useI18n } from "@/providers/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const { signInWithGoogle, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const valueProps = [
    { icon: "🏢", key: "login.valueDomain" as const },
    { icon: "📊", key: "login.valueRealtime" as const },
    { icon: "🏆", key: "login.valueTiers" as const },
  ];

  return (
    <div className="relative flex min-h-screen flex-col px-4">
      <div className="flex items-center justify-between pt-4">
        <Link href="/" className="text-xs text-muted hover:text-foreground">
          {t("login.backToLanding")}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-7 py-8 text-center">
          {/* Brand */}
          <div className="flex flex-col items-center">
            <div className="animate-pop-in text-5xl">🃏</div>
            <h1 className="mt-2 bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Z-Poker
            </h1>
            <p className="mt-2 text-sm text-muted">{t("login.tagline")}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              {t("landing.funPill")}
            </span>
          </div>

          {/* Value props */}
          <ul className="space-y-2 text-left">
            {valueProps.map((v, i) => (
              <li
                key={v.key}
                className="animate-slide-in flex items-center gap-3 rounded-xl border border-card-border bg-card/60 px-3 py-2.5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-base">
                  {v.icon}
                </span>
                <span className="text-sm text-foreground">{t(v.key)}</span>
              </li>
            ))}
          </ul>

          {/* Google button */}
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("login.signInGoogle")}
            </button>
            <p className="text-xs text-muted">{t("login.domainHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
