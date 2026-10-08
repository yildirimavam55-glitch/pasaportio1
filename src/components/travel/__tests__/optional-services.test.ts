import { describe, expect, it } from "vitest";
import { isHiddenServiceHref } from "../ServiceAvailability";

describe("optional service visibility", () => {
  const off = { lounge: false, vignette: false };
  it("hides lounge links when lounge is disabled", () => {
    expect(isHiddenServiceHref("/lounge?iata=IST", off)).toBe(true);
  });
  it("hides vignette links when vignette is disabled", () => {
    expect(isHiddenServiceHref("/vignette", off)).toBe(true);
  });
  it("never hides eSIM links", () => {
    expect(isHiddenServiceHref("/esim", off)).toBe(false);
  });
  it("shows services again when re-enabled", () => {
    expect(isHiddenServiceHref("/lounge", { lounge: true, vignette: true })).toBe(false);
  });
});
