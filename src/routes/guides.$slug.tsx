import { safeJsonLd } from "@/security/json-ld";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { getSeoPage } from "@/lib/seo-content.functions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock3 } from "lucide-react";

import { PublicShell } from "@/components/travel/PublicShell";
import { Button } from "@/components/ui/button";
import {
  GuideCard,
  GuideDestinationChips,
  GuideServiceOffers,
} from "@/components/guides/GuidePieces";
import { GUIDES_COPY, countryIsoFromSlug, countrySlug } from "@/components/guides/copy";
import { getGuideBySlug, getGuideDestinationHub } from "@/lib/guides.functions";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { COUNTRIES } from "@/domain/geo/countries";
import { CountryFlag } from "@/components/travel/CountryFlag";
import type { Locale } from "@/domain/enums";
import { resolveSlugAlias, seoPath, seoUrl } from "@/domain/seo/paths";

const GUIDES_BASE_URL = "https://wanderpath-engine.lovable.app/guides";

function absoluteGuideImage(url: string | null) {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/__l5e/")) return `https://wanderpath-engine.lovable.app${url}`;
  return null;
}

/** A slug resolves either to a published guide or to a country guide hub. */
const entryQuery = (slug: string, locale: Locale) => ({
  queryKey: ["guides", "entry", slug, locale] as const,
  queryFn: async () => {
    const guide = await getGuideBySlug({ data: { slug, locale } });
    if (guide) return { kind: "GUIDE" as const, guide };
    const iso = countryIsoFromSlug(slug);
    if (!iso) return { kind: "MISSING" as const };
    const hub = await getGuideDestinationHub({ data: { iso, locale } });
    if (!hub) return { kind: "MISSING" as const };
    return { kind: "COUNTRY" as const, hub };
  },
});

export const Route = createFileRoute("/guides/$slug")({
  loader: async ({ context, params }) => {
    // Legacy URL: every resolvable slug permanently redirects straight to its final localized URL.
    const alias = resolveSlugAlias("tr", "esim", params.slug);
    if (alias) throw redirect({ href: seoPath("tr", "DESTINATION", alias), statusCode: 301 });
    const entry = await context.queryClient.ensureQueryData(entryQuery(params.slug, "tr"));
    const loaded = entry;
    if (entry.kind === "MISSING") throw notFound();
    if (entry.kind === "GUIDE") {
      const slugs = entry.guide.localeSlugs ?? {};
      const loc = ((Object.entries(slugs).find(([, s]) => s === params.slug)?.[0]) ?? "tr") as Locale;
      const finalSlug = slugs[loc] ?? params.slug;
      throw redirect({ href: seoPath(loc, entry.guide.contentType, finalSlug), statusCode: 301 });
    }
    // Country hub: redirect only when a published final destination page exists for this slug.
    const destination = await getSeoPage({ data: { locale: "tr", family: "esim", slug: params.slug } });
    if (destination) throw redirect({ href: seoPath("tr", "DESTINATION", params.slug), statusCode: 301 });
    return loaded as Exclude<typeof loaded, { kind: "MISSING" }>;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Rehber bulunamadı — Travely" }, { name: "robots", content: "noindex" }],
      };
    }
    if (loaderData.kind === "COUNTRY") {
      const country = COUNTRIES.find((row) => row.iso === loaderData.hub.countryIso);
      const name = country?.name.tr ?? loaderData.hub.countryIso;
      const title = `${name} seyahat rehberleri — Travely`;
      const description = `${name} için Travely rehberleri ve şu anda satın alınabilir seyahat hizmetleri.`;
      return {
        meta: [
          { title },
          { name: "description", content: description },
          { property: "og:title", content: title },
          { property: "og:description", content: description },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: `${GUIDES_BASE_URL}/${countrySlug(loaderData.hub.countryIso, "tr")}` }],
      };
    }
    const guide = loaderData.guide;
    const title = guide.seoTitle || `${guide.title} — Travely`;
    const description = guide.seoDescription || guide.excerpt || guide.title;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    const imageUrl = absoluteGuideImage(guide.heroImageUrl);
    if (imageUrl) {
      meta.push({ property: "og:image", content: imageUrl });
      meta.push({ name: "twitter:image", content: imageUrl });
    }
    // Legacy URL: canonical + hreflang point at the localized SEO URLs.
    const slugs = guide.localeSlugs ?? {};
    const matchLocale = (Object.entries(slugs).find(([, s]) => s === params.slug)?.[0] ?? "tr") as Locale;
    const canonicalSlug = slugs[matchLocale] ?? params.slug;
    const canonical = seoUrl(matchLocale, guide.contentType, canonicalSlug);
    meta.push({ property: "og:url", content: canonical });
    const links: Array<Record<string, string>> = [{ rel: "canonical", href: canonical }];
    for (const [loc, slug] of Object.entries(slugs)) {
      if (!slug) continue;
      links.push({ rel: "alternate", hrefLang: loc, href: seoUrl(loc as Locale, guide.contentType, slug) });
    }
    const xDefaultSlug = slugs.en ?? slugs.tr;
    if (xDefaultSlug) {
      links.push({
        rel: "alternate",
        hrefLang: "x-default",
        href: seoUrl(slugs.en ? "en" : "tr", guide.contentType, xDefaultSlug),
      });
    }
    const scripts = [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description,
          mainEntityOfPage: canonical,
          datePublished: guide.publishedAt ?? guide.updatedAt,
          dateModified: guide.updatedAt,
          ...(imageUrl ? { image: imageUrl } : {}),
          publisher: { "@type": "Organization", name: "Travely" },
        }),
      },
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Travely", item: "https://wanderpath-engine.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Rehberler", item: GUIDES_BASE_URL },
            { "@type": "ListItem", position: 3, name: guide.title, item: canonical },
          ],
        }),
      },
    ];
    return { meta, links, scripts };
  },
  errorComponent: () => <GuideMissing />,
  notFoundComponent: () => <GuideMissing />,
  component: GuideEntryPage,
});

