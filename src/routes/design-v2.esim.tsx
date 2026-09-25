import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Globe2, Headphones, Info, Infinity as InfinityIcon, LockKeyhole, MapPin, MessageCircle, Search, Share2, Signal, Video, Zap } from "lucide-react";
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
import { estimateUsageNeed, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";
import { selectRecommendedPackage } from "@/domain/esim/package-matching";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import type { UsageKind } from "@/domain/experience/types";
import { V2Compatibility, V2DataEducation, V2EsimFaq, V2GuidesRail, V2Installation } from "@/components/design-v2/V2DiscoveryContent";
import heroImage from "@/assets/esim-hero-mobile.jpg";
import vignettePromo from "@/assets/v2-vignette-hero.jpg";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Kolay kurulum", net: "Gerçek paketler", pay: "Kolay paket seçimi", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", from: "başlayan", days: "gün", select: "Sepete ekle", added: "Sepette", cart: "Sepete git", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Değiştir", unlimited: "Sınırsız", standard: "Standart", countries: "ülke", local: "Yalnızca bu ülke", packages: "paketleri", chooseLead: "Sana uygun paketi seç.", details: "Paket detayları", data: "İnternet", validity: "Geçerlilik", coverage: "Kapsam", network: "Ağ", activation: "Aktivasyon", activationUnknown: "Kurulum bilgileri satın alma sonrası hesabında gösterilir.", fiveG: "5G desteği", regional: "Birden fazla ülkeye mi gidiyorsun?", regionalLead: "Bölgesel paketlere göz at.", assistant: "Emin değil misin?", assistantLead: "Süre ve kullanımını seç; gerçek paketlerden sana uygun olanı bulalım.", assistantOpen: "Paket yardımcısını aç", assistantClose: "Paket yardımcısını kapat", estimate: "Tahmini ihtiyaç", recommended: "Önerilen paket", usage: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"], promo: "Uçuş öncesi biraz daha konfor", promoSub: "Lounge hizmetini keşfet.", vignettePromo: "Avrupa yollarına hazır ol", vignettePromoSub: "Vinyet hizmetinin durumuna göz at.", how: "Nasıl çalışır?", steps: [{ t: "Ülkeni seç", s: "Sana uygun paketi bul." }, { t: "Sepete ekle", s: "Paketini seç, sepete ekle." }, { t: "Kur ve bağlan", s: "Kurulum bilgilerini hesabından takip et." }] },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Einfache Einrichtung", net: "Echte Pakete", pay: "Einfache Paketwahl", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", from: "ab", days: "Tage", select: "In den Warenkorb", added: "Im Warenkorb", cart: "Zum Warenkorb", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Ändern", unlimited: "Unbegrenzt", standard: "Standard", countries: "Länder", local: "Nur dieses Land", packages: "Pakete", chooseLead: "Wähle das passende Paket.", details: "Paketdetails", data: "Daten", validity: "Gültigkeit", coverage: "Abdeckung", network: "Netz", activation: "Aktivierung", activationUnknown: "Einrichtungsdaten erscheinen nach dem Kauf in deinem Konto.", fiveG: "5G-Unterstützung", regional: "Reist du in mehrere Länder?", regionalLead: "Regionale Pakete ansehen.", assistant: "Noch unsicher?", assistantLead: "Wähle Dauer und Nutzung; wir finden ein passendes echtes Paket.", assistantOpen: "Paketassistent öffnen", assistantClose: "Paketassistent schließen", estimate: "Geschätzter Bedarf", recommended: "Passendes Paket", usage: ["Messaging", "Karten", "Social Media", "Video"], promo: "Mehr Komfort vor dem Abflug", promoSub: "Lounge-Service entdecken.", vignettePromo: "Bereit für Europas Straßen", vignettePromoSub: "Status des Vignettenangebots ansehen.", how: "So funktioniert’s", steps: [{ t: "Land wählen", s: "Passendes Paket finden." }, { t: "In den Warenkorb", s: "Paket wählen und hinzufügen." }, { t: "Einrichten & verbinden", s: "Einrichtungsinfos findest du im Konto." }] },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", picker: "Choose country", empty: "No matching country found.", setup: "Easy setup", net: "Real packages", pay: "Easy plan choice", support: "WhatsApp support", popular: "Popular eSIM destinations", from: "from", days: "days", select: "Add to cart", added: "In cart", cart: "Go to cart", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Change", unlimited: "Unlimited", standard: "Standard", countries: "countries", local: "This country only", packages: "plans", chooseLead: "Choose the right plan for you.", details: "Plan details", data: "Data", validity: "Validity", coverage: "Coverage", network: "Network", activation: "Activation", activationUnknown: "Setup details appear in your account after purchase.", fiveG: "5G support", regional: "Travelling to more than one country?", regionalLead: "Browse regional plans.", assistant: "Not sure?", assistantLead: "Choose your trip length and usage; we'll find a matching real plan.", assistantOpen: "Open plan assistant", assistantClose: "Close plan assistant", estimate: "Estimated need", recommended: "Matching plan", usage: ["Messaging", "Maps", "Social media", "Video"], promo: "More comfort before your flight", promoSub: "Discover the Lounge service.", vignettePromo: "Get ready for Europe's roads", vignettePromoSub: "Check the status of Vignette service.", how: "How it works", steps: [{ t: "Pick a country", s: "Find the right plan." }, { t: "Add to cart", s: "Pick your plan and add it." }, { t: "Set up & connect", s: "Find setup details in your account." }] },
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
      {!selected && <V2Hero image={heroImage} eyebrow="eSIM" title={c.h} subtitle={c.q}>
        <HeroField icon={<Search className="size-5" />}>
          <V2PickerSheet
            open={pickerOpen}
            onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }}
            title={c.picker}
            searchLabel={c.ph}
            query={query}
            onQueryChange={setQuery}
            emptyLabel={prices.isLoading ? "…" : c.empty}
            items={matches.map((item) => {
              const price = priceMap.get(item.iso);
              return { id: item.iso, label: item.name[locale], leading: <CountryFlag iso={item.iso} className="h-4 w-6 rounded-sm" />, ...(price ? { price: `${money(price.amount, price.currency)} ${c.from}` } : {}) };
            })}
            onSelect={choose}
          >
            <Button type="button" variant="ghost" className={`${heroInputClass} justify-start font-normal hover:bg-transparent`}>
              <span className="truncate">{c.ph}</span>
            </Button>
          </V2PickerSheet>
        </HeroField>
      </V2Hero>}

      {selected ? (
        <>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-full bg-card px-4 py-2.5 shadow-sm ring-1 ring-border">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground"><Search className="size-4 shrink-0 text-muted-foreground"/><CountryFlag iso={selected.iso} className="h-4 w-6 shrink-0 rounded-sm"/><span className="truncate">{selected.name[locale]}</span></span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="shrink-0 text-primary">{c.back}</Button>
          </div>
          <V2PickerSheet open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }} title={c.picker} searchLabel={c.ph} query={query} onQueryChange={setQuery} selectedId={selected.iso} emptyLabel={prices.isLoading ? "…" : c.empty} items={matches.map((item) => { const price = priceMap.get(item.iso); return { id: item.iso, label: item.name[locale], leading: <CountryFlag iso={item.iso} className="h-4 w-6 rounded-sm" />, ...(price ? { price: `${money(price.amount, price.currency)} ${c.from}` } : {}) }; })} onSelect={choose}><span /></V2PickerSheet>
          <Packages iso={selected.iso} name={selected.name[locale]} c={c} />
        </>
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

