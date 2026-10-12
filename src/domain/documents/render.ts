/**
 * Provider-independent PDF renderer (pdf-lib + fontkit, pure JS — runs on Workers and Node).
 * fontkit performs Arabic shaping; this module splits mixed-script runs and mirrors RTL layout.
 */
import { PDFDocument, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  BCP47, RTL_DOCUMENT_LOCALES, resolveDocumentLocale, SEED_LABELS,
  type DocumentData, type DocumentKind, type DocumentLabels, type DocumentLocale,
} from "./catalog";
import { documentTotals, formatDate, formatMoney } from "./money";

export type FontBytes = { latin: Uint8Array; latinBold: Uint8Array; arabic: Uint8Array; arabicBold: Uint8Array };

const C = {
  petrol: rgb(0.043, 0.353, 0.314),
  ink: rgb(0.051, 0.18, 0.165),
  muted: rgb(0.43, 0.5, 0.49),
  line: rgb(0.88, 0.92, 0.91),
  mint: rgb(0.93, 0.97, 0.95),
  white: rgb(1, 1, 1),
  warn: rgb(0.75, 0.3, 0.15),
};
const W = 595.28, H = 841.89, M = 44;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

type Fonts = { r: PDFFont; b: PDFFont; ar: PDFFont; arb: PDFFont };
type Run = { text: string; arabic: boolean };

/** Splits text into script runs. Spaces are separate runs so RTL reordering keeps word gaps. */
function runs(text: string, arabicChars: Set<number>): Run[] {
  const out: Run[] = [];
  let last: (Run & { ws: boolean }) | null = null;
  for (const ch of text) {
    const ws = /\s/.test(ch);
    const code = ch.codePointAt(0)!;
    const isAr = ARABIC.test(ch) || (!ws && !!last && last.arabic && !last.ws && /[.,:;()\-\/%\u060C\u061B\u061F]/.test(ch) && arabicChars.has(code));
    if (last && !ws && !last.ws && last.arabic === isAr) { last.text += ch; continue; }
    if (last && ws && last.ws) { last.text += ch; continue; }
    last = { text: ch, arabic: isAr, ws };
    out.push(last);
  }
  return out;
}

/**
 * Minimal bidi for RTL lines: whitespace between two Latin runs stays Latin, Latin groups keep
 * their reading order, and groups (plus Arabic words) are laid out right-to-left.
 */
function visualOrder(parts: Run[]): Run[] {
  const isWs = (r: Run) => /^\s+$/.test(r.text);
  const type = parts.map((r, i) => {
    if (!isWs(r)) return r.arabic ? "A" : "L";
    const prev = parts.slice(0, i).reverse().find((p) => !isWs(p));
    const next = parts.slice(i + 1).find((p) => !isWs(p));
    return prev && next && !prev.arabic && !next.arabic ? "L" : "A";
  });
  const groups: { t: string; runs: Run[] }[] = [];
  parts.forEach((r, i) => {
    const g = groups[groups.length - 1];
    if (g && g.t === type[i] && g.t === "L") g.runs.push(r);
    else groups.push({ t: type[i]!, runs: [r] });
  });
  return groups.reverse().flatMap((g) => g.runs);
}

class Writer {
  page!: PDFPage;
  y = 0;
  pageNo = 0;
  private arChars: Set<number>;
  constructor(private doc: PDFDocument, private f: Fonts, readonly rtl: boolean, private labels: DocumentLabels, private sample: boolean) {
    this.arChars = new Set(f.ar.getCharacterSet());
  }

  font(arabic: boolean, bold: boolean) { return arabic ? (bold ? this.f.arb : this.f.ar) : bold ? this.f.b : this.f.r; }

  width(text: string, size: number, bold = false) {
    return runs(text, this.arChars).reduce((s, r) => s + this.font(r.arabic, bold).widthOfTextAtSize(r.text, size), 0);
  }

