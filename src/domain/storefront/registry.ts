import type { Locale } from "@/domain/enums";

/**
 * Controlled Section Registry for the no-code storefront editor.
 *
 * Only validated, structured presentation data is stored — never executable
 * content, never business logic (pricing, provider, fulfilment, security).
 */

export const STOREFRONT_SERVICES = ["esim", "lounge", "global"] as const;
export type StorefrontService = (typeof STOREFRONT_SERVICES)[number];

export const SECTION_TYPES = [
  "HERO",
  "SERVICE_SELECTOR",
  "FINDER",
  "COMPATIBILITY",
  "TRUST",
  "POPULAR_DESTINATIONS",
  "PRODUCT_SOLUTIONS",
  "CROSS_SELL",
  "HOW_IT_WORKS",
  "DELIVERY",
  "FAQ",
  "FINAL_CTA",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const LOCALES = ["tr", "de", "en"] as const;
export type LocaleText = Record<Locale, string>;

export const BACKGROUNDS = ["cream", "white", "mint", "petrol", "image"] as const;
export const SPACINGS = ["compact", "normal", "large"] as const;
export const WIDTHS = ["standard", "wide"] as const;
export const ALIGNMENTS = ["left", "center"] as const;
export const HERO_HEIGHTS = ["compact", "normal", "tall"] as const;

export type SectionItem = {
  id: string;
  icon: string;
  mediaId: string | null;
  mobileMediaId: string | null;
  entity: string;
  href: string;
  showPrice: boolean;
  visible: boolean;
  title: LocaleText;
  description: LocaleText;
  cta: LocaleText;
};

export type StorefrontSection = {
  id: string;
  type: SectionType;
  visible: boolean;
  background: (typeof BACKGROUNDS)[number];
  spacing: (typeof SPACINGS)[number];
  width: (typeof WIDTHS)[number];
  variant: string;
  align: (typeof ALIGNMENTS)[number];
  height: (typeof HERO_HEIGHTS)[number];
  overlay: number;
  showOffer: boolean;
  showPrice: boolean;
  mediaId: string | null;
  mobileMediaId: string | null;
  focalX: number;
  focalY: number;
  primaryHref: string;
  secondaryHref: string;
  text: Record<string, LocaleText>;
  items: SectionItem[];
};

export type NavigationLink = { id: string; href: string; visible: boolean; label: LocaleText };

export type StorefrontConfig = {
  version: 2;
  service: StorefrontService;
  sections: StorefrontSection[];
  navigation: NavigationLink[];
  footerLinks: NavigationLink[];
  footerText: LocaleText;
  copyright: LocaleText;
};

/** Admin-facing metadata — no technical component names are exposed. */
export const SECTION_META: Record<SectionType, { label: string; hint: string; fields: string[]; items?: string; variants: string[] }> = {
  HERO: { label: "Karşılama alanı", hint: "Sayfanın en üstündeki büyük görsel ve mesaj.", fields: ["eyebrow", "headline", "description", "ctaLabel", "secondaryCtaLabel", "offerTitle", "offerValue", "offerMeta"], variants: ["standart", "sade"] },
  SERVICE_SELECTOR: { label: "Servis seçici", hint: "eSIM / Lounge geçiş düğmeleri.", fields: ["esimLabel", "loungeLabel"], variants: ["standart"] },
  FINDER: { label: "Arama sihirbazı (sunum)", hint: "Yalnızca başlık, açıklama ve etiketler. Hesaplama Akıllı Finder altında kalır.", fields: ["headline", "description", "helper", "stepLabel", "ctaLabel"], variants: ["standart", "sade"] },
  COMPATIBILITY: { label: "Cihaz uyumluluğu", hint: "Cihaz kontrolü tanıtım alanı. Cihaz veritabanı ayrı yönetilir.", fields: ["headline", "description", "ctaLabel", "helper"], variants: ["standart", "sade"] },
  TRUST: { label: "Güven avantajları", hint: "Kısa güven maddeleri.", fields: ["headline"], items: "Güven maddesi", variants: ["standart"] },
  POPULAR_DESTINATIONS: { label: "Popüler destinasyonlar", hint: "Öne çıkan destinasyon / havalimanı kartları.", fields: ["eyebrow", "headline", "description"], items: "Kart", variants: ["standart"] },
  PRODUCT_SOLUTIONS: { label: "Çözüm / paket anlatımı", hint: "Tamamen gizlenebilir anlatım bölümü.", fields: ["eyebrow", "headline", "description"], items: "Kart", variants: ["standart"] },
  CROSS_SELL: { label: "Çapraz öneri", hint: "eSIM ↔ Lounge önerisi.", fields: ["eyebrow", "headline", "description", "ctaLabel"], variants: ["standart", "sade"] },
  HOW_IT_WORKS: { label: "Nasıl çalışır", hint: "Adım adım anlatım.", fields: ["eyebrow", "headline"], items: "Adım", variants: ["standart"] },
  DELIVERY: { label: "QR / e-posta teslimatı", hint: "Yalnızca pazarlama anlatımı; gerçek QR ve teslimat verisi düzenlenemez.", fields: ["eyebrow", "headline", "description", "note1", "note2"], items: "Madde", variants: ["standart"] },
  FAQ: { label: "Sık sorulan sorular", hint: "Soru ve cevaplar.", fields: ["eyebrow", "headline", "description"], items: "Soru", variants: ["standart"] },
  FINAL_CTA: { label: "Kapanış çağrısı", hint: "Sayfa sonundaki eylem alanı.", fields: ["headline", "description", "ctaLabel"], variants: ["standart", "sade"] },
};

export const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Üst etiket", headline: "Başlık", description: "Açıklama", ctaLabel: "Buton metni",
  secondaryCtaLabel: "İkincil buton metni", offerTitle: "Teklif kartı başlığı", offerValue: "Teklif kartı değeri",
  offerMeta: "Teklif kartı alt metni", helper: "Yardım metni", stepLabel: "Adım etiketi",
  esimLabel: "eSIM etiketi", loungeLabel: "Lounge etiketi", note1: "Not 1", note2: "Not 2",
};

