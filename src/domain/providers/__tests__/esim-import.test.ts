import { describe, expect, it } from "vitest";

import { buildDiff, hashItem, missingExternalIds, parseEsimCatalogue, priceItems } from "../esim-import";

const sample = [
  {
    externalId: "TR-10GB-30",
    name: "Türkiye 10GB 30 gün",
    dataGb: 10,
    validityDays: 30,
    coverage: ["TR"],
    providerCost: 5.1,
    currency: "EUR",
    supportsHotspot: true,
  },
  {
    external_id: "EU-20GB-30",
    title: "Avrupa 20GB",
    data_gb: 20,
    validity_days: 30,
    countries: "DE,FR,IT,ES",
    cost: 9.4,
  },
];

describe("provider eSIM import", () => {
  it("normalizes real provider fields and derives package kind", () => {
    const { items, issues } = parseEsimCatalogue(sample);
    expect(issues).toHaveLength(0);
    expect(items).toHaveLength(2);
    expect(items[0]!.packageKind).toBe("COUNTRY");
    expect(items[1]!.coverage).toEqual(["DE", "FR", "IT", "ES"]);
    expect(items[1]!.packageKind).toBe("REGION");
  });

  it("rejects incomplete records instead of inventing data", () => {
    const { items, issues } = parseEsimCatalogue([{ externalId: "X", name: "No cost", dataGb: 1, validityDays: 7, coverage: ["TR"] }]);
    expect(items).toHaveLength(0);
    expect(issues[0]!.message).toContain("maliyeti");
  });

  it("applies the pricing rule and flags margin below minimum", () => {
    const { items } = parseEsimCatalogue(sample);
    const priced = priceItems(items, { strategy: "MARKUP_PERCENT", markupPercent: 5, minimumMarginPercent: 30, currency: "EUR" }, "demo");
    expect(priced[0]!.salePrice).toBeGreaterThan(priced[0]!.providerCost);
    expect(priced[0]!.belowMinimumMargin).toBe(true);
    expect(priced[0]!.slug).toBe("esim-demo-tr-10gb-30");
  });

  it("is idempotent: the same export twice produces no changes", () => {
    const { items } = parseEsimCatalogue(sample);
    const priced = priceItems(items, { strategy: "MARKUP_PERCENT", markupPercent: 60, currency: "EUR" }, "demo");
    const existing = priced.map((item) => ({ externalId: item.externalId, providerCost: item.providerCost, hash: hashItem(item) }));
    expect(buildDiff(priced, existing).every((row) => row.status === "UNCHANGED")).toBe(true);
  });

  it("detects new, updated and missing provider items", () => {
    const { items } = parseEsimCatalogue(sample);
    const priced = priceItems(items, { strategy: "MARKUP_PERCENT", markupPercent: 60, currency: "EUR" }, "demo");
    const existing = [
      { externalId: "TR-10GB-30", providerCost: 4, hash: "stale" },
      { externalId: "OLD-5GB", providerCost: 3, hash: "x" },
    ];
    const diff = buildDiff(priced, existing);
    expect(diff.find((row) => row.externalId === "TR-10GB-30")!.status).toBe("UPDATED");
    expect(diff.find((row) => row.externalId === "EU-20GB-30")!.status).toBe("NEW");
    expect(missingExternalIds(priced, existing)).toEqual(["OLD-5GB"]);
  });
});
