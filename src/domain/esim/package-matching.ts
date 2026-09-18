/**
 * Layer 2 of the eSIM recommendation engine: AVAILABLE PRODUCT MATCHING.
 *
 * Package sizes are never invented here. Candidates come from the real
 * catalogue (provider/internal). This module only picks the smallest
 * available product that fully satisfies the estimated need.
 */

export type MatchablePackage = {
  id: string;
  dataGb: number | null;
  unlimited: boolean;
  validityDays: number | null;
  coverage: string[];
  salePrice: number | null;
};

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
