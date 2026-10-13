import { describe, it, expect } from "vitest";
import { orderBrands } from "../DeviceCompatibility";
describe("orderBrands", () => {
  it("puts popular catalogue brands first, then others alphabetically, without inventing brands", () => {
    expect(orderBrands([{ brand: "Sony" }, { brand: "Samsung" }, { brand: "Apple" }, { brand: "Fairphone" }, { brand: "Apple" }])).toEqual(["Apple", "Samsung", "Fairphone", "Sony"]);
  });
});
