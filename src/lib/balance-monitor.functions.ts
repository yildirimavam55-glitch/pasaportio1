/**
 * Admin-only balance monitoring + notification center server functions.
 * Every handler verifies the admin role before any table access.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import {
  balanceFreshness,
  lastSuccess,
  schedulerActive,
  validateBalanceSettings,
  type BalanceMonitorSettings,
} from "@/domain/providers/balance-monitor";

type Ctx = AdminCtx & { userId: string };

export const getBalanceMonitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const { settingsFromRow, snapshotFromRow } = await import("@/lib/balance-monitor.server");
    const [{ data: providers }, { data: settings }, { data: channels }] = await Promise.all([
      db.from("providers").select("id, code, name, active, currency, capabilities").order("priority"),
      db.from("provider_balance_monitor_settings").select("*"),
      db.from("admin_notification_channels").select("channel, enabled, min_severity"),
    ]);
    const now = new Date();
    const out = [];
    for (const provider of providers ?? []) {
      const row = (settings ?? []).find((item: any) => item.provider_id === provider.id) ?? null;
      const s = settingsFromRow(row);
      const [{ data: recent }, { data: okRow }] = await Promise.all([
        db.from("provider_balance_snapshots").select("ok, amount, currency, checked_at, error_code, source").eq("provider_id", provider.id).order("checked_at", { ascending: false }).limit(10),
        db.from("provider_balance_snapshots").select("ok, amount, currency, checked_at, error_code").eq("provider_id", provider.id).eq("ok", true).order("checked_at", { ascending: false }).limit(1),
      ]);
      const history = [...(recent ?? []), ...(okRow ?? [])].map(snapshotFromRow);
      const success = lastSuccess(history);
      out.push({
        providerId: provider.id,
        code: provider.code,
        name: provider.name,
        supportsBalance: (provider.capabilities ?? []).includes("BALANCE"),
        configured: !!row,
        settings: s,
        thresholdsConfirmed: !!row?.thresholds_confirmed,
        lastScheduledRunAt: row?.last_scheduled_run_at ?? null,
        schedulerActive: schedulerActive(row?.last_scheduled_run_at ?? null, s.checkIntervalMinutes, now),
        freshness: balanceFreshness(history, s, now),
        latest: success,
        recent: (recent ?? []).map((item: any) => ({ ...snapshotFromRow(item), source: item.source })),
      });
    }
    return { providers: out, channels: channels ?? [] };
  });

export const updateBalanceMonitorSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerId: string; settings: BalanceMonitorSettings }) => {
    const s = input?.settings ?? ({} as BalanceMonitorSettings);
    const currency = s.thresholdCurrency ? String(s.thresholdCurrency).trim().toUpperCase() : null;
    return {
      providerId: String(input?.providerId ?? ""),
      settings: {
        enabled: s.enabled !== false,
        thresholdCurrency: currency || null,
        lowThreshold: Number(s.lowThreshold),
        criticalThreshold: Number(s.criticalThreshold),
        dropPercent: Number(s.dropPercent),
        dropWindowHours: Math.round(Number(s.dropWindowHours)),
        unavailableAfterMinutes: Math.round(Number(s.unavailableAfterMinutes)),
        checkIntervalMinutes: Math.round(Number(s.checkIntervalMinutes)),
      } satisfies BalanceMonitorSettings,
    };
  })
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const problem = validateBalanceSettings(data.settings);
    if (problem) throw new Error(problem);
    const { data: before } = await db.from("provider_balance_monitor_settings").select("*").eq("provider_id", data.providerId).maybeSingle();
    const s = data.settings;
    const row = {
      provider_id: data.providerId,
      enabled: s.enabled,
      threshold_currency: s.thresholdCurrency,
      low_threshold: s.lowThreshold,
      critical_threshold: s.criticalThreshold,
      drop_percent: s.dropPercent,
      drop_window_hours: s.dropWindowHours,
      unavailable_after_minutes: s.unavailableAfterMinutes,
      check_interval_minutes: s.checkIntervalMinutes,
      thresholds_confirmed: true,
      updated_at: new Date().toISOString(),
      updated_by: (context as Ctx).userId,
    };
    const { error } = await db.from("provider_balance_monitor_settings").upsert(row, { onConflict: "provider_id" });
    if (error) throw new Error(error.message);
    await audit(db, "provider.balance_monitor_settings_updated", "provider_balance_monitor_settings", data.providerId, before ?? null, row);
    return { ok: true };
  });

const BALANCE_TYPES = ["LOW_PROVIDER_BALANCE", "CRITICAL_PROVIDER_BALANCE", "EMPTY_PROVIDER_BALANCE", "PROVIDER_BALANCE_DROP", "PROVIDER_BALANCE_UNAVAILABLE"];

/** Notification center feed: open + acknowledged alerts, plus recent resolved ones. */
export const getNotificationCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as Ctx);
    const select = "id, type, severity, status, entity_type, entity_id, message, context, created_at, updated_at, acknowledged_at, resolved_at";
    const [{ data: active }, { data: resolved }, { data: providers }] = await Promise.all([
      db.from("ops_alerts").select(select).neq("status", "RESOLVED").order("created_at", { ascending: false }).limit(200),
      db.from("ops_alerts").select(select).eq("status", "RESOLVED").order("resolved_at", { ascending: false }).limit(30),
      db.from("providers").select("id, name"),
    ]);
    const nameOf = (id: string | null) => (providers ?? []).find((row: any) => row.id === id)?.name ?? null;
    const map = (row: any) => ({ ...row, isBalance: BALANCE_TYPES.includes(row.type), providerName: row.entity_type === "providers" ? nameOf(row.entity_id) : null });
    return { active: (active ?? []).map(map), resolved: (resolved ?? []).map(map) };
  });

export const setAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "ACKNOWLEDGED" | "RESOLVED" }) => {
    if (input?.status !== "ACKNOWLEDGED" && input?.status !== "RESOLVED") throw new Error("Geçersiz durum.");
    return { id: String(input.id ?? ""), status: input.status };
  })
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as Ctx);
    const userId = (context as Ctx).userId;
    const now = new Date().toISOString();
    const { data: before } = await db.from("ops_alerts").select("id, status, type").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("Uyarı bulunamadı.");
    if (before.status === "RESOLVED") return { ok: true };
    const patch = data.status === "ACKNOWLEDGED"
      ? { status: "ACKNOWLEDGED", acknowledged_at: now, acknowledged_by: userId, updated_at: now }
      : { status: "RESOLVED", resolved_at: now, resolved_by: userId, updated_at: now };
    const { error } = await db.from("ops_alerts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, `alert.${data.status.toLowerCase()}`, "ops_alerts", data.id, { status: before.status }, { status: data.status });
    return { ok: true };
  });
