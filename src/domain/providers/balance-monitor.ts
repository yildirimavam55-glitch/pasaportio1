/**
 * Provider-independent balance monitoring rules (pure, no I/O).
 *
 * - Thresholds are expressed in the provider's own currency; a snapshot in a
 *   different currency never triggers a level alert (no FX conversion).
 * - Sudden drops compare only successful snapshots in the same currency.
 * - One open alert per (provider, condition) via a stable dedupe key; the
 *   level alert escalates in place and auto-resolves after a top-up.
 */

export type BalanceSnapshot = {
  ok: boolean;
  amount: number | null;
  currency: string | null;
  checkedAt: string;
  errorCode?: string | null;
};

export type BalanceMonitorSettings = {
  enabled: boolean;
  thresholdCurrency: string | null;
  lowThreshold: number;
  criticalThreshold: number;
  dropPercent: number;
  dropWindowHours: number;
  unavailableAfterMinutes: number;
  checkIntervalMinutes: number;
};

export const DEFAULT_BALANCE_SETTINGS: BalanceMonitorSettings = {
  enabled: true,
  thresholdCurrency: null,
  lowThreshold: 500,
  criticalThreshold: 200,
  dropPercent: 50,
  dropWindowHours: 24,
  unavailableAfterMinutes: 120,
  checkIntervalMinutes: 15,
};

export type BalanceAlertType =
  | "LOW_PROVIDER_BALANCE"
  | "CRITICAL_PROVIDER_BALANCE"
  | "EMPTY_PROVIDER_BALANCE"
  | "PROVIDER_BALANCE_DROP"
  | "PROVIDER_BALANCE_UNAVAILABLE";

export type AlertSeverity = "WARNING" | "CRITICAL" | "URGENT";

export const BALANCE_ALERT_TYPES: readonly BalanceAlertType[] = [
  "LOW_PROVIDER_BALANCE",
  "CRITICAL_PROVIDER_BALANCE",
  "EMPTY_PROVIDER_BALANCE",
  "PROVIDER_BALANCE_DROP",
  "PROVIDER_BALANCE_UNAVAILABLE",
];

export type BalanceCondition = {
  dedupeKey: string;
  type: BalanceAlertType;
  severity: AlertSeverity;
  context: {
    currentAmount: number | null;
    previousAmount: number | null;
    changeAmount: number | null;
    changePercent: number | null;
    currency: string | null;
    lastSuccessAt: string | null;
    threshold?: number | null;
  };
};

const SEVERITY_RANK: Record<AlertSeverity, number> = { WARNING: 1, CRITICAL: 2, URGENT: 3 };

export const levelKey = (providerId: string) => `balance-level:${providerId}`;
export const dropKey = (providerId: string) => `balance-drop:${providerId}`;
export const unavailableKey = (providerId: string) => `balance-unavailable:${providerId}`;

const ms = (iso: string) => Date.parse(iso);
const round2 = (value: number) => Math.round(value * 100) / 100;

export function validateBalanceSettings(input: BalanceMonitorSettings): string | null {
  const nums = [input.lowThreshold, input.criticalThreshold, input.dropPercent, input.dropWindowHours, input.unavailableAfterMinutes, input.checkIntervalMinutes];
  if (nums.some((value) => !Number.isFinite(value))) return "Tüm alanlar sayı olmalı.";
  if (input.lowThreshold < 0 || input.criticalThreshold < 0) return "Eşikler negatif olamaz.";
  if (input.criticalThreshold > input.lowThreshold) return "Kritik eşik, düşük eşikten büyük olamaz.";
  if (input.dropPercent <= 0 || input.dropPercent > 100) return "Ani düşüş yüzdesi 1–100 arasında olmalı.";
  if (input.dropWindowHours < 1 || input.dropWindowHours > 168) return "Ani düşüş penceresi 1–168 saat olmalı.";
  if (input.unavailableAfterMinutes < 15 || input.unavailableAfterMinutes > 10080) return "Erişilemez süresi 15 dk – 7 gün olmalı.";
  if (input.checkIntervalMinutes < 5 || input.checkIntervalMinutes > 1440) return "Kontrol aralığı 5–1440 dk olmalı.";
  if (input.thresholdCurrency != null && !/^[A-Z]{3}$/.test(input.thresholdCurrency)) return "Para birimi 3 harfli kod olmalı.";
  return null;
}

