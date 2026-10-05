import { describe, expect, it } from "vitest";
import { defaultV2Page, isInWindow, missingV2Translations, sanitizeV2Page, V2_PAGES } from "@/domain/storefront/v2";
import { UI_LOCALES } from "@/i18n/locales";

describe("V2 storefront config", () => {
  it("default pages mirror the approved V2 order", () => {
    expect(defaultV2Page("esim").sections.map((s) => s.type)).toEqual([
      "SEARCH_HERO", "BENEFIT_ROW", "DESTINATION_CAROUSEL", "TRUST_REVIEWS", "REGION_DISCOVERY", "INFO_CAROUSEL", "COMPATIBILITY", "PROMO_BANNER", "INSTALLATION_STEPS", "PROMO_BANNER", "GUIDE_CAROUSEL", "FAQ",
    ]);
    const esim = defaultV2Page("esim");
    expect(esim.sections[1]!.items.map((i) => i.title.tr)).toEqual(["Hızlı teslim", "14 gün iade", "Kolay kurulum", "WhatsApp destek"]);
    expect(esim.sections[1]!.items[0]!.title.de).toBe("Schnell verfügbar");
    for (const page of V2_PAGES) expect(missingV2Translations(defaultV2Page(page), "de")).toBe(0);
  });

  it("round-trips defaults: keeps every default value and is idempotent", () => {
    // The sanitizer intentionally normalizes optional fields (trust imageScale, comparison image mode) into canonical values.
    for (const page of V2_PAGES) {
      const once = sanitizeV2Page(defaultV2Page(page), page);
      expect(once).toMatchObject(defaultV2Page(page));
      expect(sanitizeV2Page(once, page)).toEqual(once);
    }
  });

  it("keeps fictional reviews separate and respects an explicitly disabled preview switch", () => {
    const original = defaultV2Page("esim");
    const section = original.sections.find((entry) => entry.type === "TRUST_REVIEWS");
    const starters = section?.items.filter((entry) => entry.cardType === "review") ?? [];
    expect(starters).toHaveLength(8);
    expect(starters.map((entry) => entry.countryCode)).toEqual(["IT", "JP", "US", "CA", "ES", "TR", "TH", "AE"]);
    for (const entry of starters) {
      expect(entry).toMatchObject({ reviewType: "EDITORIAL", verified: false, published: false });
      for (const locale of UI_LOCALES) expect(entry.text[locale]?.trim()).toBeTruthy();
    }
    const disabled = structuredClone(original);
    const disabledSection = disabled.sections.find((entry) => entry.type === "TRUST_REVIEWS");
    if (!disabledSection) throw new Error("Missing trust section");
    disabledSection.showDemoReviews = false;
    disabledSection.items = disabledSection.items.filter((entry) => entry.reviewType !== "EDITORIAL");
    const cleaned = sanitizeV2Page(disabled, "esim").sections.find((entry) => entry.type === "TRUST_REVIEWS");
    expect(cleaned?.showDemoReviews).toBe(false);
    expect(cleaned?.items.some((entry) => entry.reviewType === "EDITORIAL")).toBe(false);
  });

  it("keeps the search hero first, visible and present", () => {
    const d = defaultV2Page("lounge");
    const [hero, ...rest] = d.sections;
    const moved = sanitizeV2Page({ sections: [...rest, { ...hero, visible: false }] }, "lounge");
    expect(moved.sections[0]!.type).toBe("SEARCH_HERO");
    expect(moved.sections[0]!.visible).toBe(true);
    expect(sanitizeV2Page({ sections: rest }, "lounge").sections[0]!.type).toBe("SEARCH_HERO");
  });

  it("strips markup, unsafe links, unknown icons and media", () => {
    const d = defaultV2Page("esim");
    const bad = structuredClone(d);
    bad.sections[0]!.text["title"]!.tr = "<script>alert(1)</script>Merhaba";
    (bad.sections[5] as any).href = "https://evil.example";
    (bad.sections[5] as any).mediaId = "javascript:alert(1)";
    bad.sections[1]!.items[0]!.icon = "<svg onload=x>";
    const clean = sanitizeV2Page(bad, "esim");
    expect(clean.sections[0]!.text["title"]!.tr).toBe("alert(1)Merhaba");
    expect(clean.sections[5]!.href).toBe("/esim");
    expect(clean.sections[5]!.mediaId).toBeNull();
    expect(clean.sections[1]!.items[0]!.icon).toBe("");
  });

  it("drops duplicate singleton sections and falls back on garbage", () => {
    const d = defaultV2Page("esim");
    const dup = { ...d.sections[2]!, id: "popular-2" };
    expect(sanitizeV2Page({ sections: [...d.sections, dup] }, "esim").sections.length).toBe(d.sections.length);
    expect(sanitizeV2Page("nope", "vignette")).toEqual(defaultV2Page("vignette"));
  });

  it("respects promo date windows", () => {
    const promo = { ...defaultV2Page("esim").sections[5]!, startsAt: "2026-10-01", endsAt: "2026-10-31" };
    expect(isInWindow(promo, "2026-09-25")).toBe(false);
    expect(isInWindow(promo, "2026-10-10")).toBe(true);
    expect(isInWindow(promo, "2026-11-01")).toBe(false);
  });

  it("keeps safe section design values and removes invalid values", () => {
    const page = structuredClone(defaultV2Page("esim"));
    page.sections[1]!.design = {
      width: "wide", spacing: "compact", background: "custom", customColor: "#ABCDEF",
      radius: "large", font: "heading", weight: "bold", lineHeight: "relaxed",
      letterSpacing: "wide", textAlign: "center", position: "middle-center",
      desktop: { headingSize: 120, bodySize: 4 }, mobile: { headingSize: 34, bodySize: 15 },
    };
    const design = sanitizeV2Page(page, "esim").sections[1]!.design;
    expect(design).toMatchObject({ width: "wide", customColor: "#abcdef", desktop: { headingSize: 80, bodySize: 11 }, mobile: { headingSize: 34, bodySize: 15 } });
  });

  it("preserves the production default when no section design exists", () => {
    for (const section of defaultV2Page("esim").sections) expect(section.design).toBeUndefined();
  });
});