const ESIM_CTA = localize({ tr: "eSIM paketlerini keşfet", de: "eSIM-Pakete entdecken", en: "Explore eSIM packages" });

function GuideMissing() {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  return (
    <PublicShell hideStickySearch>
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{copy.notFound}</h1>
        <Button asChild className="mt-6">
          <Link to="/tr/rehber">
            {copy.backToGuides}
          </Link>
        </Button>
      </main>
    </PublicShell>
  );
}

function GuideEntryPage() {
  const { slug } = Route.useParams();
  const { locale } = useI18n();
  const { data } = useSuspenseQuery(entryQuery(slug, locale));
  if (data.kind === "MISSING") return <GuideMissing />;
  if (data.kind === "COUNTRY") return <CountryHub hub={data.hub} />;
  return <GuideArticle guide={data.guide} />;
}

function Breadcrumbs({ current, category }: { current: string; category?: string | null }) {
  const { locale, uiLocale } = useI18n();
  const copy = GUIDES_COPY[locale];
  return (
    <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
      <Link to="/$locale" params={{ locale: uiLocale }} className="hover:text-foreground">
        {copy.breadcrumbHome}
      </Link>
      <span className="px-1.5">/</span>
      <Link to="/tr/rehber" className="hover:text-foreground">
        {copy.hubName}
      </Link>
      {category ? (
        <>
          <span className="px-1.5">/</span>
          <span>{category}</span>
        </>
      ) : null}
      <span className="px-1.5">/</span>
      <span className="font-semibold text-foreground">{current}</span>
    </nav>
  );
}

