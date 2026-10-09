/**
 * 14-day refund guarantee — pure, server-authoritative policy.
 * Every function takes server time and database values; nothing here trusts browser input.
 * Internal values are language-independent; customer wording lives in the account copy.
 */

export const REFUND_WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;

export const REFUND_STATUSES = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REFUNDED", "CANCELLED"] as const;
export type RefundRequestStatus = (typeof REFUND_STATUSES)[number];
/** Open requests block a second request for the same order item / eSIM. */
export const OPEN_REFUND_STATUSES: readonly RefundRequestStatus[] = ["REQUESTED", "UNDER_REVIEW", "APPROVED"];

export const REFUND_REASONS = ["WRONG_PACKAGE", "TRIP_CANCELLED", "DEVICE_UNSUPPORTED", "NO_LONGER_NEEDED", "TECHNICAL_ISSUE", "OTHER"] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export type UsageVerification = "DEMO" | "VERIFIED_UNUSED" | "VERIFIED_USED" | "UNKNOWN";
export type RefundEligibility =
  | "DEMO"
  | "LIKELY_ELIGIBLE"
  | "REVIEW_REQUIRED"
  | "NOT_ELIGIBLE_EXPIRED"
  | "NOT_ELIGIBLE_USED"
  | "NOT_ELIGIBLE_UNPAID"
  | "NO_ORDER"
  | "OPEN_REQUEST"
  | "NOT_ELIGIBLE_ACTIVATED"
  | "ACTIVATION_UNKNOWN"
  | "COMPLETED_REQUEST";

export function normalizeRefundStatus(value: unknown): RefundRequestStatus {
  const v = String(value ?? "").toUpperCase();
  if (v === "PROCESSED") return "REFUNDED"; // legacy value, never set by this system
  return (REFUND_STATUSES as readonly string[]).includes(v) ? (v as RefundRequestStatus) : "REQUESTED";
}

