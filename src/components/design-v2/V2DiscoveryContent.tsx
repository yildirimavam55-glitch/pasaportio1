import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Apple, ArrowRight, BookOpen, CheckCircle2, ChevronDown, CreditCard, FileText, Globe2, Headphones, MapPin, MessageCircle, Navigation, PhoneCall, Play, Settings, Smartphone, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeviceCompatibilityPrompt } from "@/components/travel/DeviceCompatibility";
import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { seoPath } from "@/domain/seo/paths";
import { useI18n } from "@/i18n";
import { listFeaturedGuides } from "@/lib/guides.functions";
import { SectionTitle } from "./V2Shell";
import { V2InstallAnimation } from "./V2InstallAnimation";
import { localize } from "@/i18n/overlay";
import faqTravelEsim from "@/assets/faq-travel-esim.jpg";

const COPY = localize({
  tr: {
    dataTitle: "Ne kadar internet kullanırım?",
    dataLead: "Kullanım kişiden kişiye değişir; bunlar karşılaştırma için yaklaşık göstergelerdir.",
    usage: [["Mesajlaşma", "Çok az"], ["Haritalar", "Az"], ["Sosyal medya", "Orta"], ["Video", "Yüksek"], ["Video arama", "Çok yüksek"]],
    calculate: "İhtiyacımı hesapla",
    compatibility: "Telefonum eSIM uyumlu mu?",
    install: "eSIM kurulumu çok kolay",
    installLead: "Gerçek QR kodun ve kurulum bilgilerin, satın alma ve provisioning tamamlandıktan sonra hesabında görünür.",
    installCta: "Detaylı kurulum rehberi",
    installSub: "Sadece birkaç adımda bağlantıya hazır.",
    animSteps: ["QR kodunu al", "QR kodunu tara", "eSIM'i ekle", "Bağlantını aç"],
    quickAnimSteps: ["Bağlantıyı aç", "Yüklemeye dokun", "eSIM'i ekle", "Kurulum hazır"],
    animReady: "eSIM hazır",
    animAdding: "eSIM ekleniyor...",
    installMethod: "Kurulum yöntemi", quickSelector: "Hızlı Kurulum", qrSelector: "QR Kod",
    quickLabel: "Link ile hızlı kurulum", quickDescription: "Tek dokunuşla kurulumu başlatın; QR kod gerekmez.", qrLabel: "QR kod ile kurulum", qrDescription: "Başka bir ekrandaki kodu telefonunuzla tarayın.",
    iphone: "iPhone",
    android: "Android",
    iphoneSteps: ["Hesabındaki gerçek QR kodunu başka bir ekranda aç.", "Ayarlar → Hücresel → eSIM Ekle bölümüne git.", "QR kodunu tara ve ekrandaki adımları tamamla.", "Paket bilgilerine göre mobil veri hattını ayarla."],
    androidSteps: ["Hesabındaki gerçek QR kodunu başka bir ekranda aç.", "Ayarlar → Bağlantılar / SIM yöneticisine git.", "eSIM ekle seçeneğiyle QR kodunu tara.", "Paket bilgilerine göre mobil veri hattını ayarla."],
    qrNote: "Bu alanda örnek QR üretilmez; QR yalnızca gerçek satın alma ve provisioning sonucundan gelir.",
    why: "Neden travely?",
    whyItems: ["Gerçek paket seçenekleri", "Kolay paket seçimi", "eSIM bilgilerine hesabından erişim", "WhatsApp destek"],
    guides: "Seyahat rehberi",
    guideLead: "Yayınlanmış gerçek seyahat içerikleri.",
    allGuides: "Tüm yazılar",
    faq: "eSIM hakkında sık sorulanlar",
    questions: [
      ["eSIM nedir?", "eSIM, uyumlu telefona dijital olarak eklenen bir mobil veri hattıdır."],
      ["Telefonum eSIM uyumlu mu?", "Marka ve modelini cihaz kontrolünde seç. Operatör kilidi ve bölgesel model farklılıkları yine etkili olabilir."],
      ["eSIM'i nasıl kurarım?", "Satın alma ve provisioning tamamlandıktan sonra hesabındaki gerçek kurulum bilgilerini kullan. iPhone ve Android adımları cihaz sürümüne göre küçük farklılıklar gösterebilir."],
      ["QR kodunu nereden bulurum?", "Gerçek QR kodu, tedarikçi provisioning sonucu oluştuğunda eSIM alanında görünür. Bu site örnek veya sahte QR üretmez."],
      ["Ne kadar internet almalıyım?", "Seyahat süreni ve kullanım alışkanlıklarını paket yardımcısına gir; sonuç uygun gerçek katalog paketleriyle eşleştirilir."],
      ["Paket hangi ülkelerde geçerli?", "Paket detayındaki gerçek kapsam listesini kontrol et. Ülke paketleri ile bölgesel paketler ayrı gösterilir."],
      ["Fiziksel SIM kartımı kullanmaya devam edebilir miyim?", "Birçok uyumlu cihaz iki hattı birlikte yönetebilir. Cihaz modeli, bölgesel varyant ve operatör ayarları önemlidir."],
    ],
  },
  de: {
    dataTitle: "Wie viel Datenvolumen brauche ich?",
    dataLead: "Die Nutzung ist individuell; diese Angaben dienen nur als grobe Orientierung.",
    usage: [["Messaging", "Sehr wenig"], ["Karten", "Wenig"], ["Social Media", "Mittel"], ["Video", "Hoch"], ["Videoanrufe", "Sehr hoch"]],
    calculate: "Bedarf berechnen",
    compatibility: "Ist mein Handy eSIM-fähig?",
    install: "eSIM ganz einfach installieren",
    installLead: "Dein echter QR-Code und die Einrichtungsdaten erscheinen nach Kauf und Provisionierung in deinem Konto.",
    installCta: "Ausführliche Installationshilfe",
    installSub: "In wenigen Schritten verbunden.",
    animSteps: ["QR-Code erhalten", "QR-Code scannen", "eSIM hinzufügen", "Verbindung aktivieren"],
    quickAnimSteps: ["Link öffnen", "Installieren antippen", "eSIM hinzufügen", "Einrichtung bereit"],
    animReady: "eSIM bereit",
    animAdding: "eSIM wird hinzugefügt...",
    installMethod: "Installationsmethode", quickSelector: "Schnellinstallation", qrSelector: "QR-Code",
    quickLabel: "Schnellinstallation per Link", quickDescription: "Starte die Installation mit einem Tippen – ohne QR-Code.", qrLabel: "Installation per QR-Code", qrDescription: "Scanne den Code auf einem anderen Bildschirm mit deinem Handy.",
    iphone: "iPhone",
    android: "Android",
    iphoneSteps: ["Öffne den echten QR-Code aus deinem Konto auf einem anderen Bildschirm.", "Öffne Einstellungen → Mobilfunk → eSIM hinzufügen.", "Scanne den QR-Code und folge den angezeigten Schritten.", "Richte die mobile Datenleitung gemäß den Paketangaben ein."],
    androidSteps: ["Öffne den echten QR-Code aus deinem Konto auf einem anderen Bildschirm.", "Öffne Einstellungen → Verbindungen / SIM-Manager.", "Wähle eSIM hinzufügen und scanne den QR-Code.", "Richte die mobile Datenleitung gemäß den Paketangaben ein."],
    qrNote: "Hier wird kein Beispiel-QR-Code erzeugt; er stammt ausschließlich aus einem echten Kauf und der Provisionierung.",
    why: "Warum travely?",
    whyItems: ["Echte Paketoptionen", "Einfache Paketauswahl", "eSIM-Daten im eigenen Konto", "WhatsApp-Support"],
    guides: "Reiseratgeber",
    guideLead: "Echte veröffentlichte Reiseinhalte.",
    allGuides: "Alle Ratgeber",
    faq: "Häufige Fragen zur eSIM",
    questions: [
      ["Was ist eine eSIM?", "Eine eSIM ist ein digitaler Mobilfunktarif für ein kompatibles Handy."],
      ["Ist mein Handy eSIM-fähig?", "Wähle Marke und Modell in der Geräteprüfung. Anbietersperren und regionale Modellvarianten können dennoch abweichen."],
      ["Wie installiere ich die eSIM?", "Nutze nach Kauf und Provisionierung die echten Einrichtungsdaten in deinem Konto. Einzelne Schritte können je nach iPhone- oder Android-Version leicht abweichen."],
      ["Wo finde ich den QR-Code?", "Der echte QR-Code erscheint im eSIM-Bereich, sobald die Provisionierung des Anbieters abgeschlossen ist. Es wird kein Beispiel-QR erzeugt."],
      ["Wie viel Datenvolumen brauche ich?", "Gib Reisedauer und Nutzung in den Paketassistenten ein; das Ergebnis wird mit tatsächlich verfügbaren Paketen abgeglichen."],
      ["In welchen Ländern gilt das Paket?", "Prüfe die echte Abdeckung in den Paketdetails. Länder- und Regionalpakete werden getrennt dargestellt."],
      ["Kann ich meine physische SIM weiter nutzen?", "Viele kompatible Geräte verwalten beide Leitungen. Modell, regionale Variante und Anbietereinstellungen sind entscheidend."],
    ],
  },
  en: {
    dataTitle: "How much data will I use?",
    dataLead: "Usage varies by person; these are approximate comparisons, not guarantees.",
    usage: [["Messaging", "Very low"], ["Maps", "Low"], ["Social media", "Medium"], ["Video", "High"], ["Video calls", "Very high"]],
    calculate: "Calculate my needs",
    compatibility: "Is my phone eSIM compatible?",
    install: "eSIM installation is easy",
    installLead: "Your real QR code and setup details appear in your account after purchase and provisioning are complete.",
    installCta: "Detailed installation guide",
    installSub: "Ready to connect in just a few steps.",
    animSteps: ["Get QR code", "Scan QR code", "Add eSIM", "Enable connection"],
    quickAnimSteps: ["Open the link", "Tap install", "Add eSIM", "Setup ready"],
    animReady: "eSIM ready",
    animAdding: "Adding eSIM...",
    installMethod: "Installation method", quickSelector: "Quick Install", qrSelector: "QR Code",
    quickLabel: "Quick Install by link", quickDescription: "Start installation with one tap—no QR code needed.", qrLabel: "Install with QR code", qrDescription: "Scan the code shown on another screen with your phone.",
    iphone: "iPhone",
    android: "Android",
    iphoneSteps: ["Open the real QR code from your account on another screen.", "Go to Settings → Cellular → Add eSIM.", "Scan the QR code and follow the on-screen steps.", "Set the mobile data line according to your package details."],
    androidSteps: ["Open the real QR code from your account on another screen.", "Go to Settings → Connections / SIM manager.", "Choose Add eSIM and scan the QR code.", "Set the mobile data line according to your package details."],
    qrNote: "No sample QR code is created here; it only comes from a real purchase and provisioning result.",
    why: "Why travely?",
    whyItems: ["Real package options", "Easy plan selection", "eSIM details in your account", "WhatsApp support"],
    guides: "Travel guides",
    guideLead: "Real published travel content.",
    allGuides: "All guides",
    faq: "Frequently asked eSIM questions",
    questions: [
      ["What is an eSIM?", "An eSIM is a digital mobile data line added to a compatible phone."],
      ["Is my phone eSIM compatible?", "Choose your brand and model in the device checker. Carrier locks and regional model variants can still differ."],
      ["How do I install the eSIM?", "After purchase and provisioning, use the real setup details in your account. Steps may vary slightly by iPhone or Android version."],
      ["Where do I find the QR code?", "The real QR code appears in the eSIM area when supplier provisioning completes. No sample or fake QR is generated."],
      ["How much data should I buy?", "Enter your trip length and usage in the plan assistant; the result is matched against real available packages."],
      ["Which countries does the package cover?", "Check the real coverage list in package details. Country and regional packages are presented separately."],
      ["Can I keep using my physical SIM?", "Many compatible devices can manage both lines. The model, regional variant, and carrier settings still matter."],
    ],
  },
} as const);

