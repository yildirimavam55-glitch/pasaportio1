/**
 * Phase 2A catalogue synchronisation engine (server only).
 *
 * Provider API -> Adapter -> Raw provider data -> Normalizer -> Internal
 * catalogue -> Pricing rules -> Published products.
 *
 * Safety rules enforced here:
 *  - nothing is ever hard-deleted
 *  - missing items are only marked unavailable after a COMPLETE, SUCCESSFUL fetch
 *  - admin-owned fields (sale price when overridden, marketing name, badge,
 *    featured, visibility, lifecycle, sort order, images, SEO) are never written
 *  - new provider products default to DRAFT
 *  - provider cost changes are always written to history
 */
import { parseEsimCatalogue, priceItems, hashItem, type PricedItem, type PricingInput } from "@/domain/providers/esim-import";
import {
  balanceHealth,
  classifyItem,
  computeCostChange,
  isCatalogueStale,
  isSyncDue,
  mapCoverageToCanonical,
  nextSyncAt,
  normalizeInterval,
  resolveMissingItems,
  resolveSyncStatus,
  type CatalogueChange,
  type CatalogueSnapshotItem,
} from "@/domain/providers/sync-engine";
import { buildAdapter } from "@/providers/adapters/factory.server";

type Db = any;

export type SyncResult = {
  providerId: string;
  providerCode: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  runId: string | null;
  itemsReceived: number;
  created: number;
  updated: number;
  unchanged: number;
  unavailable: number;
  returned: number;
  priceChanges: number;
  coverageChanges: number;
  failed: number;
  error?: string | null;
};

async function adminDb(): Promise<Db> {
  const mod = await import("@/integrations/supabase/client.server");
  return (mod as any).supabaseAdmin;
}

function pricingFromRule(rule: any, providerCurrency: string, providerMinMargin: number | null): PricingInput {
  if (!rule) {
    return {
      strategy: "MARKUP_PERCENT",
      markupPercent: 35,
      minimumMarginPercent: providerMinMargin,
      roundingMode: "NEAREST_99",
      currency: providerCurrency,
    };
  }
  return {
    strategy: rule.strategy,
    markupPercent: rule.markup_percent == null ? null : Number(rule.markup_percent),
    fixedMarkup: rule.fixed_markup == null ? null : Number(rule.fixed_markup),
    minimumMarginPercent:
      rule.minimum_margin_percent == null ? providerMinMargin : Number(rule.minimum_margin_percent),
    roundingMode: ["NONE", "NEAREST_99", "NEAREST_95", "INTEGER", "TWO_DECIMALS"].includes(rule.rounding_mode)
      ? rule.rounding_mode
      : "NEAREST_99",
    currency: String(rule.currency ?? providerCurrency).toUpperCase().slice(0, 3),
  };
}

function snapshotOf(item: PricedItem): CatalogueSnapshotItem {
  return {
    externalId: item.externalId,
    providerCost: item.providerCost,
    currency: item.providerCurrency,
    coverage: item.coverage,
    validityDays: item.validityDays,
    dataGb: item.dataGb,
    unlimited: item.unlimited,
    available: true,
  };
}

