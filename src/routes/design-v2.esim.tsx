import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Headphones, Infinity as InfinityIcon, LockKeyhole, Search, Signal, Zap } from "lucide-react";
import { CartBar, HeroField, heroInputClass, HowItWorks, money, PhotoCard, PhotoRail, pick, PromoCard, SectionTitle, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import loungePromo from "@/assets/lounge-card.jpg.asset.json";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getCountryByIso, POPULAR_COUNTRIES, searchCountries } from "@/domain/geo/countries";
import { listEsimDestinationStartingPrices, listEsimPackages, listEsimStartingPrices, type EsimPackage } from "@/lib/esim-catalogue.functions";
import { customerPackageTitle } from "@/domain/esim/customer-presentation";
import heroImage from "@/assets/esim-hero-mobile.jpg";
import vignettePromo from "@/assets/v2-vignette-hero.jpg";

const searchSchema = z.object({ country: z.string().max(2).catch("").default("") });

export const Route = createFileRoute("/design-v2/esim")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "eSIM — Design V2 preview" },
      { name: "description", content: "Internal eSIM design preview." },
      { property: "og:title", content: "eSIM — Design V2 preview" },
      { property: "og:description", content: "Internal eSIM design preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...V2_NOINDEX,
    ],
  }),
  component: EsimV2,
});

const T = {
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Hızlı kurulum", net: "4G / 5G", pay: "Kolay paket seçimi", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", from: "başlayan", all: "Tüm paketler", unl: "Sınırsız", days: "gün", select: "Seç", added: "Eklendi", cart: "Sepete git", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Başka ülke", unlimited: "Sınırsız", countries: "ülke", promo: "Havalimanında beklerken rahat et.", promoSub: "Lounge seçeneklerine göz at.", vignettePromo: "Avrupa yollarını keşfet.", vignettePromoSub: "Vinyet hizmetinin durumuna göz at.", how: "Nasıl çalışır?", steps: [{ t: "Ülkeni seç", s: "Sana uygun paketi bul." }, { t: "Sepete ekle", s: "Paketini seç, sepete ekle." }, { t: "Kur ve bağlan", s: "Kurulum bilgilerini hesabından takip et." }] },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Schnelle Einrichtung", net: "4G / 5G", pay: "Einfache Paketwahl", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", from: "ab", all: "Alle Pakete", unl: "Unbegrenzt", days: "Tage", select: "Wählen", added: "Hinzugefügt", cart: "Zum Warenkorb", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Anderes Land", unlimited: "Unbegrenzt", countries: "Länder", promo: "Entspannt warten am Flughafen.", promoSub: "Lounges ansehen.", vignettePromo: "Europas Straßen entdecken.", vignettePromoSub: "Status des Vignettenangebots ansehen.", how: "So funktioniert’s", steps: [{ t: "Land wählen", s: "Passendes Paket finden." }, { t: "In den Warenkorb", s: "Paket wählen und hinzufügen." }, { t: "Einrichten & verbinden", s: "Einrichtungsinfos findest du in deinem Konto." }] },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", picker: "Choose country", empty: "No matching country found.", setup: "Fast setup", net: "4G / 5G", pay: "Easy plan choice", support: "WhatsApp support", popular: "Popular eSIM destinations", from: "from", all: "All plans", unl: "Unlimited", days: "days", select: "Select", added: "Added", cart: "Go to cart", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Other country", unlimited: "Unlimited", countries: "countries", promo: "Relax while you wait.", promoSub: "Browse airport lounges.", vignettePromo: "Explore Europe's roads.", vignettePromoSub: "Check the status of Vignette service.", how: "How it works", steps: [{ t: "Pick a country", s: "Find the right plan." }, { t: "Add to cart", s: "Pick your plan and add it." }, { t: "Set up & connect", s: "Find setup details in your account." }] },
};

function EsimV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const { country } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { count } = useCart();
  const prices = useQuery({ queryKey: ["v2-esim-destinations"], queryFn: () => listEsimDestinationStartingPrices() });
  const priceMap = useMemo(() => new Map((prices.data ?? []).map((price) => [price.targetId, price])), [prices.data]);
  const matches = useMemo(
    () => searchCountries(query, 250).filter((item) => priceMap.has(item.iso)),
    [priceMap, query],
  );
  const selected = country ? getCountryByIso(country.toUpperCase()) : undefined;
  const choose = (iso: string) => {
    setQuery("");
    setPickerOpen(false);
    void navigate({ search: { country: iso } });
  };

  return (
    <V2Shell service="esim">
      <V2Hero image={heroImage} eyebrow="eSIM" title={c.h} subtitle={c.q}>
        <HeroField icon={<Search className="size-5" />}>
          <V2PickerSheet
            open={pickerOpen}
            onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }}
            title={c.picker}
            searchLabel={c.ph}
            query={query}
            onQueryChange={setQuery}
            selectedId={selected?.iso}
            emptyLabel={prices.isLoading ? "…" : c.empty}
            items={matches.map((item) => {
              const price = priceMap.get(item.iso);
              return { id: item.iso, label: item.name[locale], leading: <CountryFlag iso={item.iso} className="h-4 w-6 rounded-sm" />, ...(price ? { price: `${money(price.amount, price.currency)} ${c.from}` } : {}) };
            })}
            onSelect={choose}
          >
            <Button type="button" variant="ghost" className={`${heroInputClass} justify-start font-normal hover:bg-transparent`}>
              <span className="truncate">{selected?.name[locale] ?? c.ph}</span>
            </Button>
          </V2PickerSheet>
        </HeroField>
      </V2Hero>

      {selected ? (
        <Packages iso={selected.iso} name={selected.name[locale]} c={c} onBack={() => void navigate({ search: { country: "" } })} />
      ) : (
        <>
          <TrustRow
            items={[
              { icon: <Zap className="size-6" />, label: c.setup },
              { icon: <Signal className="size-6" />, label: c.net },
              { icon: <LockKeyhole className="size-6" />, label: c.pay },
              { icon: <Headphones className="size-6" />, label: c.support },
            ]}
          />
          <Popular c={c} onPick={choose} />
          <PromoCard image={loungePromo.url} title={c.promo} sub={c.promoSub} to="/design-v2/lounge" />
           <PromoCard image={vignettePromo} title={c.vignettePromo} sub={c.vignettePromoSub} to="/design-v2/vignette" />
          <HowItWorks title={c.how} steps={c.steps} />
        </>
      )}
      <CartBar count={count} label={c.cart} />
    </V2Shell>
  );
}

