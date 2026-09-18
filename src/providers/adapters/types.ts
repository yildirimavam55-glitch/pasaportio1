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

/** Phase 2A adapters are catalogue-first. Ordering methods stay unimplemented. */
export interface CatalogueAdapter {
  type: AdapterType;
  capabilities: string[];
  hasCredential(): boolean;
  testConnection(): Promise<{ ok: boolean; status: ConnectionStatus; message: string }>;
  fetchCatalogue(): Promise<CatalogueFetch>;
  fetchBalance?(): Promise<{ amount: number; currency: string } | null>;
  /** Real-time pre-purchase validation. Never places an order. */
  validateItem?(externalId: string): Promise<{ available: boolean; providerCost: number | null; currency: string | null }>;
}
