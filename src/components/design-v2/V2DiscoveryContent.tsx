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
    iphone: "iPhone",
    android: "Android",
    iphoneSteps: ["Hesabındaki gerçek QR kodunu başka bir ekranda aç.", "Ayarlar → Hücresel → eSIM Ekle bölümüne git.", "QR kodunu tara ve ekrandaki adımları tamamla.", "Paket bilgilerine göre mobil veri hattını ayarla."],
    androidSteps: ["Hesabındaki gerçek QR kodunu başka bir ekranda aç.", "Ayarlar → Bağlantılar / SIM yöneticisine git.", "eSIM ekle seçeneğiyle QR kodunu tara.", "Paket bilgilerine göre mobil veri hattını ayarla."],
    qrNote: "Bu alanda örnek QR üretilmez; QR yalnızca gerçek satın alma ve provisioning sonucundan gelir.",
    why: "Neden travely?",
    whyItems: ["Gerçek paket seçenekleri", "Kolay paket seçimi", "eSIM bilgilerine hesabından erişim", "WhatsApp destek"],
    guides: "Seyahat rehberi",
    guideLead: "Yayınlanmış gerçek seyahat içerikleri.",
    allGuides: "Tüm rehberler",
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
    <section>
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

export function V2Compatibility() {
  const { locale } = useI18n();
  const c = COPY[locale];
  return <section><SectionTitle>{c.compatibility}</SectionTitle><DeviceCompatibilityPrompt /></section>;
}

export function V2Installation() {
  const { locale } = useI18n();
  const c = COPY[locale];
  return (
    <section>
      <SectionTitle>{c.install}</SectionTitle>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{c.installLead}</p>
      <Tabs defaultValue="iphone">
        <TabsList className="grid h-9 w-full grid-cols-2">
          <TabsTrigger value="iphone" className="gap-1.5 text-xs"><Apple className="size-3.5" />{c.iphone}</TabsTrigger>
          <TabsTrigger value="android" className="gap-1.5 text-xs"><Smartphone className="size-3.5" />{c.android}</TabsTrigger>
        </TabsList>
        <TabsContent value="iphone"><InstallationSteps items={c.iphoneSteps} /></TabsContent>
        <TabsContent value="android"><InstallationSteps items={c.androidSteps} /></TabsContent>
      </Tabs>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{c.qrNote}</p>
      <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link to="/design-v2/support">{c.installCta}<ArrowRight /></Link></Button>
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

export function V2CompactFaq({ title, questions }: { title: string; questions: readonly (readonly [string, string])[] }) {
  return <section><SectionTitle>{title}</SectionTitle><Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{questions.map(([question, answer], index) => <AccordionItem key={question} value={`service-faq-${index}`}><AccordionTrigger className="py-3 text-left text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion></section>;
}

export function V2GuidesRail() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const { data = [] } = useQuery({ queryKey: ["v2-guides", locale], queryFn: () => listFeaturedGuides({ data: { locale, limit: 4 } }), staleTime: 5 * 60_000 });
  if (!data.length) return null;
  return (
    <section>
      <SectionTitle action={<SeoPathLink path={`/${locale}/${locale === "tr" ? "rehber" : locale === "de" ? "ratgeber" : "guides"}`} className="text-xs font-semibold text-primary">{c.allGuides}</SeoPathLink>}>{c.guides}</SectionTitle>
      <p className="mb-3 text-xs text-muted-foreground">{c.guideLead}</p>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {data.map((guide) => <li key={guide.id} className="w-[15.5rem] shrink-0 snap-start"><SeoPathLink path={seoPath(guide.translationLocale, guide.contentType, guide.slug)} className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border">{guide.heroImageUrl ? <img src={guide.heroImageUrl} alt={guide.heroAlt ?? guide.title} loading="lazy" decoding="async" className="h-24 w-full object-cover"/> : <div className="grid h-24 place-items-center bg-muted"><BookOpen className="size-6 text-muted-foreground"/></div>}<div className="p-3">{guide.categoryName && <span className="text-[9px] font-bold uppercase text-primary">{guide.categoryName}</span>}<h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-foreground">{guide.title}</h3>{guide.excerpt && <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{guide.excerpt}</p>}<ArrowRight className="ml-auto mt-2 size-4 text-primary"/></div></SeoPathLink></li>)}
      </ul>
    </section>
  );
}

export function V2EsimFaq() {
  const { locale } = useI18n();
  const c = COPY[locale];
  return (
    <section>
      <SectionTitle>{c.faq}</SectionTitle>
      <Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{c.questions.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="py-3 text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion>
    </section>
  );
}

export function V2InfoGrid({ title, items }: { title: string; items: Array<{ title: string; text: string }> }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2">{items.map((item) => <article key={item.title} className="rounded-xl bg-card p-3 ring-1 ring-border"><h3 className="text-sm font-bold text-foreground">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p></article>)}</div>
    </section>
  );
}
