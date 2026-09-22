/**
 * Provisioning engine. Transport-free and database-free: it drives the money
 * path through a small store port and a supplier port, so every branch
 * (success, timeout, 429, 5xx, malformed, duplicate, concurrent) is tested
 * without touching the live supplier or the production database.
 */
import {
  aggregateFulfillment,
  alertTypeForFailure,
  canRetryUnit,
  classifySupplierFailure,
  initialCustomerEsimState,
  normalizeEsimGoOrder,
  statusForDisposition,
  type NormalizedEsim,
  type ProvisioningStatus,
} from "./provisioning";

export type UnitRow = {
  id: string;
  orderId: string;
  orderItemId: string;
  unitIndex: number;
  status: ProvisioningStatus;
  providerReference: string | null;
  customerEsimId: string | null;
  attemptCount: number;
  externalId: string | null;
  providerId: string | null;
  /** Commercial snapshot used for the customer-facing eSIM record. */
  snapshot: { destinationLabel: string | null; packageLabel: string | null; totalDataMb: number | null; validityStartRule: string | null; topupSupported: boolean };
};

export type SupplierOrderResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; timeout: boolean; malformed?: boolean; error: string };

export type SupplierLookupResult = { found: true; body: unknown } | { found: false; conclusive: boolean; status: number };

export interface SupplierPort {
  placeOrder(input: { externalId: string; quantity: number; reference: string }): Promise<SupplierOrderResult>;
  lookupOrder?(reference: string): Promise<SupplierLookupResult>;
}

export interface ProvisioningStore {
  isOrderPaid(orderId: string): Promise<boolean>;
  loadUnit(unitId: string): Promise<UnitRow | null>;
  listUnits(orderId: string): Promise<UnitRow[]>;
  /** Atomic claim. Returns null when another worker already owns the unit. */
  claimUnit(unitId: string): Promise<UnitRow | null>;
  saveReference(unitId: string, reference: string, providerStatus: string | null): Promise<void>;
  createEsim(unit: UnitRow, esim: NormalizedEsim, state: { status: string; expiresAt: null }): Promise<string>;
  finishUnit(unitId: string, esimId: string): Promise<void>;
  failUnit(unitId: string, status: ProvisioningStatus, category: string, message: string): Promise<void>;
  resetUnit(unitId: string, category: string, message: string): Promise<void>;
  raiseAlert(type: string, unitId: string, message: string): Promise<void>;
  setOrderFulfillment(orderId: string, status: string): Promise<void>;
}

export type UnitOutcome =
  | { result: "PROVISIONED"; esimId: string }
  | { result: "ALREADY_PROVISIONED" }
  | { result: "BUSY" }
  | { result: "NOT_PAID" }
  | { result: "NEEDS_RECONCILIATION" }
  | { result: "DISABLED" }
  | { result: "FAILED"; category: string; disposition: string };

export type ProvisioningOptions = {
  /**
   * Live supplier purchases are OFF by default. Nothing can reach the paid
   * supplier endpoint unless this is explicitly turned on server-side.
   */
  liveSupplierCallsEnabled: boolean;
};

async function persistSuccess(
  store: ProvisioningStore,
  unit: UnitRow,
  esim: NormalizedEsim,
): Promise<UnitOutcome> {
  // Reference first: if the database fails afterwards we still know a paid
  // supplier order exists, so nothing is ever purchased twice.
  await store.saveReference(unit.id, esim.providerReference, esim.providerStatus);
  try {
    const esimId = await store.createEsim(unit, esim, initialCustomerEsimState(unit.snapshot.validityStartRule));
    await store.finishUnit(unit.id, esimId);
    return { result: "PROVISIONED", esimId };
  } catch (error) {
    await store.failUnit(unit.id, "RESULT_UNKNOWN", "DB_AFTER_SUPPLIER", String((error as Error).message ?? error));
    await store.raiseAlert("SUPPLIER_RESULT_UNKNOWN", unit.id, "Tedarikçi siparişi alındı ancak kayıt tamamlanamadı.");
    return { result: "NEEDS_RECONCILIATION" };
  }
}

