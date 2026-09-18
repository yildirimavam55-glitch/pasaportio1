/**
 * Generic REST adapter: configuration-driven, no provider-specific code.
 * Endpoints and field mappings come from the admin connection config,
 * credentials from server-side secrets only.
 */
import { applyFieldMap } from "@/domain/providers/field-mapping";
import type { CatalogueFetch } from "@/domain/providers/sync-engine";
import { extractItemArray } from "@/domain/providers/esim-import";
import { authHeaders, readSecret, requestJson } from "./http.server";
import type { AdapterContext, CatalogueAdapter } from "./types";

function joinUrl(base: string, path: string): string {
  if (/^https:\/\//i.test(path)) return path;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function createGenericRestAdapter(ctx: AdapterContext, type: "GENERIC_REST" | "CUSTOM" = "GENERIC_REST"): CatalogueAdapter {
  const secret = () => readSecret(ctx.credentialSecretName);
  const headers = () => authHeaders(ctx.config.authType, secret());

  const urlFor = (key: "catalogue" | "balance" | "validate", params: Record<string, string> = {}): string | null => {
    const path = ctx.config.endpoints[key];
    if (!path || !ctx.baseUrl) return null;
    const url = new URL(joinUrl(ctx.baseUrl, path));
    if (ctx.config.authType === "QUERY_PARAM" && secret()) url.searchParams.set("apiKey", secret()!);
    for (const [key2, value] of Object.entries(params)) url.searchParams.set(key2, value);
    return url.toString();
  };

  return {
    type,
    capabilities: ["CATALOGUE"],
    hasCredential: () => Boolean(secret()),
    async testConnection() {
      if (!ctx.baseUrl) return { ok: false, status: "NOT_CONFIGURED" as const, message: "API adresi girilmedi." };
      if (!secret()) return { ok: false, status: "CREDENTIAL_REQUIRED" as const, message: "API anahtarı sunucu tarafında tanımlı değil." };
      const url = urlFor("catalogue", { page: "1", perPage: "1" });
      if (!url) return { ok: false, status: "NOT_CONFIGURED" as const, message: "Katalog uç noktası girilmedi." };
      const result = await requestJson(url, { headers: headers(), retries: 1 });
      return result.ok
        ? { ok: true, status: "CONNECTED" as const, message: "Bağlantı doğrulandı." }
        : { ok: false, status: "ERROR" as const, message: result.error ?? "Bağlantı kurulamadı." };
    },
    async fetchCatalogue(): Promise<CatalogueFetch> {
      if (!ctx.baseUrl || !ctx.config.endpoints.catalogue) {
        return { items: [], complete: false, pages: 0, error: "Katalog uç noktası yapılandırılmadı." };
      }
      if (!secret()) return { items: [], complete: false, pages: 0, error: "CREDENTIAL_REQUIRED" };

      const items: Record<string, unknown>[] = [];
      let pages = 0;
      for (let page = 1; page <= ctx.config.maxPages; page += 1) {
        const url = urlFor("catalogue", { page: String(page), perPage: String(ctx.config.pageSize) })!;
        const result = await requestJson(url, { headers: headers() });
        if (!result.ok) return { items, complete: false, pages, error: result.error ?? `HTTP ${result.status}` };
        const rows = extractItemArray(result.body) ?? [];
        pages += 1;
        for (const row of rows) items.push(applyFieldMap(row as Record<string, unknown>, ctx.config.fieldMap));
        if (rows.length < ctx.config.pageSize) return { items, complete: true, pages, error: null };
      }
      // Page budget exhausted: treat as incomplete so nothing is disabled.
      return { items, complete: false, pages, error: "Sayfalama sınırına ulaşıldı." };
    },
    async fetchBalance() {
      const url = urlFor("balance");
      if (!url || !secret()) return null;
      const result = await requestJson(url, { headers: headers(), retries: 1 });
      if (!result.ok || !result.body || typeof result.body !== "object") return null;
      const body = result.body as Record<string, unknown>;
      const amount = Number(body["balance"] ?? body["amount"] ?? body["available"]);
      if (!Number.isFinite(amount)) return null;
      return { amount, currency: String(body["currency"] ?? "EUR").toUpperCase().slice(0, 3) };
    },
    async validateItem(externalId: string) {
      const url = urlFor("validate", { externalId });
      if (!url || !secret()) return { available: false, providerCost: null, currency: null };
      const result = await requestJson(url, { headers: headers(), retries: 1 });
      if (!result.ok || !result.body || typeof result.body !== "object") {
        return { available: false, providerCost: null, currency: null };
      }
      const body = result.body as Record<string, unknown>;
      const cost = Number(body["providerCost"] ?? body["price"] ?? body["cost"]);
      return {
        available: body["available"] !== false,
        providerCost: Number.isFinite(cost) ? cost : null,
        currency: body["currency"] ? String(body["currency"]).toUpperCase().slice(0, 3) : null,
      };
    },
  };
}
