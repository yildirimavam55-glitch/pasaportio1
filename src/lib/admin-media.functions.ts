import { collectMediaUsage, denyFinalMediaDeletion } from "./v2-builder-safety";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";

/**
 * Media library. Files live in the private "media" bucket; Admin and the
 * storefront only ever receive time-limited signed URLs — never raw paths.
 */

export const MEDIA_CATEGORIES = [
  "GLOBAL",
  "ESIM",
  "LOUNGE",
  "HERO",
  "DESTINATION",
  "AIRPORT",
  "CAMPAIGN",
  "CROSS_SELL",
] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];
export const MEDIA_USAGE = ["BOTH", "DESKTOP", "MOBILE"] as const;

const SIGNED_TTL = 60 * 60 * 6;

async function signed(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("media").createSignedUrls(paths, SIGNED_TTL);
  const map = new Map<string, string>();
  for (const row of data ?? []) if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  return map;
}

export type MediaAsset = {
  id: string;
  label: string;
  category: MediaCategory;
  usage: string;
  altText: string;
  focalX: number;
  focalY: number;
  sizeBytes: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: string;
  url: string | null;
};

async function decorate(rows: any[]): Promise<MediaAsset[]> {
  const urls = await signed(rows.map((row) => row.storage_path));
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    category: row.category,
    usage: row.usage,
    altText: row.alt_text ?? "",
    focalX: Number(row.focal_x ?? 50),
    focalY: Number(row.focal_y ?? 50),
    sizeBytes: row.size_bytes,
    mimeType: row.mime_type,
    width: row.width ?? null,
    height: row.height ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    url: urls.get(row.storage_path) ?? null,
  }));
}

export const listMedia = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string; category?: string } | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    let query = db.from("media_assets").select("*").order("created_at", { ascending: false }).limit(300);
    if (data.category && data.category !== "ALL") query = query.eq("category", data.category);
    if (data.search) query = query.or(`label.ilike.%${data.search}%,alt_text.ilike.%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return decorate(rows ?? []);
  });

export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      label: string;
      category: MediaCategory;
      usage: string;
      altText: string;
      fileName: string;
      contentType: string;
      base64: string;
      width?: number | null;
      height?: number | null;
      tags?: string[];
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    if (!/^image\/(png|jpeg|jpg|webp|avif|svg\+xml)$/.test(data.contentType)) {
      throw new Error("Yalnızca görsel dosyaları yüklenebilir.");
    }
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Dosya 10 MB sınırını aşıyor.");

    const extension = (data.fileName.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${data.category.toLowerCase()}/${crypto.randomUUID()}.${extension || "jpg"}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: inserted, error } = await db
      .from("media_assets")
      .insert({
        label: String(data.label || data.fileName).slice(0, 160),
        storage_path: path,
        public_url: path,
        category: (MEDIA_CATEGORIES as readonly string[]).includes(data.category) ? data.category : "GLOBAL",
        usage: (MEDIA_USAGE as readonly string[]).includes(data.usage) ? data.usage : "BOTH",
        alt_text: String(data.altText ?? "").slice(0, 300),
        mime_type: data.contentType,
        size_bytes: bytes.byteLength,
        width: data.width && Number.isFinite(Number(data.width)) ? Math.round(Number(data.width)) : null,
        height: data.height && Number.isFinite(Number(data.height)) ? Math.round(Number(data.height)) : null,
        tags: (data.tags ?? []).map((tag) => String(tag).slice(0, 40)).filter(Boolean).slice(0, 12),
        created_by: (context as AdminCtx).userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await audit(db, "media.upload", "media_asset", inserted.id, null, { label: inserted.label, category: inserted.category });
    return (await decorate([inserted]))[0]!;
  });

export const updateMedia = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      label?: string;
      altText?: string;
      category?: MediaCategory;
      usage?: string;
      focalX?: number;
      focalY?: number;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: before } = await db.from("media_assets").select("*").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("Medya bulunamadı.");
    const patch: Record<string, unknown> = {};
    if (data.label != null) patch["label"] = String(data.label).slice(0, 160);
    if (data.altText != null) patch["alt_text"] = String(data.altText).slice(0, 300);
    if (data.category && (MEDIA_CATEGORIES as readonly string[]).includes(data.category)) patch["category"] = data.category;
    if (data.usage && (MEDIA_USAGE as readonly string[]).includes(data.usage)) patch["usage"] = data.usage;
    if (data.focalX != null) patch["focal_x"] = Math.min(100, Math.max(0, Number(data.focalX)));
    if (data.focalY != null) patch["focal_y"] = Math.min(100, Math.max(0, Number(data.focalY)));

    const { data: after, error } = await db.from("media_assets").update(patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    await audit(db, "media.update", "media_asset", data.id, { label: before.label, category: before.category }, patch);
    return (await decorate([after]))[0]!;
  });

/** Final deletion stays blocked until a reviewed cross-database/Storage protocol exists. */
export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: input?.id }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await adminDb(context as AdminCtx);
    // No environment flag, request parameter, scan result or client action can enable deletion.
    // Do not import Storage or read/delete media records on this blocked path.
    return denyFinalMediaDeletion();
  });

export const getMediaUsage = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: asset, error } = await db.from("media_assets").select("id, storage_path, public_url").eq("id", data.id).maybeSingle();
    if (error || !asset) throw new Error("E_MEDIA_READ");
    return { places: await collectMediaUsage(db, asset) };
  });

