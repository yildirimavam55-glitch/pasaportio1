/**
 * Travely Guides presentation pieces.
 *
 * Contextual commerce rule: a service card only renders from a real
 * GuideServiceOffer that the catalogue produced. Nothing here invents a
 * product, a price or a purchase button.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, Signal, Armchair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { COUNTRIES, flagOf, getCountryByIso } from "@/domain/geo/countries";
import type { GuideListItem, GuideServiceOffer } from "@/lib/guides.functions";
import { GUIDES_COPY, countrySlug } from "./copy";

export function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function GuideCard({ guide }: { guide: GuideListItem }) {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  return (
    <Link
      to="/guides/$slug"
      params={{ slug: guide.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-primary/40"
    >
      {guide.heroImageUrl && (
        <img
          src={guide.heroImageUrl}
          alt={guide.heroAlt ?? guide.title}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {guide.categoryName && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {guide.categoryName}
          </span>
        )}
        <h3 className="font-display text-lg font-bold leading-snug">{guide.title}</h3>
        {guide.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{guide.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          {guide.readingMinutes ? (
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {copy.readingMinutes(guide.readingMinutes)}
            </span>
          ) : null}
          {guide.countryIsos.slice(0, 4).map((iso) => (
            <span key={iso} aria-hidden="true">
              {flagOf(iso)}
            </span>
          ))}
          <ArrowRight className="ml-auto size-4 text-primary transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/** Real, catalogue-backed service cards for the guide's own context. */
export function GuideServiceOffers({ offers }: { offers: GuideServiceOffer[] }) {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  if (!offers.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
      <h2 className="font-display text-lg font-bold">{copy.servicesTitle}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{copy.servicesLead}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <OfferCard key={`${offer.serviceType}-${offer.code}`} offer={offer} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({ offer }: { offer: GuideServiceOffer }) {
  const { locale } = useI18n();
  const copy = GUIDES_COPY[locale];
  const country = getCountryByIso(offer.code);
  const label =
    offer.serviceType === "ESIM"
      ? `${country ? `${country.flag} ${country.name[locale]}` : offer.code} eSIM`
      : `${offer.code} Lounge`;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {offer.serviceType === "ESIM" ? (
          <Signal className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <Armchair className="size-4 text-primary" aria-hidden="true" />
        )}
        <strong className="text-sm font-bold">{label}</strong>
      </div>
      <p className="text-sm text-muted-foreground">
        {copy.from} <strong className="text-foreground">{formatMoney(offer.amount, offer.currency, locale)}</strong>
      </p>
      <Button asChild size="sm" className="w-full">
        {offer.serviceType === "ESIM" ? (
          <Link to="/esim/paketler" search={{ route: offer.code }}>
            {copy.esimCta}
          </Link>
        ) : (
          <Link to="/lounge/secenekler" search={{ iata: offer.code }}>
            {copy.loungeCta}
          </Link>
        )}
      </Button>
    </div>
  );
}

/** Destination chips pointing at country guide hubs. */
export function GuideDestinationChips({ isos }: { isos: string[] }) {
  const { locale } = useI18n();
  if (!isos.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {isos.map((iso) => {
        const country = COUNTRIES.find((row) => row.iso === iso);
        return (
          <Link
            key={iso}
            to="/guides/$slug"
            params={{ slug: countrySlug(iso, locale) }}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
          >
            {flagOf(iso)} {country?.name[locale] ?? iso}
          </Link>
        );
      })}
    </div>
  );
}
