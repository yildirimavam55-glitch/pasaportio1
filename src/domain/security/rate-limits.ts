/**
 * SECURITY BASELINE — owner-approved rate limits (docs/security/SECURITY_BASELINE.md).
 * Changing, removing or raising these values is a security-sensitive change
 * that requires explicit owner approval and a security change-log entry.
 * Pure data: enforced server-side by `enforceRateLimit` in rate-limit.server.ts.
 */
export type RateLimitPolicy = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  couponValidateIp: { limit: 10, windowSeconds: 60 },
  couponValidateUser: { limit: 10, windowSeconds: 60 },
  refundCreateUser: { limit: 3, windowSeconds: 86_400 },
  orderCreateUser: { limit: 10, windowSeconds: 3_600 },
  checkoutValidateUser: { limit: 20, windowSeconds: 3_600 },
  guestDeliveryIp: { limit: 30, windowSeconds: 3_600 },
  guestRenewIp: { limit: 5, windowSeconds: 3_600 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export class RateLimitError extends Error {
  readonly code = "RATE_LIMITED";
  constructor() {
    super("Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.");
  }
}

/** Bucket key; subject is a user id or hashed IP, never raw secrets. */
export function rateLimitBucket(name: RateLimitName, subject: string): string {
  return `${name}:${subject}`.slice(0, 200);
}
