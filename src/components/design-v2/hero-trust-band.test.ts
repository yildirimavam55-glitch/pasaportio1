import { describe, expect, it } from "vitest";
import { defaultV2Page, type V2Section } from "@/domain/storefront/v2";
import { trustBandItems } from "./hero-trust-band";

const benefits = () => defaultV2Page("esim").sections.find((entry) => entry.type === "BENEFIT_ROW") as V2Section;

describe("hero trust band", () => {
  it("shows the four approved items in order with the refund item third in Turkish", () => {
    const items = trustBandItems(benefits(), "tr");
    expect(items.map((entry) => entry.label)).toEqual(["Hızlı teslimat", "Kolay kurulum", "14 gün iade", "WhatsApp destek"]);
    expect(items.map((entry) => entry.icon)).toEqual(["Zap", "Smartphone", "CalendarCheck", "Headphones"]);
    expect(items[2]?.href).toBe("/legal/refund");
  });

  it("links the other three items to their existing pages", () => {
    const items = trustBandItems(benefits(), "tr");
    expect(items[0]?.href).toBe("/legal/terms");
    expect(items[1]?.href).toBe("/esim/kurulum");
    expect(items[3]?.href).toMatch(/^https:\/\/wa\.me\//);
  });

  it("keeps the refund label localized in every shipped language", () => {
    const refund = benefits().items.find((entry) => entry.id === "refund");
    expect(refund?.title).toMatchObject({ tr: "14 gün iade", de: "14 Tage Rückgabe", en: "14-day refunds", ar: "استرداد خلال 14 يومًا" });
    expect(trustBandItems(benefits(), "de")[2]?.label).toBe("14 Tage Rückgabe");
    expect(trustBandItems(benefits(), "en")[2]?.label).toBe("14-day refunds");
  });

  it("lets a saved Admin edit win over the built-in copy", () => {
    const edited = structuredClone(benefits());
    const target = edited.items.find((entry) => entry.id === "refund");
    if (!target) throw new Error("Missing refund item");
    target.title = { ...target.title, tr: "Vazgeçme koşulları" };
    target.icon = "RotateCcw";
    target.href = "/destek";
    expect(trustBandItems(edited, "tr")[2]).toMatchObject({ label: "Vazgeçme koşulları", icon: "RotateCcw", href: "/destek" });
  });

  it("honours Admin visibility and order", () => {
    const edited = structuredClone(benefits());
    edited.items = edited.items.filter((entry) => entry.id !== "delivery").reverse();
    expect(trustBandItems(edited, "tr").map((entry) => entry.id)).toEqual(["support", "refund", "setup"]);
  });

  it("falls back to the approved row when the section is missing", () => {
    expect(trustBandItems(undefined, "tr").map((entry) => entry.label)).toEqual(["Hızlı teslimat", "Kolay kurulum", "14 gün iade", "WhatsApp destek"]);
  });
});
