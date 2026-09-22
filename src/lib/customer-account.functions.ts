import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export type CustomerEsimRecord = {
  id: string;
  orderItemId: string | null;
  travelerLabel: string | null;
  destinationLabel: string | null;
  packageLabel: string | null;
  status: string;
  totalDataMb: number | null;
  remainingDataMb: number | null;
  expiresAt: string | null;
  topupSupported: boolean;
  installInfo: Json;
  hasQr: boolean;
  hasInstallInfo: boolean;
  hasIccid: boolean;
  providerCapabilities: string[];
  createdAt: string;
  updatedAt: string;
};

function objectValue(value: Json): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function capabilitiesFromRow(row: Record<string, unknown>) {
  const orderItems = row["order_items"];
  const orderItem = Array.isArray(orderItems) ? orderItems[0] : orderItems;
  if (!orderItem || typeof orderItem !== "object") return [];
  const providers = (orderItem as Record<string, unknown>)["providers"];
  const provider = Array.isArray(providers) ? providers[0] : providers;
  if (!provider || typeof provider !== "object") return [];
  const capabilities = (provider as Record<string, unknown>)["capabilities"];
  return Array.isArray(capabilities)
    ? capabilities.filter((item): item is string => typeof item === "string")
    : [];
}

const ESIM_LIST_COLUMNS =
  "id, order_item_id, traveler_label, destination_label, package_label, status, total_data_mb, remaining_data_mb, expires_at, iccid, qr_payload, install_info, topup_supported, created_at, updated_at, order_items(provider_id, providers(capabilities))";

function toEsimRecord(row: Record<string, any>): CustomerEsimRecord {
  const installInfo = objectValue(row["install_info"] as Json);
  return {
    id: row["id"],
    orderItemId: row["order_item_id"] ?? null,
    travelerLabel: row["traveler_label"] ?? null,
    destinationLabel: row["destination_label"] ?? null,
    packageLabel: row["package_label"] ?? null,
    status: row["status"],
    totalDataMb: row["total_data_mb"] ?? null,
    remainingDataMb: row["remaining_data_mb"] ?? null,
    expiresAt: row["expires_at"] ?? null,
    topupSupported: Boolean(row["topup_supported"]),
    installInfo,
    hasQr: Boolean(row["qr_payload"]),
    hasInstallInfo:
      installInfo !== null &&
      typeof installInfo === "object" &&
      !Array.isArray(installInfo) &&
      Object.keys(installInfo).length > 0,
    hasIccid: Boolean(row["iccid"]),
    providerCapabilities: capabilitiesFromRow(row),
    createdAt: row["created_at"],
    updatedAt: row["updated_at"],
  };
}

export const getCustomerAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileResult, esimsResult, loungesResult, ordersResult] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, preferred_locale, country_iso")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("customer_esims")
        .select(ESIM_LIST_COLUMNS)
        .eq("customer_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("customer_lounge_bookings")
        .select(
          "id, airport_iata, terminal, lounge_name, visit_at, travelers_count, status, created_at",
        )
        .eq("customer_id", context.userId)
        .order("visit_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("orders")
        .select(
          "id, order_number, status, payment_status, fulfillment_status, currency, gross_revenue, created_at",
        )
        .eq("customer_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const error =
      profileResult.error ?? esimsResult.error ?? loungesResult.error ?? ordersResult.error;
    if (error) throw new Error("Hesap bilgileri yüklenemedi.");

    const esims: CustomerEsimRecord[] = (esimsResult.data ?? []).map((row) =>
      toEsimRecord(row as unknown as Record<string, any>),
    );

    return {
      profile: profileResult.data
        ? {
            ...profileResult.data,
            email:
              profileResult.data.email ??
              (typeof context.claims.email === "string" ? context.claims.email : null),
          }
        : {
            id: context.userId,
            email: typeof context.claims.email === "string" ? context.claims.email : null,
            full_name: null,
            preferred_locale: "tr" as const,
            country_iso: null,
          },
      esims,
      lounges: loungesResult.data ?? [],
      orders: ordersResult.data ?? [],
      fetchedAt: new Date().toISOString(),
    };
  });

export const getCustomerEsimActivation = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ esimId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: esim, error } = await context.supabase
      .from("customer_esims")
      .select("id, status, iccid, qr_payload, install_info")
      .eq("id", data.esimId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("eSIM kurulum bilgisi yüklenemedi.");
    if (!esim) throw new Error("eSIM bulunamadı.");
    return {
      id: esim.id,
      status: esim.status,
      iccid: esim.iccid,
      qrPayload: esim.qr_payload,
      installInfo: objectValue(esim.install_info),
    };
  });

