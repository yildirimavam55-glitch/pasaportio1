/**
 * Phase 2A — pure catalogue sync decision logic.
 *
 * No IO, no provider coupling. Everything here is deterministic so the
 * critical safety rules (never mass-disable on a failed sync, never
 * hard-delete, never duplicate) can be unit tested.
 */
import { getCountryByIso } from "@/domain/geo/countries";

export type CatalogueFetch = {
  /** Raw provider rows exactly as received. */
  items: Record<string, unknown>[];
  /** True only when every page was fetched without error. */
  complete: boolean;
  pages: number;
  error?: string | null;
};

export type ChangeType =
  | "NEW_PRODUCT"
  | "PRICE_INCREASE"
  | "PRICE_DECREASE"
  | "COVERAGE_CHANGE"
  | "VALIDITY_CHANGE"
  | "DATA_CHANGE"
  | "AVAILABILITY_CHANGE"
  | "PRODUCT_REMOVED"
  | "PRODUCT_RETURNED";

export type CatalogueSnapshotItem = {
  externalId: string;
  providerCost: number | null;
  currency: string;
  coverage: string[];
  validityDays: number | null;
  dataGb: number | null;
  unlimited: boolean;
  available: boolean;
};

export type CatalogueChange = {
  externalId: string;
  type: ChangeType;
  needsReview: boolean;
  details: Record<string, unknown>;
};

export type PriceChange = {
  oldCost: number | null;
  newCost: number;
  currency: string;
  changeAmount: number | null;
  changePercent: number | null;
  direction: "UP" | "DOWN" | "SAME";
};

export function computeCostChange(oldCost: number | null | undefined, newCost: number, currency: string): PriceChange {
  if (oldCost == null || !Number.isFinite(oldCost)) {
    return { oldCost: null, newCost, currency, changeAmount: null, changePercent: null, direction: "SAME" };
  }
  const changeAmount = Math.round((newCost - oldCost) * 10000) / 10000;
  const changePercent = oldCost > 0 ? Math.round((changeAmount / oldCost) * 10000) / 100 : null;
  return {
    oldCost,
    newCost,
    currency,
    changeAmount,
    changePercent,
    direction: changeAmount > 0 ? "UP" : changeAmount < 0 ? "DOWN" : "SAME",
  };
}

const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const left = [...a].sort().join(",");
  const right = [...b].sort().join(",");
  return left === right;
};

/** Diff one incoming item against the previous valid snapshot. */
export function classifyItem(
  next: CatalogueSnapshotItem,
  previous: CatalogueSnapshotItem | undefined,
): CatalogueChange[] {
  if (!previous) {
    return [{ externalId: next.externalId, type: "NEW_PRODUCT", needsReview: true, details: { providerCost: next.providerCost } }];
  }

  const changes: CatalogueChange[] = [];

  if (!previous.available && next.available) {
    changes.push({ externalId: next.externalId, type: "PRODUCT_RETURNED", needsReview: true, details: {} });
  }

  if (next.providerCost != null && previous.providerCost != null && next.providerCost !== previous.providerCost) {
    const change = computeCostChange(previous.providerCost, next.providerCost, next.currency);
    changes.push({
      externalId: next.externalId,
      type: change.direction === "UP" ? "PRICE_INCREASE" : "PRICE_DECREASE",
      needsReview: change.direction === "UP",
      details: { ...change },
    });
  }

  if (!sameSet(previous.coverage, next.coverage)) {
    changes.push({
      externalId: next.externalId,
      type: "COVERAGE_CHANGE",
      needsReview: true,
      details: { before: previous.coverage.length, after: next.coverage.length },
    });
  }

  if (previous.validityDays !== next.validityDays) {
    changes.push({
      externalId: next.externalId,
      type: "VALIDITY_CHANGE",
      needsReview: false,
      details: { before: previous.validityDays, after: next.validityDays },
    });
  }

  if (previous.dataGb !== next.dataGb || previous.unlimited !== next.unlimited) {
    changes.push({
      externalId: next.externalId,
      type: "DATA_CHANGE",
      needsReview: false,
      details: { before: previous.unlimited ? "UNLIMITED" : previous.dataGb, after: next.unlimited ? "UNLIMITED" : next.dataGb },
    });
  }

  return changes;
}

