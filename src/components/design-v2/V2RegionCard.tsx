import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { money } from "@/components/design-v2/V2Shell";
import { getRegionPhoto } from "@/components/travel/regionPhotos";
import { COVERAGE_REGION_LABELS } from "@/domain/geo/coverage-regions";
import { useI18n } from "@/i18n";
import type { EsimRegionalSummary } from "@/lib/esim-catalogue.functions";

export function V2RegionCard({ item, from, countries, multi, className = "" }: { item: EsimRegionalSummary; from: string; countries: string; multi: string; className?: string }) {
  const { locale } = useI18n();
  const photo = getRegionPhoto(item.region);
  return <Link to="/esim/bolge/$region" params={{ region: item.region }} search={{ country: "" }} className={`group relative block h-40 overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border lg:h-52 ${className}`}>
    {photo && <img src={photo.url} alt={photo.alt[locale]} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
    <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)]/95 via-[var(--v2-service)]/35 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 p-3 text-primary-foreground">
      <div className="min-w-0"><h3 className="font-display text-base font-bold leading-tight lg:text-lg">{COVERAGE_REGION_LABELS[item.region][locale]}</h3><p className="mt-0.5 text-xs opacity-90">{item.coverageCount ? `${item.coverageCount} ${countries}` : multi}</p><p className="mt-1 text-sm font-bold">{from} {money(item.startingPrice, item.currency)}</p></div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-primary"><ArrowRight className="size-4" /></span>
    </div>
  </Link>;
}