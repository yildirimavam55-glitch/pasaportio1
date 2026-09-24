import { useEffect, useMemo } from "react";

import { PublicShell } from "@/components/travel/PublicShell";
import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";
import { SEO_BASE_URL, guideHubPath, localeHomePath } from "@/domain/seo/paths";
import { getSeoHub, type SeoHubData, type SeoHubItem } from "@/lib/seo-content.functions";

export const seoHubQuery = (locale: Locale) => ({
  queryKey: ["seo-hub", locale] as const,
  queryFn: () => getSeoHub({ data: { locale } }),
  staleTime: 60_000,
});

const HUB_TEXT: Record<
  Locale,
  {
    home: string;
    hub: string;
    destinations: string;
    cities: string;
    esim: string;
    internet: string;
    newest: string;
    popular: string;
    empty: string;
    backHome: string;
  }
> = {
  tr: {
    home: "Ana Sayfa",
    hub: "Rehber",
    destinations: "Destinasyonlar",
    cities: "Şehir Rehberleri",
    esim: "eSIM Rehberleri",
    internet: "Seyahat İnternet Rehberleri",
    newest: "Yeni İçerikler",
    popular: "Popüler İçerikler",
    empty: "Bu dilde henüz yayınlanmış rehber yok.",
    backHome: "Ana sayfaya dön",
  },
  de: {
    home: "Startseite",
    hub: "Ratgeber",
    destinations: "Reiseziele",
    cities: "Städte-Ratgeber",
    esim: "eSIM-Ratgeber",
    internet: "Internet auf Reisen",
    newest: "Neue Beiträge",
    popular: "Beliebte Beiträge",
    empty: "In dieser Sprache sind noch keine Ratgeber veröffentlicht.",
    backHome: "Zur Startseite",
  },
  en: {
    home: "Home",
    hub: "Guides",
    destinations: "Destinations",
    cities: "City guides",
    esim: "eSIM guides",
    internet: "Travel internet guides",
    newest: "Latest",
    popular: "Popular",
    empty: "No guides have been published in this language yet.",
    backHome: "Back to home",
  },
};

/** Full head for a localized guide hub, with hreflang only for languages that have published content. */
export function seoHubHead(locale: Locale, data: SeoHubData | undefined) {
  const text = HUB_TEXT[locale];
  const copy = data?.copy;
  const title = copy?.title ?? text.hub;
  const description = copy?.description ?? text.hub;
  const selfUrl = `${SEO_BASE_URL}${guideHubPath(locale)}`;
  const hasItems = Boolean(data?.items.length);
  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: hasItems ? "index, follow" : "noindex, follow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: selfUrl },
    { property: "og:locale", content: locale === "tr" ? "tr_TR" : locale === "de" ? "de_DE" : "en_GB" },
    { name: "twitter:card", content: "summary" },
  ];
  const links: Array<Record<string, string>> = [{ rel: "canonical", href: selfUrl }];
  const locales = data?.publishedLocales ?? [];
  if (hasItems && locales.length) {
    for (const loc of locales) {
      links.push({ rel: "alternate", hrefLang: loc, href: `${SEO_BASE_URL}${guideHubPath(loc)}` });
    }
    const xDefault = locales.includes("en") ? "en" : locales[0]!;
    links.push({ rel: "alternate", hrefLang: "x-default", href: `${SEO_BASE_URL}${guideHubPath(xDefault)}` });
  }
  const scripts = [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: text.home, item: `${SEO_BASE_URL}${localeHomePath(locale)}` },
          { "@type": "ListItem", position: 2, name: text.hub, item: selfUrl },
        ],
      }),
    },
  ];
  return { meta, links, scripts };
}

function HubCard({ item }: { item: SeoHubItem }) {
  return (
    <SeoPathLink
      path={item.path}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-primary/40"
    >
      {item.heroImageUrl && (
        <img src={item.heroImageUrl} alt={item.heroAlt ?? item.title} loading="lazy" className="h-36 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-bold leading-snug">{item.title}</h3>
        {item.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>}
      </div>
    </SeoPathLink>
  );
}

function HubSection({ title, items }: { title: string; items: SeoHubItem[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <HubCard key={`${title}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

export function SeoGuideHub({ locale, data }: { locale: Locale; data: SeoHubData }) {
  const { locale: current, setLocale } = useI18n();
  useEffect(() => {
    if (current !== locale) setLocale(locale);
  }, [current, locale, setLocale]);
  const text = HUB_TEXT[locale];

  const groups = useMemo(() => {
    const items = data.items;
    const byDate = [...items].sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
    return {
      destinations: items.filter((i) => i.contentType === "DESTINATION"),
      cities: items.filter((i) => i.contentType === "CITY"),
      esim: items.filter((i) => i.categorySlug === "esim" || i.categorySlug === "internet-esim"),
      internet: items.filter((i) => i.contentType === "HOW_TO" || i.categorySlug === "internet"),
      newest: byDate.slice(0, 6),
      popular: items.filter((i) => i.featured),
    };
  }, [data.items]);

  return (
    <PublicShell hideStickySearch>
      <main lang={locale} className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
          <SeoPathLink path={localeHomePath(locale)} className="hover:text-foreground">
            {text.home}
          </SeoPathLink>
          <span className="px-1.5">/</span>
          <span className="font-semibold text-foreground">{text.hub}</span>
        </nav>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{data.copy.h1}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.copy.description}</p>

        {data.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{text.empty}</p>
            <SeoPathLink path={localeHomePath(locale)} className="mt-4 inline-block text-sm font-bold text-primary">
              {text.backHome}
            </SeoPathLink>
          </div>
        ) : (
          <>
            <HubSection title={text.destinations} items={groups.destinations} />
            <HubSection title={text.cities} items={groups.cities} />
            <HubSection title={text.esim} items={groups.esim} />
            <HubSection title={text.internet} items={groups.internet} />
            <HubSection title={text.newest} items={groups.newest} />
            <HubSection title={text.popular} items={groups.popular} />
          </>
        )}
      </main>
    </PublicShell>
  );
}
