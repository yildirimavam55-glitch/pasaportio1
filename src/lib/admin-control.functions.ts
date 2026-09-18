import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { grossContribution, isRevenuePaymentStatus, sumFinancialRows, toFinancialRow } from "@/domain/finance/formulas";

type Ctx = AdminCtx;

const ORDER_SELECT =
  "id, order_number, customer_id, guest_email, status, payment_status, fulfillment_status, currency, gross_revenue, provider_cost_total, payment_fee, discount_total, refunded_total, tax_total, customer_country_iso, locale, created_at, updated_at, order_items(id, service_type, product_id, product_name_snapshot, sale_price, provider_cost, discount, quantity, fulfillment_status, destination_snapshot, airport_iata_snapshot, provider_reference, created_at)";

export type OrderFilters = {
  service?: string;
  search?: string;
  from?: string;
  to?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
};

export const getAdminOrders = createServerFn({ method: "GET" })
  .inputValidator((input: OrderFilters | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    let query = db.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(300);
    if (data.from) query = query.gte("created_at", `${data.from}T00:00:00.000Z`);
    if (data.to) query = query.lte("created_at", `${data.to}T23:59:59.999Z`);
    if (data.paymentStatus && data.paymentStatus !== "ALL") query = query.eq("payment_status", data.paymentStatus);
    if (data.fulfillmentStatus && data.fulfillmentStatus !== "ALL") query = query.eq("fulfillment_status", data.fulfillmentStatus);
    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);

    const term = (data.search ?? "").trim().toLowerCase();
    return (orders ?? [])
      .filter((order: any) => !data.service || data.service === "ALL" || order.order_items?.some((item: any) => item.service_type === data.service))
      .filter((order: any) =>
        !term ||
        String(order.order_number).toLowerCase().includes(term) ||
        String(order.guest_email ?? "").toLowerCase().includes(term) ||
        (order.order_items ?? []).some((item: any) => String(item.product_name_snapshot ?? "").toLowerCase().includes(term)),
      )
      .map((order: any) => ({ ...order, gross_profit: grossContribution(toFinancialRow(order)) }));
  });

/** Order detail with an operational timeline. Secrets (QR/voucher) are never returned. */
export const getAdminOrderDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { data: order, error } = await db.from("orders").select(ORDER_SELECT).eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Sipariş bulunamadı.");

    const itemIds = (order.order_items ?? []).map((item: any) => item.id);
    const [{ data: payments }, { data: refunds }, { data: attribution }, { data: profile }, { data: esims }, { data: lounges }] =
      await Promise.all([
        db.from("payment_transactions").select("id, kind, status, amount, fee, currency, psp, created_at").eq("order_id", data.id).order("created_at"),
        db.from("refund_requests").select("id, status, amount, currency, reason, created_at, decided_at").eq("order_id", data.id).order("created_at"),
        db.from("traffic_attribution").select("first_touch_source, last_touch_source, utm_source, utm_medium, utm_campaign, landing_path").eq("order_id", data.id).maybeSingle(),
        order.customer_id
          ? db.from("profiles").select("id, full_name, email, country_iso, preferred_locale").eq("id", order.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        itemIds.length
          ? db.from("customer_esims").select("id, order_item_id, status, created_at, updated_at, iccid, qr_payload").in("order_item_id", itemIds)
          : Promise.resolve({ data: [] }),
        itemIds.length
          ? db.from("customer_lounge_bookings").select("id, order_item_id, status, created_at, updated_at, booking_reference, voucher_payload").in("order_item_id", itemIds)
          : Promise.resolve({ data: [] }),
      ]);

    const timeline: Array<{ at: string; label: string; detail: string | null; tone: string }> = [
      { at: order.created_at, label: "Sipariş oluşturuldu", detail: null, tone: "INFO" },
    ];
    for (const payment of payments ?? []) {
      timeline.push({ at: payment.created_at, label: `Ödeme: ${payment.kind}`, detail: `${Number(payment.amount).toFixed(2)} ${payment.currency} · ${payment.status}`, tone: payment.status });
    }
    for (const item of order.order_items ?? []) {
      if (item.provider_reference) timeline.push({ at: item.created_at, label: "Provider talebi iletildi", detail: item.product_name_snapshot, tone: "INFO" });
      timeline.push({ at: item.created_at, label: `Teslimat durumu: ${item.fulfillment_status}`, detail: item.product_name_snapshot, tone: item.fulfillment_status });
    }
    /** Presence only — activation secrets are intentionally not returned. */
    for (const row of esims ?? []) {
      timeline.push({ at: row.updated_at ?? row.created_at, label: row.qr_payload ? "eSIM QR hazır" : "eSIM kaydı oluşturuldu", detail: row.iccid ? `ICCID ••••${String(row.iccid).slice(-4)}` : null, tone: row.status });
    }
    for (const row of lounges ?? []) {
      timeline.push({ at: row.updated_at ?? row.created_at, label: row.voucher_payload ? "Lounge voucher hazır" : "Lounge rezervasyonu oluşturuldu", detail: row.booking_reference ?? null, tone: row.status });
    }
    for (const refund of refunds ?? []) {
      timeline.push({ at: refund.created_at, label: `İade talebi: ${refund.status}`, detail: refund.reason ?? null, tone: refund.status });
    }
    timeline.sort((a, b) => String(a.at).localeCompare(String(b.at)));

    const finance = toFinancialRow(order);
    return {
      order: { ...order, gross_profit: grossContribution(finance) },
      finance,
      customer: profile ?? null,
      attribution: attribution ?? null,
      payments: payments ?? [],
      refunds: refunds ?? [],
      timeline,
    };
  });

