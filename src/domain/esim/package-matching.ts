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

/** Coverage first, then validity, then data allowance — never undershoot. */
export function filterEligiblePackages<T extends MatchablePackage>(packages: T[], input: PackageMatchInput): T[] {
  const isos = (input.coverageIsos ?? []).map((iso) => iso.toUpperCase()).filter(Boolean);
  const days = Number.isFinite(input.days) ? Number(input.days) : 0;
  return packages.filter((pkg) => {
    if (isos.length && !isos.every((iso) => pkg.coverage.includes(iso))) return false;
    if (days > 0 && pkg.validityDays != null && pkg.validityDays < days) return false;
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
