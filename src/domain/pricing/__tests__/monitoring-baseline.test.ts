import { describe, expect, it } from "vitest";
import { monitoringBaseline } from "../repricing";

describe("monitoring baseline", () => {
  it("prefers the Admin-approved cost over any monitoring baseline", () => {
    expect(monitoringBaseline({ source: "FINAL_PRICING_2026-10-06", supplierCost: 5, monitoringBaseline: { kind: "NEW_MONITORING", cost: 9 } }))
      .toEqual({ cost: 5, kind: "APPROVED" });
  });
  it("uses a documented system cost without calling it approved", () => {
    expect(monitoringBaseline({ strategy: "MARKUP_PERCENT", monitoringBaseline: { kind: "SYSTEM_DOCUMENTED", cost: 6.54 } }))
      .toEqual({ cost: 6.54, kind: "SYSTEM_DOCUMENTED" });
  });
  it("returns null when no baseline exists", () => {
    expect(monitoringBaseline({ strategy: "MARKUP_PERCENT", providerCost: 6.54 })).toBeNull();
  });
});
