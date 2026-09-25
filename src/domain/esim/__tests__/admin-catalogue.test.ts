import { describe, expect, it } from "vitest";
import { adminScopeOf, matchContext, resolveCountryQuery, summarizeCountries } from "../admin-catalogue";

const global = Array.from({ length: 60 }, (_, i) => String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + Math.floor(i / 26)));

describe("admin catalogue semantics", () => {
  it("counts only country products in the country count; regional/global stay separate", () => {
    const rows = [
      { country_iso: "AU", package_kind: "COUNTRY", coverage_country_isos: ["AU"], unlimited_data: false },
      { country_iso: "AU", package_kind: "COUNTRY", coverage_country_isos: ["AU"], unlimited_data: true },
      { country_iso: null, package_kind: "REGION", coverage_country_isos: ["AU", "NZ"], unlimited_data: false },
      { country_iso: null, package_kind: "REGION", coverage_country_isos: [...global, "AU"], unlimited_data: true },
    ];
    const au = summarizeCountries(rows).find((row) => row.iso === "AU")!;
    expect(au).toEqual({ iso: "AU", standard: 1, unlimited: 1, regional: 1, global: 1 });
    expect(summarizeCountries(rows).find((row) => row.iso === "NZ")).toMatchObject({ standard: 0, unlimited: 0, regional: 1 });
    expect(adminScopeOf(rows[3])).toBe("GLOBAL");
  });

  it("resolves ISO codes and country names but not substrings like 'au' inside Austria", () => {
    const isos = ["AU", "AT", "TR", "DE", "US"];
    expect(resolveCountryQuery("AU", isos)).toBe("AU");
    expect(resolveCountryQuery("Australia", isos)).toBe("AU");
    expect(resolveCountryQuery("Avustralya", isos)).toBe("AU");
    expect(resolveCountryQuery("Türkiye", isos)).toBe("TR");
    expect(resolveCountryQuery("Deutschland", isos)).toBe("DE");
    expect(resolveCountryQuery("United States", isos)).toBe("US");
    expect(resolveCountryQuery("100GB", isos)).toBeNull();
  });

  it("labels why a product matched", () => {
    expect(matchContext({ package_kind: "REGION", coverage_country_isos: ["AU", "NZ"] }, "AU").kind).toBe("REGION");
    expect(matchContext({ package_kind: "COUNTRY", country_iso: "AU", coverage_country_isos: ["AU"] }, "AU").kind).toBe("COUNTRY");
  });
});
