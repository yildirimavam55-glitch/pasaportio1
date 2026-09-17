import { describe, expect, it } from "vitest";

import {
  buildFunnel,
  campaignPerformance,
  computeKpis,
  previousRange,
  resolveRange,
  salesByService,
  sourcePerformance,
  topCustomerCountries,
  topTravelDestinations,
  type AttributionRow,
  type EventRow,
  type OrderItemRow,
  type OrderRow,
} from "../dashboard";

const order = (over: Partial<OrderRow> = {}): OrderRow => ({
  id: "o1",
  createdAt: "2026-09-10T10:00:00.000Z",
  customerId: "c1",
  status: "COMPLETED",
  paymentStatus: "PAID",
  currency: "EUR",
  grossRevenue: 20,
  discountTotal: 2,
  paymentFee: 1,
  providerCostTotal: 8,
  refundedTotal: 0,
  customerCountryIso: "DE",
  locale: "de",
  ...over,
});

const item = (over: Partial<OrderItemRow> = {}): OrderItemRow => ({
  orderId: "o1",
  serviceType: "ESIM",
  productId: "p1",
  productName: "Türkiye 10 GB",
  salePrice: 20,
  providerCost: 8,
  discount: 2,
  quantity: 1,
  destination: "turkiye",
  airportIata: null,
  ...over,
});

describe("financial separation", () => {
  it("keeps revenue, cost, fees and discounts apart from gross contribution", () => {
    const kpis = computeKpis([order()], [item()], 10);
    expect(kpis.grossRevenue).toBe(20);
    expect(kpis.providerCost).toBe(8);
    expect(kpis.paymentFees).toBe(1);
    expect(kpis.discounts).toBe(2);
    expect(kpis.grossContribution).toBe(9);
    expect(kpis.grossRevenue).not.toBe(kpis.grossContribution);
    expect(kpis.conversionRate).toBeCloseTo(0.1);
  });

  it("returns zeros and null rates with no data instead of invented values", () => {
    const kpis = computeKpis([], [], 0);
    expect(kpis.grossRevenue).toBe(0);
    expect(kpis.orders).toBe(0);
    expect(kpis.conversionRate).toBeNull();
    expect(kpis.repeatPurchaseRate).toBeNull();
  });

  it("ignores unpaid orders", () => {
    const kpis = computeKpis([order({ paymentStatus: "PENDING" })], [item()], 5);
    expect(kpis.orders).toBe(0);
    expect(kpis.grossRevenue).toBe(0);
  });

  it("splits revenue and cost per service", () => {
    const rows = salesByService(
      [order(), order({ id: "o2" })],
      [item(), item({ orderId: "o2", serviceType: "LOUNGE", salePrice: 30, providerCost: 12, discount: 0 })],
      ["ESIM", "LOUNGE"],
    );
    expect(rows[0]).toMatchObject({ serviceType: "ESIM", revenue: 18, providerCost: 8, grossContribution: 10 });
    expect(rows[1]).toMatchObject({ serviceType: "LOUNGE", revenue: 30, providerCost: 12, grossContribution: 18 });
  });
});

describe("dimensions", () => {
  it("separates customer country from travel destination", () => {
    const countries = topCustomerCountries([order()]);
    const destinations = topTravelDestinations([order()], [item()]);
    expect(countries[0]!.label).toBe("DE");
    expect(destinations[0]!.label).toBe("turkiye");
  });
});

describe("attribution", () => {
  const attribution: AttributionRow[] = [
    {
      sessionId: "s1",
      orderId: null,
      firstTouchSource: "META",
      lastTouchSource: "META",
      utmCampaign: "yaz",
      utmSource: "meta",
    },
    {
      sessionId: "s1",
      orderId: "o1",
      firstTouchSource: "META",
      lastTouchSource: "GOOGLE_ORGANIC",
      utmCampaign: "yaz",
      utmSource: "meta",
    },
  ];
  const events: EventRow[] = [
    { name: "finder_viewed", sessionId: "s1", serviceType: "ESIM", locale: "tr", occurredAt: "x", properties: {} },
    { name: "finder_started", sessionId: "s1", serviceType: "ESIM", locale: "tr", occurredAt: "x", properties: {} },
  ];

  it("preserves first touch and attributes the purchase to last touch", () => {
    const rows = sourcePerformance(attribution, events, [order()]);
    const google = rows.find((row) => row.source === "GOOGLE_ORGANIC")!;
    expect(google.purchases).toBe(1);
    expect(google.revenue).toBe(20);
    expect(attribution[0]!.firstTouchSource).toBe("META");
    expect(attribution[1]!.firstTouchSource).toBe("META");
  });

  it("aggregates campaign performance with separated cost and contribution", () => {
    const rows = campaignPerformance(attribution, events, [order()], [item()]);
    const row = rows[0]!;
    expect(row.campaign).toBe("yaz");
    expect(row.orders).toBe(1);
    expect(row.revenue).toBe(20);
    expect(row.providerCost).toBe(8);
    expect(row.grossContribution).toBe(9);
    expect(row.topService).toBe("ESIM");
  });
});

describe("funnel", () => {
  it("computes counts, conversion and drop-off per step", () => {
    const make = (name: string, sessionId: string): EventRow => ({
      name,
      sessionId,
      serviceType: "ESIM",
      locale: "tr",
      occurredAt: "x",
      properties: {},
    });
    const funnel = buildFunnel([
      make("finder_viewed", "a"),
      make("finder_viewed", "b"),
      make("finder_started", "a"),
      make("finder_started", "b"),
      make("recommendation_viewed", "a"),
      make("purchase_completed", "a"),
    ]);
    expect(funnel[0]!.count).toBe(2);
    expect(funnel[1]!.count).toBe(2);
    expect(funnel[2]!.count).toBe(1);
    expect(funnel[2]!.conversionRate).toBeCloseTo(0.5);
    expect(funnel[2]!.dropOffRate).toBeCloseTo(0.5);
    expect(funnel.at(-1)!.count).toBe(1);
  });
});

describe("date ranges", () => {
  it("resolves presets and the comparable previous period", () => {
    const now = new Date("2026-09-17T12:00:00.000Z");
    expect(resolveRange("today", now)).toEqual({ from: "2026-09-17", to: "2026-09-17" });
    expect(resolveRange("yesterday", now)).toEqual({ from: "2026-09-16", to: "2026-09-16" });
    expect(resolveRange("last7", now)).toEqual({ from: "2026-09-11", to: "2026-09-17" });
    expect(resolveRange("thisMonth", now)).toEqual({ from: "2026-09-01", to: "2026-09-17" });
    expect(resolveRange("lastMonth", now)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(previousRange({ from: "2026-09-11", to: "2026-09-17" })).toEqual({ from: "2026-09-04", to: "2026-09-10" });
  });
});
