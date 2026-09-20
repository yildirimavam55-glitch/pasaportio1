import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { searchCountries, type Country } from "@/domain/geo/countries";
import { searchAirports, type Airport } from "@/domain/geo/airports";
import type { ServiceSlug } from "@/content/travel-content";
import { CountryFlag } from "./CountryFlag";

const COPY = {
  tr: {
    esimPlaceholder: "Nereye gidiyorsun?",
    loungePlaceholder: "Hangi havalimanı?",
    esimLabel: "Ülke ara",
    loungeLabel: "Havalimanı ara",
    search: "Ara",
    empty: "Sonuç bulunamadı.",
  },
  de: {
    esimPlaceholder: "Wohin reist du?",
    loungePlaceholder: "Welcher Flughafen?",
    esimLabel: "Land suchen",
    loungeLabel: "Flughafen suchen",
    search: "Suchen",
    empty: "Keine Treffer.",
  },
  en: {
    esimPlaceholder: "Where are you going?",
    loungePlaceholder: "Which airport?",
    esimLabel: "Search country",
    loungeLabel: "Search airport",
    search: "Search",
    empty: "No results.",
  },
} as const;

/**
 * Single service-aware entry field: country search for eSIM, airport search for
 * Lounge. Presentation only — it hands the selection to the existing flows.
 */
export function QuickSearch({
  service,
  onAirportSelect,
}: {
  service: ServiceSlug;
  onAirportSelect: (airportId: string) => void;
}) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery("");
    setOpen(false);
  }, [service]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const countries: Country[] = useMemo(
    () => (service === "esim" ? searchCountries(query, 6) : []),
    [query, service],
  );
  const airports: Airport[] = useMemo(
    () => (service === "lounge" ? searchAirports(query, 6) : []),
    [query, service],
  );

  const goToCountry = (country: Country) => {
    setOpen(false);
    setQuery(country.name[locale]);
    void navigate({
      to: "/esim/paketler",
      search: {
        destination: country.iso,
        route: "",
        days: 0,
        travelers: 1,
        estimated: 0,
        required: 0,
        recommended: 0,
        recommendedProductId: "",
        usage: "",
        intensity: "NORMAL",
      },
    });
  };

  const pickAirport = (airport: Airport) => {
    setOpen(false);
    setQuery(`${airport.iata} — ${airport.city[locale]}`);
    onAirportSelect(airport.id);
  };

  const submit = () => {
    if (service === "esim") {
      const first = countries[0];
      if (first) goToCountry(first);
      return;
    }
    const first = airports[0];
    if (first) pickAirport(first);
  };

  return (
    <div ref={boxRef} className="relative mx-auto mt-3 max-w-finder px-3 sm:px-6">
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-card">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={service === "esim" ? copy.esimPlaceholder : copy.loungePlaceholder}
          aria-label={service === "esim" ? copy.esimLabel : copy.loungeLabel}
          className="h-12 border-0 bg-transparent text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          variant="cta"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          aria-label={copy.search}
          onClick={submit}
        >
          <Search className="size-5" />
        </Button>
      </div>
      {open && (
        <div className="absolute inset-x-3 top-full z-40 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-panel sm:inset-x-6">
          {service === "esim" ? (
            countries.length ? (
              countries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => goToCountry(country)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-secondary"
                >
                  <CountryFlag iso={country.iso} className="text-xl" />
                  <span className="truncate text-sm font-semibold">{country.name[locale]}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">{copy.empty}</p>
            )
          ) : airports.length ? (
            airports.map((airport) => (
              <button
                key={airport.id}
                type="button"
                onClick={() => pickAirport(airport)}
                className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-secondary"
              >
                <CountryFlag iso={airport.countryIso} className="text-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {airport.iata} — {airport.city[locale]}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {airport.airport[locale]}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">{copy.empty}</p>
          )}
        </div>
      )}
    </div>
  );
}
