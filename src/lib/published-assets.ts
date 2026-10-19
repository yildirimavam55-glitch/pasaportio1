/**
 * Published catalogue photographs still live on the Lovable CDN as /__l5e/...
 * Vite middleware covers local dev. This helper is the production path
 * (Vercel / Nitro / SSR) so those URLs keep working without a local disk copy.
 */
export const PUBLISHED_ASSET_UPSTREAM = "https://pasaportio1.lovable.app";
export const PUBLISHED_ASSET_PATH = /^\/__l5e\/assets-v1\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function isPublishedAssetPath(pathname: string): boolean {
  return PUBLISHED_ASSET_PATH.test(pathname) && !pathname.includes("..");
}

export async function proxyPublishedAsset(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (!isPublishedAssetPath(url.pathname)) {
    return new Response(null, { status: 404 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  try {
    const upstream = await fetch(`${PUBLISHED_ASSET_UPSTREAM}${url.pathname}`, {
      method: request.method,
      redirect: "error",
      headers: { Accept: request.headers.get("Accept") ?? "image/*,*/*" },
    });
    if (!upstream.ok) return new Response(null, { status: upstream.status });
    const headers = new Headers();
    const type = upstream.headers.get("content-type");
    if (type) headers.set("Content-Type", type);
    headers.set("Cache-Control", "public, max-age=86400, immutable");
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
