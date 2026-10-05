/**
 * Manual eSIM price layers. Pure, no IO.
 * Priority: country-specific manual → global package-type manual → automatic rule.
 */
export type ManualPriceConfig = {
  global: Record<string, number>;
  countries: Record<string, Record<string, number>>;
};

export type PriceSource = "COUNTRY" | "GLOBAL" | "AUTO";

export const EMPTY_MANUAL_CONFIG: ManualPriceConfig = { global: {}, countries: {} };

/** Package structure key: real data amount (or Unlimited) + validity. */
export function packageKey(p: { unlimited: boolean; dataGb: number | null; validityDays: number | null }) {
  return `${p.unlimited ? "U" : Number(p.dataGb ?? 0)}|${Number(p.validityDays ?? 0)}`;
}

export function packageKeyLabel(key: string) {
  const [data, days] = key.split("|");
  return data === "U" ? `Sınırsız / ${days} gün` : `${data} GB / ${days} gün`;
}

const validPrice = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 10000;

export function sanitizeManualConfig(raw: any): ManualPriceConfig {
  const clean = (rec: any) => {
    const out: Record<string, number> = {};
    if (rec && typeof rec === "object") {
      for (const [k, v] of Object.entries(rec)) {
        if (/^(U|\d+(\.\d+)?)\|\d+$/.test(k) && validPrice(Number(v))) out[k] = Math.round(Number(v) * 100) / 100;
      }
    }
    return out;
  };
  const countries: Record<string, Record<string, number>> = {};
  for (const [iso, rec] of Object.entries(raw?.countries ?? {})) {
    if (/^[A-Z]{2}$/.test(iso)) {
      const c = clean(rec);
      if (Object.keys(c).length) countries[iso] = c;
    }
  }
  return { global: clean(raw?.global), countries };
}

export function resolveManualPrice(
  config: ManualPriceConfig,
  countryIso: string | null,
  key: string,
  autoPrice: number | null,
): { price: number | null; source: PriceSource; general: number | null; country: number | null } {
  const country = countryIso ? config.countries[countryIso]?.[key] ?? null : null;
  const general = config.global[key] ?? null;
  if (country != null) return { price: country, source: "COUNTRY", general, country };
  if (general != null) return { price: general, source: "GLOBAL", general, country };
  return { price: autoPrice, source: "AUTO", general, country };
}

export function profitAndMargin(price: number | null, cost: number | null) {
  if (price == null || cost == null || price <= 0) return { profit: null, margin: null, loss: false };
  const profit = Math.round((price - cost) * 100) / 100;
  return { profit, margin: Math.round((profit / price) * 1000) / 10, loss: profit < 0 };
}
