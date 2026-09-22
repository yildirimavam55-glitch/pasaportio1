/**
 * Commerce + provisioning domain rules. Pure functions only — no database, no
 * HTTP, no provider SDK. Everything here is unit-tested so the money path can
 * be verified without ever touching the live supplier.
 */

export type OrderStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CHARGEBACK";
export type FulfillmentStatus = "PENDING" | "PROCESSING" | "FULFILLED" | "FAILED" | "CANCELLED";
export type ProvisioningStatus = "PENDING" | "IN_PROGRESS" | "PROVISIONED" | "FAILED" | "RESULT_UNKNOWN" | "CANCELLED";

/**
 * Order fulfillment flow. An order can never jump from PENDING straight to
 * FULFILLED: provisioning has to run (PROCESSING) in between.
 */
const FULFILLMENT_FLOW: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["FULFILLED", "FAILED", "CANCELLED"],
  FAILED: ["PROCESSING", "CANCELLED"],
  FULFILLED: [],
  CANCELLED: [],
};

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return (FULFILLMENT_FLOW[from] ?? []).includes(to);
}

const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_FLOW[from] ?? []).includes(to);
}

/** Supplier provisioning is gated on trusted server-side payment state only. */
export function isPaymentConfirmed(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "PAID";
}

export type OrderCandidate = {
  productId: string;
  quantity: number;
};

export type ResolvedProduct = {
  id: string;
  serviceType: string;
  lifecycle: string;
  customerVisible: boolean;
  providerAvailable: boolean;
  salePrice: number | null;
  currency: string | null;
  providerCost: number | null;
  pricingReviewRequired: boolean;
  primaryProviderId: string | null;
  providerExternalId: string | null;
  isTest: boolean;
};

export type OrderRejection =
  | "PRODUCT_NOT_FOUND"
  | "NOT_PUBLISHED"
  | "NOT_CUSTOMER_VISIBLE"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PRICE"
  | "PRICING_REVIEW_REQUIRED"
  | "NO_PROVIDER_MAPPING"
  | "SERVICE_PAUSED"
  | "PURCHASES_PAUSED"
  | "INVALID_QUANTITY";

export const MAX_UNITS_PER_ITEM = 10;

export type PurchaseGate = { serviceActive: boolean; purchasesActive: boolean };

/**
 * Authoritative server-side validation. Frontend values are never trusted:
 * the price, supplier cost, currency and supplier mapping all come from the
 * resolved product row, never from the request.
 */
export function validateOrderLine(
  product: ResolvedProduct | null,
  quantity: number,
  gate: PurchaseGate,
): { ok: true } | { ok: false; reason: OrderRejection } {
  if (!gate.serviceActive) return { ok: false, reason: "SERVICE_PAUSED" };
  if (!gate.purchasesActive) return { ok: false, reason: "PURCHASES_PAUSED" };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_UNITS_PER_ITEM) {
    return { ok: false, reason: "INVALID_QUANTITY" };
  }
  if (!product) return { ok: false, reason: "PRODUCT_NOT_FOUND" };
  if (product.lifecycle !== "PUBLISHED") return { ok: false, reason: "NOT_PUBLISHED" };
  if (!product.customerVisible) return { ok: false, reason: "NOT_CUSTOMER_VISIBLE" };
  if (!product.providerAvailable) return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
  if (product.pricingReviewRequired) return { ok: false, reason: "PRICING_REVIEW_REQUIRED" };
  const price = Number(product.salePrice);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: "INVALID_PRICE" };
  if (!product.primaryProviderId || !product.providerExternalId) return { ok: false, reason: "NO_PROVIDER_MAPPING" };
  return { ok: true };
}

/** Deterministic provisioning identity — the anchor of duplicate protection. */
export function unitIdempotencyKey(orderId: string, orderItemId: string, unitIndex: number): string {
  return `prov:${orderId}:${orderItemId}:${unitIndex}`;
}

export type PlannedUnit = { orderItemId: string; unitIndex: number; idempotencyKey: string };

