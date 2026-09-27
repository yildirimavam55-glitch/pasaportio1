/**
 * Coupon / promotion evaluation — pure and deterministic so the server is the only
 * authority (it supplies authoritative prices, server time and usage counts).
 * The storefront never computes a discount itself; it only renders this result.
 */

export type PromotionStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type DiscountType = "PERCENT" | "FIXED";
export type PackageScope = "COUNTRY" | "REGION" | "GLOBAL";
export type PackageTypeScope = "ALL" | "STANDARD" | "UNLIMITED";

export type Promotion = {
  id: string;
  code: string;
  status: PromotionStatus;
  startsAt: string;
  endsAt: string;
  discountType: DiscountType;
  discountValue: number;
  currency: string;
  services: string[];
  countryScope: "ALL" | "SELECTED";
  countryIsos: string[];
  productScope: "ALL" | "SELECTED";
  productIds: string[];
  packageType: PackageTypeScope;
  packageScopes: PackageScope[];
  totalLimit: number | null;
  perCustomerLimit: number | null;
  minOrder: number | null;
};

/** One cart line priced by the server from the catalogue (never from the client). */
export type PricedLine = {
  productId: string;
  service: string;
  unitPrice: number;
  quantity: number;
  /** COUNTRY for country/subdivision packages, REGION or GLOBAL for multi-country. */
  scope: PackageScope | null;
  unlimited: boolean;
  countryIso: string | null;
};

export type Usage = { total: number; customer: number };

export type RejectReason =
  | "INVALID" | "PAUSED" | "NOT_STARTED" | "EXPIRED" | "TOTAL_LIMIT" | "CUSTOMER_LIMIT"
  | "LOGIN_REQUIRED" | "MIN_ORDER" | "NO_ELIGIBLE";

export type CouponResult =
  | {
      ok: true;
      promotionId: string;
      code: string;
      discountType: DiscountType;
      discountValue: number;
      currency: string;
      subtotal: number;
      eligibleSubtotal: number;
      discount: number;
      total: number;
      eligibleProductIds: string[];
    }
  | { ok: false; reason: RejectReason; minOrder?: number | null; subtotal: number };

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function normalizeCode(code: string): string {
  return String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isLineEligible(promo: Promotion, line: PricedLine): boolean {
  if (!promo.services.includes(line.service)) return false;
  if (promo.productScope === "SELECTED" && !promo.productIds.includes(line.productId)) return false;
  if (line.service === "ESIM") {
    if (!line.scope || !promo.packageScopes.includes(line.scope)) return false;
    if (promo.packageType === "STANDARD" && line.unlimited) return false;
    if (promo.packageType === "UNLIMITED" && !line.unlimited) return false;
    if (promo.countryScope === "SELECTED") {
      // Only country-specific products carry a single destination; regional/global
      // packages qualify only through an explicit package-scope/product selection.
      if (line.scope === "COUNTRY" && !promo.countryIsos.includes(String(line.countryIso ?? "").toUpperCase())) return false;
    }
  }
  return true;
}

export function evaluateCoupon(input: {
  promotion: Promotion | null;
  lines: PricedLine[];
  now: Date;
  usage: Usage;
  customerId: string | null;
}): CouponResult {
  const { promotion: promo, lines, now, usage, customerId } = input;
  const subtotal = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const fail = (reason: RejectReason, extra: { minOrder?: number | null } = {}): CouponResult => ({ ok: false, reason, subtotal, ...extra });
  if (!promo || promo.status === "ARCHIVED") return fail("INVALID");
  if (promo.status === "PAUSED") return fail("PAUSED");
  const t = now.getTime();
  if (t < new Date(promo.startsAt).getTime()) return fail("NOT_STARTED");
  if (t >= new Date(promo.endsAt).getTime()) return fail("EXPIRED");
  if (promo.totalLimit != null && usage.total >= promo.totalLimit) return fail("TOTAL_LIMIT");
  if (promo.perCustomerLimit != null) {
    if (!customerId) return fail("LOGIN_REQUIRED");
    if (usage.customer >= promo.perCustomerLimit) return fail("CUSTOMER_LIMIT");
  }
  const eligible = lines.filter((line) => isLineEligible(promo, line));
  if (!eligible.length) return fail("NO_ELIGIBLE");
  const eligibleSubtotal = round2(eligible.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  if (promo.minOrder != null && eligibleSubtotal < promo.minOrder) return fail("MIN_ORDER", { minOrder: promo.minOrder });
  const raw = promo.discountType === "PERCENT" ? (eligibleSubtotal * promo.discountValue) / 100 : promo.discountValue;
  const discount = round2(Math.min(raw, eligibleSubtotal));
  return {
    ok: true,
    promotionId: promo.id,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    currency: promo.currency,
    subtotal,
    eligibleSubtotal,
    discount,
    total: round2(subtotal - discount),
    eligibleProductIds: [...new Set(eligible.map((line) => line.productId))],
  };
}

/** Snapshot to store on an order when checkout is implemented (see AGENTS.md). */
export function discountSnapshot(result: Extract<CouponResult, { ok: true }>) {
  return {
    promotion_id: result.promotionId,
    coupon_code: result.code,
    discount_type: result.discountType,
    discount_value: result.discountValue,
    discount_total: result.discount,
    original_subtotal: result.subtotal,
    final_subtotal: result.total,
  };
}

/* ------------------------------- banner text ------------------------------- */

export function formatDiscount(type: DiscountType, value: number, locale: string, currency = "EUR"): string {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", locale === "en" ? "." : ",");
  if (type === "PERCENT") return locale === "tr" ? `%${n}` : `${n}%`;
  return locale === "en" ? `€${n}` : `${n} €`;
}

export const DEFAULT_BANNER_TEXT: Record<string, string> = {
  tr: "{discount} İndirim | Kod: {code}",
  de: "{discount} Rabatt | Code: {code}",
  en: "{discount} Off | Code: {code}",
};

/**
 * Splits a banner template around {code} so the (untranslated) code can be rendered
 * bold next to its copy button. Without a code, the "| Kod:" tail is dropped.
 */
export function bannerParts(template: string, discount: string, code: string | null): { before: string; code: string | null; after: string } {
  const filled = template.replaceAll("{discount}", discount);
  if (!filled.includes("{code}")) return { before: filled.trim(), code: null, after: "" };
  if (!code) return { before: filled.replace(/[\s|·–-]*[^\s|·–-]*:?\s*\{code\}/, "").replaceAll("{code}", "").trim(), code: null, after: "" };
  const [before = "", ...rest] = filled.split("{code}");
  return { before, code, after: rest.join(code) };
}
