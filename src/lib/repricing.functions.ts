import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { packageKey } from "@/domain/pricing/manual-prices";
import { approvedBaseline, classifyRepricing, PRIORITY_ORDER, type Priority } from "@/domain/pricing/repricing";
import { planTierOf, standardUnlimitedOnly } from "@/domain/esim/supplier-metadata";
import { loadAiraloExactIndex } from "@/lib/pricing-suggestion.server";

export type RepricingRow = {
  id: string; name: string; iso: string | null; key: string; unlimited: boolean; lifecycle: string;
  cost: number | null; baseline: number | null; change: number | null; changePct: number | null;
  price: number | null; profit: number | null; markup: number | null; airalo: number | null;
  suggested: number | null; suggestionStatus: string; suggestionRule: string;
  suggestedProfit: number | null; suggestedMarkup: number | null; priority: Priority; manual: boolean;
};

async function pageAll(build: (a: number, b: number) => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Read-only queue. Never writes prices, publication or checkout flags. */
export const getRepricingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const details = await pageAll((a, b) => db.from("esim_product_details")
      .select("product_id, country_iso, data_gb, unlimited_data, validity_days, supplier_groups").order("product_id").range(a, b));
    const products = new Map<string, any>();
    const ids = details.map((d) => d.product_id);
    for (let i = 0; i < ids.length; i += 300) {
      const { data, error } = await db.from("service_products")
        .select("id, name, provider_cost, sale_price, price_overridden, lifecycle, pricing_snapshot")
        .in("id", ids.slice(i, i + 300)).not("sale_price", "is", null).neq("lifecycle", "ARCHIVED");
      if (error) throw new Error(error.message);
      for (const p of data ?? []) products.set(p.id, p);
    }
    const airalo = await loadAiraloExactIndex(db);
    const base = details.filter((d) => products.has(d.product_id)).map((d) => ({
      d, p: products.get(d.product_id),
      key: packageKey({ unlimited: Boolean(d.unlimited_data), dataGb: d.data_gb == null ? null : Number(d.data_gb), validityDays: d.validity_days }),
      tier: d.unlimited_data ? planTierOf(d.supplier_groups) : null,
    }));
    // Standard Pasaport Unlimited = Essential only; Lite/Plus stay out of the queue.
    const scoped = standardUnlimitedOnly(base, (r) => (r.key.startsWith("U|") && r.d.country_iso ? `${r.d.country_iso}|${r.key}` : null), (r) => r.tier);
    const rows: RepricingRow[] = scoped.map(({ d, p, key }) => {
      const cost = p.provider_cost == null ? null : Number(p.provider_cost);
      const price = Number(p.sale_price);
      const baseline = approvedBaseline(p.pricing_snapshot);
      const airaloExact = d.country_iso ? airalo.get(`${d.country_iso}|${key}`) ?? null : null;
      const c = classifyRepricing({ cost, price, baseline, airaloExact });
      return {
        id: p.id, name: p.name, iso: d.country_iso, key, unlimited: Boolean(d.unlimited_data), lifecycle: p.lifecycle,
        cost, baseline, change: c.change, changePct: c.changePct, price, profit: c.profit, markup: c.markup,
        airalo: airaloExact, suggested: c.suggestion.price, suggestionStatus: c.suggestion.status, suggestionRule: c.suggestion.rule,
        suggestedProfit: c.suggestedProfit, suggestedMarkup: c.suggestedMarkup, priority: c.priority, manual: Boolean(p.price_overridden && !baseline),
      };
    });
    rows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (b.changePct ?? 0) - (a.changePct ?? 0));
    const counts = rows.reduce((acc, r) => ({ ...acc, [r.priority]: (acc[r.priority] ?? 0) + 1 }), {} as Record<string, number>);
    return { rows, counts, generatedAt: new Date().toISOString() };
  });

/** Explicit single-product Admin approval. The only path that changes a price here. */
export const approveRepricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ productId: z.string().uuid(), price: z.number().positive().max(10000), expectedCurrentPrice: z.number() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: before, error } = await db.from("service_products")
      .select("id, sale_price, provider_cost, pricing_snapshot, price_overridden").eq("id", data.productId).maybeSingle();
    if (error || !before) throw new Error("Ürün bulunamadı.");
    if (Number(before.sale_price) !== data.expectedCurrentPrice) throw new Error("Fiyat bu arada değişti. Listeyi yenileyin.");
    const price = Math.round(data.price * 100) / 100;
    const cost = before.provider_cost == null ? null : Number(before.provider_cost);
    const snapshot = {
      source: "ADMIN_REPRICE", supplierCost: cost, previousSalePrice: Number(before.sale_price), newSalePrice: price,
      appliedAt: new Date().toISOString(), adminUserId: (context as any).userId ?? null, previousSnapshot: before.pricing_snapshot ?? null,
    };
    const { error: upErr } = await db.from("service_products")
      .update({ sale_price: price, price_overridden: true, priced_at: snapshot.appliedAt, pricing_snapshot: snapshot as any })
      .eq("id", data.productId).eq("sale_price", before.sale_price);
    if (upErr) throw new Error(upErr.message);
    await audit(db, "pricing.reprice.approved", "service_products", data.productId, { salePrice: Number(before.sale_price) }, { salePrice: price, supplierCost: cost });
    return { ok: true, price };
  });
