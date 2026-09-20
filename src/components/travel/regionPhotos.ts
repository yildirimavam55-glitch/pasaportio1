/**
 * Central photo registry for coverage regions.
 *
 * Region key -> slug -> bundled image asset. Adding a new region only needs a
 * slug entry plus an image file with the same name in `src/assets/regions`.
 */
import type { Locale } from "@/domain/enums";
import type { CoverageRegionKey } from "@/domain/geo/coverage-regions";

const regionModules = import.meta.glob<string>("../../assets/regions/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const REGION_SLUGS: Record<CoverageRegionKey, string> = {
  GLOBAL: "global",
  EUROPE: "europe",
  ASIA: "asia",
  MIDDLE_EAST: "middle-east",
  AMERICAS: "americas",
  AFRICA: "africa",
  OCEANIA: "oceania",
  MULTI: "multi",
};

const REGION_ALT: Record<CoverageRegionKey, Record<Locale, string>> = {
  GLOBAL: {
    tr: "Global seyahat görünümü",
    de: "Weltweites Reisemotiv",
    en: "Global travel scene",
  },
  EUROPE: {
    tr: "Avrupa şehir görünümü",
    de: "Europäisches Stadtmotiv",
    en: "European city scene",
  },
  ASIA: { tr: "Asya şehir görünümü", de: "Asiatisches Stadtmotiv", en: "Asian city scene" },
  MIDDLE_EAST: {
    tr: "Orta Doğu seyahat görünümü",
    de: "Reisemotiv Naher Osten",
    en: "Middle East travel scene",
  },
  AMERICAS: {
    tr: "Amerika seyahat görünümü",
    de: "Reisemotiv Amerika",
    en: "Americas travel scene",
  },
  AFRICA: { tr: "Afrika seyahat görünümü", de: "Reisemotiv Afrika", en: "Africa travel scene" },
  OCEANIA: {
    tr: "Okyanusya seyahat görünümü",
    de: "Reisemotiv Ozeanien",
    en: "Oceania travel scene",
  },
  MULTI: {
    tr: "Çok ülkeli seyahat görünümü",
    de: "Reisemotiv mehrere Länder",
    en: "Multi-country travel scene",
  },
};

function bySlug(slug: string): string | undefined {
  const entry = Object.entries(regionModules).find(([path]) =>
    path.endsWith(`/${slug}.webp`),
  );
  return entry?.[1];
}

export type RegionPhoto = { url: string; alt: Record<Locale, string> };

export function getRegionPhoto(region: CoverageRegionKey): RegionPhoto | null {
  const slug = REGION_SLUGS[region];
  // Missing regions degrade to the global travel visual, never to an empty icon.
  const url = (slug && bySlug(slug)) ?? bySlug("global");
  if (!url) return null;
  return { url, alt: REGION_ALT[region] ?? REGION_ALT.GLOBAL };
}

export const regionPhotoSlugs = REGION_SLUGS;
