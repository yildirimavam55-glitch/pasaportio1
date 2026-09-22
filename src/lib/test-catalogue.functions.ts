import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const TEST_SOURCE = "INTERNAL_TEST";
export const TEST_FLAG_KEY = "showTestCatalogue";

export type TestProduct = {
  id: string;
  code: string | null;
  slug: string;
  name: string;
  serviceType: "ESIM" | "LOUNGE" | "CAR_RENTAL" | "TRANSFER";
  currency: string;
  salePrice: number | null;
  lifecycle: string;
  enabled: boolean;
  isTest: boolean;
  source: string;
};

export function testPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Storefront kill switch: when off, INTERNAL_TEST products never reach customers. */
export async function isTestCatalogueVisible(): Promise<boolean> {
  const { data, error } = await testPublicClient().from("feature_flags").select("enabled").eq("key", TEST_FLAG_KEY).maybeSingle();
  if (error || !data) return false;
  return Boolean(data.enabled);
}

export const getTestCatalogueFlag = createServerFn({ method: "GET" }).handler(async () => ({
  showTestCatalogue: await isTestCatalogueVisible(),
}));

async function assertAdmin(context: { supabase: ReturnType<typeof testPublicClient>; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Yönetici yetkisi gerekiyor.");
}

/** Admin read: every catalogue product, with test rows marked. */
export const listCatalogueProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ products: TestProduct[]; showTestCatalogue: boolean }> => {
    await assertAdmin(context as never);
    const { data, error } = await context.supabase
      .from("service_products")
      .select("id, provider_external_id, slug, name, service_type, currency, sale_price, lifecycle, customer_visible, is_test, source")
      .order("service_type")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return {
      showTestCatalogue: await isTestCatalogueVisible(),
      products: (data ?? []).map((row) => ({
        id: row.id,
        code: row.provider_external_id,
        slug: row.slug,
        name: row.name,
        serviceType: row.service_type,
        currency: row.currency,
        salePrice: row.sale_price == null ? null : Number(row.sale_price),
        lifecycle: row.lifecycle,
        enabled: Boolean(row.customer_visible),
        isTest: Boolean(row.is_test),
        source: row.source,
      })),
    };
  });

/** Admin: enable/disable a single product for the storefront. */
export const setProductEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string; enabled: boolean }) => ({
    productId: String(input.productId),
    enabled: Boolean(input.enabled),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: before } = await context.supabase
      .from("service_products")
      .select("customer_visible, name")
      .eq("id", data.productId)
      .maybeSingle();
    const { error } = await context.supabase
      .from("service_products")
      .update({ customer_visible: data.enabled })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    const { audit } = await import("@/lib/admin-guard");
    await audit(
      context.supabase,
      data.enabled ? "PRODUCT_PUBLISH" : "PRODUCT_UNPUBLISH",
      "service_product",
      data.productId,
      before ?? null,
      { customer_visible: data.enabled },
    );
    return { ok: true };
  });

/** Admin: duplicate a test product (test rows only). */
export const duplicateTestProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => ({ productId: String(input.productId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { data: row, error } = await context.supabase
      .from("service_products")
      .select("*")
      .eq("id", data.productId)
      .eq("source", TEST_SOURCE)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Yalnızca test ürünleri kopyalanabilir.");
    const suffix = Date.now().toString(36);
    const source = row as unknown as Record<string, unknown>;
    const copy: Record<string, unknown> = { ...source };
    delete copy["id"];
    delete copy["created_at"];
    delete copy["updated_at"];
    copy["slug"] = `${String(source["slug"])}-copy-${suffix}`;
    copy["name"] = `${String(source["name"])} (kopya)`;
    copy["provider_external_id"] = source["provider_external_id"] ? `${String(source["provider_external_id"])}-COPY-${suffix.toUpperCase()}` : null;
    copy["customer_visible"] = false;
    copy["is_test"] = true;
    copy["source"] = TEST_SOURCE;
    const { error: insertError } = await context.supabase.from("service_products").insert(copy as never);
    if (insertError) throw new Error(insertError.message);
    return { ok: true };
  });

/** Admin: delete ONE test product. Provider/production rows are never matched. */
export const deleteTestProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { productId: string }) => ({ productId: String(input.productId) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("service_products")
      .delete()
      .eq("id", data.productId)
      .eq("is_test", true)
      .eq("source", TEST_SOURCE);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete ALL test data. Filtered on is_test = true AND source = INTERNAL_TEST. */
export const deleteAllTestData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("service_products")
      .delete()
      .eq("is_test", true)
      .eq("source", TEST_SOURCE);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: storefront visibility kill switch for the test catalogue. */
export const setTestCatalogueVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: Boolean(input.enabled) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase
      .from("feature_flags")
      .update({ enabled: data.enabled })
      .eq("key", TEST_FLAG_KEY);
    if (error) throw new Error(error.message);
    return { showTestCatalogue: data.enabled };
  });
