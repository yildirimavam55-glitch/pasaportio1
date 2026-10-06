import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { itemMargin } from "@/domain/finance/formulas";
import { explainPrice, pricingFromRule, validateRuleInput, SUPPORTED_CURRENCIES } from "@/domain/pricing-rule";
import { selectPricingRule } from "@/domain/providers/sync-engine";

const RULE_COLUMNS = "id, name, service_type, provider_id, strategy, markup_percent, fixed_markup, minimum_margin_percent, rounding_mode, currency, active, priority";

/** Resolves the rule the sync would use for a product, with the same precedence. */
async function resolveAutoPricing(db: any, product: { primary_provider_id: string | null; service_type: string }) {
  const { data: rules } = await db.from("pricing_rules").select(RULE_COLUMNS).eq("active", true);
  let providerMin: number | null = null;
  let providerCurrency = "EUR";
  if (product.primary_provider_id) {
    const { data: provider } = await db.from("providers").select("minimum_margin_percent, currency").eq("id", product.primary_provider_id).maybeSingle();
    providerMin = provider?.minimum_margin_percent == null ? null : Number(provider.minimum_margin_percent);
    providerCurrency = provider?.currency ?? "EUR";
  }
  const rule = selectPricingRule((rules ?? []) as any[], { providerId: product.primary_provider_id ?? "", serviceType: product.service_type }) as any;
  return { rule, pricing: pricingFromRule(rule, providerCurrency, providerMin) };
}

/**
 * Product management. Provider-owned fields (provider_cost, provider_currency,
 * provider_available, provider_external_id, technical details) are READ ONLY here
 * and are never written back, so a provider sync can never be overwritten by
 * Admin — and Admin-owned commercial fields are never overwritten by a sync.
 */

export const ADMIN_OWNED_FIELDS = [
  "name",
  "sale_price",
  "pricing_rule_id",
  "price_overridden",
  "badge",
  "featured",
  "customer_visible",
  "sort_order",
  "lifecycle",
] as const;

export const listPricingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db
      .from("pricing_rules")
      .select("id, name, service_type, provider_id, strategy, markup_percent, fixed_markup, minimum_margin_percent, rounding_mode, currency, active, priority")
      .order("priority");
    if (error) throw new Error(error.message);
    const rules = data ?? [];

    // Affected product count per rule + how many products still await pricing review.
    const counts = new Map<string, number>();
    for (const rule of rules) {
      const { count } = await db
        .from("service_products")
        .select("id", { count: "exact", head: true })
        .eq("pricing_rule_id", rule.id);
      counts.set(rule.id, count ?? 0);
    }
    const { count: reviewCount } = await db
      .from("service_products")
      .select("id", { count: "exact", head: true })
      .eq("pricing_review_required", true);

    return {
      rules: rules.map((rule: any) => ({ ...rule, productCount: counts.get(rule.id) ?? 0 })),
      pricingReviewRequired: reviewCount ?? 0,
    };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      salePrice?: number | null;
      pricingRuleId?: string | null;
      priceOverridden?: boolean;
      /** AUTO = follow the pricing rule; MANUAL = fixed customer price. Omit to leave price untouched. */
      pricingMode?: "AUTO" | "MANUAL";
      badge?: string | null;
      featured?: boolean;
      customerVisible?: boolean;
      sortOrder?: number;
      lifecycle?: string;
      marketingDescription?: string | null;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: before, error: readError } = await db
      .from("service_products")
      .select("id, name, sale_price, provider_cost, currency, badge, featured, customer_visible, sort_order, lifecycle, pricing_rule_id, price_overridden, margin_flagged, primary_provider_id, service_type")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!before) throw new Error("Ürün bulunamadı.");

    const patch: Record<string, unknown> = {};
    if (data.name != null) patch["name"] = String(data.name).slice(0, 180);
    // Pricing source. Supplier cost is never written here.
    let pricingAction: string | null = null;
    if (data.pricingMode === "MANUAL") {
      const price = Number(data.salePrice);
      if (data.salePrice == null || !Number.isFinite(price) || price <= 0) throw new Error("Manuel satış fiyatı 0'dan büyük olmalı.");
      const rounded = Math.round(price * 100) / 100;
      patch["sale_price"] = rounded;
      patch["price_overridden"] = true;
      pricingAction = before.price_overridden
        ? (Number(before.sale_price) !== rounded ? "pricing.override.changed" : null)
        : "pricing.override.created";
    } else if (data.pricingMode === "AUTO") {
      // Legacy rule recalculation is disabled: removing the manual mark keeps the
      // current selling price unchanged. New prices need explicit Admin approval.
      patch["price_overridden"] = false;
      pricingAction = before.price_overridden ? "pricing.override.removed" : null;
    }
    if (data.pricingRuleId !== undefined && data.pricingMode !== "AUTO") patch["pricing_rule_id"] = data.pricingRuleId || null;
    if (data.badge !== undefined) patch["badge"] = data.badge ? String(data.badge).slice(0, 40) : null;
    if (data.featured !== undefined) patch["featured"] = Boolean(data.featured);
    if (data.customerVisible !== undefined) patch["customer_visible"] = Boolean(data.customerVisible);
    if (data.sortOrder !== undefined) patch["sort_order"] = Number(data.sortOrder) || 0;
    if (data.lifecycle && ["DRAFT", "READY", "PUBLISHED", "PAUSED", "ARCHIVED"].includes(data.lifecycle)) {
      patch["lifecycle"] = data.lifecycle;
    }

    /** Margin protection uses the provider-owned cost, never an admin-supplied one. */
    let minimumMargin: number | null = null;
    if (before.pricing_rule_id || data.pricingRuleId) {
      const ruleId = data.pricingRuleId ?? before.pricing_rule_id;
      if (ruleId) {
        const { data: rule } = await db.from("pricing_rules").select("minimum_margin_percent").eq("id", ruleId).maybeSingle();
        minimumMargin = rule?.minimum_margin_percent == null ? null : Number(rule.minimum_margin_percent);
      }
    }
    const nextPrice = (patch["sale_price"] as number | null | undefined) ?? Number(before.sale_price ?? 0);
    const margin = itemMargin(Number(nextPrice ?? 0), Number(before.provider_cost ?? 0));
    if (minimumMargin != null) patch["margin_flagged"] = margin.percent != null && margin.percent < minimumMargin;

    const { data: after, error } = await db.from("service_products").update(patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);

    if (data.marketingDescription !== undefined) {
      const { error: translationError } = await db
        .from("product_translations")
        .upsert(
          { product_id: data.id, locale: "tr", short_description: data.marketingDescription ? String(data.marketingDescription).slice(0, 600) : null },
          { onConflict: "product_id,locale" },
        );
      if (translationError) throw new Error(translationError.message);
    }

    await audit(db, "product.update", "service_product", data.id, before, patch);
    if (pricingAction) {
      await audit(db, pricingAction, "service_product", data.id,
        { salePrice: before.sale_price, manual: before.price_overridden, providerCost: before.provider_cost },
        { salePrice: patch["sale_price"], manual: patch["price_overridden"] });
    }
    return { product: after, margin, minimumMargin };
  });

