/**
 * Provider #1 — eSIM Go native adapter (CATALOGUE ONLY in Phase 2A).
 * No orders, no provisioning, no balance consumption.
 * The rest of the platform never imports this file directly; it is resolved
 * through the adapter factory so other providers plug in the same way.
 */
import type { CatalogueFetch } from "@/domain/providers/sync-engine";
import { extractItemArray } from "@/domain/providers/esim-import";
import { postJsonOnce, readSecret, requestJson } from "./http.server";
import type { AdapterContext, CatalogueAdapter, EsimOrderLookup, EsimOrderRequest, EsimOrderResult } from "./types";

export const ESIM_GO_DEFAULT_BASE_URL = "https://api.esim-go.com/v2.4";
export const ESIM_GO_SECRET_NAME = "ESIM_GO_API_KEY";

/**
 * Reads plain country ISO codes out of a provider country list; region labels
 * are ignored. Subdivision codes (US-HI, ES-CN …) are NOT folded into their
 * parent country — a Hawaii-only bundle must never look like a USA bundle.
 */
function isoListOf(value: unknown): string[] {
  return tokensOf(value).filter((iso) => /^[A-Z]{2}$/.test(iso));
}

function subdivisionListOf(value: unknown): string[] {
  return tokensOf(value).filter((code) => /^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code));
}

function tokensOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      entry && typeof entry === "object"
        ? String((entry as any).iso ?? (entry as any).country ?? (entry as any).code ?? "")
        : String(entry ?? ""),
    )
    .map((token) => token.trim().toUpperCase());
}

/** Provider payload → internal field names. Nothing is invented. */
function normalizeBundle(row: Record<string, unknown>): Record<string, unknown> {
  // Regional/global bundles list only a region label under `countries`; the real
  // ISO coverage lives in `roamingEnabled`. Both are merged, labels are dropped.
  const countries = [...new Set([...isoListOf(row["countries"]), ...isoListOf(row["roamingEnabled"])])];
  const subdivisions = [...new Set([...subdivisionListOf(row["countries"]), ...subdivisionListOf(row["roamingEnabled"])])];
  const dataMb = row["dataAmount"] ?? row["dataAmountMB"];
  return {
    ...row,
    externalId: row["name"] ?? row["bundleName"] ?? row["id"],
    name: row["description"] ?? row["name"],
    // eSIM Go sells decimal GB bundles: 2000 MB is commercially 2 GB, not 1.95 GB.
    dataGb: typeof dataMb === "number" && dataMb > 0 ? dataMb / 1000 : undefined,
    unlimited: row["unlimited"] === true || dataMb === -1,
    validityDays: row["duration"] ?? row["validity"],
    validityUnit: row["durationUnit"] ?? "DAYS",
    providerCost: row["price"] ?? row["wholesalePrice"],
    currency: row["currency"] ?? "EUR",
    coverage: countries.filter(Boolean),
    subdivisions,
    speed: row["speed"],
  };
}


/** Provider payload → the shape the provisioning engine normalizes. */
function orderShape(order: Record<string, unknown>, assignments: unknown[]): Record<string, unknown> {
  return {
    orderReference: order["orderReference"] ?? order["reference"] ?? order["id"],
    status: order["status"],
    esims: assignments,
  };
}

