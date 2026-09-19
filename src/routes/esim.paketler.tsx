import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, Check, Gauge, HelpCircle, Route as RouteIcon, Search, ShoppingCart, Signal, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { CheckoutPausedNote, ServicePausedState, useServiceAvailability } from "@/components/travel/ServiceAvailability";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { DeviceCompatibilityInline } from "@/components/travel/DeviceCompatibility";
import { useI18n } from "@/i18n";
import { getCountryByIso } from "@/domain/geo/countries";
import { useCart } from "@/domain/cart/store";
import { resolveTieredRecommendation } from "@/domain/esim/package-matching";
import { activationNote } from "@/domain/esim/activation";

import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";
import { customerPackageTitle, formatSalePrice } from "@/domain/esim/customer-presentation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  const routeIsos = search.route.slice(0, 120).split(",").map((iso: string) => iso.trim().toUpperCase().slice(0, 2)).filter(Boolean);
  const coverageIsos = routeIsos.length ? routeIsos : destination ? [destination] : [];
  const days = Math.max(1, Math.min(365, search.days));
  const travelers = Math.max(1, Math.min(9, search.travelers));
  const required = Math.max(0, Math.min(1000, search.required));
  const { data: packages = [], isPending } = useQuery({
    queryKey: ["esim-packages", coverageIsos.join(",")],
    queryFn: () => listEsimPackages({ data: { coverageIsos } }),
  });

  // Layer 2: real catalogue products only, resolved single-country -> regional -> global.
  const match = resolveTieredRecommendation(packages, { requiredGb: required, coverageIsos, days });
  const handedOffProduct = match.candidates.find((pkg) => pkg.id === search.recommendedProductId);
  const recommendedProduct = handedOffProduct ?? match.recommended;
  const scopeNote =
    match.scope === "REGIONAL" ? copy.scopeRegional : match.scope === "GLOBAL" ? copy.scopeGlobal : "";
  const recommendedLabel = recommendedProduct ? (recommendedProduct.unlimited ? copy.unlimited : `${recommendedProduct.dataGb} GB`) : "";
  const [selectedProductId, setSelectedProductId] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);
  const { lines, addLine } = useCart();
  const availability = useServiceAvailability();
  const sufficientPackages = match.candidates.filter((pkg) => pkg.unlimited || (pkg.dataGb ?? 0) >= required);
  const visiblePackages = recommendedProduct
    ? [recommendedProduct, ...sufficientPackages.filter((pkg) => pkg.id !== recommendedProduct.id)]
    : [];
  const activeSelectedId = selectedProductId || recommendedProduct?.id || visiblePackages[0]?.id || "";
  const selectedProduct = visiblePackages.find((pkg) => pkg.id === activeSelectedId) ?? null;
  const selectedInCart = Boolean(selectedProduct && lines.some((line) => line.productId === selectedProduct.id));

  useEffect(() => {
    if (!visiblePackages.length) return;
    setSelectedProductId((current) => visiblePackages.some((pkg) => pkg.id === current) ? current : (recommendedProduct?.id ?? visiblePackages[0]?.id ?? ""));
  }, [visiblePackages, recommendedProduct?.id]);

  const addSelectedToCart = () => {
    if (!selectedProduct || selectedProduct.salePrice == null) return;
    addLine({ productId: selectedProduct.id, providerProductId: selectedProduct.providerProductId, serviceType: "ESIM", name: customerPackageTitle({ locale, destinationIso: destination, routeIsos, coverage: selectedProduct.coverage }), meta: selectedProduct.unlimited ? copy.unlimited : `${selectedProduct.dataGb ?? "—"} GB`, price: selectedProduct.salePrice, currency: selectedProduct.currency, dataGb: selectedProduct.dataGb, validityDays: selectedProduct.validityDays, coverage: selectedProduct.coverage, isTest: selectedProduct.isTest });
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
      <section className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <Button type="button" variant="ghost" size="sm" className="-ml-3 text-primary" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign("/esim")}>
          <ArrowLeft className="size-4" /> {copy.back}
        </Button>
        <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.lead}</p>

        <div className="mt-4 rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
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
                {getCountryByIso(destination)?.name[locale] ?? "—"}
              </span>
            )}
            <span className="text-muted-foreground">·</span>
            <span>{days} {copy.days}</span>
            <span className="text-muted-foreground">·</span>
            <span>{copy.travelers(travelers)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-accent-soft p-3">
            <div><span className="text-xs font-semibold uppercase text-muted-foreground">{copy.estimate}</span><strong className="mt-1 flex items-center gap-1.5 text-xl"><Gauge className="size-5 text-primary" aria-hidden="true" />~{search.estimated || required} GB</strong></div>
            <div><span className="text-xs font-semibold uppercase text-muted-foreground">{copy.need}</span><strong className="mt-1 block text-xl">{recommendedLabel || `~${required} GB`}</strong></div>
            {scopeNote && <p className="mt-1 text-xs text-muted-foreground">{scopeNote}</p>}
          </div>
        </div>

        <div className="mt-3">
          <DeviceCompatibilityInline />
        </div>

        {isPending ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => <div key={key} className="h-44 animate-pulse rounded-card bg-secondary" />)}
          </div>
        ) : visiblePackages.length ? (
          <div className="mt-5 grid gap-3 pb-28 sm:grid-cols-2 sm:pb-0 lg:grid-cols-3" role="radiogroup" aria-label={copy.title}>
            {visiblePackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isRecommended={recommendedProduct?.id === pkg.id}
                variantLabel={pkg.id === match.economy?.id ? copy.economyBadge : pkg.id === match.comfort?.id ? copy.comfortBadge : ""}
                isSelected={activeSelectedId === pkg.id}
                onSelect={() => setSelectedProductId(pkg.id)}
                whyText={copy.whyText(required, recommendedLabel)}
                destinationIso={destination}
                routeIsos={routeIsos}
                copy={copy}
              />
            ))}
            {selectedProduct && (
              <div className="fixed inset-x-0 bottom-[4.7rem] z-40 border-t border-border bg-background/98 p-3 shadow-nav backdrop-blur md:static md:col-span-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none lg:col-span-3">
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
        ) : (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">{copy.empty}</p>
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

function PackageCard({ pkg, isRecommended, variantLabel, isSelected, onSelect, whyText, destinationIso, routeIsos, copy }: { pkg: EsimPackage; isRecommended: boolean; variantLabel?: string; isSelected: boolean; onSelect: () => void; whyText: string; destinationIso: string; routeIsos: string[]; copy: (typeof COPY)["tr"] }) {
  const { locale } = useI18n();
  const [showWhy, setShowWhy] = useState(false);
  const price = pkg.salePrice ?? 0;


  return (
    <article id={`esim-package-${pkg.id}`} className={`flex flex-col rounded-card border p-5 shadow-card ${isSelected ? "border-primary bg-primary-soft ring-1 ring-primary" : isRecommended ? "border-primary/60 bg-card" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <strong className="block break-words font-display text-2xl">{pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`}</strong>
          <span className="mt-0.5 block break-words text-sm text-muted-foreground">{customerPackageTitle({ locale, destinationIso, routeIsos, coverage: pkg.coverage })}</span>
        </div>
        {(isRecommended || variantLabel || pkg.badge) && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-1 text-xs font-bold text-primary">
            {isRecommended ? copy.recommendedBadge : variantLabel || pkg.badge}
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {pkg.validityDays != null && <li className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{pkg.validityDays} {copy.validity}</li>}
        {routeIsos.length > 1 && <li className="flex items-center gap-1.5"><RouteIcon className="size-4 text-primary" />{copy.routeCoverage(routeIsos.filter((iso) => pkg.coverage.includes(iso)).length, routeIsos.length)}</li>}
        {pkg.coverage.length > 0 && <li className="flex items-center gap-1.5"><Signal className="size-4 text-primary" />{pkg.coverage.length} {copy.coverage}</li>}
        {pkg.supports5g && <li className="flex items-center gap-1.5"><Zap className="size-4 text-primary" />{copy.fiveG}</li>}
        {pkg.supportsHotspot && <li className="flex items-center gap-1.5"><Wifi className="size-4 text-primary" />{copy.hotspot}</li>}
        {pkg.dataOnly && <li className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{copy.dataOnly}</li>}
        {pkg.topupSupported && <li className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{copy.topup}</li>}
      </ul>
      {pkg.coverage.length > 1 && <CoverageSheet isos={pkg.coverage} copy={copy} />}
      <strong className="mt-4 block text-xl">{formatSalePrice(price, pkg.currency, locale)}</strong>
      {activationNote(pkg.activationPolicy, locale) && (
        <p className="mt-1 text-xs text-muted-foreground">{activationNote(pkg.activationPolicy, locale)}</p>
      )}
      {pkg.unlimited && pkg.fairUseNote && <p className="mt-1 text-xs text-muted-foreground">{pkg.fairUseNote}</p>}

      {isRecommended && (
        <div className="mt-2">
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setShowWhy((open) => !open)} aria-expanded={showWhy}>
            <HelpCircle className="size-4" aria-hidden="true" /> {copy.why}
          </button>
          {showWhy && <p className="mt-1 text-sm text-muted-foreground">{whyText}</p>}
        </div>
      )}
      <Button
        variant={isSelected ? "secondary" : "outline"}
        className="mt-3 w-full"
        onClick={onSelect}
        role="radio"
        aria-checked={isSelected}
      >
        {isSelected && <Check />} {isSelected ? copy.selected : copy.select}
      </Button>
    </article>
  );
}

function CoverageSheet({ isos, copy }: { isos: string[]; copy: (typeof COPY)["tr"] }) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const countries = isos.map((iso) => getCountryByIso(iso)).filter((country) => country && country.name[locale].toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  return <Sheet><SheetTrigger asChild><Button type="button" variant="ghost" size="sm" className="mt-2 w-fit px-0 text-primary">{copy.coverageOpen}</Button></SheetTrigger><SheetContent side="bottom" className="max-h-[78svh] overflow-y-auto rounded-t-2xl pb-24 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(36rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"><SheetHeader><SheetTitle>{copy.coverageTitle}</SheetTitle><SheetDescription>{isos.length} {copy.coverage}</SheetDescription></SheetHeader><label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3"><Search className="size-4 text-muted-foreground"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.coverageSearch} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{countries.map((country) => country ? <li key={country.iso} className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2 text-sm"><CountryFlag iso={country.iso}/><span className="truncate">{country.name[locale]}</span></li> : null)}</ul></SheetContent></Sheet>;
}
