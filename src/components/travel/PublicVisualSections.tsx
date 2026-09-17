import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  PlaneTakeoff,
  QrCode,
  Route,
  ShieldCheck,
  ShowerHead,
  Signal,
  Smartphone,
  TicketCheck,
  Utensils,
  Wifi,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ESIM_CONTENT, LOUNGE_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { getAirport } from "@/domain/geo/airports";
import type { Locale } from "@/domain/enums";
import { useI18n } from "@/i18n";
import airportFrankfurtAsset from "@/assets/airport-frankfurt.jpg.asset.json";
import airportIstanbulAsset from "@/assets/airport-istanbul.jpg.asset.json";
import destinationEuropeAsset from "@/assets/destination-europe.jpg.asset.json";
import destinationRouteAsset from "@/assets/destination-sila-yolu.jpg.asset.json";
import destinationTurkiyeAsset from "@/assets/destination-turkiye.jpg.asset.json";
import esimCrossSellAsset from "@/assets/esim-cross-sell.jpg.asset.json";
import loungeAsset from "@/assets/lounge-card.jpg.asset.json";

const COPY = {
  tr: {
    popularEyebrow: { esim: "İlham veren rotalar", lounge: "Konforlu duraklar" },
    discover: "Keşfet", flexible: "Seyahatine göre",
    routeMeta: "7 ülke · tek rota", airportMeta: "Lounge seçenekleri",
    trust: ["Güvenli ödeme", "Hızlı dijital teslimat", "Hesabında erişim", "Seyahat desteği"],
    stepsEyebrow: "Nasıl çalışır?",
    stepsTitle: { esim: "Bağlantın dört adımda hazır", lounge: "Konforlu mola dört adım uzakta" },
    esimSteps: [["Destinasyon", "Nereye gideceğini seç"], ["Paket", "İhtiyacına uygun seçeneği bul"], ["Ödeme", "Güvenle tamamla"], ["QR kurulum", "Telefonuna kolayca yükle"]],
    loungeSteps: [["Havalimanı", "Uçuş noktanı seç"], ["Lounge", "Olanakları karşılaştır"], ["Rezervasyon", "Girişini güvenle ayır"], ["QR / Voucher", "Kapıda kolayca göster"]],
    deliveryEyebrow: "Dijital teslimat",
    deliveryTitle: { esim: "eSIM’in hazır olduğunda hep yanında", lounge: "Rezervasyonun hazır olduğunda tek yerde" },
    deliveryLead: { esim: "QR koduna hesabından ulaşır, kurulum rehberini açar ve bilgilerini e-postanda da bulursun.", lounge: "Giriş kodun, terminal bilgilerin ve rezervasyon detayların hesabında saklanır; e-postana da gönderilir." },
    accountNote: "Hesabım bölümünde güvenle saklanır", emailNote: "Bilgilerin e-postana da gönderilir",
    sample: "Teslimat önizlemesi", ready: { esim: "eSIM’in hazır", lounge: "Rezervasyonun hazır" },
    primary: { esim: "QR kodunu göster", lounge: "Giriş kodunu göster" }, guide: "Kurulum rehberi", email: "E-postaya gönder",
    crossAction: { esim: "Lounge seçeneklerine bak", lounge: "eSIM’imi bul" },
    amenities: ["Wi-Fi", "Yiyecek", "İçecek", "Duş", "Sessiz alan"],
  },
  de: {
    popularEyebrow: { esim: "Inspirierende Routen", lounge: "Komfortable Stopps" }, discover: "Entdecken", flexible: "Passend zu deiner Reise", routeMeta: "7 Länder · eine Route", airportMeta: "Lounge-Optionen",
    trust: ["Sichere Zahlung", "Schnelle digitale Zustellung", "Zugriff im Konto", "Reise-Support"], stepsEyebrow: "So funktioniert’s", stepsTitle: { esim: "In vier Schritten verbunden", lounge: "In vier Schritten zur entspannten Pause" },
    esimSteps: [["Reiseziel", "Wähle dein Ziel"], ["Paket", "Finde die passende Option"], ["Zahlung", "Sicher abschließen"], ["QR-Installation", "Einfach aufs Handy laden"]], loungeSteps: [["Flughafen", "Wähle deinen Abflugort"], ["Lounge", "Leistungen vergleichen"], ["Buchung", "Zutritt reservieren"], ["QR / Voucher", "Am Eingang vorzeigen"]],
    deliveryEyebrow: "Digitale Zustellung", deliveryTitle: { esim: "Deine eSIM bleibt griffbereit", lounge: "Deine Buchung bleibt an einem Ort" }, deliveryLead: { esim: "QR-Code im Konto öffnen, Anleitung ansehen und Details zusätzlich per E-Mail erhalten.", lounge: "Zutrittscode, Terminal und Buchungsdetails bleiben im Konto und kommen auch per E-Mail." }, accountNote: "Sicher in deinem Konto gespeichert", emailNote: "Details kommen auch per E-Mail", sample: "Zustellvorschau", ready: { esim: "Deine eSIM ist bereit", lounge: "Buchung bereit" }, primary: { esim: "QR-Code anzeigen", lounge: "Zutrittscode anzeigen" }, guide: "Installationsanleitung", email: "Per E-Mail senden", crossAction: { esim: "Lounges ansehen", lounge: "eSIM finden" }, amenities: ["WLAN", "Essen", "Getränke", "Dusche", "Ruhebereich"],
  },
  en: {
    popularEyebrow: { esim: "Inspiring routes", lounge: "Comfortable stops" }, discover: "Explore", flexible: "Made for your trip", routeMeta: "7 countries · one route", airportMeta: "Lounge options",
    trust: ["Secure payment", "Fast digital delivery", "Account access", "Travel support"], stepsEyebrow: "How it works", stepsTitle: { esim: "Connected in four simple steps", lounge: "A calmer break in four steps" },
    esimSteps: [["Destination", "Choose where you are going"], ["Package", "Find the option that fits"], ["Payment", "Complete it securely"], ["QR install", "Add it to your phone"]], loungeSteps: [["Airport", "Choose your flight point"], ["Lounge", "Compare the amenities"], ["Booking", "Reserve your entry"], ["QR / Voucher", "Show it at the door"]],
    deliveryEyebrow: "Digital delivery", deliveryTitle: { esim: "Your eSIM stays within reach", lounge: "Your booking stays in one place" }, deliveryLead: { esim: "Open your QR in your account, view the guide, and receive the details by email too.", lounge: "Your entry code, terminal and booking details stay in your account and arrive by email." }, accountNote: "Stored securely in your account", emailNote: "Details are also sent by email", sample: "Delivery preview", ready: { esim: "Your eSIM is ready", lounge: "Booking ready" }, primary: { esim: "Show QR code", lounge: "Show entry code" }, guide: "Installation guide", email: "Send by email", crossAction: { esim: "View Lounge options", lounge: "Find my eSIM" }, amenities: ["Wi-Fi", "Food", "Drinks", "Shower", "Quiet area"],
  },
} satisfies Record<Locale, Record<string, unknown>>;

