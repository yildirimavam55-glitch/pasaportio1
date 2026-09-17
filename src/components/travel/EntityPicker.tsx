import { Check, Plane, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import {
  POPULAR_COUNTRIES,
  REGION_LABELS,
  countriesByRegion,
  getCountry,
  searchCountries,
  type Country,
  type GeoRegion,
} from "@/domain/geo/countries";
import { AIRPORTS, POPULAR_AIRPORT_IDS, getAirport, searchAirports, type Airport } from "@/domain/geo/airports";
import { CountryFlag } from "./CountryFlag";

const PICKER_COPY = {
  countryTitle: { tr: "Ülke seç", de: "Land wählen", en: "Select a country" },
  countryPlaceholder: { tr: "Ülke adı veya kodu ara", de: "Land oder Code suchen", en: "Search by country or code" },
  airportTitle: { tr: "Havalimanı seç", de: "Flughafen wählen", en: "Select an airport" },
  airportPlaceholder: { tr: "Şehir, havalimanı veya IATA ara", de: "Stadt, Flughafen oder IATA suchen", en: "Search city, airport or IATA" },
  popular: { tr: "Popüler", de: "Beliebt", en: "Popular" },
  empty: { tr: "Sonuç bulunamadı.", de: "Keine Treffer.", en: "No results." },
  choose: { tr: "Seç", de: "Wählen", en: "Choose" },
} as const;

function Row({ selected, onSelect, iso, title, meta }: { selected: boolean; onSelect: () => void; iso: string; title: string; meta?: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left transition ${selected ? "bg-primary-soft" : "hover:bg-secondary"}`}
    >
      <CountryFlag iso={iso} className="text-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

export function CountryPicker({
  valueId,
  onSelect,
  trigger,
  disabledIds = [],
}: {
  valueId?: string | null;
  onSelect: (country: Country) => void;
  trigger: React.ReactNode;
  disabledIds?: string[];
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blocked = useMemo(() => new Set(disabledIds), [disabledIds]);
  const results = useMemo(() => searchCountries(query).filter((country) => !blocked.has(country.id)), [query, blocked]);
  const showGroups = query.trim().length === 0;

  const pick = (country: Country) => {
    onSelect(country);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[94vw] max-w-lg flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogTitle className="text-base">{PICKER_COPY.countryTitle[locale]}</DialogTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={PICKER_COPY.countryPlaceholder[locale]}
            aria-label={PICKER_COPY.countryTitle[locale]}
            className="h-12 pl-9"
          />
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{PICKER_COPY.empty[locale]}</p>}
          {showGroups ? (
            <>
              <Group label={PICKER_COPY.popular[locale]}>
                {POPULAR_COUNTRIES.filter((country) => !blocked.has(country.id)).map((country) => (
                  <Row key={country.id} selected={country.id === valueId} onSelect={() => pick(country)} iso={country.iso} title={country.name[locale]} meta={country.iso} />
                ))}
              </Group>
              {(Object.keys(REGION_LABELS) as GeoRegion[]).map((region) => (
                <Group key={region} label={REGION_LABELS[region][locale]}>
                  {countriesByRegion(region)
                    .filter((country) => !blocked.has(country.id))
                    .map((country) => (
                       <Row key={country.id} selected={country.id === valueId} onSelect={() => pick(country)} iso={country.iso} title={country.name[locale]} meta={country.iso} />
                    ))}
                </Group>
              ))}
            </>
          ) : (
            results.map((country) => (
              <Row key={country.id} selected={country.id === valueId} onSelect={() => pick(country)} iso={country.iso} title={country.name[locale]} meta={`${country.iso} · ${country.name.en}`} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

export function AirportPicker({ valueId, onSelect, trigger }: { valueId?: string | null; onSelect: (airport: Airport) => void; trigger: React.ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchAirports(query), [query]);
  const showPopular = query.trim().length === 0;
  const popular = POPULAR_AIRPORT_IDS.flatMap((id) => {
    const airport = getAirport(id);
    return airport ? [airport] : [];
  });

  const pick = (airport: Airport) => {
    onSelect(airport);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] w-[94vw] max-w-lg flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Plane className="size-4" aria-hidden="true" />
          {PICKER_COPY.airportTitle[locale]}
        </DialogTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={PICKER_COPY.airportPlaceholder[locale]}
            aria-label={PICKER_COPY.airportTitle[locale]}
            className="h-12 pl-9"
          />
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {results.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{PICKER_COPY.empty[locale]}</p>}
          {showPopular && (
            <Group label={PICKER_COPY.popular[locale]}>
              {popular.map((airport) => (
                <Row key={airport.id} selected={airport.id === valueId} onSelect={() => pick(airport)} iso={airport.countryIso} title={`${airport.iata} — ${airport.city[locale]}`} meta={airport.airport[locale]} />
              ))}
            </Group>
          )}
          {(showPopular ? AIRPORTS : results).map((airport) => (
            <Row key={`all-${airport.id}`} selected={airport.id === valueId} onSelect={() => pick(airport)} iso={airport.countryIso} title={`${airport.iata} — ${airport.city[locale]}`} meta={airport.airport[locale]} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { getCountry, getAirport };