function Popular({ c, onPick }: { c: (typeof T)["tr"]; onPick: (iso: string) => void }) {
  const { locale } = useI18n();
  const list = POPULAR_COUNTRIES.slice(0, 10);
  const { data, isLoading } = useQuery({
    queryKey: ["v2-esim-starting", list.map((x) => x.iso)],
    queryFn: () => listEsimStartingPrices({ data: { targets: list.map((x) => ({ id: x.iso, coverageIsos: [x.iso] })) } }),
  });
  // Only countries with a real published price are shown.
  const priced = list.flatMap((country) => {
    const p = data?.find((d) => d.targetId === country.iso);
    return p ? [{ country, p }] : [];
  });
  return (
    <>
      <SectionTitle>{c.popular}</SectionTitle>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : priced.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.noPrices}</p>
      ) : (
        <PhotoRail>
          {priced.map(({ country, p }) => (
            <PhotoCard
              key={country.iso}
              image={countryPhotoRegistry[country.iso]?.cardImage}
              badge={<CountryFlag iso={country.iso} className="h-4 w-6 rounded-sm shadow" />}
              title={country.name[locale]}
              price={`${c.from} ${money(p.amount, p.currency)}`}
              onClick={() => onPick(country.iso)}
            />
          ))}
        </PhotoRail>
      )}
    </>
  );
}

function Packages({ iso, name, c, onBack }: { iso: string; name: string; c: (typeof T)["tr"]; onBack: () => void }) {
  const { locale } = useI18n();
  const { lines, addLine } = useCart();
  const [tab, setTab] = useState<"all" | "unl">("all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["v2-esim-packages", iso],
    queryFn: () => listEsimPackages({ data: { coverageIsos: [iso] } }),
  });
  const hasUnlimited = data.some((p) => p.unlimited);
  // Presentation-only dedupe: rows identical on every customer-visible attribute
  // (data, validity, price, 5G, number of covered countries) collapse to the first real product.
  const rows = (tab === "unl" ? data.filter((p) => p.unlimited) : data)
    .slice()
    .sort((a, b) => (a.salePrice ?? 0) - (b.salePrice ?? 0) || a.coverage.length - b.coverage.length)
    .filter((p, i, all) => {
      const key = (x: EsimPackage) => [x.unlimited, x.dataGb, x.validityDays, x.salePrice, x.supports5g, x.coverage.length].join("|");
      return all.findIndex((x) => key(x) === key(p)) === i;
    });
  const add = (p: EsimPackage) =>
    addLine({
      productId: p.id,
      providerProductId: p.providerProductId,
      serviceType: "ESIM",
      name: customerPackageTitle({ locale, destinationIso: iso, routeIsos: [], coverage: p.coverage }),
      meta: p.unlimited ? c.unlimited : `${p.dataGb ?? "—"} GB`,
      price: p.salePrice,
      currency: p.currency,
      dataGb: p.dataGb,
      validityDays: p.validityDays,
      coverage: p.coverage,
      isTest: p.isTest,
    });

  return (
    <>
      <div className="mt-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <CountryFlag iso={iso} className="h-5 w-7 rounded-sm" />
          {name}
        </h2>
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm font-semibold text-primary">{c.back}</button>
      </div>
      {hasUnlimited && (
        <div className="mt-2 flex gap-2">
          {(["all", "unl"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border"}`}>
              {t === "all" ? c.all : c.unl}
            </button>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="mt-3 h-48 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {rows.map((p) => {
            const inCart = lines.some((l) => l.productId === p.id);
            return (
              <li key={p.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <div className="flex-1">
                  <p className="flex items-center gap-1 font-display text-base font-semibold text-foreground">
                    {p.unlimited ? (<><InfinityIcon className="size-4" />{c.unlimited}</>) : `${p.dataGb ?? "—"} GB`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.validityDays ? `${p.validityDays} ${c.days}` : ""}
                    {p.supports5g ? " · 5G" : ""}
                    {p.coverage.length > 1 ? ` · ${p.coverage.length} ${c.countries}` : ""}
                  </p>
                </div>
                <span className="text-base font-bold text-foreground">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</span>
                <button type="button" onClick={() => add(p)} className={`min-h-11 min-w-20 rounded-full px-4 text-sm font-semibold ${inCart ? "bg-accent-soft text-primary" : "bg-primary text-primary-foreground"}`}>
                  {inCart ? c.added : c.select}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/design-v2/cart" className="sr-only">{c.cart}</Link>
    </>
  );
}
