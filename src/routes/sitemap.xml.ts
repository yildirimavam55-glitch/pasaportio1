import { createFileRoute } from "@tanstack/react-router";
import { seoPath, SEO_BASE_URL } from "@/domain/seo/paths";

/**
 * Dynamic XML sitemap — served at /sitemap/xml (the route generator reads the
 * filename dot as a segment). Includes important public pages plus every
 * PUBLISHED + indexable country, city and article page in each published
 * language. DRAFT / REVIEW / ARCHIVED / noindex content is never listed.
 */
const BASE = SEO_BASE_URL;

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STATIC_PAGES = ["/", "/esim", "/esim/ulkeler", "/lounge", "/guides", "/rehberler"];

type Entry = { loc: string; lastmod?: string; alternates?: Array<{ lang: string; href: string }> };

async function buildSitemap(): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_ANON_KEY"];
  const urls: Entry[] = STATIC_PAGES.map((path) => ({ loc: `${BASE}${path}` }));
  if (url && key) {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await client
      .from("guides")
      .select("content_type, updated_at, indexable, guide_translations!inner(slug, locale, translation_status)")
      .eq("status", "PUBLISHED")
      .eq("indexable", true)
      .eq("guide_translations.translation_status", "PUBLISHED")
      .limit(5000);
    for (const row of (data ?? []) as any[]) {
      const translations = (row.guide_translations ?? []).filter((t: any) => t.slug);
      const alternates = translations.map((t: any) => ({
        lang: t.locale,
        href: `${BASE}${seoPath(t.locale, row.content_type, t.slug)}`,
      }));
      for (const t of translations) {
        urls.push({
          loc: `${BASE}${seoPath(t.locale, row.content_type, t.slug)}`,
          lastmod: row.updated_at,
          alternates,
        });
      }
    }
  }
  const body = urls
    .map((entry) => {
      const alt = (entry.alternates ?? [])
        .map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${escape(a.href)}"/>`)
        .join("");
      return `  <url><loc>${escape(entry.loc)}</loc>${
        entry.lastmod ? `<lastmod>${entry.lastmod.slice(0, 10)}</lastmod>` : ""
      }${alt}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
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
