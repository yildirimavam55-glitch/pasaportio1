import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BarChart3, BookOpen, Box, ChevronLeft, ChevronRight, CheckCircle2, Globe2, Infinity as InfinityIcon, MapPin, MessageCircle, Search, Share2, Smartphone, Sparkles, Video, Zap } from "lucide-react";
import { DeviceCompatibilityProductCard, HomeCompatibilityCard } from "@/components/travel/DeviceCompatibility";
import { PasaportEsimHero } from "@/components/design-v2/PasaportEsimHero";
import { CartBar, money as formatMoney, PhotoCard, PhotoRail, pick, SectionTitle, TrustRow, V2Shell, useV2StickySearch, V2StickySearchButton } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import fallbackDestinationPhoto from "@/assets/pasaport-final-coast.jpg";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getCountryByIso, REGION_LABELS, searchCountries } from "@/domain/geo/countries";
import { listEsimDestinationStartingPrices, listEsimPackages, listEsimRegionalSummaries, type EsimPackage, type EsimRegionalSummary } from "@/lib/esim-catalogue.functions";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { estimateUsageNeed, type EsimUsageSettings } from "@/domain/esim/usage-recommendation";
import { selectRecommendedPackage } from "@/domain/esim/package-matching";
import { dedupeStorefrontPackages, sortStandardPackages, sortUnlimitedPackages } from "@/domain/esim/storefront-packages";
import { COVERAGE_REGION_LABELS } from "@/domain/geo/coverage-regions";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import type { UsageKind } from "@/domain/experience/types";
import { RefundTrustNote } from "@/components/refunds/RefundTrust";
import { V2CategorizedEsimFaq } from "@/components/design-v2/V2DiscoveryContent";
import { mediaUrl, useV2Page, V2Sections, v2PageQuery } from "@/components/design-v2/V2Sections";
import { v2ItemText, v2Text, type V2Section } from "@/domain/storefront/v2";
import { V2EsimPackageDetails } from "@/components/design-v2/V2EsimPackageDetails";
import { V2ProductSelectionCard, V2SelectedProductSummary } from "@/components/design-v2/V2ProductSelection";
import { RailArrows, useRailControls } from "@/components/design-v2/HomeRailControls";
import { V2RegionCard } from "@/components/design-v2/V2RegionCard";
import { localize, translateString } from "@/i18n/overlay";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { useNearViewport } from "@/components/travel/use-near-viewport";
import { ESSENTIAL_FAIR_USE } from "@/domain/esim/fair-use";
import { homepageImageId, uniqueDestinations, uniqueRegions } from '@/domain/storefront/homepage-media';

const DISCOVERY_COPY = localize({
  tr: { title: "Bölgesel eSIM paketleri", worldwide: "Dünya çapında internet", cta: "Paketleri keşfet", previous: "Önceki bölgeler", next: "Sonraki bölgeler" },
  de: { title: "Regionale eSIM-Pakete", worldwide: "Weltweit online", cta: "Pakete entdecken", previous: "Vorherige Regionen", next: "Weitere Regionen" },
  en: { title: "Regional eSIM packages", worldwide: "Global internet", cta: "Explore packages", previous: "Previous regions", next: "Next regions" },
});

/** Public home/eSIM search: optional country + legacy `service` hint (V1 links used `/?service=lounge`). */
export const validateEsimSearch = (s: Record<string, unknown>): { country?: string; service?: "esim" | "lounge"; plan?: string } => ({
  ...(typeof s["plan"] === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(s["plan"]) ? { plan: s["plan"] } : {}),
  ...(typeof s["country"] === "string" && s["country"] ? { country: s["country"].slice(0, 2) } : {}),
  ...(s["service"] === "lounge" || s["service"] === "esim" ? { service: s["service"] } : {}),
});


