import { describe, expect, it } from "vitest";
import { DEFAULT_USAGE_SETTINGS, estimateUsageNeed, sanitizeUsageSettings } from "../usage-recommendation";
import { resolvePackageRecommendation, selectRecommendedPackage, type MatchablePackage } from "../package-matching";

const pkg = (id: string, dataGb: number | null, extra: Partial<MatchablePackage> = {}): MatchablePackage => ({
  id,
  dataGb,
  unlimited: false,
  validityDays: null,
  coverage: ["TR"],
  salePrice: 10,
  ...extra,
});

describe("eSIM usage need estimation", () => {
  it("separates estimate, safety-adjusted and required need", () => {
    const result = estimateUsageNeed({ days: 10, usage: ["MESSAGING", "SOCIAL", "MAPS"] }, DEFAULT_USAGE_SETTINGS);
    expect(result.estimatedGb).toBeGreaterThan(0);
    expect(result.safetyAdjustedGb).toBeGreaterThanOrEqual(result.estimatedGb);
    expect(result.requiredGb).toBeGreaterThanOrEqual(result.safetyAdjustedGb);
  });

  it("never falls below the configured minimum", () => {
    const result = estimateUsageNeed({ days: 1, usage: [] }, { ...DEFAULT_USAGE_SETTINGS, minimumRecommendedGb: 3 });
    expect(result.requiredGb).toBeGreaterThanOrEqual(3);
  });

  it("falls back to safe defaults for invalid configuration", () => {
    const settings = sanitizeUsageSettings({ perDayMb: { VIDEO: -50 }, safetyBufferPercent: 900, intensityMultipliers: { NORMAL: 0 } });
    expect(settings.perDayMb.VIDEO).toBe(DEFAULT_USAGE_SETTINGS.perDayMb.VIDEO);
    expect(settings.safetyBufferPercent).toBe(DEFAULT_USAGE_SETTINGS.safetyBufferPercent);
    expect(settings.intensityMultipliers.NORMAL).toBe(1);
  });
});

describe("catalogue package matching", () => {
  it("picks the smallest sufficient available package", () => {
    const result = selectRecommendedPackage([pkg("a", 5), pkg("b", 10), pkg("c", 20), pkg("d", 50)], { requiredGb: 17.5, coverageIsos: ["TR"] });
    expect(result?.dataGb).toBe(20);
  });

  it("uses the next available size even when it is much larger", () => {
    const result = selectRecommendedPackage([pkg("a", 10), pkg("b", 50)], { requiredGb: 17.5 });
    expect(result?.dataGb).toBe(50);
  });

  it("returns nothing when no product covers the route or the need", () => {
    expect(selectRecommendedPackage([pkg("a", 10)], { requiredGb: 17.5 })).toBeNull();
    expect(selectRecommendedPackage([pkg("a", 50, { coverage: ["DE"] })], { requiredGb: 5, coverageIsos: ["TR"] })).toBeNull();
  });

  it("respects validity and prefers the cheaper of equal sizes", () => {
    expect(selectRecommendedPackage([pkg("a", 20, { validityDays: 7 })], { requiredGb: 5, days: 30 })).toBeNull();
    const result = selectRecommendedPackage([pkg("a", 20, { salePrice: 40 }), pkg("b", 20, { salePrice: 25 })], { requiredGb: 5 });
    expect(result?.id).toBe("b");
  });
});

describe("automatic round-up to the next available package", () => {
  const sizes = (list: number[]) => list.map((gb, i) => pkg(`p${i}-${gb}`, gb));

  it("rounds up to the smallest sufficient available size", () => {
    expect(resolvePackageRecommendation(sizes([1, 3, 5, 10, 20]), { requiredGb: 3.9 }).package?.dataGb).toBe(5);
    expect(resolvePackageRecommendation(sizes([5, 10, 20]), { requiredGb: 8 }).package?.dataGb).toBe(10);
    expect(resolvePackageRecommendation(sizes([5, 10, 20, 50]), { requiredGb: 17 }).package?.dataGb).toBe(20);
  });

  it("accepts an exact match instead of upselling", () => {
    expect(resolvePackageRecommendation(sizes([10, 20, 50]), { requiredGb: 20 }).package?.dataGb).toBe(20);
    expect(resolvePackageRecommendation(sizes([10, 20, 50]), { requiredGb: 21 }).package?.dataGb).toBe(50);
  });

  it("prefers the cheapest of equivalent same-size products", () => {
    const result = resolvePackageRecommendation(
      [pkg("a", 20, { salePrice: 21.5 }), pkg("b", 20, { salePrice: 18.9 })],
      { requiredGb: 17 },
    );
    expect(result.package?.id).toBe("b");
  });

  it("reports the states instead of inventing or undersizing a product", () => {
    expect(resolvePackageRecommendation([], { requiredGb: 17 }).status).toBe("NO_CATALOGUE");
    const short = resolvePackageRecommendation(sizes([5, 10, 20, 50]), { requiredGb: 60 });
    expect(short.status).toBe("NO_SUFFICIENT");
    expect(short.package).toBeNull();
    const unlimited = resolvePackageRecommendation([pkg("u", null, { unlimited: true })], { requiredGb: 60 });
    expect(unlimited.status).toBe("UNLIMITED_ALTERNATIVE");
  });

  it("checks coverage and validity before matching size", () => {
    expect(
      resolvePackageRecommendation([pkg("a", 20, { coverage: ["DE"] })], { requiredGb: 17, coverageIsos: ["DE", "TR"] }).status,
    ).toBe("NO_CATALOGUE");
    expect(
      resolvePackageRecommendation([pkg("a", 20, { validityDays: 7 })], { requiredGb: 17, days: 30 }).status,
    ).toBe("NO_CATALOGUE");
    expect(
      resolvePackageRecommendation([pkg("a", 10, { coverage: ["DE", "TR"] }), pkg("b", 20, { coverage: ["DE", "TR"] })], {
        requiredGb: 17,
        coverageIsos: ["DE", "TR"],
      }).package?.dataGb,
    ).toBe(20);
  });
});
