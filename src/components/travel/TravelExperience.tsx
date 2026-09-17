import { ArrowRight, CheckCircle2, Plane, Signal, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/i18n";
import { ESIM_CONTENT, LOUNGE_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { ESIM_SERVICE_CONFIG, LOUNGE_SERVICE_CONFIG, SERVICE_REGISTRY } from "@/domain/experience/config";
import type { EsimFinderState, LoungeFinderState } from "@/domain/experience/types";
import type { Locale } from "@/domain/enums";
import { FinderShell, EsimFinder, LoungeFinder } from "./Finder";
import { DeviceCompatibilitySection } from "./DeviceCompatibility";
import { PublicShell } from "./PublicShell";
import { Reveal } from "./Reveal";
import { useServiceSwitchTransition } from "./ServiceSwitchTransition";
import { DeliveryConfidence, HowItWorks, TrustStrip, VisualComplementary, VisualPopular } from "./PublicVisualSections";

const SECTION_COPY = {
  tr: {
    popularEyebrow: { esim: "Bağlantını seç", lounge: "Molanı seç" },
    crossEyebrow: "Seyahat önerisi",
    educationEyebrow: "Bilmen gerekenler",
    educationLead: "Seçim yapmadan önce temel bilgileri hızlıca gözden geçir.",
    discover: "Keşfet",
    lookEsim: "eSIM’e bak",
    lookLounge: "Lounge’a bak",
    esimPopular: [
      { icon: "🇹🇷", title: "Türkiye", meta: "Tek destinasyon" },
      { icon: "🇪🇺", title: "Avrupa", meta: "Bölgesel kapsama" },
      { icon: "🚗", title: "Sıla Yolu", meta: "Çoklu ülke rotası" },
    ],
    esimFaq: ["eSIM nasıl çalışır?", "Telefonum uyumlu mu?", "Kaç GB gerekir?", "Kurulum nasıl yapılır?", "Kapsama nasıl çalışır?"],
    loungeFaq: ["Lounge’a nasıl girilir?", "Neler dahil?", "Kaç saat kalabilirim?", "Kimler kullanabilir?", "Terminal ve giriş şartları"],
    esimAnswers: [
      "eSIM dijital bir SIM’dir; telefonuna QR ile kurulur ve fiziksel kart gerekmez.",
      "Son yılların çoğu akıllı telefonu eSIM destekler. Cihaz ayarlarından eSIM seçeneğini görüyorsan uyumludur.",
      "Mesajlaşma ve harita için az, video ve hotspot için daha fazla veri gerekir. Finder tahmini kullanımı gösterir.",
      "Satın alma sonrası QR kodunu okutur, profili yükler ve veri dolaşımını açarsın.",
      "Kapsama seçtiğin ülke veya bölgeye göre değişir; rotandaki tüm ülkeler listelenir.",
    ],
    loungeAnswers: [
      "Rezervasyon sonrası giriş kodun ya da voucher’ın ile Lounge resepsiyonuna gidersin.",
      "Genellikle ikram, içecek, oturma alanı ve internet dahildir; detaylar Lounge’a göre değişir.",
      "Kalış süresi Lounge kurallarına göre belirlenir ve seçim sırasında gösterilir.",
      "Genellikle yetişkin ve çocuk kuralları farklıdır; koşullar Lounge bazında listelenir.",
      "Doğru terminal ve uçuş durumu önemlidir; seçimini finder üzerinden yaparsın.",
    ],
  },
  de: {
    popularEyebrow: { esim: "Verbindung wählen", lounge: "Pause wählen" },
    crossEyebrow: "Reise-Empfehlung",
    educationEyebrow: "Gut zu wissen",
    educationLead: "Die wichtigsten Infos vor deiner Auswahl.",
    discover: "Entdecken",
    lookEsim: "eSIM ansehen",
    lookLounge: "Lounge ansehen",
    esimPopular: [
      { icon: "🇹🇷", title: "Türkei", meta: "Ein Reiseziel" },
      { icon: "🇪🇺", title: "Europa", meta: "Regionale Abdeckung" },
      { icon: "🚗", title: "Sıla Yolu", meta: "Route über mehrere Länder" },
    ],
    esimFaq: ["Wie funktioniert eine eSIM?", "Ist mein Handy kompatibel?", "Wie viele GB brauche ich?", "Wie läuft die Installation?", "Wie funktioniert die Abdeckung?"],
    loungeFaq: ["Wie komme ich in die Lounge?", "Was ist inklusive?", "Wie lange darf ich bleiben?", "Wer darf sie nutzen?", "Terminal- und Zutrittsbedingungen"],
    esimAnswers: [
      "Eine eSIM ist eine digitale SIM, die per QR-Code installiert wird – ohne physische Karte.",
      "Die meisten aktuellen Smartphones unterstützen eSIM. Findest du eSIM in den Einstellungen, passt es.",
      "Messaging und Karten brauchen wenig, Video und Hotspot deutlich mehr Daten. Der Finder schätzt es.",
      "Nach dem Kauf QR-Code scannen, Profil laden und Datenroaming aktivieren.",
      "Die Abdeckung hängt vom gewählten Land oder der Region ab; alle Länder deiner Route werden gelistet.",
    ],
    loungeAnswers: [
      "Nach der Buchung zeigst du deinen Zutrittscode oder Voucher an der Lounge-Rezeption.",
      "Meist sind Snacks, Getränke, Sitzbereich und WLAN enthalten; Details je Lounge.",
      "Die Aufenthaltsdauer richtet sich nach den Lounge-Regeln und wird bei der Auswahl angezeigt.",
      "Für Erwachsene und Kinder gelten oft eigene Regeln; Details je Lounge.",
      "Terminal und Flugsituation sind wichtig; beides wählst du im Finder.",
    ],
  },
  en: {
    popularEyebrow: { esim: "Choose your connection", lounge: "Choose your break" },
    crossEyebrow: "Travel recommendation",
    educationEyebrow: "Good to know",
    educationLead: "A quick look at the essentials before you choose.",
    discover: "Explore",
    lookEsim: "View eSIM",
    lookLounge: "View Lounge",
    esimPopular: [
      { icon: "🇹🇷", title: "Türkiye", meta: "Single destination" },
      { icon: "🇪🇺", title: "Europe", meta: "Regional coverage" },
      { icon: "🚗", title: "Sıla Yolu", meta: "Multi-country route" },
    ],
    esimFaq: ["How does an eSIM work?", "Is my phone compatible?", "How many GB do I need?", "How do I install it?", "How does coverage work?"],
    loungeFaq: ["How do I enter the lounge?", "What is included?", "How long can I stay?", "Who can use it?", "Terminal and entry conditions"],
    esimAnswers: [
      "An eSIM is a digital SIM installed with a QR code — no physical card needed.",
      "Most recent smartphones support eSIM. If you see eSIM in your settings, you are compatible.",
      "Messaging and maps need little data; video and hotspot need much more. The finder estimates it.",
      "After purchase you scan the QR code, install the profile and turn on data roaming.",
      "Coverage depends on the country or region you choose; every country on your route is listed.",
    ],
    loungeAnswers: [
      "After booking you show your entry code or voucher at the lounge reception.",
      "Usually snacks, drinks, seating and Wi-Fi are included; details vary per lounge.",
      "Maximum stay follows the lounge rules and is shown during selection.",
      "Adult and child rules often differ; conditions are listed per lounge.",
      "The right terminal and flight situation matter; you select both in the finder.",
    ],
  },
} satisfies Record<Locale, unknown>;

export function TravelExperience({ service, onServiceChange }: { service: ServiceSlug; onServiceChange: (service: ServiceSlug) => void }) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const [esimState, setEsimState] = useState<EsimFinderState>(ESIM_SERVICE_CONFIG.initialState);
  const [loungeState, setLoungeState] = useState<LoungeFinderState>(LOUNGE_SERVICE_CONFIG.initialState);
  const { switchService, isSwitching } = useServiceSwitchTransition();

  useEffect(() => {
    if (service === "esim") setLoungeState(LOUNGE_SERVICE_CONFIG.initialState);
    else setEsimState(ESIM_SERVICE_CONFIG.initialState);
  }, [service]);

  const showCrossSell = service === "lounge" || esimState.tripMode === "single";
  const requestServiceChange = (next: ServiceSlug) => {
    if (next === service || isSwitching) return;
    switchService(next, () => onServiceChange(next));
  };

  return (
    <PublicShell activeService={service} onServiceChange={requestServiceChange}>
      <Hero service={service} onFind={() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" })} />
      <div className="mx-auto mt-5 max-w-xl px-4 sm:mt-6">
        <div className="grid grid-cols-2 rounded-2xl border border-border bg-card p-1.5 shadow-card">
          <ServiceButton active={service === "esim"} onClick={() => requestServiceChange("esim")} icon={<Signal />}>eSIM</ServiceButton>
          <ServiceButton active={service === "lounge"} onClick={() => requestServiceChange("lounge")} icon={<Plane />}>Lounge</ServiceButton>
        </div>
      </div>
      <FinderShell title={copy.finderTitle} description={copy.finderDescription}>
        {service === "esim" ? <EsimFinder state={esimState} onChange={setEsimState} /> : <LoungeFinder state={loungeState} onChange={setLoungeState} />}
      </FinderShell>
      {service === "esim" && <DeviceCompatibilitySection />}
      <Reveal><TrustStrip /></Reveal>
      <Reveal><VisualPopular service={service} /></Reveal>
      {showCrossSell && <Reveal><VisualComplementary service={service} onSwitch={requestServiceChange} /></Reveal>}
      <Reveal><HowItWorks service={service} /></Reveal>
      <Reveal><DeliveryConfidence service={service} /></Reveal>
      <Reveal><Education service={service} /></Reveal>
      <Reveal><FinalCta service={service} /></Reveal>
    </PublicShell>
  );
}

function ServiceButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:stroke-[1.8] ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}
    >
      {icon}
      {children}
      {active && <CheckCircle2 className="size-4" />}
    </button>
  );
}