const T = localize({
  tr: { h: "Yurt dışında bağlantıda kal.", q: "Hangi ülke için eSIM arıyorsun?", ph: "Ülke ara, örn. İtalya", stickyPh: "Türkiye veya başka ülke ara", picker: "Ülke seç", empty: "Eşleşen ülke bulunamadı.", setup: "Kolay kurulum", net: "Gerçek paketler", pay: "Kolay paket seçimi", benefitDelivery: "Hesabından erişim", benefitCoverage: "Geniş kapsama", support: "WhatsApp destek", popular: "Popüler eSIM ülkeleri", regionalEyebrow: "Birden fazla ülkeye mi gidiyorsun?", regionalTitle: "Bölgesel eSIM paketleri", regionalHomeLead: "Tek eSIM ile birden fazla ülkede bağlantıda kal.", multiCountry: "Çoklu ülke", worldwideBanner: "Dünya çapında sınırsız internet", upTo: "ülkeye kadar kapsama", discoverPlans: "Paketleri keşfet", from: "başlayan", day: "gün", days: "gün", select: "Sepete ekle", adding: "Ekleniyor…", added: "Sepette", cart: "Sepete git", decrease: "Azalt", increase: "Artır", detailsLabel: "Paket detayları", none: "Bu ülke için şu anda yayınlanmış paket yok.", noPrices: "Fiyatlar yakında burada.", back: "Ülkeyi değiştir", unlimited: "Sınırsız", standard: "Standart", countries: "ülke", local: "Yalnızca bu ülke", packages: "eSIM", chooseTitle: "Paketini seç", chooseLead: "Seyahatin için esnek internet paketleri.", details: "Paket detayları", data: "İnternet", validity: "Geçerlilik", coverage: "Kapsam", network: "Ağ", activation: "Aktivasyon", activationUnknown: "Kurulum bilgileri satın alma sonrası hesabında gösterilir.", fiveG: "5G desteği", regional: "Birden fazla ülkeye mi gidiyorsun?", regionalLead: "Bölgesel ve global paketleri keşfet.", assistant: "Hangi paket sana uygun?", assistantLead: "30 saniyede öneri al.", assistantOpen: "Paket yardımcısını aç", assistantClose: "Paket yardımcısını kapat", estimate: "Tahmini ihtiyaç", recommended: "Önerilen paket", usage: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"], installTitle: "eSIM kurulum rehberi", installLead: "Basit, adım adım kurulum.", installCta: "Kurulum rehberini gör", promo: "Uçuş öncesi biraz daha konfor", promoSub: "Lounge'u keşfet", vignettePromo: "Avrupa yollarına hazır ol", vignettePromoSub: "Vignette'i keşfet" },
  de: { h: "Im Ausland verbunden bleiben.", q: "Für welches Land suchst du eine eSIM?", ph: "Land suchen, z. B. Türkei", stickyPh: "Türkei oder anderes Land suchen", picker: "Land wählen", empty: "Kein passendes Land gefunden.", setup: "Einfache Einrichtung", net: "Echte Pakete", pay: "Einfache Paketwahl", benefitDelivery: "Zugriff im Konto", benefitCoverage: "Große Abdeckung", support: "WhatsApp-Support", popular: "Beliebte eSIM-Länder", regionalEyebrow: "Reist du in mehrere Länder?", regionalTitle: "Regionale eSIM-Pakete", regionalHomeLead: "Mit einer eSIM in mehreren Ländern verbunden bleiben.", multiCountry: "Mehrere Länder", worldwideBanner: "Weltweit unbegrenzt online", upTo: "Länder Abdeckung", discoverPlans: "Pakete entdecken", from: "ab", day: "Tag", days: "Tage", select: "In den Warenkorb", adding: "Wird hinzugefügt…", added: "Im Warenkorb", cart: "Zum Warenkorb", decrease: "Weniger", increase: "Mehr", detailsLabel: "Paketdetails", none: "Für dieses Land gibt es aktuell keine Pakete.", noPrices: "Preise folgen in Kürze.", back: "Land ändern", unlimited: "Unbegrenzt", standard: "Standard", countries: "Länder", local: "Nur dieses Land", packages: "eSIM", chooseTitle: "Wähle dein Paket", chooseLead: "Flexible Datenpakete für deine Reise.", details: "Paketdetails", data: "Daten", validity: "Gültigkeit", coverage: "Abdeckung", network: "Netz", activation: "Aktivierung", activationUnknown: "Einrichtungsdaten erscheinen nach dem Kauf in deinem Konto.", fiveG: "5G-Unterstützung", regional: "Reist du in mehrere Länder?", regionalLead: "Regionale und globale Pakete entdecken.", assistant: "Unsicher, welches Paket passt?", assistantLead: "Erhalte eine Empfehlung in 30 Sekunden.", assistantOpen: "Paketassistent öffnen", assistantClose: "Paketassistent schließen", estimate: "Geschätzter Bedarf", recommended: "Passendes Paket", usage: ["Messaging", "Karten", "Social Media", "Video"], installTitle: "eSIM Installationsanleitung", installLead: "Einfache Schritt-für-Schritt Anleitung.", installCta: "Installationshilfe ansehen", promo: "Mehr Komfort vor dem Abflug", promoSub: "Lounge entdecken", vignettePromo: "Bereit für Europas Straßen", vignettePromoSub: "Vignette entdecken" },
  en: { h: "Stay connected abroad.", q: "Which country do you need an eSIM for?", ph: "Search country, e.g. Italy", stickyPh: "Search Turkey or another country", picker: "Choose country", empty: "No matching country found.", setup: "Easy setup", net: "Real packages", pay: "Easy plan choice", benefitDelivery: "Account access", benefitCoverage: "Wide coverage", support: "WhatsApp support", popular: "Popular eSIM destinations", regionalEyebrow: "Travelling to multiple countries?", regionalTitle: "Regional eSIM plans", regionalHomeLead: "Stay connected across multiple countries with one eSIM.", multiCountry: "Multi-country", worldwideBanner: "Unlimited data worldwide", upTo: "countries covered", discoverPlans: "Explore plans", from: "from", day: "day", days: "days", select: "Add to cart", adding: "Adding…", added: "In cart", cart: "Go to cart", decrease: "Decrease", increase: "Increase", detailsLabel: "Plan details", none: "No published plans for this country right now.", noPrices: "Prices coming soon.", back: "Change country", unlimited: "Unlimited", standard: "Standard", countries: "countries", local: "This country only", packages: "eSIM", chooseTitle: "Choose your package", chooseLead: "Flexible data packages for your trip.", details: "Plan details", data: "Data", validity: "Validity", coverage: "Coverage", network: "Network", activation: "Activation", activationUnknown: "Setup details appear in your account after purchase.", fiveG: "5G support", regional: "Travelling to multiple countries?", regionalLead: "Discover regional and global packages.", assistant: "Not sure which package fits?", assistantLead: "Get a recommendation in 30 seconds.", assistantOpen: "Open plan assistant", assistantClose: "Close plan assistant", estimate: "Estimated need", recommended: "Matching plan", usage: ["Messaging", "Maps", "Social media", "Video"], installTitle: "eSIM installation guide", installLead: "Simple step-by-step instructions.", installCta: "View installation guide", promo: "More comfort before your flight", promoSub: "Discover Lounge", vignettePromo: "Get ready for Europe's roads", vignettePromoSub: "Discover Vignette" },
});

/**
 * Authoritative country "from" prices (Phase 2 database function). The homepage
 * loader primes this so Popular Countries renders with the first page response.
 */
export const destinationPricesQuery = queryOptions({
  queryKey: ["v2-esim-destinations"],
  queryFn: () => listEsimDestinationStartingPrices(),
  staleTime: 60_000,
});

export function EsimHomePage() {
  const { locale, uiLocale } = useI18n();
  const money = (value: number, currency: string) => formatMoney(value, currency, uiLocale);
  const c = pick(locale, T);
  const searchParams = useSearch({ strict: false }) as { country?: string; plan?: string };
  const country = String(searchParams.country ?? "").slice(0, 2).toUpperCase();
  const preselectPlan = searchParams.plan;
  const navigateRaw = useNavigate();
  const navigate = (opts: { search: { country: string } }) => navigateRaw({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, ...opts.search }) } as never);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { lines, addLine, updateQuantity, count } = useCart();
  const [selectedPackage, setSelectedPackage] = useState<EsimPackage | null>(null);
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const prices = useQuery(destinationPricesQuery);
  const priceMap = useMemo(() => new Map((prices.data ?? []).map((price) => [price.targetId, price])), [prices.data]);
  const matches = useMemo(
    () => searchCountries(query, 250, locale),
    [query, locale],
  );
  const selected = country ? getCountryByIso(country.toUpperCase()) : undefined;
  const { heroSearchRef, heroSearchVisible } = useV2StickySearch();
  const openHeroSearch = () => {
    const target = heroSearchRef.current;
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - Math.max(96, Math.round(window.innerHeight * 0.25));
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    }
    requestAnimationFrame(() => setPickerOpen(true));
  };
  const { config, media } = useV2Page("esim");
  const benefitSection = config.sections.find((section) => section.type === "BENEFIT_ROW" && section.visible);
  const reviewsSection = config.sections.find((section) => section.type === "TRUST_REVIEWS" && section.visible);
  const desktopBenefits = benefitSection?.items.filter((item) => item.visible) ?? [];
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
  const canPurchaseSelected = Boolean(selectedPackage && selectedPackage.salePrice != null && Number.isFinite(selectedPackage.salePrice) && selectedPackage.salePrice > 0);
  const addSelectedPackage = () => {
    if (!selectedPackage || selectedCartLine || !canPurchaseSelected) return;
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
    setSelectedPackage(null);
  };
  const purchaseSummary = selectedPackage ? <V2SelectedProductSummary
    key={selectedPackage.id}
    heading={SELECTED_PLAN_LABEL[locale]}
    referenceLayout
    canPurchase={canPurchaseSelected}
    facts={[
      { label: c.data, value: selectedPackage.unlimited ? c.unlimited : `${selectedPackage.dataGb ?? "—"} GB` },
      { label: c.validity, value: selectedPackage.validityDays ? `${selectedPackage.validityDays} ${c.days}` : "—" },
      { label: c.coverage, value: selectedPackage.coverage.length > 1 ? `${selectedPackage.coverage.length} ${c.countries}` : selected?.name[locale] ?? selectedIdentity.replace(/ eSIM$/, "") },
      ...(selectedPackage.networks.length ? [{ label: c.network, value: selectedPackage.networks.join(", ") }] : []),
    ]}
    title={`${selectedPackage.unlimited ? `∞ ${c.unlimited}` : `${selectedPackage.dataGb ?? "—"} GB`} · ${selectedPackage.validityDays ?? "—"} ${c.days}`}
    subtitle={selectedPackage.coverage.length > 1 ? `${selectedIdentity.replace(/ eSIM$/, "")} · ${selectedPackage.coverage.length} ${c.countries}` : selectedIdentity.replace(/ eSIM$/, "")}
    flagIso={selectedPackage.countryIso ?? selected?.iso}
    price={canPurchaseSelected ? money(selectedPackage.salePrice!, selectedPackage.currency) : "—"}
    quantity={selectedCartLine?.quantity ?? selectionQuantity}
    inCart={Boolean(selectedCartLine)}
    addLabel={c.select}
    addingLabel={c.adding}
    addedLabel={c.added}
    cartLabel={c.cart}
    decreaseLabel={c.decrease}
    increaseLabel={c.increase}
    whatsappLabel={c.support}
    onQuantityChange={(quantity) => selectedCartLine ? updateQuantity(selectedCartLine.productId, quantity) : setSelectionQuantity(quantity)}
    onAdd={addSelectedPackage}
  /> : undefined;
  return (
    <V2Shell service="esim" commerceSelection={Boolean(selectedPackage)} heroPromotion={!selected} stickySearch={!selected ? <V2StickySearchButton heroSearchVisible={heroSearchVisible} label={c.stickyPh} onOpen={() => setPickerOpen(true)} /> : undefined}>

      {selected ? (
        <>
          <CountryProductHero country={selected} name={selected.name[locale]} subtitle={c.h} changeLabel={c.back} onChange={() => setPickerOpen(true)} />
          <div className="relative z-10 -mt-8 px-2.5 lg:hidden"><div className="rounded-full shadow-panel">
            <DeviceCompatibilityProductCard />
          </div></div>
          <V2PickerSheet open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }} title={c.picker} searchLabel={c.ph} query={query} onQueryChange={setQuery} selectedId={selected.iso} emptyLabel={prices.isLoading ? "…" : c.empty} items={matches.map((item) => { const price = priceMap.get(item.iso); return { id: item.iso, label: item.name[locale], leading: <CountryFlag iso={item.iso} className="h-4 w-6 rounded-sm" />, ...(price ? { price: `${money(price.amount, price.currency)} ${c.from}` } : {}) }; })} onSelect={choose}><span /></V2PickerSheet>
          <Packages iso={selected.iso} name={selected.name[locale]} c={c} selectedPackage={selectedPackage} onSelectPackage={selectPackage} preselectId={preselectPlan} purchaseSummary={purchaseSummary} desktopAfter={<div className="mx-auto mt-6 hidden max-w-3xl lg:block"><div className="rounded-full shadow-panel"><DeviceCompatibilityProductCard /></div></div>} />
        </>
      ) : (
        <>
          <V2Sections
            config={config}
            media={media}
            onDestinationSearch={openHeroSearch}
            searchField={
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="pasaport-country-field w-full justify-start gap-3 bg-card text-sm font-normal text-muted-foreground">
                <Search className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{c.ph}</span>
                <span className="pasaport-country-arrow grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-5 rtl:rotate-180" /></span>
              </Button>
            }
            slots={{
              faq: <V2CategorizedEsimFaq />,
              hero: (section) => (
<PasaportEsimHero section={section} benefits={benefitSection} reviews={reviewsSection} image={mediaUrl(section.mediaId, media) ?? ""} tabletImage={mediaUrl(section.tabletMediaId, media)} mobileImage={section.mobileMediaId ? mediaUrl(section.mobileMediaId, media) : undefined}>
        <div ref={heroSearchRef}>
          <V2PickerSheet
            open={pickerOpen}
            autoFocusSearch
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
             <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="pasaport-country-field w-full justify-start gap-3 bg-card text-sm font-normal text-muted-foreground">
              <Search className="size-4 shrink-0" />
               <span className="min-w-0 flex-1 truncate">{v2Text(section, "placeholder", locale) || c.ph}</span>
               <span className="pasaport-country-arrow grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><ArrowRight className="size-5 rtl:rotate-180" /></span>
            </Button>
          </V2PickerSheet>
        </div>
      </PasaportEsimHero>
              ),
              destinations: (section) => <Popular c={c} section={section} onPick={choose} />,
              regions: (section) => <><RegionalDiscovery section={section} c={c} /><HomeCompatibilityCard /><TripPlannerPromo /></>,
              benefitsInDesktopHero: true,
            }}
          />
        </>
      )}
      <CartBar count={count} label={c.cart} />
    </V2Shell>
  );
}

