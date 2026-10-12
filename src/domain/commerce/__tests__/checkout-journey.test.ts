import { describe, expect, it } from "vitest";

import { canCustomerView, fulfilOrder, handlePaymentEvent, placeOrder, revenueTotals, type CheckoutDeps } from "../checkout";
import { reconcileUnit } from "../engine";
import { assertSupplierMatchesOrder, createMockSupplier, isDemoActivation, simulateDemoUsage } from "../mock-supplier";
import type { ResolvedProduct } from "../provisioning";
import { createMockPaymentGateway } from "@/domain/payments/mock-gateway";
import { normalizeCustomerEsimStatus, remainingDays } from "@/domain/esim/customer-esim";
import { createMemoryStore } from "./memory-store";

const TEST_PRODUCT: ResolvedProduct = {
  id: "test-tr-10gb", serviceType: "ESIM", lifecycle: "PUBLISHED", customerVisible: true, providerAvailable: true,
  salePrice: 12.99, currency: "EUR", providerCost: 6, pricingReviewRequired: false, primaryProviderId: "mock-provider",
  providerExternalId: "DEMO_TR_10GB", isTest: true,
};
const REAL_PRODUCT: ResolvedProduct = { ...TEST_PRODUCT, id: "real-tr-10gb", isTest: false };

function setup(liveSupplierCallsEnabled = true) {
  const mem = createMemoryStore([TEST_PRODUCT, REAL_PRODUCT]);
  const gateway = createMockPaymentGateway({ testEnvironment: true });
  const supplier = createMockSupplier({ testEnvironment: true });
  const deps: CheckoutDeps = { store: mem.store, gateway, supplier, gate: { serviceActive: true, purchasesActive: true }, provisioning: { liveSupplierCallsEnabled } };
  const order = (key = "cart-1", quantity = 1, customerId = "customer-a") =>
    placeOrder(deps, { customerId, idempotencyKey: key, isTest: true, testFlowAllowed: true, lines: [{ productId: TEST_PRODUCT.id, quantity, price: 0.01 }] });
  return { ...mem, gateway, supplier, deps, order };
}

describe("mock checkout journey (in memory only)", () => {
  it("successful mock payment completes the order and creates a DEMO eSIM", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error(placed.reason);
    expect(placed.order.total).toBe(12.99); // server price, not the 0.01 sent by the client
    const result = await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    expect(result.result).toBe("PAID");
    const order = await t.store.getOrder(placed.order.id);
    expect(order?.status).toBe("COMPLETED");
    expect(order?.fulfillmentStatus).toBe("FULFILLED");
    const [esim] = [...t.esims.values()];
    expect(esim?.isTest).toBe(true);
    expect(isDemoActivation(esim?.qrPayload)).toBe(true);
    expect(normalizeCustomerEsimStatus(esim?.status)).toBe("READY");
  });

  it("failed mock payment never starts provisioning", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    expect((await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "FAILED") })).result).toBe("PAYMENT_FAILED");
    expect(t.supplier.calls.placeOrder).toBe(0);
    expect((await t.store.getOrder(placed.order.id))?.paymentStatus).toBe("FAILED");
  });

  it("a duplicate payment event yields one order and one eSIM", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    const event = { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") };
    await handlePaymentEvent(t.deps, event);
    expect((await handlePaymentEvent(t.deps, event)).result).toBe("IGNORED_DUPLICATE");
    expect(t.esims.size).toBe(1);
    expect(t.supplier.calls.placeOrder).toBe(1);
  });

  it("a duplicate submit with the same key creates no second order", async () => {
    const t = setup();
    const first = await t.order("cart-x");
    const second = await t.order("cart-x");
    expect(second.ok && second.duplicate).toBe(true);
    expect(first.ok && second.ok && first.order.id === second.order.id).toBe(true);
    expect(t.orders.size).toBe(1);
  });

  it("forged or unverified payment events are ignored", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    const forged = { ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") }; // missing mock signature marker
    expect((await handlePaymentEvent(t.deps, forged)).result).toBe("IGNORED_INVALID");
    const wrongAmount = { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED"), amount: 1 };
    expect((await handlePaymentEvent(t.deps, wrongAmount)).result).toBe("AMOUNT_MISMATCH");
    expect(t.esims.size).toBe(0);
  });

  it("a rate-limited supplier failure is retried safely", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    t.supplier.failNext("RATE_LIMITED");
    const paid = await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    expect(paid.result === "PAID" && paid.fulfillment).toBe("FAILED");
    expect(t.alerts.length).toBe(1);
    const retry = await fulfilOrder(t.deps, placed.order.id);
    expect(retry.fulfillment).toBe("FULFILLED");
    expect(t.esims.size).toBe(1);
  });

  it("a timeout is never re-purchased: it is reconciled instead", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    t.supplier.failNext("TIMEOUT");
    await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    const retry = await fulfilOrder(t.deps, placed.order.id);
    expect(retry.outcomes[0]).toEqual({ result: "NEEDS_RECONCILIATION" });
    expect(t.supplier.calls.placeOrder).toBe(1);
    const [unit] = [...t.units.values()];
    expect((await reconcileUnit(t.store, t.supplier, unit!.id)).result).toBe("PROVISIONED");
    expect(t.supplier.calls.placeOrder).toBe(1);
    expect(t.esims.size).toBe(1);
  });

  it("with live supplier calls disabled no supplier request is made", async () => {
    const t = setup(false);
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    expect(t.supplier.calls.placeOrder).toBe(0);
    expect(t.esims.size).toBe(0);
  });

  it("quantity 3 provisions exactly three eSIMs", async () => {
    const t = setup();
    const placed = await t.order("cart-3", 3);
    if (!placed.ok) throw new Error();
    await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    expect(t.esims.size).toBe(3);
    expect(placed.order.total).toBe(38.97);
  });
});

