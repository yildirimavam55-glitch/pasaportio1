/**
 * PERMANENT PHASE 2.1 SECURITY REGRESSION TESTS (OWNER APPROVED items #1, #2).
 * Do not delete or weaken without explicit owner approval and a changelog entry.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PUBLIC_SETTINGS_FIELDS, toPublicSettings } from "@/domain/platform/settings";

const read = (p: string) => readFileSync(p, "utf8");
const migrations = readdirSync("supabase/migrations").sort().map((f) => read(`supabase/migrations/${f}`)).join("\n");
const lastDef = (name: string) => migrations.slice(migrations.lastIndexOf(`CREATE OR REPLACE FUNCTION public.${name}(`));

describe("role lookup is self-only", () => {
  it("has_role answers only for the caller (or service role)", () => {
    const def = lastDef("has_role");
    expect(def).toMatch(/_user_id = auth\.uid\(\)/);
    expect(def).toMatch(/else false/);
  });
  it("anonymous cannot execute has_role", () => {
    expect(migrations).toMatch(/REVOKE EXECUTE ON FUNCTION public\.has_role\(uuid, public\.app_role\) FROM PUBLIC, anon/);
  });
  it("server code checks only the signed-in user's own role", () => {
    for (const f of readdirSync("src/lib").filter((n) => n.endsWith(".ts"))) {
      for (const m of read(`src/lib/${f}`).matchAll(/rpc\("has_role",\s*\{\s*_user_id:\s*([^,]+),/g)) {
        expect((m[1] ?? "").trim(), f).toMatch(/userId$/);
      }
    }
  });
});

describe("platform_settings table is Admin-only", () => {
  it("public read policy removed and anon SELECT revoked", () => {
    expect(migrations).toMatch(/DROP POLICY IF EXISTS "platform settings public read"/);
    expect(migrations).toMatch(/REVOKE SELECT ON public\.platform_settings FROM anon/);
  });
  it("storefront code never reads the table directly with the public client", () => {
    for (const f of ["src/lib/platform-settings.functions.ts", "src/lib/seo-content.functions.ts"]) {
      expect(read(f), f).not.toMatch(/client\.from\("platform_settings"\)/);
    }
  });
  it("public projection function lists only allowlisted keys", () => {
    const def = lastDef("public_platform_settings");
    const keys = [...def.slice(0, def.indexOf("$$;", def.indexOf("$$") + 2)).matchAll(/'(\w+)', s\.data/g)].map((m) => m[1]);
    const allowed = [...PUBLIC_SETTINGS_FIELDS, "organizationName", "defaultOgImage", "twitterHandle", "hubs"];
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(allowed).toContain(k);
  });
  it("public settings response contains only allowlisted fields", () => {
    expect(Object.keys(toPublicSettings(DEFAULT_SETTINGS)).sort()).toEqual(
      ["brandName", "maintenance", "refundTrust", "supportEmail", "supportUrl", "whatsappWidget"],
    );
  });
});

const env = (() => { try { return read(".env"); } catch { return ""; } })();
const url = env.match(/VITE_SUPABASE_URL="?([^"\n]+)/)?.[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)/)?.[1];
const live = process.env["SECURITY_LIVE"] === "1" && url && key;

describe.skipIf(!live)("live anonymous boundary (phase 2.1)", () => {
  const h = { apikey: key!, "Content-Type": "application/json" };
  it("anonymous direct platform_settings read is denied", async () => {
    const r = await fetch(`${url}/rest/v1/platform_settings?select=data`, { headers: h });
    const body = r.ok ? await r.json() : [];
    expect(Array.isArray(body) ? body.length : 0).toBe(0);
  });
  it("anonymous role lookup is denied", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/has_role`, { method: "POST", headers: h, body: JSON.stringify({ _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" }) });
    expect(r.ok).toBe(false);
  });
  it("anonymous public projection returns only allowlisted fields", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/public_platform_settings`, { method: "POST", headers: h, body: JSON.stringify({ _id: "active" }) });
    const body = (await r.json()) ?? {};
    for (const k of Object.keys(body)) expect(PUBLIC_SETTINGS_FIELDS as readonly string[]).toContain(k);
  });
});
