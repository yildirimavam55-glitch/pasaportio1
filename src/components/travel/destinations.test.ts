import { describe, expect, it } from "vitest";

import { getCountryVisual } from "./countryVisuals";
import { countryPhotoRegistry, getCountryPhoto } from "./countryPhotos";
import { SUPPORTED_STOREFRONT_COUNTRY_ISOS } from "./supported-country-isos";
import { getCountryByIso } from "@/domain/geo/countries";
import { classifyCoverageRegion, regionOfCountry } from "@/domain/geo/coverage-regions";

const LOCALES = ["tr", "de", "en"] as const;

describe("destination system coverage", () => {
  it("has no duplicate supported ISO codes", () => {
    const unique = new Set(SUPPORTED_STOREFRONT_COUNTRY_ISOS);
    expect(unique.size).toBe(SUPPORTED_STOREFRONT_COUNTRY_ISOS.length);
  });

  it.each(SUPPORTED_STOREFRONT_COUNTRY_ISOS)("country %s has one visual identity", (iso) => {
    expect(getCountryVisual(iso)).toBeDefined();
  });

  it("has exactly one real photo for every supported destination", () => {
    const mapped = Object.keys(countryPhotoRegistry);
    expect(mapped).toHaveLength(SUPPORTED_STOREFRONT_COUNTRY_ISOS.length);
    expect(new Set(mapped).size).toBe(mapped.length);
    expect(SUPPORTED_STOREFRONT_COUNTRY_ISOS.filter((iso) => !getCountryPhoto(iso))).toEqual([]);
  });

  it.each(SUPPORTED_STOREFRONT_COUNTRY_ISOS)("country %s resolves to a CDN photo", (iso) => {
    const photo = getCountryPhoto(iso);
    expect(photo?.cardImage).toMatch(/^\/__l5e\/assets-v1\/.+\.webp$/);
    expect(photo?.heroImage).toBe(photo?.cardImage);
    expect(photo?.alt.tr).toBeTruthy();
    expect(photo?.alt.de).toBeTruthy();
    expect(photo?.alt.en).toBeTruthy();
  });

  it.each(SUPPORTED_STOREFRONT_COUNTRY_ISOS)("country %s has a region bucket", (iso) => {
    expect(regionOfCountry(iso)).toBeTruthy();
  });

  it("resolves localized names for every canonical supported country", () => {
    const missing = SUPPORTED_STOREFRONT_COUNTRY_ISOS.filter((iso) => {
      const country = getCountryByIso(iso);
      if (!country) return false; // supplier territories keep their ISO label
      return LOCALES.some((locale) => !country.name[locale]);
    });
    expect(missing).toEqual([]);
  });

  it("classifies multi-country coverage generically", () => {
    expect(classifyCoverageRegion(["DE"])).toBeNull();
    expect(classifyCoverageRegion(["DE", "FR", "IT", "ES"])).toBe("EUROPE");
    expect(classifyCoverageRegion(["AE", "SA", "QA", "KW"])).toBe("MIDDLE_EAST");
    expect(classifyCoverageRegion(["JP", "KR", "TH", "VN"])).toBe("ASIA");
    expect(classifyCoverageRegion(SUPPORTED_STOREFRONT_COUNTRY_ISOS.slice(0, 60))).toBe("GLOBAL");
  });
});
