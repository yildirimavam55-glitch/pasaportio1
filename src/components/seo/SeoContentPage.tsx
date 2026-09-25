import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { guideHubPath, localeHomePath } from "@/domain/seo/paths";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { CommercialTarget } from "@/domain/seo/relations";
import { ArrowRight, CalendarDays, Clock3, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/travel/PublicShell";
import { Button } from "@/components/ui/button";
import { GuideServiceOffers } from "@/components/guides/GuidePieces";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { COUNTRIES } from "@/domain/geo/countries";
import { CITY_FACT_KEYS } from "@/lib/guides.functions";
import type { SeoLink, SeoPage } from "@/lib/seo-content.functions";
import type { Locale } from "@/domain/enums";
import { SEO_COPY } from "./seo-copy";

function countryName(iso: string | null, locale: Locale) {
  if (!iso) return null;
  return COUNTRIES.find((c) => c.iso === iso)?.name[locale] ?? iso;
}

const FINDER_COPY: Record<Locale, { title: string; destination: string; choose: string; cta: string; region: string }> = {
  tr: { title: "Seyahatin için doğru eSIM'i bul", destination: "Destinasyon", choose: "Ülke seç", cta: "eSIM'imi bul", region: "Bölgesel eSIM paketlerini görüntüle" },
  de: { title: "Finde die passende eSIM für deine Reise", destination: "Reiseziel", choose: "Land wählen", cta: "Meine eSIM finden", region: "Regionale eSIM-Pakete ansehen" },
  en: { title: "Find the right eSIM for your trip", destination: "Destination", choose: "Choose country", cta: "Find my eSIM", region: "View regional eSIM plans" },
};

/** Guide → commercial page CTA. Target always comes from the live relation resolver. */
function CommercialCta({ target, locale }: { target: CommercialTarget; locale: Locale }) {
  const copy = SEO_COPY[locale];
  const name = target.iso ? countryName(target.iso, locale) : null;
  const label =
    target.kind === "ESIM_COUNTRY" && name ? copy.ctaCountry(name) : target.kind === "ESIM_REGION" ? FINDER_COPY[locale].region : FINDER_COPY[locale].cta;
  return (
    <aside data-testid="guide-commercial-cta" className="my-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm font-bold">
        {target.iso ? <CountryFlag iso={target.iso} className="h-3.5 w-5" /> : null}
        {name ? copy.ctaCountryTitle(name) : copy.ctaFinderTitle}
      </p>
      <Button asChild size="sm">
        {target.kind === "ESIM_COUNTRY" && target.iso ? (
          <Link to="/esim" search={{ country: target.iso }}>{label} <ArrowRight /></Link>
        ) : target.kind === "ESIM_REGION" && target.region ? (
          <Link to="/esim/bolge/$region" params={{ region: target.region }} search={{ country: "" }}>{label} <ArrowRight /></Link>
        ) : (
          <a href={target.path}>{label} <ArrowRight /></a>
        )}
      </Button>
    </aside>
  );
}

/** End-of-article finder: hands the destination to the existing eSIM finder / country page. */
function FinderCta({ locale, iso }: { locale: Locale; iso: string | null }) {
  const copy = SEO_COPY[locale];
  const f = FINDER_COPY[locale];
  const navigate = useNavigate();
  const [dest, setDest] = useState(iso ?? "");
  const options = useMemo(() => [...COUNTRIES].sort((x, y) => x.name[locale].localeCompare(y.name[locale])), [locale]);
  return (
    <aside data-testid="guide-finder-cta" className="my-8 rounded-2xl border border-border bg-secondary/40 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        {f.title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.ctaFinderLead}</p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate(dest ? { to: "/esim", search: { country: dest } } : { to: "/esim", search: { country: "" } });
        }}
      >
        <label className="min-w-0">
          <span className="sr-only">{f.destination}</span>
          <select value={dest} onChange={(e) => setDest(e.target.value)} className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm">
            <option value="">{f.choose}</option>
            {options.map((c) => (
              <option key={c.iso} value={c.iso}>{c.name[locale]}</option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" className="h-10">{f.cta} <ArrowRight /></Button>
      </form>
    </aside>
  );
}

function LinkList({ title, links }: { title: string; links: SeoLink[] }) {
  if (!links.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.path}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-primary"
            >
              <span className="flex min-w-0 items-center gap-2">
                {link.countryIso ? <CountryFlag iso={link.countryIso} className="h-3 w-4 shrink-0" /> : null}
                <span className="truncate">{link.title}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SeoContentPage({ page }: { page: SeoPage }) {
  const { guide, locale } = page;
  const copy = SEO_COPY[locale];
  const updated = guide.updatedAt;
  const facts = page.cityFacts;
  const factKeys = CITY_FACT_KEYS.filter((k) => k !== "shortAnswer" && facts[k].trim());
  const shortAnswer = facts.shortAnswer.trim() || guide.excerpt;
  const iso = page.countryIso;
  const commercial = page.commercial;
  const esimGuide = page.relService === "ESIM" || commercial?.kind === "ESIM_COUNTRY" || commercial?.kind === "ESIM_REGION";
  const finderIso = commercial?.iso ?? iso;
  const half = Math.ceil(guide.sections.length / 2);
  const isDestination = guide.contentType === "DESTINATION";
  const dateLocale = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB";
  const sectionId = (i: number) => `s-${i + 1}`;

  return (
    <PublicShell hideStickySearch>
      <main lang={locale} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
          <SeoPathLink path={localeHomePath(locale)} className="hover:text-foreground">
            {copy.home}
          </SeoPathLink>
          <span className="px-1.5">/</span>
          {isDestination ? (
            <Link to="/esim/ulkeler" className="hover:text-foreground">
              {copy.esim}
            </Link>
          ) : (
            <SeoPathLink path={guideHubPath(locale)} className="hover:text-foreground">
              {copy.guides}
            </SeoPathLink>
          )}
          <span className="px-1.5">/</span>
          <span className="font-semibold text-foreground">{page.h1}</span>
        </nav>

        <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">{page.h1}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {guide.readingMinutes ? (
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" /> {guide.readingMinutes} min
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {copy.updated}:{" "}
            <time dateTime={updated}>
              {new Date(updated).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" })}
            </time>
          </span>
          {page.authorName ? (
            <span>
              {copy.author}: {page.authorName}
            </span>
          ) : null}
        </div>

        {guide.heroImageUrl ? (
          <img
            src={guide.heroImageUrl}
            alt={page.heroAlt ?? page.h1}
            width={1200}
            height={675}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover"
          />
        ) : null}

        {shortAnswer ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{copy.shortAnswer}</h2>
            <p className="mt-1.5 text-base font-semibold leading-relaxed">{shortAnswer}</p>
          </section>
        ) : null}

        {commercial ? <CommercialCta target={commercial} locale={locale} /> : null}

        {guide.intro ? (
          <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{guide.intro}</p>
        ) : null}

        {guide.sections.length > 2 ? (
          <nav className="mt-7 rounded-2xl border border-border bg-secondary/40 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{copy.contents}</h2>
            <ol className="mt-2 space-y-1.5 text-sm">
              {guide.sections.map((s, i) => (
                <li key={sectionId(i)}>
                  <a href={`#${sectionId(i)}`} className="font-semibold text-primary">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {factKeys.length ? (
          <div className="mt-8 space-y-6">
            {factKeys.map((key) => (
              <section key={key}>
                <h2 className="font-display text-xl font-bold">{copy.facts[key as Exclude<typeof key, "shortAnswer">]}</h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{facts[key]}</p>
              </section>
            ))}
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
          {guide.sections.map((s, i) => (
            <div key={sectionId(i)}>
              <section id={sectionId(i)} className="scroll-mt-24">
                <h2 className="font-display text-xl font-bold">{s.heading}</h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
              
            </div>
          ))}
        </div>

        {esimGuide || !commercial ? <FinderCta locale={locale} iso={finderIso} /> : null}

        {guide.faq.length ? (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{copy.faq}</h2>
            <div className="mt-3 space-y-2">
              {guide.faq.map((item) => (
                <details key={item.question} className="rounded-xl border border-border bg-card px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold">{item.question}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {guide.offers.length ? (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">{copy.recommended}</h2>
            <div className="mt-3">
              <GuideServiceOffers offers={guide.offers} />
            </div>
          </section>
        ) : null}

        {iso ? <LinkList title={copy.cities(countryName(iso, locale)!)} links={page.cities} /> : null}
        <LinkList title={copy.related} links={page.related} />
        <LinkList title={copy.popular} links={page.destinations} />
      </main>
    </PublicShell>
  );
}

export function SeoMissing({ locale }: { locale: Locale }) {
  return (
    <PublicShell hideStickySearch>
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">{SEO_COPY[locale].notFound}</h1>
        <Button asChild className="mt-6">
          <Link to="/" search={{ service: "esim" } as never}>
            {SEO_COPY[locale].home}
          </Link>
        </Button>
      </main>
    </PublicShell>
  );
}
