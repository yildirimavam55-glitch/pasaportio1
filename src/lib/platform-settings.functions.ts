import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { DEFAULT_SETTINGS, sanitizeSettings, type PlatformSettings } from "@/domain/platform/settings";

/**
 * Safe business settings + public service availability.
 * Availability is derived from the EXISTING feature_flags foundation — no
 * second flag system is introduced.
 */

export type ServiceAvailability = {
  esim: { storefront: boolean; checkout: boolean };
  lounge: { storefront: boolean; checkout: boolean };
  settings: PlatformSettings;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const OPEN: ServiceAvailability = {
  esim: { storefront: true, checkout: true },
  lounge: { storefront: true, checkout: true },
  settings: DEFAULT_SETTINGS,
};

/** Public, never throws: a read failure keeps the storefront in its normal state. */
export const getServiceAvailability = createServerFn({ method: "GET" }).handler(async (): Promise<ServiceAvailability> => {
  try {
    const client = publicClient();
    const [flags, settings] = await Promise.all([
      client.from("feature_flags").select("key, enabled"),
      client.from("platform_settings").select("data").eq("id", "active").maybeSingle(),
    ]);
    const on = (key: string) => {
      const row = (flags.data ?? []).find((flag: any) => flag.key === key);
      return row ? Boolean(row.enabled) : true;
    };
    return {
      esim: { storefront: on("storefront.esim"), checkout: on("checkout.esim") },
      lounge: { storefront: on("storefront.lounge"), checkout: on("checkout.lounge") },
      settings: sanitizeSettings(settings.data?.data),
    };
  } catch {
    return OPEN;
  }
});

/**
 * Server-side purchase guard. Hiding a button in the browser is never enough,
 * so every purchase action must pass through this check.
 */
export const assertCheckoutAllowed = createServerFn({ method: "POST" })
  .inputValidator((input: { service: "esim" | "lounge" }) => input)
  .handler(async ({ data }) => {
    const service = data.service === "lounge" ? "lounge" : "esim";
    const availability = await getServiceAvailability();
    const open = availability[service].storefront && availability[service].checkout;
    if (!open) {
      return { allowed: false as const, message: availability.settings.maintenance[service].checkoutMessage };
    }
    return { allowed: true as const, message: null };
  });

export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data } = await db.from("platform_settings").select("data, updated_at").eq("id", "active").maybeSingle();
    return { settings: sanitizeSettings(data?.data), updatedAt: data?.updated_at ?? null };
  });

export const savePlatformSettings = createServerFn({ method: "POST" })
  .inputValidator((input: { settings: PlatformSettings }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const settings = sanitizeSettings(data.settings);
    const { error } = await db
      .from("platform_settings")
      .upsert({ id: "active", data: settings as any, updated_by: (context as AdminCtx).userId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await audit(db, "settings.update", "platform_settings", "active", null, { brandName: settings.brandName, defaultLocale: settings.defaultLocale });
    return { ok: true };
  });
