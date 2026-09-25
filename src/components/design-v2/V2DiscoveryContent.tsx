import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MapPin, MessageCircle, Navigation, PhoneCall, Play, Smartphone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { DeviceCompatibilityPrompt } from "@/components/travel/DeviceCompatibility";
import { SeoPathLink } from "@/components/seo/SeoPathLink";
import { seoPath } from "@/domain/seo/paths";
import { useI18n } from "@/i18n";
import { listFeaturedGuides } from "@/lib/guides.functions";
import { pick, SectionTitle } from "./V2Shell";

const COPY = {
  tr: {
    dataTitle: "Ne kadar internet kullanırım?",
    dataLead: "Kullanım kişiden kişiye değişir; bunlar karşılaştırma için yaklaşık göstergelerdir.",
    usage: [["Mesajlaşma", "Çok az"], ["Haritalar", "Az"], ["Sosyal medya", "Orta"], ["Video", "Yüksek"], ["Video arama", "Çok yüksek"]],
    calculate: "İhtiyacımı hesapla",
    compatibility: "Telefonum eSIM uyumlu mu?",
    install: "eSIM nasıl kurulur?",
    installLead: "Kurulum bilgileri, satın aldığın gerçek paketin desteklediği yönteme göre hesabında gösterilir.",
    installSteps: ["Paketini seç", "Kurulum bilgilerini al", "Telefonuna ekle", "Seyahatte kullan"],
    installCta: "Kurulum desteği",
    guides: "Seyahat rehberi",
    guideLead: "Yayınlanmış gerçek seyahat içerikleri.",
    allGuides: "Tüm rehberler",
    faq: "eSIM hakkında sık sorulanlar",
    questions: [
      ["eSIM nedir?", "eSIM, uyumlu telefona dijital olarak eklenen bir mobil veri hattıdır."],
      ["Ne zaman kurmalıyım?", "Paketinin kurulum ve aktivasyon bilgisini hesabından kontrol et; yöntem ürüne göre değişebilir."],
      ["Fiziksel SIM kartımı kullanabilir miyim?", "Birçok uyumlu cihaz iki hattı birlikte yönetebilir. Cihaz modeli ve bölgesel varyant önemlidir."],
      ["Ne kadar veriye ihtiyacım var?", "Süre ve kullanım alışkanlıklarını paket yardımcısına girerek yaklaşık ihtiyacını görebilirsin."],
      ["Telefon uyumluluğunu nasıl kontrol ederim?", "Marka ve modelini cihaz kontrolünde seç. Operatör kilidi ve bölgesel model yine etkili olabilir."],
      ["Daha fazla veriye ihtiyacım olursa ne olur?", "Ek yükleme desteği ürüne göre değişir; seçtiğin paketin gerçek özelliklerini kontrol et."],
    ],
  },
  de: {
    dataTitle: "Wie viel Datenvolumen brauche ich?",
    dataLead: "Die Nutzung ist individuell; diese Angaben dienen nur als grobe Orientierung.",
    usage: [["Messaging", "Sehr wenig"], ["Karten", "Wenig"], ["Social Media", "Mittel"], ["Video", "Hoch"], ["Videoanrufe", "Sehr hoch"]],
    calculate: "Bedarf berechnen",
    compatibility: "Ist mein Handy eSIM-fähig?",
    install: "Wie installiere ich eine eSIM?",
    installLead: "Die Installationsdaten erscheinen im Konto und richten sich nach der tatsächlich gekauften Paketmethode.",
    installSteps: ["Paket wählen", "Installationsdaten erhalten", "Zum Handy hinzufügen", "Auf Reisen nutzen"],
    installCta: "Installationshilfe",
    guides: "Reiseratgeber",
    guideLead: "Echte veröffentlichte Reiseinhalte.",
    allGuides: "Alle Ratgeber",
    faq: "Häufige Fragen zur eSIM",
    questions: [
      ["Was ist eine eSIM?", "Eine eSIM ist ein digitaler Mobilfunktarif für ein kompatibles Handy."],
      ["Wann sollte ich sie installieren?", "Prüfe die Installations- und Aktivierungsangaben deines Pakets im Konto; die Methode kann variieren."],
      ["Kann ich meine physische SIM weiter nutzen?", "Viele kompatible Geräte verwalten beide Leitungen. Modell und regionale Variante sind entscheidend."],
      ["Wie viel Datenvolumen brauche ich?", "Gib Reisedauer und Nutzung in den Paketassistenten ein, um eine Schätzung zu erhalten."],
      ["Wie prüfe ich mein Handy?", "Wähle Marke und Modell in der Geräteprüfung. Anbieter-Sperren und regionale Varianten können abweichen."],
      ["Was passiert, wenn ich mehr Daten brauche?", "Aufladen wird nicht von jedem Paket unterstützt; prüfe die tatsächlichen Paketmerkmale."],
    ],
  },
  en: {
    dataTitle: "How much data will I use?",
    dataLead: "Usage varies by person; these are approximate comparisons, not guarantees.",
    usage: [["Messaging", "Very low"], ["Maps", "Low"], ["Social media", "Medium"], ["Video", "High"], ["Video calls", "Very high"]],
    calculate: "Calculate my needs",
    compatibility: "Is my phone eSIM compatible?",
    install: "How do I install an eSIM?",
    installLead: "Installation details appear in your account and follow the method supported by the package you actually buy.",
    installSteps: ["Choose a package", "Get setup details", "Add it to your phone", "Use it while travelling"],
    installCta: "Installation help",
    guides: "Travel guides",
    guideLead: "Real published travel content.",
    allGuides: "All guides",
    faq: "Frequently asked eSIM questions",
    questions: [
      ["What is an eSIM?", "An eSIM is a digital mobile data line added to a compatible phone."],
      ["When should I install it?", "Check your package's setup and activation details in your account; the method can vary."],
      ["Can I keep my physical SIM?", "Many compatible devices can manage both lines. The model and regional variant still matter."],
      ["How much data do I need?", "Enter your trip length and habits in the package assistant for an estimate."],
      ["How do I check compatibility?", "Choose your brand and model in the device checker. Carrier locks and regional variants can differ."],
      ["What if I need more data?", "Top-up support varies by package; check the real features of your selected plan."],
    ],
  },
} as const;

