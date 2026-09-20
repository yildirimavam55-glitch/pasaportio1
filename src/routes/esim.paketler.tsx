import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  Globe2,
  HelpCircle,
  Info,
  Infinity as InfinityIcon,
  Leaf,
  Route as RouteIcon,
  Search,
  ShoppingCart,
  Signal,
  Wifi,
  Zap,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import {
  CheckoutPausedNote,
  ServicePausedState,
  useServiceAvailability,
} from "@/components/travel/ServiceAvailability";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { CountryMotif, getCountryCardPresentation } from "@/components/travel/CountryMotif";
import { DeviceCompatibilityInline } from "@/components/travel/DeviceCompatibility";
import { useI18n } from "@/i18n";
import { getCountryByIso } from "@/domain/geo/countries";
import { useCart } from "@/domain/cart/store";
import { buildCatalogueSections } from "@/domain/esim/catalogue-sections";
import { activationNote } from "@/domain/esim/activation";

import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";
import { customerPackageTitle, formatSalePrice } from "@/domain/esim/customer-presentation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import turkeyImage from "@/assets/destination-turkiye.jpg.asset.json";
import europeImage from "@/assets/destination-europe.jpg.asset.json";
import genericTravelImage from "@/assets/shared-travel-hero-mobile.jpg";

const searchSchema = z.object({
  destination: fallback(z.string(), "").default(""),
  route: fallback(z.string(), "").default(""),
  days: fallback(z.coerce.number().int(), 10).default(10),
  travelers: fallback(z.coerce.number().int(), 1).default(1),
  estimated: fallback(z.coerce.number(), 0).default(0),
  required: fallback(z.coerce.number(), 0).default(0),
  recommended: fallback(z.coerce.number(), 0).default(0),
  recommendedProductId: fallback(z.string(), "").default(""),
  usage: fallback(z.string(), "").default(""),
  intensity: fallback(z.string(), "NORMAL").default("NORMAL"),
});

