import { describe, expect, it } from "vitest";
import { explainPrice, pricingFromRule, validateRuleInput } from "@/domain/pricing-rule";

describe("pricing rule explanation", () => {
  it("35% + NEAREST_99 on 2.21 gives 2.98 raw and 2.99 final", () => {
    const p = pricingFromRule({ strategy: "MARKUP_PERCENT", markup_percent: 35, rounding_mode: "NEAREST_99", currency: "EUR" }, "EUR", null)!;
    const r = explainPrice(2.21, p);
    expect(r.rawPrice).toBeCloseTo(2.9835, 4);
    expect(r.salePrice).toBe(2.99);
  });
  it("accepts 32.5 and rejects invalid input", () => {
    expect(validateRuleInput({ strategy: "MARKUP_PERCENT", markupPercent: 32.5 })).toBeNull();
    expect(validateRuleInput({ strategy: "MARKUP_PERCENT", markupPercent: NaN })).not.toBeNull();
    expect(validateRuleInput({ strategy: "MARKUP_PERCENT", markupPercent: -1 })).not.toBeNull();
    expect(validateRuleInput({ strategy: "MARKUP_PERCENT", markupPercent: 35, currency: "XXX" })).not.toBeNull();
  });
});
