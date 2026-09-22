import type { CatalogueFetch } from "@/domain/providers/sync-engine";
import type { AuthType, EndpointMap, FieldMap } from "@/domain/providers/field-mapping";

export const ADAPTER_TYPES = ["NATIVE_ESIM_GO", "GENERIC_REST", "CUSTOM"] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];

export const ADAPTER_LABELS: Record<AdapterType, string> = {
  NATIVE_ESIM_GO: "Yerleşik adaptör — eSIM Go",
  GENERIC_REST: "Genel REST adaptörü",
  CUSTOM: "Özel adaptör",
};

export type ConnectionConfig = {
  authType: AuthType;
  endpoints: EndpointMap;
  fieldMap: FieldMap;
  pageSize: number;
  maxPages: number;
};

export type ConnectionStatus =
  | "CREDENTIAL_REQUIRED"
  | "NOT_CONFIGURED"
  | "CONNECTED"
  | "ERROR"
  | "DISABLED";

export type AdapterContext = {
  providerCode: string;
  baseUrl: string | null;
  credentialSecretName: string | null;
  config: ConnectionConfig;
};

/** One provider catalogue page — the unit of a resumable sync batch. */
export type CataloguePage = {
  items: Record<string, unknown>[];
  hasMore: boolean;
  /** HTTP status of the page request (0 = network/timeout). */
  status: number;
  error: string | null;
};

/** Phase 2A adapters are catalogue-first. Ordering methods stay unimplemented. */
export interface CatalogueAdapter {
  type: AdapterType;
  capabilities: string[];
  hasCredential(): boolean;
  testConnection(): Promise<{ ok: boolean; status: ConnectionStatus; message: string }>;
  fetchCatalogue(): Promise<CatalogueFetch>;
  /** Resumable pagination. One page per call so progress can be checkpointed. */
  fetchCataloguePage?(page: number, perPage: number): Promise<CataloguePage>;
  fetchBalance?(): Promise<{ amount: number; currency: string } | null>;
  /** Real-time pre-purchase validation. Never places an order. */
  validateItem?(externalId: string): Promise<{ available: boolean; providerCost: number | null; currency: string | null }>;
  /**
   * Places ONE supplier purchase. Executed once, never auto-retried: on a
   * timeout the caller must reconcile instead of re-sending.
   */
  placeEsimOrder?(input: EsimOrderRequest): Promise<EsimOrderResult>;
  /** Reconciliation lookup — determines whether a purchase actually exists. */
  fetchEsimOrder?(reference: string): Promise<EsimOrderLookup>;
}

export type EsimOrderRequest = {
  /** Supplier bundle identifier taken from the mapped catalogue row. */
  externalId: string;
  quantity: number;
  /** Stable provisioning identity, sent to the provider when supported. */
  reference: string;
};

export type EsimOrderResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; timeout: boolean; malformed?: boolean; error: string };

export type EsimOrderLookup =
  | { found: true; body: unknown }
  | { found: false; conclusive: boolean; status: number };
