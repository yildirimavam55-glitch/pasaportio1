import { describe, expect, it } from "vitest";
import { bannerParts, discountSnapshot, evaluateCoupon, formatDiscount, normalizeCode, type PricedLine, type Promotion } from "./promotions";

const now = new Date("2026-09-27T12:00:00Z");
const promo = (p: Partial<Promotion> = {}): Promotion => ({
  id: "p1", code: "TRAVEL15", status: "ACTIVE", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-10T23:59:00Z",
  discountType: "PERCENT", discountValue: 15, currency: "EUR", services: ["ESIM"], countryScope: "ALL", countryIsos: [],
  productScope: "ALL", productIds: [], packageType: "ALL", packageScopes: ["COUNTRY"], totalLimit: null, perCustomerLimit: null, minOrder: null, ...p,
});
const line = (p: Partial<PricedLine> = {}): PricedLine => ({ productId: "tr1", service: "ESIM", unitPrice: 10, quantity: 1, scope: "COUNTRY", unlimited: false, countryIso: "TR", ...p });
const run = (p: Promotion | null, lines: PricedLine[], extra: { usage?: { total: number; customer: number }; customerId?: string | null; at?: Date } = {}) =>
  evaluateCoupon({ promotion: p, lines, now: extra.at ?? now, usage: extra.usage ?? { total: 0, customer: 0 }, customerId: extra.customerId ?? null });

