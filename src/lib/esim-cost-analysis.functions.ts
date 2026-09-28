import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb } from "@/lib/admin-guard";

/** Fixed analysis set (order = display order). */
export const COST_ANALYSIS_ISOS = ["TR", "US", "ES", "IT", "FR", "GB", "DE", "GR", "PT", "NL", "JP", "TH", "AE", "EG", "CH", "AT", "HR", "ID", "MX", "CA"] as const;

export type CostRow = { iso: string; count: number; min: number | null; avg: number | null; max: number | null; currency: string | null };
export type CostAnalysis = { rows: CostRow[]; countriesWithData: number; avgOfAverages: number | null; avgOfCheapest: number | null; markupAverage: number | null; currency: string };

/** Read-only: supplier cost of active local 10 GB supplier products. Never writes. */
export const getEsim10GbCostAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CostAnalysis> => {
    const db = await adminDb(context as any);
    const { data, error } = await db
      .from("service_products")
      .select("provider_cost, provider_currency, esim_product_details!inner(data_gb, country_iso, coverage_country_isos, package_kind)")
      .eq("service_type", "ESIM")
      .eq("is_test", false)
      .eq("provider_available", true)
      .gt("provider_cost", 0)
      .eq("esim_product_details.data_gb", 10)
      .in("esim_product_details.country_iso", [...COST_ANALYSIS_ISOS]);
    if (error) throw new Error(error.message);

    const byIso = new Map<string, { costs: number[]; currency: string }>();
    for (const row of (data ?? []) as any[]) {
      const d = Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details;
      const iso = String(d?.country_iso ?? "").toUpperCase();
      const coverage = new Set([...(d?.coverage_country_isos ?? []), iso].map((x: string) => String(x).toUpperCase()));
      // Local only: single-country coverage, no regional/global bundles.
      if (coverage.size !== 1 || (d?.package_kind && d.package_kind !== "COUNTRY")) continue;
      const currency = row.provider_currency ?? "EUR";
      const entry = byIso.get(iso) ?? { costs: [], currency };
      if (entry.currency !== currency) continue; // never mix currencies silently
      entry.costs.push(Number(row.provider_cost));
      byIso.set(iso, entry);
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const rows: CostRow[] = COST_ANALYSIS_ISOS.map((iso) => {
      const e = byIso.get(iso);
      if (!e?.costs.length) return { iso, count: 0, min: null, avg: null, max: null, currency: null };
      return { iso, count: e.costs.length, min: Math.min(...e.costs), avg: round(e.costs.reduce((a, b) => a + b, 0) / e.costs.length), max: Math.max(...e.costs), currency: e.currency };
    });
    const valid = rows.filter((r) => r.avg != null);
    const mean = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const avgOfAverages = mean(valid.map((r) => r.avg!));
    return {
      rows,
      countriesWithData: valid.length,
      avgOfAverages,
      avgOfCheapest: mean(valid.map((r) => r.min!)),
      markupAverage: avgOfAverages == null ? null : round(avgOfAverages * 1.3),
      currency: valid[0]?.currency ?? "EUR",
    };
  });
