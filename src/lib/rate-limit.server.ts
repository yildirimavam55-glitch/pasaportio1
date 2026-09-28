/**
 * Server-only rate limiting (security baseline). Counters live in a
 * service-role-only table and are incremented atomically by
 * `consume_rate_limit`. FAIL CLOSED: if the limiter cannot be reached the
 * request is rejected rather than allowed through.
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { RATE_LIMITS, RateLimitError, rateLimitBucket, type RateLimitName } from "@/domain/security/rate-limits";

export async function enforceRateLimit(name: RateLimitName, subject: string): Promise<void> {
  const policy = RATE_LIMITS[name];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc("consume_rate_limit", {
    _bucket: rateLimitBucket(name, subject),
    _limit: policy.limit,
    _window_seconds: policy.windowSeconds,
  });
  if (error || data !== true) throw new RateLimitError();
}

/** Hashed client IP (never stored raw). */
export async function clientIpSubject(): Promise<string> {
  const raw =
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-real-ip") ??
    (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ??
    "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`travely-rl:${raw || "unknown"}`));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
