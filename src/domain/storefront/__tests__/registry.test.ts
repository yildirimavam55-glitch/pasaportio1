import { describe, expect, it } from "vitest";
import { defaultStorefront, missingLocales, sanitizeStorefront, sectionOf } from "../registry";

describe("storefront registry", () => {
  it("builds separate default homepages per service", () => {
    const esim = defaultStorefront("esim");
    const lounge = defaultStorefront("lounge");
    expect(esim.service).toBe("esim");
    expect(sectionOf(esim, "COMPATIBILITY")).not.toBeNull();
    expect(esim.sections[0]?.text['headline']?.tr).not.toBe(lounge.sections[0]?.text['headline']?.tr);
  });

  it("never throws on invalid content and falls back to defaults", () => {
    expect(sanitizeStorefront(null, "esim").sections.length).toBeGreaterThan(0);
    expect(sanitizeStorefront({ sections: "oops" }, "esim").sections.length).toBeGreaterThan(0);
    expect(sanitizeStorefront(42, "lounge").service).toBe("lounge");
  });

  it("strips markup and blocks admin or external links", () => {
    const base = defaultStorefront("esim");
    const raw = structuredClone(base) as any;
    raw.sections[0].text.headline.tr = "<script>alert(1)</script>Merhaba";
    raw.sections[0].primaryHref = "/admin/orders";
    const clean = sanitizeStorefront(raw, "esim");
    expect(clean.sections[0]!.text['headline']!.tr).not.toContain("<script>");
    expect(clean.sections[0]!.primaryHref.startsWith("/admin")).toBe(false);
  });

  it("counts missing translations so admins can see gaps", () => {
    const config = defaultStorefront("esim");
    expect(missingLocales(config, "de")).toBeGreaterThanOrEqual(0);
    config.sections[0]!.text['headline'] = { tr: "Var", de: "", en: "" };
    expect(missingLocales(config, "de")).toBeGreaterThan(0);
  });
});
