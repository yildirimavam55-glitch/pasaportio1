/**
 * Pure business-dashboard aggregation.
 * Revenue, provider cost, fees, discounts, refunds and gross contribution are
 * ALWAYS kept as separate measures — revenue is never presented as profit.
 * No value is ever invented: empty input produces zeros, not samples.
 */
import type { AttributionSource, Locale, ServiceType } from "@/domain/enums";
import { grossContribution as financeContribution } from "@/domain/finance/formulas";

export type DateRangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export type DateRange = { from: string; to: string };

/** Inclusive day range in UTC ISO strings. */
export function resolveRange(key: DateRangeKey, now: Date, custom?: DateRange): DateRange {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const shift = (base: Date, days: number) => new Date(base.getTime() + days * 86400000);
  switch (key) {
    case "today":
      return { from: day(utc), to: day(utc) };
    case "yesterday":
      return { from: day(shift(utc, -1)), to: day(shift(utc, -1)) };
    case "last7":
      return { from: day(shift(utc, -6)), to: day(utc) };
    case "last30":
      return { from: day(shift(utc, -29)), to: day(utc) };
    case "thisMonth":
      return { from: day(new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), 1))), to: day(utc) };
    case "lastMonth": {
      const start = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), 0));
      return { from: day(start), to: day(end) };
    }
    case "custom":
      return custom ?? { from: day(utc), to: day(utc) };
  }
}

/** Equal-length range immediately before the given one. */
export function previousRange(range: DateRange): DateRange {
  const from = new Date(`${range.from}T00:00:00Z`).getTime();
  const to = new Date(`${range.to}T00:00:00Z`).getTime();
  const span = to - from + 86400000;
  const d = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: d(from - span), to: d(to - span) };
}

export type OrderRow = {
  id: string;
  createdAt: string;
  customerId: string | null;
  status: string;
  paymentStatus: string;
  currency: string;
  grossRevenue: number;
  discountTotal: number;
  paymentFee: number;
  providerCostTotal: number;
  refundedTotal: number;
  customerCountryIso: string | null;
  locale: Locale | null;
};

export type OrderItemRow = {
  orderId: string;
  serviceType: ServiceType;
  productId: string | null;
  productName: string;
  salePrice: number;
  providerCost: number;
  discount: number;
  quantity: number;
  destination: string | null;
  airportIata: string | null;
  providerId?: string | null;
};

export type AttributionRow = {
  sessionId: string | null;
  orderId: string | null;
  firstTouchSource: AttributionSource;
  lastTouchSource: AttributionSource;
  utmCampaign: string | null;
  utmSource: string | null;
};

export type EventRow = {
  name: string;
  sessionId: string | null;
  serviceType: ServiceType | null;
  locale: Locale | null;
  occurredAt: string;
  properties: Record<string, unknown>;
};

