import { describe, expect, it } from "vitest";
import { isolateForRtl } from "./store";

describe("Arabic price direction", () => {
  it("wraps prices in a left-to-right island on Arabic pages", () => {
    expect(isolateForRtl("€10.99", "ar")).toBe("\u2066€10.99\u2069");
  });
  it("leaves prices untouched on left-to-right pages", () => {
    expect(isolateForRtl("€10.99", "fr")).toBe("€10.99");
    expect(isolateForRtl("10,99 €", "tr")).toBe("10,99 €");
  });
});
