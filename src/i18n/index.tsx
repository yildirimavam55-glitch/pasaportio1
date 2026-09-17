import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/domain/enums";
import { messages, type MessageKey } from "./messages";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  locales: readonly Locale[];
};

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "tp.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      locales: LOCALES,
      t: (key) => messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
