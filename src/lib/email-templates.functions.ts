/**
 * Admin → E-postalar server functions. Admin role verified first in every handler.
 * Nothing here sends e-mail; templates are stored, versioned, previewed and exported only.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { EMAIL_LOCALES, EMAIL_TEMPLATE_KEYS, type EmailLocale, type EmailTemplateKey, type TemplateCopy } from "@/domain/email/catalog";
import { isEmailLocale, isTemplateKey, validateCopy } from "@/domain/email/render";
import { diffBundle, EXPORT_FORMAT, EXPORT_VERSION, parseBundle, seedBundle, type BundleTemplate, type TemplateBundle } from "@/domain/email/transfer";

type Ctx = AdminCtx & { userId: string };
type Snapshot = { name: string; description: string; active: boolean; translations: Partial<Record<EmailLocale, TemplateCopy>> };

async function loadAll(db: any): Promise<(BundleTemplate & { currentVersion: number; updatedAt: string })[]> {
  const [{ data: rows, error: e1 }, { data: tr, error: e2 }] = await Promise.all([
    db.from("email_templates").select("key, name, description, active, current_version, updated_at"),
    db.from("email_template_translations").select("template_key, locale, subject, preheader, body"),
  ]);
  if (e1 || e2) throw new Error("E-posta şablonları okunamadı.");
  const order = (k: string) => EMAIL_TEMPLATE_KEYS.indexOf(k as EmailTemplateKey);
  return (rows ?? [])
    .sort((a: any, b: any) => order(a.key) - order(b.key))
    .map((row: any) => ({
      key: row.key,
      name: row.name,
      description: row.description ?? "",
      active: row.active,
      currentVersion: row.current_version,
      updatedAt: row.updated_at,
      translations: Object.fromEntries(
        (tr ?? []).filter((t: any) => t.template_key === row.key).map((t: any) => [t.locale, { subject: t.subject, preheader: t.preheader ?? "", body: t.body }]),
      ),
    }));
}

/** Writes a full snapshot as the template's next version (append-only history). */
async function writeVersion(db: any, userId: string, key: EmailTemplateKey, snap: Snapshot, note: string, restoredFrom: number | null) {
  const { data: existing } = await db.from("email_templates").select("current_version").eq("key", key).maybeSingle();
  const { data: last } = await db.from("email_template_versions").select("version").eq("template_key", key).order("version", { ascending: false }).limit(1);
  const next = Math.max(existing?.current_version ?? 0, last?.[0]?.version ?? 0) + 1;
  const meta = { name: snap.name, description: snap.description, active: snap.active, current_version: next, updated_by: userId };
  const up = existing
    ? await db.from("email_templates").update(meta).eq("key", key)
    : await db.from("email_templates").insert({ key, ...meta });
  if (up.error) throw new Error("Şablon kaydedilemedi.");
  const locales = Object.keys(snap.translations) as EmailLocale[];
  if (locales.length) {
    const { error } = await db.from("email_template_translations").upsert(
      locales.map((locale) => ({ template_key: key, locale, ...snap.translations[locale]!, updated_by: userId })),
      { onConflict: "template_key,locale" },
    );
    if (error) throw new Error("Çeviriler kaydedilemedi.");
  }
  const removed = EMAIL_LOCALES.filter((l) => !locales.includes(l));
  if (removed.length) await db.from("email_template_translations").delete().eq("template_key", key).in("locale", removed);
  const { error: ve } = await db.from("email_template_versions").insert({
    template_key: key, version: next, snapshot: snap, change_note: note.slice(0, 300), restored_from: restoredFrom, created_by: userId,
  });
  if (ve) throw new Error("Sürüm kaydı yazılamadı.");
  return next;
}

function checkSnapshot(key: EmailTemplateKey, snap: Snapshot) {
  const errors: string[] = [];
  for (const [locale, copy] of Object.entries(snap.translations)) {
    if (!isEmailLocale(locale)) errors.push(`Geçersiz dil: ${locale}`);
    else for (const e of validateCopy(key, copy as TemplateCopy)) errors.push(`${locale.toUpperCase()}: ${e}`);
  }
  for (const l of ["tr", "en", "de"] as const) if (!snap.translations[l]) errors.push(`${l.toUpperCase()} içeriği zorunlu.`);
  if (errors.length) throw new Error(errors.join(" · "));
}

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    return { templates: await loadAll(db), sendingEnabled: false as const };
  });

