import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { searchCountries, type Country } from "@/domain/geo/countries";
import { searchAirports, type Airport } from "@/domain/geo/airports";
import type { ServiceSlug } from "@/content/travel-content";
import { CountryFlag } from "./CountryFlag";
import { localize } from "@/i18n/overlay";

const COPY = localize({
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
} as const);

/**
 * Single service-aware entry field: country search for eSIM, airport search for
 * Lounge. Presentation only — it hands the selection to the existing flows.
 */
export function QuickSearch({
  service,
  onAirportSelect,
  onSearchModeChange,
  embedded = false,
  compact = false,
  lockScroll = false,
  portalResults = false,
  placeholder,
}: {
  service: ServiceSlug;
  onAirportSelect: (airportId: string) => void;
  onSearchModeChange?: (active: boolean) => void;
  embedded?: boolean;
  /** Compact sizing for the sticky bar variant. */
  compact?: boolean;
  /** Prevents the page behind the results from scrolling while open. */
  lockScroll?: boolean;
  /** Renders the dropdown in the document layer so sticky/mobile parents cannot clip it. */
  portalResults?: boolean;
  /** Optional presentation copy for this instance; shared search behavior stays unchanged. */
  placeholder?: string;
}) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [portalMetrics, setPortalMetrics] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

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

  useEffect(() => {
    if (!open || !lockScroll) return;
    // Locking the document collapses its scroll range, so remember the offset
    // and put the reader back exactly where they were when the list closes.
    const scroller = document.scrollingElement ?? document.documentElement;
    const previousTop = scroller.scrollTop;
    document.documentElement.dataset["quickSearchLock"] = "true";
    return () => {
      delete document.documentElement.dataset["quickSearchLock"];
      scroller.scrollTop = previousTop;
    };
  }, [lockScroll, open]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset["searchMode"];
      onSearchModeChange?.(false);
    },
    [onSearchModeChange],
  );

  useEffect(() => {
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (boxRef.current?.contains(target) || resultsRef.current?.contains(target)) return;
      closeSearch();
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    const delayedUpdates: number[] = [];
    const updateResultsLayout = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const results = resultsRef.current;
        if (!results) return;
        const viewport = window.visualViewport;
        const visibleTop = viewport ? viewport.offsetTop : 0;
        const visibleBottom = viewport
          ? viewport.offsetTop + viewport.height
          : window.innerHeight;
        let resultsTop = results.getBoundingClientRect().top;

        if (portalResults) {
          const field = fieldRef.current;
          if (!field) return;
          const rect = field.getBoundingClientRect();
          const safeInset = 12;
          const top = Math.max(visibleTop + 8, Math.round(rect.bottom + 4));
          const left = Math.max(safeInset, Math.round(rect.left));
          const right = Math.min(window.innerWidth - safeInset, Math.round(rect.right));
          const width = Math.max(280, right - left);
          resultsTop = top;
          setPortalMetrics((current) => {
            if (current?.top === top && current.left === left && current.width === width) return current;
            return { top, left, width };
          });
        }

        const availableHeight = Math.floor(
          visibleBottom - resultsTop - 12,
        );
        results.style.setProperty(
          "--quick-search-available-height",
          `${Math.max(104, availableHeight)}px`,
        );
      });
    };

    updateResultsLayout();
    delayedUpdates.push(window.setTimeout(updateResultsLayout, 40));
    delayedUpdates.push(window.setTimeout(updateResultsLayout, 120));
    window.addEventListener("resize", updateResultsLayout);
    window.addEventListener("orientationchange", updateResultsLayout);
    window.addEventListener("scroll", updateResultsLayout, { passive: true, capture: true });
    window.visualViewport?.addEventListener("resize", updateResultsLayout);
    window.visualViewport?.addEventListener("scroll", updateResultsLayout);

    return () => {
      window.cancelAnimationFrame(frame);
      delayedUpdates.forEach((timeout) => window.clearTimeout(timeout));
      window.removeEventListener("resize", updateResultsLayout);
      window.removeEventListener("orientationchange", updateResultsLayout);
      window.removeEventListener("scroll", updateResultsLayout, { capture: true });
      window.visualViewport?.removeEventListener("resize", updateResultsLayout);
      window.visualViewport?.removeEventListener("scroll", updateResultsLayout);
    };
  }, [open, portalResults]);

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

  const portalStyle: CSSProperties | undefined = portalResults && portalMetrics
    ? { top: portalMetrics.top, left: portalMetrics.left, width: portalMetrics.width }
    : undefined;

  const results = open ? (
    <div
      ref={resultsRef}
      role="listbox"
      aria-label={service === "esim" ? copy.esimLabel : copy.loungeLabel}
      data-layer={portalResults ? "sticky" : undefined}
      data-positioned={portalResults && portalMetrics ? "true" : undefined}
      style={portalStyle}
      className={`quick-search-results ${portalResults ? "fixed" : "absolute top-full mt-1"} overflow-y-auto rounded-2xl border border-border bg-card shadow-panel ${
        portalResults ? "" : embedded ? "inset-x-0" : "inset-x-3 sm:inset-x-6"
      }`}
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
  ) : null;

  return (
    <div
      ref={boxRef}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          !(nextTarget instanceof Node) ||
          (!boxRef.current?.contains(nextTarget) && !resultsRef.current?.contains(nextTarget))
        )
          closeSearch();
      }}
      className={`quick-search-container ${embedded ? "relative w-full" : "relative mx-auto mt-3 max-w-finder px-3 sm:px-6"}`}
      data-open={open || undefined}
    >
      <div
        ref={fieldRef}
        className={`quick-search-field flex items-center border border-border/80 bg-card/95 shadow-panel backdrop-blur-md ${
          compact ? "gap-1 rounded-xl p-0.5" : "gap-1.5 rounded-2xl p-1.5 sm:gap-2 sm:p-2"
        }`}
      >
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
          placeholder={placeholder ?? (service === "esim" ? copy.esimPlaceholder : copy.loungePlaceholder)}
          aria-label={service === "esim" ? copy.esimLabel : copy.loungeLabel}
          className={`${compact ? "h-10" : "h-12"} min-w-0 flex-1 border-0 bg-transparent px-3 text-base font-semibold shadow-none focus-visible:ring-0`}
        />
        {open && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`${compact ? "size-9 min-w-9" : "size-11 min-w-11"} shrink-0 rounded-lg`}
            aria-label={copy.close}
            onClick={() => closeSearch(true)}
          >
            <X className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          variant="default"
          size="icon"
          className={`${compact ? "size-9 min-w-9" : "size-11 min-w-11"} shrink-0 rounded-lg shadow-soft`}
          aria-label={copy.search}
          onClick={submit}
        >
          <Search className={compact ? "size-4" : "size-5"} />
        </Button>
      </div>
      {portalResults && results && typeof document !== "undefined"
        ? createPortal(results, document.body)
        : results}
    </div>
  );
}
