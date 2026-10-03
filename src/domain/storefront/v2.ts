import { translateString } from "@/i18n/overlay";
import { getActiveUiLocale } from "@/i18n/overlay";
import { UI_LOCALES, type UiLocale } from "@/i18n/locales";
import { designV2ToPublic } from "./public-routes";
/**
 * V2 storefront builder — presentation-only configuration for the V2 service homepages.
 * Commerce (search logic, catalogue, prices, cart, availability) stays in code; this
 * config only decides which content sections show, in which order, with which copy/media.
 */
import type { Locale } from "@/domain/enums";
import { ICON_NAMES } from "@/domain/storefront/icons";
import { POPULAR_COUNTRIES } from "@/domain/geo/countries";
import { getAirport, POPULAR_AIRPORT_IDS } from "@/domain/geo/airports";
import { DISCOVERY_COPY, ESIM_COPY, LOUNGE_COPY, VIGNETTE_COPY } from "@/domain/storefront/v2-copy";
import { TRUST_EDITORIAL } from "./trust-editorial";
import { TRUST_TRANSLATIONS } from "@/i18n/trust-translations";

export const V2_PAGES = ["esim", "lounge", "vignette"] as const;
export type V2PageId = (typeof V2_PAGES)[number];
export const V2_LOCALES = ["tr", "de", "en"] as const;
export type LT = Record<Locale, string> & Partial<Record<UiLocale, string>>;

export const V2_SECTION_TYPES = [
  "SEARCH_HERO",
  "BENEFIT_ROW",
  "DESTINATION_CAROUSEL",
  "TRUST_REVIEWS",
  "INFO_CAROUSEL",
  "REGION_DISCOVERY",
  "NOTICE",
  "INFO_GRID",
  "HOW_IT_WORKS",
  "INSTALLATION_STEPS",
  "COMPATIBILITY",
  "PROMO_BANNER",
  "GUIDE_CAROUSEL",
  "FAQ",
  "SPACER",
] as const;
export type V2SectionType = (typeof V2_SECTION_TYPES)[number];

/** Search hero carries the core search: editable copy/media, never hidden, removed or moved. */
export const V2_PROTECTED: readonly V2SectionType[] = ["SEARCH_HERO"];
/** Sections tied to live catalogue data or a single page capability — not duplicable. */
export const V2_SINGLETON: readonly V2SectionType[] = ["SEARCH_HERO", "DESTINATION_CAROUSEL", "TRUST_REVIEWS", "INFO_CAROUSEL", "REGION_DISCOVERY", "COMPATIBILITY", "GUIDE_CAROUSEL"];
export const V2_ADDABLE: readonly V2SectionType[] = ["BENEFIT_ROW", "PROMO_BANNER", "NOTICE", "INFO_GRID", "HOW_IT_WORKS", "INSTALLATION_STEPS", "FAQ", "SPACER"];

/** Internal destinations a CMS link may point to. Nothing else is accepted. */
export const V2_SAFE_LINKS = [
  "/esim",
  "/lounge",
  "/vignette",
  "/destek",
  "/esim/kurulum",
  "/sepet",
  "/account",
] as const;
export type V2SafeLink = (typeof V2_SAFE_LINKS)[number];

/** Images bundled with the app, referenced as `builtin:<key>`. */
export const V2_BUILTIN_MEDIA = ["esim-hero", "lounge-hero", "vignette-hero", "lounge-card", "esim-cross-sell", "info-products", "info-roaming", "info-delivery", "info-install", "info-payment", "info-support", "trust-refund", "trust-traveler", "trust-demo-giulia", "trust-demo-haruto", "trust-demo-emily", "trust-benefit-globe", "trust-benefit-refund", "trust-benefit-install", "trust-benefit-payment"] as const;

/** Existing trust cards from before image editing receive their approved visuals once on read. */
const TRUST_BENEFIT_MEDIA: Record<string, string> = {
  "trust-countries": "builtin:trust-benefit-globe",
  "trust-refund": "builtin:trust-benefit-refund",
  "trust-install": "builtin:trust-benefit-install",
  "trust-payment": "builtin:trust-benefit-payment",
};

export const V2_HEIGHTS = ["compact", "normal", "tall"] as const;
export const V2_OVERLAYS = ["light", "normal", "strong"] as const;
export const V2_ALIGNS = ["left", "center"] as const;

