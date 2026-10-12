/**
 * Numbering, tax and money rules for documents — designed now, issuing stays OFF.
 * All money is integer cents. No tax rate is ever invented: a null rate means "not defined yet".
 */
import type { DocumentKind, DocumentLine } from "./catalog";

export const DOCUMENT_ISSUING_FLAG = "documents_issuing_enabled";

const PREFIX: Partial<Record<DocumentKind, string>> = { invoice: "INV", "credit-note": "CN" };

/** PSP-INV-2026-000001. Only invoices and credit notes get legal numbers. */
export function formatDocumentNumber(kind: DocumentKind, year: number, sequence: number): string {
  const prefix = PREFIX[kind];
  if (!prefix) throw new Error("Bu belge türü numaralandırılmaz.");
  if (!Number.isInteger(year) || year < 2024 || year > 2100) throw new Error("Geçersiz yıl.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) throw new Error("Geçersiz sıra numarası.");
  return `PSP-${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function parseDocumentNumber(value: string): { kind: DocumentKind; year: number; sequence: number } | null {
  const m = /^PSP-(INV|CN)-(\d{4})-(\d{6})$/.exec(value);
  if (!m) return null;
  return { kind: m[1] === "INV" ? "invoice" : "credit-note", year: Number(m[2]), sequence: Number(m[3]) };
}

/** Half-up rounding on cents. */
const roundCents = (value: number) => Math.sign(value) * Math.round(Math.abs(value) + Number.EPSILON);

export type LineTotals = { grossCents: number; netCents: number | null; taxCents: number | null };

/** Prices are gross (tax included). Net/tax are derived only when a rate is defined. */
export function lineTotals(line: DocumentLine): LineTotals {
  if (!Number.isInteger(line.unitGrossCents) || !Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error("Geçersiz satır.");
  const grossCents = roundCents(line.unitGrossCents * line.quantity);
  if (line.taxRatePercent == null) return { grossCents, netCents: null, taxCents: null };
  if (line.taxRatePercent < 0 || line.taxRatePercent > 100) throw new Error("Geçersiz vergi oranı.");
  const netCents = roundCents(grossCents / (1 + line.taxRatePercent / 100));
  return { grossCents, netCents, taxCents: grossCents - netCents };
}

export function documentTotals(lines: DocumentLine[], discountCents = 0) {
  const per = lines.map(lineTotals);
  const subtotalCents = per.reduce((s, l) => s + l.grossCents, 0);
  const taxDefined = per.length > 0 && per.every((l) => l.taxCents != null);
  const discount = Math.max(0, Math.min(discountCents, subtotalCents));
  return {
    lines: per,
    subtotalCents,
    discountCents: discount,
    totalCents: subtotalCents - discount,
    taxCents: taxDefined ? per.reduce((s, l) => s + (l.taxCents ?? 0), 0) : null,
    taxDefined,
  };
}

export function formatMoney(cents: number, currency: string, bcp47: string): string {
  return new Intl.NumberFormat(bcp47, { style: "currency", currency }).format(cents / 100).replace(/[\u200e\u200f\u061c\u00a0\u202f]/g, (c) => (c === "\u00a0" || c === "\u202f" ? " " : ""));
}

export function formatDate(iso: string, bcp47: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(bcp47, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(d).replace(/[\u200e\u200f\u061c]/g, "");
}
