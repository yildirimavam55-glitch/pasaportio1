/**
 * Guards the owner-reviewed pending least-privilege drafts (0008 / 0009) so later
 * edits cannot silently re-open fields the owner approved hiding.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = "docs/migration/pending/";
const m8 = readFileSync(dir + "0008_least_privilege.sql", "utf8");
const m9 = readFileSync(dir + "0009_hide_margin_flag.sql", "utf8");
const patch9 = readFileSync(dir + "0009_app_patch.diff", "utf8");

const columnGrant = (sql: string, table: string) =>
  sql.match(new RegExp(`GRANT SELECT \\(([^)]*)\\) ON public\\.${table} TO`))?.[1] ?? "";

describe("0008 customer order grants", () => {
  it("customers never get supplier cost or payment fee", () => {
    expect(columnGrant(m8, "orders")).not.toMatch(/provider_cost_total|payment_fee/);
    expect(columnGrant(m8, "order_items")).not.toMatch(/provider_cost/);
  });
  it("customers never get the guest claim token or idempotency key", () => {
    expect(columnGrant(m8, "orders")).not.toMatch(/guest_claim_token|idempotency_key/);
  });
  it("account pages still get the columns they read", () => {
    for (const c of ["order_number", "gross_revenue", "discount_total", "tax_total", "payment_status"]) {
      expect(columnGrant(m8, "orders")).toContain(c);
    }
  });
});

describe("0008 fail-closed post-conditions", () => {
  it("aborts when hidden columns, truncate rights or open postgres defaults remain", () => {
    expect(m8).toContain("0008 FAIL: browser roles keep TRUNCATE/TRIGGER/REFERENCES");
    expect(m8).toContain("0008 FAIL: hidden columns still readable");
    expect(m8).toContain("0008 FAIL: postgres default privileges still open");
  });
  it("a refused supabase_admin change is reported as not applied, never as success", () => {
    expect(m8).toMatch(/RAISE WARNING '0008 NOT APPLIED: supabase_admin/);
    expect(m8).toContain("'defaultPrivilegesSupabaseAdmin'");
  });
  it("security status checks order cost columns", () => {
    for (const c of ["order_items.provider_cost", "orders.provider_cost_total", "orders.payment_fee"]) expect(m8).toContain(c);
  });
});

describe("0009 margin flag", () => {
  it("removes margin_flagged from the browser column grant and moves the filter into the policy", () => {
    expect(columnGrant(m9, "service_products")).not.toContain("margin_flagged");
    expect(m9).toMatch(/customer_visible = true AND margin_flagged = false/);
  });
  it("ships with an app patch that drops every public margin_flagged filter", () => {
    expect(patch9.match(/^-.*margin_flagged/gm)?.length).toBe(6);
    expect(patch9).not.toMatch(/^\+.*margin_flagged/m);
  });
});