const COPY = {
  tr: {
    title: "eSIM paketleri",
    back: "Finder’a dön",
    days: "gün",
    travelers: (count: number) => `${count} kişi`,
    estimate: "Tahmini kullanım",
    need: "Önerilen veri",
    route: "Rotan",
    change: "Değiştir",
    empty: "Bu destinasyon için şu anda uygun paket bulunamadı.",
    emptyOther: "Diğer paketleri gör",
    emptyChange: "Destinasyonu değiştir",
    add: "Sepete Ekle",
    inCart: "Sepette",
    select: "Seç",
    selected: "Seçildi",
    recommendedBadge: "Önerilen",
    validity: "gün geçerli",
    unlimited: "Sınırsız veri",
    hotspot: "Hotspot",
    fiveG: "5G",
    coverage: "ülke kapsamı",
    coverageOpen: "Kapsanan ülkeleri gör",
    coverageTitle: "Kapsanan ülkeler",
    coverageSearch: "Ülke ara",
    routeCoverage: (covered: number, total: number) => `${covered}/${total} ülke`,
    dataOnly: "Yalnızca internet",
    topup: "Yükleme destekli",
    lead: "Seçimlerine uyan güncel paketler.",
    why: "Neden bu paket?",
    goToCart: "Sepete git",
    economyBadge: "Ekonomik",
    comfortBadge: "Rahat kullanım",
    tierNext: "Bir üst adım",
    tierComfort: "Rahat kullanım",
    tierHeavy: "Yoğun kullanım",
    tierUnlimited: "Sınırsız",
    standardPackages: "Standart paketler",
    moreUnlimited: "Sınırsız seçenekler",
    choosePlan: "Tarifeni seç",
    standardTab: "Standart",
    unlimitedTab: "Sınırsız",
    quantity: "Kaç eSIM?",
    widerUnlimited: "Diğer bölgelerde sınırsız",
    widerUnlimitedLead: "Daha geniş kapsamlı sınırsız alternatifler",
    noLocalUnlimited: "Bu ülkeye özel sınırsız paket bulunamadı.",
    fitsTrip: "Bu seyahate uygun",
    instant: "Anında teslim",
    noRoaming: "Roaming yok",
    showAllPackages: (count: number) => `Tüm standart paketleri gör (${count})`,
    showFewerPackages: "Daha az paket göster",

    widerCoverage: "Daha fazla ülke kapsayan paketler",
    standardLead: "Bu destinasyon için popüler veri paketleri",
    unlimitedLead: "Kesintisiz bağlantı seçenekleri",
    widerLead: "Tek paketle daha fazlasını keşfet",
    fast: "Yüksek hız",
    easy: "Kolay kurulum",
    flexible: "Esnek kullanım",
    showMore: "Göster",
    hideMore: "Gizle",
    details: "Detaylar",
    detailsTitle: "Paket detayları",
    countryCount: (count: number) => `${count} ülke`,
    fieldDataType: "Veri tipi",
    fieldPrice: "Fiyat",
    fieldValidity: "Geçerlilik",
    fieldCoverage: "Kapsam",
    fieldActivation: "Aktivasyon",
    fieldFairUse: "Adil kullanım",
    yes: "Var",
    no: "Yok",

    perTraveler: (count: number) =>
      `Her yolcu için ayrı bir eSIM gerekir · sepete ${count} adet eklenir`,
    gapTitle: "Bu seyahat için ihtiyacını tamamen karşılayan tek paket bulunamadı.",
    gapDetail:
      "Aşağıdaki gerçek katalog seçenekleri ihtiyacının altında kalıyor; süreyi ya da destinasyonu değiştirebilirsin.",
    scopeRegional: "Bu destinasyon bölgesel paket kapsamında.",
    scopeGlobal: "Bu destinasyon Global paket kapsamında.",
    assistant: "Hangi pakete ihtiyacın olduğunu bilmiyor musun? Paket yardımcısını kullan →",
    assistant: "Du weißt nicht, welches Paket passt? Paket-Assistent öffnen →",
    assistant: "Not sure which package you need? Use the package assistant →",
    whyText: (need: number, size: string) =>
      `Yaklaşık ${need} GB ihtiyacın için mevcut paketler arasındaki en yakın uygun seçenek: ${size}.`,
  },
  de: {
    title: "eSIM-Pakete",
    back: "Zurück zum Finder",
    days: "Tage",
    travelers: (count: number) => (count === 1 ? "1 Person" : `${count} Personen`),
    estimate: "Geschätzter Verbrauch",
    need: "Empfohlenes Datenvolumen",
    route: "Deine Route",
    change: "Ändern",
    empty: "Für diese Reise ist derzeit kein passendes Paket verfügbar.",
    emptyOther: "Andere Pakete ansehen",
    emptyChange: "Reiseziel ändern",
    add: "In den Warenkorb",
    inCart: "Im Warenkorb",
    select: "Auswählen",
    selected: "Ausgewählt",
    recommendedBadge: "Empfohlen",
    validity: "Tage gültig",
    unlimited: "Unbegrenzte Daten",
    hotspot: "Hotspot",
    fiveG: "5G",
    coverage: "Länder abgedeckt",
    coverageOpen: "Abgedeckte Länder",
    coverageTitle: "Abgedeckte Länder",
    coverageSearch: "Land suchen",
    routeCoverage: (covered: number, total: number) => `${covered}/${total} Länder`,
    dataOnly: "Nur Daten",
    topup: "Aufladung unterstützt",
    lead: "Aktuelle Pakete passend zu deiner Auswahl.",
    why: "Warum dieses Paket?",
    goToCart: "Zum Warenkorb",
    economyBadge: "Günstig",
    comfortBadge: "Komfort",
    tierNext: "Nächste Stufe",
    tierComfort: "Komfort",
    tierHeavy: "Intensive Nutzung",
    tierUnlimited: "Unbegrenzt",
    standardPackages: "Standard-Pakete",
    moreUnlimited: "Unbegrenzt-Optionen",
    choosePlan: "Tarif auswählen",
    standardTab: "Standard",
    unlimitedTab: "Unbegrenzt",
    quantity: "Wie viele eSIMs?",
    widerUnlimited: "Unbegrenzt in weiteren Regionen",
    widerUnlimitedLead: "Unbegrenzte Alternativen mit größerer Abdeckung",
    noLocalUnlimited: "Für dieses Land gibt es kein eigenes Unbegrenzt-Paket.",
    fitsTrip: "Passt zur Reise",
    instant: "Sofort verfügbar",
    noRoaming: "Kein Roaming",
    showAllPackages: (count: number) => `Alle Standard-Pakete anzeigen (${count})`,
    showFewerPackages: "Weniger Pakete anzeigen",

    widerCoverage: "Pakete mit mehr Ländern",
    standardLead: "Beliebte Datenpakete für dieses Reiseziel",
    unlimitedLead: "Optionen für durchgehende Verbindung",
    widerLead: "Mehr Länder mit einem Paket entdecken",
    fast: "Hohe Geschwindigkeit",
    easy: "Einfache Einrichtung",
    flexible: "Flexible Nutzung",
    showMore: "Anzeigen",
    hideMore: "Ausblenden",
    details: "Details",
    detailsTitle: "Paketdetails",
    countryCount: (count: number) => (count === 1 ? "1 Land" : `${count} Länder`),
    fieldDataType: "Datentyp",
    fieldPrice: "Preis",
    fieldValidity: "Gültigkeit",
    fieldCoverage: "Abdeckung",
    fieldActivation: "Aktivierung",
    fieldFairUse: "Fair Use",
    yes: "Ja",
    no: "Nein",

    perTraveler: (count: number) =>
      `Jede Person braucht eine eigene eSIM · ${count} Stück im Warenkorb`,
    gapTitle: "Kein einzelnes Paket deckt diese Reise vollständig ab.",
    gapDetail:
      "Die folgenden echten Katalogoptionen liegen unter deinem Bedarf; ändere Dauer oder Reiseziel.",
    scopeRegional: "Dieses Reiseziel ist von einem Regionalpaket abgedeckt.",
    scopeGlobal: "Dieses Reiseziel ist von einem Global-Paket abgedeckt.",
    whyText: (need: number, size: string) =>
      `Für deinen Bedarf von rund ${need} GB ist dies das nächstpassende verfügbare Paket: ${size}.`,
  },
  en: {
    title: "eSIM packages",
    back: "Back to finder",
    days: "days",
    travelers: (count: number) => (count === 1 ? "1 person" : `${count} people`),
    estimate: "Estimated usage",
    need: "Recommended data",
    route: "Your route",
    change: "Change",
    empty: "No suitable package is available for this trip right now.",
    emptyOther: "See other packages",
    emptyChange: "Change destination",
    add: "Add to cart",
    inCart: "In cart",
    select: "Select",
    selected: "Selected",
    recommendedBadge: "Recommended",
    validity: "days valid",
    unlimited: "Unlimited data",
    hotspot: "Hotspot",
    fiveG: "5G",
    coverage: "countries covered",
    coverageOpen: "View covered countries",
    coverageTitle: "Covered countries",
    coverageSearch: "Search countries",
    routeCoverage: (covered: number, total: number) => `${covered}/${total} countries`,
    dataOnly: "Data only",
    topup: "Top-up supported",
    lead: "Live packages matching your selection.",
    why: "Why this package?",
    goToCart: "Go to cart",
    economyBadge: "Best value",
    comfortBadge: "Comfort",
    tierNext: "Next step",
    tierComfort: "Comfort",
    tierHeavy: "Heavy use",
    tierUnlimited: "Unlimited",
    standardPackages: "Standard packages",
    moreUnlimited: "Unlimited options",
    choosePlan: "Choose your plan",
    standardTab: "Standard",
    unlimitedTab: "Unlimited",
    quantity: "How many eSIMs?",
    widerUnlimited: "Unlimited in more regions",
    widerUnlimitedLead: "Unlimited alternatives with wider coverage",
    noLocalUnlimited: "No unlimited package is available for this country.",
    fitsTrip: "Fits this trip",
    instant: "Instant delivery",
    noRoaming: "No roaming",
    showAllPackages: (count: number) => `View all standard packages (${count})`,
    showFewerPackages: "Show fewer packages",

    widerCoverage: "Packages covering more countries",
    standardLead: "Popular data packages for this destination",
    unlimitedLead: "Options for continuous connectivity",
    widerLead: "Explore more with one package",
    fast: "High speed",
    easy: "Easy setup",
    flexible: "Flexible use",
    showMore: "Show",
    hideMore: "Hide",
    details: "Details",
    detailsTitle: "Package details",
    countryCount: (count: number) => (count === 1 ? "1 country" : `${count} countries`),
    fieldDataType: "Data type",
    fieldPrice: "Price",
    fieldValidity: "Validity",
    fieldCoverage: "Coverage",
    fieldActivation: "Activation",
    fieldFairUse: "Fair use",
    yes: "Yes",
    no: "No",

    perTraveler: (count: number) =>
      `Each traveller needs their own eSIM · ${count} added to the cart`,
    gapTitle: "No single package fully covers this trip.",
    gapDetail:
      "The real catalogue options below fall short of your need; try a different duration or destination.",

    scopeRegional: "This destination is covered by a regional package.",
    scopeGlobal: "This destination is covered by a global package.",
    whyText: (need: number, size: string) =>
      `For your roughly ${need} GB need, this is the closest suitable available option: ${size}.`,
  },
} satisfies Record<Locale, Record<string, unknown>>;

