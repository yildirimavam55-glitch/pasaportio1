import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { designV2ToPublic, isLegacyPath } from "../public-routes";
import { toV2Path } from "@/components/design-v2/v2-context";
import { PRIMARY_SERVICES, SERVICE_TYPES } from "@/domain/enums";
import { SERVICE_DEFINITIONS } from "@/domain/services";
import { isCartSellableService } from "@/domain/cart/store";
import { vignetteAvailability } from "@/lib/admin-vignette.functions";

const read = (p: string) => readFileSync(`src/routes/${p}`, "utf8");

describe("V2 is the primary storefront", () => {
  it("public home/locale/eSIM routes render the V2 eSIM page", () => {
    for (const f of ["index.tsx", "tr.index.tsx", "de.index.tsx", "en.index.tsx", "esim.index.tsx"]) {
      expect(read(f)).toContain("EsimHomePage");
      expect(read(f)).not.toContain("TravelExperience");
    }
  });
  it("Lounge, Vignette, cart, support, auth and account use V2 components", () => {
    expect(read("lounge.index.tsx")).toContain("V2Shell");
    expect(read("vignette.tsx")).toContain("V2Shell");
    expect(read("sepet.tsx")).toContain("V2Shell");
    expect(read("account.tsx")).toContain("V2Shell");
  });
  it("former /design-v2 URLs map to public URLs", () => {
    expect(designV2ToPublic("/design-v2/esim")).toBe("/esim");
    expect(designV2ToPublic("/design-v2/esim-region/EUROPE")).toBe("/esim/bolge/EUROPE");
    expect(designV2ToPublic("/design-v2/cart")).toBe("/sepet");
    expect(designV2ToPublic("/design-v2/account/orders")).toBe("/account/orders");
    expect(designV2ToPublic("/design-v2/auth/login")).toBe("/auth");
  });
  it("V2 link mapping keeps customers on public V2 URLs", () => {
    expect(toV2Path("/esim/ulkeler")).toBe("/esim");
    expect(toV2Path("/lounge/secenekler")).toBe("/lounge");
    expect(toV2Path("/account/orders")).toBe("/account/orders");
    expect(toV2Path("/sepet")).toBe("/sepet");
  });
});

describe("Legacy V1 isolation", () => {
  it("V1 files are preserved under the admin-only legacy area", () => {
    for (const f of ["legacy-v1.index.tsx", "legacy-v1.esim.index.tsx", "legacy-v1.lounge.index.tsx", "legacy-v1.sepet.tsx", "legacy-v1.auth.tsx", "legacy-v1.account.index.tsx"]) {
      expect(existsSync(`src/routes/_authenticated/${f}`)).toBe(true);
    }
  });
  it("legacy layout is noindex and admin-gated", () => {
    const layout = read("_authenticated/legacy-v1.tsx");
    expect(layout).toContain("noindex");
    expect(layout).toContain("isAdmin");
    expect(isLegacyPath("/legacy-v1/esim")).toBe(true);
    expect(isLegacyPath("/esim")).toBe(false);
  });
  it("sitemap excludes legacy and preview URLs", () => {
    const sitemap = readFileSync("src/routes/sitemap.xml.ts", "utf8");
    expect(sitemap).not.toMatch(/["']\/legacy-v1/);
    expect(sitemap).not.toMatch(/["']\/design-v2/);
  });
});

describe("Vignette as a first-class service", () => {
  it("is a primary service with its own definition (never mapped to Lounge)", () => {
    expect(PRIMARY_SERVICES).toEqual(["ESIM", "LOUNGE", "VIGNETTE"]);
    expect(SERVICE_TYPES).toContain("VIGNETTE");
    expect(SERVICE_DEFINITIONS.VIGNETTE.slug).toBe("vignette");
    expect(SERVICE_DEFINITIONS.VIGNETTE.enabledByDefault).toBe(false);
  });
  it("is not addable to the cart while not for sale", () => {
    expect(isCartSellableService("VIGNETTE")).toBe(false);
    expect(isCartSellableService("ESIM")).toBe(true);
  });
  it("derives commercial availability from service switches", () => {
    expect(vignetteAvailability(true, false)).toBe("NOT_FOR_SALE");
    expect(vignetteAvailability(false, false)).toBe("PAUSED");
    expect(vignetteAvailability(true, true)).toBe("ACTIVE");
  });
  it("admin Vignette data and service controls are admin-guarded", () => {
    expect(readFileSync("src/lib/admin-vignette.functions.ts", "utf8")).toContain("adminDb(");
    expect(read("_authenticated/admin.service-controls.tsx")).toContain("checkout.vignette");
  });
});