export type V2Item = {
  id: string;
  visible: boolean;
  icon: string;
  /** Country ISO / airport IATA for destination carousels. */
  entity: string;
  title: LT;
  text: LT;
  internalKey: string;
  cardType: string;
  mediaId: string | null;
  visualMode?: "ICON" | "CUSTOM_IMAGE";
  imageScale?: 80 | 100 | 120 | 140 | 160;
  position?: "top-right" | "middle-left" | "bottom-right";
  href: V2SafeLink | "";
  labels: LT[];
  cta: LT;
  imageAlt: LT;
  focalX: number;
  focalY: number;
  rating: number;
  verified: boolean;
  published: boolean;
  reviewType?: "REAL" | "DEMO" | "EDITORIAL";
  reviewStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  originalLanguage?: UiLocale;
  countryCode?: string;
  reviewDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type V2Section = {
  id: string;
  type: V2SectionType;
  visible: boolean;
  /** Lounge: also shown under airport results. */
  showOnResults: boolean;
  variant: string;
  align: (typeof V2_ALIGNS)[number];
  height: (typeof V2_HEIGHTS)[number];
  overlay: (typeof V2_OVERLAYS)[number];
  mediaId: string | null;
  mobileMediaId: string | null;
  href: V2SafeLink;
  startsAt: string;
  endsAt: string;
  text: Record<string, LT>;
  items: V2Item[];
  showDots: boolean;
  showArrows: boolean;
  cardGap: "compact" | "normal" | "wide";
  mobilePreview: "compact" | "normal" | "wide";
  claims: { countries: string; refundDays: string; savingPercent: string; setupSeconds: string };
  showDemoReviews?: boolean;
  trust?: {
    background: "mint" | "cream" | "white";
    focal: "left" | "center" | "right";
    ratingMode: "real" | "manual" | "off";
    manualRating: number;
    maxRating: number;
    manualCaption: LT;
    autoplay: boolean;
    whyEnabled: boolean;
    comparisonEnabled: boolean;
    comparisonPreviewOnly: boolean;
    illustrationId: string | null;
  };
};

export type V2PageConfig = { version: 1; page: V2PageId; sections: V2Section[] };

export const V2_SECTION_LABELS: Record<V2SectionType, string> = {
  SEARCH_HERO: "Arama hero",
  BENEFIT_ROW: "Avantaj satırı",
  DESTINATION_CAROUSEL: "Popüler destinasyonlar",
  TRUST_REVIEWS: "Güven ve yorumlar",
  INFO_CAROUSEL: "eSIM bilgi kartları",
  REGION_DISCOVERY: "Bölgesel paketler",
  NOTICE: "Bilgi kutusu",
  INFO_GRID: "Bilgi kartları",
  HOW_IT_WORKS: "Nasıl çalışır",
  INSTALLATION_STEPS: "Kurulum adımları",
  COMPATIBILITY: "Cihaz uyumluluğu",
  PROMO_BANNER: "Promosyon bannerı",
  GUIDE_CAROUSEL: "Rehberler",
  FAQ: "SSS",
  SPACER: "Boşluk",
};

/** Text fields each section type exposes in the editor (key → admin label). */
export const V2_TEXT_FIELDS: Record<V2SectionType, Array<[string, string]>> = {
  SEARCH_HERO: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["subtitle", "Alt başlık"], ["placeholder", "Arama metni"], ["sticky", "Sabit arama metni"]],
  BENEFIT_ROW: [],
  DESTINATION_CAROUSEL: [["title", "Başlık"]],
  TRUST_REVIEWS: [["eyebrow", "Güven etiketi"], ["title", "Başlık"], ["accent", "Yeşil başlık satırı"], ["subtitle", "Açıklama"], ["imageAlt", "Seyahat görseli alt metni"], ["cta", "Buton metni"], ["whyEyebrow", "Neden Travely üst başlığı"], ["whyTitle", "Neden Travely başlığı"], ["whyDescription", "Neden Travely açıklaması"], ["statistic", "Ana istatistik"], ["statisticLabel", "İstatistik etiketi"], ["comparisonTitle", "Karşılaştırma başlığı"], ["comparisonALabel", "Birinci fiyat etiketi"], ["comparisonAValue", "Birinci fiyat"], ["comparisonBLabel", "İkinci fiyat etiketi"], ["comparisonBValue", "İkinci fiyat"], ["comparisonHighlight", "Karşılaştırma vurgusu"], ["comparisonFootnote", "Karşılaştırma dipnotu"]],
  INFO_CAROUSEL: [["title", "Başlık"], ["subtitle", "Alt başlık"]],
  REGION_DISCOVERY: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["lead", "Açıklama"], ["worldwide", "Dünya bannerı"], ["cta", "Buton metni"]],
  NOTICE: [["title", "Başlık"], ["text", "Metin"]],
  INFO_GRID: [["title", "Başlık"]],
  HOW_IT_WORKS: [["title", "Başlık"]],
  INSTALLATION_STEPS: [["title", "Başlık"], ["subtitle", "Alt başlık"], ["ready", "Hazır etiketi"], ["adding", "Ekleniyor etiketi"], ["cta", "Buton metni"]],
  COMPATIBILITY: [["title", "Başlık"]],
  PROMO_BANNER: [["title", "Başlık"], ["subtitle", "Alt başlık"]],
  GUIDE_CAROUSEL: [["title", "Başlık"], ["lead", "Açıklama"], ["all", "Tümü bağlantısı"]],
  FAQ: [["title", "Başlık"]],
  SPACER: [],
};

/** How items of a section are edited: title-only, title+text, question/answer, destination. */
export const V2_ITEM_MODE: Partial<Record<V2SectionType, "benefit" | "card" | "faq" | "destination" | "step" | "info">> = {
  BENEFIT_ROW: "benefit",
  INFO_GRID: "card",
  HOW_IT_WORKS: "card",
  INSTALLATION_STEPS: "step",
  FAQ: "faq",
  DESTINATION_CAROUSEL: "destination",
  INFO_CAROUSEL: "info",
};

const lt = (tr: string, de: string, en: string): LT => ({ tr, de, en });
const from3 = <K extends string>(copy: Record<Locale, Record<K, unknown>>, key: K): LT =>
  lt(String(copy.tr[key] ?? ""), String(copy.de[key] ?? ""), String(copy.en[key] ?? ""));
const same = (value: string): LT => lt(value, value, value);

const defaultTrust = () => ({ background: "mint" as const, focal: "right" as const, ratingMode: "manual" as const, manualRating: 4.8, maxRating: 5, manualCaption: lt("Örnek puan · müşteri değerlendirmesi değildir", "Beispielbewertung · keine Kundenbewertung", "Sample rating · not a customer rating"), autoplay: false, whyEnabled: true, comparisonEnabled: false, comparisonPreviewOnly: true, illustrationId: null });

