import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { isTestCatalogueVisible } from "@/lib/test-catalogue.functions";
import { commercialDataGb } from "@/domain/esim/customer-presentation";
import { networkGenerationsOf, planTierOf, standardUnlimitedOnly, regionFamilyOf, regionLabelOf, type PlanTier, type RegionFamily } from "@/domain/esim/supplier-metadata";
import { classifyCoverageRegion, COVERAGE_REGION_ORDER, type CoverageRegionKey } from "@/domain/geo/coverage-regions";
import { resolvePackageScope } from "@/domain/esim/package-scope";
import { dedupeStorefrontPackages } from "@/domain/esim/storefront-packages";

export type ActivationPolicy = "ON_INSTALL" | "ON_FIRST_NETWORK_CONNECTION" | "ON_PURCHASE" | "UNKNOWN";

export type EsimPackage = {
  id: string;
  providerProductId: string | null;
  slug: string;
  name: string;
  currency: string;
  salePrice: number | null;
  badge: string | null;
  featured: boolean;
  dataType: "FIXED" | "UNLIMITED";
  dataGb: number | null;
  unlimited: boolean;
  /** Provider's own validity wording, kept untouched for reference. */
  rawValidityValue: number | null;
  rawValidityUnit: string | null;
  /** Normalized days — comparison only. */
  validityDays: number | null;
  activationPolicy: ActivationPolicy;
  fairUseNote: string | null;
  /** Provider fair-use values, verbatim or null. */
  fairUsePolicy: string | null;
  highSpeedAllowance: string | null;
  speedAfterFairUse: string | null;
  /** Catalogue destination intent; distinct from countries the package happens to cover. */
  countryIso: string | null;
  packageKind: string | null;
  coverage: string[];
  supports5g: boolean;
  supportsHotspot: boolean;
  dataOnly: boolean | null;
  topupSupported: boolean | null;
  networks: string[];
  isTest: boolean;
  /** Supplier-published network generations (e.g. 4G, 5G); [] when unknown. */
  networkGenerations: string[];
  /** Supplier unlimited tier (Lite/Essential/Plus); null for fixed or unknown. */
  planTier: PlanTier | null;
  /** Supplier region label for multi-country bundles; admin/reference only. */
  regionLabel: string | null;
  regionFamily: RegionFamily | null;
};


export type EsimStartingPrice = {
  targetId: string;
  amount: number;
  currency: string;
};

export type EsimRegionalSummary = {
  region: Exclude<CoverageRegionKey, "MULTI">;
  standardCount: number;
  unlimitedCount: number;
  lowestStandardPrice: number | null;
  lowestUnlimitedPrice: number | null;
  startingPrice: number;
  currency: string;
  coverageCount: number | null;
  minCoverageCount: number;
  maxCoverageCount: number;
  maxUnlimitedCoverageCount: number | null;
  coverageIsos: string[];
};

