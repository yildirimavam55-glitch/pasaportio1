import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowRight, Globe2, Info, Infinity as InfinityIcon, MapPin, MessageCircle, Search, Share2, Video } from "lucide-react";
import { CartBar, HeroField, heroInputClass, HowItWorks, money, PhotoCard, PhotoRail, pick, PromoCard, SectionTitle, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import loungePromo from "@/assets/lounge-card.jpg.asset.json";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getCountryByIso, POPULAR_COUNTRIES, searchCountries } from "@/domain/geo/countries";
import { listEsimDestinationStartingPrices, listEsimPackages, listEsimRegionalSummaries, listEsimStartingPrices, type EsimPackage, type EsimRegionalSummary } from "@/lib/esim-catalogue.functions";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { estimateUsageNeed, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";
import { selectRecommendedPackage } from "@/domain/esim/package-matching";
import { pickRegionalRecommendations } from "@/domain/esim/supplier-metadata";
import { dedupeStorefrontPackages, sortStandardPackages, sortUnlimitedPackages } from "@/domain/esim/storefront-packages";
import { COVERAGE_REGION_LABELS } from "@/domain/geo/coverage-regions";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import type { UsageKind } from "@/domain/experience/types";
import { V2Compatibility, V2DataEducation, V2EsimFaq, V2GuidesRail, V2Installation, V2WhyTravely } from "@/components/design-v2/V2DiscoveryContent";
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
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", stickyPh: "Türkiye veya başka ülke ara", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Kolay kurulum", net: "Gerçek paketler", pay: "Kolay paket seçimi", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", regionalEyebrow: "Birden fazla ülkeye mi gidiyorsun?", regionalTitle: "Bölgesel eSIM paketleri", regionalHomeLead: "Tek eSIM ile birden fazla ülkede bağlantıda kal.", multiCountry: "Çoklu ülke", worldwideBanner: "Dünya çapında sınırsız internet", upTo: "ülkeye kadar kapsama", discoverPlans: "Paketleri keşfet", from: "başlayan", day: "gün", days: "gün", select: "Sepete ekle", added: "Sepette", cart: "Sepete git", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Değiştir", unlimited: "Sınırsız", standard: "Standart", countries: "ülke", local: "Yalnızca bu ülke", packages: "paketleri", chooseLead: "Sana uygun paketi seç.", details: "Paket detayları", data: "İnternet", validity: "Geçerlilik", coverage: "Kapsam", network: "Ağ", activation: "Aktivasyon", activationUnknown: "Kurulum bilgileri satın alma sonrası hesabında gösterilir.", fiveG: "5G desteği", regional: "Birden fazla ülkeye mi gidiyorsun?", regionalLead: "Bölgesel paketlere göz at.", assistant: "Emin değil misin?", assistantLead: "Süre ve kullanımını seç; gerçek paketlerden sana uygun olanı bulalım.", assistantOpen: "Paket yardımcısını aç", assistantClose: "Paket yardımcısını kapat", estimate: "Tahmini ihtiyaç", recommended: "Önerilen paket", usage: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"], promo: "Uçuş öncesi biraz daha konfor", promoSub: "Lounge'u keşfet", vignettePromo: "Avrupa yollarına hazır ol", vignettePromoSub: "Vignette'i keşfet", how: "Nasıl çalışır?", steps: [{ t: "Paketini seç", s: "Ülkeni ve ihtiyacına uygun paketi seç." }, { t: "QR kodunu al", s: "Gerçek provisioning sonrası kurulum bilgilerin hesabına gelir." }, { t: "eSIM'i kur", s: "Gerçek QR kodunu tarayıp cihazına ekle." }, { t: "Seyahatte kullan", s: "Paketinin gerçek koşullarına göre bağlantını kullan." }] },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", stickyPh: "Türkei oder anderes Land suchen", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Einfache Einrichtung", net: "Echte Pakete", pay: "Einfache Paketwahl", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", regionalEyebrow: "Reist du in mehrere Länder?", regionalTitle: "Regionale eSIM-Pakete", regionalHomeLead: "Mit einer eSIM in mehreren Ländern verbunden bleiben.", multiCountry: "Mehrere Länder", worldwideBanner: "Weltweit unbegrenzt online", upTo: "Länder Abdeckung", discoverPlans: "Pakete entdecken", from: "ab", day: "Tag", days: "Tage", select: "In den Warenkorb", added: "Im Warenkorb", cart: "Zum Warenkorb", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Ändern", unlimited: "Unbegrenzt", standard: "Standard", countries: "Länder", local: "Nur dieses Land", packages: "Pakete", chooseLead: "Wähle das passende Paket.", details: "Paketdetails", data: "Daten", validity: "Gültigkeit", coverage: "Abdeckung", network: "Netz", activation: "Aktivierung", activationUnknown: "Einrichtungsdaten erscheinen nach dem Kauf in deinem Konto.", fiveG: "5G-Unterstützung", regional: "Reist du in mehrere Länder?", regionalLead: "Regionale Pakete ansehen.", assistant: "Noch unsicher?", assistantLead: "Wähle Dauer und Nutzung; wir finden ein passendes echtes Paket.", assistantOpen: "Paketassistent öffnen", assistantClose: "Paketassistent schließen", estimate: "Geschätzter Bedarf", recommended: "Passendes Paket", usage: ["Messaging", "Karten", "Social Media", "Video"], promo: "Mehr Komfort vor dem Abflug", promoSub: "Lounge entdecken", vignettePromo: "Bereit für Europas Straßen", vignettePromoSub: "Vignette entdecken", how: "So funktioniert’s", steps: [{ t: "Paket wählen", s: "Land und passendes Datenpaket auswählen." }, { t: "QR-Code erhalten", s: "Nach echter Provisionierung erscheinen die Daten im Konto." }, { t: "eSIM installieren", s: "Echten QR-Code scannen und zum Gerät hinzufügen." }, { t: "Auf Reisen nutzen", s: "Gemäß den tatsächlichen Paketbedingungen verbinden." }] },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", stickyPh: "Search Turkey or another country", picker: "Choose country", empty: "No matching country found.", setup: "Easy setup", net: "Real packages", pay: "Easy plan choice", support: "WhatsApp support", popular: "Popular eSIM destinations", regionalEyebrow: "Travelling to multiple countries?", regionalTitle: "Regional eSIM plans", regionalHomeLead: "Stay connected across multiple countries with one eSIM.", multiCountry: "Multi-country", worldwideBanner: "Unlimited data worldwide", upTo: "countries covered", discoverPlans: "Explore plans", from: "from", day: "day", days: "days", select: "Add to cart", added: "In cart", cart: "Go to cart", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Change", unlimited: "Unlimited", standard: "Standard", countries: "countries", local: "This country only", packages: "plans", chooseLead: "Choose the right plan for you.", details: "Plan details", data: "Data", validity: "Validity", coverage: "Coverage", network: "Network", activation: "Activation", activationUnknown: "Setup details appear in your account after purchase.", fiveG: "5G support", regional: "Travelling to more than one country?", regionalLead: "Browse regional plans.", assistant: "Not sure?", assistantLead: "Choose your trip length and usage; we'll find a matching real plan.", assistantOpen: "Open plan assistant", assistantClose: "Close plan assistant", estimate: "Estimated need", recommended: "Matching plan", usage: ["Messaging", "Maps", "Social media", "Video"], promo: "More comfort before your flight", promoSub: "Discover Lounge", vignettePromo: "Get ready for Europe's roads", vignettePromoSub: "Discover Vignette", how: "How it works", steps: [{ t: "Choose your plan", s: "Pick your country and a suitable package." }, { t: "Get your QR code", s: "Setup details arrive after real provisioning." }, { t: "Install your eSIM", s: "Scan the real QR code and add it to your phone." }, { t: "Use it abroad", s: "Connect under the package's actual conditions." }] },
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
  const regionalSummaries = useQuery({ queryKey: ["v2-esim-regions"], queryFn: () => listEsimRegionalSummaries() });
  const priceMap = useMemo(() => new Map((prices.data ?? []).map((price) => [price.targetId, price])), [prices.data]);
  const matches = useMemo(
    () => searchCountries(query, 250).filter((item) => priceMap.has(item.iso)),
    [priceMap, query],
  );
  const selected = country ? getCountryByIso(country.toUpperCase()) : undefined;
  const heroSearchRef = useRef<HTMLDivElement | null>(null);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  const choose = (iso: string) => {
    setQuery("");
    setPickerOpen(false);
    void navigate({ search: { country: iso } });
  };
  useEffect(() => {
    const target = heroSearchRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "-56px 0px 0px", threshold: 0.05 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const stickySearch = !selected ? (
    <div aria-hidden={heroSearchVisible} className={`sticky top-14 z-40 h-0 transition-[opacity,transform] duration-200 sm:top-16 ${heroSearchVisible ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}>
      <div className="mx-auto max-w-site px-3 pt-1 sm:px-6">
        <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="mx-auto grid h-11 w-full max-w-finder grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-card px-3 text-left shadow-panel">
          <Search className="size-4 shrink-0 text-primary" /><span className="truncate text-sm text-muted-foreground">{c.stickyPh}</span><ArrowRight className="size-4 shrink-0" />
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <V2Shell service="esim" commerceSelection={Boolean(selected)} stickySearch={stickySearch}>
      {!selected && <V2Hero image={heroImage} eyebrow="eSIM" title={c.h} subtitle={c.q}>
        <div ref={heroSearchRef}><HeroField icon={<Search className="size-5" />}>
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
        </HeroField></div>
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
          <Popular c={c} onPick={choose} />
          <RegionalDiscovery summaries={regionalSummaries.data ?? []} loading={regionalSummaries.isLoading} c={c} />
          <V2Compatibility />
          <PromoCard image={loungePromo.url} title={c.promo} sub={c.promoSub} to="/design-v2/lounge" />
          <V2Installation />
          <PromoCard image={vignettePromo} title={c.vignettePromo} sub={c.vignettePromoSub} to="/design-v2/vignette" />
          <V2GuidesRail />
          <V2EsimFaq compact />
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

function RegionalDiscovery({ summaries, loading, c }: { summaries: EsimRegionalSummary[]; loading: boolean; c: (typeof T)["tr"] }) {
  const { locale } = useI18n();
  const worldwide = summaries.find((item) => item.region === "GLOBAL" && item.unlimitedCount > 0);
  const regions = summaries.filter((item) => item.region !== "GLOBAL");
  return (
    <section aria-labelledby="regional-esim-title">
      <p className="mt-5 text-[11px] font-bold uppercase text-primary">{c.regionalEyebrow}</p>
      <SectionTitle><span id="regional-esim-title">{c.regionalTitle}</span></SectionTitle>
      <p className="mb-3 text-xs text-muted-foreground">{c.regionalHomeLead}</p>
      {loading ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [overscroll-behavior-inline:contain] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {regions.map((item) => {
            const photo = getRegionPhoto(item.region);
            return <li key={item.region} className="w-[64%] shrink-0 snap-start sm:w-auto">
              <Link to="/design-v2/esim-region/$region" params={{ region: item.region }} search={{ country: "" }} className="group relative block h-40 overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
                {photo && <img src={photo.url} alt={photo.alt[locale]} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)]/95 via-[var(--v2-service)]/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 p-3 text-primary-foreground">
                  <div className="min-w-0"><h3 className="truncate font-display text-lg font-bold">{COVERAGE_REGION_LABELS[item.region][locale]}</h3><p className="text-xs opacity-90">{item.coverageCount ? `${item.coverageCount} ${c.countries}` : c.multiCountry}</p><p className="mt-1 text-sm font-bold">{locale === "de" ? `${c.from} ${money(item.startingPrice, item.currency)}` : `${c.from} ${money(item.startingPrice, item.currency)}`}</p></div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-primary"><ArrowRight className="size-4" /></span>
                </div>
              </Link>
            </li>;
          })}
        </ul>
      )}
      {worldwide?.lowestUnlimitedPrice != null && worldwide.maxUnlimitedCoverageCount != null && <Link to="/design-v2/esim-region/$region" params={{ region: "GLOBAL" }} search={{ country: "" }} className="relative mt-2 grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl bg-primary px-3.5 py-3 text-primary-foreground shadow-sm">
        <span className="grid size-10 place-items-center rounded-full bg-card text-primary"><InfinityIcon className="size-5" /></span>
        <span className="min-w-0"><strong className="block font-display text-sm">{c.worldwideBanner}</strong><span className="block text-[11px] opacity-90">{worldwide.maxUnlimitedCoverageCount} {c.upTo} · {c.from} {money(worldwide.lowestUnlimitedPrice, worldwide.currency)}</span><span className="mt-1 block text-xs font-bold">{c.discoverPlans} →</span></span>
        <ArrowRight className="size-4 shrink-0" />
      </Link>}
    </section>
  );
}

const X = {
  tr: { tier: "Paket seviyesi", tiers: { LITE: "Lite", ESSENTIAL: "Essential", PLUS: "Plus" }, tierNote: "Aynı süre için tedarikçi Lite, Essential ve Plus seviyeleri sunar; fiyat farkı bu seviyeden gelir. Hız ve adil kullanım ayrıntıları tedarikçi kataloğunda belirtilmez.", tech: "Ağ teknolojisi", regions: { EUROPE: "Avrupa", EUROPE_USA: "Avrupa + ABD", MIDDLE_EAST: "Orta Doğu", ASIA: "Asya", AFRICA: "Afrika", AMERICAS: "Amerika", GLOBAL: "Global" }, region: "Bölgesel" },
  de: { tier: "Paketstufe", tiers: { LITE: "Lite", ESSENTIAL: "Essential", PLUS: "Plus" }, tierNote: "Für dieselbe Dauer bietet der Anbieter die Stufen Lite, Essential und Plus an; der Preisunterschied ergibt sich aus der Stufe. Geschwindigkeit und Fair-Use werden im Anbieterkatalog nicht angegeben.", tech: "Netztechnologie", regions: { EUROPE: "Europa", EUROPE_USA: "Europa + USA", MIDDLE_EAST: "Naher Osten", ASIA: "Asien", AFRICA: "Afrika", AMERICAS: "Amerika", GLOBAL: "Global" }, region: "Regional" },
  en: { tier: "Plan tier", tiers: { LITE: "Lite", ESSENTIAL: "Essential", PLUS: "Plus" }, tierNote: "For the same duration the supplier offers Lite, Essential and Plus tiers; the price difference comes from the tier. Speed and fair-use details are not specified in the supplier catalogue.", tech: "Network technology", regions: { EUROPE: "Europe", EUROPE_USA: "Europe + USA", MIDDLE_EAST: "Middle East", ASIA: "Asia", AFRICA: "Africa", AMERICAS: "Americas", GLOBAL: "Global" }, region: "Regional" },
} as const;

function techLabel(p: EsimPackage) {
  const g = p.networkGenerations.filter((x) => x === "4G" || x === "5G");
  return g.length ? g.join("/") : p.networkGenerations.at(-1) ?? null;
}

// Price deliberately excluded: truly equivalent options collapse to the cheaper one.
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
  const countryPackages = useMemo(() => dedupeStorefrontPackages(data.filter((pkg) => pkg.countryIso === iso)), [data, iso]);
  const standard = useMemo(() => sortStandardPackages(countryPackages.filter((pkg) => !pkg.unlimited)), [countryPackages]);
  const unlimited = useMemo(() => sortUnlimitedPackages(countryPackages.filter((pkg) => pkg.unlimited)), [countryPackages]);
  const regional = useMemo(() => pickRegionalRecommendations(dedupeStorefrontPackages(data.filter((pkg) => pkg.countryIso !== iso && pkg.coverage.length > 1))), [data, iso]);
  const x = X[locale];
  const regionName = (p: EsimPackage) => (p.regionFamily ? x.regions[p.regionFamily] : x.region);
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
      name: customerCataloguePackageTitle({ locale, destinationIso: p.countryIso, coverage: p.coverage, packageKind: p.packageKind, regionFamily: p.regionFamily }),
      meta: p.unlimited ? c.unlimited : `${p.dataGb ?? "—"} GB`,
      price: p.salePrice,
      currency: p.currency,
      dataGb: p.dataGb,
      validityDays: p.validityDays,
      coverage: p.coverage,
      destinationIso: p.countryIso,
      packageKind: p.packageKind,
      regionFamily: p.regionFamily,
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
              <li key={p.id} className="min-w-0">
                <Button type="button" variant="outline" onClick={() => setDetail(p)} className={`relative h-24 w-full flex-col items-start justify-start gap-0 rounded-xl bg-card p-2.5 pr-9 text-left shadow-sm ${inCart ? "ring-2 ring-primary" : ""}`}>
                  <Info className="absolute right-2.5 top-2.5 size-4 text-muted-foreground"/>
                   <span className="flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap font-display text-[17px] font-bold leading-6 text-foreground">
                     {p.unlimited ? (<><InfinityIcon className="size-3.5 shrink-0 text-muted-foreground" /><span>{c.unlimited}</span></>) : `${p.dataGb ?? "—"} GB`}
                  </span>
                   <span className="mt-1 text-xs font-normal leading-4 text-muted-foreground">{p.validityDays ? `${p.validityDays} ${c.days}` : ""}</span>
                   <span className="mt-2 text-base font-bold leading-5 text-primary">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</span>
                   {inCart && <span className="absolute bottom-2.5 right-2.5 text-[9px] font-bold leading-none text-primary">{c.added}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {regional.length > 0 && <section><SectionTitle>{c.regional}</SectionTitle><p className="mb-3 text-xs text-muted-foreground">{c.regionalLead}</p><ul className="grid gap-2">{regional.map((p) => <li key={p.id}><Button type="button" variant="outline" onClick={() => setDetail(p)} className="grid h-auto min-h-20 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card p-3 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Globe2 className="size-4"/></span><span className="min-w-0"><strong className="block truncate text-xs uppercase text-primary">{regionName(p)}</strong><span className="block text-base font-bold text-foreground">{p.unlimited ? c.unlimited : `${p.dataGb ?? "—"} GB`} · {p.validityDays ?? "—"} {c.days}</span><span className="block text-xs font-normal text-muted-foreground">{p.coverage.length} {c.countries}</span></span><strong className="shrink-0 text-sm text-foreground">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</strong></Button></li>)}</ul></section>}
      <section ref={assistantRef} className="mt-5 rounded-xl bg-card p-4 ring-1 ring-border">
        <h3 className="font-display text-base font-bold text-foreground">{c.assistant}</h3><p className="mt-1 text-xs text-muted-foreground">{c.assistantLead}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setAssistantOpen((open) => !open)} className="mt-3 w-full">{assistantOpen ? c.assistantClose : c.assistantOpen}</Button>
        {assistantOpen && <div className="mt-3 border-t border-border pt-3"><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><label className="text-xs font-semibold">{c.days}</label><input type="range" min="1" max="30" value={days} onChange={(event) => { setDays(Number(event.target.value)); setHasInput(true); }} className="w-full accent-primary" aria-label={c.days}/></div><p className="mt-1 text-right text-xs font-bold text-primary">{days} {c.days}</p><div className="mt-2 grid grid-cols-2 gap-2">{usageItems.map(({ key, label, icon: Icon }) => { const on = usage.includes(key); return <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => { setHasInput(true); setUsage((current) => on ? current.filter((item) => item !== key) : [...current, key]); }} className="min-w-0 justify-start text-xs"><Icon className="size-4 shrink-0"/><span className="truncate">{label}</span></Button>; })}</div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs"><span>{c.estimate}</span><strong className="text-primary">≈ {estimate.requiredGb} GB</strong>{recommended && <><span>{c.recommended}</span><Button type="button" variant="link" size="sm" onClick={() => setDetail(recommended)} className="h-auto p-0 font-bold">{recommended.unlimited ? c.unlimited : `${recommended.dataGb ?? "—"} GB`} · {money(recommended.salePrice ?? 0, recommended.currency)}</Button></>}</div></div>}
      </section>
      <V2DataEducation onCalculate={() => assistantRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} />
      <V2Compatibility />
      <HowItWorks title={c.how} steps={c.steps} />
      <V2Installation />
      <V2WhyTravely />
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
  const x = X[locale];
  const tech = techLabel(pkg);
  const rows = ([
    [c.data, pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`],
    [c.validity, `${pkg.validityDays ?? "—"} ${c.days}`],
    [c.coverage, pkg.coverage.length > 1 ? `${pkg.regionFamily ? x.regions[pkg.regionFamily] + " · " : ""}${pkg.coverage.length} ${c.countries}: ${coverage}` : coverage],
    pkg.networks.length ? [c.network, pkg.networks.join(", ")] : null,
    tech ? [x.tech, tech] : null,
    pkg.highSpeedAllowance ? ["FUP", pkg.highSpeedAllowance] : null,
    [c.activation, activationText(pkg)],
  ].filter(Boolean) as string[][]);
  const identity = customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily });
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent side="bottom" className="max-h-[82dvh] rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:border"><SheetHeader className="pr-10 text-left"><SheetTitle>{identity}</SheetTitle><SheetDescription>{pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"} {c.days}</SheetDescription></SheetHeader><dl className="mt-4 grid gap-2 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b border-border pb-2"><dt className="text-muted-foreground">{label}</dt><dd className="break-words text-right font-semibold">{value}</dd></div>)}</dl><div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><strong className="text-xl text-foreground">{money(pkg.salePrice ?? 0, pkg.currency)}</strong><Button type="button" onClick={() => onAdd(pkg)} variant={inCart ? "secondary" : "default"}>{inCart ? c.added : c.select}</Button></div></SheetContent></Sheet>;
}
