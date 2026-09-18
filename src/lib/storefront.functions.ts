import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import {
  defaultStorefront,
  sanitizeStorefront,
  STOREFRONT_SERVICES,
  type StorefrontConfig,
  type StorefrontService,
} from "@/domain/storefront/registry";

/**
 * Storefront editor persistence on the existing CMS foundation.
 * The document data holds { draft, published } — the public site only ever
 * reads `published`, and falls back to the built-in layout when anything is
 * missing or invalid, so an editing mistake can never break the homepage.
 */

const SIGNED_TTL = 60 * 60 * 6;
const keyFor = (service: StorefrontService) => `storefront_${service}`;
const kindFor = (service: StorefrontService) =>
  service === "esim" ? "ESIM_CONTENT" : service === "lounge" ? "LOUNGE_CONTENT" : "GLOBAL_CONTENT";

export type StorefrontMedia = Record<string, { url: string; alt: string; focalX: number; focalY: number }>;

function collectMediaIds(config: StorefrontConfig): string[] {
  const ids = new Set<string>();
  for (const section of config.sections) {
    if (section.mediaId) ids.add(section.mediaId);
    if (section.mobileMediaId) ids.add(section.mobileMediaId);
    for (const item of section.items) {
      if (item.mediaId) ids.add(item.mediaId);
      if (item.mobileMediaId) ids.add(item.mobileMediaId);
    }
  }
  return [...ids];
}

/** Signed URLs for published marketing images only — the bucket stays private. */
async function resolveMedia(ids: string[]): Promise<StorefrontMedia> {
  if (!ids.length) return {};
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("media_assets")
      .select("id, storage_path, alt_text, focal_x, focal_y")
      .in("id", ids);
    if (!rows?.length) return {};
    const { data: urls } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrls(rows.map((row: any) => row.storage_path), SIGNED_TTL);
    const byPath = new Map((urls ?? []).map((row: any) => [row.path, row.signedUrl]));
    const map: StorefrontMedia = {};
    for (const row of rows as any[]) {
      const url = byPath.get(row.storage_path);
      if (url) map[row.id] = { url, alt: row.alt_text ?? "", focalX: Number(row.focal_x ?? 50), focalY: Number(row.focal_y ?? 50) };
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

/** Public: the live homepage configuration. Never throws. */
export const getPublishedStorefront = createServerFn({ method: "GET" })
  .inputValidator((input: { service: StorefrontService }) => input)
  .handler(async ({ data }): Promise<{ config: StorefrontConfig; media: StorefrontMedia }> => {
    const service = (STOREFRONT_SERVICES as readonly string[]).includes(data.service) ? data.service : "esim";
    try {
      const { data: row } = await publicClient()
        .from("cms_documents")
        .select("data")
        .eq("key", keyFor(service))
        .eq("status", "PUBLISHED")
        .maybeSingle();
      const published = (row?.data as any)?.published;
      if (!published) return { config: defaultStorefront(service), media: {} };
      const config = sanitizeStorefront(published, service);
      return { config, media: await resolveMedia(collectMediaIds(config)) };
    } catch {
      return { config: defaultStorefront(service), media: {} };
    }
  });

/** Admin: draft + published + version history for one service homepage. */
export const getStorefrontEditor = createServerFn({ method: "GET" })
  .inputValidator((input: { service: StorefrontService }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const service = (STOREFRONT_SERVICES as readonly string[]).includes(data.service) ? data.service : "esim";
    const { data: row } = await db
      .from("cms_documents")
      .select("id, status, published_at, updated_at, data")
      .eq("key", keyFor(service))
      .maybeSingle();

    let versions: any[] = [];
    if (row?.id) {
      const { data: history } = await db
        .from("cms_versions")
        .select("id, created_at, created_by, snapshot")
        .eq("document_id", row.id)
        .order("created_at", { ascending: false })
        .limit(20);
      versions = (history ?? []).map((version: any) => ({
        id: version.id,
        createdAt: version.created_at,
        event: version.snapshot?.event ?? "save",
        author: version.snapshot?.authorLabel ?? "Yönetici",
      }));
    }

    const publishedRaw = (row?.data as any)?.published ?? null;
    const draftRaw = (row?.data as any)?.draft ?? publishedRaw;
    return {
      service,
      draft: sanitizeStorefront(draftRaw, service),
      published: publishedRaw ? sanitizeStorefront(publishedRaw, service) : null,
      hasDraftChanges: JSON.stringify(draftRaw ?? null) !== JSON.stringify(publishedRaw ?? null),
      publishedAt: row?.published_at ?? null,
      updatedAt: row?.updated_at ?? null,
      versions,
    };
  });

async function upsertDocument(db: any, service: StorefrontService, patch: Record<string, unknown>) {
  const { data: existing } = await db.from("cms_documents").select("id, data, status, published_at").eq("key", keyFor(service)).maybeSingle();
  const payload = {
    key: keyFor(service),
    kind: kindFor(service),
    visible: true,
    ...patch,
  };
  if (existing?.id) {
    const { error } = await db.from("cms_documents").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id as string, existing };
  }
  const { data: inserted, error } = await db.from("cms_documents").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: inserted.id as string, existing: null };
}

