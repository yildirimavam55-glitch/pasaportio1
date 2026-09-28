import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import {
  ACTION_EVENT,
  adminTransition,
  assessEligibility,
  assessUsage,
  isDemoEsim,
  itemRefundBasis,
  normalizeRefundStatus,
  OPEN_REFUND_STATUSES,
  REFUND_REASONS,
  refundWindow,
  type RefundRequestStatus,
} from "@/domain/refunds/refund-policy";

/**
 * 14-day refund guarantee — one backend for web and future app shells.
 * Ownership, purchase date, amount, usage and eligibility are ALWAYS derived here from the database
 * and server time. No payment refund and no supplier cancellation is ever executed by this module.
 */

const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);

/** Customer-safe projection — never includes admin notes or audit internals. */
const CUSTOMER_REQUEST_COLUMNS =
  "id, customer_esim_id, order_id, order_item_id, status, amount, currency, reason_code, eligibility, is_test, product_snapshot, customer_message, purchase_at, created_at, updated_at";

function customerRequest(row: Record<string, any>) {
  return {
    id: row["id"] as string,
    esimId: (row["customer_esim_id"] ?? null) as string | null,
    status: normalizeRefundStatus(row["status"]),
    amount: row["amount"] == null ? null : Number(row["amount"]),
    currency: (row["currency"] ?? "EUR") as string,
    reasonCode: (row["reason_code"] ?? null) as string | null,
    isTest: Boolean(row["is_test"]),
    productLabel: ((row["product_snapshot"] ?? {}) as Record<string, unknown>)["label"] as string | null ?? null,
    customerMessage: (row["customer_message"] ?? null) as string | null,
    purchaseAt: (row["purchase_at"] ?? null) as string | null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

async function buildRefundState(supabase: any, userId: string, esimId: string, now: Date) {
  const { data: esim, error } = await supabase
    .from("customer_esims")
    .select("id, customer_id, order_item_id, status, destination_label, package_label, install_info, provider_reference, created_at")
    .eq("id", esimId)
    .eq("customer_id", userId)
    .maybeSingle();
  if (error) throw new Error("REFUND_STATE_UNAVAILABLE");
  if (!esim) return null;

  let item: any = null;
  let order: any = null;
  let productIsTest = false;
  if (esim.order_item_id) {
    const { data } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, product_name_snapshot, destination_snapshot, sale_price, quantity, discount, currency, details_snapshot, orders!inner(id, order_number, customer_id, created_at, payment_status, currency, discount_total, original_subtotal, coupon_code, promotion_id)")
      .eq("id", esim.order_item_id)
      .maybeSingle();
    const o = data ? one<any>(data.orders) : null;
    // Defence in depth: item's order must belong to the caller.
    if (data && o && o.customer_id === userId) {
      item = data;
      order = o;
      if (data.product_id) {
        const { data: product } = await supabase.from("service_products").select("is_test").eq("id", data.product_id).maybeSingle();
        productIsTest = Boolean(product?.is_test);
      }
    }
  }

  const isDemo = isDemoEsim(esim.install_info, productIsTest);
  const purchaseAt = order?.created_at ?? (isDemo ? esim.created_at : null);
  const window = refundWindow(purchaseAt, now);
  const usage = assessUsage({ installInfo: esim.install_info, productIsTest, now });

  const { data: requests } = await supabase
    .from("refund_requests")
    .select(CUSTOMER_REQUEST_COLUMNS)
    .eq("requested_by", userId)
    .or(item ? `customer_esim_id.eq.${esim.id},order_item_id.eq.${item.id}` : `customer_esim_id.eq.${esim.id}`)
    .order("created_at", { ascending: false });
  const history: ReturnType<typeof customerRequest>[] = ((requests ?? []) as Record<string, any>[]).map(customerRequest);
  const hasOpenRequest = history.some((r: { status: RefundRequestStatus }) => OPEN_REFUND_STATUSES.includes(r.status));

  const basis = item && order
    ? itemRefundBasis(
        { salePrice: Number(item.sale_price ?? 0), quantity: Number(item.quantity ?? 1), itemDiscount: Number(item.discount ?? 0) },
        { discountTotal: Number(order.discount_total ?? 0), originalSubtotal: order.original_subtotal == null ? null : Number(order.original_subtotal), couponCode: order.coupon_code ?? null },
      )
    : null;

  const verdict = assessEligibility({
    hasOrderItem: Boolean(item),
    isDemo,
    paymentStatus: order?.payment_status ?? null,
    windowOpen: window.open,
    usage: usage.verification,
    hasOpenRequest,
  });

  const label = [esim.destination_label, esim.package_label].filter(Boolean).join(" · ") || item?.product_name_snapshot || "eSIM";
  return {
    esim,
    item,
    order,
    isDemo,
    window,
    usage,
    basis,
    verdict,
    history,
    summary: {
      esimId: esim.id as string,
      label,
      destination: (esim.destination_label ?? item?.destination_snapshot ?? null) as string | null,
      packageLabel: (esim.package_label ?? item?.product_name_snapshot ?? null) as string | null,
      orderNumber: (order?.order_number ?? null) as string | null,
      purchaseAt: window.purchaseAt,
      windowEndsAt: window.endsAt,
      daysLeft: window.daysLeft,
      windowOpen: window.open,
      amount: basis?.amount ?? null,
      currency: (item?.currency ?? order?.currency ?? "EUR") as string,
      isDemo,
      usageVerification: usage.verification,
      eligibility: verdict.eligibility,
      canRequest: verdict.canRequest,
      history,
      serverTime: now.toISOString(),
    },
  };
}

export const getEsimRefundState = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ esimId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const state = await buildRefundState(context.supabase, context.userId, data.esimId, new Date());
    return state?.summary ?? null;
  });