/**
 * MANDATORY SAFETY RULE: items missing from a sync may only be marked
 * unavailable when the catalogue fetch was complete AND successful.
 */
export function resolveMissingItems(input: {
  incomingIds: string[];
  knownAvailableIds: string[];
  fetchComplete: boolean;
  fetchSucceeded: boolean;
  itemsReceived: number;
}): string[] {
  if (!input.fetchComplete || !input.fetchSucceeded || input.itemsReceived === 0) return [];
  const incoming = new Set(input.incomingIds);
  return input.knownAvailableIds.filter((id) => !incoming.has(id));
}

/** Unknown provider ISO codes are logged, never turned into new country entities. */
export function mapCoverageToCanonical(isos: string[]): { canonical: string[]; unknown: string[] } {
  const canonical: string[] = [];
  const unknown: string[] = [];
  for (const raw of isos) {
    const iso = String(raw ?? "").trim().toUpperCase();
    if (getCountryByIso(iso)) {
      if (!canonical.includes(iso)) canonical.push(iso);
    } else if (iso && !unknown.includes(iso)) {
      unknown.push(iso);
    }
  }
  return { canonical, unknown };
}

export type SyncOutcome = "SUCCESS" | "PARTIAL" | "FAILED";

export function resolveSyncStatus(input: { complete: boolean; received: number; failed: number; processed: number }): SyncOutcome {
  if (!input.complete || input.received === 0) return input.processed > 0 ? "PARTIAL" : "FAILED";
  if (input.failed > 0) return input.processed > 0 ? "PARTIAL" : "FAILED";
  return "SUCCESS";
}

export const SYNC_INTERVALS = [6, 12, 24, 48] as const;
export const DEFAULT_SYNC_INTERVAL_HOURS = 24;

export function normalizeInterval(value: unknown): number {
  const hours = Number(value);
  return (SYNC_INTERVALS as readonly number[]).includes(hours) ? hours : DEFAULT_SYNC_INTERVAL_HOURS;
}

export function nextSyncAt(from: Date, intervalHours: number): Date {
  return new Date(from.getTime() + normalizeInterval(intervalHours) * 3600_000);
}

export function isSyncDue(input: { autoSync: boolean; active: boolean; nextSyncAt: string | null; now?: Date }): boolean {
  if (!input.autoSync || !input.active) return false;
  if (!input.nextSyncAt) return true;
  const due = new Date(input.nextSyncAt).getTime();
  if (!Number.isFinite(due)) return true;
  return due <= (input.now ?? new Date()).getTime();
}

/** Catalogue is stale when it has not synced successfully for 2 intervals (min 24h). */
export function isCatalogueStale(lastSuccessAt: string | null, intervalHours: number, now = new Date()): boolean {
  const window = Math.max(24, normalizeInterval(intervalHours) * 2) * 3600_000;
  if (!lastSuccessAt) return false;
  const last = new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last > window;
}

export type BalanceHealth = "HEALTHY" | "LOW" | "UNKNOWN";

export function balanceHealth(amount: number | null | undefined, threshold: number | null | undefined): BalanceHealth {
  if (amount == null || !Number.isFinite(amount)) return "UNKNOWN";
  if (threshold == null || !Number.isFinite(threshold)) return "HEALTHY";
  return amount <= threshold ? "LOW" : "HEALTHY";
}

/** Retry policy for 429/5xx/timeout. Retries stay idempotent (same external ids). */
export function retryDelayMs(attempt: number, baseMs = 500, maxMs = 15_000): number {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}
