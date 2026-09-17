import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { ServiceRuntimeConfig } from "@/domain/services";

/** Server-side publishable client for public, read-only catalogue data. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Runtime service registry: which services exist and are visible to customers. */
export const getServiceConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("services")
    .select("service_type, slug, enabled, customer_visible, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceRuntimeConfig[];
});

/** Published storefront products for one service. Empty in Phase 0 by design. */
export const listPublishedProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { serviceType: "ESIM" | "LOUNGE" }) => input)
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient()
      .from("service_products")
      .select("id, slug, name, currency, sale_price, featured, badge, sort_order, service_type")
      .eq("service_type", data.serviceType)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Server-side role check. Admin privileges are explicitly assigned, never inferred. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { userId: context.userId, isAdmin: Boolean(data) };
  });
