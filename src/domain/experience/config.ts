import esimDesktopHero from "@/assets/esim-hero-desktop.jpg";
import esimMobileHero from "@/assets/esim-hero-mobile.jpg";
import loungeDesktopHero from "@/assets/lounge-hero-desktop.jpg";
import loungeMobileHero from "@/assets/lounge-hero-mobile.jpg";
import type { EsimServiceConfig, LoungeServiceConfig, SectionConfig } from "./types";

export const BRAND = { name: "travely", logoLabel: "travely", mark: "signal" } as const;
const sections: SectionConfig[] = [
  { id: "hero", kind: "hero", visible: true, order: 1, variant: "default", spacing: "compact", alignment: "left" },
  { id: "finder", kind: "finder", visible: true, order: 2, variant: "default", spacing: "compact", alignment: "left" },
  { id: "popular", kind: "popular", visible: true, order: 3, variant: "soft", spacing: "normal", alignment: "left" },
  { id: "pricing", kind: "pricing", visible: true, order: 4, variant: "default", spacing: "normal", alignment: "left" },
  { id: "complementary", kind: "complementary", visible: true, order: 5, variant: "contrast", spacing: "normal", alignment: "left" },
  { id: "education", kind: "education", visible: true, order: 6, variant: "soft", spacing: "normal", alignment: "left" },
  { id: "final", kind: "finalCta", visible: true, order: 7, variant: "contrast", spacing: "normal", alignment: "center" },
];
export const COUNTRIES = [
  { id: "country-tr", iso: "TR", flag: "🇹🇷", name: { tr: "Türkiye", de: "Türkei", en: "Türkiye" } },
  { id: "country-de", iso: "DE", flag: "🇩🇪", name: { tr: "Almanya", de: "Deutschland", en: "Germany" } },
  { id: "country-at", iso: "AT", flag: "🇦🇹", name: { tr: "Avusturya", de: "Österreich", en: "Austria" } },
  { id: "country-si", iso: "SI", flag: "🇸🇮", name: { tr: "Slovenya", de: "Slowenien", en: "Slovenia" } },
  { id: "country-hr", iso: "HR", flag: "🇭🇷", name: { tr: "Hırvatistan", de: "Kroatien", en: "Croatia" } },
  { id: "country-rs", iso: "RS", flag: "🇷🇸", name: { tr: "Sırbistan", de: "Serbien", en: "Serbia" } },
  { id: "country-bg", iso: "BG", flag: "🇧🇬", name: { tr: "Bulgaristan", de: "Bulgarien", en: "Bulgaria" } },
  { id: "country-fr", iso: "FR", flag: "🇫🇷", name: { tr: "Fransa", de: "Frankreich", en: "France" } },
] as const;
const SILA_STOPS = COUNTRIES.filter((country) => ["DE", "AT", "SI", "HR", "RS", "BG", "TR"].includes(country.iso)).map((country) => ({ countryId: country.id, countryIso: country.iso }));
export const ESIM_SERVICE_CONFIG: EsimServiceConfig = { slug: "esim", enabled: true, sections, countries: [...COUNTRIES], media: { id: "esim-hero", category: "Hero", label: "eSIM hero", desktopSrc: esimDesktopHero, mobileSrc: esimMobileHero, fallbackSrc: esimDesktopHero, alt: { tr: "Akdeniz kıyısında telefonuyla seyahat eden gezgin", de: "Reisende mit Smartphone an der Mittelmeerküste", en: "Traveler using a smartphone on the Mediterranean coast" }, focalPosition: "center" }, routePresets: [{ id: "sila-yolu", icon: "🚗", active: true, featured: true, name: { tr: "Sıla Yolu", de: "Sıla Yolu", en: "Sıla Yolu" }, stops: SILA_STOPS }], initialState: { tripMode: "single", destinationId: "country-tr", days: 10, travelers: 1, usage: ["MESSAGING", "SOCIAL", "MAPS"], routeStops: [], presetId: null } };
export const LOUNGE_SERVICE_CONFIG: LoungeServiceConfig = { slug: "lounge", enabled: true, sections, media: { id: "lounge-hero", category: "Hero", label: "Lounge hero", desktopSrc: loungeDesktopHero, mobileSrc: loungeMobileHero, fallbackSrc: loungeDesktopHero, alt: { tr: "Gün batımında havalimanı Lounge alanında dinlenen yolcu", de: "Reisende in einer Flughafen-Lounge bei Sonnenuntergang", en: "Traveler relaxing in an airport Lounge at sunset" }, focalPosition: "center" }, airports: [
  { id: "airport-ist", iata: "IST", flag: "🇹🇷", countryIso: "TR", city: { tr: "İstanbul", de: "Istanbul", en: "Istanbul" }, airport: { tr: "İstanbul Havalimanı", de: "Flughafen Istanbul", en: "Istanbul Airport" } },
  { id: "airport-fra", iata: "FRA", flag: "🇩🇪", countryIso: "DE", city: { tr: "Frankfurt", de: "Frankfurt", en: "Frankfurt" }, airport: { tr: "Frankfurt Havalimanı", de: "Flughafen Frankfurt", en: "Frankfurt Airport" } },
  { id: "airport-dus", iata: "DUS", flag: "🇩🇪", countryIso: "DE", city: { tr: "Düsseldorf", de: "Düsseldorf", en: "Düsseldorf" }, airport: { tr: "Düsseldorf Havalimanı", de: "Flughafen Düsseldorf", en: "Düsseldorf Airport" } },
], initialState: { airportId: "airport-ist", date: "", flightSituation: "DEPARTURE", travelers: 1 } };
export const SERVICE_REGISTRY = { esim: ESIM_SERVICE_CONFIG, lounge: LOUNGE_SERVICE_CONFIG } as const;
