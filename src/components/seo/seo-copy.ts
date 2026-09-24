import type { Locale } from "@/domain/enums";
import type { CityFacts } from "@/lib/guides.functions";

export const SEO_COPY: Record<
  Locale,
  {
    home: string;
    guides: string;
    esim: string;
    updated: string;
    author: string;
    shortAnswer: string;
    contents: string;
    faq: string;
    related: string;
    popular: string;
    recommended: string;
    cities: (country: string) => string;
    ctaCountryTitle: (country: string) => string;
    ctaCountry: (country: string) => string;
    ctaFinderTitle: string;
    ctaFinderLead: string;
    ctaFinder: string;
    notFound: string;
    facts: Record<Exclude<keyof CityFacts, "shortAnswer">, string>;
  }
> = {
  tr: {
    home: "Ana sayfa",
    guides: "Rehberler",
    esim: "eSIM",
    updated: "Güncellendi",
    author: "Yazar",
    shortAnswer: "Kısa cevap",
    contents: "İçindekiler",
    faq: "Sık sorulan sorular",
    related: "İlgili rehberler",
    popular: "Popüler destinasyonlar",
    recommended: "Önerilen eSIM",
    cities: (c) => `${c} şehir rehberleri`,
    ctaCountryTitle: (c) => `${c}'ye mi gidiyorsun?`,
    ctaCountry: (c) => `${c} eSIM paketlerini görüntüle`,
    ctaFinderTitle: "Ne kadar internete ihtiyacın var?",
    ctaFinderLead: "Seyahat süren ve kullanımına göre uygun paketi bulalım.",
    ctaFinder: "eSIM'imi bul",
    notFound: "Bu sayfa bulunamadı.",
    facts: {
      airports: "Havalimanında internete bağlanma",
      touristAreas: "Popüler bölgeler",
      travelStyle: "Seyahat tarzı",
      typicalStay: "Tipik kalış süresi",
      usageExamples: "İnternet kullanım örnekleri",
      transport: "Ulaşım ve navigasyon",
      connectivity: "Yerel bağlantı notları",
      networks: "Yerel mobil ağlar",
      coverage: "4G / 5G durumu",
      dataEstimate: "Kaç GB seçilmeli?",
    },
  },
  de: {
    home: "Startseite",
    guides: "Ratgeber",
    esim: "eSIM",
    updated: "Aktualisiert",
    author: "Autor",
    shortAnswer: "Kurz gesagt",
    contents: "Inhalt",
    faq: "Häufige Fragen",
    related: "Verwandte Ratgeber",
    popular: "Beliebte Reiseziele",
    recommended: "Empfohlene eSIM",
    cities: (c) => `Städte-Ratgeber für ${c}`,
    ctaCountryTitle: (c) => `Reist du nach ${c}?`,
    ctaCountry: (c) => `eSIM-Pakete für ${c} ansehen`,
    ctaFinderTitle: "Wie viel Datenvolumen brauchst du?",
    ctaFinderLead: "Wir finden das passende Paket für Reisedauer und Nutzung.",
    ctaFinder: "Meine eSIM finden",
    notFound: "Diese Seite wurde nicht gefunden.",
    facts: {
      airports: "Internet am Flughafen",
      touristAreas: "Beliebte Gegenden",
      travelStyle: "Reisestil",
      typicalStay: "Typische Aufenthaltsdauer",
      usageExamples: "Beispiele für die Nutzung",
      transport: "Verkehr und Navigation",
      connectivity: "Hinweise zur Verbindung vor Ort",
      networks: "Lokale Mobilfunknetze",
      coverage: "4G / 5G",
      dataEstimate: "Wie viele GB wählen?",
    },
  },
  en: {
    home: "Home",
    guides: "Travel Guides",
    esim: "eSIM",
    updated: "Updated",
    author: "Author",
    shortAnswer: "Short answer",
    contents: "Contents",
    faq: "Frequently asked questions",
    related: "Related guides",
    popular: "Popular destinations",
    recommended: "Recommended eSIM",
    cities: (c) => `City guides for ${c}`,
    ctaCountryTitle: (c) => `Travelling to ${c}?`,
    ctaCountry: (c) => `View ${c} eSIM plans`,
    ctaFinderTitle: "How much data do you need?",
    ctaFinderLead: "We'll match a plan to your trip length and usage.",
    ctaFinder: "Find my eSIM",
    notFound: "This page could not be found.",
    facts: {
      airports: "Getting online at the airport",
      touristAreas: "Popular areas",
      travelStyle: "Travel style",
      typicalStay: "Typical stay",
      usageExamples: "Typical internet usage",
      transport: "Transport and navigation",
      connectivity: "Local connectivity notes",
      networks: "Local mobile networks",
      coverage: "4G / 5G coverage",
      dataEstimate: "How many GB should you choose?",
    },
  },
};