export const getAdminCustomers = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    let profileQuery = db.from("profiles").select("id, full_name, email, country_iso, preferred_locale, created_at").order("created_at", { ascending: false }).limit(300);
    if (data.search) profileQuery = profileQuery.or(`full_name.ilike.%${data.search}%,email.ilike.%${data.search}%`);
    const [{ data: profiles, error }, { data: orders }, { data: trips }] = await Promise.all([
      profileQuery,
      db.from("orders").select("customer_id, gross_revenue, discount_total, refunded_total, payment_fee, provider_cost_total, payment_status, created_at, order_items(service_type)"),
      db.from("customer_trips").select("customer_id"),
    ]);
    if (error) throw new Error(error.message);
    return (profiles ?? []).map((profile: any) => {
      const customerOrders = (orders ?? []).filter((order: any) => order.customer_id === profile.id && isRevenuePaymentStatus(order.payment_status));
      return {
        ...profile,
        orders: customerOrders.length,
        lifetimeRevenue: sumFinancialRows(customerOrders.map(toFinancialRow)).netRevenue,
        lastPurchase: customerOrders.map((order: any) => order.created_at).sort().at(-1) ?? null,
        services: [...new Set(customerOrders.flatMap((order: any) => (order.order_items ?? []).map((item: any) => String(item.service_type))))] as string[],
        trips: (trips ?? []).filter((trip: any) => trip.customer_id === profile.id).length,
      };
    });
  });

export const getAdminCustomerDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const [{ data: profile, error }, { data: orders }, { data: trips }] = await Promise.all([
      db.from("profiles").select("id, full_name, email, country_iso, preferred_locale, created_at").eq("id", data.id).maybeSingle(),
      db.from("orders").select(ORDER_SELECT).eq("customer_id", data.id).order("created_at", { ascending: false }),
      db.from("customer_trips").select("id, title, start_date, end_date, destinations(name)").eq("customer_id", data.id).order("start_date", { ascending: false }),
    ]);
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Müşteri bulunamadı.");
    const paid = (orders ?? []).filter((order: any) => isRevenuePaymentStatus(order.payment_status));
    const totals = sumFinancialRows(paid.map(toFinancialRow));
    return {
      profile,
      orders: (orders ?? []).map((order: any) => ({ ...order, gross_profit: grossContribution(toFinancialRow(order)) })),
      trips: trips ?? [],
      totals: { orders: paid.length, lifetimeRevenue: totals.netRevenue, grossContribution: totals.grossContribution },
      services: [...new Set(paid.flatMap((order: any) => (order.order_items ?? []).map((item: any) => String(item.service_type))))] as string[],
      lastPurchase: paid.map((order: any) => order.created_at).sort().at(-1) ?? null,
    };
  });

