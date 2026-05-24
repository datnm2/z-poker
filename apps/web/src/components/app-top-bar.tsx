"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAuth } from "@/providers/auth-provider";

const HIDE_THRESHOLD = 24;

export function AppTopBar() {
  const { isLoggedIn } = useAuth();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < HIDE_THRESHOLD) {
          setHidden(false);
        } else if (delta > 4) {
          setHidden(true);
        } else if (delta < -4) {
          setHidden(false);
        }
        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-3 pt-3 transition-transform duration-200 ease-out sm:px-4 sm:pt-4 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Logo */}
      <Link
        href={isLoggedIn ? "/home" : "/"}
        aria-label="Z-Poker home"
        className="pointer-events-auto flex items-center gap-1.5 transition-transform duration-150 active:scale-[0.97]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-fuchsia-900/40">
          Z
        </span>
        <span className="font-mono text-sm font-bold tracking-tight text-foreground">
          Z-Poker
        </span>
      </Link>

      {/* Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  );
}
