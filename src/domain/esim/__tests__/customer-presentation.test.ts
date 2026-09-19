import { describe, expect, it } from "vitest";
import { commercialDataGb, customerPackageTitle, formatSalePrice } from "@/domain/esim/customer-presentation";

describe("customer eSIM presentation", () => {
  it("restores whole commercial bundle sizes without changing genuine fractions", () => {
    expect(commercialDataGb(1.95)).toBe(2);
    expect(commercialDataGb(4.88)).toBe(5);
    expect(commercialDataGb(9.77)).toBe(10);
    expect(commercialDataGb(1.5)).toBe(1.5);
    expect(commercialDataGb(null)).toBeNull();
  });

  it("uses localized customer titles instead of provider names", () => {
    expect(customerPackageTitle({ locale: "tr", destinationIso: "TR", coverage: ["TR"] })).toBe("Türkiye eSIM");
    expect(customerPackageTitle({ locale: "de", destinationIso: "DE", coverage: ["DE"] })).toBe("Deutschland eSIM");
    expect(customerPackageTitle({ locale: "en", routeIsos: ["DE", "AT"], coverage: ["DE", "AT"] })).toBe("Route eSIM");
  });

  it("formats sale prices by customer locale", () => {
    expect(formatSalePrice(3.99, "EUR", "tr")).toContain("3,99");
    expect(formatSalePrice(3.99, "EUR", "de")).toContain("3,99");
    expect(formatSalePrice(3.99, "EUR", "en")).toContain("€3.99");
  });
});