const text = (tr: string, de: string, en: string): LocaleText => ({ tr, de, en });
const empty = (): LocaleText => ({ tr: "", de: "", en: "" });

function section(input: Partial<StorefrontSection> & { id: string; type: SectionType }): StorefrontSection {
  return {
    visible: true, background: "white", spacing: "normal", width: "standard", variant: "standart",
    align: "left", height: "normal", overlay: 45, showOffer: true, showPrice: true,
    mediaId: null, mobileMediaId: null, focalX: 50, focalY: 50,
    primaryHref: "/", secondaryHref: "", text: {}, items: [],
    ...input,
  };
}

function item(input: Partial<SectionItem> & { id: string }): SectionItem {
  return {
    icon: "Sparkles", mediaId: null, mobileMediaId: null, entity: "", href: "", showPrice: true, visible: true,
    title: empty(), description: empty(), cta: empty(),
    ...input,
  };
}

const TRUST_ITEMS = [
  item({ id: "trust-1", icon: "ShieldCheck", title: text("Güvenli ödeme", "Sichere Zahlung", "Secure payment") }),
  item({ id: "trust-2", icon: "QrCode", title: text("Hızlı dijital teslimat", "Schnelle digitale Zustellung", "Fast digital delivery") }),
  item({ id: "trust-3", icon: "Smartphone", title: text("Hesabında erişim", "Zugriff im Konto", "Account access") }),
  item({ id: "trust-4", icon: "Headphones", title: text("Seyahat desteği", "Reise-Support", "Travel support") }),
];

