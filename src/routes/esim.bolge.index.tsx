import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Globe2, Plane, Search, Layers3 } from "lucide-react";
import { V2RegionCard } from "@/components/design-v2/V2RegionCard";
import { CartBar, pick, SectionTitle, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import { useCart } from "@/domain/cart/store";
import { searchPublishedRegions } from "@/domain/geo/region-search";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { listEsimRegionalSummaries } from "@/lib/esim-catalogue.functions";

const C = localize({
  tr: { title: "Bölgesel ve Global Paketler", lead: "Birden fazla ülkeye seyahat et. Tek eSIM ile daha fazlasını keşfet.", search: "Bölge veya ülke ara...", popular: "Popüler Bölgeler", countries: "ülke", multi: "Çoklu ülke", from: "başlayan", one: "Tek eSIM", many: "çok ülke", plans: "Bölgesel", planSub: "paketler", easy: "Kolay", easySub: "seyahat", empty: "Bu aramaya uygun yayınlanmış bölgesel paket bulunamadı.", unavailable: "Şu anda yayınlanmış bölgesel paket yok.", back: "eSIM", cart: "Sepete git" },
  de: { title: "Regionale und globale Pakete", lead: "Reise in mehrere Länder. Entdecke mehr mit einer eSIM.", search: "Region oder Land suchen...", popular: "Beliebte Regionen", countries: "Länder", multi: "Mehrere Länder", from: "ab", one: "Eine eSIM", many: "mehrere Länder", plans: "Regionale", planSub: "Pakete", easy: "Einfach", easySub: "reisen", empty: "Keine veröffentlichten regionalen Pakete für diese Suche.", unavailable: "Zurzeit sind keine regionalen Pakete veröffentlicht.", back: "eSIM", cart: "Zum Warenkorb" },
  en: { title: "Regional & Global Plans", lead: "Travel across countries. Explore more with one eSIM.", search: "Search region or country...", popular: "Popular Regions", countries: "countries", multi: "Multi-country", from: "from", one: "One eSIM", many: "many countries", plans: "Regional", planSub: "plans", easy: "Easy", easySub: "travel", empty: "No published regional plans match your search.", unavailable: "No regional plans are currently published.", back: "eSIM", cart: "Go to cart" },
});

export const Route = createFileRoute("/esim/bolge/")({
  head: () => { const title = "Regional & Global eSIM Plans | travely"; const description = "Explore published regional eSIM plans with real multi-country coverage."; return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }; },
  component: RegionalDiscoveryPage,
});

function RegionalDiscoveryPage() {
  const { locale } = useI18n();
  const c = pick(locale, C);
  const { count } = useCart();
  const [query, setQuery] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["v2-esim-regions"], queryFn: () => listEsimRegionalSummaries() });
  const shown = useMemo(() => searchPublishedRegions(data, query, locale), [data, query, locale]);
  const photo = getRegionPhoto("EUROPE");
  return <V2Shell service="esim">
    <Link to="/esim" search={{ country: "" }} className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" />{c.back}</Link>
    <header className="relative -mx-4 h-44 overflow-hidden bg-primary text-primary-foreground sm:mx-0 sm:rounded-xl lg:h-64">
      {photo && <img src={photo.url} alt={photo.alt[locale]} className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--v2-service)]/95 via-[var(--v2-service)]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 lg:p-8"><h1 className="max-w-lg font-display text-2xl font-bold leading-tight lg:text-4xl">{c.title}</h1><p className="mt-2 max-w-sm text-sm leading-snug lg:text-base">{c.lead}</p></div>
    </header>
    <label className="mt-3 flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 shadow-sm"><Search className="size-5 shrink-0 text-primary" /><span className="sr-only">{c.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" /></label>
    <div className="mt-3 grid grid-cols-3 gap-2 border-b border-border pb-3 text-foreground">{[[Globe2, c.one, c.many], [Layers3, c.plans, c.planSub], [Plane, c.easy, c.easySub]].map(([Icon, title, sub], i) => { const Symbol = Icon as typeof Globe2; return <div key={i} className="flex min-w-0 items-center gap-1.5"><Symbol className="size-5 shrink-0 text-primary" /><span className="min-w-0 text-[11px] leading-tight"><strong className="block">{title as string}</strong>{sub as string}</span></div>; })}</div>
    <SectionTitle>{c.popular}</SectionTitle>
    {isLoading ? <div className="h-48 animate-pulse rounded-xl bg-muted" /> : shown.length ? <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">{shown.map((item) => <li key={item.region} className="min-w-0"><V2RegionCard item={item} from={c.from} countries={c.countries} multi={c.multi} /></li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">{query ? c.empty : c.unavailable}</p>}
    <CartBar count={count} label={c.cart} />
  </V2Shell>;
}