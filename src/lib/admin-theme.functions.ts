import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { DEFAULT_THEME, sanitizeTheme, type PublishedThemeConfig, type ThemeConfig } from "@/domain/theme/config";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const THEME_HISTORY_KEY = "storefront_theme";

async function mediaUrls(ids: Array<string | null>): Promise<Record<string, string>> {
  const valid = ids.filter((id): id is string => Boolean(id));
  if (!valid.length) return {};
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("media_assets").select("id, storage_path").in("id", valid);
    if (!rows?.length) return {};
    const { data: signed } = await supabaseAdmin.storage.from("media").createSignedUrls(rows.map((row) => row.storage_path), 60 * 60 * 6);
    const byPath = new Map((signed ?? []).map((row) => [row.path, row.signedUrl]));
    return Object.fromEntries(rows.flatMap((row) => {
      const url = byPath.get(row.storage_path);
      return url ? [[row.id, url]] : [];
    }));
  } catch {
    return {};
  }
}

async function authorLabel(context: AdminCtx) {
  try {
    const { data } = await context.supabase.auth.getUser();
    return data?.user?.email ?? "Yönetici";
  } catch {
    return "Yönetici";
  }
}

async function themeHistoryDocument(db: any) {
  const { data: existing } = await db.from("cms_documents").select("id").eq("key", THEME_HISTORY_KEY).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await db.from("cms_documents").insert({ key: THEME_HISTORY_KEY, kind: "THEME", status: "DRAFT", visible: false, data: {} }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function recordVersion(db: any, context: AdminCtx, theme: ThemeConfig, event: "draft" | "publish" | "restore", restoredFrom?: string) {
  const documentId = await themeHistoryDocument(db);
  const { error } = await db.from("cms_versions").insert({ document_id: documentId, created_by: context.userId, snapshot: { theme, event, author: await authorLabel(context), ...(restoredFrom ? { restoredFrom } : {}) } });
  if (error) throw new Error(error.message);
}

/** Storefront reads the PUBLISHED theme only. */
export const getPublishedTheme = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient().from("theme_settings").select("published").eq("id", "active").maybeSingle();
  const published = (data?.published ?? {}) as Record<string, unknown>;
  const theme = Object.keys(published).length ? sanitizeTheme(published) : DEFAULT_THEME;
  const urls = await mediaUrls([theme.logoMediaId, theme.faviconMediaId]);
  return { ...theme, logoUrl: theme.logoMediaId ? urls[theme.logoMediaId] ?? null : null, faviconUrl: theme.faviconMediaId ? urls[theme.faviconMediaId] ?? null : null } satisfies PublishedThemeConfig;
});

export const getThemeSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db.from("theme_settings").select("*").eq("id", "active").maybeSingle();
    if (error) throw new Error(error.message);
    const draftRaw = (data?.draft ?? {}) as Record<string, unknown>;
    const publishedRaw = (data?.published ?? {}) as Record<string, unknown>;
    const { data: historyDocument } = await db.from("cms_documents").select("id").eq("key", THEME_HISTORY_KEY).maybeSingle();
    const { data: history } = historyDocument?.id
      ? await db.from("cms_versions").select("id, created_at, snapshot").eq("document_id", historyDocument.id).order("created_at", { ascending: false }).limit(30)
      : { data: [] };
    return {
      draft: Object.keys(draftRaw).length ? sanitizeTheme(draftRaw) : DEFAULT_THEME,
      published: Object.keys(publishedRaw).length ? sanitizeTheme(publishedRaw) : null,
      publishedAt: data?.published_at ?? null,
      updatedAt: data?.updated_at ?? null,
      versions: (history ?? []).map((version: any) => ({ id: version.id, createdAt: version.created_at, action: version.snapshot?.event ?? "draft", actor: version.snapshot?.author ?? "Yönetici" })),
    };
  });

export const saveThemeDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { theme: ThemeConfig }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const theme = sanitizeTheme(data.theme);
    const { error } = await db
      .from("theme_settings")
      .upsert({ id: "active", draft: theme, updated_by: (context as AdminCtx).userId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await recordVersion(db, ctx, theme, "draft");
    await audit(db, "theme.save_draft", "theme_settings", "active", null, theme);
    return theme;
  });

export const publishTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const { data: current } = await db.from("theme_settings").select("draft, published").eq("id", "active").maybeSingle();
    const theme = sanitizeTheme(current?.draft ?? {});
    const { error } = await db
      .from("theme_settings")
      .update({ published: theme, published_at: new Date().toISOString(), updated_by: (context as AdminCtx).userId })
      .eq("id", "active");
    if (error) throw new Error(error.message);
    await recordVersion(db, ctx, theme, "publish");
    await audit(db, "theme.publish", "theme_settings", "active", current?.published ?? null, theme);
    return theme;
  });

export const restoreThemeVersion = createServerFn({ method: "POST" })
  .inputValidator((input: { versionId: string }) => ({ versionId: String(input?.versionId ?? "") }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const ctx = context as AdminCtx;
    const db = await adminDb(ctx);
    const documentId = await themeHistoryDocument(db);
    const { data: version } = await db.from("cms_versions").select("id, document_id, snapshot").eq("id", data.versionId).eq("document_id", documentId).maybeSingle();
    if (!version?.snapshot?.theme) throw new Error("Tema sürümü bulunamadı.");
    const theme = sanitizeTheme(version.snapshot.theme);
    const { data: current } = await db.from("theme_settings").select("draft").eq("id", "active").maybeSingle();
    const { error } = await db.from("theme_settings").upsert({ id: "active", draft: theme, updated_by: ctx.userId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await recordVersion(db, ctx, theme, "restore", version.id);
    await audit(db, "theme.restore_draft", "theme_settings", "active", current?.draft ?? null, theme);
    return theme;
  });
