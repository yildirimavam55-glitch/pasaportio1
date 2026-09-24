/**
 * Simple per-content SEO checklist. Pure — shared by the admin editor and
 * the SEO dashboard so both always agree.
 */
export type SeoChecklistInput = {
  status: string;
  indexable: boolean;
  heroImageUrl: string;
  heroAlt: string;
  canonicalOverride: string;
  countryIsos: string[];
  relatedGuideIds: string[];
  countryIso: string;
  translation: {
    slug: string;
    title: string;
    h1: string;
    seoTitle: string;
    seoDescription: string;
    heroAlt: string;
  };
};

export type SeoCheckKey =
  | "seoTitle"
  | "description"
  | "h1"
  | "canonical"
  | "imageAlt"
  | "internalLinks"
  | "cta"
  | "structuredData"
  | "indexable";

export const SEO_CHECK_LABELS: Record<SeoCheckKey, string> = {
  seoTitle: "SEO title",
  description: "Description",
  h1: "H1",
  canonical: "Canonical",
  imageAlt: "Image ALT",
  internalLinks: "Internal links",
  cta: "CTA",
  structuredData: "Structured data",
  indexable: "Indexable",
};

export function seoChecklist(input: SeoChecklistInput): Record<SeoCheckKey, boolean> {
  const t = input.translation;
  const canonical = input.canonicalOverride.trim();
  const hasImage = Boolean(input.heroImageUrl.trim());
  return {
    seoTitle: t.seoTitle.trim().length >= 10 && t.seoTitle.trim().length <= 65,
    description: t.seoDescription.trim().length >= 50 && t.seoDescription.trim().length <= 170,
    h1: Boolean((t.h1 || t.title).trim()),
    canonical: canonical ? canonical.startsWith("https://") : Boolean(t.slug.trim()),
    imageAlt: !hasImage || Boolean((t.heroAlt || input.heroAlt).trim()),
    internalLinks: input.relatedGuideIds.length > 0 || Boolean(input.countryIso) || input.countryIsos.length > 0,
    cta: Boolean(input.countryIso) || input.countryIsos.length > 0,
    structuredData: Boolean(t.title.trim() && t.slug.trim()),
    indexable: input.indexable && input.status === "PUBLISHED",
  };
}
