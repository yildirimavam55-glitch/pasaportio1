/**
 * Loads the bundled OFL fonts as bytes on the server. Inline data URLs work identically on
 * Cloudflare Workers, Node and in tests — no filesystem, no network, no Lovable service.
 */
import type { FontBytes } from "./render";

function decode(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cache: Promise<FontBytes> | null = null;

export function loadDocumentFonts(): Promise<FontBytes> {
  cache ??= Promise.all([
    import("@/assets/fonts/NotoSans-Regular.ttf?inline"),
    import("@/assets/fonts/NotoSans-Bold.ttf?inline"),
    import("@/assets/fonts/NotoSansArabic-Regular.ttf?inline"),
    import("@/assets/fonts/NotoSansArabic-Bold.ttf?inline"),
  ]).then(([a, b, c, d]) => ({
    latin: decode(a.default),
    latinBold: decode(b.default),
    arabic: decode(c.default),
    arabicBold: decode(d.default),
  }));
  return cache;
}
