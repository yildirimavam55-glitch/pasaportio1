import { describe, expect, it } from "vitest";

import { adminTransition, assessEligibility, assessUsage, itemRefundBasis, normalizeRefundStatus, refundWindow } from "../refund-policy";

const now = new Date("2026-09-27T12:00:00Z");
const base = { hasOrderItem: true, isDemo: false, paymentStatus: "PAID", windowOpen: true, hasOpenRequest: false, activation: "NEVER_ACTIVATED" } as const;

describe("refund window (server time)", () => {
  it("counts 14 days from purchase", () => {
    const w = refundWindow("2026-09-22T12:00:00Z", now);
    expect(w.open).toBe(true);
    expect(w.daysLeft).toBe(9);
    expect(w.daysSince).toBe(5);
  });
  it("closes after 14 days and on invalid dates", () => {
    expect(refundWindow("2026-09-13T11:59:00Z", now).open).toBe(false);
    expect(refundWindow(null, now).open).toBe(false);
    expect(refundWindow("nope", now).open).toBe(false);
  });
});

describe("usage verification", () => {
  const fresh = "2026-09-27T10:00:00Z";
  it("verified unused / used only with a fresh provider reading", () => {
    expect(assessUsage({ installInfo: { provider_usage: { verified: true, used_mb: 0, checked_at: fresh } }, now }).verification).toBe("VERIFIED_UNUSED");
    expect(assessUsage({ installInfo: { provider_usage: { verified: true, used_mb: 12, checked_at: fresh } }, now }).verification).toBe("VERIFIED_USED");
    expect(assessUsage({ installInfo: { provider_usage: { verified: true, used_mb: 0, started: true, checked_at: fresh } }, now }).verification).toBe("VERIFIED_USED");
  });
  it("unknown when missing, unverified or stale — never guessed", () => {
    expect(assessUsage({ installInfo: {}, now }).verification).toBe("UNKNOWN");
    expect(assessUsage({ installInfo: { provider_usage: { verified: false, used_mb: 0, checked_at: fresh } }, now }).verification).toBe("UNKNOWN");
    expect(assessUsage({ installInfo: { provider_usage: { verified: true, used_mb: 0, checked_at: "2026-09-20T00:00:00Z" } }, now }).verification).toBe("UNKNOWN");
  });
  it("demo/test records are DEMO", () => {
    expect(assessUsage({ installInfo: { demo: true }, now }).verification).toBe("DEMO");
    expect(assessUsage({ installInfo: {}, productIsTest: true, now }).verification).toBe("DEMO");
  });
});

describe("eligibility", () => {
  it("<14 days + verified unused → likely eligible (still reviewed)", () => {
    expect(assessEligibility({ ...base, usage: "VERIFIED_UNUSED" })).toEqual({ eligibility: "LIKELY_ELIGIBLE", canRequest: true });
  });
  it("<14 days + verified used → blocked", () => {
    expect(assessEligibility({ ...base, usage: "VERIFIED_USED" }).canRequest).toBe(false);
  });
  it("unknown activation blocks an unconfirmed request", () => {
    expect(assessEligibility({ ...base, activation: "UNKNOWN", usage: "UNKNOWN" })).toEqual({ eligibility: "ACTIVATION_UNKNOWN", canRequest: false });
  });
  it(">14 days → expired", () => {
    expect(assessEligibility({ ...base, windowOpen: false, usage: "VERIFIED_UNUSED" }).eligibility).toBe("NOT_ELIGIBLE_EXPIRED");
  });
  it("demo is testable but marked DEMO", () => {
    expect(assessEligibility({ ...base, isDemo: true, hasOrderItem: false, paymentStatus: null, usage: "DEMO" })).toEqual({ eligibility: "DEMO", canRequest: true });
  });
  it("duplicate open request and unpaid orders are blocked", () => {
    expect(assessEligibility({ ...base, usage: "UNKNOWN", hasOpenRequest: true }).eligibility).toBe("OPEN_REQUEST");
    expect(assessEligibility({ ...base, usage: "UNKNOWN", paymentStatus: "PENDING" }).eligibility).toBe("NOT_ELIGIBLE_UNPAID");
    expect(assessEligibility({ ...base, usage: "UNKNOWN", hasOrderItem: false }).eligibility).toBe("NO_ORDER");
  });
});

describe("coupon-aware, per-item refund basis", () => {
  it("uses the paid amount, not the list price", () => {
    expect(itemRefundBasis({ salePrice: 10, quantity: 1, itemDiscount: 1.5 }, { discountTotal: 1.5, originalSubtotal: 10 }).amount).toBe(8.5);
  });
  it("allocates an order coupon to one item of a multi-item order", () => {
    const r = itemRefundBasis({ salePrice: 10, quantity: 1, itemDiscount: 0 }, { discountTotal: 3, originalSubtotal: 30, couponCode: "SUMMER" });
    expect(r).toMatchObject({ listAmount: 10, discount: 1, amount: 9, method: "ORDER_COUPON_ALLOCATED", couponCode: "SUMMER" });
  });
  it("no discount → full line price", () => {
    expect(itemRefundBasis({ salePrice: 7.99, quantity: 2, itemDiscount: 0 }, { discountTotal: 0, originalSubtotal: null }).amount).toBe(15.98);
  });
});

describe("status protection", () => {
  it("admin flow transitions", () => {
    expect(adminTransition("REQUESTED", "START_REVIEW")).toBe("UNDER_REVIEW");
    expect(adminTransition("UNDER_REVIEW", "APPROVE")).toBe("APPROVED");
    expect(adminTransition("UNDER_REVIEW", "REJECT")).toBe("REJECTED");
    expect(adminTransition("REJECTED", "APPROVE")).toBeNull();
    expect(adminTransition("APPROVED", "REJECT")).toBeNull();
  });
  it("REFUNDED is never reachable by an admin action", () => {
    for (const from of ["REQUESTED", "UNDER_REVIEW", "APPROVED"] as const)
      for (const action of ["START_REVIEW", "APPROVE", "REJECT", "CANCEL"] as const) expect(adminTransition(from, action)).not.toBe("REFUNDED");
    expect(adminTransition("REFUNDED", "CANCEL")).toBeNull();
  });
  it("normalizes legacy values", () => {
    expect(normalizeRefundStatus("PROCESSED")).toBe("REFUNDED");
    expect(normalizeRefundStatus("under_review")).toBe("UNDER_REVIEW");
  });
});

describe('unconditional 14-day refund for non-activated packages', () => {
  it('paid, within 14 days, activation unknown → request allowed for admin review', () => {
    expect(assessEligibility({ hasOrderItem: true, isDemo: false, paymentStatus: 'PAID', usage: 'UNKNOWN', windowOpen: true, hasOpenRequest: false, activation: 'UNKNOWN' })).toEqual({ eligibility: 'REVIEW_REQUIRED', canRequest: true });
  });
  it('activated package stays blocked', () => {
    expect(assessEligibility({ hasOrderItem: true, isDemo: false, paymentStatus: 'PAID', usage: 'UNKNOWN', windowOpen: true, hasOpenRequest: false, activation: 'ACTIVATED' }).canRequest).toBe(false);
  });
});
