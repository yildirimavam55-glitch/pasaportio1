import { Search, X } from "lucide-react";
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
    close: "Aramayı kapat",
    empty: "Sonuç bulunamadı.",
  },
  de: {
    esimPlaceholder: "Wohin reist du?",
    loungePlaceholder: "Welcher Flughafen?",
    esimLabel: "Land suchen",
    loungeLabel: "Flughafen suchen",
    search: "Suchen",
    close: "Suche schließen",
    empty: "Keine Treffer.",
  },
  en: {
    esimPlaceholder: "Where are you going?",
    loungePlaceholder: "Which airport?",
    esimLabel: "Search country",
    loungeLabel: "Search airport",
    search: "Search",
    close: "Close search",
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
  onSearchModeChange,
  embedded = false,
}: {
  service: ServiceSlug;
  onAirportSelect: (airportId: string) => void;
  onSearchModeChange?: (active: boolean) => void;
  embedded?: boolean;
}) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const closeSearch = (blur = false) => {
    setOpen(false);
    if (blur) inputRef.current?.blur();
  };

  useEffect(() => {
    setQuery("");
    setOpen(false);
  }, [service]);

  useEffect(() => {
    onSearchModeChange?.(open);
    if (open) document.documentElement.dataset["searchMode"] = "true";
    else delete document.documentElement.dataset["searchMode"];
  }, [onSearchModeChange, open]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset["searchMode"];
      onSearchModeChange?.(false);
    },
    [onSearchModeChange],
  );

  useEffect(() => {
    const onDocPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) closeSearch();
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    const updateResultsHeight = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const results = resultsRef.current;
        if (!results) return;
        const viewport = window.visualViewport;
        const visibleBottom = viewport
          ? viewport.offsetTop + viewport.height
          : window.innerHeight;
        const availableHeight = Math.floor(
          visibleBottom - results.getBoundingClientRect().top - 12,
        );
        results.style.setProperty(
          "--quick-search-available-height",
          `${Math.max(104, availableHeight)}px`,
        );
      });
    };

    updateResultsHeight();
    window.addEventListener("resize", updateResultsHeight);
    window.addEventListener("orientationchange", updateResultsHeight);
    window.visualViewport?.addEventListener("resize", updateResultsHeight);
    window.visualViewport?.addEventListener("scroll", updateResultsHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateResultsHeight);
      window.removeEventListener("orientationchange", updateResultsHeight);
      window.visualViewport?.removeEventListener("resize", updateResultsHeight);
      window.visualViewport?.removeEventListener("scroll", updateResultsHeight);
    };
  }, [open]);

  const countries: Country[] = useMemo(() => {
    if (service !== "esim") return [];
    const needle = query.trim().toLocaleLowerCase(locale);
    const found = searchCountries(query, Number.MAX_SAFE_INTEGER);
    if (!needle) return found;
    // Keep names that start with what the customer typed at the top.
    return [...found].sort((a, b) => {
      const rank = (country: Country) =>
        country.name[locale].toLocaleLowerCase(locale).startsWith(needle) ? 0 : 1;
      return rank(a) - rank(b);
    });
  }, [locale, query, service]);
  const airports: Airport[] = useMemo(
    () => (service === "lounge" ? searchAirports(query, Number.MAX_SAFE_INTEGER) : []),
    [query, service],
  );

  const goToCountry = (country: Country) => {
    closeSearch(true);
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
    closeSearch(true);
    setQuery(`${airport.iata} — ${airport.city[locale]}`);
    onAirportSelect(airport.id);
  };

  const submit = () => {
    if (service === "esim") {
      const first = countries[0];
      if (first) goToCountry(first);
      else closeSearch(true);
      return;
    }
    const first = airports[0];
    if (first) pickAirport(first);
    else closeSearch(true);
  };

  return (
    <div
      ref={boxRef}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !boxRef.current?.contains(nextTarget)) closeSearch();
      }}
      className={`quick-search-container ${embedded ? "relative w-full" : "relative mx-auto mt-3 max-w-finder px-3 sm:px-6"}`}
      data-open={open || undefined}
    >
      <div className="quick-search-field flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-panel backdrop-blur-md sm:gap-2 sm:p-2">
        <Input
          ref={inputRef}
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
            if (event.key === "Escape") {
              event.preventDefault();
              closeSearch(true);
            }
          }}
          placeholder={service === "esim" ? copy.esimPlaceholder : copy.loungePlaceholder}
          aria-label={service === "esim" ? copy.esimLabel : copy.loungeLabel}
          className="h-12 min-w-0 border-0 bg-transparent px-3 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        {open && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            aria-label={copy.close}
            onClick={() => closeSearch(true)}
          >
            <X className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          variant="cta"
          size="icon"
          className="size-11 shrink-0 rounded-xl shadow-soft"
          aria-label={copy.search}
          onClick={submit}
        >
          <Search className="size-5" />
        </Button>
      </div>
      {open && (
        <div
          ref={resultsRef}
          role="listbox"
          aria-label={service === "esim" ? copy.esimLabel : copy.loungeLabel}
          className={`quick-search-results absolute top-full mt-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-panel ${embedded ? "inset-x-0" : "inset-x-3 sm:inset-x-6"}`}
        >
          {service === "esim" ? (
            countries.length ? (
              countries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => goToCountry(country)}
                  className="flex min-h-12 w-full touch-manipulation items-center gap-3 px-3 text-left hover:bg-secondary focus-visible:bg-secondary"
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
                role="option"
                aria-selected="false"
                onClick={() => pickAirport(airport)}
                className="flex min-h-12 w-full touch-manipulation items-center gap-3 px-3 text-left hover:bg-secondary focus-visible:bg-secondary"
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
