import type { Locale } from "@/domain/enums";

export const SEO_BASE_URL = "https://wanderlust-core.lovable.app";
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
