import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { explainPrice, pricingFromRule } from "@/domain/pricing-rule";
import { selectPricingRule } from "@/domain/providers/sync-engine";
import {
  EMPTY_MANUAL_CONFIG, packageKey, profitAndMargin, resolveManualPrice, sanitizeManualConfig,
  type ManualPriceConfig,
} from "@/domain/pricing/manual-prices";
import { costAnomalies, evaluateCompetitive, type CompetitiveStatus } from "@/domain/pricing/competitive";
import { loadEurRates, loadStore } from "@/lib/competitor-pricing.server";
import { compareFull, storedChecks, type BaseRow, type CountryCheck } from "@/domain/pricing/airalo-live";
import { AIRALO_COUNTRY_MATCH_REQUIRED, AIRALO_DESTINATION_NOT_FOUND, AIRALO_SPECIAL_DESTINATIONS } from "@/domain/pricing/airalo-destinations";
import { airaloCheckSchema } from "@/domain/pricing/airalo-check-schema";

/**
 * Manual price layers live in the Admin-only platform_settings row "manual_pricing".
 * Resolved prices are written to service_products.sale_price with price_overridden,
 * which the catalogue sync already preserves; supplier cost stays provider-owned.
 */
const SETTINGS_ID = "manual_pricing";
const DEFAULT_MIN_MARGIN = 25;

type Row = {
  id: string; iso: string | null; key: string; cost: number | null; salePrice: number | null;
  overridden: boolean; lifecycle: string; providerId: string | null; name: string; autoPrice: number | null; minMargin: number;
};

async function loadConfig(db: any): Promise<ManualPriceConfig> {
  const { data } = await db.from("platform_settings").select("data").eq("id", SETTINGS_ID).maybeSingle();
  return data ? sanitizeManualConfig(data.data) : EMPTY_MANUAL_CONFIG;
}

async function pageAll(build: (from: number, to: number) => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Single-country eSIM products with structure, cost and automatic price. */
async function loadRows(db: any, iso?: string): Promise<Row[]> {
  const details = await pageAll((a, b) => {
    let q = db.from("esim_product_details").select("product_id, country_iso, data_gb, unlimited_data, validity_days").not("country_iso", "is", null);
    if (iso) q = q.eq("country_iso", iso);
    return q.order("product_id").range(a, b);
  });
  const ids = details.map((d) => d.product_id);
  const products = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from("service_products")
      .select("id, name, provider_cost, sale_price, price_overridden, lifecycle, primary_provider_id")
      .in("id", ids.slice(i, i + 300));
    if (error) throw new Error(error.message);
    for (const p of data ?? []) products.set(p.id, p);
  }
  const { data: rules } = await db.from("pricing_rules")
    .select("id, provider_id, service_type, strategy, markup_percent, fixed_markup, minimum_margin_percent, rounding_mode, currency, active, priority")
    .eq("active", true);
  const { data: providers } = await db.from("providers").select("id, minimum_margin_percent, currency");
  const pricingCache = new Map<string, { pricing: any; min: number }>();
  const pricingFor = (providerId: string | null) => {
    const k = providerId ?? "";
    if (!pricingCache.has(k)) {
      const prov = (providers ?? []).find((p: any) => p.id === providerId);
      const provMin = prov?.minimum_margin_percent == null ? null : Number(prov.minimum_margin_percent);
      const rule = selectPricingRule((rules ?? []) as any[], { providerId: k, serviceType: "ESIM" }) as any;
      const pricing = pricingFromRule(rule, prov?.currency ?? "EUR", provMin);
      pricingCache.set(k, { pricing, min: Number(pricing?.minimumMarginPercent ?? provMin ?? DEFAULT_MIN_MARGIN) || DEFAULT_MIN_MARGIN });
    }
    return pricingCache.get(k)!;
  };
  const rows: Row[] = [];
  for (const d of details) {
    const p = products.get(d.product_id);
    if (!p) continue;
    const cost = p.provider_cost == null ? null : Number(p.provider_cost);
    const { pricing, min } = pricingFor(p.primary_provider_id);
    rows.push({
      id: p.id, iso: d.country_iso, name: p.name,
      key: packageKey({ unlimited: Boolean(d.unlimited_data), dataGb: d.data_gb == null ? null : Number(d.data_gb), validityDays: d.validity_days }),
      cost, salePrice: p.sale_price == null ? null : Number(p.sale_price), overridden: Boolean(p.price_overridden),
      lifecycle: p.lifecycle, providerId: p.primary_provider_id,
      autoPrice: cost != null && pricing ? explainPrice(cost, pricing).salePrice : null, minMargin: min,
    });
  }
  return rows;
}