export type OperationFilters = {
  service: "ESIM" | "LOUNGE";
  status?: string;
  from?: string;
  to?: string;
  providerId?: string;
};

export const getAdminOperations = createServerFn({ method: "GET" })
  .inputValidator((input: OperationFilters) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const table = data.service === "ESIM" ? "customer_esims" : "customer_lounge_bookings";
    const columns =
      data.service === "ESIM"
        ? "id, order_item_id, customer_id, destination_label, package_label, traveler_label, status, created_at, expires_at, order_items(product_name_snapshot, fulfillment_status, provider_reference, provider_id, providers(name), orders(order_number, payment_status, guest_email))"
        : "id, order_item_id, customer_id, airport_iata, terminal, lounge_name, travelers_count, visit_at, status, booking_reference, created_at, order_items(product_name_snapshot, fulfillment_status, provider_reference, provider_id, providers(name), orders(order_number, payment_status, guest_email))";
    let query = db.from(table).select(columns).order("created_at", { ascending: false }).limit(300);
    if (data.from) query = query.gte("created_at", `${data.from}T00:00:00.000Z`);
    if (data.to) query = query.lte("created_at", `${data.to}T23:59:59.999Z`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .filter((row: any) => {
        if (data.providerId && data.providerId !== "ALL" && row.order_items?.provider_id !== data.providerId) return false;
        if (!data.status || data.status === "ALL") return true;
        const fulfillment = row.order_items?.fulfillment_status;
        const payment = row.order_items?.orders?.payment_status;
        if (data.status === "ATTENTION") return fulfillment === "FAILED" || (isRevenuePaymentStatus(payment) && fulfillment !== "FULFILLED");
        if (data.status === "PENDING") return fulfillment === "PENDING" || fulfillment === "PROCESSING";
        if (data.status === "FAILED") return fulfillment === "FAILED";
        return fulfillment === data.status;
      })
      .map((row: any) => ({
        ...row,
        attention:
          row.order_items?.fulfillment_status === "FAILED"
            ? "PROVIDER_ERROR"
            : isRevenuePaymentStatus(row.order_items?.orders?.payment_status) && row.order_items?.fulfillment_status !== "FULFILLED"
              ? "PAID_NOT_FULFILLED"
              : null,
      }));
  });

export const getAdminCatalogue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const { data, error } = await db
      .from("service_products")
      .select(
        "id, name, slug, service_type, lifecycle, customer_visible, provider_available, sale_price, provider_cost, provider_currency, currency, badge, featured, sort_order, margin_flagged, price_overridden, pricing_rule_id, is_test, primary_provider_id, destinations(name, slug), airports(iata, name), providers(name), product_translations(locale, short_description), esim_product_details(country_iso, package_kind, coverage_country_isos, data_gb, unlimited_data, validity_days, regions(name)), lounge_product_details(iata, terminal, lounge_name)",
      )
      .order("service_type")
      .order("sort_order")
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const [{ data: providers, error }, { data: connections }, { data: products }, { data: syncs }, { data: syncErrors }, { data: mappings }] =
      await Promise.all([
        db.from("providers").select("id, name, code, service_type, active, capabilities, priority, notes").order("service_type").order("priority"),
        db.from("provider_connections").select("provider_id, status, environment, last_sync_at, last_checked_at, sync_cron, rate_limit_per_minute"),
        db.from("service_products").select("primary_provider_id"),
        db.from("provider_sync_runs").select("id, provider_id, status, trigger, started_at, completed_at, items_received, items_created, items_updated, items_unavailable, items_failed, error_summary").order("started_at", { ascending: false }).limit(200),
        db.from("provider_sync_errors").select("id, provider_id, code, message, external_id, created_at").order("created_at", { ascending: false }).limit(100),
        db.from("provider_product_mappings").select("provider_id, available, last_synced_at"),
      ]);
    if (error) throw new Error(error.message);
    return (providers ?? []).map((provider: any) => {
      const runs = (syncs ?? []).filter((row: any) => row.provider_id === provider.id);
      return {
        ...provider,
        /** Credential secret names are intentionally never returned to the client. */
        connection: (connections ?? []).find((row: any) => row.provider_id === provider.id) ?? null,
        catalogueItems: (products ?? []).filter((row: any) => row.primary_provider_id === provider.id).length,
        mappings: (mappings ?? []).filter((row: any) => row.provider_id === provider.id).length,
        availableMappings: (mappings ?? []).filter((row: any) => row.provider_id === provider.id && row.available).length,
        lastSync: runs[0] ?? null,
        lastSuccessfulSync: runs.find((row: any) => row.status === "SUCCESS") ?? null,
        history: runs.slice(0, 10),
        errors: (syncErrors ?? []).filter((row: any) => row.provider_id === provider.id).slice(0, 10),
      };
    });
  });

