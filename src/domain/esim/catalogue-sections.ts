/**
 * Layer 4 of the eSIM engine: STOREFRONT SECTIONING.
 *
 * Takes the eligible supplier catalogue for one trip and produces the final
 * page model. Every product is deduplicated by provider identity and assigned
 * to EXACTLY ONE category, so the customer can never see the same package in
 * two sections.
 *
 * Nothing here is country-, locale- or provider-specific.
 */
import {
  coverageScopeOf,
  coveringPackages,
  resolveTieredRecommendation,
  type MatchablePackage,
  type PackageMatchInput,
} from "./package-matching";

export type CatalogueCategory = "RECOMMENDED" | "STANDARD" | "UNLIMITED" | "BROADER_COVERAGE";

/** Catalogue row as the storefront receives it from the provider pipeline. */
export type CatalogueProduct = MatchablePackage & {
  providerId?: string | null;
  providerProductId?: string | null;
};

export type SectionCounters = {
  received: number;
  covering: number;
  eligible: number;
  unique: number;
  recommended: number;
  standard: number;
  unlimited: number;
  broaderCoverage: number;
};

export type CatalogueSections<T> = {
  recommended: T | null;
  standard: T[];
  unlimited: T[];
  broaderCoverage: T[];
  /** Every rendered product, in render order, guaranteed duplicate-free. */
  all: T[];
  counters: SectionCounters;
  /** Ids that were dropped by the final safety pass; always empty when correct. */
  duplicates: string[];
};

export type SectionInput = PackageMatchInput & {
  /** Product the finder handed off; honoured only when still eligible. */
  recommendedId?: string | null;
};

/**
 * Primary identity: provider + provider product id. Two rows sharing GB,
 * validity and price are NOT merged — only a repeated provider product is.
 */
export function productIdentity(pkg: CatalogueProduct): string {
  const external = String(pkg.providerProductId ?? "").trim();
  if (!external) return `row:${pkg.id}`;
  return `${String(pkg.providerId ?? "provider").trim()}:${external}`;
}

const priceOf = (pkg: MatchablePackage) => pkg.salePrice ?? Number.POSITIVE_INFINITY;
const byPrice = (a: MatchablePackage, b: MatchablePackage) => priceOf(a) - priceOf(b);
const sufficient = (pkg: MatchablePackage, requiredGb: number) => pkg.unlimited || (pkg.dataGb ?? 0) >= requiredGb;

/**
 * Coverage is "meaningfully wider" when the package is not a country/subdivision
 * product for this trip and actually covers countries the trip does not include.
 */
function isBroaderCoverage(pkg: CatalogueProduct, requestedIsos: string[]): boolean {
  const scope = coverageScopeOf(pkg);
  if (scope !== "REGION" && scope !== "GLOBAL") return false;
  const requested = new Set(requestedIsos);
  return pkg.coverage.some((iso) => !requested.has(iso));
}

/**
 * Deduplicate, then classify each eligible product into exactly one bucket.
 * Priority: RECOMMENDED > UNLIMITED > BROADER_COVERAGE > STANDARD.
 */
export function buildCatalogueSections<T extends CatalogueProduct>(
  packages: T[],
  input: SectionInput,
): CatalogueSections<T> {
  const requestedIsos = (input.coverageIsos ?? []).map((iso) => String(iso).toUpperCase()).filter(Boolean);
  const covering = coveringPackages(packages, { ...input, coverageIsos: requestedIsos });
  const eligible = covering.filter((pkg) => sufficient(pkg, input.requiredGb));

  // 1. Dedupe by provider identity BEFORE any category decision.
  const unique: T[] = [];
  const seenIdentity = new Set<string>();
  for (const pkg of eligible) {
    const identity = productIdentity(pkg);
    if (seenIdentity.has(identity)) continue;
    seenIdentity.add(identity);
    unique.push(pkg);
  }

  // 2. Recommendation: the finder hand-off when still eligible, otherwise the
  //    narrowest sufficient product resolved by the shared engine.
  const handoff = input.recommendedId ? unique.find((pkg) => pkg.id === input.recommendedId) ?? null : null;
  const recommended =
    handoff ?? resolveTieredRecommendation(unique, { ...input, coverageIsos: requestedIsos }).recommended ?? null;

  // 3. Mutually exclusive classification.
  const standard: T[] = [];
  const unlimited: T[] = [];
  const broaderCoverage: T[] = [];
  for (const pkg of unique) {
    if (recommended && pkg.id === recommended.id) continue;
    if (pkg.unlimited) unlimited.push(pkg);
    else if (isBroaderCoverage(pkg, requestedIsos)) broaderCoverage.push(pkg);
    else standard.push(pkg);
  }

  standard.sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || byPrice(a, b));
  unlimited.sort((a, b) => byPrice(a, b) || (a.validityDays ?? 0) - (b.validityDays ?? 0));
  broaderCoverage.sort((a, b) => a.coverage.length - b.coverage.length || byPrice(a, b));

  // 4. Safety pass: a product id may appear in one section only.
  const seenId = new Set<string>();
  const duplicates: string[] = [];
  const keep = (pkg: T) => {
    if (seenId.has(pkg.id)) {
      duplicates.push(pkg.id);
      return false;
    }
    seenId.add(pkg.id);
    return true;
  };
  const safeRecommended = recommended && keep(recommended) ? recommended : null;
  const safeStandard = standard.filter(keep);
  const safeUnlimited = unlimited.filter(keep);
  const safeBroader = broaderCoverage.filter(keep);

  const counters: SectionCounters = {
    received: packages.length,
    covering: covering.length,
    eligible: eligible.length,
    unique: unique.length,
    recommended: safeRecommended ? 1 : 0,
    standard: safeStandard.length,
    unlimited: safeUnlimited.length,
    broaderCoverage: safeBroader.length,
  };

  if (duplicates.length && import.meta.env?.DEV) {
    console.error("[esim] duplicate products detected across sections", duplicates);
  }
  const classified = counters.recommended + counters.standard + counters.unlimited + counters.broaderCoverage;
  if (classified !== counters.unique && import.meta.env?.DEV) {
    console.error("[esim] classification invariant broken", counters);
  }

  return {
    recommended: safeRecommended,
    standard: safeStandard,
    unlimited: safeUnlimited,
    broaderCoverage: safeBroader,
    all: [...(safeRecommended ? [safeRecommended] : []), ...safeStandard, ...safeUnlimited, ...safeBroader],
    counters,
    duplicates,
  };
}
