import { describe, expect, it } from "vitest";
import { compareFull, type CountryCheck } from "../airalo-live";
import { AIRALO_COUNTRY_MATCH_REQUIRED, AIRALO_DESTINATIONS, AIRALO_DESTINATION_NOT_FOUND } from "../airalo-destinations";

const ok: CountryCheck = { iso: "DE", status: "OK", source: "s", excludedVoice: 2, nonEur: [], packages: [{ key: "10|30", price: 15 }, { key: "U|7", price: 20 }] };
const failed: CountryCheck = { iso: "TR", status: "RESEARCH_FAILED", source: "s", reason: "HTTP 503" };

describe("full Airalo comparison", () => {
  it("unmapped territories are never guessed", () => {
    for (const iso of [...AIRALO_COUNTRY_MATCH_REQUIRED, ...AIRALO_DESTINATION_NOT_FOUND]) expect(AIRALO_DESTINATIONS[iso]).toBeUndefined();
  });
  it("computes difference and margin; Unlimited only matches same duration", () => {
    const r = compareFull([ok], [
      { iso: "DE", key: "10|30", cost: 6.44, price: 12.99, minMargin: 25 },
      { iso: "DE", key: "U|10", cost: 10, price: 30, minMargin: 25 },
    ], [], { notFound: [], matchRequired: [] });
    expect(r.summary.comparable).toBe(1);
    expect(r.summary.cheaper).toBe(1);
    expect(r.summary.notOfferedPkgs).toBe(1);
  });
  it("failed country is unknown, never €0 or not offered", () => {
    const r = compareFull([failed], [{ iso: "TR", key: "10|30", cost: 5, price: 10, minMargin: 25 }], [], { notFound: [], matchRequired: [] });
    expect(r.summary.notOfferedPkgs).toBe(0);
    expect(r.summary.unknownPkgs).toBe(1);
    expect(r.countries[0]?.retrieval).toBe("RESEARCH_FAILED");
  });
  it("cheaper but low margin is a separate status", () => {
    const r = compareFull([ok], [{ iso: "DE", key: "10|30", cost: 11, price: 13, minMargin: 25 }], [], { notFound: [], matchRequired: [] });
    expect(r.summary.cheaperLowMargin).toBe(1);
    expect(r.lowMarginList).toHaveLength(1);
  });
});
