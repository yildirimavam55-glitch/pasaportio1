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
    trust: ["Güvenli ödeme", "Hızlı dijital teslimat", "Seyahat boyunca destek"],
    footer: "Seyahatin için doğru hizmet, tek bir yerde.", error: "Bu bölüm şu anda yüklenemedi.", retry: "Tekrar dene",
  },
  de: {
    nav: { esim: "eSIM", lounge: "Lounge", destinations: "Reiseziele", how: "So funktioniert’s", support: "Hilfe", account: "Konto", plan: "Reise planen" },
    mobile: { home: "Startseite", esim: "eSIM finden", lounge: "Lounge finden", account: "Mein Konto" },
    language: { label: "Sprache wählen", tr: "Türkçe", de: "Deutsch", en: "English" },
    trust: ["Sichere Zahlung", "Schnelle digitale Zustellung", "Support auf deiner Reise"],
    footer: "Der passende Reiseservice an einem Ort.", error: "Dieser Bereich konnte nicht geladen werden.", retry: "Erneut versuchen",
  },
  en: {
    nav: { esim: "eSIM", lounge: "Lounge", destinations: "Destinations", how: "How it works", support: "Support", account: "Account", plan: "Plan your trip" },
    mobile: { home: "Home", esim: "Find eSIM", lounge: "Find Lounge", account: "My Account" },
    language: { label: "Choose language", tr: "Türkçe", de: "Deutsch", en: "English" },
    trust: ["Secure payment", "Fast digital delivery", "Support throughout your trip"],
    footer: "The right travel service, all in one place.", error: "This section could not be loaded.", retry: "Try again",
  },
};

export const ESIM_CONTENT: Localized<ServiceCopy> = {
  tr: { eyebrow: "Seyahat eSIM’i", headline: "Seyahatinde internetsiz kalma", description: "Dünyanın her yerinde sana uygun eSIM’i kolayca bul.", cta: "eSIM’imi bul →", offerTitle: "Dijital bağlantı", offerValue: "Fiziksel SIM gerekmez", offerMeta: "QR ile kolay kurulum", finderTitle: "için eSIM bul", finderDescription: "Seyahat planına göre en uygun eSIM’i seç.", popularTitle: "Popüler eSIM destinasyonları", popularDescription: "Seyahat planlarında sık seçilen yerler ve rotalar.", pricingTitle: "İhtiyacına göre seçenekler", pricingDescription: "Süre, internet ve kapsama göre sana uygun seçeneği karşılaştır.", educationTitle: "eSIM hakkında merak ettiklerin", finalTitle: "Yola çıkmadan bağlantını planla", finalDescription: "Destinasyonunu seç ve ihtiyacını birkaç adımda belirle.", emptyProducts: "Bu destinasyon için şu anda uygun eSIM bulunamadı.", crossSellTitle: "Uçuş öncesi biraz rahatla", crossSellDescription: "Uçuş planın uygunsa Lounge seçeneklerini de seyahatine ekleyebilirsin." },
  de: { eyebrow: "Reise-eSIM", headline: "Unterwegs verbunden bleiben", description: "Finde die passende eSIM für deine Reise – einfach und weltweit.", cta: "eSIM finden →", offerTitle: "Digitale Verbindung", offerValue: "Keine physische SIM nötig", offerMeta: "Einfache QR-Einrichtung", finderTitle: "eSIM für", finderDescription: "Wähle passend zu deiner Reise.", popularTitle: "Beliebte eSIM-Reiseziele", popularDescription: "Häufig gewählte Ziele und Routen.", pricingTitle: "Optionen nach Bedarf", pricingDescription: "Vergleiche Laufzeit, Datenvolumen und Abdeckung passend zu deiner Reise.", educationTitle: "Wissenswertes zur eSIM", finalTitle: "Verbindung vor der Reise planen", finalDescription: "Ziel wählen und deinen Bedarf in wenigen Schritten bestimmen.", emptyProducts: "Für dieses Reiseziel ist derzeit keine passende eSIM verfügbar.", crossSellTitle: "Vor dem Flug entspannen", crossSellDescription: "Wenn es zu deinem Flug passt, ergänze deine Reise um eine Lounge." },
  en: { eyebrow: "Travel eSIM", headline: "Stay connected wherever you go", description: "Find the right eSIM for your trip, anywhere in the world.", cta: "Find my eSIM →", offerTitle: "Digital connection", offerValue: "No physical SIM needed", offerMeta: "Easy QR setup", finderTitle: "eSIM for", finderDescription: "Make choices based on your trip.", popularTitle: "Popular eSIM destinations", popularDescription: "Frequently selected destinations and routes.", pricingTitle: "Options for every need", pricingDescription: "Compare duration, data and coverage for your trip.", educationTitle: "Everything about eSIM", finalTitle: "Plan your connection before departure", finalDescription: "Choose a destination and define your needs in a few steps.", emptyProducts: "No suitable eSIM is currently available for this destination.", crossSellTitle: "Relax before your flight", crossSellDescription: "When it fits your flight, add a Lounge to your journey." },
};

