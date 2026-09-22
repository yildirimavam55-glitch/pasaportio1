import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_USAGE_SETTINGS, sanitizeUsageSettings, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";

const SETTINGS_ID = "default";

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

/** Public read: customer finder recommendation configuration. */
export const getEsimUsageSettings = createServerFn({ method: "GET" }).handler(async (): Promise<EsimUsageSettings> => {
  const { data, error } = await publicClient().from("esim_usage_settings").select("config").eq("id", SETTINGS_ID).maybeSingle();
  if (error || !data) return DEFAULT_USAGE_SETTINGS;
  return sanitizeUsageSettings(data.config);
});

/** Admin write: validated and clamped before storage. */
export const saveEsimUsageSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { settings: unknown }) => input)
  .handler(async ({ data, context }): Promise<EsimUsageSettings> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Yönetici yetkisi gerekiyor.");

    const settings = sanitizeUsageSettings(data.settings);
    const { error } = await context.supabase
      .from("esim_usage_settings")
      .upsert({ id: SETTINGS_ID, config: settings, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    const { audit } = await import("@/lib/admin-guard");
    await audit(context.supabase, "esim_usage_settings.update", "esim_usage_settings", SETTINGS_ID, null, settings);
    return settings;
  });