/** quantity = 3 → exactly three independently traceable units. */
export function planUnits(orderId: string, lines: Array<{ orderItemId: string; quantity: number }>): PlannedUnit[] {
  const units: PlannedUnit[] = [];
  for (const line of lines) {
    const quantity = Math.max(1, Math.min(MAX_UNITS_PER_ITEM, Math.round(line.quantity || 1)));
    for (let index = 1; index <= quantity; index += 1) {
      units.push({
        orderItemId: line.orderItemId,
        unitIndex: index,
        idempotencyKey: unitIdempotencyKey(orderId, line.orderItemId, index),
      });
    }
  }
  return units;
}

export type FailureDisposition = "SAFE_TO_RETRY" | "SUPPLIER_RESULT_UNKNOWN" | "PERMANENT";

export type SupplierFailure = {
  /** 0 = network error / timeout: the request may or may not have reached the supplier. */
  status: number;
  timeout?: boolean;
  malformed?: boolean;
};

/**
 * The single most important safety rule of the money path: a timeout or a 5xx
 * after the request left our side means we do NOT know whether the supplier
 * charged us, so it must never be blindly retried.
 */
export function classifySupplierFailure(failure: SupplierFailure): {
  category: string;
  disposition: FailureDisposition;
} {
  if (failure.malformed) return { category: "MALFORMED_RESPONSE", disposition: "SUPPLIER_RESULT_UNKNOWN" };
  if (failure.timeout || failure.status === 0 || failure.status === 408) {
    return { category: "TIMEOUT", disposition: "SUPPLIER_RESULT_UNKNOWN" };
  }
  if (failure.status === 401 || failure.status === 403) return { category: `AUTH_${failure.status}`, disposition: "PERMANENT" };
  if (failure.status === 404) return { category: "NOT_FOUND", disposition: "PERMANENT" };
  if (failure.status === 409) return { category: "CONFLICT", disposition: "SUPPLIER_RESULT_UNKNOWN" };
  if (failure.status === 429) return { category: "RATE_LIMITED", disposition: "SAFE_TO_RETRY" };
  if (failure.status >= 500) return { category: `SERVER_${failure.status}`, disposition: "SUPPLIER_RESULT_UNKNOWN" };
  if (failure.status >= 400) return { category: `REQUEST_${failure.status}`, disposition: "PERMANENT" };
  return { category: "UNKNOWN", disposition: "SUPPLIER_RESULT_UNKNOWN" };
}

export function statusForDisposition(disposition: FailureDisposition): ProvisioningStatus {
  return disposition === "SUPPLIER_RESULT_UNKNOWN" ? "RESULT_UNKNOWN" : "FAILED";
}

export type ProvisioningUnitState = {
  status: ProvisioningStatus;
  providerReference: string | null;
  customerEsimId: string | null;
};

/**
 * Retry eligibility. A unit that already has a supplier reference, an eSIM, or
 * an unknown supplier result must be reconciled first — never re-purchased.
 */
export function canRetryUnit(unit: ProvisioningUnitState): boolean {
  if (unit.customerEsimId) return false;
  if (unit.providerReference) return false;
  if (unit.status === "PROVISIONED" || unit.status === "IN_PROGRESS" || unit.status === "CANCELLED") return false;
  if (unit.status === "RESULT_UNKNOWN") return false;
  return unit.status === "PENDING" || unit.status === "FAILED";
}

export function needsReconciliation(unit: ProvisioningUnitState): boolean {
  return unit.status === "RESULT_UNKNOWN" || (Boolean(unit.providerReference) && !unit.customerEsimId);
}

/** Statuses that may be claimed for a supplier purchase attempt. */
export const CLAIMABLE_STATUSES: ProvisioningStatus[] = ["PENDING", "FAILED"];

