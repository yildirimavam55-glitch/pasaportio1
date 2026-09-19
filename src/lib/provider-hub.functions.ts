/**
 * Admin-gated Provider Hub server functions.
 * Provider API secrets are read server-side only — this module returns the
 * secret NAME and whether it is configured, never a value.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADAPTER_TYPES } from "@/providers/adapters/types";
import { balanceHealth, isCatalogueStale, normalizeInterval } from "@/domain/providers/sync-engine";
import { sanitizeAuthType, sanitizeEndpoints, sanitizeFieldMap } from "@/domain/providers/field-mapping";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Yönetici yetkisi gerekiyor.");
}

async function audit(db: any, userId: string, action: string, entityId: string | null, after: unknown) {
  await db.from("admin_audit_log").insert({
    admin_user_id: userId,
    action,
    entity_type: "providers",
    entity_id: entityId,
    after_data: after as any,
  });
}

/** Full hub state: providers, connections, sync health, balance, change counts. */
export const getProviderHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;

    const [{ data: providers }, { data: connections }, { data: runs }, { data: changes }, { data: mappings }] = await Promise.all([
      db.from("providers").select("*").order("priority"),
      db.from("provider_connections").select("*"),
      db
        .from("provider_sync_runs")
        .select("id, provider_id, status, trigger, started_at, completed_at, items_received, items_created, items_updated, items_unchanged, items_unavailable, items_returned, items_failed, price_changes, coverage_changes, complete, error_summary, checkpoint_page, items_processed, last_checkpoint_at")
        .order("started_at", { ascending: false })
        .limit(100),
      db.from("provider_catalogue_changes").select("provider_id, change_type, needs_review, created_at").order("created_at", { ascending: false }).limit(1000),
      db.from("provider_product_mappings").select("provider_id, available"),
    ]);

    const { ESIM_GO_SECRET_NAME } = await import("@/providers/adapters/esim-go.server");

    return (providers ?? []).map((provider: any) => {
      const connection = (connections ?? []).find((row: any) => row.provider_id === provider.id) ?? null;
      const providerRuns = (runs ?? []).filter((row: any) => row.provider_id === provider.id);
      const providerChanges = (changes ?? []).filter((row: any) => row.provider_id === provider.id);
      const providerMappings = (mappings ?? []).filter((row: any) => row.provider_id === provider.id);
      const secretName =
        connection?.credential_secret_names?.[0] ??
        (provider.adapter_type === "NATIVE_ESIM_GO"
          ? ESIM_GO_SECRET_NAME
          : `${String(provider.code).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`);

      return {
        id: provider.id,
        code: provider.code,
        name: provider.name,
        serviceType: provider.service_type,
        adapterType: provider.adapter_type,
        active: provider.active,
        priority: provider.priority,
        currency: provider.currency,
        capabilities: provider.capabilities ?? [],
        minimumMarginPercent: provider.minimum_margin_percent,
        autoSync: provider.auto_sync,
        syncIntervalHours: normalizeInterval(provider.sync_interval_hours),
        lowBalanceThreshold: provider.low_balance_threshold,
        balance:
          provider.balance_amount == null
            ? null
            : {
                amount: Number(provider.balance_amount),
                currency: provider.balance_currency ?? "EUR",
                checkedAt: provider.balance_checked_at,
                health: balanceHealth(Number(provider.balance_amount), provider.low_balance_threshold),
              },
        connection: connection
          ? {
              id: connection.id,
              environment: connection.environment,
              baseUrl: connection.base_url,
              status: connection.status,
              syncState: connection.sync_state,
              lastAttemptAt: connection.last_attempt_at,
              lastSuccessAt: connection.last_success_at,
              nextSyncAt: connection.next_sync_at,
              rateLimitPerMinute: connection.rate_limit_per_minute,
              config: connection.config ?? {},
            }
          : null,
        // Secret NAME only — the value never leaves the server.
        credentialSecretName: secretName,
        stale: isCatalogueStale(connection?.last_success_at ?? null, provider.sync_interval_hours),
        productCount: providerMappings.length,
        availableProductCount: providerMappings.filter((row: any) => row.available).length,
        runs: providerRuns.slice(0, 10),
        // Live progress of an unfinished, resumable run.
        activeRun: providerRuns.find((row: any) => row.status === "RUNNING") ?? null,
        changeSummary: {
          newProducts: providerChanges.filter((row: any) => row.change_type === "NEW_PRODUCT").length,
          priceIncreases: providerChanges.filter((row: any) => row.change_type === "PRICE_INCREASE").length,
          priceDecreases: providerChanges.filter((row: any) => row.change_type === "PRICE_DECREASE").length,
          removed: providerChanges.filter((row: any) => row.change_type === "PRODUCT_REMOVED").length,
          returnedProducts: providerChanges.filter((row: any) => row.change_type === "PRODUCT_RETURNED").length,
          coverageChanges: providerChanges.filter((row: any) => row.change_type === "COVERAGE_CHANGE").length,
          needsReview: providerChanges.filter((row: any) => row.needs_review && !row.reviewed_at).length,
        },
      };
    });
  });

