import { evaluateCoupon, normalizeCode, type CouponResult, type PackageScope, type PricedLine, type Promotion } from "@/domain/promotions";
import { adminScopeOf } from "@/domain/esim/admin-catalogue";

/* Server-only coupon authority. Checkout must call `validateCouponServer` again
 * immediately before authoritative order pricing is created. */

export function rowToPromotion(row: any): Promotion {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    currency: row.currency ?? "EUR",
    services: row.services ?? [],
    countryScope: row.country_scope,
    countryIsos: (row.country_isos ?? []).map((iso: string) => iso.toUpperCase()),
    productScope: row.product_scope,
    productIds: row.product_ids ?? [],
    packageType: row.package_type,
    packageScopes: row.package_scopes ?? [],
    totalLimit: row.total_limit,
    perCustomerLimit: row.per_customer_limit,
    minOrder: row.min_order == null ? null : Number(row.min_order),
  };
}

/** Authoritative prices from the published catalogue; unknown / unsellable lines are dropped. */
export async function priceLines(db: any, lines: { productId: string; quantity: number }[]): Promise<PricedLine[]> {
  const ids = [...new Set(lines.map((line) => line.productId))].slice(0, 50);
  if (!ids.length) return [];
  const { data: products, error } = await db
    .from("service_products")
    .select("id, service_type, sale_price, lifecycle, customer_visible, esim_product_details(country_iso, package_kind, coverage_country_isos, unlimited_data, data_type)")
    .in("id", ids);
  if (error) throw new Error("PRICING_UNAVAILABLE");
  const byId = new Map<string, any>((products ?? []).map((row: any) => [row.id, row]));
  return lines.flatMap((line) => {
    const row = byId.get(line.productId);
    const price = Number(row?.sale_price ?? 0);
    if (!row || row.lifecycle !== "PUBLISHED" || !row.customer_visible || !(price > 0)) return [];
    const detail = Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details;
    let scope: PackageScope | null = null;
    if (row.service_type === "ESIM" && detail) {
      const s = adminScopeOf(detail);
      scope = s === "SUBDIVISION" ? "COUNTRY" : s;
    }
    return [{
      productId: row.id,
      service: row.service_type,
      unitPrice: price,
      quantity: Math.max(1, Math.min(9, Math.round(Number(line.quantity) || 1))),
      scope,
      unlimited: Boolean(detail?.unlimited_data) || detail?.data_type === "UNLIMITED",
      countryIso: detail?.country_iso ? String(detail.country_iso).toUpperCase() : null,
    }];
  });
}

export async function validateCouponServer(db: any, input: { code: string; lines: { productId: string; quantity: number }[]; customerId: string | null }): Promise<CouponResult> {
  const code = normalizeCode(input.code);
  const priced = await priceLines(db, input.lines);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return evaluateCoupon({ promotion: null, lines: priced, now: new Date(), usage: { total: 0, customer: 0 }, customerId: input.customerId });
  const { data: row } = await db.from("promotions").select("*").eq("code", code).maybeSingle();
  const promotion = row ? rowToPromotion(row) : null;
  let usage = { total: 0, customer: 0 };
  if (promotion) {
    const { count: total } = await db.from("promotion_redemptions").select("id", { count: "exact", head: true }).eq("promotion_id", promotion.id);
    let customer = 0;
    if (input.customerId) {
      const { count } = await db.from("promotion_redemptions").select("id", { count: "exact", head: true }).eq("promotion_id", promotion.id).eq("customer_id", input.customerId);
      customer = count ?? 0;
    }
    usage = { total: total ?? 0, customer };
  }
  // Server clock only — never the browser's.
  return evaluateCoupon({ promotion, lines: priced, now: new Date(), usage, customerId: input.customerId });
}
