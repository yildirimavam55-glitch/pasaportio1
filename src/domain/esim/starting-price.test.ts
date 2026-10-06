import { describe, expect, it } from "vitest";
import { lowestByCountry } from "./starting-price";

const row = (o: Partial<Parameters<typeof lowestByCountry>[0][number]>) => ({
  sale_price: 3.99, currency: "EUR", country_iso: "DE", package_kind: "COUNTRY", unlimited_data: false, supplier_groups: ["Standard Fixed"], ...o,
});

describe("country starting price", () => {
  it("is the lowest single-country live price", () => {
    expect(lowestByCountry([row({ sale_price: 4.99 }), row({ sale_price: 3.99 }), row({ sale_price: 9.99 })]).get("DE")?.amount).toBe(3.99);
  });
  it("ignores regional bundles", () => {
    expect(lowestByCountry([row({ sale_price: 1.99, package_kind: "REGION", country_iso: null }), row({})]).get("DE")?.amount).toBe(3.99);
  });
  it("ignores Unlimited Lite and Plus, keeps Essential", () => {
    const m = lowestByCountry([
      row({ sale_price: 1.99, unlimited_data: true, supplier_groups: ["Standard Unlimited Lite"] }),
      row({ sale_price: 2.5, unlimited_data: true, supplier_groups: ["Standard Unlimited Plus"] }),
      row({ sale_price: 3.49, unlimited_data: true, supplier_groups: ["Standard Unlimited Essential"] }),
      row({}),
    ]);
    expect(m.get("DE")?.amount).toBe(3.49);
  });
});
