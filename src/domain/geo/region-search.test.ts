import { describe, expect, it } from "vitest";
import { searchPublishedRegions } from "./region-search";
import type { EsimRegionalSummary } from "@/lib/esim-catalogue.functions";

const region = (name: EsimRegionalSummary["region"], coverageIsos: string[]): EsimRegionalSummary => ({ region: name, coverageIsos, standardCount: 1, unlimitedCount: 0, lowestStandardPrice: 2, lowestUnlimitedPrice: null, startingPrice: 2, currency: "EUR", coverageCount: coverageIsos.length, minCoverageCount: coverageIsos.length, maxCoverageCount: coverageIsos.length, maxUnlimitedCoverageCount: null });
const items = [region("GLOBAL", ["DE", "TR", "JP"]), region("EUROPE", ["DE", "FR"]), region("ASIA", ["JP"])];

describe("published regional discovery", () => {
  it("ranks an exact region above coverage-country matches", () => {
    expect(searchPublishedRegions(items, "Europe", "en").map((r) => r.region)).toEqual(["EUROPE"]);
  });
  it("finds countries only in real package coverage", () => {
    expect(searchPublishedRegions(items, "Germany", "en").map((r) => r.region)).toEqual(["EUROPE", "GLOBAL"]);
    expect(searchPublishedRegions(items, "France", "en").map((r) => r.region)).toEqual(["EUROPE"]);
    expect(searchPublishedRegions(items, "Brazil", "en")).toEqual([]);
  });
  it("supports diacritics, country aliases, and non-Latin country queries", () => {
    expect(searchPublishedRegions(items, "Türkiye", "tr").map((r) => r.region)).toEqual(["GLOBAL"]);
    expect(searchPublishedRegions(items, "日本", "en").map((r) => r.region)).toEqual(["ASIA", "GLOBAL"]);
  });
});