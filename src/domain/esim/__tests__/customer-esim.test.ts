import { describe, expect, it } from "vitest";

import {
  boundedUsagePercent,
  fairUseText,
  isHistoryEsim,
  isUnlimitedEsim,
  normalizeCustomerEsimStatus,
  remainingDays,
} from "../customer-esim";

describe("customer eSIM presentation", () => {
  it("normalizes provider and fulfillment states", () => {
    expect(normalizeCustomerEsimStatus("FULFILLED")).toBe("READY");
    expect(normalizeCustomerEsimStatus("in_use")).toBe("ACTIVE");
    expect(normalizeCustomerEsimStatus("refunded")).toBe("CANCELLED");
    expect(normalizeCustomerEsimStatus("failed")).toBe("SUPPORT");
    expect(normalizeCustomerEsimStatus("unknown")).toBe("PREPARING");
  });

  it("uses real values and clamps usage safely", () => {
    expect(boundedUsagePercent(1000, 800)).toBe(20);
    expect(boundedUsagePercent(1000, -10)).toBe(100);
    expect(boundedUsagePercent(1000, 1200)).toBe(0);
    expect(boundedUsagePercent(null, null)).toBeNull();
  });

  it("identifies unlimited and preserves real fair-use text", () => {
    expect(isUnlimitedEsim(null, { unlimited_data: true })).toBe(true);
    expect(isUnlimitedEsim(1024, { unlimited_data: true })).toBe(false);
    expect(fairUseText({ fair_use_note: "2 GB high speed daily" })).toBe("2 GB high speed daily");
  });

  it("moves expired and exhausted records to history", () => {
    const now = new Date("2026-09-20T12:00:00Z");
    expect(isHistoryEsim({ status: "ACTIVE", totalMb: 100, remainingMb: 0, expiresAt: null, now })).toBe(true);
    expect(isHistoryEsim({ status: "ACTIVE", totalMb: 100, remainingMb: 50, expiresAt: "2026-09-19T00:00:00Z", now })).toBe(true);
    expect(isHistoryEsim({ status: "ACTIVE", totalMb: 100, remainingMb: 50, expiresAt: "2026-09-30T00:00:00Z", now })).toBe(false);
    expect(remainingDays("2026-09-22T12:00:00Z", now)).toBe(2);
  });
});