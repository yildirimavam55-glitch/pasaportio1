import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountry, getCountryByIso, searchCountries } from "@/domain/geo/countries";
import { searchAirports } from "@/domain/geo/airports";

const firstIso = (query: string) => searchCountries(query)[0]?.iso;

describe("global country directory", () => {
  it("covers the world with stable identifiers and localized names", () => {
    expect(COUNTRIES.length).toBeGreaterThan(150);
    const turkey = getCountryByIso("tr");
    expect(turkey?.id).toBe("country-tr");
    expect(turkey?.flag).toBe("🇹🇷");
    expect(turkey?.name.de).toBeTruthy();
    expect(turkey?.name.en).toBeTruthy();
    expect(getCountry("country-jp")?.name.tr).toBe("Japonya");
  });

  it("searches by localized name, English name, ISO code and alias", () => {
    expect(firstIso("Türkiye")).toBe("TR");
    expect(firstIso("turkey")).toBe("TR");
    expect(firstIso("TR")).toBe("TR");
    expect(firstIso("Almanya")).toBe("DE");
    expect(firstIso("Deutschland")).toBe("DE");
    expect(firstIso("germany")).toBe("DE");
    expect(firstIso("DE")).toBe("DE");
    expect(firstIso("Japonya")).toBe("JP");
    expect(firstIso("japan")).toBe("JP");
    expect(firstIso("jp")).toBe("JP");
  });

  it("ignores case and accents and returns nothing for nonsense", () => {
    expect(firstIso("turkiye")).toBe("TR");
    expect(firstIso("FRANSA")).toBe("FR");
    expect(searchCountries("zzzzqq")).toHaveLength(0);
  });
});

describe("airport search", () => {
  it("finds airports by IATA, city and airport name", () => {
    expect(searchAirports("FRA")[0]?.id).toBe("airport-fra");
    expect(searchAirports("frankfurt")[0]?.countryIso).toBe("DE");
    expect(searchAirports("IST")[0]?.iata).toBe("IST");
    expect(searchAirports("istanbul")[0]?.countryIso).toBe("TR");
    expect(searchAirports("düsseldorf")[0]?.iata).toBe("DUS");
  });
});

describe("country search relevance", () => {
  it.each([
    ["Tür", "tr", "TR"], ["Türk", "tr", "TR"], ["Turkiye", "tr", "TR"], ["Tür", "de", "TR"], ["Turkei", "de", "TR"],
    ["Tur", "en", "TR"], ["Turkey", "en", "TR"], ["Italya", "tr", "IT"], ["Italien", "de", "IT"],
    ["Avusturya", "tr", "AT"], ["Osterreich", "de", "AT"], ["Germany", "en", "DE"],
  ] as const)("%s (%s) ranks %s first", (query, locale, iso) => {
    expect(searchCountries(query, 5, locale)[0]?.iso).toBe(iso);
  });
});