function describe(row: Row, config: ManualPriceConfig) {
  const r = resolveManualPrice(config, row.iso, row.key, row.autoPrice);
  const pm = profitAndMargin(r.price, row.cost);
  return {
    ...r, ...pm,
    lowMargin: pm.margin != null && !pm.loss && pm.margin < row.minMargin,
    needsCheck: pm.loss || (pm.margin != null && pm.margin < row.minMargin) || r.price == null,
  };
}

/** Writes resolved prices for rows whose key is affected. Never touches supplier fields. */
async function applyRows(db: any, rows: Row[], config: ManualPriceConfig) {
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const r = resolveManualPrice(config, row.iso, row.key, row.autoPrice);
    if (r.price == null) continue; // never leave a product without a price
    const manual = r.source !== "AUTO";
    if (row.salePrice === r.price && row.overridden === manual) continue;
    const g = `${r.price}|${manual}`;
    groups.set(g, [...(groups.get(g) ?? []), row.id]);
  }
  let updated = 0;
  for (const [g, ids] of groups) {
    const [price, manual] = g.split("|");
    for (let i = 0; i < ids.length; i += 300) {
      const { error } = await db.from("service_products")
        .update({ sale_price: Number(price), price_overridden: manual === "true", priced_at: new Date().toISOString() })
        .in("id", ids.slice(i, i + 300));
      if (error) throw new Error(error.message);
    }
    updated += ids.length;
  }
  return updated;
}

export const getManualPricingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const [config, rows, store, rates] = await Promise.all([loadConfig(db), loadRows(db), loadStore(db), loadEurRates(db)]);
    const competitive = summarizeCompetitive(rows, config, store, rates);
    const groups = new Map<string, { key: string; products: number; countries: Set<string>; minCost: number | null; maxCost: number | null; lossCount: number; lowCount: number }>();
    const countries = new Map<string, { iso: string; packages: number; published: number; country: number; global: number; auto: number; check: number }>();
    for (const row of rows) {
      const d = describe(row, config);
      const g = groups.get(row.key) ?? { key: row.key, products: 0, countries: new Set(), minCost: null, maxCost: null, lossCount: 0, lowCount: 0 };
      g.products++; if (row.iso) g.countries.add(row.iso);
      if (row.cost != null) { g.minCost = Math.min(g.minCost ?? row.cost, row.cost); g.maxCost = Math.max(g.maxCost ?? row.cost, row.cost); }
      if (d.source === "GLOBAL" && d.loss) g.lossCount++;
      if (d.source === "GLOBAL" && d.lowMargin) g.lowCount++;
      groups.set(row.key, g);
      const c = countries.get(row.iso!) ?? { iso: row.iso!, packages: 0, published: 0, country: 0, global: 0, auto: 0, check: 0 };
      c.packages++; if (row.lifecycle === "PUBLISHED") c.published++;
      if (d.source === "COUNTRY") c.country++; else if (d.source === "GLOBAL") c.global++; else c.auto++;
      if (d.needsCheck) c.check++;
      countries.set(row.iso!, c);
    }
    return {
      competitive,
      global: config.global,
      groups: [...groups.values()].map((g) => ({ ...g, countries: g.countries.size })),
      countries: [...countries.values()].sort((a, b) => a.iso.localeCompare(b.iso)),
    };
  });

