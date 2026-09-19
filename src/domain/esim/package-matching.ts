/**
 * Layer 2 of the eSIM recommendation engine: AVAILABLE PRODUCT MATCHING.
 *
 * Package sizes are never invented here. Candidates come from the real
 * catalogue (provider/internal). This module only picks the smallest
 * available product that fully satisfies the estimated need.
 */

import { resolvePackageScope, SCOPE_PREFERENCE, type PackageScope } from "./package-scope";

export type MatchablePackage = {
  id: string;
  dataGb: number | null;
  unlimited: boolean;
  validityDays: number | null;
  coverage: string[];
  salePrice: number | null;
  /** Provider-declared / normalized kind. THE source of truth for scope. */
  scope?: PackageScope | null;
  /** Subdivision codes (US-HI …). Never imply the parent country. */
  subdivisions?: string[];
};

/** Alias kept for call sites; scope semantics live in package-scope.ts. */
export type CoverageScope = PackageScope;

export function coverageScopeOf(pkg: MatchablePackage): CoverageScope {
  return resolvePackageScope({
    declaredKind: pkg.scope ?? null,
    coverageCount: pkg.coverage.length,
    subdivisionCount: pkg.subdivisions?.length ?? 0,
  });
}

const SCOPE_ORDER: CoverageScope[] = SCOPE_PREFERENCE;


export type PackageMatchInput = {
  requiredGb: number;
  /** ISO codes that must all be covered (destination or full route). */
  coverageIsos?: string[];
  /** Trip duration; a package must stay valid for the whole trip when known. */
  days?: number;
};

const allowanceOf = (pkg: MatchablePackage) => (pkg.unlimited ? Number.POSITIVE_INFINITY : (pkg.dataGb ?? 0));

/**
 * Provider-agnostic validity normalization. Providers express validity in
 * different units; the internal catalogue always stores days.
 */
export function normalizeValidityToDays(value: unknown, unit?: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const key = String(unit ?? "day").trim().toLowerCase();
  const perUnit = key.startsWith("hour") || key === "h" || key === "saat" || key === "stunde" || key === "stunden"
    ? 1 / 24
    : key.startsWith("week") || key === "w" || key === "hafta" || key.startsWith("woche")
      ? 7
      : key.startsWith("month") || key === "m" || key === "ay" || key.startsWith("monat")
        ? 30
        : 1;
  return Math.max(1, Math.ceil(amount * perUnit));
}

/** A package must stay valid for the whole trip; unknown validity is never assumed to be enough. */
export function validityCoversTrip(pkg: MatchablePackage, days: number): boolean {
  if (!(days > 0)) return true;
  if (pkg.validityDays == null) return false;
  return pkg.validityDays >= days;
}

/** Coverage first, then validity, then data allowance — never undershoot. */
export function filterEligiblePackages<T extends MatchablePackage>(packages: T[], input: PackageMatchInput): T[] {
  const isos = (input.coverageIsos ?? []).map((iso) => iso.toUpperCase()).filter(Boolean);
  const days = Number.isFinite(input.days) ? Number(input.days) : 0;
  return packages.filter((pkg) => {
    if (isos.length && !isos.every((iso) => pkg.coverage.includes(iso))) return false;
    if (!validityCoversTrip(pkg, days)) return false;
    return allowanceOf(pkg) >= input.requiredGb;
  });
}


/**
 * Smallest sufficient available package; ties broken by price.
 * Returns null when nothing in the catalogue satisfies the trip — callers must
 * then show the "no suitable package" state instead of inventing a product.
 */
export function selectRecommendedPackage<T extends MatchablePackage>(packages: T[], input: PackageMatchInput): T | null {
  const eligible = filterEligiblePackages(packages, input);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => {
    const allowance = allowanceOf(a) - allowanceOf(b);
    if (allowance !== 0) return allowance;
    return (a.salePrice ?? Number.POSITIVE_INFINITY) - (b.salePrice ?? Number.POSITIVE_INFINITY);
  })[0]!;
}

export type PackageRecommendation<T> =
  /** A real capped package covers the whole need (exact match or next larger size). */
  | { status: "MATCHED"; package: T }
  /** No capped size is big enough, but a valid unlimited product exists. */
  | { status: "UNLIMITED_ALTERNATIVE"; package: T }
  /** Products exist for this trip, but none fully satisfies the estimated need. */
  | { status: "NO_SUFFICIENT"; package: null }
  /** Nothing in the catalogue covers this destination/route yet. */
  | { status: "NO_CATALOGUE"; package: null };

/** Coverage and validity first; then the smallest sufficient size, cheapest on ties. */
export function resolvePackageRecommendation<T extends MatchablePackage>(
  packages: T[],
  input: PackageMatchInput,
): PackageRecommendation<T> {
  const isos = (input.coverageIsos ?? []).map((iso) => iso.toUpperCase()).filter(Boolean);
  const days = Number.isFinite(input.days) ? Number(input.days) : 0;
  const candidates = packages.filter((pkg) => {
    if (isos.length && !isos.every((iso) => pkg.coverage.includes(iso))) return false;
    if (!validityCoversTrip(pkg, days)) return false;
    return true;
  });
  if (!candidates.length) return { status: "NO_CATALOGUE", package: null };

  const byPrice = (a: T, b: T) => (a.salePrice ?? Number.POSITIVE_INFINITY) - (b.salePrice ?? Number.POSITIVE_INFINITY);
  const capped = candidates
    .filter((pkg) => !pkg.unlimited && (pkg.dataGb ?? 0) >= input.requiredGb)
    .sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || byPrice(a, b));
  if (capped.length) return { status: "MATCHED", package: capped[0]! };

  const unlimited = candidates.filter((pkg) => pkg.unlimited).sort(byPrice);
  if (unlimited.length) return { status: "UNLIMITED_ALTERNATIVE", package: unlimited[0]! };

  return { status: "NO_SUFFICIENT", package: null };
}

