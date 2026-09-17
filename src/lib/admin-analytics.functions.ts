import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildFunnel,
  buildSeries,
  campaignPerformance,
  computeKpis,
  crossSellPerformance,
  previousRange,
  salesByService,
  sourcePerformance,
  topCustomerCountries,
  topFromEvents,
  topProducts,
  topTravelDestinations,
  type AttributionRow,
  type DateRange,
  type EventRow,
  type OrderItemRow,
  type OrderRow,
} from "@/domain/analytics/dashboard";
import type { ServiceType } from "@/domain/enums";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Yönetici yetkisi gerekiyor.");
}

export type DashboardFilters = {
  from: string;
  to: string;
  serviceType?: ServiceType | "ALL" | undefined;
  source?: string | undefined;
  campaign?: string | undefined;
  locale?: string | undefined;
  customerCountry?: string | undefined;
  destination?: string | undefined;
  compare?: boolean | undefined;
};

function parseFilters(input: any): DashboardFilters {
  const day = (value: unknown, fallback: string) => {
    const text = String(value ?? "");
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
  };
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: day(input?.from, today),
    to: day(input?.to, today),
    serviceType: input?.serviceType === "ESIM" || input?.serviceType === "LOUNGE" ? input.serviceType : "ALL",
    source: input?.source ? String(input.source) : undefined,
    campaign: input?.campaign ? String(input.campaign) : undefined,
    locale: input?.locale ? String(input.locale) : undefined,
    customerCountry: input?.customerCountry ? String(input.customerCountry).toUpperCase() : undefined,
    destination: input?.destination ? String(input.destination) : undefined,
    compare: Boolean(input?.compare),
  };
}

const startOf = (day: string) => `${day}T00:00:00.000Z`;
const endOf = (day: string) => `${day}T23:59:59.999Z`;

async function loadWindow(db: any, range: DateRange, filters: DashboardFilters) {
  const [{ data: orderRows, error: orderError }, { data: eventRows }, { data: attributionRows }, { data: testProducts }] =
    await Promise.all([
      db
        .from("orders")
        .select(
          "id, created_at, customer_id, status, payment_status, currency, gross_revenue, discount_total, payment_fee, provider_cost_total, refunded_total, customer_country_iso, locale",
        )
        .gte("created_at", startOf(range.from))
        .lte("created_at", endOf(range.to)),
      db
        .from("analytics_events")
        .select("event_name, session_id, service_type, locale, properties, occurred_at")
        .gte("occurred_at", startOf(range.from))
        .lte("occurred_at", endOf(range.to))
        .limit(20000),
      db
        .from("traffic_attribution")
        .select("session_id, order_id, first_touch_source, last_touch_source, utm_source, utm_campaign")
        .gte("captured_at", startOf(range.from))
        .lte("captured_at", endOf(range.to))
        .limit(20000),
      db.from("service_products").select("id").eq("is_test", true),
    ]);
  if (orderError) throw new Error(orderError.message);

  const testIds = new Set<string>((testProducts ?? []).map((row: any) => row.id));
  const orderIds = (orderRows ?? []).map((row: any) => row.id);
  let itemRows: any[] = [];
  if (orderIds.length) {
    const { data } = await db
      .from("order_items")
      .select(
        "order_id, service_type, product_id, product_name_snapshot, sale_price, provider_cost, discount, quantity, destination_snapshot, airport_iata_snapshot",
      )
      .in("order_id", orderIds);
    itemRows = data ?? [];
  }

  /** Production dashboard never mixes in INTERNAL_TEST catalogue sales. */
  const testOrderIds = new Set(
    itemRows.filter((row) => row.product_id && testIds.has(row.product_id)).map((row) => row.order_id),
  );

  let orders: OrderRow[] = (orderRows ?? [])
    .filter((row: any) => !testOrderIds.has(row.id))
    .map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      customerId: row.customer_id,
      status: row.status,
      paymentStatus: row.payment_status,
      currency: row.currency ?? "EUR",
      grossRevenue: Number(row.gross_revenue ?? 0),
      discountTotal: Number(row.discount_total ?? 0),
      paymentFee: Number(row.payment_fee ?? 0),
      providerCostTotal: Number(row.provider_cost_total ?? 0),
      refundedTotal: Number(row.refunded_total ?? 0),
      customerCountryIso: row.customer_country_iso,
      locale: row.locale,
    }));

  if (filters.customerCountry) orders = orders.filter((o) => o.customerCountryIso === filters.customerCountry);
  if (filters.locale) orders = orders.filter((o) => o.locale === filters.locale);

  const keptOrderIds = new Set(orders.map((o) => o.id));
  let items: OrderItemRow[] = itemRows
    .filter((row) => keptOrderIds.has(row.order_id) && !(row.product_id && testIds.has(row.product_id)))
    .map((row) => ({
      orderId: row.order_id,
      serviceType: row.service_type,
      productId: row.product_id,
      productName: row.product_name_snapshot ?? "—",
      salePrice: Number(row.sale_price ?? 0),
      providerCost: Number(row.provider_cost ?? 0),
      discount: Number(row.discount ?? 0),
      quantity: Number(row.quantity ?? 1),
      destination: row.destination_snapshot,
      airportIata: row.airport_iata_snapshot,
    }));

  if (filters.serviceType && filters.serviceType !== "ALL") {
    items = items.filter((item) => item.serviceType === filters.serviceType);
    const withService = new Set(items.map((item) => item.orderId));
    orders = orders.filter((order) => withService.has(order.id));
  }
  if (filters.destination) {
    items = items.filter(
      (item) => item.destination === filters.destination || item.airportIata === filters.destination,
    );
    const withDestination = new Set(items.map((item) => item.orderId));
    orders = orders.filter((order) => withDestination.has(order.id));
  }

  let attribution: AttributionRow[] = (attributionRows ?? []).map((row: any) => ({
    sessionId: row.session_id,
    orderId: row.order_id,
    firstTouchSource: row.first_touch_source ?? "UNKNOWN",
    lastTouchSource: row.last_touch_source ?? "UNKNOWN",
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
  }));
  if (filters.source) attribution = attribution.filter((row) => row.lastTouchSource === filters.source);
  if (filters.campaign) attribution = attribution.filter((row) => row.utmCampaign === filters.campaign);

  let events: EventRow[] = (eventRows ?? []).map((row: any) => ({
    name: row.event_name,
    sessionId: row.session_id,
    serviceType: row.service_type,
    locale: row.locale,
    occurredAt: row.occurred_at,
    properties: (row.properties ?? {}) as Record<string, unknown>,
  }));
  if (filters.serviceType && filters.serviceType !== "ALL") {
    events = events.filter((event) => !event.serviceType || event.serviceType === filters.serviceType);
  }
  if (filters.locale) events = events.filter((event) => !event.locale || event.locale === filters.locale);
  if (filters.source || filters.campaign) {
    const sessions = new Set(attribution.map((row) => row.sessionId).filter(Boolean) as string[]);
    events = events.filter((event) => event.sessionId && sessions.has(event.sessionId));
  }

  return { orders, items, events, attribution };
}