/** Pause/resume only. No live provider API is contacted. */
export const setProviderActive = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { data: before } = await db.from("providers").select("id, name, active").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("Provider bulunamadı.");
    const { error } = await db.from("providers").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, data.active ? "provider.resume" : "provider.pause", "provider", data.id, { active: before.active }, { active: data.active });
    return { ok: true };
  });

export const getAdminFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const [{ data: orders, error }, { data: refunds }, { data: payments }] = await Promise.all([
      db.from("orders").select("gross_revenue, provider_cost_total, discount_total, payment_fee, refunded_total, tax_total, currency, payment_status, order_number, id"),
      db.from("refund_requests").select("id, order_id, status, amount, currency, reason, created_at").order("created_at", { ascending: false }).limit(100),
      db.from("payment_transactions").select("kind, amount, fee, currency, status"),
    ]);
    if (error) throw new Error(error.message);
    const paid = (orders ?? []).filter((order: any) => isRevenuePaymentStatus(order.payment_status));
    const totals = sumFinancialRows(paid.map(toFinancialRow));
    return {
      totals: {
        revenue: totals.grossRevenue,
        netRevenue: totals.netRevenue,
        providerCost: totals.providerCostTotal,
        fees: totals.paymentFee,
        discounts: totals.discountTotal,
        refunded: totals.refundedTotal,
        tax: totals.taxTotal ?? 0,
        grossProfit: totals.grossContribution,
        marginPercent: totals.grossMarginPercent,
        currency: paid[0]?.currency ?? "EUR",
      },
      refunds: refunds ?? [],
      paymentCount: (payments ?? []).length,
    };
  });

export const getAdminAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const { data, error } = await db
      .from("ops_alerts")
      .select("id, type, severity, status, entity_type, entity_id, message, created_at")
      .neq("status", "RESOLVED")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Feature flags mapped to the operational switches the business actually uses. */
export const FLAG_DEFINITIONS = [
  { key: "storefront.esim", label: "eSIM mağazası", detail: "eSIM hizmetinin müşteriye görünürlüğü.", critical: true },
  { key: "checkout.esim", label: "eSIM satın alma", detail: "eSIM ödeme akışı.", critical: true },
  { key: "storefront.lounge", label: "Lounge mağazası", detail: "Lounge hizmetinin müşteriye görünürlüğü.", critical: true },
  { key: "checkout.lounge", label: "Lounge satın alma", detail: "Lounge ödeme akışı.", critical: true },
  { key: "showTestCatalogue", label: "Test kataloğu", detail: "INTERNAL_TEST ürünlerini mağazada gösterir. Yayın öncesi kapatılmalı.", critical: true },
  { key: "provider.sync", label: "Provider senkronu", detail: "Katalog senkronizasyonunun çalışmasına izin verir.", critical: false },
  { key: "guest_checkout", label: "Üye olmadan satın alma", detail: "Misafir kullanıcı satın alması.", critical: false },
] as const;

