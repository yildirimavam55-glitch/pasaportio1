/**
 * Server-only commerce plumbing: authoritative order creation and the store /
 * supplier ports used by the provisioning engine. All writes run with the
 * service-role client after the caller has been authenticated, because the
 * orders/order_items/customer_esims tables are read-only for customers.
 *
 * SAFETY: live supplier purchases stay OFF unless COMMERCE_LIVE_PROVISIONING
 * is explicitly set to "true" on the server.
 */
import type { ProvisioningStore, SupplierPort, UnitRow } from "@/domain/commerce/engine";
import {
  planUnits,
  validateOrderLine,
  type OrderRejection,
  type ResolvedProduct,
} from "@/domain/commerce/provisioning";

export function liveSupplierCallsEnabled(): boolean {
  return String(process.env["COMMERCE_LIVE_PROVISIONING"] ?? "").toLowerCase() === "true";
}

type Db = { from: (table: string) => any; rpc?: (name: string, args: unknown) => any };

async function adminClient(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

/** eSIM service + new-purchase kill switches, read server-side every time. */
async function purchaseGate(db: Db) {
  const { data } = await db.from("feature_flags").select("key, enabled");
  const on = (key: string) => {
    const row = (data ?? []).find((flag: any) => flag.key === key);
    return row ? Boolean(row.enabled) : true;
  };
  return { serviceActive: on("storefront.esim"), purchasesActive: on("checkout.esim") };
}

function toResolvedProduct(row: any): ResolvedProduct {
  return {
    id: row.id,
    serviceType: row.service_type,
    lifecycle: row.lifecycle,
    customerVisible: Boolean(row.customer_visible),
    providerAvailable: Boolean(row.provider_available),
    salePrice: row.sale_price == null ? null : Number(row.sale_price),
    currency: row.currency ?? "EUR",
    providerCost: row.provider_cost == null ? null : Number(row.provider_cost),
    pricingReviewRequired: Boolean(row.pricing_review_required),
    primaryProviderId: row.primary_provider_id ?? null,
    providerExternalId: row.provider_external_id ?? null,
    isTest: Boolean(row.is_test),
  };
}

export type OrderLineInput = { productId: string; quantity: number; travelerLabel?: string | null };

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; total: number; currency: string; units: number }
  | { ok: false; reason: OrderRejection | "EMPTY_CART"; productId?: string };

