import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Check, Gauge, Route as RouteIcon, ShieldCheck, ShoppingCart, Signal, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { DeviceCompatibilityInline } from "@/components/travel/DeviceCompatibility";
import { useI18n } from "@/i18n";
import { getCountryByIso } from "@/domain/geo/countries";
import { useCart } from "@/domain/cart/store";
import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";

const searchSchema = z.object({
  destination: z.string().max(2).catch("").default(""),
  route: z.string().max(120).catch("").default(""),
  days: z.coerce.number().int().min(1).max(365).catch(10).default(10),
  travelers: z.coerce.number().int().min(1).max(9).catch(1).default(1),
  estimated: z.coerce.number().min(0).max(1000).catch(0).default(0),
  recommended: z.coerce.number().min(0).max(1000).catch(0).default(0),
});

const COPY = {
  tr: {
    title: "eSIM paketleri", back: "Finder’a dön", days: "gün", travelers: "kişi",
    estimate: "Tahmini kullanım", recommended: "Önerilen", route: "Rotan",
    empty: "Bu destinasyon için şu anda uygun paket bulunamadı.",
    emptyOther: "Başka paketlere bak", emptyChange: "Destinasyonu değiştir",
    add: "Sepete Ekle", added: "Sepete eklendi", inCart: "Sepette",
    recommendedBadge: "Önerilen", validity: "gün geçerli", unlimited: "Sınırsız veri",
    hotspot: "Hotspot", fiveG: "5G", coverage: "ülke kapsamı",
    lead: "Seçimlerine uyan güncel paketler.",
  },
  de: {
    title: "eSIM-Pakete", back: "Zurück zum Finder", days: "Tage", travelers: "Pers.",
    estimate: "Geschätzter Verbrauch", recommended: "Empfohlen", route: "Deine Route",
    empty: "Für dieses Reiseziel ist derzeit kein Paket verfügbar.",
    emptyOther: "Andere Pakete ansehen", emptyChange: "Reiseziel ändern",
    add: "In den Warenkorb", added: "Hinzugefügt", inCart: "Im Warenkorb",
    recommendedBadge: "Empfohlen", validity: "Tage gültig", unlimited: "Unbegrenzte Daten",
    hotspot: "Hotspot", fiveG: "5G", coverage: "Länder abgedeckt",
    lead: "Aktuelle Pakete passend zu deiner Auswahl.",
  },
  en: {
    title: "eSIM packages", back: "Back to finder", days: "days", travelers: "people",
    estimate: "Estimated usage", recommended: "Recommended", route: "Your route",
    empty: "No package is available for this destination right now.",
    emptyOther: "See other packages", emptyChange: "Change destination",
    add: "Add to cart", added: "Added", inCart: "In cart",
    recommendedBadge: "Recommended", validity: "days valid", unlimited: "Unlimited data",
    hotspot: "Hotspot", fiveG: "5G", coverage: "countries covered",
    lead: "Live packages matching your selection.",
  },
} satisfies Record<Locale, Record<string, string>>;

export const Route = createFileRoute("/esim/paketler")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "eSIM paketleri | travely" },
      { name: "description", content: "Seyahatine uygun eSIM paketlerini karşılaştır ve sepete ekle." },
      { property: "og:title", content: "eSIM paketleri | travely" },
      { property: "og:description", content: "Tahmini kullanımına göre önerilen eSIM paketleri." },
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
  const routeIsos = search.route ? search.route.split(",").map((iso) => iso.trim().toUpperCase()).filter(Boolean) : [];
  const coverageIsos = routeIsos.length ? routeIsos : search.destination ? [search.destination.toUpperCase()] : [];
  const { data: packages = [], isPending } = useQuery({
    queryKey: ["esim-packages", coverageIsos.join(",")],
    queryFn: () => listEsimPackages({ data: { coverageIsos } }),
  });

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
                {search.destination && <CountryFlag iso={search.destination} />}
                {getCountryByIso(search.destination)?.name[locale] ?? "—"}
              </span>
            )}
            <span className="text-muted-foreground">·</span>
            <span>{search.days} {copy.days}</span>
            <span className="text-muted-foreground">·</span>
            <span>{search.travelers} {copy.travelers}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary/60 p-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{copy.estimate}</span>
              <strong className="mt-1 flex items-center gap-1.5 text-lg"><Gauge className="size-4 text-primary" aria-hidden="true" />~{search.estimated} GB</strong>
            </div>
            <div className="rounded-xl bg-accent-soft p-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">{copy.recommended}</span>
              <strong className="mt-1 flex items-center gap-1.5 text-lg"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />{search.recommended} GB</strong>
            </div>
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} recommendedGb={search.recommended} copy={copy} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">{copy.empty}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/esim/paketler" search={{ destination: "", route: "", days: search.days, travelers: search.travelers, estimated: search.estimated, recommended: search.recommended }}>
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

function PackageCard({ pkg, recommendedGb, copy }: { pkg: EsimPackage; recommendedGb: number; copy: (typeof COPY)["tr"] }) {
  const { lines, addLine } = useCart();
  const inCart = lines.some((line) => line.productId === pkg.id);
  const isRecommended = pkg.dataGb != null && recommendedGb > 0 && pkg.dataGb === recommendedGb;
  const price = pkg.salePrice ?? 0;

  return (
    <article className={`flex flex-col rounded-card border bg-card p-5 shadow-card ${isRecommended ? "border-primary ring-1 ring-primary" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block font-display text-2xl">{pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`}</strong>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{pkg.name}</span>
        </div>
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
      <Button
        variant="cta"
        className="mt-3 w-full"
        disabled={inCart}
        onClick={() => addLine({ productId: pkg.id, serviceType: "ESIM", name: pkg.name, meta: pkg.unlimited ? copy.unlimited : `${pkg.dataGb ?? "—"} GB`, price, currency: pkg.currency })}
      >
        <ShoppingCart /> {inCart ? copy.inCart : copy.add}
      </Button>
    </article>
  );
}
