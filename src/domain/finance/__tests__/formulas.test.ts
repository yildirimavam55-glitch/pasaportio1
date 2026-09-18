import { describe, expect, it } from "vitest";
import { grossContribution, grossMarginPercent, isRevenuePaymentStatus, itemMargin, netRevenue, sumFinancialRows, toFinancialRow } from "../formulas";

const row = { grossRevenue: 100, discountTotal: 10, paymentFee: 3, providerCostTotal: 40, refundedTotal: 20, taxTotal: 15 };

describe("finance formulas", () => {
  it("counts only realised payment states as revenue", () => {
    expect(isRevenuePaymentStatus("PAID")).toBe(true);
    expect(isRevenuePaymentStatus("PARTIALLY_REFUNDED")).toBe(true);
    expect(isRevenuePaymentStatus("PENDING")).toBe(false);
    expect(isRevenuePaymentStatus(null)).toBe(false);
  });

  it("subtracts discount and refund exactly once", () => {
    expect(netRevenue(row)).toBe(70);
    expect(grossContribution(row)).toBe(27);
  });

  it("never subtracts tax from gross contribution", () => {
    expect(grossContribution({ ...row, taxTotal: 0 })).toBe(grossContribution(row));
  });

  it("derives margin from net revenue", () => {
    expect(grossMarginPercent(row)).toBeCloseTo((27 / 70) * 100, 6);
    expect(grossMarginPercent({ ...row, grossRevenue: 0, discountTotal: 0, refundedTotal: 0 })).toBeNull();
  });

  it("aggregates rows without double counting", () => {
    const totals = sumFinancialRows([row, row]);
    expect(totals.netRevenue).toBe(140);
    expect(totals.grossContribution).toBe(54);
  });

  it("computes item margin and handles a zero price", () => {
    expect(itemMargin(20, 12)).toEqual({ absolute: 8, percent: 40 });
    expect(itemMargin(0, 12).percent).toBeNull();
  });

  it("maps database rows and treats missing values as zero", () => {
    expect(toFinancialRow({ gross_revenue: "50", discount_total: null })).toEqual({
      grossRevenue: 50, discountTotal: 0, paymentFee: 0, providerCostTotal: 0, refundedTotal: 0, taxTotal: 0,
    });
  });
});