/** One eSIM, scoped to its owner. Ids alone are never trusted. */
export const getCustomerEsimDetail = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ esimId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("customer_esims")
      .select(ESIM_LIST_COLUMNS)
      .eq("id", data.esimId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("eSIM bilgisi yüklenemedi.");
    if (!row) return null;

    const esim = toEsimRecord(row as unknown as Record<string, any>);

    let orderRef: { id: string; orderNumber: string; createdAt: string } | null = null;
    let purchase: {
      productName: string | null;
      destination: string | null;
      salePrice: number | null;
      currency: string | null;
      quantity: number | null;
      fulfillmentStatus: string | null;
      detailsSnapshot: Json;
    } | null = null;
    let coverage: {
      countryIsos: string[];
      dataGb: number | null;
      unlimited: boolean;
      validityDays: number | null;
      activationPolicy: string | null;
      networkOperators: string[];
      fairUseNote: string | null;
      topupSupported: boolean | null;
    } | null = null;

    if (esim.orderItemId) {
      const { data: item } = await context.supabase
        .from("order_items")
        .select(
          "id, order_id, product_id, product_name_snapshot, destination_snapshot, sale_price, currency, quantity, fulfillment_status, details_snapshot, orders!inner(id, order_number, created_at, customer_id)",
        )
        .eq("id", esim.orderItemId)
        .maybeSingle();

      const order = item
        ? ((Array.isArray(item.orders) ? item.orders[0] : item.orders) as
            | { id: string; order_number: string; created_at: string; customer_id: string | null }
            | null)
        : null;

      // Defence in depth: the order behind the item must belong to the same customer.
      if (item && order && order.customer_id === context.userId) {
        orderRef = { id: order.id, orderNumber: order.order_number, createdAt: order.created_at };
        purchase = {
          productName: item.product_name_snapshot,
          destination: item.destination_snapshot,
          salePrice: item.sale_price == null ? null : Number(item.sale_price),
          currency: item.currency,
          quantity: item.quantity,
          fulfillmentStatus: item.fulfillment_status,
          detailsSnapshot: objectValue(item.details_snapshot),
        };

        if (item.product_id) {
          const { data: details } = await context.supabase
            .from("esim_product_details")
            .select(
              "coverage_country_isos, data_gb, unlimited_data, validity_days, activation_policy, network_operators, fair_use_note, topup_supported",
            )
            .eq("product_id", item.product_id)
            .maybeSingle();
          if (details) {
            coverage = {
              countryIsos: (details.coverage_country_isos ?? []).filter(Boolean),
              dataGb: details.data_gb == null ? null : Number(details.data_gb),
              unlimited: Boolean(details.unlimited_data),
              validityDays: details.validity_days,
              activationPolicy: details.activation_policy,
              networkOperators: (details.network_operators ?? []).filter(Boolean),
              fairUseNote: details.fair_use_note,
              topupSupported: details.topup_supported,
            };
          }
        }
      }
    }

    return { esim, orderRef, purchase, coverage, fetchedAt: new Date().toISOString() };
  });

export const getCustomerOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, fulfillment_status, currency, gross_revenue, discount_total, created_at, order_items(id, product_name_snapshot, destination_snapshot, service_type, quantity)",
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Siparişler yüklenemedi.");
    return {
      orders: (data ?? []).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        currency: order.currency,
        total: Number(order.gross_revenue),
        createdAt: order.created_at,
        items: (order.order_items ?? []).map((item) => ({
          id: item.id,
          name: item.product_name_snapshot,
          destination: item.destination_snapshot,
          serviceType: item.service_type,
          quantity: item.quantity,
        })),
      })),
      fetchedAt: new Date().toISOString(),
    };
  });

