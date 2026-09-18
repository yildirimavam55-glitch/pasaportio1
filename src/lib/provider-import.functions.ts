import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildDiff,
  hashItem,
  missingExternalIds,
  parseEsimCatalogue,
  priceItems,
  type DiffRow,
  type ExistingRef,
  type ImportIssue,
  type PricingInput,
} from "@/domain/providers/esim-import";
import { TEST_FLAG_KEY, TEST_SOURCE } from "@/lib/test-catalogue.functions";

export const PROVIDER_SOURCE = "PROVIDER";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Yönetici yetkisi gerekiyor.");
}

function normalizePricing(input: any): PricingInput {
  const strategy = ["MANUAL", "MARKUP_PERCENT", "FIXED_MARKUP", "MINIMUM_MARGIN"].includes(input?.strategy)
    ? input.strategy
    : "MARKUP_PERCENT";
  return {
    strategy,
    markupPercent: input?.markupPercent == null ? null : Number(input.markupPercent),
    fixedMarkup: input?.fixedMarkup == null ? null : Number(input.fixedMarkup),
    minimumMarginPercent: input?.minimumMarginPercent == null ? null : Number(input.minimumMarginPercent),
    roundingMode: ["NONE", "NEAREST_99", "NEAREST_95", "INTEGER", "TWO_DECIMALS"].includes(input?.roundingMode)
      ? input.roundingMode
      : "NEAREST_99",
    currency: String(input?.currency ?? "EUR").toUpperCase().slice(0, 3),
  };
}

function parseInput(input: any) {
  return {
    providerId: String(input?.providerId ?? ""),
    payloadText: String(input?.payloadText ?? ""),
    pricing: normalizePricing(input?.pricing),
    publish: Boolean(input?.publish),
    markMissingUnavailable: input?.markMissingUnavailable !== false,
  };
}

/** Provider + catalogue state for the import screen. Never returns credentials. */
export const getEsimImportOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;

    const [{ data: providers }, { data: products }, { data: flag }, { data: runs }] = await Promise.all([
      db.from("providers").select("id, code, name, service_type, active, capabilities").eq("service_type", "ESIM").order("priority"),
      db.from("service_products").select("id, is_test, source, lifecycle, customer_visible, primary_provider_id").eq("service_type", "ESIM"),
      db.from("feature_flags").select("enabled").eq("key", TEST_FLAG_KEY).maybeSingle(),
      db.from("provider_sync_runs").select("id, provider_id, status, started_at, completed_at, items_received, items_created, items_updated, items_unchanged, items_unavailable, items_failed").order("started_at", { ascending: false }).limit(5),
    ]);

    const rows = products ?? [];
    return {
      providers: (providers ?? []).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        active: Boolean(row.active),
        capabilities: row.capabilities ?? [],
        productCount: rows.filter((p: any) => p.primary_provider_id === row.id).length,
      })),
      counts: {
        test: rows.filter((r: any) => r.is_test).length,
        testVisible: rows.filter((r: any) => r.is_test && r.customer_visible).length,
        real: rows.filter((r: any) => !r.is_test).length,
        published: rows.filter((r: any) => !r.is_test && r.lifecycle === "PUBLISHED" && r.customer_visible).length,
      },
      showTestCatalogue: Boolean(flag?.enabled),
      recentRuns: runs ?? [],
    };
  });

/** Register a real eSIM provider record (no secrets are stored here). */
export const createEsimProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; name: string }) => ({
    code: String(input.code ?? "").trim().toUpperCase().slice(0, 40),
    name: String(input.name ?? "").trim().slice(0, 120),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (!data.code || !data.name) throw new Error("Provider kodu ve adı gerekli.");
    const db = (context as Ctx).supabase;
    const { data: row, error } = await db
      .from("providers")
      .insert({ code: data.code, name: data.name, service_type: "ESIM", active: true, capabilities: ["CATALOGUE"] })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await db.from("admin_audit_log").insert({
      admin_user_id: (context as Ctx).userId,
      action: "provider.created",
      entity_type: "providers",
      entity_id: row.id,
      after_data: { code: data.code, name: data.name, service_type: "ESIM" },
    });
    return { id: row.id };
  });

async function loadExisting(db: any, providerId: string): Promise<ExistingRef[]> {
  const { data, error } = await db
    .from("provider_raw_items")
    .select("external_id, payload_hash")
    .eq("provider_id", providerId)
    .eq("service_type", "ESIM");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({ externalId: row.external_id, providerCost: null, hash: row.payload_hash }));
}

export type ImportPreview = {
  providerCode: string;
  diff: DiffRow[];
  issues: ImportIssue[];
  missing: string[];
  summary: { total: number; created: number; updated: number; unchanged: number; invalid: number; marginFlagged: number };
};

