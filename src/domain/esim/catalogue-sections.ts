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
  /** All broader-coverage products before customer-facing curation. */
  broaderCoverageTotal: number;
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
const sufficient = (pkg: MatchablePackage, requiredGb: number) =>
  pkg.unlimited || (pkg.dataGb ?? 0) >= requiredGb;

/**
 * EXACT/LOCAL for this trip: the package covers the requested countries and
 * nothing else. "Covers Türkiye" and "is a Türkiye package" are different
 * things — only the latter belongs in the Standard/Unlimited sections.
 */
function isLocalForTrip(pkg: CatalogueProduct, requestedIsos: string[]): boolean {
  if (!requestedIsos.length) return true;
  const requested = new Set(requestedIsos);
  return !pkg.coverage.some((iso) => !requested.has(iso));
}

/** Broader coverage: regional / global / multi-country for this trip. */
function isBroaderCoverage(pkg: CatalogueProduct, requestedIsos: string[]): boolean {
  return !isLocalForTrip(pkg, requestedIsos);
}

/**
 * Customer-facing shortlist for the broader-coverage section: a handful of
 * genuinely different alternatives instead of dozens of near-identical rows.
 * Nothing is removed from the catalogue — this is presentation only.
 */
function curateBroaderCoverage<T extends CatalogueProduct>(packages: T[], limit: number): T[] {
  const bucketOf = (pkg: T) =>
    `${coverageScopeOf(pkg) === "GLOBAL" ? "GLOBAL" : "REGION"}:${pkg.unlimited ? "UNLIMITED" : "FIXED"}`;
  const ranked = [...packages].sort(
    (a, b) =>
      byPrice(a, b) || (b.dataGb ?? 0) - (a.dataGb ?? 0) || a.coverage.length - b.coverage.length,
  );
  const picked: T[] = [];
  const usedBuckets = new Set<string>();
  // Pass 1: the best option of each distinct kind, so the list stays diverse.
  for (const pkg of ranked) {
    const bucket = bucketOf(pkg);
    if (usedBuckets.has(bucket)) continue;
    usedBuckets.add(bucket);
    picked.push(pkg);
    if (picked.length >= limit) return picked;
  }
  // Pass 2: fill remaining slots with the next best value, skipping duplicates
  // of an allowance already on screen within the same kind.
  const usedSizes = new Set(picked.map((pkg) => `${bucketOf(pkg)}|${pkg.dataGb ?? "U"}`));
  for (const pkg of ranked) {
    if (picked.includes(pkg)) continue;
    const key = `${bucketOf(pkg)}|${pkg.dataGb ?? "U"}`;
    if (usedSizes.has(key)) continue;
    usedSizes.add(key);
    picked.push(pkg);
    if (picked.length >= limit) break;
  }
  return picked;
}

/**
 * Deduplicate, then classify each eligible product into exactly one bucket.
 * Priority: RECOMMENDED > UNLIMITED > BROADER_COVERAGE > STANDARD.
 */
export function buildCatalogueSections<T extends CatalogueProduct>(
  packages: T[],
  input: SectionInput,
): CatalogueSections<T> {
  const requestedIsos = (input.coverageIsos ?? [])
    .map((iso) => String(iso).toUpperCase())
    .filter(Boolean);
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
  const handoff = input.recommendedId
    ? (unique.find((pkg) => pkg.id === input.recommendedId) ?? null)
    : null;
  const recommended =
    handoff ??
    resolveTieredRecommendation(unique, { ...input, coverageIsos: requestedIsos }).recommended ??
    null;

  // 3. Mutually exclusive classification.
  //    Standard/Unlimited hold EXACT/LOCAL products for the selected trip only;
  //    every regional / global / multi-country product goes to broader coverage.
  const standard: T[] = [];
  const unlimited: T[] = [];
  const broaderAll: T[] = [];
  for (const pkg of unique) {
    if (recommended && pkg.id === recommended.id) continue;
    if (isBroaderCoverage(pkg, requestedIsos)) broaderAll.push(pkg);
    else if (pkg.unlimited) unlimited.push(pkg);
    else standard.push(pkg);
  }

  standard.sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || byPrice(a, b));
  unlimited.sort((a, b) => byPrice(a, b) || (a.validityDays ?? 0) - (b.validityDays ?? 0));
  broaderAll.sort((a, b) => a.coverage.length - b.coverage.length || byPrice(a, b));

  // Curated shortlist: a few meaningful alternatives, more when the trip has no
  // local products at all. The catalogue itself keeps every product.
  const broaderLimit = standard.length + unlimited.length ? 6 : 12;
  const broaderCoverage = curateBroaderCoverage(broaderAll, broaderLimit);

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
    broaderCoverageTotal: broaderAll.length,
  };

  if (duplicates.length && import.meta.env?.DEV) {
    console.error("[esim] duplicate products detected across sections", duplicates);
  }
  // Every unique eligible product is classified exactly once; only the broader
  // section is trimmed for presentation.
  const classified =
    counters.recommended + counters.standard + counters.unlimited + counters.broaderCoverageTotal;
  if (classified !== counters.unique && import.meta.env?.DEV) {
    console.error("[esim] classification invariant broken", counters);
  }

  return {
    recommended: safeRecommended,
    standard: safeStandard,
    unlimited: safeUnlimited,
    broaderCoverage: safeBroader,
    all: [
      ...(safeRecommended ? [safeRecommended] : []),
      ...safeStandard,
      ...safeUnlimited,
      ...safeBroader,
    ],
    counters,
    duplicates,
  };
}
