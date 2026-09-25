import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Apple, ArrowRight, BookOpen, CheckCircle2, Headphones, MapPin, MessageCircle, Navigation, PhoneCall, Play, Smartphone, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceCompatibilityPrompt } from "@/components/travel/DeviceCompatibility";
import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { seoPath } from "@/domain/seo/paths";
import { useI18n } from "@/i18n";
import { listFeaturedGuides } from "@/lib/guides.functions";
import { SectionTitle } from "./V2Shell";
import { V2InstallAnimation } from "./V2InstallAnimation";

const COPY = {
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
    animReady: "eSIM hazır",
    animAdding: "eSIM ekleniyor...",
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
    animReady: "eSIM bereit",
    animAdding: "eSIM wird hinzugefügt...",
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
    animReady: "eSIM ready",
    animAdding: "Adding eSIM...",
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
} as const;

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

export function V2Compatibility({ title }: { title?: string } = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  return <section><SectionTitle>{title || c.compatibility}</SectionTitle><DeviceCompatibilityPrompt /></section>;
}

type InstallProps = { title?: string; subtitle?: string; steps?: string[]; ready?: string; adding?: string; cta?: string; href?: "/esim" | "/lounge" | "/vignette" | "/destek" | "/sepet" | "/account"; variant?: "animated" | "simple" };

/** Copy/link/variant can come from the storefront builder; animation stays decorative (no real QR). */
export function V2Installation({ title, subtitle, steps, ready, adding, cta, href = "/destek", variant = "animated" }: InstallProps = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const stepList = steps?.length ? steps : [...c.animSteps];
  const search = (href === "/esim" ? { country: "" } : href === "/lounge" ? { iata: "" } : undefined) as never;
  return (
    <section className="lg:mx-auto lg:max-w-4xl">
      <SectionTitle>{title || c.install}</SectionTitle>
       <div className="lg:grid lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-10">
         <div>{variant === "simple" ? <InstallationSteps items={stepList} /> : <V2InstallAnimation steps={stepList} ready={ready || c.animReady} adding={adding || c.animAdding} />}</div>
         <div>{(subtitle ?? c.installSub) && <p className="mb-3 text-xs leading-relaxed text-muted-foreground lg:text-base">{subtitle ?? c.installSub}</p>}<InstallationSteps items={stepList} />{(cta ?? c.installCta) && <Button asChild variant="outline" size="sm" className="mt-3 w-full lg:w-auto"><Link to={href} search={search}>{cta || c.installCta}<ArrowRight /></Link></Button>}</div>
       </div>
    </section>
  );
}

function InstallationSteps({ items }: { items: readonly string[] }) {
  return <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{items.map((step, index) => <li key={step} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-1.5 text-[10px] leading-snug text-muted-foreground"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--v2-service)] text-[9px] font-bold text-primary-foreground">{index + 1}</span><span>{step}</span></li>)}</ol>;
}

export function V2WhyTravely() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const icons = [CheckCircle2, Sparkles, Smartphone, Headphones];
  return <section><SectionTitle>{c.why}</SectionTitle><ul className="grid grid-cols-2 gap-2">{c.whyItems.map((item, index) => { const Icon = icons[index] ?? CheckCircle2; return <li key={item} className="flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border"><Icon className="size-4 shrink-0 text-[var(--v2-service)]"/><span className="text-[10px] font-semibold leading-tight text-foreground">{item}</span></li>; })}</ul></section>;
}

export function V2CompactFaq({ title, questions }: { title: string; questions: readonly (readonly string[])[] }) {
  return <section><SectionTitle>{title}</SectionTitle><Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{questions.map((item, index) => { const question = item[0] ?? ""; const answer = item[1] ?? ""; return <AccordionItem key={question} value={`service-faq-${index}`}><AccordionTrigger className="py-3 text-left text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>; })}</Accordion></section>;
}

export function V2GuidesRail({ title, lead, allLabel }: { title?: string; lead?: string; allLabel?: string } = {}) {
  const { locale } = useI18n();
  const c = COPY[locale];
  const { data = [] } = useQuery({ queryKey: ["v2-guides", locale], queryFn: () => listFeaturedGuides({ data: { locale, limit: 4 } }), staleTime: 5 * 60_000 });
  if (!data.length) return null;
  return (
    <section className="mb-4 pb-4">
      <SectionTitle action={<SeoPathLink path={`/${locale}/${locale === "tr" ? "rehber" : locale === "de" ? "ratgeber" : "guides"}`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">{allLabel || c.allGuides}<ArrowRight className="size-3.5" /></SeoPathLink>}>{title || c.guides}</SectionTitle>
      {(lead ?? c.guideLead) && <p className="-mt-0.5 mb-4 text-xs text-muted-foreground">{lead ?? c.guideLead}</p>}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [overscroll-behavior-inline:contain] [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0">
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
    <section className="lg:mx-auto lg:max-w-4xl">
      <SectionTitle>{title || c.faq}</SectionTitle>
      <Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{questions.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="min-h-[3.25rem] py-3 text-left text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion>
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