export const getEmailTemplateVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => {
    if (!isTemplateKey(input?.key)) throw new Error("Geçersiz şablon.");
    return { key: input.key };
  })
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { data: rows, error } = await db
      .from("email_template_versions")
      .select("version, snapshot, change_note, restored_from, created_at")
      .eq("template_key", data.key)
      .order("version", { ascending: false })
      .limit(50);
    if (error) throw new Error("Sürüm geçmişi okunamadı.");
    return { versions: rows ?? [] };
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; snapshot: Snapshot; note?: string }) => {
    if (!isTemplateKey(input?.key)) throw new Error("Geçersiz şablon.");
    const s = input.snapshot;
    if (!s || typeof s.name !== "string" || !s.name.trim() || typeof s.translations !== "object") throw new Error("Geçersiz şablon verisi.");
    const snap: Snapshot = { name: s.name.trim().slice(0, 120), description: String(s.description ?? "").slice(0, 500), active: !!s.active, translations: {} };
    for (const [l, c] of Object.entries(s.translations ?? {})) {
      snap.translations[l as EmailLocale] = { subject: String((c as any)?.subject ?? ""), preheader: String((c as any)?.preheader ?? ""), body: String((c as any)?.body ?? "") };
    }
    checkSnapshot(input.key, snap);
    return { key: input.key, snapshot: snap, note: String(input.note ?? "") };
  })
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const before = (await loadAll(db)).find((t) => t.key === data.key) ?? null;
    const version = await writeVersion(db, ctx.userId, data.key, data.snapshot, data.note || "Düzenleme", null);
    await audit(db, "email_template.update", "email_template", data.key, before ? { version: before.currentVersion } : null, { version, locales: Object.keys(data.snapshot.translations) });
    return { version };
  });

export const restoreEmailTemplateVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; version: number }) => {
    if (!isTemplateKey(input?.key) || !Number.isInteger(input?.version) || input.version < 1) throw new Error("Geçersiz sürüm.");
    return input as { key: EmailTemplateKey; version: number };
  })
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const { data: row } = await db.from("email_template_versions").select("snapshot").eq("template_key", data.key).eq("version", data.version).maybeSingle();
    if (!row) throw new Error("Sürüm bulunamadı.");
    const snap = row.snapshot as Snapshot;
    checkSnapshot(data.key, snap);
    const version = await writeVersion(db, ctx.userId, data.key, snap, `Sürüm ${data.version} geri yüklendi`, data.version);
    await audit(db, "email_template.restore", "email_template", data.key, { restoredFrom: data.version }, { version });
    return { version };
  });

export const exportEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const all = await loadAll(db);
    const bundle: TemplateBundle = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      templates: all.map(({ currentVersion: _v, updatedAt: _u, ...t }) => t),
    };
    await audit(db, "email_template.export", "email_template", null, null, { count: bundle.templates.length });
    return bundle;
  });

function bundleFromInput(input: { json?: unknown; useSeed?: boolean }) {
  if (input?.useSeed) return parseBundle(seedBundle());
  let raw: unknown = input?.json;
  if (typeof raw === "string") {
    if (raw.length > 1_000_000) return { bundle: null, errors: ["Dosya çok büyük (en fazla 1 MB)."] };
    try { raw = JSON.parse(raw); } catch { return { bundle: null, errors: ["Geçerli bir JSON dosyası değil."] }; }
  }
  return parseBundle(raw);
}

export const previewEmailImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json?: string; useSeed?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as Ctx);
    const { bundle, errors } = bundleFromInput(data);
    if (!bundle) return { ok: false as const, errors, changes: [] };
    return { ok: true as const, errors: [], changes: diffBundle(await loadAll(db), bundle) };
  });

export const applyEmailImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json?: string; useSeed?: boolean; onlyMissing?: boolean }) => input ?? {})
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    const { bundle, errors } = bundleFromInput(data);
    if (!bundle) throw new Error(errors.join(" · "));
    const changes = diffBundle(await loadAll(db), bundle);
    const applied: string[] = [];
    for (const t of bundle.templates) {
      const change = changes.find((c) => c.key === t.key)!;
      if (change.kind === "unchanged") continue;
      if (data.onlyMissing && change.kind !== "new") continue;
      const note = data.useSeed ? "Başlangıç şablonu (kod yedeği)" : "JSON içe aktarma";
      await writeVersion(db, ctx.userId, t.key, { name: t.name, description: t.description, active: t.active, translations: t.translations }, note, null);
      applied.push(t.key);
    }
    await audit(db, data.useSeed ? "email_template.seed" : "email_template.import", "email_template", null, null, { applied });
    return { applied };
  });