const STEP_ICONS = {
  esim: [<MapPin />, <Signal />, <CreditCard />, <QrCode />],
  lounge: [<PlaneTakeoff />, <Coffee />, <CreditCard />, <TicketCheck />],
};

function SafeImage({ src, fallback, alt, className }: { src: string; fallback: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? fallback : src} onError={() => setFailed(true)} alt={alt} loading="lazy" decoding="async" width={1200} height={800} className={className} />;
}

export function TrustStrip() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const icons = [<ShieldCheck />, <QrCode />, <Smartphone />, <Headphones />];
  return <section className="mx-auto max-w-site px-4 py-7 sm:px-6"><div className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-border py-5 md:grid-cols-4">{copy.trust.map((item, index) => <div key={item} className="flex items-center gap-2 text-xs font-semibold sm:text-sm"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4 [&_svg]:stroke-[1.8]">{icons[index]}</span>{item}</div>)}</div></section>;
}

export function VisualPopular({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const section = COPY[locale];
  const fra = getAirport("airport-fra");
  const ist = getAirport("airport-ist");
  const items = service === "esim" ? [
    { id: "tr", flag: "🇹🇷", title: locale === "de" ? "Türkei" : locale === "en" ? "Türkiye" : "Türkiye", meta: locale === "tr" ? "Tek destinasyon" : locale === "de" ? "Ein Reiseziel" : "Single destination", image: destinationTurkiyeAsset.url },
    { id: "eu", flag: "🇪🇺", title: locale === "tr" ? "Avrupa" : locale === "de" ? "Europa" : "Europe", meta: locale === "tr" ? "Bölgesel kapsama" : locale === "de" ? "Regionale Abdeckung" : "Regional coverage", image: destinationEuropeAsset.url },
    { id: "route", flag: "", title: "Sıla Yolu", meta: section.routeMeta, image: destinationRouteAsset.url, route: true },
  ] : [
    { id: "ist", flag: ist?.flag ?? "🇹🇷", title: `IST · ${ist?.city[locale] ?? "İstanbul"}`, meta: section.airportMeta, image: airportIstanbulAsset.url },
    { id: "fra", flag: fra?.flag ?? "🇩🇪", title: `FRA · ${fra?.city[locale] ?? "Frankfurt"}`, meta: section.airportMeta, image: airportFrankfurtAsset.url },
    { id: "comfort", flag: "", title: locale === "tr" ? "Lounge konforu" : locale === "de" ? "Lounge-Komfort" : "Lounge comfort", meta: section.amenities.slice(0, 3).join(" · "), image: loungeAsset.url },
  ];
  return <section id="popular" className="bg-card py-12"><div className="mx-auto max-w-site px-4 sm:px-6"><span className="text-xs font-bold uppercase text-primary">{service === "esim" ? section.popularEyebrow.esim : section.popularEyebrow.lounge}</span><div className="mt-2 flex items-end justify-between gap-4"><div><h2 className="font-display text-2xl font-bold sm:text-3xl">{copy.popularTitle}</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">{copy.popularDescription}</p></div><span className="hidden text-sm font-semibold text-primary sm:block">{section.flexible}</span></div><div className="mt-6 grid gap-3 md:grid-cols-3">{items.map((item) => <article key={item.id} className="group relative aspect-[4/3] overflow-hidden rounded-card bg-primary shadow-card"><SafeImage src={item.image} fallback={service === "esim" ? destinationEuropeAsset.url : loungeAsset.url} alt={item.title} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"/><div className="absolute inset-0 bg-image-scrim"/><div className="absolute inset-x-0 bottom-0 p-4 text-hero-foreground"><div className="flex items-center gap-2"><span className="text-xl" aria-hidden="true">{item.flag}</span>{item.route && <Route className="size-5" aria-hidden="true"/>}<h3 className="font-display text-xl font-bold">{item.title}</h3></div>{item.route && <div className="mt-2 truncate text-sm" aria-hidden="true">🇩🇪 → 🇦🇹 → 🇸🇮 → 🇭🇷 → 🇷🇸 → 🇧🇬 → 🇹🇷</div>}<div className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="opacity-85">{item.meta}</span><span className="inline-flex items-center gap-1 font-semibold">{section.discover}<ArrowRight className="size-4"/></span></div></div></article>)}</div>{service === "lounge" && <div className="mt-4 flex flex-wrap gap-2">{section.amenities.map((amenity, index) => <span key={amenity} className="inline-flex items-center gap-1.5 rounded-full bg-petrol-soft px-3 py-1.5 text-xs font-semibold text-primary">{index === 0 ? <Wifi/> : index === 1 ? <Utensils/> : index === 2 ? <Coffee/> : index === 3 ? <ShowerHead/> : <CheckCircle2/>}{amenity}</span>)}</div>}</div></section>;
}