const usageIcons = [MessageCircle, Navigation, Smartphone, Play, PhoneCall];

export function V2DataEducation({ onCalculate }: { onCalculate: () => void }) {
  const { locale } = useI18n();
  const c = COPY[locale];
  return (
    <section className="lg:py-2">
      <SectionTitle>{c.dataTitle}</SectionTitle>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{c.dataLead}</p>
      <ul className="grid grid-cols-5 gap-1.5">
        {c.usage.map(([label, level], index) => {
          const Icon = usageIcons[index] ?? Smartphone;
          return <li key={label} className="min-w-0 rounded-xl bg-card px-1.5 py-2 text-center ring-1 ring-border"><Icon className="mx-auto size-4 text-[var(--v2-service)]"/><strong className="mt-1 block text-[9px] leading-tight text-foreground">{label}</strong><span className="block text-[8px] leading-tight text-muted-foreground">{level}</span></li>;
        })}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={onCalculate} className="mt-3 w-full">{c.calculate}</Button>
    </section>
  );
}

export function V2Compatibility({ title, desktopCard = false }: { title?: string; desktopCard?: boolean } = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  return <section className={desktopCard ? "lg:flex lg:flex-col" : undefined}><SectionTitle>{title || c.compatibility}</SectionTitle><div className={desktopCard ? "lg:flex lg:h-48 lg:items-stretch" : undefined}><DeviceCompatibilityPrompt /></div></section>;
}

