import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import {
  DEFAULT_LEGAL_CENTER, EMPTY_PUBLISHED, LEGAL_DOCUMENTS, sanitizeLegalCenter, sanitizePublishedLegalCenter,
  type LegalCenterConfig, type LegalDocument, type LegalDocumentId,
} from "@/domain/legal/content";
import { UI_LOCALES } from "@/i18n/locales";

/**
 * Legal content lives in two existing cms_documents rows:
 * - PUBLISHED_KEY (status PUBLISHED): only documents the owner explicitly published — the only row the public can read.
 * - DRAFT_KEY (status DRAFT): the working draft; existing RLS keeps it Admin-only.
 * Every save/publish appends a snapshot to cms_versions on the draft row.
 */
const PUBLISHED_KEY = "legal_center";
const DRAFT_KEY = "legal_center_draft";
const KIND = "LEGAL_CONTENT";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization"); headers.set("apikey", key); return fetch(input, { ...init, headers }); } } });
}

export const getPublishedLegalCenter = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data } = await publicClient().from("cms_documents").select(process.env["CMS_PUBLIC_PROJECTION_ENABLED"]==="true"?"data:public_data":"data").eq("key", PUBLISHED_KEY).eq("status", "PUBLISHED").eq("visible", true).maybeSingle();
    const published = ((data as any)?.data as Record<string, unknown> | null)?.["published"];
    return published ? sanitizePublishedLegalCenter(published) : EMPTY_PUBLISHED;
  } catch { return EMPTY_PUBLISHED; }
});

async function readRows(db: any) {
  const { data, error } = await db.from("cms_documents").select("id,key,status,data,updated_at,published_at").in("key", [DRAFT_KEY, PUBLISHED_KEY]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; key: string; data: Record<string, unknown> | null; updated_at: string }>;
  return { draftRow: rows.find((r) => r.key === DRAFT_KEY) ?? null, publishedRow: rows.find((r) => r.key === PUBLISHED_KEY) ?? null };
}

async function writeDraft(db: any, existingId: string | undefined, config: LegalCenterConfig) {
  const payload = { key: DRAFT_KEY, kind: KIND, status: "DRAFT", visible: false, data: { draft: config } };
  if (existingId) {
    const { error } = await db.from("cms_documents").update(payload).eq("id", existingId);
    if (error) throw new Error(error.message);
    return existingId;
  }
  const { data, error } = await db.from("cms_documents").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export const getLegalCenterEditor = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context as AdminCtx);
  const { draftRow, publishedRow } = await readRows(db);
  const draft = draftRow ? sanitizeLegalCenter(draftRow.data?.["draft"]) : DEFAULT_LEGAL_CENTER;
  const published = publishedRow ? sanitizePublishedLegalCenter(publishedRow.data?.["published"]) : EMPTY_PUBLISHED;
  let versions: Array<{ id: string; createdAt: string; event: string; documentId: LegalDocumentId | null; document: LegalDocument | null }> = [];
  if (draftRow) {
    const { data } = await db.from("cms_versions").select("id,created_at,snapshot").eq("document_id", draftRow.id).order("created_at", { ascending: false }).limit(120);
    versions = (data ?? []).map((v: any) => {
      const documentId = (LEGAL_DOCUMENTS as readonly string[]).includes(v.snapshot?.documentId) ? (v.snapshot.documentId as LegalDocumentId) : null;
      return { id: String(v.id), createdAt: String(v.created_at), event: v.snapshot?.event === "publish" ? "publish" : "draft", documentId, document: documentId && v.snapshot?.document ? sanitizeLegalCenter({ documents: { [documentId]: v.snapshot.document } }).documents[documentId] : null };
    });
  }
  return { draft, published, draftSavedAt: draftRow?.updated_at ?? null, versions };
});

const configInput = z.object({ config: z.unknown() });

export const saveLegalDraft = createServerFn({ method: "POST" }).inputValidator((input: unknown) => configInput.extend({ documentId: z.enum(LEGAL_DOCUMENTS).nullable() }).parse(input)).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as AdminCtx);
  const config = sanitizeLegalCenter(data.config);
  const { draftRow } = await readRows(db);
  const id = await writeDraft(db, draftRow?.id, config);
  await db.from("cms_versions").insert({ document_id: id, created_by: (context as AdminCtx).userId, snapshot: { event: "draft", documentId: data.documentId, document: data.documentId ? config.documents[data.documentId] : null, company: config.company } });
  await audit(db, "legal.save_draft", "cms_document", id, null, { documentId: data.documentId });
  return { ok: true };
});

