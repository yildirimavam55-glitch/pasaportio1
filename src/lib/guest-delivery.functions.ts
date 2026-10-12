/**
 * Public guest delivery endpoints. Disabled (always neutral) until migration 0011
 * is applied AND GUEST_DELIVERY_ENABLED=1 is set. Renewal codes are never emailed:
 * no mail provider is connected, the mailer is a no-op.
 */
import { createServerFn } from "@tanstack/react-start";

import type { GuestAccess, GuestDeliveryStore, GuestMailer } from "@/domain/commerce/guest-delivery";

const enabled = () => process.env["GUEST_DELIVERY_ENABLED"] === "1";
const noopMailer: GuestMailer = { async sendRenewalCode() { /* intentionally not sent: email delivery disabled */ } };

async function serverStore(): Promise<GuestDeliveryStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  return {
    async findToken(tokenHash) {
      const { data } = await db.from("order_access_tokens").select("order_id, token_hash, expires_at").eq("kind", "DELIVERY").eq("token_hash", tokenHash).maybeSingle();
      return data ? { orderId: data.order_id, tokenHash: data.token_hash, expiresAt: data.expires_at } : null;
    },
    async saveToken(r) { await db.from("order_access_tokens").insert({ order_id: r.orderId, kind: "DELIVERY", token_hash: r.tokenHash, expires_at: r.expiresAt }); },
    async findGuestOrder(orderNumber) {
      const { data } = await db.from("orders").select("id, guest_email, locale").eq("order_number", orderNumber).is("customer_id", null).maybeSingle();
      return data?.guest_email ? { id: data.id, guestEmail: String(data.guest_email).toLowerCase(), locale: data.locale } : null;
    },
    async loadGuestOrder(orderId) {
      const { data: order } = await db.from("orders").select("id, order_number, locale, payment_status, fulfillment_status, customer_id").eq("id", orderId).maybeSingle();
      if (!order || order.customer_id) return null;
      const { data: items } = await db.from("order_items").select("id, product_id").eq("order_id", orderId);
      const itemIds = (items ?? []).map((i: any) => i.id);
      const { data: esims } = itemIds.length
        ? await db.from("customer_esims").select("id, order_item_id, package_label, destination_label, status, total_data_mb, remaining_data_mb, expires_at, qr_payload, install_info").in("order_item_id", itemIds)
        : { data: [] };
      const productIds = (items ?? []).map((i: any) => i.product_id).filter(Boolean);
      const { data: details } = productIds.length ? await db.from("esim_product_details").select("product_id, activation_policy").in("product_id", productIds) : { data: [] };
      const policy = new Map((details ?? []).map((d: any) => [d.product_id, d.activation_policy]));
      const productOf = new Map((items ?? []).map((i: any) => [i.id, i.product_id]));
      return {
        orderNumber: order.order_number, locale: order.locale, paymentStatus: order.payment_status, fulfillmentStatus: order.fulfillment_status,
        esims: (esims ?? []).map((e: any) => ({
          id: e.id, packageLabel: e.package_label, destinationLabel: e.destination_label, status: e.status,
          totalDataMb: e.total_data_mb, remainingDataMb: e.remaining_data_mb, expiresAt: e.expires_at,
          qrPayload: e.qr_payload, installInfo: e.install_info, activationPolicy: (policy.get(productOf.get(e.order_item_id)) as string) ?? null,
        })),
      };
    },
    async latestRenewal(orderId) {
      const { data } = await db.from("order_access_tokens").select("token_hash, expires_at, attempts, used_at").eq("kind", "RENEWAL").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data ? { orderId, codeHash: data.token_hash, expiresAt: data.expires_at, attempts: data.attempts, usedAt: data.used_at } : null;
    },
    async saveRenewal(r) { await db.from("order_access_tokens").insert({ order_id: r.orderId, kind: "RENEWAL", token_hash: r.codeHash, expires_at: r.expiresAt }); },
    async updateRenewal(orderId, hash, patch) {
      const row: Record<string, unknown> = {};
      if (patch.attempts !== undefined) row["attempts"] = patch.attempts;
      if (patch.usedAt !== undefined) row["used_at"] = patch.usedAt;
      await db.from("order_access_tokens").update(row).eq("kind", "RENEWAL").eq("order_id", orderId).eq("token_hash", hash);
    },
  };
}

async function limited(name: "guestDeliveryIp" | "guestRenewIp"): Promise<boolean> {
  const { enforceRateLimit, clientIpSubject } = await import("@/lib/rate-limit.server");
  try { await enforceRateLimit(name, await clientIpSubject()); return false; } catch { return true; }
}

export const openGuestDeliveryRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: typeof input?.token === "string" ? input.token.slice(0, 80) : "" }))
  .handler(async ({ data }): Promise<GuestAccess> => {
    if (!enabled() || (await limited("guestDeliveryIp"))) return { ok: false };
    const { openGuestDelivery } = await import("@/domain/commerce/guest-delivery");
    try { return await openGuestDelivery(await serverStore(), data.token); } catch { return { ok: false }; }
  });

type RenewInput = { orderNumber: string; email: string; code?: string };
const renewValidator = (input: RenewInput) => ({
  orderNumber: String(input?.orderNumber ?? "").slice(0, 40),
  email: String(input?.email ?? "").slice(0, 254),
  code: input?.code ? String(input.code).slice(0, 6) : undefined,
});

export const requestGuestRenewal = createServerFn({ method: "POST" })
  .inputValidator(renewValidator)
  .handler(async ({ data }) => {
    if (!enabled() || (await limited("guestRenewIp"))) return { accepted: true as const };
    const { requestRenewal } = await import("@/domain/commerce/guest-delivery");
    try { return await requestRenewal(await serverStore(), noopMailer, data); } catch { return { accepted: true as const }; }
  });

export const confirmGuestRenewal = createServerFn({ method: "POST" })
  .inputValidator(renewValidator)
  .handler(async ({ data }): Promise<{ ok: true; token: string } | { ok: false }> => {
    if (!enabled() || (await limited("guestRenewIp"))) return { ok: false };
    const { confirmRenewal } = await import("@/domain/commerce/guest-delivery");
    try { return await confirmRenewal(await serverStore(), data); } catch { return { ok: false }; }
  });
