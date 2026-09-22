import { describe, expect, it } from "vitest";

import {
  aggregateFulfillment,
  alertTypeForFailure,
  canRetryUnit,
  canTransitionFulfillment,
  canTransitionOrder,
  classifySupplierFailure,
  initialCustomerEsimState,
  isPaymentConfirmed,
  needsReconciliation,
  normalizeEsimGoOrder,
  planUnits,
  safeProvisioningAudit,
  startsOnFirstUse,
  statusForDisposition,
  unitIdempotencyKey,
  validateOrderLine,
  type ResolvedProduct,
} from "../provisioning";

const OPEN = { serviceActive: true, purchasesActive: true };

function product(patch: Partial<ResolvedProduct> = {}): ResolvedProduct {
  return {
    id: "p1",
    serviceType: "ESIM",
    lifecycle: "PUBLISHED",
    customerVisible: true,
    providerAvailable: true,
    salePrice: 12.99,
    currency: "EUR",
    providerCost: 8,
    pricingReviewRequired: false,
    primaryProviderId: "prov-1",
    providerExternalId: "esim_10GB_TR",
    isTest: false,
    ...patch,
  };
}

describe("order validation (authoritative, server-side)", () => {
  it("accepts a published, visible, available, priced product", () => {
    expect(validateOrderLine(product(), 1, OPEN)).toEqual({ ok: true });
  });

  it("rejects an unpublished product", () => {
    expect(validateOrderLine(product({ lifecycle: "DRAFT" }), 1, OPEN)).toEqual({ ok: false, reason: "NOT_PUBLISHED" });
  });

  it("rejects a hidden product", () => {
    expect(validateOrderLine(product({ customerVisible: false }), 1, OPEN)).toEqual({ ok: false, reason: "NOT_CUSTOMER_VISIBLE" });
  });

  it("rejects a supplier-unavailable product", () => {
    expect(validateOrderLine(product({ providerAvailable: false }), 1, OPEN)).toEqual({ ok: false, reason: "PROVIDER_UNAVAILABLE" });
  });

  it("rejects a product flagged for pricing review", () => {
    expect(validateOrderLine(product({ pricingReviewRequired: true }), 1, OPEN)).toEqual({ ok: false, reason: "PRICING_REVIEW_REQUIRED" });
  });

  it("rejects a zero, negative or NaN price", () => {
    for (const price of [0, -5, Number.NaN, null]) {
      expect(validateOrderLine(product({ salePrice: price as number }), 1, OPEN).ok).toBe(false);
    }
  });

  it("rejects a product without a supplier mapping", () => {
    expect(validateOrderLine(product({ providerExternalId: null }), 1, OPEN)).toEqual({ ok: false, reason: "NO_PROVIDER_MAPPING" });
  });

  it("rejects when the service is paused", () => {
    expect(validateOrderLine(product(), 1, { serviceActive: false, purchasesActive: true })).toEqual({ ok: false, reason: "SERVICE_PAUSED" });
  });

  it("rejects when new purchases are paused", () => {
    expect(validateOrderLine(product(), 1, { serviceActive: true, purchasesActive: false })).toEqual({ ok: false, reason: "PURCHASES_PAUSED" });
  });

  it("rejects an invalid quantity", () => {
    for (const quantity of [0, -1, 1.5, 11]) {
      expect(validateOrderLine(product(), quantity, OPEN)).toEqual({ ok: false, reason: "INVALID_QUANTITY" });
    }
  });

  it("rejects a missing product", () => {
    expect(validateOrderLine(null, 1, OPEN)).toEqual({ ok: false, reason: "PRODUCT_NOT_FOUND" });
  });
});

describe("payment gate", () => {
  it("only PAID unlocks provisioning", () => {
    expect(isPaymentConfirmed("PAID")).toBe(true);
    for (const status of ["PENDING", "AUTHORIZED", "FAILED", "REFUNDED", null, undefined]) {
      expect(isPaymentConfirmed(status)).toBe(false);
    }
  });
});