function section(id: string, type: V2SectionType, patch: Partial<V2Section> = {}): V2Section {
  return {
    id,
    type,
    visible: true,
    showOnResults: false,
    variant: "default",
    align: "left",
    height: "normal",
    overlay: "normal",
    mediaId: null,
    mobileMediaId: null,
    href: "/esim",
    startsAt: "",
    endsAt: "",
    text: {},
    items: [],
    showDots: true,
    showArrows: true,
    cardGap: "normal",
    mobilePreview: "normal",
    claims: { countries: "190+", refundDays: "14", savingPercent: "60", setupSeconds: "60" },
    showDemoReviews: false,
    ...(type === "TRUST_REVIEWS" ? { trust: defaultTrust() } : {}),
    ...patch,
  };
}

const item = (id: string, patch: Partial<V2Item> = {}): V2Item => ({ id, visible: true, icon: "", entity: "", title: same(""), text: same(""), internalKey: id, cardType: "products", mediaId: null, href: "", labels: [], cta: same(""), imageAlt: same(""), focalX: 50, focalY: 50, rating: 5, verified: false, published: false, ...patch });

export function editorialReviewCards(): V2Item[] {
  return TRUST_EDITORIAL.map((entry) => item(`editorial-${entry.id}`, {
    cardType: "review", title: same(entry.name), text: entry.text, countryCode: entry.country,
    rating: entry.rating, originalLanguage: "en", reviewType: "EDITORIAL", reviewStatus: "PUBLISHED",
    verified: false, published: false, reviewDate: "", createdAt: "", updatedAt: "",
  }));
}

const withTrustLocales = (value: LT): LT => {
  const translated = { ...value };
  for (const locale of UI_LOCALES) {
    if (locale === "tr" || locale === "de" || locale === "en" || translated[locale]?.trim()) continue;
    const fallback = TRUST_TRANSLATIONS[locale]?.[value.en];
    if (fallback) translated[locale] = fallback;
  }
  return translated;
};

const localizeTrustSection = (section: V2Section): V2Section => ({
  ...section,
  text: Object.fromEntries(Object.entries(section.text).map(([key, value]) => [key, withTrustLocales(value)])),
  items: section.items.map((entry) => ({ ...entry, title: withTrustLocales(entry.title), text: entry.reviewType === "EDITORIAL" ? entry.text : withTrustLocales(entry.text) })),
  ...(section.trust ? { trust: { ...section.trust, manualCaption: withTrustLocales(section.trust.manualCaption) } } : {}),
});

/** Editor-only upgrade of legacy demo fixtures; saved deletions are never re-seeded. */
export function withEditorialStarters(config: V2PageConfig): V2PageConfig {
  const trust = config.sections.find((section) => section.type === "TRUST_REVIEWS");
  if (!trust) return config;
  return { ...config, sections: config.sections.map((section) => section !== trust ? section : {
    ...localizeTrustSection(section),
    ...(trust.items.some((entry) => entry.reviewType === "DEMO") && !trust.items.some((entry) => entry.reviewType === "EDITORIAL")
      ? { items: [...localizeTrustSection(section).items.filter((entry) => entry.reviewType !== "DEMO"), ...editorialReviewCards()], showDemoReviews: true,
          trust: { ...section.trust, ratingMode: "manual", manualRating: 4.8, manualCaption: withTrustLocales(defaultTrust().manualCaption) } as NonNullable<V2Section["trust"]> }
      : {}),
  }) };
}

const infoCard = (id: string, cardType: string, mediaId: string, title: LT, text: LT, labels: LT[] = [], href: V2SafeLink | "" = "") =>
  item(id, { internalKey: id, cardType, mediaId, title, text, labels, href, imageAlt: title });

type Pair = readonly [string, string];
function listItems(prefix: string, copy: Record<Locale, readonly unknown[]>, map: (value: any) => { title: string; text: string }): V2Item[] {
  return copy.tr.map((_, index) => {
    const at = (locale: Locale) => map(copy[locale][index] ?? copy.tr[index]);
    return item(`${prefix}-${index + 1}`, {
      title: lt(at("tr").title, at("de").title, at("en").title),
      text: lt(at("tr").text, at("de").text, at("en").text),
    });
  });
}

const guides = () =>
  section("guides", "GUIDE_CAROUSEL", {
    showOnResults: true,
    text: { title: from3(DISCOVERY_COPY, "guides"), lead: from3(DISCOVERY_COPY, "guideLead"), all: from3(DISCOVERY_COPY, "allGuides") },
  });