export const publishLegalDocument = createServerFn({ method: "POST" }).inputValidator((input: unknown) => configInput.extend({ documentId: z.enum(LEGAL_DOCUMENTS) }).parse(input)).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as AdminCtx);
  const config = sanitizeLegalCenter(data.config);
  const { draftRow, publishedRow } = await readRows(db);
  const draftId = await writeDraft(db, draftRow?.id, config);
  const current = publishedRow ? sanitizePublishedLegalCenter(publishedRow.data?.["published"]) : EMPTY_PUBLISHED;
  const publishedAt = new Date().toISOString();
  const next = { company: config.company, documents: { ...current.documents, [data.documentId]: { ...config.documents[data.documentId], publishedAt } } };
  const payload = { key: PUBLISHED_KEY, kind: KIND, status: "PUBLISHED", visible: true, published_at: publishedAt, data: { published: next } };
  if (publishedRow) { const { error } = await db.from("cms_documents").update(payload).eq("id", publishedRow.id); if (error) throw new Error(error.message); }
  else { const { error } = await db.from("cms_documents").insert(payload); if (error) throw new Error(error.message); }
  await db.from("cms_versions").insert({ document_id: draftId, created_by: (context as AdminCtx).userId, snapshot: { event: "publish", documentId: data.documentId, document: config.documents[data.documentId], company: config.company } });
  await audit(db, "legal.publish", "cms_document", draftId, null, { documentId: data.documentId });
  return { ok: true, publishedAt };
});

export const unpublishLegalDocument = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ documentId: z.enum(LEGAL_DOCUMENTS) }).parse(input)).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  const db = await adminDb(context as AdminCtx);
  const { publishedRow } = await readRows(db);
  if (!publishedRow) return { ok: true };
  const current = sanitizePublishedLegalCenter(publishedRow.data?.["published"]);
  const documents = { ...current.documents };
  delete documents[data.documentId as LegalDocumentId];
  const { error } = await db.from("cms_documents").update({ data: { published: { ...current, documents } } }).eq("id", publishedRow.id);
  if (error) throw new Error(error.message);
  await audit(db, "legal.unpublish", "cms_document", publishedRow.id, null, { documentId: data.documentId });
  return { ok: true };
});

const translateInput = z.object({
  title: z.string().max(200),
  body: z.string().min(1).max(40000),
  targets: z.array(z.enum(UI_LOCALES)).min(1).max(13),
});

/** Admin-only. Translates the Turkish master once at edit time; results are stored in the draft, never at runtime. */
export const translateLegalDocument = createServerFn({ method: "POST" }).inputValidator((input: unknown) => translateInput.parse(input)).middleware([requireSupabaseAuth]).handler(async ({ context, data }) => {
  await adminDb(context as AdminCtx);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Çeviri servisi kullanılamıyor.");
  const targets = data.targets.filter((t) => t !== "tr");
  const out: Record<string, { title: string; body: string }> = {};
  // One request per language keeps long legal texts within output limits.
  await Promise.all(targets.map(async (target) => {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: "You translate legal website documents from Turkish. Translate faithfully and formally; do not add, remove or invent facts, names, addresses, numbers or legal claims. Keep the exact lightweight markup: lines starting with '# ', '## ', '### ', '- ', '1. ', '---', **bold**, *italic*, [text](url). Never translate URLs, e-mail addresses or the brand name pasaport.io. Translate the marker 'Eksik bilgi' as 'missing information' in the target language. Return JSON with keys title and body only.",
        input: `Target language code: ${target}\nTitle: ${JSON.stringify(data.title)}\nBody:\n${data.body}`,
        text: { format: { type: "json_schema", name: "translation", strict: true, schema: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } } },
      }),
    });
    if (res.status === 429) throw new Error("Çeviri servisi yoğun, biraz sonra tekrar deneyin.");
    if (res.status === 402) throw new Error("Çeviri kredisi tükendi.");
    if (!res.ok) throw new Error("Çeviri başarısız oldu.");
    const json: any = await res.json();
    const textOut: string = json?.output_text ?? (json?.output ?? []).flatMap((o: any) => o?.content ?? []).map((c: any) => c?.text ?? "").join("");
    let parsed: any = {};
    try { parsed = JSON.parse(textOut); } catch { throw new Error("Çeviri yanıtı okunamadı."); }
    if (typeof parsed.body === "string" && parsed.body.trim()) out[target] = { title: String(parsed.title ?? "").slice(0, 200), body: parsed.body.replace(/<[^>]*>/g, "").slice(0, 40000) };
  }));
  return { translations: out };
});