describe("state machine", () => {
  it("never allows PENDING → FULFILLED without provisioning", () => {
    expect(canTransitionFulfillment("PENDING", "FULFILLED")).toBe(false);
    expect(canTransitionFulfillment("PENDING", "PROCESSING")).toBe(true);
    expect(canTransitionFulfillment("PROCESSING", "FULFILLED")).toBe(true);
  });

  it("treats fulfilled and cancelled as terminal", () => {
    expect(canTransitionFulfillment("FULFILLED", "PROCESSING")).toBe(false);
    expect(canTransitionFulfillment("CANCELLED", "PROCESSING")).toBe(false);
  });

  it("allows a failed order to be retried", () => {
    expect(canTransitionFulfillment("FAILED", "PROCESSING")).toBe(true);
  });

  it("guards order status transitions", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransitionOrder("CANCELLED", "CONFIRMED")).toBe(false);
  });
});

describe("provisioning units", () => {
  it("creates exactly one unit per quantity unit", () => {
    const units = planUnits("o1", [{ orderItemId: "i1", quantity: 3 }]);
    expect(units).toHaveLength(3);
    expect(units.map((unit) => unit.unitIndex)).toEqual([1, 2, 3]);
    expect(new Set(units.map((unit) => unit.idempotencyKey)).size).toBe(3);
  });

  it("traces multiple products independently", () => {
    const units = planUnits("o1", [
      { orderItemId: "a", quantity: 1 },
      { orderItemId: "b", quantity: 2 },
    ]);
    expect(units).toHaveLength(3);
    expect(new Set(units.map((unit) => unit.idempotencyKey)).size).toBe(3);
  });

  it("derives a deterministic, stable idempotency key", () => {
    expect(unitIdempotencyKey("o1", "i1", 2)).toBe("prov:o1:i1:2");
    expect(planUnits("o1", [{ orderItemId: "i1", quantity: 2 }])[1]!.idempotencyKey).toBe(unitIdempotencyKey("o1", "i1", 2));
  });
});

describe("supplier failure classification", () => {
  it("never treats a timeout as safe to retry", () => {
    expect(classifySupplierFailure({ status: 0, timeout: true })).toEqual({ category: "TIMEOUT", disposition: "SUPPLIER_RESULT_UNKNOWN" });
    expect(classifySupplierFailure({ status: 408 }).disposition).toBe("SUPPLIER_RESULT_UNKNOWN");
  });

  it("marks 429 safe to retry", () => {
    expect(classifySupplierFailure({ status: 429 })).toEqual({ category: "RATE_LIMITED", disposition: "SAFE_TO_RETRY" });
  });

  it("marks 5xx as unknown result", () => {
    expect(classifySupplierFailure({ status: 500 }).disposition).toBe("SUPPLIER_RESULT_UNKNOWN");
    expect(classifySupplierFailure({ status: 503 }).disposition).toBe("SUPPLIER_RESULT_UNKNOWN");
  });

  it("marks auth and not-found as permanent", () => {
    expect(classifySupplierFailure({ status: 401 }).disposition).toBe("PERMANENT");
    expect(classifySupplierFailure({ status: 403 }).disposition).toBe("PERMANENT");
    expect(classifySupplierFailure({ status: 404 }).disposition).toBe("PERMANENT");
  });

  it("marks a malformed response as unknown result", () => {
    expect(classifySupplierFailure({ status: 200, malformed: true }).disposition).toBe("SUPPLIER_RESULT_UNKNOWN");
  });

  it("maps dispositions to storable statuses and alerts", () => {
    expect(statusForDisposition("SUPPLIER_RESULT_UNKNOWN")).toBe("RESULT_UNKNOWN");
    expect(statusForDisposition("SAFE_TO_RETRY")).toBe("FAILED");
    expect(alertTypeForFailure("SUPPLIER_RESULT_UNKNOWN")).toBe("SUPPLIER_RESULT_UNKNOWN");
    expect(alertTypeForFailure("PERMANENT")).toBe("PROVIDER_ERROR");
  });
});