export const getCountryPricing = createServerFn({ method: "GET" })
  .inputValidator((input: { iso: string }) => ({ iso: String(input.iso).toUpperCase().slice(0, 2) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const [config, rows, store, rates] = await Promise.all([loadConfig(db), loadRows(db, data.iso), loadStore(db), loadEurRates(db)]);
    return {
      iso: data.iso,
      competitorNames: store.competitors,
      competitors: store.entries.filter((e) => e.iso === data.iso),
      airaloCheck: store.liveChecks[data.iso] ?? null,
      rates, policy: store.policy,
      rows: rows
        .map((row) => ({ id: row.id, name: row.name, key: row.key, cost: row.cost, autoPrice: row.autoPrice, lifecycle: row.lifecycle, minMargin: row.minMargin, ...describe(row, config) }))
        .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })),
    };
  });

/** Per-country competitive status counts, one evaluation per package structure (cheapest equivalent variant). */
function summarizeCompetitive(rows: Row[], config: ManualPriceConfig, store: Awaited<ReturnType<typeof loadStore>>, rates: Record<string, number>) {
  const byGroup = new Map<string, Row[]>();
  for (const r of rows) byGroup.set(`${r.iso}|${r.key}`, [...(byGroup.get(`${r.iso}|${r.key}`) ?? []), r]);
  const entries = new Map<string, typeof store.entries>();
  for (const e of store.entries) entries.set(`${e.iso}|${e.key}`, [...(entries.get(`${e.iso}|${e.key}`) ?? []), e]);
  const empty = () => ({ COMPETITIVE: 0, REVIEW: 0, UNSUITABLE: 0, NO_DATA: 0, showcase: 0 });
  const countries: Record<string, ReturnType<typeof empty>> = {};
  const totals = empty();
  for (const [gk, list] of byGroup) {
    const first = list[0]!;
    const { cheapest } = costAnomalies(list.map((r) => r.cost));
    const price = resolveManualPrice(config, first.iso, first.key, first.autoPrice).price;
    const status: CompetitiveStatus = evaluateCompetitive({ cost: cheapest, price, minMargin: first.minMargin, competitors: entries.get(gk) ?? [], rates, policy: store.policy }).status;
    const c = (countries[first.iso!] ??= empty());
    c[status]++; totals[status]++;
    if (status === "COMPETITIVE" && list.some((r) => r.lifecycle === "PUBLISHED")) { c.showcase++; totals.showcase++; }
  }
  return { totals, countries, entries: store.entries.length };
}

type Entry = { key: string; price: number | null };

/** Saves global (scope "GLOBAL") or country (ISO) manual prices; null removes the entry. */
export const saveManualPrices = createServerFn({ method: "POST" })
  .inputValidator((input: { scope: string; entries: Entry[]; confirmLoss?: boolean }) => {
    const scope = input.scope === "GLOBAL" ? "GLOBAL" : String(input.scope).toUpperCase();
    if (scope !== "GLOBAL" && !/^[A-Z]{2}$/.test(scope)) throw new Error("Geçersiz kapsam.");
    const entries = (input.entries ?? []).slice(0, 500).map((e) => {
      if (!/^(U|\d+(\.\d+)?)\|\d+$/.test(String(e.key))) throw new Error("Geçersiz paket.");
      const price = e.price == null ? null : Number(e.price);
      if (price != null && !(Number.isFinite(price) && price > 0 && price < 10000)) throw new Error("Geçersiz fiyat.");
      return { key: String(e.key), price: price == null ? null : Math.round(price * 100) / 100 };
    });
    return { scope, entries, confirmLoss: input.confirmLoss === true };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const before = await loadConfig(db);
    const next: ManualPriceConfig = { global: { ...before.global }, countries: Object.fromEntries(Object.entries(before.countries).map(([k, v]) => [k, { ...v }])) };
    const target = data.scope === "GLOBAL" ? next.global : (next.countries[data.scope] ??= {});
    for (const e of data.entries) { if (e.price == null) delete target[e.key]; else target[e.key] = e.price; }
    const clean = sanitizeManualConfig(next);

    const keys = new Set(data.entries.map((e) => e.key));
    const rows = (await loadRows(db, data.scope === "GLOBAL" ? undefined : data.scope)).filter((r) => keys.has(r.key));
    const losses = rows
      .map((r) => ({ r, d: describe(r, clean) }))
      .filter(({ d }) => d.loss && d.source !== "AUTO")
      .map(({ r, d }) => ({ name: r.name, iso: r.iso, key: r.key, cost: r.cost, price: d.price, loss: d.profit }));
    if (losses.length && !data.confirmLoss) return { ok: false as const, losses: losses.slice(0, 50), lossCount: losses.length, updated: 0 };

    const { error } = await db.from("platform_settings").upsert({ id: SETTINGS_ID, data: clean });
    if (error) throw new Error(error.message);
    const updated = await applyRows(db, rows, clean);
    await audit(db, "manual_pricing.save", "platform_settings", `${SETTINGS_ID}:${data.scope}`,
      { scope: data.scope, prices: data.scope === "GLOBAL" ? before.global : before.countries[data.scope] ?? {} },
      { scope: data.scope, prices: data.scope === "GLOBAL" ? clean.global : clean.countries[data.scope] ?? {}, updated, confirmedLosses: losses.length });
    return { ok: true as const, losses: [], lossCount: losses.length, updated };
  });

