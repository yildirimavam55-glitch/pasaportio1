import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Globe2, Infinity as InfinityIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { V2EsimPackageDetails } from "@/components/design-v2/V2EsimPackageDetails";
import { V2ProductSelectionCard, V2SelectedProductSummary } from "@/components/design-v2/V2ProductSelection";
import { CartBar, money, pick, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import { useCart } from "@/domain/cart/store";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { dedupeStorefrontPackages, sortStandardPackages, sortUnlimitedPackages } from "@/domain/esim/storefront-packages";
import { COVERAGE_REGION_LABELS, type CoverageRegionKey } from "@/domain/geo/coverage-regions";
import { useI18n } from "@/i18n";
import { listEsimRegionPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import { localize } from "@/i18n/overlay";

const REGIONS = ["GLOBAL", "EUROPE", "MIDDLE_EAST", "ASIA", "AMERICAS", "AFRICA", "OCEANIA"] as const;
type ResultRegion = (typeof REGIONS)[number];

const C = localize({
  tr: { back: "Bölgesel paketler", suffix: "eSIM paketleri", lead: "Birden fazla ülkede kullanabileceğin paketleri seç.", standard: "Standart", unlimited: "Sınırsız", days: "gün", countries: "ülke", empty: "Bu paket türünde yayınlanmış seçenek yok.", cart: "Sepete git", add: "Sepete ekle", adding: "Ekleniyor…", added: "Sepette", decrease: "Azalt", increase: "Artır", details: "Paket detayları", support: "WhatsApp destek" },
  de: { back: "Regionale Pakete", suffix: "eSIM-Pakete", lead: "Wähle Pakete, die du in mehreren Ländern nutzen kannst.", standard: "Standard", unlimited: "Unbegrenzt", days: "Tage", countries: "Länder", empty: "Für diesen Pakettyp gibt es keine veröffentlichten Optionen.", cart: "Zum Warenkorb", add: "In den Warenkorb", adding: "Wird hinzugefügt…", added: "Im Warenkorb", decrease: "Weniger", increase: "Mehr", details: "Paketdetails", support: "WhatsApp-Support" },
  en: { back: "Regional plans", suffix: "eSIM plans", lead: "Choose plans you can use across multiple countries.", standard: "Standard", unlimited: "Unlimited", days: "days", countries: "countries", empty: "There are no published options for this plan type.", cart: "Go to cart", add: "Add to cart", adding: "Adding…", added: "In cart", decrease: "Decrease", increase: "Increase", details: "Plan details", support: "WhatsApp support" },
});

function parseRegion(value: string): ResultRegion {
  const region = value.toUpperCase() as ResultRegion;
  if (!REGIONS.includes(region)) throw notFound();
  return region;
}

export const Route = createFileRoute("/esim/bolge/$region")({
  validateSearch: (search) => ({ country: typeof search["country"] === "string" ? search["country"].slice(0, 2) : "" }),
  params: { parse: ({ region }) => ({ region: parseRegion(region) }), stringify: ({ region }) => ({ region: region.toLowerCase() }) },
  head: ({ params }) => {
    const region = parseRegion(params.region);
    const name = COVERAGE_REGION_LABELS[region].en;
    const title = `${name} eSIM | travely`;
    const description = `Published Standard and Unlimited eSIM plans for ${name}.`;
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] };
  },
  component: RegionPackagesPage,
});

