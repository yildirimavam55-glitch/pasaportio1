/**
 * Multi-currency presentation layer. Pure, no IO.
 * Canonical selling prices stay in the base currency (EUR); everything here
 * only converts + rounds a copy for display / payment, never the stored price.
 */

export const BASE_CURRENCY = "EUR" as const;

export const CURRENCY_CODES = [
  "EUR", "USD", "GBP", "TRY", "CHF", "CAD", "AUD", "JPY", "PLN", "SEK",
  "NOK", "DKK", "SGD", "NZD", "MXN", "ZAR", "THB", "AED", "SAR", "BRL",
  "CNY", "HKD", "CZK", "HUF", "QAR",
] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  EUR: "€", USD: "$", GBP: "£", TRY: "₺", CHF: "CHF", CAD: "C$", AUD: "A$", JPY: "¥", PLN: "zł", SEK: "kr",
  NOK: "kr", DKK: "kr", SGD: "S$", NZD: "NZ$", MXN: "MX$", ZAR: "R", THB: "฿", AED: "د.إ", SAR: "﷼", BRL: "R$",
  CNY: "¥", HKD: "HK$", CZK: "Kč", HUF: "Ft", QAR: "ر.ق",
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as readonly string[]).includes(value);
}

export type RoundingMode = "none" | "integer" | "90" | "95" | "99" | "increment";
export type RoundingRule = { mode: RoundingMode; increment?: number };

export type CurrencyConfig = {
  enabled: boolean;
  display: boolean;
  checkout: boolean;
  autoUpdate: boolean;
  overrideRate: number | null;
  rounding: RoundingRule;
};

export const DEFAULT_ROUNDING: Record<CurrencyCode, RoundingRule> = {
  EUR: { mode: "none" }, USD: { mode: "99" }, GBP: { mode: "99" }, TRY: { mode: "integer" }, CHF: { mode: "90" },
  CAD: { mode: "99" }, AUD: { mode: "99" }, JPY: { mode: "increment", increment: 10 }, PLN: { mode: "99" }, SEK: { mode: "integer" },
  NOK: { mode: "integer" }, DKK: { mode: "integer" }, SGD: { mode: "99" }, NZD: { mode: "99" }, MXN: { mode: "integer" },
  ZAR: { mode: "99" }, THB: { mode: "integer" }, AED: { mode: "99" }, SAR: { mode: "99" }, BRL: { mode: "90" },
  CNY: { mode: "integer" }, HKD: { mode: "integer" }, CZK: { mode: "integer" }, HUF: { mode: "increment", increment: 10 }, QAR: { mode: "99" },
};

export function defaultCurrencyConfig(code: CurrencyCode): CurrencyConfig {
  // Checkout stays base-only until a payment provider verifies other charge currencies.
  return { enabled: code !== "BRL", display: code !== "BRL", checkout: code === BASE_CURRENCY, autoUpdate: true, overrideRate: null, rounding: DEFAULT_ROUNDING[code] };
}

/** The 24 currencies the storefront offers. BRL stays stored but off by default. */
export const STOREFRONT_CURRENCIES: readonly CurrencyCode[] = CURRENCY_CODES.filter((c) => c !== "BRL");

/** Customer-location → currency. Only supported currencies; everything else falls back. */
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  US: "USD", GB: "GBP", TR: "TRY", CH: "CHF", LI: "CHF", CA: "CAD", AU: "AUD", JP: "JPY", PL: "PLN", SE: "SEK",
  NO: "NOK", DK: "DKK", SG: "SGD", NZ: "NZD", MX: "MXN", ZA: "ZAR", TH: "THB", AE: "AED", SA: "SAR", BR: "BRL",
  CN: "CNY", HK: "HKD", CZ: "CZK", HU: "HUF", QA: "QAR",
  // Eurozone + euro-using territories
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", AT: "EUR", BE: "EUR", IE: "EUR", PT: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  MC: "EUR", SM: "EUR", VA: "EUR", AD: "EUR", ME: "EUR", XK: "EUR",
};

/** European markets without a supported local currency prefer EUR; the rest of the world uses USD. */
const EUROPEAN_EUR_FALLBACK = new Set(["RO", "BG", "RS", "BA", "MK", "AL", "MD", "UA", "IS", "BY", "GE", "AM", "AZ", "FO", "GI", "GL"]);

