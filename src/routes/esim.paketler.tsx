import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, Check, Gauge, HelpCircle, Route as RouteIcon, ShoppingCart, Signal, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { CheckoutPausedNote, ServicePausedState, useServiceAvailability } from "@/components/travel/ServiceAvailability";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { DeviceCompatibilityInline } from "@/components/travel/DeviceCompatibility";
import { useI18n } from "@/i18n";
import { getCountryByIso } from "@/domain/geo/countries";
import { useCart } from "@/domain/cart/store";
import { filterEligiblePackages, selectRecommendedPackage } from "@/domain/esim/package-matching";
import { activationNote } from "@/domain/esim/activation";

import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";

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
    estimate: "Tahmini kullanım", need: "Tahmini ihtiyaç", route: "Rotan",
    empty: "Bu destinasyon için şu anda uygun paket bulunamadı.",
    emptyOther: "Diğer paketleri gör", emptyChange: "Destinasyonu değiştir",
    add: "Sepete Ekle", inCart: "Sepette", select: "Seç", selected: "Seçildi",
    recommendedBadge: "Önerilen", validity: "gün geçerli", unlimited: "Sınırsız veri",
    hotspot: "Hotspot", fiveG: "5G", coverage: "ülke kapsamı",
    lead: "Seçimlerine uyan güncel paketler.",
    why: "Neden bu paket?", goToCart: "Sepete git",
    whyText: (need: number, size: string) => `Yaklaşık ${need} GB ihtiyacın için mevcut paketler arasındaki en yakın uygun seçenek: ${size}.`,
  },
  de: {
    title: "eSIM-Pakete", back: "Zurück zum Finder", days: "Tage", travelers: (count: number) => count === 1 ? "1 Person" : `${count} Personen`,
    estimate: "Geschätzter Verbrauch", need: "Geschätzter Bedarf", route: "Deine Route",
    empty: "Für diese Reise ist derzeit kein passendes Paket verfügbar.",
    emptyOther: "Andere Pakete ansehen", emptyChange: "Reiseziel ändern",
    add: "In den Warenkorb", inCart: "Im Warenkorb", select: "Auswählen", selected: "Ausgewählt",
    recommendedBadge: "Empfohlen", validity: "Tage gültig", unlimited: "Unbegrenzte Daten",
    hotspot: "Hotspot", fiveG: "5G", coverage: "Länder abgedeckt",
    lead: "Aktuelle Pakete passend zu deiner Auswahl.",
    why: "Warum dieses Paket?", goToCart: "Zum Warenkorb",
    whyText: (need: number, size: string) => `Für deinen Bedarf von rund ${need} GB ist dies das nächstpassende verfügbare Paket: ${size}.`,
  },
  en: {
    title: "eSIM packages", back: "Back to finder", days: "days", travelers: (count: number) => count === 1 ? "1 person" : `${count} people`,
    estimate: "Estimated usage", need: "Estimated need", route: "Your route",
    empty: "No suitable package is available for this trip right now.",
    emptyOther: "See other packages", emptyChange: "Change destination",
    add: "Add to cart", inCart: "In cart", select: "Select", selected: "Selected",
    recommendedBadge: "Recommended", validity: "days valid", unlimited: "Unlimited data",
    hotspot: "Hotspot", fiveG: "5G", coverage: "countries covered",
    lead: "Live packages matching your selection.",
    why: "Why this package?", goToCart: "Go to cart",
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

  // Layer 2: the recommendation is an actual available product, never an invented size.
  const recommended = selectRecommendedPackage(packages, {
    requiredGb: required,
    coverageIsos,
    days,
  });
  const eligiblePackages = filterEligiblePackages(packages, { requiredGb: required, coverageIsos, days });
  const handedOffProduct = eligiblePackages.find((pkg) => pkg.id === search.recommendedProductId);
  const recommendedProduct = handedOffProduct ?? recommended;
  const recommendedLabel = recommendedProduct ? (recommendedProduct.unlimited ? copy.unlimited : `${recommendedProduct.dataGb} GB`) : "";
  const [selectedProductId, setSelectedProductId] = useState("");
  const [hasScrolled, setHasScrolled] = useState(false);
  const { lines, addLine } = useCart();
  const availability = useServiceAvailability();
  const activeSelectedId = selectedProductId || recommendedProduct?.id || packages[0]?.id || "";
  const selectedProduct = packages.find((pkg) => pkg.id === activeSelectedId) ?? null;
  const selectedInCart = Boolean(selectedProduct && lines.some((line) => line.productId === selectedProduct.id));

  useEffect(() => {
    if (!packages.length) return;
    setSelectedProductId((current) => packages.some((pkg) => pkg.id === current) ? current : (recommendedProduct?.id ?? packages[0]?.id ?? ""));
  }, [packages, recommendedProduct?.id]);

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
        <Link to="/esim" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="size-4" /> {copy.back}
        </Link>
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
          <div className="mt-3 rounded-xl bg-accent-soft p-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{copy.need}</span>
            <strong className="mt-1 flex items-center gap-1.5 text-xl"><Gauge className="size-5 text-primary" aria-hidden="true" />~{required} GB</strong>
          </div>
        </div>

        <div className="mt-3">
          <DeviceCompatibilityInline />
        </div>

        {isPending ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((key) => <div key={key} className="h-44 animate-pulse rounded-card bg-secondary" />)}
          </div>
        ) : packages.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={copy.title}>
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isRecommended={recommendedProduct?.id === pkg.id}
                isSelected={activeSelectedId === pkg.id}
                onSelect={() => setSelectedProductId(pkg.id)}
                whyText={copy.whyText(required, recommendedLabel)}
                copy={copy}
              />
            ))}
            {selectedProduct && (
              <div className="sm:col-span-2 lg:col-span-3">
                {availability.esim.checkout ? (
                  <Button variant="cta" size="lg" className="w-full scroll-mb-24" disabled={selectedInCart} onClick={() => addLine({ productId: selectedProduct.id, providerProductId: selectedProduct.providerProductId, serviceType: "ESIM", name: selectedProduct.name, meta: selectedProduct.unlimited ? copy.unlimited : `${selectedProduct.dataGb ?? "—"} GB`, price: selectedProduct.salePrice, currency: selectedProduct.currency, dataGb: selectedProduct.dataGb, validityDays: selectedProduct.validityDays, coverage: selectedProduct.coverage, isTest: selectedProduct.isTest })}>
                    <ShoppingCart /> {selectedInCart ? copy.inCart : copy.add}
                  </Button>
                ) : (
                  <CheckoutPausedNote service="esim" />
                )}
                {lines.length > 0 && (
                  <Link to="/sepet" className="mt-2 block text-center text-sm font-semibold text-primary">{copy.goToCart}</Link>
                )}
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

function PackageCard({ pkg, isRecommended, isSelected, onSelect, whyText, copy }: { pkg: EsimPackage; isRecommended: boolean; isSelected: boolean; onSelect: () => void; whyText: string; copy: (typeof COPY)["tr"] }) {
  const { locale } = useI18n();
  const [showWhy, setShowWhy] = useState(false);
  const price = pkg.salePrice ?? 0;


  return (
    <article id={`esim-package-${pkg.id}`} className={`flex flex-col rounded-card border p-5 shadow-card ${isSelected ? "border-primary bg-primary-soft ring-1 ring-primary" : isRecommended ? "border-primary/60 bg-card" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <strong className="block break-words font-display text-2xl">{pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`}</strong>
          <span className="mt-0.5 block break-words text-sm text-muted-foreground">{pkg.name}</span>
        </div>
        {pkg.isTest && (
          <span className="shrink-0 rounded-full border border-primary px-2 py-1 text-xs font-bold text-primary">TEST</span>
        )}
        {(isRecommended || pkg.badge) && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-1 text-xs font-bold text-primary">
            {isRecommended ? copy.recommendedBadge : pkg.badge}
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {pkg.validityDays != null && <li className="flex items-center gap-1.5"><Check className="size-4 text-primary" />{pkg.validityDays} {copy.validity}</li>}
        {pkg.coverage.length > 0 && <li className="flex items-center gap-1.5"><Signal className="size-4 text-primary" />{pkg.coverage.length} {copy.coverage}</li>}
        {pkg.supports5g && <li className="flex items-center gap-1.5"><Zap className="size-4 text-primary" />{copy.fiveG}</li>}
        {pkg.supportsHotspot && <li className="flex items-center gap-1.5"><Wifi className="size-4 text-primary" />{copy.hotspot}</li>}
      </ul>
      <strong className="mt-4 block text-xl">{new Intl.NumberFormat(undefined, { style: "currency", currency: pkg.currency }).format(price)}</strong>
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