/** Provisions exactly one unit. Safe to call twice: the second call is a no-op. */
export async function provisionUnit(
  store: ProvisioningStore,
  supplier: SupplierPort,
  unitId: string,
  options: ProvisioningOptions,
): Promise<UnitOutcome> {
  const current = await store.loadUnit(unitId);
  if (!current) return { result: "FAILED", category: "UNIT_NOT_FOUND", disposition: "PERMANENT" };
  if (current.customerEsimId || current.status === "PROVISIONED") return { result: "ALREADY_PROVISIONED" };
  if (!(await store.isOrderPaid(current.orderId))) return { result: "NOT_PAID" };
  if (!canRetryUnit(current)) {
    return current.status === "IN_PROGRESS" ? { result: "BUSY" } : { result: "NEEDS_RECONCILIATION" };
  }

  const unit = await store.claimUnit(unitId);
  if (!unit) return { result: "BUSY" };

  if (!options.liveSupplierCallsEnabled) {
    await store.resetUnit(unit.id, "LIVE_PROVISIONING_DISABLED", "Canlı tedarikçi siparişi kapalı.");
    return { result: "DISABLED" };
  }

  if (!unit.externalId) {
    await store.failUnit(unit.id, "FAILED", "NO_PROVIDER_MAPPING", "Tedarikçi ürün eşlemesi yok.");
    return { result: "FAILED", category: "NO_PROVIDER_MAPPING", disposition: "PERMANENT" };
  }

  const response = await supplier.placeOrder({
    externalId: unit.externalId,
    quantity: 1,
    reference: `${unit.orderItemId}:${unit.unitIndex}`,
  });

  if (!response.ok) {
    const { category, disposition } = classifySupplierFailure({
      status: response.status,
      timeout: response.timeout,
      malformed: response.malformed === true,
    });
    await store.failUnit(unit.id, statusForDisposition(disposition), category, response.error);
    await store.raiseAlert(alertTypeForFailure(disposition), unit.id, `Sağlama başarısız: ${category}`);
    return { result: "FAILED", category, disposition };
  }

  const normalized = normalizeEsimGoOrder(response.body);
  if (!normalized.ok) {
    // The supplier answered 2xx but we cannot read the order: treat as unknown.
    await store.failUnit(unit.id, "RESULT_UNKNOWN", "MALFORMED_RESPONSE", "Tedarikçi yanıtı okunamadı.");
    await store.raiseAlert("SUPPLIER_RESULT_UNKNOWN", unit.id, "Tedarikçi yanıtı okunamadı — mutabakat gerekiyor.");
    return { result: "FAILED", category: "MALFORMED_RESPONSE", disposition: "SUPPLIER_RESULT_UNKNOWN" };
  }

  return persistSuccess(store, unit, normalized.esim);
}

/** Runs every unit of a paid order and recomputes the order fulfillment state. */
export async function provisionOrder(
  store: ProvisioningStore,
  supplier: SupplierPort,
  orderId: string,
  options: ProvisioningOptions,
): Promise<{ outcomes: UnitOutcome[]; fulfillment: string }> {
  const units = await store.listUnits(orderId);
  const outcomes: UnitOutcome[] = [];
  for (const unit of units) {
    // One failing unit must never corrupt the units that already succeeded.
    outcomes.push(await provisionUnit(store, supplier, unit.id, options));
  }
  const after = await store.listUnits(orderId);
  const fulfillment = aggregateFulfillment(after.map((unit) => unit.status));
  await store.setOrderFulfillment(orderId, fulfillment);
  return { outcomes, fulfillment };
}

export type ReconcileOutcome =
  | { result: "PROVISIONED"; esimId: string }
  | { result: "ALREADY_PROVISIONED" }
  | { result: "NO_SUPPLIER_ORDER" }
  | { result: "STILL_UNKNOWN"; status: number }
  | { result: "UNSUPPORTED" }
  | { result: "NOT_FOUND" };

/**
 * Resolves an unknown supplier result WITHOUT purchasing anything: it asks the
 * supplier whether the order exists and either completes it or releases the
 * unit for a safe retry.
 */
export async function reconcileUnit(
  store: ProvisioningStore,
  supplier: SupplierPort,
  unitId: string,
): Promise<ReconcileOutcome> {
  const unit = await store.loadUnit(unitId);
  if (!unit) return { result: "NOT_FOUND" };
  if (unit.customerEsimId) return { result: "ALREADY_PROVISIONED" };
  if (!supplier.lookupOrder) return { result: "UNSUPPORTED" };

  const reference = unit.providerReference ?? `${unit.orderItemId}:${unit.unitIndex}`;
  const lookup = await supplier.lookupOrder(reference);

  if (!lookup.found) {
    if (!lookup.conclusive) return { result: "STILL_UNKNOWN", status: lookup.status };
    // Conclusively no supplier order: the unit becomes safe to retry.
    await store.resetUnit(unit.id, "RECONCILED_NO_ORDER", "Tedarikçide sipariş bulunamadı; yeniden denenebilir.");
    return { result: "NO_SUPPLIER_ORDER" };
  }

  const normalized = normalizeEsimGoOrder(lookup.body);
  if (!normalized.ok) return { result: "STILL_UNKNOWN", status: 200 };
  const outcome = await persistSuccess(store, unit, normalized.esim);
  return outcome.result === "PROVISIONED"
    ? { result: "PROVISIONED", esimId: outcome.esimId }
    : { result: "STILL_UNKNOWN", status: 200 };
}
