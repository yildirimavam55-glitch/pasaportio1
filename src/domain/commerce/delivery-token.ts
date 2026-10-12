/**
 * Guest delivery access tokens. The raw token only ever travels in the e-mail link;
 * storage keeps its SHA-256 hash plus an expiry. Pure Web Crypto — portable to any host.
 */
export const DELIVERY_TOKEN_TTL_HOURS = 72;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashDeliveryToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

/** Returns the raw token (for the link only) and the record to store. */
export async function issueDeliveryToken(orderId: string, now = new Date(), ttlHours = DELIVERY_TOKEN_TTL_HOURS) {
  const raw = toHex(crypto.getRandomValues(new Uint8Array(32)));
  return {
    token: raw,
    record: { orderId, tokenHash: await hashDeliveryToken(raw), expiresAt: new Date(now.getTime() + ttlHours * 3_600_000).toISOString() },
  };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type DeliveryTokenRecord = { orderId: string; tokenHash: string; expiresAt: string };
export type DeliveryTokenCheck = { ok: true; orderId: string } | { ok: false; reason: "INVALID" | "EXPIRED" };

export async function verifyDeliveryToken(token: unknown, record: DeliveryTokenRecord | null, now = new Date()): Promise<DeliveryTokenCheck> {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token) || !record) return { ok: false, reason: "INVALID" };
  if (!safeEqual(await hashDeliveryToken(token), record.tokenHash)) return { ok: false, reason: "INVALID" };
  if (now.getTime() >= Date.parse(record.expiresAt)) return { ok: false, reason: "EXPIRED" };
  return { ok: true, orderId: record.orderId };
}
