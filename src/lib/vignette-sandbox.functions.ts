import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, redactSensitive, type AdminCtx } from "@/lib/admin-guard";

/**
 * Vignette ID — SANDBOX ONLY (Phase 1, admin inspection).
 * Documented: GET https://sandbox-api.vignette.id/public/products
 * Auth: `Authorization: Bearer <SANDBOX key>` (docs.vgnt.app API reference).
 * The key is read server-side from VIGNETTE_ID_SANDBOX_API_KEY and never returned or logged.
 * Production host is intentionally not referenced anywhere.
 */
const SANDBOX_BASE = "https://sandbox-api.vignette.id";
const PRODUCTS_PATH = "/public/products";

type FetchResult = { ok: boolean; httpStatus: number | null; error: string | null; body: unknown };

async function fetchSandboxProducts(): Promise<FetchResult> {
  const key = process.env["VIGNETTE_ID_SANDBOX_API_KEY"];
  if (!key) return { ok: false, httpStatus: null, error: "Sandbox API anahtarı eklenmemiş (VIGNETTE_ID_SANDBOX_API_KEY).", body: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${SANDBOX_BASE}${PRODUCTS_PATH}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    const apiError = body && typeof body === "object" ? (body as any).error : null;
    const ok = res.ok && !apiError;
    return { ok, httpStatus: res.status, error: ok ? null : (apiError ? JSON.stringify(apiError).slice(0, 300) : `HTTP ${res.status}`), body };
  } catch (e) {
    return { ok: false, httpStatus: null, error: (e as Error).name === "AbortError" ? "Zaman aşımı" : "Ağ hatası", body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Strip any echoed key-like string from the body, then redact sensitive keys. */
function sanitize(body: unknown): unknown {
  const key = process.env["VIGNETTE_ID_SANDBOX_API_KEY"];
  let json = JSON.stringify(body ?? null);
  if (key && key.length > 4) json = json.split(key).join("[redacted]");
  return redactSensitive(JSON.parse(json));
}

export const getVignetteSandbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const [latest, lastOk, catalogue] = await Promise.all([
      db.from("vignette_supplier_snapshots").select("id, http_status, ok, error, product_count, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("vignette_supplier_snapshots").select("created_at, product_count").eq("ok", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("vignette_supplier_snapshots").select("created_at, raw_response").eq("ok", true).not("raw_response", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    for (const q of [latest, lastOk, catalogue]) if (q.error) throw new Error(q.error.message);
    const raw = catalogue.data?.raw_response ?? null;
    return {
      environment: "SANDBOX" as const,
      endpoint: `${SANDBOX_BASE}${PRODUCTS_PATH}`,
      keyConfigured: Boolean(process.env["VIGNETTE_ID_SANDBOX_API_KEY"]),
      latest: latest.data ?? null,
      lastSuccessAt: (lastOk.data?.created_at as string | undefined) ?? null,
      catalogueAt: (catalogue.data?.created_at as string | undefined) ?? null,
      /** Sanitized supplier JSON as a string (keeps the RPC payload type-safe). */
      rawJson: raw == null ? null : JSON.stringify(raw),
    };
  });

/** mode "test": check only (no stored catalogue). mode "refresh": store sanitized snapshot. */
export const runVignetteSandbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "test" | "refresh" }) => ({ mode: d?.mode === "refresh" ? "refresh" : "test" }) as const)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as AdminCtx);
    const r = await fetchSandboxProducts();
    const clean = sanitize(r.body);
    const list = extractProducts(clean);
    const { error } = await db.from("vignette_supplier_snapshots").insert({
      environment: "SANDBOX",
      http_status: r.httpStatus,
      ok: r.ok,
      error: r.error,
      product_count: list.length,
      raw_response: data.mode === "refresh" || !r.ok ? (clean as any) : null,
      created_by: (context as AdminCtx).userId,
    });
    if (error) throw new Error(error.message);
    return { ok: r.ok, httpStatus: r.httpStatus, error: r.error, productCount: list.length };
  });

/** Locate the product array without assuming a shape beyond the documented `{ error, result }` envelope. */
export function extractProducts(body: unknown): Record<string, unknown>[] {
  const pick = (v: unknown): Record<string, unknown>[] | null => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as any) : null);
  if (!body || typeof body !== "object") return [];
  const b = body as any;
  return pick(b) ?? pick(b.result) ?? pick(b.result?.products) ?? pick(b.result?.items) ?? pick(b.result?.data) ?? pick(b.products) ?? pick(b.data) ?? [];
}
