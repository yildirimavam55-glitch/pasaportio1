import { describe, expect, it } from "vitest";
import { rankForCountry, relationFieldsOf, resolveCommercial, type LiveCatalogue } from "../relations";

const live: LiveCatalogue = { esimCountries: new Set(["IT", "JP", "DE"]), esimRegions: new Set(["EUROPE"]), loungeForSale: true, vignetteForSale: false };
const f = (row: any) => relationFieldsOf(row);

describe("resolveCommercial", () => {
  it("auto-connects country eSIM guides to live destinations", () => {
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "IT" }), live)?.path).toBe("/esim?country=IT");
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "JP" }), live)?.source).toBe("auto");
  });
  it("connects region to an existing regional destination", () => {
    expect(resolveCommercial(f({ rel_service: "ESIM", rel_region: "EUROPE" }), live)?.path).toBe("/esim/bolge/EUROPE");
    expect(resolveCommercial(f({ rel_service: "ESIM", rel_region: "AFRICA" }), live)).toBeNull();
  });
  it("never invents a destination", () => {
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "ZZ" }), live)).toBeNull();
  });
  it("respects auto off and manual override", () => {
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "IT", auto_relation: false }), live)).toBeNull();
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "IT", rel_esim_destination: "JP" }), live)?.iso).toBe("JP");
    expect(resolveCommercial(f({ rel_service: "ESIM", country_iso: "IT", rel_commercial_page: "/esim?country=DE" }), live)?.source).toBe("manual");
  });
  it("respects the vignette kill switch", () => {
    expect(resolveCommercial(f({ rel_service: "VIGNETTE", country_iso: "AT" }), live)).toBeNull();
  });
});

describe("rankForCountry", () => {
  const item = (id: string, row: any, contentType = "ARTICLE") => {
    const fields = f(row);
    return { id, fields, contentType, target: resolveCommercial(fields, live) };
  };
  it("orders by relevance tier then priority and never pads", () => {
    const out = rankForCountry(
      [
        item("global", { rel_service: "ESIM" }),
        item("it", { rel_service: "ESIM", country_iso: "IT" }),
        item("itFeat", { rel_service: "ESIM", country_iso: "IT", featured: true }),
        item("jp", { rel_service: "ESIM", country_iso: "JP" }),
        item("rome", { rel_service: "ESIM", rel_type: "CITY", country_iso: "IT" }, "CITY"),
        item("eu", { rel_service: "ESIM", rel_region: "EUROPE" }),
        item("hidden", { rel_service: "ESIM", country_iso: "IT", show_on_commercial: false }),
      ],
      "IT",
    ).map((x) => x.id);
    expect(out).toEqual(["itFeat", "it", "rome", "eu"]);
    expect(rankForCountry([item("jp", { rel_service: "ESIM", country_iso: "JP" })], "IT")).toHaveLength(0);
  });
});
