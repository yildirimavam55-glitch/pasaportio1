/**
 * CENTRAL FINANCIAL DEFINITIONS — single source of truth.
 *
 * Dashboard, Orders, Order detail and Finance MUST use these helpers.
 * Never re-derive a formula locally: double-subtracting discounts or refunds
 * is the most common accounting bug before payment integration.
 *
 * Storage conventions (as written by the order pipeline):
 * - orders.gross_revenue      Sum of item sale prices charged to the customer,
 *                             BEFORE discount and BEFORE tax separation.
 * - orders.discount_total     Discount granted, stored positive. Subtracted ONCE.
 * - orders.tax_total          Tax contained in the charged amount. Reported
 *                             separately, never subtracted from contribution
 *                             (it is not a cost we control before payment go-live).
 * - orders.payment_fee        PSP fee, stored positive. Subtracted ONCE.
 * - orders.provider_cost_total Sum of provider costs, stored positive.
 * - orders.refunded_total     Amount refunded, stored positive. Subtracted ONCE.
 */

export type FinancialRow = {
  grossRevenue: number;
  discountTotal: number;
  paymentFee: number;
  providerCostTotal: number;
  refundedTotal: number;
  taxTotal?: number;
};

/** Payment states that count as realised business. Carts are never revenue. */
export const REVENUE_PAYMENT_STATUSES = ["PAID", "PARTIALLY_REFUNDED"] as const;

export function isRevenuePaymentStatus(status: string | null | undefined): boolean {
  return (REVENUE_PAYMENT_STATUSES as readonly string[]).includes(String(status));
}

const n = (value: number | null | undefined) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function toFinancialRow(row: Record<string, unknown>): FinancialRow {
  return {
    grossRevenue: n(row["gross_revenue"] as number),
    discountTotal: n(row["discount_total"] as number),
    paymentFee: n(row["payment_fee"] as number),
    providerCostTotal: n(row["provider_cost_total"] as number),
    refundedTotal: n(row["refunded_total"] as number),
    taxTotal: n(row["tax_total"] as number),
  };
}

/** Money actually kept after refunds — discounts are already excluded from it. */
export function netRevenue(row: FinancialRow): number {
  return n(row.grossRevenue) - n(row.discountTotal) - n(row.refundedTotal);
}

/**
 * Gross contribution (brüt kâr):
 *   gross revenue − discount − refund − provider cost − payment fee
 * Each deduction appears exactly once. Tax is NOT deducted here.
 */
export function grossContribution(row: FinancialRow): number {
  return netRevenue(row) - n(row.providerCostTotal) - n(row.paymentFee);
}

export function grossMarginPercent(row: FinancialRow): number | null {
  const base = netRevenue(row);
  return base > 0 ? (grossContribution(row) / base) * 100 : null;
}

/** Item-level margin, used by product management and the product drawer. */
export function itemMargin(salePrice: number, providerCost: number) {
  const sale = n(salePrice);
  const cost = n(providerCost);
  const absolute = sale - cost;
  return { absolute, percent: sale > 0 ? (absolute / sale) * 100 : null };
}

export function sumFinancialRows(rows: FinancialRow[]) {
  const total = rows.reduce<FinancialRow>(
    (acc, row) => ({
      grossRevenue: acc.grossRevenue + n(row.grossRevenue),
      discountTotal: acc.discountTotal + n(row.discountTotal),
      paymentFee: acc.paymentFee + n(row.paymentFee),
      providerCostTotal: acc.providerCostTotal + n(row.providerCostTotal),
      refundedTotal: acc.refundedTotal + n(row.refundedTotal),
      taxTotal: n(acc.taxTotal) + n(row.taxTotal),
    }),
    { grossRevenue: 0, discountTotal: 0, paymentFee: 0, providerCostTotal: 0, refundedTotal: 0, taxTotal: 0 },
  );
  return {
    ...total,
    netRevenue: netRevenue(total),
    grossContribution: grossContribution(total),
    grossMarginPercent: grossMarginPercent(total),
  };
}

/** Human-readable contract shown in the Finance screen. */
export const FINANCE_DEFINITIONS: Array<{ label: string; formula: string; note: string }> = [
  { label: "Brüt ciro", formula: "Σ sipariş brüt tutarı", note: "İndirim ve iade düşülmeden önceki tutar." },
  { label: "İndirim", formula: "Σ indirim", note: "Yalnızca bir kez düşülür." },
  { label: "İade", formula: "Σ iade", note: "Yalnızca bir kez düşülür." },
  { label: "Net ciro", formula: "Brüt ciro − indirim − iade", note: "Fiilen elde kalan satış tutarı." },
  { label: "Provider maliyeti", formula: "Σ provider maliyeti", note: "Provider tarafından belirlenir, admin değiştiremez." },
  { label: "Ödeme komisyonu", formula: "Σ PSP komisyonu", note: "Ödeme entegrasyonu açıldığında dolar." },
  { label: "Brüt kâr", formula: "Net ciro − provider maliyeti − ödeme komisyonu", note: "Vergi bu hesaba dâhil edilmez." },
  { label: "Vergi", formula: "Σ vergi", note: "Ayrı raporlanır, kârdan düşülmez." },
];
