/**
 * THE single source of truth for eSIM package scope.
 *
 * Catalogue import, admin screens and the recommendation engine all resolve
 * scope through this module. No other file may classify a package by counting
 * coverage countries against an arbitrary threshold.
 */

export type PackageScope = "COUNTRY" | "REGION" | "GLOBAL" | "SUBDIVISION";

export const PACKAGE_SCOPES: PackageScope[] = ["SUBDIVISION", "COUNTRY", "REGION", "GLOBAL"];

/** Narrowest usable scope first: a country trip prefers a country package. */
export const SCOPE_PREFERENCE: PackageScope[] = ["COUNTRY", "REGION", "GLOBAL"];

export type ScopeInput = {
  /** Provider-declared or previously normalized kind, when available. */
  declaredKind?: string | null;
  coverageCount: number;
  subdivisionCount?: number;
};

/**
 * Provider-declared kind always wins. Otherwise scope is derived from real
 * coverage only: a package is GLOBAL only when the supplier says so, never
 * because it happens to cover "many" countries.
 */
export function resolvePackageScope(input: ScopeInput): PackageScope {
  const declared = String(input.declaredKind ?? "").trim().toUpperCase();
  if (declared === "GLOBAL" || declared === "WORLD" || declared === "WORLDWIDE") return "GLOBAL";
  if (declared === "SUBDIVISION" || declared === "STATE" || declared === "PROVINCE") return "SUBDIVISION";
  if (declared === "REGION" || declared === "REGIONAL") return "REGION";
  if (declared === "COUNTRY" || declared === "LOCAL") return "COUNTRY";

  if (input.coverageCount <= 0 && (input.subdivisionCount ?? 0) > 0) return "SUBDIVISION";
  return input.coverageCount > 1 ? "REGION" : "COUNTRY";
}

/** Storage/UI label for a stored package kind, normalized through one path. */
export function normalizeStoredScope(value: unknown, coverageCount: number, subdivisionCount = 0): PackageScope {
  return resolvePackageScope({ declaredKind: value as string, coverageCount, subdivisionCount });
}
