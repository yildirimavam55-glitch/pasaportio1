/**
 * Admin-only, confirmed removal of the cancelled eSIM Access supplier data.
 * Never touches eSIM Go, published products, orders or customer data: the purge
 * refuses to run if any eSIM Access product is published/visible or referenced
 * by an order or provisioning unit.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { audit, privilegedAdminDb } from "@/lib/admin-guard";

export const ESIM_ACCESS_CONFIRM = "ESIM ACCESS SIL";
const CODE = "ESIM_ACCESS";

async function summary(db: any) {
  const { data: provider } = await db.from("providers").select("id").eq("code", CODE).maybeSingle();
  if (!provider) return { exists: false as const };
  const id = provider.id;
  const count = async (table: string, col = "provider_id") =>
    (await db.from(table).select("id", { count: "exact", head: true }).eq(col, id)).count ?? 0;
  const [products, published, raw, prices, mappings, changes, runs, connections, orderItems, units] = await Promise.all([
    count("service_products", "primary_provider_id"),
    db.from("service_products").select("id", { count: "exact", head: true }).eq("primary_provider_id", id)
      .or("lifecycle.eq.PUBLISHED,customer_visible.eq.true").then((r: any) => r.count ?? 0),
    count("provider_raw_items"),
    count("provider_price_history"),
    count("provider_product_mappings"),
    count("provider_catalogue_changes"),
    count("provider_sync_runs"),
    count("provider_connections"),
    count("order_items"),
    count("provisioning_units"),
  ]);
  return { exists: true as const, id, products, published, raw, prices, mappings, changes, runs, connections, orderItems, units };
}

export const getEsimAccessCleanupSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await privilegedAdminDb(context as any);
    const s = await summary(db);
    return { ...s, secretsPresent: Boolean(process.env["ESIM_ACCESS_ACCESS_CODE"] || process.env["ESIM_ACCESS_SECRET_KEY"]) };
  });

export const purgeEsimAccessData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.confirm !== ESIM_ACCESS_CONFIRM) throw new Error("Onay metni hatalı.");
    const db = await privilegedAdminDb(context as any);
    const s = await summary(db);
    if (!s.exists) return { deleted: false, reason: "Silinecek eSIM Access kaydı yok." };
    if (s.published > 0) throw new Error(`${s.published} eSIM Access ürünü yayında/görünür; silme durduruldu.`);
    if (s.orderItems > 0 || s.units > 0) throw new Error("eSIM Access'e bağlı sipariş var; silme durduruldu.");

    // Products in chunks (details, translations, mappings cascade).
    for (;;) {
      const { data: rows, error } = await db.from("service_products").select("id")
        .eq("primary_provider_id", s.id).neq("lifecycle", "PUBLISHED").eq("customer_visible", false).limit(200);
      if (error) throw new Error(error.message);
      if (!rows?.length) break;
      const ids = rows.map((r: any) => r.id);
      const del = await db.from("service_products").delete().in("id", ids);
      if (del.error) throw new Error(del.error.message);
    }
    // Provider row cascades raw items, price history, mappings, changes, sync runs/errors, connection, pricing rules.
    const del = await db.from("providers").delete().eq("id", s.id);
    if (del.error) throw new Error(del.error.message);
    await audit((context as any).supabase, "ESIM_ACCESS_PURGED", "providers", s.id, s, null).catch(() => undefined);
    return { deleted: true, summary: s };
  });
