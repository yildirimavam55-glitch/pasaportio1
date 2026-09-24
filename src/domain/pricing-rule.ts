import { computePrice, type RoundingMode } from "@/domain/pricing";
import type { PricingInput } from "@/domain/providers/esim-import";

/**
 * Single source of truth for turning a stored `pricing_rules` row into the
 * pricing input used by the catalogue sync. Shared by the sync (server), the
 * admin preview and the admin impact preview so they can never disagree.
 */
export const SUPPORTED_ROUNDING: RoundingMode[] = ["NONE", "NEAREST_99", "NEAREST_95", "INTEGER", "TWO_DECIMALS"];
export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "TRY"] as const;

export function pricingFromRule(rule: any, providerCurrency: string, providerMinMargin: number | null): PricingInput | null {
  if (!rule) return null;
  const markupPercent = rule.markup_percent == null ? null : Number(rule.markup_percent);
  const fixedMarkup = rule.fixed_markup == null ? null : Number(rule.fixed_markup);
  const minMargin = rule.minimum_margin_percent == null ? null : Number(rule.minimum_margin_percent);
  const usable =
    (rule.strategy === "MARKUP_PERCENT" && markupPercent != null && Number.isFinite(markupPercent) && markupPercent >= 0) ||
    (rule.strategy === "FIXED_MARKUP" && fixedMarkup != null && Number.isFinite(fixedMarkup) && fixedMarkup >= 0) ||
    (rule.strategy === "MINIMUM_MARGIN" && minMargin != null && minMargin > 0 && minMargin < 100);
  if (!usable) return null;
  return {
    strategy: rule.strategy,
    markupPercent,
    fixedMarkup,
    minimumMarginPercent: minMargin == null ? providerMinMargin : minMargin,
    roundingMode: SUPPORTED_ROUNDING.includes(rule.rounding_mode) ? rule.rounding_mode : "NEAREST_99",
    currency: String(rule.currency ?? providerCurrency).toUpperCase().slice(0, 3),
  };
}

/** Price explanation for one supplier cost, using the exact engine the sync uses. */
export function explainPrice(providerCost: number, pricing: PricingInput) {
  const computed = computePrice(providerCost, {
    strategy: pricing.strategy,
    markupPercent: pricing.markupPercent ?? null,
    fixedMarkup: pricing.fixedMarkup ?? null,
    minimumMarginPercent: pricing.minimumMarginPercent ?? null,
    roundingMode: pricing.roundingMode ?? "NEAREST_99",
    currency: pricing.currency,
  });
  return { ...computed, rawPrice: computed.rawPrice, roundingMode: pricing.roundingMode ?? "NEAREST_99" };
}

/** Validates admin input for a rule. Returns a Turkish error message or null. */
export function validateRuleInput(input: {
  strategy: string;
  markupPercent?: number | null;
  fixedMarkup?: number | null;
  minimumMarginPercent?: number | null;
  currency?: string | null;
}): string | null {
  const bad = (value: unknown) => value != null && (typeof value !== "number" || !Number.isFinite(value));
  if (bad(input.markupPercent) || bad(input.fixedMarkup) || bad(input.minimumMarginPercent)) return "Sayısal değerler geçersiz.";
  if (input.strategy === "MARKUP_PERCENT") {
    if (input.markupPercent == null) return "Kâr oranı girin (örn. 35).";
    if (input.markupPercent < 0 || input.markupPercent > 500) return "Kâr oranı 0 ile 500 arasında olmalı.";
  }
  if (input.strategy === "FIXED_MARKUP") {
    if (input.fixedMarkup == null) return "Sabit kâr tutarı girin.";
    if (input.fixedMarkup < 0 || input.fixedMarkup > 1000) return "Sabit kâr 0 ile 1000 arasında olmalı.";
  }
  if (input.minimumMarginPercent != null && (input.minimumMarginPercent < 0 || input.minimumMarginPercent >= 100)) {
    return "Minimum marj 0 ile 99 arasında olmalı.";
  }
  if (input.currency && !(SUPPORTED_CURRENCIES as readonly string[]).includes(input.currency)) return "Para birimi geçersiz.";
  return null;
}