export const saveStorefrontDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { service: StorefrontService; config: StorefrontConfig; publish?: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const service = (STOREFRONT_SERVICES as readonly string[]).includes(data.service) ? data.service : "esim";
    const config = sanitizeStorefront(data.config, service);

    const { data: current } = await db.from("cms_documents").select("data").eq("key", keyFor(service)).maybeSingle();
    const published = data.publish ? config : ((current?.data as any)?.published ?? null);

    const { id } = await upsertDocument(db, service, {
      status: published ? "PUBLISHED" : "DRAFT",
      sort_order: 0,
      published_at: data.publish ? new Date().toISOString() : undefined,
      data: { draft: config, published },
    });

    /** One consistent snapshot per publish/save so the owner can safely experiment. */
    await db.from("cms_versions").insert({
      document_id: id,
      created_by: (context as AdminCtx).userId,
      snapshot: { config, event: data.publish ? "publish" : "draft", service },
    });
    await audit(db, data.publish ? "storefront.publish" : "storefront.save_draft", "storefront", id, null, {
      service,
      sections: config.sections.length,
    });
    return { ok: true, published: Boolean(data.publish) };
  });

export const discardStorefrontDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { service: StorefrontService }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const service = (STOREFRONT_SERVICES as readonly string[]).includes(data.service) ? data.service : "esim";
    const { data: row } = await db.from("cms_documents").select("id, data").eq("key", keyFor(service)).maybeSingle();
    if (!row?.id) return { ok: true };
    const published = (row.data as any)?.published ?? null;
    const { error } = await db.from("cms_documents").update({ data: { draft: published, published } }).eq("id", row.id);
    if (error) throw new Error(error.message);
    await audit(db, "storefront.discard_draft", "storefront", row.id, null, { service });
    return { ok: true };
  });

export const restoreStorefrontVersion = createServerFn({ method: "POST" })
  .inputValidator((input: { service: StorefrontService; versionId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const service = (STOREFRONT_SERVICES as readonly string[]).includes(data.service) ? data.service : "esim";
    const { data: version } = await db.from("cms_versions").select("id, snapshot").eq("id", data.versionId).maybeSingle();
    if (!version) throw new Error("Sürüm bulunamadı.");
    const config = sanitizeStorefront(version.snapshot?.config, service);
    const { id } = await upsertDocument(db, service, {
      status: "PUBLISHED",
      published_at: new Date().toISOString(),
      data: { draft: config, published: config },
    });
    await db.from("cms_versions").insert({
      document_id: id,
      created_by: (context as AdminCtx).userId,
      snapshot: { config, event: "restore", service },
    });
    await audit(db, "storefront.restore", "storefront", id, null, { service, versionId: data.versionId });
    return { ok: true };
  });