function esimDefaults(): StorefrontSection[] {
  return [
    section({
      id: "hero", type: "HERO", background: "image", height: "normal", primaryHref: "#finder",
      text: {
        eyebrow: text("Seyahat eSIM’i", "Reise-eSIM", "Travel eSIM"),
        headline: text("Seyahatinde internetsiz kalma", "Unterwegs verbunden bleiben", "Stay connected wherever you go"),
        description: text("Rotanı ve kullanımını seç, sana uygun eSIM seçeneğini kolayca bul.", "Route und Nutzung wählen und die passende eSIM einfach finden.", "Choose your route and usage to find the right eSIM with ease."),
        ctaLabel: text("eSIM’imi bul", "eSIM finden", "Find my eSIM"),
        secondaryCtaLabel: empty(),
        offerTitle: text("Dijital bağlantı", "Digitale Verbindung", "Digital connection"),
        offerValue: text("Fiziksel SIM gerekmez", "Keine physische SIM nötig", "No physical SIM needed"),
        offerMeta: text("QR ile kolay kurulum", "Einfache QR-Einrichtung", "Easy QR setup"),
      },
    }),
    section({ id: "service-selector", type: "SERVICE_SELECTOR", text: { esimLabel: text("eSIM", "eSIM", "eSIM"), loungeLabel: text("Lounge", "Lounge", "Lounge") } }),
    section({
      id: "finder", type: "FINDER", background: "white",
      text: {
        headline: text("Sana uygun eSIM’i bul", "Passende eSIM finden", "Find your ideal eSIM"),
        description: text("Seyahat şekline göre seçimlerini yap.", "Wähle passend zu deiner Reise.", "Make choices based on your trip."),
        helper: empty(), stepLabel: empty(), ctaLabel: empty(),
      },
    }),
    section({
      id: "compatibility", type: "COMPATIBILITY", background: "white",
      text: { headline: empty(), description: empty(), ctaLabel: empty(), helper: empty() },
    }),
    section({ id: "trust", type: "TRUST", background: "white", text: { headline: empty() }, items: TRUST_ITEMS }),
    section({
      id: "popular", type: "POPULAR_DESTINATIONS", background: "white",
      text: {
        eyebrow: text("İlham veren rotalar", "Inspirierende Routen", "Inspiring routes"),
        headline: text("Popüler eSIM destinasyonları", "Beliebte eSIM-Reiseziele", "Popular eSIM destinations"),
        description: text("Seyahat planlarında sık seçilen yerler ve rotalar.", "Häufig gewählte Ziele und Routen.", "Frequently selected destinations and routes."),
      },
      items: [
        item({ id: "tr", entity: "TR", icon: "MapPin", title: text("Türkiye", "Türkei", "Türkiye"), description: text("Tek destinasyon", "Ein Reiseziel", "Single destination"), cta: text("Paketleri gör", "Pakete ansehen", "View packages") }),
        item({ id: "eu", entity: "DE,AT,IT,FR", icon: "Globe2", title: text("Avrupa", "Europa", "Europe"), description: text("Bölgesel kapsama", "Regionale Abdeckung", "Regional coverage"), cta: text("Paketleri gör", "Pakete ansehen", "View packages") }),
        item({ id: "route", entity: "DE,AT,SI,HR,RS,BG,TR", icon: "Route", title: text("Sıla Yolu", "Sıla Yolu", "Sıla Yolu"), description: text("7 ülke · tek rota", "7 Länder · eine Route", "7 countries · one route"), cta: text("Paketleri gör", "Pakete ansehen", "View packages") }),
      ],
    }),
    section({
      id: "solutions", type: "PRODUCT_SOLUTIONS", visible: false, background: "cream",
      text: {
        eyebrow: empty(),
        headline: text("İhtiyacına göre seçenekler", "Optionen nach Bedarf", "Options for every need"),
        description: text("Süre, internet ve kapsama göre sana uygun seçeneği karşılaştır.", "Vergleiche Laufzeit, Datenvolumen und Abdeckung.", "Compare duration, data and coverage."),
      },
      items: [
        item({ id: "single", icon: "MapPin", title: text("Destinasyon paketi", "Ziel-Paket", "Destination plan"), description: text("Tek ülke için uygun seçim.", "Passend für ein Land.", "Right for a single country.") }),
        item({ id: "region", icon: "Globe2", title: text("Bölgesel çözüm", "Regionale Lösung", "Regional solution"), description: text("Birden fazla ülkeyi kapsar.", "Deckt mehrere Länder ab.", "Covers multiple countries.") }),
        item({ id: "usage", icon: "Gauge", title: text("Kullanıma göre seçim", "Auswahl nach Nutzung", "Usage based choice"), description: text("Kullanım yoğunluğuna göre öneri.", "Empfehlung nach Nutzung.", "Recommendation based on usage.") }),
      ],
    }),
    section({
      id: "cross-sell", type: "CROSS_SELL", background: "petrol",
      text: {
        eyebrow: text("Seyahat önerisi", "Reise-Empfehlung", "Travel recommendation"),
        headline: text("Uçuş öncesi biraz rahatla", "Vor dem Flug entspannen", "Relax before your flight"),
        description: text("Uçuş planın uygunsa Lounge seçeneklerini de seyahatine ekleyebilirsin.", "Wenn es zu deinem Flug passt, ergänze deine Reise um eine Lounge.", "When it fits your flight, add a Lounge to your journey."),
        ctaLabel: text("Lounge seçeneklerine bak", "Lounges ansehen", "View Lounge options"),
      },
    }),
    section({
      id: "how", type: "HOW_IT_WORKS", background: "mint",
      text: { eyebrow: text("Nasıl çalışır?", "So funktioniert’s", "How it works"), headline: text("Bağlantın dört adımda hazır", "In vier Schritten verbunden", "Connected in four simple steps") },
      items: [
        item({ id: "s1", icon: "MapPin", title: text("Destinasyon", "Reiseziel", "Destination"), description: text("Nereye gideceğini seç", "Wähle dein Ziel", "Choose where you are going") }),
        item({ id: "s2", icon: "Signal", title: text("Paket", "Paket", "Package"), description: text("İhtiyacına uygun seçeneği bul", "Finde die passende Option", "Find the option that fits") }),
        item({ id: "s3", icon: "CreditCard", title: text("Ödeme", "Zahlung", "Payment"), description: text("Güvenle tamamla", "Sicher abschließen", "Complete it securely") }),
        item({ id: "s4", icon: "QrCode", title: text("QR kurulum", "QR-Installation", "QR install"), description: text("Telefonuna kolayca yükle", "Einfach aufs Handy laden", "Add it to your phone") }),
      ],
    }),
    section({
      id: "delivery", type: "DELIVERY", background: "white",
      text: {
        eyebrow: text("Dijital teslimat", "Digitale Zustellung", "Digital delivery"),
        headline: text("eSIM’in hazır olduğunda hep yanında", "Deine eSIM bleibt griffbereit", "Your eSIM stays within reach"),
        description: text("QR koduna hesabından ulaşır, kurulum rehberini açar ve bilgilerini e-postanda da bulursun.", "QR-Code im Konto öffnen, Anleitung ansehen und Details per E-Mail erhalten.", "Open your QR in your account, view the guide, and receive the details by email too."),
        note1: text("Hesabım bölümünde güvenle saklanır", "Sicher in deinem Konto gespeichert", "Stored securely in your account"),
        note2: text("Bilgilerin e-postana da gönderilir", "Details kommen auch per E-Mail", "Details are also sent by email"),
      },
    }),
    section({
      id: "faq", type: "FAQ", background: "white",
      text: {
        eyebrow: text("Bilmen gerekenler", "Gut zu wissen", "Good to know"),
        headline: text("eSIM hakkında merak ettiklerin", "Wissenswertes zur eSIM", "Everything about eSIM"),
        description: text("Seçim yapmadan önce temel bilgileri hızlıca gözden geçir.", "Die wichtigsten Infos vor deiner Auswahl.", "A quick look at the essentials before you choose."),
      },
      items: [
        item({ id: "q1", icon: "HelpCircle", title: text("eSIM nasıl çalışır?", "Wie funktioniert eine eSIM?", "How does an eSIM work?"), description: text("eSIM dijital bir SIM’dir; telefonuna QR ile kurulur ve fiziksel kart gerekmez.", "Eine eSIM ist eine digitale SIM, die per QR-Code installiert wird – ohne physische Karte.", "An eSIM is a digital SIM installed with a QR code — no physical card needed.") }),
        item({ id: "q2", icon: "HelpCircle", title: text("Telefonum uyumlu mu?", "Ist mein Handy kompatibel?", "Is my phone compatible?"), description: text("Son yılların çoğu akıllı telefonu eSIM destekler. Cihaz ayarlarından eSIM seçeneğini görüyorsan uyumludur.", "Die meisten aktuellen Smartphones unterstützen eSIM.", "Most recent smartphones support eSIM.") }),
        item({ id: "q3", icon: "HelpCircle", title: text("Kaç GB gerekir?", "Wie viele GB brauche ich?", "How many GB do I need?"), description: text("Mesajlaşma ve harita için az, video ve hotspot için daha fazla veri gerekir.", "Messaging und Karten brauchen wenig, Video und Hotspot mehr Daten.", "Messaging and maps need little data; video and hotspot need much more.") }),
        item({ id: "q4", icon: "HelpCircle", title: text("Kurulum nasıl yapılır?", "Wie läuft die Installation?", "How do I install it?"), description: text("Satın alma sonrası QR kodunu okutur, profili yükler ve veri dolaşımını açarsın.", "Nach dem Kauf QR-Code scannen, Profil laden und Datenroaming aktivieren.", "After purchase you scan the QR code, install the profile and turn on data roaming.") }),
        item({ id: "q5", icon: "HelpCircle", title: text("Kapsama nasıl çalışır?", "Wie funktioniert die Abdeckung?", "How does coverage work?"), description: text("Kapsama seçtiğin ülke veya bölgeye göre değişir; rotandaki tüm ülkeler listelenir.", "Die Abdeckung hängt vom gewählten Land oder der Region ab.", "Coverage depends on the country or region you choose.") }),
      ],
    }),
    section({
      id: "final", type: "FINAL_CTA", background: "cream", align: "center", primaryHref: "#finder",
      text: {
        headline: text("Yola çıkmadan bağlantını planla", "Verbindung vor der Reise planen", "Plan your connection before departure"),
        description: text("Destinasyonunu seç ve ihtiyacını birkaç adımda belirle.", "Ziel wählen und deinen Bedarf in wenigen Schritten bestimmen.", "Choose a destination and define your needs in a few steps."),
        ctaLabel: text("eSIM’imi bul", "eSIM finden", "Find my eSIM"),
      },
    }),
  ];
}

