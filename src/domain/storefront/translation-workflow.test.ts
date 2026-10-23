import { afterEach, describe, expect, it } from "vitest";
import { ltStatus, sanitizeV2Page, defaultV2Page, type LT } from "./v2";
import { aggregateTranslationStatus, manualEdit, mergeMachineTranslation, needsMachineTranslation, sourceEdit, TRANSLATION_TARGETS } from "./translation-workflow";
import { DEMO_TRANSLATIONS, demoLT, simulateSectionTranslations } from "@/builder-preview/translation-fixtures";
import { UI_LOCALES } from "@/i18n/locales";
import { setActiveUiLocale } from "@/i18n/overlay";
afterEach(() => setActiveUiLocale("tr"));

describe("Turkish source and translation provenance", () => {
  it("uses exactly the registry's 13 target languages, never changes visitor preferences", () => {
    expect(TRANSLATION_TARGETS).toEqual(UI_LOCALES.filter(code => code !== "tr"));
    expect(TRANSLATION_TARGETS).toHaveLength(13);
  });
  for (const code of TRANSLATION_TARGETS) it(`protects manual ${code} and marks it outdated after a Turkish edit`, () => {
    const original = manualEdit(demoLT("Önce"), code, "Manual correction");
    expect(ltStatus(original, code)).toBe("MANUALLY_EDITED");
    const changed = sourceEdit(original, "Sonra");
    expect(changed[code]).toBe("Manual correction");
    expect(ltStatus(changed, code)).toBe("OUTDATED");
    expect(needsMachineTranslation(changed, code)).toBe(false);
    expect(mergeMachineTranslation(changed, changed, { [code]: "Overwrite attempt" })[code]).toBe("Manual correction");
  });
  it("marks stale automatic copy, and regenerates only missing or machine-owned values", () => {
    const source = demoLT("Önce");
    const generated = mergeMachineTranslation(source, source, { de: "Automatic" });
    expect(ltStatus(generated, "de")).toBe("AUTO_TRANSLATED");
    const changed = sourceEdit(generated, "Sonra");
    expect(ltStatus(changed, "de")).toBe("OUTDATED");
    expect(needsMachineTranslation(changed, "de")).toBe(true);
    const next = mergeMachineTranslation(changed, changed, { de: "Updated", en: "Missing filled" });
    expect(next.de).toBe("Updated"); expect(next.en).toBe("Missing filled");
    expect(next._src?.de).toBe("Sonra");
  });
  it("conservatively anchors legacy manual values, never treats built-in text as permission to overwrite", () => {
    const legacy: LT = { tr: "Eski", de: "Existing manual", en: "" };
    const changed = sourceEdit(legacy, "Yeni");
    expect(ltStatus(changed, "de")).toBe("OUTDATED"); expect(needsMachineTranslation(changed, "de")).toBe(false);
    expect(legacy._src).toBeUndefined();
  });
  it("rejects delayed results for a changed source and preserves concurrent manual corrections", () => {
    const snapshot = demoLT("Kaynak");
    const edited = sourceEdit(snapshot, "Değişti");
    expect(mergeMachineTranslation(edited, snapshot, { de: "Late" })).toBe(edited);
    const manual = manualEdit(snapshot, "de", "Concurrent manual");
    expect(mergeMachineTranslation(manual, snapshot, { de: "Late", en: "Allowed" })).toMatchObject({ de: "Concurrent manual", en: "Allowed" });
  });
  it("a manual correction equal to the generated text is still manual", () => {
    const source = demoLT("Kaynak"); const generated = mergeMachineTranslation(source, source, { de: "Same" });
    const manual = manualEdit(generated, "de", "Same");
    expect(manual._auto?.de).toBeUndefined(); expect(ltStatus(manual, "de")).toBe("MANUALLY_EDITED");
  });
  it("fixtures cover all 13 targets, preserve manual text and refuse unknown Turkish strings", () => {
    for (const translations of Object.values(DEMO_TRANSLATIONS)) for (const code of TRANSLATION_TARGETS) expect(translations[code]?.trim()).toBeTruthy();
    const section = structuredClone(defaultV2Page("esim").sections[0]!);
    section.text = { title: demoLT("Yolculuğuna bağlı kal"), subtitle: demoLT("Arbitrary unknown Turkish copy") };
    let result = simulateSectionTranslations(section);
    expect(result.unknown).toBe(1); expect(result.section.text["subtitle"]?.de).toBe("");
    expect(result.section.text["title"]?.es).toBe("Mantente conectado durante tu viaje");
    result.section.text["title"] = manualEdit(result.section.text["title"], "es", "Mi corrección");
    expect(simulateSectionTranslations(result.section).section.text["title"]?.es).toBe("Mi corrección");
  });
  it("keeps provenance through existing JSON sanitation and reports missing/outdated honestly", () => {
    const page = structuredClone(defaultV2Page("esim"));
    page.sections[0]!.text["title"] = sourceEdit(manualEdit(demoLT("Önce"), "ar", "يدوي"), "Sonra");
    const clean = sanitizeV2Page(page, "esim").sections[0]!.text["title"]!;
    expect(ltStatus(clean, "ar")).toBe("OUTDATED"); expect(clean.ar).toBe("يدوي");
    expect(aggregateTranslationStatus([clean], "es")).toBe("MISSING");
  });
});