/** Order detail without any supplier cost, margin or internal field. */
export const getCustomerOrderDetail = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, fulfillment_status, currency, gross_revenue, discount_total, tax_total, created_at, order_items(id, product_name_snapshot, destination_snapshot, service_type, quantity, sale_price, discount, currency, fulfillment_status)",
      )
      .eq("id", data.orderId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Sipariş yüklenemedi.");
    if (!order) return null;

    const itemIds = (order.order_items ?? []).map((item) => item.id);
    let esims: Array<{ id: string; label: string | null; status: string }> = [];
    if (itemIds.length) {
      const { data: rows } = await context.supabase
        .from("customer_esims")
        .select("id, package_label, destination_label, status, order_item_id")
        .eq("customer_id", context.userId)
        .in("order_item_id", itemIds);
      esims = (rows ?? []).map((row) => ({
        id: row.id,
        label: row.package_label ?? row.destination_label,
        status: row.status,
      }));
    }

    return {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        currency: order.currency,
        total: Number(order.gross_revenue),
        discountTotal: Number(order.discount_total ?? 0),
        taxTotal: Number(order.tax_total ?? 0),
        createdAt: order.created_at,
        items: (order.order_items ?? []).map((item) => ({
          id: item.id,
          name: item.product_name_snapshot,
          destination: item.destination_snapshot,
          serviceType: item.service_type,
          quantity: item.quantity,
          salePrice: Number(item.sale_price),
          discount: Number(item.discount ?? 0),
          currency: item.currency,
          fulfillmentStatus: item.fulfillment_status,
        })),
      },
      esims,
      fetchedAt: new Date().toISOString(),
    };
  });

export const getAccountSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileResult, prefsResult, deletionResult] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, preferred_locale, country_iso")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("customer_notification_preferences")
        .select("marketing_email, product_tips_email, consent_updated_at")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("account_deletion_requests")
        .select("id, status, requested_at")
        .eq("user_id", context.userId)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (profileResult.error) throw new Error("Profil yüklenemedi.");
    return {
      profile: {
        id: context.userId,
        email:
          profileResult.data?.email ??
          (typeof context.claims.email === "string" ? context.claims.email : null),
        fullName: profileResult.data?.full_name ?? null,
        preferredLocale: profileResult.data?.preferred_locale ?? ("tr" as const),
        countryIso: profileResult.data?.country_iso ?? null,
      },
      notifications: {
        marketingEmail: prefsResult.data?.marketing_email ?? false,
        productTipsEmail: prefsResult.data?.product_tips_email ?? false,
        consentUpdatedAt: prefsResult.data?.consent_updated_at ?? null,
      },
      deletionRequest: deletionResult.data ?? null,
    };
  });

export const updateCustomerProfile = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        fullName: z.string().trim().max(120).optional(),
        preferredLocale: z.enum(["tr", "de", "en"]).optional(),
        countryIso: z.string().trim().length(2).toUpperCase().optional().or(z.literal("")),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const patch: {
      full_name?: string | null;
      preferred_locale?: "tr" | "de" | "en";
      country_iso?: string | null;
    } = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName || null;
    if (data.preferredLocale !== undefined) patch.preferred_locale = data.preferredLocale;
    if (data.countryIso !== undefined) patch.country_iso = data.countryIso || null;
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error("Profil kaydedilemedi.");
    return { ok: true };
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        marketingEmail: z.boolean(),
        productTipsEmail: z.boolean(),
        source: z.string().trim().max(60).default("account-settings"),
      })
      .parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("customer_notification_preferences").upsert(
      {
        user_id: context.userId,
        marketing_email: data.marketingEmail,
        product_tips_email: data.productTipsEmail,
        consent_updated_at: new Date().toISOString(),
        consent_source: data.source,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("Bildirim tercihleri kaydedilemedi.");
    return { ok: true };
  });

/** Files a privacy deletion request. It never cascades order or accounting records. */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ reason: z.string().trim().max(500).optional() }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("account_deletion_requests")
      .select("id, status")
      .eq("user_id", context.userId)
      .in("status", ["REQUESTED", "IN_REVIEW"])
      .maybeSingle();
    if (existing) return { ok: true, alreadyRequested: true };
    const { error } = await context.supabase.from("account_deletion_requests").insert({
      user_id: context.userId,
      reason: data.reason || null,
    });
    if (error) throw new Error("Silme talebi oluşturulamadı.");
    return { ok: true, alreadyRequested: false };
  });
