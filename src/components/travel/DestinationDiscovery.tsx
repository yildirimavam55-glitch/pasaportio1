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

export function DestinationDiscovery({ section }: { section: StorefrontSection | null }) {
  const { locale } = useI18n();
  const copy = DESTINATION_COPY[locale];
  const { data } = useDestinationCatalogue();
  const countries = data?.countries ?? [];
  const regions = sortRegions(data?.regions ?? []);

  const sellable = new Map(countries.map((country) => [country.iso, country]));
  const promoted = (section?.items ?? [])
    .filter((item) => item.visible)
    .flatMap((item) => item.entity.split(","))
    .map((iso) => iso.trim().toUpperCase())
    .filter((iso) => iso.length === 2 && sellable.has(iso));
  const popularIsos = [...new Set([...promoted, ...POPULAR_COUNTRY_ISOS])]
    .filter((iso) => sellable.has(iso))
    .slice(0, POPULAR_LIMIT);
  const popular = popularIsos.map((iso) => sellable.get(iso)!);

  if (!countries.length && !regions.length) return null;

  return (
    <section id="popular" className={surfaceClasses(section)}>
      <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
        {regions.length > 0 && (
          <>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {tx(section, "headline", locale, copy.regionsTitle)}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {tx(section, "description", locale, copy.regionsLead)}
            </p>
            <div className="destination-grid mt-4">
              {regions.map((region) => (
                <RegionDestinationCard key={region.key} region={region} />
              ))}
            </div>
          </>
        )}

        {popular.length > 0 && (
          <>
            <h2 className="mt-9 font-display text-2xl font-bold sm:text-3xl">
              {copy.popularTitle}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.popularLead}</p>
            <div className="destination-grid mt-4">
              {popular.map((country, index) => (
                <CountryDestinationCard key={country.iso} destination={country} eager={index < 2} />
              ))}
            </div>
          </>
        )}

        <div className="mt-5 flex justify-center">
          <Link to="/esim/ulkeler" search={{ q: "", region: "" }}>
            <Button type="button" variant="outline" className="min-h-11">
              {copy.allCountries}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
