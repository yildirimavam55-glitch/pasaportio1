import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Gamepad2,
  Gauge,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Share2,
  Trash2,
  Users,
  Video,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { AirportPicker, CountryPicker } from "./EntityPicker";
import { ESIM_SERVICE_CONFIG } from "@/domain/experience/config";
import { getAirport } from "@/domain/geo/airports";
import { countryName, getCountry, getCountryByIso } from "@/domain/geo/countries";
import { isValidMultiRoute, moveStop, normalizeRouteStops, removeStop, routeFromPreset, stableStop } from "@/domain/experience/state";
import type { EsimFinderState, LoungeFinderState, UsageKind } from "@/domain/experience/types";
import type { Locale } from "@/domain/enums";
import { DEFAULT_USAGE_SETTINGS, recommendUsage } from "@/domain/esim/usage-recommendation";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import { CountryFlag } from "./CountryFlag";

const COPY = {
  tr: {
    tripMode: "Seyahatin nasıl?", single: "Tek destinasyon", multi: "Çoklu rota",
    where: "Nereye gidiyorsun?", chooseCountry: "Ülke seç", days: "Kaç gün?", dayUnit: "gün",
    travelers: "Kaç kişi?", personUnit: "kişi", usage: "İnterneti ne için kullanacaksın?",
    addCountry: "Ülke ekle", minRoute: "Çoklu rota için en az iki ülke seç.", duplicate: "Bu ülke rotanda zaten var.",
    edit: "Düzenle", done: "Tamam", countriesCount: (n: number) => `${n} ülke`, estimate: "Tahmini kullanım",
    recommended: "Sana önerilen paket",
    recommendReason: "Seçimlerine ve güvenlik payına göre önerildi.",
    seePackages: "Paketleri Gör",
    steps: ["Rota", "Süre", "Yolcular", "Kullanım"],
    airport: "Hangi havalimanı?", chooseAirport: "Havalimanı seç", date: "Hangi tarih?",
    situation: "Uçuş durumun", departure: "Kalkış", transit: "Aktarma", arrival: "Varış",
    loungeSteps: ["Havalimanı", "Tarih", "Uçuş", "Yolcular"], selectedAirport: "Seçilen havalimanı",
    loungeHint: "Uygun Lounge seçenekleri havalimanına göre listelenir.",
    moveUp: "Yukarı taşı", moveDown: "Aşağı taşı", remove: "Kaldır", route: "Rotan",
  },
  de: {
    tripMode: "Wie reist du?", single: "Ein Reiseziel", multi: "Mehrere Länder",
    where: "Wohin geht es?", chooseCountry: "Land wählen", days: "Wie viele Tage?", dayUnit: "Tage",
    travelers: "Wie viele Personen?", personUnit: "Pers.", usage: "Wofür nutzt du das Internet?",
    addCountry: "Land hinzufügen", minRoute: "Wähle mindestens zwei Länder für eine Route.", duplicate: "Dieses Land ist bereits in deiner Route.",
    edit: "Bearbeiten", done: "Fertig", countriesCount: (n: number) => `${n} Länder`, estimate: "Geschätzter Verbrauch",
    recommended: "Dein empfohlenes Paket",
    recommendReason: "Basierend auf deiner Auswahl und dem Sicherheitspuffer.",
    seePackages: "Pakete ansehen",
    steps: ["Route", "Dauer", "Personen", "Nutzung"],
    airport: "Welcher Flughafen?", chooseAirport: "Flughafen wählen", date: "Welches Datum?",
    situation: "Deine Flugsituation", departure: "Abflug", transit: "Transit", arrival: "Ankunft",
    loungeSteps: ["Flughafen", "Datum", "Flug", "Personen"], selectedAirport: "Gewählter Flughafen",
    loungeHint: "Passende Lounges werden je Flughafen angezeigt.",
    moveUp: "Nach oben", moveDown: "Nach unten", remove: "Entfernen", route: "Deine Route",
  },
  en: {
    tripMode: "How are you travelling?", single: "Single destination", multi: "Multi-country route",
    where: "Where are you going?", chooseCountry: "Select a country", days: "How many days?", dayUnit: "days",
    travelers: "How many people?", personUnit: "people", usage: "What will you use the internet for?",
    addCountry: "Add country", minRoute: "Choose at least two countries for a route.", duplicate: "This country is already in your route.",
    edit: "Edit", done: "Done", countriesCount: (n: number) => `${n} countries`, estimate: "Estimated usage",
    recommended: "Your recommended package",
    recommendReason: "Based on your choices and the safety margin.",
    seePackages: "See packages",
    steps: ["Route", "Duration", "Travelers", "Usage"],
    airport: "Which airport?", chooseAirport: "Select an airport", date: "Which date?",
    situation: "Your flight situation", departure: "Departure", transit: "Transit", arrival: "Arrival",
    loungeSteps: ["Airport", "Date", "Flight", "Travelers"], selectedAirport: "Selected airport",
    loungeHint: "Matching lounges are listed per airport.",
    moveUp: "Move up", moveDown: "Move down", remove: "Remove", route: "Your route",
  },
} satisfies Record<Locale, Record<string, unknown>>;

