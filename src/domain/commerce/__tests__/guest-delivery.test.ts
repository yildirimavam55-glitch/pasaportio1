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
  const tokens: Array<DeliveryTokenRecord & { revokedAt?: string }> = [];
  let compareCount = 0;
  const renewals: RenewalRecord[] = [];
  const outbox: Array<{ to: string; code: string }> = [];
  const store: GuestDeliveryStore = {
    async findToken(h) { return tokens.find((t) => t.tokenHash === h && !t.revokedAt) ?? null; },
    async replaceTokens(r, now) { for (const t of tokens) if (t.orderId === r.orderId && !t.revokedAt) t.revokedAt = now.toISOString(); tokens.push(r); },
    async findGuestOrder(n) { const o = Object.values(ORDERS).find((x) => x.number === n && x.customerId === null); return o ? { id: o.id, guestEmail: o.email, locale: o.view.locale } : null; },
    async loadGuestOrder(id) { const o = ORDERS[id]; return o && o.customerId === null ? o.view : null; },
    async latestRenewal(id) { return [...renewals].reverse().find((r) => r.orderId === id) ?? null; },
    async saveRenewal(r) { for (const x of renewals) if (x.orderId === r.orderId && !x.usedAt) x.usedAt = "void"; renewals.push(r); },
    // Mirrors the single conditional UPDATE: check+write happen with no await in between.
    async reserveAttempt(id, h, expected, now) {
      await Promise.resolve();
      const r = renewals.find((x) => x.orderId === id && x.codeHash === h);
      if (!r || r.usedAt || r.attempts !== expected || r.attempts >= 5 || now.getTime() >= Date.parse(r.expiresAt)) return false;
      r.attempts += 1; compareCount += 1; return true;
    },
    async consumeRenewal(id, h, now) {
      await Promise.resolve();
      const r = renewals.find((x) => x.orderId === id && x.codeHash === h);
      if (!r || r.usedAt || now.getTime() >= Date.parse(r.expiresAt)) return false;
      r.usedAt = now.toISOString(); return true;
    },
  };
  const mailer = { async sendRenewalCode(m: { to: string; code: string }) { outbox.push(m); } };
  return { store, mailer, tokens, renewals, outbox, compares: () => compareCount };
}

describe("guest delivery page access", () => {
  it("valid token opens only its own order", async () => {
    const m = memory();
    const { token, record } = await issueDeliveryToken("g1", NOW); await m.store.replaceTokens(record, NOW);
    const r = await openGuestDelivery(m.store, token, NOW);
    expect(r.ok && r.order.orderNumber).toBe("PSP-1");
  });

  it("invalid, malformed, expired and registered-customer tokens expose nothing", async () => {
    const m = memory();
    const g = await issueDeliveryToken("g1", NOW); await m.store.replaceTokens(g.record, NOW);
    const u = await issueDeliveryToken("u1", NOW); await m.store.replaceTokens(u.record, NOW);
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

describe("S1 concurrency: renewal codes", () => {
  const input = (code: string) => ({ orderNumber: "PSP-1", email: "guest@synthetic.test", code });
  it("10 simultaneous correct confirmations yield exactly one new link", async () => {
    const m = memory();
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    const code = m.outbox[0]!.code;
    const results = await Promise.all(Array.from({ length: 10 }, () => confirmRenewal(m.store, input(code), NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it("a burst of 100 parallel guesses gets at most 5 comparisons, then the right code is refused", async () => {
    const m = memory();
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    const code = m.outbox[0]!.code;
    const guesses = Array.from({ length: 100 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, "0"));
    await Promise.all(guesses.map((g) => confirmRenewal(m.store, input(g), NOW)));
    expect(m.compares()).toBeLessThanOrEqual(5);
    // sequential exhaustion
    for (let i = 0; i < 5; i++) await confirmRenewal(m.store, input(guesses[0]!), NOW);
    expect(m.compares()).toBe(5);
    expect(await confirmRenewal(m.store, input(code), NOW)).toEqual({ ok: false });
  });
  it("requesting a new code voids the previous one", async () => {
    const m = memory();
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    const [first, second] = [m.outbox[0]!.code, m.outbox[1]!.code];
    if (first !== second) expect(await confirmRenewal(m.store, input(first), NOW)).toEqual({ ok: false });
    expect((await confirmRenewal(m.store, input(second), NOW)).ok).toBe(true);
  });
});

describe("S2: renewal revokes earlier links", () => {
  it("old link stops working once a new link is issued", async () => {
    const m = memory();
    const old = await issueDeliveryToken("g1", NOW); await m.store.replaceTokens(old.record, NOW);
    expect((await openGuestDelivery(m.store, old.token, NOW)).ok).toBe(true);
    await requestRenewal(m.store, m.mailer, { orderNumber: "PSP-1", email: "guest@synthetic.test" }, NOW);
    const fresh = await confirmRenewal(m.store, { orderNumber: "PSP-1", email: "guest@synthetic.test", code: m.outbox[0]!.code }, NOW);
    if (!fresh.ok) throw new Error("expected renewal");
    expect(await openGuestDelivery(m.store, old.token, NOW)).toEqual({ ok: false });
    expect((await openGuestDelivery(m.store, fresh.token, NOW)).ok).toBe(true);
  });
});

describe("S3: token never in server-visible URLs", () => {
  const route = readFileSync("src/routes/teslimat.tsx", "utf8");
  const fns = readFileSync("src/lib/commerce-guest-delivery.functions.ts", "utf8");
  it("token travels in the URL fragment and is stripped from the address bar", () => {
    expect(route).toMatch(/window\.location\.hash/);
    expect(route).toMatch(/history\.replaceState\(null, "", window\.location\.pathname\)/);
    expect(route).toContain("`/teslimat#${r.token}`");
    expect(route).not.toMatch(/\$token|useParams|console\./);
    expect(route).toMatch(/no-referrer/);
  });
  it("server functions use POST bodies and never log", () => {
    expect(fns).not.toMatch(/method: "GET"|console\./);
  });
  it("revocation and atomic updates are enforced in the query, not only in app code", () => {
    expect(fns).toMatch(/\.eq\("attempts", expected\)\.lt\("attempts", 5\)\.is\("used_at", null\)/);
    expect(fns).toMatch(/findToken[\s\S]*?\.is\("used_at", null\)/);
  });
});
