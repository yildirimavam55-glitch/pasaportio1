import { assertClaimApprovals,claimApprovalsFromEnvironment } from "./builder-claims.server";
import { atomicBuilderEnabled,readBuilder,writeBuilder,publicContentSelection,type BuilderRevision } from "./builder-persistence.server";
import { restoreV2Draft } from "./v2-builder-safety";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import {
  collectV2MediaIds,
  defaultV2Page,
  missingV2Translations,
  sanitizeV2Page,
  withEditorialStarters,
  V2_PAGES,
  type V2PageConfig,
  type V2PageId,
} from "@/domain/storefront/v2";

/**
 * V2 storefront builder persistence on the existing CMS documents/versions foundation.
 * Document data = { draft, published }. Customers only ever read `published`; any
 * missing/invalid data falls back to the built-in approved V2 layout.
 */

/** expiresAt (ms) lets the client keep an unchanged signed URL stable across refetches. */
export type V2Media = Record<string, { url: string; alt: string; expiresAt?: number; width?: number; height?: number }>;
const KIND = "V2_STOREFRONT";
const keyFor = (page: V2PageId) => `storefront_v2_${page}`;
const pageOf = (value: unknown): V2PageId => ((V2_PAGES as readonly string[]).includes(String(value)) ? (value as V2PageId) : "esim");

async function resolveMedia(ids: string[]): Promise<V2Media> {
  if (!ids.length) return {};
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("media_assets").select("id, storage_path, alt_text, width, height").in("id", ids);
    if (!rows?.length) return {};
    const { data: urls } = await supabaseAdmin.storage.from("media").createSignedUrls(rows.map((row: any) => row.storage_path), 60 * 60 * 6);
    const byPath = new Map((urls ?? []).map((row: any) => [row.path, row.signedUrl]));
    const map: V2Media = {};
    const expiresAt = Date.now() + 60 * 60 * 6 * 1000;
    for (const row of rows as any[]) {
      const url = byPath.get(row.storage_path);
      if (url) map[row.id] = { url, alt: row.alt_text ?? "", expiresAt, ...(row.width && row.height ? { width: row.width, height: row.height } : {}) };
    }
    return map;
  } catch {
    return {};
  }
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Public: the live configuration for one V2 page. One request per page; never throws. */
export const getPublishedV2Page = createServerFn({ method: "GET" })
  .inputValidator((input: { page: V2PageId }) => ({ page: pageOf(input?.page) }))
  .handler(async ({ data }): Promise<{ config: V2PageConfig; media: V2Media; refreshFailed?: boolean }> => {
    try {
      const { data: row, error } = await publicClient().from("cms_documents").select(publicContentSelection()).eq("key", keyFor(data.page)).eq("status", "PUBLISHED").maybeSingle();
      if (error) throw new Error("Published storefront temporarily unavailable");
      const published = ((row as any)?.data as any)?.published;
      const sanitized = sanitizeV2Page(published ?? defaultV2Page(data.page), data.page);
      const config = {
        ...sanitized,
        sections: sanitized.sections.map((section) => section.type === "TRUST_REVIEWS"
          ? { ...section, showDemoReviews: false, items: section.items.filter((item) => item.cardType !== "review" || (item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED")) }
          : section),
      };
      return { config, media: await resolveMedia(collectV2MediaIds(config)) };
    } catch {
      const fallback = defaultV2Page(data.page);
      return { config: { ...fallback, sections: fallback.sections.map((section) => section.type === "TRUST_REVIEWS" ? { ...section, showDemoReviews: false, items: section.items.filter((item) => item.cardType !== "review") } : section) }, media: {}, refreshFailed: true };
    }
  });

/** Admin: status of every V2 page for the Storefront overview. */
export const getV2Overview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: rows } = await db.from("cms_documents").select("key, status, published_at, updated_at, data").in("key", V2_PAGES.map(keyFor));
    return V2_PAGES.map((page) => {
      const row = (rows ?? []).find((r: any) => r.key === keyFor(page));
      const publishedRaw = (row?.data as any)?.published ?? null;
      const draftRaw = (row?.data as any)?.draft ?? publishedRaw;
      const draft = sanitizeV2Page(draftRaw, page);
      return {
        page,
        customized: Boolean(publishedRaw),
        hasDraftChanges: JSON.stringify(draftRaw ?? null) !== JSON.stringify(publishedRaw ?? null),
        publishedAt: row?.published_at ?? null,
        updatedAt: row?.updated_at ?? null,
        sections: draft.sections.length,
        hidden: draft.sections.filter((s) => !s.visible).length,
        missingDe: missingV2Translations(draft, "de"),
        missingEn: missingV2Translations(draft, "en"),
      };
    });
  });