export function refundWindow(purchaseAt: string | Date | null | undefined, now: Date) {
  const start = purchaseAt ? new Date(purchaseAt) : null;
  if (!start || Number.isNaN(start.getTime())) return { purchaseAt: null, endsAt: null, open: false, daysLeft: 0, daysSince: null };
  const ends = new Date(start.getTime() + REFUND_WINDOW_DAYS * DAY_MS);
  const remaining = ends.getTime() - now.getTime();
  return {
    purchaseAt: start.toISOString(),
    endsAt: ends.toISOString(),
    open: remaining > 0,
    daysLeft: remaining > 0 ? Math.ceil(remaining / DAY_MS) : 0,
    daysSince: Math.max(0, Math.floor((now.getTime() - start.getTime()) / DAY_MS)),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function isDemoEsim(installInfo: unknown, productIsTest = false) {
  const info = record(installInfo);
  return productIsTest || info["demo"] === true || info["test"] === true || info["test_record"] === true;
}

/** Maximum age of a provider usage reading we are willing to rely on. */
export const USAGE_MAX_AGE_MS = 24 * 3_600_000;

/**
 * Only a provider reading stored under `install_info.provider_usage` with `verified: true`, a numeric
 * `used_mb` and a fresh `checked_at` counts. Locally stored remaining/total values are NOT provider
 * verification. No reading → UNKNOWN (never guessed).
 */
export function assessUsage(args: { installInfo: unknown; productIsTest?: boolean; now: Date }): { verification: UsageVerification; usedMb: number | null; checkedAt: string | null; source: string | null } {
  if (isDemoEsim(args.installInfo, args.productIsTest)) return { verification: "DEMO", usedMb: null, checkedAt: null, source: "demo" };
  const usage = record(record(args.installInfo)["provider_usage"]);
  const checked = typeof usage["checked_at"] === "string" ? new Date(usage["checked_at"]) : null;
  const used = typeof usage["used_mb"] === "number" && Number.isFinite(usage["used_mb"]) ? (usage["used_mb"] as number) : null;
  const fresh = checked && !Number.isNaN(checked.getTime()) && args.now.getTime() - checked.getTime() <= USAGE_MAX_AGE_MS && checked.getTime() <= args.now.getTime() + 60_000;
  if (usage["verified"] !== true || used == null || !fresh) return { verification: "UNKNOWN", usedMb: null, checkedAt: null, source: null };
  const started = usage["started"] === true || typeof usage["first_use_at"] === "string";
  return {
    verification: used > 0 || started ? "VERIFIED_USED" : "VERIFIED_UNUSED",
    usedMb: used,
    checkedAt: checked ? checked.toISOString() : null,
    source: typeof usage["source"] === "string" ? (usage["source"] as string) : "provider",
  };
}

export type ActivationHistoryState = "ACTIVATED" | "NEVER_ACTIVATED" | "UNKNOWN";

/** Only stored provider/history evidence can prove never activated; current READY is not proof. */
export function assessActivationHistory(status: string | null, installInfo: unknown): ActivationHistoryState {
  const info = record(installInfo);
  const provider = record(info["provider_activation"]);
  const usage = record(info["provider_usage"]);
  const history = Array.isArray(info["activation_history"]) ? info["activation_history"] : [];
  const sources = [info, provider, usage, ...history.map(record)];
  const timestampKeys = ["activated_at", "activation_at", "activation_date", "first_activated_at", "first_use_at", "deactivated_at"];
  if (["ACTIVE", "IN_USE", "ENABLED"].includes(String(status).toUpperCase()) || sources.some(s =>
    s["ever_activated"] === true || s["activated"] === true || s["started"] === true ||
    ["ACTIVE", "ACTIVATED", "DEACTIVATED"].includes(String(s["status"] ?? s["event"] ?? "").toUpperCase()) ||
    timestampKeys.some(key => typeof s[key] === "string" && Boolean(String(s[key]).trim())) ||
    (typeof s["used_mb"] === "number" && s["used_mb"] > 0)
  )) return "ACTIVATED";
  if (provider["verified"] === true && provider["ever_activated"] === false) return "NEVER_ACTIVATED";
  return "UNKNOWN";
}

const PAID = new Set(["PAID", "PARTIALLY_REFUNDED"]);

export function assessEligibility(args: {
  hasOrderItem: boolean;
  isDemo: boolean;
  paymentStatus: string | null;
  windowOpen: boolean;
  usage: UsageVerification;
  hasOpenRequest: boolean;
  hasCompletedRequest?: boolean;
  activation?: ActivationHistoryState;
}): { eligibility: RefundEligibility; canRequest: boolean } {
  if (args.hasOpenRequest) return { eligibility: "OPEN_REQUEST", canRequest: false };
  if (args.hasCompletedRequest) return { eligibility: "COMPLETED_REQUEST", canRequest: false };
  if (args.activation === "ACTIVATED") return { eligibility: "NOT_ELIGIBLE_ACTIVATED", canRequest: false };
  if (!args.windowOpen) return { eligibility: "NOT_ELIGIBLE_EXPIRED", canRequest: false };
  // Owner decision: unconditional 14-day refund for every package not shown as activated.
  // Unknown activation may still request; it goes to Admin review instead of being blocked.
  if (args.isDemo) return { eligibility: "DEMO", canRequest: true };
  if (!args.hasOrderItem) return { eligibility: "NO_ORDER", canRequest: false };
  if (!PAID.has(String(args.paymentStatus ?? "").toUpperCase())) return { eligibility: "NOT_ELIGIBLE_UNPAID", canRequest: false };
  if (args.usage === "VERIFIED_USED") return { eligibility: "NOT_ELIGIBLE_USED", canRequest: false };
  if (args.activation === "NEVER_ACTIVATED" && args.usage === "VERIFIED_UNUSED") return { eligibility: "LIKELY_ELIGIBLE", canRequest: true };
  return { eligibility: "REVIEW_REQUIRED", canRequest: true };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Refund basis = what the customer actually paid for THIS order item.
 * Item-level discount wins; otherwise an order-level coupon (discount snapshot) is allocated
 * proportionally to the line's share of the original subtotal. Supplier cost is never used.
 */
export function itemRefundBasis(
  item: { salePrice: number; quantity: number; itemDiscount: number },
  order: { discountTotal: number; originalSubtotal: number | null; couponCode?: string | null },
) {
  const list = round2(Math.max(0, item.salePrice) * Math.max(1, item.quantity));
  let discount = 0;
  let method: "NONE" | "ITEM_DISCOUNT" | "ORDER_COUPON_ALLOCATED" = "NONE";
  if (item.itemDiscount > 0) {
    discount = Math.min(list, round2(item.itemDiscount));
    method = "ITEM_DISCOUNT";
  } else if (order.discountTotal > 0 && order.originalSubtotal && order.originalSubtotal > 0) {
    discount = Math.min(list, round2((order.discountTotal * list) / order.originalSubtotal));
    method = "ORDER_COUPON_ALLOCATED";
  }
  return { listAmount: list, discount, amount: round2(Math.max(0, list - discount)), method, couponCode: order.couponCode ?? null };
}

export type AdminRefundAction = "START_REVIEW" | "APPROVE" | "REJECT" | "CANCEL";
const ACTION_TARGET: Record<AdminRefundAction, RefundRequestStatus> = {
  START_REVIEW: "UNDER_REVIEW",
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  CANCEL: "CANCELLED",
};
const ALLOWED_FROM: Record<AdminRefundAction, readonly RefundRequestStatus[]> = {
  START_REVIEW: ["REQUESTED"],
  APPROVE: ["REQUESTED", "UNDER_REVIEW"],
  REJECT: ["REQUESTED", "UNDER_REVIEW"],
  CANCEL: ["REQUESTED", "UNDER_REVIEW", "APPROVED"],
};

/** Admin transitions. REFUNDED is intentionally unreachable: only a confirmed payment-provider refund may set it. */
export function adminTransition(from: RefundRequestStatus, action: AdminRefundAction): RefundRequestStatus | null {
  return ALLOWED_FROM[action]?.includes(from) ? ACTION_TARGET[action] : null;
}

export const REFUND_EVENTS = [
  "REFUND_REQUESTED",
  "REVIEW_STARTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ADMIN_NOTE",
  "PAYMENT_REFUND_ATTEMPTED",
  "PAYMENT_REFUND_CONFIRMED",
  "PAYMENT_REFUND_FAILED",
] as const;

export const ACTION_EVENT: Record<AdminRefundAction, (typeof REFUND_EVENTS)[number]> = {
  START_REVIEW: "REVIEW_STARTED",
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  CANCEL: "CANCELLED",
};