function orderNumber(): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TRV-${stamp}-${suffix}`;
}

/**
 * Creates an order from product IDs only. Price, currency, supplier cost,
 * supplier mapping and package facts are always resolved server-side — a
 * manipulated request body cannot influence what the customer is charged.
 */
export async function createEsimOrder(input: {
  customerId: string;
  locale: string;
  lines: OrderLineInput[];
  idempotencyKey: string;
}): Promise<CreateOrderResult> {
  const db = await adminClient();
  const lines = (input.lines ?? []).filter((line) => line?.productId);
  if (!lines.length) return { ok: false, reason: "EMPTY_CART" };

  // Same key → same order. Never a second order or a second purchase.
  const { data: existing } = await db
    .from("orders")
    .select("id, order_number, gross_revenue, currency")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing?.id) {
    const { count } = await db
      .from("provisioning_units")
      .select("id", { count: "exact", head: true })
      .eq("order_id", existing.id);
    return {
      ok: true,
      orderId: existing.id,
      orderNumber: existing.order_number,
      total: Number(existing.gross_revenue ?? 0),
      currency: existing.currency ?? "EUR",
      units: count ?? 0,
    };
  }

  const gate = await purchaseGate(db);
  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data: productRows } = await db
    .from("service_products")
    .select(
      "id, service_type, slug, name, lifecycle, customer_visible, provider_available, sale_price, currency, provider_cost, pricing_review_required, primary_provider_id, provider_external_id, is_test, pricing_rule_id, destination_id",
    )
    .in("id", productIds)
    .eq("service_type", "ESIM");
  const products = new Map<string, any>((productRows ?? []).map((row: any) => [row.id, row]));

  const { data: detailRows } = await db
    .from("esim_product_details")
    .select(
      "product_id, country_iso, coverage_country_isos, data_gb, unlimited_data, validity_days, validity_start_rule, provider_bundle_id, topup_supported, package_kind",
    )
    .in("product_id", productIds);
  const details = new Map<string, any>((detailRows ?? []).map((row: any) => [row.product_id, row]));

  for (const line of lines) {
    const check = validateOrderLine(
      products.has(line.productId) ? toResolvedProduct(products.get(line.productId)) : null,
      line.quantity,
      gate,
    );
    if (!check.ok) return { ok: false, reason: check.reason, productId: line.productId };
  }

  const currency = String(products.get(lines[0]!.productId)?.currency ?? "EUR");
  let total = 0;
  let cost = 0;
  for (const line of lines) {
    const row = products.get(line.productId);
    total += Number(row.sale_price) * line.quantity;
    cost += Number(row.provider_cost ?? 0) * line.quantity;
  }

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      order_number: orderNumber(),
      customer_id: input.customerId,
      status: "PENDING",
      payment_status: "PENDING",
      fulfillment_status: "PENDING",
      currency,
      gross_revenue: total,
      provider_cost_total: cost,
      locale: ["tr", "de", "en"].includes(input.locale) ? input.locale : "tr",
      idempotency_key: input.idempotencyKey,
    })
    .select("id, order_number")
    .single();
  if (orderError) throw new Error(orderError.message);

  const itemRows = lines.map((line) => {
    const row = products.get(line.productId);
    const detail = details.get(line.productId) ?? {};
    return {
      order_id: order.id,
      service_type: "ESIM",
      product_id: row.id,
      provider_id: row.primary_provider_id,
      product_name_snapshot: row.name,
      product_slug_snapshot: row.slug,
      sale_price: Number(row.sale_price),
      provider_cost: Number(row.provider_cost ?? 0),
      currency: row.currency ?? currency,
      quantity: line.quantity,
      destination_snapshot: detail.country_iso ?? null,
      fulfillment_status: "PENDING",
      // Commercial snapshot: order history never changes when the supplier
      // catalogue changes later.
      details_snapshot: {
        providerExternalId: row.provider_external_id,
        providerBundleId: detail.provider_bundle_id ?? null,
        pricingRuleId: row.pricing_rule_id ?? null,
        dataGb: detail.data_gb ?? null,
        unlimitedData: Boolean(detail.unlimited_data),
        validityDays: detail.validity_days ?? null,
        validityStartRule: detail.validity_start_rule ?? null,
        coverageCountryIsos: detail.coverage_country_isos ?? null,
        packageKind: detail.package_kind ?? null,
        topupSupported: Boolean(detail.topup_supported),
        travelerLabel: line.travelerLabel ?? null,
        snapshotAt: new Date().toISOString(),
      },
    };
  });

  const { data: items, error: itemError } = await db.from("order_items").insert(itemRows).select("id, quantity");
  if (itemError) throw new Error(itemError.message);

  const planned = planUnits(
    order.id,
    (items ?? []).map((item: any) => ({ orderItemId: item.id, quantity: Number(item.quantity ?? 1) })),
  );
  const itemProvider = new Map<string, string | null>(
    (items ?? []).map((item: any, index: number) => [item.id, itemRows[index]!.provider_id ?? null]),
  );
  const { error: unitError } = await db.from("provisioning_units").insert(
    planned.map((unit) => ({
      order_id: order.id,
      order_item_id: unit.orderItemId,
      unit_index: unit.unitIndex,
      service_type: "ESIM",
      provider_id: itemProvider.get(unit.orderItemId) ?? null,
      status: "PENDING",
      idempotency_key: unit.idempotencyKey,
    })),
  );
  if (unitError) throw new Error(unitError.message);

  return { ok: true, orderId: order.id, orderNumber: order.order_number, total, currency, units: planned.length };
}

const UNIT_COLUMNS =
  "id, order_id, order_item_id, unit_index, status, provider_reference, customer_esim_id, attempt_count, provider_id, order_items(product_id, product_name_snapshot, destination_snapshot, details_snapshot, providers(id, code, adapter_type))";

function unitFromRow(row: any): UnitRow {
  const item = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
  const snapshot = (item?.details_snapshot ?? {}) as Record<string, any>;
  const dataGb = Number(snapshot["dataGb"]);
  return {
    id: row.id,
    orderId: row.order_id,
    orderItemId: row.order_item_id,
    unitIndex: row.unit_index,
    status: row.status,
    providerReference: row.provider_reference ?? null,
    customerEsimId: row.customer_esim_id ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    externalId: snapshot["providerExternalId"] ?? snapshot["providerBundleId"] ?? null,
    providerId: row.provider_id ?? null,
    snapshot: {
      destinationLabel: item?.destination_snapshot ?? null,
      packageLabel: item?.product_name_snapshot ?? null,
      totalDataMb: Number.isFinite(dataGb) && dataGb > 0 ? Math.round(dataGb * 1000) : null,
      validityStartRule: snapshot["validityStartRule"] ?? null,
      topupSupported: Boolean(snapshot["topupSupported"]),
    },
  };
}

/** Database implementation of the engine's store port. */
export async function createProvisioningStore(): Promise<ProvisioningStore> {
  const db = await adminClient();

  return {
    async isOrderPaid(orderId) {
      const { data } = await db.from("orders").select("payment_status").eq("id", orderId).maybeSingle();
      return data?.payment_status === "PAID";
    },
    async loadUnit(unitId) {
      const { data } = await db.from("provisioning_units").select(UNIT_COLUMNS).eq("id", unitId).maybeSingle();
      return data ? unitFromRow(data) : null;
    },
    async listUnits(orderId) {
      const { data } = await db
        .from("provisioning_units")
        .select(UNIT_COLUMNS)
        .eq("order_id", orderId)
        .order("unit_index", { ascending: true });
      return (data ?? []).map(unitFromRow);
    },
    async claimUnit(unitId) {
      // Conditional UPDATE = the database decides the single winner when two
      // requests arrive at the same time.
      const { data } = await db
        .from("provisioning_units")
        .update({ status: "IN_PROGRESS", last_attempt_at: new Date().toISOString() })
        .eq("id", unitId)
        .in("status", ["PENDING", "FAILED"])
        .is("provider_reference", null)
        .is("customer_esim_id", null)
        .select("id")
        .maybeSingle();
      if (!data?.id) return null;
      const claimed = await db.from("provisioning_units").select(UNIT_COLUMNS).eq("id", unitId).maybeSingle();
      if (claimed.data) {
        await db
          .from("provisioning_units")
          .update({ attempt_count: Number(claimed.data.attempt_count ?? 0) + 1 })
          .eq("id", unitId);
      }
      return claimed.data ? unitFromRow(claimed.data) : null;
    },
    async saveReference(unitId, reference, providerStatus) {
      await db
        .from("provisioning_units")
        .update({ provider_reference: reference, provider_order_status: providerStatus })
        .eq("id", unitId);
      const { data } = await db.from("provisioning_units").select("order_item_id").eq("id", unitId).maybeSingle();
      if (data?.order_item_id) {
        await db.from("order_items").update({ provider_reference: reference }).eq("id", data.order_item_id);
      }
    },
    async createEsim(unit, esim, state) {
      const { data: order } = await db.from("orders").select("customer_id").eq("id", unit.orderId).maybeSingle();
      const { data, error } = await db
        .from("customer_esims")
        .insert({
          customer_id: order?.customer_id ?? null,
          order_item_id: unit.orderItemId,
          destination_label: unit.snapshot.destinationLabel,
          package_label: unit.snapshot.packageLabel,
          status: state.status,
          total_data_mb: unit.snapshot.totalDataMb,
          // Usage is not live yet: no remaining data is invented.
          remaining_data_mb: null,
          expires_at: state.expiresAt,
          iccid: esim.iccid,
          qr_payload: esim.qrPayload,
          install_info: {
            activationCode: esim.activationCode,
            smdpAddress: esim.smdpAddress,
          },
          topup_supported: unit.snapshot.topupSupported,
          provider_reference: esim.providerReference,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    async finishUnit(unitId, esimId) {
      await db
        .from("provisioning_units")
        .update({ status: "PROVISIONED", customer_esim_id: esimId, error_category: null, error_message: null })
        .eq("id", unitId);
      const { data } = await db.from("provisioning_units").select("order_item_id").eq("id", unitId).maybeSingle();
      if (data?.order_item_id) {
        await db.from("order_items").update({ fulfillment_status: "FULFILLED" }).eq("id", data.order_item_id);
      }
    },
    async failUnit(unitId, status, category, message) {
      await db
        .from("provisioning_units")
        .update({ status, error_category: category, error_message: String(message).slice(0, 500) })
        .eq("id", unitId);
    },
    async resetUnit(unitId, category, message) {
      await db
        .from("provisioning_units")
        .update({ status: "PENDING", error_category: category, error_message: String(message).slice(0, 500) })
        .eq("id", unitId);
    },
    async raiseAlert(type, unitId, message) {
      // Dedupe: one OPEN alert per unit per type.
      const { data } = await db
        .from("ops_alerts")
        .select("id")
        .eq("type", type)
        .eq("entity_id", unitId)
        .eq("status", "OPEN")
        .maybeSingle();
      if (data?.id) return;
      await db.from("ops_alerts").insert({
        type,
        severity: type === "SUPPLIER_RESULT_UNKNOWN" ? "CRITICAL" : "HIGH",
        entity_type: "provisioning_units",
        entity_id: unitId,
        message,
      });
    },
    async setOrderFulfillment(orderId, status) {
      const patch: Record<string, unknown> = { fulfillment_status: status };
      if (status === "FULFILLED") patch["status"] = "COMPLETED";
      await db.from("orders").update(patch).eq("id", orderId);
    },
  };
}

/** Supplier port bound to the existing eSIM Go adapter — no second integration. */
export async function createSupplierPort(providerId: string | null): Promise<SupplierPort | null> {
  const db = await adminClient();
  const { data: provider } = providerId
    ? await db.from("providers").select("id, code, adapter_type").eq("id", providerId).maybeSingle()
    : await db.from("providers").select("id, code, adapter_type").eq("service_type", "ESIM").limit(1).maybeSingle();
  if (!provider) return null;
  const { data: connection } = await db
    .from("provider_connections")
    .select("base_url, credential_secret_names, config")
    .eq("provider_id", provider.id)
    .maybeSingle();

  const { buildAdapter } = await import("@/providers/adapters/factory.server");
  const adapter = buildAdapter(provider as any, (connection as any) ?? null);
  if (!adapter.placeEsimOrder) return null;

  return {
    placeOrder: (input) => adapter.placeEsimOrder!(input),
    ...(adapter.fetchEsimOrder ? { lookupOrder: (reference: string) => adapter.fetchEsimOrder!(reference) } : {}),
  };
}
