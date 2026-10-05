import { DEFAULT_COMPETITORS, DEFAULT_POLICY, round2, type CompetitivePolicy, type CompetitorPrice, type EurRates } from "@/domain/pricing/competitive";

/** Admin-only research data in platform_settings; never touches catalogue or supplier rows. */
export const COMPETITOR_SETTINGS_ID = "competitor_prices";
const RATE_MAX_AGE_DAYS = 7;

export type ImportHistory = { at: string; competitor: string; file: string; checkedAt: string; sourceType: string; rows: number; countries: number; newRecords: number; updated: number; invalid: number; countryMatchRequired: number };
export type CompetitorStore = { competitors: string[]; entries: CompetitorPrice[]; policy: CompetitivePolicy; history: ImportHistory[] };

export function sanitizeStore(raw: any): CompetitorStore {
  const names = Array.isArray(raw?.competitors) ? raw.competitors.map((n: unknown) => String(n ?? "").trim().slice(0, 60)) : [];
  const competitors = DEFAULT_COMPETITORS.map((d, i) => names[i] || d);
  const entries: CompetitorPrice[] = (Array.isArray(raw?.entries) ? raw.entries : []).flatMap((e: any) => {
    const price = Number(e?.price);
    if (!e || !/^[A-Z]{2}$/.test(e.iso) || !/^(U|\d+(\.\d+)?)\|\d+$/.test(e.key) || !(price > 0 && price < 10000)
      || !/^[A-Z]{3}$/.test(e.currency) || !/^\d{4}-\d{2}-\d{2}$/.test(e.checkedAt) || !e.competitor) return [];
    return [{ id: String(e.id).slice(0, 40), competitor: String(e.competitor).slice(0, 60), iso: e.iso, key: e.key, price: round2(price),
      currency: e.currency, source: String(e.source ?? "").slice(0, 300), checkedAt: e.checkedAt,
      ...(e.countryName ? { countryName: String(e.countryName).slice(0, 80) } : {}),
      ...(e.sourceType ? { sourceType: String(e.sourceType).slice(0, 40) } : {}),
      ...(e.importedAt ? { importedAt: String(e.importedAt).slice(0, 40) } : {}),
      ...(e.active === false ? { active: false } : {}) }];
  }).slice(0, 5000);
  const p = raw?.policy ?? {};
  const n = (v: unknown, d: number, lo: number, hi: number) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : d; };
  const history: ImportHistory[] = (Array.isArray(raw?.history) ? raw.history : []).filter((h: any) => h && typeof h.at === "string").slice(-50);
  return { competitors, entries, history, policy: {
    targetFactor: n(p.targetFactor, DEFAULT_POLICY.targetFactor, 0.5, 1),
    staleDays: n(p.staleDays, DEFAULT_POLICY.staleDays, 1, 365),
    tolerancePct: n(p.tolerancePct, DEFAULT_POLICY.tolerancePct, 0, 50),
    unsuitableCostRatio: n(p.unsuitableCostRatio, DEFAULT_POLICY.unsuitableCostRatio, 0.5, 1),
    anomalyCostMultiple: n(p.anomalyCostMultiple, DEFAULT_POLICY.anomalyCostMultiple, 1.2, 10),
  } };
}

export async function loadStore(db: any): Promise<CompetitorStore> {
  const { data } = await db.from("platform_settings").select("data").eq("id", COMPETITOR_SETTINGS_ID).maybeSingle();
  return sanitizeStore(data?.data);
}

/** EUR per unit from the existing exchange_rates table; stale or missing rates are omitted (comparison gets flagged). */
export async function loadEurRates(db: any): Promise<EurRates> {
  const since = new Date(Date.now() - RATE_MAX_AGE_DAYS * 86_400_000).toISOString();
  const { data } = await db.from("exchange_rates").select("base_currency, quote_currency, rate, captured_at")
    .gte("captured_at", since).order("captured_at", { ascending: false }).limit(500);
  const rates: EurRates = {};
  for (const r of data ?? []) {
    const rate = Number(r.rate);
    if (!(rate > 0)) continue;
    const base = String(r.base_currency).toUpperCase(), quote = String(r.quote_currency).toUpperCase();
    if (quote === "EUR" && base !== "EUR" && rates[base] == null) rates[base] = rate;
    else if (base === "EUR" && quote !== "EUR" && rates[quote] == null) rates[quote] = 1 / rate;
  }
  return rates;
}
