import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { DEFAULT_THEME, sanitizeTheme, type ThemeConfig } from "@/domain/theme/config";
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

/** Storefront reads the PUBLISHED theme only. */
export const getPublishedTheme = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient().from("theme_settings").select("published").eq("id", "active").maybeSingle();
  const published = (data?.published ?? {}) as Record<string, unknown>;
  return Object.keys(published).length ? sanitizeTheme(published) : DEFAULT_THEME;
});

export const getThemeSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db.from("theme_settings").select("*").eq("id", "active").maybeSingle();
    if (error) throw new Error(error.message);
    const draftRaw = (data?.draft ?? {}) as Record<string, unknown>;
    const publishedRaw = (data?.published ?? {}) as Record<string, unknown>;
    return {
      draft: Object.keys(draftRaw).length ? sanitizeTheme(draftRaw) : DEFAULT_THEME,
      published: Object.keys(publishedRaw).length ? sanitizeTheme(publishedRaw) : null,
      publishedAt: data?.published_at ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  });

export const saveThemeDraft = createServerFn({ method: "POST" })
  .inputValidator((input: { theme: ThemeConfig }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const theme = sanitizeTheme(data.theme);
    const { error } = await db
      .from("theme_settings")
      .upsert({ id: "active", draft: theme, updated_by: (context as AdminCtx).userId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await audit(db, "theme.save_draft", "theme_settings", "active", null, theme);
    return theme;
  });

export const publishTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data: current } = await db.from("theme_settings").select("draft, published").eq("id", "active").maybeSingle();
    const theme = sanitizeTheme(current?.draft ?? {});
    const { error } = await db
      .from("theme_settings")
      .update({ published: theme, published_at: new Date().toISOString(), updated_by: (context as AdminCtx).userId })
      .eq("id", "active");
    if (error) throw new Error(error.message);
    await audit(db, "theme.publish", "theme_settings", "active", current?.published ?? null, theme);
    return theme;
  });