export const Route = createFileRoute("/esim/paketler")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "eSIM paketleri | travely" },
      {
        name: "description",
        content: "Seyahatine uygun eSIM paketlerini karşılaştır ve sepete ekle.",
      },
      { property: "og:title", content: "eSIM paketleri | travely" },
      {
        property: "og:description",
        content: "Tahmini ihtiyacına göre mevcut kataloğdan seçilen eSIM paketleri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PackagesPage,
});

function PackagesPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const search = Route.useSearch();
  const destination = search.destination.slice(0, 2).toUpperCase();
  const destinationCountry = getCountryByIso(destination);
  const routeIsos = search.route
    .slice(0, 120)
    .split(",")
    .map((iso: string) => iso.trim().toUpperCase().slice(0, 2))
    .filter(Boolean);
  const coverageIsos = routeIsos.length ? routeIsos : destination ? [destination] : [];
  const days = Math.max(1, Math.min(365, search.days > 0 ? search.days : 10));
  const travelers = Math.max(1, Math.min(9, search.travelers));
  const required = Math.max(0, Math.min(1000, search.required));
  // Direct catalogue mode: the customer arrived from the country search without
  // answering the package assistant, so no usage summary and no recommendation.
  const directMode = required <= 0 && !search.recommendedProductId;
  const { data: packages = [], isPending } = useQuery({
    queryKey: ["esim-packages", coverageIsos.join(",")],
    queryFn: () => listEsimPackages({ data: { coverageIsos } }),
  });

  // Layer 4: the eligible catalogue is deduplicated and split into mutually
  // exclusive sections, so no product is ever rendered twice.
  const sections = buildCatalogueSections(packages, {
    requiredGb: required,
    coverageIsos,
    days,
    recommendedId: search.recommendedProductId || null,
  });
  const recommendedProduct = directMode ? null : sections.recommended;
  // In direct mode the top-tier product is a normal card inside its own tab.
  const foldedProduct = directMode ? sections.recommended : null;
  const standardList =
    foldedProduct && !foldedProduct.unlimited
      ? [foldedProduct, ...sections.standard].sort(
          (a, b) => (a.dataGb ?? 0) - (b.dataGb ?? 0) || (a.salePrice ?? 0) - (b.salePrice ?? 0),
        )
      : sections.standard;
  const unlimitedList =
    foldedProduct && foldedProduct.unlimited
      ? [foldedProduct, ...sections.unlimited].sort(
          (a, b) => (a.validityDays ?? 0) - (b.validityDays ?? 0),
        )
      : sections.unlimited;
  const recommendedLabel = recommendedProduct
    ? recommendedProduct.unlimited
      ? copy.unlimited
      : `${recommendedProduct.dataGb} GB`
    : "";
  const [selectedProductId, setSelectedProductId] = useState("");
  const [activeSegment, setActiveSegment] = useState<"standard" | "unlimited">("standard");
  const [localQuantity, setLocalQuantity] = useState(travelers);

  const { lines, addLine } = useCart();
  const availability = useServiceAvailability();
  // Every rendered product stays selectable, including the collapsed sections.
  const selectablePackages = sections.all;
  const selectableIds = selectablePackages.map((pkg) => pkg.id).join(",");
  const activeSelectedId = selectedProductId || recommendedProduct?.id || "";
  const selectedProduct = selectablePackages.find((pkg) => pkg.id === activeSelectedId) ?? null;
  const selectedInCart = Boolean(
    selectedProduct && lines.some((line) => line.productId === selectedProduct.id),
  );
  const destinationImage =
    destination === "TR"
      ? turkeyImage.url
      : destinationCountry?.region === "EUROPE"
        ? europeImage.url
        : genericTravelImage;

  useEffect(() => {
    if (!selectableIds) return;
    const ids = selectableIds.split(",");
    setSelectedProductId((current) => {
      if (ids.includes(current)) return current;
      // Direct mode waits for a real tap, so the quantity and purchase bar only
      // appear once the customer picks a package.
      if (directMode) return "";
      return recommendedProduct?.id ?? ids[0] ?? "";
    });
  }, [directMode, recommendedProduct?.id, selectableIds]);

  const addSelectedToCart = () => {
    if (!selectedProduct || selectedProduct.salePrice == null) return;
    // One eSIM per traveller: an eSIM is tied to a single device, so the data
    // requirement is per person and the cart quantity follows the party size.
    addLine({
      quantity: localQuantity,
      productId: selectedProduct.id,
      providerProductId: selectedProduct.providerProductId,
      serviceType: "ESIM",
      name: customerPackageTitle({
        locale,
        destinationIso: destination,
        routeIsos,
        coverage: selectedProduct.coverage,
      }),
      meta: selectedProduct.unlimited ? copy.unlimited : `${selectedProduct.dataGb ?? "—"} GB`,
      price: selectedProduct.salePrice,
      currency: selectedProduct.currency,
      dataGb: selectedProduct.dataGb,
      validityDays: selectedProduct.validityDays,
      coverage: selectedProduct.coverage,
      isTest: selectedProduct.isTest,
    });
  };

  if (!availability.isPending && !availability.esim.storefront) {
    return (
      <PublicShell activeService="esim">
        <ServicePausedState service="esim" />
      </PublicShell>
    );
  }

  return (
    <PublicShell activeService="esim">
      <section className="mx-auto max-w-site px-4 pb-[calc(11.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 md:pb-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3 text-primary"
          onClick={() =>
            window.history.length > 1 ? window.history.back() : window.location.assign("/esim")
          }
        >
          <ArrowLeft className="size-4" /> {copy.back}
        </Button>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
              {destination && <CountryFlag iso={destination} className="text-xl" />}
              <span className="truncate">
                {destinationCountry ? `${destinationCountry.name[locale]} eSIM` : copy.title}
              </span>
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Zap className="size-3.5 text-primary" />
                {copy.instant}
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe2 className="size-3.5 text-primary" />
                {copy.noRoaming}
              </span>
            </div>
          </div>
          <Link to="/esim">
            <Button type="button" variant="outline" size="sm">
              {copy.change}
            </Button>
          </Link>
        </div>

        {!directMode && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
              {routeIsos.length ? (
                <span className="flex min-w-0 flex-wrap items-center gap-1">
                  <RouteIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {routeIsos.map((iso) => (
                    <span key={iso} className="flex items-center gap-1">
                      <CountryFlag iso={iso} />
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {destination && <CountryFlag iso={destination} />}
                  {destinationCountry?.name[locale] ?? "—"}
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              <span>
                {days} {copy.days}
              </span>
              <span className="text-muted-foreground">·</span>
              <span>{copy.travelers(travelers)}</span>
            </div>
            {travelers > 1 && (
              <p className="mt-2 text-xs text-muted-foreground">{copy.perTraveler(travelers)}</p>
            )}
          </>
        )}

        <div className="mt-3">
          <div className="mt-0">
            <span className="block text-xs font-bold uppercase text-primary">
              {destinationCountry ? `${destinationCountry.name[locale]} · ` : ""}
              {copy.choosePlan}
            </span>
            <div
              className="mt-2 grid w-full grid-cols-2 rounded-xl bg-secondary/70 p-1"
              role="tablist"
            >
              <Button
                type="button"
                variant={activeSegment === "standard" ? "light" : "ghost"}
                className="h-11 rounded-lg text-sm font-bold uppercase shadow-none"
                onClick={() => setActiveSegment("standard")}
                role="tab"
                aria-selected={activeSegment === "standard"}
              >
                {copy.standardTab}
              </Button>
              <Button
                type="button"
                variant={activeSegment === "unlimited" ? "light" : "ghost"}
                className="h-11 rounded-lg text-sm font-bold uppercase shadow-none"
                onClick={() => setActiveSegment("unlimited")}
                role="tab"
                aria-selected={activeSegment === "unlimited"}
              >
                {copy.unlimitedTab}
              </Button>
            </div>
          </div>
        </div>

        {isPending ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div key={key} className="h-30 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : sections.all.length ? (
          <>
            <div className="mt-6" role="radiogroup" aria-label={copy.title}>
              {recommendedProduct &&
                ((activeSegment === "unlimited" && recommendedProduct.unlimited) ||
                  (activeSegment === "standard" && !recommendedProduct.unlimited)) && (
                  <RecommendedPackageCard
                    key={recommendedProduct.id}
                    pkg={recommendedProduct}
                    isSelected={activeSelectedId === recommendedProduct.id}
                    onSelect={() => setSelectedProductId(recommendedProduct.id)}
                    whyText={copy.whyText(required, recommendedLabel)}
                    destinationIso={destination}
                    routeIsos={routeIsos}
                    copy={copy}
                    imageUrl={destinationImage}
                  />
                )}
              {selectedProduct && (
                <div className="fixed inset-x-0 bottom-[4.7rem] z-40 border-t border-border/80 bg-card/98 p-3 shadow-nav backdrop-blur md:static md:mt-5 md:rounded-2xl md:border md:bg-card md:p-3 md:shadow-card">
                  <div className="mx-auto flex max-w-site items-center gap-3">
                    <div className="flex flex-1 flex-col min-w-0">
                      <div key={selectedProduct.id} className="esim-sticky-product min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {selectedProduct.unlimited
                            ? copy.unlimited
                            : `${selectedProduct.dataGb} GB`}{" "}
                          · {selectedProduct.validityDays ?? "—"} {copy.days}
                        </strong>
                        <span className="text-xs font-semibold opacity-70">
                          {formatSalePrice(
                            selectedProduct.salePrice ?? 0,
                            selectedProduct.currency,
                            locale,
                          )}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 rounded-lg bg-secondary/60 p-1"
                      aria-label={copy.quantity}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocalQuantity(Math.max(1, localQuantity - 1))}
                        className="size-8 rounded-md bg-card text-primary shadow-sm"
                        disabled={localQuantity <= 1}
                        aria-label="−"
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="min-w-6 text-center text-sm font-bold">{localQuantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocalQuantity(Math.min(9, localQuantity + 1))}
                        className="size-8 rounded-md bg-card text-primary shadow-sm"
                        disabled={localQuantity >= 9}
                        aria-label="+"
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <Button
                      variant="cta"
                      size="lg"
                      className="h-10 shrink-0 px-4 text-sm"
                      disabled={selectedInCart || selectedProduct.salePrice == null}
                      onClick={addSelectedToCart}
                    >
                      {selectedInCart ? copy.inCart : copy.add}
                    </Button>
                  </div>
                  {lines.length > 0 && (
                    <Link
                      to="/sepet"
                      className="mt-1 block text-center text-xs font-semibold text-primary"
                    >
                      {copy.goToCart}
                    </Link>
                  )}
                  {!availability.esim.checkout && (
                    <div className="hidden md:block">
                      <CheckoutPausedNote service="esim" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {activeSegment === "standard" && standardList.length > 0 && (
              <SecondaryGroup
                title={copy.standardPackages}
                subtitle={copy.standardLead}
                packages={standardList}
                variant="orb"
                activeSelectedId={activeSelectedId}
                onSelect={setSelectedProductId}
                destinationIso={destination}
                routeIsos={routeIsos}
                copy={copy}
              />
            )}
            {activeSegment === "unlimited" && unlimitedList.length > 0 && (
              <SecondaryGroup
                title={copy.moreUnlimited}
                subtitle={copy.unlimitedLead}
                packages={unlimitedList}
                variant="unlimited"
                activeSelectedId={activeSelectedId}
                onSelect={setSelectedProductId}
                destinationIso={destination}
                routeIsos={routeIsos}
                copy={copy}
                bestForTripId={sections.bestForTripId}
              />
            )}
            {activeSegment === "unlimited" && sections.broaderUnlimited.length > 0 && (
              <>
                {activeSegment === "unlimited" && unlimitedList.length === 0 && (
                  <h2 className="mt-8 px-1 font-display text-xl font-bold leading-tight">
                    {copy.moreUnlimited}
                  </h2>
                )}
                {activeSegment === "unlimited" && unlimitedList.length === 0 && (
                  <p className="mt-1 px-1 text-xs text-muted-foreground">{copy.noLocalUnlimited}</p>
                )}
                <SecondaryGroup
                  title={copy.widerUnlimited}
                  subtitle={copy.widerUnlimitedLead}
                  packages={sections.broaderUnlimited}
                  variant="unlimited"
                  activeSelectedId={activeSelectedId}
                  onSelect={setSelectedProductId}
                  destinationIso={destination}
                  routeIsos={routeIsos}
                  copy={copy}
                  level="sub"
                />
              </>
            )}

            {activeSegment === "standard" && sections.broaderCoverage.length > 0 && (
              <SecondaryGroup
                title={copy.widerCoverage}
                subtitle={copy.widerLead}
                packages={sections.broaderCoverage}
                variant="coverage"
                activeSelectedId={activeSelectedId}
                onSelect={setSelectedProductId}
                destinationIso={destination}
                routeIsos={routeIsos}
                copy={copy}
              />
            )}
          
            {directMode && (
              <div className="mt-8 px-1 text-center">
                <Link to="/esim" hash="finder">
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {copy.assistant as string}
                  </button>
                </Link>
              </div>
            )}
            <div className="mt-10 border-t border-border/60 pt-6">
              <DeviceCompatibilityInline />
            </div>
          </>
        ) : (
        ) : (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">
              {sections.counters.covering ? copy.gapTitle : copy.empty}
            </p>
            {sections.counters.covering > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">{copy.gapDetail}</p>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                to="/esim/paketler"
                search={{
                  destination: "",
                  route: "",
                  days: search.days,
                  travelers: search.travelers,
                  estimated: search.estimated,
                  required: search.required,
                  recommended: search.recommended,
                  recommendedProductId: "",
                  usage: search.usage,
                  intensity: search.intensity,
                }}
              >
                <Button variant="outline">{copy.emptyOther}</Button>
              </Link>
              <Link to="/esim">
                <Button variant="secondary">{copy.emptyChange}</Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}

function RecommendedPackageCard({
  pkg,
  isSelected,
  onSelect,
  whyText,
  destinationIso,
  routeIsos,
  copy,
  imageUrl,
}: {
  pkg: EsimPackage;
  isSelected: boolean;
  onSelect: () => void;
  whyText: string;
  destinationIso: string;
  routeIsos: string[];
  copy: (typeof COPY)["tr"];
  imageUrl: string;
}) {
  const { locale } = useI18n();
  const [showWhy, setShowWhy] = useState(false);
  const price = pkg.salePrice ?? 0;

  return (
    <article
      id={`esim-package-${pkg.id}`}
      className={`relative min-h-52 cursor-pointer overflow-hidden rounded-[1.5rem] border shadow-card transition-[border-color,box-shadow,transform] duration-250 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isSelected ? "border-primary ring-1 ring-primary" : "border-primary/30"}`}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="absolute inset-y-0 right-0 h-full w-[52%] object-cover"
      />
      <div className="absolute inset-0 bg-primary-soft/92" />
      <div className="relative flex min-h-52 flex-col p-5 sm:p-6">
        <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          {copy.recommendedBadge}
        </span>
        <strong className="mt-3 block max-w-[75%] font-display text-2xl leading-tight">
          {pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"}{" "}
          {copy.days}
        </strong>
        <div className="mt-2 flex max-w-[70%] flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-primary/80">
          <span className="flex items-center gap-1">
            <Signal className="size-4" />
            {customerPackageTitle({ locale, destinationIso, routeIsos, coverage: pkg.coverage })}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="size-4" />
            {copy.fast}
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <strong className="text-2xl">{formatSalePrice(price, pkg.currency, locale)}</strong>
          <Button
            variant={isSelected ? "secondary" : "light"}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="min-w-28 rounded-full"
            tabIndex={-1}
          >
            {isSelected && <Check />} {isSelected ? copy.selected : copy.select}
          </Button>
        </div>
      </div>
      {activationNote(pkg.activationPolicy, locale) && (
        <p className="sr-only">{activationNote(pkg.activationPolicy, locale)}</p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-3 top-3 z-10 h-8 bg-card/90 px-2.5 text-xs text-primary shadow-soft backdrop-blur"
        onClick={(event) => {
          event.stopPropagation();
          setShowWhy((open) => !open);
        }}
        aria-expanded={showWhy}
      >
        <HelpCircle />
        {copy.why}
      </Button>
      {showWhy && (
        <p className="relative z-10 border-t border-primary/15 bg-primary-soft px-5 py-3 text-xs text-muted-foreground">
          {whyText}
        </p>
      )}
    </article>
  );
}

function CoverageSheet({ isos, copy }: { isos: string[]; copy: (typeof COPY)["tr"] }) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const countries = [...new Set(isos)]
    .map((iso) => getCountryByIso(iso))
    .filter(
      (country) =>
        country &&
        country.name[locale].toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)),
    );
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="mt-2 w-fit px-0 text-primary">
          {copy.coverageOpen}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[78svh] overflow-y-auto rounded-t-2xl pb-24 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <SheetHeader>
          <SheetTitle>{copy.coverageTitle}</SheetTitle>
          <SheetDescription>
            {isos.length} {copy.coverage}
          </SheetDescription>
        </SheetHeader>
        <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.coverageSearch}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {countries.map((country) =>
            country ? (
              <li
                key={country.iso}
                className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2 text-sm"
              >
                <CountryFlag iso={country.iso} />
                <span className="truncate">{country.name[locale]}</span>
              </li>
            ) : null,
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

type RailVariant = "orb" | "unlimited" | "coverage";

/** Provider fair-use wording, verbatim; never invented. */
function fairUseText(pkg: EsimPackage): string | null {
  return pkg.fairUseNote ?? pkg.highSpeedAllowance ?? pkg.fairUsePolicy ?? null;
}

function PackageDetailsSheet({
  pkg,
  copy,
  destinationIso,
  routeIsos,
}: {
  pkg: EsimPackage;
  copy: (typeof COPY)["tr"];
  destinationIso: string;
  routeIsos: string[];
}) {
  const { locale } = useI18n();
  const coverageLabel =
    pkg.coverage.length === 1 && pkg.coverage[0]
      ? (getCountryByIso(pkg.coverage[0])?.name[locale] ?? pkg.coverage[0])
      : copy.countryCount(pkg.coverage.length);
  const rows: Array<[string, string]> = [
    [copy.fieldDataType, pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`],
    [copy.fieldPrice, formatSalePrice(pkg.salePrice ?? 0, pkg.currency, locale)],
    [copy.fieldValidity, `${pkg.validityDays ?? "—"} ${copy.days}`],
    [
      copy.fieldCoverage,
      `${customerPackageTitle({ locale, destinationIso, routeIsos, coverage: pkg.coverage })} · ${coverageLabel}`,
    ],
    [copy.fiveG, pkg.supports5g ? copy.yes : copy.no],
    [copy.hotspot, pkg.supportsHotspot ? copy.yes : copy.no],
    [copy.dataOnly, pkg.dataOnly ? copy.yes : copy.no],
    [copy.topup, pkg.topupSupported ? copy.yes : copy.no],
  ];
  const activation = activationNote(pkg.activationPolicy, locale);
  if (activation) rows.push([copy.fieldActivation, activation]);
  const fairUse = fairUseText(pkg);
  if (fairUse) rows.push([copy.fieldFairUse, fairUse]);
  if (pkg.speedAfterFairUse) rows.push([copy.fieldFairUse, pkg.speedAfterFairUse]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`${copy.detailsTitle} — ${pkg.name}`}
          className="flex size-7 items-center justify-center rounded-full bg-background/85 text-primary shadow-card"
        >
          <Info className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[78svh] overflow-y-auto rounded-t-2xl pb-24 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <SheetHeader>
          <SheetTitle>{copy.detailsTitle}</SheetTitle>
          <SheetDescription>
            {pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"}{" "}
            {copy.days}
          </SheetDescription>
        </SheetHeader>
        <dl className="mt-4 grid gap-2 text-sm">
          {rows.map(([label, value], index) => (
            <div
              key={`${label}-${index}`}
              className="flex items-start justify-between gap-4 border-b border-border/60 pb-2"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {pkg.coverage.length > 1 && (
          <p className="mt-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
            {pkg.coverage.slice(0, 24).map((iso) => (
              <span key={iso} className="rounded-full bg-secondary px-2 py-0.5">
                {getCountryByIso(iso)?.name[locale] ?? iso}
              </span>
            ))}
            {pkg.coverage.length > 24 && <span>+{pkg.coverage.length - 24}</span>}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SecondaryGroup({
  title,
  subtitle,
  packages,
  variant,
  activeSelectedId,
  onSelect,
  destinationIso,
  routeIsos,
  copy,
  level = "section",
  bestForTripId = null,
}: {
  title: string;
  subtitle: string;
  packages: EsimPackage[];
  variant: RailVariant;
  activeSelectedId: string;
  onSelect: (id: string) => void;
  destinationIso: string;
  routeIsos: string[];
  copy: (typeof COPY)["tr"];
  level?: "section" | "sub";
  bestForTripId?: string | null;
}) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressSelection = useRef(false);
  const Icon = variant === "unlimited" ? InfinityIcon : variant === "coverage" ? Globe2 : Signal;
  const isSub = level === "sub";
  const canCollapse = variant === "orb" && packages.length > 6;
  const visiblePackages = canCollapse && !expanded ? packages.slice(0, 6) : packages;

  const startPointer = (event: React.PointerEvent<HTMLElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    suppressSelection.current = false;
  };

  const trackPointer = (event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
      suppressSelection.current = true;
    }
  };

  const finishPointer = () => {
    pointerStart.current = null;
    if (suppressSelection.current) {
      window.setTimeout(() => {
        suppressSelection.current = false;
      }, 0);
    }
  };

  const selectFromCard = (event: React.MouseEvent<HTMLElement>, id: string) => {
    if (suppressSelection.current) {
      event.preventDefault();
      return;
    }
    onSelect(id);
  };

  const selectFromKeyboard = (event: React.KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(id);
  };

  return (
    <section className={isSub ? "mt-5 scroll-mt-28" : "mt-6 scroll-mt-28 sm:mt-8"}>
      <div className="flex min-w-0 items-start gap-3 px-1 py-1">
        <Icon
          className={`mt-0.5 shrink-0 text-primary ${isSub ? "size-4" : "size-6"}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          {isSub ? (
            <h3 className="font-display text-base font-bold leading-tight">{title}</h3>
          ) : (
            <h2 className="font-display text-xl font-bold leading-tight">{title}</h2>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div
        className={`esim-package-rail mt-3 ${variant === "orb" ? "is-standard" : ""} ${variant === "unlimited" ? "is-unlimited" : ""}`}
        role="radiogroup"
        aria-label={title}
      >
        {visiblePackages.map((pkg) => {
          const selected = activeSelectedId === pkg.id;
          const localCountryIso = pkg.coverage.length === 1 ? pkg.coverage[0] : undefined;
          const cardPresentation = getCountryCardPresentation(localCountryIso, pkg.coverage.length);
          return (
            <article
              key={pkg.id}
              id={`esim-package-${pkg.id}`}
              className={`esim-rail-card ${variant} ${selected ? "is-selected" : ""}`}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onPointerDown={startPointer}
              onPointerMove={trackPointer}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
              onClick={(event) => selectFromCard(event, pkg.id)}
              onKeyDown={(event) => selectFromKeyboard(event, pkg.id)}
            >
              {cardPresentation === "symbolic-single-country" && localCountryIso ? (
                <CountryMotif iso={localCountryIso} />
              ) : cardPresentation === "neutral-multi-country" ? (
                <Globe2 className="coverage-card-mark" strokeWidth={1.2} aria-hidden="true" />
              ) : null}
              <div className="relative z-10 flex h-full min-w-0 flex-col items-start text-left">
                {variant === "unlimited" && (
                  <div className="flex min-h-4 w-full items-start pr-7">
                    {pkg.id === bestForTripId && (
                      <span className="inline-flex min-h-4 items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-tight text-primary-foreground">
                        {copy.fitsTrip}
                      </span>
                    )}
                  </div>
                )}
                {variant === "unlimited" && (
                  <InfinityIcon className="mb-0.5 size-4 shrink-0 text-primary" />
                )}
                <strong className="max-w-[calc(100%-1.5rem)] font-display text-lg leading-none sm:text-xl">
                  {pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`}
                  {pkg.unlimited && fairUseText(pkg) ? "*" : ""}
                </strong>
                <span className="mt-1.5 text-xs font-semibold text-muted-foreground">
                  {pkg.validityDays ?? "—"} {copy.days}
                </span>
                <span className="mt-auto flex max-w-full items-center gap-1 text-[11px] text-muted-foreground">
                  {pkg.coverage.length === 1 && pkg.coverage[0] ? (
                    <>
                      <CountryFlag iso={pkg.coverage[0]} />
                      <span className="truncate">
                        {getCountryByIso(pkg.coverage[0])?.name[locale] ??
                          customerPackageTitle({
                            locale,
                            destinationIso,
                            routeIsos,
                            coverage: pkg.coverage,
                          })}
                      </span>
                    </>
                  ) : (
                    <>
                      <Globe2 className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{copy.countryCount(pkg.coverage.length)}</span>
                    </>
                  )}
                </span>
                <span className="mt-1.5 max-w-full text-lg font-bold leading-none">
                  {formatSalePrice(pkg.salePrice ?? 0, pkg.currency, locale)}
                </span>
                {selected && (
                  <span
                    className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div
                className="absolute right-2.5 top-2.5 z-20"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <PackageDetailsSheet
                  pkg={pkg}
                  copy={copy}
                  destinationIso={destinationIso}
                  routeIsos={routeIsos}
                />
              </div>
            </article>
          );
        })}
      </div>
      {canCollapse && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mx-auto mt-2 flex text-primary"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? copy.showFewerPackages : copy.showAllPackages(packages.length)}
        </Button>
      )}
      {variant === "orb" && (
        <div className="mt-4 flex items-center justify-center gap-5 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wifi className="size-4 text-primary" />
            {copy.fast}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="size-4 text-primary" />
            {copy.easy}
          </span>
          <span className="flex items-center gap-1">
            <Leaf className="size-4 text-primary" />
            {copy.flexible}
          </span>
        </div>
      )}
    </section>
  );
}