  /** Draws one line; `x` is the logical start edge (left in LTR, right in RTL). */
  text(text: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: ReturnType<typeof rgb>; align?: "start" | "end"; boxWidth?: number } = {}) {
    if (!text) return;
    const parts = runs(text, this.arChars);
    const total = this.width(text, size, opts.bold);
    const box = opts.boxWidth ?? 0;
    let left: number;
    const startAligned = (opts.align ?? "start") === "start";
    if (!this.rtl) left = startAligned ? x : x + box - total;
    else left = startAligned ? W - x - total : W - x - box;
    const ordered = this.rtl ? visualOrder(parts) : parts;
    for (const r of ordered) {
      const font = this.font(r.arabic, !!opts.bold);
      this.page.drawText(r.text, { x: left, y, size, font, color: opts.color ?? C.ink });
      left += font.widthOfTextAtSize(r.text, size);
    }
  }

  wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (this.width(next, size, bold) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  rect(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x: this.rtl ? W - x - w : x, y, width: w, height: h, color });
  }

  newPage(title: string) {
    this.page = this.doc.addPage([W, H]);
    this.pageNo += 1;
    this.page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: C.petrol });
    this.text("pasaport.io", M, H - 56, 22, { bold: true, color: C.white });
    this.text(title, M, H - 56, 16, { bold: true, color: C.white, align: "end", boxWidth: W - 2 * M });
    if (this.sample) {
      const mark = this.labels.sampleWatermark;
      const font = this.font(ARABIC.test(mark), true);
      const size = 96;
      const w = font.widthOfTextAtSize(mark, size);
      this.page.drawText(mark, { x: W / 2 - (w / 2) * 0.7, y: H / 2 - (w / 2) * 0.7, size, font, color: C.warn, opacity: 0.08, rotate: degrees(45) });
    }
    this.y = H - 128;
  }

  ensure(space: number, title: string) {
    if (this.y - space < 90) { this.footer(); this.newPage(title); }
  }

  footer() {
    this.page.drawLine({ start: { x: M, y: 60 }, end: { x: W - M, y: 60 }, thickness: 0.6, color: C.line });
    this.text(this.labels.footer, M, 44, 8.5, { color: C.muted });
    this.text(`${this.labels.page} ${this.pageNo}`, M, 44, 8.5, { color: C.muted, align: "end", boxWidth: W - 2 * M });
  }
}

export type RenderResult = { bytes: Uint8Array; locale: DocumentLocale; fallback: boolean; pages: number };