function loungeDefaults(): StorefrontSection[] {
  return [
    section({
      id: "hero", type: "HERO", background: "image", primaryHref: "#finder",
      text: {
        eyebrow: text("Havalimanı Lounge", "Airport Lounge", "Airport Lounge"),
        headline: text("Uçuş öncesi sakin bir mola", "Eine ruhige Pause vor dem Flug", "A calmer pause before your flight"),
        description: text("Havalimanını ve uçuş durumunu seç, sana uygun Lounge seçeneklerini keşfet.", "Flughafen und Flugsituation wählen und passende Lounges entdecken.", "Choose your airport and flight situation to discover suitable Lounges."),
        ctaLabel: text("Lounge bul", "Lounge finden", "Find a Lounge"),
        secondaryCtaLabel: empty(),
        offerTitle: text("Konforlu bekleyiş", "Entspannt warten", "Comfortable waiting"),
        offerValue: text("Uçuşuna uygun seçim", "Passend zu deinem Flug", "Matched to your flight"),
        offerMeta: text("Havalimanı ve terminal bazlı", "Nach Flughafen und Terminal", "Airport and terminal based"),
      },
    }),
    section({ id: "service-selector", type: "SERVICE_SELECTOR", text: { esimLabel: text("eSIM", "eSIM", "eSIM"), loungeLabel: text("Lounge", "Lounge", "Lounge") } }),
    section({
      id: "finder", type: "FINDER",
      text: {
        headline: text("Sana uygun Lounge’u bul", "Passende Lounge finden", "Find your ideal Lounge"),
        description: text("Uçuş bilgilerine göre seçimlerini yap.", "Wähle anhand deiner Flugdaten.", "Make choices based on your flight."),
        helper: empty(), stepLabel: empty(), ctaLabel: empty(),
      },
    }),
    section({ id: "trust", type: "TRUST", items: TRUST_ITEMS, text: { headline: empty() } }),
    section({
      id: "popular", type: "POPULAR_DESTINATIONS",
      text: {
        eyebrow: text("Konforlu duraklar", "Komfortable Stopps", "Comfortable stops"),
        headline: text("Popüler havalimanları ve Lounge’lar", "Beliebte Flughäfen und Lounges", "Popular airports and Lounges"),
        description: text("Seyahatlerde sık aranan havalimanları.", "Häufig gesuchte Flughäfen.", "Frequently searched airports."),
      },
      items: [
        item({ id: "ist", entity: "IST", icon: "PlaneTakeoff", showPrice: false, title: text("IST · İstanbul", "IST · Istanbul", "IST · Istanbul"), description: text("Lounge seçenekleri", "Lounge-Optionen", "Lounge options"), cta: text("Keşfet", "Entdecken", "Explore") }),
        item({ id: "fra", entity: "FRA", icon: "PlaneTakeoff", showPrice: false, title: text("FRA · Frankfurt", "FRA · Frankfurt", "FRA · Frankfurt"), description: text("Lounge seçenekleri", "Lounge-Optionen", "Lounge options"), cta: text("Keşfet", "Entdecken", "Explore") }),
        item({ id: "comfort", entity: "", icon: "Coffee", showPrice: false, title: text("Lounge konforu", "Lounge-Komfort", "Lounge comfort"), description: text("Wi-Fi · Yiyecek · İçecek", "WLAN · Essen · Getränke", "Wi-Fi · Food · Drinks"), cta: text("Keşfet", "Entdecken", "Explore") }),
      ],
    }),
    section({
      id: "cross-sell", type: "CROSS_SELL", background: "petrol",
      text: {
        eyebrow: text("Seyahat önerisi", "Reise-Empfehlung", "Travel recommendation"),
        headline: text("İndiğinde bağlantın hazır olsun", "Bei Ankunft verbunden sein", "Be connected when you land"),
        description: text("Destinasyonuna uygun bir eSIM, seyahatinin devamını kolaylaştırabilir.", "Eine passende eSIM kann die Weiterreise einfacher machen.", "A destination eSIM can make the rest of your journey easier."),
        ctaLabel: text("eSIM’imi bul", "eSIM finden", "Find my eSIM"),
      },
    }),
    section({
      id: "how", type: "HOW_IT_WORKS", background: "mint",
      text: { eyebrow: text("Nasıl çalışır?", "So funktioniert’s", "How it works"), headline: text("Konforlu mola dört adım uzakta", "In vier Schritten zur entspannten Pause", "A calmer break in four steps") },
      items: [
        item({ id: "s1", icon: "PlaneTakeoff", title: text("Havalimanı", "Flughafen", "Airport"), description: text("Uçuş noktanı seç", "Wähle deinen Abflugort", "Choose your flight point") }),
        item({ id: "s2", icon: "Coffee", title: text("Lounge", "Lounge", "Lounge"), description: text("Olanakları karşılaştır", "Leistungen vergleichen", "Compare the amenities") }),
        item({ id: "s3", icon: "CreditCard", title: text("Rezervasyon", "Buchung", "Booking"), description: text("Girişini güvenle ayır", "Zutritt reservieren", "Reserve your entry") }),
        item({ id: "s4", icon: "TicketCheck", title: text("QR / Voucher", "QR / Voucher", "QR / Voucher"), description: text("Kapıda kolayca göster", "Am Eingang vorzeigen", "Show it at the door") }),
      ],
    }),
    section({
      id: "delivery", type: "DELIVERY",
      text: {
        eyebrow: text("Dijital teslimat", "Digitale Zustellung", "Digital delivery"),
        headline: text("Rezervasyonun hazır olduğunda tek yerde", "Deine Buchung bleibt an einem Ort", "Your booking stays in one place"),
        description: text("Giriş kodun, terminal bilgilerin ve rezervasyon detayların hesabında saklanır; e-postana da gönderilir.", "Zutrittscode, Terminal und Buchungsdetails bleiben im Konto und kommen auch per E-Mail.", "Your entry code, terminal and booking details stay in your account and arrive by email."),
        note1: text("Hesabım bölümünde güvenle saklanır", "Sicher in deinem Konto gespeichert", "Stored securely in your account"),
        note2: text("Bilgilerin e-postana da gönderilir", "Details kommen auch per E-Mail", "Details are also sent by email"),
      },
    }),
    section({
      id: "faq", type: "FAQ",
      text: {
        eyebrow: text("Bilmen gerekenler", "Gut zu wissen", "Good to know"),
        headline: text("Lounge deneyimi nasıl çalışır?", "So funktioniert die Lounge", "How does a Lounge visit work?"),
        description: text("Seçim yapmadan önce temel bilgileri hızlıca gözden geçir.", "Die wichtigsten Infos vor deiner Auswahl.", "A quick look at the essentials before you choose."),
      },
      items: [
        item({ id: "q1", icon: "HelpCircle", title: text("Lounge’a nasıl girilir?", "Wie komme ich in die Lounge?", "How do I enter the lounge?"), description: text("Rezervasyon sonrası giriş kodun ya da voucher’ın ile Lounge resepsiyonuna gidersin.", "Nach der Buchung zeigst du deinen Zutrittscode an der Rezeption.", "After booking you show your entry code at the lounge reception.") }),
        item({ id: "q2", icon: "HelpCircle", title: text("Neler dahil?", "Was ist inklusive?", "What is included?"), description: text("Genellikle ikram, içecek, oturma alanı ve internet dahildir.", "Meist Snacks, Getränke, Sitzbereich und WLAN.", "Usually snacks, drinks, seating and Wi-Fi.") }),
        item({ id: "q3", icon: "HelpCircle", title: text("Kaç saat kalabilirim?", "Wie lange darf ich bleiben?", "How long can I stay?"), description: text("Kalış süresi Lounge kurallarına göre belirlenir ve seçim sırasında gösterilir.", "Die Aufenthaltsdauer richtet sich nach den Lounge-Regeln.", "Maximum stay follows the lounge rules.") }),
        item({ id: "q4", icon: "HelpCircle", title: text("Kimler kullanabilir?", "Wer darf sie nutzen?", "Who can use it?"), description: text("Genellikle yetişkin ve çocuk kuralları farklıdır; koşullar Lounge bazında listelenir.", "Für Erwachsene und Kinder gelten oft eigene Regeln.", "Adult and child rules often differ.") }),
      ],
    }),
    section({
      id: "final", type: "FINAL_CTA", background: "cream", align: "center", primaryHref: "#finder",
      text: {
        headline: text("Uçuşuna iyi bir başlangıç yap", "Entspannt in den Flug starten", "Start your flight feeling refreshed"),
        description: text("Havalimanını seç ve ihtiyacını birkaç adımda belirle.", "Flughafen wählen und deinen Bedarf in wenigen Schritten bestimmen.", "Choose an airport and define your needs in a few steps."),
        ctaLabel: text("Lounge bul", "Lounge finden", "Find a Lounge"),
      },
    }),
  ];
}

