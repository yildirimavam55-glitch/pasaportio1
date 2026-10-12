import { getActiveUiLocale } from "@/i18n/overlay";
import { LOCALE_REGISTRY, type UiLocale } from "@/i18n/locales";
import { BASE_CURRENCY, CURRENCY_SYMBOL, FRACTION_DIGITS, convertAmount, isCurrencyCode, type CurrencyCode, type CurrencySource } from "./currencies";
import type { PublicCurrencyConfig } from "./settings";

/**
 * THE single storefront currency state. Every price formatter calls `displayMoney`,
 * so no component converts on its own. Canonical amounts are never mutated.
 */
type State = { code: CurrencyCode; source: CurrencySource; config: PublicCurrencyConfig | null };
let state: State = { code: BASE_CURRENCY, source: "fallback", config: null };
const listeners = new Set<() => void>();

export const MANUAL_KEY = "travely.currency.manual";
export const STORED_KEY = "travely.currency";

export function getCurrencyState() { return state; }
export function subscribeCurrency(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setCurrencyState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
}

export function availableCurrencies(): CurrencyCode[] {
  return state.config?.currencies.map((c) => c.code) ?? [BASE_CURRENCY];
}

const NUMBER_LOCALE: Record<string, string> = { tr: "tr-TR", de: "de-DE", en: "en-GB" };

/** Converted copy of a canonical amount, or null when the active currency can't be shown. */
export function convertForDisplay(amount: number, sourceCurrency: string): { amount: number; currency: string } {
  const target = state.code;
  if (!Number.isFinite(amount) || sourceCurrency !== BASE_CURRENCY || target === BASE_CURRENCY) return { amount, currency: sourceCurrency };
  const entry = state.config?.currencies.find((c) => c.code === target);
  if (!entry || !(entry.rate > 0)) return { amount, currency: sourceCurrency };
  return { amount: convertAmount(amount, entry.rate, entry.rounding), currency: target };
}

const PREFIXED = new Set(["CAD", "AUD", "SGD", "NZD", "MXN"]);

export function formatCurrencyAmount(amount: number, currency: string, locale?: string) {
  const tag = locale ? NUMBER_LOCALE[locale] ?? locale : undefined;
  const digits = isCurrencyCode(currency) ? FRACTION_DIGITS[currency] : undefined;
  const fraction = digits != null ? { minimumFractionDigits: digits, maximumFractionDigits: digits } : {};
  try {
    if (isCurrencyCode(currency) && PREFIXED.has(currency)) {
      const text = new Intl.NumberFormat(tag, { style: "currency", currency, currencyDisplay: "code", ...fraction }).format(amount);
      return text.replace(currency, CURRENCY_SYMBOL[currency]).replace(/(\$)\s+/, "$1");
    }
    return new Intl.NumberFormat(tag, { style: "currency", currency, currencyDisplay: "narrowSymbol", ...fraction }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Shared storefront formatter: converts canonical EUR to the visitor's currency, then formats. */
export function displayMoney(amount: number, sourceCurrency: string, locale?: string) {
  const c = convertForDisplay(amount, sourceCurrency);
  return isolateForRtl(formatCurrencyAmount(c.amount, c.currency, locale));
}

/**
 * Right-to-left pages (Arabic) render prices as one left-to-right island (Unicode LRI…PDI),
 * so "€10.99" never flips into "10.99€" or splits around the currency sign.
 */
export function isolateForRtl(text: string, uiLocale: string = getActiveUiLocale()): string {
  return LOCALE_REGISTRY[uiLocale as UiLocale]?.dir === "rtl" ? `\u2066${text}\u2069` : text;
}
