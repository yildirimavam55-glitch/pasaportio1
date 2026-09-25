import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, BarChart3, Infinity as InfinityIcon, MapPin, MessageCircle, Search, Share2, Smartphone, Sparkles, Video } from "lucide-react";
import { DeviceCheckSheet } from "@/components/travel/DeviceCompatibility";
import { CartBar, HeroField, heroInputClass, money, PhotoCard, PhotoRail, pick, SectionTitle, useV2StickySearch, V2Hero, V2Shell, V2StickySearchButton } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getCountryByIso, searchCountries } from "@/domain/geo/countries";
import { listEsimDestinationStartingPrices, listEsimPackages, listEsimRegionalSummaries, listEsimStartingPrices, type EsimPackage, type EsimRegionalSummary } from "@/lib/esim-catalogue.functions";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { estimateUsageNeed, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";
import { selectRecommendedPackage } from "@/domain/esim/package-matching";
import { dedupeStorefrontPackages, sortStandardPackages, sortUnlimitedPackages } from "@/domain/esim/storefront-packages";
import { COVERAGE_REGION_LABELS } from "@/domain/geo/coverage-regions";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import type { UsageKind } from "@/domain/experience/types";
import { V2Installation } from "@/components/design-v2/V2DiscoveryContent";
import { mediaUrl, useV2Page, V2Sections, v2PageQuery } from "@/components/design-v2/V2Sections";
import { v2Text, type V2Section } from "@/domain/storefront/v2";
import { V2EsimPackageDetails } from "@/components/design-v2/V2EsimPackageDetails";
import { V2ProductSelectionCard, V2SelectedProductSummary } from "@/components/design-v2/V2ProductSelection";

/** Public home/eSIM search: optional country + legacy `service` hint (V1 links used `/?service=lounge`). */
export const validateEsimSearch = (s: Record<string, unknown>): { country?: string; service?: "esim" | "lounge" } => ({
  ...(typeof s["country"] === "string" && s["country"] ? { country: s["country"].slice(0, 2) } : {}),
  ...(s["service"] === "lounge" || s["service"] === "esim" ? { service: s["service"] } : {}),
});


const T = {
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", stickyPh: "Türkiye veya başka ülke ara", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Kolay kurulum", net: "Gerçek paketler", pay: "Kolay paket seçimi", benefitDelivery: "Hızlı teslim", benefitCoverage: "Geniş kapsama", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", regionalEyebrow: "Birden fazla ülkeye mi gidiyorsun?", regionalTitle: "Bölgesel eSIM paketleri", regionalHomeLead: "Tek eSIM ile birden fazla ülkede bağlantıda kal.", multiCountry: "Çoklu ülke", worldwideBanner: "Dünya çapında sınırsız internet", upTo: "ülkeye kadar kapsama", discoverPlans: "Paketleri keşfet", from: "başlayan", day: "gün", days: "gün", select: "Sepete ekle", added: "Sepette", cart: "Sepete git", decrease: "Azalt", increase: "Artır", detailsLabel: "Paket detayları", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Değiştir", unlimited: "Sınırsız", standard: "Standart", countries: "ülke", local: "Yalnızca bu ülke", packages: "eSIM", chooseLead: "Sana uygun paketi seç.", details: "Paket detayları", data: "İnternet", validity: "Geçerlilik", coverage: "Kapsam", network: "Ağ", activation: "Aktivasyon", activationUnknown: "Kurulum bilgileri satın alma sonrası hesabında gösterilir.", fiveG: "5G desteği", regional: "Birden fazla ülkeye mi gidiyorsun?", regionalLead: "Bölgesel paketleri keşfet", assistant: "Hangi paket sana uygun?", assistantLead: "Kısa sorularla ihtiyacını bul.", assistantOpen: "Paket yardımcısını aç", assistantClose: "Paket yardımcısını kapat", estimate: "Tahmini ihtiyaç", recommended: "Önerilen paket", usage: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"], installTitle: "Kurulum nasıl yapılır?", installLead: "Gerçek kurulum bilgilerin satın alma ve provisioning tamamlandığında hesabında görünür.", installCta: "Kurulum rehberini gör", promo: "Uçuş öncesi biraz daha konfor", promoSub: "Lounge'u keşfet", vignettePromo: "Avrupa yollarına hazır ol", vignettePromoSub: "Vignette'i keşfet" },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", stickyPh: "Türkei oder anderes Land suchen", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Einfache Einrichtung", net: "Echte Pakete", pay: "Einfache Paketwahl", benefitDelivery: "Schnell verfügbar", benefitCoverage: "Große Abdeckung", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", regionalEyebrow: "Reist du in mehrere Länder?", regionalTitle: "Regionale eSIM-Pakete", regionalHomeLead: "Mit einer eSIM in mehreren Ländern verbunden bleiben.", multiCountry: "Mehrere Länder", worldwideBanner: "Weltweit unbegrenzt online", upTo: "Länder Abdeckung", discoverPlans: "Pakete entdecken", from: "ab", day: "Tag", days: "Tage", select: "In den Warenkorb", added: "Im Warenkorb", cart: "Zum Warenkorb", decrease: "Weniger", increase: "Mehr", detailsLabel: "Paketdetails", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Ändern", unlimited: "Unbegrenzt", standard: "Standard", countries: "Länder", local: "Nur dieses Land", packages: "eSIM", chooseLead: "Wähle das passende Paket.", details: "Paketdetails", data: "Daten", validity: "Gültigkeit", coverage: "Abdeckung", network: "Netz", activation: "Aktivierung", activationUnknown: "Einrichtungsdaten erscheinen nach dem Kauf in deinem Konto.", fiveG: "5G-Unterstützung", regional: "Reist du in mehrere Länder?", regionalLead: "Regionale Pakete entdecken", assistant: "Welches Paket passt zu dir?", assistantLead: "Finde deinen Bedarf mit kurzen Fragen.", assistantOpen: "Paketassistent öffnen", assistantClose: "Paketassistent schließen", estimate: "Geschätzter Bedarf", recommended: "Passendes Paket", usage: ["Messaging", "Karten", "Social Media", "Video"], installTitle: "Wie funktioniert die Installation?", installLead: "Deine echten Einrichtungsdaten erscheinen nach Kauf und Provisionierung in deinem Konto.", installCta: "Installationshilfe ansehen", promo: "Mehr Komfort vor dem Abflug", promoSub: "Lounge entdecken", vignettePromo: "Bereit für Europas Straßen", vignettePromoSub: "Vignette entdecken" },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", stickyPh: "Search Turkey or another country", picker: "Choose country", empty: "No matching country found.", setup: "Easy setup", net: "Real packages", pay: "Easy plan choice", benefitDelivery: "Fast delivery", benefitCoverage: "Wide coverage", support: "WhatsApp support", popular: "Popular eSIM destinations", regionalEyebrow: "Travelling to multiple countries?", regionalTitle: "Regional eSIM plans", regionalHomeLead: "Stay connected across multiple countries with one eSIM.", multiCountry: "Multi-country", worldwideBanner: "Unlimited data worldwide", upTo: "countries covered", discoverPlans: "Explore plans", from: "from", day: "day", days: "days", select: "Add to cart", added: "In cart", cart: "Go to cart", decrease: "Decrease", increase: "Increase", detailsLabel: "Plan details", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Change", unlimited: "Unlimited", standard: "Standard", countries: "countries", local: "This country only", packages: "eSIM", chooseLead: "Choose the right plan for you.", details: "Plan details", data: "Data", validity: "Validity", coverage: "Coverage", network: "Network", activation: "Activation", activationUnknown: "Setup details appear in your account after purchase.", fiveG: "5G support", regional: "Travelling to more than one country?", regionalLead: "Explore regional plans", assistant: "Which plan is right for you?", assistantLead: "Find what you need with a few quick questions.", assistantOpen: "Open plan assistant", assistantClose: "Close plan assistant", estimate: "Estimated need", recommended: "Matching plan", usage: ["Messaging", "Maps", "Social media", "Video"], installTitle: "How do I install it?", installLead: "Your real setup details appear in your account after purchase and provisioning.", installCta: "View installation guide", promo: "More comfort before your flight", promoSub: "Discover Lounge", vignettePromo: "Get ready for Europe's roads", vignettePromoSub: "Discover Vignette" },
};

export function EsimHomePage() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const country = String((useSearch({ strict: false }) as { country?: string }).country ?? "").slice(0, 2).toUpperCase();
  const navigateRaw = useNavigate();
  const navigate = (opts: { search: { country: string } }) => navigateRaw({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, ...opts.search }) } as never);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { lines, addLine, updateQuantity, count } = useCart();
  const [selectedPackage, setSelectedPackage] = useState<EsimPackage | null>(null);
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const prices = useQuery({ queryKey: ["v2-esim-destinations"], queryFn: () => listEsimDestinationStartingPrices() });
  const regionalSummaries = useQuery({ queryKey: ["v2-esim-regions"], queryFn: () => listEsimRegionalSummaries() });
  const priceMap = useMemo(() => new Map((prices.data ?? []).map((price) => [price.targetId, price])), [prices.data]);
  const matches = useMemo(
    () => searchCountries(query, 250).filter((item) => priceMap.has(item.iso)),
    [priceMap, query],
  );
  const selected = country ? getCountryByIso(country.toUpperCase()) : undefined;
  const { heroSearchRef, heroSearchVisible } = useV2StickySearch();
  const { config, media } = useV2Page("esim");
  const heroSection = config.sections[0];
  const stickyLabel = v2Text(heroSection, "sticky", locale) || v2Text(heroSection, "placeholder", locale) || c.stickyPh;
  const choose = (iso: string) => {
    setSelectedPackage(null);
    setSelectionQuantity(1);
    setQuery("");
    setPickerOpen(false);
    void navigate({ search: { country: iso } });
  };
  const selectedCartLine = selectedPackage ? lines.find((line) => line.productId === selectedPackage.id) : undefined;
  const selectedIdentity = selectedPackage ? customerCataloguePackageTitle({ locale, destinationIso: selectedPackage.countryIso, coverage: selectedPackage.coverage, packageKind: selectedPackage.packageKind, regionFamily: selectedPackage.regionFamily }) : "";
  const selectPackage = (pkg: EsimPackage) => {
    if (selectedPackage?.id === pkg.id) { setSelectedPackage(null); return; }
    setSelectedPackage(pkg);
    setSelectionQuantity(lines.find((line) => line.productId === pkg.id)?.quantity ?? 1);
  };
  const addSelectedPackage = () => {
    if (!selectedPackage || selectedCartLine) return;
    addLine({
      productId: selectedPackage.id,
      providerProductId: selectedPackage.providerProductId,
      serviceType: "ESIM",
      name: selectedIdentity,
      meta: selectedPackage.unlimited ? c.unlimited : `${selectedPackage.dataGb ?? "—"} GB`,
      price: selectedPackage.salePrice,
      currency: selectedPackage.currency,
      quantity: selectionQuantity,
      dataGb: selectedPackage.dataGb,
      validityDays: selectedPackage.validityDays,
      coverage: selectedPackage.coverage,
      destinationIso: selectedPackage.countryIso,
      packageKind: selectedPackage.packageKind,
      regionFamily: selectedPackage.regionFamily,
      isTest: selectedPackage.isTest,
    });
  };
  const purchaseSummary = selectedPackage ? <V2SelectedProductSummary
    title={`${selectedPackage.unlimited ? `∞ ${c.unlimited}` : `${selectedPackage.dataGb ?? "—"} GB`} · ${selectedPackage.validityDays ?? "—"} ${c.days}`}
    subtitle={selectedPackage.coverage.length > 1 ? `${selectedIdentity.replace(/ eSIM$/, "")} · ${selectedPackage.coverage.length} ${c.countries}` : selectedIdentity.replace(/ eSIM$/, "")}
    price={money(selectedPackage.salePrice ?? 0, selectedPackage.currency)}
    quantity={selectedCartLine?.quantity ?? selectionQuantity}
    inCart={Boolean(selectedCartLine)}
    addLabel={c.select}
    addedLabel={c.added}
    cartLabel={c.cart}
    decreaseLabel={c.decrease}
    increaseLabel={c.increase}
    whatsappLabel={c.support}
    onQuantityChange={(quantity) => selectedCartLine ? updateQuantity(selectedCartLine.productId, quantity) : setSelectionQuantity(quantity)}
    onAdd={addSelectedPackage}
  /> : undefined;
  const stickySearch = !selected ? (
    <V2StickySearchButton heroSearchVisible={heroSearchVisible} label={stickyLabel} onOpen={() => setPickerOpen(true)} />
  ) : undefined;

  return (
    <V2Shell service="esim" commerceSelection={Boolean(selectedPackage)} stickySearch={stickySearch} purchaseSummary={purchaseSummary}>

      {selected ? (
        <>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-full bg-card px-4 py-2.5 shadow-sm ring-1 ring-border">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground"><Search className="size-4 shrink-0 text-muted-foreground"/><CountryFlag iso={selected.iso} className="h-4 w-6 shrink-0 rounded-sm"/><span className="truncate">{selected.name[locale]}</span></span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="shrink-0 text-primary">{c.back}</Button>
          </div>
          <V2PickerSheet open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }} title={c.picker} searchLabel={c.ph} query={query} onQueryChange={setQuery} selectedId={selected.iso} emptyLabel={prices.isLoading ? "…" : c.empty} items={matches.map((item) => { const price = priceMap.get(item.iso); return { id: item.iso, label: item.name[locale], leading: <CountryFlag iso={item.iso} className="h-4 w-6 rounded-sm" />, ...(price ? { price: `${money(price.amount, price.currency)} ${c.from}` } : {}) }; })} onSelect={choose}><span /></V2PickerSheet>
          <Packages iso={selected.iso} name={selected.name[locale]} c={c} selectedPackage={selectedPackage} onSelectPackage={selectPackage} />
        </>
      ) : (
        <>
          <V2Sections
            config={config}
            media={media}
            slots={{
              hero: (section) => (
<V2Hero image={mediaUrl(section.mobileMediaId ?? section.mediaId, media) ?? ""} desktopImage={mediaUrl(section.mediaId, media)} eyebrow={v2Text(section, "eyebrow", locale)} title={v2Text(section, "title", locale)} subtitle={v2Text(section, "subtitle", locale)} align={section.align} height={section.height} overlay={section.overlay}>
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
              <span className="truncate">{v2Text(section, "placeholder", locale) || c.ph}</span>
            </Button>
          </V2PickerSheet>
        </HeroField></div>
      </V2Hero>
              ),
              destinations: (section) => <Popular c={c} section={section} onPick={choose} />,
              regions: (section) => <RegionalDiscovery section={section} summaries={regionalSummaries.data ?? []} loading={regionalSummaries.isLoading} c={c} />,
            }}
          />
        </>
      )}
      <CartBar count={count} label={c.cart} />
    </V2Shell>
  );
}

