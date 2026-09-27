import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { normalizeCode } from "@/domain/promotions";

/* ------------------------------- public -------------------------------- */

export type PublicBanner = {
  id: string;
  code: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  currency: string;
  text: Record<string, string>;
  showCopy: boolean;
} | null;

/** Public: the one running, banner-visible promotion (server time). Never throws. */
export const getPromotionBanner = createServerFn({ method: "GET" }).handler(async (): Promise<PublicBanner> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).rpc("public_promotion_banner");
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    const text: Record<string, string> = {};
    for (const [key, value] of Object.entries(row.banner_text ?? {})) if (typeof value === "string" && value.trim()) text[key] = value.slice(0, 160);
    return {
      id: row.id,
      code: row.show_code ? row.code : null,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      currency: row.currency,
      text,
      showCopy: Boolean(row.show_code && row.show_copy),
    };
  } catch {
    return null;
  }
});

const validateInput = z.object({
  code: z.string().trim().min(1).max(40),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(9) })).max(50),
});

/** Public: server-authoritative coupon check. Optional sign-in is read from the bearer token. */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validateInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let customerId: string | null = null;
    const auth = getRequestHeader("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token && token.split(".").length === 3) {
      const { data: user } = await supabaseAdmin.auth.getUser(token);
      customerId = user?.user?.id ?? null;
    }
    const { validateCouponServer } = await import("@/lib/promotions.server");
    return validateCouponServer(supabaseAdmin, { code: data.code, lines: data.lines, customerId });
  });

/* -------------------------------- admin -------------------------------- */

const saveInput = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  code: z.string().transform(normalizeCode).pipe(z.string().regex(/^[A-Z0-9_-]{3,32}$/, "Kod 3–32 karakter: A–Z, 0–9, - veya _")),
  status: z.enum(["ACTIVE", "PAUSED"]),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().positive(),
  services: z.array(z.enum(["ESIM", "LOUNGE", "VIGNETTE"])).min(1, "En az bir servis seçin."),
  countryScope: z.enum(["ALL", "SELECTED"]),
  countryIsos: z.array(z.string().regex(/^[A-Z]{2}$/)).max(300),
  productScope: z.enum(["ALL", "SELECTED"]),
  productIds: z.array(z.string().uuid()).max(500),
  packageType: z.enum(["ALL", "STANDARD", "UNLIMITED"]),
  packageScopes: z.array(z.enum(["COUNTRY", "REGION", "GLOBAL"])),
  totalLimit: z.number().int().positive().nullable(),
  perCustomerLimit: z.number().int().positive().nullable(),
  minOrder: z.number().min(0).nullable(),
  bannerVisible: z.boolean(),
  bannerText: z.record(z.string(), z.string().max(160)),
  bannerShowCode: z.boolean(),
  bannerShowCopy: z.boolean(),
}).superRefine((v, ctx) => {
  if (new Date(v.endsAt) <= new Date(v.startsAt)) ctx.addIssue({ code: "custom", message: "Bitiş başlangıçtan sonra olmalı." });
  if (v.discountType === "PERCENT" && v.discountValue > 100) ctx.addIssue({ code: "custom", message: "Yüzde 1–100 arası olmalı." });
  if (v.countryScope === "SELECTED" && !v.countryIsos.length) ctx.addIssue({ code: "custom", message: "En az bir ülke seçin." });
  if (v.productScope === "SELECTED" && !v.productIds.length) ctx.addIssue({ code: "custom", message: "En az bir ürün seçin." });
  if (v.services.includes("ESIM") && !v.packageScopes.length) ctx.addIssue({ code: "custom", message: "En az bir paket kapsamı seçin." });
});
export type PromotionInput = z.input<typeof saveInput>;

export const listPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db.from("promotions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: uses } = await db.from("promotion_redemptions").select("promotion_id");
    const counts = new Map<string, number>();
    for (const row of uses ?? []) counts.set(row.promotion_id, (counts.get(row.promotion_id) ?? 0) + 1);
    return (data ?? []).map((row: any) => ({ ...row, uses: counts.get(row.id) ?? 0 }));
  });