const DEFAULT_NAVIGATION: NavigationLink[] = [
  { id: "nav-esim", href: "/?service=esim", visible: true, label: text("eSIM", "eSIM", "eSIM") },
  { id: "nav-lounge", href: "/?service=lounge", visible: true, label: text("Lounge", "Lounge", "Lounge") },
  { id: "nav-destinations", href: "#popular", visible: true, label: text("Destinasyonlar", "Reiseziele", "Destinations") },
  { id: "nav-how", href: "#how", visible: true, label: text("Nasıl Çalışır", "So funktioniert’s", "How it works") },
];

const DEFAULT_FOOTER_LINKS: NavigationLink[] = [
  { id: "footer-support", href: "#how", visible: true, label: text("Destek", "Hilfe", "Support") },
  { id: "footer-faq", href: "#how", visible: true, label: text("Sık sorulan sorular", "FAQ", "FAQ") },
];

export function defaultStorefront(service: StorefrontService): StorefrontConfig {
  return {
    version: 2,
    service,
    sections: service === "lounge" ? loungeDefaults() : service === "esim" ? esimDefaults() : [],
    navigation: DEFAULT_NAVIGATION.map((link) => ({ ...link })),
    footerLinks: DEFAULT_FOOTER_LINKS.map((link) => ({ ...link })),
    footerText: text("Seyahatin için doğru hizmet, tek bir yerde.", "Der passende Reiseservice an einem Ort.", "The right travel service, all in one place."),
    copyright: text("© Travel Platform", "© Travel Platform", "© Travel Platform"),
  };
}

