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
}