export function HowItWorks({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n(); const copy = COPY[locale]; const steps = service === "esim" ? copy.esimSteps : copy.loungeSteps;
  return <section id="how" className="bg-petrol-soft py-12"><div className="mx-auto max-w-site px-4 sm:px-6"><span className="text-xs font-bold uppercase text-primary">{copy.stepsEyebrow}</span><h2 className="mt-2 max-w-xl font-display text-2xl font-bold sm:text-3xl">{service === "esim" ? copy.stepsTitle.esim : copy.stepsTitle.lounge}</h2><ol className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">{steps.map(([title, detail], index) => <li key={title} className="relative rounded-card bg-card p-4 shadow-card"><span className="absolute right-3 top-3 text-xs font-bold text-muted-foreground">0{index + 1}</span><span className={`grid size-10 place-items-center rounded-xl [&_svg]:size-5 [&_svg]:stroke-[1.8] ${index % 2 ? "bg-cta-soft text-cta" : "bg-primary-soft text-primary"}`}>{STEP_ICONS[service][index]}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></li>)}</ol></div></section>;
}

export function DeliveryConfidence({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n(); const copy = COPY[locale]; const lounge = service === "lounge";
  return <section className="bg-card py-12"><div className="mx-auto grid max-w-site items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr]"><div><span className="text-xs font-bold uppercase text-primary">{copy.deliveryEyebrow}</span><h2 className="mt-2 max-w-xl font-display text-2xl font-bold sm:text-3xl">{lounge ? copy.deliveryTitle.lounge : copy.deliveryTitle.esim}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{lounge ? copy.deliveryLead.lounge : copy.deliveryLead.esim}</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><TrustNote icon={<Smartphone/>}>{copy.accountNote}</TrustNote><TrustNote icon={<Mail/>}>{copy.emailNote}</TrustNote></div></div><div className="rounded-card border border-border bg-secondary/55 p-4 shadow-card"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-muted-foreground">{copy.sample}</span><span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary"><CheckCircle2 className="size-3.5"/>{lounge ? copy.ready.lounge : copy.ready.esim}</span></div><div className="mt-4 flex items-center gap-4 rounded-xl bg-card p-4"><div className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-primary/40 bg-petrol-soft text-primary">{lounge ? <TicketCheck className="size-9"/> : <QrCode className="size-9"/>}</div><div className="min-w-0"><strong className="block font-display text-lg">{lounge ? "FRA · Terminal 1" : "Türkiye · eSIM"}</strong><span className="mt-1 block text-sm text-muted-foreground">{lounge ? (locale === "tr" ? "Tarih · Yolcu · Rezervasyon" : locale === "de" ? "Datum · Reisende · Buchung" : "Date · Travelers · Booking") : (locale === "tr" ? "Paket · Kurulum · Hesabım" : locale === "de" ? "Paket · Installation · Konto" : "Plan · Installation · Account")}</span></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm"><QrCode/>{lounge ? copy.primary.lounge : copy.primary.esim}</Button>{!lounge && <Button size="sm" variant="outline"><Smartphone/>{copy.guide}</Button>}<Button size="sm" variant="outline"><Mail/>{copy.email}</Button></div></div></div></section>;
}

function TrustNote({ icon, children }: { icon: ReactNode; children: ReactNode }) { return <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4">{icon}</span>{children}</div>; }

export function VisualComplementary({ service, onSwitch }: { service: ServiceSlug; onSwitch: (service: ServiceSlug) => void }) {
  const { locale } = useI18n(); const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale); const section = COPY[locale]; const next = service === "esim" ? "lounge" : "esim";
  const image = service === "esim" ? loungeAsset.url : esimCrossSellAsset.url;
  return <section className="mx-auto max-w-site px-4 py-12 sm:px-6"><div className="grid overflow-hidden rounded-card bg-primary text-primary-foreground shadow-panel md:grid-cols-2"><div className="relative min-h-60"><SafeImage src={image} fallback={loungeAsset.url} alt={copy.crossSellTitle} className="absolute inset-0 size-full object-cover"/><div className="absolute inset-0 bg-image-scrim md:hidden"/></div><div className="flex flex-col justify-center p-6 sm:p-9"><span className="text-xs font-bold uppercase opacity-70">{locale === "tr" ? "Seyahat önerisi" : locale === "de" ? "Reise-Empfehlung" : "Travel recommendation"}</span><h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{copy.crossSellTitle}</h2><p className="mt-3 max-w-lg text-sm leading-6 opacity-80">{copy.crossSellDescription}</p><Button variant="light" className="mt-6 w-fit" onClick={() => { onSwitch(next); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{next === "lounge" ? section.crossAction.esim : section.crossAction.lounge}<ArrowRight/></Button></div></div></section>;
}