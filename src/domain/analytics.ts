import type { AttributionSource, Locale, ServiceType } from "./enums";

/**
 * Vendor-neutral analytics event contracts.
 * The app emits these; a sink (DB table, GA, Meta...) is plugged in later.
 */
export type AnalyticsEvent =
  | { name: "service_selected"; serviceType: ServiceType }
  | { name: "finder_viewed"; serviceType: ServiceType }
  | { name: "finder_started"; serviceType: ServiceType }
  | { name: "destination_selected"; destinationSlug: string }
  | { name: "airport_selected"; iata: string }
  | { name: "usage_selected"; usage: string }
  | { name: "recommendation_viewed"; productIds: string[] }
  | { name: "product_selected"; productId: string; serviceType: ServiceType }
  | { name: "compatibility_checker_opened"; surface: string }
  | { name: "device_searched"; queryLength: number }
  | { name: "compatibility_result_viewed"; result: string; brand: string }
  | { name: "whatsapp_widget_opened"; surface: string }
  | { name: "whatsapp_cta_clicked"; surface: string }
  | { name: "checkout_started"; orderId?: string; serviceType: ServiceType }
  | { name: "purchase_completed"; orderId: string; currency: string; grossRevenue: number };

export type AnalyticsContext = {
  sessionId?: string;
  customerId?: string;
  locale?: Locale;
};

export interface AnalyticsSink {
  track(event: AnalyticsEvent, context?: AnalyticsContext): Promise<void> | void;
}

/** Phase 0: no-op sink so call sites can already be written safely. */
export const noopAnalyticsSink: AnalyticsSink = {
  track() {
    /* Phase 0: intentionally does nothing. */
  },
};

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type Attribution = UtmParams & {
  firstTouchSource: AttributionSource;
  lastTouchSource: AttributionSource;
  landingPath?: string;
};

export function classifySource(utm: UtmParams, referrer?: string): AttributionSource {
  const s = (utm.utm_source ?? "").toLowerCase();
  if (s.includes("google") && utm.utm_medium === "cpc") return "GOOGLE_ADS";
  if (s.includes("facebook") || s.includes("instagram") || s.includes("meta")) return "META";
  if (s.includes("tiktok")) return "TIKTOK";
  if (s.includes("email") || utm.utm_medium === "email") return "EMAIL";
  if (s.includes("whatsapp")) return "WHATSAPP";
  if (s.includes("affiliate")) return "AFFILIATE";
  if (s.includes("partner")) return "PARTNER";
  if (s.includes("crm")) return "CRM";
  if (!utm.utm_source && referrer?.includes("google.")) return "GOOGLE_ORGANIC";
  if (!utm.utm_source && !referrer) return "DIRECT";
  return "UNKNOWN";
}

/** KPI shapes — computed from real data in later phases, never faked. */
export type KpiSnapshot = {
  grossRevenue: number;
  orders: number;
  servicesSold: number;
  providerCost: number;
  grossProfit: number;
  paymentFees: number;
  refunds: number;
  averageOrderValue: number;
  conversionRate: number | null;
  repeatPurchaseRate: number | null;
  currency: string;
};
