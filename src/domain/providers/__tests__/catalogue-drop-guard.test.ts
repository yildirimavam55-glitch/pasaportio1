import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATALOGUE_DROP_THRESHOLD_PERCENT,
  evaluateCatalogueDrop,
  resolveMissingItems,
  selectPricingRule,
} from "../sync-engine";

const guard = (received: number, previous: number | null = 5434, threshold: number | null = null) =>
  evaluateCatalogueDrop({ previousCount: previous, receivedCount: received, thresholdPercent: threshold });

describe("abnormal catalogue drop guard", () => {
  it("defaults to a 20% threshold", () => {
    expect(DEFAULT_CATALOGUE_DROP_THRESHOLD_PERCENT).toBe(20);
    expect(guard(5434).thresholdPercent).toBe(20);
  });

  it("passes a growing catalogue (5434 -> 5500)", () => {
    const verdict = guard(5500);
    expect(verdict.blocked).toBe(false);
    expect(verdict.dropPercent).toBeLessThan(0);
  });

  it("passes a small legitimate removal (5434 -> 5400)", () => {
    const verdict = guard(5400);
    expect(verdict.blocked).toBe(false);
    expect(verdict.dropPercent).toBeCloseTo(0.63, 1);
  });

  it("passes a drop just under the threshold (5434 -> 5000, ~8%)", () => {
    expect(guard(5000).blocked).toBe(false);
  });

  it("blocks bulk deactivation at 5434 -> 4000 (~26%)", () => {
    const verdict = guard(4000);
    expect(verdict.blocked).toBe(true);
    expect(verdict.dropPercent).toBeGreaterThan(20);
  });

  it("blocks bulk deactivation at 5434 -> 2000 (~63%)", () => {
    expect(guard(2000).blocked).toBe(true);
  });

  it("honours a custom threshold", () => {
    expect(guard(5000, 5434, 5).blocked).toBe(true);
    expect(guard(4000, 5434, 50).blocked).toBe(false);
  });

  it("never blocks when there is no baseline yet", () => {
    const verdict = guard(1200, null);
    expect(verdict.blocked).toBe(false);
    expect(verdict.dropPercent).toBeNull();
  });

  it("zero results and failed fetches are handled by the existing guard, never by deactivation", () => {
    const known = ["A", "B", "C"];
    // 5434 -> 0 (complete but empty), 401/429/500 (fetch failed): nothing deactivates.
    expect(resolveMissingItems({ incomingIds: [], knownAvailableIds: known, fetchComplete: true, fetchSucceeded: true, itemsReceived: 0 })).toEqual([]);
    expect(resolveMissingItems({ incomingIds: [], knownAvailableIds: known, fetchComplete: false, fetchSucceeded: false, itemsReceived: 0 })).toEqual([]);
  });
});

describe("pricing rule precedence", () => {
  const rules = [
    { id: "default", provider_id: null, service_type: null, priority: 1000, active: true },
    { id: "esim-default", provider_id: null, service_type: "ESIM", priority: 1000, active: true },
    { id: "provider", provider_id: "p1", service_type: null, priority: 500, active: true },
    { id: "provider-esim", provider_id: "p1", service_type: "ESIM", priority: 900, active: true },
    { id: "other-provider", provider_id: "p2", service_type: "ESIM", priority: 1, active: true },
    { id: "inactive", provider_id: "p1", service_type: "ESIM", priority: 1, active: false },
  ];

  it("prefers provider+service over everything else", () => {
    expect(selectPricingRule(rules, { providerId: "p1", serviceType: "ESIM" })?.id).toBe("provider-esim");
  });

  it("falls back to service rule, then global default", () => {
    expect(selectPricingRule(rules, { providerId: "p9", serviceType: "ESIM" })?.id).toBe("esim-default");
    expect(selectPricingRule(rules, { providerId: "p9", serviceType: "LOUNGE" })?.id).toBe("default");
  });

  it("returns null when nothing matches", () => {
    expect(selectPricingRule([{ id: "x", provider_id: "p2", service_type: "ESIM", active: true }], { providerId: "p1", serviceType: "LOUNGE" })).toBeNull();
  });

  it("lowest priority number wins at the same specificity", () => {
    const same = [
      { id: "a", provider_id: null, service_type: "ESIM", priority: 900, active: true },
      { id: "b", provider_id: null, service_type: "ESIM", priority: 100, active: true },
    ];
    expect(selectPricingRule(same, { providerId: "p1", serviceType: "ESIM" })?.id).toBe("b");
  });
});
