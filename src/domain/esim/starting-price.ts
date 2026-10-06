/**
 * Single source for every storefront country "from" price: the lowest current
 * live selling price among that country's own single-country packages.
 * Regional bundles and Unlimited Lite/Plus never set a country's starting price.
 */
import { planTierOf } from "./supplier-metadata";

export type StartingPriceRow = {
  sale_price: number | string | null;
  currency: string | null;
  country_iso: string | null;
  package_kind: string | null;
  unlimited_data: boolean | null;
  supplier_groups: unknown;
};

export function countryOfStartingPriceRow(row: StartingPriceRow): string | null {
  const iso = String(row.country_iso ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso) || row.package_kind !== "COUNTRY") return null;
  if (row.unlimited_data) {
    const tier = planTierOf(row.supplier_groups);
    if (tier === "LITE" || tier === "PLUS") return null;
  }
  const price = Number(row.sale_price);
  return Number.isFinite(price) && price > 0 ? iso : null;
}

export function lowestByCountry(rows: StartingPriceRow[]): Map<string, { amount: number; currency: string }> {
  const out = new Map<string, { amount: number; currency: string }>();
  for (const row of rows) {
    const iso = countryOfStartingPriceRow(row);
    if (!iso) continue;
    const amount = Number(row.sale_price);
    const cur = out.get(iso);
    if (!cur || amount < cur.amount) out.set(iso, { amount, currency: row.currency ?? "EUR" });
  }
  return out;
}