export const savePromotion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = saveInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Geçersiz kampanya.");
    return parsed.data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const row = {
      name: data.name, code: data.code, status: data.status,
      starts_at: data.startsAt, ends_at: data.endsAt,
      discount_type: data.discountType, discount_value: data.discountValue,
      services: data.services,
      country_scope: data.countryScope, country_isos: data.countryScope === "SELECTED" ? data.countryIsos : [],
      product_scope: data.productScope, product_ids: data.productScope === "SELECTED" ? data.productIds : [],
      package_type: data.packageType, package_scopes: data.packageScopes,
      total_limit: data.totalLimit, per_customer_limit: data.perCustomerLimit, min_order: data.minOrder,
      banner_visible: data.bannerVisible, banner_text: data.bannerText,
      banner_show_code: data.bannerShowCode, banner_show_copy: data.bannerShowCopy,
      updated_by: (context as AdminCtx).userId,
    };
    const result = data.id
      ? await db.from("promotions").update(row).eq("id", data.id).select("id").single()
      : await db.from("promotions").insert({ ...row, created_by: (context as AdminCtx).userId }).select("id").single();
    if (result.error) throw new Error(result.error.code === "23505" ? "Bu kupon kodu zaten kullanılıyor." : result.error.message);
    await audit(db, data.id ? "promotion.update" : "promotion.create", "promotions", result.data.id, null, row);
    return { id: result.data.id as string };
  });

export const setPromotionStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]) }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.from("promotions").update({ status: data.status, updated_by: (context as AdminCtx).userId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, `promotion.${data.status.toLowerCase()}`, "promotions", data.id, null, { status: data.status });
    return { ok: true };
  });

/** Admin product finder for "selected products" scope (existing catalogue, read-only). */
export const searchPromotionProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ search: z.string().max(80).default(""), ids: z.array(z.string().uuid()).max(500).default([]) }).parse(input ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const select = "id, name, service_type, sale_price, currency, esim_product_details(country_iso, package_kind, unlimited_data, data_gb, validity_days)";
    const map = (rows: any[]) => rows.map((r) => {
      const d = Array.isArray(r.esim_product_details) ? r.esim_product_details[0] : r.esim_product_details;
      return { id: r.id, name: r.name, service: r.service_type, price: Number(r.sale_price ?? 0), currency: r.currency, iso: d?.country_iso ?? null, kind: d?.package_kind ?? null, unlimited: Boolean(d?.unlimited_data), dataGb: d?.data_gb ?? null, days: d?.validity_days ?? null };
    });
    const selected = data.ids.length ? map((await db.from("service_products").select(select).in("id", data.ids)).data ?? []) : [];
    let results: ReturnType<typeof map> = [];
    if (data.search.trim().length >= 2) {
      const q = data.search.trim().replace(/[%,()]/g, "");
      const { data: rows } = await db.from("service_products").select(select)
        .eq("lifecycle", "PUBLISHED").eq("customer_visible", true).or(`name.ilike.%${q}%,slug.ilike.%${q}%`).order("name").limit(40);
      results = map(rows ?? []);
    }
    return { selected, results };
  });

/* --------------------------- Admin: banner translation --------------------------- */

const translateInput = z.object({
  text: z.string().trim().min(1).max(160),
  targets: z.array(z.string().regex(/^[a-z]{2}$/)).min(1).max(20),
});

/**
 * Admin-only. Translates the Turkish campaign tagline once at edit time; the result is
 * stored on the promotion so the storefront never translates at runtime.
 */
export const translateBannerText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => translateInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await adminDb(context as AdminCtx);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Çeviri servisi kullanılamıyor.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You translate short e-commerce promotion taglines for a travel eSIM store. Keep them short, natural and marketing-appropriate. Never translate or alter coupon codes, brand names (travely), numbers or currency amounts. Reply only via the tool." },
          { role: "user", content: `Turkish source: ${JSON.stringify(data.text)}\nTarget language codes: ${data.targets.join(", ")}` },
        ],
        tools: [{ type: "function", function: { name: "translations", parameters: { type: "object", properties: Object.fromEntries(data.targets.map((t) => [t, { type: "string" }])), required: data.targets } } }],
        tool_choice: { type: "function", function: { name: "translations" } },
      }),
    });
    if (res.status === 429) throw new Error("Çeviri servisi yoğun, biraz sonra tekrar deneyin.");
    if (res.status === 402) throw new Error("Çeviri kredisi tükendi.");
    if (!res.ok) throw new Error("Çeviri başarısız oldu.");
    const json: any = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args ?? {};
    const out: Record<string, string> = {};
    for (const t of data.targets) if (typeof parsed[t] === "string" && parsed[t].trim()) out[t] = parsed[t].trim().slice(0, 160);
    return { translations: out };
  });
