import { createFileRoute } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicShell } from "@/components/travel/PublicShell";
import {
  CountryDestinationCard,
  DESTINATION_COPY,
  countryLabel,
  countrySearchHaystack,
  sortCountriesByName,
  useDestinationCatalogue,
} from "@/components/travel/DestinationCards";
import { useI18n } from "@/i18n";
import { foldText } from "@/domain/geo/countries";
import {
  COVERAGE_REGION_LABELS,
  COVERAGE_REGION_ORDER,
  regionOfCountry,
} from "@/domain/geo/coverage-regions";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  region: fallback(z.string(), "").default(""),
});

const PAGE_SIZE = 48;

export const Route = createFileRoute("/esim/ulkeler")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Tüm eSIM ülkeleri — Travely" },
      {
        name: "description",
        content:
          "Travely eSIM kataloğunda satışta olan tüm ülkeleri ara, başlangıç fiyatlarını gör ve paketleri aç.",
      },
      { property: "og:title", content: "Tüm eSIM ülkeleri — Travely" },
      {
        property: "og:description",
        content: "Satışta olan tüm eSIM destinasyonları ve başlangıç fiyatları.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AllCountriesPage,
});

function AllCountriesPage() {
  const { locale } = useI18n();
  const copy = DESTINATION_COPY[locale];
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isPending } = useDestinationCatalogue();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const countries = useMemo(
    () => sortCountriesByName(data?.countries ?? [], locale),
    [data, locale],
  );
  const availableRegions = useMemo(() => {
    const keys = new Set(countries.map((country) => regionOfCountry(country.iso)));
    return COVERAGE_REGION_ORDER.filter((key) => keys.has(key));
  }, [countries]);

  const query = foldText(search.q ?? "");
  const filtered = useMemo(
    () =>
      countries.filter((country) => {
        if (search.region && regionOfCountry(country.iso) !== search.region) return false;
        if (!query) return true;
        return foldText(
          `${countrySearchHaystack(country.iso)} ${countryLabel(country.iso, locale)}`,
        ).includes(query);
      }),
    [countries, query, search.region, locale],
  );

  const shown = filtered.slice(0, visible);

  const setSearch = (next: { q?: string; region?: string }) => {
    setVisible(PAGE_SIZE);
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <PublicShell activeService="esim">
      <section className="mx-auto max-w-site px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{copy.allTitle}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{copy.allLead(countries.length)}</p>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search.q}
            onChange={(event) => setSearch({ q: event.target.value })}
            placeholder={copy.search}
            aria-label={copy.search}
            className="min-h-11 pl-9"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={search.region ? "outline" : "light"}
            onClick={() => setSearch({ region: "" })}
          >
            {copy.allRegions}
          </Button>
          {availableRegions.map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={search.region === key ? "light" : "outline"}
              onClick={() => setSearch({ region: key })}
            >
              {COVERAGE_REGION_LABELS[key][locale]}
            </Button>
          ))}
        </div>

        {isPending ? (
          <div className="destination-grid mt-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="destination-card-skeleton" />
            ))}
          </div>
        ) : shown.length ? (
          <>
            <div className="destination-grid mt-5">
              {shown.map((country, index) => (
                <CountryDestinationCard key={country.iso} destination={country} eager={index < 4} />
              ))}
            </div>
            {filtered.length > shown.length && (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setVisible((current) => current + PAGE_SIZE)}
                >
                  {copy.showMore} ({filtered.length - shown.length})
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-6 rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {copy.noResults}
          </p>
        )}
      </section>
    </PublicShell>
  );
}
