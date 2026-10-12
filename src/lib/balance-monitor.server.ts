/**
 * Server-only balance monitoring runner. READ-ONLY toward suppliers: it only
 * calls adapter.fetchBalance(); it never orders, deposits, withdraws or tops up.
 */
import {
  DEFAULT_BALANCE_SETTINGS,
  alertMessage,
  evaluateBalance,
  isCheckDue,
  managedKeysFor,
  reconcileAlerts,
  type BalanceMonitorSettings,
  type BalanceSnapshot,
} from "@/domain/providers/balance-monitor";

export const BALANCE_TIMEOUT_MS = 15_000;
const HISTORY_HOURS = 24 * 7;

export function settingsFromRow(row: any | null | undefined): BalanceMonitorSettings {
  if (!row) return { ...DEFAULT_BALANCE_SETTINGS };
  return {
    enabled: row.enabled !== false,
    thresholdCurrency: row.threshold_currency ?? null,
    lowThreshold: Number(row.low_threshold),
    criticalThreshold: Number(row.critical_threshold),
    dropPercent: Number(row.drop_percent),
    dropWindowHours: Number(row.drop_window_hours),
    unavailableAfterMinutes: Number(row.unavailable_after_minutes),
    checkIntervalMinutes: Number(row.check_interval_minutes),
  };
}

export function snapshotFromRow(row: any): BalanceSnapshot {
  return { ok: !!row.ok, amount: row.amount == null ? null : Number(row.amount), currency: row.currency ?? null, checkedAt: row.checked_at, errorCode: row.error_code ?? null };
}

type FetchResult = { ok: true; amount: number; currency: string } | { ok: false; errorCode: string };