export const createRefundRequest = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      esimId: z.string().uuid(),
      reasonCode: z.enum(REFUND_REASONS),
      note: z.string().trim().max(500).optional(),
      acknowledged: z.literal(true),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const now = new Date();
    const state = await buildRefundState(context.supabase, context.userId, data.esimId, now);
    if (!state) throw new Error("REFUND_NOT_FOUND");
    if (!state.verdict.canRequest) throw new Error(`REFUND_${state.verdict.eligibility}`);
    // Security baseline P1-3: refund request spam protection (fail closed).
    const { enforceRateLimit } = await import("@/lib/rate-limit.server");
    await enforceRateLimit("refundCreateUser", context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      order_id: state.order?.id ?? null,
      order_item_id: state.item?.id ?? null,
      customer_esim_id: state.esim.id,
      requested_by: context.userId,
      status: "REQUESTED" as const,
      amount: state.basis?.amount ?? null,
      list_amount: state.basis?.listAmount ?? null,
      discount_amount: state.basis?.discount ?? 0,
      amount_basis: state.basis ? { ...state.basis, source: "order_item_snapshot" } : { source: state.isDemo ? "demo_no_payment" : "none" },
      currency: state.summary.currency,
      reason_code: data.reasonCode,
      reason: data.note || null,
      purchase_at: state.window.purchaseAt,
      window_ends_at: state.window.endsAt,
      usage_verification: state.usage.verification,
      usage_snapshot: { ...state.usage, esimStatus: state.esim.status, providerLinked: Boolean(state.esim.provider_reference), assessedAt: now.toISOString() },
      eligibility: state.verdict.eligibility,
      is_test: state.isDemo,
      product_snapshot: { label: state.summary.label, destination: state.summary.destination, package: state.summary.packageLabel, orderNumber: state.summary.orderNumber, productId: state.item?.product_id ?? null },
      audit: [],
    };
    const { data: inserted, error } = await supabaseAdmin.from("refund_requests").insert(row as any).select("id").single();
    if (error) {
      if ((error as { code?: string }).code === "23505") throw new Error("REFUND_OPEN_REQUEST");
      throw new Error("REFUND_CREATE_FAILED");
    }
    await supabaseAdmin.from("refund_request_events").insert({
      refund_request_id: inserted.id,
      actor_id: context.userId,
      actor_type: "CUSTOMER",
      event: "REFUND_REQUESTED",
      from_status: null,
      to_status: "REQUESTED",
      order_id: row.order_id,
      order_item_id: row.order_item_id,
      note: state.isDemo ? "TEST / DEMO — no payment refund, no supplier action" : null,
    });
    return { id: inserted.id as string, status: "REQUESTED" as const };
  });

export const listMyRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("refund_requests")
      .select(CUSTOMER_REQUEST_COLUMNS)
      .eq("requested_by", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("REFUND_HISTORY_UNAVAILABLE");
    return (data ?? []).map((row) => customerRequest(row as Record<string, any>));
  });

/* ---------------------------------- Admin ---------------------------------- */

