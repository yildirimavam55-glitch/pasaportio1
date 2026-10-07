import { CURRENCY_CODES, USD_PEGS, type CurrencyCode } from "@/domain/currency/currencies";
import { CURRENCY_SETTINGS_ID, FX_TTL_MS, sanitizeCurrencySettings, type CurrencySettings } from "@/domain/currency/settings";

/** ECB reference rates (free, keyless). AED/SAR are derived from their official USD pegs. */
const FX_URL = "https://api.frankfurter.app/latest?from=EUR";
const PROVIDER = "ECB/frankfurter";

export async function readCurrencySettings(db: any): Promise<CurrencySettings> {
  const { data } = await db.from("platform_settings").select("data").eq("id", CURRENCY_SETTINGS_ID).maybeSingle();
  return sanitizeCurrencySettings(data?.data);
}

export async function writeCurrencySettings(db: any, settings: CurrencySettings, userId: string | null) {
  const { error } = await db.from("platform_settings").upsert({ id: CURRENCY_SETTINGS_ID, data: settings, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/**
 * Fetches fresh rates. On any failure the previous cached rates are kept untouched
 * (prices never disappear or become 0); only status/lastError change.
 */
export async function refreshRates(db: any, current: CurrencySettings, userId: string | null): Promise<CurrencySettings> {
  const now = new Date();
  const next: CurrencySettings = { ...current, rates: { ...current.rates } };
  try {
    const res = await fetch(FX_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const body: any = await res.json();
    const rates = body?.rates ?? {};
    const stamp = now.toISOString();
    const history: Array<{ base_currency: string; quote_currency: string; rate: number }> = [];
    for (const code of CURRENCY_CODES) {
      if (code === "EUR" || !current.currencies[code].autoUpdate) continue;
      let rate = Number(rates[code]);
      let provider = PROVIDER;
      const peg = USD_PEGS[code];
      if ((!Number.isFinite(rate) || rate <= 0) && peg && Number(rates.USD) > 0) {
        rate = Number(rates.USD) * peg;
        provider = `${PROVIDER} + USD peg`;
      }
      if (!Number.isFinite(rate) || rate <= 0) continue; // keep previous cached rate
      next.rates[code as CurrencyCode] = { rate: Math.round(rate * 1e6) / 1e6, provider, updatedAt: stamp };
      history.push({ base_currency: "EUR", quote_currency: code, rate: Math.round(rate * 1e6) / 1e6 });
    }
    if (history.length) await db.from("exchange_rates").insert(history);
    next.status = "OK";
    next.lastError = null;
    next.lastRefreshAt = stamp;
  } catch (error) {
    next.status = Object.keys(current.rates).length > 1 ? "STALE" : "FAILED";
    next.lastError = error instanceof Error ? error.message : String(error);
  }
  next.nextUpdateAt = new Date(now.getTime() + (next.status === "OK" ? FX_TTL_MS : 30 * 60 * 1000)).toISOString();
  await writeCurrencySettings(db, next, userId);
  return next;
}

export function isRefreshDue(s: CurrencySettings) {
  if (!s.nextUpdateAt) return true;
  return Date.parse(s.nextUpdateAt) <= Date.now();
}