function RegionPackagesPage() {
  const { region } = Route.useParams();
  const { locale } = useI18n();
  const c = pick(locale, C);
  const { lines, addLine, updateQuantity, count } = useCart();
  const [type, setType] = useState<"standard" | "unlimited">("standard");
  const [detail, setDetail] = useState<EsimPackage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<EsimPackage | null>(null);
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const { data = [], isLoading } = useQuery({ queryKey: ["v2-esim-region", region], queryFn: () => listEsimRegionPackages({ data: { region } }) });
  const meaningful = useMemo(() => dedupeStorefrontPackages(data), [data]);
  const standard = useMemo(() => sortStandardPackages(meaningful.filter((pkg) => !pkg.unlimited)), [meaningful]);
  const unlimited = useMemo(() => sortUnlimitedPackages(meaningful.filter((pkg) => pkg.unlimited)), [meaningful]);
  const availableTypes = [standard.length ? "standard" as const : null, unlimited.length ? "unlimited" as const : null].filter(Boolean) as Array<"standard" | "unlimited">;
  const active = availableTypes.includes(type) ? type : availableTypes[0] ?? "standard";
  const rows = active === "standard" ? standard : unlimited;
  const photo = getRegionPhoto(region as CoverageRegionKey);
  const selectedCartLine = selectedPackage ? lines.find((line) => line.productId === selectedPackage.id) : undefined;
  const selectedIdentity = selectedPackage ? customerCataloguePackageTitle({ locale, destinationIso: selectedPackage.countryIso, coverage: selectedPackage.coverage, packageKind: selectedPackage.packageKind, regionFamily: selectedPackage.regionFamily }) : "";
  const select = (pkg: EsimPackage) => { if (selectedPackage?.id === pkg.id) { setSelectedPackage(null); return; } setSelectedPackage(pkg); setSelectionQuantity(lines.find((line) => line.productId === pkg.id)?.quantity ?? 1); };
  const add = (pkg: EsimPackage, quantity = 1) => addLine({ productId: pkg.id, providerProductId: pkg.providerProductId, serviceType: "ESIM", name: customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily }), meta: pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`, price: pkg.salePrice, currency: pkg.currency, quantity, dataGb: pkg.dataGb, validityDays: pkg.validityDays, coverage: pkg.coverage, destinationIso: pkg.countryIso, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily, isTest: pkg.isTest });
  const summary = selectedPackage ? <V2SelectedProductSummary key={selectedPackage.id} title={`${selectedPackage.unlimited ? `∞ ${c.unlimited}` : `${selectedPackage.dataGb ?? "—"} GB`} · ${selectedPackage.validityDays ?? "—"} ${c.days}`} subtitle={`${selectedIdentity.replace(/ eSIM$/, "")} · ${selectedPackage.coverage.length} ${c.countries}`} price={money(selectedPackage.salePrice ?? 0, selectedPackage.currency)} quantity={selectedCartLine?.quantity ?? selectionQuantity} inCart={Boolean(selectedCartLine)} addLabel={c.add} addingLabel={c.adding} addedLabel={c.added} cartLabel={c.cart} decreaseLabel={c.decrease} increaseLabel={c.increase} whatsappLabel={c.support} onQuantityChange={(quantity) => selectedCartLine ? updateQuantity(selectedCartLine.productId, quantity) : setSelectionQuantity(quantity)} onAdd={() => { if (selectedPackage && !selectedCartLine) add(selectedPackage, selectionQuantity); }} /> : undefined;
  return <V2Shell service="esim" commerceSelection={Boolean(selectedPackage)} purchaseSummary={summary}>
    <Link to="/esim" search={{ country: "" }} className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" />{c.back}</Link>
    <header className="relative mt-1 h-36 overflow-hidden rounded-xl bg-card text-primary-foreground shadow-sm lg:h-72 lg:rounded-2xl">
      {photo && <img src={photo.url} alt={photo.alt[locale]} className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)]/95 via-[var(--v2-service)]/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 lg:p-8"><h1 className="font-display text-xl font-bold lg:text-4xl">{COVERAGE_REGION_LABELS[region][locale]} {c.suffix}</h1><p className="mt-1 text-xs opacity-90 lg:text-base">{c.lead}</p></div>
    </header>
    {availableTypes.length > 1 && <div className="mt-3 grid grid-cols-2 rounded-xl bg-secondary p-1 lg:max-w-xl" role="tablist"><Button type="button" variant={active === "standard" ? "default" : "ghost"} role="tab" aria-selected={active === "standard"} onClick={() => setType("standard")} className="min-w-0 text-xs uppercase">{c.standard} · {standard.length}</Button><Button type="button" variant={active === "unlimited" ? "default" : "ghost"} role="tab" aria-selected={active === "unlimited"} onClick={() => setType("unlimited")} className="min-w-0 text-xs uppercase">{c.unlimited} · {unlimited.length}</Button></div>}
    {isLoading ? <div className="mt-3 h-48 animate-pulse rounded-xl bg-muted" /> : rows.length === 0 ? <p className="mt-3 rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.empty}</p> : <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">{rows.map((pkg) => <li key={pkg.id} className="min-w-0"><V2ProductSelectionCard service="esim" selected={selectedPackage?.id === pkg.id} onSelect={() => select(pkg)} onDetails={() => setDetail(pkg)} detailsLabel={c.details} className="h-28 lg:h-32"><span className="flex h-full w-full flex-col items-start justify-start p-2.5 pr-9"><span className="flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap font-display text-[17px] font-bold leading-6 text-foreground">{pkg.unlimited ? <><InfinityIcon className="size-3.5 shrink-0 text-primary"/><span>{c.unlimited}</span></> : `${pkg.dataGb ?? "—"} GB`}</span><span className="mt-1 text-xs font-normal leading-4 text-muted-foreground">{pkg.validityDays ?? "—"} {c.days}</span><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Globe2 className="size-3"/>{pkg.coverage.length} {c.countries}</span><span className="mt-1.5 text-base font-bold leading-5 text-primary">{money(pkg.salePrice ?? 0, pkg.currency)}</span></span></V2ProductSelectionCard></li>)}</ul>}
    <V2EsimPackageDetails pkg={detail} locale={locale} inCart={detail ? selectedPackage?.id === detail.id : false} onClose={() => setDetail(null)} onAdd={(pkg) => { if (selectedPackage?.id !== pkg.id) select(pkg); setDetail(null); }} />
    <CartBar count={count} label={c.cart} />
  </V2Shell>;
}