function CountryProductHero({ country, name, subtitle, changeLabel, onChange }: { country: NonNullable<ReturnType<typeof getCountryByIso>>; name: string; subtitle: string; changeLabel: string; onChange: () => void }) {
  const { locale } = useI18n();
  const photo = countryPhotoRegistry[country.iso];
  // Legacy Lovable photo references can fail after migration. Keep an actual
  // bundled photo visible rather than rendering an empty country hero.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const imageSrc = photo?.heroImage && photo.heroImage !== failedPhoto
    ? photo.heroImage
    : fallbackDestinationPhoto;
  return (
    <section className="relative -mx-4 overflow-hidden bg-muted sm:-mx-6 sm:mt-3 sm:rounded-3xl lg:mx-0 lg:mt-4">
       <div className="relative h-[15rem] lg:h-[18rem]">
        <img src={imageSrc} alt={photo?.alt[locale] ?? name} onError={() => setFailedPhoto(imageSrc)} fetchPriority="high" decoding="async" width={960} height={540} className="absolute inset-0 size-full object-cover" style={{ objectPosition: photo ? `${photo.focalX}% ${photo.focalY}%` : "center" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)]/95 via-[var(--v2-service)]/30 to-transparent" />
        <Button type="button" variant="secondary" size="sm" onClick={onChange} className="absolute left-4 top-4 max-w-[calc(100%-6rem)] rounded-full bg-card/90 shadow-sm backdrop-blur lg:left-8 lg:top-8"><MapPin className="size-4 shrink-0 text-primary"/><span className="truncate">{REGION_LABELS[country.region][locale]}</span></Button>
        <span className="absolute right-4 top-4 grid size-14 place-items-center rounded-full bg-card/90 shadow-panel ring-1 ring-card/60 backdrop-blur lg:right-8 lg:top-8 lg:size-16"><CountryFlag iso={country.iso} label={name} className="h-8 w-11 lg:h-9 lg:w-12" /></span>
         <div className="absolute inset-x-5 bottom-10 max-w-[22rem] text-primary-foreground lg:inset-x-10 lg:bottom-8 lg:max-w-xl">
           <h1 className="font-display text-[1.9rem] font-bold leading-none lg:text-5xl">{name}<span className="mt-0.5 block text-[1.35rem] lg:mt-1 lg:text-3xl">eSIM</span></h1>
           <p className="mt-1 max-w-[18rem] text-sm font-medium leading-snug opacity-95 lg:mt-2 lg:max-w-md lg:text-lg">{subtitle}</p>
           <Button type="button" variant="link" size="sm" onClick={onChange} className="mt-1 h-auto p-0 text-primary-foreground underline-offset-4 hover:underline lg:mt-2">{changeLabel}</Button>
        </div>
      </div>
    </section>
  );
}

