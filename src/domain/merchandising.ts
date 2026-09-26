import { LOCALES, type Locale } from "@/domain/enums";
import { localize } from "@/i18n/overlay";

/**
 * Merchandising content shared by destinations, airports, route presets and
 * campaigns. Canonical/provider data stays untouched — only marketing copy,
 * imagery and ordering live here.
 */

export type LocaleText = Record<Locale, string>;

export type MarketingContent = {
  title: LocaleText;
  description: LocaleText;
  cta: LocaleText;
  seoTitle: LocaleText;
  seoDescription: LocaleText;
};

const strip = (value: unknown, max: number) =>
  String(value ?? "").replace(/<[^>]*>/g, "").slice(0, max).trim();

export const emptyLocaleText = (): LocaleText => localize(({ tr: "", de: "", en: "" }));

export function sanitizeLocaleText(raw: unknown, max = 400): LocaleText {
  const out = emptyLocaleText();
  for (const locale of LOCALES) out[locale] = strip((raw as any)?.[locale], max);
  return out;
}

/** Never throws: anything unexpected degrades to empty copy. */
export function sanitizeMarketing(raw: unknown): MarketingContent {
  const value = (raw ?? {}) as any;
  return {
    title: sanitizeLocaleText(value.title, 160),
    description: sanitizeLocaleText(value.description, 900),
    cta: sanitizeLocaleText(value.cta, 60),
    seoTitle: sanitizeLocaleText(value.seoTitle, 160),
    seoDescription: sanitizeLocaleText(value.seoDescription, 300),
  };
}

export function marketingText(value: LocaleText | undefined, locale: Locale, fallback = ""): string {
  return (value?.[locale] || value?.tr || fallback).trim() || fallback;
}

/** Same-site links only — an admin route can never become a public target. */
export function safeHref(raw: unknown): string {
  const value = strip(raw, 160);
  if (value.startsWith("#")) return value;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/admin")) return "";
  return value;
}
