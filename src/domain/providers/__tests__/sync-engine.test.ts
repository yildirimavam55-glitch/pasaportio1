import { describe, expect, it } from "vitest";
import {
  balanceHealth,
  classifyItem,
  computeCostChange,
  isCatalogueStale,
  isSyncDue,
  mapCoverageToCanonical,
  nextSyncAt,
  normalizeInterval,
  resolveMissingItems,
  resolveSyncStatus,
  retryDelayMs,
  isRetryableStatus,
  type CatalogueSnapshotItem,
} from "../sync-engine";
import { applyFieldMap, sanitizeEndpoints, sanitizeFieldMap } from "../field-mapping";

const item = (over: Partial<CatalogueSnapshotItem> = {}): CatalogueSnapshotItem => ({
  externalId: "TR_20GB_30D",
  providerCost: 5.8,
  currency: "EUR",
  coverage: ["TR"],
  validityDays: 30,
  dataGb: 20,
  unlimited: false,
  available: true,
  ...over,
});

describe("price change detection", () => {
  it("reports increase with amount and percentage", () => {
    const change = computeCostChange(5.8, 6.35, "EUR");
    expect(change.direction).toBe("UP");
    expect(change.changeAmount).toBeCloseTo(0.55, 4);
    expect(change.changePercent).toBeCloseTo(9.48, 1);
  });
  it("reports decrease", () => {
    expect(computeCostChange(6, 5, "EUR").direction).toBe("DOWN");
  });
  it("has no percentage without a previous cost", () => {
    expect(computeCostChange(null, 6, "EUR").changePercent).toBeNull();
  });
});

describe("diff engine", () => {
  it("flags a brand new product", () => {
    expect(classifyItem(item(), undefined)[0]!.type).toBe("NEW_PRODUCT");
  });
  it("detects unchanged items as no change", () => {
    expect(classifyItem(item(), item())).toHaveLength(0);
  });
  it("detects price, coverage, validity and data changes", () => {
    const types = classifyItem(item({ providerCost: 7, coverage: ["TR", "DE"], validityDays: 15, dataGb: 10 }), item()).map((c) => c.type);
    expect(types).toContain("PRICE_INCREASE");
    expect(types).toContain("COVERAGE_CHANGE");
    expect(types).toContain("VALIDITY_CHANGE");
    expect(types).toContain("DATA_CHANGE");
  });
  it("detects a returned product", () => {
    const types = classifyItem(item(), item({ available: false })).map((c) => c.type);
    expect(types).toContain("PRODUCT_RETURNED");
  });
});

describe("failed sync protection", () => {
  const known = ["A", "B", "C"];
  it("marks missing items unavailable only after a complete successful fetch", () => {
    expect(resolveMissingItems({ incomingIds: ["A"], knownAvailableIds: known, fetchComplete: true, fetchSucceeded: true, itemsReceived: 1 })).toEqual(["B", "C"]);
  });
  it("never disables products on an incomplete fetch", () => {
    expect(resolveMissingItems({ incomingIds: ["A"], knownAvailableIds: known, fetchComplete: false, fetchSucceeded: true, itemsReceived: 1 })).toEqual([]);
  });
  it("never disables products when the fetch failed", () => {
    expect(resolveMissingItems({ incomingIds: [], knownAvailableIds: known, fetchComplete: true, fetchSucceeded: false, itemsReceived: 0 })).toEqual([]);
  });
  it("never disables products on an empty catalogue response", () => {
    expect(resolveMissingItems({ incomingIds: [], knownAvailableIds: known, fetchComplete: true, fetchSucceeded: true, itemsReceived: 0 })).toEqual([]);
  });
  it("treats an incomplete fetch as partial, not success", () => {
    expect(resolveSyncStatus({ complete: false, received: 10, failed: 0, processed: 10 })).toBe("PARTIAL");
    expect(resolveSyncStatus({ complete: true, received: 10, failed: 0, processed: 10 })).toBe("SUCCESS");
    expect(resolveSyncStatus({ complete: true, received: 10, failed: 2, processed: 8 })).toBe("PARTIAL");
    expect(resolveSyncStatus({ complete: false, received: 0, failed: 0, processed: 0 })).toBe("FAILED");
  });
  it("retries 429, 5xx and timeouts only", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(retryDelayMs(3)).toBeGreaterThan(retryDelayMs(1));
  });
});

describe("canonical country mapping", () => {
  it("maps known ISO codes and reports unknown ones", () => {
    const result = mapCoverageToCanonical(["TR", "DE", "ZZ"]);
    expect(result.canonical).toEqual(["TR", "DE"]);
    expect(result.unknown).toEqual(["ZZ"]);
  });
  it("deduplicates repeated codes", () => {
    expect(mapCoverageToCanonical(["tr", "TR"]).canonical).toEqual(["TR"]);
  });
});

describe("scheduling", () => {
  it("defaults to 24 hours and only accepts supported intervals", () => {
    expect(normalizeInterval(undefined)).toBe(24);
    expect(normalizeInterval(5)).toBe(24);
    expect(normalizeInterval(6)).toBe(6);
  });
  it("computes the next run", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(nextSyncAt(from, 24).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
  it("skips paused or manual providers", () => {
    expect(isSyncDue({ autoSync: false, active: true, nextSyncAt: null })).toBe(false);
    expect(isSyncDue({ autoSync: true, active: false, nextSyncAt: null })).toBe(false);
    expect(isSyncDue({ autoSync: true, active: true, nextSyncAt: null })).toBe(true);
    expect(isSyncDue({ autoSync: true, active: true, nextSyncAt: "2999-01-01T00:00:00Z" })).toBe(false);
  });
  it("detects a stale catalogue", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(isCatalogueStale("2026-01-09T00:00:00Z", 24, now)).toBe(false);
    expect(isCatalogueStale("2026-01-01T00:00:00Z", 24, now)).toBe(true);
    expect(isCatalogueStale(null, 24, now)).toBe(false);
  });
});

describe("provider balance", () => {
  it("flags a low balance against the configured threshold", () => {
    expect(balanceHealth(2450, 500)).toBe("HEALTHY");
    expect(balanceHealth(120, 500)).toBe("LOW");
    expect(balanceHealth(null, 500)).toBe("UNKNOWN");
  });
});

describe("generic adapter configuration safety", () => {
  it("maps provider field names onto internal names", () => {
    const mapped = applyFieldMap({ sku: "X1", wholesale: 4.2 }, { externalId: "sku", providerCost: "wholesale" });
    expect(mapped["externalId"]).toBe("X1");
    expect(mapped["providerCost"]).toBe(4.2);
  });
  it("rejects expressions and unsafe endpoint targets", () => {
    expect(sanitizeFieldMap({ externalId: "a(); drop table" })).toEqual({});
    expect(sanitizeEndpoints({ catalogue: "javascript:alert(1)", balance: "/balance" })).toEqual({ balance: "/balance" });
  });
});
