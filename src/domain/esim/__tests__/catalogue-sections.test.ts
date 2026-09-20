import { describe, expect, it } from "vitest";
import { buildCatalogueSections, type CatalogueProduct } from "../catalogue-sections";

const pkg = (over: Partial<CatalogueProduct> & { id: string }): CatalogueProduct => ({
  dataGb: 5,
  unlimited: false,
  validityDays: 30,
  coverage: ["TR"],
  salePrice: 10,
  providerId: "esim-go",
  providerProductId: over.id,
  ...over,
});

const input = { requiredGb: 1, coverageIsos: ["TR"], days: 10 };

const sectionOf = (sections: ReturnType<typeof buildCatalogueSections>, id: string) =>
  [
    sections.recommended?.id === id ? "RECOMMENDED" : null,
    sections.standard.some((p) => p.id === id) ? "STANDARD" : null,
    sections.unlimited.some((p) => p.id === id) ? "UNLIMITED" : null,
    sections.broaderCoverage.some((p) => p.id === id) ? "BROADER" : null,
  ].filter(Boolean);

const assertInvariant = (sections: ReturnType<typeof buildCatalogueSections>) => {
  const c = sections.counters;
  expect(c.recommended + c.standard + c.unlimitedTotal + c.broaderCoverageTotal).toBe(c.unique);
  expect(sections.duplicates).toEqual([]);
  expect(new Set(sections.all.map((p) => p.id)).size).toBe(sections.all.length);
};