function customerKey(p: EsimPackage) {
  return [p.countryIso, p.unlimited ? "U" : p.dataGb, p.validityDays, p.salePrice, [...p.coverage].sort().join(","), p.supports5g, [...p.networks].sort().join(",")].join("|");
}

function dedupe(packages: EsimPackage[]) {
  const found = new Map<string, EsimPackage>();
  for (const pkg of packages) if (!found.has(customerKey(pkg))) found.set(customerKey(pkg), pkg);
  return [...found.values()];
}

function Packages({ iso, name, c }: { iso: string; name: string; c: (typeof T)["tr"] }) {
  const { locale } = useI18n();
  const { lines, addLine } = useCart();
  const [type, setType] = useState<"standard" | "unlimited">("standard");
  const [detail, setDetail] = useState<EsimPackage | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
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
  const countryPackages = useMemo(() => dedupe(data.filter((pkg) => pkg.countryIso === iso)), [data, iso]);
  const standard = useMemo(() => countryPackages.filter((pkg) => !pkg.unlimited).sort((a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || (a.validityDays ?? 0) - (b.validityDays ?? 0) || (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity)), [countryPackages]);
  const unlimited = useMemo(() => countryPackages.filter((pkg) => pkg.unlimited).sort((a, b) => (a.validityDays ?? 0) - (b.validityDays ?? 0) || (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity)), [countryPackages]);
  const regional = useMemo(() => dedupe(data.filter((pkg) => pkg.countryIso !== iso && pkg.coverage.length > 1)).sort((a, b) => (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity)).filter((pkg, index, all) => all.findIndex((item) => item.dataGb === pkg.dataGb && item.validityDays === pkg.validityDays && item.unlimited === pkg.unlimited) === index).slice(0, 3), [data, iso]);
  const rows = type === "standard" ? standard : unlimited;
  const recommended = hasInput ? selectRecommendedPackage(countryPackages, { coverageIsos: [iso], days, requiredGb: estimate.requiredGb }) : null;
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

  const activationText = (p: EsimPackage) => {
    if (p.activationPolicy === "ON_INSTALL") return locale === "tr" ? "Kurulumla başlar" : locale === "de" ? "Beginnt mit der Installation" : "Starts on installation";
    if (p.activationPolicy === "ON_FIRST_NETWORK_CONNECTION") return locale === "tr" ? "İlk ağ bağlantısında başlar" : locale === "de" ? "Beginnt bei der ersten Netzverbindung" : "Starts on first network connection";
    if (p.activationPolicy === "ON_PURCHASE") return locale === "tr" ? "Satın alındığında başlar" : locale === "de" ? "Beginnt beim Kauf" : "Starts on purchase";
    return c.activationUnknown;
  };

  return (
    <>
      <div className="mt-5">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <CountryFlag iso={iso} className="h-5 w-7 rounded-sm" />
          {name} {c.packages}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{c.chooseLead}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 rounded-xl bg-secondary p-1" role="tablist">
        <Button type="button" variant={type === "standard" ? "default" : "ghost"} role="tab" aria-selected={type === "standard"} onClick={() => setType("standard")} className="min-w-0 text-xs uppercase">{c.standard} · {standard.length}</Button>
        <Button type="button" variant={type === "unlimited" ? "default" : "ghost"} role="tab" aria-selected={type === "unlimited"} onClick={() => setType("unlimited")} className="min-w-0 text-xs uppercase">{c.unlimited} · {unlimited.length}</Button>
      </div>
      {isLoading ? (
        <div className="mt-3 h-48 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {rows.map((p) => {
            const inCart = lines.some((l) => l.productId === p.id);
            return (
              <li key={p.id}>
                <Button type="button" variant="outline" onClick={() => setDetail(p)} className={`relative h-28 w-full flex-col items-start justify-between rounded-xl bg-card p-3 text-left ${inCart ? "ring-2 ring-primary" : ""}`}>
                  <Info className="absolute right-2.5 top-2.5 size-4 text-muted-foreground"/>
                  <span className="font-display text-xl font-bold text-foreground">
                    {p.unlimited ? (<><InfinityIcon className="size-4" />{c.unlimited}</>) : `${p.dataGb ?? "—"} GB`}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{p.validityDays ? `${p.validityDays} ${c.days}` : ""}</span>
                  <span className="text-lg font-bold text-primary">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</span>
                  {inCart && <span className="absolute bottom-2.5 right-2.5 text-[9px] font-bold text-primary">{c.added}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {regional.length > 0 && <section><SectionTitle>{c.regional}</SectionTitle><p className="mb-3 text-xs text-muted-foreground">{c.regionalLead}</p><ul className="grid gap-2">{regional.map((p) => <li key={p.id}><Button type="button" variant="outline" onClick={() => setDetail(p)} className="grid h-auto min-h-20 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card p-3 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Globe2 className="size-4"/></span><span className="min-w-0"><strong className="block truncate text-xs uppercase text-primary">{p.name}</strong><span className="block text-base font-bold text-foreground">{p.unlimited ? c.unlimited : `${p.dataGb ?? "—"} GB`} · {p.validityDays ?? "—"} {c.days}</span><span className="block text-xs font-normal text-muted-foreground">{p.coverage.length} {c.countries}</span></span><strong className="shrink-0 text-sm text-foreground">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</strong></Button></li>)}</ul></section>}
      <section ref={assistantRef} className="mt-5 rounded-xl bg-card p-4 ring-1 ring-border">
        <h3 className="font-display text-base font-bold text-foreground">{c.assistant}</h3><p className="mt-1 text-xs text-muted-foreground">{c.assistantLead}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setAssistantOpen((open) => !open)} className="mt-3 w-full">{assistantOpen ? c.assistantClose : c.assistantOpen}</Button>
        {assistantOpen && <div className="mt-3 border-t border-border pt-3"><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><label className="text-xs font-semibold">{c.days}</label><input type="range" min="1" max="30" value={days} onChange={(event) => { setDays(Number(event.target.value)); setHasInput(true); }} className="w-full accent-primary" aria-label={c.days}/></div><p className="mt-1 text-right text-xs font-bold text-primary">{days} {c.days}</p><div className="mt-2 grid grid-cols-2 gap-2">{usageItems.map(({ key, label, icon: Icon }) => { const on = usage.includes(key); return <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => { setHasInput(true); setUsage((current) => on ? current.filter((item) => item !== key) : [...current, key]); }} className="min-w-0 justify-start text-xs"><Icon className="size-4 shrink-0"/><span className="truncate">{label}</span></Button>; })}</div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs"><span>{c.estimate}</span><strong className="text-primary">≈ {estimate.requiredGb} GB</strong>{recommended && <><span>{c.recommended}</span><Button type="button" variant="link" size="sm" onClick={() => setDetail(recommended)} className="h-auto p-0 font-bold">{recommended.unlimited ? c.unlimited : `${recommended.dataGb ?? "—"} GB`} · {money(recommended.salePrice ?? 0, recommended.currency)}</Button></>}</div></div>}
      </section>
      <V2DataEducation onCalculate={() => assistantRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
      <V2Compatibility />
      <HowItWorks title={c.how} steps={c.steps} />
      <V2Installation />
      <PromoCard image={loungePromo.url} title={c.promo} sub={c.promoSub} to="/design-v2/lounge" />
      <PromoCard image={vignettePromo} title={c.vignettePromo} sub={c.vignettePromoSub} to="/design-v2/vignette" />
      <V2GuidesRail />
      <V2EsimFaq />
      <PackageDetails pkg={detail} onClose={() => setDetail(null)} onAdd={add} c={c} locale={locale} inCart={detail ? lines.some((line) => line.productId === detail.id) : false} activationText={activationText} />
      <Link to="/design-v2/cart" className="sr-only">{c.cart}</Link>
    </>
  );
}

function PackageDetails({ pkg, onClose, onAdd, c, locale, inCart, activationText }: { pkg: EsimPackage | null; onClose: () => void; onAdd: (pkg: EsimPackage) => void; c: (typeof T)["tr"]; locale: "tr" | "de" | "en"; inCart: boolean; activationText: (pkg: EsimPackage) => string }) {
  if (!pkg) return null;
  const coverage = pkg.coverage.map((code) => getCountryByIso(code)?.name[locale] ?? code).join(", ");
  const rows = [[c.data, pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`], [c.validity, `${pkg.validityDays ?? "—"} ${c.days}`], [c.coverage, coverage], [c.network, pkg.networks.length ? pkg.networks.join(", ") : "—"], [c.fiveG, pkg.supports5g ? "5G" : "—"], [c.activation, activationText(pkg)]];
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[82dvh] rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border"><SheetHeader className="pr-10 text-left"><SheetTitle>{c.details}</SheetTitle><SheetDescription>{pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"} {c.days}</SheetDescription></SheetHeader><dl className="mt-4 grid gap-2 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-semibold">{value}</dd></div>)}</dl><div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><strong className="text-xl text-foreground">{money(pkg.salePrice ?? 0, pkg.currency)}</strong><Button type="button" onClick={() => onAdd(pkg)} variant={inCart ? "secondary" : "default"}>{inCart ? c.added : c.select}</Button></div></SheetContent></Sheet>;
}