/**
 * Real business data only. Empty tables produce zeros and empty lists —
 * no sample revenue, orders, or conversion rates are ever generated.
 */
export const getBusinessDashboard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => parseFilters(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const db = (context as Ctx).supabase;
    const range: DateRange = { from: data.from, to: data.to };

    const current = await loadWindow(db, range, data);
    const previous = data.compare ? await loadWindow(db, previousRange(range), data) : null;

    const visitSessions = new Set(current.events.map((event) => event.sessionId).filter(Boolean)).size;
    const kpis = computeKpis(current.orders, current.items, visitSessions);
    const previousKpis = previous
      ? computeKpis(
          previous.orders,
          previous.items,
          new Set(previous.events.map((event) => event.sessionId).filter(Boolean)).size,
        )
      : null;

    const [{ data: alertRows }, { data: syncRuns }] = await Promise.all([
      db.from("ops_alerts").select("type, status").neq("status", "RESOLVED"),
      db
        .from("provider_sync_runs")
        .select(
          "id, provider_id, status, started_at, completed_at, items_received, items_created, items_updated, items_unavailable, items_failed, error_summary, providers(name, code)",
        )
        .order("started_at", { ascending: false })
        .limit(1),
    ]);

    const alertCounts: Record<string, number> = {};
    for (const row of alertRows ?? []) alertCounts[row.type] = (alertCounts[row.type] ?? 0) + 1;

    return {
      range,
      previousRange: data.compare ? previousRange(range) : null,
      kpis,
      previousKpis,
      series: buildSeries(current.orders, range),
      previousSeries: previous ? buildSeries(previous.orders, previousRange(range)) : null,
      byService: salesByService(current.orders, current.items, ["ESIM", "LOUNGE"]),
      bySource: sourcePerformance(current.attribution, current.events, current.orders),
      firstTouch: countBy(current.attribution.map((row) => row.firstTouchSource)),
      lastTouch: countBy(current.attribution.map((row) => row.lastTouchSource)),
      campaigns: campaignPerformance(current.attribution, current.events, current.orders, current.items),
      funnel: buildFunnel(current.events),
      esim: {
        topDestinations: topFromEvents(current.events, "destination_selected", "destinationSlug"),
        topRegions: topFromEvents(current.events, "destination_selected", "region"),
        topRecommendedGb: topFromEvents(current.events, "recommendation_viewed", "recommendedGb"),
        topPurchasedGb: topFromEvents(current.events, "purchase_completed", "dataGb"),
        compatibilityChecks: current.events.filter((event) => event.name === "compatibility_checker_opened").length,
      },
      lounge: {
        topAirports: topFromEvents(current.events, "airport_selected", "iata"),
        topLounges: topFromEvents(current.events, "product_selected", "loungeName"),
        situations: topFromEvents(current.events, "usage_selected", "situation"),
        averageTravelers: averageProperty(current.events, "travelers"),
      },
      routes: {
        modes: topFromEvents(current.events, "route_mode_selected", "mode"),
        presets: topFromEvents(current.events, "route_preset_selected", "preset"),
        countries: topFromEvents(current.events, "destination_selected", "countryIso"),
      },
      crossSell: crossSellPerformance(current.events, current.orders, current.items),
      topProducts: topProducts(current.orders, current.items),
      topTravelDestinations: topTravelDestinations(current.orders, current.items),
      topCustomerCountries: topCustomerCountries(current.orders),
      alertCounts,
      lastImport: (syncRuns ?? [])[0]
        ? {
            status: syncRuns![0].status,
            provider: syncRuns![0].providers?.name ?? syncRuns![0].providers?.code ?? "—",
            startedAt: syncRuns![0].started_at,
            received: syncRuns![0].items_received ?? 0,
            created: syncRuns![0].items_created ?? 0,
            updated: syncRuns![0].items_updated ?? 0,
            unavailable: syncRuns![0].items_unavailable ?? 0,
            failed: syncRuns![0].items_failed ?? 0,
            error: syncRuns![0].error_summary,
          }
        : null,
    };
  });

function countBy(values: string[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function averageProperty(events: EventRow[], property: string): number | null {
  const numbers = events
    .map((event) => Number(event.properties?.[property]))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!numbers.length) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

export type BusinessDashboard = Awaited<ReturnType<typeof getBusinessDashboard>>;
