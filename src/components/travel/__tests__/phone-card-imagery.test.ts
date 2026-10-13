import { describe, expect, it } from "vitest";
import { phoneCardImage } from "../phone-card-imagery";

describe("homepage brand imagery", () => {
  for (const brand of ["Samsung", "Apple", "Google", "Xiaomi", "POCO", "Redmi", "Oppo", "OnePlus", "Motorola", "Honor", "Huawei", "Nothing"]) {
    it(`uses only the ${brand} representative image`, () => {
      expect(phoneCardImage(brand)).toContain(`compatibility-${brand.toLowerCase()}.webp`);
    });
  }
  it("normalizes casing without switching brands", () => {
    expect(phoneCardImage(" SAMSUNG ")).toBe(phoneCardImage("Samsung"));
  });
  it("does not use Xiaomi imagery for POCO or Redmi", () => {
    expect(phoneCardImage("POCO")).not.toBe(phoneCardImage("Xiaomi"));
    expect(phoneCardImage("Redmi")).not.toBe(phoneCardImage("Xiaomi"));
  });
  it("uses an icon for missing and unsupported brands", () => {
    for (const brand of [null, undefined, "", "Android", "Other", "Unknown", "Sony"]) expect(phoneCardImage(brand)).toBeNull();
  });
  it("changes imagery with the chosen brand", () => {
    expect(phoneCardImage("Apple")).not.toBe(phoneCardImage("Samsung"));
    expect(phoneCardImage("Google")).not.toBe(phoneCardImage("Apple"));
  });
});