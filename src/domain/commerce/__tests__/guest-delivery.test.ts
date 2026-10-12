import { describe, expect, it } from "vitest";

import { issueDeliveryToken, type DeliveryTokenRecord } from "../delivery-token";
import { confirmRenewal, openGuestDelivery, requestRenewal, RENEWAL_MAX_ATTEMPTS, type GuestDeliveryStore, type GuestOrderView, type RenewalRecord } from "../guest-delivery";

const NOW = new Date("2026-10-12T12:00:00Z");
const SECRET_QR = "LPA:1$smdp.synthetic.test$SECRET-CODE";
const ORDERS: Record<string, { id: string; number: string; email: string; customerId: string | null; view: GuestOrderView }> = {
  g1: { id: "g1", number: "PSP-1", email: "guest@synthetic.test", customerId: null, view: { orderNumber: "PSP-1", locale: "de", paymentStatus: "PAID", fulfillmentStatus: "FULFILLED", esims: [{ id: "e1", packageLabel: "Türkiye 10 GB", destinationLabel: "Türkiye", status: "READY", totalDataMb: 10240, remainingDataMb: null, expiresAt: null, qrPayload: SECRET_QR, installInfo: { smdp_address: "smdp.synthetic.test", activation_code: "SECRET-CODE" }, activationPolicy: null }] } },
  u1: { id: "u1", number: "PSP-2", email: "member@synthetic.test", customerId: "user-1", view: { orderNumber: "PSP-2", locale: "en", paymentStatus: "PAID", fulfillmentStatus: "FULFILLED", esims: [] } },
};

function memory() {
  const tokens: DeliveryTokenRecord[] = [];
  const renewals: RenewalRecord[] = [];
  const outbox: Array<{ to: string; code: string }> = [];
  const store: GuestDeliveryStore = {
    async findToken(h) { return tokens.find((t) => t.tokenHash === h) ?? null; },
    async saveToken(r) { tokens.push(r); },
    async findGuestOrder(n) { const o = Object.values(ORDERS).find((x) => x.number === n && x.customerId === null); return o ? { id: o.id, guestEmail: o.email, locale: o.view.locale } : null; },
    async loadGuestOrder(id) { const o = ORDERS[id]; return o && o.customerId === null ? o.view : null; },
    async latestRenewal(id) { return [...renewals].reverse().find((r) => r.orderId === id) ?? null; },
    async saveRenewal(r) { renewals.push(r); },
    async updateRenewal(id, h, p) { const r = renewals.find((x) => x.orderId === id && x.codeHash === h); if (r) Object.assign(r, p); },
  };
  const mailer = { async sendRenewalCode(m: { to: string; code: string }) { outbox.push(m); } };
  return { store, mailer, tokens, renewals, outbox };
}

describe("guest delivery page access", () => {
  it("valid token opens only its own order", async () => {
    const m = memory();
    const { token, record } = await issueDeliveryToken("g1", NOW); await m.store.saveToken(record);
    const r = await openGuestDelivery(m.store, token, NOW);
    expect(r.ok && r.order.orderNumber).toBe("PSP-1");
  });

  it("invalid, malformed, expired and registered-customer tokens expose nothing", async () => {
    const m = memory();
    const g = await issueDeliveryToken("g1", NOW); await m.store.saveToken(g.record);
    const u = await issueDeliveryToken("u1", NOW); await m.store.saveToken(u.record);
    const results = [
      await openGuestDelivery(m.store, "f".repeat(64), NOW),
      await openGuestDelivery(m.store, "not-a-token", NOW),
      await openGuestDelivery(m.store, undefined, NOW),
      await openGuestDelivery(m.store, g.token, new Date("2026-10-15T12:00:01Z")),
      await openGuestDelivery(m.store, u.token, NOW),
    ];
    for (const r of results) {
      expect(r).toEqual({ ok: false });
      expect(JSON.stringify(r)).not.toMatch(/SECRET|LPA|smdp|guest@|PSP-/);
    }
  });
});

describe("expired-link renewal", () => {
  it("matching email + code issues a fresh working token; code is single-use", async () => {
    const m = memory();
    expect(await requestRenewal(m.store, m.mailer, { orderNumber: "psp-1", email: "Guest@Synthetic.test" }, NOW)).toEqual({ accepted: true });
    expect(m.outbox).toHaveLength(1);
    expect(m.renewals[0]!.codeHash).not.toContain(m.outbox[0]!.code);
    const ok = await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code: m.outbox[0]!.code }, NOW);
    if (!ok.ok) throw new Error("expected renewal");
    expect((await openGuestDelivery(m.store, ok.token, NOW)).ok).toBe(true);
    expect(await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code: m.outbox[0]!.code }, NOW)).toEqual({ ok: false });
  });

  it("wrong email, unknown order and registered orders send nothing and answer identically", async () => {
    const m = memory();
    const answers = [
      await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "attacker@synthetic.test" }, NOW),
      await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-404", email: "guest@synthetic.test" }, NOW),
      await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-2", email: "member@synthetic.test" }, NOW),
      await requestRenewal(m.store, m.mailer, { orderNumber: "", email: "bad" }, NOW),
    ];
    for (const a of answers) expect(a).toEqual({ accepted: true });
    expect(m.outbox).toHaveLength(0);
  });

  it("expired code and too many wrong attempts are refused", async () => {
    const m = memory();
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    const code = m.outbox[0]!.code;
    expect(await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code }, new Date("2026-10-12T12:15:00Z"))).toEqual({ ok: false });
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < RENEWAL_MAX_ATTEMPTS; i++) await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code: wrong }, NOW);
    expect(await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code }, NOW)).toEqual({ ok: false });
    expect(await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "attacker@synthetic.test", code }, NOW)).toEqual({ ok: false });
  });
});

import { readFileSync } from "node:fs";
describe("guest delivery server guard", () => {
  const src = readFileSync("src/lib/commerce-guest-delivery.functions.ts", "utf8");
  it("stays disabled unless explicitly enabled and only reads eSIMs after token verification", () => {
    expect(src).toMatch(/GUEST_DELIVERY_ENABLED"\] === "1"/);
    expect(src).toMatch(/if \(!enabled\(\) \|\| \(await limited\("guestDeliveryIp"\)\)\) return \{ ok: false \}/);
    expect(src).toMatch(/is\("customer_id", null\)/);
    expect(src).not.toMatch(/sendEmail|resend|smtp/i);
  });
});