/** Latest successful snapshot, newest first ordering not required. */
export function lastSuccess(history: BalanceSnapshot[]): BalanceSnapshot | null {
  let best: BalanceSnapshot | null = null;
  for (const row of history) if (row.ok && row.amount != null && (!best || ms(row.checkedAt) > ms(best.checkedAt))) best = row;
  return best;
}

function latestAttempt(history: BalanceSnapshot[]): BalanceSnapshot | null {
  let best: BalanceSnapshot | null = null;
  for (const row of history) if (!best || ms(row.checkedAt) > ms(best.checkedAt)) best = row;
  return best;
}

export type BalanceFreshness = "FRESH" | "STALE" | "UNAVAILABLE" | "NEVER_CHECKED";

export function balanceFreshness(history: BalanceSnapshot[], settings: BalanceMonitorSettings, now: Date): BalanceFreshness {
  const latest = latestAttempt(history);
  if (!latest) return "NEVER_CHECKED";
  const success = lastSuccess(history);
  if (!success) return "UNAVAILABLE";
  const age = now.getTime() - ms(success.checkedAt);
  if (age > settings.unavailableAfterMinutes * 60_000) return latest.ok ? "STALE" : "UNAVAILABLE";
  if (age > settings.checkIntervalMinutes * 2 * 60_000) return "STALE";
  return "FRESH";
}

/** The conditions that are currently true for a provider. */
export function evaluateBalance(
  providerId: string,
  settings: BalanceMonitorSettings,
  history: BalanceSnapshot[],
  now: Date,
): BalanceCondition[] {
  if (!settings.enabled) return [];
  const conditions: BalanceCondition[] = [];
  const latest = latestAttempt(history);
  const success = lastSuccess(history);
  const lastSuccessAt = success?.checkedAt ?? null;

  if (latest && !latest.ok) {
    const outage = success ? now.getTime() - ms(success.checkedAt) : Number.POSITIVE_INFINITY;
    if (outage > settings.unavailableAfterMinutes * 60_000) {
      conditions.push({
        dedupeKey: unavailableKey(providerId),
        type: "PROVIDER_BALANCE_UNAVAILABLE",
        severity: "CRITICAL",
        context: { currentAmount: null, previousAmount: success?.amount ?? null, changeAmount: null, changePercent: null, currency: success?.currency ?? null, lastSuccessAt },
      });
    }
  }

  // Level and drop rules only use the most recent reading when it succeeded.
  if (!latest || !latest.ok || latest.amount == null || !latest.currency) return conditions;
  const amount = latest.amount;
  const currency = latest.currency;
  const currencyMatches = settings.thresholdCurrency == null || settings.thresholdCurrency === currency;

  const previous = history
    .filter((row) => row.ok && row.amount != null && row.currency === currency && ms(row.checkedAt) < ms(latest.checkedAt))
    .sort((a, b) => ms(b.checkedAt) - ms(a.checkedAt))[0] ?? null;
  const previousAmount = previous?.amount ?? null;
  const change = previousAmount == null ? null : round2(amount - previousAmount);
  const changePct = previousAmount == null || previousAmount === 0 ? null : round2(((amount - previousAmount) / previousAmount) * 100);

  if (currencyMatches) {
    let level: { type: BalanceAlertType; severity: AlertSeverity; threshold: number | null } | null = null;
    if (amount <= 0) level = { type: "EMPTY_PROVIDER_BALANCE", severity: "URGENT", threshold: 0 };
    else if (amount <= settings.criticalThreshold) level = { type: "CRITICAL_PROVIDER_BALANCE", severity: "CRITICAL", threshold: settings.criticalThreshold };
    else if (amount <= settings.lowThreshold) level = { type: "LOW_PROVIDER_BALANCE", severity: "WARNING", threshold: settings.lowThreshold };
    if (level) {
      conditions.push({
        dedupeKey: levelKey(providerId),
        type: level.type,
        severity: level.severity,
        context: { currentAmount: amount, previousAmount, changeAmount: change, changePercent: changePct, currency, lastSuccessAt, threshold: level.threshold },
      });
    }
  }

  // Sudden drop: highest reliable same-currency reading within the window.
  const windowStart = ms(latest.checkedAt) - settings.dropWindowHours * 3_600_000;
  const baseline = history
    .filter((row) => row.ok && row.amount != null && row.currency === currency && ms(row.checkedAt) >= windowStart && ms(row.checkedAt) < ms(latest.checkedAt))
    .reduce<BalanceSnapshot | null>((best, row) => (!best || (row.amount as number) > (best.amount as number) ? row : best), null);
  if (baseline && (baseline.amount as number) > 0) {
    const base = baseline.amount as number;
    const dropPct = ((base - amount) / base) * 100;
    if (dropPct >= settings.dropPercent) {
      conditions.push({
        dedupeKey: dropKey(providerId),
        type: "PROVIDER_BALANCE_DROP",
        severity: "CRITICAL",
        context: { currentAmount: amount, previousAmount: base, changeAmount: round2(amount - base), changePercent: round2(-dropPct), currency, lastSuccessAt },
      });
    }
  }
  return conditions;
}

