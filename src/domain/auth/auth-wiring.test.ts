import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("independent auth wiring", () => {
  it("keeps the Lovable broker only on Lovable hosts and uses Supabase OAuth elsewhere", () => {
    const page = read("src/components/auth/AuthPage.tsx");
    expect(page).toContain("usesLovableOAuthBroker");
    expect(page).toContain("lovable.auth.signInWithOAuth");
    expect(page).toContain("supabase.auth.signInWithOAuth");
    expect(page).toContain("oauthRedirectTo");
    expect(page).not.toMatch(/user_roles/);
    expect(page).not.toMatch(/is_admin|has_role|invite_admin/);
  });

  it("exchanges the PKCE code on /auth/callback before any /admin navigation", () => {
    const callback = read("src/routes/auth_.callback.tsx");
    expect(callback).toMatch(/createFileRoute\("\/auth_?\/callback"\)/);
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("ssr: false");
    expect(callback).toMatch(/after\.data\.session[\s\S]{0,80}finish\(params\.next\)/);
    expect(read("src/routeTree.gen.ts")).toContain("fullPath: '/auth/callback'");
    expect(callback).not.toMatch(/user_roles|invite_admin/);
  });

  it("does not grant admin from an email address", () => {
    const gate = read("src/components/AdminGate.tsx");
    const access = read("src/lib/platform.functions.ts");
    expect(gate).toContain("getMyAccess");
    expect(access).toContain('rpc("has_role"');
    expect(access).toContain('_role: "admin"');
    expect(access).not.toMatch(/email\s*===|endsWith\(/);
    expect(gate).not.toMatch(/yildirim\.avam55|@gmail\.com/);
  });
});
