/**
 * Guest eSIM delivery: token-gated read of ONE order's eSIMs, plus expired-link
 * renewal through an emailed 6-digit code. Storage and mail are ports, so the
 * whole flow runs in memory under test. Every failure returns the same neutral
 * result — no customer data or activation secret ever leaves on a failed check.
 */
import { hashDeliveryToken, issueDeliveryToken, verifyDeliveryToken, type DeliveryTokenRecord } from "./delivery-token";
import { normalizeGuestEmail } from "./checkout";

export const RENEWAL_CODE_TTL_MINUTES = 15;
export const RENEWAL_MAX_ATTEMPTS = 5;

export type GuestEsimView = {
  id: string;
  packageLabel: string | null;
  destinationLabel: string | null;
  status: string;
  totalDataMb: number | null;
  remainingDataMb: number | null;
  expiresAt: string | null;
  qrPayload: string | null;
  installInfo: Record<string, string | number | boolean | null> | null;
  activationPolicy: string | null;
};
export type GuestOrderView = { orderNumber: string; locale: string; paymentStatus: string; fulfillmentStatus: string; esims: GuestEsimView[] };

export type RenewalRecord = { orderId: string; codeHash: string; expiresAt: string; attempts: number; usedAt: string | null };

export interface GuestDeliveryStore {
  /** Active (non-revoked) delivery links only. */
  findToken(tokenHash: string): Promise<DeliveryTokenRecord | null>;
  /** Must revoke every earlier active link of the order in the same call (S2). */
  replaceTokens(record: DeliveryTokenRecord, now: Date): Promise<void>;
  /** Guest orders only (customer_id IS NULL). Registered customers use My eSIMs. */
  findGuestOrder(orderNumber: string): Promise<{ id: string; guestEmail: string; locale: string } | null>;
  loadGuestOrder(orderId: string): Promise<GuestOrderView | null>;
  latestRenewal(orderId: string): Promise<RenewalRecord | null>;
  /** Saves a new code and voids all earlier unused codes of the order. */
  saveRenewal(record: RenewalRecord): Promise<void>;
  /**
   * Atomic compare-and-set in ONE database statement (S1): increments attempts from
   * `expectedAttempts` only while unused, unexpired and under the limit. False = lost the race.
   */
  reserveAttempt(orderId: string, codeHash: string, expectedAttempts: number, now: Date): Promise<boolean>;
  /** Atomic single-use consume: sets used_at only if still NULL. False = already consumed. */
  consumeRenewal(orderId: string, codeHash: string, now: Date): Promise<boolean>;
}
/** Never a real mail provider until email delivery is approved. */
export interface GuestMailer { sendRenewalCode(input: { to: string; code: string; locale: string; orderNumber: string }): Promise<void> }

export type GuestAccess = { ok: true; order: GuestOrderView } | { ok: false };
const DENIED = { ok: false } as const;

export async function openGuestDelivery(store: GuestDeliveryStore, token: unknown, now = new Date()): Promise<GuestAccess> {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return DENIED;
  const record = await store.findToken(await hashDeliveryToken(token));
  const check = await verifyDeliveryToken(token, record, now);
  if (!check.ok) return DENIED;
  const order = await store.loadGuestOrder(check.orderId);
  return order ? { ok: true, order } : DENIED;
}

function sixDigits(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return String(n).padStart(6, "0");
}
const codeHash = (orderId: string, code: string) => hashDeliveryToken(`renew:${orderId}:${code}`);

/** Always resolves to the same shape so callers cannot probe which emails/orders exist. */
export async function requestRenewal(store: GuestDeliveryStore, mailer: GuestMailer, input: { orderNumber: unknown; email: unknown }, now = new Date()): Promise<{ accepted: true }> {
  const email = normalizeGuestEmail(input.email);
  const orderNumber = typeof input.orderNumber === "string" ? input.orderNumber.trim().toUpperCase().slice(0, 40) : "";
  if (!email || !orderNumber) return { accepted: true };
  const order = await store.findGuestOrder(orderNumber);
  if (!order || order.guestEmail !== email) return { accepted: true };
  const code = sixDigits();
  await store.saveRenewal({ orderId: order.id, codeHash: await codeHash(order.id, code), expiresAt: new Date(now.getTime() + RENEWAL_CODE_TTL_MINUTES * 60_000).toISOString(), attempts: 0, usedAt: null });
  await mailer.sendRenewalCode({ to: email, code, locale: order.locale, orderNumber });
  return { accepted: true };
}

export async function confirmRenewal(store: GuestDeliveryStore, input: { orderNumber: unknown; email: unknown; code: unknown }, now = new Date()): Promise<{ ok: true; token: string } | { ok: false }> {
  const email = normalizeGuestEmail(input.email);
  const orderNumber = typeof input.orderNumber === "string" ? input.orderNumber.trim().toUpperCase().slice(0, 40) : "";
  const code = typeof input.code === "string" ? input.code.trim() : "";
  if (!email || !orderNumber || !/^\d{6}$/.test(code)) return DENIED;
  const order = await store.findGuestOrder(orderNumber);
  if (!order || order.guestEmail !== email) return DENIED;
  const renewal = await store.latestRenewal(order.id);
  if (!renewal || renewal.usedAt || renewal.attempts >= RENEWAL_MAX_ATTEMPTS || now.getTime() >= Date.parse(renewal.expiresAt)) return DENIED;
  // Reserve one attempt atomically BEFORE comparing, so parallel guesses cannot exceed the limit.
  if (!(await store.reserveAttempt(order.id, renewal.codeHash, renewal.attempts, now))) return DENIED;
  if ((await codeHash(order.id, code)) !== renewal.codeHash) return DENIED;
  if (!(await store.consumeRenewal(order.id, renewal.codeHash, now))) return DENIED;
  const { token, record } = await issueDeliveryToken(order.id, now);
  await store.replaceTokens(record, now);
  return { ok: true, token };
}