function esimDefault(): V2Page {
  const c = ESIM_COPY;
  const faqIndexes = [0, 1, 2, 3, 5];
  const faqCopy = { tr: faqIndexes.map((i) => DISCOVERY_COPY.tr.questions[i]!), de: faqIndexes.map((i) => DISCOVERY_COPY.de.questions[i]!), en: faqIndexes.map((i) => DISCOVERY_COPY.en.questions[i]!) };
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:esim-hero", text: { eyebrow: same("eSIM"), title: from3(c, "h"), subtitle: from3(c, "q"), placeholder: from3(c, "ph"), sticky: from3(c, "stickyPh") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("delivery", { icon: "Zap", title: from3(c, "benefitDelivery") }),
        item("refund", { icon: "ShieldCheck", title: from3(c, "benefitRefund") }),
        item("setup", { icon: "Smartphone", title: from3(c, "setup") }),
        item("support", { icon: "Headphones", title: from3(c, "support") }),
      ],
    }),
    section("popular", "DESTINATION_CAROUSEL", {
      variant: "country",
      text: { title: from3(c, "popular") },
      items: POPULAR_COUNTRIES.slice(0, 10).map((country) => item(`c-${country.iso}`, { entity: country.iso })),
    }),
    localizeTrustSection(section("trust-reviews", "TRUST_REVIEWS", {
      mediaId: "builtin:trust-traveler",
      showDemoReviews: true,
      trust: defaultTrust(),
      text: {
        eyebrow: lt("Seyahat edenler için geliştirildi", "Für Reisende entwickelt", "Built for travellers"),
        title: lt("Gerçek yolculuklar.", "Echte Reisende.", "Real travellers."),
        accent: lt("Gerçek deneyimler.", "Echte Erfahrungen.", "Real experiences."),
        subtitle: lt("Şehir gezisi, sırt çantalı yolculuk veya iş seyahati — eSIM’lerimiz 190’dan fazla ülkede yolculuğuna eşlik eder.", "Ob Städtetrip, Backpacking oder Geschäftsreise – unsere eSIMs begleiten Reisende in über 190 Ländern.", "From city breaks and backpacking to business travel, our eSIMs keep travellers connected in over 190 countries."),
        imageAlt: lt("Akdeniz kıyısındaki şehri seyreden gezgin", "Reisende mit Blick auf eine mediterrane Küstenstadt", "Traveller overlooking a Mediterranean coastal city"),
        cta: lt("Seyahat noktası seç", "Reiseziel wählen", "Choose destination"),
        whyEyebrow: lt("Neden Travely?", "Warum Travely?", "Why Travely?"),
        whyTitle: lt("Daha az risk. Daha uygun internet. Daha kolay seyahat.", "Weniger Risiko. Günstigeres Internet. Einfacher reisen.", "Less risk. Better-value internet. Easier travel."),
        whyDescription: lt("eSIM paketini seç, fiyatını baştan gör ve birkaç adımda bağlantıya hazır ol.", "eSIM-Paket wählen, den Preis vorab sehen und in wenigen Schritten verbunden sein.", "Choose an eSIM plan, see the price up front and get connected in a few steps."),
        comparisonTitle: lt("Roaming’e alternatif", "Die Alternative zum Roaming", "An alternative to roaming"),
        comparisonFootnote: same(""), statistic: same(""), statisticLabel: same(""), comparisonALabel: same(""), comparisonAValue: same(""), comparisonBLabel: same(""), comparisonBValue: same(""), comparisonHighlight: same(""),
      },
      items: [
        item("chip-setup", { cardType: "chip", position: "top-right", icon: "Zap", title: lt("60 saniyede kurulum", "In 60 Sekunden installiert", "Installed in 60 seconds"), text: lt("Doğrudan cihazında", "Direkt auf deinem Gerät", "Directly on your device") }),
        item("chip-plans", { cardType: "chip", position: "middle-left", icon: "Globe2", title: lt("Esnek paketler", "Flexible Pakete", "Flexible plans"), text: lt("Her yolculuk için", "Für jede Reise", "For every trip") }),
        item("chip-travel", { cardType: "chip", position: "bottom-right", icon: "Sparkles", title: lt("Tatil, iş ve daha fazlası için", "Für Urlaub, Business & mehr", "For holidays, business & more") }),
        item("trust-countries", { cardType: "trust", icon: "Globe2", visualMode: "CUSTOM_IMAGE", mediaId: TRUST_BENEFIT_MEDIA["trust-countries"] ?? null, title: lt("190+ ülke", "190+ Länder", "190+ countries"), text: lt("Dünya çapında bağlantı", "Weltweit verbunden", "Connected worldwide") }),
        item("trust-refund", { cardType: "trust", icon: "RotateCcw", visualMode: "CUSTOM_IMAGE", mediaId: TRUST_BENEFIT_MEDIA["trust-refund"] ?? null, title: lt("14 gün iade güvencesi", "14 Tage Rückgabegarantie", "14-Day Refund Guarantee"), text: lt("Kullanılmamış eSIM’lerde, satın almadan itibaren 14 gün", "Für ungenutzte eSIMs, 14 Tage ab Kauf", "For unused eSIMs, within 14 days of purchase") }),
        item("trust-install", { cardType: "trust", icon: "Zap", visualMode: "CUSTOM_IMAGE", mediaId: TRUST_BENEFIT_MEDIA["trust-install"] ?? null, title: lt("60 saniyede kurulum", "In 60 Sekunden installiert", "Installed in 60 seconds"), text: lt("Doğrudan cihazında", "Direkt auf deinem Gerät", "Directly on your device") }),
        item("trust-payment", { cardType: "trust", icon: "LockKeyhole", visualMode: "CUSTOM_IMAGE", imageScale: 140, mediaId: TRUST_BENEFIT_MEDIA["trust-payment"] ?? null, title: lt("Güvenli ödeme", "Sicher bezahlen", "Secure payment"), text: lt("Güvenilir ödeme yöntemleri", "Vertrauenswürdige Zahlungsmethoden", "Trusted payment methods") }),
        ...editorialReviewCards(),
      ],
    })),
    section("regions", "REGION_DISCOVERY", { text: { eyebrow: from3(c, "regionalEyebrow"), title: from3(c, "regionalTitle"), lead: from3(c, "regionalHomeLead"), worldwide: from3(c, "worldwideBanner"), cta: from3(c, "discoverPlans") } }),
    section("esim-info", "INFO_CAROUSEL", {
      text: {
        title: lt("eSIM hakkında merak ettiklerin", "Alles, was du über eSIM wissen solltest", "Everything you need to know about eSIM"),
        subtitle: lt("Seyahatten önce bilmen gereken her şey. Kolay, güvenli ve hızlı.", "Alles Wichtige vor deiner Reise. Einfach, sicher und schnell.", "Everything you need before your trip. Simple, secure and fast."),
      },
      items: [
        infoCard("products", "products", "builtin:info-products", lt("eSIM ürünlerimiz", "Unsere eSIM-Pakete", "Our eSIM plans"), lt("190+ ülkede internet, limitsiz paketler ve bölgesel paketlerle seyahatinde bağlantıda kal.", "Internet in über 190 Ländern – mit Datenpaketen, Unlimited-Optionen und regionalen Paketen.", "Stay connected in 190+ countries with data plans, unlimited options and regional packages."), [lt("190+ ülke", "190+ Länder", "190+ countries"), lt("Limitsiz paketler", "Unlimited-Pakete", "Unlimited plans"), lt("Bölgesel paketler", "Regionale Pakete", "Regional plans")]),
        infoCard("refund", "refund", "builtin:trust-refund", lt("14 gün iade güvencesi", "14 Tage Rückgabegarantie", "14-day refund guarantee"), lt("eSIM’inizi kullanmadıysanız, satın alma tarihinden itibaren 14 gün içinde iade talep edebilirsiniz.", "Wenn die eSIM noch nicht genutzt wurde, können Sie innerhalb von 14 Tagen nach dem Kauf eine Rückgabe beantragen.", "If the eSIM has not been used, you can request a refund within 14 days of purchase."), [], "/account"),
        infoCard("roaming", "roaming", "builtin:info-roaming", lt("Roaming’e alternatif", "Alternative zum Roaming", "An alternative to roaming"), lt("Roaming’e alternatif, seyahatinize uygun eSIM paketlerini keşfedin.", "Entdecke als Alternative zum Roaming eSIM-Pakete, die zu deiner Reise passen.", "Discover eSIM plans that suit your trip as an alternative to roaming."), []),
        infoCard("delivery", "delivery", "builtin:info-delivery", lt("Anında teslimat", "Sofort verfügbar", "Instant delivery"), lt("Satın alma tamamlandıktan sonra eSIM bilgilerin hemen profilinde hazır.", "Nach dem Kauf stehen deine eSIM-Daten sofort in deinem Profil bereit.", "Once your purchase is complete, your eSIM details are immediately available in your profile."), [lt("Profilinde hazır", "In deinem Profil verfügbar", "Ready in your profile")], "/account"),
        infoCard("setup", "setup", "builtin:info-install", lt("Kolay kurulum", "Einfache Einrichtung", "Easy setup"), lt("QR kodunu tara veya kurulum linkini kullan. eSIM’ini yaklaşık 60 saniyede kur.", "Scanne den QR-Code oder nutze den Installationslink. Deine eSIM ist in etwa 60 Sekunden eingerichtet.", "Scan the QR code or use the installation link. Set up your eSIM in around 60 seconds."), [lt("QR kod ile kurulum", "QR-Code", "QR code"), lt("Link ile kurulum", "Installationslink", "Installation link"), lt("≈ 60 saniye", "≈ 60 Sekunden", "≈ 60 seconds")], "/esim/kurulum"),
        infoCard("payment", "payment", "builtin:info-payment", lt("Güvenli ödeme", "Sicher bezahlen", "Secure payment"), lt("Ödemeniz güvenli ödeme altyapısı üzerinden korunarak işlenir.", "Deine Zahlung wird über eine sichere Zahlungsinfrastruktur geschützt verarbeitet.", "Your payment is securely processed through our protected payment infrastructure.")),
        infoCard("support", "support", "builtin:info-support", lt("7/24 WhatsApp destek", "24/7 WhatsApp-Support", "24/7 WhatsApp support"), lt("Soruların mı var? Ekibimiz 7/24 WhatsApp üzerinden yanında.", "Du hast Fragen? Unser Team ist rund um die Uhr über WhatsApp für dich da.", "Have a question? Our team is available around the clock via WhatsApp."), [lt("7/24 destek", "24/7 Support", "24/7 support"), lt("Hızlı yanıt", "Schnelle Hilfe", "Quick help"), same("WhatsApp")]),
      ],
    }),
    section("compatibility", "COMPATIBILITY", { text: { title: from3(DISCOVERY_COPY, "compatibility") } }),
    section("promo-lounge", "PROMO_BANNER", { mediaId: "builtin:lounge-card", href: "/lounge", text: { title: from3(c, "promo"), subtitle: from3(c, "promoSub") } }),
    section("installation", "INSTALLATION_STEPS", {
      variant: "animated",
      href: "/esim/kurulum",
      text: { title: from3(DISCOVERY_COPY, "install"), subtitle: from3(DISCOVERY_COPY, "installSub"), ready: from3(DISCOVERY_COPY, "animReady"), adding: from3(DISCOVERY_COPY, "animAdding"), cta: from3(DISCOVERY_COPY, "installCta") },
      items: listItems("step", { tr: DISCOVERY_COPY.tr.animSteps, de: DISCOVERY_COPY.de.animSteps, en: DISCOVERY_COPY.en.animSteps }, (v) => ({ title: String(v), text: "" })),
    }),
    section("promo-vignette", "PROMO_BANNER", { mediaId: "builtin:vignette-hero", href: "/vignette", text: { title: from3(c, "vignettePromo"), subtitle: from3(c, "vignettePromoSub") } }),
    guides(),
    section("faq", "FAQ", { variant: "comfortable", text: { title: from3(DISCOVERY_COPY, "faq") }, items: listItems("faq", faqCopy, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

function loungeDefault(): V2Page {
  const c = LOUNGE_COPY;
  const airports = POPULAR_AIRPORT_IDS.flatMap((id) => { const a = getAirport(id); return a ? [a.iata] : []; }).slice(0, 8);
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:lounge-hero", text: { eyebrow: same("Lounge"), title: from3(c, "h"), subtitle: from3(c, "q"), placeholder: from3(c, "ph"), sticky: from3(c, "ph") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("access", { icon: "Sofa", title: from3(c, "access") }),
        item("online", { icon: "CalendarCheck", title: from3(c, "online") }),
        item("availability", { icon: "LockKeyhole", title: from3(c, "pay") }),
        item("support", { icon: "Headphones", title: from3(c, "support") }),
      ],
    }),
    section("popular", "DESTINATION_CAROUSEL", { variant: "airport", text: { title: from3(c, "popular") }, items: airports.map((iata) => item(`a-${iata}`, { entity: iata })) }),
    section("info", "INFO_GRID", { showOnResults: true, text: { title: from3(c, "info") }, items: listItems("info", { tr: c.tr.infoItems, de: c.de.infoItems, en: c.en.infoItems }, (v) => ({ title: v.title, text: v.text })) }),
    section("promo-esim", "PROMO_BANNER", { showOnResults: true, mediaId: "builtin:esim-cross-sell", href: "/esim", text: { title: from3(c, "promo"), subtitle: from3(c, "promoSub") } }),
    section("how", "HOW_IT_WORKS", { text: { title: from3(c, "how") }, items: listItems("how", { tr: c.tr.steps, de: c.de.steps, en: c.en.steps }, (v) => ({ title: v.t, text: v.s })) }),
    section("promo-vignette", "PROMO_BANNER", { mediaId: "builtin:vignette-hero", href: "/vignette", text: { title: from3(c, "vignette"), subtitle: from3(c, "vignetteSub") } }),
    guides(),
    section("faq", "FAQ", { showOnResults: true, text: { title: from3(c, "faq") }, items: listItems("faq", { tr: c.tr.questions, de: c.de.questions, en: c.en.questions }, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

function vignetteDefault(): V2Page {
  const c = VIGNETTE_COPY;
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:vignette-hero", text: { eyebrow: same("Vignette"), title: from3(c, "h"), subtitle: same(""), placeholder: from3(c, "q"), sticky: from3(c, "q") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("digital", { icon: "Smartphone", title: from3(c, "digital") }),
        item("official", { icon: "FileCheck2", title: from3(c, "official") }),
        item("secure", { icon: "ShieldCheck", title: from3(c, "secure") }),
        item("europe", { icon: "Map", title: from3(c, "europe") }),
      ],
    }),
    section("notice", "NOTICE", { text: { title: from3(c, "soon"), text: from3(c, "soonSub") } }),
    section("info", "INFO_GRID", { text: { title: from3(c, "info") }, items: listItems("info", { tr: c.tr.infoItems, de: c.de.infoItems, en: c.en.infoItems }, (v) => ({ title: v.title, text: v.text })) }),
    section("how", "HOW_IT_WORKS", { text: { title: from3(c, "how") }, items: listItems("how", { tr: c.tr.steps, de: c.de.steps, en: c.en.steps }, (v) => ({ title: v.t, text: v.s })) }),
    section("promo-esim", "PROMO_BANNER", { mediaId: "builtin:esim-cross-sell", href: "/esim", text: { title: from3(c, "esim"), subtitle: same("") } }),
    section("promo-lounge", "PROMO_BANNER", { mediaId: "builtin:lounge-card", href: "/lounge", text: { title: from3(c, "lounge"), subtitle: same("") } }),
    guides(),
    section("faq", "FAQ", { text: { title: from3(c, "faq") }, items: listItems("faq", { tr: c.tr.questions, de: c.de.questions, en: c.en.questions }, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

type V2Page = V2Section[];

export function defaultV2Page(page: V2PageId): V2PageConfig {
  const sections = page === "lounge" ? loungeDefault() : page === "vignette" ? vignetteDefault() : esimDefault();
  return { version: 1, page, sections };
}

export function createV2Section(type: V2SectionType): V2Section {
  const id = `${type.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  const base = section(id, type);
  if (type === "SPACER") base.height = "compact";
  if (type === "INSTALLATION_STEPS") { base.variant = "simple"; base.href = "/esim/kurulum"; }
  return base;
}

/* ------------------------------ sanitizing ------------------------------ */

const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITY = /^[A-Z0-9]{2,4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Plain text only: markup is removed so CMS content can never inject HTML or script. */
export const cleanText = (value: unknown, max = 600) =>
  String(value ?? "").replace(/<[^>]*>/g, "").replace(/[<>]/g, "").slice(0, max);

const cleanLT = (value: any, max = 600): LT => Object.fromEntries(UI_LOCALES.filter((code) => code === "tr" || code === "de" || code === "en" || value?.[code] !== undefined).map((code) => [code, cleanText(value?.[code], max)])) as LT;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;

export function cleanMediaId(value: unknown): string | null {
  const raw = String(value ?? "");
  if (UUID.test(raw)) return raw;
  if (raw.startsWith("builtin:") && (V2_BUILTIN_MEDIA as readonly string[]).includes(raw.slice(8))) return raw;
  return null;
}

function cleanItem(raw: any, index: number): V2Item {
  return {
    id: ID.test(String(raw?.id)) ? String(raw.id) : `item-${index + 1}`,
    visible: raw?.visible !== false,
    icon: ICON_NAMES.includes(String(raw?.icon)) ? String(raw.icon) : "",
    entity: ENTITY.test(String(raw?.entity ?? "").toUpperCase()) ? String(raw.entity).toUpperCase() : "",
    title: cleanLT(raw?.title, 200),
    text: cleanLT(raw?.text, 900),
    internalKey: ID.test(String(raw?.internalKey)) ? String(raw.internalKey) : `item-${index + 1}`,
    cardType: cleanText(raw?.cardType, 32).replace(/[^a-z-]/g, "") || "products",
    mediaId: cleanMediaId(raw?.mediaId) ?? (raw?.cardType === "trust" && raw?.visualMode == null ? TRUST_BENEFIT_MEDIA[String(raw?.id)] ?? null : null),
    ...(raw?.cardType === "trust" ? { visualMode: raw?.visualMode === "ICON" ? "ICON" as const : raw?.visualMode === "CUSTOM_IMAGE" || raw?.mediaId || TRUST_BENEFIT_MEDIA[String(raw?.id)] ? "CUSTOM_IMAGE" as const : "ICON" as const } : {}),
    ...(raw?.cardType === "trust" ? { imageScale: ([80, 100, 120, 140, 160] as const).find((scale) => scale === Number(raw?.imageScale)) ?? (raw?.id === "trust-payment" ? 140 : 100) } : {}),
    ...(raw?.cardType === "chip" ? { position: pick(raw?.position, ["top-right", "middle-left", "bottom-right"] as const, "top-right") } : {}),
    href: raw?.href === "" ? "" : pick(raw?.href, V2_SAFE_LINKS, "/esim"),
    labels: Array.isArray(raw?.labels) ? raw.labels.slice(0, 4).map((value: unknown) => cleanLT(value, 80)) : [],
    cta: cleanLT(raw?.cta, 80),
    imageAlt: cleanLT(raw?.imageAlt, 240),
    focalX: Math.min(100, Math.max(0, Number(raw?.focalX ?? 50))),
    focalY: Math.min(100, Math.max(0, Number(raw?.focalY ?? 50))),
    rating: Math.min(5, Math.max(1, Math.round(Number(raw?.rating ?? 5)))),
    verified: raw?.verified === true,
    published: raw?.published === true,
    ...(raw?.cardType === "review" ? {
      reviewType: raw?.reviewType === "REAL" ? "REAL" as const : raw?.reviewType === "EDITORIAL" ? "EDITORIAL" as const : "DEMO" as const,
      reviewStatus: raw?.reviewStatus === "PUBLISHED" || raw?.reviewStatus === "ARCHIVED" ? raw.reviewStatus as "PUBLISHED" | "ARCHIVED" : "DRAFT" as const,
      originalLanguage: (UI_LOCALES as readonly string[]).includes(raw?.originalLanguage) ? raw.originalLanguage as UiLocale : "en" as const,
      countryCode: /^[A-Z]{2}$/.test(String(raw?.countryCode)) ? raw.countryCode as string : "",
      reviewDate: DATE.test(String(raw?.reviewDate)) ? raw.reviewDate as string : "",
      createdAt: typeof raw?.createdAt === "string" ? cleanText(raw.createdAt, 40) : "",
      updatedAt: typeof raw?.updatedAt === "string" ? cleanText(raw.updatedAt, 40) : "",
    } : {}),
  };
}

function cleanSection(raw: any): V2Section | null {
  if (!raw || !(V2_SECTION_TYPES as readonly string[]).includes(raw.type) || !ID.test(String(raw.id))) return null;
  const type = raw.type as V2SectionType;
  const text: Record<string, LT> = {};
  for (const [key] of V2_TEXT_FIELDS[type]) text[key] = cleanLT(raw.text?.[key], 300);
  return {
    id: String(raw.id),
    type,
    visible: V2_PROTECTED.includes(type) ? true : raw.visible !== false,
    showOnResults: Boolean(raw.showOnResults),
    variant: cleanText(raw.variant, 24).replace(/[^a-z-]/g, "") || "default",
    align: pick(raw.align, V2_ALIGNS, "left"),
    height: pick(raw.height, V2_HEIGHTS, "normal"),
    overlay: pick(raw.overlay, V2_OVERLAYS, "normal"),
    mediaId: cleanMediaId(raw.mediaId),
    mobileMediaId: cleanMediaId(raw.mobileMediaId),
    href: pick(typeof raw.href === "string" && raw.href.startsWith("/design-v2") ? designV2ToPublic(raw.href) : raw.href, V2_SAFE_LINKS, "/esim"),
    startsAt: DATE.test(String(raw.startsAt)) ? String(raw.startsAt) : "",
    endsAt: DATE.test(String(raw.endsAt)) ? String(raw.endsAt) : "",
    text,
    items: Array.isArray(raw.items) ? raw.items.slice(0, 30).map(cleanItem) : [],
    showDots: raw.showDots !== false,
    showArrows: raw.showArrows !== false,
    cardGap: pick(raw.cardGap, ["compact", "normal", "wide"] as const, "normal"),
    mobilePreview: pick(raw.mobilePreview, ["compact", "normal", "wide"] as const, "normal"),
    claims: {
      countries: cleanText(raw.claims?.countries, 12) || "190+",
      refundDays: cleanText(raw.claims?.refundDays, 12) || "14",
      savingPercent: cleanText(raw.claims?.savingPercent, 12) || "60",
      setupSeconds: cleanText(raw.claims?.setupSeconds, 12) || "60",
    },
    showDemoReviews: raw.showDemoReviews === true,
    ...(type === "TRUST_REVIEWS" ? { trust: {
      background: pick(raw.trust?.background, ["mint", "cream", "white"] as const, "mint"),
      focal: pick(raw.trust?.focal, ["left", "center", "right"] as const, "right"),
      ratingMode: pick(raw.trust?.ratingMode, ["real", "manual", "off"] as const, "real"),
      manualRating: Math.min(5, Math.max(0, Number(raw.trust?.manualRating ?? 4.8) || 0)),
      maxRating: 5,
      manualCaption: cleanLT(raw.trust?.manualCaption, 160),
      autoplay: raw.trust?.autoplay === true,
      whyEnabled: raw.trust?.whyEnabled !== false,
      comparisonEnabled: raw.trust?.comparisonEnabled === true,
      comparisonPreviewOnly: raw.trust?.comparisonPreviewOnly !== false,
      illustrationId: cleanMediaId(raw.trust?.illustrationId),
    } } : {}),
  };
}

/** Server + client validation. Invalid input falls back to the built-in approved layout. */
export function sanitizeV2Page(raw: any, page: V2PageId): V2PageConfig {
  const fallback = defaultV2Page(page);
  if (!raw || !Array.isArray(raw.sections)) return fallback;
  const seen = new Set<string>();
  const sections: V2Section[] = [];
  for (const entry of raw.sections.slice(0, 30)) {
    const clean = cleanSection(entry);
    if (!clean || seen.has(clean.id)) continue;
    if (V2_SINGLETON.includes(clean.type) && sections.some((s) => s.type === clean.type)) continue;
    seen.add(clean.id);
    sections.push(clean);
  }
  // Singleton sections introduced after a page was published are filled in from the
  // built-in defaults at their designed position, so older published configs stay complete.
  for (const fallbackSection of fallback.sections) {
    if (!V2_SINGLETON.includes(fallbackSection.type) || sections.some((s) => s.type === fallbackSection.type)) continue;
    const fallbackIndex = fallback.sections.indexOf(fallbackSection);
    let insertAt = sections.length;
    for (let i = fallbackIndex + 1; i < fallback.sections.length; i++) {
      const nextIndex = sections.findIndex((s) => s.type === fallback.sections[i]!.type);
      if (nextIndex >= 0) {
        insertAt = nextIndex;
        break;
      }
    }
    sections.splice(insertAt, 0, fallbackSection);
  }
  if (page === "esim") {
    const trust = sections.find((s) => s.type === "TRUST_REVIEWS");
    const sourceTrust = raw.sections.find((s: V2Section) => s?.type === "TRUST_REVIEWS");
    if (trust && sourceTrust && !sourceTrust.trust && !trust.items.some((i) => i.cardType === "chip")) {
      trust.items = [...fallback.sections.find((s) => s.type === "TRUST_REVIEWS")!.items.filter((i) => i.cardType === "chip"), ...trust.items];
    }
  }
  // The search hero is core: always present and always first.
  const heroIndex = sections.findIndex((s) => s.type === "SEARCH_HERO");
  const hero = heroIndex >= 0 ? sections.splice(heroIndex, 1)[0]! : fallback.sections[0]!;
  return { version: 1, page, sections: [hero, ...sections] };
}

/* ------------------------------ rendering helpers ------------------------------ */

/** CMS English copy is translated through the static overlay resources for fr/es/…. */
function overlayText(text: string, locale: Locale): string {
  return locale === "en" ? translateString(text) : text;
}

export function v2Text(section: V2Section | undefined, key: string, locale: Locale): string {
  const value = section?.text?.[key];
  const active = getActiveUiLocale();
  if (active !== "tr" && active !== "de" && active !== "en") {
    return value?.[active]?.trim() || overlayText((value?.en || value?.tr || "").trim(), "en");
  }
  return value?.[active]?.trim() || (value?.[locale] || value?.tr || "").trim();
}

export function v2ItemText(value: LT | undefined, locale: Locale): string {
  const active = getActiveUiLocale();
  if (active !== "tr" && active !== "de" && active !== "en") {
    return value?.[active]?.trim() || overlayText((value?.en || value?.tr || "").trim(), "en");
  }
  return value?.[active]?.trim() || (value?.[locale] || value?.tr || "").trim();
}

/** Promo date window, evaluated on the viewer's calendar day. */
export function isInWindow(section: V2Section, today = new Date().toISOString().slice(0, 10)): boolean {
  if (section.startsAt && today < section.startsAt) return false;
  if (section.endsAt && today > section.endsAt) return false;
  return true;
}

export function missingV2Translations(config: V2PageConfig, locale: "de" | "en"): number {
  let missing = 0;
  const check = (value: LT | undefined) => { if (value?.tr?.trim() && !value[locale]?.trim()) missing += 1; };
  for (const s of config.sections) {
    Object.values(s.text).forEach(check);
    for (const it of s.items) { check(it.title); check(it.text); it.labels.forEach(check); check(it.cta); check(it.imageAlt); }
  }
  return missing;
}

export function collectV2MediaIds(config: V2PageConfig): string[] {
  const ids = new Set<string>();
  for (const s of config.sections) {
    for (const id of [s.mediaId, s.mobileMediaId, s.trust?.illustrationId, ...s.items.map((item) => item.mediaId)]) if (id && UUID.test(id)) ids.add(id);
  }
  return [...ids];
}
