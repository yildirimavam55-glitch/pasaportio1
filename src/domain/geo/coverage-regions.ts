/**
 * Generic coverage classification for multi-country eSIM products.
 *
 * No country is a special case: a product is bucketed by the regions of the
 * ISO codes it actually covers, exactly as the supplier catalogue reports them.
 */
import type { Locale } from "@/domain/enums";
import { getCountryByIso, type GeoRegion } from "./countries";
import { localize } from "@/i18n/overlay";

export type CoverageRegionKey =
  "GLOBAL" | "EUROPE" | "MIDDLE_EAST" | "ASIA" | "AMERICAS" | "AFRICA" | "OCEANIA" | "MULTI";

/** Configuration data, not business logic: which ISO codes are read as Middle East. */
const MIDDLE_EAST_ISOS = new Set([
  "AE",
  "BH",
  "IL",
  "IQ",
  "IR",
  "JO",
  "KW",
  "LB",
  "OM",
  "PS",
  "QA",
  "SA",
  "SY",
  "YE",
]);

export const GLOBAL_COVERAGE_THRESHOLD = 50;
const DOMINANT_SHARE = 0.6;

export const COVERAGE_REGION_ORDER: CoverageRegionKey[] = [
  "GLOBAL",
  "EUROPE",
  "ASIA",
  "MIDDLE_EAST",
  "AMERICAS",
  "AFRICA",
  "OCEANIA",
  "MULTI",
];

export const COVERAGE_REGION_LABELS: Record<CoverageRegionKey, Record<Locale, string>> = {
  GLOBAL: localize({ tr: "Global", de: "Global", en: "Global" }),
  EUROPE: localize({ tr: "Avrupa", de: "Europa", en: "Europe" }),
  MIDDLE_EAST: localize({ tr: "Orta Doğu", de: "Naher Osten", en: "Middle East" }),
  ASIA: localize({ tr: "Asya", de: "Asien", en: "Asia" }),
  AMERICAS: localize({ tr: "Amerika", de: "Amerika", en: "Americas" }),
  AFRICA: localize({ tr: "Afrika", de: "Afrika", en: "Africa" }),
  OCEANIA: localize({ tr: "Okyanusya", de: "Ozeanien", en: "Oceania" }),
  MULTI: localize({ tr: "Çoklu ülke", de: "Mehrere Länder", en: "Multi-country" }),
};

const REGION_KEY: Record<GeoRegion, CoverageRegionKey> = {
  EUROPE: "EUROPE",
  ASIA: "ASIA",
  AMERICAS: "AMERICAS",
  AFRICA: "AFRICA",
  OCEANIA: "OCEANIA",
};

/** Region bucket of a single country, using the same rule as coverage classification. */
export function regionOfCountry(iso: string): CoverageRegionKey {
  const code = iso.toUpperCase();
  if (MIDDLE_EAST_ISOS.has(code)) return "MIDDLE_EAST";
  const region = getCountryByIso(code)?.region;
  return region ? REGION_KEY[region] : "MULTI";
}

/** Returns the coverage bucket of a multi-country product, or null for local products. */
export function classifyCoverageRegion(coverageIsos: string[]): CoverageRegionKey | null {
  const isos = [...new Set(coverageIsos.map((iso) => iso.toUpperCase()).filter(Boolean))];
  if (isos.length < 2) return null;
  if (isos.length >= GLOBAL_COVERAGE_THRESHOLD) return "GLOBAL";

  const counts = new Map<CoverageRegionKey, number>();
  for (const iso of isos) {
    const key: CoverageRegionKey = MIDDLE_EAST_ISOS.has(iso) ? "MIDDLE_EAST" : regionOfCountry(iso);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: CoverageRegionKey = "MULTI";
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return bestCount / isos.length >= DOMINANT_SHARE ? best : "MULTI";
}