/** Fetch with a hard timeout; errors are reduced to safe codes (no secrets/bodies). */
export async function fetchBalanceSafely(fetcher: () => Promise<{ amount: number; currency: string } | null>, timeoutMs = BALANCE_TIMEOUT_MS): Promise<FetchResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<"TIMEOUT">((resolve) => { timer = setTimeout(() => resolve("TIMEOUT"), timeoutMs); }),
    ]);
    if (result === "TIMEOUT") return { ok: false, errorCode: "TIMEOUT" };
    if (!result || !Number.isFinite(result.amount) || !/^[A-Z]{3}$/.test(String(result.currency))) return { ok: false, errorCode: "READ_FAILED" };
    return { ok: true, amount: result.amount, currency: result.currency };
  } catch {
    return { ok: false, errorCode: "REQUEST_ERROR" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** One check for one provider: snapshot, latest value, evaluation, deduped alerts. */
export async function runBalanceCheck(
  db: any,
  provider: { id: string; name: string },
  fetcher: () => Promise<{ amount: number; currency: string } | null>,
  source: "MANUAL" | "SCHEDULED",
  now = new Date(),
) {
  const result = await fetchBalanceSafely(fetcher);
  const checkedAt = now.toISOString();
  await db.from("provider_balance_snapshots").insert({
    provider_id: provider.id,
    ok: result.ok,
    amount: result.ok ? result.amount : null,
    currency: result.ok ? result.currency : null,
    error_code: result.ok ? null : result.errorCode,
    source,
    checked_at: checkedAt,
  });
  if (result.ok) {
    await db.from("providers").update({ balance_amount: result.amount, balance_currency: result.currency, balance_checked_at: checkedAt }).eq("id", provider.id);
  }

  const since = new Date(now.getTime() - HISTORY_HOURS * 3_600_000).toISOString();
  const [{ data: settingsRow }, { data: rows }, { data: lastOk }, { data: openRows }] = await Promise.all([
    db.from("provider_balance_monitor_settings").select("*").eq("provider_id", provider.id).maybeSingle(),
    db.from("provider_balance_snapshots").select("ok, amount, currency, checked_at, error_code").eq("provider_id", provider.id).gte("checked_at", since).order("checked_at", { ascending: false }).limit(1000),
    db.from("provider_balance_snapshots").select("ok, amount, currency, checked_at, error_code").eq("provider_id", provider.id).eq("ok", true).order("checked_at", { ascending: false }).limit(1),
    db.from("ops_alerts").select("id, dedupe_key, type, severity").eq("entity_id", provider.id).neq("status", "RESOLVED").not("dedupe_key", "is", null),
  ]);
  const settings = settingsFromRow(settingsRow);
  const history = [...(rows ?? []), ...(lastOk ?? [])].map(snapshotFromRow);
  const conditions = evaluateBalance(provider.id, settings, history, now);
  const currencyMatches = !result.ok || settings.thresholdCurrency == null || settings.thresholdCurrency === result.currency;
  const managed = settings.enabled ? managedKeysFor(provider.id, result.ok, currencyMatches) : [];
  const open = (openRows ?? []).map((row: any) => ({ id: row.id, dedupeKey: row.dedupe_key, type: row.type, severity: row.severity }));
  const actions = reconcileAlerts(conditions, open, managed);

  for (const condition of actions.create) {
    const { error } = await db.from("ops_alerts").insert({
      type: condition.type,
      severity: condition.severity,
      status: "OPEN",
      dedupe_key: condition.dedupeKey,
      message: alertMessage(provider.name, condition),
      entity_type: "providers",
      entity_id: provider.id,
      context: { ...condition.context, detectedAt: checkedAt },
    });
    // 23505: a concurrent check already opened this condition — not a new alert.
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  for (const { id, condition } of actions.update) {
    await db.from("ops_alerts").update({
      type: condition.type,
      severity: condition.severity,
      status: "OPEN",
      acknowledged_at: null,
      acknowledged_by: null,
      message: alertMessage(provider.name, condition),
      context: { ...condition.context, detectedAt: checkedAt },
      updated_at: checkedAt,
    }).eq("id", id);
  }
  if (actions.resolve.length) {
    await db.from("ops_alerts").update({ status: "RESOLVED", resolved_at: checkedAt, updated_at: checkedAt }).in("id", actions.resolve);
  }
  return { ok: result.ok, amount: result.ok ? result.amount : null, currency: result.ok ? result.currency : null, errorCode: result.ok ? null : result.errorCode, checkedAt, created: actions.create.length, updated: actions.update.length, resolved: actions.resolve.length };
}

/** Scheduler entry: checks every monitored provider whose interval is due. */
export async function runDueBalanceChecks(now = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: any = supabaseAdmin;
  const { buildAdapter } = await import("@/providers/adapters/factory.server");
  const { data: providers } = await db.from("providers").select("*").eq("active", true);
  const results: Array<Record<string, unknown>> = [];
  for (const provider of providers ?? []) {
    const { data: connection } = await db.from("provider_connections").select("*").eq("provider_id", provider.id).order("created_at").limit(1).maybeSingle();
    const adapter = buildAdapter(provider, connection ?? null);
    if (!adapter.fetchBalance) continue;
    const { data: settingsRow } = await db.from("provider_balance_monitor_settings").select("*").eq("provider_id", provider.id).maybeSingle();
    const settings = settingsFromRow(settingsRow);
    if (!settings.enabled) continue;
    await db.from("provider_balance_monitor_settings").upsert({ provider_id: provider.id, last_scheduled_run_at: now.toISOString() }, { onConflict: "provider_id" });
    const { data: last } = await db.from("provider_balance_snapshots").select("checked_at").eq("provider_id", provider.id).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    if (!isCheckDue(last?.checked_at ?? null, settings.checkIntervalMinutes, now)) {
      results.push({ provider: provider.code, skipped: "NOT_DUE" });
      continue;
    }
    try {
      const outcome = await runBalanceCheck(db, provider, () => adapter.fetchBalance!(), "SCHEDULED", now);
      results.push({ provider: provider.code, ok: outcome.ok, errorCode: outcome.errorCode, alertsCreated: outcome.created, alertsResolved: outcome.resolved });
    } catch (error) {
      console.error("balance check failed", provider.code, (error as Error).message);
      results.push({ provider: provider.code, ok: false, errorCode: "INTERNAL" });
    }
  }
  return { ok: true, checkedAt: now.toISOString(), results };
}