describe("test-flow isolation and access", () => {
  it("only designated admins/test accounts can use the test flow", async () => {
    const t = setup();
    const denied = await placeOrder(t.deps, { customerId: "c", idempotencyKey: "k", isTest: true, testFlowAllowed: false, lines: [{ productId: TEST_PRODUCT.id, quantity: 1 }] });
    expect(denied).toEqual({ ok: false, reason: "TEST_FLOW_FORBIDDEN" });
  });

  it("a test order cannot contain a real product", async () => {
    const t = setup();
    const mixed = await placeOrder(t.deps, { customerId: "c", idempotencyKey: "k", isTest: true, testFlowAllowed: true, lines: [{ productId: REAL_PRODUCT.id, quantity: 1 }] });
    expect(mixed.ok).toBe(false);
  });

  it("test orders never reach a live supplier and real orders never reach the mock", () => {
    expect(() => assertSupplierMatchesOrder(true, { kind: "LIVE", placeOrder: async () => ({ ok: true, body: {} }) })).toThrow();
    expect(() => assertSupplierMatchesOrder(false, createMockSupplier({ testEnvironment: true }))).toThrow();
  });

  it("mock modules refuse to start outside a test environment", () => {
    expect(() => createMockPaymentGateway({ testEnvironment: false })).toThrow();
    expect(() => createMockSupplier({ testEnvironment: false })).toThrow();
  });

  it("test orders are excluded from revenue", () => {
    expect(revenueTotals([
      { isTest: true, paymentStatus: "PAID", total: 12.99, currency: "EUR" },
      { isTest: false, paymentStatus: "PAID", total: 5, currency: "EUR" },
      { isTest: false, paymentStatus: "FAILED", total: 9, currency: "EUR" },
    ])).toEqual({ EUR: 5 });
  });

  it("customers see only their own orders and eSIMs", async () => {
    const t = setup();
    const placed = await t.order("k", 1, "customer-a");
    if (!placed.ok) throw new Error();
    await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    const [esim] = [...t.esims.values()];
    expect(canCustomerView(placed.order, "customer-a")).toBe(true);
    expect(canCustomerView(placed.order, "customer-b")).toBe(false);
    expect(canCustomerView(esim!, null)).toBe(false);
  });

  it("audit entries never contain activation material", async () => {
    const t = setup();
    const placed = await t.order();
    if (!placed.ok) throw new Error();
    await handlePaymentEvent(t.deps, { mock: true, ...t.gateway.event(placed.order.paymentRef!, "SUCCEEDED") });
    const serialized = JSON.stringify(t.auditLog);
    expect(serialized).not.toMatch(/DEMO-ICCID|LPA:|demo-esim\.invalid/);
  });
});

describe("customer dashboard view of a demo eSIM", () => {
  it("shows simulated usage and validity", () => {
    const usage = simulateDemoUsage(10240, 2048, 30, new Date("2026-10-01T00:00:00Z"));
    expect(usage).toMatchObject({ remainingMb: 8192, status: "ACTIVE" });
    expect(remainingDays(usage.expiresAt, new Date("2026-10-21T00:00:00Z"))).toBe(10);
    expect(normalizeCustomerEsimStatus(usage.status)).toBe("ACTIVE");
  });
});
