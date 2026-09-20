import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, Check, Globe2, HelpCircle, Infinity as InfinityIcon, Leaf, Route as RouteIcon, Search, ShoppingCart, Signal, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { CheckoutPausedNote, ServicePausedState, useServiceAvailability } from "@/components/travel/ServiceAvailability";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { DeviceCompatibilityInline } from "@/components/travel/DeviceCompatibility";
import { useI18n } from "@/i18n";
import { getCountryByIso } from "@/domain/geo/countries";
import { useCart } from "@/domain/cart/store";
import { buildCatalogueSections } from "@/domain/esim/catalogue-sections";
import { coverageScopeOf } from "@/domain/esim/package-matching";
import { activationNote } from "@/domain/esim/activation";

import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";
import { customerPackageTitle, formatSalePrice } from "@/domain/esim/customer-presentation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    title: "eSIM paketleri", back: "Finder’a dön", days: "gün", travelers: (count: number) => `${count} kişi`,
    estimate: "Tahmini kullanım", need: "Önerilen veri", route: "Rotan", change: "Değiştir",
    empty: "Bu destinasyon için şu anda uygun paket bulunamadı.",
    emptyOther: "Diğer paketleri gör", emptyChange: "Destinasyonu değiştir",
    add: "Sepete Ekle", inCart: "Sepette", select: "Seç", selected: "Seçildi",
    recommendedBadge: "Önerilen", validity: "gün geçerli", unlimited: "Sınırsız veri",
    hotspot: "Hotspot", fiveG: "5G", coverage: "ülke kapsamı",
    coverageOpen: "Kapsanan ülkeleri gör", coverageTitle: "Kapsanan ülkeler", coverageSearch: "Ülke ara", routeCoverage: (covered: number, total: number) => `${covered}/${total} ülke`, dataOnly: "Yalnızca internet", topup: "Yükleme destekli",
    lead: "Seçimlerine uyan güncel paketler.",
    why: "Neden bu paket?", goToCart: "Sepete git",
    economyBadge: "Ekonomik", comfortBadge: "Rahat kullanım",
    tierNext: "Bir üst adım", tierComfort: "Rahat kullanım", tierHeavy: "Yoğun kullanım", tierUnlimited: "Sınırsız",
    standardPackages: "Standart paketler", moreUnlimited: "Sınırsız seçenekler", widerCoverage: "Daha fazla ülke kapsayan paketler",
    standardLead: "Bu destinasyon için popüler veri paketleri", unlimitedLead: "Kesintisiz bağlantı seçenekleri", widerLead: "Tek paketle daha fazlasını keşfet",
    fast: "Yüksek hız", easy: "Kolay kurulum", flexible: "Esnek kullanım",
    showMore: "Göster", hideMore: "Gizle",
    perTraveler: (count: number) => `Her yolcu için ayrı bir eSIM gerekir · sepete ${count} adet eklenir`,
    gapTitle: "Bu seyahat için ihtiyacını tamamen karşılayan tek paket bulunamadı.",
    gapDetail: "Aşağıdaki gerçek katalog seçenekleri ihtiyacının altında kalıyor; süreyi ya da destinasyonu değiştirebilirsin.",
    scopeRegional: "Bu destinasyon bölgesel paket kapsamında.",
    scopeGlobal: "Bu destinasyon Global paket kapsamında.",
    whyText: (need: number, size: string) => `Yaklaşık ${need} GB ihtiyacın için mevcut paketler arasındaki en yakın uygun seçenek: ${size}.`,
  },
  de: {
    title: "eSIM-Pakete", back: "Zurück zum Finder", days: "Tage", travelers: (count: number) => count === 1 ? "1 Person" : `${count} Personen`,
    estimate: "Geschätzter Verbrauch", need: "Empfohlenes Datenvolumen", route: "Deine Route", change: "Ändern",
    empty: "Für diese Reise ist derzeit kein passendes Paket verfügbar.",
    emptyOther: "Andere Pakete ansehen", emptyChange: "Reiseziel ändern",
    add: "In den Warenkorb", inCart: "Im Warenkorb", select: "Auswählen", selected: "Ausgewählt",
    recommendedBadge: "Empfohlen", validity: "Tage gültig", unlimited: "Unbegrenzte Daten",
    hotspot: "Hotspot", fiveG: "5G", coverage: "Länder abgedeckt",
    coverageOpen: "Abgedeckte Länder", coverageTitle: "Abgedeckte Länder", coverageSearch: "Land suchen", routeCoverage: (covered: number, total: number) => `${covered}/${total} Länder`, dataOnly: "Nur Daten", topup: "Aufladung unterstützt",
    lead: "Aktuelle Pakete passend zu deiner Auswahl.",
    why: "Warum dieses Paket?", goToCart: "Zum Warenkorb",
    economyBadge: "Günstig", comfortBadge: "Komfort",
    tierNext: "Nächste Stufe", tierComfort: "Komfort", tierHeavy: "Intensive Nutzung", tierUnlimited: "Unbegrenzt",
    standardPackages: "Standard-Pakete", moreUnlimited: "Unbegrenzt-Optionen", widerCoverage: "Pakete mit mehr Ländern",
    standardLead: "Beliebte Datenpakete für dieses Reiseziel", unlimitedLead: "Optionen für durchgehende Verbindung", widerLead: "Mehr Länder mit einem Paket entdecken",
    fast: "Hohe Geschwindigkeit", easy: "Einfache Einrichtung", flexible: "Flexible Nutzung",
    showMore: "Anzeigen", hideMore: "Ausblenden",
    perTraveler: (count: number) => `Jede Person braucht eine eigene eSIM · ${count} Stück im Warenkorb`,
    gapTitle: "Kein einzelnes Paket deckt diese Reise vollständig ab.",
    gapDetail: "Die folgenden echten Katalogoptionen liegen unter deinem Bedarf; ändere Dauer oder Reiseziel.",
    scopeRegional: "Dieses Reiseziel ist von einem Regionalpaket abgedeckt.",
    scopeGlobal: "Dieses Reiseziel ist von einem Global-Paket abgedeckt.",
    whyText: (need: number, size: string) => `Für deinen Bedarf von rund ${need} GB ist dies das nächstpassende verfügbare Paket: ${size}.`,
  },
  en: {
    title: "eSIM packages", back: "Back to finder", days: "days", travelers: (count: number) => count === 1 ? "1 person" : `${count} people`,
    estimate: "Estimated usage", need: "Recommended data", route: "Your route", change: "Change",
    empty: "No suitable package is available for this trip right now.",
    emptyOther: "See other packages", emptyChange: "Change destination",
    add: "Add to cart", inCart: "In cart", select: "Select", selected: "Selected",
    recommendedBadge: "Recommended", validity: "days valid", unlimited: "Unlimited data",
    hotspot: "Hotspot", fiveG: "5G", coverage: "countries covered",
    coverageOpen: "View covered countries", coverageTitle: "Covered countries", coverageSearch: "Search countries", routeCoverage: (covered: number, total: number) => `${covered}/${total} countries`, dataOnly: "Data only", topup: "Top-up supported",
    lead: "Live packages matching your selection.",
    why: "Why this package?", goToCart: "Go to cart",
    economyBadge: "Best value", comfortBadge: "Comfort",
    tierNext: "Next step", tierComfort: "Comfort", tierHeavy: "Heavy use", tierUnlimited: "Unlimited",
    standardPackages: "Standard packages", moreUnlimited: "Unlimited options", widerCoverage: "Packages covering more countries",
    standardLead: "Popular data packages for this destination", unlimitedLead: "Options for continuous connectivity", widerLead: "Explore more with one package",
    fast: "High speed", easy: "Easy setup", flexible: "Flexible use",
    showMore: "Show", hideMore: "Hide",
    perTraveler: (count: number) => `Each traveller needs their own eSIM · ${count} added to the cart`,
    gapTitle: "No single package fully covers this trip.",
    gapDetail: "The real catalogue options below fall short of your need; try a different duration or destination.",

    scopeRegional: "This destination is covered by a regional package.",
    scopeGlobal: "This destination is covered by a global package.",
    whyText: (need: number, size: string) => `For your roughly ${need} GB need, this is the closest suitable available option: ${size}.`,
  },
} satisfies Record<Locale, Record<string, unknown>>;

