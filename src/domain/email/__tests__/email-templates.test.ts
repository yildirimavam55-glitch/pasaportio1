import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATE_KEYS, PREVIEW_DATA, SEED_TEMPLATES, TEMPLATE_ACTION } from "../catalog";
import { renderEmail, resolveCopy, validateCopy } from "../render";
import { diffBundle, parseBundle, seedBundle } from "../transfer";

describe("e-mail template catalogue", () => {
  it("has exactly the nine approved templates", () => {
    expect(EMAIL_TEMPLATE_KEYS).toHaveLength(9);
  });

  it("every seed template is complete and valid in TR, DE and EN", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      for (const locale of ["tr", "de", "en"] as const) {
        expect(validateCopy(key, SEED_TEMPLATES[key][locale]), `${key}/${locale}`).toEqual([]);
      }
    }
  });

  it("seed bundle passes import validation", () => {
    expect(parseBundle(seedBundle()).errors).toEqual([]);
  });

  it("eSIM delivery never carries QR or activation data", () => {
    for (const locale of ["tr", "de", "en"] as const) {
      const html = renderEmail("esim-delivery", SEED_TEMPLATES["esim-delivery"][locale], locale, { ...PREVIEW_DATA, qr: "LPA:1$x", activationCode: "SECRET" }).html;
      expect(html).not.toContain("LPA:1");
      expect(html).not.toContain("SECRET");
      expect(html).toContain(PREVIEW_DATA["esimUrl"]);
    }
  });
});

describe("variable allowlist and safety", () => {
  it("rejects variables outside the template's allowlist", () => {
    expect(validateCopy("welcome", { subject: "Hi {{resetUrl}}", preheader: "", body: "x" }).join()).toContain("{{resetUrl}}");
  });

  it("rejects HTML tags in copy", () => {
    expect(validateCopy("welcome", { subject: "s", preheader: "", body: "<script>alert(1)</script>" }).length).toBeGreaterThan(0);
  });

  it("rejects hardcoded token links", () => {
    expect(validateCopy("password-reset", { subject: "s", preheader: "", body: "https://x.io/r?token=abc" }).length).toBeGreaterThan(0);
  });

  it("escapes variable values so customer input cannot inject HTML", () => {
    const html = renderEmail("welcome", SEED_TEMPLATES.welcome.en, "en", { ...PREVIEW_DATA, customerName: '<img src=x onerror="a()">' }).html;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("drops non-http action links", () => {
    const html = renderEmail("welcome", SEED_TEMPLATES.welcome.en, "en", { ...PREVIEW_DATA, [TEMPLATE_ACTION.welcome]: "javascript:alert(1)" }).html;
    expect(html).not.toContain("javascript:");
  });
});

describe("locale fallback", () => {
  it("falls back to English for a locale without its own copy", () => {
    const r = resolveCopy(SEED_TEMPLATES.welcome, "fr");
    expect(r?.locale).toBe("en");
    expect(r?.fallback).toBe(true);
  });

  it("renders Arabic right-to-left", () => {
    expect(renderEmail("welcome", SEED_TEMPLATES.welcome.en, "ar", PREVIEW_DATA).html).toContain('dir="rtl"');
  });
});

describe("JSON import", () => {
  it("rejects files missing a required language", () => {
    const b = seedBundle();
    delete (b.templates[0]!.translations as any).de;
    expect(parseBundle(b).errors.join()).toContain("DE");
  });

  it("rejects unknown template keys", () => {
    const b: any = seedBundle();
    b.templates[0].key = "newsletter";
    expect(parseBundle(b).bundle).toBeNull();
  });

  it("previews changes per language", () => {
    const current = seedBundle().templates;
    const incoming = seedBundle();
    incoming.templates[0]!.translations.tr = { ...incoming.templates[0]!.translations.tr!, subject: "Yeni konu" };
    const diff = diffBundle(current, incoming);
    expect(diff[0]).toEqual({ key: "welcome", kind: "changed", locales: [{ locale: "tr", kind: "changed" }] });
    expect(diff.slice(1).every((d) => d.kind === "unchanged")).toBe(true);
  });
});
