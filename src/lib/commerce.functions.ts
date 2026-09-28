/**
 * Commerce server functions: order creation for authenticated customers, and
 * admin-only provisioning operations (run, retry, reconcile, inspect).
 *
 * No real supplier purchase can happen here unless the server-side switch
 * COMMERCE_LIVE_PROVISIONING is "true"; otherwise the engine stops before the
 * paid endpoint and reports LIVE_PROVISIONING_DISABLED.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";

type Ctx = AdminCtx;

export type OrderLinePayload = { productId: string; quantity: number; travelerLabel?: string | null };

/**
 * Creates an eSIM order. The client sends ONLY product IDs, quantities and an
 * optional traveler label — price, currency, supplier cost and supplier
 * mapping are resolved server-side.
 */
export const createEsimOrderRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lines: OrderLinePayload[]; locale?: string; idempotencyKey?: string }) => input)
  .handler(async ({ data, context }) => {
    // Security baseline P1-3: order creation abuse protection (fail closed).
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("orderCreateUser", context.userId);
    const { createEsimOrder } = await import("@/lib/commerce.server");
    const lines = (data.lines ?? []).slice(0, 20).map((line) => ({
      productId: String(line.productId),
      quantity: Number(line.quantity ?? 1),
      travelerLabel: line.travelerLabel ? String(line.travelerLabel).slice(0, 80) : null,
    }));
    const key = data.idempotencyKey
      ? `${context.userId}:${String(data.idempotencyKey).slice(0, 80)}`
      : `${context.userId}:${crypto.randomUUID()}`;
    return createEsimOrder({
      customerId: context.userId,
      locale: data.locale ?? "tr",
      lines,
      idempotencyKey: key,
    });
  });

/**
 * INTERNAL TEST ONLY. Marks an order as paid so automated integration tests can
 * exercise the post-payment path. Requires an admin session AND the
 * commerce.test_payments flag; normal customers can never reach it.
 */
export const confirmTestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { data: flag } = await db
      .from("feature_flags")
      .select("enabled")
      .eq("key", "commerce.test_payments")
      .maybeSingle();
    if (!flag?.enabled) return { ok: false as const, reason: "TEST_PAYMENTS_DISABLED" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "PAID", status: "CONFIRMED" })
      .eq("id", data.orderId)
      .eq("payment_status", "PENDING");
    if (error) throw new Error(error.message);
    await audit(db, "TEST_PAYMENT_CONFIRMED", "orders", data.orderId, null, { paymentStatus: "PAID" });
    return { ok: true as const };
  });

/** Runs provisioning for every unit of a paid order. Admin-only, idempotent. */
export const runOrderProvisioning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { createProvisioningStore, createSupplierPort, liveSupplierCallsEnabled } = await import(
      "@/lib/commerce.server"
    );
    const { provisionOrder } = await import("@/domain/commerce/engine");
    const store = await createProvisioningStore();
    const supplier = await createSupplierPort(null);
    if (!supplier) return { ok: false as const, reason: "PROVIDER_NOT_READY" as const };
    const result = await provisionOrder(store, supplier, data.orderId, {
      liveSupplierCallsEnabled: liveSupplierCallsEnabled(),
    });
    await audit(db, "PROVISIONING_RUN", "orders", data.orderId, null, {
      fulfillment: result.fulfillment,
      outcomes: result.outcomes.map((outcome) => outcome.result),
    });
    return { ok: true as const, ...result };
  });

/** Safe retry of a single failed unit. Never re-purchases an unknown result. */
export const retryProvisioningUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { unitId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { createProvisioningStore, createSupplierPort, liveSupplierCallsEnabled } = await import(
      "@/lib/commerce.server"
    );
    const { provisionUnit } = await import("@/domain/commerce/engine");
    const store = await createProvisioningStore();
    const unit = await store.loadUnit(data.unitId);
    if (!unit) return { ok: false as const, reason: "NOT_FOUND" as const };
    const supplier = await createSupplierPort(unit.providerId);
    if (!supplier) return { ok: false as const, reason: "PROVIDER_NOT_READY" as const };
    const outcome = await provisionUnit(store, supplier, data.unitId, {
      liveSupplierCallsEnabled: liveSupplierCallsEnabled(),
    });
    await audit(db, "PROVISIONING_RETRY", "provisioning_units", data.unitId, { status: unit.status }, {
      result: outcome.result,
    });
    return { ok: true as const, outcome };
  });

/** Read-only supplier reconciliation for an unknown result. Never purchases. */
export const reconcileProvisioningUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { unitId: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const { createProvisioningStore, createSupplierPort } = await import("@/lib/commerce.server");
    const { reconcileUnit } = await import("@/domain/commerce/engine");
    const store = await createProvisioningStore();
    const unit = await store.loadUnit(data.unitId);
    if (!unit) return { ok: false as const, reason: "NOT_FOUND" as const };
    const supplier = await createSupplierPort(unit.providerId);
    if (!supplier) return { ok: false as const, reason: "PROVIDER_NOT_READY" as const };
    const outcome = await reconcileUnit(store, supplier, data.unitId);
    await audit(db, "PROVISIONING_RECONCILE", "provisioning_units", data.unitId, { status: unit.status }, {
      result: outcome.result,
    });
    return { ok: true as const, outcome };
  });

export type ProvisioningUnitView = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerId: string | null;
  productName: string | null;
  providerCode: string | null;
  unitIndex: number;
  status: string;
  providerReference: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
  hasEsim: boolean;
  retryEligible: boolean;
  needsReconciliation: boolean;
};

/**
 * Admin fulfillment list. Deliberately returns no QR payload, activation code
 * or credential of any kind.
 */
export const listProvisioningUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId?: string; status?: string; limit?: number }) => input ?? {})
  .handler(async ({ data, context }): Promise<ProvisioningUnitView[]> => {
    const db = await adminDb(context as Ctx);
    const { canRetryUnit, needsReconciliation } = await import("@/domain/commerce/provisioning");
    let query = db
      .from("provisioning_units")
      .select(
        "id, order_id, order_item_id, unit_index, status, provider_reference, customer_esim_id, attempt_count, last_attempt_at, error_category, error_message, providers(code), orders(order_number, customer_id), order_items(product_name_snapshot)",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(data.limit ?? 100), 200));
    if (data.orderId) query = query.eq("order_id", data.orderId);
    if (data.status && data.status !== "ALL") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row: any) => {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      const item = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
      const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers;
      const state = {
        status: row.status,
        providerReference: row.provider_reference ?? null,
        customerEsimId: row.customer_esim_id ?? null,
      };
      return {
        id: row.id,
        orderId: row.order_id,
        orderNumber: order?.order_number ?? null,
        customerId: order?.customer_id ?? null,
        productName: item?.product_name_snapshot ?? null,
        providerCode: provider?.code ?? null,
        unitIndex: row.unit_index,
        status: row.status,
        providerReference: row.provider_reference ?? null,
        attemptCount: Number(row.attempt_count ?? 0),
        lastAttemptAt: row.last_attempt_at ?? null,
        errorCategory: row.error_category ?? null,
        errorMessage: row.error_message ?? null,
        hasEsim: Boolean(row.customer_esim_id),
        retryEligible: canRetryUnit(state),
        needsReconciliation: needsReconciliation(state),
      };
    });
  });
