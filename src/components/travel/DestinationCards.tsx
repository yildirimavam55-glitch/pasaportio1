/**
 * Shared destination presentation.
 *
 * Both the homepage discovery block and the all-countries page render the same
 * catalogue-derived cards, so a country keeps one identity across the site.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CountryFlag } from "./CountryFlag";
import { CountryScene, RegionScene } from "./CountryScene";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";
import { getCountryByIso } from "@/domain/geo/countries";
import { COVERAGE_REGION_LABELS, COVERAGE_REGION_ORDER } from "@/domain/geo/coverage-regions";
import {
  listEsimDestinations,
  type EsimCountryDestination,
  type EsimRegionDestination,
} from "@/lib/esim-destinations.functions";

export const DESTINATION_COPY = {
  tr: {
    regionsTitle: "Bölgesel ve global paketler",
    regionsLead: "Birden fazla ülkeye mi gidiyorsun? Tek paketle birden fazla destinasyonda bağlan.",
    popularTitle: "Popüler ülkeler",
    popularLead: "En çok tercih edilen destinasyonlar.",
    allCountries: "Tüm ülkeleri gör",
    allTitle: "Tüm destinasyonlar",
    allLead: (count: number) => `${count} ülkede satışta olan eSIM paketleri.`,
    search: "Ülke ara",
    startingAt: "Başlangıç",
    countryCount: (count: number) => `${count} ülke`,
    showMore: "Daha fazla göster",
    noResults: "Aramanla eşleşen ülke bulunamadı.",
    allRegions: "Tümü",
  },
  de: {
    regionsTitle: "Regionale eSIM-Pakete",
    regionsLead: "Reist du in mehrere Länder? Verbinde dich mit einem Paket in mehreren Destinationen.",
    popularTitle: "Beliebte Länder",
    popularLead: "Die meistgewählten Reiseziele.",
    allCountries: "Alle Länder ansehen",
    allTitle: "Alle Länder",
    allLead: (count: number) => `eSIM-Pakete für ${count} Länder.`,
    search: "Land suchen",
    startingAt: "Ab",
    countryCount: (count: number) => `${count} Länder`,
    showMore: "Mehr anzeigen",
    noResults: "Keine passenden Länder gefunden.",
    allRegions: "Alle",
  },
  en: {
    regionsTitle: "Regional eSIM packages",
    regionsLead: "Going to more than one country? Connect across multiple destinations with one plan.",
    popularTitle: "Popular countries",
    popularLead: "The most requested destinations.",
    allCountries: "See all countries",
    allTitle: "All countries",
    allLead: (count: number) => `eSIM packages for ${count} countries.`,
    search: "Search country",
    startingAt: "From",
    countryCount: (count: number) => `${count} countries`,
    showMore: "Show more",
    noResults: "No country matches your search.",
    allRegions: "All",
  },
} as const satisfies Record<Locale, unknown>;

export function useDestinationCatalogue() {
  return useQuery({
    queryKey: ["esim-destination-catalogue"],
    queryFn: () => listEsimDestinations(),
    staleTime: 10 * 60 * 1000,
  });
}

export function formatFrom(amount: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export function countryLabel(iso: string, locale: Locale) {
  const territoryNames: Record<string, Record<Locale, string>> = {
    AN: { tr: "Hollanda Antilleri", de: "Niederländische Antillen", en: "Netherlands Antilles" },
    GL: { tr: "Grönland", de: "Grönland", en: "Greenland" },
    IC: { tr: "Kanarya Adaları", de: "Kanarische Inseln", en: "Canary Islands" },
  };
  return getCountryByIso(iso)?.name[locale] ?? territoryNames[iso.toUpperCase()]?.[locale] ?? iso;
}

/** Country name for the active locale, plus ISO and every known alias. */
export function countrySearchHaystack(iso: string) {
  const country = getCountryByIso(iso);
  return [iso, country?.name.tr, country?.name.de, country?.name.en, ...(country?.aliases ?? [])]
    .filter(Boolean)
    .join(" ");
}

export function useDestinationNavigation() {
  const navigate = useNavigate();
  return (options: { destination?: string; route?: string }) =>
    void navigate({
      to: "/esim/paketler",
      search: {
        destination: options.destination ?? "",
        route: options.route ?? "",
        days: 10,
        travelers: 1,
        estimated: 0,
        required: 0,
        recommended: 0,
        recommendedProductId: "",
        usage: "",
        intensity: "NORMAL",
      },
    });
}

export function CountryDestinationCard({
  destination,
  eager = false,
}: {
  destination: EsimCountryDestination;
  eager?: boolean;
}) {
  const { locale } = useI18n();
  const copy = DESTINATION_COPY[locale];
  const open = useDestinationNavigation();
  return (
    <button
      type="button"
      className="destination-card"
      data-eager={eager ? "true" : "false"}
      onClick={() => open({ destination: destination.iso })}
    >
      <CountryScene iso={destination.iso} eager={eager} />
      <span className="destination-card-body">
        <span className="flex items-center gap-2">
          <CountryFlag iso={destination.iso} className="text-lg" />
          <span className="min-w-0 truncate font-display text-base font-bold leading-tight">
            {countryLabel(destination.iso, locale)}
          </span>
        </span>
        <span className="mt-auto flex items-end justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              {copy.startingAt}
            </span>
            <strong className="block text-sm font-bold leading-tight">
              {formatFrom(destination.amount, destination.currency, locale)}
            </strong>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

export function RegionDestinationCard({ region }: { region: EsimRegionDestination }) {
  const { locale } = useI18n();
  const copy = DESTINATION_COPY[locale];
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="destination-card is-region"
      onClick={() => void navigate({ to: "/esim/ulkeler", search: { q: "", region: region.key } })}
    >
      <RegionScene region={region.key} />
      <span className="destination-card-body">
        <span className="min-w-0 truncate font-display text-base font-bold leading-tight">
          {COVERAGE_REGION_LABELS[region.key][locale]}
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {copy.countryCount(region.maxCoverageCount)}
        </span>
        <span className="mt-auto flex items-end justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              {copy.startingAt}
            </span>
            <strong className="block text-sm font-bold leading-tight">
              {formatFrom(region.amount, region.currency, locale)}
            </strong>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

export function sortRegions(regions: EsimRegionDestination[]) {
  return [...regions].sort(
    (a, b) => COVERAGE_REGION_ORDER.indexOf(a.key) - COVERAGE_REGION_ORDER.indexOf(b.key),
  );
}

export function sortCountriesByName(countries: EsimCountryDestination[], locale: Locale) {
  const collator = new Intl.Collator(locale === "tr" ? "tr" : locale === "de" ? "de" : "en");
  return [...countries].sort((a, b) =>
    collator.compare(countryLabel(a.iso, locale), countryLabel(b.iso, locale)),
  );
}
