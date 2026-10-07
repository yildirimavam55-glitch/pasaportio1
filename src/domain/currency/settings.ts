import { BASE_CURRENCY, CURRENCY_CODES, DEFAULT_ROUNDING, defaultCurrencyConfig, isCurrencyCode, type CurrencyCode, type CurrencyConfig, type RoundingMode, type RoundingRule } from "./currencies";

/** Stored in platform_settings id `currency_settings` (Admin-only row). */
export const CURRENCY_SETTINGS_ID = "currency_settings";
export const FX_TTL_MS = 12 * 60 * 60 * 1000;

export type RateEntry = { rate: number; provider: string; updatedAt: string };
export type CurrencySettings = {
  base: typeof BASE_CURRENCY;
  checkoutFallback: CurrencyCode;
  currencies: Record<CurrencyCode, CurrencyConfig>;
  rates: Partial<Record<CurrencyCode, RateEntry>>;
  lastRefreshAt: string | null;
  nextUpdateAt: string | null;
  status: "OK" | "STALE" | "FAILED" | "NEVER";
  lastError: string | null;
};

const MODES: RoundingMode[] = ["none", "integer", "90", "95", "99", "increment"];

function sanitizeRounding(value: any, code: CurrencyCode): RoundingRule {
  if (!value || !MODES.includes(value.mode)) return DEFAULT_ROUNDING[code];
  const inc = Number(value.increment);
  return value.mode === "increment" ? { mode: "increment", increment: Number.isFinite(inc) && inc > 0 && inc <= 10000 ? inc : 1 } : { mode: value.mode };
}

export function sanitizeCurrencySettings(raw: any): CurrencySettings {
  const currencies = {} as Record<CurrencyCode, CurrencyConfig>;
  const rates: Partial<Record<CurrencyCode, RateEntry>> = {};
  for (const code of CURRENCY_CODES) {
    const d = defaultCurrencyConfig(code);
    const c = raw?.currencies?.[code] ?? {};
    const override = Number(c.overrideRate);
    currencies[code] = {
      enabled: code === BASE_CURRENCY ? true : typeof c.enabled === "boolean" ? c.enabled : d.enabled,
      display: code === BASE_CURRENCY ? true : typeof c.display === "boolean" ? c.display : d.display,
      checkout: typeof c.checkout === "boolean" ? c.checkout : d.checkout,
      autoUpdate: typeof c.autoUpdate === "boolean" ? c.autoUpdate : d.autoUpdate,
      overrideRate: c.overrideRate != null && Number.isFinite(override) && override > 0 ? override : null,
      rounding: sanitizeRounding(c.rounding, code),
    };
    const r = raw?.rates?.[code];
    if (r && Number.isFinite(Number(r.rate)) && Number(r.rate) > 0) rates[code] = { rate: Number(r.rate), provider: String(r.provider ?? "unknown"), updatedAt: String(r.updatedAt ?? "") };
  }
  rates.EUR = { rate: 1, provider: "base", updatedAt: rates.EUR?.updatedAt ?? "" };
  return {
    base: BASE_CURRENCY,
    checkoutFallback: isCurrencyCode(raw?.checkoutFallback) && (raw.checkoutFallback === "EUR" || raw.checkoutFallback === "USD") ? raw.checkoutFallback : "EUR",
    currencies,
    rates,
    lastRefreshAt: typeof raw?.lastRefreshAt === "string" ? raw.lastRefreshAt : null,
    nextUpdateAt: typeof raw?.nextUpdateAt === "string" ? raw.nextUpdateAt : null,
    status: ["OK", "STALE", "FAILED", "NEVER"].includes(raw?.status) ? raw.status : "NEVER",
    lastError: typeof raw?.lastError === "string" ? raw.lastError.slice(0, 300) : null,
  };
}

/** Effective rate: Admin override wins; otherwise latest valid cached rate. Null = not displayable. */
export function effectiveRate(s: CurrencySettings, code: CurrencyCode): { rate: number; source: string } | null {
  const c = s.currencies[code];
  if (c.overrideRate) return { rate: c.overrideRate, source: "manual-override" };
  const r = s.rates[code];
  return r ? { rate: r.rate, source: r.provider } : null;
}

export type PublicCurrency = { code: CurrencyCode; rate: number; rounding: RoundingRule; checkout: boolean };
export type PublicCurrencyConfig = { base: CurrencyCode; checkoutFallback: CurrencyCode; currencies: PublicCurrency[]; country: string | null };

export function toPublicCurrencyConfig(s: CurrencySettings, country: string | null): PublicCurrencyConfig {
  const list: PublicCurrency[] = [];
  for (const code of CURRENCY_CODES) {
    const c = s.currencies[code];
    const rate = effectiveRate(s, code);
    if (!c.enabled || !c.display || !rate) continue;
    list.push({ code, rate: rate.rate, rounding: c.rounding, checkout: c.checkout });
  }
  return { base: s.base, checkoutFallback: s.checkoutFallback, currencies: list, country };
}
