import { describe, expect, it } from "vitest";

import { placeOrder, type CheckoutDeps } from "../checkout";
import { issueDeliveryToken, verifyDeliveryToken } from "../delivery-token";
import { createMockSupplier } from "../mock-supplier";
import type { ResolvedProduct } from "../provisioning";
import { createMockPaymentGateway } from "@/domain/payments/mock-gateway";
import { EMAIL_LOCALES, TEMPLATE_ACTION } from "@/domain/email/catalog";
import { createMemoryStore } from "./memory-store";
import * as catalog from "@/domain/email/catalog";

const P: ResolvedProduct = {
  id: "test-tr", serviceType: "ESIM", lifecycle: "PUBLISHED", customerVisible: true, providerAvailable: true,
  salePrice: 9.5, currency: "EUR", providerCost: 4, pricingReviewRequired: false, primaryProviderId: "mock-provider",
  providerExternalId: "DEMO_TR", isTest: true,
};
function deps() {
  const mem = createMemoryStore([P]);
  const d: CheckoutDeps = { store: mem.store, gateway: createMockPaymentGateway({ testEnvironment: true }), supplier: createMockSupplier({ testEnvironment: true }), gate: { serviceActive: true, purchasesActive: true }, provisioning: { liveSupplierCallsEnabled: true } };
  return d;
}
const base = { isTest: true, testFlowAllowed: true, lines: [{ productId: P.id, quantity: 1 }] };

describe("guest checkout (in memory only)", () => {
  it("creates a guest order without a customer id, keeping locale and currency", async () => {
    const r = await placeOrder(deps(), { ...base, guestEmail: " Guest@Example.com ", locale: "de", idempotencyKey: "k1" });
    if (!r.ok) throw new Error(r.reason);
    expect(r.order.customerId).toBeNull();
    expect(r.order.guestEmail).toBe("guest@example.com");
    expect(r.order.locale).toBe("de");
    expect(r.order.currency).toBe("EUR");
  });

  it("rejects both or neither owner, and invalid emails", async () => {
    const d = deps();
    expect(await placeOrder(d, { ...base, idempotencyKey: "k" })).toMatchObject({ ok: false, reason: "INVALID_CUSTOMER" });
    expect(await placeOrder(d, { ...base, customerId: "u1", guestEmail: "a@b.co", idempotencyKey: "k" })).toMatchObject({ ok: false, reason: "INVALID_CUSTOMER" });
    expect(await placeOrder(d, { ...base, guestEmail: "not-an-email", idempotencyKey: "k" })).toMatchObject({ ok: false, reason: "INVALID_CUSTOMER" });
  });

  it("idempotency is scoped per guest email and never crosses to another buyer", async () => {
    const d = deps();
    const a = await placeOrder(d, { ...base, guestEmail: "a@x.io", idempotencyKey: "same" });
    const a2 = await placeOrder(d, { ...base, guestEmail: "a@x.io", idempotencyKey: "same" });
    const b = await placeOrder(d, { ...base, guestEmail: "b@x.io", idempotencyKey: "same" });
    const u = await placeOrder(d, { ...base, customerId: "user-1", idempotencyKey: "same" });
    if (!a.ok || !a2.ok || !b.ok || !u.ok) throw new Error("unexpected");
    expect(a2.duplicate).toBe(true);
    expect(a2.order.id).toBe(a.order.id);
    expect(b.order.id).not.toBe(a.order.id);
    expect(u.order.id).not.toBe(a.order.id);
  });
});

describe("guest delivery token", () => {
  it("stores only the hash and verifies within 72 hours", async () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const { token, record } = await issueDeliveryToken("o1", now);
    expect(JSON.stringify(record)).not.toContain(token);
    expect(record.expiresAt).toBe("2026-10-15T12:00:00.000Z");
    expect(await verifyDeliveryToken(token, record, now)).toEqual({ ok: true, orderId: "o1" });
  });
  it("rejects expired and wrong tokens", async () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const { token, record } = await issueDeliveryToken("o1", now);
    expect(await verifyDeliveryToken(token, record, new Date("2026-10-15T12:00:00Z"))).toEqual({ ok: false, reason: "EXPIRED" });
    expect(await verifyDeliveryToken("0".repeat(64), record, now)).toEqual({ ok: false, reason: "INVALID" });
    expect(await verifyDeliveryToken(token, null, now)).toEqual({ ok: false, reason: "INVALID" });
  });
});

describe("eSIM delivery email", () => {
  it("links via the server-built esimUrl and never carries activation secrets", () => {
    expect(TEMPLATE_ACTION["esim-delivery"]).toBe("esimUrl");
    const all = JSON.stringify(catalog);
    expect(EMAIL_LOCALES.length).toBe(14);
    expect(catalog.TEMPLATE_VARIABLES["esim-delivery"].join(",")).not.toMatch(/qr|lpa|smdp|activation|iccid/i);
    expect(all).not.toMatch(/LPA:1\$/);
  });
});
