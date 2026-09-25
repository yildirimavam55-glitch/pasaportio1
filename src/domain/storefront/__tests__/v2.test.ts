import { describe, expect, it } from "vitest";
import { defaultV2Page, isInWindow, missingV2Translations, sanitizeV2Page, V2_PAGES } from "@/domain/storefront/v2";

describe("V2 storefront config", () => {
  it("default pages mirror the approved V2 order", () => {
    expect(defaultV2Page("esim").sections.map((s) => s.type)).toEqual([
      "SEARCH_HERO", "BENEFIT_ROW", "DESTINATION_CAROUSEL", "REGION_DISCOVERY", "COMPATIBILITY", "PROMO_BANNER", "INSTALLATION_STEPS", "PROMO_BANNER", "GUIDE_CAROUSEL", "FAQ",
    ]);
    const esim = defaultV2Page("esim");
    expect(esim.sections[1]!.items.map((i) => i.title.tr)).toEqual(["Hızlı teslim", "Geniş kapsama", "Kolay kurulum", "WhatsApp destek"]);
    expect(esim.sections[1]!.items[0]!.title.de).toBe("Schnell verfügbar");
    for (const page of V2_PAGES) expect(missingV2Translations(defaultV2Page(page), "de")).toBe(0);
  });

  it("round-trips defaults unchanged", () => {
    for (const page of V2_PAGES) expect(sanitizeV2Page(defaultV2Page(page), page)).toEqual(defaultV2Page(page));
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
    expect(clean.sections[5]!.href).toBe("/design-v2/esim");
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
});
