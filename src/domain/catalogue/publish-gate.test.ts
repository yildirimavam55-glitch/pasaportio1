import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPublishable } from "./publish-gate";

describe("publication approval gate", () => {
  it("blocks products without a sale price", () => {
    expect(isPublishable({ sale_price: null, pricing_review_required: false, provider_available: true })).toBe(false);
    expect(isPublishable({ sale_price: 0, pricing_review_required: false, provider_available: true })).toBe(false);
  });
  it("blocks products awaiting price review or unavailable at the supplier", () => {
    expect(isPublishable({ sale_price: 9.99, pricing_review_required: true, provider_available: true })).toBe(false);
    expect(isPublishable({ sale_price: 9.99, pricing_review_required: false, provider_available: false })).toBe(false);
  });
  it("allows a priced, reviewed, available product", () => {
    expect(isPublishable({ sale_price: "9.99", pricing_review_required: false, provider_available: true })).toBe(true);
  });
  it("sync only auto-publishes when the flag is explicitly enabled", () => {
    const src = readFileSync("src/lib/provider-sync.server.ts", "utf8");
    expect(src).toMatch(/autoPublish = publishFlag\?\.enabled === true/);
  });
  it("bulk publish goes through the approval gate", () => {
    expect(readFileSync("src/lib/admin-catalog.functions.ts", "utf8")).toMatch(/isPublishable\(row\)/);
  });
});