export const LOUNGE_CONTENT: Localized<ServiceCopy> = {
  tr: { eyebrow: "Havalimanı Lounge", headline: "Seyahatinde konforu yanına al", description: "Dünyanın dört bir yanındaki havalimanı lounge’larında rahatla, yolculuğunu keyfe dönüştür.", cta: "Lounge bul →", offerTitle: "Konforlu bekleyiş", offerValue: "Uçuşuna uygun seçim", offerMeta: "Havalimanı ve terminal bazlı", finderTitle: "Sana uygun lounge’u bul", finderDescription: "Seyahat planına göre en iyi lounge deneyimini keşfet.", popularTitle: "Popüler havalimanları ve Lounge’lar", popularDescription: "Seyahatlerde sık aranan havalimanları.", pricingTitle: "Uçuşuna göre Lounge seçenekleri", pricingDescription: "Süreyi, olanakları ve kişi fiyatını kolayca karşılaştır.", educationTitle: "Lounge deneyimi nasıl çalışır?", finalTitle: "Uçuşuna iyi bir başlangıç yap", finalDescription: "Havalimanını seç ve ihtiyacını birkaç adımda belirle.", emptyProducts: "Bu havalimanı için şu anda uygun Lounge bulunamadı.", crossSellTitle: "İndiğinde bağlantın hazır olsun", crossSellDescription: "Destinasyonuna uygun bir eSIM, seyahatinin devamını kolaylaştırabilir." },
  de: { eyebrow: "Airport Lounge", headline: "Komfort für deine Reise", description: "Entspanne in Airport Lounges weltweit und verwandle deine Reise in ein Erlebnis.", cta: "Lounge finden →", offerTitle: "Entspannt warten", offerValue: "Passend zu deinem Flug", offerMeta: "Nach Flughafen und Terminal", finderTitle: "Passende Lounge finden", finderDescription: "Wähle anhand deiner Flugdaten.", popularTitle: "Beliebte Flughäfen und Lounges", popularDescription: "Häufig gesuchte Flughäfen.", pricingTitle: "Lounges passend zum Flug", pricingDescription: "Vergleiche Dauer, Leistungen und Preis pro Person.", educationTitle: "So funktioniert die Lounge", finalTitle: "Entspannt in den Flug starten", finalDescription: "Flughafen wählen und deinen Bedarf in wenigen Schritten bestimmen.", emptyProducts: "Für diesen Flughafen ist derzeit keine Lounge verfügbar.", crossSellTitle: "Bei Ankunft verbunden sein", crossSellDescription: "Eine passende eSIM kann die Weiterreise einfacher machen." },
  en: { eyebrow: "Airport Lounge", headline: "Take comfort with you", description: "Relax in airport lounges around the world and turn your journey into an experience.", cta: "Find a Lounge →", offerTitle: "Comfortable waiting", offerValue: "Matched to your flight", offerMeta: "Airport and terminal based", finderTitle: "Find your ideal Lounge", finderDescription: "Make choices based on your flight.", popularTitle: "Popular airports and Lounges", popularDescription: "Frequently searched airports for upcoming trips.", pricingTitle: "Lounge options for your flight", pricingDescription: "Compare duration, amenities and price per person.", educationTitle: "How does a Lounge visit work?", finalTitle: "Start your flight feeling refreshed", finalDescription: "Choose an airport and define your needs in a few steps.", emptyProducts: "No suitable Lounge is currently available at this airport.", crossSellTitle: "Be connected when you land", crossSellDescription: "A destination eSIM can make the rest of your journey easier." },
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