/** Admin: draft + published + version history for one V2 page. */
export const getV2PageEditor = createServerFn({ method: "GET" })
  .inputValidator((input: { page: V2PageId }) => ({ page: pageOf(input?.page) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    if(atomicBuilderEnabled()){
      const row=await readBuilder(context as AdminCtx,keyFor(data.page));
      return {page:data.page,draft:sanitizeV2Page(row.draft??row.published,data.page),published:row.published?sanitizeV2Page(row.published,data.page):null,revision:row.revision as BuilderRevision,hasDraftChanges:JSON.stringify(row.draft)!==JSON.stringify(row.published),publishedAt:row.publishedAt,updatedAt:row.updatedAt,versions:row.versions as Array<{id:string;createdAt:string;event:string;author:string;sections:number}>};
    }
    const { data: row } = await db.from("cms_documents").select("id, published_at, updated_at, data").eq("key", keyFor(data.page)).maybeSingle();
    let versions: Array<{ id: string; createdAt: string; event: string; author: string; sections: number }> = [];
    if (row?.id) {
      const { data: history } = await db.from("cms_versions").select("id, created_at, created_by, snapshot").eq("document_id", row.id).order("created_at", { ascending: false }).limit(30);
      versions = (history ?? []).map((v: any) => ({
        id: v.id,
        createdAt: v.created_at,
        event: v.snapshot?.event ?? "draft",
        author: v.snapshot?.author ?? "Yönetici",
        sections: Array.isArray(v.snapshot?.config?.sections) ? v.snapshot.config.sections.length : 0,
      }));
    }
    const publishedRaw = (row?.data as any)?.published ?? null;
    const draftRaw = (row?.data as any)?.draft ?? publishedRaw;
    return {
      revision: undefined as BuilderRevision|undefined,
      page: data.page,
      draft: data.page === "esim" ? withEditorialStarters(sanitizeV2Page(draftRaw, data.page)) : sanitizeV2Page(draftRaw, data.page),
      published: publishedRaw ? sanitizeV2Page(publishedRaw, data.page) : null,
      hasDraftChanges: JSON.stringify(draftRaw ?? null) !== JSON.stringify(publishedRaw ?? null),
      publishedAt: row?.published_at ?? null,
      updatedAt: row?.updated_at ?? null,
      versions,
    };
  });

async function upsert(db: any, page: V2PageId, patch: Record<string, unknown>) {
  const { data: existing, error: readError } = await db.from("cms_documents").select("id").eq("key", keyFor(page)).maybeSingle();
  if (readError) throw new Error("E_CMS_READ");
  const payload = { key: keyFor(page), kind: KIND, visible: true, sort_order: 0, ...patch };
  if (existing?.id) {
    const { error } = await db.from("cms_documents").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id as string;
  }
  const { data: inserted, error } = await db.from("cms_documents").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return inserted.id as string;
}

async function authorLabel(context: AdminCtx) {
  try {
    const { data } = await context.supabase.auth.getUser();
    return data?.user?.email ?? "Yönetici";
  } catch {
    return "Yönetici";
  }
}

function summarize(before: V2PageConfig | null, after: V2PageConfig) {
  const b = new Map((before?.sections ?? []).map((s) => [s.id, JSON.stringify(s)]));
  const changed = after.sections.filter((s) => b.get(s.id) !== JSON.stringify(s)).map((s) => s.id);
  const removed = [...b.keys()].filter((id) => !after.sections.some((s) => s.id === id));
  const reordered = before ? before.sections.map((s) => s.id).join() !== after.sections.map((s) => s.id).filter((id) => b.has(id)).join() : false;
  return { changed, removed, reordered };
}

export const saveV2Page = createServerFn({ method: "POST" })
  .inputValidator((input: { page: V2PageId; config: unknown; publish?: boolean; expectedRevision?:BuilderRevision }) => ({ page: (()=>{if(!V2_PAGES.includes(input?.page))throw new Error("E_CMS_PAGE");return input.page;})(), config: input?.config, publish: Boolean(input?.publish),expectedRevision:input.expectedRevision }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const config = sanitizeV2Page(data.config, data.page);
    if(data.publish)assertClaimApprovals(config,claimApprovalsFromEnvironment());
    if(atomicBuilderEnabled()){await writeBuilder(ctx,keyFor(data.page),data.expectedRevision,data.publish?'publish':'draft',config);return {ok:true,published:data.publish};}
    const { data: current, error: readError } = await db.from("cms_documents").select("data, published_at").eq("key", keyFor(data.page)).maybeSingle();
    if (readError) throw new Error("E_CMS_READ");
    const prevDraftRaw = (current?.data as any)?.draft ?? (current?.data as any)?.published ?? null;
    const before = prevDraftRaw ? sanitizeV2Page(prevDraftRaw, data.page) : defaultV2Page(data.page);
    const published = data.publish ? config : ((current?.data as any)?.published ?? null);
    const id = await upsert(db, data.page, {
      status: published ? "PUBLISHED" : "DRAFT",
      published_at: data.publish ? new Date().toISOString() : (current?.published_at ?? null),
      data: { draft: config, published },
    });
    const changes = summarize(before, config);
    const { error: versionError } = await db.from("cms_versions").insert({ document_id: id, created_by: ctx.userId, snapshot: { config, event: data.publish ? "publish" : "draft", page: data.page, author: await authorLabel(ctx), changes } });
    if (versionError) throw new Error("E_CMS_PARTIAL_WRITE_VERSION: Belge değişmiş olabilir; yeniden yükleyip geçmişi kontrol edin.");
    try {
      await audit(db, data.publish ? "storefront_v2.publish" : "storefront_v2.save_draft", "storefront_v2", id, null, { page: data.page, ...changes });
    } catch {
      throw new Error("E_CMS_PARTIAL_WRITE_AUDIT: Belge ve sürüm değişmiş olabilir; yeniden yükleyin.");
    }
    return { ok: true, published: data.publish };
  });

export const discardV2Draft = createServerFn({ method: "POST" })
  .inputValidator((input: { page: V2PageId;expectedRevision?:BuilderRevision }) => ({ page: pageOf(input?.page),expectedRevision:input.expectedRevision }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    if(atomicBuilderEnabled()){await writeBuilder(context as AdminCtx,keyFor(data.page),data.expectedRevision,"discard",defaultV2Page(data.page));return {ok:true};}
    const { data: row } = await db.from("cms_documents").select("id, data").eq("key", keyFor(data.page)).maybeSingle();
    if (!row?.id) return { ok: true };
    const published = (row.data as any)?.published ?? null;
    const { error } = await db.from("cms_documents").update({ data: { draft: published, published } }).eq("id", row.id);
    if (error) throw new Error(error.message);
    await audit(db, "storefront_v2.discard_draft", "storefront_v2", row.id, null, { page: data.page });
    return { ok: true };
  });

/** Restore only the draft; publication remains a separate Admin action. */
export const restoreV2Version = createServerFn({ method: "POST" })
  .inputValidator((input: { page: V2PageId; versionId: string; expectedRevision?:BuilderRevision }) => {
    if (!(V2_PAGES as readonly string[]).includes(input?.page) || !/^[0-9a-f-]{36}$/i.test(input?.versionId ?? "")) throw new Error("E_RESTORE_VERSION");
    return { page: input.page, versionId: input.versionId,expectedRevision:input.expectedRevision };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    if(atomicBuilderEnabled()){await writeBuilder(ctx,keyFor(data.page),data.expectedRevision,'restore',undefined,data.versionId);return {ok:true};}
    const { id, config } = await restoreV2Draft(db, data.page, data.versionId, value => sanitizeV2Page(value, data.page));
    const { error: versionError } = await db.from("cms_versions").insert({ document_id: id, created_by: ctx.userId, snapshot: { config, event: "restore", page: data.page, author: await authorLabel(ctx), restoredFrom: data.versionId } });
    if (versionError) throw new Error("E_CMS_PARTIAL_WRITE_VERSION: Taslak değişmiş olabilir; yeniden yükleyin.");
    try {
      await audit(db, "storefront_v2.restore_draft", "storefront_v2", id, null, { page: data.page, versionId: data.versionId });
    } catch {
      throw new Error("E_CMS_PARTIAL_WRITE_AUDIT: Taslak ve sürüm değişmiş olabilir; yeniden yükleyin.");
    }
    return { ok: true };
  });
