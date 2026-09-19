/**
 * Canonical destination layer.
 *
 * The Finder must only offer destinations that exist in the canonical directory
 * AND currently have a sellable package. Supplier-only territories are kept as
 * canonical rows (TERRITORY / SUBDIVISION / REGION) instead of disappearing,
 * and destinations without stock are flagged rather than invented away.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb } from "@/lib/admin-guard";
import { COUNTRIES } from "@/domain/geo/countries";

export type CanonicalDestinationType = "COUNTRY" | "TERRITORY" | "SUBDIVISION" | "REGION";

export type CanonicalDestination = {
  canonicalCode: string;
  providerCode: string | null;
  displayName: string;
  parentCountryIso: string | null;
  type: CanonicalDestinationType;
  active: boolean;
  hasSellableProducts: boolean;
  sellableProductCount: number;
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

/** eSIM Go region pseudo-codes seen in live coverage data; not sovereign countries. */
const REGION_CODES: Record<string, string> = {
  EU: "Avrupa", MI: "Orta Doğu", AS: "Asya", AF: "Afrika", NA: "Kuzey Amerika",
  SA: "Güney Amerika", OC: "Okyanusya", CE: "Orta Avrupa", GL: "Global",
};

const rowToDestination = (row: any): CanonicalDestination => ({
  canonicalCode: row.canonical_code,
  providerCode: row.provider_code ?? null,
  displayName: row.display_name,
  parentCountryIso: row.parent_country_iso ?? null,
  type: (row.type ?? "COUNTRY") as CanonicalDestinationType,
  active: Boolean(row.active),
  hasSellableProducts: Boolean(row.has_sellable_products),
  sellableProductCount: Number(row.sellable_product_count ?? 0),
});

/** Public read: everything the Finder is allowed to offer. */
export const listCanonicalDestinations = createServerFn({ method: "GET" }).handler(
  async (): Promise<CanonicalDestination[]> => {
    const { data, error } = await publicClient()
      .from("canonical_destinations")
      .select("canonical_code, provider_code, display_name, parent_country_iso, type, active, has_sellable_products, sellable_product_count")
      .eq("active", true)
      .order("display_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToDestination);
  },
);

/**
 * Rebuilds the canonical directory from the canonical country list plus every
 * code the live supplier catalogue actually covers. Names are never invented:
 * a code with no canonical name keeps the provider code as its label.
 */
export const refreshCanonicalDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as any);

    const sellable = new Map<string, number>();
    const subdivisions = new Map<string, number>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await db
        .from("service_products")
        .select("lifecycle, customer_visible, provider_available, sale_price, is_test, esim_product_details(coverage_country_isos, coverage_subdivision_codes)")
        .eq("service_type", "ESIM")
        .eq("is_test", false)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows?.length) break;
      for (const row of rows as any[]) {
        const live =
          row.lifecycle === "PUBLISHED" && row.customer_visible && row.provider_available && Number(row.sale_price) > 0;
        if (!live) continue;
        const details = Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details;
        for (const iso of details?.coverage_country_isos ?? []) {
          const code = String(iso).toUpperCase();
          sellable.set(code, (sellable.get(code) ?? 0) + 1);
        }
        for (const code of details?.coverage_subdivision_codes ?? []) {
          const sub = String(code).toUpperCase();
          subdivisions.set(sub, (subdivisions.get(sub) ?? 0) + 1);
        }
      }
      if (rows.length < pageSize) break;
    }

    const byCode = new Map<string, any>();
    for (const country of COUNTRIES) {
      byCode.set(country.iso, {
        canonical_code: country.iso,
        provider_code: country.iso,
        display_name: country.name.tr,
        parent_country_iso: null,
        type: REGION_CODES[country.iso] ? "REGION" : "COUNTRY",
        active: true,
        has_sellable_products: (sellable.get(country.iso) ?? 0) > 0,
        sellable_product_count: sellable.get(country.iso) ?? 0,
        refreshed_at: new Date().toISOString(),
      });
    }
    // Supplier-only codes must not vanish just because they are not sovereign.
    for (const [code, count] of sellable) {
      if (byCode.has(code)) continue;
      byCode.set(code, {
        canonical_code: code,
        provider_code: code,
        display_name: REGION_CODES[code] ?? code,
        parent_country_iso: null,
        type: REGION_CODES[code] ? "REGION" : "TERRITORY",
        active: true,
        has_sellable_products: count > 0,
        sellable_product_count: count,
        refreshed_at: new Date().toISOString(),
      });
    }
    for (const [code, count] of subdivisions) {
      const parent = code.slice(0, 2);
      byCode.set(code, {
        canonical_code: code,
        provider_code: code,
        display_name: code,
        parent_country_iso: parent,
        type: "SUBDIVISION",
        active: true,
        has_sellable_products: count > 0,
        sellable_product_count: count,
        refreshed_at: new Date().toISOString(),
      });
    }

    const payload = [...byCode.values()];
    for (let index = 0; index < payload.length; index += 500) {
      const { error } = await db
        .from("canonical_destinations")
        .upsert(payload.slice(index, index + 500) as any, { onConflict: "canonical_code" });
      if (error) throw new Error(error.message);
    }

    return {
      total: payload.length,
      sellable: payload.filter((row) => row.has_sellable_products).length,
      subdivisions: subdivisions.size,
    };
  });
