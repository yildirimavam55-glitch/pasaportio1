import { describe, expect, it } from "vitest";
import {
  DEFAULT_BALANCE_SETTINGS as S,
  balanceFreshness,
  dropKey,
  evaluateBalance,
  levelKey,
  managedKeysFor,
  reconcileAlerts,
  schedulerActive,
  unavailableKey,
  validateBalanceSettings,
  type BalanceSnapshot,
  type OpenAlert,
} from "@/domain/providers/balance-monitor";
import { fetchBalanceSafely } from "@/lib/balance-monitor.server";

const P = "prov-1";
const NOW = new Date("2026-10-12T12:00:00Z");
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
const ok = (amount: number, minutesAgo: number, currency = "EUR"): BalanceSnapshot => ({ ok: true, amount, currency, checkedAt: at(minutesAgo) });
const fail = (minutesAgo: number): BalanceSnapshot => ({ ok: false, amount: null, currency: null, checkedAt: at(minutesAgo), errorCode: "TIMEOUT" });
const types = (history: BalanceSnapshot[]) => evaluateBalance(P, S, history, NOW).map((c) => c.type).sort();

describe("balance thresholds (defaults 500 low / 200 critical)", () => {
  it("normal balance raises nothing", () => expect(types([ok(1200, 0)])).toEqual([]));
  it("500 is low", () => expect(types([ok(500, 0)])).toEqual(["LOW_PROVIDER_BALANCE"]));
  it("200 is critical", () => expect(types([ok(200, 0)])).toEqual(["CRITICAL_PROVIDER_BALANCE"]));
  it("zero is urgent empty", () => {
    const [c] = evaluateBalance(P, S, [ok(0, 0)], NOW);
    expect(c!.type).toBe("EMPTY_PROVIDER_BALANCE");
    expect(c!.severity).toBe("URGENT");
  });
  it("threshold currency mismatch never raises a level alert (no FX conversion)", () => {
    expect(evaluateBalance(P, { ...S, thresholdCurrency: "EUR" }, [ok(10, 0, "USD")], NOW)).toEqual([]);
  });
});

describe("sudden drop (>=50% within 24h)", () => {
  it("1000 → 450 within 24h is a drop", () => {
    const c = evaluateBalance(P, S, [ok(1000, 600), ok(450, 0)], NOW).find((x) => x.type === "PROVIDER_BALANCE_DROP");
    expect(c?.context.previousAmount).toBe(1000);
    expect(c?.context.changeAmount).toBe(-550);
    expect(c?.context.changePercent).toBe(-55);
  });
  it("40% drop is not a sudden drop", () => expect(types([ok(1000, 60), ok(600, 0)])).toEqual([]));
  it("baseline older than 24h is ignored", () => expect(types([ok(5000, 25 * 60), ok(600, 0)])).toEqual([]));
  it("different currencies are never compared", () => expect(types([ok(5000, 60, "USD"), ok(600, 0, "EUR")])).toEqual([]));
  it("failed snapshots never act as a baseline", () => expect(types([fail(60), ok(600, 0)])).toEqual([]));
});

describe("API unavailable (no success for 2h)", () => {
  it("failure with last success 3h ago is unavailable", () => expect(types([ok(900, 180), fail(0)])).toEqual(["PROVIDER_BALANCE_UNAVAILABLE"]));
  it("failure with last success 30 min ago is not yet unavailable", () => expect(types([ok(900, 30), fail(0)])).toEqual([]));
  it("freshness labels", () => {
    expect(balanceFreshness([ok(900, 5)], S, NOW)).toBe("FRESH");
    expect(balanceFreshness([ok(900, 60)], S, NOW)).toBe("STALE");
    expect(balanceFreshness([ok(900, 180), fail(0)], S, NOW)).toBe("UNAVAILABLE");
    expect(balanceFreshness([], S, NOW)).toBe("NEVER_CHECKED");
  });
});