export async function renderDocument(
  kind: DocumentKind,
  requested: DocumentLocale,
  data: DocumentData,
  fonts: FontBytes,
  labelsByLocale: Partial<Record<DocumentLocale, DocumentLabels>> = SEED_LABELS,
): Promise<RenderResult> {
  const resolved = resolveDocumentLocale(requested, labelsByLocale);
  const locale = resolved.locale;
  const L = labelsByLocale[locale]!;
  const bcp = BCP47[locale];
  const rtl = RTL_DOCUMENT_LOCALES.includes(locale);
  // A document without real issuer data is always a sample.
  const sample = data.sample || (kind === "invoice" && !data.issuer) || (kind === "credit-note" && !data.issuer);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f: Fonts = {
    r: await doc.embedFont(fonts.latin, { subset: true }),
    b: await doc.embedFont(fonts.latinBold, { subset: true }),
    ar: await doc.embedFont(fonts.arabic, { subset: true }),
    arb: await doc.embedFont(fonts.arabicBold, { subset: true }),
  };
  const title = L[`title.${kind}` as const];
  doc.setTitle(`${title} — pasaport.io`);
  doc.setLanguage(bcp);
  doc.setProducer("pasaport.io documents");
  doc.setCreator("pasaport.io");

  const w = new Writer(doc, f, rtl, L, sample);
  w.newPage(title);
  const money = (c: number) => formatMoney(c, data.currency, bcp);
  const contentW = W - 2 * M;

  // Notice band
  const notice = sample ? (kind === "invoice" || kind === "credit-note" ? L.notValidInvoice : null) : null;
  const extra = kind === "order-summary" ? L.notTaxDocument : null;
  for (const msg of [notice, extra].filter(Boolean) as string[]) {
    w.rect(M, w.y - 8, contentW, 24, C.mint);
    w.text(msg, M + 10, w.y, 9.5, { bold: true, color: kind === "order-summary" ? C.petrol : C.warn });
    w.y -= 34;
  }

  // Meta block
  const meta: [string, string][] = [];
  if (kind === "invoice" || kind === "credit-note") meta.push([L.documentNumber, data.documentNumber ?? L.numberPending]);
  meta.push([L.issueDate, formatDate(data.issueDate, bcp)], [L.orderNumber, data.order.number], [L.orderDate, formatDate(data.order.date, bcp)]);
  if (kind === "credit-note" && data.refund) {
    meta.push([L.refundReference, data.refund.reference], [L.originalInvoice, data.refund.originalInvoiceNumber ?? L.numberPending]);
  }
  const colW = contentW / 2;
  meta.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const y = w.y - row * 30;
    w.text(k, M + col * colW, y, 8.5, { color: C.muted });
    w.text(v, M + col * colW, y - 13, 10.5, { bold: true });
  });
  w.y -= Math.ceil(meta.length / 2) * 30 + 14;

  // Parties
  if (kind !== "esim-guide") {
    w.page.drawLine({ start: { x: M, y: w.y + 6 }, end: { x: W - M, y: w.y + 6 }, thickness: 0.6, color: C.line });
    w.y -= 10;
    w.text(L.billedTo, M, w.y, 8.5, { color: C.muted });
    w.text(L.issuer, M + colW, w.y, 8.5, { color: C.muted });
    const cust = [data.customer.name, data.customer.email, data.customer.country];
    const iss = data.issuer ? [data.issuer.name, data.issuer.address, data.issuer.taxId] : [L.issuerPending];
    for (let i = 0; i < Math.max(cust.length, iss.length); i++) {
      if (cust[i]) w.text(cust[i]!, M, w.y - 14 - i * 13, 10, { bold: i === 0 });
      if (iss[i]) w.text(iss[i]!, M + colW, w.y - 14 - i * 13, 10, { bold: i === 0 && !!data.issuer, color: data.issuer ? C.ink : C.muted });
    }
    w.y -= 14 + Math.max(cust.length, iss.length) * 13 + 20;
  }

  if (kind === "esim-guide") {
    for (const line of w.wrap(L.guideIntro, 11, contentW)) { w.text(line, M, w.y, 11); w.y -= 16; }
    w.y -= 10;
    const steps = [L.guideStep1, L.guideStep2, L.guideStep3, L.guideStep4, L.guideStep5];
    steps.forEach((step, i) => {
      const lines = w.wrap(step, 10.5, contentW - 40);
      w.ensure(lines.length * 15 + 20, title);
      w.rect(M, w.y - 8, 24, 24, C.petrol);
      w.text(String(i + 1), M + 8.5, w.y, 11, { bold: true, color: C.white });
      lines.forEach((ln, j) => w.text(ln, M + 36, w.y - j * 15, 10.5));
      w.y -= lines.length * 15 + 18;
    });
    w.y -= 6;
    const sec = w.wrap(L.guideSecurity, 10, contentW - 20, true);
    w.rect(M, w.y - sec.length * 14 + 4, contentW, sec.length * 14 + 14, C.mint);
    sec.forEach((ln, j) => w.text(ln, M + 10, w.y - j * 14, 10, { bold: true, color: C.petrol }));
    w.y -= sec.length * 14 + 20;
  } else {
    // Line table
    const totals = documentTotals(data.lines, data.discountCents);
    const cols = [
      { key: L.description, x: 0, w: contentW * 0.46, align: "start" as const },
      { key: L.quantity, x: contentW * 0.46, w: contentW * 0.1, align: "end" as const },
      { key: L.unitPrice, x: contentW * 0.56, w: contentW * 0.16, align: "end" as const },
      { key: L.taxRate, x: contentW * 0.72, w: contentW * 0.1, align: "end" as const },
      { key: L.total, x: contentW * 0.82, w: contentW * 0.18, align: "end" as const },
    ];
    w.rect(M, w.y - 7, contentW, 22, C.petrol);
    cols.forEach((c) => w.text(c.key, M + c.x + 6, w.y, 8.5, { bold: true, color: C.white, align: c.align, boxWidth: c.w - 12 }));
    w.y -= 26;
    data.lines.forEach((line, i) => {
      w.ensure(26, title);
      const t = totals.lines[i]!;
      const cells = [line.description, String(line.quantity), money(line.unitGrossCents), line.taxRatePercent == null ? "—" : `${line.taxRatePercent}`, money(t.grossCents)];
      cols.forEach((c, j) => w.text(cells[j]!, M + c.x + 6, w.y, 9.5, { align: c.align, boxWidth: c.w - 12 }));
      w.page.drawLine({ start: { x: M, y: w.y - 8 }, end: { x: W - M, y: w.y - 8 }, thickness: 0.5, color: C.line });
      w.y -= 24;
    });
    w.y -= 6;
    const rows: [string, string, boolean][] = [[L.subtotal, money(totals.subtotalCents), false]];
    if (totals.discountCents) rows.push([L.discount, `− ${money(totals.discountCents)}`, false]);
    rows.push([L.tax, totals.taxCents == null ? L.taxPending : money(totals.taxCents), false]);
    if (kind === "credit-note" && data.refund) rows.push([L.refundTotal, `− ${money(data.refund.amountCents)}`, true]);
    else rows.push([L.grandTotal, money(totals.totalCents), true]);
    const boxX = contentW * 0.5;
    for (const [k, v, strong] of rows) {
      w.ensure(22, title);
      if (strong) w.rect(M + boxX, w.y - 8, contentW - boxX, 24, C.mint);
      w.text(k, M + boxX + 8, w.y, strong ? 11 : 9.5, { bold: strong, color: strong ? C.ink : C.muted });
      w.text(v, M + boxX, w.y, strong ? 11 : 9.5, { bold: strong, align: "end", boxWidth: contentW - boxX - 8 });
      w.y -= strong ? 28 : 20;
    }
    if (kind === "credit-note" && data.refund) {
      w.y -= 8;
      w.text(L.refundReason, M, w.y, 8.5, { color: C.muted });
      w.text(data.refund.reason, M, w.y - 14, 10);
      w.y -= 30;
    }
  }

  w.footer();
  const bytes = await doc.save();
  return { bytes, locale, fallback: resolved.fallback, pages: w.pageNo };
}
