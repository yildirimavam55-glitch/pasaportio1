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

/** One invocation processes catalogue pages until this budget, then checkpoints. */
export const DEFAULT_SYNC_BUDGET_MS = 600_000;

export type SyncStatusValue = "SUCCESS" | "SUCCESS_WITH_WARNINGS" | "PARTIAL" | "FAILED";

export type SyncResult = {
  providerId: string;
  providerCode: string;
  status: SyncStatusValue;
  runId: string | null;
  itemsReceived: number;
  /** Rows the parser accepted as structurally valid products. */
  itemsParsed: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Rows rejected by the parser (missing price, validity, coverage …). */
  invalid: number;
  /** Rows the supplier sent more than once inside the same page set. */
  duplicate: number;
  /** Parsed rows deliberately not imported (no usable canonical coverage). */
  excluded: number;
  unavailable: number;
  returned: number;
  priceChanges: number;
  coverageChanges: number;
  failed: number;
  /** invalid + duplicate + excluded + failed. A warning is never hidden. */
  warnings: number;
  /** True when received == processed + invalid + duplicate + excluded + failed. */
  reconciled: boolean;
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
  options: { budgetMs?: number } = {},
): Promise<SyncResult> {
  const deadline = Date.now() + (options.budgetMs ?? DEFAULT_SYNC_BUDGET_MS);
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
    itemsParsed: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    invalid: 0,
    duplicate: 0,
    excluded: 0,
    unavailable: 0,
    returned: 0,
    priceChanges: 0,
    coverageChanges: 0,
    failed: 0,
    warnings: 0,
    reconciled: true,
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

  // Resume the last unfinished run instead of restarting the whole catalogue.
  const { data: openRun } = await db
    .from("provider_sync_runs")
    .select(
      "id, checkpoint_page, items_received, items_parsed, items_created, items_updated, items_unchanged, items_invalid, items_duplicate, items_excluded, items_returned, items_failed, price_changes, coverage_changes",
    )

    .eq("provider_id", providerId)
    .eq("status", "RUNNING")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let runId: string | null = openRun?.id ?? null;
  if (!runId) {
    const { data: run } = await db
      .from("provider_sync_runs")
      .insert({ provider_id: providerId, connection_id: connection?.id ?? null, trigger, status: "RUNNING" })
      .select("id")
      .single();
    runId = run?.id ?? null;
  }

  let checkpointPage = Number(openRun?.checkpoint_page ?? 0);
  let receivedTotal = Number(openRun?.items_received ?? 0);
  let parsedTotal = Number(openRun?.items_parsed ?? 0);
  let created = Number(openRun?.items_created ?? 0);
  let updated = Number(openRun?.items_updated ?? 0);
  let unchanged = Number(openRun?.items_unchanged ?? 0);
  let invalid = Number(openRun?.items_invalid ?? 0);
  let duplicate = Number(openRun?.items_duplicate ?? 0);
  let excluded = Number(openRun?.items_excluded ?? 0);
  let returned = Number(openRun?.items_returned ?? 0);
  let failed = Number(openRun?.items_failed ?? 0);
  let priceChanges = Number(openRun?.price_changes ?? 0);
  let coverageChanges = Number(openRun?.coverage_changes ?? 0);

  if (connection?.id) {
    await db.from("provider_connections").update({ sync_state: "RUNNING", last_attempt_at: nowIso }).eq("id", connection.id);
  }

  /**
   * Explicit accounting. Every supplier row received is either processed,
   * invalid, duplicate, deliberately excluded, or failed — a sync can never
   * report a clean pass while rows silently disappeared.
   */
  const warningCount = () => invalid + duplicate + excluded + failed;
  const processedCount = () => created + updated + unchanged;
  const counters = () => ({
    items_received: receivedTotal,
    items_parsed: parsedTotal,
    items_created: created,
    items_updated: updated,
    items_unchanged: unchanged,
    items_invalid: invalid,
    items_duplicate: duplicate,
    items_excluded: excluded,
    items_returned: returned,
    items_failed: failed,
    warnings: warningCount(),
    price_changes: priceChanges,
    coverage_changes: coverageChanges,
    items_processed: processedCount(),
  });


  /** Persist progress after every batch so an interrupted sync resumes safely. */
  const checkpoint = async (page: number) => {
    checkpointPage = page;
    if (!runId) return;
    await db
      .from("provider_sync_runs")
      .update({ ...counters(), checkpoint_page: page, last_checkpoint_at: new Date().toISOString() })
      .eq("id", runId);
  };

  const finish = async (result: SyncResult, complete: boolean) => {
    if (runId) {
      await db
        .from("provider_sync_runs")
        .update({
          status: result.status,
          completed_at: new Date().toISOString(),
          ...counters(),
          items_received: result.itemsReceived,
          items_unavailable: result.unavailable,
          checkpoint_page: checkpointPage,
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

  /** Interrupted (budget, rate limit, network): keep the run RUNNING and resumable. */
  const pause = async (reason: string): Promise<SyncResult> => {
    await checkpoint(checkpointPage);
    if (connection?.id) {
      await db
        .from("provider_connections")
        .update({ sync_state: "RUNNING", last_checked_at: new Date().toISOString() })
        .eq("id", connection.id);
    }
    return {
      ...base,
      runId,
      status: "PARTIAL",
      itemsReceived: receivedTotal,
      itemsParsed: parsedTotal,
      created,
      updated,
      unchanged,
      invalid,
      duplicate,
      excluded,
      unavailable: 0,
      returned,
      priceChanges,
      coverageChanges,
      failed,
      warnings: warningCount(),
      reconciled: receivedTotal === processedCount() + warningCount(),
      error: reason,
    };

  };

  // Pricing rule + previous valid snapshot are loaded once per invocation.
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

  /**
   * Admin-controlled publishing rule. When enabled, a synced product that meets
   * every quality gate becomes customer visible; a DRAFT is never promoted while
   * the flag is off, and nothing published by an Admin is ever un-published here.
   */
  const { data: publishFlag } = await db
    .from("feature_flags")
    .select("enabled")
    .eq("key", "esim_auto_publish")
    .maybeSingle();
  const autoPublish = publishFlag?.enabled !== false;
  const publishable = (item: PricedItem, coverage: string[]) =>
    autoPublish && coverage.length > 0 && item.salePrice > 0 && !item.belowMinimumMargin;

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

  const unknownIsos = new Set<string>();

  /**
   * Processes one catalogue batch. Idempotent and retry safe: every write is
   * keyed by (provider, externalId) so a replayed page never duplicates data.
   */
  const processBatch = async (rawItems: Record<string, unknown>[]) => {
    const parsed = parseEsimCatalogue(rawItems, provider.currency ?? "EUR");
    const priced = priceItems(parsed.items, pricing, provider.code);
    const changeRows: any[] = [];

    // Every received row is accounted for: parsed, duplicate or invalid.
    receivedTotal += rawItems.length;
    parsedTotal += parsed.items.length;
    const duplicateIssues = parsed.issues.filter((issue) => issue.message.includes("birden fazla"));
    duplicate += duplicateIssues.length;
    invalid += parsed.issues.length - duplicateIssues.length;

    for (const issue of parsed.issues.slice(0, 20)) {
      await db.from("provider_sync_errors").insert({
        provider_id: providerId,
        sync_run_id: runId,
        external_id: issue.externalId,
        code: issue.message.includes("birden fazla") ? "DUPLICATE_ITEM" : "INVALID_ITEM",
        message: issue.message,
      });
    }


    /**
     * Fast path: an item whose provider payload is byte-identical to the stored
     * one needs no rewrite. Only its freshness marker is touched, and an
     * eligible DRAFT is still promoted so publishing never depends on a change.
     */
    const pending: PricedItem[] = [];
    const seenExternalIds: string[] = [];
    const promoteProductIds: string[] = [];
    for (const item of priced) {
      const prevRaw = rawByExternal.get(item.externalId) as any;
      const prevMapping = mappingByExternal.get(item.externalId) as any;
      const identical =
        Boolean(prevRaw && prevRaw.payload_hash === hashItem(item) && prevRaw.available) &&
        Boolean(prevMapping?.product_id && prevMapping.available);
      if (!identical) {
        pending.push(item);
        continue;
      }
      unchanged += 1;
      seenExternalIds.push(item.externalId);
      const cov = mapCoverageToCanonical(item.coverage);
      const stored = [...new Set([...cov.canonical, ...cov.unknown])];
      if (publishable(item, stored)) promoteProductIds.push(prevMapping.product_id);
    }
    for (let i = 0; i < seenExternalIds.length; i += 200) {
      await db
        .from("provider_raw_items")
        .update({ last_seen_at: new Date().toISOString(), last_sync_run_id: runId })
        .eq("provider_id", providerId)
        .in("external_id", seenExternalIds.slice(i, i + 200));
    }
    for (let i = 0; i < promoteProductIds.length; i += 200) {
      await db
        .from("service_products")
        .update({ lifecycle: "PUBLISHED", customer_visible: true })
        .eq("lifecycle", "DRAFT")
        .in("id", promoteProductIds.slice(i, i + 200));
    }

    const processItem = async (item: PricedItem) => {
      try {
        const coverage = mapCoverageToCanonical(item.coverage);
        coverage.unknown.forEach((iso) => unknownIsos.add(iso));
        // Valid ISO codes outside the canonical directory are still stored, so a
        // regional product is never dropped because of one unlisted territory.
        const storedCoverage = [...new Set([...coverage.canonical, ...coverage.unknown])];
        // A subdivision-only bundle (US-HI) is legitimately stored without
        // country coverage; only a bundle with no usable geography at all is
        // excluded, and the exclusion is always counted and reported.
        if (!storedCoverage.length && !item.subdivisions.length) {
          excluded += 1;
          await db.from("provider_sync_errors").insert({
            provider_id: providerId,
            sync_run_id: runId,
            external_id: item.externalId,
            code: "UNKNOWN_COUNTRY_ISO",
            message: `Kapsama ülkeleri kanonik ülke listesiyle eşleşmedi: ${item.coverage.join(", ")}`,
          });
          return;
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
              lifecycle: publishable(item, storedCoverage) ? "PUBLISHED" : "DRAFT",
              customer_visible: publishable(item, storedCoverage),
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
          // Publishing rule: only an eligible DRAFT is promoted. PAUSED, ARCHIVED
          // and Admin-published states are left exactly as the Admin set them.
          if (current?.lifecycle === "DRAFT" && publishable(item, storedCoverage)) {
            patch["lifecycle"] = "PUBLISHED";
            patch["customer_visible"] = true;
          }
          // A returned product reuses its mapping and leaves UNAVAILABLE.
          if (current?.lifecycle === "UNAVAILABLE") {
            patch["lifecycle"] = publishable(item, storedCoverage) ? "PUBLISHED" : "DRAFT";
            patch["customer_visible"] = publishable(item, storedCoverage);
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
            { ...snapshotOf(item), coverage: storedCoverage },
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
            coverage_country_isos: storedCoverage,
            coverage_subdivision_codes: item.subdivisions,
            package_kind: item.packageKind,
            data_gb: item.dataGb,
            data_type: item.dataType,
            unlimited_data: item.unlimited,
            validity_days: item.validityDays,
            raw_validity_value: item.rawValidityValue,
            raw_validity_unit: item.rawValidityUnit,
            activation_policy: item.activationPolicy,
            validity_start_rule: item.validityStartRule,
            fair_use_note: item.fairUseNote,
            fair_use_policy: item.fairUsePolicy,
            high_speed_allowance: item.highSpeedAllowance,
            speed_after_fair_use: item.speedAfterFairUse,
            unlimited_details_complete: item.unlimitedDetailsComplete,
            provider_bundle_id: item.externalId,
            network_operators: item.networks,
            supports_5g: item.supports5g,
            supports_hotspot: item.supportsHotspot,
            data_only: item.dataOnly,
            topup_supported: item.topupSupported,
            apn_info: item.apnInfo as any,
            metadata_provenance: item.metadataProvenance as any,
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

        // Keep the in-memory snapshot current so a replayed page stays idempotent.
        previousSnapshot.set(item.externalId, { ...snapshotOf(item), coverage: storedCoverage });
        rawByExternal.set(item.externalId, { external_id: item.externalId, payload_hash: hash, available: true });
        mappingByExternal.set(item.externalId, {
          external_id: item.externalId,
          product_id: productId,
          provider_cost: item.providerCost,
          available: true,
        });

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
    };

    // Bounded parallelism: a full 5,000+ bundle catalogue cannot be written one
    // sequential round-trip at a time within a single invocation budget.
    const queue = [...pending];
    await Promise.all(
      Array.from({ length: Math.min(8, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await processItem(next);
      }),
    );

    // receivedTotal is counted from the raw rows at the top of the batch.
    for (let i = 0; i < changeRows.length; i += 200) {
      await db.from("provider_catalogue_changes").insert(changeRows.slice(i, i + 200));
    }
  };

  // Batched, resumable catalogue fetch.
  const cfg = (connection?.config ?? {}) as any;
  // The supplier catalogue is the source of truth: page size and page budget are
  // sized so no bundle is ever left unfetched, and pagination stops on hasMore.
  const perPage = Math.min(1000, Math.max(1, Number(cfg.pageSize) || 500));
  const maxPages = Math.max(1, Number(cfg.maxPages) || 500);
  let complete = false;
  let fetchError: string | null = null;

  if (typeof adapter.fetchCataloguePage !== "function") {
    // Adapters without pagination stay on the single-shot path.
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
      return finish({ ...base, runId, status: "FAILED", error: fetched.error ?? "Katalog alınamadı." }, false);
    }
    await processBatch(fetched.items);
    await checkpoint(1);
    complete = fetched.complete;
    fetchError = fetched.error ?? null;
  } else {
    // A checkpoint is expressed in pages, so a changed page size must not skip
    // bundles: the resume point is clamped to the items actually processed.
    const resumePage = Math.min(checkpointPage, Math.floor(receivedTotal / perPage));
    for (let page = resumePage + 1; page <= maxPages; page += 1) {
      // Admin cancellation stops the run without touching the catalogue.
      if (runId) {
        const { data: state } = await db.from("provider_sync_runs").select("status").eq("id", runId).maybeSingle();
        if (state?.status === "CANCELLED") return pause("Senkronizasyon iptal edildi.");
      }
      if (Date.now() > deadline) return pause("Zaman bütçesi doldu, kaldığı yerden devam edecek.");

      const result = await adapter.fetchCataloguePage(page, perPage);
      if (result.error) {
        await db.from("provider_sync_errors").insert({
          provider_id: providerId,
          sync_run_id: runId,
          code: result.status === 429 ? "RATE_LIMITED" : result.status === 0 ? "NETWORK_ERROR" : `HTTP_${result.status}`,
          message: `Sayfa ${page}: ${result.error}`,
        });
        if (receivedTotal === 0 && checkpointPage === 0) {
          await db.from("ops_alerts").insert({
            type: "CATALOGUE_SYNC_FAILED",
            severity: "ERROR",
            message: `${provider.name}: katalog senkronizasyonu başarısız (${result.error}).`,
            entity_type: "providers",
            entity_id: providerId,
            context: { trigger, page },
          });
          // Nothing is marked unavailable because of a failed fetch.
          return finish({ ...base, runId, status: "FAILED", error: result.error }, false);
        }
        // Partial progress is kept; the next run resumes from the checkpoint.
        return pause(result.error);
      }

      await processBatch(result.items);
      await checkpoint(page);
      if (!result.hasMore) {
        complete = true;
        break;
      }
      if (page === maxPages) fetchError = "Sayfalama sınırına ulaşıldı.";
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

  // Missing items — ONLY after a complete, successful catalogue pass.
  let missing: string[] = [];
  if (complete) {
    const { data: staleRows } = await db
      .from("provider_raw_items")
      .select("external_id")
      .eq("provider_id", providerId)
      .eq("available", true)
      .or(`last_sync_run_id.is.null,last_sync_run_id.neq.${runId}`);
    missing = resolveMissingItems({
      incomingIds: [],
      knownAvailableIds: (staleRows ?? []).map((row: any) => row.external_id as string),
      fetchComplete: true,
      fetchSucceeded: true,
      itemsReceived: receivedTotal,
    });
  }

  if (missing.length) {
    for (let i = 0; i < missing.length; i += 200) {
      const slice = missing.slice(i, i + 200);
      await db.from("provider_raw_items").update({ available: false }).eq("provider_id", providerId).in("external_id", slice);
      await db.from("provider_product_mappings").update({ available: false }).eq("provider_id", providerId).in("external_id", slice);
      // Historical orders keep their purchase-time snapshot; nothing is deleted.
      await db
        .from("service_products")
        .update({ provider_available: false, customer_visible: false, lifecycle: "UNAVAILABLE" })
        .eq("primary_provider_id", providerId)
        .in("provider_external_id", slice);
    }
    const removedRows = missing.slice(0, 200).map((externalId) => ({
      provider_id: providerId,
      sync_run_id: runId,
      external_id: externalId,
      change_type: "PRODUCT_REMOVED",
      needs_review: true,
      details: {},
    }));
    if (removedRows.length) await db.from("provider_catalogue_changes").insert(removedRows);
  }

  // Balance + freshness.
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

  const warnings = warningCount();
  const processed = processedCount();
  const reconciled = receivedTotal === processed + warnings;
  const status = resolveSyncStatus({
    complete,
    received: receivedTotal,
    failed,
    processed,
    warnings,
    reconciled,
  });

  const summary =
    fetchError ??
    (warnings || !reconciled
      ? `Alınan ${receivedTotal} · işlenen ${processed} · geçersiz ${invalid} · tekrar ${duplicate} · hariç ${excluded} · hatalı ${failed}${reconciled ? "" : " · mutabakat sağlanamadı"}`
      : null);

  return finish(
    {
      ...base,
      runId,
      status,
      itemsReceived: receivedTotal,
      itemsParsed: parsedTotal,
      created,
      updated,
      unchanged,
      invalid,
      duplicate,
      excluded,
      unavailable: missing.length,
      returned,
      priceChanges,
      coverageChanges,
      failed,
      warnings,
      reconciled,
      error: summary,
    },
    complete,
  );
}


/** Scheduler entry: syncs every provider whose interval is due, and raises stale alerts. */
export async function runDueProviderSyncs(
  options: { budgetMs?: number; toCompletion?: boolean; maxInvocations?: number } = {},
): Promise<{ ok: boolean; ran: SyncResult[]; skipped: number }> {
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

    // An unfinished run always resumes, even when the interval is not due yet.
    const { data: openRun } = await db
      .from("provider_sync_runs")
      .select("id")
      .eq("provider_id", provider.id)
      .eq("status", "RUNNING")
      .limit(1)
      .maybeSingle();

    if (!openRun && !isSyncDue({ autoSync: provider.auto_sync, active: provider.active, nextSyncAt: connection?.next_sync_at ?? null })) {
      skipped += 1;
      continue;
    }
    try {
      const opts = { budgetMs: options.budgetMs ?? DEFAULT_SYNC_BUDGET_MS };
      ran.push(
        options.toCompletion
          ? await runProviderSyncToCompletion(db, provider.id, "SCHEDULED", {
              ...opts,
              ...(options.maxInvocations ? { maxInvocations: options.maxInvocations } : {}),
            })
          : await runProviderSync(db, provider.id, "SCHEDULED", opts),
      );
    } catch (error) {
      ran.push({
        providerId: provider.id,
        providerCode: provider.code,
        status: "FAILED",
        runId: null,
        itemsReceived: 0,
        itemsParsed: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
        invalid: 0,
        duplicate: 0,
        excluded: 0,
        unavailable: 0,
        returned: 0,
        priceChanges: 0,
        coverageChanges: 0,
        failed: 0,
        warnings: 0,
        reconciled: true,
        error: (error as Error).message,
      });

    }
  }

  return { ok: true, ran, skipped };
}

/**
 * Drives one provider's catalogue to completion. A single invocation stops at
 * its time budget and checkpoints; without this loop the run stayed PARTIAL and
 * the catalogue remained half imported. Never deletes, never places orders.
 */
export async function runProviderSyncToCompletion(
  db: Db,
  providerId: string,
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK" = "MANUAL",
  options: { budgetMs?: number; maxInvocations?: number } = {},
): Promise<SyncResult> {
  const maxInvocations = Math.max(1, options.maxInvocations ?? 40);
  let last: SyncResult | null = null;
  for (let i = 0; i < maxInvocations; i += 1) {
    last = await runProviderSync(db, providerId, trigger, { budgetMs: options.budgetMs ?? DEFAULT_SYNC_BUDGET_MS });
    if (last.status !== "PARTIAL") return last;
    if (last.error === "Senkronizasyon iptal edildi.") return last;
  }
  return last!;
}