export type Kpis = {
  currency: string;
  grossRevenue: number;
  orders: number;
  servicesSold: number;
  esimSales: number;
  loungeBookings: number;
  providerCost: number;
  paymentFees: number;
  discounts: number;
  refunds: number;
  grossContribution: number;
  averageOrderValue: number;
  conversionRate: number | null;
  repeatPurchaseRate: number | null;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** PAID orders only: unpaid carts are never counted as revenue. */
export function isRevenueOrder(order: OrderRow) {
  return order.paymentStatus === "PAID" || order.paymentStatus === "PARTIALLY_REFUNDED";
}

export function computeKpis(
  orders: OrderRow[],
  items: OrderItemRow[],
  visitSessions: number,
  currency = "EUR",
): Kpis {
  const paid = orders.filter(isRevenueOrder);
  const ids = new Set(paid.map((o) => o.id));
  const paidItems = items.filter((item) => ids.has(item.orderId));
  const grossRevenue = sum(paid.map((o) => o.grossRevenue));
  const providerCost = sum(paid.map((o) => o.providerCostTotal));
  const paymentFees = sum(paid.map((o) => o.paymentFee));
  const discounts = sum(paid.map((o) => o.discountTotal));
  const refunds = sum(paid.map((o) => o.refundedTotal));
  const buyers = paid.map((o) => o.customerId).filter((id): id is string => Boolean(id));
  const perCustomer = new Map<string, number>();
  for (const id of buyers) perCustomer.set(id, (perCustomer.get(id) ?? 0) + 1);
  const repeat = [...perCustomer.values()].filter((count) => count > 1).length;
  return {
    currency,
    grossRevenue,
    orders: paid.length,
    servicesSold: sum(paidItems.map((item) => item.quantity)),
    esimSales: sum(paidItems.filter((i) => i.serviceType === "ESIM").map((i) => i.quantity)),
    loungeBookings: sum(paidItems.filter((i) => i.serviceType === "LOUNGE").map((i) => i.quantity)),
    providerCost,
    paymentFees,
    discounts,
    refunds,
    /** Central definition — see src/domain/finance/formulas.ts */
    grossContribution: financeContribution({ grossRevenue, discountTotal: discounts, refundedTotal: refunds, providerCostTotal: providerCost, paymentFee: paymentFees }),
    averageOrderValue: paid.length ? grossRevenue / paid.length : 0,
    conversionRate: visitSessions > 0 ? paid.length / visitSessions : null,
    repeatPurchaseRate: perCustomer.size ? repeat / perCustomer.size : null,
  };
}

export type SeriesPoint = { date: string; revenue: number; orders: number; grossContribution: number };

export function buildSeries(orders: OrderRow[], range: DateRange): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>();
  for (
    let t = new Date(`${range.from}T00:00:00Z`).getTime();
    t <= new Date(`${range.to}T00:00:00Z`).getTime();
    t += 86400000
  ) {
    const date = new Date(t).toISOString().slice(0, 10);
    buckets.set(date, { date, revenue: 0, orders: 0, grossContribution: 0 });
  }
  for (const order of orders.filter(isRevenueOrder)) {
    const date = order.createdAt.slice(0, 10);
    const bucket = buckets.get(date);
    if (!bucket) continue;
    bucket.revenue += order.grossRevenue;
    bucket.orders += 1;
    bucket.grossContribution +=
      order.grossRevenue - order.providerCostTotal - order.paymentFee - order.discountTotal - order.refundedTotal;
  }
  return [...buckets.values()];
}

export type ServiceBreakdown = {
  serviceType: ServiceType;
  orders: number;
  revenue: number;
  providerCost: number;
  grossContribution: number;
};

export function salesByService(
  orders: OrderRow[],
  items: OrderItemRow[],
  services: ServiceType[],
): ServiceBreakdown[] {
  const paid = new Set(orders.filter(isRevenueOrder).map((o) => o.id));
  return services.map((serviceType) => {
    const rows = items.filter((item) => item.serviceType === serviceType && paid.has(item.orderId));
    const revenue = sum(rows.map((r) => r.salePrice * r.quantity - r.discount));
    const providerCost = sum(rows.map((r) => r.providerCost * r.quantity));
    return {
      serviceType,
      orders: new Set(rows.map((r) => r.orderId)).size,
      revenue,
      providerCost,
      grossContribution: revenue - providerCost,
    };
  });
}

export type SourceRow = {
  source: AttributionSource;
  visits: number;
  finderStarts: number;
  purchases: number;
  revenue: number;
  grossContribution: number;
};

/** Central definition — see src/domain/finance/formulas.ts */
const contribution = (o: OrderRow) => financeContribution(o);

/**
 * Source performance. Visits/finder starts use LAST touch of the session,
 * purchases use the attribution snapshot stored with the order.
 */
export function sourcePerformance(
  attribution: AttributionRow[],
  events: EventRow[],
  orders: OrderRow[],
): SourceRow[] {
  const sessionSource = new Map<string, AttributionSource>();
  for (const row of attribution) {
    if (row.sessionId) sessionSource.set(row.sessionId, row.lastTouchSource);
  }
  const map = new Map<AttributionSource, SourceRow>();
  const bucket = (source: AttributionSource) => {
    const existing = map.get(source);
    if (existing) return existing;
    const created: SourceRow = { source, visits: 0, finderStarts: 0, purchases: 0, revenue: 0, grossContribution: 0 };
    map.set(source, created);
    return created;
  };

  const visitSeen = new Set<string>();
  for (const event of events) {
    if (!event.sessionId) continue;
    const source = sessionSource.get(event.sessionId) ?? "UNKNOWN";
    if (!visitSeen.has(event.sessionId)) {
      visitSeen.add(event.sessionId);
      bucket(source).visits += 1;
    }
    if (event.name === "finder_started") bucket(source).finderStarts += 1;
  }

  const orderById = new Map(orders.filter(isRevenueOrder).map((o) => [o.id, o]));
  for (const row of attribution) {
    if (!row.orderId) continue;
    const order = orderById.get(row.orderId);
    if (!order) continue;
    const entry = bucket(row.lastTouchSource);
    entry.purchases += 1;
    entry.revenue += order.grossRevenue;
    entry.grossContribution += contribution(order);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);
}