/* ---------------------------------- sanitize --------------------------------- */

const str = (value: unknown, max: number) => String(value ?? "").replace(/<[^>]*>/g, "").slice(0, max).trim();
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;
const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback;
};
/** Internal, same-site destinations only — never an external or admin URL. */
const href = (value: unknown) => {
  const raw = str(value, 160);
  if (raw.startsWith("#")) return raw;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/admin")) return "";
  return raw;
};
const localeText = (value: unknown, max = 900): LocaleText => ({
  tr: str((value as any)?.tr, max),
  de: str((value as any)?.de, max),
  en: str((value as any)?.en, max),
});

function sanitizeItem(raw: any, index: number): SectionItem {
  return {
    id: str(raw?.id, 40) || `item-${index}`,
    icon: str(raw?.icon, 40).replace(/[^A-Za-z0-9]/g, "") || "Sparkles",
    mediaId: raw?.mediaId ? str(raw.mediaId, 60) : null,
    mobileMediaId: raw?.mobileMediaId ? str(raw.mobileMediaId, 60) : null,
    entity: str(raw?.entity, 120),
    href: href(raw?.href),
    showPrice: raw?.showPrice !== false,
    visible: raw?.visible !== false,
    title: localeText(raw?.title, 200),
    description: localeText(raw?.description, 900),
    cta: localeText(raw?.cta, 80),
  };
}

