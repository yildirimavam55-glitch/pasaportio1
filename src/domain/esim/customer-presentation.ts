import type { Locale } from "@/domain/enums";
import { classifyCoverageRegion, COVERAGE_REGION_LABELS } from "@/domain/geo/coverage-regions";
import { getCountryByIso } from "@/domain/geo/countries";
import { resolvePackageScope } from "@/domain/esim/package-scope";
import type { RegionFamily } from "@/domain/esim/supplier-metadata";
import { localize } from "@/i18n/overlay";

/**
 * Restores commercial whole-GB bundle sizes that were previously converted
 * from decimal provider MB with a binary divisor (for example 5000 MB → 4.88).
 * Non-whole commercial sizes are preserved unchanged.
 */
export function commercialDataGb(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return value;
  const restored = value * 1.024;
  const whole = Math.round(restored);
  return Math.abs(restored - whole) <= 0.03 && Math.abs(value - whole) >= 0.03 ? whole : value;
}

export function customerPackageTitle(input: {
  locale: Locale;
  destinationIso?: string;
  routeIsos?: string[];
  coverage: string[];
}): string {
  if ((input.routeIsos?.length ?? 0) > 1) {
    if (input.locale === "de") return "eSIM für deine Route";
    if (input.locale === "en") return "Route eSIM";
    return "Rotan için eSIM";
  }
  const iso = input.destinationIso || (input.coverage.length === 1 ? input.coverage[0] : "");
  const country = getCountryByIso(iso);
  if (country) return `${country.name[input.locale]} eSIM`;
  if (input.locale === "de") return "Reise-eSIM";
  if (input.locale === "en") return "Travel eSIM";
  return "Seyahat eSIM’i";
}

const REGION_FAMILY_LABELS: Record<RegionFamily, Record<Locale, string>> = {
  EUROPE: COVERAGE_REGION_LABELS.EUROPE,
  EUROPE_USA: localize({ tr: "Avrupa + ABD", de: "Europa + USA", en: "Europe + USA" }),
  MIDDLE_EAST: COVERAGE_REGION_LABELS.MIDDLE_EAST,
  ASIA: COVERAGE_REGION_LABELS.ASIA,
  AFRICA: COVERAGE_REGION_LABELS.AFRICA,
  AMERICAS: COVERAGE_REGION_LABELS.AMERICAS,
  GLOBAL: COVERAGE_REGION_LABELS.GLOBAL,
};

/**
 * Customer identity of the selected catalogue product. Search context is never
 * used to rename a broader-coverage product, and supplier titles are never shown.
 */
export function customerCataloguePackageTitle(input: {
  locale: Locale;
  coverage: string[];
  destinationIso?: string | null;
  packageKind?: string | null;
  regionFamily?: RegionFamily | null;
}): string {
  const coverage = [...new Set(input.coverage.map((iso) => iso.toUpperCase()).filter(Boolean))];
  const scope = resolvePackageScope({ declaredKind: input.packageKind ?? null, coverageCount: coverage.length });

  if (scope === "COUNTRY") {
    const iso = coverage[0] ?? input.destinationIso ?? "";
    const country = getCountryByIso(iso);
    if (country) return `${country.name[input.locale]} eSIM`;
  }

  if (scope === "REGION" || scope === "GLOBAL") {
    const familyLabel = input.regionFamily ? REGION_FAMILY_LABELS[input.regionFamily]?.[input.locale] : null;
    const coverageRegion = scope === "GLOBAL" ? "GLOBAL" : classifyCoverageRegion(coverage);
    const label = familyLabel ?? (coverageRegion ? COVERAGE_REGION_LABELS[coverageRegion][input.locale] : null);
    if (label) return `${label} eSIM`;
  }

  if (input.locale === "de") return "Reise-eSIM";
  if (input.locale === "en") return "Travel eSIM";
  return "Seyahat eSIM’i";
}

/** Reads only the customer-safe identity fields already stored with an order. */
export function customerOrderPackageTitle(input: {
  locale: Locale;
  fallbackName: string;
  destination?: string | null;
  detailsSnapshot?: unknown;
}): string {
  const snapshot = input.detailsSnapshot && typeof input.detailsSnapshot === "object" && !Array.isArray(input.detailsSnapshot)
    ? input.detailsSnapshot as Record<string, unknown>
    : {};
  const rawCoverage = snapshot["coverageCountryIsos"];
  const coverage = Array.isArray(rawCoverage)
    ? rawCoverage.filter((value): value is string => typeof value === "string" && Boolean(value))
    : [];
  if (!coverage.length && input.destination && /^[A-Za-z]{2}$/.test(input.destination)) coverage.push(input.destination);
  if (!coverage.length) return input.fallbackName;
  return customerCataloguePackageTitle({
    locale: input.locale,
    coverage,
    destinationIso: input.destination ?? null,
    packageKind: typeof snapshot["packageKind"] === "string" ? snapshot["packageKind"] : null,
  });
}

export function formatSalePrice(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}