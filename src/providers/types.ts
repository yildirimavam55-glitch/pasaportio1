import type {
  ProviderCapability,
  ServiceType,
  SyncTrigger,
} from "@/domain/enums";

/**
 * Generic provider adapter contract.
 * Core domain code MUST depend on this interface only — never on a concrete
 * provider (eSIM Go, a lounge aggregator, ...).
 *
 * Pipeline:
 *   Provider -> Adapter -> RawProviderItem -> Normalizer -> CatalogueProduct
 *            -> Pricing Rules -> Publish Rules -> Storefront
 */

export type ProviderDescriptor = {
  code: string;
  name: string;
  serviceType: ServiceType;
  capabilities: ProviderCapability[];
  /** Names of server-side secrets. Values NEVER live in code or the database. */
  credentialSecretNames: string[];
  rateLimitPerMinute?: number;
};

/** Untouched provider payload plus its stable external identifier. */
export type RawProviderItem = {
  externalId: string;
  serviceType: ServiceType;
  payload: Record<string, unknown>;
  available: boolean;
};

/** Provider-owned, normalized. Admin-owned marketing fields are NOT part of this. */
export type NormalizedProduct = {
  externalId: string;
  serviceType: ServiceType;
  name: string;
  providerCost: number | null;
  providerCurrency: string;
  available: boolean;
  esim?: NormalizedEsimDetails;
  lounge?: NormalizedLoungeDetails;
  providerMetadata?: Record<string, unknown>;
};

export type NormalizedEsimDetails = {
  countryIso?: string | null;
  regionCode?: string | null;
  coverageCountryIsos?: string[];
  packageKind?: "COUNTRY" | "REGION" | "ROUTE" | "GLOBAL";
  dataGb?: number | null;
  unlimitedData?: boolean;
  validityDays?: number | null;
  providerBundleId?: string | null;
  networkOperators?: string[];
  supports5g?: boolean | null;
  supportsHotspot?: boolean | null;
  dataOnly?: boolean | null;
  activationPolicy?: string | null;
  validityStartRule?: string | null;
  apnInfo?: Record<string, unknown>;
  topupSupported?: boolean | null;
};

export type NormalizedLoungeDetails = {
  iata?: string | null;
  terminal?: string | null;
  loungeName?: string | null;
  timezone?: string | null;
  airside?: boolean | null;
  departureEligible?: boolean | null;
  transitEligible?: boolean | null;
  arrivalEligible?: boolean | null;
  openingHours?: Record<string, unknown>;
  maxStayMinutes?: number | null;
  amenities?: string[];
  minimumAge?: number | null;
  bookingWindowHours?: number | null;
  boardingPassRequired?: boolean | null;
  cancellationRules?: Record<string, unknown>;
  voucherRequired?: boolean | null;
  providerLoungeId?: string | null;
};

export type AvailabilityQuery = {
  externalId: string;
  when?: string;
  travelers?: number;
};

export type AvailabilityResult = {
  available: boolean;
  providerCost?: number | null;
  currency?: string;
  message?: string;
};

export type ProviderOrderRequest = {
  idempotencyKey: string;
  externalId: string;
  quantity: number;
  travelerLabel?: string;
  when?: string;
  travelers?: number;
};

export type ProviderOrderResult = {
  providerReference: string;
  status: "ACCEPTED" | "PENDING" | "FAILED";
  voucher?: { kind: "QR" | "CODE" | "URL"; value: string } | null;
  raw?: Record<string, unknown>;
};

/**
 * Every method is optional except `describe` + `fetchCatalogue`; support is
 * declared through capabilities. Never assume a provider can do everything.
 */
export interface ProviderAdapter {
  describe(): ProviderDescriptor;
  supports(capability: ProviderCapability): boolean;
  fetchCatalogue(options?: { since?: string; cursor?: string }): Promise<RawProviderItem[]>;
  normalize(item: RawProviderItem): NormalizedProduct;
  checkAvailability?(query: AvailabilityQuery): Promise<AvailabilityResult>;
  placeOrder?(request: ProviderOrderRequest): Promise<ProviderOrderResult>;
  cancelOrder?(providerReference: string): Promise<{ ok: boolean }>;
  refundOrder?(providerReference: string, amount?: number): Promise<{ ok: boolean }>;
  fetchUsage?(providerReference: string): Promise<Record<string, unknown>>;
  topUp?(providerReference: string, externalId: string): Promise<ProviderOrderResult>;
  verifyWebhook?(payload: string, signature: string): Promise<boolean> | boolean;
  fetchBalance?(): Promise<{ amount: number; currency: string }>;
}

export type SyncRunRequest = {
  providerCode: string;
  trigger: SyncTrigger;
  idempotencyKey: string;
};
