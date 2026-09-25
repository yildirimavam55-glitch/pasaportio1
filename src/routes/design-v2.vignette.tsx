import { createFileRoute } from "@tanstack/react-router";
import { Car, FileCheck2, Map, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { HeroField, heroInputClass, HowItWorks, pick, PromoCard, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import heroImage from "@/assets/v2-vignette-hero.jpg";
import esimPromo from "@/assets/esim-cross-sell.jpg.asset.json";
import loungePromo from "@/assets/lounge-card.jpg.asset.json";
import { V2CompactFaq, V2GuidesRail, V2InfoGrid } from "@/components/design-v2/V2DiscoveryContent";

export const Route = createFileRoute("/design-v2/vignette")({
  head: () => ({
    meta: [
      { title: "Vignette — Design V2 preview" },
      { name: "description", content: "Internal vignette design preview." },
      { property: "og:title", content: "Vignette — Design V2 preview" },
      { property: "og:description", content: "Internal vignette design preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...V2_NOINDEX,
    ],
  }),
  component: VignetteV2,
});

const T = {
  tr: { h: "Avrupa yollarında kolayca ilerle.", q: "Ülke seç", picker: "Vinyet ülkesi seç", empty: "Henüz yayınlanmış Vinyet ülkesi yok.", digital: "Dijital vinyet", official: "Resmî bilgi", secure: "Kontrollü seçim", europe: "Avrupa rotaları", soon: "Henüz satışta değil.", soonSub: "Ülkeler, geçerlilik süreleri ve fiyatlar ürünler yayınlandığında burada görünecek.", info: "Dijital vinyet nedir?", infoItems: [{ title: "Yol kullanım izni", text: "Bazı Avrupa ülkeleri belirli yollar için süreli vinyet ister." }, { title: "Ülkeye göre değişir", text: "Kurallar, geçerlilik ve başlangıç zamanı ülkeye göre farklı olabilir." }, { title: "Gerçek ürün bilgisi", text: "Satış başladığında yalnız yayınlanmış ülke, süre ve fiyatlar gösterilecek." }, { title: "Kontrollü süreç", text: "Araç ve seyahat bilgileri, gerçek ürün akışının gerektirdiği ölçüde alınacak." }], how: "Nasıl çalışacak?", steps: [{ t: "Ülkeyi seç", s: "Yayınlanmış ürünü bul." }, { t: "Bilgileri kontrol et", s: "Süre ve şartları incele." }, { t: "Hesabından takip et", s: "Satış aktif olduğunda kaydını gör." }], esim: "Yolculuğun için eSIM'e göz at", lounge: "Uçuş öncesi Lounge'u keşfet", faq: "Vinyet hakkında sık sorulanlar", questions: [["Vinyet nedir?", "Vinyet, bazı ülkelerde belirli yolları kullanmak için gereken süreli yol kullanım iznidir."], ["Hangi ülkelerde gerekli?", "Gereklilik ve kapsam ülkeye ve yola göre değişir. Satış açıldığında yalnız gerçek yayınlanmış ülkeler gösterilir."], ["Hangi süre seçenekleri var?", "Henüz ürün yayınlanmadığı için süre seçeneği göstermiyoruz. Gerçek süreler ürünlerle birlikte görünecek."], ["Dijital vinyet nasıl çalışır?", "Gerçek ürün akışı aktif olduğunda gerekli araç ve seyahat bilgileri ürüne göre alınacak; kayıt hesabından takip edilecek."], ["Ne zaman aktif olur?", "Başlangıç zamanı ülke ve ürüne göre değişebilir. Ürün verisi olmadan aktivasyon zamanı varsaymıyoruz."]] as const },
  de: { h: "Einfach unterwegs auf Europas Straßen.", q: "Land wählen", picker: "Vignettenland wählen", empty: "Noch keine Vignettenländer veröffentlicht.", digital: "Digitale Vignette", official: "Offizielle Info", secure: "Klare Auswahl", europe: "Europäische Routen", soon: "Noch nicht im Verkauf.", soonSub: "Länder, Gültigkeit und Preise erscheinen hier, sobald Produkte veröffentlicht sind.", info: "Was ist eine digitale Vignette?", infoItems: [{ title: "Straßennutzungsrecht", text: "Einige europäische Länder verlangen für bestimmte Straßen eine zeitlich begrenzte Vignette." }, { title: "Je Land verschieden", text: "Regeln, Gültigkeit und Beginn können sich je Land unterscheiden." }, { title: "Echte Produktdaten", text: "Nach Verkaufsstart erscheinen nur veröffentlichte Länder, Laufzeiten und Preise." }, { title: "Kontrollierter Ablauf", text: "Fahrzeug- und Reisedaten werden nur soweit vom echten Produktablauf benötigt erfasst." }], how: "Wie wird es funktionieren?", steps: [{ t: "Land wählen", s: "Veröffentlichtes Produkt finden." }, { t: "Details prüfen", s: "Laufzeit und Bedingungen ansehen." }, { t: "Im Konto verfolgen", s: "Nach Verkaufsstart den Eintrag sehen." }], esim: "eSIM für deine Reise ansehen", lounge: "Lounge vor dem Abflug entdecken", faq: "Häufige Fragen zur Vignette", questions: [["Was ist eine Vignette?", "Eine Vignette ist eine zeitlich begrenzte Berechtigung zur Nutzung bestimmter Straßen in einigen Ländern."], ["In welchen Ländern ist sie nötig?", "Pflicht und Geltungsbereich unterscheiden sich je Land und Straße. Nach Verkaufsstart werden nur echte veröffentlichte Länder angezeigt."], ["Welche Laufzeiten gibt es?", "Da noch keine Produkte veröffentlicht sind, zeigen wir keine Laufzeiten. Echte Optionen erscheinen mit den Produkten."], ["Wie funktioniert die digitale Vignette?", "Sobald der echte Produktablauf aktiv ist, werden die erforderlichen Fahrzeug- und Reisedaten produktabhängig erfasst und im Konto angezeigt."], ["Wann wird sie aktiv?", "Der Beginn kann je Land und Produkt variieren. Ohne Produktdaten nehmen wir keinen Aktivierungszeitpunkt an."]] as const },
  en: { h: "Travel Europe's roads with ease.", q: "Choose country", picker: "Choose Vignette country", empty: "No Vignette countries are published yet.", digital: "Digital vignette", official: "Official details", secure: "Clear selection", europe: "European routes", soon: "Not on sale yet.", soonSub: "Countries, validity periods and prices will appear here once products are published.", info: "What is a digital vignette?", infoItems: [{ title: "Road access permission", text: "Some European countries require a time-limited vignette for certain roads." }, { title: "Varies by country", text: "Rules, validity, and start timing can differ by country." }, { title: "Real product details", text: "Once sales begin, only published countries, durations, and prices will appear." }, { title: "Controlled process", text: "Vehicle and trip information will only be requested when the real product flow requires it." }], how: "How will it work?", steps: [{ t: "Choose a country", s: "Find a published product." }, { t: "Review details", s: "Check duration and conditions." }, { t: "Track in account", s: "See the record once sales are active." }], esim: "Browse eSIMs for your trip", lounge: "Discover Lounge before your flight", faq: "Frequently asked Vignette questions", questions: [["What is a Vignette?", "A Vignette is a time-limited road-use permit required for certain roads in some countries."], ["Which countries require one?", "Requirements and coverage vary by country and road. Only real published countries will appear when sales begin."], ["Which durations are available?", "No products are published yet, so no durations are shown. Real options will appear with the products."], ["How does a digital Vignette work?", "When the real product flow is active, required vehicle and trip details will be collected according to the product and tracked in the account."], ["When does it activate?", "Start timing may vary by country and product. We do not assume an activation time without product data."]] as const },
};

function VignetteV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <V2Shell service="vignette">
      <V2Hero image={heroImage} eyebrow="Vignette" title={c.h}>
        <HeroField icon={<Car className="size-5" />}>
          <V2PickerSheet open={pickerOpen} onOpenChange={setPickerOpen} title={c.picker} searchLabel={c.q} query={query} onQueryChange={setQuery} items={[]} onSelect={() => undefined} emptyLabel={c.empty}>
            <Button type="button" variant="ghost" className={`${heroInputClass} justify-start font-normal hover:bg-transparent`}>{c.q}</Button>
          </V2PickerSheet>
        </HeroField>
      </V2Hero>
      <TrustRow items={[{ icon: <Smartphone className="size-6" />, label: c.digital }, { icon: <FileCheck2 className="size-6" />, label: c.official }, { icon: <ShieldCheck className="size-6" />, label: c.secure }, { icon: <Map className="size-6" />, label: c.europe }]} />
      <div className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-border">
        <p className="font-display text-base font-bold text-foreground">{c.soon}</p>
        <p className="mt-1 text-sm text-muted-foreground">{c.soonSub}</p>
      </div>
      <V2InfoGrid title={c.info} items={[...c.infoItems]} />
      <HowItWorks title={c.how} steps={[...c.steps]} />
      <PromoCard image={esimPromo.url} title={c.esim} to="/design-v2/esim" />
      <PromoCard image={loungePromo.url} title={c.lounge} to="/design-v2/lounge" />
      <V2GuidesRail />
      <V2CompactFaq title={c.faq} questions={c.questions} />
    </V2Shell>
  );
}
