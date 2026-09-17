import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type EsimPackage = {
  id: string;
  providerProductId: string | null;
  slug: string;
  name: string;
  currency: string;
  salePrice: number | null;
  badge: string | null;
  featured: boolean;
  dataGb: number | null;
  unlimited: boolean;
  validityDays: number | null;
  coverage: string[];
  supports5g: boolean;
  supportsHotspot: boolean;
  networks: string[];
};

function publicClient() {
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

/**
 * Published eSIM packages covering the requested destination or route.
 * Returns only real catalogue rows — never generated or placeholder products.
 */
export const listEsimPackages = createServerFn({ method: "GET" })
  .inputValidator((input: { coverageIsos: string[] }) => ({
    coverageIsos: (input.coverageIsos ?? []).map((iso) => String(iso).toUpperCase().slice(0, 2)).filter(Boolean).slice(0, 25),
  }))
  .handler(async ({ data }): Promise<EsimPackage[]> => {
    const { data: rows, error } = await publicClient()
      .from("service_products")
      .select(
        "id, provider_external_id, slug, name, currency, sale_price, badge, featured, sort_order, lifecycle, customer_visible, provider_available, margin_flagged, service_type, esim_product_details(data_gb, unlimited_data, validity_days, coverage_country_isos, country_iso, supports_5g, supports_hotspot, network_operators)",
      )
      .eq("service_type", "ESIM")
      .eq("lifecycle", "PUBLISHED")
      .eq("customer_visible", true)
      .eq("provider_available", true)
      .eq("margin_flagged", false)
      .order("sort_order");
    if (error) throw new Error(error.message);

    const wanted = data.coverageIsos;
    return (rows ?? [])
      .map((row) => {
        const details = (Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details) as
          | {
              data_gb: number | null;
              unlimited_data: boolean | null;
              validity_days: number | null;
              coverage_country_isos: string[] | null;
              country_iso: string | null;
              supports_5g: boolean | null;
              supports_hotspot: boolean | null;
              network_operators: string[] | null;
            }
          | null
          | undefined;
        const coverage = [
          ...(details?.coverage_country_isos ?? []),
          ...(details?.country_iso ? [details.country_iso] : []),
        ].map((iso) => String(iso).toUpperCase());
        return {
          id: row.id,
          providerProductId: row.provider_external_id,
          slug: row.slug,
          name: row.name,
          currency: row.currency ?? "EUR",
          salePrice: row.sale_price == null ? null : Number(row.sale_price),
          badge: row.badge,
          featured: Boolean(row.featured),
          dataGb: details?.data_gb == null ? null : Number(details.data_gb),
          unlimited: Boolean(details?.unlimited_data),
          validityDays: details?.validity_days ?? null,
          coverage,
          supports5g: Boolean(details?.supports_5g),
          supportsHotspot: Boolean(details?.supports_hotspot),
          networks: details?.network_operators ?? [],
        } satisfies EsimPackage;
      })
      .filter((pkg) => (wanted.length ? wanted.every((iso) => pkg.coverage.includes(iso)) : true))
      .filter((pkg) => pkg.salePrice != null && pkg.salePrice > 0);
  });
