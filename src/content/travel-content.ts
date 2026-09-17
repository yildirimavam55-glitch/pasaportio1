import type { Locale } from "@/domain/enums";

export type Localized<T> = Record<Locale, T>;
export type ServiceSlug = "esim" | "lounge";
export type TripMode = "single" | "multi";
export type FlightSituation = "DEPARTURE" | "TRANSIT" | "ARRIVAL";
export type ContentNamespace = "GLOBAL_CONTENT" | "ESIM_CONTENT" | "LOUNGE_CONTENT";

export type GlobalCopy = {
  nav: { esim: string; lounge: string; destinations: string; how: string; support: string; account: string; plan: string };
  mobile: { home: string; esim: string; lounge: string; account: string };
  language: { label: string; tr: string; de: string; en: string };
  trust: string[];
  footer: string;
  error: string;
  retry: string;
};

export type ServiceCopy = {
  eyebrow: string;
  headline: string;
  description: string;
  cta: string;
  offerTitle: string;
  offerValue: string;
  offerMeta: string;
  finderTitle: string;
  finderDescription: string;
  popularTitle: string;
  popularDescription: string;
  pricingTitle: string;
  pricingDescription: string;
  educationTitle: string;
  finalTitle: string;
  finalDescription: string;
  emptyProducts: string;
  crossSellTitle: string;
  crossSellDescription: string;
};

export const GLOBAL_CONTENT: Localized<GlobalCopy> = {
  tr: {
    nav: { esim: "eSIM", lounge: "Lounge", destinations: "Destinasyonlar", how: "Nasıl Çalışır", support: "Destek", account: "Hesabım", plan: "Seyahatini planla" },
    mobile: { home: "Ana Sayfa", esim: "eSIM’imi Bul", lounge: "Lounge Bul", account: "Hesabım" },
    language: { label: "Dil seç", tr: "Türkçe", de: "Deutsch", en: "English" },
    trust: ["Güvenli ödeme altyapısı", "Hızlı dijital teslimat", "Türkçe ve Almanca destek"],
    footer: "Seyahatin için doğru hizmet, tek bir yerde.", error: "Bu bölüm şu anda yüklenemedi.", retry: "Tekrar dene",
  },
  de: {
    nav: { esim: "eSIM", lounge: "Lounge", destinations: "Reiseziele", how: "So funktioniert’s", support: "Hilfe", account: "Konto", plan: "Reise planen" },
    mobile: { home: "Startseite", esim: "eSIM finden", lounge: "Lounge finden", account: "Mein Konto" },
    language: { label: "Sprache wählen", tr: "Türkçe", de: "Deutsch", en: "English" },
    trust: ["Sichere Zahlungsbasis", "Schnelle digitale Zustellung", "Support auf Deutsch und Türkisch"],
    footer: "Der passende Reiseservice an einem Ort.", error: "Dieser Bereich konnte nicht geladen werden.", retry: "Erneut versuchen",
  },
  en: {
    nav: { esim: "eSIM", lounge: "Lounge", destinations: "Destinations", how: "How it works", support: "Support", account: "Account", plan: "Plan your trip" },
    mobile: { home: "Home", esim: "Find eSIM", lounge: "Find Lounge", account: "My Account" },
    language: { label: "Choose language", tr: "Türkçe", de: "Deutsch", en: "English" },
    trust: ["Secure payment foundation", "Fast digital delivery", "Turkish and German support"],
    footer: "The right travel service, all in one place.", error: "This section could not be loaded.", retry: "Try again",
  },
};

export const ESIM_CONTENT: Localized<ServiceCopy> = {
  tr: { eyebrow: "Seyahat eSIM’i", headline: "Seyahatinde internetsiz kalma", description: "Rotanı ve kullanımını seç, sana uygun eSIM seçeneğini kolayca bul.", cta: "eSIM’imi bul", offerTitle: "Dijital bağlantı", offerValue: "Fiziksel SIM gerekmez", offerMeta: "QR ile kolay kurulum", finderTitle: "Sana uygun eSIM’i bul", finderDescription: "Seyahat şekline göre seçimlerini yap.", popularTitle: "Popüler eSIM destinasyonları", popularDescription: "Seyahat planlarında sık seçilen yerler ve rotalar.", pricingTitle: "İhtiyacına göre seçenekler", pricingDescription: "Paketler yayınlandığında süre, internet ve kapsama göre karşılaştır.", educationTitle: "eSIM hakkında merak ettiklerin", finalTitle: "Yola çıkmadan bağlantını planla", finalDescription: "Destinasyonunu seç ve finder ile ihtiyacını belirle.", emptyProducts: "Bu destinasyon için henüz uygun paket bulunamadı.", crossSellTitle: "Havalimanında da rahat et", crossSellDescription: "Uçuş planın uygunsa Lounge seçeneklerini de seyahatine ekleyebilirsin." },
  de: { eyebrow: "Reise-eSIM", headline: "Unterwegs verbunden bleiben", description: "Route und Nutzung wählen und die passende eSIM einfach finden.", cta: "eSIM finden", offerTitle: "Digitale Verbindung", offerValue: "Keine physische SIM nötig", offerMeta: "Einfache QR-Einrichtung", finderTitle: "Passende eSIM finden", finderDescription: "Wähle passend zu deiner Reise.", popularTitle: "Beliebte eSIM-Reiseziele", popularDescription: "Häufig gewählte Ziele und Routen.", pricingTitle: "Optionen nach Bedarf", pricingDescription: "Nach Veröffentlichung nach Laufzeit, Daten und Abdeckung vergleichen.", educationTitle: "Wissenswertes zur eSIM", finalTitle: "Verbindung vor der Reise planen", finalDescription: "Ziel wählen und Bedarf im Finder bestimmen.", emptyProducts: "Für dieses Reiseziel gibt es noch kein passendes Paket.", crossSellTitle: "Auch am Flughafen entspannen", crossSellDescription: "Wenn es zu deinem Flug passt, ergänze deine Reise später um eine Lounge." },
  en: { eyebrow: "Travel eSIM", headline: "Stay connected wherever you go", description: "Choose your route and usage to find the right eSIM with ease.", cta: "Find my eSIM", offerTitle: "Digital connection", offerValue: "No physical SIM needed", offerMeta: "Easy QR setup", finderTitle: "Find your ideal eSIM", finderDescription: "Make choices based on your trip.", popularTitle: "Popular eSIM destinations", popularDescription: "Frequently selected destinations and routes.", pricingTitle: "Options for every need", pricingDescription: "Once published, compare by duration, data and coverage.", educationTitle: "Everything about eSIM", finalTitle: "Plan your connection before departure", finalDescription: "Choose a destination and define your needs in the finder.", emptyProducts: "No suitable package is available for this destination yet.", crossSellTitle: "Make the airport more comfortable", crossSellDescription: "When relevant to your flight, you can also add a Lounge to your trip." },
};

