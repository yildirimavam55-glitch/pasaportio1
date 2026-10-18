import { describe, expect, it } from "vitest";
import { defaultV2Page, type V2Section } from "@/domain/storefront/v2";
import { heroHeadingParts, publishedHeroPerk, publishedHeroText } from "./hero-cms-copy";

const hero = () => defaultV2Page("esim").sections.find((section) => section.type === "SEARCH_HERO") as V2Section;
const benefits = () => defaultV2Page("esim").sections.find((section) => section.type === "BENEFIT_ROW") as V2Section;

describe("publishedHeroText", () => {
  it("keeps the 14-locale fallback when the published page still has factory seed copy", () => {
    expect(publishedHeroText(hero(), "title", "tr", "Dünyada kesintisiz internet seninle.")).toBe("Dünyada kesintisiz internet seninle.");
    expect(publishedHeroText(hero(), "subtitle", "de", "Mit eSIM in über 190 Ländern immer verbunden.")).toBe("Mit eSIM in über 190 Ländern immer verbunden.");
    expect(publishedHeroText(hero(), "eyebrow", "en", "")).toBe("");
  });

  it("uses an Admin-edited SEARCH_HERO title, subtitle and eyebrow", () => {
    const edited = structuredClone(hero());
    edited.text["title"] = { tr: "Yeni hero başlığı", de: "Neuer Hero-Titel", en: "New hero title" };
    edited.text["subtitle"] = { tr: "Yeni alt başlık", de: "Neuer Untertitel", en: "New subtitle" };
    edited.text["eyebrow"] = { tr: "PASAPORT", de: "PASAPORT", en: "PASAPORT" };
    expect(publishedHeroText(edited, "title", "tr", "fallback")).toBe("Yeni hero başlığı");
    expect(publishedHeroText(edited, "subtitle", "en", "fallback")).toBe("New subtitle");
    expect(publishedHeroText(edited, "eyebrow", "de", "")).toBe("PASAPORT");
  });

  it("falls back when the field is empty", () => {
    const edited = structuredClone(hero());
    edited.text["title"] = { tr: "", de: "", en: "" };
    expect(publishedHeroText(edited, "title", "tr", "Dünyada kesintisiz internet seninle.")).toBe("Dünyada kesintisiz internet seninle.");
  });
});

describe("publishedHeroPerk", () => {
  it("keeps fallback labels for factory BENEFIT_ROW titles", () => {
    expect(publishedHeroPerk(benefits(), "delivery", "tr", { label: "Hızlı teslimat", info: "Dakikalar içinde" })).toEqual({
      label: "Hızlı teslimat",
      info: "Dakikalar içinde",
    });
  });

  it("uses Admin-edited perk title and description", () => {
    const edited = structuredClone(benefits());
    const delivery = edited.items.find((item) => item.id === "delivery");
    if (!delivery) throw new Error("missing delivery");
    delivery.title = { tr: "Anında teslim", de: "Sofort da", en: "Instant delivery" };
    delivery.text = { tr: "QR ile", de: "Per QR", en: "Via QR" };
    expect(publishedHeroPerk(edited, "delivery", "tr", { label: "Hızlı teslimat", info: "Dakikalar içinde" })).toEqual({
      label: "Anında teslim",
      info: "QR ile",
    });
  });
});

describe("heroHeadingParts", () => {
  const fallback = { kicker: "Dünyada", accent: "kesintisiz internet", end: "seninle." };

  it("keeps the mint three-line fallback when CMS title is empty", () => {
    expect(heroHeadingParts("", "", fallback)).toEqual(fallback);
  });

  it("shows a one-line CMS title as the mint accent", () => {
    expect(heroHeadingParts("Yeni başlık", "PASAPORT", fallback)).toEqual({
      kicker: "PASAPORT",
      accent: "Yeni başlık",
      end: "",
    });
  });

  it("splits a multiline CMS title into the existing kicker/accent/end slots", () => {
    expect(heroHeadingParts("Dünyada\nkesintisiz internet\nseninle.", "", fallback)).toEqual({
      kicker: "Dünyada",
      accent: "kesintisiz internet",
      end: "seninle.",
    });
  });
});
