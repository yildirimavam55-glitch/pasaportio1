import { describe, expect, it } from "vitest";
import { detectFromLanguages, normalizeLanguageTag, resolveLocale } from "./locales";

describe("device language detection", () => {
  it.each([
    ["tr-TR", "tr"], ["de-DE", "de"], ["de-AT", "de"], ["de-CH", "de"], ["en-US", "en"], ["en-GB", "en"],
    ["fr-FR", "fr"], ["fr-CA", "fr"], ["es-MX", "es"], ["it-IT", "it"], ["pt-BR", "pt"], ["pt-PT", "pt"],
    ["nl-NL", "nl"], ["pl-PL", "pl"], ["ar-SA", "ar"], ["ar-DE", "ar"], ["ru-RU", "ru"], ["ja-JP", "ja"],
    ["ko-KR", "ko"], ["zh-CN", "zh"], ["zh-TW", "zh"], ["zh_HK", "zh"],
  ])("%s → %s", (tag, expected) => expect(normalizeLanguageTag(tag)).toBe(expected));

  it("unsupported only → EN", () => expect(resolveLocale({ navigatorLanguages: ["sv-SE"] })).toBe("en"));
  it("uses first supported, not EN early", () =>
    expect(detectFromLanguages(["sv-SE", "de-DE", "en-US"])).toBe("de"));
  it("URL beats stored beats device", () => {
    expect(resolveLocale({ urlLocale: "tr", stored: "fr", navigatorLanguages: ["de-DE"] })).toBe("tr");
    expect(resolveLocale({ urlLocale: "sepet", stored: "tr", navigatorLanguages: ["de-DE"] })).toBe("tr");
    expect(resolveLocale({ stored: null, navigatorLanguages: ["de-DE"] })).toBe("de");
  });
});