const usageIcons = [MessageCircle, Navigation, Smartphone, Play, PhoneCall];

export function V2DataEducation({ onCalculate }: { onCalculate: () => void }) {
  const { locale } = useI18n();
  const c = pick(locale, COPY);
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
  const c = pick(locale, COPY);
  return <section><SectionTitle>{c.compatibility}</SectionTitle><DeviceCompatibilityPrompt /></section>;
}

export function V2Installation() {
  const { locale } = useI18n();
  const c = pick(locale, COPY);
  return (
    <section>
      <SectionTitle>{c.install}</SectionTitle>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{c.installLead}</p>
      <ol className="grid grid-cols-4 gap-1.5">{c.installSteps.map((step, index) => <li key={step} className="min-w-0 text-center"><span className="mx-auto grid size-7 place-items-center rounded-full bg-[var(--v2-service)] text-xs font-bold text-primary-foreground">{index + 1}</span><span className="mt-1 block text-[9px] font-semibold leading-tight text-foreground">{step}</span></li>)}</ol>
      <Button asChild variant="outline" size="sm" className="mt-3 w-full"><Link to="/design-v2/support">{c.installCta}<ArrowRight /></Link></Button>
    </section>
  );
}

export function V2GuidesRail() {
  const { locale } = useI18n();
  const c = pick(locale, COPY);
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
  const c = pick(locale, COPY);
  return (
    <section>
      <SectionTitle>{c.faq}</SectionTitle>
      <Accordion type="single" collapsible className="rounded-xl bg-card px-3 ring-1 ring-border">{c.questions.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="py-3 text-xs font-bold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="text-xs leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion>
    </section>
  );
}
