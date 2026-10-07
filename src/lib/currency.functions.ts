import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "@/domain/currency/currencies";
import { effectiveRate, sanitizeCurrencySettings, toPublicCurrencyConfig, type CurrencySettings, type PublicCurrencyConfig } from "@/domain/currency/settings";

/** Worker-level cache so product cards never trigger FX or settings reads. */
let memo: { at: number; settings: CurrencySettings } | null = null;
const MEMO_MS = 10 * 60 * 1000;

/**
 * Public currency config: only display-safe fields (enabled currencies, effective rates,
 * rounding, checkout flags) plus the visitor's own country from the edge header.
 * Reads the Admin-only settings row server-side and returns a sanitized projection.
 */
export const getPublicCurrencyConfig = createServerFn({ method: "GET" }).handler(async (): Promise<PublicCurrencyConfig> => {
  let country: string | null = null;
  try {
    const h = getRequestHeader("cf-ipcountry") ?? getRequestHeader("x-vercel-ip-country") ?? null;
    country = h && /^[A-Za-z]{2}$/.test(h) ? h.toUpperCase() : null;
  } catch { /* no request context */ }
  try {
    if (!memo || Date.now() - memo.at > MEMO_MS) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { readCurrencySettings, refreshRates, isRefreshDue } = await import("./currency.server");
      let settings = await readCurrencySettings(supabaseAdmin);
      if (isRefreshDue(settings)) settings = await refreshRates(supabaseAdmin, settings, null);
      memo = { at: Date.now(), settings };
    }
    return toPublicCurrencyConfig(memo.settings, country);
  } catch {
    // Never break the storefront: base currency only.
    return memo ? toPublicCurrencyConfig(memo.settings, country) : { base: "EUR", checkoutFallback: "EUR", currencies: [{ code: "EUR", rate: 1, rounding: { mode: "none" }, checkout: true }], country };
  }
});

export type AdminCurrencyRow = {
  code: CurrencyCode; enabled: boolean; display: boolean; checkout: boolean; autoUpdate: boolean;
  overrideRate: number | null; rounding: { mode: string; increment?: number };
  rate: number | null; rateSource: string | null; lastUpdated: string | null;
};

function adminView(s: CurrencySettings) {
  const rows: AdminCurrencyRow[] = CURRENCY_CODES.map((code) => {
    const c = s.currencies[code];
    const eff = effectiveRate(s, code);
    return { code, ...c, rate: eff?.rate ?? null, rateSource: eff?.source ?? null, lastUpdated: s.rates[code]?.updatedAt || null };
  });
  return { rows, checkoutFallback: s.checkoutFallback, status: s.status, lastRefreshAt: s.lastRefreshAt, nextUpdateAt: s.nextUpdateAt, lastError: s.lastError };
}

export const getCurrencyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { readCurrencySettings } = await import("./currency.server");
    return adminView(await readCurrencySettings(db));
  });

const patchSchema = z.object({
  code: z.enum(CURRENCY_CODES),
  patch: z.object({
    enabled: z.boolean().optional(),
    display: z.boolean().optional(),
    checkout: z.boolean().optional(),
    autoUpdate: z.boolean().optional(),
    overrideRate: z.number().positive().max(1_000_000).nullable().optional(),
    rounding: z.object({ mode: z.enum(["none", "integer", "90", "95", "99", "increment"]), increment: z.number().positive().max(10000).optional() }).optional(),
  }),
});

const ACTION: Record<string, string> = {
  enabled: "CURRENCY_ENABLED_CHANGED", display: "CURRENCY_DISPLAY_CHANGED", checkout: "CURRENCY_CHECKOUT_CHANGED",
  autoUpdate: "CURRENCY_AUTO_FX_CHANGED", overrideRate: "CURRENCY_RATE_OVERRIDE_CHANGED", rounding: "CURRENCY_ROUNDING_CHANGED",
};

/** Currency administration only — never touches supplier costs or canonical prices. */
export const updateCurrencyConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patchSchema.parse(input))
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { readCurrencySettings, writeCurrencySettings } = await import("./currency.server");
    const current = await readCurrencySettings(db);
    const before = current.currencies[data.code];
    const raw: any = JSON.parse(JSON.stringify(current));
    raw.currencies[data.code] = { ...before, ...data.patch };
    const next = sanitizeCurrencySettings(raw);
    await writeCurrencySettings(db, next, (context as AdminCtx).userId);
    for (const key of Object.keys(data.patch)) {
      let action = ACTION[key] ?? "CURRENCY_CHANGED";
      if (key === "enabled") action = next.currencies[data.code].enabled ? "CURRENCY_ENABLED" : "CURRENCY_DISABLED";
      if (key === "overrideRate") action = next.currencies[data.code].overrideRate ? "CURRENCY_RATE_OVERRIDDEN" : "CURRENCY_AUTO_FX_RESTORED";
      await audit(db, action, "currency", data.code, { [key]: (before as any)[key] }, { [key]: (next.currencies[data.code] as any)[key] });
    }
    memo = null;
    return adminView(next);
  });

export const setCheckoutFallback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.enum(["EUR", "USD"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { readCurrencySettings, writeCurrencySettings } = await import("./currency.server");
    const current = await readCurrencySettings(db);
    const next = { ...current, checkoutFallback: data.code };
    await writeCurrencySettings(db, next, (context as AdminCtx).userId);
    await audit(db, "CURRENCY_CHECKOUT_FALLBACK_CHANGED", "currency", "checkout_fallback", { checkoutFallback: current.checkoutFallback }, { checkoutFallback: data.code });
    memo = null;
    return adminView(next);
  });

export const refreshCurrencyRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { readCurrencySettings, refreshRates } = await import("./currency.server");
    const current = await readCurrencySettings(db);
    const next = await refreshRates(db, current, (context as AdminCtx).userId);
    await audit(db, "CURRENCY_RATES_REFRESHED", "currency", "rates", { lastRefreshAt: current.lastRefreshAt }, { status: next.status, lastRefreshAt: next.lastRefreshAt, error: next.lastError });
    memo = null;
    return adminView(next);
  });

export { isCurrencyCode };