function sanitizeSection(raw: any, index: number): StorefrontSection | null {
  const type = pick(raw?.type, SECTION_TYPES, "HERO");
  if (!(SECTION_TYPES as readonly string[]).includes(String(raw?.type))) return null;
  const text: Record<string, LocaleText> = {};
  for (const key of Object.keys(raw?.text ?? {}).slice(0, 30)) {
    text[str(key, 40)] = localeText(raw.text[key]);
  }
  return {
    id: str(raw?.id, 40) || `section-${index}`,
    type,
    visible: raw?.visible !== false,
    background: pick(raw?.background, BACKGROUNDS, "white"),
    spacing: pick(raw?.spacing, SPACINGS, "normal"),
    width: pick(raw?.width, WIDTHS, "standard"),
    variant: str(raw?.variant, 40) || "standart",
    align: pick(raw?.align, ALIGNMENTS, "left"),
    height: pick(raw?.height, HERO_HEIGHTS, "normal"),
    overlay: clamp(raw?.overlay, 0, 90, 45),
    showOffer: raw?.showOffer !== false,
    showPrice: raw?.showPrice !== false,
    mediaId: raw?.mediaId ? str(raw.mediaId, 60) : null,
    mobileMediaId: raw?.mobileMediaId ? str(raw.mobileMediaId, 60) : null,
    focalX: clamp(raw?.focalX, 0, 100, 50),
    focalY: clamp(raw?.focalY, 0, 100, 50),
    primaryHref: href(raw?.primaryHref),
    secondaryHref: href(raw?.secondaryHref),
    text,
    items: Array.isArray(raw?.items) ? raw.items.slice(0, 24).map(sanitizeItem) : [],
  };
}

