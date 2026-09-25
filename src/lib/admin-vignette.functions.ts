import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, type AdminCtx } from "@/lib/admin-guard";

export type VignetteAvailability = "ACTIVE" | "NOT_FOR_SALE" | "PAUSED";

/** Pure: derive the commercial state from the two service switches. */
export function vignetteAvailability(storefront: boolean, checkout: boolean): VignetteAvailability {
  if (!storefront) return "PAUSED";
  return checkout ? "ACTIVE" : "NOT_FOR_SALE";
}

/**
 * Admin → Vignette. Reads REAL data only (service_products with service_type VIGNETTE,
 * order items, service registry, flags). Never creates or modifies products.
 */
export const getVignetteAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const [products, orders, service, flags] = await Promise.all([
      db
        .from("service_products")
        .select("id, name, slug, provider_external_id, destination_id, lifecycle, customer_visible, provider_available, sale_price, provider_cost, currency, updated_at, primary_provider_id")
        .eq("service_type", "VIGNETTE")
        .order("updated_at", { ascending: false })
        .limit(500),
      db.from("order_items").select("id", { count: "exact", head: true }).eq("service_type", "VIGNETTE"),
      db.from("services").select("enabled, customer_visible, updated_at").eq("service_type", "VIGNETTE").maybeSingle(),
      db.from("feature_flags").select("key, enabled, updated_at").in("key", ["storefront.vignette", "checkout.vignette"]),
    ]);
    for (const r of [products, orders, service, flags]) if (r.error) throw new Error(r.error.message);
    const flag = (key: string) => Boolean((flags.data ?? []).find((f: any) => f.key === key)?.enabled);
    const rows = (products.data ?? []) as any[];
    const sellable = rows.filter((p) => p.lifecycle === "PUBLISHED" && p.customer_visible && p.provider_available && p.sale_price != null);
    return {
      serviceRegistered: Boolean(service.data),
      serviceEnabled: Boolean(service.data?.enabled),
      storefront: flag("storefront.vignette"),
      checkout: flag("checkout.vignette"),
      availability: vignetteAvailability(flag("storefront.vignette"), flag("checkout.vignette")),
      productCount: rows.length,
      sellableCount: sellable.length,
      countriesCount: new Set(rows.map((p) => p.destination_id).filter(Boolean)).size,
      ordersCount: orders.count ?? 0,
      products: rows.map((p) => ({
        id: p.id as string,
        name: p.name as string,
        providerExternalId: (p.provider_external_id as string | null) ?? null,
        lifecycle: p.lifecycle as string,
        active: Boolean(p.customer_visible && p.provider_available),
        supplierCost: p.provider_cost as number | null,
        salePrice: p.sale_price as number | null,
        currency: p.currency as string,
        providerId: (p.primary_provider_id as string | null) ?? null,
      })),
    };
  });
