/**
 * Provider #2 — eSIM Access native adapter (CATALOGUE ONLY in this phase).
 * No orders, no provisioning, no balance consumption: ordering methods are
 * intentionally not implemented, so the provisioning engine can never reach
 * the paid eSIM Access order endpoint.
 * Docs: https://docs.esimaccess.com/
 */
import type { CatalogueFetch } from "@/domain/providers/sync-engine";
import { readSecret } from "./http.server";
import type { AdapterContext, CatalogueAdapter } from "./types";

export const ESIM_ACCESS_DEFAULT_BASE_URL = "https://api.esimaccess.com";
export const ESIM_ACCESS_SECRET_NAME = "ESIM_ACCESS_ACCESS_CODE";

/** eSIM Access money values are integers in 1/10000 of the currency unit. */
export function esimAccessMoney(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) / 10000 : null;
}

/** Volume is sent in bytes of binary GB (3 GB = 3 × 1024³); sold as commercial GB. */
export function esimAccessGb(bytes: unknown): number | null {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / 1024 ** 3) * 100) / 100;
}

function coverageOf(row: Record<string, unknown>): string[] {
  const list = Array.isArray(row["locationNetworkList"]) ? (row["locationNetworkList"] as any[]) : [];
  const fromNetworks = list.map((entry) => String(entry?.locationCode ?? "").trim().toUpperCase());
  const fromLocation = String(row["location"] ?? "").split(",").map((code) => code.trim().toUpperCase());
  return [...new Set([...fromNetworks, ...fromLocation])].filter((iso) => /^[A-Z]{2}$/.test(iso));
}

function networksOf(row: Record<string, unknown>): string[] {
  const list = Array.isArray(row["locationNetworkList"]) ? (row["locationNetworkList"] as any[]) : [];
  return [...new Set(list.flatMap((entry) => (Array.isArray(entry?.operatorList) ? entry.operatorList : []).map((op: any) => String(op?.operatorName ?? "").trim())).filter(Boolean))];
}

/**
 * Only total-data plans (dataType 1) are imported. Daily-pass plans
 * (dataType 2: X GB per day) are a different product type and are never
 * mapped onto a total-data or unlimited package.
 */
export function isImportableEsimAccessPackage(row: Record<string, unknown>): boolean {
  return Number(row["dataType"]) === 1 && String(row["durationUnit"] ?? "DAY").toUpperCase() === "DAY";
}

/** Provider payload → internal field names. Nothing is invented. */
export function normalizeEsimAccessPackage(row: Record<string, unknown>): Record<string, unknown> {
  const activeType = Number(row["activeType"]);
  const fup = String(row["fupPolicy"] ?? "").trim();
  return {
    ...row,
    externalId: row["packageCode"],
    name: row["name"],
    dataGb: esimAccessGb(row["volume"]) ?? undefined,
    unlimited: false,
    validityDays: row["duration"],
    validityUnit: "DAYS",
    providerCost: esimAccessMoney(row["price"]),
    currency: String(row["currencyCode"] ?? "USD").toUpperCase(),
    coverage: coverageOf(row),
    networks: networksOf(row),
    speed: row["speed"],
    supports5g: /5G/i.test(String(row["speed"] ?? "")),
    topupSupported: Number(row["supportTopUpType"]) === 2,
    fairUsePolicy: fup || null,
    // activeType: 1 = validity starts on installation, 2 = on first network connection.
    activationPolicy: activeType === 1 ? "ON_INSTALL" : activeType === 2 ? "ON_FIRST_NETWORK_CONNECTION" : undefined,
  };
}

export function createEsimAccessAdapter(ctx: AdapterContext): CatalogueAdapter {
  const baseUrl = ctx.baseUrl || ESIM_ACCESS_DEFAULT_BASE_URL;
  const secretName = ctx.credentialSecretName || ESIM_ACCESS_SECRET_NAME;
  const secret = () => readSecret(secretName);

  async function post(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; obj: any; error: string | null }> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "RT-AccessCode": secret() ?? "", "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      const json: any = await response.json().catch(() => null);
      if (!response.ok || !json) return { ok: false, status: response.status, obj: null, error: `HTTP ${response.status}` };
      // Raw supplier messages stay server-side; only the code is surfaced.
      if (json.success !== true) return { ok: false, status: response.status, obj: null, error: `eSIM Access hata kodu ${String(json.errorCode ?? "?").slice(0, 20)}` };
      return { ok: true, status: response.status, obj: json.obj, error: null };
    } catch {
      return { ok: false, status: 0, obj: null, error: "Bağlantı zaman aşımı veya ağ hatası." };
    }
  }

  return {
    type: "NATIVE_ESIM_ACCESS",
    capabilities: ["CATALOGUE", "BALANCE"],
    hasCredential: () => Boolean(secret()),
    async testConnection() {
      if (!secret()) return { ok: false, status: "CREDENTIAL_REQUIRED" as const, message: `${secretName} sunucu tarafında tanımlı değil.` };
      const result = await post("/api/v1/open/balance/query", {});
      return result.ok
        ? { ok: true, status: "CONNECTED" as const, message: "eSIM Access bağlantısı doğrulandı." }
        : { ok: false, status: "ERROR" as const, message: result.error ?? "Bağlantı kurulamadı." };
    },
    async fetchCatalogue(): Promise<CatalogueFetch> {
      if (!secret()) return { items: [], complete: false, pages: 0, error: "CREDENTIAL_REQUIRED" };
      // One request returns the complete catalogue.
      const result = await post("/api/v1/open/package/list", { locationCode: "", type: "", packageCode: "", iccid: "" });
      if (!result.ok) return { items: [], complete: false, pages: 0, error: result.error };
      const rows: Record<string, unknown>[] = Array.isArray(result.obj?.packageList) ? result.obj.packageList : [];
      return { items: rows.filter(isImportableEsimAccessPackage).map(normalizeEsimAccessPackage), complete: true, pages: 1, error: null };
    },
    async fetchBalance() {
      if (!secret()) return null;
      const result = await post("/api/v1/open/balance/query", {});
      const amount = esimAccessMoney(result.obj?.balance);
      return result.ok && amount != null ? { amount, currency: "USD" } : null;
    },
  };
}
