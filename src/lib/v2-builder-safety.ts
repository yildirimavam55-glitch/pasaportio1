/** Server-side orchestration, dependency-injected for credential-free safety tests. */
export async function restoreV2Draft(db: any, page: string, versionId: string, sanitize: (value: unknown) => unknown) {
  if (!["esim", "lounge", "vignette"].includes(page) || !versionId) throw new Error("E_RESTORE_VERSION");
  const current = await db.from("cms_documents").select("id, data, updated_at").eq("key", `storefront_v2_${page}`).maybeSingle();
  if (current.error || !current.data?.id || !current.data.updated_at) throw new Error("E_RESTORE_DOCUMENT");
  const version = await db.from("cms_versions").select("id, document_id, snapshot").eq("id", versionId).eq("document_id", current.data.id).maybeSingle();
  if (version.error || !version.data || version.data.document_id !== current.data.id || version.data.snapshot?.page !== page || !Array.isArray(version.data.snapshot?.config?.sections)) throw new Error("E_RESTORE_VERSION");
  const config = sanitize(version.data.snapshot.config);
  // Only data.draft changes. Never write status, published_at, or data.published.
  // This compare-and-swap protects this read/write interval, not a stale editor session.
  const result = await db.from("cms_documents").update({ data: { ...current.data.data, draft: config } }).eq("id", current.data.id).eq("updated_at", current.data.updated_at).select("id").maybeSingle();
  if (result.error || !result.data?.id) throw new Error("E_RESTORE_CONFLICT");
  return { id: current.data.id as string, config };
}

/** All known marketing reference locations in the checked-in baseline, not the 300-item library page. */
export const MEDIA_REFERENCE_SOURCES = [
  ["destination_content", "id, media_id, mobile_media_id, content"],
  ["airport_content", "id, media_id, mobile_media_id, content"],
  ["route_presets", "id, media_id, mobile_media_id, content"],
  ["campaigns", "id, media_id, mobile_media_id, content"],
  ["guides", "id, hero_media_id, hero_image_url"],
  ["guide_translations", "id, sections, faq, city_facts"],
  ["cms_documents", "id, data"],
  ["cms_translations", "id, data"],
  ["cms_versions", "id, snapshot"],
  ["theme_settings", "id, draft, published"],
  ["media_assets", "id, storage_path, public_url"],
] as const;

const PAGE_SIZE = 100;
const MAX_ROWS = 10_000;

/** Count-checked pagination fails closed on permission errors, truncation, limits and changing counts. */
export async function collectMediaUsage(db: any, asset: { id: string; storage_path: string; public_url?: string | null }) {
  if (!/^[0-9a-f-]{36}$/i.test(asset.id) || !asset.storage_path) throw new Error("E_MEDIA_IDENTITY");
  const needles = [asset.id, asset.storage_path, encodeURIComponent(asset.storage_path), asset.public_url].filter((v): v is string => Boolean(v));
  const places: string[] = [];
  for (const [table, columns] of MEDIA_REFERENCE_SOURCES) {
    let expected: number | undefined;
    let scannedChars = 0;
    const seen = new Set<string>();
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await db.from(table).select(columns, { count: "exact" }).order("id", { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
      if (result.error || !Array.isArray(result.data) || !Number.isSafeInteger(result.count) || result.count < 0 || result.count > MAX_ROWS) throw new Error("E_MEDIA_USAGE_INCOMPLETE");
      if (expected !== undefined && expected !== result.count) throw new Error("E_MEDIA_USAGE_CHANGED");
      expected = result.count;
      for (const row of result.data) {
        if (typeof row.id !== "string" || seen.has(row.id)) throw new Error("E_MEDIA_USAGE_INCOMPLETE");
        seen.add(row.id);
        if (table === "media_assets" && row.id === asset.id) continue;
        const serialized = JSON.stringify(row);
        scannedChars += serialized.length;
        if (scannedChars > 20_000_000) throw new Error("E_MEDIA_USAGE_INCOMPLETE");
        if (needles.some(needle => serialized.includes(needle))) places.push(`${table} · ${row.id}`);
      }
      if (seen.size === expected) break;
      if (!result.data.length || seen.size > expected || offset + PAGE_SIZE >= MAX_ROWS) throw new Error("E_MEDIA_USAGE_INCOMPLETE");
    }
  }
  return places;
}

/** Storage and Postgres are not one transaction. Errors must never report successful deletion. */
export async function removeUnusedMedia(asset: { id: string; storage_path: string }, usage: string[], removeStorage: () => Promise<{ error: unknown }>, removeRecord: () => Promise<{ error: unknown; data: unknown }>) {
  if (!asset.id || !asset.storage_path) throw new Error("E_MEDIA_IDENTITY");
  if (usage.length) throw new Error("Görsel kullanılıyor. Önce ilgili sayfa, taslak, tema veya sürümde değiştirin.");
  const storage = await removeStorage();
  if (storage.error) throw new Error("E_MEDIA_STORAGE_REMOVE");
  const record = await removeRecord();
  if (record.error || !record.data) throw new Error("E_MEDIA_RECORD_REMOVE_AFTER_STORAGE");
  return { ok: true };
}