/** Safe bulk actions over selected products. Provider data is never touched. */
export const bulkUpdateProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      ids: string[];
      action:
        | "PUBLISH"
        | "PAUSE"
        | "SHOW"
        | "HIDE"
        | "FEATURE"
        | "UNFEATURE"
        | "ASSIGN_RULE"
        | "SORT";
      pricingRuleId?: string | null;
      sortOrder?: number;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const ids = (data.ids ?? []).filter(Boolean).slice(0, 500);
    if (!ids.length) throw new Error("Ürün seçilmedi.");

    const patch: Record<string, unknown> =
      data.action === "PUBLISH" ? { lifecycle: "PUBLISHED" }
      : data.action === "PAUSE" ? { lifecycle: "PAUSED" }
      : data.action === "SHOW" ? { customer_visible: true }
      : data.action === "HIDE" ? { customer_visible: false }
      : data.action === "FEATURE" ? { featured: true }
      : data.action === "UNFEATURE" ? { featured: false }
      : data.action === "ASSIGN_RULE" ? { pricing_rule_id: data.pricingRuleId || null }
      : { sort_order: Number(data.sortOrder) || 0 };

    const { error } = await db.from("service_products").update(patch).in("id", ids);
    if (error) throw new Error(error.message);
    await audit(db, "product.bulk_update", "service_product", null, { count: ids.length }, { action: data.action, ...patch });
    return { ok: true, count: ids.length };
  });