/** Read-only preview: copies only exact package structures (data/unlimited + validity) that exist in the target. */
export const previewCopyCountryPrices = createServerFn({ method: "POST" })
  .inputValidator((input: { from: string; to: string }) => ({ from: String(input.from).toUpperCase().slice(0, 2), to: String(input.to).toUpperCase().slice(0, 2) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const config = await loadConfig(db);
    const source = config.countries[data.from] ?? {};
    const targetRows = await loadRows(db, data.to);
    const targetKeys = new Set(targetRows.map((r) => r.key));
    const matches = Object.entries(source).filter(([k]) => targetKeys.has(k)).map(([key, price]) => {
      const rows = targetRows.filter((r) => r.key === key);
      const worst = rows.reduce((m, r) => Math.max(m, r.cost ?? 0), 0);
      return { key, price, current: config.countries[data.to]?.[key] ?? null, products: rows.length, loss: worst > price };
    });
    const skipped = Object.keys(source).filter((k) => !targetKeys.has(k));
    return { matches, skipped };
  });

/**
 * Full Airalo preview: compares retrieved Airalo catalogues (passed back by the Admin client)
 * against published Pasaport packages. Read-only — no prices or competitor rows are written.
 */
export const planAiraloFullCheck = createServerFn({ method: "POST" })
  .inputValidator((input: { checks: unknown }) => ({ checks: airaloCheckSchema.parse(input.checks) as CountryCheck[] }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    return runCompare(db, data.checks);
  });

/** Data-quality view from the last confirmed Airalo data. No Airalo request, no writes. */
export const getAiraloDataQuality = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const store = await loadStore(db);
    return runCompare(db, storedChecks(store.entries, store.liveChecks), true);
  });

async function runCompare(db: any, checks: CountryCheck[], stored = false) {
    const [config, rows, store] = await Promise.all([loadConfig(db), loadRows(db), loadStore(db)]);
    const best = new Map<string, BaseRow>();
    for (const row of rows) {
      if (!row.iso || row.lifecycle !== "PUBLISHED") continue;
      const d = describe(row, config);
      const k = `${row.iso}|${row.key}`;
      const prev = best.get(k);
      if (!prev || (row.cost ?? Infinity) < (prev.cost ?? Infinity)) best.set(k, { iso: row.iso, key: row.key, cost: row.cost, price: d.price, minMargin: row.minMargin });
    }
    const checkedIsos = new Set(checks.map((c) => c.iso));
    const base = [...best.values()];
    const checkedAt = new Date().toISOString();
    const result = compareFull(checks, base, store.entries, {
      notFound: AIRALO_DESTINATION_NOT_FOUND.filter((i) => !checkedIsos.has(i)),
      matchRequired: AIRALO_COUNTRY_MATCH_REQUIRED.filter((i) => !checkedIsos.has(i)),
      special: Object.keys(AIRALO_SPECIAL_DESTINATIONS).filter((i) => !checkedIsos.has(i)),
      checkedAt,
    });
    return { checkedAt, stored, pasaportCountries: new Set(base.map((b) => b.iso)).size, ...result };
}
