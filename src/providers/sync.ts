import type { NormalizedProduct, RawProviderItem } from "./types";

/**
 * Provider sync engine contracts (no live calls in Phase 0).
 *
 * Rules encoded here:
 *  - imports are idempotent, keyed by (providerId, externalId)
 *  - unchanged payloads are detected by hash, not re-written
 *  - a vanished provider item is marked unavailable, never deleted
 *  - admin-owned fields are never overwritten by a sync
 */

export type SyncCounters = {
  itemsReceived: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsUnavailable: number;
  itemsFailed: number;
};

export const emptyCounters = (): SyncCounters => ({
  itemsReceived: 0,
  itemsCreated: 0,
  itemsUpdated: 0,
  itemsUnchanged: 0,
  itemsUnavailable: 0,
  itemsFailed: 0,
});

export type SyncDiff = {
  created: NormalizedProduct[];
  updated: NormalizedProduct[];
  unchanged: string[];
  goneUnavailable: string[];
};

/** Stable content hash used to skip unchanged provider payloads. */
export function payloadHash(payload: unknown): string {
  const json = JSON.stringify(payload, Object.keys(payload as object).sort());
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export type ExistingItemIndex = Map<string, { payloadHash: string; available: boolean }>;

export function diffCatalogue(
  incoming: RawProviderItem[],
  existing: ExistingItemIndex,
  normalize: (item: RawProviderItem) => NormalizedProduct,
): SyncDiff {
  const diff: SyncDiff = { created: [], updated: [], unchanged: [], goneUnavailable: [] };
  const seen = new Set<string>();

  for (const item of incoming) {
    seen.add(item.externalId);
    const hash = payloadHash(item.payload);
    const prev = existing.get(item.externalId);
    if (!prev) diff.created.push(normalize(item));
    else if (prev.payloadHash !== hash) diff.updated.push(normalize(item));
    else diff.unchanged.push(item.externalId);
  }

  for (const [externalId, prev] of existing) {
    // Never delete: a vanished item only loses availability.
    if (!seen.has(externalId) && prev.available) diff.goneUnavailable.push(externalId);
  }

  return diff;
}

/** Fields a provider sync is allowed to write. Everything else is admin-owned. */
export const PROVIDER_OWNED_PRODUCT_FIELDS = [
  "provider_external_id",
  "provider_cost",
  "provider_currency",
  "provider_available",
  "provider_synced_at",
  "name",
] as const;

export const ADMIN_OWNED_PRODUCT_FIELDS = [
  "sale_price",
  "price_overridden",
  "customer_visible",
  "featured",
  "badge",
  "sort_order",
  "pricing_rule_id",
  "lifecycle",
] as const;

/** Retry with exponential backoff + jitter, rate-limit aware. */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseMs?: number; maxMs?: number } = {},
): Promise<T> {
  const { retries = 4, baseMs = 500, maxMs = 15_000 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = Math.min(maxMs, baseMs * 2 ** attempt) * (0.5 + Math.random() / 2);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/** Catalogue data and transactional availability are separate concepts. */
export type CheckoutValidationStep =
  | "CATALOGUE_SELECTED"
  | "PROVIDER_VALIDATED"
  | "PAYMENT_AUTHORIZED"
  | "ORDER_PLACED"
  | "FULFILLED";