export function currencyForCountry(iso: string | null | undefined): CurrencyCode | null {
  if (!iso) return null;
  const code = iso.trim().toUpperCase();
  if (code.length !== 2 || code === "XX" || code === "T1") return null;
  return COUNTRY_CURRENCY[code] ?? (EUROPEAN_EUR_FALLBACK.has(code) ? "EUR" : "USD");
}

/** Region subtag of a BCP-47 tag ("de-DE" → "DE"). */
export function regionFromLocale(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const parts = tag.replace("_", "-").split("-");
  const region = parts.slice(1).find((p) => /^[A-Za-z]{2}$/.test(p));
  return region ? region.toUpperCase() : null;
}

export type CurrencySource = "manual" | "account" | "stored" | "country" | "locale" | "fallback";

/** Priority: manual > account > stored > visitor country > browser locale > fallback (USD). Never the eSIM destination. */
export function resolveCurrency(input: {
  manual?: string | null; account?: string | null; stored?: string | null;
  country?: string | null; browserLocales?: readonly string[]; available?: readonly CurrencyCode[];
}): { code: CurrencyCode; source: CurrencySource } {
  const ok = (c: unknown): c is CurrencyCode => isCurrencyCode(c) && (!input.available || input.available.includes(c));
  if (ok(input.manual)) return { code: input.manual, source: "manual" };
  if (ok(input.account)) return { code: input.account, source: "account" };
  if (ok(input.stored)) return { code: input.stored, source: "stored" };
  const byCountry = currencyForCountry(input.country);
  if (byCountry) return { code: ok(byCountry) ? byCountry : fallbackFor(byCountry), source: "country" };
  for (const tag of input.browserLocales ?? []) {
    const c = currencyForCountry(regionFromLocale(tag));
    if (c) return { code: ok(c) ? c : fallbackFor(c), source: "locale" };
  }
  return { code: "USD", source: "fallback" };
}

function fallbackFor(code: CurrencyCode): CurrencyCode {
  return code === "EUR" ? "USD" : "EUR";
}

export function applyCurrencyRounding(value: number, rule: RoundingRule): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  switch (rule.mode) {
    case "integer": return Math.ceil(value);
    case "90": return endingAtOrAbove(value, 0.9);
    case "95": return endingAtOrAbove(value, 0.95);
    case "99": return endingAtOrAbove(value, 0.99);
    case "increment": {
      const step = rule.increment && rule.increment > 0 ? rule.increment : 1;
      return Math.ceil(value / step - 1e-9) * step;
    }
    case "none":
    default: return Math.round(value * 100) / 100;
  }
}

/** Smallest X.ending that is >= value (e.g. 10.20 → 10.99, 10.995 → 11.99). */
function endingAtOrAbove(value: number, ending: number): number {
  const base = Math.floor(value);
  const candidate = base + ending;
  const result = candidate + 1e-9 >= value ? candidate : candidate + 1;
  return Math.round(result * 100) / 100;
}

export function convertAmount(amountInBase: number, rate: number, rule: RoundingRule): number {
  return applyCurrencyRounding(amountInBase * rate, rule);
}

export const FRACTION_DIGITS: Partial<Record<CurrencyCode, number>> = { JPY: 0, HUF: 0 };

/**
 * Checkout currency: the selected currency is charged only when it is checkout-enabled
 * AND at least one actually-enabled payment method supports it; otherwise the fallback.
 */
export type PaymentMethodCapability = { id: string; currencies: readonly CurrencyCode[] };
export function resolveCheckoutCurrency(selected: CurrencyCode, checkoutEnabled: readonly CurrencyCode[], methods: readonly PaymentMethodCapability[], fallback: CurrencyCode): CurrencyCode {
  if (checkoutEnabled.includes(selected) && methods.some((m) => m.currencies.includes(selected))) return selected;
  return fallback;
}

/** USD-pegged currencies not published by the ECB feed. */
export const USD_PEGS: Partial<Record<CurrencyCode, number>> = { AED: 3.6725, SAR: 3.75, QAR: 3.64 };
