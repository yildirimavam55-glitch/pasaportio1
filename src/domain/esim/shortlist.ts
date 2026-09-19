/**
 * Layer 3 of the eSIM recommendation engine: CUSTOMER CURATION.
 *
 * The supplier catalogue may hold thousands of technically eligible products.
 * The storefront must never show all of them: this module turns the eligible
 * set into a small, diversified shortlist (max 5 primary cards).
 *
 * Nothing is invented and no country is special-cased — every decision is made
 * from real catalogue coverage, validity, data allowance and price.
 */
import {
  coverageScopeOf,
  coveringPackages,
  type CoverageScope,
  type MatchablePackage,
  type PackageMatchInput,
} from "./package-matching";
import { SCOPE_PREFERENCE } from "./package-scope";

export type ShortlistTier = "RECOMMENDED" | "NEXT_STEP" | "COMFORT" | "HEAVY_USE" | "UNLIMITED";

export type ShortlistEntry<T> = { tier: ShortlistTier; package: T };

/** Why no primary card could be offered. */
export type ShortlistGap = "NO_CATALOGUE" | "NO_SUFFICIENT";

export type CustomerShortlist<T> = {
  /** Coverage scope the primary cards were taken from. */
  scope: CoverageScope | null;
  /** Max 5 curated cards, recommendation first. */
  primary: ShortlistEntry<T>[];
  /** Further unlimited variants, hidden behind a secondary action. */
  moreUnlimited: T[];
  /** At most 2 broader-coverage alternatives for a single-country search. */
  widerCoverage: T[];
  /** How many catalogue products were technically eligible before curation. */
  eligibleCount: number;
  /** Set when nothing fully satisfies the trip; never called "recommended". */
  gap: ShortlistGap | null;
  /** Real but insufficient products offered as an honest fallback. */
  closest: T[];
};

const MAX_PRIMARY = 5;
/** A larger card is only worth a slot when the allowance is meaningfully bigger. */
const MEANINGFUL_STEP = 1.4;
/**
 * An unlimited card only earns a primary slot when it is not wildly more
 * expensive than the best fixed option. Configurable per call.
 */
export const DEFAULT_UNLIMITED_PRICE_RATIO = 2.5;

const priceOf = <T extends MatchablePackage>(pkg: T) => pkg.salePrice ?? Number.POSITIVE_INFINITY;
const byPrice = <T extends MatchablePackage>(a: T, b: T) => priceOf(a) - priceOf(b);
const sizeOf = <T extends MatchablePackage>(pkg: T) => pkg.dataGb ?? 0;
const isSufficient = <T extends MatchablePackage>(pkg: T, requiredGb: number) =>
  pkg.unlimited || sizeOf(pkg) >= requiredGb;

/** One product per distinct allowance: the cheapest, so near-duplicates collapse. */
function cheapestPerSize<T extends MatchablePackage>(packages: T[]): T[] {
  const best = new Map<number, T>();
  for (const pkg of packages) {
    const key = Math.round(sizeOf(pkg) * 100) / 100;
    const current = best.get(key);
    if (!current || byPrice(pkg, current) < 0) best.set(key, pkg);
  }
  return [...best.values()].sort((a, b) => sizeOf(a) - sizeOf(b) || byPrice(a, b));
}

/** One unlimited product per distinct validity, cheapest first overall. */
function curatedUnlimited<T extends MatchablePackage>(packages: T[]): T[] {
  const best = new Map<number, T>();
  for (const pkg of packages) {
    const key = pkg.validityDays ?? 0;
    const current = best.get(key);
    if (!current || byPrice(pkg, current) < 0) best.set(key, pkg);
  }
  return [...best.values()].sort((a, b) => byPrice(a, b) || (a.validityDays ?? 0) - (b.validityDays ?? 0));
}

export type ShortlistInput = PackageMatchInput & {
  maxPrimary?: number;
  preferredId?: string | null;
  /** Unlimited is primary only within this multiple of the best fixed price. */
  unlimitedPriceRatio?: number;
};

/**
 * Curated storefront selection for one destination or route.
 *
 * Single-country searches stay on country products whenever suitable ones
 * exist; regional and global products are a fallback, or an optional
 * "wider coverage" extra. Route searches naturally resolve to regional/global
 * because no country product can cover every requested ISO.
 */
