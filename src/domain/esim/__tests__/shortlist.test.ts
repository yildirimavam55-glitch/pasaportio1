import { describe, expect, it } from "vitest";

import { buildCustomerShortlist } from "../shortlist";
import { coverageScopeOf, type MatchablePackage } from "../package-matching";

type Pkg = MatchablePackage;

let seq = 0;
const pkg = (partial: Partial<Pkg> & { coverage: string[] }): Pkg => ({
  id: `p${(seq += 1)}`,
  dataGb: null,
  unlimited: false,
  validityDays: 30,
  salePrice: 10,
  ...partial,
});

/** A realistic Turkey-shaped catalogue: many sizes, validities and duplicates. */
function turkeyCatalogue(): Pkg[] {
  const sizes = [1, 2, 3, 5, 10, 20, 50];
  const validities = [7, 15, 30];
  const capped: Pkg[] = [];
  for (const size of sizes) {
    for (const validity of validities) {
      // Two near-identical variants per size/validity, like the supplier feed.
      capped.push(pkg({ coverage: ["TR"], dataGb: size, validityDays: validity, salePrice: size * 2 + validity / 10 }));
      capped.push(pkg({ coverage: ["TR"], dataGb: size, validityDays: validity, salePrice: size * 2 + validity / 10 + 1 }));
    }
  }
  const unlimited = [7, 10, 15, 30].flatMap((validity) => [
    pkg({ coverage: ["TR"], unlimited: true, validityDays: validity, salePrice: validity }),
    pkg({ coverage: ["TR"], unlimited: true, validityDays: validity, salePrice: validity + 3 }),
    pkg({ coverage: ["TR"], unlimited: true, validityDays: validity, salePrice: validity + 5 }),
  ]);
  const regional = [5, 10].map((size) =>
    pkg({ coverage: ["TR", "GR", "BG", "RO", "DE"], dataGb: size, validityDays: 30, salePrice: size * 4 }),
  );
  const global = [5, 20].map((size) =>
    pkg({
      coverage: [...Array.from({ length: 60 }, (_, index) => `X${index}`), "TR", "DE", "FR"],
      dataGb: size,
      validityDays: 30,
      salePrice: size * 6,
    }),
  );
  return [...capped, ...unlimited, ...regional, ...global];
}

describe("buildCustomerShortlist", () => {
  it("A) Turkey / 10 days / 1 GB returns at most 5 primary cards", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 1, coverageIsos: ["TR"], days: 10 });
    expect(result.primary.length).toBeLessThanOrEqual(5);
    expect(result.primary.length).toBeGreaterThanOrEqual(3);
    expect(result.eligibleCount).toBeGreaterThan(result.primary.length);
    // Diversified, not five copies of the same size.
    const sizes = result.primary.map((entry) => (entry.package.unlimited ? "UNL" : entry.package.dataGb));
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it("B) keeps regional/global out of the primary list when country products exist", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 1, coverageIsos: ["TR"], days: 10 });
    expect(result.scope).toBe("SINGLE_COUNTRY");
    for (const entry of result.primary) expect(coverageScopeOf(entry.package)).toBe("SINGLE_COUNTRY");
    expect(result.widerCoverage.length).toBeLessThanOrEqual(2);
  });

  it("C) falls back to regional when no country-only product fits", () => {
    const catalogue = [
      pkg({ coverage: ["TR"], dataGb: 1, validityDays: 30, salePrice: 5 }),
      pkg({ coverage: ["TR", "GR", "BG"], dataGb: 5, validityDays: 30, salePrice: 14 }),
      pkg({ coverage: ["TR", "GR", "BG"], dataGb: 10, validityDays: 30, salePrice: 20 }),
    ];
    const result = buildCustomerShortlist(catalogue, { requiredGb: 5, coverageIsos: ["TR"], days: 10 });
    expect(result.scope).toBe("REGIONAL");
    expect(result.primary[0]!.package.dataGb).toBe(5);
  });

  it("D) selects regional/global products for a multi-country route", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 3, coverageIsos: ["TR", "DE"], days: 10 });
    expect(result.scope).not.toBe("SINGLE_COUNTRY");
    expect(result.primary.length).toBeGreaterThan(0);
    for (const entry of result.primary) {
      expect(entry.package.coverage).toContain("TR");
      expect(entry.package.coverage).toContain("DE");
    }
  });

  it("E) shows at most one unlimited card and hides the other variants", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 1, coverageIsos: ["TR"], days: 10 });
    const unlimitedPrimary = result.primary.filter((entry) => entry.package.unlimited);
    expect(unlimitedPrimary).toHaveLength(1);
    expect(result.moreUnlimited.length).toBeGreaterThan(0);
    for (const extra of result.moreUnlimited) expect(extra.unlimited).toBe(true);
  });

  it("F) excludes packages that expire before the trip ends", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 1, coverageIsos: ["TR"], days: 10 });
    const shown = [...result.primary.map((entry) => entry.package), ...result.moreUnlimited, ...result.widerCoverage];
    for (const item of shown) expect(item.validityDays).toBeGreaterThanOrEqual(10);
  });

  it("never recommends less data than required", () => {
    const result = buildCustomerShortlist(turkeyCatalogue(), { requiredGb: 5, coverageIsos: ["TR"], days: 10 });
    for (const entry of result.primary) {
      if (!entry.package.unlimited) expect(entry.package.dataGb).toBeGreaterThanOrEqual(5);
    }
  });

  it("returns an empty shortlist instead of inventing a product", () => {
    const result = buildCustomerShortlist([], { requiredGb: 2, coverageIsos: ["JP"], days: 5 });
    expect(result.primary).toHaveLength(0);
    expect(result.scope).toBeNull();
  });
});