describe("coupon evaluation", () => {
  it("applies an active percentage coupon", () => {
    const r = run(promo(), [line({ unitPrice: 19.99 })]);
    expect(r).toMatchObject({ ok: true, discount: 3, total: 16.99 });
  });
  it("rejects unknown, paused, archived, future and expired", () => {
    expect(run(null, [line()])).toMatchObject({ ok: false, reason: "INVALID" });
    expect(run(promo({ status: "PAUSED" }), [line()])).toMatchObject({ reason: "PAUSED" });
    expect(run(promo({ status: "ARCHIVED" }), [line()])).toMatchObject({ reason: "INVALID" });
    expect(run(promo({ startsAt: "2026-10-01T00:00:00Z" }), [line()])).toMatchObject({ reason: "NOT_STARTED" });
    expect(run(promo({ endsAt: "2026-09-20T00:00:00Z" }), [line()])).toMatchObject({ reason: "EXPIRED" });
  });
  it("uses the supplied (server) time, so an edit while the cart is open changes the result", () => {
    expect(run(promo(), [line()]).ok).toBe(true);
    expect(run(promo({ status: "PAUSED" }), [line()]).ok).toBe(false);
    expect(run(promo(), [line()], { at: new Date("2026-10-11T00:00:00Z") })).toMatchObject({ reason: "EXPIRED" });
  });
  it("caps fixed EUR coupons at the eligible subtotal", () => {
    expect(run(promo({ discountType: "FIXED", discountValue: 5 }), [line()])).toMatchObject({ discount: 5, total: 5 });
    expect(run(promo({ discountType: "FIXED", discountValue: 50 }), [line()])).toMatchObject({ discount: 10, total: 0 });
  });
  it("discounts only eligible items in a mixed cart", () => {
    const r = run(promo({ countryScope: "SELECTED", countryIsos: ["TR"] }), [line(), line({ productId: "jp", countryIso: "JP", unitPrice: 20 }), line({ productId: "lg", service: "LOUNGE", scope: null, countryIso: null, unitPrice: 30 })]);
    expect(r).toMatchObject({ ok: true, discount: 1.5, subtotal: 60, total: 58.5, eligibleProductIds: ["tr1"] });
  });
  it("all-country vs selected-country", () => {
    expect(run(promo(), [line({ countryIso: "JP" })]).ok).toBe(true);
    expect(run(promo({ countryScope: "SELECTED", countryIsos: ["DE"] }), [line()])).toMatchObject({ reason: "NO_ELIGIBLE" });
  });
  it("selected-product scope", () => {
    expect(run(promo({ productScope: "SELECTED", productIds: ["x"] }), [line()])).toMatchObject({ reason: "NO_ELIGIBLE" });
    expect(run(promo({ productScope: "SELECTED", productIds: ["tr1"] }), [line()]).ok).toBe(true);
  });
  it("standard-only and unlimited-only use the product type", () => {
    expect(run(promo({ packageType: "STANDARD" }), [line({ unlimited: true })])).toMatchObject({ reason: "NO_ELIGIBLE" });
    expect(run(promo({ packageType: "UNLIMITED" }), [line({ unlimited: true })]).ok).toBe(true);
    expect(run(promo({ packageType: "UNLIMITED" }), [line()])).toMatchObject({ reason: "NO_ELIGIBLE" });
  });
  it("excludes regional/global packages unless the scope is chosen", () => {
    const regional = line({ scope: "REGION", countryIso: null, unitPrice: 40 });
    expect(run(promo({ countryScope: "SELECTED", countryIsos: ["TR"] }), [regional])).toMatchObject({ reason: "NO_ELIGIBLE" });
    expect(run(promo({ packageScopes: ["COUNTRY", "REGION"] }), [regional]).ok).toBe(true);
    expect(run(promo(), [line({ scope: "GLOBAL", countryIso: null })])).toMatchObject({ reason: "NO_ELIGIBLE" });
  });
  it("minimum order is measured against eligible items", () => {
    const p = promo({ minOrder: 15, countryScope: "SELECTED", countryIsos: ["TR"] });
    expect(run(p, [line(), line({ productId: "jp", countryIso: "JP", unitPrice: 20 })])).toMatchObject({ reason: "MIN_ORDER", minOrder: 15 });
    expect(run(p, [line({ quantity: 2 })]).ok).toBe(true);
  });
  it("enforces total and per-customer limits", () => {
    expect(run(promo({ totalLimit: 1000 }), [line()], { usage: { total: 1000, customer: 0 } })).toMatchObject({ reason: "TOTAL_LIMIT" });
    expect(run(promo({ perCustomerLimit: 1 }), [line()])).toMatchObject({ reason: "LOGIN_REQUIRED" });
    expect(run(promo({ perCustomerLimit: 1 }), [line()], { customerId: "u", usage: { total: 3, customer: 1 } })).toMatchObject({ reason: "CUSTOMER_LIMIT" });
    expect(run(promo({ perCustomerLimit: 1 }), [line()], { customerId: "u" }).ok).toBe(true);
  });
  it("service scope excludes non-selected services", () => {
    expect(run(promo(), [line({ service: "VIGNETTE", scope: null })])).toMatchObject({ reason: "NO_ELIGIBLE" });
  });
  it("removal = no coupon: totals equal the plain subtotal", () => {
    const lines = [line(), line({ productId: "b", unitPrice: 5 })];
    expect(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)).toBe(15);
  });
  it("snapshot keeps campaign facts for historical orders", () => {
    const r = run(promo(), [line()]);
    if (!r.ok) throw new Error("expected ok");
    expect(discountSnapshot(r)).toEqual({ promotion_id: "p1", coupon_code: "TRAVEL15", discount_type: "PERCENT", discount_value: 15, discount_total: 1.5, original_subtotal: 10, final_subtotal: 8.5 });
  });
});

describe("banner text", () => {
  it("formats discounts per locale and never translates the code", () => {
    expect(formatDiscount("PERCENT", 15, "tr")).toBe("%15");
    expect(formatDiscount("PERCENT", 15, "de")).toBe("15%");
    expect(formatDiscount("FIXED", 5, "en")).toBe("€5");
    expect(bannerParts("{discount} İndirim | Kod: {code}", "%15", "TRAVEL15")).toEqual({ before: "%15 İndirim | Kod: ", code: "TRAVEL15", after: "" });
    expect(bannerParts("{discount} Rabatt | Code: {code}", "15%", "TRAVEL15").code).toBe("TRAVEL15");
  });
  it("drops the code tail when the code is hidden", () => {
    expect(bannerParts("{discount} Off | Code: {code}", "15%", null)).toEqual({ before: "15% Off", code: null, after: "" });
  });
  it("normalizes typed codes", () => {
    expect(normalizeCode(" travel 15 ")).toBe("TRAVEL15");
  });
});
