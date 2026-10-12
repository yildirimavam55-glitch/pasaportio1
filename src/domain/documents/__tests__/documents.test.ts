import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { DOCUMENT_KINDS, LABEL_KEYS, SEED_LABELS, resolveDocumentLocale, sampleData } from "../catalog";
import { documentTotals, formatDocumentNumber, lineTotals, parseDocumentNumber } from "../money";
import { renderDocument } from "../render";
import { loadDocumentFonts } from "../fonts.server";

describe("document numbering (designed, issuing off)", () => {
  it("formats invoice and credit-note numbers", () => {
    expect(formatDocumentNumber("invoice", 2026, 1)).toBe("PSP-INV-2026-000001");
    expect(formatDocumentNumber("credit-note", 2026, 42)).toBe("PSP-CN-2026-000042");
  });
  it("never numbers order summaries or guides", () => {
    expect(() => formatDocumentNumber("order-summary", 2026, 1)).toThrow();
    expect(() => formatDocumentNumber("esim-guide", 2026, 1)).toThrow();
  });
  it("round-trips a number", () => {
    expect(parseDocumentNumber("PSP-CN-2026-000007")).toEqual({ kind: "credit-note", year: 2026, sequence: 7 });
    expect(parseDocumentNumber("PSP-XX-2026-1")).toBeNull();
  });
});

describe("tax rules", () => {
  it("leaves tax undefined when no rate is supplied", () => {
    expect(lineTotals({ description: "x", quantity: 1, unitGrossCents: 1990, taxRatePercent: null })).toEqual({ grossCents: 1990, netCents: null, taxCents: null });
  });
  it("derives net and tax from gross prices", () => {
    expect(lineTotals({ description: "x", quantity: 1, unitGrossCents: 1190, taxRatePercent: 19 })).toEqual({ grossCents: 1190, netCents: 1000, taxCents: 190 });
  });
  it("caps discounts at the subtotal", () => {
    expect(documentTotals([{ description: "x", quantity: 1, unitGrossCents: 500, taxRatePercent: null }], 900).totalCents).toBe(0);
  });
});

describe("labels and languages", () => {
  it("TR, DE and EN labels are complete", () => {
    for (const l of ["tr", "de", "en"] as const) for (const k of LABEL_KEYS) expect(SEED_LABELS[l]![k], `${l}.${k}`).toBeTruthy();
  });
  it("falls back to English for languages without labels or fonts", () => {
    expect(resolveDocumentLocale("fr").locale).toBe("en");
    expect(resolveDocumentLocale("zh")).toEqual({ locale: "en", fallback: true, reason: "script" });
    expect(resolveDocumentLocale("ar").locale).toBe("ar");
  });
});

describe("renderer", () => {
  it("renders every document kind as a valid PDF", async () => {
    const fonts = await loadDocumentFonts();
    for (const kind of DOCUMENT_KINDS) {
      const r = await renderDocument(kind, "tr", sampleData(kind), fonts);
      const doc = await PDFDocument.load(r.bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    }
  }, 30_000);

  it("an invoice without issuer data is always marked as a sample", async () => {
    const fonts = await loadDocumentFonts();
    const data = { ...sampleData("invoice"), sample: false };
    const r = await renderDocument("invoice", "en", data, fonts);
    expect(r.sample).toBe(true);
  }, 30_000);

  it("ignores fields outside the allowlisted data shape", async () => {
    const fonts = await loadDocumentFonts();
    const data: any = { ...sampleData("esim-guide"), qr: "LPA:1$SECRET", activationCode: "SECRET-CODE" };
    const r = await renderDocument("esim-guide", "en", data, fonts);
    const raw = new TextDecoder("latin1").decode(r.bytes);
    expect(raw).not.toContain("SECRET");
  }, 30_000);
});
