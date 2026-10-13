/**
 * PERMANENT PHASE 2 SECURITY REGRESSION TESTS. Do not delete or weaken
 * without explicit owner approval and a SECURITY_CHANGELOG.md entry.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { securityHeaders, PERMISSIONS_POLICY, CSP_DIRECTIVES } from "@/security/headers";
import { safeJsonLd } from "@/security/json-ld";
import { DEFAULT_SETTINGS, PUBLIC_SETTINGS_FIELDS, toPublicSettings } from "@/domain/platform/settings";

const read = (p: string) => readFileSync(p, "utf8");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe("security headers", () => {
  const prod = securityHeaders(new URL("https://pasaport.io/"));
  const preview = securityHeaders(new URL("https://id-preview--abc.lovable.app/"));
  it("production cannot be framed by other sites", () => {
    expect(prod["Content-Security-Policy"]).toBe("frame-ancestors 'self'");
    expect(prod["X-Frame-Options"]).toBe("SAMEORIGIN");
  });
  it("preview stays embeddable only by the Lovable editor", () => {
    expect(preview["Content-Security-Policy"]).toContain("https://lovable.dev");
    expect(preview["X-Frame-Options"]).toBeUndefined();
  });
  it("CSP has no wildcard sources and blocks plugins", () => {
    for (const v of Object.values(CSP_DIRECTIVES)) expect(v).not.toContain("*");
    expect(CSP_DIRECTIVES["object-src"]).toEqual(["'none'"]);
    expect(prod["Content-Security-Policy-Report-Only"]).toContain("default-src 'self'");
  });
  it("permissions policy disables unused capabilities", () => {
    for (const k of ["camera=()", "microphone=()", "geolocation=()", "usb=()"]) expect(PERMISSIONS_POLICY).toContain(k);
  });
  it("server entry applies the headers", () => {
    expect(read("src/server.ts")).toMatch(/applySecurityHeaders\(request/);
  });
});

describe("admin noindex", () => {
  it("admin and account paths send noindex, nofollow", () => {
    for (const p of ["/admin", "/admin/security", "/account/esims", "/api/public/provider-sync"]) {
      expect(securityHeaders(new URL("https://x.test" + p))["X-Robots-Tag"], p).toBe("noindex, nofollow");
    }
    expect(securityHeaders(new URL("https://x.test/esim/ulkeler"))["X-Robots-Tag"]).toBeUndefined();
  });
  it("sitemap never lists admin or account URLs", () => {
    expect(read("src/lib/sitemap-xml.server.ts")).not.toMatch(/["'`]\/(admin|account)/);
    expect(read("public/robots.txt")).toMatch(/Disallow: \/admin/);
  });
});

describe("public vs private settings", () => {
  it("public settings exclude operational fields", () => {
    const pub = toPublicSettings(DEFAULT_SETTINGS) as Record<string, unknown>;
    for (const k of ["senderName", "timezone", "reportingCurrency", "defaultLocale"]) expect(pub[k], k).toBeUndefined();
    expect(Object.keys(pub).sort()).toEqual([...PUBLIC_SETTINGS_FIELDS].sort());
  });
  it("public availability endpoint returns only the public projection", () => {
    const s = read("src/lib/platform-settings.functions.ts");
    const i = s.indexOf("export const getServiceAvailability"); const body = s.slice(i, s.indexOf("\nexport ", i + 10));
    expect(body).toMatch(/toPublicSettings\(sanitizeSettings/);
  });
});

describe("provider sync errors", () => {
  it("public response never contains the raw error message", () => {
    const s = read("src/routes/api/public/provider-sync.ts");
    expect(s).not.toMatch(/error as Error\)\.message/);
    expect(s).toContain("authenticateCronRequest(request)");
  });
});

describe("JSON-LD escaping", () => {
  it("escapes script-closing content and stays valid JSON", () => {
    const out = safeJsonLd({ name: "</script><img src=x onerror=alert(1)>&\u2028" });
    expect(out).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(out).name).toBe("</script><img src=x onerror=alert(1)>&\u2028");
  });
  it("no ld+json block uses raw JSON.stringify", () => {
    for (const f of walk("src").filter((p) => /\.(ts|tsx)$/.test(p) && !p.includes(".test."))) {
      const s = read(f);
      if (s.includes("application/ld+json")) expect(s, f).not.toMatch(/(children|__html): JSON\.stringify\(/);
    }
  });
});

describe("admin database functions are not anonymous", () => {
  it("a migration revokes anon EXECUTE from admin/role functions", () => {
    const sql = walk("drizzle/migrations").filter((p) => p.endsWith(".sql")).map(read).join("\n");
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon/);
    for (const fn of ["list_admin_users", "invite_admin", "revoke_admin", "has_role", "is_admin"]) expect(sql).toContain(`public.${fn}(`);
  });
});

describe("payment launch gate", () => {
  it("test payment path refuses when real payments are live", () => {
    const s = read("src/lib/commerce.functions.ts");
    const i = s.indexOf("export const confirmTestPayment");
    const body = s.slice(i, s.indexOf("\nexport ", i + 10));
    expect(body.indexOf('PAYMENTS_LIVE')).toBeGreaterThan(-1);
    expect(body.indexOf('PAYMENTS_LIVE')).toBeLessThan(body.indexOf('supabaseAdmin'));
  });
  it("REAL PAYMENTS + TEST PAYMENT PATH = FAILURE", () => {
    const pkg = read("package.json");
    const realPayments = /"(stripe|@paddle\/[\w-]+|@stripe\/[\w-]+)"/.test(pkg) || existsSync("src/routes/api/public/payments") || existsSync("src/routes/api/public/payment-webhook.ts");
    if (realPayments) expect(read("src/lib/commerce.functions.ts")).not.toContain("confirmTestPayment");
  });
});
