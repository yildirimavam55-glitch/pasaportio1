import type { Locale } from "@/domain/enums";
import type { FlightSituation, ServiceSlug, TripMode } from "@/content/travel-content";
import type { UsageIntensity } from "@/domain/esim/usage-recommendation";

export type MediaCategory = "Hero" | "eSIM" | "Lounge" | "Destination" | "Airport" | "Campaign" | "General";
export type FocalPosition = "center" | "left" | "right" | "top" | "bottom";
export type MediaAsset = { id: string; category: MediaCategory; label: string; desktopSrc: string; mobileSrc: string; fallbackSrc: string; alt: Record<Locale, string>; focalPosition: FocalPosition };
export type MerchandisingMedia = {
  id: string;
  category: MediaCategory;
  src: string;
  fallbackSrc: string;
  alt: Record<Locale, string>;
  focalPosition: FocalPosition;
};
export type FeaturedVisualItem = {
  id: string;
  flag: string;
  title: Record<Locale, string>;
  label: Record<Locale, string>;
  media: MerchandisingMedia;
};
export type SectionKind = "hero" | "selector" | "finder" | "recommendation" | "popular" | "pricing" | "benefits" | "complementary" | "education" | "campaign" | "requirements" | "support" | "faq" | "finalCta";
export type SectionConfig = { id: string; kind: SectionKind; visible: boolean; order: number; variant: "default" | "soft" | "contrast"; spacing: "compact" | "normal" | "generous"; alignment: "left" | "center" };
export type CountryRef = { id: string; iso: string; name: Record<Locale, string>; flag: string };
export type AirportRef = { id: string; iata: string; city: Record<Locale, string>; airport: Record<Locale, string>; countryIso: string; flag: string };
export type UsageKind = "MESSAGING" | "SOCIAL" | "MAPS" | "VIDEO" | "WORK" | "GAMING" | "HOTSPOT";
export type RouteStop = { id: string; countryId: string; countryIso: string; order: number; days?: number; startDate?: string; endDate?: string };
export type RoutePreset = { id: string; icon: string; active: boolean; featured: boolean; name: Record<Locale, string>; stops: Omit<RouteStop, "id" | "order">[] };
export type EsimFinderState = { tripMode: TripMode; destinationId: string; days: number; travelers: number; usage: UsageKind[]; intensity: UsageIntensity; routeStops: RouteStop[]; presetId: string | null };
export type LoungeFinderState = { airportId: string; date: string; flightSituation: FlightSituation; travelers: number; terminal?: string; flightTime?: string };
export type BaseServiceConfig = { slug: ServiceSlug; enabled: true; sections: SectionConfig[]; media: MediaAsset };
export type EsimServiceConfig = BaseServiceConfig & { slug: "esim"; countries: CountryRef[]; routePresets: RoutePreset[]; initialState: EsimFinderState };
export type LoungeServiceConfig = BaseServiceConfig & { slug: "lounge"; airports: AirportRef[]; initialState: LoungeFinderState };
export type ServiceConfig = EsimServiceConfig | LoungeServiceConfig;
