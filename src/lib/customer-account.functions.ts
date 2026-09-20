import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonObject = Record<string, unknown>;

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
  installInfo: JsonObject;
  hasQr: boolean;
  hasInstallInfo: boolean;
  hasIccid: boolean;
  providerCapabilities: string[];
  createdAt: string;
  updatedAt: string;
};

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function capabilitiesFromRow(row: Record<string, unknown>) {
  const orderItem = Array.isArray(row.order_items) ? row.order_items[0] : row.order_items;
  if (!orderItem || typeof orderItem !== "object") return [];
  const provider = Array.isArray((orderItem as JsonObject).providers)
    ? ((orderItem as JsonObject).providers as unknown[])[0]
    : (orderItem as JsonObject).providers;
  if (!provider || typeof provider !== "object") return [];
  const capabilities = (provider as JsonObject).capabilities;
  return Array.isArray(capabilities)
    ? capabilities.filter((item): item is string => typeof item === "string")
    : [];
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
        .select(
          "id, order_item_id, traveler_label, destination_label, package_label, status, total_data_mb, remaining_data_mb, expires_at, iccid, qr_payload, install_info, topup_supported, created_at, updated_at, order_items(provider_id, providers(capabilities))",
        )
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

    const esims: CustomerEsimRecord[] = (esimsResult.data ?? []).map((row) => {
      const installInfo = objectValue(row.install_info);
      return {
        id: row.id,
        orderItemId: row.order_item_id,
        travelerLabel: row.traveler_label,
        destinationLabel: row.destination_label,
        packageLabel: row.package_label,
        status: row.status,
        totalDataMb: row.total_data_mb,
        remainingDataMb: row.remaining_data_mb,
        expiresAt: row.expires_at,
        topupSupported: row.topup_supported,
        installInfo,
        hasQr: Boolean(row.qr_payload),
        hasInstallInfo: Object.keys(installInfo).length > 0,
        hasIccid: Boolean(row.iccid),
        providerCapabilities: capabilitiesFromRow(row as unknown as Record<string, unknown>),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return {
      profile: profileResult.data,
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