/** Runs one full catalogue sync for a provider. Never places provider orders. */
export async function runProviderSync(
  db: Db,
  providerId: string,
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK" = "MANUAL",
): Promise<SyncResult> {
  const { data: provider } = await db
    .from("providers")
    .select("id, code, name, service_type, adapter_type, currency, minimum_margin_percent, sync_interval_hours, low_balance_threshold, active")
    .eq("id", providerId)
    .maybeSingle();
  if (!provider) throw new Error("Provider bulunamadı.");

  const { data: connection } = await db
    .from("provider_connections")
    .select("id, base_url, credential_secret_names, config, environment, sync_state")
    .eq("provider_id", providerId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const base: SyncResult = {
    providerId,
    providerCode: provider.code,
    status: "FAILED",
    runId: null,
    itemsReceived: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    unavailable: 0,
    returned: 0,
    priceChanges: 0,
    coverageChanges: 0,
    failed: 0,
  };

  const adapter = buildAdapter(provider, connection ?? null);
  const nowIso = new Date().toISOString();

  if (!adapter.hasCredential()) {
    if (connection?.id) {
      await db
        .from("provider_connections")
        .update({ status: "CREDENTIAL_REQUIRED", sync_state: "IDLE", last_attempt_at: nowIso })
        .eq("id", connection.id);
    }
    return { ...base, error: "CREDENTIAL_REQUIRED" };
  }

  const { data: run } = await db
    .from("provider_sync_runs")
    .insert({ provider_id: providerId, connection_id: connection?.id ?? null, trigger, status: "RUNNING" })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  if (connection?.id) {
    await db.from("provider_connections").update({ sync_state: "RUNNING", last_attempt_at: nowIso }).eq("id", connection.id);
  }

  const finish = async (result: SyncResult, complete: boolean) => {
    if (runId) {
      await db
        .from("provider_sync_runs")
        .update({
          status: result.status,
          completed_at: new Date().toISOString(),
          items_received: result.itemsReceived,
          items_created: result.created,
          items_updated: result.updated,
          items_unchanged: result.unchanged,
          items_unavailable: result.unavailable,
          items_failed: result.failed,
          items_returned: result.returned,
          price_changes: result.priceChanges,
          coverage_changes: result.coverageChanges,
          complete,
          error_summary: result.error ?? null,
        })
        .eq("id", runId);
    }
    const interval = normalizeInterval(provider.sync_interval_hours);
    const patch: Record<string, unknown> = {
      sync_state: "IDLE",
      status: result.status === "FAILED" ? "ERROR" : "CONNECTED",
      next_sync_at: nextSyncAt(new Date(), interval).toISOString(),
      last_checked_at: new Date().toISOString(),
    };
    if (result.status !== "FAILED") {
      patch["last_success_at"] = new Date().toISOString();
      patch["last_sync_at"] = new Date().toISOString();
    }
    if (connection?.id) await db.from("provider_connections").update(patch).eq("id", connection.id);
    return result;
  };

  // 1. Fetch the whole catalogue.
  const fetched = await adapter.fetchCatalogue();
  if (!fetched.complete && fetched.items.length === 0) {
    await db.from("provider_sync_errors").insert({
      provider_id: providerId,
      sync_run_id: runId,
      code: "CATALOGUE_FETCH_FAILED",
      message: fetched.error ?? "Katalog alınamadı.",
    });
    await db.from("ops_alerts").insert({
      type: "CATALOGUE_SYNC_FAILED",
      severity: "ERROR",
      message: `${provider.name}: katalog senkronizasyonu başarısız (${fetched.error ?? "bilinmeyen hata"}).`,
      entity_type: "providers",
      entity_id: providerId,
      context: { trigger },
    });
    // Nothing is marked unavailable because of a failed fetch.
    return finish({ ...base, runId, status: "FAILED", error: fetched.error ?? "Katalog alınamadı." }, false);
  }

  // 2. Normalize + price.
  const parsed = parseEsimCatalogue(fetched.items, provider.currency ?? "EUR");
  const { data: rule } = await db
    .from("pricing_rules")
    .select("id, strategy, markup_percent, fixed_markup, minimum_margin_percent, rounding_mode, currency, priority")
    .eq("active", true)
    .or(`provider_id.eq.${providerId},service_type.eq.${provider.service_type}`)
    .order("priority")
    .limit(1)
    .maybeSingle();
  const providerMinMargin = provider.minimum_margin_percent == null ? null : Number(provider.minimum_margin_percent);
  const pricing = pricingFromRule(rule, provider.currency ?? "EUR", providerMinMargin);
  const priced = priceItems(parsed.items, pricing, provider.code);

  for (const issue of parsed.issues.slice(0, 50)) {
    await db.from("provider_sync_errors").insert({
      provider_id: providerId,
      sync_run_id: runId,
      external_id: issue.externalId,
      code: "INVALID_ITEM",
      message: issue.message,
    });
  }

  // 3. Previous valid snapshot.
  const [{ data: rawRows }, { data: mappingRows }] = await Promise.all([
    db.from("provider_raw_items").select("external_id, payload_hash, available").eq("provider_id", providerId),
    db.from("provider_product_mappings").select("external_id, product_id, provider_cost, available").eq("provider_id", providerId),
  ]);
  const rawByExternal = new Map((rawRows ?? []).map((row: any) => [row.external_id, row]));
  const mappingByExternal = new Map((mappingRows ?? []).map((row: any) => [row.external_id, row]));

  const previousSnapshot = new Map<string, CatalogueSnapshotItem>();
  // Previous technical attributes come from the internal catalogue so the diff
  // engine reports real coverage/validity/data changes only.
  const previousProductIds = [...mappingByExternal.values()].map((row: any) => row.product_id).filter(Boolean);
  const detailByProduct = new Map<string, any>();
  for (let i = 0; i < previousProductIds.length; i += 300) {
    const { data: details } = await db
      .from("esim_product_details")
      .select("product_id, coverage_country_isos, validity_days, data_gb, unlimited_data")
      .in("product_id", previousProductIds.slice(i, i + 300));
    for (const row of details ?? []) detailByProduct.set(row.product_id, row);
  }

  for (const [externalId, mapping] of mappingByExternal) {
    const payload = (rawByExternal.get(externalId) as any) ?? null;
    const detail = detailByProduct.get((mapping as any).product_id) ?? null;
    previousSnapshot.set(externalId as string, {
      externalId: externalId as string,
      providerCost: (mapping as any).provider_cost == null ? null : Number((mapping as any).provider_cost),
      currency: provider.currency ?? "EUR",
      coverage: detail?.coverage_country_isos ?? [],
      validityDays: detail?.validity_days ?? null,
      dataGb: detail?.data_gb == null ? null : Number(detail.data_gb),
      unlimited: Boolean(detail?.unlimited_data),
      available: Boolean((mapping as any).available && (payload?.available ?? true)),
    });
  }


  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let returned = 0;
  let priceChanges = 0;
  let coverageChanges = 0;
  const changeRows: any[] = [];
  const unknownIsos = new Set<string>();

  for (const item of priced) {
    try {
      const coverage = mapCoverageToCanonical(item.coverage);
      coverage.unknown.forEach((iso) => unknownIsos.add(iso));
      if (!coverage.canonical.length) {
        failed += 1;
        await db.from("provider_sync_errors").insert({
          provider_id: providerId,
          sync_run_id: runId,
          external_id: item.externalId,
          code: "UNKNOWN_COUNTRY_ISO",
          message: `Kapsama ülkeleri kanonik ülke listesiyle eşleşmedi: ${item.coverage.join(", ")}`,
        });
        continue;
      }

      const previous = previousSnapshot.get(item.externalId);
      const previousRaw = rawByExternal.get(item.externalId) as any;
      const previousMapping = mappingByExternal.get(item.externalId) as any;
      const hash = hashItem(item);
      const isUnchanged = Boolean(previousRaw && previousRaw.payload_hash === hash && previousRaw.available);

      const { data: rawRow } = await db
        .from("provider_raw_items")
        .upsert(
          {
            provider_id: providerId,
            external_id: item.externalId,
            service_type: provider.service_type,
            payload: item.payload as any,
            payload_hash: hash,
            available: true,
            last_seen_at: new Date().toISOString(),
            last_sync_run_id: runId,
          },
          { onConflict: "provider_id,external_id" },
        )
        .select("id")
        .single();

      // Existing internal product is always reused — never duplicated.
      let productId: string | null = previousMapping?.product_id ?? null;
      if (!productId) {
        const { data: bySlug } = await db.from("service_products").select("id").eq("slug", item.slug).maybeSingle();
        productId = bySlug?.id ?? null;
      }

      const providerOwned = {
        service_type: provider.service_type,
        slug: item.slug,
        provider_cost: item.providerCost,
        provider_currency: item.providerCurrency,
        provider_external_id: item.externalId,
        primary_provider_id: providerId,
        provider_available: true,
        provider_synced_at: new Date().toISOString(),
        source: "PROVIDER",
        is_test: false,
      };

      if (!productId) {
        const { data: inserted, error } = await db
          .from("service_products")
          .insert({
            ...providerOwned,
            name: item.name,
            currency: pricing.currency,
            sale_price: item.salePrice,
            pricing_rule_id: rule?.id ?? null,
            lifecycle: "DRAFT",
            customer_visible: false,
            margin_flagged: item.belowMinimumMargin,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        productId = inserted.id as string;
        created += 1;
        changeRows.push({
          provider_id: providerId,
          sync_run_id: runId,
          product_id: productId,
          external_id: item.externalId,
          change_type: "NEW_PRODUCT",
          needs_review: true,
          details: { providerCost: item.providerCost, salePrice: item.salePrice, currency: pricing.currency },
        });
      } else {
        const { data: current } = await db
          .from("service_products")
          .select("price_overridden, sale_price, lifecycle, provider_available")
          .eq("id", productId)
          .maybeSingle();

        const patch: Record<string, unknown> = { ...providerOwned, margin_flagged: item.belowMinimumMargin };
        // Admin-owned fields are never touched by a sync.
        if (!current?.price_overridden) {
          patch["sale_price"] = item.salePrice;
          patch["currency"] = pricing.currency;
        }
        // A returned product reuses its mapping and leaves UNAVAILABLE.
        if (current?.lifecycle === "UNAVAILABLE") {
          patch["lifecycle"] = "DRAFT";
          returned += 1;
          changeRows.push({
            provider_id: providerId,
            sync_run_id: runId,
            product_id: productId,
            external_id: item.externalId,
            change_type: "PRODUCT_RETURNED",
            needs_review: true,
            details: {},
          });
        }
        const { error } = await db.from("service_products").update(patch).eq("id", productId);
        if (error) throw new Error(error.message);
        if (isUnchanged) unchanged += 1;
        else updated += 1;
      }

      // Provider cost history — a cost is never overwritten without a record.
      const previousCost = previous?.providerCost ?? null;
      if (previousCost == null || previousCost !== item.providerCost) {
        const change = computeCostChange(previousCost, item.providerCost, item.providerCurrency);
        if (previousCost != null && change.direction !== "SAME") priceChanges += 1;
        await db.from("provider_price_history").insert({
          provider_id: providerId,
          product_id: productId,
          external_id: item.externalId,
          old_cost: change.oldCost,
          new_cost: change.newCost,
          currency: change.currency,
          change_amount: change.changeAmount,
          change_percent: change.changePercent,
          sync_run_id: runId,
        });
      }

      if (previous) {
        const detected: CatalogueChange[] = classifyItem(
          { ...snapshotOf(item), coverage: coverage.canonical },
          { ...previous, coverage: previous.coverage },
        );
        for (const change of detected) {
          if (change.type === "COVERAGE_CHANGE") coverageChanges += 1;
          if (change.type === "NEW_PRODUCT" || change.type === "PRODUCT_RETURNED") continue;
          changeRows.push({
            provider_id: providerId,
            sync_run_id: runId,
            product_id: productId,
            external_id: item.externalId,
            change_type: change.type,
            needs_review: change.needsReview,
            details: change.details as any,
          });
        }
      }

      await db.from("esim_product_details").upsert(
        {
          product_id: productId,
          country_iso: item.countryIso,
          coverage_country_isos: coverage.canonical,
          package_kind: item.packageKind,
          data_gb: item.dataGb,
          data_type: item.dataType,
          unlimited_data: item.unlimited,
          validity_days: item.validityDays,
          raw_validity_value: item.rawValidityValue,
          raw_validity_unit: item.rawValidityUnit,
          activation_policy: item.activationPolicy,
          fair_use_note: item.fairUseNote,
          fair_use_policy: item.fairUsePolicy,
          high_speed_allowance: item.highSpeedAllowance,
          speed_after_fair_use: item.speedAfterFairUse,
          provider_bundle_id: item.externalId,
          network_operators: item.networks,
          supports_5g: item.supports5g,
          supports_hotspot: item.supportsHotspot,
          topup_supported: item.topupSupported,
          provider_metadata: item.payload as any,
        },
        { onConflict: "product_id" },
      );

      await db.from("provider_product_mappings").upsert(
        {
          provider_id: providerId,
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

      if (item.belowMinimumMargin) {
        await db.from("ops_alerts").insert({
          type: "MARGIN_BELOW_MINIMUM",
          severity: "WARNING",
          message: `${item.name}: provider maliyeti sonrası marj minimumun altında.`,
          entity_type: "service_products",
          entity_id: productId,
          context: { externalId: item.externalId, marginPercent: item.marginPercent, providerCost: item.providerCost },
        });
      }
    } catch (error) {
      failed += 1;
      await db.from("provider_sync_errors").insert({
        provider_id: providerId,
        sync_run_id: runId,
        external_id: item.externalId,
        code: "ITEM_FAILED",
        message: (error as Error).message.slice(0, 400),
      });
    }
  }

  if (unknownIsos.size) {
    await db.from("provider_sync_errors").insert({
      provider_id: providerId,
      sync_run_id: runId,
      code: "UNKNOWN_COUNTRY_ISO",
      message: `Kanonik ülke listesinde olmayan ISO kodları: ${[...unknownIsos].slice(0, 40).join(", ")}`,
    });
  }

  // 4. Missing items — ONLY after a complete, successful fetch.
  const knownAvailable = [...mappingByExternal.entries()]
    .filter(([, row]) => (row as any).available)
    .map(([externalId]) => externalId as string);
  const missing = resolveMissingItems({
    incomingIds: priced.map((item) => item.externalId),
    knownAvailableIds: knownAvailable,
    fetchComplete: fetched.complete,
    fetchSucceeded: !fetched.error,
    itemsReceived: priced.length,
  });

  if (missing.length) {
    await db.from("provider_raw_items").update({ available: false }).eq("provider_id", providerId).in("external_id", missing);
    await db.from("provider_product_mappings").update({ available: false }).eq("provider_id", providerId).in("external_id", missing);
    // Historical orders keep their purchase-time snapshot; nothing is deleted.
    await db
      .from("service_products")
      .update({ provider_available: false, customer_visible: false, lifecycle: "UNAVAILABLE" })
      .eq("primary_provider_id", providerId)
      .in("provider_external_id", missing);
    for (const externalId of missing.slice(0, 200)) {
      changeRows.push({
        provider_id: providerId,
        sync_run_id: runId,
        external_id: externalId,
        change_type: "PRODUCT_REMOVED",
        needs_review: true,
        details: {},
      });
    }
  }

  if (changeRows.length) {
    for (let i = 0; i < changeRows.length; i += 200) {
      await db.from("provider_catalogue_changes").insert(changeRows.slice(i, i + 200));
    }
  }

  // 5. Balance + freshness.
  if (adapter.fetchBalance) {
    try {
      const balance = await adapter.fetchBalance();
      if (balance) {
        await db
          .from("providers")
          .update({
            balance_amount: balance.amount,
            balance_currency: balance.currency,
            balance_checked_at: new Date().toISOString(),
          })
          .eq("id", providerId);
        if (balanceHealth(balance.amount, provider.low_balance_threshold == null ? null : Number(provider.low_balance_threshold)) === "LOW") {
          await db.from("ops_alerts").insert({
            type: "LOW_PROVIDER_BALANCE",
            severity: "WARNING",
            message: `${provider.name}: provider bakiyesi eşiğin altında (${balance.amount} ${balance.currency}).`,
            entity_type: "providers",
            entity_id: providerId,
            context: { amount: balance.amount, currency: balance.currency },
          });
        }
      }
    } catch {
      // Balance is optional; a failure never affects the catalogue result.
    }
  }

  const status = resolveSyncStatus({
    complete: fetched.complete,
    received: priced.length,
    failed,
    processed: created + updated + unchanged,
  });

  return finish(
    {
      ...base,
      runId,
      status,
      itemsReceived: priced.length,
      created,
      updated,
      unchanged,
      unavailable: missing.length,
      returned,
      priceChanges,
      coverageChanges,
      failed,
      error: fetched.error ?? (failed ? `${failed} ürün işlenemedi.` : null),
    },
    fetched.complete,
  );
}

/** Scheduler entry: syncs every provider whose interval is due, and raises stale alerts. */
export async function runDueProviderSyncs(): Promise<{ ok: boolean; ran: SyncResult[]; skipped: number }> {
  const db = await adminDb();
  const { data: providers } = await db
    .from("providers")
    .select("id, code, name, active, auto_sync, sync_interval_hours")
    .eq("active", true);

  const ran: SyncResult[] = [];
  let skipped = 0;

  for (const provider of providers ?? []) {
    const { data: connection } = await db
      .from("provider_connections")
      .select("id, next_sync_at, last_success_at")
      .eq("provider_id", provider.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (isCatalogueStale(connection?.last_success_at ?? null, provider.sync_interval_hours)) {
      await db.from("ops_alerts").insert({
        type: "CATALOGUE_STALE",
        severity: "WARNING",
        message: `${provider.name}: katalog uzun süredir başarıyla güncellenmedi.`,
        entity_type: "providers",
        entity_id: provider.id,
        context: { lastSuccessAt: connection?.last_success_at ?? null },
      });
    }

    if (!isSyncDue({ autoSync: provider.auto_sync, active: provider.active, nextSyncAt: connection?.next_sync_at ?? null })) {
      skipped += 1;
      continue;
    }
    try {
      ran.push(await runProviderSync(db, provider.id, "SCHEDULED"));
    } catch (error) {
      ran.push({
        providerId: provider.id,
        providerCode: provider.code,
        status: "FAILED",
        runId: null,
        itemsReceived: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
        unavailable: 0,
        returned: 0,
        priceChanges: 0,
        coverageChanges: 0,
        failed: 0,
        error: (error as Error).message,
      });
    }
  }

  return { ok: true, ran, skipped };
}
