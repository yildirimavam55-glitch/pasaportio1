import { describe, expect, it } from "vitest";

import { getCountryCardPresentation } from "./CountryMotif";

describe("country card presentation", () => {
  it.each(["DE", "JP", "FR", "TR"])("uses a symbolic card for mapped country %s", (iso) => {
    expect(getCountryCardPresentation(iso, 1)).toBe("symbolic-single-country");
  });

  it("uses the minimal fallback for an unmapped single country", () => {
    expect(getCountryCardPresentation("LI", 1)).toBe("minimal-single-country");
  });

  it("keeps regional and global products neutral", () => {
    expect(getCountryCardPresentation("DE", 27)).toBe("neutral-multi-country");
    expect(getCountryCardPresentation(undefined, 0)).toBe("neutral-multi-country");
  });
});