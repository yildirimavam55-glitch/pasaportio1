/**
 * Shared server-side HTTP helper for provider adapters.
 * Retry/backoff on 429, 408 and 5xx. Credentials are read from server
 * environment secrets only and never returned or logged.
 */
import { isRetryableStatus, retryDelayMs } from "@/domain/providers/sync-engine";
import type { AuthType } from "@/domain/providers/field-mapping";

export type HttpResult = { ok: boolean; status: number; body: unknown; error?: string };

export function authHeaders(authType: AuthType, secret: string | null): Record<string, string> {
  if (!secret) return {};
  switch (authType) {
    case "BEARER":
      return { Authorization: `Bearer ${secret}` };
    case "BASIC":
      return { Authorization: `Basic ${btoa(secret)}` };
    case "QUERY_PARAM":
      return {};
    case "API_KEY_HEADER":
    default:
      return { "X-API-Key": secret };
  }
}

export async function requestJson(
  url: string,
  options: { headers?: Record<string, string>; retries?: number; timeoutMs?: number } = {},
): Promise<HttpResult> {
  const { headers = {}, retries = 3, timeoutMs = 20_000 } = options;
  let last: HttpResult = { ok: false, status: 0, body: null, error: "Bağlantı kurulamadı." };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: controller.signal });
      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      if (response.ok) return { ok: true, status: response.status, body };
      last = { ok: false, status: response.status, body, error: `HTTP ${response.status}` };
      if (!isRetryableStatus(response.status)) return last;
    } catch (error) {
      last = { ok: false, status: 0, body: null, error: (error as Error).name === "AbortError" ? "Zaman aşımı" : "Ağ hatası" };
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
  }
  return last;
}

export type PostResult = { ok: boolean; status: number; body: unknown; timeout: boolean; error?: string };

/**
 * Money-path POST: executed EXACTLY once, never auto-retried. A timeout leaves
 * the supplier result unknown, and only the provisioning engine (after
 * reconciliation) may decide what happens next.
 */
export async function postJsonOnce(
  url: string,
  options: { headers?: Record<string, string>; body: unknown; timeoutMs?: number },
): Promise<PostResult> {
  const { headers = {}, body, timeoutMs = 45_000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (response.ok) return { ok: true, status: response.status, body: parsed, timeout: false };
    return { ok: false, status: response.status, body: parsed, timeout: false, error: `HTTP ${response.status}` };
  } catch (error) {
    const timeout = (error as Error).name === "AbortError";
    return { ok: false, status: 0, body: null, timeout: true, error: timeout ? "Zaman aşımı" : "Ağ hatası" };
  } finally {
    clearTimeout(timer);
  }
}

/** Never log or return the value — only whether it exists. */
export function readSecret(name: string | null | undefined): string | null {
  if (!name) return null;
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}
