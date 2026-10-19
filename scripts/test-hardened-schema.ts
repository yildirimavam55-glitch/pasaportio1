/**
 * Applies the hardened schema to a disposable local Postgres and verifies grants.
 * Refuses any supabase.co / owner-cloud URL. Never writes to mnquhlhahgbztjypuqxn.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const HARDENED = join(ROOT, "db/staging/0001_hardened_schema.sql");
const STUB = join(ROOT, "db/staging/0000_local_auth_stub.sql");
const SEED = join(ROOT, "db/staging/0002_safe_test_seed.sql");
const BASELINE = join(ROOT, "db/baseline/0000_baseline_schema.sql");

function refuseCloud(url: string | undefined, label: string) {
  if (!url) return;
  const lower = url.toLowerCase();
  if (lower.includes("supabase.co") || lower.includes("mnquhlhahgbztjypuqxn") || lower.includes("wiqqlvhtrexlbnzifrks")) {
    console.error(`DURUM: reddedildi — ${label} zeigt auf eine Cloud-Datenbank. Kein Write.`);
    process.exit(3);
  }
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const result = spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

const PG_BIN = "/usr/lib/postgresql/16/bin";

function which(bin: string): string | null {
  const result = spawnSync("which", [bin], { encoding: "utf8" });
  if (result.status === 0) return result.stdout.trim();
  const fallback = join(PG_BIN, bin);
  return existsSync(fallback) ? fallback : null;
}

const VERIFY = `
SELECT count(*)::int AS tables
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';

SELECT has_table_privilege('anon', 'public.orders', 'INSERT') AS anon_orders_insert;
SELECT has_table_privilege('anon', 'public.orders', 'TRUNCATE') AS anon_orders_truncate;
SELECT has_column_privilege('anon', 'public.service_products', 'provider_cost', 'SELECT') AS anon_cost;
SELECT has_column_privilege('authenticated', 'public.orders', 'guest_claim_token', 'SELECT') AS auth_claim;
SELECT has_column_privilege('authenticated', 'public.service_products', 'margin_flagged', 'SELECT') AS auth_margin;
SELECT has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE') AS anon_has_role;
SELECT count(*)::int AS test_products FROM public.service_products WHERE is_test AND source = 'INTERNAL_TEST';
SELECT enabled FROM public.feature_flags WHERE key = 'provider.sync';
`;

async function main() {
  // Only connection strings could be an apply target. The HTTP API URL is ignored.
  refuseCloud(process.env["DATABASE_URL"], "DATABASE_URL");
  refuseCloud(process.env["SUPABASE_DB_URL"], "SUPABASE_DB_URL");
  refuseCloud(process.env["PASAPORT_SCHEMA_TARGET"], "PASAPORT_SCHEMA_TARGET");

  const initdb = which("initdb");
  const postgresBin = which("postgres");
  const psqlBin = which("psql");
  if (!initdb || !postgresBin || !psqlBin) {
    console.error("DURUM: postgres fehlt. Installiere lokales PostgreSQL, dann: bun run schema:test-local");
    process.exit(2);
  }

  const dataDir = mkdtempSync(join(tmpdir(), "pasaport-pg-"));
  const socketDir = mkdtempSync(join(tmpdir(), "pasaport-pg-sock-"));
  const port = String(55432 + Math.floor(Math.random() * 200));
  const { spawn } = await import("node:child_process");
  let server: ReturnType<typeof spawn> | undefined;

  try {
    run(initdb, ["-D", dataDir, "--auth=trust", "-U", "postgres"]);
    writeFileSync(join(dataDir, "postgresql.conf"), `\nlisten_addresses = ''\nport = ${port}\nunix_socket_directories = '${socketDir}'\n`, { flag: "a" });
    server = spawn(postgresBin, ["-D", dataDir], { stdio: ["ignore", "pipe", "pipe"] });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("postgres start timeout")), 20000);
      const poll = setInterval(() => {
        const ping = spawnSync(psqlBin, ["-h", socketDir, "-p", port, "-U", "postgres", "-d", "postgres", "-c", "SELECT 1"], {
          encoding: "utf8",
        });
        if (ping.status === 0) {
          clearTimeout(timer);
          clearInterval(poll);
          resolve();
        }
      }, 200);
      server!.on("exit", (code) => {
        clearTimeout(timer);
        clearInterval(poll);
        reject(new Error(`postgres exited ${code}`));
      });
    });

    const psql = (file: string) =>
      run(psqlBin, ["-h", socketDir, "-p", port, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-f", file]);

    // Guard: the unclean original file is never the apply target.
    if (HARDENED === BASELINE) throw new Error("refusing to apply original baseline");
    psql(STUB);
    psql(HARDENED);
    psql(SEED);

    const out = run(psqlBin, [
      "-h",
      socketDir,
      "-p",
      port,
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-A",
      "-t",
      "-c",
      VERIFY,
    ]);
    const lines = out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const tables = Number(lines[0]);
    const flags = {
      tables,
      anon_orders_insert: lines[1],
      anon_orders_truncate: lines[2],
      anon_cost: lines[3],
      auth_claim: lines[4],
      auth_margin: lines[5],
      anon_has_role: lines[6],
      test_products: Number(lines[7]),
      provider_sync: lines[8],
    };
    const ok =
      tables >= 64 &&
      flags.anon_orders_insert === "f" &&
      flags.anon_orders_truncate === "f" &&
      flags.anon_cost === "f" &&
      flags.auth_claim === "f" &&
      flags.auth_margin === "f" &&
      flags.anon_has_role === "f" &&
      flags.test_products === 3 &&
      flags.provider_sync === "f";
    console.log("DURUM: lokaler Isolationstest");
    console.log(JSON.stringify(flags, null, 2));
    console.log(ok ? "ERGEBNIS: gehärtetes Schema OK (Cloud unverändert)" : "ERGEBNIS: FAIL");
    if (!ok) process.exit(1);
  } finally {
    server?.kill("SIGTERM");
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(socketDir, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error("DURUM: hata");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