export type CampaignRow = {
  campaign: string;
  source: AttributionSource;
  visitors: number;
  finderStarts: number;
  orders: number;
  conversionRate: number | null;
  revenue: number;
  providerCost: number;
  grossContribution: number;
  topService: ServiceType | null;
  topDestination: string | null;
};

export function campaignPerformance(
  attribution: AttributionRow[],
  events: EventRow[],
  orders: OrderRow[],
  items: OrderItemRow[],
): CampaignRow[] {
  const orderById = new Map(orders.filter(isRevenueOrder).map((o) => [o.id, o]));
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);

  const groups = new Map<string, { rows: AttributionRow[]; sessions: Set<string> }>();
  for (const row of attribution) {
    if (!row.utmCampaign) continue;
    const key = `${row.utmCampaign}::${row.lastTouchSource}`;
    const group = groups.get(key) ?? { rows: [], sessions: new Set<string>() };
    group.rows.push(row);
    if (row.sessionId) group.sessions.add(row.sessionId);
    groups.set(key, group);
  }

  const result: CampaignRow[] = [];
  for (const [key, group] of groups) {
    const [campaign, source] = key.split("::") as [string, AttributionSource];
    const finderStarts = events.filter(
      (event) => event.name === "finder_started" && event.sessionId && group.sessions.has(event.sessionId),
    ).length;
    const campaignOrders = group.rows
      .map((row) => (row.orderId ? orderById.get(row.orderId) : undefined))
      .filter((order): order is OrderRow => Boolean(order));
    const campaignItems = campaignOrders.flatMap((order) => itemsByOrder.get(order.id) ?? []);
    const revenue = sum(campaignOrders.map((o) => o.grossRevenue));
    const providerCost = sum(campaignOrders.map((o) => o.providerCostTotal));
    result.push({
      campaign,
      source,
      visitors: group.sessions.size,
      finderStarts,
      orders: campaignOrders.length,
      conversionRate: group.sessions.size ? campaignOrders.length / group.sessions.size : null,
      revenue,
      providerCost,
      grossContribution: sum(campaignOrders.map(contribution)),
      topService: topKey(campaignItems.map((item) => item.serviceType)) as ServiceType | null,
      topDestination: topKey(
        campaignItems.map((item) => item.destination ?? item.airportIata).filter((v): v is string => Boolean(v)),
      ),
    });
  }
  return result.sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);
}

function topKey(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export const FUNNEL_STEPS = [
  { key: "visit", label: "Ziyaret", events: ["service_selected", "finder_viewed"] },
  { key: "finder_started", label: "Finder başladı", events: ["finder_started"] },
  { key: "recommendation_viewed", label: "Öneri görüldü", events: ["recommendation_viewed"] },
  { key: "product_list_viewed", label: "Paket sayfası", events: ["product_list_viewed"] },
  { key: "product_selected", label: "Ürün seçildi", events: ["product_selected"] },
  { key: "add_to_cart", label: "Sepete eklendi", events: ["add_to_cart"] },
  { key: "checkout_started", label: "Ödeme başladı", events: ["checkout_started"] },
  { key: "purchase_completed", label: "Satın alma", events: ["purchase_completed"] },
] as const;

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  conversionRate: number | null;
  dropOffRate: number | null;
};

/** Sessions are counted once per step, so a step can never exceed the previous one artificially. */
export function buildFunnel(events: EventRow[]): FunnelStep[] {
  const counts = FUNNEL_STEPS.map((step) => {
    const sessions = new Set<string>();
    let anonymous = 0;
    for (const event of events) {
      if (!(step.events as readonly string[]).includes(event.name)) continue;
      if (event.sessionId) sessions.add(event.sessionId);
      else anonymous += 1;
    }
    return { key: step.key, label: step.label, count: sessions.size + anonymous };
  });
  const first = counts[0]?.count ?? 0;
  return counts.map((step, index) => {
    const previous = index === 0 ? first : counts[index - 1]!.count;
    return {
      ...step,
      conversionRate: first > 0 ? step.count / first : null,
      dropOffRate: previous > 0 ? Math.max(0, (previous - step.count) / previous) : null,
    };
  });
}