export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const { data, error } = await db.from("feature_flags").select("key, enabled, description, updated_at").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; enabled: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const allowed = FLAG_DEFINITIONS.map((flag) => flag.key) as readonly string[];
    if (!allowed.includes(data.key)) throw new Error("Bu bayrak yönetim panelinden değiştirilemez.");
    const { data: before } = await db.from("feature_flags").select("key, enabled").eq("key", data.key).maybeSingle();
    const { error } = await db.from("feature_flags").update({ enabled: data.enabled }).eq("key", data.key);
    if (error) throw new Error(error.message);
    await audit(db, "feature_flag.update", "feature_flag", data.key, { enabled: before?.enabled ?? null }, { enabled: data.enabled });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    let query = db
      .from("admin_audit_log")
      .select("id, admin_user_id, action, entity_type, entity_id, before_data, after_data, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.search) query = query.ilike("action", `%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const adminIds = [...new Set((rows ?? []).map((row: any) => row.admin_user_id).filter(Boolean))];
    const { data: admins } = adminIds.length
      ? await db.from("profiles").select("id, full_name, email").in("id", adminIds)
      : { data: [] };
    return (rows ?? []).map((row: any) => ({
      ...row,
      admin: (admins ?? []).find((profile: any) => profile.id === row.admin_user_id) ?? null,
    }));
  });

/** Global admin search across the operational entities. */
export const adminSearch = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const term = String(data.q ?? "").trim();
    if (term.length < 2) return { orders: [], customers: [], products: [], providers: [], airports: [], destinations: [] };
    const like = `%${term}%`;
    const [orders, customers, products, providers, airports, destinations] = await Promise.all([
      db.from("orders").select("id, order_number, payment_status, created_at").or(`order_number.ilike.${like},guest_email.ilike.${like}`).limit(6),
      db.from("profiles").select("id, full_name, email").or(`full_name.ilike.${like},email.ilike.${like}`).limit(6),
      db.from("service_products").select("id, name, service_type, sale_price, currency").ilike("name", like).limit(6),
      db.from("providers").select("id, name, code, service_type").or(`name.ilike.${like},code.ilike.${like}`).limit(6),
      db.from("airports").select("id, iata, name, city").or(`iata.ilike.${like},name.ilike.${like},city.ilike.${like}`).limit(6),
      db.from("destinations").select("id, name, slug").ilike("name", like).limit(6),
    ]);
    return {
      orders: orders.data ?? [],
      customers: customers.data ?? [],
      products: products.data ?? [],
      providers: providers.data ?? [],
      airports: airports.data ?? [],
      destinations: destinations.data ?? [],
    };
  });

/** Authenticated admin identity for the header. No role management is exposed. */
export const getAdminIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const { data } = await ctx.supabase.from("profiles").select("full_name, email").eq("id", ctx.userId).maybeSingle();
    const email = data?.email ?? (ctx as any).claims?.email ?? null;
    return { name: data?.full_name ?? null, email };
  });

/** Real filter options for the analytics screen — derived from existing data only. */
export const getAnalyticsFilterOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const [{ data: providers }, { data: airports }, { data: items }, { data: orders }, { data: attribution }] = await Promise.all([
      db.from("providers").select("id, name, service_type").order("name"),
      db.from("airports").select("iata, name").order("iata").limit(200),
      db.from("order_items").select("destination_snapshot, airport_iata_snapshot").limit(2000),
      db.from("orders").select("customer_country_iso, locale").limit(2000),
      db.from("traffic_attribution").select("last_touch_source, utm_campaign").limit(2000),
    ]);
    const uniq = (values: Array<string | null | undefined>) => [...new Set(values.filter(Boolean) as string[])].sort();
    return {
      providers: providers ?? [],
      airports: uniq([...(airports ?? []).map((row: any) => row.iata), ...(items ?? []).map((row: any) => row.airport_iata_snapshot)]),
      destinations: uniq((items ?? []).map((row: any) => row.destination_snapshot)),
      customerCountries: uniq((orders ?? []).map((row: any) => row.customer_country_iso)),
      locales: uniq((orders ?? []).map((row: any) => row.locale)),
      sources: uniq((attribution ?? []).map((row: any) => row.last_touch_source)),
      campaigns: uniq((attribution ?? []).map((row: any) => row.utm_campaign)),
    };
  });
