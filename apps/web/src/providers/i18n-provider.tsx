"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Locale,
  type TranslationKey,
} from "@/i18n/translations";

type TranslationValue<K extends TranslationKey> = (typeof translations)["en"][K];

export type TFunction = <K extends TranslationKey>(
  key: K,
) => TranslationValue<K> extends string ? string : TranslationValue<K>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "z-poker-locale";

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in translations) return stored;
  } catch {}
  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("vi")) return "vi";
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const detected = detectInitialLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- locale only detectable post-hydration
    if (detected !== "en") setLocaleState(detected);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const t = (<K extends TranslationKey>(key: K) => {
    return (translations[locale][key] ?? translations.en[key] ?? key) as never;
  }) as I18nContextValue["t"];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
