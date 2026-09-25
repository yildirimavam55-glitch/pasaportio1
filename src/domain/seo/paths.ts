import type { Locale } from "@/domain/enums";

export const SEO_BASE_URL = "https://wanderpath-engine.lovable.app";
export const SEO_LOCALES: Locale[] = ["tr", "de", "en"];

/** Localized guide folder: /tr/rehber, /de/ratgeber, /en/guides. */
export const GUIDE_FOLDER: Record<Locale, string> = { tr: "rehber", de: "ratgeber", en: "guides" };

export type SeoFamily = "esim" | "guide";

/** Destination (country) pages live under /{locale}/esim; everything else under the guide folder. */
export function familyOf(contentType: string): SeoFamily {
  return contentType === "DESTINATION" ? "esim" : "guide";
}

export function seoPath(locale: Locale, contentType: string, slug: string): string {
  return familyOf(contentType) === "esim"
    ? `/${locale}/esim/${slug}`
    : `/${locale}/${GUIDE_FOLDER[locale]}/${slug}`;
}

export function seoUrl(locale: Locale, contentType: string, slug: string): string {
  return `${SEO_BASE_URL}${seoPath(locale, contentType, slug)}`;
}

/** Localized homepage for each SEO language. */
export function localeHomePath(locale: Locale): string {
  return `/${locale}`;
}

/** Localized guide hub: /tr/rehber, /de/ratgeber, /en/guides. */
export function guideHubPath(locale: Locale): string {
  return `/${locale}/${GUIDE_FOLDER[locale]}`;
}

/**
 * Retired slugs → current slug, per locale and family. Used for direct
 * permanent redirects (old URL → final URL, never a chain).
 */
export const SEO_SLUG_ALIASES: Record<Locale, Partial<Record<SeoFamily, Record<string, string>>>> = {
  tr: { esim: { "turkiye-seyahat-rehberi": "turkiye" } },
  de: {},
  en: {},
};

export function resolveSlugAlias(locale: Locale, family: SeoFamily, slug: string): string | null {
  return SEO_SLUG_ALIASES[locale]?.[family]?.[slug] ?? null;
}
