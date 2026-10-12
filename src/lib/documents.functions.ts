/**
 * Admin → Belgeler (PDF): template management + preview with synthetic data only.
 * Admin role verified first in every handler. Nothing is issued, numbered, stored as a
 * customer document, or sent. No customer, order or supplier data is ever read here.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { DOCUMENT_KINDS, DOCUMENT_LOCALES, sampleData, type DocumentKind, type DocumentLabels, type DocumentLocale } from "@/domain/documents/catalog";
import {
  diffPdfBundle, labelsForRenderer, parsePdfBundle, PDF_EXPORT_FORMAT, PDF_EXPORT_VERSION, seedPdfBundle, validateLabels, validateSnapshot,
  type PdfBundle, type PdfBundleTemplate, type PdfSnapshot,
} from "@/domain/documents/transfer";

type Ctx = AdminCtx & { userId: string };
const isKind = (k: unknown): k is DocumentKind => (DOCUMENT_KINDS as readonly string[]).includes(k as string);
const isLocale = (l: unknown): l is DocumentLocale => (DOCUMENT_LOCALES as readonly string[]).includes(l as string);

type Stored = PdfBundleTemplate & { currentVersion: number; updatedAt: string };

async function loadAll(db: any): Promise<Stored[]> {
  const [{ data: rows, error: e1 }, { data: tr, error: e2 }] = await Promise.all([
    db.from("pdf_templates").select("kind, name, description, active, current_version, updated_at"),
    db.from("pdf_template_translations").select("template_kind, locale, labels, draft"),
  ]);
  if (e1 || e2) throw new Error("PDF şablonları okunamadı.");
  return (rows ?? [])
    .sort((a: any, b: any) => DOCUMENT_KINDS.indexOf(a.kind) - DOCUMENT_KINDS.indexOf(b.kind))
    .map((r: any) => ({
      kind: r.kind, name: r.name, description: r.description ?? "", active: r.active,
      currentVersion: r.current_version, updatedAt: r.updated_at,
      translations: Object.fromEntries((tr ?? []).filter((t: any) => t.template_kind === r.kind).map((t: any) => [t.locale, { labels: t.labels, draft: t.draft }])),
    }));
}

async function writeVersion(db: any, userId: string, kind: DocumentKind, snap: PdfSnapshot, note: string, restoredFrom: number | null) {
  const { data: existing } = await db.from("pdf_templates").select("current_version").eq("kind", kind).maybeSingle();
  const { data: last } = await db.from("pdf_template_versions").select("version").eq("template_kind", kind).order("version", { ascending: false }).limit(1);
  const next = Math.max(existing?.current_version ?? 0, last?.[0]?.version ?? 0) + 1;
  const meta = { name: snap.name, description: snap.description, active: snap.active, current_version: next, updated_by: userId };
  const up = existing ? await db.from("pdf_templates").update(meta).eq("kind", kind) : await db.from("pdf_templates").insert({ kind, ...meta });
  if (up.error) throw new Error("Şablon kaydedilemedi.");
  const locales = Object.keys(snap.translations) as DocumentLocale[];
  const { error } = await db.from("pdf_template_translations").upsert(
    locales.map((locale) => ({ template_kind: kind, locale, labels: snap.translations[locale]!.labels, draft: snap.translations[locale]!.draft, updated_by: userId })),
    { onConflict: "template_kind,locale" },
  );
  if (error) throw new Error("Çeviriler kaydedilemedi.");
  const removed = DOCUMENT_LOCALES.filter((l) => !locales.includes(l));
  if (removed.length) await db.from("pdf_template_translations").delete().eq("template_kind", kind).in("locale", removed);
  const { error: ve } = await db.from("pdf_template_versions").insert({
    template_kind: kind, version: next, snapshot: snap, change_note: note.slice(0, 300), restored_from: restoredFrom, created_by: userId,
  });
  if (ve) throw new Error("Sürüm kaydı yazılamadı.");
  return next;
}

function cleanSnapshot(s: any): PdfSnapshot {
  if (!s || typeof s !== "object" || typeof s.translations !== "object") throw new Error("Geçersiz şablon verisi.");
  const snap: PdfSnapshot = { name: String(s.name ?? "").trim(), description: String(s.description ?? ""), active: !!s.active, translations: {} };
  for (const [l, t] of Object.entries(s.translations ?? {})) {
    if (!isLocale(l)) throw new Error(`Geçersiz dil: ${l}`);
    snap.translations[l] = { labels: (t as any)?.labels, draft: !!(t as any)?.draft };
  }
  const errors = validateSnapshot(snap);
  if (errors.length) throw new Error(errors.slice(0, 10).join(" · "));
  return snap;
}

export const listPdfTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    return { templates: await loadAll(db), issuingEnabled: false as const };
  });

export const getPdfTemplateVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string }) => {
    if (!isKind(input?.kind)) throw new Error("Geçersiz belge türü.");
    return { kind: input.kind };
  })
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { data: rows, error } = await db.from("pdf_template_versions")
      .select("version, change_note, restored_from, created_at").eq("template_kind", data.kind).order("version", { ascending: false }).limit(50);
    if (error) throw new Error("Sürüm geçmişi okunamadı.");
    return { versions: rows ?? [] };
  });

export const savePdfTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; snapshot: PdfSnapshot; note?: string }) => {
    if (!isKind(input?.kind)) throw new Error("Geçersiz belge türü.");
    return { kind: input.kind, snapshot: cleanSnapshot(input.snapshot), note: String(input.note ?? "") };
  })
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const before = (await loadAll(db)).find((t) => t.kind === data.kind);
    const version = await writeVersion(db, ctx.userId, data.kind, data.snapshot, data.note || "Düzenleme", null);
    await audit(db, "pdf_template.update", "pdf_template", data.kind, before ? { version: before.currentVersion } : null, { version, locales: Object.keys(data.snapshot.translations) });
    return { version };
  });

export const restorePdfTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; version: number }) => {
    if (!isKind(input?.kind) || !Number.isInteger(input?.version) || input.version < 1) throw new Error("Geçersiz sürüm.");
    return input as { kind: DocumentKind; version: number };
  })
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const { data: row } = await db.from("pdf_template_versions").select("snapshot").eq("template_kind", data.kind).eq("version", data.version).maybeSingle();
    if (!row) throw new Error("Sürüm bulunamadı.");
    const version = await writeVersion(db, ctx.userId, data.kind, cleanSnapshot(row.snapshot), `Sürüm ${data.version} geri yüklendi`, data.version);
    await audit(db, "pdf_template.restore", "pdf_template", data.kind, { restoredFrom: data.version }, { version });
    return { version };
  });

export const exportPdfTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const bundle: PdfBundle = {
      format: PDF_EXPORT_FORMAT, version: PDF_EXPORT_VERSION, exportedAt: new Date().toISOString(),
      templates: (await loadAll(db)).map(({ currentVersion: _v, updatedAt: _u, ...t }) => t),
    };
    await audit(db, "pdf_template.export", "pdf_template", null, null, { count: bundle.templates.length });
    return bundle;
  });

function bundleFromInput(input: { json?: string; useSeed?: boolean }) {
  if (input?.useSeed) return parsePdfBundle(seedPdfBundle());
  const raw = input?.json;
  if (typeof raw !== "string") return { bundle: null, errors: ["Dosya yok."] };
  if (raw.length > 1_000_000) return { bundle: null, errors: ["Dosya çok büyük (en fazla 1 MB)."] };
  try { return parsePdfBundle(JSON.parse(raw)); } catch { return { bundle: null, errors: ["Geçerli bir JSON dosyası değil."] }; }
}

export const previewPdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json?: string; useSeed?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { bundle, errors } = bundleFromInput(data);
    if (!bundle) return { ok: false as const, errors, changes: [] };
    return { ok: true as const, errors: [], changes: diffPdfBundle(await loadAll(db), bundle) };
  });

export const applyPdfImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json?: string; useSeed?: boolean; onlyMissing?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const { bundle, errors } = bundleFromInput(data);
    if (!bundle) throw new Error(errors.join(" · "));
    const changes = diffPdfBundle(await loadAll(db), bundle);
    const applied: string[] = [];
    for (const t of bundle.templates) {
      const c = changes.find((x) => x.kind === t.kind)!;
      if (c.change === "unchanged" || (data.onlyMissing && c.change !== "new")) continue;
      const { kind, ...snap } = t;
      await writeVersion(db, ctx.userId, kind, snap, data.useSeed ? "Başlangıç şablonu (kod yedeği)" : "JSON içe aktarma", null);
      applied.push(kind);
    }
    await audit(db, data.useSeed ? "pdf_template.seed" : "pdf_template.import", "pdf_template", null, null, { applied });
    return { applied };
  });

/** Renders a synthetic sample. Optional `labels` previews unsaved edits for one locale. */
export const previewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; locale: string; labels?: unknown }) => {
    if (!isKind(input?.kind)) throw new Error("Geçersiz belge türü.");
    if (!isLocale(input?.locale)) throw new Error("Geçersiz dil.");
    if (input.labels !== undefined) {
      const errs = validateLabels(input.labels);
      if (errs.length) throw new Error(errs.slice(0, 5).join(" · "));
    }
    return { kind: input.kind, locale: input.locale, labels: input.labels as DocumentLabels | undefined };
  })
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const stored = (await loadAll(db)).find((t) => t.kind === data.kind);
    const byLocale = { ...labelsForRenderer(stored) };
    if (data.labels) byLocale[data.locale] = data.labels;
    const { renderDocument } = await import("@/domain/documents/render");
    const { loadDocumentFonts } = await import("@/domain/documents/fonts.server");
    const result = await renderDocument(data.kind, data.locale, sampleData(data.kind), await loadDocumentFonts(), byLocale);
    let bin = "";
    for (let i = 0; i < result.bytes.length; i++) bin += String.fromCharCode(result.bytes[i]!);
    return { base64: btoa(bin), locale: result.locale, fallback: result.fallback, pages: result.pages, size: result.bytes.length, source: stored ? "database" as const : "seed" as const };
  });