export type NormalizedEsim = {
  providerReference: string;
  iccid: string | null;
  activationCode: string | null;
  smdpAddress: string | null;
  qrPayload: string | null;
  providerStatus: string | null;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Supplier response → internal fields. Nothing is invented: a response without
 * a reference or without any activation material is MALFORMED, so the order is
 * never marked fulfilled on a guess.
 */
export function normalizeEsimGoOrder(body: unknown): { ok: true; esim: NormalizedEsim } | { ok: false; reason: "MALFORMED" } {
  if (!body || typeof body !== "object") return { ok: false, reason: "MALFORMED" };
  const root = body as Record<string, unknown>;
  const reference = text(root["orderReference"]) ?? text(root["reference"]) ?? text(root["id"]);
  if (!reference) return { ok: false, reason: "MALFORMED" };

  const assignments = Array.isArray(root["esims"])
    ? (root["esims"] as unknown[])
    : Array.isArray(root["assignments"])
      ? (root["assignments"] as unknown[])
      : [];
  const first = assignments.find((entry) => entry && typeof entry === "object") as Record<string, unknown> | undefined;

  const iccid = text(first?.["iccid"]);
  const activationCode = text(first?.["matchingId"]) ?? text(first?.["activationCode"]);
  const smdpAddress = text(first?.["smdpAddress"]) ?? text(first?.["rspUrl"]);
  const qrFromProvider = text(first?.["qrCode"]) ?? text(first?.["activationUrl"]);
  const qrPayload =
    qrFromProvider ?? (smdpAddress && activationCode ? `LPA:1$${smdpAddress}$${activationCode}` : null);

  if (!qrPayload) return { ok: false, reason: "MALFORMED" };

  return {
    ok: true,
    esim: {
      providerReference: reference,
      iccid,
      activationCode,
      smdpAddress,
      qrPayload,
      providerStatus: text(first?.["status"]) ?? text(root["status"]),
    },
  };
}

/**
 * A freshly provisioned eSIM is installable, not in use. Validity that starts
 * at first network attachment must not begin counting down at purchase time.
 */
export function initialCustomerEsimState(validityStartRule: string | null | undefined): {
  status: string;
  expiresAt: null;
} {
  return { status: "READY", expiresAt: null };
}

export function startsOnFirstUse(validityStartRule: string | null | undefined): boolean {
  const rule = String(validityStartRule ?? "").toUpperCase();
  return rule !== "PURCHASE" && rule !== "ACTIVATION_DATE";
}

/** Order-level fulfillment state derived from its units. */
export function aggregateFulfillment(units: ProvisioningStatus[]): FulfillmentStatus {
  if (!units.length) return "PENDING";
  if (units.every((status) => status === "PROVISIONED")) return "FULFILLED";
  if (units.some((status) => status === "FAILED" || status === "RESULT_UNKNOWN")) return "FAILED";
  if (units.some((status) => status === "IN_PROGRESS" || status === "PROVISIONED")) return "PROCESSING";
  return "PENDING";
}

/** Alert type per failure disposition — reuses the existing alert vocabulary. */
export function alertTypeForFailure(disposition: FailureDisposition): "PROVIDER_ERROR" | "SUPPLIER_RESULT_UNKNOWN" {
  return disposition === "SUPPLIER_RESULT_UNKNOWN" ? "SUPPLIER_RESULT_UNKNOWN" : "PROVIDER_ERROR";
}

/** Activation material must never reach logs, analytics or the audit trail. */
const ACTIVATION_FIELDS = ["qrPayload", "qr_payload", "activationCode", "matchingId", "smdpAddress", "iccid"];

export function safeProvisioningAudit(unit: {
  id: string;
  orderId: string;
  orderItemId: string;
  unitIndex: number;
  status: ProvisioningStatus;
  providerReference?: string | null;
  attemptCount?: number;
  errorCategory?: string | null;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    unitId: unit.id,
    orderId: unit.orderId,
    orderItemId: unit.orderItemId,
    unitIndex: unit.unitIndex,
    status: unit.status,
    hasProviderReference: Boolean(unit.providerReference),
    attemptCount: unit.attemptCount ?? 0,
    errorCategory: unit.errorCategory ?? null,
  };
  for (const field of ACTIVATION_FIELDS) delete payload[field];
  return payload;
}