describe("retry safety", () => {
  it("allows retry only for clean pending/failed units", () => {
    expect(canRetryUnit({ status: "PENDING", providerReference: null, customerEsimId: null })).toBe(true);
    expect(canRetryUnit({ status: "FAILED", providerReference: null, customerEsimId: null })).toBe(true);
  });

  it("blocks retry when a supplier reference or eSIM already exists", () => {
    expect(canRetryUnit({ status: "FAILED", providerReference: "ORD-1", customerEsimId: null })).toBe(false);
    expect(canRetryUnit({ status: "FAILED", providerReference: null, customerEsimId: "esim-1" })).toBe(false);
  });

  it("blocks retry for unknown supplier results and in-flight units", () => {
    expect(canRetryUnit({ status: "RESULT_UNKNOWN", providerReference: null, customerEsimId: null })).toBe(false);
    expect(canRetryUnit({ status: "IN_PROGRESS", providerReference: null, customerEsimId: null })).toBe(false);
    expect(canRetryUnit({ status: "PROVISIONED", providerReference: "x", customerEsimId: "y" })).toBe(false);
  });

  it("flags units that need reconciliation first", () => {
    expect(needsReconciliation({ status: "RESULT_UNKNOWN", providerReference: null, customerEsimId: null })).toBe(true);
    expect(needsReconciliation({ status: "FAILED", providerReference: "ORD-9", customerEsimId: null })).toBe(true);
    expect(needsReconciliation({ status: "PROVISIONED", providerReference: "ORD-9", customerEsimId: "esim" })).toBe(false);
  });
});

describe("supplier response normalization", () => {
  const success = {
    orderReference: "ORD-123",
    status: "completed",
    esims: [{ iccid: "8944000000000000001", matchingId: "AB12-CD34", smdpAddress: "rsp.truphone.com", status: "released" }],
  };

  it("normalizes a real supplier success payload", () => {
    const result = normalizeEsimGoOrder(success);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.esim.providerReference).toBe("ORD-123");
    expect(result.esim.iccid).toBe("8944000000000000001");
    expect(result.esim.qrPayload).toBe("LPA:1$rsp.truphone.com$AB12-CD34");
  });

  it("prefers a supplier-provided QR payload", () => {
    const result = normalizeEsimGoOrder({ ...success, esims: [{ ...success.esims[0], qrCode: "LPA:1$x$y" }] });
    expect(result.ok && result.esim.qrPayload).toBe("LPA:1$x$y");
  });

  it("rejects a response without a reference", () => {
    expect(normalizeEsimGoOrder({ esims: success.esims })).toEqual({ ok: false, reason: "MALFORMED" });
  });

  it("rejects a response without activation material", () => {
    expect(normalizeEsimGoOrder({ orderReference: "ORD-1", esims: [] })).toEqual({ ok: false, reason: "MALFORMED" });
    expect(normalizeEsimGoOrder({ orderReference: "ORD-1", esims: [{ iccid: "894400" }] })).toEqual({ ok: false, reason: "MALFORMED" });
  });

  it("rejects junk", () => {
    for (const body of [null, "ok", 42, []]) {
      expect(normalizeEsimGoOrder(body).ok).toBe(false);
    }
  });
});

describe("customer-facing state", () => {
  it("presents a fresh eSIM as installable, not active, with no invented countdown", () => {
    expect(initialCustomerEsimState("FIRST_CONNECTION")).toEqual({ status: "READY", expiresAt: null });
  });

  it("knows when validity starts at first use", () => {
    expect(startsOnFirstUse("FIRST_CONNECTION")).toBe(true);
    expect(startsOnFirstUse(null)).toBe(true);
    expect(startsOnFirstUse("PURCHASE")).toBe(false);
  });

  it("aggregates order fulfillment from its units", () => {
    expect(aggregateFulfillment([])).toBe("PENDING");
    expect(aggregateFulfillment(["PROVISIONED", "PROVISIONED"])).toBe("FULFILLED");
    expect(aggregateFulfillment(["PROVISIONED", "FAILED"])).toBe("FAILED");
    expect(aggregateFulfillment(["PROVISIONED", "RESULT_UNKNOWN"])).toBe("FAILED");
    expect(aggregateFulfillment(["IN_PROGRESS", "PENDING"])).toBe("PROCESSING");
    expect(aggregateFulfillment(["PENDING", "PENDING"])).toBe("PENDING");
  });
});

describe("audit payload", () => {
  it("never carries activation material", () => {
    const payload = safeProvisioningAudit({
      id: "u1",
      orderId: "o1",
      orderItemId: "i1",
      unitIndex: 1,
      status: "PROVISIONED",
      providerReference: "ORD-1",
      attemptCount: 1,
      errorCategory: null,
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("LPA:1");
    expect(serialized).not.toContain("ORD-1");
    expect(Object.keys(payload)).not.toContain("qrPayload");
    expect(Object.keys(payload)).not.toContain("iccid");
    expect(payload["hasProviderReference"]).toBe(true);
  });
});
