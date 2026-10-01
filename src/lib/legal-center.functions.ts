import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { DEFAULT_LEGAL_CENTER, sanitizeLegalCenter, type LegalCenterConfig } from "@/domain/legal/content";

const KEY = "legal_center";
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
}
export const getPublishedLegalCenter = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data } = await publicClient().from("cms_documents").select("data").eq("key", KEY).eq("status", "PUBLISHED").eq("visible", true).maybeSingle();
    const published = (data?.data as Record<string, unknown> | null)?.["published"];
    return published ? sanitizeLegalCenter(published) : DEFAULT_LEGAL_CENTER;
  } catch { return DEFAULT_LEGAL_CENTER; }
});
export const getLegalCenterEditor = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as AdminCtx);
  const { data } = await db.from("cms_documents").select("id,status,published_at,updated_at,data").eq("key", KEY).maybeSingle();
  const payload = data?.data as Record<string, unknown> | null;
  return { draft: sanitizeLegalCenter(payload?.["draft"] ?? payload?.["published"]), published: payload?.["published"] ? sanitizeLegalCenter(payload["published"]) : null, publishedAt: data?.published_at ?? null, updatedAt: data?.updated_at ?? null };
});
export const saveLegalCenter = createServerFn({ method: "POST" }).inputValidator((input: { config: LegalCenterConfig; publish?: boolean }) => input).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as AdminCtx); const config = sanitizeLegalCenter(data.config);
  const { data: existing } = await db.from("cms_documents").select("id,data,published_at").eq("key", KEY).maybeSingle();
  const old = existing?.data as Record<string, unknown> | null; const published = data.publish ? config : old?.["published"] ?? null;
  const payload = { key: KEY, kind: "LEGAL_CONTENT", status: published ? "PUBLISHED" : "DRAFT", visible: true, published_at: data.publish ? new Date().toISOString() : existing?.published_at ?? null, data: { draft: config, published } };
  let id = existing?.id as string | undefined;
  if (id) { const { error } = await db.from("cms_documents").update(payload).eq("id", id); if (error) throw new Error(error.message); }
  else { const { data: row, error } = await db.from("cms_documents").insert(payload).select("id").single(); if (error) throw new Error(error.message); id = row.id; }
  await db.from("cms_versions").insert({ document_id: id, created_by: (context as AdminCtx).userId, snapshot: { config, event: data.publish ? "publish" : "draft" } });
  await audit(db, data.publish ? "legal.publish" : "legal.save_draft", "cms_document", id ?? null, null, { documents: Object.keys(config.documents) });
  return { ok: true, published: Boolean(data.publish) };
});
export const unpublishLegalCenter = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as AdminCtx); const { data: row } = await db.from("cms_documents").select("id,data").eq("key", KEY).maybeSingle(); if (!row?.id) return { ok: true };
  const payload = row.data as Record<string, unknown>; const draft = sanitizeLegalCenter(payload["draft"] ?? payload["published"]);
  const { error } = await db.from("cms_documents").update({ status: "DRAFT", published_at: null, data: { draft, published: null } }).eq("id", row.id); if (error) throw new Error(error.message);
  await audit(db, "legal.unpublish", "cms_document", row.id, null, null); return { ok: true };
});
