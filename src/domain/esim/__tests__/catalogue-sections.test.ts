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
  expect(c.recommended + c.standard + c.unlimited + c.broaderCoverage).toBe(c.unique);
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

  it("TEST 2: unlimited global appears only under unlimited", () => {
    const sections = buildCatalogueSections(
      [
        pkg({ id: "local-2", dataGb: 2 }),
        pkg({ id: "uni-global", unlimited: true, dataGb: null, coverage: ["TR", "DE", "US"], scope: "GLOBAL" }),
      ],
      input,
    );
    expect(sectionOf(sections, "uni-global")).toEqual(["UNLIMITED"]);
    assertInvariant(sections);
  });

  it("TEST 3: a recommended standard package is not repeated below", () => {
    const sections = buildCatalogueSections([pkg({ id: "a", dataGb: 2 }), pkg({ id: "b", dataGb: 10 })], {
      ...input,
      recommendedId: "b",
    });
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
      [pkg({ id: "local", dataGb: 5 }), pkg({ id: "eu", dataGb: 20, coverage: ["TR", "DE", "FR"], scope: "REGION" })],
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
        pkg({ id: `${iso}-u`, unlimited: true, dataGb: null, coverage: [iso], providerProductId: `${iso}-u` }),
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
      expect(sectionOf(sections, `${iso}-glob-u`)).toEqual(["UNLIMITED"]);
      expect(sectionOf(sections, `${iso}-glob`)).toEqual(["BROADER"]);
    }
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
      pkg({ id: "globu", unlimited: true, dataGb: null, coverage: ["TR", "US"], scope: "GLOBAL", salePrice: 50 }),
      pkg({ id: "glob50", dataGb: 50, coverage: ["TR", "US"], scope: "GLOBAL" }),
    ];
    const sections = buildCatalogueSections(catalogue, { ...input, days: 7, recommendedId: "tr10" });
    expect(sections.recommended?.id).toBe("tr10");
    expect(sections.standard.map((p) => p.id)).toEqual(["tr2", "tr5", "tr20"]);
    expect(sections.unlimited.map((p) => p.id)).toEqual(["tru7", "tru30", "globu"]);
    expect(sections.broaderCoverage.map((p) => p.id)).toEqual(["glob50", "eu20"]);
    assertInvariant(sections);
  });
});