export const Route = createFileRoute("/esim/paketler")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "eSIM paketleri | travely" },
      { name: "description", content: "Seyahatine uygun eSIM paketlerini karşılaştır ve sepete ekle." },
      { property: "og:title", content: "eSIM paketleri | travely" },
      { property: "og:description", content: "Tahmini ihtiyacına göre mevcut kataloğdan seçilen eSIM paketleri." },
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
  const routeIsos = search.route.slice(0, 120).split(",").map((iso: string) => iso.trim().toUpperCase().slice(0, 2)).filter(Boolean);
  const coverageIsos = routeIsos.length ? routeIsos : destination ? [destination] : [];
  const days = Math.max(1, Math.min(365, search.days));
  const travelers = Math.max(1, Math.min(9, search.travelers));
  const required = Math.max(0, Math.min(1000, search.required));
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
  const recommendedProduct = sections.recommended;
  const recommendedScope = recommendedProduct ? coverageScopeOf(recommendedProduct) : null;
  const scopeNote = recommendedScope === "REGION" ? copy.scopeRegional : recommendedScope === "GLOBAL" ? copy.scopeGlobal : "";
  const recommendedLabel = recommendedProduct ? (recommendedProduct.unlimited ? copy.unlimited : `${recommendedProduct.dataGb} GB`) : "";
  const [selectedProductId, setSelectedProductId] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);
  const { lines, addLine } = useCart();
  const availability = useServiceAvailability();
  // Every rendered product stays selectable, including the collapsed sections.
  const selectablePackages = sections.all;
  const selectableIds = selectablePackages.map((pkg) => pkg.id).join(",");
  const activeSelectedId = selectedProductId || recommendedProduct?.id || "";
  const selectedProduct = selectablePackages.find((pkg) => pkg.id === activeSelectedId) ?? null;
  const selectedInCart = Boolean(selectedProduct && lines.some((line) => line.productId === selectedProduct.id));
  const destinationImage = destination === "TR" ? turkeyImage.url : destinationCountry?.region === "EUROPE" ? europeImage.url : genericTravelImage;

  useEffect(() => {
    if (!selectableIds) return;
    const ids = selectableIds.split(",");
    setSelectedProductId((current) => (ids.includes(current) ? current : ids[0] ?? ""));
  }, [selectableIds]);

  const addSelectedToCart = () => {
    if (!selectedProduct || selectedProduct.salePrice == null) return;
    // One eSIM per traveller: an eSIM is tied to a single device, so the data
    // requirement is per person and the cart quantity follows the party size.
    addLine({ quantity: travelers, productId: selectedProduct.id, providerProductId: selectedProduct.providerProductId, serviceType: "ESIM", name: customerPackageTitle({ locale, destinationIso: destination, routeIsos, coverage: selectedProduct.coverage }), meta: selectedProduct.unlimited ? copy.unlimited : `${selectedProduct.dataGb ?? "—"} GB`, price: selectedProduct.salePrice, currency: selectedProduct.currency, dataGb: selectedProduct.dataGb, validityDays: selectedProduct.validityDays, coverage: selectedProduct.coverage, isTest: selectedProduct.isTest });

  };

  useEffect(() => {
    if (!recommendedProduct || hasScrolled) return;
    setHasScrolled(true);
    requestAnimationFrame(() => document.getElementById(`esim-package-${recommendedProduct.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [hasScrolled, recommendedProduct]);

  if (!availability.isPending && !availability.esim.storefront) {
    return <PublicShell activeService="esim"><ServicePausedState service="esim" /></PublicShell>;
  }

  return (
    <PublicShell activeService="esim">
      <section className="mx-auto max-w-site px-4 py-5 sm:px-6 sm:py-7">
        <Button type="button" variant="ghost" size="sm" className="-ml-3 text-primary" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign("/esim")}>
          <ArrowLeft className="size-4" /> {copy.back}
        </Button>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
              {destination && <CountryFlag iso={destination} className="text-xl" />}
              <span className="truncate">{destinationCountry?.name[locale] ?? copy.title}</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{copy.lead}</p>
          </div>
          <Link to="/esim"><Button type="button" variant="outline" size="sm">{copy.change}</Button></Link>
        </div>

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
            <span>{days} {copy.days}</span>
            <span className="text-muted-foreground">·</span>
            <span>{copy.travelers(travelers)}</span>
        </div>
        {travelers > 1 && <p className="mt-2 text-xs text-muted-foreground">{copy.perTraveler(travelers)}</p>}

        <div className="mt-3">
          <DeviceCompatibilityInline />
        </div>

        {isPending ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => <div key={key} className="h-44 animate-pulse rounded-card bg-secondary" />)}
          </div>
        ) : sections.all.length ? (
          <>
          <div className="mt-5 pb-28 sm:pb-0" role="radiogroup" aria-label={copy.title}>
            {recommendedProduct && (
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
              <div className="fixed inset-x-0 bottom-[4.7rem] z-40 border-t border-border bg-background/98 p-3 shadow-nav backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <div className="mx-auto flex max-w-site items-center gap-3">
                  <div className="min-w-0 flex-1"><strong className="block truncate">{selectedProduct.unlimited ? copy.unlimited : `${selectedProduct.dataGb} GB`} · {selectedProduct.validityDays ?? "—"} {copy.days}</strong><span className="text-sm font-semibold">{formatSalePrice(selectedProduct.salePrice ?? 0, selectedProduct.currency, locale)}</span></div>
                  <Button variant="cta" size="lg" className="shrink-0" disabled={selectedInCart || selectedProduct.salePrice == null} onClick={addSelectedToCart}>
                    <ShoppingCart /> {selectedInCart ? copy.inCart : copy.add}
                  </Button>
                </div>
                {lines.length > 0 && (
                  <Link to="/sepet" className="mt-1 block text-center text-xs font-semibold text-primary">{copy.goToCart}</Link>
                )}
                {!availability.esim.checkout && <div className="hidden md:block"><CheckoutPausedNote service="esim" /></div>}
              </div>
            )}
          </div>
          {sections.standard.length > 0 && (
            <SecondaryGroup
              title={copy.standardPackages}
              subtitle={copy.standardLead}
              packages={sections.standard}
              variant="orb"
              activeSelectedId={activeSelectedId}
              onSelect={setSelectedProductId}
              destinationIso={destination}
              routeIsos={routeIsos}
              copy={copy}
              imageUrl={destinationImage}
            />
          )}
          {sections.unlimited.length > 0 && (
            <SecondaryGroup
              title={copy.moreUnlimited}
              subtitle={copy.unlimitedLead}
              packages={sections.unlimited}
              variant="unlimited"
              activeSelectedId={activeSelectedId}
              onSelect={setSelectedProductId}
              destinationIso={destination}
              routeIsos={routeIsos}
              copy={copy}
              imageUrl={destinationImage}
            />
          )}
          {sections.broaderCoverage.length > 0 && (
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
              imageUrl={destinationImage}
            />
          )}
          </>
        ) : (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">{sections.counters.covering ? copy.gapTitle : copy.empty}</p>
            {sections.counters.covering > 0 && <p className="mt-2 text-xs text-muted-foreground">{copy.gapDetail}</p>}

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/esim/paketler" search={{ destination: "", route: "", days: search.days, travelers: search.travelers, estimated: search.estimated, required: search.required, recommended: search.recommended, recommendedProductId: "", usage: search.usage, intensity: search.intensity }}>
                <Button variant="outline">{copy.emptyOther}</Button>
              </Link>
              <Link to="/esim"><Button variant="secondary">{copy.emptyChange}</Button></Link>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}

function RecommendedPackageCard({ pkg, isSelected, onSelect, whyText, destinationIso, routeIsos, copy, imageUrl }: { pkg: EsimPackage; isSelected: boolean; onSelect: () => void; whyText: string; destinationIso: string; routeIsos: string[]; copy: (typeof COPY)["tr"]; imageUrl: string }) {
  const { locale } = useI18n();
  const [showWhy, setShowWhy] = useState(false);
  const price = pkg.salePrice ?? 0;


  return (
    <article id={`esim-package-${pkg.id}`} className={`relative min-h-52 overflow-hidden rounded-card border shadow-card ${isSelected ? "border-primary ring-1 ring-primary" : "border-primary/40"}`}>
      <img src={imageUrl} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-[58%] object-cover" />
      <div className="absolute inset-0 bg-primary-soft/88" />
      <div className="relative flex min-h-52 flex-col p-5 sm:p-6">
        <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{copy.recommendedBadge}</span>
        <strong className="mt-3 block font-display text-2xl">{pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"} {copy.days}</strong>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-primary/80">
          <span className="flex items-center gap-1"><Signal className="size-4" />{customerPackageTitle({ locale, destinationIso, routeIsos, coverage: pkg.coverage })}</span>
          <span className="flex items-center gap-1"><Zap className="size-4" />{copy.fast}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <strong className="text-2xl">{formatSalePrice(price, pkg.currency, locale)}</strong>
          <Button variant={isSelected ? "secondary" : "light"} onClick={onSelect} role="radio" aria-checked={isSelected} className="min-w-28 rounded-full">
            {isSelected && <Check />} {isSelected ? copy.selected : copy.select}
          </Button>
        </div>
      </div>
      {activationNote(pkg.activationPolicy, locale) && (
        <p className="sr-only">{activationNote(pkg.activationPolicy, locale)}</p>
      )}
      <Button type="button" variant="ghost" size="sm" className="absolute bottom-1 left-3 z-10 h-7 px-2 text-xs text-primary" onClick={() => setShowWhy((open) => !open)} aria-expanded={showWhy}><HelpCircle />{copy.why}</Button>
      {showWhy && <p className="relative z-10 border-t border-primary/15 bg-primary-soft px-5 py-3 text-xs text-muted-foreground">{whyText}</p>}
    </article>
  );
}

function CoverageSheet({ isos, copy }: { isos: string[]; copy: (typeof COPY)["tr"] }) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const countries = [...new Set(isos)].map((iso) => getCountryByIso(iso)).filter((country) => country && country.name[locale].toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  return <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="sm" className="mt-2 w-fit px-0 text-primary">{copy.coverageOpen}</Button></SheetTrigger><SheetContent side="bottom" className="max-h-[78svh] overflow-y-auto rounded-t-2xl pb-24 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"><SheetHeader><SheetTitle>{copy.coverageTitle}</SheetTitle><SheetDescription>{isos.length} {copy.coverage}</SheetDescription></SheetHeader><label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3"><Search className="size-4 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.coverageSearch} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{countries.map((country) => country ? <li key={country.iso} className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2 text-sm"><CountryFlag iso={country.iso}/><span className="truncate">{country.name[locale]}</span></li> : null)}</ul></SheetContent></Sheet>;
}

type RailVariant = "orb" | "unlimited" | "coverage";

function SecondaryGroup({ title, subtitle, packages, variant, activeSelectedId, onSelect, destinationIso, routeIsos, copy, imageUrl }: { title: string; subtitle: string; packages: EsimPackage[]; variant: RailVariant; activeSelectedId: string; onSelect: (id: string) => void; destinationIso: string; routeIsos: string[]; copy: (typeof COPY)["tr"]; imageUrl: string }) {
  const { locale } = useI18n();
  const Icon = variant === "unlimited" ? InfinityIcon : variant === "coverage" ? Globe2 : Signal;
  return (
    <section className="mt-8">
      <div className="flex min-w-0 items-start gap-3 px-1">
        <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0"><h2 className="font-display text-xl font-bold leading-tight">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div>
      </div>
      <div className={`esim-package-rail mt-3 ${variant === "orb" ? "is-orb" : ""}`}>
        {packages.map((pkg) => {
          const selected = activeSelectedId === pkg.id;
          return (
            <article key={pkg.id} id={`esim-package-${pkg.id}`} className={`esim-rail-card ${variant} ${selected ? "is-selected" : ""}`}>
              {variant === "coverage" && <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${35 + (pkg.coverage.length % 3) * 20}% center` }} />}
              {variant === "coverage" && <div className="absolute inset-0 bg-image-scrim" />}
              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                {variant === "unlimited" && <InfinityIcon className="mb-1 size-6 text-primary" />}
                <strong className="font-display text-xl">{pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`}</strong>
                <span className="mt-0.5 text-sm opacity-70">{pkg.validityDays ?? "—"} {copy.days}</span>
                <span className="mt-2 text-base font-bold">{formatSalePrice(pkg.salePrice ?? 0, pkg.currency, locale)}</span>
                <span className="mt-1 max-w-full truncate text-[11px] opacity-70">{variant === "coverage" ? `${pkg.coverage.length} ${copy.coverage}` : customerPackageTitle({ locale, destinationIso, routeIsos, coverage: pkg.coverage })}</span>
                <Button type="button" variant={selected ? "secondary" : "ghost"} size="sm" onClick={() => onSelect(pkg.id)} role="radio" aria-checked={selected} className="mt-2 h-8 rounded-full px-4">{selected && <Check />}{selected ? copy.selected : copy.select}</Button>
              </div>
            </article>
          );
        })}
      </div>
      {variant === "orb" && <div className="mt-4 flex items-center justify-center gap-5 text-xs font-semibold text-muted-foreground"><span className="flex items-center gap-1"><Wifi className="size-4 text-primary" />{copy.fast}</span><span className="flex items-center gap-1"><Zap className="size-4 text-primary" />{copy.easy}</span><span className="flex items-center gap-1"><Leaf className="size-4 text-primary" />{copy.flexible}</span></div>}
    </section>
  );
}
