/**
 * Provider-independent checkout flow: validate → create order → handle payment
 * event → provision → update status. Database, payment provider and supplier
 * are ports, so the whole journey runs in memory under test.
 */
import type { PaymentEvent, PaymentGateway } from "@/domain/payments/gateway";
import { provisionOrder, type ProvisioningOptions, type ProvisioningStore, type UnitOutcome } from "./engine";
import { assertSupplierMatchesOrder, type LabeledSupplier } from "./mock-supplier";
import {
  canTransitionOrder,
  planUnits,
  validateOrderLine,
  type OrderRejection,
  type OrderStatus,
  type PaymentStatus,
  type PlannedUnit,
  type PurchaseGate,
  type ResolvedProduct,
} from "./provisioning";

export type OrderLineInput = { productId: string; quantity: number; /** ignored: price is server-side */ price?: number };

export type OrderRecord = {
  id: string;
  /** Null for guest orders; guests never get an auth user or profile. */
  customerId: string | null;
  guestEmail: string | null;
  locale: string;
  idempotencyKey: string;
  isTest: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: string;
  currency: string;
  total: number;
  paymentRef: string | null;
  lines: Array<{ orderItemId: string; productId: string; quantity: number; unitPrice: number; providerId: string; externalId: string }>;
};

export interface CheckoutStore extends ProvisioningStore {
  loadProducts(ids: string[]): Promise<Map<string, ResolvedProduct>>;
  findOrderByKey(owner: OrderOwner, key: string): Promise<OrderRecord | null>;
  insertOrder(order: Omit<OrderRecord, "id" | "lines"> & { lines: Omit<OrderRecord["lines"][number], "orderItemId">[] }): Promise<OrderRecord>;
  insertUnits(orderId: string, units: PlannedUnit[]): Promise<void>;
  getOrder(orderId: string): Promise<OrderRecord | null>;
  updateOrder(orderId: string, patch: Partial<Pick<OrderRecord, "status" | "paymentStatus" | "paymentRef">>): Promise<void>;
  /** Returns false when the event id was already processed. Must be atomic. */
  recordPaymentEvent(eventId: string, orderId: string): Promise<boolean>;
  audit(action: string, orderId: string, detail: Record<string, unknown>): Promise<void>;
}

/** Exactly one of customerId (signed-in) or guestEmail (guest checkout). */
export type OrderOwner = { customerId: string; guestEmail?: null } | { customerId?: null; guestEmail: string };

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export function normalizeGuestEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export type CheckoutDeps = {
  store: CheckoutStore;
  gateway: PaymentGateway;
  supplier: LabeledSupplier;
  gate: PurchaseGate;
  provisioning: ProvisioningOptions;
};

export type PlaceOrderResult =
  | { ok: true; order: OrderRecord; duplicate: boolean }
  | { ok: false; reason: OrderRejection | "EMPTY" | "MIXED_CURRENCY" | "TEST_FLOW_FORBIDDEN" | "INVALID_CUSTOMER"; productId?: string };

