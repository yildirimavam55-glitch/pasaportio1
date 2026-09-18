/**
 * Safe, declarative provider field mapping for the Generic REST adapter.
 * Admins map provider field names onto internal field names. No scripts,
 * expressions or code are ever evaluated — only key renaming.
 */

export const MAPPABLE_FIELDS = [
  "externalId",
  "name",
  "dataGb",
  "validityDays",
  "validityUnit",
  "providerCost",
  "currency",
  "countryIso",
  "coverage",
  "unlimited",
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number];
export type FieldMap = Partial<Record<MappableField, string>>;

export const FIELD_MAP_LABELS: Record<MappableField, string> = {
  externalId: "Provider ürün kimliği",
  name: "Ürün adı",
  dataGb: "Veri miktarı (GB)",
  validityDays: "Geçerlilik değeri",
  validityUnit: "Geçerlilik birimi",
  providerCost: "Provider maliyeti",
  currency: "Para birimi",
  countryIso: "Ülke ISO kodu",
  coverage: "Kapsama listesi",
  unlimited: "Sınırsız işareti",
};

export function sanitizeFieldMap(raw: unknown): FieldMap {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const map: FieldMap = {};
  for (const field of MAPPABLE_FIELDS) {
    const value = source[field];
    if (typeof value !== "string") continue;
    // Only a plain field name is accepted: no paths, no expressions.
    const key = value.trim().slice(0, 60);
    if (key && /^[A-Za-z0-9_.-]+$/.test(key)) map[field] = key;
  }
  return map;
}

/** Copies mapped provider keys onto internal keys; the raw payload is preserved. */
export function applyFieldMap(row: Record<string, unknown>, map: FieldMap): Record<string, unknown> {
  if (!Object.keys(map).length) return row;
  const out: Record<string, unknown> = { ...row };
  for (const [field, sourceKey] of Object.entries(map) as [MappableField, string][]) {
    const value = sourceKey.includes(".")
      ? sourceKey.split(".").reduce<unknown>((acc, part) => (acc && typeof acc === "object" ? (acc as any)[part] : undefined), row)
      : row[sourceKey];
    if (value !== undefined && value !== null && value !== "") out[field] = value;
  }
  return out;
}

export const ENDPOINT_FIELDS = [
  "catalogue",
  "availability",
  "validate",
  "order",
  "usage",
  "balance",
  "webhook",
] as const;
export type EndpointField = (typeof ENDPOINT_FIELDS)[number];
export type EndpointMap = Partial<Record<EndpointField, string>>;

export const ENDPOINT_LABELS: Record<EndpointField, string> = {
  catalogue: "Katalog uç noktası",
  availability: "Uygunluk uç noktası",
  validate: "Doğrulama uç noktası",
  order: "Sipariş uç noktası",
  usage: "Kullanım uç noktası",
  balance: "Bakiye uç noktası",
  webhook: "Webhook uç noktası",
};

export function sanitizeEndpoints(raw: unknown): EndpointMap {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: EndpointMap = {};
  for (const field of ENDPOINT_FIELDS) {
    const value = source[field];
    if (typeof value !== "string") continue;
    const path = value.trim().slice(0, 300);
    // Relative paths or absolute https URLs only. No javascript:, no data:.
    if (!path) continue;
    if (/^https:\/\//i.test(path) || path.startsWith("/")) out[field] = path;
  }
  return out;
}

export const AUTH_TYPES = ["API_KEY_HEADER", "BEARER", "BASIC", "QUERY_PARAM"] as const;
export type AuthType = (typeof AUTH_TYPES)[number];

export const AUTH_LABELS: Record<AuthType, string> = {
  API_KEY_HEADER: "API anahtarı (başlık)",
  BEARER: "Bearer token",
  BASIC: "Basic auth",
  QUERY_PARAM: "API anahtarı (sorgu parametresi)",
};

export function sanitizeAuthType(raw: unknown): AuthType {
  return (AUTH_TYPES as readonly string[]).includes(String(raw)) ? (raw as AuthType) : "API_KEY_HEADER";
}
