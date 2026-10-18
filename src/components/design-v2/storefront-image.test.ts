import { describe, expect, it } from "vitest";
import { HERO_SUMMIT_ID, resolveHeroMediaId } from "./storefront-image";

describe("resolveHeroMediaId", () => {
  it("falls back to the summit default when no CMS media is set", () => {
    expect(resolveHeroMediaId()).toBe(HERO_SUMMIT_ID);
    expect(resolveHeroMediaId(null, null)).toBe(HERO_SUMMIT_ID);
    expect(resolveHeroMediaId("")).toBe(HERO_SUMMIT_ID);
  });

  it("keeps the factory builtin and restored airport ids on the summit default", () => {
    expect(resolveHeroMediaId("builtin:esim-hero")).toBe(HERO_SUMMIT_ID);
    expect(resolveHeroMediaId("2096d4af-5b89-49ad-b19f-7ca95ec54160")).toBe(HERO_SUMMIT_ID);
  });

  it("applies an Admin-selected hero media id", () => {
    expect(resolveHeroMediaId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee")).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(resolveHeroMediaId("builtin:esim-hero-summit")).toBe(HERO_SUMMIT_ID);
  });

  it("prefers the mobile media id on the mobile slot", () => {
    expect(resolveHeroMediaId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", "ffffffff-1111-4aaa-8bbb-cccccccccccc", true)).toBe(
      "ffffffff-1111-4aaa-8bbb-cccccccccccc",
    );
  });
});