type InstallProps = { title?: string; subtitle?: string; steps?: string[]; ready?: string; adding?: string; cta?: string; href?: V2SafeLink; variant?: "animated" | "simple" };

/** Copy/link/variant can come from the storefront builder; animation stays decorative (no real QR). */
export function V2Installation({ title, subtitle, steps, ready, adding, cta, href = "/esim/kurulum", variant = "animated" }: InstallProps = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const stepList = steps?.length ? steps : [...c.animSteps];
  const [animationState, setAnimationState] = useState<{ method: "quick" | "qr"; phase: number }>({ method: "quick", phase: 0 });
  const visibleSteps = animationState.method === "quick" ? c.quickAnimSteps : stepList;
  const handleAnimationState = useCallback((method: "quick" | "qr", phase: number) => {
    setAnimationState((current) => current.method === method && current.phase === phase ? current : { method, phase });
  }, []);
  const search = (href === "/esim" ? { country: "" } : href === "/lounge" ? { iata: "" } : href === "/esim/kurulum" ? { platform: "ios", brand: "" } : undefined) as never;
  return (
    <section>
      <div className="lg:hidden"><SectionTitle>{title || c.install}</SectionTitle></div>
      <div className="lg:grid lg:min-h-[22rem] lg:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] lg:items-center lg:gap-8 lg:rounded-3xl lg:bg-card lg:px-10 lg:py-6 lg:ring-1 lg:ring-border">
        <div className="lg:flex lg:min-h-[20rem] lg:items-center lg:justify-center">{variant === "simple" ? <div className="lg:hidden"><InstallationSteps items={stepList} /></div> : <V2InstallAnimation quickSteps={c.quickAnimSteps} qrSteps={stepList} ready={ready || c.animReady} adding={adding || c.animAdding} quickLabel={c.quickLabel} quickDescription={c.quickDescription} qrLabel={c.qrLabel} qrDescription={c.qrDescription} selectorLabel={c.installMethod} quickSelectorLabel={c.quickSelector} qrSelectorLabel={c.qrSelector} onStateChange={handleAnimationState} />}</div>
        <div className="lg:py-3">
          <h2 className="hidden font-display text-3xl font-bold text-foreground lg:block">{title || c.install}</h2>
          {(subtitle ?? c.installSub) && <p className="mb-3 text-xs leading-relaxed text-muted-foreground lg:mt-3 lg:text-base">{subtitle ?? c.installSub}</p>}
          <div className="hidden lg:block"><InstallationSteps items={visibleSteps} activeStep={animationState.phase} /></div>
          {(cta ?? c.installCta) && <Button asChild variant="outline" size="sm" className="mt-3 w-full lg:mt-6 lg:w-auto"><Link to={href} search={search}>{cta || c.installCta}<ArrowRight /></Link></Button>}
        </div>
      </div>
    </section>
  );
}

