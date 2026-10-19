import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { UI_LOCALES } from "@/i18n/locales";
import { liveSupplierCallsEnabled } from "@/lib/commerce.server";
import { isPublishedAssetPath } from "@/lib/published-assets";
import { securityHeaders } from "@/security/headers";

const read = (path: string) => readFileSync(path, "utf8");

describe("Vercel staging wiring", () => {
  it("pins Nitro to the Vercel Node preset when VERCEL or NITRO_PRESET=vercel", () => {
    const vite = read("vite.config.ts");
    expect(vite).toContain('requested === "vercel" || process.env["VERCEL"]');
    expect(vite).toContain('preset: "vercel"');
    expect(read("package.json")).toContain("NITRO_PRESET=vercel");
    expect(read("vercel.json")).toContain("NITRO_PRESET=vercel");
  });

  it("keeps the shared server entry so SSR and API routes stay on the same fetch handler", () => {
    const server = read("src/server.ts");
    expect(server).toContain("@tanstack/react-start/server-entry");
    expect(server).toContain("applySecurityHeaders");
    expect(server).toContain("proxyPublishedAsset");
  });

  it("only proxies safe /__l5e catalogue photographs", () => {
    expect(isPublishedAssetPath("/__l5e/assets-v1/tr.webp")).toBe(true);
    expect(isPublishedAssetPath("/__l5e/assets-v1/../secret")).toBe(false);
    expect(isPublishedAssetPath("/__l5e/../package.json")).toBe(false);
    expect(isPublishedAssetPath("/admin")).toBe(false);
  });

  it("marks the Vercel test host noindex and does not treat it as the Lovable editor", () => {
    const staging = securityHeaders(new URL("https://pasaport-staging.vercel.app/esim"));
    expect(staging["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(staging["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(securityHeaders(new URL("https://x.test/esim/ulkeler"))["X-Robots-Tag"]).toBeUndefined();
  });
});

describe("staging safety flags are server-side", () => {
  it("live eSIM Go purchases stay off unless COMMERCE_LIVE_PROVISIONING is exactly true", () => {
    expect(liveSupplierCallsEnabled()).toBe(false);
    expect(read("src/lib/commerce.server.ts")).toMatch(/COMMERCE_LIVE_PROVISIONING[^\n]*=== "true"/);
    expect(read("src/lib/commerce.functions.ts")).toMatch(/PAYMENTS_LIVE[^\n]*=== "true"/);
    expect(read("env.vercel-staging.example")).toMatch(/COMMERCE_LIVE_PROVISIONING=false/);
    expect(read("env.vercel-staging.example")).toMatch(/PAYMENTS_LIVE=false/);
  });

  it("does not commit secrets or the unclean baseline as the apply target", () => {
    expect(read("env.vercel-staging.example")).not.toMatch(/sb_publishable_|sb_secret_|eyJ/);
    expect(read("env.own-supabase.example")).not.toMatch(/sb_publishable_|sb_secret_|eyJ/);
    expect(read("scripts/build-hardened-schema.ts")).toContain("Never apply db/baseline/0000_baseline_schema.sql");
    expect(read("scripts/test-hardened-schema.ts")).toContain("mnquhlhahgbztjypuqxn");
    expect(read("scripts/test-hardened-schema.ts")).toContain("Never writes");
  });

  it("keeps all 14 storefront locales", () => {
    expect([...UI_LOCALES]).toEqual(["tr", "en", "de", "fr", "es", "it", "pt", "nl", "pl", "ar", "ru", "ja", "ko", "zh"]);
  });

  it("public catalogue code no longer reads margin_flagged (0009 app patch)", () => {
    for (const file of [
      "src/lib/esim-catalogue.functions.ts",
      "src/lib/esim-destinations.functions.ts",
      "src/lib/guides.functions.ts",
    ]) {
      expect(read(file), file).not.toMatch(/margin_flagged/);
    }
  });
});