export const LOUNGE_CONTENT: Localized<ServiceCopy> = {
  tr: { eyebrow: "Havalimanı Lounge", headline: "Uçuş öncesi sakin bir mola", description: "Havalimanını ve uçuş durumunu seç, sana uygun Lounge seçeneklerini keşfet.", cta: "Lounge bul", offerTitle: "Konforlu bekleyiş", offerValue: "Uçuşuna uygun seçim", offerMeta: "Havalimanı ve terminal bazlı", finderTitle: "Sana uygun Lounge’u bul", finderDescription: "Uçuş bilgilerine göre seçimlerini yap.", popularTitle: "Popüler havalimanları ve Lounge’lar", popularDescription: "Seyahatlerde sık aranan havalimanları.", pricingTitle: "Uçuşuna göre Lounge seçenekleri", pricingDescription: "Seçenekler yayınlandığında süre, olanaklar ve kişi fiyatını karşılaştır.", educationTitle: "Lounge deneyimi nasıl çalışır?", finalTitle: "Uçuşuna iyi bir başlangıç yap", finalDescription: "Havalimanını seç ve Lounge finder ile ihtiyacını belirle.", emptyProducts: "Bu havalimanı için şu anda uygun Lounge bulunamadı.", crossSellTitle: "İndiğinde bağlantın hazır olsun", crossSellDescription: "Destinasyonuna uygun bir eSIM, seyahatinin devamını kolaylaştırabilir." },
  de: { eyebrow: "Airport Lounge", headline: "Eine ruhige Pause vor dem Flug", description: "Flughafen und Flugsituation wählen und passende Lounges entdecken.", cta: "Lounge finden", offerTitle: "Entspannt warten", offerValue: "Passend zu deinem Flug", offerMeta: "Nach Flughafen und Terminal", finderTitle: "Passende Lounge finden", finderDescription: "Wähle anhand deiner Flugdaten.", popularTitle: "Beliebte Flughäfen und Lounges", popularDescription: "Häufig gesuchte Flughäfen.", pricingTitle: "Lounges passend zum Flug", pricingDescription: "Nach Veröffentlichung Dauer, Leistungen und Preis pro Person vergleichen.", educationTitle: "So funktioniert die Lounge", finalTitle: "Entspannt in den Flug starten", finalDescription: "Flughafen wählen und Bedarf im Finder bestimmen.", emptyProducts: "Für diesen Flughafen ist derzeit keine Lounge verfügbar.", crossSellTitle: "Bei Ankunft verbunden sein", crossSellDescription: "Eine passende eSIM kann die Weiterreise einfacher machen." },
  en: { eyebrow: "Airport Lounge", headline: "A calmer pause before your flight", description: "Choose your airport and flight situation to discover suitable Lounges.", cta: "Find a Lounge", offerTitle: "Comfortable waiting", offerValue: "Matched to your flight", offerMeta: "Airport and terminal based", finderTitle: "Find your ideal Lounge", finderDescription: "Make choices based on your flight.", popularTitle: "Popular airports and Lounges", popularDescription: "Frequently searched airports for upcoming trips.", pricingTitle: "Lounge options for your flight", pricingDescription: "Once published, compare duration, amenities and price per person.", educationTitle: "How does a Lounge visit work?", finalTitle: "Start your flight feeling refreshed", finalDescription: "Choose an airport and define your needs in the finder.", emptyProducts: "No suitable Lounge is currently available at this airport.", crossSellTitle: "Be connected when you land", crossSellDescription: "A destination eSIM can make the rest of your journey easier." },
};

export function localized<T>(content: Localized<T>, locale: Locale): T {
  return mergeFallback(content.tr, content[locale]);
}

function mergeFallback<T>(fallback: T, selected: T | undefined): T {
  if (selected === undefined || selected === null) return fallback;
  if (Array.isArray(fallback)) return selected;
  if (typeof fallback !== "object" || fallback === null || typeof selected !== "object") return selected;
  const merged: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
  for (const key of Object.keys(merged)) {
    merged[key] = mergeFallback(merged[key], (selected as Record<string, unknown>)[key]);
  }
  return merged as T;
}
