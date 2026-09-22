/** Travely Guides — shared copy and country-slug helpers (TR/DE/EN). */
import type { Locale } from "@/domain/enums";
import { COUNTRIES } from "@/domain/geo/countries";

export const GUIDES_COPY = {
  tr: {
    hubName: "Rehberler",
    hubTitle: "Seyahatini kolaylaştıran rehberler",
    hubLead:
      "Nereye gideceğini, yolda neye ihtiyaç duyacağını ve hangi hizmetin işine yarayacağını anlat, gerisini biz hazırlayalım.",
    all: "Tümü",
    filterCategory: "Kategori",
    empty: "Bu kategoride henüz yayınlanmış rehber yok.",
    emptyHub: "Rehberler yakında burada olacak.",
    readingMinutes: (minutes: number) => `${minutes} dk okuma`,
    updated: "Güncellendi",
    breadcrumbHome: "Ana sayfa",
    contents: "İçindekiler",
    faq: "Sık sorulan sorular",
    related: "İlgili rehberler",
    destinations: "İlgili destinasyonlar",
    routeStops: "Rota ülkeleri",
    servicesTitle: "Bu rehbere uygun Travely hizmetleri",
    servicesLead: "Yalnızca gerçekten satın alınabilir hizmetleri gösteriyoruz.",
    esimCta: "eSIM paketlerini gör",
    loungeCta: "Lounge seçeneklerini gör",
    from: "Başlangıç",
    countryHubTitle: (name: string) => `${name} rehberleri`,
    countryHubLead: (name: string) =>
      `${name} için hazırladığımız rehberler ve şu anda satın alınabilir Travely hizmetleri.`,
    countryHubEmpty: (name: string) => `${name} için henüz yayınlanmış rehber yok.`,
    allGuides: "Tüm rehberler",
    homeTitle: "Seyahatini kolaylaştıran rehberler",
    notFound: "Bu rehber bulunamadı.",
    backToGuides: "Rehberlere dön",
  },
  de: {
    hubName: "Reiseführer",
    hubTitle: "Ratgeber für eine einfachere Reise",
    hubLead:
      "Erfahre, wohin du reist, was du unterwegs brauchst und welcher Service wirklich hilft.",
    all: "Alle",
    filterCategory: "Kategorie",
    empty: "In dieser Kategorie gibt es noch keine veröffentlichten Ratgeber.",
    emptyHub: "Die Ratgeber erscheinen hier in Kürze.",
    readingMinutes: (minutes: number) => `${minutes} Min. Lesezeit`,
    updated: "Aktualisiert",
    breadcrumbHome: "Startseite",
    contents: "Inhalt",
    faq: "Häufige Fragen",
    related: "Passende Ratgeber",
    destinations: "Passende Reiseziele",
    routeStops: "Länder der Route",
    servicesTitle: "Passende Travely-Services",
    servicesLead: "Wir zeigen nur Services, die wirklich buchbar sind.",
    esimCta: "eSIM-Pakete ansehen",
    loungeCta: "Lounge-Optionen ansehen",
    from: "ab",
    countryHubTitle: (name: string) => `Ratgeber für ${name}`,
    countryHubLead: (name: string) =>
      `Unsere Ratgeber für ${name} und die aktuell buchbaren Travely-Services.`,
    countryHubEmpty: (name: string) => `Für ${name} gibt es noch keine veröffentlichten Ratgeber.`,
    allGuides: "Alle Ratgeber",
    homeTitle: "Ratgeber für eine einfachere Reise",
    notFound: "Dieser Ratgeber wurde nicht gefunden.",
    backToGuides: "Zurück zu den Ratgebern",
  },
  en: {
    hubName: "Travel Guides",
    hubTitle: "Guides that make travel simpler",
    hubLead:
      "Understand where you are going, what you need on the way and which service actually helps.",
    all: "All",
    filterCategory: "Category",
    empty: "No published guides in this category yet.",
    emptyHub: "Guides are coming here soon.",
    readingMinutes: (minutes: number) => `${minutes} min read`,
    updated: "Updated",
    breadcrumbHome: "Home",
    contents: "Contents",
    faq: "Frequently asked questions",
    related: "Related guides",
    destinations: "Related destinations",
    routeStops: "Countries on this route",
    servicesTitle: "Travely services for this guide",
    servicesLead: "We only show services that are genuinely available.",
    esimCta: "See eSIM packages",
    loungeCta: "See lounge options",
    from: "from",
    countryHubTitle: (name: string) => `${name} travel guides`,
    countryHubLead: (name: string) =>
      `Our guides for ${name} plus the Travely services available right now.`,
    countryHubEmpty: (name: string) => `No published guides for ${name} yet.`,
    allGuides: "All guides",
    homeTitle: "Guides that make travel simpler",
    notFound: "This guide was not found.",
    backToGuides: "Back to guides",
  },
} as const;

const CHAR_MAP: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ç: "c", Ç: "c",
  ö: "o", Ö: "o", ü: "u", Ü: "u", ä: "a", Ä: "a", ß: "ss", å: "a",
  é: "e", è: "e", ê: "e", á: "a", à: "a", â: "a", í: "i", ó: "o", ô: "o", ú: "u", ñ: "n",
};

export function slugify(value: string): string {
  return value
    .split("")
    .map((char) => CHAR_MAP[char] ?? char)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every localized country slug that may appear under /guides/<slug>. */
export function countryIsoFromSlug(slug: string): string | null {
  const wanted = slugify(slug);
  if (!wanted) return null;
  for (const country of COUNTRIES) {
    for (const locale of ["tr", "de", "en"] as Locale[]) {
      if (slugify(country.name[locale]) === wanted) return country.iso;
    }
    if (country.iso.toLowerCase() === wanted) return country.iso;
  }
  return null;
}

export function countrySlug(iso: string, locale: Locale): string {
  const country = COUNTRIES.find((row) => row.iso === iso.toUpperCase());
  return slugify(country?.name[locale] ?? iso);
}