function sanitizeLinks(raw: any, fallback: NavigationLink[]): NavigationLink[] {
  if (!Array.isArray(raw)) return fallback.map((link) => ({ ...link }));
  return raw.slice(0, 16).map((link: any, index: number) => ({
    id: str(link?.id, 40) || `link-${index}`,
    href: href(link?.href),
    visible: link?.visible !== false,
    label: localeText(link?.label, 60),
  }));
}

/** Never throws: invalid input degrades to the built-in defaults. */
export function sanitizeStorefront(raw: any, service: StorefrontService): StorefrontConfig {
  const fallback = defaultStorefront(service);
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.sections)) return fallback;
  const sections = raw.sections
    .slice(0, 30)
    .map((section: any, index: number) => sanitizeSection(section, index))
    .filter(Boolean) as StorefrontSection[];
  if (!sections.length) return fallback;
  return {
    version: 2,
    service,
    sections,
    navigation: sanitizeLinks(raw.navigation, fallback.navigation),
    footerLinks: sanitizeLinks(raw.footerLinks, fallback.footerLinks),
    footerText: localeText(raw.footerText ?? fallback.footerText, 300),
    copyright: localeText(raw.copyright ?? fallback.copyright, 160),
  };
}

/* ---------------------------------- helpers ---------------------------------- */

export function sectionOf(config: StorefrontConfig | null | undefined, type: SectionType): StorefrontSection | null {
  return config?.sections.find((section) => section.type === type && section.visible) ?? null;
}

export function isVisible(config: StorefrontConfig | null | undefined, type: SectionType, fallback = true): boolean {
  if (!config) return fallback;
  const section = config.sections.find((row) => row.type === type);
  return section ? section.visible : fallback;
}

/** Published copy with TR fallback, then the built-in site copy. */
export function tx(section: StorefrontSection | null | undefined, key: string, locale: Locale, fallback: string): string {
  const value = section?.text?.[key];
  return (value?.[locale] || value?.tr || fallback || "").trim() || fallback;
}

export function itemText(value: LocaleText | undefined, locale: Locale, fallback = ""): string {
  return (value?.[locale] || value?.tr || fallback).trim() || fallback;
}

export function missingLocales(config: StorefrontConfig, locale: "de" | "en"): number {
  let missing = 0;
  for (const section of config.sections) {
    for (const value of Object.values(section.text)) if (value.tr && !value[locale]) missing += 1;
    for (const row of section.items) {
      if (row.title.tr && !row.title[locale]) missing += 1;
      if (row.description.tr && !row.description[locale]) missing += 1;
    }
  }
  return missing;
}