export type OpenAlert = { id: string; dedupeKey: string; type: string; severity: string };

export type AlertActions = {
  create: BalanceCondition[];
  /** Same ongoing condition whose severity/type changed — updated in place. */
  update: Array<{ id: string; condition: BalanceCondition }>;
  resolve: string[];
};

/**
 * Reconciles desired conditions with currently open alerts for one provider.
 * Unchanged conditions produce no action (duplicate prevention).
 * `managedKeys` limits auto-resolution to rules that were actually evaluated
 * (a failed read must not auto-resolve a low-balance alert).
 */
export function reconcileAlerts(conditions: BalanceCondition[], open: OpenAlert[], managedKeys: string[]): AlertActions {
  const actions: AlertActions = { create: [], update: [], resolve: [] };
  for (const condition of conditions) {
    const existing = open.find((row) => row.dedupeKey === condition.dedupeKey);
    if (!existing) actions.create.push(condition);
    else if (existing.type !== condition.type || existing.severity !== condition.severity) {
      // Only escalate or de-escalate when the condition genuinely changed.
      actions.update.push({ id: existing.id, condition });
    }
  }
  for (const row of open) {
    if (managedKeys.includes(row.dedupeKey) && !conditions.some((condition) => condition.dedupeKey === row.dedupeKey)) actions.resolve.push(row.id);
  }
  return actions;
}

/** Keys whose rules ran for this snapshot (failed reads only manage availability). */
export function managedKeysFor(providerId: string, latestOk: boolean, currencyMatches: boolean): string[] {
  if (!latestOk) return [];
  const keys = [unavailableKey(providerId), dropKey(providerId)];
  if (currencyMatches) keys.push(levelKey(providerId));
  return keys;
}

export function isEscalation(from: string, to: AlertSeverity): boolean {
  return (SEVERITY_RANK[to] ?? 0) > (SEVERITY_RANK[from as AlertSeverity] ?? 0);
}

/** Scheduler counts as active only after a real scheduled call landed recently. */
export function schedulerActive(lastScheduledRunAt: string | null, intervalMinutes: number, now: Date): boolean {
  if (!lastScheduledRunAt) return false;
  return now.getTime() - ms(lastScheduledRunAt) <= intervalMinutes * 3 * 60_000;
}

export function isCheckDue(lastAttemptAt: string | null, intervalMinutes: number, now: Date): boolean {
  if (!lastAttemptAt) return true;
  return now.getTime() - ms(lastAttemptAt) >= intervalMinutes * 60_000 - 30_000;
}

export function alertMessage(providerName: string, condition: BalanceCondition): string {
  const c = condition.context;
  const money = (value: number | null) => (value == null ? "—" : `${value} ${c.currency ?? ""}`.trim());
  switch (condition.type) {
    case "EMPTY_PROVIDER_BALANCE": return `${providerName}: bakiye boş veya yetersiz (${money(c.currentAmount)}).`;
    case "CRITICAL_PROVIDER_BALANCE": return `${providerName}: bakiye kritik eşiğin altında (${money(c.currentAmount)} ≤ ${money(c.threshold ?? null)}).`;
    case "LOW_PROVIDER_BALANCE": return `${providerName}: bakiye düşük (${money(c.currentAmount)} ≤ ${money(c.threshold ?? null)}).`;
    case "PROVIDER_BALANCE_DROP": return `${providerName}: bakiye ani düştü (${money(c.previousAmount)} → ${money(c.currentAmount)}, %${Math.abs(c.changePercent ?? 0)}).`;
    case "PROVIDER_BALANCE_UNAVAILABLE": return `${providerName}: bakiye API'si yanıt vermiyor; son başarılı kontrol ${c.lastSuccessAt ?? "hiç"}.`;
  }
}