function InstallationSteps({ items, activeStep }: { items: readonly string[]; activeStep?: number }) {
  return <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 lg:mt-6 lg:grid-cols-1 lg:gap-2">{items.map((step, index) => { const active = activeStep === index; return <li key={step} className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-[10px] leading-snug transition-colors duration-300 lg:min-h-12 lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm ${active ? "lg:bg-primary-soft lg:font-bold lg:text-foreground" : "text-muted-foreground"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold transition-colors duration-300 lg:size-8 lg:text-xs ${active || activeStep == null ? "bg-[var(--v2-service)] text-primary-foreground" : "bg-secondary text-muted-foreground ring-1 ring-border"}`}>{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>; })}</ol>;
}

export function V2WhyTravely() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const icons = [CheckCircle2, Sparkles, Smartphone, Headphones];
  return <section><SectionTitle>{c.why}</SectionTitle><ul className="grid grid-cols-2 gap-2">{c.whyItems.map((item, index) => { const Icon = icons[index] ?? CheckCircle2; return <li key={item} className="flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border"><Icon className="size-4 shrink-0 text-[var(--v2-service)]"/><span className="text-[10px] font-semibold leading-tight text-foreground">{item}</span></li>; })}</ul></section>;
}

/** CMS FAQ. `relaxed` changes spacing only; the questions always come from the caller (Admin). */
export function V2CompactFaq({ title, questions, relaxed = false }: { title: string; questions: readonly (readonly string[])[]; relaxed?: boolean }) {
  return <section data-faq-density={relaxed ? "comfortable" : "default"} className={relaxed ? "lg:grid lg:grid-cols-[minmax(15rem,0.38fr)_minmax(0,1fr)] lg:items-start lg:gap-12" : undefined}><SectionTitle>{title}</SectionTitle><Accordion type="single" collapsible className={`rounded-xl bg-card ring-1 ring-border ${relaxed ? "px-4 lg:px-5" : "px-3"}`}>{questions.map((item, index) => { const question = item[0] ?? ""; const answer = item[1] ?? ""; return <AccordionItem key={`${index}-${question}`} value={`service-faq-${index}`}><AccordionTrigger className={`text-left font-bold hover:no-underline ${relaxed ? "min-h-[3.5rem] py-4 text-sm" : "py-3 text-xs"}`}>{question}</AccordionTrigger><AccordionContent className={`leading-relaxed text-muted-foreground ${relaxed ? "pb-4 text-sm" : "text-xs"}`}>{answer}</AccordionContent></AccordionItem>; })}</Accordion></section>;
}