/* ------------------------------------------------------------------ *
 * Tiered coverage resolution (single country -> regional -> global).
 * Identical for every country: no ISO is ever special-cased.
 * ------------------------------------------------------------------ */

export type TieredRecommendation<T> = {
  /** Scope the winning product belongs to; null when nothing matched. */
  scope: CoverageScope | null;
  status: "MATCHED" | "UNLIMITED_ALTERNATIVE" | "NO_SUFFICIENT" | "NO_CATALOGUE";
  recommended: T | null;
  /** Cheapest valid package that still meets the requirement. */
  economy: T | null;
  /** Next sensible larger valid package. */
  comfort: T | null;
  /** Every package that covers the trip, cheapest first within scope order. */
  candidates: T[];
};

/** Packages that cover every requested ISO and stay valid for the whole trip. */
export function coveringPackages<T extends MatchablePackage>(packages: T[], input: PackageMatchInput): T[] {
  const isos = (input.coverageIsos ?? []).map((iso) => iso.toUpperCase()).filter(Boolean);
  const days = Number.isFinite(input.days) ? Number(input.days) : 0;
  return packages.filter((pkg) => {
    if (isos.length && !isos.every((iso) => pkg.coverage.includes(iso))) return false;
    return validityCoversTrip(pkg, days);
  });
}

const cheapest = <T extends MatchablePackage>(a: T, b: T) =>
  (a.salePrice ?? Number.POSITIVE_INFINITY) - (b.salePrice ?? Number.POSITIVE_INFINITY);

const sufficient = <T extends MatchablePackage>(pkg: T, requiredGb: number) =>
  pkg.unlimited || (pkg.dataGb ?? 0) >= requiredGb;

/**
 * Resolves the recommendation for one destination or full route.
 * Fallback order is coverage scope, then smallest sufficient allowance, then price.
 * Returns NO_CATALOGUE only when no scope covers the trip at all.
 */
export function resolveTieredRecommendation<T extends MatchablePackage>(
  packages: T[],
  input: PackageMatchInput,
): TieredRecommendation<T> {
  const covering = coveringPackages(packages, input);
  const empty: TieredRecommendation<T> = {
    scope: null,
    status: "NO_CATALOGUE",
    recommended: null,
    economy: null,
    comfort: null,
    candidates: [],
  };
  if (!covering.length) return empty;

  const candidates = [...covering].sort(
    (a, b) =>
      SCOPE_ORDER.indexOf(coverageScopeOf(a)) - SCOPE_ORDER.indexOf(coverageScopeOf(b)) ||
      (a.unlimited ? Number.POSITIVE_INFINITY : a.dataGb ?? 0) - (b.unlimited ? Number.POSITIVE_INFINITY : b.dataGb ?? 0) ||
      cheapest(a, b),
  );

  // Step 1-3: prefer the narrowest scope that can actually satisfy the need.
  let winner: T | null = null;
  for (const scope of SCOPE_ORDER) {
    const inScope = candidates.filter((pkg) => coverageScopeOf(pkg) === scope);
    const capped = inScope
      .filter((pkg) => !pkg.unlimited && sufficient(pkg, input.requiredGb))
      .sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || cheapest(a, b));
    if (capped.length) {
      winner = capped[0]!;
      break;
    }
  }

  if (winner) {
    const valid = candidates.filter((pkg) => sufficient(pkg, input.requiredGb));
    const economy = [...valid].sort(cheapest)[0] ?? null;
    const larger = valid
      .filter((pkg) => pkg.unlimited || (pkg.dataGb ?? 0) > (winner!.dataGb ?? 0))
      .sort(
        (a, b) =>
          (a.unlimited ? Number.POSITIVE_INFINITY : a.dataGb ?? 0) - (b.unlimited ? Number.POSITIVE_INFINITY : b.dataGb ?? 0) ||
          cheapest(a, b),
      );
    return {
      scope: coverageScopeOf(winner),
      status: "MATCHED",
      recommended: winner,
      economy: economy && economy.id !== winner.id ? economy : null,
      comfort: larger[0] ?? null,
      candidates,
    };
  }

  // No capped size is big enough anywhere: a valid unlimited product still works.
  const unlimited = candidates.filter((pkg) => pkg.unlimited).sort(cheapest);
  if (unlimited.length) {
    const pick = unlimited[0]!;
    return {
      scope: coverageScopeOf(pick),
      status: "UNLIMITED_ALTERNATIVE",
      recommended: pick,
      economy: null,
      comfort: null,
      candidates,
    };
  }

  return { ...empty, status: "NO_SUFFICIENT", candidates };
}