function Hero({ service, onFind }: { service: ServiceSlug; onFind: () => void }) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const media = SERVICE_REGISTRY[service].media;
  const [failed, setFailed] = useState(false);
  const src = failed ? media.fallbackSrc : media.desktopSrc;

  return (
    <section className="mx-auto max-w-site px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="relative min-h-[30rem] overflow-hidden rounded-hero bg-primary sm:min-h-[34rem]">
        <picture>
          <source media="(max-width: 639px)" srcSet={failed ? media.fallbackSrc : media.mobileSrc} />
          <img
            src={src}
            onError={() => setFailed(true)}
            alt={media.alt[locale] ?? media.alt.tr}
            width={1600}
            height={1008}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative flex min-h-[30rem] max-w-2xl flex-col justify-between gap-8 p-6 text-hero-foreground sm:min-h-[34rem] sm:p-10 lg:p-14">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-8 place-items-center rounded-full bg-hero-foreground/15">{service === "esim" ? <Smartphone className="size-4" /> : <Plane className="size-4" />}</span>
              {copy.eyebrow}
            </span>
            <h1 className="mt-4 max-w-xl font-display text-4xl font-bold leading-[1.06] sm:text-6xl">{copy.headline}</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-hero-foreground/85 sm:text-lg">{copy.description}</p>
            <Button onClick={onFind} variant="cta" size="lg" className="mt-6">{copy.cta}<ArrowRight /></Button>
          </div>
          <div className="w-fit max-w-xs rounded-2xl bg-card/95 p-4 text-card-foreground shadow-card backdrop-blur">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{copy.offerTitle}</span>
            <strong className="mt-1 block text-lg">{copy.offerValue}</strong>
            <span className="mt-1 block text-sm text-muted-foreground">{copy.offerMeta}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <span className="text-xs font-bold uppercase text-primary">{eyebrow}</span>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function Education({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const section = SECTION_COPY[locale];
  const questions = service === "esim" ? section.esimFaq : section.loungeFaq;
  const answers = service === "esim" ? section.esimAnswers : section.loungeAnswers;

  return (
    <section id="how" className="mx-auto max-w-site scroll-mt-24 px-4 py-10 sm:px-6">
      <SectionHeading eyebrow={section.educationEyebrow} title={copy.educationTitle} description={section.educationLead} />
      <Accordion type="single" collapsible className="rounded-card border border-border bg-card px-5">
        {questions.map((question, index) => (
          <AccordionItem key={question} value={`item-${index}`}>
            <AccordionTrigger className="text-left">{question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{answers[index]}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function FinalCta({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  return (
    <section className="mx-auto max-w-site px-4 pb-14 pt-4 text-center sm:px-6">
      <div className="rounded-card bg-accent-soft px-5 py-10">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{copy.finalTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{copy.finalDescription}</p>
        <Button variant="cta" size="lg" className="mt-6" onClick={() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" })}>
          {copy.cta}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
