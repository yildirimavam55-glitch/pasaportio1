/**
 * Phase 0 — shared domain enums.
 * These mirror the database enums 1:1 and are the only place the app defines them.
 */

export const SERVICE_TYPES = ["ESIM", "LOUNGE", "VIGNETTE", "CAR_RENTAL", "TRANSFER"] as const;
/** The three first-class customer services. Always handle each explicitly — never `else → LOUNGE`. */
export const PRIMARY_SERVICES = ["ESIM", "LOUNGE", "VIGNETTE"] as const;
export type PrimaryService = (typeof PRIMARY_SERVICES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const LOCALES = ["tr", "de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";

export const PRODUCT_LIFECYCLE = [
  "IMPORTED",
  "DRAFT",
  "READY",
  "PUBLISHED",
  "PAUSED",
  "UNAVAILABLE",
  "ARCHIVED",
] as const;
export type ProductLifecycle = (typeof PRODUCT_LIFECYCLE)[number];

export const PRICING_STRATEGIES = [
  "MANUAL",
  "MARKUP_PERCENT",
  "FIXED_MARKUP",
  "MINIMUM_MARGIN",
] as const;
export type PricingStrategy = (typeof PRICING_STRATEGIES)[number];

export const PROVIDER_CAPABILITIES = [
  "CATALOGUE",
  "REAL_TIME_AVAILABILITY",
  "ORDER",
  "CANCEL",
  "REFUND",
  "QR_OR_VOUCHER",
  "USAGE",
  "TOPUP",
  "WEBHOOKS",
  "BALANCE",
] as const;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export type SyncStatus = "PENDING" | "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
export type SyncTrigger = "SCHEDULED" | "MANUAL" | "WEBHOOK";

/** Order / payment / fulfillment are deliberately SEPARATE status domains. */
export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK";
export type FulfillmentStatus =
  | "PENDING"
  | "PROCESSING"
  | "FULFILLED"
  | "FAILED"
  | "CANCELLED";

export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED";

export type AttributionSource =
  | "GOOGLE_ADS"
  | "META"
  | "TIKTOK"
  | "GOOGLE_ORGANIC"
  | "DIRECT"
  | "CRM"
  | "EMAIL"
  | "WHATSAPP"
  | "AFFILIATE"
  | "PARTNER"
  | "UNKNOWN";

export type AlertType =
  | "PAID_NOT_FULFILLED"
  | "PROVIDER_ERROR"
  | "PROVISIONING_DELAYED"
  | "WEBHOOK_FAILED"
  | "QR_DELIVERY_FAILED"
  | "VOUCHER_DELIVERY_FAILED"
  | "CATALOGUE_SYNC_FAILED"
  | "CATALOGUE_STALE"
  | "LOW_PROVIDER_BALANCE"
  | "MARGIN_BELOW_MINIMUM"
  | "REFUND_REQUEST";

export type AppRole = "admin" | "customer";
