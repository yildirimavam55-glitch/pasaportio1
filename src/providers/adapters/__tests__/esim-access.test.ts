import { describe, expect, it } from "vitest";
import { esimAccessGb, esimAccessMoney, isImportableEsimAccessPackage, normalizeEsimAccessPackage } from "../esim-access.server";

describe("eSIM Access normalization", () => {
  it("reads prices in 1/10000 of the currency", () => {
    expect(esimAccessMoney(16000)).toBe(1.6);
  });
  it("sells 3 binary GB as 3 GB", () => {
    expect(esimAccessGb(3221225472)).toBe(3);
  });
  it("never imports daily-pass plans", () => {
    expect(isImportableEsimAccessPackage({ dataType: 2, durationUnit: "DAY" })).toBe(false);
    expect(isImportableEsimAccessPackage({ dataType: 1, durationUnit: "DAY" })).toBe(true);
  });
  it("keeps the supplier cost and coverage", () => {
    const n = normalizeEsimAccessPackage({ packageCode: "CKH002", name: "Spain 3GB 30Days", price: 16000, currencyCode: "USD", volume: 3221225472, duration: 30, location: "ES", locationNetworkList: [{ locationCode: "ES", operatorList: [{ operatorName: "Orange" }] }] });
    expect(n["providerCost"]).toBe(1.6);
    expect(n["coverage"]).toEqual(["ES"]);
    expect(n["unlimited"]).toBe(false);
  });
});