describe("buildCatalogueSections", () => {
  it("TEST 1: the same provider product id is rendered once", () => {
    const sections = buildCatalogueSections(
      [pkg({ id: "a", providerProductId: "X1" }), pkg({ id: "b", providerProductId: "X1" })],
      input,
    );
    expect(sections.counters.unique).toBe(1);
    assertInvariant(sections);
  });

  it("TEST 1b: different provider product ids with identical specs stay distinct", () => {
    const sections = buildCatalogueSections(
      [pkg({ id: "a", providerProductId: "X1" }), pkg({ id: "b", providerProductId: "X2" })],
      input,
    );
    expect(sections.counters.unique).toBe(2);
    assertInvariant(sections);
  });

  it("TEST 2: unlimited global appears only under broader coverage, never unlimited", () => {
    const sections = buildCatalogueSections(
      [
        pkg({ id: "local-2", dataGb: 2 }),
        pkg({
          id: "uni-global",
          unlimited: true,
          dataGb: null,
          coverage: ["TR", "DE", "US"],
          scope: "GLOBAL",
        }),
      ],
      input,
    );
    expect(sectionOf(sections, "uni-global")).toEqual(["BROADER"]);
    assertInvariant(sections);
  });

  it("TEST 3: a recommended standard package is not repeated below", () => {
    const sections = buildCatalogueSections(
      [pkg({ id: "a", dataGb: 2 }), pkg({ id: "b", dataGb: 10 })],
      {
        ...input,
        recommendedId: "b",
      },
    );
    expect(sectionOf(sections, "b")).toEqual(["RECOMMENDED"]);
    assertInvariant(sections);
  });

  it("TEST 4: a recommended unlimited package is not repeated under unlimited", () => {
    const sections = buildCatalogueSections(
      [pkg({ id: "u", unlimited: true, dataGb: null }), pkg({ id: "s", dataGb: 5 })],
      { ...input, recommendedId: "u" },
    );
    expect(sectionOf(sections, "u")).toEqual(["RECOMMENDED"]);
    assertInvariant(sections);
  });

  it("TEST 5: a regional capped package lands in broader coverage", () => {
    const sections = buildCatalogueSections(
      [
        pkg({ id: "local", dataGb: 5 }),
        pkg({ id: "eu", dataGb: 20, coverage: ["TR", "DE", "FR"], scope: "REGION" }),
      ],
      input,
    );
    expect(sectionOf(sections, "eu")).toEqual(["BROADER"]);
    assertInvariant(sections);
  });

  it("TEST 6: a 50 GB local package stays in standard", () => {
    const sections = buildCatalogueSections(
      [pkg({ id: "s5", dataGb: 5 }), pkg({ id: "s50", dataGb: 50, salePrice: 60 })],
      input,
    );
    expect(sectionOf(sections, "s50")).toEqual(["STANDARD"]);
    assertInvariant(sections);
  });

  it("TEST 7: membership is identical regardless of locale (classification has no locale input)", () => {
    const catalogue = [
      pkg({ id: "s2", dataGb: 2 }),
      pkg({ id: "u1", unlimited: true, dataGb: null }),
      pkg({ id: "eu", dataGb: 20, coverage: ["TR", "DE"], scope: "REGION" }),
    ];
    const first = buildCatalogueSections(catalogue, input);
    const second = buildCatalogueSections(catalogue, input);
    expect(second.all.map((p) => p.id)).toEqual(first.all.map((p) => p.id));
    expect(second.counters).toEqual(first.counters);
  });

  it("TEST 8: five countries produce no duplicates and a valid invariant", () => {
    for (const iso of ["TR", "DE", "US", "JP", "FR"]) {
      const catalogue = [
        pkg({ id: `${iso}-2`, dataGb: 2, coverage: [iso], providerProductId: `${iso}-2` }),
        pkg({ id: `${iso}-20`, dataGb: 20, coverage: [iso], providerProductId: `${iso}-20` }),
        pkg({
          id: `${iso}-u`,
          unlimited: true,
          dataGb: null,
          coverage: [iso],
          providerProductId: `${iso}-u`,
        }),
        pkg({
          id: `${iso}-glob`,
          dataGb: 50,
          coverage: [iso, "XX", "YY"],
          scope: "GLOBAL",
          providerProductId: `${iso}-glob`,
        }),
        pkg({
          id: `${iso}-glob-u`,
          unlimited: true,
          dataGb: null,
          coverage: [iso, "XX", "YY"],
          scope: "GLOBAL",
          providerProductId: `${iso}-glob-u`,
        }),
      ];
      const sections = buildCatalogueSections(catalogue, { ...input, coverageIsos: [iso] });
      assertInvariant(sections);
      expect(sections.counters.unique).toBe(5);
      expect(sectionOf(sections, `${iso}-glob-u`)).toEqual(["BROADER"]);
      expect(sectionOf(sections, `${iso}-glob`)).toEqual(["BROADER"]);
    }
  });

  it("TEST 9: unlimited holds only exact-country products and broader stays a shortlist", () => {
    const catalogue = [
      pkg({ id: "tr-u7", unlimited: true, dataGb: null, validityDays: 7 }),
      pkg({ id: "tr-u30", unlimited: true, dataGb: null, validityDays: 30, salePrice: 30 }),
      pkg({ id: "tr-5", dataGb: 5 }),
      ...Array.from({ length: 40 }, (_, index) =>
        pkg({
          id: `multi-${index}`,
          providerProductId: `multi-${index}`,
          dataGb: index % 2 ? null : 10 + index,
          unlimited: index % 2 === 1,
          coverage: ["TR", "DE", "FR"],
          scope: "REGION",
          salePrice: 20 + index,
        }),
      ),
    ];
    const sections = buildCatalogueSections(catalogue, input);
    expect(sections.unlimited.every((p) => p.coverage.join() === "TR")).toBe(true);
    expect(sections.standard.every((p) => p.coverage.join() === "TR")).toBe(true);
    expect(sections.broaderCoverage.length).toBeLessThanOrEqual(6);
    expect(sections.counters.broaderCoverageTotal).toBeGreaterThan(sections.broaderCoverage.length);
    assertInvariant(sections);
  });

  it("matches the documented expected example", () => {
    const catalogue = [
      pkg({ id: "tr2", dataGb: 2 }),
      pkg({ id: "tr5", dataGb: 5 }),
      pkg({ id: "tr10", dataGb: 10 }),
      pkg({ id: "tr20", dataGb: 20 }),
      pkg({ id: "tru7", unlimited: true, dataGb: null, validityDays: 7 }),
      pkg({ id: "tru30", unlimited: true, dataGb: null, validityDays: 30, salePrice: 40 }),
      pkg({ id: "eu20", dataGb: 20, coverage: ["TR", "DE", "FR"], scope: "REGION" }),
      pkg({
        id: "globu",
        unlimited: true,
        dataGb: null,
        coverage: ["TR", "US"],
        scope: "GLOBAL",
        salePrice: 50,
      }),
      pkg({ id: "glob50", dataGb: 50, coverage: ["TR", "US"], scope: "GLOBAL" }),
    ];
    const sections = buildCatalogueSections(catalogue, {
      ...input,
      days: 7,
      recommendedId: "tr10",
    });
    expect(sections.recommended?.id).toBe("tr10");
    expect(sections.standard.map((p) => p.id)).toEqual(["tr2", "tr5", "tr20"]);
    expect(sections.unlimited.map((p) => p.id)).toEqual(["tru7", "tru30"]);
    expect(sections.broaderCoverage.map((p) => p.id)).toEqual(["glob50", "eu20", "globu"]);
    assertInvariant(sections);
  });



  it("TEST 10: unlimited is curated to a few trip-relevant validity buckets", () => {
    const catalogue = [
      pkg({ id: "u7", unlimited: true, dataGb: null, validityDays: 7, salePrice: 12 }),
      pkg({ id: "u15a", unlimited: true, dataGb: null, validityDays: 15, salePrice: 24 }),
      pkg({ id: "u15b", unlimited: true, dataGb: null, validityDays: 15, salePrice: 44 }),
      pkg({ id: "u15c", unlimited: true, dataGb: null, validityDays: 15, salePrice: 59 }),
      pkg({ id: "u30", unlimited: true, dataGb: null, validityDays: 30, salePrice: 35 }),
      pkg({ id: "u60", unlimited: true, dataGb: null, validityDays: 60, salePrice: 114 }),
      pkg({ id: "u90", unlimited: true, dataGb: null, validityDays: 90, salePrice: 160 }),
    ];
    const sections = buildCatalogueSections(catalogue, { ...input, days: 14, recommendedId: "u30" });
    const ids = sections.unlimited.map((p) => p.id);
    expect(ids.length).toBeLessThanOrEqual(3);
    // One card per validity bucket, cheapest commercial option each.
    expect(ids).toContain("u15a");
    expect(ids).not.toContain("u15b");
    expect(ids).not.toContain("u15c");
    // Trip is 14 days: the 7-day product no longer covers it, and the far
    // pricier long-validity SKUs stay out of the first screen.
    expect(ids).not.toContain("u7");
    expect(ids).not.toContain("u90");

    expect(sections.counters.unlimitedTotal).toBeGreaterThan(ids.length);
    assertInvariant(sections);
  });
});