/** Dry run: parse, price and diff a provider export without writing anything. */
export const previewEsimImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseInput)
  .handler(async ({ data, context }): Promise<ImportPreview> => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const { data: provider, error } = await db.from("providers").select("id, code").eq("id", data.providerId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!provider) throw new Error("Provider bulunamadı.");

    let json: unknown;
    try {
      json = JSON.parse(data.payloadText);
    } catch {
      throw new Error("Provider verisi geçerli JSON değil.");
    }

    const parsed = parseEsimCatalogue(json, data.pricing.currency);
    const priced = priceItems(parsed.items, data.pricing, provider.code);
    const existing = await loadExisting(db, provider.id);
    const diff = buildDiff(priced, existing);

    return {
      providerCode: provider.code,
      diff,
      issues: parsed.issues,
      missing: missingExternalIds(priced, existing),
      summary: {
        total: diff.length,
        created: diff.filter((r) => r.status === "NEW").length,
        updated: diff.filter((r) => r.status === "UPDATED").length,
        unchanged: diff.filter((r) => r.status === "UNCHANGED").length,
        invalid: parsed.issues.length,
        marginFlagged: diff.filter((r) => r.belowMinimumMargin).length,
      },
    };
  });

/** Idempotent import: upserts raw items, products, eSIM details and provider mappings. */
export const applyEsimImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const userId = (context as Ctx).userId;

    const { data: provider } = await db.from("providers").select("id, code, name").eq("id", data.providerId).maybeSingle();
    if (!provider) throw new Error("Provider bulunamadı.");

    let json: unknown;
    try {
      json = JSON.parse(data.payloadText);
    } catch {
      throw new Error("Provider verisi geçerli JSON değil.");
    }

    const parsed = parseEsimCatalogue(json, data.pricing.currency);
    const priced = priceItems(parsed.items, data.pricing, provider.code);
    if (!priced.length) throw new Error("İçe aktarılabilir geçerli ürün bulunamadı.");

    const existing = await loadExisting(db, provider.id);
    const diff = buildDiff(priced, existing);
    const statusById = new Map(diff.map((row) => [row.externalId, row.status]));

    const { data: run } = await db
      .from("provider_sync_runs")
      .insert({ provider_id: provider.id, status: "RUNNING", trigger: "MANUAL", items_received: priced.length })
      .select("id")
      .single();

    const { data: mappingRows } = await db
      .from("provider_product_mappings")
      .select("external_id, product_id")
      .eq("provider_id", provider.id);
    const productByExternal = new Map((mappingRows ?? []).map((row: any) => [row.external_id, row.product_id as string]));

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of priced) {
      try {
        const hash = hashItem(item);
        const { data: rawRow, error: rawError } = await db
          .from("provider_raw_items")
          .upsert(
            {
              provider_id: provider.id,
              external_id: item.externalId,
              service_type: "ESIM",
              payload: item.payload as any,
              payload_hash: hash,
              available: true,
              last_seen_at: new Date().toISOString(),
              last_sync_run_id: run?.id ?? null,
            },
            { onConflict: "provider_id,external_id" },
          )
          .select("id")
          .single();
        if (rawError) throw new Error(rawError.message);

        let productId = productByExternal.get(item.externalId) ?? null;
        if (!productId) {
          const { data: bySlug } = await db.from("service_products").select("id").eq("slug", item.slug).maybeSingle();
          productId = bySlug?.id ?? null;
        }

        const base = {
          service_type: "ESIM" as const,
          name: item.name,
          slug: item.slug,
          currency: data.pricing.currency,
          provider_cost: item.providerCost,
          provider_currency: item.providerCurrency,
          provider_external_id: item.externalId,
          primary_provider_id: provider.id,
          provider_available: true,
          provider_synced_at: new Date().toISOString(),
          source: PROVIDER_SOURCE,
          is_test: false,
          margin_flagged: item.belowMinimumMargin,
        };

        if (!productId) {
          const { data: inserted, error: insertError } = await db
            .from("service_products")
            .insert({
              ...base,
              sale_price: item.salePrice,
              lifecycle: data.publish ? "PUBLISHED" : "DRAFT",
              customer_visible: data.publish,
            })
            .select("id")
            .single();
          if (insertError) throw new Error(insertError.message);
          productId = inserted.id as string;
          created += 1;
        } else {
          const { data: current } = await db
            .from("service_products")
            .select("price_overridden, lifecycle, customer_visible")
            .eq("id", productId)
            .maybeSingle();
          const patch: Record<string, unknown> = { ...base };
          // Admin-owned marketing name is never silently overwritten by provider sync.
          delete patch["name"];
          // Admin-owned sale price is never silently overwritten.
          if (!current?.price_overridden) patch["sale_price"] = item.salePrice;
          if (data.publish && ["IMPORTED", "DRAFT", "UNAVAILABLE"].includes(current?.lifecycle ?? "")) {
            patch["lifecycle"] = "PUBLISHED";
            patch["customer_visible"] = true;
          }
          const { error: updateError } = await db.from("service_products").update(patch).eq("id", productId);
          if (updateError) throw new Error(updateError.message);
          if (statusById.get(item.externalId) === "UNCHANGED") unchanged += 1;
          else updated += 1;
        }

        const { error: detailError } = await db.from("esim_product_details").upsert(
          {
            product_id: productId,
            country_iso: item.countryIso,
            coverage_country_isos: item.coverage,
            package_kind: item.packageKind,
            data_gb: item.dataGb,
            data_type: item.dataType,
            unlimited_data: item.unlimited,
            validity_days: item.validityDays,
            raw_validity_value: item.rawValidityValue,
            raw_validity_unit: item.rawValidityUnit,
            activation_policy: item.activationPolicy,
            fair_use_note: item.fairUseNote,
            provider_bundle_id: item.externalId,

            network_operators: item.networks,
            supports_5g: item.supports5g,
            supports_hotspot: item.supportsHotspot,
            topup_supported: item.topupSupported,
            provider_metadata: item.payload as any,
          },
          { onConflict: "product_id" },
        );
        if (detailError) throw new Error(detailError.message);

        const { error: mapError } = await db.from("provider_product_mappings").upsert(
          {
            provider_id: provider.id,
            external_id: item.externalId,
            product_id: productId,
            raw_item_id: rawRow?.id ?? null,
            provider_cost: item.providerCost,
            provider_currency: item.providerCurrency,
            available: true,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "provider_id,external_id" },
        );
        if (mapError) throw new Error(mapError.message);

        if (item.belowMinimumMargin) {
          await db.from("ops_alerts").insert({
            type: "MARGIN_BELOW_MINIMUM",
            severity: "WARNING",
            message: `${item.name}: satış fiyatı yapılandırılan minimum marjın altında.`,
            entity_type: "service_products",
            entity_id: productId,
            context: { externalId: item.externalId, marginPercent: item.marginPercent },
          });
        }
      } catch (error) {
        failed += 1;
        errors.push(`${item.externalId}: ${(error as Error).message}`);
      }
    }

    // Vanished provider items are marked unavailable, never deleted.
    const missing = data.markMissingUnavailable ? missingExternalIds(priced, existing) : [];
    if (missing.length) {
      await db.from("provider_raw_items").update({ available: false }).eq("provider_id", provider.id).in("external_id", missing);
      await db.from("provider_product_mappings").update({ available: false }).eq("provider_id", provider.id).in("external_id", missing);
      await db
        .from("service_products")
        .update({ provider_available: false, customer_visible: false, lifecycle: "UNAVAILABLE" })
        .eq("primary_provider_id", provider.id)
        .in("provider_external_id", missing);
    }

    if (run?.id) {
      await db
        .from("provider_sync_runs")
        .update({
          status: failed ? (created + updated ? "PARTIAL" : "FAILED") : "SUCCESS",
          completed_at: new Date().toISOString(),
          items_created: created,
          items_updated: updated,
          items_unchanged: unchanged,
          items_unavailable: missing.length,
          items_failed: failed,
          error_summary: errors.length ? errors.slice(0, 5).join(" | ") : null,
        })
        .eq("id", run.id);
    }

    await db.from("admin_audit_log").insert({
      admin_user_id: userId,
      action: "catalogue.import.esim",
      entity_type: "providers",
      entity_id: provider.id,
      after_data: { created, updated, unchanged, unavailable: missing.length, failed, publish: data.publish, pricing: data.pricing },
    });

    return { created, updated, unchanged, failed, unavailable: missing.length, invalid: parsed.issues.length, errors: errors.slice(0, 5) };
  });

/** Hide the INTERNAL_TEST catalogue: kill switch off + test rows paused. Nothing is deleted. */
export const hideTestEsimCatalogue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { serviceType?: "ESIM" | "LOUNGE" | "ALL" }) => ({ serviceType: input?.serviceType ?? "ALL" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;

    await db.from("feature_flags").update({ enabled: false }).eq("key", TEST_FLAG_KEY);
    let query = db
      .from("service_products")
      .update({ customer_visible: false, lifecycle: "PAUSED" })
      .eq("is_test", true)
      .eq("source", TEST_SOURCE);
    if (data.serviceType !== "ALL") query = query.eq("service_type", data.serviceType);
    const { error } = await query;
    if (error) throw new Error(error.message);

    await db.from("admin_audit_log").insert({
      admin_user_id: (context as Ctx).userId,
      action: "catalogue.test.hidden",
      entity_type: "service_products",
      entity_id: data.serviceType,
      after_data: { showTestCatalogue: false, lifecycle: "PAUSED" },
    });
    return { ok: true };
  });
