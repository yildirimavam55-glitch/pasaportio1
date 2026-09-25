/**
 * V2 = primary storefront. Maps former /design-v2 preview URLs to the public URLs
 * and lists which public paths must render V2 (used by regression tests).
 */
const MAP: Array<[string, string]> = [
  ["/design-v2/esim-region/", "/esim/bolge/"],
  ["/design-v2/auth/login", "/auth"],
  ["/design-v2/auth/register", "/kayit"],
  ["/design-v2/esim", "/esim"],
  ["/design-v2/lounge", "/lounge"],
  ["/design-v2/vignette", "/vignette"],
  ["/design-v2/cart", "/sepet"],
  ["/design-v2/checkout", "/odeme"],
  ["/design-v2/support", "/destek"],
  ["/design-v2/account", "/account"],
];

export function designV2ToPublic(path: string): string {
  const clean = path.replace(/\/+$/, "") || "/design-v2";
  for (const [from, to] of MAP) if (clean === from.replace(/\/$/, "") || clean.startsWith(from.endsWith("/") ? from : `${from}/`)) return to + clean.slice(from.replace(/\/$/, "").length).replace(/^\/$/, "");
  return "/esim";
}

export const LEGACY_PREFIX = "/legacy-v1";
export const isLegacyPath = (path: string) => path === LEGACY_PREFIX || path.startsWith(`${LEGACY_PREFIX}/`);
