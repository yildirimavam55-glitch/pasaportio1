/**
 * Supplier-agnostic normalization of catalogue metadata that is preserved
 * verbatim in `esim_product_details.provider_metadata` but has no dedicated
 * column. Only reads fields the supplier really returns; unknown → null/[].
 */
export type PlanTier = "LITE" | "ESSENTIAL" | "PLUS";
export type RegionFamily = "EUROPE" | "EUROPE_USA" | "MIDDLE_EAST" | "ASIA" | "AFRICA" | "AMERICAS" | "GLOBAL";

const GENERATIONS = ["2G", "3G", "4G", "5G"];

export function networkGenerationsOf(speed: unknown): string[] {
  if (!Array.isArray(speed)) return [];
  const set = new Set(speed.map((s) => String(s).toUpperCase().trim()));
  return GENERATIONS.filter((g) => set.has(g));
}

/** Unlimited tier as published by the supplier's own product group label. */
export function planTierOf(groups: unknown): PlanTier | null {
  if (!Array.isArray(groups)) return null;
  const text = groups.map(String).join(" ").toLowerCase();
  if (!text.includes("unlimited")) return null;
  if (text.includes("plus")) return "PLUS";
  if (text.includes("essential")) return "ESSENTIAL";
  if (text.includes("lite")) return "LITE";
  return null;
}

/** Supplier region label for multi-country bundles, e.g. "Europe+". */
export function regionLabelOf(countries: unknown, coverageCount: number): string | null {
  if (coverageCount < 2 || !Array.isArray(countries) || countries.length !== 1) return null;
  const name = (countries[0] as { name?: unknown } | null)?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function regionFamilyOf(label: string | null): RegionFamily | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("europe") && (l.includes("usa") || l.includes("us "))) return "EUROPE_USA";
  if (l.includes("europe")) return "EUROPE";
  if (l.includes("middle east")) return "MIDDLE_EAST";
  if (l.includes("asia")) return "ASIA";
  if (l.includes("africa")) return "AFRICA";
  if (l.includes("america")) return "AMERICAS";
  if (l.includes("global") || l.includes("world")) return "GLOBAL";
  return null;
}

export const TIER_ORDER: Record<PlanTier, number> = { LITE: 0, ESSENTIAL: 1, PLUS: 2 };

type RegionalCandidate = {
  unlimited: boolean;
  dataGb: number | null;
  validityDays: number | null;
  salePrice: number | null;
  coverage: string[];
};

/**
 * Deterministic regional discovery pick (max 3). Targets mainstream travel
 * tiers (5/10/20 GB, 15–30 days) from REAL inventory; falls back to the
 * nearest real allowance. Never "cheapest 3" or "largest 3".
 */
export function pickRegionalRecommendations<T extends RegionalCandidate>(items: T[], max = 3): T[] {
  const fixed = items.filter((p) => !p.unlimited && p.dataGb != null && p.salePrice != null);
  const validityPenalty = (d: number | null) => (d == null ? 5 : d >= 15 && d <= 30 ? 0 : d > 30 && d <= 60 ? 1 : 3);
  const score = (p: T, target: number) =>
    Math.abs(Math.log2((p.dataGb as number) / target)) * 10 + validityPenalty(p.validityDays) * 4 + (p.salePrice as number) / Math.max(1, p.dataGb as number) - Math.min(p.coverage.length, 60) / 60;
  const chosen: T[] = [];
  for (const target of [5, 10, 20]) {
    const ranked = fixed
      .filter((p) => !chosen.includes(p) && !chosen.some((c) => c.dataGb === p.dataGb))
      .sort((a, b) => score(a, target) - score(b, target) || (a.salePrice as number) - (b.salePrice as number));
    if (ranked[0]) chosen.push(ranked[0]);
    if (chosen.length >= max) break;
  }
  return chosen.sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0));
}

/** Supplier tier that represents Pasaport's standard Unlimited product. */
export const STANDARD_UNLIMITED_TIER: PlanTier = "ESSENTIAL";

/**
 * Keeps only the standard Unlimited tier where the supplier offers it for the same
 * package structure; other tiers stay in the catalogue but never stand in for it.
 * Structures without a standard-tier product are left unchanged.
 */
export function standardUnlimitedOnly<T>(items: T[], structureOf: (item: T) => string | null, tierOf: (item: T) => PlanTier | null): T[] {
  const hasStandard = new Set<string>();
  for (const item of items) { const k = structureOf(item); if (k != null && tierOf(item) === STANDARD_UNLIMITED_TIER) hasStandard.add(k); }
  return items.filter((item) => {
    const k = structureOf(item);
    return k == null || !hasStandard.has(k) || tierOf(item) === STANDARD_UNLIMITED_TIER;
  });
}