/** Dashboard widget data: provider catalogue updates across all providers. */
export const getProviderUpdatesSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const [{ data: changes }, { data: errors }] = await Promise.all([
      db.from("provider_catalogue_changes").select("change_type, needs_review, reviewed_at").gte("created_at", since),
      db.from("provider_sync_errors").select("id").gte("created_at", since),
    ]);
    const rows = changes ?? [];
    const count = (type: string) => rows.filter((row: any) => row.change_type === type).length;
    return {
      windowDays: 7,
      newProducts: count("NEW_PRODUCT"),
      priceIncreases: count("PRICE_INCREASE"),
      priceDecreases: count("PRICE_DECREASE"),
      unavailable: count("PRODUCT_REMOVED"),
      returned: count("PRODUCT_RETURNED"),
      coverageChanges: count("COVERAGE_CHANGE"),
      needsReview: rows.filter((row: any) => row.needs_review && !row.reviewed_at).length,
      syncErrors: (errors ?? []).length,
    };
  });

/** Detailed change feed with current sale price and margin per changed item. */
export const getProviderChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId?: string }) => ({ providerId: input?.providerId ?? null }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    let query = db
      .from("provider_catalogue_changes")
      .select("id, provider_id, product_id, external_id, change_type, needs_review, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.providerId) query = query.eq("provider_id", data.providerId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const productIds = [...new Set((rows ?? []).map((row: any) => row.product_id).filter(Boolean))];
    const { data: products } = productIds.length
      ? await db.from("service_products").select("id, name, sale_price, provider_cost, currency").in("id", productIds)
      : { data: [] };
    const byId = new Map<string, any>((products ?? []).map((row: any) => [row.id as string, row]));



    return (rows ?? []).map((row: any) => {
      const product = byId.get(row.product_id);
      const salePrice = product?.sale_price == null ? null : Number(product.sale_price);
      const cost = product?.provider_cost == null ? null : Number(product.provider_cost);
      return {
        ...row,
        productName: product?.name ?? row.external_id,
        salePrice,
        providerCost: cost,
        currency: product?.currency ?? "EUR",
        marginPercent: salePrice && salePrice > 0 && cost != null ? Math.round(((salePrice - cost) / salePrice) * 1000) / 10 : null,
      };
    });
  });