export type TopRow = { label: string; count: number; revenue?: number };

export function topFromEvents(events: EventRow[], eventName: string, property: string, limit = 8): TopRow[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.name !== eventName) continue;
    const raw = event.properties?.[property];
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (typeof value !== "string" && typeof value !== "number") continue;
      const key = String(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type ProductRow = {
  productId: string | null;
  product: string;
  serviceType: ServiceType;
  place: string | null;
  orders: number;
  revenue: number;
  providerCost: number;
  grossContribution: number;
};

export function topProducts(orders: OrderRow[], items: OrderItemRow[], limit = 8): ProductRow[] {
  const paid = new Set(orders.filter(isRevenueOrder).map((o) => o.id));
  const map = new Map<string, ProductRow>();
  for (const item of items) {
    if (!paid.has(item.orderId)) continue;
    const key = item.productId ?? item.productName;
    const revenue = item.salePrice * item.quantity - item.discount;
    const cost = item.providerCost * item.quantity;
    const row = map.get(key) ?? {
      productId: item.productId,
      product: item.productName,
      serviceType: item.serviceType,
      place: item.destination ?? item.airportIata,
      orders: 0,
      revenue: 0,
      providerCost: 0,
      grossContribution: 0,
    };
    row.orders += 1;
    row.revenue += revenue;
    row.providerCost += cost;
    row.grossContribution += revenue - cost;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** Travel destination (where the service is used) — never mixed with customer country. */
export function topTravelDestinations(orders: OrderRow[], items: OrderItemRow[], limit = 8): TopRow[] {
  const paid = new Set(orders.filter(isRevenueOrder).map((o) => o.id));
  const map = new Map<string, TopRow>();
  for (const item of items) {
    if (!paid.has(item.orderId)) continue;
    const label = item.destination ?? item.airportIata;
    if (!label) continue;
    const row = map.get(label) ?? { label, count: 0, revenue: 0 };
    row.count += item.quantity;
    row.revenue = (row.revenue ?? 0) + item.salePrice * item.quantity - item.discount;
    map.set(label, row);
  }
  return [...map.values()].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, limit);
}

/** Customer country (billing/visitor market) — a separate dimension from destination. */
export function topCustomerCountries(orders: OrderRow[], limit = 8): TopRow[] {
  const map = new Map<string, TopRow>();
  for (const order of orders.filter(isRevenueOrder)) {
    const label = order.customerCountryIso;
    if (!label) continue;
    const row = map.get(label) ?? { label, count: 0, revenue: 0 };
    row.count += 1;
    row.revenue = (row.revenue ?? 0) + order.grossRevenue;
    map.set(label, row);
  }
  return [...map.values()].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, limit);
}

export type CrossSellRow = {
  direction: "ESIM_TO_LOUNGE" | "LOUNGE_TO_ESIM";
  viewed: number;
  clicked: number;
  purchased: number;
  revenue: number;
};

/** Clicks are never counted as conversions; purchases come from paid orders only. */
export function crossSellPerformance(events: EventRow[], orders: OrderRow[], items: OrderItemRow[]): CrossSellRow[] {
  const paid = new Set(orders.filter(isRevenueOrder).map((o) => o.id));
  const directions: CrossSellRow["direction"][] = ["ESIM_TO_LOUNGE", "LOUNGE_TO_ESIM"];
  return directions.map((direction) => {
    const matching = events.filter((event) => String(event.properties?.["direction"] ?? "") === direction);
    const purchaseSessions = new Set(
      matching.filter((event) => event.name === "cross_sell_clicked").map((event) => event.sessionId),
    );
    const purchasedItems = items.filter(
      (item) =>
        paid.has(item.orderId) &&
        ((direction === "ESIM_TO_LOUNGE" && item.serviceType === "LOUNGE") ||
          (direction === "LOUNGE_TO_ESIM" && item.serviceType === "ESIM")) &&
        purchaseSessions.size > 0,
    );
    return {
      direction,
      viewed: matching.filter((event) => event.name === "cross_sell_viewed").length,
      clicked: matching.filter((event) => event.name === "cross_sell_clicked").length,
      purchased: purchasedItems.length,
      revenue: sum(purchasedItems.map((item) => item.salePrice * item.quantity - item.discount)),
    };
  });
}
