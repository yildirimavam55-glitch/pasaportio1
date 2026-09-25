import { createFileRoute } from "@tanstack/react-router";
import { Car, FileCheck2, Map, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { HeroField, heroInputClass, pick, PromoCard, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import heroImage from "@/assets/v2-vignette-hero.jpg";
import esimPromo from "@/assets/esim-cross-sell.jpg.asset.json";

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
  tr: { h: "Avrupa yollarında kolayca ilerle.", q: "Ülke seç", picker: "Vinyet ülkesi seç", empty: "Henüz yayınlanmış Vinyet ülkesi yok.", digital: "Dijital vinyet", official: "Resmî bilgi", secure: "Kontrollü seçim", europe: "Avrupa rotaları", soon: "Vinyet ürünleri henüz satışta değil.", soonSub: "Ülkeler, geçerlilik süreleri ve fiyatlar ürünler yayınlandığında burada görünecek.", esim: "Yolculuğun için eSIM'e göz at" },
  de: { h: "Einfach unterwegs auf Europas Straßen.", q: "Land wählen", picker: "Vignettenland wählen", empty: "Noch keine Vignettenländer veröffentlicht.", digital: "Digitale Vignette", official: "Offizielle Info", secure: "Klare Auswahl", europe: "Europäische Routen", soon: "Vignetten sind noch nicht im Verkauf.", soonSub: "Länder, Gültigkeit und Preise erscheinen hier, sobald Produkte veröffentlicht sind.", esim: "eSIM für deine Reise ansehen" },
  en: { h: "Travel Europe's roads with ease.", q: "Choose country", picker: "Choose Vignette country", empty: "No Vignette countries are published yet.", digital: "Digital vignette", official: "Official details", secure: "Clear selection", europe: "European routes", soon: "Vignettes are not on sale yet.", soonSub: "Countries, validity periods and prices will appear here once products are published.", esim: "Browse eSIMs for your trip" },
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
      <PromoCard image={esimPromo.url} title={c.esim} to="/design-v2/esim" />
    </V2Shell>
  );
}
