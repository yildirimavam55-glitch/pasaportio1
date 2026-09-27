import { describe, expect, it } from "vitest";
import { bannerHeadline, bannerParts, bannerTagline, formatDiscount, isStructuredBanner, PROMO_HEADLINE } from "@/domain/promotions";
import { UI_LOCALES } from "@/i18n/locales";

describe("structured promo banner", () => {
  const text = { _v: "2", tr: "İlk siparişine özel", de: "Rabatt auf deine erste Bestellung", _source: "İlk siparişine özel", _overrides: "de" };
  it("has a headline for every storefront locale with discount and code slots", () => {
    for (const l of UI_LOCALES) { expect(PROMO_HEADLINE[l]).toContain("{discount}"); expect(PROMO_HEADLINE[l]).toContain("{code}"); }
  });
  it("keeps the coupon code untouched in every locale", () => {
    for (const l of UI_LOCALES) expect(bannerParts(bannerHeadline(text, l), formatDiscount("PERCENT", 15, l), "TRAVEL15").code).toBe("TRAVEL15");
  });
  it("formats percent and fixed discounts", () => {
    expect(bannerParts(bannerHeadline(text, "tr"), formatDiscount("PERCENT", 15, "tr"), "TRAVEL15").before).toBe("%15 İndirim | Kod: ");
    expect(bannerParts(bannerHeadline(text, "de"), formatDiscount("FIXED", 5, "de"), "X").before).toBe("5 € Rabatt | Code: ");
    expect(bannerParts(bannerHeadline(text, "en"), formatDiscount("FIXED", 5, "en"), "X").before).toBe("€5 Off | Code: ");
  });
  it("falls back locale → en → tr for the tagline", () => {
    expect(bannerTagline(text, "de")).toBe("Rabatt auf deine erste Bestellung");
    expect(bannerTagline(text, "fr")).toBe("İlk siparişine özel");
    expect(bannerTagline({ ...text, en: "Save on your first order" }, "fr")).toBe("Save on your first order");
  });
  it("leaves legacy template campaigns unchanged", () => {
    const legacy = { tr: "{discount} İndirim | Kod: {code}", en: "{discount} Off | Code: {code}" };
    expect(isStructuredBanner(legacy)).toBe(false);
    expect(bannerHeadline(legacy, "tr")).toBe(legacy.tr);
    expect(bannerHeadline(legacy, "fr")).toBe(legacy.en);
  });
});