describe("alert lifecycle", () => {
  const open = (dedupeKey: string, type: string, severity: string): OpenAlert => ({ id: `a-${dedupeKey}`, dedupeKey, type, severity });

  it("same ongoing condition is not duplicated", () => {
    const conditions = evaluateBalance(P, S, [ok(450, 0)], NOW);
    const actions = reconcileAlerts(conditions, [open(levelKey(P), "LOW_PROVIDER_BALANCE", "WARNING")], managedKeysFor(P, true, true));
    expect(actions).toEqual({ create: [], update: [], resolve: [] });
  });
  it("low → critical escalates the existing alert in place", () => {
    const conditions = evaluateBalance(P, S, [ok(150, 0)], NOW);
    const actions = reconcileAlerts(conditions, [open(levelKey(P), "LOW_PROVIDER_BALANCE", "WARNING")], managedKeysFor(P, true, true));
    expect(actions.create).toHaveLength(0);
    expect(actions.update[0]?.condition.type).toBe("CRITICAL_PROVIDER_BALANCE");
  });
  it("top-up resolves level and drop alerts", () => {
    const conditions = evaluateBalance(P, S, [ok(100, 60), ok(2000, 0)], NOW);
    const actions = reconcileAlerts(conditions, [open(levelKey(P), "CRITICAL_PROVIDER_BALANCE", "CRITICAL"), open(dropKey(P), "PROVIDER_BALANCE_DROP", "CRITICAL")], managedKeysFor(P, true, true));
    expect(actions.resolve.sort()).toEqual([`a-${dropKey(P)}`, `a-${levelKey(P)}`].sort());
  });
  it("a successful read resolves the unavailable alert", () => {
    const actions = reconcileAlerts(evaluateBalance(P, S, [ok(900, 0)], NOW), [open(unavailableKey(P), "PROVIDER_BALANCE_UNAVAILABLE", "CRITICAL")], managedKeysFor(P, true, true));
    expect(actions.resolve).toEqual([`a-${unavailableKey(P)}`]);
  });
  it("a failed read never auto-resolves a low balance alert", () => {
    const actions = reconcileAlerts(evaluateBalance(P, S, [ok(400, 10), fail(0)], NOW), [open(levelKey(P), "LOW_PROVIDER_BALANCE", "WARNING")], managedKeysFor(P, false, true));
    expect(actions.resolve).toEqual([]);
  });
  it("disabled monitoring raises nothing", () => expect(evaluateBalance(P, { ...S, enabled: false }, [ok(0, 0)], NOW)).toEqual([]));
});

describe("settings + scheduler", () => {
  it("critical above low is rejected", () => expect(validateBalanceSettings({ ...S, criticalThreshold: 600 })).not.toBeNull());
  it("defaults are valid", () => expect(validateBalanceSettings(S)).toBeNull());
  it("scheduler counts as active only after a recent real scheduled run", () => {
    expect(schedulerActive(null, 15, NOW)).toBe(false);
    expect(schedulerActive(at(20), 15, NOW)).toBe(true);
    expect(schedulerActive(at(120), 15, NOW)).toBe(false);
  });
});

describe("safe provider fetch (mocked responses)", () => {
  it("normal response", async () => expect(await fetchBalanceSafely(async () => ({ amount: 812.5, currency: "EUR" }))).toEqual({ ok: true, amount: 812.5, currency: "EUR" }));
  it("null response is READ_FAILED", async () => expect(await fetchBalanceSafely(async () => null)).toEqual({ ok: false, errorCode: "READ_FAILED" }));
  it("thrown error is REQUEST_ERROR and leaks no message", async () => expect(await fetchBalanceSafely(async () => { throw new Error("secret=abc"); })).toEqual({ ok: false, errorCode: "REQUEST_ERROR" }));
  it("hang is TIMEOUT", async () => expect(await fetchBalanceSafely(() => new Promise(() => {}), 20)).toEqual({ ok: false, errorCode: "TIMEOUT" }));
});
