/**
 * Approved Pasaport pricing engine (2026-10-06). Pure, no IO.
 * Produces SUGGESTIONS only — never a live selling price on its own.
 */
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Next X.99 at or above value (8.08 → 8.99, 30.00 → 30.99). */
export function up99(value: number): number {
  return r2(Math.ceil(r2(value - 0.99) - 1e-9) + 0.99);
}

/** Highest X.99 strictly below the competitor price (4.50 → 3.99, 10.50 → 9.99). */
export function below99(competitor: number): number {
  return r2(Math.floor(r2(competitor - 0.99) - 1e-9) + 0.99);
}

export const MIN_PRICE = 3.99;
export const MIN_AIRALO_MARKUP_PCT = 20;

/** Cost-based fallback tiers. */
export function costFallback(cost: number): { price: number; rule: string } {
  let raw: number;
  let rule: string;
  if (cost <= 20) { raw = cost * 2; rule = "COST_X2"; }
  else if (cost <= 50) { raw = cost + 20; rule = "COST_PLUS_20"; }
  else if (cost <= 100) { raw = cost + 30; rule = "COST_PLUS_30"; }
  else { raw = cost + Math.max(40, r2(cost * 0.2)); rule = "COST_MAX40_20PCT"; }
  const price = up99(raw);
  return price < MIN_PRICE ? { price: MIN_PRICE, rule: `${rule}_MIN399` } : { price, rule };
}

export type Suggestion =
  | { status: "SUGGESTED"; price: number; rule: string; airaloPrice: number | null }
  | { status: "MANUAL_REVIEW"; price: null; rule: "AIRALO_BELOW_COST" | "LOW_PROFIT" | "NO_COST"; airaloPrice: number | null };

/** airaloExact: current verified EUR Airalo price for the exact same package, or null. */
export function suggestPrice(cost: number | null, airaloExact: number | null): Suggestion {
  if (cost == null || !Number.isFinite(cost) || cost <= 0) return { status: "MANUAL_REVIEW", price: null, rule: "NO_COST", airaloPrice: airaloExact };
  if (airaloExact != null) {
    const s = below99(airaloExact);
    if (s <= cost) return { status: "MANUAL_REVIEW", price: null, rule: "AIRALO_BELOW_COST", airaloPrice: airaloExact };
    if (((s - cost) / cost) * 100 < MIN_AIRALO_MARKUP_PCT) return { status: "MANUAL_REVIEW", price: null, rule: "LOW_PROFIT", airaloPrice: airaloExact };
    return { status: "SUGGESTED", price: s, rule: "AIRALO_EXACT", airaloPrice: airaloExact };
  }
  const fb = costFallback(cost);
  return { status: "SUGGESTED", price: fb.price, rule: fb.rule, airaloPrice: null };
}