function regionalIdentity(pkg: EsimPackage): CoverageRegionKey | null {
  const scope = resolvePackageScope({ declaredKind: pkg.packageKind, coverageCount: pkg.coverage.length });
  if (scope === "COUNTRY" || scope === "SUBDIVISION") return null;
  return classifyCoverageRegion(pkg.coverage);
}

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
    const wantedIsos = data.coverageIsos;
    const pageSize = wantedIsos.length ? 400 : 500;
    let rows: Awaited<ReturnType<typeof queryPage>> = [];
    async function queryPage(from: number) {
      let query = publicClient()
        .from("service_products")
        .select(
          "id, provider_external_id, slug, name, currency, sale_price, badge, featured, sort_order, lifecycle, customer_visible, provider_available, margin_flagged, service_type, is_test, source, esim_product_details!inner(data_gb, data_type, unlimited_data, validity_days, raw_validity_value, raw_validity_unit, activation_policy, fair_use_note, fair_use_policy, high_speed_allowance, speed_after_fair_use, coverage_country_isos, country_iso, package_kind, supports_5g, supports_hotspot, data_only, topup_supported, network_operators, supplier_groups, supplier_speed, supplier_countries)",
        )
        .eq("service_type", "ESIM")
        .eq("lifecycle", "PUBLISHED")
        .eq("customer_visible", true)
        .eq("provider_available", true)
        .eq("margin_flagged", false)
        .gt("sale_price", 0)
        .order("sort_order")
        .order("id")
        .range(from, from + pageSize - 1);
      if (wantedIsos.length) query = query.contains("esim_product_details.coverage_country_isos", wantedIsos);
      const { data: page, error } = await query;
      if (error) throw new Error(error.message);
      return page ?? [];
    }
    for (let from = 0; ; from += pageSize) {
      // Coverage remains database-filtered for country result pages. The empty
      // global-discovery read is paged so catalogue size cannot hide products.
      const page = await queryPage(from);
      rows = [...rows, ...page];
      if (wantedIsos.length || page.length < pageSize) break;
    }

    const showTest = await isTestCatalogueVisible();
    const wanted = wantedIsos;
    return rows
      .map((row) => {
        const details = (Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details) as
          | {
              data_gb: number | null;
              data_type: string | null;
              unlimited_data: boolean | null;
              validity_days: number | null;
              raw_validity_value: number | null;
              raw_validity_unit: string | null;
              activation_policy: string | null;
              fair_use_note: string | null;
              fair_use_policy: string | null;
              high_speed_allowance: string | null;
              speed_after_fair_use: string | null;
              coverage_country_isos: string[] | null;
              country_iso: string | null;
              package_kind: string | null;
              supports_5g: boolean | null;
              supports_hotspot: boolean | null;
              data_only: boolean | null;
              topup_supported: boolean | null;
              network_operators: string[] | null;
              supplier_groups?: unknown;
              supplier_speed?: unknown;
              supplier_countries?: unknown;
            }
          | null
          | undefined;
        // Deduplicated: the primary country is usually repeated inside the
        // coverage list, and a duplicate would make a single-country package
        // look like a regional one to both the customer and the shortlist.
        const coverage = [
          ...new Set(
            [
              ...(details?.coverage_country_isos ?? []),
              ...(details?.country_iso ? [details.country_iso] : []),
            ].map((iso) => String(iso).toUpperCase()),
          ),
        ];
        const unlimited = details?.data_type === "UNLIMITED" || Boolean(details?.unlimited_data);
        const activation = String(details?.activation_policy ?? "").toUpperCase();
        return {
          id: row.id,
          providerProductId: row.provider_external_id,
          slug: row.slug,
          name: row.name,
          currency: row.currency ?? "EUR",
          salePrice: row.sale_price == null ? null : Number(row.sale_price),
          badge: row.badge,
          featured: Boolean(row.featured),
          dataType: unlimited ? "UNLIMITED" : "FIXED",
          dataGb: unlimited || details?.data_gb == null ? null : commercialDataGb(Number(details.data_gb)),
          unlimited,
          rawValidityValue: details?.raw_validity_value == null ? null : Number(details.raw_validity_value),
          rawValidityUnit: details?.raw_validity_unit ?? null,
          validityDays: details?.validity_days ?? null,
          activationPolicy: (["ON_INSTALL", "ON_FIRST_NETWORK_CONNECTION", "ON_PURCHASE"].includes(activation)
            ? activation
            : "UNKNOWN") as ActivationPolicy,
          fairUseNote: details?.fair_use_note ?? null,
          fairUsePolicy: details?.fair_use_policy ?? null,
          highSpeedAllowance: details?.high_speed_allowance ?? null,
          speedAfterFairUse: details?.speed_after_fair_use ?? null,
          countryIso: details?.country_iso ? String(details.country_iso).toUpperCase() : null,
          packageKind: details?.package_kind ?? null,
          coverage,
          supports5g: details?.supports_5g ?? networkGenerationsOf(details?.supplier_speed).includes("5G"),
          supportsHotspot: Boolean(details?.supports_hotspot),
          dataOnly: details?.data_only ?? null,
          topupSupported: details?.topup_supported ?? null,
          networks: details?.network_operators ?? [],
          isTest: Boolean(row.is_test),
          networkGenerations: networkGenerationsOf(details?.supplier_speed),
          planTier: unlimited ? planTierOf(details?.supplier_groups) : null,
          regionLabel: regionLabelOf(details?.supplier_countries, coverage.length),
          regionFamily: regionFamilyOf(regionLabelOf(details?.supplier_countries, coverage.length)),
        } satisfies EsimPackage;

      })
      .filter((pkg) => (wanted.length ? wanted.every((iso) => pkg.coverage.includes(iso)) : true))
      .filter((pkg) => pkg.salePrice != null && pkg.salePrice > 0)
      .filter((pkg) => showTest || !pkg.isTest);
    // Pasaport Unlimited = supplier Essential tier; Lite/Plus stay in the catalogue only.
    return standardUnlimitedOnly(packages, (x) => x.unlimited ? `${[...x.coverage].sort().join(",")}|${x.validityDays}` : null, (x) => x.planTier);
  });

/**
 * Genuine published Unlimited bundles whose supplier metadata explicitly calls
 * the coverage Global/Worldwide. Country-count alone never makes a bundle global.
 */
export const listGlobalUnlimitedEsimPackages = createServerFn({ method: "GET" }).handler(
  async (): Promise<EsimPackage[]> => {
    const packages = await listEsimPackages({ data: { coverageIsos: [] } });
    return packages.filter((pkg) => pkg.unlimited && pkg.regionFamily === "GLOBAL");
  },
);

