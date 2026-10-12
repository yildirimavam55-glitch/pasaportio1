/**
 * Portable PDF template format (export, import, code seed) and label validation.
 * Labels are plain text drawn by the PDF renderer — never HTML, never data placeholders.
 */
import { z } from "zod";
import {
  COMPLETE_DOCUMENT_LOCALES, DOCUMENT_KINDS, DOCUMENT_LOCALES, DRAFT_LOCALES, LABEL_KEYS, SEED_LABELS,
  type DocumentKind, type DocumentLabels, type DocumentLocale,
} from "./catalog";

export const PDF_EXPORT_FORMAT = "pasaportio.pdf-templates";
export const PDF_EXPORT_VERSION = 2;
export const LABEL_MAX = 600;

export const KIND_META: Record<DocumentKind, { name: string; description: string }> = {
  invoice: { name: "Fatura", description: "Müşteri faturası. Şirket ve vergi bilgileri girilene kadar yalnız örnek." },
  "order-summary": { name: "Sipariş özeti", description: "Ödeme sonrası sipariş özeti; vergi belgesi değildir." },
  "credit-note": { name: "İade / alacak dekontu", description: "İade ve alacak dekontu; ilgili faturaya bağlanır." },
  "esim-guide": { name: "eSIM kurulum rehberi", description: "QR veya aktivasyon bilgisi içermeyen kurulum rehberi." },
};

export type PdfTranslation = { labels: DocumentLabels; draft: boolean };
export type PdfSnapshot = { name: string; description: string; active: boolean; translations: Partial<Record<DocumentLocale, PdfTranslation>> };
export type PdfBundleTemplate = PdfSnapshot & { kind: DocumentKind };
export type PdfBundle = { format: typeof PDF_EXPORT_FORMAT; version: typeof PDF_EXPORT_VERSION; exportedAt?: string; templates: PdfBundleTemplate[] };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/;

/** Returns problems with one locale's labels (missing/unknown keys, length, control chars). */
export function validateLabels(labels: unknown): string[] {
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) return ["Etiketler bir nesne olmalı."];
  const errors: string[] = [];
  const rec = labels as Record<string, unknown>;
  for (const k of Object.keys(rec)) if (!(LABEL_KEYS as readonly string[]).includes(k)) errors.push(`Bilinmeyen alan: ${k}`);
  for (const k of LABEL_KEYS) {
    const v = rec[k];
    if (typeof v !== "string" || !v.trim()) errors.push(`${k}: boş olamaz.`);
    else if (v.length > LABEL_MAX) errors.push(`${k}: en fazla ${LABEL_MAX} karakter.`);
    else if (CONTROL.test(v)) errors.push(`${k}: geçersiz kontrol karakteri.`);
  }
  return errors;
}

/** Validates a full template snapshot; TR/DE/EN are required. */
export function validateSnapshot(snap: PdfSnapshot): string[] {
  const errors: string[] = [];
  if (!snap.name?.trim() || snap.name.length > 120) errors.push("Ad 1–120 karakter olmalı.");
  if ((snap.description ?? "").length > 500) errors.push("Açıklama en fazla 500 karakter.");
  for (const [l, t] of Object.entries(snap.translations ?? {})) {
    if (!(DOCUMENT_LOCALES as readonly string[]).includes(l)) { errors.push(`Geçersiz dil: ${l}`); continue; }
    for (const e of validateLabels(t?.labels)) errors.push(`${l.toUpperCase()}: ${e}`);
  }
  for (const l of COMPLETE_DOCUMENT_LOCALES) if (!snap.translations?.[l]) errors.push(`${l.toUpperCase()} içeriği zorunlu.`);
  return errors;
}

const bundleSchema = z.object({
  format: z.literal(PDF_EXPORT_FORMAT),
  version: z.literal(PDF_EXPORT_VERSION),
  exportedAt: z.string().optional(),
  templates: z.array(z.object({
    kind: z.enum(DOCUMENT_KINDS),
    name: z.string(),
    description: z.string().default(""),
    active: z.boolean().default(true),
    translations: z.record(z.enum(DOCUMENT_LOCALES), z.object({ labels: z.record(z.string(), z.unknown()), draft: z.boolean().default(false) })),
  })).max(DOCUMENT_KINDS.length),
});

export function seedPdfBundle(): PdfBundle {
  return {
    format: PDF_EXPORT_FORMAT,
    version: PDF_EXPORT_VERSION,
    templates: DOCUMENT_KINDS.map((kind) => ({
      kind, ...KIND_META[kind], active: true,
      translations: Object.fromEntries(
        Object.entries(SEED_LABELS).map(([l, labels]) => [l, { labels: { ...labels! }, draft: DRAFT_LOCALES.includes(l as DocumentLocale) }]),
      ),
    })),
  };
}

export function parsePdfBundle(input: unknown): { bundle: PdfBundle | null; errors: string[] } {
  const parsed = bundleSchema.safeParse(input);
  if (!parsed.success) return { bundle: null, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "dosya"}: ${i.message}`) };
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const t of parsed.data.templates) {
    if (seen.has(t.kind)) errors.push(`${t.kind}: aynı şablon iki kez var.`);
    seen.add(t.kind);
    for (const e of validateSnapshot(t as unknown as PdfSnapshot)) errors.push(`${t.kind}: ${e}`);
  }
  return { bundle: errors.length ? null : (parsed.data as unknown as PdfBundle), errors: errors.slice(0, 30) };
}

export type PdfImportChange = { kind: DocumentKind; change: "new" | "changed" | "unchanged"; locales: { locale: DocumentLocale; change: "added" | "changed" | "removed" }[] };

const sameT = (a: PdfTranslation, b: PdfTranslation) => a.draft === b.draft && LABEL_KEYS.every((k) => a.labels[k] === b.labels[k]);

/** Diff between stored templates and an incoming bundle. Import never deletes templates. */
export function diffPdfBundle(current: PdfBundleTemplate[], incoming: PdfBundle): PdfImportChange[] {
  const byKind = new Map(current.map((t) => [t.kind, t]));
  return incoming.templates.map((t) => {
    const cur = byKind.get(t.kind);
    if (!cur) return { kind: t.kind, change: "new" as const, locales: Object.keys(t.translations).map((l) => ({ locale: l as DocumentLocale, change: "added" as const })) };
    const locales: PdfImportChange["locales"] = [];
    for (const l of DOCUMENT_LOCALES) {
      const a = cur.translations[l], b = t.translations[l];
      if (!a && b) locales.push({ locale: l, change: "added" });
      else if (a && !b) locales.push({ locale: l, change: "removed" });
      else if (a && b && !sameT(a, b)) locales.push({ locale: l, change: "changed" });
    }
    const meta = cur.name !== t.name || cur.description !== t.description || cur.active !== t.active;
    return { kind: t.kind, change: locales.length || meta ? ("changed" as const) : ("unchanged" as const), locales };
  });
}

/** Labels per locale for the renderer; falls back to the code seed when nothing is stored. */
export function labelsForRenderer(t: PdfBundleTemplate | null | undefined): Partial<Record<DocumentLocale, DocumentLabels>> {
  if (!t || !Object.keys(t.translations).length) return SEED_LABELS;
  return Object.fromEntries(Object.entries(t.translations).map(([l, v]) => [l, v!.labels]));
}