const USAGE_LABELS: Record<Locale, Record<UsageKind, string>> = {
  tr: { MESSAGING: "Mesajlaşma", SOCIAL: "Sosyal medya", MAPS: "Harita", VIDEO: "Video", WORK: "İş", GAMING: "Oyun", HOTSPOT: "Hotspot" },
  de: { MESSAGING: "Messaging", SOCIAL: "Social Media", MAPS: "Karten", VIDEO: "Video", WORK: "Arbeit", GAMING: "Gaming", HOTSPOT: "Hotspot" },
  en: { MESSAGING: "Messaging", SOCIAL: "Social media", MAPS: "Maps", VIDEO: "Video", WORK: "Work", GAMING: "Gaming", HOTSPOT: "Hotspot" },
};

const USAGE_ITEMS: Array<{ key: UsageKind; icon: React.ReactNode; tone: string }> = [
  { key: "MESSAGING", icon: <MessageCircle />, tone: "bg-primary-soft text-primary" },
  { key: "SOCIAL", icon: <Share2 />, tone: "bg-accent-soft text-foreground" },
  { key: "MAPS", icon: <MapPin />, tone: "bg-petrol-soft text-primary" },
  { key: "VIDEO", icon: <Video />, tone: "bg-cta-soft text-cta" },
  { key: "WORK", icon: <BriefcaseBusiness />, tone: "bg-sand-soft text-foreground" },
  { key: "GAMING", icon: <Gamepad2 />, tone: "bg-petrol-soft text-primary" },
  { key: "HOTSPOT", icon: <Wifi />, tone: "bg-primary-soft text-primary" },
];

