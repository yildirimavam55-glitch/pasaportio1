import { describe, expect, it } from "vitest";
import { coverageScopeOf, resolveTieredRecommendation, type MatchablePackage } from "@/domain/esim/package-matching";

const pkg = (id: string, dataGb: number | null, coverage: string[], extra: Partial<MatchablePackage> = {}): MatchablePackage => ({
  id,
  dataGb,
  unlimited: false,
  validityDays: 30,
  coverage,
  salePrice: 10,
  ...extra,
});

const many = (count: number) => Array.from({ length: count }, (_, index) => `C${index}`);

describe("coverage scope", () => {
  it("derives scope from real ISO coverage, never from a title", () => {
    expect(coverageScopeOf(pkg("a", 5, ["JP"]))).toBe("COUNTRY");
    expect(coverageScopeOf(pkg("b", 5, ["TH", "SG", "VN"]))).toBe("REGION");
    // Scope is supplier-declared: a wide coverage list alone is not GLOBAL.
    expect(coverageScopeOf(pkg("c", 5, [...many(60), "TH"]))).toBe("REGION");
    expect(coverageScopeOf(pkg("d", 5, [...many(60), "TH"], { scope: "GLOBAL" }))).toBe("GLOBAL");
  });
});

describe("tiered recommendation", () => {
  it("prefers a single-country product when one satisfies the need", () => {
    const result = resolveTieredRecommendation(
      [pkg("single", 10, ["JP"]), pkg("regional", 10, ["JP", "KR", "TH"])],
      { requiredGb: 4, coverageIsos: ["JP"], days: 10 },
    );
    expect(result.recommended?.id).toBe("single");
    expect(result.scope).toBe("COUNTRY");
  });

  it("falls back to a regional product when no single-country product is sufficient", () => {
    const result = resolveTieredRecommendation(
      [pkg("single", 1, ["TH"]), pkg("regional", 10, ["TH", "SG", "VN"])],
      { requiredGb: 4, coverageIsos: ["TH"], days: 10 },
    );
    expect(result.recommended?.id).toBe("regional");
    expect(result.scope).toBe("REGION");
  });

  it("falls back to a global product as the last covering tier", () => {
    const result = resolveTieredRecommendation([pkg("global", 20, [...many(60), "ZA"], { scope: "GLOBAL" })], {
      requiredGb: 4,
      coverageIsos: ["ZA"],
      days: 10,
    });
    expect(result.scope).toBe("GLOBAL");
    expect(result.recommended?.id).toBe("global");
  });

  it("never returns a product that misses the country or the trip length", () => {
    expect(
      resolveTieredRecommendation([pkg("a", 20, ["DE"])], { requiredGb: 4, coverageIsos: ["BR"], days: 5 }).status,
    ).toBe("NO_CATALOGUE");
    expect(
      resolveTieredRecommendation([pkg("a", 20, ["BR"], { validityDays: 7 })], { requiredGb: 4, coverageIsos: ["BR"], days: 30 }).status,
    ).toBe("NO_CATALOGUE");
  });

  it("offers economy and comfort options from real products only", () => {
    const result = resolveTieredRecommendation(
      [
        pkg("small", 5, ["MX"], { salePrice: 12 }),
        pkg("cheap", 5, ["MX", "US"], { salePrice: 8 }),
        pkg("large", 20, ["MX"], { salePrice: 25 }),
      ],
      { requiredGb: 4, coverageIsos: ["MX"], days: 10 },
    );
    expect(result.recommended?.id).toBe("small");
    expect(result.economy?.id).toBe("cheap");
    expect(result.comfort?.id).toBe("large");
  });

  it("uses an unlimited product only when no capped size is sufficient", () => {
    const result = resolveTieredRecommendation(
      [pkg("small", 1, ["AU"]), pkg("unl", null, ["AU"], { unlimited: true, salePrice: 30 })],
      { requiredGb: 50, coverageIsos: ["AU"], days: 10 },
    );
    expect(result.status).toBe("UNLIMITED_ALTERNATIVE");
    expect(result.recommended?.id).toBe("unl");
  });

  it("requires every route country to be covered by one product", () => {
    const route = ["DE", "AT", "SI", "HR", "RS", "BG", "TR"];
    const partial = pkg("eu", 20, ["DE", "AT", "SI", "HR"]);
    const full = pkg("euplus", 20, route);
    expect(resolveTieredRecommendation([partial], { requiredGb: 5, coverageIsos: route, days: 14 }).status).toBe("NO_CATALOGUE");
    expect(resolveTieredRecommendation([partial, full], { requiredGb: 5, coverageIsos: route, days: 14 }).recommended?.id).toBe("euplus");
  });
});