/** Real published multi-country inventory summarized for V2 regional discovery. */
export const listEsimRegionalSummaries = createServerFn({ method: "GET" }).handler(
  async (): Promise<EsimRegionalSummary[]> => {
    const packages = dedupeStorefrontPackages(await listEsimPackages({ data: { coverageIsos: [] } }));
    return COVERAGE_REGION_ORDER.flatMap((region) => {
      if (region === "MULTI") return [];
      const rows = packages.filter((pkg) => regionalIdentity(pkg) === region && pkg.salePrice != null);
      if (!rows.length) return [];
      const standard = rows.filter((pkg) => !pkg.unlimited);
      const unlimited = rows.filter((pkg) => pkg.unlimited);
      const coverageCounts = [...new Set(rows.map((pkg) => pkg.coverage.length))].sort((a, b) => a - b);
      const cheapest = [...rows].sort((a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity))[0];
      if (!cheapest?.salePrice) return [];
      const lowest = (items: EsimPackage[]) => items.length ? Math.min(...items.map((pkg) => pkg.salePrice ?? Infinity)) : null;
      return [{
        region,
        standardCount: standard.length,
        unlimitedCount: unlimited.length,
        lowestStandardPrice: lowest(standard),
        lowestUnlimitedPrice: lowest(unlimited),
        startingPrice: cheapest.salePrice,
        currency: cheapest.currency,
        coverageCount: coverageCounts.length === 1 ? coverageCounts[0] ?? null : null,
        minCoverageCount: coverageCounts[0] ?? 0,
        maxCoverageCount: coverageCounts.at(-1) ?? 0,
        maxUnlimitedCoverageCount: unlimited.length ? Math.max(...unlimited.map((pkg) => pkg.coverage.length)) : null,
         coverageIsos: [...new Set(rows.flatMap((pkg) => pkg.coverage))],
      }];
    });
  },
);

/** All meaningful published packages whose real multi-country coverage belongs to one region. */
export const listEsimRegionPackages = createServerFn({ method: "GET" })
  .inputValidator((input: { region: string }) => {
    const region = String(input.region ?? "").toUpperCase() as CoverageRegionKey;
    if (!COVERAGE_REGION_ORDER.includes(region) || region === "MULTI") throw new Error("Unknown eSIM region");
    return { region: region as Exclude<CoverageRegionKey, "MULTI"> };
  })
  .handler(async ({ data }): Promise<EsimPackage[]> => {
    const packages = await listEsimPackages({ data: { coverageIsos: [] } });
    return packages.filter((pkg) => regionalIdentity(pkg) === data.region);
  });

/** Lowest current customer price for each requested country/route coverage target. */
export const listEsimStartingPrices = createServerFn({ method: "GET" })
  .inputValidator((input: { targets: Array<{ id: string; coverageIsos: string[] }> }) => ({
    targets: (input.targets ?? []).slice(0, 12).map((target) => ({
      id: String(target.id).slice(0, 40),
      coverageIsos: (target.coverageIsos ?? []).map((iso) => String(iso).toUpperCase().slice(0, 2)).filter(Boolean).slice(0, 25),
    })),
  }))
  .handler(async ({ data }): Promise<EsimStartingPrice[]> => {
    const client = publicClient();
    const showTest = await isTestCatalogueVisible();
    const results: EsimStartingPrice[] = [];

    for (const target of data.targets) {
      let query = client
        .from("service_products")
        .select("currency, sale_price, is_test, esim_product_details!inner(coverage_country_isos)")
        .eq("service_type", "ESIM")
        .eq("lifecycle", "PUBLISHED")
        .eq("customer_visible", true)
        .eq("provider_available", true)
        .eq("margin_flagged", false)
        .gt("sale_price", 0)
        .order("sale_price")
        .limit(5);
      if (target.coverageIsos.length) {
        query = query.contains("esim_product_details.coverage_country_isos", target.coverageIsos);
      }
      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);
      const lowest = (rows ?? []).find((row) => showTest || !row.is_test);
      if (lowest?.sale_price != null) {
        results.push({ targetId: target.id, amount: Number(lowest.sale_price), currency: lowest.currency ?? "EUR" });
      }
    }
    return results;
  });

/** All currently sellable country destinations with their lowest published price. */
export const listEsimDestinationStartingPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<EsimStartingPrice[]> => {
    const client = publicClient();
    const showTest = await isTestCatalogueVisible();
    const lowestByIso = new Map<string, { amount: number; currency: string }>();
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await client
        .from("service_products")
        .select("currency, sale_price, is_test, esim_product_details!inner(coverage_country_isos, country_iso)")
        .eq("service_type", "ESIM")
        .eq("lifecycle", "PUBLISHED")
        .eq("customer_visible", true)
        .eq("provider_available", true)
        .eq("margin_flagged", false)
        .gt("sale_price", 0)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);

      for (const row of rows ?? []) {
        if (!showTest && row.is_test) continue;
        const details = (Array.isArray(row.esim_product_details) ? row.esim_product_details[0] : row.esim_product_details) as
          | { coverage_country_isos: string[] | null; country_iso: string | null }
          | null
          | undefined;
        const isos = new Set([...(details?.coverage_country_isos ?? []), ...(details?.country_iso ? [details.country_iso] : [])]);
        const amount = Number(row.sale_price);
        for (const rawIso of isos) {
          const iso = String(rawIso).toUpperCase();
          if (!/^[A-Z]{2}$/.test(iso)) continue;
          const current = lowestByIso.get(iso);
          if (!current || amount < current.amount) lowestByIso.set(iso, { amount, currency: row.currency ?? "EUR" });
        }
      }
      if ((rows ?? []).length < pageSize) break;
    }

    return [...lowestByIso.entries()].map(([targetId, value]) => ({ targetId, ...value }));
  },
);
