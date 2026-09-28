/**
 * PERMANENT SECURITY REGRESSION TESTS — docs/security/SECURITY_BASELINE.md.
 * Do not delete or weaken these tests to make a build pass. Changing them is a
 * security-sensitive change that needs explicit owner approval and a
 * SECURITY_CHANGELOG.md entry.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RATE_LIMITS, rateLimitBucket } from "@/domain/security/rate-limits";

const read = (p: string) => readFileSync(p, "utf8");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const src = walk("src").filter((p) => /\.(ts|tsx)$/.test(p) && !p.endsWith(".test.ts") && !p.includes("routeTree.gen"));
const clientCode = src.filter((p) => (p.startsWith("src/components") || p.startsWith("src/routes")) && !p.startsWith("src/routes/api") && !p.endsWith(".xml.ts"));

/** Body of a named createServerFn export (until the next top-level export). */
function serverFn(file: string, name: string) {
  const s = read(file);
  const i = s.indexOf(`export const ${name} = createServerFn`);
  expect(i, `${name} missing in ${file}`).toBeGreaterThan(-1);
  const j = s.indexOf("\nexport ", i + 10);
  return s.slice(i, j === -1 ? undefined : j);
}

describe("secrets never reach the browser", () => {
  it("client code never imports the service-role client or reads server secrets", () => {
    for (const f of clientCode) {
      const s = read(f);
      expect(s, f).not.toMatch(/from ["']@\/integrations\/supabase\/client\.server["']/);
      expect(s, f).not.toMatch(/process\.env|SUPABASE_SERVICE_ROLE_KEY/);
    }
  });
  it("no secret is exposed through a VITE_ variable", () => {
    for (const f of src) expect(read(f), f).not.toMatch(/VITE_[A-Z_]*(SERVICE_ROLE|SECRET|ESIM_GO)/);
  });
});

describe("supplier cost protection (P1-1, P1-2)", () => {
  it("public catalogue reads never select supplier cost/metadata", () => {
    for (const f of ["src/lib/esim-catalogue.functions.ts", "src/lib/lounge-catalogue.functions.ts", "src/lib/destinations.functions.ts", "src/lib/esim-destinations.functions.ts", "src/lib/guides.functions.ts", "src/lib/platform.functions.ts", "src/lib/promotions.server.ts"]) {
      expect(read(f), f).not.toMatch(/provider_cost|provider_metadata|pricing_snapshot/);
    }
  });
  it("validateProductForCheckout requires auth, published products, rate limit and returns no cost", () => {
    const f = "src/lib/provider-validate.functions.ts";
    const body = serverFn(f, "validateProductForCheckout");
    expect(body).toContain("requireSupabaseAuth");
    expect(body).toContain('enforceRateLimit("checkoutValidateUser"');
    expect(body).toContain('.eq("lifecycle", "PUBLISHED")');
    expect(body).toContain('.eq("customer_visible", true)');
    const type = read(f).match(/export type ValidationResult = \{[^}]*\}/)?.[0] ?? "";
    expect(type).not.toMatch(/cost|margin/i);
  });
  it("cost columns are revoked from browser roles in a migration", () => {
    const sql = walk("supabase/migrations").map(read).join("\n");
    expect(sql).toMatch(/REVOKE SELECT ON public\.service_products FROM anon, authenticated/);
    expect(sql).toMatch(/REVOKE SELECT ON public\.esim_product_details FROM anon, authenticated/);
  });
});

describe("admin authorization is server-side", () => {
  it("adminDb verifies the role through has_role before privileged access", () => {
    const s = read("src/lib/admin-guard.ts");
    expect(s).toMatch(/rpc\("has_role"/);
    expect(s.indexOf("await assertAdminRole(context)")).toBeLessThan(s.indexOf("client.server"));
  });
  it("no client code writes role tables or trusts local admin flags", () => {
    for (const f of clientCode) {
      const s = read(f);
      expect(s, f).not.toMatch(/from\(["']user_roles["']\)\s*\.(insert|update|upsert|delete)/);
      expect(s, f).not.toMatch(/localStorage\.[a-zA-Z]+\(["'][^"']*admin/i);
    }
  });
  it("every admin-only server function file checks the role", () => {
    for (const f of src.filter((p) => /src\/lib\/admin-[\w-]+\.functions\.ts$/.test(p))) {
      expect(read(f), f).toMatch(/adminDb|assertAdmin|has_role/);
    }
  });
});

describe("payments, refunds and provisioning authority", () => {
  it("customers cannot set PAID: only the admin-gated test payment path writes PAID", () => {
    const body = serverFn("src/lib/commerce.functions.ts", "confirmTestPayment");
    expect(body).toMatch(/adminDb\(/);
    expect(body).toContain("commerce.test_payments");
    const order = serverFn("src/lib/commerce.functions.ts", "createEsimOrderRequest");
    expect(order).not.toMatch(/PAID/);
  });
  it("privileged provisioning is admin-only and live supplier calls are off by default", () => {
    for (const name of ["runOrderProvisioning", "retryProvisioningUnit", "reconcileProvisioningUnit"]) {
      expect(serverFn("src/lib/commerce.functions.ts", name), name).toMatch(/adminDb\(/);
    }
    expect(read("src/lib/commerce.server.ts")).toMatch(/COMMERCE_LIVE_PROVISIONING[^\n]*=== "true"/);
  });
  it("customer refund creation never sets APPROVED/REFUNDED or a client amount", () => {
    const body = serverFn("src/lib/refunds.functions.ts", "createRefundRequest");
    expect(body).not.toMatch(/"APPROVED"|"REFUNDED"/);
    expect(body).not.toMatch(/amount:\s*z\./);
    expect(body).toMatch(/enforceRateLimit\("refundCreateUser"/);
  });
  it("REFUNDED requires a confirmed payment refund at database level", () => {
    const sql = walk("supabase/migrations").map(read).join("\n");
    expect(sql).toMatch(/travely\.payment_refund_confirmed/);
  });
});

describe("QR / activation credentials", () => {
  it("public routes never select QR or activation data", () => {
    for (const f of src.filter((p) => p.startsWith("src/lib/") && !/customer-account|commerce|admin-|refunds|provider/.test(p))) {
      expect(read(f), f).not.toMatch(/qr_payload|install_info|iccid/);
    }
  });
});

describe("rate limits (P1-3)", () => {
  it("owner-approved limits are not weakened", () => {
    expect(RATE_LIMITS.couponValidateIp.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.refundCreateUser.limit).toBeLessThanOrEqual(3);
    expect(RATE_LIMITS.orderCreateUser.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.checkoutValidateUser.limit).toBeLessThanOrEqual(20);
    expect(rateLimitBucket("orderCreateUser", "u1")).toBe("orderCreateUser:u1");
  });
  it("sensitive endpoints enforce limits and the limiter fails closed", () => {
    expect(serverFn("src/lib/promotions.functions.ts", "validateCoupon")).toMatch(/enforceRateLimit\("couponValidateIp"/);
    expect(serverFn("src/lib/commerce.functions.ts", "createEsimOrderRequest")).toMatch(/enforceRateLimit\("orderCreateUser"/);
    expect(read("src/lib/rate-limit.server.ts")).toMatch(/if \(error \|\| data !== true\) throw new RateLimitError/);
  });
});

describe("security status page is read-only", () => {
  it("exposes no write server functions", () => {
    const s = read("src/lib/security-status.functions.ts");
    expect(s).not.toMatch(/method: "POST"/);
    expect(s).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });
});

// Live probes against the real backend as the anonymous role.
const env = existsSync(".env") ? read(".env") : "";
const url = env.match(/VITE_SUPABASE_URL="?([^"\n]+)/)?.[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)/)?.[1];
const live = process.env["SECURITY_LIVE"] === "1" && url && key;
describe.skipIf(!live)("live anonymous boundary", () => {
  const get = (path: string) => fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key! } });
  it("anonymous cannot read supplier cost", async () => {
    expect((await get("service_products?select=provider_cost&limit=1")).ok).toBe(false);
    expect((await get("esim_product_details?select=provider_metadata&limit=1")).ok).toBe(false);
  });
  it("anonymous sees no customer data", async () => {
    for (const t of ["profiles", "orders", "order_items", "customer_esims", "refund_requests", "payment_transactions", "user_roles"]) {
      const r = await get(`${t}?select=*&limit=1`);
      const rows = r.ok ? await r.json() : [];
      expect(rows, t).toEqual([]);
    }
  });
  it("anonymous cannot call the rate limiter", async () => {
    const r = await fetch(`${url}/rest/v1/rpc/consume_rate_limit`, { method: "POST", headers: { apikey: key!, "content-type": "application/json" }, body: JSON.stringify({ _bucket: "x", _limit: 1, _window_seconds: 60 }) });
    expect(r.ok).toBe(false);
  });
});
