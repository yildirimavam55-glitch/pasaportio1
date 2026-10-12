import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SEED_LABELS } from "../catalog";
import { diffPdfBundle, labelsForRenderer, parsePdfBundle, seedPdfBundle, validateLabels } from "../transfer";

const mig = (f: string) => readFileSync(`drizzle/migrations/${f}`, "utf8");

describe("PDF template transfer", () => {
  it("seed bundle has all four kinds and validates", () => {
    const { bundle, errors } = parsePdfBundle(seedPdfBundle());
    expect(errors).toEqual([]);
    expect(bundle!.templates.map((t) => t.kind)).toEqual(["invoice", "order-summary", "credit-note", "esim-guide"]);
  });
  it("seed keeps TR/DE/EN and Arabic marked as draft", () => {
    const t = seedPdfBundle().templates[0]!;
    expect(Object.keys(t.translations).sort()).toEqual(["ar", "de", "en", "tr"]);
    expect(t.translations.ar!.draft).toBe(true);
    expect(t.translations.tr!.draft).toBe(false);
  });
  it("rejects a bundle missing German", () => {
    const b = seedPdfBundle();
    delete b.templates[0]!.translations.de;
    expect(parsePdfBundle(b).bundle).toBeNull();
  });
  it("rejects unknown label keys, empty labels and wrong format", () => {
    expect(validateLabels({ ...SEED_LABELS.en, apiKey: "x" })).toContain("Bilinmeyen alan: apiKey");
    expect(validateLabels({ ...SEED_LABELS.en, total: "" }).length).toBe(1);
    expect(parsePdfBundle({ format: "other", version: 2, templates: [] }).bundle).toBeNull();
  });
  it("diff reports unchanged for identical data and changed locales otherwise", () => {
    const seed = seedPdfBundle();
    expect(diffPdfBundle(seed.templates, seed).every((c) => c.change === "unchanged")).toBe(true);
    const next = seedPdfBundle();
    next.templates[1]!.translations.tr!.labels.total = "Toplam tutar";
    const c = diffPdfBundle(seed.templates, next)[1]!;
    expect(c.change).toBe("changed");
    expect(c.locales).toEqual([{ locale: "tr", change: "changed" }]);
  });
  it("renderer falls back to the code seed when nothing is stored", () => {
    expect(labelsForRenderer(null)).toBe(SEED_LABELS);
  });
});

describe("migration security", () => {
  it("email grants are aligned: anon/authenticated revoked, truncate blocked", () => {
    const sql = mig("0006_align_email_template_grants.sql");
    expect(sql).toMatch(/REVOKE ALL ON public\.email_templates, public\.email_template_translations, public\.email_template_versions FROM anon, authenticated/);
    expect(sql).toMatch(/BEFORE TRUNCATE ON public\.email_template_versions/);
  });
  it("pdf tables: no anon grants, admin-only RLS, immutable versions", () => {
    const sql = mig("0007_pdf_template_system.sql");
    expect(sql).not.toMatch(/GRANT[^;]*TO anon/);
    expect(sql.match(/ENABLE ROW LEVEL SECURITY/g)?.length).toBe(3);
    expect(sql.match(/public\.is_admin\(\)/g)?.length).toBe(6);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON public\.pdf_template_versions TO authenticated/);
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.pdf_template_versions/);
    expect(sql).toMatch(/BEFORE TRUNCATE ON public\.pdf_template_versions/);
  });
});