export function FinderShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section id="finder" className="relative z-20 mx-auto mt-6 max-w-finder scroll-mt-24 px-3 sm:mt-8 sm:px-6">
      <div className="rounded-card border border-border/80 bg-card p-4 shadow-panel sm:p-7">
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function FinderStep({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><span className="mb-1.5 block text-sm font-semibold">{label}</span>{children}</div>;
}

export function FinderProgress({ labels, active }: { labels: string[]; active: number }) {
  return (
    <ol className="mb-4 grid grid-cols-4 gap-1">
      {labels.map((label, index) => (
        <li key={label} className="min-w-0">
          <span className={`block h-1 rounded-full ${index <= active ? "bg-primary" : "bg-muted"}`} />
          <span className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function FinderOptionCard({ selected, icon, title, detail, onClick, compact = false, iconClassName = "bg-secondary text-primary" }: { selected: boolean; icon: React.ReactNode; title: string; detail?: string; onClick: () => void; compact?: boolean; iconClassName?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex ${compact ? "min-h-15" : "min-h-18"} min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition ${selected ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4 [&_svg]:stroke-[1.8] ${iconClassName}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-xs leading-tight sm:text-sm">{title}</strong>
        {detail && <span className="mt-0.5 block text-[0.7rem] leading-tight text-muted-foreground">{detail}</span>}
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

/** Segmented single-choice control: the selected background and border are the only state signal. */
export function SegmentedChoice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ key: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-secondary/50 p-1">
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={`min-h-11 min-w-0 truncate rounded-lg border px-2 text-sm font-semibold transition ${selected ? "border-primary bg-accent-soft text-primary" : "border-transparent text-muted-foreground hover:bg-card"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FinderResultShell({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 rounded-xl bg-primary p-4 text-primary-foreground sm:flex sm:items-center sm:justify-between">{children}</div>;
}

function Stepper({ value, onChange, min = 1, max = 60, suffix, icon }: { value: number; onChange: (value: number) => void; min?: number; max?: number; suffix: string; icon: React.ReactNode }) {
  return (
    <div className="grid min-h-15 grid-cols-[2.75rem_1fr_2.75rem] items-center rounded-xl border border-border bg-secondary/60">
      <Button type="button" variant="ghost" size="icon" onClick={() => onChange(Math.max(min, value - 1))} aria-label="−"><Minus /></Button>
      <strong className="flex min-w-0 items-center justify-center gap-1.5 truncate text-center text-sm">{icon}{value} {suffix}</strong>
      <Button type="button" variant="ghost" size="icon" onClick={() => onChange(Math.min(max, value + 1))} aria-label="+"><Plus /></Button>
    </div>
  );
}

function PickerTrigger({ label, iso }: { label: string; iso?: string | undefined }) {
  return (
    <button type="button" className="flex min-h-15 w-full items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-left text-sm font-semibold">
      {iso && <CountryFlag iso={iso} className="text-lg" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

export function EsimFinder({ state, onChange }: { state: EsimFinderState; onChange: (state: EsimFinderState) => void }) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const copy = COPY[locale];
  const [routeError, setRouteError] = useState("");
  const [routeCollapsed, setRouteCollapsed] = useState(false);
  const preset = ESIM_SERVICE_CONFIG.routePresets[0];
  const stops = normalizeRouteStops(state.routeStops);
  const { data: settings } = useQuery({ queryKey: ["esim-usage-settings"], queryFn: () => getEsimUsageSettings(), staleTime: 5 * 60 * 1000 });

  const selectPreset = () => {
    if (!preset) return;
    onChange({ ...ESIM_SERVICE_CONFIG.initialState, tripMode: "multi", routeStops: routeFromPreset(preset), presetId: preset.id });
    setRouteError("");
    setRouteCollapsed(true);
  };
  const toggleUsage = (key: UsageKind) =>
    onChange({ ...state, usage: state.usage.includes(key) ? state.usage.filter((item) => item !== key) : [...state.usage, key] });

  const recommendation = recommendUsage({ days: state.days, usage: state.usage }, settings ?? DEFAULT_USAGE_SETTINGS);
  const selectedCountry = getCountry(state.destinationId);
  const usedCountryIds = stops.map((stop) => stop.countryId);
  const routeIsos = stops.map((stop) => stop.countryIso).join(",");
  const summaryLabel = state.tripMode === "single"
    ? [selectedCountry?.name[locale], `${state.days} ${copy.dayUnit}`].filter(Boolean).join(" · ")
    : [copy.countriesCount(stops.length), `${state.days} ${copy.dayUnit}`].join(" · ");
  const canSeePackages = state.tripMode === "single" ? Boolean(selectedCountry) : isValidMultiRoute(stops);

  const goToPackages = () =>
    void navigate({
      to: "/esim/paketler",
      search: {
        destination: state.tripMode === "single" ? (selectedCountry?.iso ?? "") : "",
        route: state.tripMode === "multi" ? routeIsos : "",
        days: state.days,
        travelers: state.travelers,
        estimated: recommendation.estimatedGb,
        recommended: recommendation.recommendedGb,
      },
    });

  return (
    <>
      <FinderProgress labels={copy.steps} active={state.usage.length ? 3 : 0} />
      <FinderStep label={copy.tripMode}>
        <div className="grid grid-cols-2 gap-2">
          <FinderOptionCard compact selected={state.tripMode === "single"} icon={<MapPin />} title={copy.single} onClick={() => onChange({ ...ESIM_SERVICE_CONFIG.initialState })} />
          <FinderOptionCard compact selected={state.tripMode === "multi"} icon={<Route />} title={copy.multi} onClick={() => onChange({ ...state, tripMode: "multi", destinationId: "" })} />
        </div>
      </FinderStep>

      {state.tripMode === "single" ? (
        <div className="mt-4">
          <FinderStep label={copy.where}>
            <CountryPicker
              valueId={state.destinationId}
              onSelect={(country) => onChange({ ...state, destinationId: country.id })}
              trigger={<div><PickerTrigger iso={selectedCountry?.iso} label={selectedCountry ? selectedCountry.name[locale] : copy.chooseCountry} /></div>}
            />
          </FinderStep>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {routeCollapsed && stops.length >= 2 ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3">
              <Route className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm">{state.presetId && preset ? preset.name[locale] : copy.route}</strong>
                <span className="block text-xs text-muted-foreground">{copy.countriesCount(stops.length)}</span>
                <span className="mt-1 block truncate text-sm" aria-hidden="true">{stops.map((stop) => getCountryByIso(stop.countryIso)?.flag ?? "").join(" → ")}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setRouteCollapsed(false)}><Pencil /> {copy.edit}</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {preset && (
                  <Button type="button" variant="secondary" onClick={selectPreset}><Route /> {preset.name[locale]}</Button>
                )}
                <CountryPicker
                  disabledIds={usedCountryIds}
                  onSelect={(country) => {
                    if (usedCountryIds.includes(country.id)) { setRouteError(copy.duplicate); return; }
                    setRouteError("");
                    onChange({ ...state, routeStops: normalizeRouteStops([...stops, stableStop(country.id, country.iso, stops.length)]) });
                  }}
                  trigger={<Button type="button" variant="outline"><Plus /> {copy.addCountry}</Button>}
                />
              </div>
              <ul className="space-y-1.5">
                {stops.map((stop, index) => {
                  const country = getCountryByIso(stop.countryIso);
                  return (
                    <li key={stop.id} className="grid min-h-15 grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-1 rounded-xl border border-border bg-secondary/50 px-2">
                      {country && <CountryFlag iso={country.iso} className="text-lg" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{countryName(stop.countryId, locale) || stop.countryIso}</span>
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => onChange({ ...state, routeStops: moveStop(stops, stop.id, -1) })} disabled={index === 0} aria-label={copy.moveUp}><ArrowUp /></Button>
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => onChange({ ...state, routeStops: moveStop(stops, stop.id, 1) })} disabled={index === stops.length - 1} aria-label={copy.moveDown}><ArrowDown /></Button>
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => onChange({ ...state, routeStops: removeStop(stops, stop.id) })} aria-label={copy.remove}><Trash2 /></Button>
                    </li>
                  );
                })}
              </ul>
              {!isValidMultiRoute(stops) && <p className="text-sm text-destructive">{copy.minRoute}</p>}
              {routeError && <p className="text-sm text-destructive">{routeError}</p>}
              {isValidMultiRoute(stops) && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setRouteCollapsed(true)}><Check /> {copy.done}</Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
        <FinderStep label={copy.days}><Stepper value={state.days} onChange={(days) => onChange({ ...state, days })} suffix={copy.dayUnit} icon={<CalendarDays className="size-4 shrink-0" />} /></FinderStep>
        <FinderStep label={copy.travelers}><Stepper value={state.travelers} onChange={(travelers) => onChange({ ...state, travelers })} max={9} suffix={copy.personUnit} icon={<Users className="size-4 shrink-0" />} /></FinderStep>
      </div>

      <div className="mt-4">
        <FinderStep label={copy.usage}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {USAGE_ITEMS.map((item) => (
              <FinderOptionCard compact key={item.key} selected={state.usage.includes(item.key)} icon={item.icon} iconClassName={item.tone} title={USAGE_LABELS[locale][item.key]} onClick={() => toggleUsage(item.key)} />
            ))}
          </div>
        </FinderStep>
      </div>

      <div className="mt-5 rounded-xl bg-primary p-4 text-primary-foreground">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase opacity-75">{copy.estimate}</span>
            <strong className="mt-1 flex items-center gap-2 text-xl"><Gauge className="size-5" aria-hidden="true" />~{recommendation.estimatedGb} GB</strong>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <span className="text-xs font-semibold uppercase opacity-75">{copy.recommended}</span>
            <strong className="mt-1 flex items-center gap-2 text-2xl"><ShieldCheck className="size-5" aria-hidden="true" />{recommendation.recommendedGb} GB</strong>
            {summaryLabel && <span className="mt-0.5 block text-sm opacity-80">{summaryLabel}</span>}
          </div>
        </div>
        <p className="mt-3 text-sm opacity-80">{copy.recommendReason}</p>
        <Button type="button" variant="cta" size="lg" className="mt-3 w-full sm:w-auto" disabled={!canSeePackages} onClick={goToPackages}>
          {copy.seePackages}
          <ArrowRight />
        </Button>
      </div>
    </>
  );
}

export function LoungeFinder({ state, onChange }: { state: LoungeFinderState; onChange: (state: LoungeFinderState) => void }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const airport = getAirport(state.airportId);

  return (
    <>
      <FinderProgress labels={copy.loungeSteps} active={state.travelers ? 3 : 0} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FinderStep label={copy.airport}>
          <AirportPicker
            valueId={state.airportId}
            onSelect={(next) => onChange({ ...state, airportId: next.id })}
            trigger={<div><PickerTrigger iso={airport?.countryIso} label={airport ? `${airport.iata} — ${airport.city[locale]}` : copy.chooseAirport} /></div>}
          />
        </FinderStep>
        <FinderStep label={copy.date}>
          <input
            type="date"
            value={state.date}
            onChange={(event) => onChange({ ...state, date: event.target.value })}
            className="min-h-15 w-full rounded-xl border border-input bg-secondary/60 px-3 text-sm"
            aria-label={copy.date}
          />
        </FinderStep>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FinderStep label={copy.situation}>
          <SegmentedChoice
            label={copy.situation}
            value={state.flightSituation}
            onChange={(flightSituation) => onChange({ ...state, flightSituation })}
            options={[
              { key: "DEPARTURE" as const, label: copy.departure },
              { key: "TRANSIT" as const, label: copy.transit },
              { key: "ARRIVAL" as const, label: copy.arrival },
            ]}
          />
        </FinderStep>
        <FinderStep label={copy.travelers}><Stepper value={state.travelers} onChange={(travelers) => onChange({ ...state, travelers })} max={9} suffix={copy.personUnit} icon={<Users className="size-4 shrink-0" />} /></FinderStep>
      </div>
      <FinderResultShell>
        <div>
          <span className="text-xs font-semibold uppercase opacity-75">{copy.selectedAirport}</span>
          <strong className="mt-1 flex items-center gap-2 text-xl">{airport ? <><CountryFlag iso={airport.countryIso} />{airport.iata} {airport.city[locale]}</> : "—"}</strong>
        </div>
        <span className="mt-3 block max-w-sm text-sm opacity-80 sm:mt-0">{copy.loungeHint}</span>
      </FinderResultShell>
    </>
  );
}
