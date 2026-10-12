import esimDesktopHero from "@/assets/esim-hero-desktop.jpg";
import esimMobileHero from "@/assets/esim-hero-mobile.jpg";
import loungeDesktopHero from "@/assets/lounge-hero-desktop.jpg";
import loungeMobileHero from "@/assets/lounge-hero-mobile.jpg";
import { AIRPORTS, getAirport } from "@/domain/geo/airports";
import { COUNTRIES, getCountryByIso } from "@/domain/geo/countries";
import type { AirportRef, CountryRef, EsimServiceConfig, LoungeServiceConfig, SectionConfig } from "./types";
import { localize } from "@/i18n/overlay";

export const BRAND = { name: "pasaport.io", logoLabel: "pasaport.io", mark: "signal" } as const;

const sections: SectionConfig[] = [
  { id: "hero", kind: "hero", visible: true, order: 1, variant: "default", spacing: "compact", alignment: "left" },
  { id: "selector", kind: "selector", visible: true, order: 2, variant: "default", spacing: "compact", alignment: "left" },
  { id: "finder", kind: "finder", visible: true, order: 3, variant: "default", spacing: "compact", alignment: "left" },
  { id: "popular", kind: "popular", visible: true, order: 4, variant: "soft", spacing: "normal", alignment: "left" },
  { id: "pricing", kind: "pricing", visible: true, order: 5, variant: "default", spacing: "normal", alignment: "left" },
  { id: "complementary", kind: "complementary", visible: true, order: 6, variant: "contrast", spacing: "normal", alignment: "left" },
  { id: "education", kind: "education", visible: true, order: 7, variant: "soft", spacing: "normal", alignment: "left" },
  { id: "final", kind: "finalCta", visible: true, order: 8, variant: "contrast", spacing: "normal", alignment: "center" },
];

const SILA_STOPS = ["DE", "AT", "SI", "HR", "RS", "BG", "TR"].flatMap((iso) => {
  const country = getCountryByIso(iso);
  return country ? [{ countryId: country.id, countryIso: country.iso }] : [];
});

const countryRefs: CountryRef[] = COUNTRIES.map((country) => ({ id: country.id, iso: country.iso, flag: country.flag, name: country.name }));
const airportRefs: AirportRef[] = AIRPORTS.map((airport) => ({ id: airport.id, iata: airport.iata, flag: airport.flag, countryIso: airport.countryIso, city: airport.city, airport: airport.airport }));

export const ESIM_SERVICE_CONFIG: EsimServiceConfig = {
  slug: "esim",
  enabled: true,
  sections,
  countries: countryRefs,
  media: {
    id: "esim-hero",
    category: "Hero",
    label: "eSIM hero",
    desktopSrc: esimDesktopHero,
    mobileSrc: esimMobileHero,
    fallbackSrc: esimDesktopHero,
    alt: localize({
      tr: "Akdeniz kıyısında telefonuyla seyahat eden gezgin",
      de: "Reisende mit Smartphone an der Mittelmeerküste",
      en: "Traveler using a smartphone on the Mediterranean coast",
    }),
    focalPosition: "center",
  },
  routePresets: [
    { id: "sila-yolu", icon: "route", active: true, featured: true, name: localize({ tr: "Sıla Yolu", de: "Sıla Yolu", en: "Sıla Yolu" }), stops: SILA_STOPS },
  ],
  initialState: { tripMode: "single", destinationId: "country-tr", days: 10, travelers: 1, usage: ["MESSAGING", "SOCIAL", "MAPS"], intensity: "NORMAL", routeStops: [], presetId: null },
};

export const LOUNGE_SERVICE_CONFIG: LoungeServiceConfig = {
  slug: "lounge",
  enabled: true,
  sections,
  media: {
    id: "lounge-hero",
    category: "Hero",
    label: "Lounge hero",
    desktopSrc: loungeDesktopHero,
    mobileSrc: loungeMobileHero,
    fallbackSrc: loungeDesktopHero,
    alt: localize({
      tr: "Gün batımında havalimanı Lounge alanında dinlenen yolcu",
      de: "Reisende in einer Flughafen-Lounge bei Sonnenuntergang",
      en: "Traveler relaxing in an airport Lounge at sunset",
    }),
    focalPosition: "center",
  },
  airports: airportRefs,
  initialState: { airportId: getAirport("airport-ist")?.id ?? "airport-ist", date: "", flightSituation: "DEPARTURE", travelers: 1 },
};

export const SERVICE_REGISTRY = { esim: ESIM_SERVICE_CONFIG, lounge: LOUNGE_SERVICE_CONFIG } as const;
export const POPULAR_LOUNGE_AIRPORT_IDS = ["airport-ist", "airport-fra", "airport-dus"];
