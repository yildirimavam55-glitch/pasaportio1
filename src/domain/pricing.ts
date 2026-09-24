import type { PricingStrategy } from "./enums";

/**
 * Pure pricing engine (no IO, no provider coupling).
 * Provider cost is provider-owned data; sale price is admin-owned.
 */

export type RoundingMode = "NONE" | "NEAREST_99" | "NEAREST_95" | "INTEGER" | "TWO_DECIMALS";

export type PricingRule = {
  id?: string;
  strategy: PricingStrategy;
  markupPercent?: number | null;
  fixedMarkup?: number | null;
  minimumMarginPercent?: number | null;
  roundingMode?: RoundingMode;
  manualPrice?: number | null;
  currency: string;
};

export type PriceComputation = {
  salePrice: number;
  /** Price after markup, before rounding (for admin transparency). */
  rawPrice: number;
  providerCost: number;
  currency: string;
  marginAbsolute: number;
  marginPercent: number;
  belowMinimumMargin: boolean;
};

export function applyRounding(value: number, mode: RoundingMode = "TWO_DECIMALS"): number {
  switch (mode) {
    case "NONE":
      return value;
    case "INTEGER":
      return Math.ceil(value);
    case "NEAREST_99":
      return Math.max(0.99, Math.ceil(value) - 0.01);
    case "NEAREST_95":
      return Math.max(0.95, Math.ceil(value) - 0.05);
    case "TWO_DECIMALS":
    default:
      return Math.round(value * 100) / 100;
  }
}

export function computePrice(providerCost: number, rule: PricingRule): PriceComputation {
  const cost = Number.isFinite(providerCost) ? providerCost : 0;
  let raw: number;

  switch (rule.strategy) {
    case "MANUAL":
      raw = rule.manualPrice ?? cost;
      break;
    case "FIXED_MARKUP":
      raw = cost + (rule.fixedMarkup ?? 0);
      break;
    case "MINIMUM_MARGIN": {
      const minMargin = (rule.minimumMarginPercent ?? 0) / 100;
      raw = minMargin >= 1 ? cost : cost / (1 - minMargin);
      break;
    }
    case "MARKUP_PERCENT":
    default:
      raw = cost * (1 + (rule.markupPercent ?? 0) / 100);
      break;
  }

  const salePrice = applyRounding(raw, rule.roundingMode ?? "TWO_DECIMALS");
  const marginAbsolute = salePrice - cost;
  const marginPercent = salePrice > 0 ? (marginAbsolute / salePrice) * 100 : 0;

  return {
    salePrice,
    rawPrice: raw,
    providerCost: cost,
    currency: rule.currency,
    marginAbsolute,
    marginPercent,
    belowMinimumMargin:
      rule.minimumMarginPercent != null && marginPercent < rule.minimumMarginPercent,
  };
}

/** Margin protection: re-evaluate an existing sale price after a provider cost change. */
export function checkMarginProtection(
  salePrice: number,
  providerCost: number,
  minimumMarginPercent: number,
): { marginPercent: number; flagged: boolean } {
  const marginPercent = salePrice > 0 ? ((salePrice - providerCost) / salePrice) * 100 : 0;
  return { marginPercent, flagged: marginPercent < minimumMarginPercent };
}
