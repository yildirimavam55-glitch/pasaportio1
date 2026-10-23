import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { collectV2MediaIds, createV2Section, defaultV2Page, sanitizeV2Page, v2Text, type V2SectionDesign } from "@/domain/storefront/v2";
import { heroMedia, resolveHeroCopy } from "@/domain/storefront/hero-presentation";
import { setActiveUiLocale } from "@/i18n/overlay";
import { LOCALE_REGISTRY, UI_LOCALES } from "@/i18n/locales";
import { V2HeroView } from "../V2HeroView";
import { V2SectionFrame } from "../V2SectionFrame";
import { V2Notice } from "../V2Notice";

const base = () => structuredClone(defaultV2Page("esim"));
const hero = () => base().sections.find(s => s.type === "SEARCH_HERO")!;
const design: V2SectionDesign = { width: "default", spacing: "normal", background: "custom", customColor: "#003D3D", headingColor: "#ABCDEF", bodyColor: "#CCDDFF", accentColor: "#00FFAA", font: "heading", radius: "default", weight: "bold", lineHeight: "tight", letterSpacing: "wide", textAlign: "right", position: "top-left", mobile: { headingSize: 26, bodySize: 12 }, tablet: { headingSize: 38, bodySize: 15 }, desktop: { headingSize: 56, bodySize: 20 } };
afterEach(() => setActiveUiLocale("tr"));

describe("V2 builder editor → sanitized preview → real renderer", () => {
  it("round-trips optional design values and exposes responsive tokens on the Hero frame", () => {
    const page = base(); page.sections[0] = { ...hero(), design };
    const section = sanitizeV2Page(page, "esim").sections[0]!;
    const html = renderToStaticMarkup(<V2SectionFrame section={section}><V2HeroView section={section} image="/desktop.jpg" heading="Custom heading" subtitle="Custom subtitle"><button>Search slot</button></V2HeroView></V2SectionFrame>);
    for (const value of ["#abcdef", "#ccddff", "#00ffaa", "26px", "38px", "56px", "12px", "15px", "20px", "--builder-font", "Custom heading", "Custom subtitle", "Search slot"]) expect(html).toContain(value);
    expect(sanitizeV2Page(sanitizeV2Page(page, "esim"), "esim")).toEqual(sanitizeV2Page(page, "esim"));
  });
  it("does not replace a manually changed subtitle when the title is still a legacy default", () => {
    const s = hero();
    const result = resolveHeroCopy(s, s.text["title"]!.de, "Mein bearbeiteter Untertitel", s.text["subtitle"]!.de, { subtitle: "Built in" });
    expect(result.subtitle).toBe("Mein bearbeiteter Untertitel");
  });
  it("explicit editor copy wins even if equal to an old built-in title, including empty text", () => {
    const s = { ...hero(), heroTextMode: "custom" as const };
    expect(resolveHeroCopy(s, "Stay connected abroad.", "", "", { subtitle: "Built in" })).toEqual({ title: "Stay connected abroad.", subtitle: "", useDefaultTitle: false });
  });
  it("keeps unchanged legacy title/subtitle substitution and has no default frame markup", () => {
    const s = hero(); const subtitle = s.text["subtitle"]!.de;
    expect(resolveHeroCopy(s, s.text["title"]!.de, subtitle, subtitle, { subtitle: "Existing visible default" })).toMatchObject({ useDefaultTitle: true, subtitle: "Existing visible default" });
    delete s.design;
    expect(renderToStaticMarkup(<V2SectionFrame section={s}><span>unchanged</span></V2SectionFrame>)).toBe("<span>unchanged</span>");
    expect(heroMedia(s, {}, { desktop: "desktop", mobile: "mobile" }).desktopCrop).toBeUndefined();
  });
  it("applies custom desktop crop even to built-in imagery after an explicit edit", () => {
    const s = { ...hero(), heroDesktopCrop: "custom" as const };
    expect(heroMedia(s, {}, { desktop: "desktop", mobile: "mobile" }).desktopCrop).toEqual(s.imageDisplay);
  });
  it("preserves media fallback and independent crop variants", () => {
    const s = hero(); s.tabletImageDisplay = { x: 35, y: 20, zoom: 130, fit: "cover" };
    expect(heroMedia(s, {}, { desktop: "d", mobile: "m" })).toMatchObject({ desktop: "d", tablet: "m", mobile: "m" });
    s.mediaId = "10000000-0000-4000-8000-000000000001";
    expect(heroMedia(s, { desktop: "custom" }, { desktop: "d", mobile: "m" })).toMatchObject({ desktop: "custom", tablet: "custom", mobile: "custom" });
    s.mobileMediaId = "10000000-0000-4000-8000-000000000002";
    const resolved = heroMedia(s, { desktop: "d", tablet: "t", mobile: "m" }, { desktop: "f", mobile: "fm" });
    expect(resolved.tabletCrop).toEqual(s.tabletImageDisplay);
    expect(resolved.tablet).toBe("t"); expect(resolved.mobile).toBe("m");
  });
  it("collects tablet media for the existing server media resolver and clamps unsafe presentation input", () => {
    const page = base(); const s = page.sections[0]!;
    s.tabletMediaId = "10000000-0000-4000-8000-000000000002";
    s.tabletImageDisplay = { x: -10, y: 150, zoom: 999, fit: "cover" };
    s.design = { ...design, headingColor: "url(javascript:x)", mobile: { headingSize: 999, bodySize: 1 } };
    const clean = sanitizeV2Page(page, "esim");
    expect(collectV2MediaIds(clean)).toContain(s.tabletMediaId);
    expect(clean.sections[0]!.tabletImageDisplay).toEqual({ x: 0, y: 100, zoom: 180, fit: "cover" });
    expect(clean.sections[0]!.design?.headingColor).toBeUndefined();
    expect(clean.sections[0]!.design?.mobile).toEqual({ headingSize: 80, bodySize: 11 });
  });
  it("NOTICE preserves default DOM and consumes the same explicit design frame", () => {
    const s = createV2Section("NOTICE");
    const before = renderToStaticMarkup(<V2Notice section={s} title="Title" text="Text" />);
    expect(before).not.toContain("data-v2-section-frame");
    s.design = design;
    const after = renderToStaticMarkup(<V2Notice section={s} title="Title" text="Text" />);
    expect(after).toContain('data-builder-section="notice"');
    expect(after).toContain("--builder-heading-color");
    expect(after).toContain("py-8");
  });
  for (const locale of UI_LOCALES) it(`preserves manual ${locale} copy and provenance through preview sanitation`, () => {
    const page = base(); const s = page.sections[0]!;
    const manual = `Manual-${locale}`;
    const machineLocale = locale === "ja" ? "ko" : "ja";
    s.text["title"] = { ...s.text["title"]!, [machineLocale]: "Existing machine value", [locale]: manual, _src: { fr: "Existing source" }, _auto: { [machineLocale]: "Existing machine value" } };
    setActiveUiLocale(locale);
    const clean = sanitizeV2Page(page, "esim").sections[0]!;
    expect(v2Text(clean, "title", LOCALE_REGISTRY[locale].content)).toBe(manual);
    expect(clean.text["title"]?._src?.fr).toBe("Existing source");
    expect(clean.text["title"]?._auto?.[machineLocale]).toBe("Existing machine value");
    expect(LOCALE_REGISTRY[locale].dir).toBe(locale === "ar" ? "rtl" : "ltr");
  });
});
