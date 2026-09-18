import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };
async function adminDb(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Yönetici yetkisi gerekiyor.");
  return context.supabase;
}

export const getAdminOrders = createServerFn({ method: "GET" }).inputValidator((input: { service?: string }) => input).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as Ctx);
  const { data: orders, error } = await db.from("orders").select("id, order_number, customer_id, guest_email, status, payment_status, fulfillment_status, currency, gross_revenue, provider_cost_total, payment_fee, discount_total, refunded_total, customer_country_iso, created_at, order_items(id, service_type, product_name_snapshot, sale_price, provider_cost, fulfillment_status, destination_snapshot, airport_iata_snapshot, provider_reference)").order("created_at", { ascending: false }).limit(250);
  if (error) throw new Error(error.message);
  const rows = (orders ?? []).filter((order: any) => !data.service || data.service === "ALL" || order.order_items?.some((item: any) => item.service_type === data.service));
  return rows.map((order: any) => ({ ...order, gross_profit: Number(order.gross_revenue ?? 0) - Number(order.provider_cost_total ?? 0) - Number(order.payment_fee ?? 0) - Number(order.discount_total ?? 0) - Number(order.refunded_total ?? 0) }));
});

export const getAdminCustomers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as Ctx);
  const [{ data: profiles, error }, { data: orders }, { data: trips }] = await Promise.all([
    db.from("profiles").select("id, full_name, email, country_iso, preferred_locale, created_at").order("created_at", { ascending: false }).limit(250),
    db.from("orders").select("customer_id, gross_revenue, created_at, order_items(service_type)"),
    db.from("customer_trips").select("customer_id"),
  ]);
  if (error) throw new Error(error.message);
  return (profiles ?? []).map((profile: any) => {
    const customerOrders = (orders ?? []).filter((order: any) => order.customer_id === profile.id);
    return { ...profile, orders: customerOrders.length, lifetimeRevenue: customerOrders.reduce((sum: number, order: any) => sum + Number(order.gross_revenue ?? 0), 0), lastPurchase: customerOrders.map((order: any) => order.created_at).sort().at(-1) ?? null, services: [...new Set(customerOrders.flatMap((order: any) => (order.order_items ?? []).map((item: any) => item.service_type)))], trips: (trips ?? []).filter((trip: any) => trip.customer_id === profile.id).length };
  });
});

export const getAdminOperations = createServerFn({ method: "GET" }).inputValidator((input: { service: "ESIM" | "LOUNGE" }) => input).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as Ctx);
  if (data.service === "ESIM") {
    const { data: rows, error } = await db.from("customer_esims").select("id, order_item_id, customer_id, destination_label, package_label, traveler_label, status, created_at, expires_at, order_items(product_name_snapshot, fulfillment_status, provider_reference, orders(order_number, payment_status, guest_email))").order("created_at", { ascending: false }).limit(250);
    if (error) throw new Error(error.message);
    return rows ?? [];
  }
  const { data: rows, error } = await db.from("customer_lounge_bookings").select("id, order_item_id, customer_id, airport_iata, terminal, lounge_name, travelers_count, visit_at, status, booking_reference, created_at, order_items(product_name_snapshot, fulfillment_status, provider_reference, orders(order_number, payment_status, guest_email))").order("created_at", { ascending: false }).limit(250);
  if (error) throw new Error(error.message);
  return rows ?? [];
});

export const getAdminCatalogue = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as Ctx);
  const { data, error } = await db.from("service_products").select("id, name, service_type, lifecycle, customer_visible, provider_available, sale_price, provider_cost, currency, badge, featured, margin_flagged, price_overridden, primary_provider_id, destinations(name, slug), airports(iata, name), providers(name), esim_product_details(country_iso, package_kind, coverage_country_isos, data_gb, unlimited_data, validity_days, regions(name)), lounge_product_details(iata, terminal, lounge_name)").order("service_type").order("sort_order").limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAdminProviders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as Ctx);
  const [{ data: providers, error }, { data: connections }, { data: products }, { data: syncs }] = await Promise.all([
    db.from("providers").select("id, name, code, service_type, active, capabilities, priority").order("service_type").order("priority"),
    db.from("provider_connections").select("provider_id, status, last_sync_at, last_checked_at"),
    db.from("service_products").select("primary_provider_id"),
    db.from("provider_sync_runs").select("provider_id, status, started_at, items_received, items_failed, error_summary").order("started_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  return (providers ?? []).map((provider: any) => ({ ...provider, connection: (connections ?? []).find((row: any) => row.provider_id === provider.id) ?? null, catalogueItems: (products ?? []).filter((row: any) => row.primary_provider_id === provider.id).length, lastSync: (syncs ?? []).find((row: any) => row.provider_id === provider.id) ?? null }));
});

export const getAdminFinance = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as Ctx);
  const [{ data: orders, error }, { data: refunds }, { data: payments }] = await Promise.all([
    db.from("orders").select("gross_revenue, provider_cost_total, discount_total, payment_fee, refunded_total, tax_total, currency, payment_status"),
    db.from("refund_requests").select("id, order_id, status, amount, currency, reason, created_at").order("created_at", { ascending: false }).limit(100),
    db.from("payment_transactions").select("kind, amount, fee, currency, status"),
  ]);
  if (error) throw new Error(error.message);
  const paid = (orders ?? []).filter((order: any) => order.payment_status === "PAID" || order.payment_status === "PARTIALLY_REFUNDED");
  const sum = (key: string) => paid.reduce((total: number, row: any) => total + Number(row[key] ?? 0), 0);
  const revenue = sum("gross_revenue"), providerCost = sum("provider_cost_total"), fees = sum("payment_fee"), discounts = sum("discount_total"), refunded = sum("refunded_total"), tax = sum("tax_total");
  return { totals: { revenue, providerCost, fees, discounts, refunded, tax, grossProfit: revenue - providerCost - fees - discounts - refunded, currency: paid[0]?.currency ?? "EUR" }, refunds: refunds ?? [], paymentCount: (payments ?? []).length };
});

export const getAdminAlerts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as Ctx);
  const { data, error } = await db.from("ops_alerts").select("id, type, severity, status, entity_type, entity_id, message, created_at").neq("status", "RESOLVED").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});