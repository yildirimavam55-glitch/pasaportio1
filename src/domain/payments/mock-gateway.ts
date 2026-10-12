import type { PaymentEvent, PaymentEventType, PaymentGateway, PaymentIntent } from "./gateway";

/**
 * Mock payment gateway for automated tests and future isolated test servers.
 * It never charges anything and refuses to exist outside a test environment.
 */
export function createMockPaymentGateway(options: { testEnvironment: boolean }) {
  if (!options.testEnvironment) throw new Error("Mock payment gateway is only available in an isolated test environment.");
  const intents = new Map<string, PaymentIntent>();
  let seq = 0;

  const gateway: PaymentGateway & {
    event(paymentRef: string, type: PaymentEventType, eventId?: string): PaymentEvent;
  } = {
    kind: "MOCK",
    async createPayment({ orderId, amount, currency, idempotencyKey }) {
      const existing = intents.get(idempotencyKey);
      if (existing) return existing;
      seq += 1;
      const intent = { paymentRef: `mockpay_${seq}`, orderId, amount, currency };
      intents.set(idempotencyKey, intent);
      return intent;
    },
    parseEvent(raw) {
      if (!raw || typeof raw !== "object") return null;
      const e = raw as Record<string, unknown>;
      if (e["mock"] !== true) return null; // only events produced by this mock are accepted
      if (typeof e["eventId"] !== "string" || typeof e["paymentRef"] !== "string" || typeof e["orderId"] !== "string") return null;
      if (e["type"] !== "SUCCEEDED" && e["type"] !== "FAILED") return null;
      if (typeof e["amount"] !== "number" || typeof e["currency"] !== "string") return null;
      return { eventId: e["eventId"], paymentRef: e["paymentRef"], orderId: e["orderId"], type: e["type"], amount: e["amount"], currency: e["currency"] };
    },
    event(paymentRef, type, eventId) {
      const intent = [...intents.values()].find((entry) => entry.paymentRef === paymentRef);
      if (!intent) throw new Error("Unknown mock payment");
      return { eventId: eventId ?? `mockevt_${paymentRef}_${type}`, paymentRef, orderId: intent.orderId, type, amount: intent.amount, currency: intent.currency };
    },
  };
  return gateway;
}
