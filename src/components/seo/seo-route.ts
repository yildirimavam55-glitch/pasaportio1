import { safeJsonLd } from "@/security/json-ld";
import type { Locale } from "@/domain/enums";
import { SEO_BASE_URL, GUIDE_FOLDER, type SeoFamily } from "@/domain/seo/paths";
import { getSeoPage, type SeoPage } from "@/lib/seo-content.functions";
import { SEO_COPY } from "./seo-copy";

export const seoPageQuery = (locale: Locale, family: SeoFamily, slug: string) => ({
  queryKey: ["seo-page", locale, family, slug] as const,
  queryFn: () => getSeoPage({ data: { locale, family, slug } }),
  staleTime: 60_000,
});

function absoluteImage(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SEO_BASE_URL}${url}`;
  return null;
}

/** Full head for an SEO page: title, description, canonical, robots, OG, Twitter, hreflang, JSON-LD. */
export function seoHead(page: SeoPage | null | undefined) {
  if (!page) {
    return { meta: [{ title: "pasaport.io" }, { name: "robots", content: "noindex" }] };
  }
  const { guide, locale } = page;
  const copy = SEO_COPY[locale];
  const selfPath = page.alternates[locale] ?? "/";
  const selfUrl = `${SEO_BASE_URL}${selfPath}`;
  const canonical = page.canonicalOverride || selfUrl;
  const title = guide.seoTitle || `${page.h1} — ${page.settings.organizationName}`;
  const description = guide.seoDescription || guide.excerpt || page.h1;
  const image = absoluteImage(guide.heroImageUrl) ?? (page.settings.defaultOgImage || null);

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: page.indexable ? "index, follow" : "noindex, follow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: canonical },
    { property: "og:locale", content: locale === "tr" ? "tr_TR" : locale === "de" ? "de_DE" : "en_GB" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (page.settings.twitterHandle) meta.push({ name: "twitter:site", content: page.settings.twitterHandle });
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  const links: Array<Record<string, string>> = [{ rel: "canonical", href: canonical }];
  const alternates = Object.entries(page.alternates) as Array<[Locale, string]>;
  if (page.indexable && alternates.length) {
    for (const [loc, path] of alternates) {
      links.push({ rel: "alternate", hrefLang: loc, href: `${SEO_BASE_URL}${path}` });
    }
    const xDefault = page.alternates.en ?? page.alternates.tr ?? alternates[0]![1];
    links.push({ rel: "alternate", hrefLang: "x-default", href: `${SEO_BASE_URL}${xDefault}` });
  }

  const isDestination = guide.contentType === "DESTINATION";
  const sectionName = isDestination ? copy.esim : copy.guides;
  const sectionUrl = isDestination ? `${SEO_BASE_URL}/esim/ulkeler` : `${SEO_BASE_URL}/${locale}/${GUIDE_FOLDER[locale]}`;
  const articleType = guide.contentType === "ARTICLE" || guide.contentType === "HOW_TO" ? "BlogPosting" : "Article";

  const scripts = [
    {
      type: "application/ld+json",
      children: safeJsonLd({
        "@context": "https://schema.org",
        "@type": articleType,
        headline: page.h1,
        description,
        inLanguage: locale,
        mainEntityOfPage: canonical,
        datePublished: guide.publishedAt ?? guide.updatedAt,
        dateModified: guide.updatedAt,
        ...(image ? { image } : {}),
        ...(page.authorName ? { author: { "@type": "Person", name: page.authorName } } : {}),
        publisher: { "@type": "Organization", name: page.settings.organizationName },
      }),
    },
    {
      type: "application/ld+json",
      children: safeJsonLd({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: copy.home, item: `${SEO_BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: sectionName, item: sectionUrl },
          { "@type": "ListItem", position: 3, name: page.h1, item: canonical },
        ],
      }),
    },
  ];
  return { meta, links, scripts };
}