function CountryHub({
  hub,
}: {
  hub: NonNullable<Awaited<ReturnType<typeof getGuideDestinationHub>>>;
}) {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  const country = COUNTRIES.find((row) => row.iso === hub.countryIso);
  const name = country?.name[locale] ?? hub.countryIso;
  return (
    <PublicShell hideStickySearch>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs current={name} />
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
          <span className="inline-flex items-center gap-2 align-middle">
            <CountryFlag iso={hub.countryIso} className="h-5 w-7" />
            {copy.countryHubTitle(name)}
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {copy.countryHubLead(name)}
        </p>

        <div className="mt-7">
          <GuideServiceOffers offers={hub.offers} />
        </div>

        {hub.guides.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hub.guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        ) : (
          <p className="mt-7 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
            {copy.countryHubEmpty(name)}
          </p>
        )}

        <Button asChild variant="outline" className="mt-8">
          <Link to="/tr/rehber">
            <ArrowLeft /> {copy.allGuides}
          </Link>
        </Button>
      </main>
    </PublicShell>
  );
}

function GuideArticle({
  guide,
}: {
  guide: NonNullable<Awaited<ReturnType<typeof getGuideBySlug>>>;
}) {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  const updated = guide.publishedAt ?? guide.updatedAt;
  const sectionId = (index: number) => `bolum-${index + 1}`;

  return (
    <PublicShell hideStickySearch>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs current={guide.title} category={guide.categoryName} />
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
          {guide.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {guide.readingMinutes ? (
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {copy.readingMinutes(guide.readingMinutes)}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {copy.updated}:{" "}
            {new Date(updated).toLocaleDateString(
              locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB",
              { day: "2-digit", month: "long", year: "numeric" },
            )}
          </span>
        </div>

        {guide.heroImageUrl && (
          <img
            src={guide.heroImageUrl}
            alt={guide.heroAlt ?? guide.title}
            className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}

        {guide.excerpt && (
          <p className="mt-6 text-base font-semibold leading-relaxed">{guide.excerpt}</p>
        )}
        {guide.intro && (
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
            {guide.intro}
          </p>
        )}

        {guide.sections.length > 1 && (
          <nav className="mt-7 rounded-2xl border border-border bg-secondary/40 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {copy.contents}
            </h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {guide.sections.map((section, index) => (
                <li key={sectionId(index)}>
                  <a href={`#${sectionId(index)}`} className="font-semibold text-primary">
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-8 space-y-8">
          {guide.sections.map((section, index) => (
            <section key={sectionId(index)} id={sectionId(index)} className="scroll-mt-24">
              <h2 className="font-display text-xl font-bold">{section.heading}</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {guide.routeStops.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{copy.routeStops}</h2>
            <ol className="mt-3 space-y-2">
              {guide.routeStops.map((stop, index) => {
                const country = COUNTRIES.find((row) => row.iso === stop.countryIso);
                return (
                  <li
                    key={`${stop.countryIso}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold"
                  >
                    <CountryFlag iso={stop.countryIso} className="h-3.5 w-5" />
                    {country?.name[locale] ?? stop.countryIso}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <div className="mt-10">
          <GuideServiceOffers offers={guide.offers} />
        </div>

        {guide.countryIsos.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{copy.destinations}</h2>
            <div className="mt-3">
              <GuideDestinationChips isos={guide.countryIsos} />
            </div>
          </section>
        )}

        {guide.faq.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{copy.faq}</h2>
            <div className="mt-3 space-y-2">
              {guide.faq.map((item) => (
                <details
                  key={item.question}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  <summary className="cursor-pointer text-sm font-bold">{item.question}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
            <script
              type="application/ld+json"
              // FAQ structured data mirrors exactly what the page shows.
              dangerouslySetInnerHTML={{
                __html: safeJsonLd({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: guide.faq.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: { "@type": "Answer", text: item.answer },
                  })),
                }),
              }}
            />
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/esim" search={{ country: "" }}>{ESIM_CTA[locale]}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/tr/rehber">
            <ArrowLeft /> {copy.allGuides}
          </Link>
        </Button>
        </div>
      </main>
    </PublicShell>
  );
}
