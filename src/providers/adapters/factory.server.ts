/**
 * Adapter factory — the only place that knows which concrete adapter exists.
 * Adding a provider means adding an adapter here; Finder, catalogue, pricing,
 * cart, orders and account code stay untouched.
 */
import { sanitizeAuthType, sanitizeEndpoints, sanitizeFieldMap } from "@/domain/providers/field-mapping";
import { createEsimGoAdapter, ESIM_GO_DEFAULT_BASE_URL, ESIM_GO_SECRET_NAME } from "./esim-go.server";
import { createGenericRestAdapter } from "./generic-rest.server";
import type { AdapterContext, AdapterType, CatalogueAdapter, ConnectionConfig } from "./types";

export function sanitizeConnectionConfig(raw: unknown): ConnectionConfig {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pageSize = Number(source["pageSize"]);
  const maxPages = Number(source["maxPages"]);
  return {
    authType: sanitizeAuthType(source["authType"]),
    endpoints: sanitizeEndpoints(source["endpoints"]),
    fieldMap: sanitizeFieldMap(source["fieldMap"]),
    pageSize: Number.isFinite(pageSize) ? Math.min(500, Math.max(10, Math.round(pageSize))) : 100,
    maxPages: Number.isFinite(maxPages) ? Math.min(200, Math.max(1, Math.round(maxPages))) : 60,
  };
}

export type ProviderRow = {
  code: string;
  adapter_type: string;
};

export type ConnectionRow = {
  base_url: string | null;
  credential_secret_names: string[] | null;
  config: unknown;
};

export function defaultSecretName(adapterType: string, providerCode: string): string {
  if (adapterType === "NATIVE_ESIM_GO") return ESIM_GO_SECRET_NAME;
  return `${providerCode.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

export function buildAdapter(provider: ProviderRow, connection: ConnectionRow | null): CatalogueAdapter {
  const adapterType = (provider.adapter_type ?? "GENERIC_REST") as AdapterType;
  const ctx: AdapterContext = {
    providerCode: provider.code,
    baseUrl: connection?.base_url || (adapterType === "NATIVE_ESIM_GO" ? ESIM_GO_DEFAULT_BASE_URL : null),
    credentialSecretName: connection?.credential_secret_names?.[0] || defaultSecretName(adapterType, provider.code),
    config: sanitizeConnectionConfig(connection?.config),
  };

  switch (adapterType) {
    case "NATIVE_ESIM_GO":
      return createEsimGoAdapter(ctx);
    case "CUSTOM":
      return createGenericRestAdapter(ctx, "CUSTOM");
    case "GENERIC_REST":
    default:
      return createGenericRestAdapter(ctx, "GENERIC_REST");
  }
}