function assignmentsOf(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const root = body as Record<string, unknown>;
  for (const key of ["esims", "assignments", "items"]) {
    const value = root[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function createEsimGoAdapter(ctx: AdapterContext): CatalogueAdapter {
  const baseUrl = ctx.baseUrl || ESIM_GO_DEFAULT_BASE_URL;
  const secretName = ctx.credentialSecretName || ESIM_GO_SECRET_NAME;
  const secret = () => readSecret(secretName);
  const headers = () => ({ "X-API-Key": secret() ?? "" });

  return {
    type: "NATIVE_ESIM_GO",
    capabilities: ["CATALOGUE", "REAL_TIME_AVAILABILITY", "VALIDATE", "BALANCE", "ORDER", "QR_OR_VOUCHER"],
    hasCredential: () => Boolean(secret()),
    async testConnection() {
      if (!secret()) {
        return { ok: false, status: "CREDENTIAL_REQUIRED" as const, message: `${secretName} sunucu tarafında tanımlı değil.` };
      }
      const result = await requestJson(`${baseUrl}/catalogue?perPage=1&page=1`, { headers: headers(), retries: 1 });
      return result.ok
        ? { ok: true, status: "CONNECTED" as const, message: "eSIM Go bağlantısı doğrulandı." }
        : { ok: false, status: "ERROR" as const, message: result.error ?? "Bağlantı kurulamadı." };
    },
    async fetchCatalogue(): Promise<CatalogueFetch> {
      if (!secret()) return { items: [], complete: false, pages: 0, error: "CREDENTIAL_REQUIRED" };
      const perPage = ctx.config.pageSize;
      const items: Record<string, unknown>[] = [];
      let pages = 0;
      for (let page = 1; page <= ctx.config.maxPages; page += 1) {
        const result = await requestJson(`${baseUrl}/catalogue?perPage=${perPage}&page=${page}`, { headers: headers() });
        if (!result.ok) return { items, complete: false, pages, error: result.error ?? `HTTP ${result.status}` };
        const rows = extractItemArray(result.body) ?? [];
        pages += 1;
        for (const row of rows) items.push(normalizeBundle(row as Record<string, unknown>));
        if (rows.length < perPage) return { items, complete: true, pages, error: null };
      }
      return { items, complete: false, pages, error: "Sayfalama sınırına ulaşıldı." };
    },
    async fetchCataloguePage(page: number, perPage: number) {
      if (!secret()) return { items: [], hasMore: false, status: 0, error: "CREDENTIAL_REQUIRED" };
      const result = await requestJson(`${baseUrl}/catalogue?perPage=${perPage}&page=${page}`, { headers: headers() });
      if (!result.ok) {
        return { items: [], hasMore: true, status: result.status, error: result.error ?? `HTTP ${result.status}` };
      }
      const rows = extractItemArray(result.body) ?? [];
      return {
        items: rows.map((row) => normalizeBundle(row as Record<string, unknown>)),
        hasMore: rows.length >= perPage,
        status: result.status,
        error: null,
      };
    },
    async fetchBalance() {
      if (!secret()) return null;
      const result = await requestJson(`${baseUrl}/organisation`, { headers: headers(), retries: 1 });
      if (!result.ok || !result.body || typeof result.body !== "object") return null;
      const org = result.body as Record<string, unknown>;
      const amount = Number((org["organisations"] as any)?.[0]?.balance ?? org["balance"]);
      if (!Number.isFinite(amount)) return null;
      return { amount, currency: String(org["currency"] ?? "EUR").toUpperCase().slice(0, 3) };
    },
    async validateItem(externalId: string) {
      if (!secret()) return { available: false, providerCost: null, currency: null };
      const result = await requestJson(`${baseUrl}/catalogue/bundle/${encodeURIComponent(externalId)}`, {
        headers: headers(),
        retries: 1,
      });
      if (!result.ok || !result.body || typeof result.body !== "object") {
        return { available: false, providerCost: null, currency: null };
      }
      const bundle = result.body as Record<string, unknown>;
      const cost = Number(bundle["price"] ?? bundle["wholesalePrice"]);
      return {
        available: bundle["unavailable"] !== true,
        providerCost: Number.isFinite(cost) ? cost : null,
        currency: String(bundle["currency"] ?? "EUR").toUpperCase().slice(0, 3),
      };
    },
    /**
     * REAL supplier purchase — chargeable. Sent exactly once (no auto-retry) so
     * a timeout can never turn into a second paid order.
     */
    async placeEsimOrder(input: EsimOrderRequest): Promise<EsimOrderResult> {
      if (!secret()) return { ok: false, status: 0, timeout: false, error: "CREDENTIAL_REQUIRED" };
      const result = await postJsonOnce(`${baseUrl}/orders`, {
        headers: headers(),
        body: {
          type: "transaction",
          assign: true,
          // Provider-side idempotency/traceability reference.
          referenceId: input.reference,
          order: [{ type: "bundle", item: input.externalId, quantity: input.quantity }],
        },
      });
      if (!result.ok) {
        return { ok: false, status: result.status, timeout: result.timeout, error: result.error ?? `HTTP ${result.status}` };
      }
      if (!result.body || typeof result.body !== "object") {
        return { ok: false, status: result.status, timeout: false, malformed: true, error: "MALFORMED_RESPONSE" };
      }
      const order = result.body as Record<string, unknown>;
      const inline = assignmentsOf(order);
      if (inline.length) return { ok: true, body: orderShape(order, inline) };
      const reference = String(order["orderReference"] ?? order["reference"] ?? order["id"] ?? "");
      if (!reference) return { ok: false, status: result.status, timeout: false, malformed: true, error: "MALFORMED_RESPONSE" };
      const assignments = await requestJson(
        `${baseUrl}/esims/assignments?reference=${encodeURIComponent(reference)}`,
        { headers: headers(), retries: 2 },
      );
      return { ok: true, body: orderShape(order, assignmentsOf(assignments.body)) };
    },
    /** Read-only reconciliation. Never charges; resolves an unknown result. */
    async fetchEsimOrder(reference: string): Promise<EsimOrderLookup> {
      if (!secret()) return { found: false, conclusive: false, status: 0 };
      const order = await requestJson(`${baseUrl}/orders/${encodeURIComponent(reference)}`, {
        headers: headers(),
        retries: 2,
      });
      if (!order.ok) {
        // 404 is a conclusive "no such supplier order"; anything else is not.
        return { found: false, conclusive: order.status === 404, status: order.status };
      }
      const row = (order.body && typeof order.body === "object" ? order.body : {}) as Record<string, unknown>;
      const inline = assignmentsOf(row);
      if (inline.length) return { found: true, body: orderShape(row, inline) };
      const assignments = await requestJson(
        `${baseUrl}/esims/assignments?reference=${encodeURIComponent(reference)}`,
        { headers: headers(), retries: 2 },
      );
      return { found: true, body: orderShape(row, assignmentsOf(assignments.body)) };
    },
  };
}
