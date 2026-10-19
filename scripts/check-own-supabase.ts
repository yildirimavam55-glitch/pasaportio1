/**
 * Read-only probe for the owner Supabase project.
 * Loads only .env.own-supabase (never .env / .env.development).
 * Refuses the Lovable project. Never prints keys. Never writes.
 */
import { existsSync, readFileSync } from "node:fs";

const LOVABLE_REF = "wiqqlvhtrexlbnzifrks";
const FILES = [".env.own-supabase", "env.own-supabase"] as const;

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function hostOf(url: string): string {
  return new URL(url).host;
}

function projectRef(url: string): string {
  return hostOf(url).split(".")[0] ?? "";
}

function looksLikeSecretKey(value: string): boolean {
  return value.startsWith("sb_secret_") || /service_role/i.test(value);
}

async function main() {
  const path = FILES.find((file) => existsSync(file));
  if (!path) {
    console.log("DURUM: bekliyor");
    console.log("Ayrı test dosyası yok (.env.own-supabase). Lovable .env okunmadı.");
    console.log("Yeni Project URL ve publishable/anon key'i .env.own-supabase içine yaz.");
    console.log("Anahtarları sohbete veya Git'e yapıştırma.");
    process.exit(2);
  }

  const env = parseEnv(readFileSync(path, "utf8"));
  const url = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"];
  const key = env["SUPABASE_PUBLISHABLE_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    console.log("DURUM: eksik alan");
    console.log("Gerekli: SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY");
    process.exit(2);
  }
  if (env["SUPABASE_SERVICE_ROLE_KEY"] || looksLikeSecretKey(key)) {
    console.log("DURUM: reddedildi");
    console.log("service_role / secret key bu testte kullanılmaz. Yalnızca publishable veya anon key yaz.");
    process.exit(3);
  }

  const ref = projectRef(url);
  if (ref === LOVABLE_REF) {
    console.log("DURUM: reddedildi");
    console.log("Dosya hâlâ Lovable projesini gösteriyor. Eski veritabanı test hedefi olamaz.");
    process.exit(3);
  }

  const root = url.replace(/\/+$/, "");
  const settings = await fetch(`${root}/auth/v1/settings`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!settings.ok) {
    console.log("DURUM: erişilemedi");
    console.log(`host=${hostOf(url)} http=${settings.status}`);
    process.exit(1);
  }

  const rest = await fetch(`${root}/rest/v1/services?select=service_type&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  console.log("DURUM: bağlantı OK (yalnızca okuma)");
  console.log(`host=${hostOf(url)}`);
  console.log(`ref=${ref}`);
  console.log(`public_schema=${rest.ok ? "tablolar_var" : "bos_veya_sema_yok"}`);
  console.log("Uygulama hâlâ Lovable .env kullanıyor. Geçiş yapılmadı.");
}

void main().catch((error: unknown) => {
  const raw = error instanceof Error ? error.message : "unknown";
  console.log("DURUM: hata");
  console.log(raw.replace(/eyJ[\w.-]+/g, "[redacted]").replace(/sb_[a-z]+_[A-Za-z0-9]+/g, "[redacted]"));
  process.exit(1);
});