export async function placeOrder(
  deps: CheckoutDeps,
  input: { customerId?: string | null; guestEmail?: string | null; locale?: string; idempotencyKey: string; lines: OrderLineInput[]; isTest: boolean; testFlowAllowed: boolean },
): Promise<PlaceOrderResult> {
  const customerId = typeof input.customerId === "string" && input.customerId ? input.customerId : null;
  const guestEmail = input.guestEmail == null ? null : normalizeGuestEmail(input.guestEmail);
  if (input.guestEmail != null && !guestEmail) return { ok: false, reason: "INVALID_CUSTOMER" };
  if ((customerId === null) === (guestEmail === null)) return { ok: false, reason: "INVALID_CUSTOMER" };
  const owner: OrderOwner = customerId ? { customerId } : { guestEmail: guestEmail! };
  if (input.isTest && !input.testFlowAllowed) return { ok: false, reason: "TEST_FLOW_FORBIDDEN" };
  if (input.isTest && deps.gateway.kind !== "MOCK") return { ok: false, reason: "TEST_FLOW_FORBIDDEN" };
  if (!input.lines.length) return { ok: false, reason: "EMPTY" };

  const existing = await deps.store.findOrderByKey(owner, input.idempotencyKey);
  if (existing) return { ok: true, order: existing, duplicate: true };

  const products = await deps.store.loadProducts(input.lines.map((l) => l.productId));
  const lines: Omit<OrderRecord["lines"][number], "orderItemId">[] = [];
  let currency: string | null = null;
  for (const line of input.lines) {
    const product = products.get(line.productId) ?? null;
    const check = validateOrderLine(product, line.quantity, deps.gate);
    if (!check.ok) return { ok: false, reason: check.reason, productId: line.productId };
    if (product!.isTest !== input.isTest) return { ok: false, reason: "TEST_FLOW_FORBIDDEN", productId: line.productId };
    if (currency && currency !== product!.currency) return { ok: false, reason: "MIXED_CURRENCY" };
    currency = product!.currency;
    lines.push({ productId: product!.id, quantity: line.quantity, unitPrice: Number(product!.salePrice), providerId: product!.primaryProviderId!, externalId: product!.providerExternalId! });
  }
  const total = Math.round(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;
  const order = await deps.store.insertOrder({
    customerId,
    guestEmail,
    locale: input.locale || "tr",
    idempotencyKey: input.idempotencyKey,
    isTest: input.isTest,
    status: "PENDING",
    paymentStatus: "PENDING",
    fulfillmentStatus: "PENDING",
    currency: currency!,
    total,
    paymentRef: null,
    lines,
  });
  await deps.store.insertUnits(order.id, planUnits(order.id, order.lines));
  const intent = await deps.gateway.createPayment({ orderId: order.id, amount: total, currency: currency!, idempotencyKey: `pay:${order.id}` });
  await deps.store.updateOrder(order.id, { paymentRef: intent.paymentRef });
  await deps.store.audit("ORDER_CREATED", order.id, { isTest: order.isTest, total, currency });
  return { ok: true, order: { ...order, paymentRef: intent.paymentRef }, duplicate: false };
}

export type PaymentEventResult =
  | { result: "IGNORED_INVALID" | "IGNORED_DUPLICATE" | "IGNORED_STATE" | "AMOUNT_MISMATCH" | "ORDER_NOT_FOUND" }
  | { result: "PAYMENT_FAILED" }
  | { result: "PAID"; fulfillment: string; outcomes: UnitOutcome[] };

export async function handlePaymentEvent(deps: CheckoutDeps, raw: unknown): Promise<PaymentEventResult> {
  const event: PaymentEvent | null = deps.gateway.parseEvent(raw);
  if (!event) return { result: "IGNORED_INVALID" };
  const order = await deps.store.getOrder(event.orderId);
  if (!order || order.paymentRef !== event.paymentRef) return { result: "ORDER_NOT_FOUND" };
  if (!(await deps.store.recordPaymentEvent(event.eventId, order.id))) return { result: "IGNORED_DUPLICATE" };
  if (order.paymentStatus !== "PENDING") return { result: "IGNORED_STATE" };

  if (event.type === "FAILED") {
    await deps.store.updateOrder(order.id, { paymentStatus: "FAILED" });
    await deps.store.audit("PAYMENT_FAILED", order.id, { isTest: order.isTest });
    return { result: "PAYMENT_FAILED" };
  }
  if (Math.abs(event.amount - order.total) > 0.001 || event.currency !== order.currency) {
    await deps.store.audit("PAYMENT_AMOUNT_MISMATCH", order.id, { isTest: order.isTest });
    return { result: "AMOUNT_MISMATCH" };
  }
  if (!canTransitionOrder(order.status, "CONFIRMED")) return { result: "IGNORED_STATE" };
  await deps.store.updateOrder(order.id, { paymentStatus: "PAID", status: "CONFIRMED" });
  await deps.store.audit("PAYMENT_CONFIRMED", order.id, { isTest: order.isTest });
  const { fulfillment, outcomes } = await fulfilOrder(deps, order.id);
  return { result: "PAID", fulfillment, outcomes };
}

/** Provisions (or safely retries) a paid order and completes it when fulfilled. */
export async function fulfilOrder(deps: CheckoutDeps, orderId: string) {
  const order = await deps.store.getOrder(orderId);
  if (!order) throw new Error("Order not found");
  assertSupplierMatchesOrder(order.isTest, deps.supplier);
  const result = await provisionOrder(deps.store, deps.supplier, orderId, deps.provisioning);
  if (result.fulfillment === "FULFILLED" && canTransitionOrder(order.status, "COMPLETED")) {
    await deps.store.updateOrder(orderId, { status: "COMPLETED" });
  }
  await deps.store.audit("FULFILLMENT_RUN", orderId, { isTest: order.isTest, fulfillment: result.fulfillment });
  return result;
}

/** Revenue never includes test orders or unpaid orders. */
export function revenueTotals(orders: Array<Pick<OrderRecord, "isTest" | "paymentStatus" | "total" | "currency">>) {
  const totals: Record<string, number> = {};
  for (const order of orders) {
    if (order.isTest || order.paymentStatus !== "PAID") continue;
    totals[order.currency] = Math.round(((totals[order.currency] ?? 0) + order.total) * 100) / 100;
  }
  return totals;
}

/** Customer ownership: a record is visible only to its owner (admins via separate tooling). */
export function canCustomerView(record: { customerId: string }, userId: string | null | undefined): boolean {
  return Boolean(userId) && record.customerId === userId;
}
