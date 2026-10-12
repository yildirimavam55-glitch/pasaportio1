/** In-memory CheckoutStore for automated tests only. Never imported by app code. */
import type { CheckoutStore, OrderRecord } from "../checkout";
import type { UnitRow } from "../engine";
import { CLAIMABLE_STATUSES, type NormalizedEsim, type ResolvedProduct } from "../provisioning";

export type MemoryEsim = NormalizedEsim & { id: string; customerId: string; orderId: string; isTest: boolean; status: string; packageLabel: string | null; totalDataMb: number | null };

export function createMemoryStore(products: ResolvedProduct[]) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const orders = new Map<string, OrderRecord>();
  const units = new Map<string, UnitRow & { orderIsTest: boolean; errorCategory: string | null }>();
  const esims = new Map<string, MemoryEsim>();
  const events = new Set<string>();
  const auditLog: Array<{ action: string; orderId: string; detail: Record<string, unknown> }> = [];
  const alerts: Array<{ type: string; unitId: string }> = [];
  let seq = 0;
  const id = (p: string) => `${p}_${++seq}`;

  const store: CheckoutStore = {
    async loadProducts(ids) { return new Map(ids.filter((i) => productMap.has(i)).map((i) => [i, productMap.get(i)!])); },
    async findOrderByKey(customerId, key) { return [...orders.values()].find((o) => o.customerId === customerId && o.idempotencyKey === key) ?? null; },
    async insertOrder(input) {
      const order: OrderRecord = { ...input, id: id("order"), lines: input.lines.map((l) => ({ ...l, orderItemId: id("item") })) };
      orders.set(order.id, order);
      return order;
    },
    async insertUnits(orderId, planned) {
      const order = orders.get(orderId)!;
      for (const p of planned) {
        const line = order.lines.find((l) => l.orderItemId === p.orderItemId)!;
        const product = productMap.get(line.productId);
        const unitId = id("unit");
        units.set(unitId, {
          id: unitId, orderId, orderItemId: p.orderItemId, unitIndex: p.unitIndex, status: "PENDING",
          providerReference: null, customerEsimId: null, attemptCount: 0, externalId: line.externalId, providerId: line.providerId,
          snapshot: { destinationLabel: "Türkiye", packageLabel: `${product?.id ?? "?"} DEMO`, totalDataMb: 10240, validityStartRule: "FIRST_USE", topupSupported: false },
          orderIsTest: order.isTest, errorCategory: null,
        });
      }
    },
    async getOrder(orderId) { const o = orders.get(orderId); return o ? { ...o } : null; },
    async updateOrder(orderId, patch) { const o = orders.get(orderId); if (o) orders.set(orderId, { ...o, ...patch }); },
    async recordPaymentEvent(eventId) { if (events.has(eventId)) return false; events.add(eventId); return true; },
    async audit(action, orderId, detail) { auditLog.push({ action, orderId, detail }); },
    async isOrderPaid(orderId) { return orders.get(orderId)?.paymentStatus === "PAID"; },
    async loadUnit(unitId) { const u = units.get(unitId); return u ? { ...u } : null; },
    async listUnits(orderId) { return [...units.values()].filter((u) => u.orderId === orderId).map((u) => ({ ...u })); },
    async claimUnit(unitId) {
      const u = units.get(unitId);
      if (!u || !CLAIMABLE_STATUSES.includes(u.status)) return null;
      u.status = "IN_PROGRESS"; u.attemptCount += 1;
      return { ...u };
    },
    async saveReference(unitId, reference) { units.get(unitId)!.providerReference = reference; },
    async createEsim(unit, esim, state) {
      const order = orders.get(unit.orderId)!;
      const esimId = id("esim");
      esims.set(esimId, { ...esim, id: esimId, customerId: order.customerId, orderId: order.id, isTest: order.isTest, status: state.status, packageLabel: unit.snapshot.packageLabel, totalDataMb: unit.snapshot.totalDataMb });
      return esimId;
    },
    async finishUnit(unitId, esimId) { const u = units.get(unitId)!; u.status = "PROVISIONED"; u.customerEsimId = esimId; },
    async failUnit(unitId, status, category) { const u = units.get(unitId)!; u.status = status; u.errorCategory = category; },
    async resetUnit(unitId, category) { const u = units.get(unitId)!; u.status = "PENDING"; u.errorCategory = category; },
    async raiseAlert(type, unitId) { alerts.push({ type, unitId }); },
    async setOrderFulfillment(orderId, status) { const o = orders.get(orderId); if (o) o.fulfillmentStatus = status; },
  };
  return { store, orders, units, esims, auditLog, alerts };
}
