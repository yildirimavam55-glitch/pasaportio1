import { describe, expect, it } from "vitest";
import { applyLiveCheck, compareFull, normalizeCountry, type CountryCheck } from "../airalo-live";
import { matchCompetitor } from "../airalo";
import { AIRALO_COUNTRY_MATCH_REQUIRED, AIRALO_DESTINATIONS, AIRALO_DESTINATION_NOT_FOUND, AIRALO_SPECIAL_DESTINATIONS } from "../airalo-destinations";
import type { CompetitorPrice } from "../competitive";

const ok: CountryCheck = { iso: "DE", status: "OK", source: "s", excludedVoice: 2, nonEur: [], packages: [{ key: "10|30", price: 15 }, { key: "U|7", price: 20 }] };
const failed: CountryCheck = { iso: "TR", status: "RESEARCH_FAILED", source: "s", reason: "HTTP 503" };
const extra = { notFound: [], matchRequired: [], special: [], checkedAt: "2026-10-06T00:00:00Z" };
const stored = (key: string, price: number): CompetitorPrice => ({ id: key, competitor: "Airalo", iso: "DE", key, price, currency: "EUR", source: "s", checkedAt: "2026-10-01", verifiedAt: "2026-10-01T00:00:00Z" });

describe("full Airalo comparison", () => {
  it("unmapped territories are never guessed; Netherlands Antilles is not Curaçao", () => {
    for (const iso of [...AIRALO_COUNTRY_MATCH_REQUIRED, ...AIRALO_DESTINATION_NOT_FOUND, ...Object.keys(AIRALO_SPECIAL_DESTINATIONS)]) expect(AIRALO_DESTINATIONS[iso]).toBeUndefined();
    expect(AIRALO_COUNTRY_MATCH_REQUIRED).toContain("AN");
    const slugs = Object.values(AIRALO_DESTINATIONS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("Caribbean Netherlands keeps three separate Airalo destinations", () => {
    expect(AIRALO_SPECIAL_DESTINATIONS["BQ"]?.map((p) => p.label)).toEqual(["Bonaire", "Saba", "Sint Eustatius"]);
  });
  it("computes difference and margin; Unlimited only matches same duration", () => {
    const r = compareFull([ok], [
      { iso: "DE", key: "10|30", cost: 6.44, price: 12.99, minMargin: 25 },
      { iso: "DE", key: "U|10", cost: 10, price: 30, minMargin: 25 },
    ], [], extra);
    expect(r.summary.comparable).toBe(1);
    expect(r.summary.cheaper).toBe(1);
    expect(r.summary.notOfferedPkgs).toBe(1);
    expect(r.summary.unknownPkgs).toBe(0);
  });
  it("failed country is research-failed, never not-offered or unknown", () => {
    const r = compareFull([failed], [{ iso: "TR", key: "10|30", cost: 5, price: 10, minMargin: 25 }], [], extra);
    expect(r.summary.notOfferedPkgs).toBe(0);
    expect(r.summary.researchFailedPkgs).toBe(1);
    expect(r.countries[0]?.retrieval).toBe("RESEARCH_FAILED");
  });
  it("mapping destinations are not counted as unknown", () => {
    const r = compareFull([], [{ iso: "BQ", key: "1|7", cost: 1, price: 2, minMargin: 25 }, { iso: "AN", key: "1|7", cost: 1, price: 2, minMargin: 25 }], [], { ...extra, matchRequired: ["AN"], special: ["BQ"] });
    expect(r.summary.unknownPkgs).toBe(0);
    expect(r.summary.specialMappingPkgs).toBe(1);
    expect(r.summary.matchRequiredPkgs).toBe(1);
  });
  it("a country is counted once even if checked twice", () => {
    const r = compareFull([ok, ok], [], [], extra);
    expect(r.summary.countriesRetrieved).toBe(1);
  });
  it("cheaper but low margin is a separate status", () => {
    const r = compareFull([ok], [{ iso: "DE", key: "10|30", cost: 11, price: 13, minMargin: 25 }], [], extra);
    expect(r.summary.cheaperLowMargin).toBe(1);
    expect(r.lowMarginList).toHaveLength(1);
  });
  it("absent package is kept as possibly removed, history intact, and no longer a benchmark", () => {
    const prior = { ...stored("5|30", 9), priceHistory: [{ price: 10, currency: "EUR", checkedAt: "2026-09-01" }] };
    const r = compareFull([ok], [], [prior], extra);
    expect(r.removed).toHaveLength(1);
    const { entries } = applyLiveCheck([ok], [prior], {}, "2026-10-06T10:00:00Z", () => "n");
    const kept = entries.find((e) => e.key === "5|30")!;
    expect(kept.price).toBe(9);
    expect(kept.priceHistory).toHaveLength(1);
    expect(kept.possiblyRemoved?.checks).toBe(1);
    expect(matchCompetitor("5|30", entries).entry).toBeNull();
    const again = applyLiveCheck([ok], entries, {}, "2026-10-07T10:00:00Z", () => "n").entries.find((e) => e.key === "5|30")!;
    expect(again.possiblyRemoved?.checks).toBe(2);
    expect(again.possiblyRemoved?.since).toBe("2026-10-06T10:00:00Z");
    const back = applyLiveCheck([{ ...ok, packages: [...(ok.status === "OK" ? ok.packages : []), { key: "5|30", price: 9 }] }], entries, {}, "2026-10-08T10:00:00Z", () => "n").entries.find((e) => e.key === "5|30")!;
    expect(back.possiblyRemoved).toBeUndefined();
  });
  it("multiple matching offers keep the lowest as benchmark and retain alternatives", () => {
    const pkg = (id: string, price: number, promotions = "[]") => ({ id, title: "5 GB - 30 days", day: 30, is_unlimited: false, amount: 5120, price: { amount: price, currency: { code: "EUR" } }, promotions });
    const html = `<script id="__NUXT_DATA__" type="application/json">${JSON.stringify(nuxt([pkg("a", 12), pkg("b", 10)]))}</script>`;
    const c = normalizeCountry("DE", "s", html, null);
    expect(c.status).toBe("OK");
    if (c.status === "OK") expect(c.packages[0]).toMatchObject({ key: "5|30", price: 10, offers: 2, alternatives: [12] });
  });
});

/** Minimal Nuxt devalue-style payload: every value referenced by index. */
function nuxt(objs: Record<string, unknown>[]) {
  const raw: unknown[] = [];
  const put = (v: unknown): number => {
    if (v && typeof v === "object" && !Array.isArray(v)) { const i = raw.push(null) - 1; raw[i] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, put(x)])); return i; }
    if (v === "[]") return raw.push([]) - 1;
    return raw.push(v) - 1;
  };
  objs.forEach(put);
  return raw;
}
