import { describe, expect, it, vi } from "vitest";

import {
  countryVisuals,
  getCountryCardPresentation,
  missingCountryVisualMappings,
} from "./CountryMotif";
import { SUPPORTED_STOREFRONT_COUNTRY_ISOS } from "./supported-country-isos";

describe("country card presentation", () => {
  it("maps every currently supported storefront country", () => {
    const mapped = new Set(Object.keys(countryVisuals));
    const missing = SUPPORTED_STOREFRONT_COUNTRY_ISOS.filter((iso) => !mapped.has(iso));

    expect(SUPPORTED_STOREFRONT_COUNTRY_ISOS).toHaveLength(191);
    expect(mapped.size).toBe(191);
    expect(missing).toEqual([]);
    expect(missingCountryVisualMappings).toEqual([]);
  });

  it.each(["DE", "TR", "JP", "FR", "US", "GB", "IT", "ES", "GR", "AE", "TH", "BR", "AU"])(
    "uses a symbolic card for supported country %s",
    (iso) => {
      expect(getCountryCardPresentation(iso, 1)).toBe("symbolic-single-country");
    },
  );

  it("uses the minimal fallback only for a future unknown single country", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(getCountryCardPresentation("ZZ", 1)).toBe("minimal-single-country");
    warning.mockRestore();
  });

  it("keeps regional and global products neutral", () => {
    expect(getCountryCardPresentation("DE", 27)).toBe("neutral-multi-country");
    expect(getCountryCardPresentation(undefined, 0)).toBe("neutral-multi-country");
  });
});