function Popular({ c, section, onPick }: { c: (typeof T)["tr"]; section: V2Section; onPick: (iso: string) => void }) {
  const { locale, uiLocale } = useI18n();
  const money = (value: number, currency: string) => formatMoney(value, currency, uiLocale);
  const { media } = useV2Page('esim');
  const list = uniqueDestinations(section.items.filter((item) => item.visible).flatMap((item) => { const country = getCountryByIso(item.entity); return country ? [country] : []; }));
  // Same authoritative country "from" prices as the search list: one shared request.
  const { data, isLoading } = useQuery(destinationPricesQuery);
  const popularRail = useRailControls<HTMLUListElement>([isLoading, data?.length]);
  const railCopy = DISCOVERY_COPY[locale];
  // Only countries with a real published price are shown.
  // Keep destination discovery visible while the staging catalogue is empty.
  // Supplier prices are never invented: only published price rows get an "ab/from" label.
  const destinations = list.map((country) => ({
    country,
    p: data?.find((entry) => entry.targetId === country.iso),
  }));
  return (
    <>
       <div id="popular" className="popular-country-heading grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 scroll-mt-28"><SectionTitle>{v2Text(section, "title", locale) || c.popular}</SectionTitle><Link to="/esim/ulkeler" className="flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">{uiLocale === "ar" ? "عرض الكل" : locale === "tr" ? "Tümünü gör" : locale === "de" ? "Alle ansehen" : translateString("View all")}<ArrowRight className="size-4 rtl:rotate-180" /></Link></div>
      {isLoading ? (
        <div className="h-[8.4rem] rounded-2xl bg-muted lg:h-56" aria-hidden />
      ) : destinations.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.noPrices}</p>
      ) : (
        <div className="home-rail-frame">
        <RailArrows edge={popularRail.edge} scroll={popularRail.scroll} previous={c.popular + ' · ' + railCopy.previous} next={c.popular + ' · ' + railCopy.next} />
        <PhotoRail railRef={popularRail.ref} onScroll={popularRail.update}>
          {destinations.map(({ country, p }) => (
            <PhotoCard
              key={country.iso}
              image={mediaUrl(homepageImageId(section, country.iso), media) ?? countryPhotoRegistry[country.iso]?.cardImage}
              fallbackImage={countryPhotoRegistry[country.iso]?.cardImage}
              badge={<CountryFlag iso={country.iso} className="h-4 w-6 rounded-sm shadow" />}
              title={country.name[locale]}
              price={p ? `${c.from} ${money(p.amount, p.currency)}` : undefined}
              sub={!p ? c.noPrices : undefined}
              onClick={() => onPick(country.iso)}
              showArrow
              overlay
            />
          ))}
        </PhotoRail>
        </div>
      )}
    </>
  );
}

