/**
 * Provider-independent payment port. No real provider is connected: a real
 * gateway (e.g. Stripe, after the hosting migration) implements this same
 * interface, verifies its own webhook signature inside `parseEvent`, and the
 * checkout flow stays unchanged.
 */
export type PaymentEventType = "SUCCEEDED" | "FAILED";

export type PaymentEvent = {
  /** Provider event id — the anchor of duplicate-event protection. */
  eventId: string;
  paymentRef: string;
  orderId: string;
  type: PaymentEventType;
  amount: number;
  currency: string;
};

export type PaymentIntent = { paymentRef: string; orderId: string; amount: number; currency: string };

export interface PaymentGateway {
  readonly kind: "MOCK" | "LIVE";
  createPayment(input: { orderId: string; amount: number; currency: string; idempotencyKey: string }): Promise<PaymentIntent>;
  /** Returns null for events that fail verification; never trust unverified input. */
  parseEvent(raw: unknown): PaymentEvent | null;
}
