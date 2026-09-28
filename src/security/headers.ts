/**
 * Security response headers (Phase 2, owner-approved). Pure and deterministic
 * so tests and the read-only Admin status page can verify it.
 *
 * CSP is REPORT-ONLY: the SSR shell ships inline boot/hydration scripts that
 * would need per-request nonces before `script-src` can be enforced.
 */

/** Hosts that serve the in-editor preview and may frame it. */
const PREVIEW_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$|^id-preview--[\w-]+\.lovable\.app$|-dev\.lovable\.app$|\.lovableproject\.com$/;
export const EDITOR_FRAME_ANCESTORS = ["https://lovable.dev", "https://*.lovable.dev", "https://*.lovable.app", "https://*.lovableproject.com"];

const BACKEND = "https://*.supabase.co";
export const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // Inline SSR boot + hydration scripts: nonces required before enforcement.
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": ["'self'", "data:", "blob:", BACKEND],
  "connect-src": ["'self'", BACKEND, "wss://*.supabase.co", "https://*.lovable.app", "https://*.lovable.dev"],
  "frame-src": ["'self'", "https://*.lovable.app", "https://*.lovable.dev", "https://accounts.google.com"],
  "form-action": ["'self'", "https://*.lovable.app", "https://accounts.google.com", "https://appleid.apple.com"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
};

export const PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), browsing-topics=(), payment=(self), fullscreen=(self)";

export const NOINDEX_PATH = /^\/(admin|account|auth|api|legacy-v1|sepet|odeme)(\/|$)/;

export function isPreviewHost(host: string): boolean {
  return PREVIEW_HOST.test(host.toLowerCase());
}

export function securityHeaders(url: URL): Record<string, string> {
  const preview = isPreviewHost(url.host);
  const ancestors = preview ? ["'self'", ...EDITOR_FRAME_ANCESTORS] : ["'self'"];
  const csp = Object.entries(CSP_DIRECTIVES).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
  const headers: Record<string, string> = {
    // frame-ancestors is ignored in report-only mode, so it is enforced separately.
    "Content-Security-Policy": `frame-ancestors ${ancestors.join(" ")}`,
    "Content-Security-Policy-Report-Only": csp,
    "Permissions-Policy": PERMISSIONS_POLICY,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  if (!preview) headers["X-Frame-Options"] = "SAMEORIGIN";
  if (NOINDEX_PATH.test(url.pathname)) headers["X-Robots-Tag"] = "noindex, nofollow";
  return headers;
}

export function applySecurityHeaders(request: Request, response: Response): Response {
  let url: URL;
  try { url = new URL(request.url); } catch { return response; }
  const extra = securityHeaders(url);
  try {
    for (const [k, v] of Object.entries(extra)) if (!response.headers.has(k)) response.headers.set(k, v);
    return response;
  } catch {
    // Immutable headers (e.g. passthrough fetch) — copy into a new response.
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(extra)) if (!headers.has(k)) headers.set(k, v);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}