function Popular({ c, section, onPick }: { c: (typeof T)["tr"]; section: V2Section; onPick: (iso: string) => void }) {
  const { locale } = useI18n();
  const list = section.items.filter((item) => item.visible).flatMap((item) => { const country = getCountryByIso(item.entity); return country ? [country] : []; });
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
      <SectionTitle>{v2Text(section, "title", locale) || c.popular}</SectionTitle>
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

function RegionalDiscovery({ section, summaries, loading, c }: { section: V2Section; summaries: EsimRegionalSummary[]; loading: boolean; c: (typeof T)["tr"] }) {
  const { locale } = useI18n();
  const worldwide = summaries.find((item) => item.region === "GLOBAL" && item.unlimitedCount > 0);
  const regions = summaries.filter((item) => item.region !== "GLOBAL");
  return (
    <section aria-labelledby="regional-esim-title">
      <p className="mt-5 text-[11px] font-bold uppercase text-primary">{v2Text(section, "eyebrow", locale)}</p>
      <SectionTitle><span id="regional-esim-title">{v2Text(section, "title", locale) || c.regionalTitle}</span></SectionTitle>
      <p className="mb-3 text-xs text-muted-foreground">{v2Text(section, "lead", locale)}</p>
      {loading ? <div className="h-40 animate-pulse rounded-xl bg-muted" /> : (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [overscroll-behavior-inline:contain] [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-3 lg:gap-4">
          {regions.map((item) => {
            const photo = getRegionPhoto(item.region);
            return <li key={item.region} className="w-[64%] shrink-0 snap-start sm:w-auto">
              <Link to="/esim/bolge/$region" params={{ region: item.region }} search={{ country: "" }} className="group relative block h-40 overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border lg:h-52">
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
      {worldwide?.lowestUnlimitedPrice != null && worldwide.maxUnlimitedCoverageCount != null && <Link to="/esim/bolge/$region" params={{ region: "GLOBAL" }} search={{ country: "" }} className="relative mt-2 grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl bg-primary px-3.5 py-3 text-primary-foreground shadow-sm lg:mt-6 lg:min-h-32 lg:gap-5 lg:px-7">
        <span className="grid size-10 place-items-center rounded-full bg-card text-primary lg:size-14"><InfinityIcon className="size-5 lg:size-7" /></span>
        <span className="min-w-0"><strong className="block font-display text-sm lg:text-2xl">{v2Text(section, "worldwide", locale) || c.worldwideBanner}</strong><span className="block text-[11px] opacity-90 lg:mt-1 lg:text-sm">{worldwide.maxUnlimitedCoverageCount} {c.upTo} · {c.from} {money(worldwide.lowestUnlimitedPrice, worldwide.currency)}</span><span className="mt-1 block text-xs font-bold lg:text-sm">{v2Text(section, "cta", locale) || c.discoverPlans} →</span></span>
        <ArrowRight className="size-4 shrink-0" />
      </Link>}
    </section>
  );
}

// Price deliberately excluded: truly equivalent options collapse to the cheaper one.
const HELP = {
  tr: { title: "Karar vermene yardımcı olalım", lead: "Doğru paketi seç ve telefonunun uyumluluğunu kontrol et.", assistantLead: "Kullanımına göre paket önerisi al.", find: "Paketimi bul", compatTitle: "Telefonum eSIM uyumlu mu?", compatLead: "Cihazını birkaç saniyede kontrol et.", compatCta: "Uyumluluğu kontrol et" },
  de: { title: "Wir helfen dir bei der Wahl", lead: "Wähle das passende Paket und prüfe, ob dein Handy kompatibel ist.", assistantLead: "Erhalte eine Empfehlung nach deiner Nutzung.", find: "Mein Paket finden", compatTitle: "Ist mein Handy eSIM-fähig?", compatLead: "Prüfe dein Gerät in wenigen Sekunden.", compatCta: "Kompatibilität prüfen" },
  en: { title: "Let us help you decide", lead: "Pick the right plan and check your phone's compatibility.", assistantLead: "Get a plan suggestion based on your usage.", find: "Find my plan", compatTitle: "Is my phone eSIM compatible?", compatLead: "Check your device in seconds.", compatCta: "Check compatibility" },
};

function Packages({ iso, name, c, selectedPackage, onSelectPackage }: { iso: string; name: string; c: (typeof T)["tr"]; selectedPackage: EsimPackage | null; onSelectPackage: (pkg: EsimPackage) => void }) {
  const { locale } = useI18n();
  const h = pick(locale, HELP);
  const { lines } = useCart();
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
  const rows = type === "standard" ? standard : unlimited;
  const recommended = hasInput ? selectRecommendedPackage(countryPackages, { coverageIsos: [iso], days, requiredGb: estimate.requiredGb }) : null;
  const usageItems: Array<{ key: UsageKind; label: string; icon: typeof MessageCircle }> = [
    { key: "MESSAGING", label: c.usage[0] ?? "", icon: MessageCircle }, { key: "MAPS", label: c.usage[1] ?? "", icon: MapPin },
    { key: "SOCIAL", label: c.usage[2] ?? "", icon: Share2 }, { key: "VIDEO", label: c.usage[3] ?? "", icon: Video },
  ];
  return (
    <>
      <div className="mt-5 lg:mt-10">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-foreground lg:text-4xl">
          <CountryFlag iso={iso} className="h-5 w-7 rounded-sm" />
          {name} {c.packages}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{c.chooseLead}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 rounded-xl bg-secondary p-1 lg:max-w-xl" role="tablist">
        <Button type="button" variant={type === "standard" ? "default" : "ghost"} role="tab" aria-selected={type === "standard"} onClick={() => setType("standard")} className="min-w-0 text-xs uppercase">{c.standard} · {standard.length}</Button>
        <Button type="button" variant={type === "unlimited" ? "default" : "ghost"} role="tab" aria-selected={type === "unlimited"} onClick={() => setType("unlimited")} className="min-w-0 text-xs uppercase">{c.unlimited} · {unlimited.length}</Button>
      </div>
      {isLoading ? (
        <div className="mt-3 h-48 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {rows.map((p) => {
            const selected = selectedPackage?.id === p.id;
            return (
              <li key={p.id} className="min-w-0">
                <V2ProductSelectionCard service="esim" selected={selected} onSelect={() => onSelectPackage(p)} onDetails={() => setDetail(p)} detailsLabel={c.detailsLabel} className="h-24 lg:h-32">
                  <span className="flex h-full w-full flex-col items-start justify-start p-2.5 pr-9">
                   <span className="flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap font-display text-[17px] font-bold leading-6 text-foreground">
                     {p.unlimited ? (<><InfinityIcon className="size-3.5 shrink-0 text-muted-foreground" /><span>{c.unlimited}</span></>) : `${p.dataGb ?? "—"} GB`}
                    </span>
                   <span className="mt-1 text-xs font-normal leading-4 text-muted-foreground">{p.validityDays ? `${p.validityDays} ${c.days}` : ""}</span>
                   <span className="mt-2 text-base font-bold leading-5 text-primary">{p.salePrice != null ? money(p.salePrice, p.currency) : ""}</span>
                  </span>
                </V2ProductSelectionCard>
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/esim" search={{ country: "" }} className="mt-4 grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <span className="min-w-0"><strong className="block text-sm text-foreground">{c.regional}</strong><span className="block text-xs text-muted-foreground">{c.regionalLead} →</span></span><ArrowRight className="size-4 shrink-0 text-primary" />
      </Link>
      <section ref={assistantRef} aria-labelledby="decision-help-title" className="mt-6 rounded-2xl bg-[color-mix(in_oklab,var(--color-primary-soft)_70%,var(--color-card))] p-3.5 ring-1 ring-primary/10 lg:mt-12 lg:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 px-0.5">
          <Sparkles className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0"><h2 id="decision-help-title" className="font-display text-base font-bold leading-tight text-foreground">{h.title}</h2><p className="mt-0.5 text-xs leading-snug text-muted-foreground">{h.lead}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:gap-5">
          <div className="flex min-w-0 flex-col rounded-xl bg-card p-3 shadow-sm">
            <BarChart3 className="size-6 text-primary" aria-hidden />
            <strong className="mt-2 text-[13px] leading-tight text-foreground">{c.assistant}</strong>
            <span className="mt-1 flex-1 text-[11px] leading-snug text-muted-foreground">{h.assistantLead}</span>
            <Button type="button" size="sm" aria-expanded={assistantOpen} onClick={() => setAssistantOpen((open) => !open)} className="mt-2.5 h-9 w-full whitespace-normal px-2 text-[11px] leading-tight">{h.find}<ArrowRight className="size-3.5" /></Button>
          </div>
          <div className="flex min-w-0 flex-col rounded-xl bg-card p-3 shadow-sm">
            <Smartphone className="size-6 text-primary" aria-hidden />
            <strong className="mt-2 text-[13px] leading-tight text-foreground">{h.compatTitle}</strong>
            <span className="mt-1 flex-1 text-[11px] leading-snug text-muted-foreground">{h.compatLead}</span>
            <DeviceCheckSheet surface="v2-country" trigger={<Button type="button" size="sm" className="mt-2.5 h-9 w-full whitespace-normal px-2 text-[11px] leading-tight">{h.compatCta}<ArrowRight className="size-3.5" /></Button>} />
          </div>
        </div>
        {assistantOpen && <div className="mt-2 rounded-xl bg-card p-3 shadow-sm"><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><label className="text-xs font-semibold">{c.days}</label><input type="range" min="1" max="30" value={days} onChange={(event) => { setDays(Number(event.target.value)); setHasInput(true); }} className="w-full accent-primary" aria-label={c.days}/></div><p className="mt-1 text-right text-xs font-bold text-primary">{days} {c.days}</p><div className="mt-2 grid grid-cols-2 gap-2">{usageItems.map(({ key, label, icon: Icon }) => { const on = usage.includes(key); return <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => { setHasInput(true); setUsage((current) => on ? current.filter((item) => item !== key) : [...current, key]); }} className="min-w-0 justify-start text-xs"><Icon className="size-4 shrink-0"/><span className="truncate">{label}</span></Button>; })}</div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs"><span>{c.estimate}</span><strong className="text-primary">≈ {estimate.requiredGb} GB</strong>{recommended && <><span>{c.recommended}</span><Button type="button" variant="link" size="sm" onClick={() => setDetail(recommended)} className="h-auto p-0 font-bold">{recommended.unlimited ? c.unlimited : `${recommended.dataGb ?? "—"} GB`} · {money(recommended.salePrice ?? 0, recommended.currency)}</Button></>}</div></div>}
      </section>
      <div className="mt-6 rounded-2xl bg-secondary/60 px-3.5 pb-3.5 pt-0.5 ring-1 ring-border">
        <V2Installation />
      </div>
      <V2EsimPackageDetails pkg={detail} onClose={() => setDetail(null)} onAdd={(pkg) => { if (selectedPackage?.id !== pkg.id) onSelectPackage(pkg); setDetail(null); }} locale={locale} inCart={detail ? selectedPackage?.id === detail.id : false} />
      <Link to="/sepet" className="sr-only">{c.cart}</Link>
    </>
  );
}
