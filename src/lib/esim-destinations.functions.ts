/**
 * Destination discovery source of truth.
 *
 * Every sellable destination the storefront shows is derived from the supplier
 * catalogue itself: single-country products create country destinations,
 * multi-country products create coverage regions. Nothing is hard-coded.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isTestCatalogueVisible } from "@/lib/test-catalogue.functions";
import { classifyCoverageRegion, type CoverageRegionKey } from "@/domain/geo/coverage-regions";

export type EsimCountryDestination = {
  iso: string;
  productCount: number;
  amount: number;
  currency: string;
};

export type EsimRegionDestination = {
  key: CoverageRegionKey;
  productCount: number;
  maxCoverageCount: number;
  amount: number;
  currency: string;
};

export type EsimDestinationCatalogue = {
  countries: EsimCountryDestination[];
  regions: EsimRegionDestination[];
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** All sellable destinations, deduplicated by ISO, with real starting prices. */
export const listEsimDestinations = createServerFn({ method: "GET" }).handler(
  async (): Promise<EsimDestinationCatalogue> => {
    const client = publicClient();
    const showTest = await isTestCatalogueVisible();

    const countries = new Map<string, EsimCountryDestination>();
    const regions = new Map<CoverageRegionKey, EsimRegionDestination>();

    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await client
        .from("service_products")
        .select("currency, sale_price, is_test, esim_product_details!inner(coverage_country_isos)")
        .eq("service_type", "ESIM")
        .eq("lifecycle", "PUBLISHED")
        .eq("customer_visible", true)
        .eq("provider_available", true)
        .eq("margin_flagged", false)
        .gt("sale_price", 0)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      if (!rows.length) break;

      for (const row of rows as any[]) {
        if (row.is_test && !showTest) continue;
        const details = Array.isArray(row.esim_product_details)
          ? row.esim_product_details[0]
          : row.esim_product_details;
        const coverage = [
          ...new Set(
            ((details?.coverage_country_isos ?? []) as string[])
              .map((iso) => String(iso).toUpperCase())
              .filter(Boolean),
          ),
        ];
        const amount = Number(row.sale_price);
        const currency = row.currency ?? "EUR";
        if (!coverage.length || !Number.isFinite(amount)) continue;

        if (coverage.length === 1) {
          const iso = coverage[0]!;
          const current = countries.get(iso);
          if (!current) {
            countries.set(iso, { iso, productCount: 1, amount, currency });
          } else {
            current.productCount += 1;
            if (amount < current.amount) {
              current.amount = amount;
              current.currency = currency;
            }
          }
          continue;
        }

        const key = classifyCoverageRegion(coverage);
        if (!key) continue;
        const current = regions.get(key);
        if (!current) {
          regions.set(key, {
            key,
            productCount: 1,
            maxCoverageCount: coverage.length,
            amount,
            currency,
          });
        } else {
          current.productCount += 1;
          current.maxCoverageCount = Math.max(current.maxCoverageCount, coverage.length);
          if (amount < current.amount) {
            current.amount = amount;
            current.currency = currency;
          }
        }
      }
      if (rows.length < pageSize) break;
    }

    return {
      countries: [...countries.values()].sort((a, b) => a.iso.localeCompare(b.iso)),
      regions: [...regions.values()],
    };
  },
);
