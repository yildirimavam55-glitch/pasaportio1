import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Smartphone } from "lucide-react";
import { pick, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { useI18n } from "@/i18n";
import heroImage from "@/assets/v2-vignette-hero.jpg";

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
  tr: { h: "Avrupa yollarında kolayca ilerle.", q: "Ülke seç", digital: "Dijital vinyet", fast: "Hızlı satın alma", soon: "Vinyet ürünleri henüz satışta değil.", soonSub: "Ülkeler, geçerlilik süreleri ve fiyatlar ürünler yayınlandığında burada görünecek.", esim: "Yolculuğun için eSIM'e göz at" },
  de: { h: "Einfach unterwegs auf Europas Straßen.", q: "Land wählen", digital: "Digitale Vignette", fast: "Schneller Kauf", soon: "Vignetten sind noch nicht im Verkauf.", soonSub: "Länder, Gültigkeit und Preise erscheinen hier, sobald Produkte veröffentlicht sind.", esim: "eSIM für deine Reise ansehen" },
  en: { h: "Travel Europe's roads with ease.", q: "Choose country", digital: "Digital vignette", fast: "Fast purchase", soon: "Vignettes are not on sale yet.", soonSub: "Countries, validity periods and prices will appear here once products are published.", esim: "Browse eSIMs for your trip" },
};

function VignetteV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  return (
    <V2Shell service="vignette">
      <V2Hero image={heroImage} title={c.h} subtitle={c.q}>
        {/* No vignette catalogue exists yet — selector stays disabled rather than inventing countries. */}
        <select disabled aria-label={c.q} className="h-14 w-full rounded-2xl bg-card px-4 text-base text-muted-foreground opacity-80">
          <option>{c.q}</option>
        </select>
      </V2Hero>
      <TrustRow items={[{ icon: <Smartphone className="size-4" />, label: c.digital }, { icon: <Car className="size-4" />, label: c.fast }]} />
      <div className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border">
        <p className="font-display text-base font-semibold text-foreground">{c.soon}</p>
        <p className="mt-1 text-sm text-muted-foreground">{c.soonSub}</p>
        <Link to="/design-v2/esim" search={{ country: "" }} className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {c.esim}
        </Link>
      </div>
    </V2Shell>
  );
}
