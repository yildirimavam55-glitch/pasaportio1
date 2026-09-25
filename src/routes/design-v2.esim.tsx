import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Headphones, Infinity as InfinityIcon, LockKeyhole, MapPin, MessageCircle, Search, Share2, Signal, Video, Zap } from "lucide-react";
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
import { buildCustomerShortlist } from "@/domain/esim/shortlist";
import { estimateUsageNeed, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import type { UsageKind } from "@/domain/experience/types";
import { V2Compatibility, V2DataEducation, V2EsimFaq, V2GuidesRail, V2Installation } from "@/components/design-v2/V2DiscoveryContent";
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
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Kolay kurulum", net: "Gerçek paketler", pay: "Kolay paket seçimi", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", from: "başlayan", days: "gün", select: "Seç", added: "Eklendi", cart: "Sepete git", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Başka ülke", unlimited: "Sınırsız", countries: "ülkede geçerli", local: "Yalnızca bu ülke", recommended: "Önerilen", assistant: "Ne kadar internet lazım?", assistantLead: "Süre ve kullanımını seç; yaklaşık ihtiyacına uyan gerçek paketi işaretleyelim.", estimate: "Tahmini ihtiyaç", calculate: "Paketleri güncelle", usage: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"], promo: "Uçuş öncesi biraz daha konfor", promoSub: "Lounge hizmetini keşfet.", vignettePromo: "Avrupa yollarına hazır ol", vignettePromoSub: "Vinyet hizmetinin durumuna göz at.", how: "Nasıl çalışır?", steps: [{ t: "Ülkeni seç", s: "Sana uygun paketi bul." }, { t: "Sepete ekle", s: "Paketini seç, sepete ekle." }, { t: "Kur ve bağlan", s: "Kurulum bilgilerini hesabından takip et." }] },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Einfache Einrichtung", net: "Echte Pakete", pay: "Einfache Paketwahl", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", from: "ab", days: "Tage", select: "Wählen", added: "Hinzugefügt", cart: "Zum Warenkorb", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Anderes Land", unlimited: "Unbegrenzt", countries: "Länder gültig", local: "Nur dieses Land", recommended: "Empfohlen", assistant: "Wie viel Datenvolumen brauchst du?", assistantLead: "Wähle Dauer und Nutzung; wir markieren ein passendes echtes Paket.", estimate: "Geschätzter Bedarf", calculate: "Pakete aktualisieren", usage: ["Messaging", "Karten", "Social Media", "Video"], promo: "Mehr Komfort vor dem Abflug", promoSub: "Lounge-Service entdecken.", vignettePromo: "Bereit für Europas Straßen", vignettePromoSub: "Status des Vignettenangebots ansehen.", how: "So funktioniert’s", steps: [{ t: "Land wählen", s: "Passendes Paket finden." }, { t: "In den Warenkorb", s: "Paket wählen und hinzufügen." }, { t: "Einrichten & verbinden", s: "Einrichtungsinfos findest du in deinem Konto." }] },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", picker: "Choose country", empty: "No matching country found.", setup: "Easy setup", net: "Real packages", pay: "Easy plan choice", support: "WhatsApp support", popular: "Popular eSIM destinations", from: "from", days: "days", select: "Select", added: "Added", cart: "Go to cart", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Other country", unlimited: "Unlimited", countries: "countries covered", local: "This country only", recommended: "Recommended", assistant: "How much data do you need?", assistantLead: "Choose your trip length and usage; we'll highlight a matching real package.", estimate: "Estimated need", calculate: "Update packages", usage: ["Messaging", "Maps", "Social media", "Video"], promo: "More comfort before your flight", promoSub: "Discover the Lounge service.", vignettePromo: "Get ready for Europe's roads", vignettePromoSub: "Check the status of Vignette service.", how: "How it works", steps: [{ t: "Pick a country", s: "Find the right plan." }, { t: "Add to cart", s: "Pick your plan and add it." }, { t: "Set up & connect", s: "Find setup details in your account." }] },
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
            {...(selected ? { selectedId: selected.iso } : {})}
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
           <V2DataEducation onCalculate={() => setPickerOpen(true)} />
           <V2Compatibility />
          <HowItWorks title={c.how} steps={c.steps} />
           <V2Installation />
           <PromoCard image={vignettePromo} title={c.vignettePromo} sub={c.vignettePromoSub} to="/design-v2/vignette" />
           <V2GuidesRail />
           <V2EsimFaq />
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
  const [days, setDays] = useState(7);
  const [usage, setUsage] = useState<UsageKind[]>(["MESSAGING", "MAPS"]);
  const [hasInput, setHasInput] = useState(false);
  const assistantRef = useRef<HTMLElement>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["v2-esim-packages", iso],
    queryFn: () => listEsimPackages({ data: { coverageIsos: [iso] } }),
  });
  const { data: settings } = useQuery({ queryKey: ["esim-usage-settings"], queryFn: () => getEsimUsageSettings() });
  const estimate = estimateUsageNeed({ days, usage }, settings as EsimUsageSettings | undefined);
  const shortlist = buildCustomerShortlist(data, { coverageIsos: [iso], days, requiredGb: estimate.requiredGb, maxPrimary: 4 });
  const rows = shortlist.primary.map((entry) => entry.package);
  const recommendedId = hasInput ? shortlist.primary[0]?.package.id : undefined;
  const usageItems: Array<{ key: UsageKind; label: string; icon: typeof MessageCircle }> = [
    { key: "MESSAGING", label: c.usage[0] ?? "", icon: MessageCircle }, { key: "MAPS", label: c.usage[1] ?? "", icon: MapPin },
    { key: "SOCIAL", label: c.usage[2] ?? "", icon: Share2 }, { key: "VIDEO", label: c.usage[3] ?? "", icon: Video },
  ];
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
      <section ref={assistantRef} className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border">
        <h3 className="font-display text-base font-bold text-foreground">{c.assistant}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.assistantLead}</p>
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <label className="text-xs font-semibold text-foreground">{c.days}</label>
          <input type="range" min="1" max="30" value={days} onChange={(event) => { setDays(Number(event.target.value)); setHasInput(true); }} className="w-full accent-primary" aria-label={c.days} />
        </div>
        <p className="mt-1 text-right text-xs font-bold text-primary">{days} {c.days}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{usageItems.map(({ key, label, icon: Icon }) => { const on = usage.includes(key); return <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => { setHasInput(true); setUsage((current) => on ? current.filter((item) => item !== key) : [...current, key]); }} className="justify-start text-xs"><Icon className="size-4" />{label}</Button>; })}</div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs"><span>{c.estimate}</span><strong className="text-primary">≈ {estimate.requiredGb} GB</strong></div>
      </section>
      {isLoading ? (
        <div className="mt-3 h-48 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {rows.map((p) => {
            const inCart = lines.some((l) => l.productId === p.id);
            return (
              <li key={p.id} className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">{recommendedId === p.id && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-bold text-primary">{c.recommended}</span>}</div>
                  <p className="mt-0.5 flex items-center gap-1 font-display text-lg font-semibold text-foreground">
                    {p.unlimited ? (<><InfinityIcon className="size-4" />{c.unlimited}</>) : `${p.dataGb ?? "—"} GB`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.validityDays ? `${p.validityDays} ${c.days}` : ""}
                    {p.supports5g ? " · 5G" : ""}
                    {` · ${p.coverage.length > 1 ? `${p.coverage.length} ${c.countries}` : c.local}`}
                  </p>
                </div>
                <span className="text-base font-bold text-foreground">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</span>
                <Button type="button" onClick={() => add(p)} variant={inCart ? "secondary" : "default"} className="col-span-2 w-full">
                  {inCart ? c.added : c.select}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <V2DataEducation onCalculate={() => assistantRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
      <V2Compatibility />
      <HowItWorks title={c.how} steps={c.steps} />
      <V2Installation />
      <PromoCard image={loungePromo.url} title={c.promo} sub={c.promoSub} to="/design-v2/lounge" />
      <PromoCard image={vignettePromo} title={c.vignettePromo} sub={c.vignettePromoSub} to="/design-v2/vignette" />
      <V2GuidesRail />
      <V2EsimFaq />
      <Link to="/design-v2/cart" className="sr-only">{c.cart}</Link>
    </>
  );
}