const FEATURED_PLAN_LABEL = localize({ tr: "En Popüler", de: "Beliebt", en: "Popular" });
const SELECTED_PLAN_LABEL = localize({ tr: "Seçtiğin Paket", de: "Ausgewähltes Paket", en: "Selected package" });

const PLAN_PROMO = localize({
  tr: { title: "Seyahat planlayıcı", sub: "Ülkelerini ve tarihlerini gir, paketleri karşılaştıralım" },
  de: { title: "Reiseplaner", sub: "Länder und Daten eingeben – wir vergleichen die Pakete" },
  en: { title: "Trip planner", sub: "Enter countries and dates — we compare the packages" },
});

function TripPlannerPromo() {
  const { locale } = useI18n();
  const p = PLAN_PROMO[locale];
  return (
    <Link to="/esim/plan" className="mt-3 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 ring-1 ring-primary/10">
      <Sparkles className="size-7 shrink-0 text-primary" />
      <span className="min-w-0"><strong className="block text-sm text-foreground">{p.title}</strong><span className="block text-xs text-muted-foreground">{p.sub}</span></span>
      <ArrowRight className="size-4 shrink-0 text-primary rtl:rotate-180" />
    </Link>
  );
}

function RegionalDiscovery({ section, c }: { section: V2Section; c: (typeof T)["tr"] }) {
  const { media } = useV2Page("esim");
  const { ref, ready } = useNearViewport();
  const regionalSummaries = useQuery({ queryKey: ["v2-esim-regions"], queryFn: () => listEsimRegionalSummaries(), enabled: ready });
  const summaries = regionalSummaries.data ?? [];
  const loading = regionalSummaries.isPending;
  const { locale } = useI18n();
  const regions = uniqueRegions(summaries);
  const copy = DISCOVERY_COPY[locale];
  const rail = useRailControls<HTMLUListElement>([loading, regions.length]);
  const title = v2Text(section, "title", locale) || copy.title;
  return (
    <section ref={ref} aria-labelledby="regional-esim-title" className="home-region-section">
      <div className="regional-home-heading"><SectionTitle><span id="regional-esim-title">{title}</span></SectionTitle></div>
      {loading ? <div className="home-region-placeholder bg-muted/70" aria-hidden /> : regions.length === 0 ? (
        <div className="home-region-carousel home-rail-frame" aria-label={title}>
          <ul className="home-region-rail">
            {(["EUROPE", "ASIA", "GLOBAL"] as const).map((region) => {
              const photo = getRegionPhoto(region);
              return (
                <li key={region} className="home-region-card home-region-card-overlay relative overflow-hidden rounded-xl bg-muted" aria-label={`${COVERAGE_REGION_LABELS[region][locale]}: ${c.noPrices}`}>
                  {photo && <img src={photo.url} alt={photo.alt[locale]} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="photo-card-overlay-shade" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <h3 className="font-display text-base font-bold">{COVERAGE_REGION_LABELS[region][locale]}</h3>
                    <p className="text-xs opacity-90">{c.noPrices}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="home-region-carousel home-rail-frame">
          <RailArrows edge={rail.edge} scroll={rail.scroll} previous={copy.previous} next={copy.next} />
          <ul ref={rail.ref} onScroll={rail.update} className="home-region-rail" aria-label={title}>
             {regions.map((item) => <li data-reveal-card key={item.region}><V2RegionCard item={item} imageUrl={mediaUrl(homepageImageId(section, item.region), media)} countries={c.countries} multi={c.multiCountry} from={c.from} compact /></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

// Price deliberately excluded: truly equivalent options collapse to the cheaper one.
const HELP = localize({
  tr: { title: "Karar vermene yardımcı olalım", lead: "Doğru paketi seç ve telefonunun uyumluluğunu kontrol et.", assistantLead: "Kullanımına göre paket önerisi al.", find: "Paketimi bul", compatTitle: "Telefonum eSIM uyumlu mu?", compatLead: "Cihazını birkaç saniyede kontrol et.", compatCta: "Uyumluluğu kontrol et" },
  de: { title: "Wir helfen dir bei der Wahl", lead: "Wähle das passende Paket und prüfe, ob dein Handy kompatibel ist.", assistantLead: "Erhalte eine Empfehlung nach deiner Nutzung.", find: "Mein Paket finden", compatTitle: "Ist mein Handy eSIM-fähig?", compatLead: "Prüfe dein Gerät in wenigen Sekunden.", compatCta: "Kompatibilität prüfen" },
  en: { title: "Let us help you decide", lead: "Pick the right plan and check your phone's compatibility.", assistantLead: "Get a plan suggestion based on your usage.", find: "Find my plan", compatTitle: "Is my phone eSIM compatible?", compatLead: "Check your device in seconds.", compatCta: "Check compatibility" },
});

function Packages({ iso, name, c, selectedPackage, onSelectPackage, desktopAfter, preselectId, purchaseSummary }: { preselectId?: string | undefined; desktopAfter?: ReactNode; purchaseSummary?: ReactNode; iso: string; name: string; c: (typeof T)["tr"]; selectedPackage: EsimPackage | null; onSelectPackage: (pkg: EsimPackage) => void }) {
  const { locale, uiLocale } = useI18n();
  const money = (value: number, currency: string) => formatMoney(value, currency, uiLocale);
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
  // "Buy again": highlight the same plan only if it is still listed; never adds to cart.
  const preselectDone = useRef(false);
  useEffect(() => {
    if (preselectDone.current || !preselectId || isLoading) return;
    preselectDone.current = true;
    const match = countryPackages.find((pkg) => pkg.id === preselectId);
    if (!match || selectedPackage) return;
    setType(match.unlimited ? "unlimited" : "standard");
    onSelectPackage(match);
  }, [preselectId, isLoading, countryPackages, selectedPackage, onSelectPackage]);
  const recommended = hasInput ? selectRecommendedPackage(countryPackages, { coverageIsos: [iso], days, requiredGb: estimate.requiredGb }) : null;
  const usageItems: Array<{ key: UsageKind; label: string; icon: typeof MessageCircle }> = [
    { key: "MESSAGING", label: c.usage[0] ?? "", icon: MessageCircle }, { key: "MAPS", label: c.usage[1] ?? "", icon: MapPin },
    { key: "SOCIAL", label: c.usage[2] ?? "", icon: Share2 }, { key: "VIDEO", label: c.usage[3] ?? "", icon: Video },
  ];
  return (
    <>
       <div className="lg:hidden"><TrustRow compact items={[{ icon: <Zap />, label: c.setup }, { icon: <CheckCircle2 />, label: c.net }, { icon: <Box />, label: c.benefitDelivery }, { icon: <MessageCircle />, label: c.support }]} /></div>
       <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.44fr)] lg:gap-5">
         <div className="min-w-0 rounded-2xl border border-border/65 bg-card/35 p-3 sm:p-4 lg:p-5">
       <div className="grid grid-cols-2 rounded-2xl bg-secondary p-1" role="tablist">
        <Button type="button" variant={type === "standard" ? "default" : "ghost"} role="tab" aria-selected={type === "standard"} onClick={() => setType("standard")} className="min-w-0 rounded-xl text-xs uppercase sm:text-sm">{c.standard} · {standard.length}</Button>
        <Button type="button" variant={type === "unlimited" ? "default" : "ghost"} role="tab" aria-selected={type === "unlimited"} onClick={() => setType("unlimited")} className="min-w-0 rounded-xl text-xs uppercase sm:text-sm">{c.unlimited} · {unlimited.length}</Button>
      </div>
       <div className="mt-3 lg:mt-4">
        <h2 className="font-display text-2xl font-bold text-foreground lg:text-3xl">{c.chooseTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.chooseLead}</p>
      </div>
      {isLoading ? (
        <div className="mt-3 h-48 animate-pulse rounded-2xl bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2" aria-label={c.chooseTitle}>
          {rows.map((p) => {
            const selected = selectedPackage?.id === p.id;
            return (
              <li key={p.id} className="min-w-0">
                <V2ProductSelectionCard service="esim" selected={selected} showSelectedCheck={false} onSelect={() => onSelectPackage(p)} onDetails={() => setDetail(p)} detailsLabel={c.detailsLabel} className="min-h-[4.5rem]">
                  <span className="grid min-h-[4.5rem] w-full grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2.5 pr-11 sm:gap-x-4 sm:px-4 sm:pr-12">
                    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-muted-foreground/60"}`}>
                      {selected && <span className="size-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 text-left">
                      <span className="flex min-w-0 items-center gap-1 font-display text-base font-bold leading-5 text-foreground sm:text-lg">
                        {p.unlimited ? <><InfinityIcon className="size-4 shrink-0" /><span className="truncate">{c.unlimited}</span></> : <span>{p.dataGb ?? "—"} GB</span>}
                      </span>
                      {p.featured && <span className="w-fit rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-3 text-primary">{FEATURED_PLAN_LABEL[locale]}</span>}
                      {p.unlimited && p.planTier === "ESSENTIAL" && <span className="max-w-full truncate text-[10px] leading-3 text-muted-foreground">{ESSENTIAL_FAIR_USE[locale].short}</span>}
                    </span>
                    <span className="min-w-0 text-left text-[11px] leading-4 text-muted-foreground sm:text-sm">
                      {p.validityDays ? `${p.validityDays} ${c.days}` : ""}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right font-display text-sm font-bold text-primary sm:text-lg">
                      {p.salePrice != null ? money(p.salePrice, p.currency) : "—"}
                    </span>
                  </span>
                </V2ProductSelectionCard>
              </li>
            );
          })}
        </ul>
      )}
         </div>
         {purchaseSummary && <aside className="min-w-0 lg:sticky lg:top-24" aria-label={c.chooseTitle}>{purchaseSummary}</aside>}
       </div>
      {desktopAfter}
      <div className="mt-6 hidden lg:block"><TrustRow compact items={[{ icon: <Zap />, label: c.setup }, { icon: <CheckCircle2 />, label: c.net }, { icon: <Box />, label: c.benefitDelivery }, { icon: <MessageCircle />, label: c.support }]} /></div>
      <RefundTrustNote />
       <Link to="/esim/bolge" className="mt-5 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 ring-1 ring-primary/10">
        <Globe2 className="size-7 shrink-0 text-primary"/><span className="min-w-0"><strong className="block text-sm text-foreground">{c.regional}</strong><span className="block text-xs text-muted-foreground">{c.regionalLead}</span></span><ArrowRight className="size-4 shrink-0 text-primary" />
      </Link>
      <section ref={assistantRef} aria-labelledby="decision-help-title" className="mt-2 rounded-xl bg-card ring-1 ring-border">
        <Button type="button" variant="ghost" aria-expanded={assistantOpen} onClick={() => setAssistantOpen((open) => !open)} className="grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 whitespace-normal px-4 py-3 text-left">
          <Sparkles className="size-7 shrink-0 text-primary" aria-hidden /><span className="min-w-0"><strong id="decision-help-title" className="block text-sm text-foreground">{c.assistant}</strong><span className="block text-xs font-normal text-muted-foreground">{c.assistantLead}</span></span><ArrowRight className={`size-4 shrink-0 text-primary transition-transform ${assistantOpen ? "rotate-90" : ""}`}/>
        </Button>
        {assistantOpen && <div className="mt-2 rounded-xl bg-card p-3 shadow-sm"><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><label className="text-xs font-semibold">{c.days}</label><input type="range" min="1" max="30" value={days} onChange={(event) => { setDays(Number(event.target.value)); setHasInput(true); }} className="w-full accent-primary" aria-label={c.days}/></div><p className="mt-1 text-right text-xs font-bold text-primary">{days} {c.days}</p><div className="mt-2 grid grid-cols-2 gap-2">{usageItems.map(({ key, label, icon: Icon }) => { const on = usage.includes(key); return <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on} onClick={() => { setHasInput(true); setUsage((current) => on ? current.filter((item) => item !== key) : [...current, key]); }} className="min-w-0 justify-start text-xs"><Icon className="size-4 shrink-0"/><span className="truncate">{label}</span></Button>; })}</div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs"><span>{c.estimate}</span><strong className="text-primary">≈ {estimate.requiredGb} GB</strong>{recommended && <><span>{c.recommended}</span><Button type="button" variant="link" size="sm" onClick={() => setDetail(recommended)} className="h-auto p-0 font-bold">{recommended.unlimited ? c.unlimited : `${recommended.dataGb ?? "—"} GB`} · {money(recommended.salePrice ?? 0, recommended.currency)}</Button></>}</div></div>}
      </section>
      <Link to="/esim/kurulum" search={{}} className="mt-2 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-border"><BookOpen className="size-7 shrink-0 text-primary"/><span className="min-w-0"><strong className="block text-sm text-foreground">{c.installTitle}</strong><span className="block text-xs text-muted-foreground">{c.installLead}</span></span><ArrowRight className="size-4 shrink-0 text-primary"/></Link>
       <div className="mb-6 mt-6"><V2CategorizedEsimFaq /></div>
      <V2EsimPackageDetails pkg={detail} onClose={() => setDetail(null)} onAdd={(pkg) => { if (selectedPackage?.id !== pkg.id) onSelectPackage(pkg); setDetail(null); }} locale={locale} inCart={detail ? selectedPackage?.id === detail.id : false} />
      <Link to="/sepet" className="sr-only">{c.cart}</Link>
    </>
  );
}
