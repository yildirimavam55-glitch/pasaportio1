/**
 * Homepage eSIM destination discovery.
 *
 * Countries and regions come from the live supplier catalogue. Storefront
 * section items only influence merchandising (title, copy, promoted countries),
 * never which destinations exist.
 */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { POPULAR_COUNTRY_ISOS } from "@/domain/geo/country-data";
import { tx, type StorefrontSection } from "@/domain/storefront/registry";
import { surfaceClasses, widthClass } from "@/domain/storefront/styles";
import {
  CountryDestinationCard,
  DESTINATION_COPY,
  RegionDestinationCard,
  sortRegions,
  useDestinationCatalogue,
} from "./DestinationCards";

const POPULAR_LIMIT = 8;
const POPULAR_COUNTRY_PRIORITY = ["TR", "ES", "IT", "GR", "EG", "US", "JP", "TH"] as const;
const POPULAR_COUNTRY_FALLBACKS = ["PT", "MV", "TN", "AE", "CA", "MX"] as const;

export function DestinationDiscovery({
  section,
  mode = "full",
}: {
  section: StorefrontSection | null;
  mode?: "full" | "popular" | "secondary";
}) {
  const { locale } = useI18n();
  const copy = DESTINATION_COPY[locale];
  const { data } = useDestinationCatalogue();
  const countries = data?.countries ?? [];
  const regions = sortRegions(data?.regions ?? []);

  const sellable = new Map(countries.map((country) => [country.iso, country]));
  const popularIsos = [...new Set([...POPULAR_COUNTRY_PRIORITY, ...POPULAR_COUNTRY_FALLBACKS, ...POPULAR_COUNTRY_ISOS])]
    .filter((iso) => sellable.has(iso))
    .slice(0, POPULAR_LIMIT);
  const popular = popularIsos.flatMap((iso) => {
    const country = sellable.get(iso);
    return country ? [country] : [];
  });

  if (!countries.length && !regions.length) return null;

  return (
    <>
      {mode !== "secondary" && popular.length > 0 && (
        <section id="popular" className={surfaceClasses(section)}>
          <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {tx(section, "headline", locale, copy.popularTitle)}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {tx(section, "description", locale, copy.popularLead)}
            </p>
            <div className="destination-grid mt-4">
              {popular.map((country, index) => (
                <CountryDestinationCard key={country.iso} destination={country} eager={index < 2} />
              ))}
            </div>
          </div>
        </section>
      )}

      {mode !== "popular" && (
        <section className="bg-background py-8 sm:py-10">
          <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
            <div className="flex flex-col gap-3 border-y border-border py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl">{copy.allTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.allLead(countries.length)}</p>
              </div>
              <Link to="/esim/ulkeler" search={{ q: "", region: "" }}>
                <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
                  {copy.allCountries}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {mode !== "popular" && regions.length > 0 && (
        <section id="regional-esim" className="bg-accent-soft py-10 sm:py-12">
          <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {copy.regionsTitle}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{copy.regionsLead}</p>
            <div className="destination-grid mt-4">
              {regions.map((region) => (
                <RegionDestinationCard key={region.key} region={region} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
