import type { Locale } from "@/domain/enums";

/**
 * Central storefront locale registry. Add a language here (and its resources) — nothing else
 * should hardcode language lists. `content` is the locale whose translated resources are used
 * until the language has its own complete resources; `indexable` gates SEO (sitemap/hreflang).
 */
export const UI_LOCALES = [
  "tr", "en", "de", "fr", "es", "it", "pt", "nl", "pl", "ar", "ru", "ja", "ko", "zh",
] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export type LocaleInfo = {
  code: UiLocale;
  nativeName: string;
  bcp47: string;
  dir: "ltr" | "rtl";
  /** Resource locale currently used for customer copy. */
  content: Locale;
  /** Only indexable locales enter sitemap/hreflang and omit noindex. */
  indexable: boolean;
};

const info = (
  code: UiLocale, nativeName: string, bcp47: string, content: Locale,
  indexable = false, dir: "ltr" | "rtl" = "ltr",
): LocaleInfo => ({ code, nativeName, bcp47, dir, content, indexable });

export const LOCALE_REGISTRY: Record<UiLocale, LocaleInfo> = {
  tr: info("tr", "Türkçe", "tr-TR", "tr", true),
  en: info("en", "English", "en", "en", true),
  de: info("de", "Deutsch", "de-DE", "de", true),
  fr: info("fr", "Français", "fr", "en"),
  es: info("es", "Español", "es", "en"),
  it: info("it", "Italiano", "it", "en"),
  pt: info("pt", "Português", "pt", "en"),
  nl: info("nl", "Nederlands", "nl", "en"),
  pl: info("pl", "Polski", "pl", "en"),
  ar: info("ar", "العربية", "ar", "en", false, "rtl"),
  ru: info("ru", "Русский", "ru", "en"),
  ja: info("ja", "日本語", "ja", "en"),
  ko: info("ko", "한국어", "ko", "en"),
  zh: info("zh", "中文", "zh-Hans", "en"),
};

export const FALLBACK_UI_LOCALE: UiLocale = "en";
export const LOCALE_STORAGE_KEY = "tp.locale";

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

/** "pt-BR" → "pt", "zh_TW" → "zh", "sv-SE" → null. */
export function normalizeLanguageTag(tag: string | null | undefined): UiLocale | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().replace("_", "-").split("-")[0];
  return isUiLocale(base) ? base : null;
}

/** First supported entry of the browser's ordered preference list; never skips ahead to EN. */
export function detectFromLanguages(languages: readonly (string | null | undefined)[]): UiLocale | null {
  for (const tag of languages) {
    const hit = normalizeLanguageTag(tag);
    if (hit) return hit;
  }
  return null;
}

/** Priority: explicit URL → manual preference → device languages → EN. No geolocation. */
export function resolveLocale(input: {
  urlLocale?: string | null;
  stored?: string | null;
  navigatorLanguages?: readonly (string | null | undefined)[];
}): UiLocale {
  if (isUiLocale(input.urlLocale)) return input.urlLocale;
  if (isUiLocale(input.stored)) return input.stored;
  return detectFromLanguages(input.navigatorLanguages ?? []) ?? FALLBACK_UI_LOCALE;
}

/** Leading path segment locale, e.g. "/fr/..." → "fr". */
export function localeFromPath(pathname: string): UiLocale | null {
  const seg = pathname.split("/")[1];
  return isUiLocale(seg) ? seg : null;
}

/**
 * Inline pre-paint script: sets <html lang dir> using the same priority as resolveLocale,
 * so Arabic never paints LTR first. Kept dependency-free and in sync with the registry.
 */
export function localeBootScript(): string {
  const codes = JSON.stringify(UI_LOCALES);
  const rtl = JSON.stringify(UI_LOCALES.filter((c) => LOCALE_REGISTRY[c].dir === "rtl"));
  const tags = JSON.stringify(Object.fromEntries(UI_LOCALES.map((c) => [c, LOCALE_REGISTRY[c].bcp47])));
  return `(function(){try{var C=${codes},R=${rtl},T=${tags};var ok=function(x){return C.indexOf(x)>=0};var n=function(t){return t?String(t).toLowerCase().replace('_','-').split('-')[0]:''};var l=location.pathname.split('/')[1];if(!ok(l)){l=localStorage.getItem('${LOCALE_STORAGE_KEY}');if(!ok(l)){l='';var L=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];for(var i=0;i<L.length;i++){var b=n(L[i]);if(ok(b)){l=b;break}}if(!l)l='en'}}var d=document.documentElement;d.lang=T[l];d.dir=R.indexOf(l)>=0?'rtl':'ltr'}catch(e){}})();`;
}
