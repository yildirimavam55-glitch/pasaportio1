/**
 * Builds db/staging/0001_hardened_schema.sql from the existing schema audit.
 * Never copies the unclean GRANT ALL baseline as the apply target.
 * Does not connect to any database.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const BASELINE = join(ROOT, "db/baseline/0000_baseline_schema.sql");
const OUT = join(ROOT, "db/staging/0001_hardened_schema.sql");
const PENDING = join(ROOT, "docs/migration/pending");

const OPEN_GRANT =
  /^(GRANT ALL ON (?:TABLE|SEQUENCE|ALL (?:TABLES|SEQUENCES) IN SCHEMA public) .+ TO (?:anon|authenticated);|GRANT ALL ON FUNCTION .+ TO anon;)$/;
const OPEN_DEFAULT =
  /^ALTER DEFAULT PRIVILEGES FOR ROLE \w+ IN SCHEMA public GRANT ALL ON (TABLES|SEQUENCES|FUNCTIONS) TO (anon|authenticated);$/;

const FUNCTION_KEEP = new Set([
  "is_admin",
  "has_role",
  "security_baseline_status",
  "consume_rate_limit",
  "refund_events_append_only",
  "admin_audit_log_append_only",
  "cms_versions_append_only",
  "storefront_country_starting_prices",
  "storefront_regional_package_rows",
]);

function extractBaselineInner(source: string): string {
  const start = source.indexOf("EXECUTE $pasaport_baseline$");
  const end = source.lastIndexOf("$pasaport_baseline$");
  if (start < 0 || end <= start) throw new Error("baseline dollar-quote body not found");
  const innerStart = source.indexOf("\n", start);
  return source.slice(innerStart + 1, end);
}

function stripDangerousGrants(sql: string): string {
  return sql
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !OPEN_GRANT.test(trimmed) && !OPEN_DEFAULT.test(trimmed);
    })
    .join("\n");
}

function publicTables(sql: string): Set<string> {
  const names = new Set<string>();
  for (const match of sql.matchAll(/CREATE TABLE public\.([a-z0-9_]+)/g)) {
    names.add(match[1]!);
  }
  return names;
}

/** Drop table identifiers that 0008 names but the baseline never created. */
function dropMissingTableRefs(sql: string, existing: Set<string>): string {
  const mentioned = [...sql.matchAll(/public\.([a-z0-9_]+)/g)].map((match) => match[1]!);
  const missing = [...new Set(mentioned)].filter(
    (name) => !existing.has(name) && !name.includes("_append_only") && !FUNCTION_KEEP.has(name),
  );
  let out = sql;
  for (const name of missing) {
    out = out.replace(new RegExp(`\\s*,\\s*public\\.${name}\\b`, "g"), "");
    out = out.replace(new RegExp(`public\\.${name}\\b\\s*,\\s*`, "g"), "");
    out = out.replace(new RegExp(`public\\.${name}\\b`, "g"), "");
  }
  return out;
}

const PUBLIC_RPCS = `
-- Storefront RPCs the browser calls. Admin RPCs keep authenticated EXECUTE
-- from the stripped baseline (GRANT ALL TO authenticated on functions).
GRANT EXECUTE ON FUNCTION public.public_platform_settings(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_promotion_banner() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.esim_plan_tier(jsonb) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.security_baseline_status() FROM PUBLIC, anon;
`;

function main() {
  const raw = readFileSync(BASELINE, "utf8");
  if (!raw.includes("GRANT ALL ON TABLE public.orders TO anon")) {
    throw new Error("unexpected baseline: expected unclean GRANT ALL to rewrite");
  }
  const stripped = stripDangerousGrants(extractBaselineInner(raw));
  if (/GRANT ALL ON TABLE public\.\w+ TO anon;/.test(stripped)) {
    throw new Error("hardened output still grants ALL on tables to anon");
  }
  const tables = publicTables(stripped);
  const pending0008 = dropMissingTableRefs(readFileSync(join(PENDING, "0008_least_privilege.sql"), "utf8"), tables);
  const pending0009 = readFileSync(join(PENDING, "0009_hide_margin_flag.sql"), "utf8");
  const pending0010 = readFileSync(join(PENDING, "0010_signup_profile_trigger.sql"), "utf8");
  const pending0011 = readFileSync(join(PENDING, "0011_guest_delivery_access.sql"), "utf8");

  const header = `-- GENERATED — do not edit by hand. Rebuild with: bun run schema:harden
-- Source: schema audit (db/baseline) with GRANT ALL to anon/authenticated removed,
-- then pending 0008/0009/0010/0011. Never apply db/baseline/0000_baseline_schema.sql.
-- NOT applied to any cloud database. Isolated local test only until explicit owner approval.

`;

  const body = [
    header,
    "BEGIN;",
    "SET LOCAL check_function_bodies = false;",
    stripped.trim(),
    PUBLIC_RPCS.trim(),
    pending0008.trim(),
    pending0009.trim(),
    pending0010.trim(),
    pending0011.trim(),
    "COMMIT;",
    "",
  ].join("\n\n");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, body);
  console.log(`wrote ${OUT}`);
  console.log(`baseline_tables=${tables.size}`);
  console.log("cloud_apply=blocked (no target write)");
}

main();
