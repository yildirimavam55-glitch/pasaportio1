import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useRouterState } from "@tanstack/react-router";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/domain/enums";
import { messages, type MessageKey } from "./messages";
import { setActiveUiLocale } from "./overlay";
import {
  LOCALE_REGISTRY,
  LOCALE_STORAGE_KEY,
  UI_LOCALES,
  localeFromPath,
  resolveLocale,
  type UiLocale,
} from "./locales";

export * from "./locales";

type I18nValue = {
  /** Resource locale for customer copy (tr/de/en). */
  locale: Locale;
  /** Language the visitor chose / was detected (one of UI_LOCALES). */
  uiLocale: UiLocale;
  dir: "ltr" | "rtl";
  /** persist=false for URL-driven changes; manual switches persist as the explicit preference. */
  setLocale: (locale: UiLocale, opts?: { persist?: boolean }) => void;
  t: (key: MessageKey) => string;
  locales: readonly Locale[];
  uiLocales: readonly UiLocale[];
};

const I18nContext = createContext<I18nValue | null>(null);

const warned = new Set<string>();

export function I18nProvider({ children }: { children: ReactNode }) {
  // Explicit locale routes (/de, /en/…) render in their language from the first paint.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [uiLocale, setUiLocale] = useState<UiLocale>(() => localeFromPath(pathname) ?? DEFAULT_LOCALE);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* private mode */ }
    setUiLocale(resolveLocale({
      urlLocale: localeFromPath(window.location.pathname),
      stored,
      navigatorLanguages: navigator.languages?.length ? navigator.languages : [navigator.language],
    }));
    setResolved(true);
  }, []);

  const meta = LOCALE_REGISTRY[uiLocale];
  // Overlay must be active before children render; browser-only so SSR requests never share it.
  if (typeof window !== "undefined") setActiveUiLocale(uiLocale);

  useEffect(() => {
    const el = document.documentElement;
    el.lang = meta.bcp47;
    el.dir = meta.dir;
  }, [meta]);

  const setLocale = useCallback((next: UiLocale, opts?: { persist?: boolean }) => {
    setUiLocale(next);
    if (opts?.persist === false || typeof window === "undefined") return;
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = meta.content;
    return {
      locale,
      uiLocale,
      dir: meta.dir,
      setLocale,
      locales: LOCALES,
      uiLocales: UI_LOCALES,
      t: (key) => {
        const hit = messages[locale]?.[key] ?? messages.en[key] ?? messages[DEFAULT_LOCALE][key];
        if (hit === undefined && import.meta.env.DEV && !warned.has(key)) {
          warned.add(key);
          console.warn(`[i18n] missing key: ${key}`);
        }
        return hit ?? "";
      },
    };
  }, [meta, uiLocale, setLocale]);

  // Browser language/storage are unavailable to SSR. Never paint the fallback language while resolving them.
  // Overlay languages are also gated because their static resources activate in the browser, not a shared SSR global.
  const explicit = localeFromPath(pathname);
  const canRender = resolved || explicit === "tr" || explicit === "de" || explicit === "en";
  return <I18nContext.Provider value={value}>{canRender ? children : <div className="min-h-screen bg-background" aria-busy="true"><div className="mx-auto max-w-site px-4 pt-6"><div className="h-10 w-32 rounded-lg bg-muted" /><div className="mt-8 h-[32rem] rounded-lg bg-muted/50" /></div></div>}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
