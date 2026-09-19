import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb } from "@/lib/admin-guard";
import { COUNTRIES } from "@/domain/geo/countries";

export type CountryCoverageRow = {
  iso: string;
  single: number;
  regional: number;
  global: number;
  total: number;
  lowestPrice: number | null;
  currency: string | null;
};

export type EsimCoverageAudit = {
  totalCountries: number;
  coveredCountries: number;
  uncoveredCountries: string[];
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  unavailableProducts: number;
  singleProducts: number;
  regionalProducts: number;
  globalProducts: number;
  brokenCoverageProducts: number;
  rows: CountryCoverageRow[];
};

// Scope is never derived from a coverage-count threshold here; see package-scope.ts.

/**
 * Whole-catalogue coverage audit for Admin. Reads real published products only,
 * paginated so a large catalogue is never silently truncated.
 */
export const getEsimCoverageAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EsimCoverageAudit> => {
    const db = await adminDb(context as any);

    const counters = new Map<string, CountryCoverageRow>();
    for (const country of COUNTRIES) {
      counters.set(country.iso, { iso: country.iso, single: 0, regional: 0, global: 0, total: 0, lowestPrice: null, currency: null });
    }

    let published = 0;
    let draft = 0;
    let unavailable = 0;
    let total = 0;
    let single = 0;
    let regional = 0;
    let globalCount = 0;
    let broken = 0;

    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await db
        .from("service_products")
        .select("id, lifecycle, customer_visible, provider_available, sale_price, currency, is_test, esim_product_details(coverage_country_isos, coverage_subdivision_codes, package_kind)")
        .eq("service_type", "ESIM")
        .eq("is_test", false)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      if (!rows?.length) break;

      for (const row of rows as any[]) {
        total += 1;
        if (row.lifecycle === "PUBLISHED") published += 1;
        else if (row.lifecycle === "UNAVAILABLE") unavailable += 1;
        else draft += 1;

        const details = Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details;
        const coverage: string[] = (details?.coverage_country_isos ?? []).map((iso: string) => String(iso).toUpperCase());
        if (!coverage.length) {
          broken += 1;
          continue;
        }
        const kind = normalizeStoredScope(
          details?.package_kind,
          coverage.length,
          (details?.coverage_subdivision_codes ?? []).length,
        );
        const scope = kind === "GLOBAL" ? "global" : kind === "REGION" ? "regional" : "single";
        if (scope === "global") globalCount += 1;
        else if (scope === "regional") regional += 1;
        else single += 1;


        const sellable =
          row.lifecycle === "PUBLISHED" && row.customer_visible && row.provider_available && Number(row.sale_price) > 0;
        if (!sellable) continue;
        const price = Number(row.sale_price);
        for (const iso of coverage) {
          const entry = counters.get(iso);
          if (!entry) continue;
          entry[scope] += 1;
          entry.total += 1;
          if (entry.lowestPrice == null || price < entry.lowestPrice) {
            entry.lowestPrice = price;
            entry.currency = row.currency ?? "EUR";
          }
        }
      }
      if (rows.length < pageSize) break;
    }

    const list = [...counters.values()];
    return {
      totalCountries: list.length,
      coveredCountries: list.filter((row) => row.total > 0).length,
      uncoveredCountries: list.filter((row) => row.total === 0).map((row) => row.iso),
      totalProducts: total,
      publishedProducts: published,
      draftProducts: draft,
      unavailableProducts: unavailable,
      singleProducts: single,
      regionalProducts: regional,
      globalProducts: globalCount,
      brokenCoverageProducts: broken,
      rows: list.sort((a, b) => b.total - a.total || a.iso.localeCompare(b.iso)),
    };
  });
