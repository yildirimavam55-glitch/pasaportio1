import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { V2CompactFaq } from "@/components/design-v2/V2DiscoveryContent";
import { defaultV2Page, sanitizeV2Page } from "@/domain/storefront/v2";
import { looksFormalGerman, STOREFRONT_TRANSLATION_STYLE } from "@/domain/storefront/translation-style";

describe("eSIM FAQ data source", () => {
  const questions = [["Admin question A", "Admin answer A"], ["Admin question B", "Admin answer B"]] as const;
  it("renders the same Admin questions in compact and comfortable density", () => {
    const compact = renderToStaticMarkup(createElement(V2CompactFaq, { title: "CMS FAQ", questions }));
    const relaxed = renderToStaticMarkup(createElement(V2CompactFaq, { title: "CMS FAQ", questions, relaxed: true }));
    for (const html of [compact, relaxed]) {
      expect(html).toContain("CMS FAQ");
      expect(html).toContain("Admin question A");
      expect(html).toContain("Admin question B");
    }
    expect(compact).toContain('data-faq-density="default"');
    expect(relaxed).toContain('data-faq-density="comfortable"');
  });
});

describe("German translation tone", () => {
  it("instructs informal du and forbids formal Sie", () => {
    expect(STOREFRONT_TRANSLATION_STYLE).toMatch(/German \(de\) MUST use informal/);
    expect(STOREFRONT_TRANSLATION_STYLE).toContain("du");
    expect(STOREFRONT_TRANSLATION_STYLE).toMatch(/never formal Sie/);
  });
  it("detects formal German", () => {
    expect(looksFormalGerman("Hier können Sie Ihre eSIM installieren.")).toBe(true);
    expect(looksFormalGerman("Hier kannst du deine eSIM installieren.")).toBe(false);
  });
});

describe("roaming comparison mode", () => {
  const trustOf = (config: ReturnType<typeof sanitizeV2Page>) => config.sections.find((s) => s.type === "TRUST_REVIEWS")!.trust!;
  it("keeps structured figures stored when switching to IMAGE mode", () => {
    const page = defaultV2Page("esim");
    const raw = JSON.parse(JSON.stringify(page));
    const section = raw.sections.find((s: any) => s.type === "TRUST_REVIEWS");
    section.trust = { ...section.trust, comparisonMode: "IMAGE" };
    const trust = trustOf(sanitizeV2Page(raw, "esim"));
    expect(trust.comparisonMode).toBe("IMAGE");
    expect(trust.comparisonRoamingPrice).toBe(trustOf(page).comparisonRoamingPrice);
    expect(trust.comparisonTravelyPrice).toBe(trustOf(page).comparisonTravelyPrice);
  });
  it("defaults unknown modes to STRUCTURED and non-VERIFIED status stays preview-only", () => {
    const raw = JSON.parse(JSON.stringify(defaultV2Page("esim")));
    const section = raw.sections.find((s: any) => s.type === "TRUST_REVIEWS");
    section.trust = { ...section.trust, comparisonMode: "BOGUS", comparisonStatus: "DRAFT", comparisonPreviewOnly: false };
    const trust = trustOf(sanitizeV2Page(raw, "esim"));
    expect(trust.comparisonMode).toBe("STRUCTURED");
    expect(trust.comparisonPreviewOnly).toBe(true);
  });
});

import { ltStatus as ltStatusFn } from "@/domain/storefront/v2";
describe("translation provenance", () => {
  it("marks auto, manual and outdated manual values", () => {
    const v: any = { tr: "Yeni", de: "Neu", en: "Mine", fr: "Old", _auto: { de: "Neu" }, _src: { de: "Yeni", en: "Yeni", fr: "Eski" } };
    expect(ltStatusFn(v, "tr")).toBe("SOURCE");
    expect(ltStatusFn(v, "de")).toBe("AUTO_TRANSLATED");
    expect(ltStatusFn(v, "en")).toBe("MANUALLY_EDITED");
    expect(ltStatusFn(v, "fr")).toBe("OUTDATED");
    expect(ltStatusFn(v, "ar")).toBe("MISSING");
  });
});
