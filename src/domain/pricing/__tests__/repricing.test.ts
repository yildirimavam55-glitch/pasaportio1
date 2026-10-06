import { describe, expect, it } from "vitest";
import { approvedBaseline, classifyRepricing } from "../repricing";

describe("repricing queue", () => {
  it("cost ≥ price is CRITICAL even without baseline", () => {
    expect(classifyRepricing({ cost: 10, price: 9.99, baseline: null, airaloExact: null }).priority).toBe("CRITICAL");
  });
  it("no approved baseline → unknown, never guessed", () => {
    expect(approvedBaseline({ source: "ADMIN_AUTO", providerCost: 3 })).toBeNull();
    expect(classifyRepricing({ cost: 5, price: 9.99, baseline: null, airaloExact: null }).priority).toBe("UNKNOWN_BASELINE");
  });
  it("final pricing snapshot gives the baseline", () => {
    expect(approvedBaseline({ source: "FINAL_PRICING_2026-10-06", supplierCost: 5.7 })).toBe(5.7);
  });
  it("unchanged cost → CURRENT", () => {
    expect(classifyRepricing({ cost: 5.7, price: 11.99, baseline: 5.7, airaloExact: null }).priority).toBe("CURRENT");
  });
  it("increase with markup < 20% → HIGH", () => {
    expect(classifyRepricing({ cost: 9, price: 9.99, baseline: 5, airaloExact: null }).priority).toBe("HIGH");
  });
  it("other material change → NORMAL; suggestion from approved engine", () => {
    const r = classifyRepricing({ cost: 4.04, price: 11.99, baseline: 5, airaloExact: null });
    expect(r.priority).toBe("NORMAL");
    expect(r.suggestion.price).toBe(8.99);
  });
});