export function buildCustomerShortlist<T extends MatchablePackage>(
  packages: T[],
  input: ShortlistInput,
): CustomerShortlist<T> {
  const limit = Math.max(1, Math.min(MAX_PRIMARY, input.maxPrimary ?? MAX_PRIMARY));
  const ratio = Math.max(1, Number(input.unlimitedPriceRatio ?? DEFAULT_UNLIMITED_PRICE_RATIO));
  const covering = coveringPackages(packages, input);
  const eligible = covering.filter((pkg) => isSufficient(pkg, input.requiredGb));
  const empty: CustomerShortlist<T> = {
    scope: null,
    primary: [],
    moreUnlimited: [],
    widerCoverage: [],
    eligibleCount: eligible.length,
    // Products exist for the trip but none is big enough -> honest gap state.
    gap: covering.length ? "NO_SUFFICIENT" : "NO_CATALOGUE",
    closest: covering.length
      ? [...covering].sort((a, b) => sizeOf(b) - sizeOf(a) || byPrice(a, b)).slice(0, 3)
      : [],
  };
  if (!eligible.length) return empty;

  // Narrowest scope that can actually serve this trip wins the primary grid.
  const byScope = new Map<CoverageScope, T[]>();
  for (const pkg of eligible) {
    const scope = coverageScopeOf(pkg);
    byScope.set(scope, [...(byScope.get(scope) ?? []), pkg]);
  }
  const scope = SCOPE_PREFERENCE.find((candidate) => (byScope.get(candidate)?.length ?? 0) > 0) ?? null;
  if (!scope) return empty;
  const pool = byScope.get(scope)!;

  const capped = cheapestPerSize(pool.filter((pkg) => !pkg.unlimited));
  const unlimited = curatedUnlimited(pool.filter((pkg) => pkg.unlimited));

  // The Finder may hand off a product; it is honoured only when still eligible.
  const handoff = input.preferredId ? pool.find((pkg) => pkg.id === input.preferredId) ?? null : null;
  const recommended = handoff ?? capped[0] ?? unlimited[0] ?? null;
  if (!recommended) return empty;

  const primary: ShortlistEntry<T>[] = [{ tier: "RECOMMENDED", package: recommended }];
  const used = new Set<string>([recommended.id]);

  if (!recommended.unlimited) {
    const upgradeTiers: ShortlistTier[] = ["NEXT_STEP", "COMFORT", "HEAVY_USE"];
    let previousSize = sizeOf(recommended);
    let step = 0;
    for (const pkg of capped) {
      if (step >= upgradeTiers.length) break;
      if (used.has(pkg.id)) continue;
      const size = sizeOf(pkg);
      if (size <= previousSize) continue;
      // The first upgrade is simply the next size up; later ones must be a real jump.
      if (step > 0 && size < previousSize * MEANINGFUL_STEP) continue;
      primary.push({ tier: upgradeTiers[step]!, package: pkg });
      used.add(pkg.id);
      previousSize = size;
      step += 1;
    }
  }

  /**
   * Value guard: an unlimited plan that costs several times the best fixed
   * option is not useful next to a €10 card, so it moves behind the
   * "other unlimited options" action instead of taking a primary slot.
   */
  const fixedPrimaryPrices = primary.filter((entry) => !entry.package.unlimited).map((entry) => priceOf(entry.package));
  const cheapestFixed = fixedPrimaryPrices.length ? Math.min(...fixedPrimaryPrices) : null;
  const candidateUnlimited = unlimited.find((pkg) => !used.has(pkg.id)) ?? null;
  const unlimitedIsGoodValue =
    candidateUnlimited != null &&
    (cheapestFixed == null || !Number.isFinite(cheapestFixed) || priceOf(candidateUnlimited) <= cheapestFixed * ratio);

  if (candidateUnlimited && unlimitedIsGoodValue && primary.length < limit) {
    primary.push({ tier: "UNLIMITED", package: candidateUnlimited });
    used.add(candidateUnlimited.id);
  }

  const widerCoverage = scope === "COUNTRY"
    ? SCOPE_PREFERENCE.slice(1)
        .map((other) => [...(byScope.get(other) ?? [])].sort(byPrice)[0])
        .filter((pkg): pkg is T => Boolean(pkg))
        .slice(0, 2)
    : [];

  return {
    scope,
    primary: primary.slice(0, limit),
    moreUnlimited: unlimited.filter((pkg) => !used.has(pkg.id)).slice(0, 4),
    widerCoverage,
    eligibleCount: eligible.length,
    gap: null,
    closest: [],
  };
}
