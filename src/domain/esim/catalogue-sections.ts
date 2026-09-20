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
  broaderUnlimited: number;
  broaderCoverage: number;
  /** All exact-country unlimited products before per-validity curation. */
  unlimitedTotal: number;
  /** All broader-coverage products before customer-facing curation. */
  broaderCoverageTotal: number;
};

export type CatalogueSections<T> = {
  recommended: T | null;
  standard: T[];
  /** Exact-country unlimited: one card per real provider validity. */
  unlimited: T[];
  /** 1–2 wider (regional/global) unlimited alternatives, shown separately. */
  broaderUnlimited: T[];
  /** Local unlimited card that fits the trip length best, for highlighting. */
  bestForTripId: string | null;
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
 * Customer-facing list for the exact-country unlimited section.
 *
 * EVERY real validity the provider offers for the selected country is shown
 * (1, 3, 7, 10, 15, 30 days ...), but only ONE card per validity: provider
 * catalogues often expose several SKUs with the same duration, and the
 * customer only needs the most sensible commercial option. Purely
 * presentational — nothing is removed from the catalogue, nothing is invented.
 */
function curateLocalUnlimited<T extends CatalogueProduct>(packages: T[]): T[] {
  const buckets = new Map<number, T[]>();
  for (const pkg of packages) {
    const key = pkg.validityDays ?? 0;
    const list = buckets.get(key);
    if (list) list.push(pkg);
    else buckets.set(key, [pkg]);
  }
  const perBucket: T[] = [];
  for (const list of buckets.values()) {
    const sorted = [...list].sort(byPrice);
    // Cheapest option of this duration, unless a pricier SKU documents a
    // materially different fair-use / speed promise.
    perBucket.push(sorted[0]!);
  }
  return perBucket.sort((a, b) => (a.validityDays ?? 0) - (b.validityDays ?? 0) || byPrice(a, b));
}

/**
 * 1–2 genuinely wider unlimited alternatives (best regional + best global),
 * shown under their own sub-heading so they are never mistaken for local ones.
 */
function curateBroaderUnlimited<T extends CatalogueProduct>(packages: T[], limit: number): T[] {
  const ranked = [...packages].sort(
    (a, b) => byPrice(a, b) || (b.validityDays ?? 0) - (a.validityDays ?? 0),
  );
  const picked: T[] = [];
  const usedScopes = new Set<string>();
  for (const pkg of ranked) {
    const scope = coverageScopeOf(pkg) === "GLOBAL" ? "GLOBAL" : "REGION";
    if (usedScopes.has(scope)) continue;
    usedScopes.add(scope);
    picked.push(pkg);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Local unlimited card that fits the trip best: shortest validity covering it. */
function bestForTrip<T extends CatalogueProduct>(packages: T[], days: number): T | null {
  if (!packages.length || days <= 0) return null;
  const covering = packages.filter((pkg) => (pkg.validityDays ?? 0) >= days);
  const pool = covering.length ? covering : packages;
  return (
    [...pool].sort(
      (a, b) =>
        Math.abs((a.validityDays ?? 0) - days) - Math.abs((b.validityDays ?? 0) - days) ||
        byPrice(a, b),
    )[0] ?? null
  );
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

  // Curated shortlists. The catalogue itself keeps every product.
  //  - local unlimited: every real validity the provider offers, one card each
  //  - broader unlimited: 1–2 wider alternatives, shown separately
  //  - broader coverage: capped regional/global data plans only
  const unlimitedCurated = curateLocalUnlimited(unlimited);
  const broaderUnlimitedAll = broaderAll.filter((pkg) => pkg.unlimited);
  const broaderCappedAll = broaderAll.filter((pkg) => !pkg.unlimited);
  const broaderUnlimited = curateBroaderUnlimited(broaderUnlimitedAll, 2);
  const broaderLimit = standard.length + unlimited.length ? 6 : 12;
  const broaderCoverage = curateBroaderCoverage(broaderCappedAll, broaderLimit);

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
  const safeUnlimited = unlimitedCurated.filter(keep);
  const safeBroaderUnlimited = broaderUnlimited.filter(keep);
  const safeBroader = broaderCoverage.filter(keep);

  const counters: SectionCounters = {
    received: packages.length,
    covering: covering.length,
    eligible: eligible.length,
    unique: unique.length,
    recommended: safeRecommended ? 1 : 0,
    standard: safeStandard.length,
    unlimited: safeUnlimited.length,
    broaderUnlimited: safeBroaderUnlimited.length,
    broaderCoverage: safeBroader.length,
    unlimitedTotal: unlimited.length,
    broaderCoverageTotal: broaderAll.length,
  };

  if (duplicates.length && import.meta.env?.DEV) {
    console.error("[esim] duplicate products detected across sections", duplicates);
  }
  // Every unique eligible product is classified exactly once; only the
  // unlimited and broader sections are trimmed for presentation.
  const classified =
    counters.recommended +
    counters.standard +
    counters.unlimitedTotal +
    counters.broaderCoverageTotal;
  if (classified !== counters.unique && import.meta.env?.DEV) {
    console.error("[esim] classification invariant broken", counters);
  }

  return {
    recommended: safeRecommended,
    standard: safeStandard,
    unlimited: safeUnlimited,
    broaderUnlimited: safeBroaderUnlimited,
    bestForTripId: bestForTrip(safeUnlimited, input.days ?? 0)?.id ?? null,
    broaderCoverage: safeBroader,
    all: [
      ...(safeRecommended ? [safeRecommended] : []),
      ...safeStandard,
      ...safeUnlimited,
      ...safeBroaderUnlimited,
      ...safeBroader,
    ],
    counters,
    duplicates,
  };
}
