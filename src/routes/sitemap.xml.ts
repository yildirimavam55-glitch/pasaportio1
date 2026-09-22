import { createFileRoute } from "@tanstack/react-router";

/**
 * XML sitemap for Travely Guides. Serves at /sitemap.xml (filename keeps the
 * literal dot) — only published, customer-visible URLs, no drafts.
 */
const BASE = "https://wanderlust-core.lovable.app";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function buildSitemap(): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: `${BASE}/guides` },
  ];
  if (url && key) {
    const client = createClient(url, key);
    const { data } = await client
      .from("guides")
      .select("slug, updated_at, guide_translations!inner(slug, locale)")
      .eq("status", "PUBLISHED")
      .eq("guide_translations.translation_status", "PUBLISHED")
      .limit(5000);
    for (const row of data ?? []) {
      urls.push({ loc: `${BASE}/guides/${row.slug}`, lastmod: row.updated_at });
      for (const translation of row["guide_translations"] ?? []) {
        if (translation.slug && translation.slug !== row.slug) {
          urls.push({ loc: `${BASE}/guides/${translation.slug}`, lastmod: row.updated_at });
        }
      }
    }
  }
  const body = urls
    .map(
      (entry) =>
        `  <url><loc>${escape(entry.loc)}</loc>${
          entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : ""
        }</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async () => {
        const xml = await buildSitemap();
        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