/** Pricing rule manager. A manual product price override is never silently replaced. */
export const savePricingRule = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      serviceType?: "ESIM" | "LOUNGE" | null;
      strategy: "MANUAL" | "MARKUP_PERCENT" | "FIXED_MARKUP";
      markupPercent?: number | null;
      fixedMarkup?: number | null;
      minimumMarginPercent?: number | null;
      roundingMode?: string | null;
      currency?: string | null;
      active?: boolean;
      priority?: number;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const currency = String(data.currency ?? "EUR").toUpperCase();
    const invalid = validateRuleInput({ ...data, currency });
    if (invalid) throw new Error(invalid);
    if (!Number.isFinite(Number(data.priority ?? 0))) throw new Error("Öncelik geçersiz.");
    const patch: Record<string, unknown> = {
      name: String(data.name ?? "").slice(0, 120) || "Kural",
      service_type: data.serviceType === "ESIM" || data.serviceType === "LOUNGE" ? data.serviceType : null,
      strategy: ["MANUAL", "MARKUP_PERCENT", "FIXED_MARKUP"].includes(data.strategy) ? data.strategy : "MANUAL",
      markup_percent: data.markupPercent == null || data.markupPercent === ("" as any) ? null : Number(data.markupPercent),
      fixed_markup: data.fixedMarkup == null || data.fixedMarkup === ("" as any) ? null : Number(data.fixedMarkup),
      minimum_margin_percent: data.minimumMarginPercent == null || data.minimumMarginPercent === ("" as any) ? null : Number(data.minimumMarginPercent),
      // Only rounding modes the pricing engine actually implements are accepted.
      rounding_mode: ["NONE", "NEAREST_99", "NEAREST_95", "INTEGER", "TWO_DECIMALS"].includes(String(data.roundingMode))
        ? String(data.roundingMode)
        : "TWO_DECIMALS",
      currency: (SUPPORTED_CURRENCIES as readonly string[]).includes(currency) ? currency : "EUR",
      active: data.active !== false,
      priority: Number(data.priority) || 0,
    };
    if (data.id) {
      const { data: previous } = await db.from("pricing_rules").select(RULE_COLUMNS).eq("id", data.id).maybeSingle();
      const { error } = await db.from("pricing_rules").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(db, "pricing_rule.update", "pricing_rule", data.id, previous, patch);
      if (previous && Number(previous.markup_percent) !== Number(patch["markup_percent"])) {
        await audit(db, "pricing_rule.markup_changed", "pricing_rule", data.id,
          { markupPercent: previous.markup_percent }, { markupPercent: patch["markup_percent"] });
      }
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await db.from("pricing_rules").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    await audit(db, "pricing_rule.create", "pricing_rule", inserted.id, null, patch);
    return { ok: true, id: inserted.id as string };
  });

/** Rules are archived (deactivated), never deleted, so historic pricing stays explainable. */
export const archivePricingRule = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.from("pricing_rules").update({ active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, "pricing_rule.archive", "pricing_rule", data.id, null, { active: false });
    return { ok: true };
  });

/**
 * READ-ONLY impact preview for a (draft) rule. Uses the same rule→pricing
 * conversion and pricing engine as the sync. Nothing is written.
 * Affected = non-overridden, priced products in the rule's scope.
 */
export const previewPricingRuleImpact = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      serviceType?: "ESIM" | "LOUNGE" | null;
      providerId?: string | null;
      strategy: "MANUAL" | "MARKUP_PERCENT" | "FIXED_MARKUP";
      markupPercent?: number | null;
      fixedMarkup?: number | null;
      minimumMarginPercent?: number | null;
      roundingMode?: string | null;
      currency?: string | null;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const invalid = validateRuleInput({ ...data, currency: data.currency ?? "EUR" });
    if (invalid) return { error: invalid, affected: 0, overridden: 0, samples: [] as any[] };
    const pricing = pricingFromRule({
      strategy: data.strategy, markup_percent: data.markupPercent ?? null, fixed_markup: data.fixedMarkup ?? null,
      minimum_margin_percent: data.minimumMarginPercent ?? null, rounding_mode: data.roundingMode, currency: data.currency ?? "EUR",
    }, "EUR", null);
    if (!pricing) return { error: "Bu ayarla otomatik fiyat hesaplanamaz (elle fiyatlamada ürün fiyatları değişmez).", affected: 0, overridden: 0, samples: [] as any[] };

    const scoped = () => {
      let q = db.from("service_products").select("id", { count: "exact", head: true }).not("provider_cost", "is", null);
      if (data.serviceType) q = q.eq("service_type", data.serviceType);
      if (data.providerId) q = q.eq("primary_provider_id", data.providerId);
      return q;
    };
    const [{ count: affected }, { count: overridden }] = await Promise.all([
      scoped().eq("price_overridden", false),
      scoped().eq("price_overridden", true),
    ]);

    const patterns = ["%, Turkey, V2", "%, Germany, V2", "%Europe+%", "%Unlimited%Turkey%", "%Unlimited%"];
    const samples: any[] = [];
    for (const pattern of patterns) {
      let q = db.from("service_products").select("id, name, provider_cost, sale_price, currency")
        .eq("price_overridden", false).not("provider_cost", "is", null).ilike("name", pattern).order("provider_cost").limit(2);
      if (data.serviceType) q = q.eq("service_type", data.serviceType);
      if (data.providerId) q = q.eq("primary_provider_id", data.providerId);
      const { data: rows } = await q;
      for (const row of rows ?? []) if (!samples.some((s) => s.id === row.id)) samples.push(row);
      if (samples.length >= 8) break;
    }
    return {
      error: null,
      affected: affected ?? 0,
      overridden: overridden ?? 0,
      samples: samples.slice(0, 8).map((row) => {
        const next = explainPrice(Number(row.provider_cost), pricing);
        return { id: row.id, name: row.name, providerCost: Number(row.provider_cost), currentPrice: row.sale_price == null ? null : Number(row.sale_price), newPrice: next.salePrice, rawPrice: next.rawPrice, currency: pricing.currency };
      }),
    };
  });