export const listAdminRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const now = new Date();
    const { data, error } = await db
      .from("refund_requests")
      .select("*, customer_esims(id, status, provider_reference, install_info, destination_label, package_label), order_items(id, product_name_snapshot, destination_snapshot, sale_price, quantity, discount, currency), orders(id, order_number, payment_status, created_at)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, any>[];
    const userIds = [...new Set(rows.map((r) => r["requested_by"]).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await db.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return rows.map((r) => {
      const esim = one<any>(r["customer_esims"]);
      const item = one<any>(r["order_items"]);
      const order = one<any>(r["orders"]);
      const window = refundWindow(r["purchase_at"], now);
      const liveUsage = esim ? assessUsage({ installInfo: esim.install_info, productIsTest: r["is_test"], now }) : null;
      const snapshot = (r["product_snapshot"] ?? {}) as Record<string, any>;
      const profile = byId.get(r["requested_by"]) as any;
      return {
        id: r["id"] as string,
        status: normalizeRefundStatus(r["status"]),
        customer: { id: r["requested_by"] as string | null, email: (profile?.email ?? null) as string | null, name: (profile?.full_name ?? null) as string | null },
        orderId: (order?.id ?? r["order_id"] ?? null) as string | null,
        orderNumber: (order?.order_number ?? snapshot["orderNumber"] ?? null) as string | null,
        paymentStatus: (order?.payment_status ?? null) as string | null,
        orderItemId: (r["order_item_id"] ?? null) as string | null,
        product: (item?.product_name_snapshot ?? snapshot["package"] ?? snapshot["label"] ?? null) as string | null,
        country: (item?.destination_snapshot ?? snapshot["destination"] ?? esim?.destination_label ?? null) as string | null,
        purchaseAt: (r["purchase_at"] ?? null) as string | null,
        amount: r["amount"] == null ? null : Number(r["amount"]),
        listAmount: r["list_amount"] == null ? null : Number(r["list_amount"]),
        discountAmount: Number(r["discount_amount"] ?? 0),
        amountBasis: r["amount_basis"] ?? {},
        currency: r["currency"] as string,
        daysSincePurchase: window.daysSince,
        windowOpenAtRequest: r["window_ends_at"] ? new Date(r["created_at"]).getTime() < new Date(r["window_ends_at"]).getTime() : false,
        windowOpenNow: window.open,
        providerLinked: Boolean(esim?.provider_reference),
        providerStatus: (esim?.status ?? null) as string | null,
        usageAtRequest: r["usage_verification"] as string,
        usageNow: liveUsage?.verification ?? "UNKNOWN",
        usedMb: liveUsage?.usedMb ?? ((r["usage_snapshot"] ?? {})["usedMb"] ?? null),
        eligibility: r["eligibility"] as string,
        isTest: Boolean(r["is_test"]),
        reasonCode: (r["reason_code"] ?? null) as string | null,
        reasonNote: (r["reason"] ?? null) as string | null,
        customerMessage: (r["customer_message"] ?? null) as string | null,
        createdAt: r["created_at"] as string,
        reviewedAt: (r["reviewed_at"] ?? null) as string | null,
      };
    });
  });

export const getAdminRefundEvents = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: events, error } = await db
      .from("refund_request_events")
      .select("id, actor_type, actor_id, event, from_status, to_status, note, created_at")
      .eq("refund_request_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return events ?? [];
  });

export const updateAdminRefundRequest = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["START_REVIEW", "APPROVE", "REJECT", "CANCEL", "NOTE"]),
      adminNote: z.string().trim().max(2000).optional(),
      customerMessage: z.string().trim().max(1000).optional(),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const { data: current, error } = await db.from("refund_requests").select("id, status, order_id, order_item_id, is_test").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!current) throw new Error("İade talebi bulunamadı.");
    const from = normalizeRefundStatus(current.status);

    if (data.action === "NOTE") {
      if (!data.adminNote && data.customerMessage === undefined) throw new Error("Not girin.");
      if (data.customerMessage !== undefined) {
        const { error: updateError } = await db.from("refund_requests").update({ customer_message: data.customerMessage || null }).eq("id", data.id);
        if (updateError) throw new Error(updateError.message);
      }
      await db.from("refund_request_events").insert({ refund_request_id: data.id, actor_id: ctx.userId, actor_type: "ADMIN", event: "ADMIN_NOTE", from_status: from, to_status: from, order_id: current.order_id, order_item_id: current.order_item_id, note: data.adminNote || (data.customerMessage !== undefined ? "Müşteri yanıtı güncellendi" : null) });
      return { status: from };
    }

    const to = adminTransition(from, data.action);
    if (!to) throw new Error(`Bu durumdan (${from}) bu işlem yapılamaz.`);
    if (data.action === "REJECT" && !data.customerMessage) throw new Error("Reddetmek için müşteriye gösterilecek bir gerekçe girin.");

    const patch: Record<string, unknown> = { status: to, reviewed_by: ctx.userId, reviewed_at: new Date().toISOString() };
    if (to === "APPROVED" || to === "REJECTED" || to === "CANCELLED") {
      patch["decided_by"] = ctx.userId;
      patch["decided_at"] = new Date().toISOString();
    }
    if (data.customerMessage !== undefined) patch["customer_message"] = data.customerMessage || null;
    const { error: updateError } = await db.from("refund_requests").update(patch).eq("id", data.id).eq("status", current.status);
    if (updateError) throw new Error(updateError.message);
    const { error: eventError } = await db.from("refund_request_events").insert({ refund_request_id: data.id, actor_id: ctx.userId, actor_type: "ADMIN", event: ACTION_EVENT[data.action], from_status: from, to_status: to, order_id: current.order_id, order_item_id: current.order_item_id, note: data.adminNote || null });
    if (eventError) throw new Error(eventError.message);
    await audit(db, `refund.${data.action.toLowerCase()}`, "refund_requests", data.id, { status: from }, { status: to, isTest: current.is_test, paymentRefundExecuted: false });
    return { status: to };
  });