export function V2GuidesRail({ title, lead, allLabel }: { title?: string; lead?: string; allLabel?: string } = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const { data = [], isPending } = useQuery({ queryKey: ["v2-guides", locale], queryFn: () => listFeaturedGuides({ data: { locale, limit: 4 } }), staleTime: 5 * 60_000 });
  // Reserve the final section footprint while guides load so the page never jumps.
  if (isPending) return (
    <section className="mb-4 pb-4" aria-hidden>
      <SectionTitle>{title || c.guides}</SectionTitle>
      {(lead ?? c.guideLead) && <p className="-mt-0.5 mb-4 text-xs text-muted-foreground">{lead ?? c.guideLead}</p>}
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:px-0">
        {[0, 1, 2].map((i) => <div key={i} className="h-[17rem] w-[84vw] max-w-[22rem] shrink-0 rounded-xl bg-muted/70 sm:w-[17rem] lg:h-[21.2rem] lg:w-auto lg:max-w-none" />)}
      </div>
    </section>
  );
  if (!data.length) return null;
  return (
    <section className="mb-4 pb-4">
      <SectionTitle action={<SeoPathLink path={`/${locale}/${locale === "tr" ? "rehber" : locale === "de" ? "ratgeber" : "guides"}`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">{allLabel || c.allGuides}<ArrowRight className="size-3.5" /></SeoPathLink>}>{title || c.guides}</SectionTitle>
      {(lead ?? c.guideLead) && <p className="-mt-0.5 mb-4 text-xs text-muted-foreground">{lead ?? c.guideLead}</p>}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [overscroll-behavior-inline:contain] [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0">
        {data.slice(0, 3).map((guide) => <li key={guide.id} className="w-[84vw] max-w-[22rem] shrink-0 snap-start sm:w-[17rem] lg:w-auto lg:max-w-none"><SeoPathLink path={seoPath(guide.translationLocale, guide.contentType, guide.slug)} className="group block h-full overflow-hidden rounded-xl bg-card ring-1 ring-border">{guide.heroImageUrl ? <img src={guide.heroImageUrl} alt={guide.heroAlt ?? guide.title} loading="lazy" decoding="async" className="h-[8.5rem] w-full object-cover lg:h-48"/> : <div className="grid h-[8.5rem] place-items-center bg-muted lg:h-48"><BookOpen className="size-6 text-muted-foreground"/></div>}<div className="p-4">{guide.categoryName && <span className="text-[9px] font-bold uppercase text-primary">{guide.categoryName}</span>}<h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-foreground lg:text-lg">{guide.title}</h3>{guide.excerpt && <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground lg:text-sm">{guide.excerpt}</p>}<ArrowRight className="ml-auto mt-1.5 size-4 text-primary"/></div></SeoPathLink></li>)}
      </ul>
    </section>
  );
}

export function V2EsimFaq({ compact = false, title, questions: custom }: { compact?: boolean; title?: string; questions?: ReadonlyArray<readonly [string, string]> }) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const questions: ReadonlyArray<readonly [string, string]> = custom ? custom : compact
    ? [c.questions[0], c.questions[1], c.questions[2], c.questions[3], c.questions[5]].filter(Boolean) as Array<readonly [string, string]>
    : c.questions;
  return (
    <section id="faq" className="scroll-mt-24 lg:grid lg:grid-cols-[minmax(15rem,0.38fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <SectionTitle>{title || c.faq}</SectionTitle>
      <Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{questions.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="min-h-[3.25rem] py-3 text-left text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion>
    </section>
  );
}

const CATEGORIZED_FAQ = localize({
  tr: {
    eyebrow: "SSS",
    title: "Sık sorulan sorular",
    subtitle: "eSIM'lerimizle ilgili en önemli soruların hızlı yanıtlarını burada bulabilirsin.",
    helpPoints: ["Hızlı yanıtlar", "Tüm önemli bilgiler bir arada", "Diğer soruların için destek ekibimiz yanında"],
    imageAlt: "Akdeniz kıyısında harita üzerinde seyahat telefonu",
    installationCta: "Kurulum rehberini incele",
    supportEyebrow: "BAŞKA SORUN MU VAR?",
    supportTitle: "Destek ekibimiz yanında",
    supportText: "Sana hızlı ve kişisel olarak yardımcı olmaktan memnuniyet duyarız.",
    supportCta: "Desteğe git",
    categories: [
      { id: "faq.category.general", title: "eSIM hakkında genel bilgiler", subtitle: "En önemli temel bilgiler bir arada", questions: [
        { id: "faq.general.what_is_esim", question: "eSIM nedir?", answer: "eSIM, uyumlu bir cihaza dijital olarak eklenen mobil veri hattıdır." },
        { id: "faq.general.delivery", question: "eSIM'imi nasıl alırım?", answer: "Satın alma ve tedarikçi işlemi tamamlandığında gerçek eSIM bilgilerin hesabında gösterilir." },
        { id: "faq.general.validity", question: "Paketimin geçerliliği ne zaman başlar?", answer: "Aktivasyon koşulları pakete göre değişebilir. Satın almadan önce paket detaylarını kontrol et." },
      ] },
      { id: "faq.category.installation", title: "Kurulum ve ayarlar", subtitle: "eSIM'ini nasıl kurup kullanacağını öğren", questions: [
        { id: "faq.installation.install", question: "eSIM'i nasıl kurarım?", answer: "Hesabındaki gerçek kurulum bilgilerini kullan. Adımlar iPhone veya Android sürümüne göre küçük farklılıklar gösterebilir.", installationLink: true },
        { id: "faq.installation.physical_sim", question: "Fiziksel SIM kartımı açık tutabilir miyim?", answer: "Birçok uyumlu cihaz iki hattı yönetebilir; kesin özellik cihaz modeline ve bölgesel varyanta bağlıdır." },
      ] },
      { id: "faq.category.usage", title: "Yurt dışında kullanım", subtitle: "Şebeke, internet ve ek paketler", questions: [
        { id: "faq.usage.network", question: "eSIM hangi şebekeleri kullanır?", answer: "Şebeke bilgisi pakete ve ülkeye bağlıdır. Varsa güncel bilgiyi paket detaylarında kontrol et." },
        { id: "faq.usage.data_finished", question: "İnternetim biterse ne olur?", answer: "Paket koşulları ürüne göre değişir. İhtiyacın olursa yayınlanmış başka bir uygun paket satın alabilirsin." },
        { id: "faq.usage.buy_another", question: "Başka bir paket satın alabilir miyim?", answer: "Evet, mevcut katalogda yayınlanmış uygun bir paketi ayrıca satın alabilirsin." },
      ] },
      { id: "faq.category.payment", title: "Ödeme, sipariş ve diğerleri", subtitle: "Fiyatlar, ödeme yöntemleri ve diğer konular", questions: [
        { id: "faq.payment.methods", question: "Nasıl ödeme yapabilirim?", answer: "Kullanılabilir ödeme yöntemleri güvenli ödeme adımında gösterilir." },
        { id: "faq.payment.order", question: "Siparişimi ve eSIM bilgilerimi nerede bulabilirim?", answer: "Satın alma ve tedarikçi işlemi tamamlandıktan sonra sipariş durumunu ve gerçek eSIM bilgilerini hesabında görebilirsin." },
        { id: "faq.communication.whatsapp", question: "WhatsApp'ı normal numaramla kullanabilir miyim?", answer: "WhatsApp hesabın mevcut numaranla kalabilir; uygulama ve cihaz ayarlarını değiştirmeden önce kendi yapılandırmanı kontrol et." },
      ] },
    ],
  },
  de: {
    eyebrow: "FAQ",
    title: "Häufig gestellte Fragen",
    subtitle: "Hier finden Sie schnelle Antworten auf die wichtigsten Fragen rund um unsere eSIMs.",
    helpPoints: ["Schnelle Antworten", "Alles Wichtige an einem Ort", "Bei weiteren Fragen: unser Support hilft gerne"],
    imageAlt: "Reise-Smartphone auf einer Karte an der Mittelmeerküste",
    installationCta: "Installationsanleitung ansehen",
    supportEyebrow: "NOCH FRAGEN?",
    supportTitle: "Unser Support ist für Sie da",
    supportText: "Wir helfen Ihnen gerne weiter – schnell und persönlich.",
    supportCta: "Zum Support",
    categories: [
      { id: "faq.category.general", title: "Allgemeines zur eSIM", subtitle: "Die wichtigsten Grundlagen auf einen Blick", questions: [
        { id: "faq.general.what_is_esim", question: "Was ist eine eSIM?", answer: "Eine eSIM ist eine digitale mobile Datenleitung, die einem kompatiblen Gerät hinzugefügt wird." },
        { id: "faq.general.delivery", question: "Wie erhalte ich meine eSIM?", answer: "Nach Kauf und abgeschlossener Anbieterbearbeitung erscheinen Ihre echten eSIM-Daten in Ihrem Konto." },
        { id: "faq.general.validity", question: "Wann beginnt die Gültigkeit meines Pakets?", answer: "Die Aktivierungsbedingungen können je nach Paket variieren. Prüfen Sie vor dem Kauf die Paketdetails." },
      ] },
      { id: "faq.category.installation", title: "Installation & Einrichtung", subtitle: "So installieren und nutzen Sie Ihre eSIM", questions: [
        { id: "faq.installation.install", question: "Wie installiere ich die eSIM?", answer: "Nutzen Sie nach dem Kauf die echten Einrichtungsdaten in Ihrem Konto. Einzelne Schritte können je nach iPhone- oder Android-Version leicht abweichen.", installationLink: true },
        { id: "faq.installation.physical_sim", question: "Kann ich meine physische SIM aktiv lassen?", answer: "Viele kompatible Geräte verwalten beide Leitungen; die genaue Funktion hängt von Modell und regionaler Variante ab." },
      ] },
      { id: "faq.category.usage", title: "Nutzung im Ausland", subtitle: "Netzwerk, Daten und zusätzliche Pakete", questions: [
        { id: "faq.usage.network", question: "Welche Netze nutzt die eSIM?", answer: "Netzangaben hängen von Paket und Land ab. Prüfen Sie die aktuellen Angaben, sofern vorhanden, in den Paketdetails." },
        { id: "faq.usage.data_finished", question: "Was passiert, wenn mein Datenvolumen aufgebraucht ist?", answer: "Die Bedingungen unterscheiden sich je nach Produkt. Bei Bedarf können Sie ein weiteres passendes, veröffentlichtes Paket kaufen." },
        { id: "faq.usage.buy_another", question: "Kann ich ein weiteres Paket kaufen?", answer: "Ja, Sie können ein weiteres passendes, veröffentlichtes Paket aus dem aktuellen Katalog kaufen." },
      ] },
      { id: "faq.category.payment", title: "Zahlung, Bestellung & Sonstiges", subtitle: "Preise, Zahlungsarten und weitere Themen", questions: [
        { id: "faq.payment.methods", question: "Wie kann ich bezahlen?", answer: "Die verfügbaren Zahlungsarten werden Ihnen sicher im Checkout angezeigt." },
        { id: "faq.payment.order", question: "Wo finde ich meine Bestellung und eSIM-Daten?", answer: "Nach Kauf und abgeschlossener Anbieterbearbeitung sehen Sie den Bestellstatus und Ihre echten eSIM-Daten in Ihrem Konto." },
        { id: "faq.communication.whatsapp", question: "Kann ich WhatsApp mit meiner normalen Nummer nutzen?", answer: "Ihr WhatsApp-Konto kann mit Ihrer bisherigen Nummer bestehen bleiben. Prüfen Sie Ihre eigene App- und Gerätekonfiguration vor Änderungen." },
      ] },
    ],
  },
  en: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    subtitle: "Here you’ll find quick answers to the most important questions about our eSIMs.",
    helpPoints: ["Fast answers", "Everything important in one place", "For more questions, our support team is happy to help"],
    imageAlt: "Travel smartphone on a map by the Mediterranean coast",
    installationCta: "View installation guide",
    supportEyebrow: "STILL HAVE QUESTIONS?",
    supportTitle: "Our support team is here for you",
    supportText: "We’re happy to help—quickly and personally.",
    supportCta: "Go to support",
    categories: [
      { id: "faq.category.general", title: "General eSIM", subtitle: "The essentials at a glance", questions: [
        { id: "faq.general.what_is_esim", question: "What is an eSIM?", answer: "An eSIM is a digital mobile data line added to a compatible phone." },
        { id: "faq.general.delivery", question: "How do I receive my eSIM?", answer: "Your real QR code and setup details appear in your account after purchase and provisioning are complete." },
        { id: "faq.general.validity", question: "When does my package validity begin?", answer: "Start timing may vary by country and product. We do not assume an activation time without product data." },
      ] },
      { id: "faq.category.installation", title: "Installation & setup", subtitle: "How to install and use your eSIM", questions: [
        { id: "faq.installation.install", question: "How do I install the eSIM?", answer: "After purchase and provisioning, use the real setup details in your account. Steps may vary slightly by iPhone or Android version.", installationLink: true },
        { id: "faq.installation.physical_sim", question: "Can I keep my physical SIM active?", answer: "Many compatible devices can manage both lines. The model, regional variant, and carrier settings still matter." },
      ] },
      { id: "faq.category.usage", title: "Using your eSIM abroad", subtitle: "Networks, data and additional packages", questions: [
        { id: "faq.usage.network", question: "Which networks does the eSIM use?", answer: "Available network technology may vary by location, device and local network conditions." },
        { id: "faq.usage.data_finished", question: "What happens when my data is used up?", answer: "Package conditions vary by product. You can buy another eligible published package if needed." },
        { id: "faq.usage.buy_another", question: "Can I buy another package?", answer: "Yes. You can separately purchase another eligible published package from the current catalogue." },
      ] },
      { id: "faq.category.payment", title: "Payment, orders & more", subtitle: "Prices, payment methods and other topics", questions: [
        { id: "faq.payment.methods", question: "How can I pay?", answer: "The available payment methods are shown securely during checkout." },
        { id: "faq.payment.order", question: "Where can I find my order and eSIM details?", answer: "After purchase and supplier processing are complete, you can view your order status and real eSIM details in your account." },
        { id: "faq.communication.whatsapp", question: "Can I use WhatsApp with my normal number?", answer: "Your WhatsApp account can remain on your existing number. Check your own app and device setup before making changes." },
      ] },
    ],
  },
} as const);

const FAQ_CATEGORY_ICONS = [FileText, Settings, Globe2, CreditCard] as const;

/** Stable-ID, locale-aware FAQ used by the eSIM discovery page. All categories start collapsed; one open at a time. */
export function V2CategorizedEsimFaq() {
  const { locale, dir } = useI18n();
  const copy = CATEGORIZED_FAQ[locale];
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section id="faq" aria-labelledby="esim-faq-title" className="mx-auto mb-0 mt-8 w-full max-w-6xl scroll-mt-24 pb-0 lg:mb-4 lg:mt-12 lg:pb-0" dir={dir}>
      <header className="mb-5 grid gap-5 lg:mb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-primary">{copy.eyebrow}</p>
          <h2 id="esim-faq-title" className="mt-1.5 max-w-xl font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">{copy.title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mt-3 lg:text-lg">{copy.subtitle}</p>
          <ul className="mt-4 grid gap-2">
            {copy.helpPoints.map((point) => <li key={point} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-xs font-medium leading-relaxed text-foreground sm:text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{point}</span></li>)}
          </ul>
        </div>
        <img src={faqTravelEsim} alt={copy.imageAlt} loading="lazy" decoding="async" width={1600} height={900} className="h-40 w-full rounded-2xl object-cover ring-1 ring-border sm:h-52 lg:h-72 lg:rounded-3xl" />
      </header>
      <div className="grid gap-3">
        {copy.categories.map((category, categoryIndex) => {
          const Icon = FAQ_CATEGORY_ICONS[categoryIndex] ?? Smartphone;
          return (
            <Collapsible key={category.id} open={openId === category.id} onOpenChange={(open) => setOpenId(open ? category.id : null)} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              <CollapsibleTrigger className="grid min-h-[4.5rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-start sm:px-5 lg:min-h-[5.25rem] lg:px-6 [&[data-state=open]_.faq-category-chevron]:rotate-180">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary lg:size-11"><Icon className="size-5" aria-hidden="true" /></span>
                <span className="min-w-0">
                  <span className="block font-display text-base font-bold leading-tight text-foreground">{category.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:text-sm">{category.subtitle}</span>
                </span>
                <ChevronDown className="faq-category-chevron size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true" />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden border-t border-border data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none">
                <Accordion type="single" collapsible className="px-4 sm:px-5" dir={dir}>
                  {category.questions.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="last:border-b-0">
                      <AccordionTrigger className="min-h-12 gap-3 py-3 text-start text-sm font-semibold leading-snug hover:no-underline sm:text-base [&>svg]:size-4">
                        <span className="min-w-0 flex-1">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pe-7 text-sm leading-relaxed text-muted-foreground">
                        <p>{item.answer}</p>
                        {"installationLink" in item && item.installationLink && (
                          <Button asChild variant="link" size="sm" className="mt-2 h-auto min-h-11 p-0 font-semibold text-primary">
                            <Link to="/esim/kurulum" search={{ platform: "ios", brand: "" }}>{copy.installationCta}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
                          </Button>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <aside className="mt-4 grid gap-4 rounded-2xl bg-primary-soft p-5 ring-1 ring-primary/10 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center lg:mt-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-7 lg:py-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-card text-primary ring-1 ring-primary/10"><Headphones className="size-6" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">{copy.supportEyebrow}</p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-foreground lg:text-xl">{copy.supportTitle}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{copy.supportText}</p>
        </div>
        <Button asChild className="min-h-11 w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
          <Link to="/destek">{copy.supportCta}<ArrowRight className="size-4 rtl:rotate-180" /></Link>
        </Button>
      </aside>
    </section>
  );
}

export function V2InfoGrid({ title, items }: { title: string; items: Array<{ title: string; text: string }> }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">{items.map((item) => <article key={item.title} className="rounded-xl bg-card p-3 ring-1 ring-border lg:p-5"><h3 className="text-sm font-bold text-foreground">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground lg:text-sm">{item.text}</p></article>)}</div>
    </section>
  );
}
