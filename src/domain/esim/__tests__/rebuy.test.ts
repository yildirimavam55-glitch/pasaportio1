import { describe, expect, it } from "vitest";
import { canOfferTopUp, rebuyTarget } from "../rebuy";

describe("rebuyTarget", () => {
  it("opens the original country with the same plan suggested", () => {
    expect(rebuyTarget({ productId: "p1", destinationIso: "tr", coverageIsos: ["TR"] })).toEqual({ country: "TR", plan: "p1" });
  });
  it("opens only the country catalogue when the product is unknown", () => {
    expect(rebuyTarget({ destinationIso: "DE", coverageIsos: [] })).toEqual({ country: "DE" });
  });
  it("falls back to the plain catalogue without a country", () => {
    expect(rebuyTarget(null)).toEqual({ country: "" });
    expect(rebuyTarget({ productId: "p", destinationIso: null, coverageIsos: ["DE", "FR"] })).toEqual({ country: "" });
  });
});

describe("canOfferTopUp", () => {
  it("hides top-up without a verified catalogue link even if supported", () => {
    expect(canOfferTopUp(true)).toBe(false);
  });
  it("needs both provider support and a catalogue link", () => {
    expect(canOfferTopUp(true, true)).toBe(true);
    expect(canOfferTopUp(false, true)).toBe(false);
  });
});