export const getProviderPriceHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string }) => ({ providerId: String(input?.providerId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { data: rows, error } = await (context as Ctx).supabase
      .from("provider_price_history")
      .select("id, external_id, old_cost, new_cost, currency, change_amount, change_percent, created_at")
      .eq("provider_id", data.providerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

function parseProviderInput(input: any) {
  return {
    id: input?.id ? String(input.id) : null,
    code: String(input?.code ?? "").trim().toUpperCase().slice(0, 40),
    name: String(input?.name ?? "").trim().slice(0, 120),
    serviceType: input?.serviceType === "LOUNGE" ? "LOUNGE" : "ESIM",
    adapterType: (ADAPTER_TYPES as readonly string[]).includes(input?.adapterType) ? input.adapterType : "GENERIC_REST",
    active: Boolean(input?.active),
    priority: Number.isFinite(Number(input?.priority)) ? Math.max(1, Math.round(Number(input.priority))) : 100,
    currency: String(input?.currency ?? "EUR").toUpperCase().slice(0, 3),
    minimumMarginPercent: input?.minimumMarginPercent == null || input.minimumMarginPercent === "" ? null : Number(input.minimumMarginPercent),
    autoSync: input?.autoSync !== false,
    syncIntervalHours: normalizeInterval(input?.syncIntervalHours),
    lowBalanceThreshold: input?.lowBalanceThreshold == null || input.lowBalanceThreshold === "" ? null : Number(input.lowBalanceThreshold),
    baseUrl: input?.baseUrl ? String(input.baseUrl).trim().slice(0, 300) : null,
    credentialSecretName: String(input?.credentialSecretName ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 80),
    environment: input?.environment === "production" ? "production" : "sandbox",
    config: {
      authType: sanitizeAuthType(input?.config?.authType),
      endpoints: sanitizeEndpoints(input?.config?.endpoints),
      fieldMap: sanitizeFieldMap(input?.config?.fieldMap),
      pageSize: Number(input?.config?.pageSize) || 100,
      maxPages: Number(input?.config?.maxPages) || 60,
    },
  };
}

/** Creates or updates a provider and its connection. Secrets are never stored here. */
export const saveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(parseProviderInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    if (!data.code || !data.name) throw new Error("Provider kodu ve adı gerekli.");
    if (data.baseUrl && !/^https:\/\//i.test(data.baseUrl)) throw new Error("API adresi https:// ile başlamalı.");

    const providerPatch = {
      code: data.code,
      name: data.name,
      service_type: data.serviceType,
      adapter_type: data.adapterType,
      active: data.active,
      priority: data.priority,
      currency: data.currency,
      minimum_margin_percent: data.minimumMarginPercent,
      auto_sync: data.autoSync,
      sync_interval_hours: data.syncIntervalHours,
      low_balance_threshold: data.lowBalanceThreshold,
      capabilities: data.adapterType === "NATIVE_ESIM_GO" ? ["CATALOGUE", "REAL_TIME_AVAILABILITY", "BALANCE"] : ["CATALOGUE"],
    };

    let providerId = data.id;
    if (providerId) {
      const { error } = await db.from("providers").update(providerPatch).eq("id", providerId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await db.from("providers").insert(providerPatch).select("id").single();
      if (error) throw new Error(error.message);
      providerId = inserted.id;
    }

    const { data: existing } = await db
      .from("provider_connections")
      .select("id")
      .eq("provider_id", providerId)
      .eq("environment", data.environment)
      .maybeSingle();

    const connectionPatch = {
      provider_id: providerId,
      environment: data.environment,
      base_url: data.baseUrl,
      credential_secret_names: data.credentialSecretName ? [data.credentialSecretName] : [],
      config: data.config as any,
    };
    if (existing?.id) await db.from("provider_connections").update(connectionPatch).eq("id", existing.id);
    else await db.from("provider_connections").insert({ ...connectionPatch, status: "NOT_CONFIGURED" });

    await audit(db, (context as Ctx).userId, data.id ? "provider.updated" : "provider.created", providerId, {
      ...providerPatch,
      baseUrl: data.baseUrl,
      credentialSecretName: data.credentialSecretName,
    });
    return { id: providerId };
  });

/** Live connection check. Returns a status only — never credentials. */
export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string }) => ({ providerId: String(input?.providerId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const { data: provider } = await db.from("providers").select("id, code, name, adapter_type").eq("id", data.providerId).maybeSingle();
    if (!provider) throw new Error("Provider bulunamadı.");
    const { data: connection } = await db
      .from("provider_connections")
      .select("id, base_url, credential_secret_names, config")
      .eq("provider_id", provider.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const { buildAdapter } = await import("@/providers/adapters/factory.server");
    const adapter = buildAdapter(provider, connection ?? null);
    const result = await adapter.testConnection();
    if (connection?.id) {
      await db
        .from("provider_connections")
        .update({ status: result.status, last_checked_at: new Date().toISOString() })
        .eq("id", connection.id);
    }
    return result;
  });

/** Manual "Sync Now". Catalogue only — no orders, no provisioning. */
export const syncProviderNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string }) => ({ providerId: String(input?.providerId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const { runProviderSync } = await import("@/lib/provider-sync.server");
    const result = await runProviderSync(db, data.providerId, "MANUAL");
    await audit(db, (context as Ctx).userId, "provider.sync.manual", data.providerId, result);
    return result;
  });

/** Stops an unfinished run. The imported catalogue stays exactly as it is. */
export const cancelProviderSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string }) => ({ providerId: String(input?.providerId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const { data: run } = await db
      .from("provider_sync_runs")
      .select("id")
      .eq("provider_id", data.providerId)
      .eq("status", "RUNNING")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!run?.id) return { cancelled: false };
    await db
      .from("provider_sync_runs")
      .update({ status: "CANCELLED", completed_at: new Date().toISOString(), error_summary: "Yönetici tarafından durduruldu." })
      .eq("id", run.id);
    await db.from("provider_connections").update({ sync_state: "IDLE" }).eq("provider_id", data.providerId);
    await audit(db, (context as Ctx).userId, "provider.sync.cancelled", data.providerId, { runId: run.id });
    return { cancelled: true };
  });

export const getProviderSyncErrors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string }) => ({ providerId: String(input?.providerId ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { data: rows, error } = await (context as Ctx).supabase
      .from("provider_sync_errors")
      .select("id, external_id, code, message, created_at")
      .eq("provider_id", data.providerId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
