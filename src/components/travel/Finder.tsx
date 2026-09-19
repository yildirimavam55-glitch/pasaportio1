import {
  ArrowDown,
  ArrowRight,
  ArrowRightLeft,
  ArrowUp,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Crown,
  Gamepad2,
  Gauge,
  Luggage,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Route,
  Search,
  Share2,
  ShoppingCart,
  Sofa,
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
import {
  isValidMultiRoute,
  moveStop,
  normalizeRouteStops,
  removeStop,
  routeFromPreset,
  stableStop,
} from "@/domain/experience/state";
import type {
  EsimFinderState,
  LoungeFinderState,
  UsageIntensity,
  UsageKind,
} from "@/domain/experience/types";
import type { Locale } from "@/domain/enums";
import { DEFAULT_USAGE_SETTINGS, estimateUsageNeed } from "@/domain/esim/usage-recommendation";
import { getEsimUsageSettings } from "@/lib/esim-settings.functions";
import { listEsimPackages } from "@/lib/esim-catalogue.functions";
import { resolveTieredRecommendation } from "@/domain/esim/package-matching";
import { activationNote } from "@/domain/esim/activation";

import { useCart } from "@/domain/cart/store";
import { CountryFlag } from "./CountryFlag";
import { Reveal } from "./Reveal";

const COPY = {
  tr: {
    tripMode: "Seyahatin nasıl?",
    single: "Tek destinasyon",
    multi: "Çoklu rota",
    where: "Nereye gidiyorsun?",
    chooseCountry: "Ülke seç",
    days: "Kaç gün?",
    dayUnit: "gün",
    travelers: "Kaç kişi?",
    personUnit: (count: number) => `${count} kişi`,
    usage: "İnterneti ne için kullanacaksın?",
    intensity: "Kullanım yoğunluğu",
    intensityLow: "Az",
    intensityNormal: "Normal",
    intensityHigh: "Yoğun",
    addCountry: "Ülke ekle",
    minRoute: "Çoklu rota için en az iki ülke seç.",
    duplicate: "Bu ülke rotanda zaten var.",
    edit: "Düzenle",
    done: "Tamam",
    countriesCount: (n: number) => `${n} ülke`,
    need: "TAHMİNİ KULLANIM",
    needReason: "Seçimlerine göre tahmini internet ihtiyacın:",
    seePackages: "Paketleri Gör",
    recommendedPackage: "SANA ÖNERİMİZ",
    recommendedBadge: "Önerilen",
    popularBadge: "En popüler",
    addToCart: "Sepete Ekle",
    inCart: "Sepette",
    selectPackage: "Paketi Seç",
    whyPackage: "Neden bu paket?",
    noPackage: "Bu seyahat için şu anda tam uygun bir paket bulunamadı.",
    shortWhy: "Seçimlerine göre tahmini ihtiyacını karşılayan paket.",
    scopeRegional: "Bu destinasyon bölgesel paket kapsamında.",
    scopeGlobal: "Bu destinasyon Global paket kapsamında.",
    validity: "gün geçerli",
    unlimited: "Sınırsız veri",
    unlimitedAlternative: "Sınırsız alternatif",
    noSufficient: "Bu seyahat için şu anda tam uygun bir paket bulunamadı.",
    allPackages: "Tüm paketleri gör",
    seePackage: (size: string) => `${size} Satın Al →`,
    details: "Paket detayları",

    loungeCta: "Lounge’ları ara",
    steps: ["Rota", "Süre", "Yolcular", "Kullanım"],
    airport: "Hangi havalimanı?",
    chooseAirport: "Havalimanı seç",
    date: "Tarih seç",
    situation: "Uçuş durumun",
    departure: "Kalkış",
    transit: "Aktarma",
    arrival: "Varış",
    loungeSteps: ["Havalimanı", "Tarih", "Uçuş", "Yolcular"],
    selectedAirport: "Seçilen havalimanı",
    loungeHint: "Uygun Lounge seçenekleri havalimanına göre listelenir.",
    loungeWhat: "Ne arıyorsun?",
    loungeComfort: "Rahat bekleme",
    loungePremium: "Premium deneyim",
    loungeLong: "Uzun aktarma",
    loungeRecommended: "Senin için önerilen lounge",
    loungeAll: "Tüm lounge’ları gör →",
    loungeBuy: (name: string) => `${name} Satın Al →`,
    loungeDetails: "Detayları gör",
    moveUp: "Yukarı taşı",
    moveDown: "Aşağı taşı",
    remove: "Kaldır",
    route: "Rotan",
  },
  de: {
    tripMode: "Wie reist du?",
    single: "Ein Reiseziel",
    multi: "Mehrere Länder",
    where: "Wohin geht es?",
    chooseCountry: "Land wählen",
    days: "Wie viele Tage?",
    dayUnit: "Tage",
    travelers: "Wie viele Personen?",
    personUnit: (count: number) => (count === 1 ? "1 Person" : `${count} Personen`),
    usage: "Wofür nutzt du das Internet?",
    intensity: "Nutzungsintensität",
    intensityLow: "Wenig",
    intensityNormal: "Normal",
    intensityHigh: "Viel",
    addCountry: "Land hinzufügen",
    minRoute: "Wähle mindestens zwei Länder für eine Route.",
    duplicate: "Dieses Land ist bereits in deiner Route.",
    edit: "Bearbeiten",
    done: "Fertig",
    countriesCount: (n: number) => `${n} Länder`,
    need: "Geschätzter Verbrauch",
    needReason: "Geschätzter Bedarf basierend auf deiner Auswahl:",
    seePackages: "Pakete ansehen",
    recommendedPackage: "Unsere Empfehlung",
    recommendedBadge: "Empfohlen",
    popularBadge: "Beliebt",
    addToCart: "In den Warenkorb",
    inCart: "Im Warenkorb",
    selectPackage: "Paket auswählen",
    whyPackage: "Warum dieses Paket?",
    noPackage: "Für diese Reise ist derzeit kein vollständig passendes Paket verfügbar.",
    shortWhy: "Passend zu deinem geschätzten Verbrauch.",
    scopeRegional: "Dieses Reiseziel ist von einem Regionalpaket abgedeckt.",
    scopeGlobal: "Dieses Reiseziel ist von einem Global-Paket abgedeckt.",
    validity: "Tage gültig",
    unlimited: "Unbegrenzte Daten",
    unlimitedAlternative: "Unbegrenzte Alternative",
    noSufficient: "Für diese Reise ist derzeit kein vollständig passendes Paket verfügbar.",
    allPackages: "Alle Pakete ansehen",
    seePackage: (size: string) => `${size} kaufen →`,
    details: "Paketdetails",

    loungeCta: "Lounges suchen",
    steps: ["Route", "Dauer", "Personen", "Nutzung"],
    airport: "Welcher Flughafen?",
    chooseAirport: "Flughafen wählen",
    date: "Datum wählen",
    situation: "Deine Flugsituation",
    departure: "Abflug",
    transit: "Umstieg",
    arrival: "Ankunft",
    loungeSteps: ["Flughafen", "Datum", "Flug", "Personen"],
    selectedAirport: "Gewählter Flughafen",
    loungeHint: "Passende Lounges werden je Flughafen angezeigt.",
    loungeWhat: "Was suchst du?",
    loungeComfort: "Gemütliches Warten",
    loungePremium: "Premium-Erlebnis",
    loungeLong: "Langer Umstieg",
    loungeRecommended: "Empfohlene Lounge für dich",
    loungeAll: "Alle Lounges →",
    loungeBuy: (name: string) => `${name} kaufen →`,
    loungeDetails: "Details ansehen",
    moveUp: "Nach oben",
    moveDown: "Nach unten",
    remove: "Entfernen",
    route: "Deine Route",
  },
  en: {
    tripMode: "How are you travelling?",
    single: "Single destination",
    multi: "Multi-country route",
    where: "Where are you going?",
    chooseCountry: "Select a country",
    days: "How many days?",
    dayUnit: "days",
    travelers: "How many people?",
    personUnit: (count: number) => (count === 1 ? "1 person" : `${count} people`),
    usage: "What will you use the internet for?",
    intensity: "Usage intensity",
    intensityLow: "Low",
    intensityNormal: "Normal",
    intensityHigh: "High",
    addCountry: "Add country",
    minRoute: "Choose at least two countries for a route.",
    duplicate: "This country is already in your route.",
    edit: "Edit",
    done: "Done",
    countriesCount: (n: number) => `${n} countries`,
    need: "Estimated usage",
    needReason: "Estimated need based on your selection:",
    seePackages: "See packages",
    recommendedPackage: "Our recommendation",
    recommendedBadge: "Recommended",
    popularBadge: "Popular",
    addToCart: "Add to cart",
    inCart: "In cart",
    selectPackage: "Select package",
    whyPackage: "Why this package?",
    noPackage: "No fully suitable package is available for this trip right now.",
    shortWhy: "Matches your estimated usage.",
    scopeRegional: "This destination is covered by a regional package.",
    scopeGlobal: "This destination is covered by a global package.",
    validity: "days valid",
    unlimited: "Unlimited data",
    unlimitedAlternative: "Unlimited alternative",
    noSufficient: "No fully suitable package is available for this trip right now.",
    allPackages: "See all packages",
    seePackage: (size: string) => `Buy ${size} →`,
    details: "Package details",

    loungeCta: "Find lounges",
    steps: ["Route", "Duration", "Travelers", "Usage"],
    airport: "Which airport?",
    chooseAirport: "Select an airport",
    date: "Select date",
    situation: "Your flight situation",
    departure: "Departure",
    transit: "Transit",
    arrival: "Arrival",
    loungeSteps: ["Airport", "Date", "Flight", "Travelers"],
    selectedAirport: "Selected airport",
    loungeHint: "Matching lounges are listed per airport.",
    loungeWhat: "What are you looking for?",
    loungeComfort: "Comfortable waiting",
    loungePremium: "Premium experience",
    loungeLong: "Long transit",
    loungeRecommended: "Recommended lounge for you",
    loungeAll: "See all lounges →",
    loungeBuy: (name: string) => `Buy ${name} →`,
    loungeDetails: "View details",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    route: "Your route",
  },
} satisfies Record<Locale, Record<string, unknown>>;

const USAGE_LABELS: Record<Locale, Record<UsageKind, string>> = {
  tr: {
    MESSAGING: "Mesajlaşma",
    SOCIAL: "Sosyal medya",
    MAPS: "Harita",
    VIDEO: "Video",
    WORK: "İş",
    GAMING: "Oyun",
    HOTSPOT: "Hotspot",
  },
  de: {
    MESSAGING: "Messaging",
    SOCIAL: "Social Media",
    MAPS: "Karten",
    VIDEO: "Video",
    WORK: "Arbeit",
    GAMING: "Gaming",
    HOTSPOT: "Hotspot",
  },
  en: {
    MESSAGING: "Messaging",
    SOCIAL: "Social media",
    MAPS: "Maps",
    VIDEO: "Video",
    WORK: "Work",
    GAMING: "Gaming",
    HOTSPOT: "Hotspot",
  },
};

const USAGE_ITEMS: Array<{ key: UsageKind; icon: React.ReactNode }> = [
  { key: "MESSAGING", icon: <MessageCircle /> },
  { key: "SOCIAL", icon: <Share2 /> },
  { key: "MAPS", icon: <MapPin /> },
  { key: "VIDEO", icon: <Video /> },
  { key: "WORK", icon: <BriefcaseBusiness /> },
  { key: "GAMING", icon: <Gamepad2 /> },
  { key: "HOTSPOT", icon: <Wifi /> },
];

export function FinderShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id="finder"
      className="relative z-20 mx-auto mt-4 max-w-finder scroll-mt-24 px-3 sm:mt-6 sm:px-6"
    >
      <div className="rounded-card border border-border/80 bg-card p-4 shadow-soft sm:p-6">
        <div className="mb-3">
          <h2 className="font-display text-lg font-bold sm:text-2xl">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function FinderStep({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground sm:text-sm">
        {label}
      </span>
      {children}
    </div>
  );
}

export function FinderProgress({ labels, active }: { labels: string[]; active: number }) {
  return (
    <ol className="mb-3 grid grid-cols-4 gap-1">
      {labels.map((label, index) => (
        <li key={label} className="min-w-0">
          <span
            className={`block h-1 rounded-full ${index <= active ? "bg-primary" : "bg-muted"}`}
          />
          <span className="mt-1 hidden truncate text-[0.65rem] text-muted-foreground sm:block sm:text-xs">
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FinderOptionCard({
  selected,
  icon,
  title,
  detail,
  onClick,
  compact = false,
  iconClassName = "bg-secondary text-primary",
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  onClick: () => void;
  compact?: boolean;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex ${compact ? "min-h-12" : "min-h-[3.25rem]"} min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition-colors ${selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-foreground hover:border-primary/50"}`}
    >
      <span
        className={`icon-box-sm rounded-lg ${selected ? "bg-card/70 text-primary" : iconClassName}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold leading-tight">{title}</strong>
        {detail && (
          <span className="mt-0.5 block text-[0.65rem] leading-tight text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

/** Segmented single-choice control with a calm mint-and-petrol selected state. */
export function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: Array<{
    key: T;
    label: string;
    icon?: React.ReactNode;
    iconWhenSelectedOnly?: boolean;
  }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1 ${className}`}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition-colors ${selected ? "border-primary bg-primary-soft text-primary" : "border-transparent bg-card/45 text-foreground hover:border-border hover:bg-card"}`}
          >
            {option.icon && (!option.iconWhenSelectedOnly || selected) && (
              <span className={`icon-slot-flight ${selected ? "text-primary" : "text-foreground"}`}>
                {option.icon}
              </span>
            )}
            <span className="min-w-0 truncate whitespace-nowrap leading-none">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
  max = 60,
  suffix,
  icon,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix: string | ((value: number) => string);
  icon: React.ReactNode;
}) {
  return (
    <div className="grid h-[3.25rem] min-h-[3.25rem] grid-cols-[2.25rem_1fr_2.25rem] items-center rounded-xl border border-border bg-secondary/60 sm:h-14 sm:grid-cols-[2.75rem_1fr_2.75rem]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-full rounded-none"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="−"
      >
        <Minus className="size-4" />
      </Button>
      <strong className="flex min-w-0 items-center justify-center gap-1.5 truncate text-center text-xs sm:text-sm">
        {icon}
        {typeof suffix === "function" ? suffix(value) : `${value} ${suffix}`}
      </strong>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-full rounded-none"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="+"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

function PickerTrigger({ label, iso }: { label: string; iso?: string | undefined }) {
  return (
    <button
      type="button"
      className="flex h-[3.25rem] min-h-[3.25rem] w-full items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-left text-sm font-semibold sm:h-14"
    >
      {iso && <CountryFlag iso={iso} className="text-lg" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function CompactChip({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border px-2.5 text-sm font-semibold transition-colors sm:min-h-12 sm:px-3 ${selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-secondary/40 text-foreground hover:border-primary/50"}`}
    >
      <span
        className={`icon-slot-flight rounded-lg ${selected ? "bg-card/70 text-primary" : "text-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">{label}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  );
}

export function EsimFinder({
  state,
  onChange,
}: {
  state: EsimFinderState;
  onChange: (state: EsimFinderState) => void;
}) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const copy = COPY[locale];
  const [routeError, setRouteError] = useState("");
  const [routeCollapsed, setRouteCollapsed] = useState(false);
  const preset = ESIM_SERVICE_CONFIG.routePresets[0];
  const stops = normalizeRouteStops(state.routeStops);
  const { data: settings } = useQuery({
    queryKey: ["esim-usage-settings"],
    queryFn: () => getEsimUsageSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const selectPreset = () => {
    if (!preset) return;
    onChange({
      ...ESIM_SERVICE_CONFIG.initialState,
      tripMode: "multi",
      routeStops: routeFromPreset(preset),
      presetId: preset.id,
    });
    setRouteError("");
    setRouteCollapsed(true);
  };
  const toggleUsage = (key: UsageKind) =>
    onChange({
      ...state,
      usage: state.usage.includes(key)
        ? state.usage.filter((item) => item !== key)
        : [...state.usage, key],
    });

  const recommendation = estimateUsageNeed(
    { days: state.days, usage: state.usage, intensity: state.intensity },
    settings ?? DEFAULT_USAGE_SETTINGS,
  );
  const selectedCountry = getCountry(state.destinationId);
  const usedCountryIds = stops.map((stop) => stop.countryId);
  const routeIsos = stops.map((stop) => stop.countryIso).join(",");
  const canSeePackages =
    state.tripMode === "single" ? Boolean(selectedCountry) : isValidMultiRoute(stops);

  const coverageIsos =
    state.tripMode === "single"
      ? selectedCountry
        ? [selectedCountry.iso]
        : []
      : stops.map((stop) => stop.countryIso);
  const { data: packages = [], isPending: packagesPending } = useQuery({
    queryKey: ["esim-packages", coverageIsos.join(",")],
    queryFn: () => listEsimPackages({ data: { coverageIsos } }),
    enabled: canSeePackages,
  });
  const match = canSeePackages
    ? resolveTieredRecommendation(packages, {
        requiredGb: recommendation.requiredGb,
        coverageIsos,
        days: state.days,
      })
    : ({ status: "NO_CATALOGUE", scope: null, recommended: null } as const);
  const recommended = match.recommended;
  const scopeNote =
    match.scope === "REGION"
      ? copy.scopeRegional
      : match.scope === "GLOBAL"
        ? copy.scopeGlobal
        : "";
  const { lines, addLine } = useCart();
  const recommendedInCart = Boolean(
    recommended && lines.some((line) => line.productId === recommended.id),
  );

  const goToPackages = () =>
    void navigate({
      to: "/esim/paketler",
      search: {
        destination: state.tripMode === "single" ? (selectedCountry?.iso ?? "") : "",
        route: state.tripMode === "multi" ? routeIsos : "",
        days: state.days,
        travelers: state.travelers,
        estimated: recommendation.estimatedGb,
        required: recommendation.requiredGb,
        recommended: recommended?.dataGb ?? 0,
        recommendedProductId: recommended?.id ?? "",
        usage: state.usage.join(","),
        intensity: state.intensity,
      },
    });

  const dynamicTitle =
    state.tripMode === "single" && selectedCountry
      ? `${selectedCountry.name[locale]} için eSIM bul`
      : copy.where;

  return (
    <>
      <FinderProgress labels={copy.steps} active={state.usage.length ? 3 : 0} />

      <FinderStep label={copy.tripMode}>
        <SegmentedChoice
          label={copy.tripMode}
          value={state.tripMode}
          onChange={(tripMode) => onChange({ ...ESIM_SERVICE_CONFIG.initialState, tripMode })}
          options={[
            {
              key: "single" as const,
              label: copy.single,
              icon: <Check className="size-4" />,
              iconWhenSelectedOnly: true,
            },
            { key: "multi" as const, label: copy.multi },
          ]}
          className="grid-cols-2"
        />
      </FinderStep>

      {state.tripMode === "single" ? (
        <div className="mt-3">
          <FinderStep label={dynamicTitle}>
            <CountryPicker
              valueId={state.destinationId}
              onSelect={(country) => onChange({ ...state, destinationId: country.id })}
              trigger={
                <div>
                  <PickerTrigger
                    iso={selectedCountry?.iso}
                    label={selectedCountry ? selectedCountry.name[locale] : copy.chooseCountry}
                  />
                </div>
              }
            />
          </FinderStep>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {routeCollapsed && stops.length >= 2 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 p-2.5">
              <Route className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm">
                  {state.presetId && preset ? preset.name[locale] : copy.route}
                </strong>
                <span className="block text-xs text-muted-foreground">
                  {copy.countriesCount(stops.length)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRouteCollapsed(false)}
              >
                <Pencil className="size-3.5" /> {copy.edit}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {preset && (
                  <Button type="button" variant="secondary" size="sm" onClick={selectPreset}>
                    <Route className="size-3.5" /> {preset.name[locale]}
                  </Button>
                )}
                <CountryPicker
                  disabledIds={usedCountryIds}
                  onSelect={(country) => {
                    if (usedCountryIds.includes(country.id)) {
                      setRouteError(copy.duplicate);
                      return;
                    }
                    setRouteError("");
                    onChange({
                      ...state,
                      routeStops: normalizeRouteStops([
                        ...stops,
                        stableStop(country.id, country.iso, stops.length),
                      ]),
                    });
                  }}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="size-3.5" /> {copy.addCountry}
                    </Button>
                  }
                />
              </div>
              <ul className="space-y-1.5">
                {stops.map((stop, index) => {
                  const country = getCountryByIso(stop.countryIso);
                  return (
                    <li
                      key={stop.id}
                      className="grid h-12 min-h-[3rem] grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-1 rounded-xl border border-border bg-secondary/50 px-2"
                    >
                      {country && <CountryFlag iso={country.iso} className="text-lg" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {countryName(stop.countryId, locale) || stop.countryIso}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() =>
                          onChange({ ...state, routeStops: moveStop(stops, stop.id, -1) })
                        }
                        disabled={index === 0}
                        aria-label={copy.moveUp}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() =>
                          onChange({ ...state, routeStops: moveStop(stops, stop.id, 1) })
                        }
                        disabled={index === stops.length - 1}
                        aria-label={copy.moveDown}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() =>
                          onChange({ ...state, routeStops: removeStop(stops, stop.id) })
                        }
                        aria-label={copy.remove}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              {!isValidMultiRoute(stops) && (
                <p className="text-xs text-destructive sm:text-sm">{copy.minRoute}</p>
              )}
              {routeError && <p className="text-xs text-destructive sm:text-sm">{routeError}</p>}
              {isValidMultiRoute(stops) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRouteCollapsed(true)}
                >
                  <Check className="size-3.5" /> {copy.done}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
        <FinderStep label={copy.days}>
          <Stepper
            value={state.days}
            onChange={(days) => onChange({ ...state, days })}
            suffix={copy.dayUnit}
            icon={<CalendarDays className="size-4 shrink-0" />}
          />
        </FinderStep>
        <FinderStep label={copy.travelers}>
          <Stepper
            value={state.travelers}
            onChange={(travelers) => onChange({ ...state, travelers })}
            max={9}
            suffix={copy.personUnit}
            icon={<Users className="size-4 shrink-0" />}
          />
        </FinderStep>
      </div>

      <div className="mt-3">
        <FinderStep label={copy.usage}>
          <SegmentedChoice<UsageIntensity>
            label={copy.intensity}
            value={state.intensity}
            onChange={(intensity) => onChange({ ...state, intensity })}
            options={[
              { key: "LOW" as const, label: copy.intensityLow },
              { key: "NORMAL" as const, label: copy.intensityNormal },
              { key: "HIGH" as const, label: copy.intensityHigh },
            ]}
          />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {USAGE_ITEMS.map((item) => (
              <CompactChip
                key={item.key}
                selected={state.usage.includes(item.key)}
                icon={item.icon}
                label={USAGE_LABELS[locale][item.key]}
                onClick={() => toggleUsage(item.key)}
              />
            ))}
          </div>
        </FinderStep>
      </div>

      <div className="mt-3 flex h-[7.5rem] items-center justify-between gap-4 rounded-3xl bg-primary px-4 py-3 text-primary-foreground sm:h-28">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-foreground/12 sm:size-11">
            <Gauge className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block text-[0.65rem] font-bold uppercase tracking-wide opacity-85 sm:text-xs">
              {copy.need}
            </span>
            <span className="mt-0.5 block text-xs opacity-80 sm:text-sm">{copy.needReason}</span>
          </div>
        </div>
        <strong className="shrink-0 font-display text-3xl font-bold sm:text-4xl">
          ~{recommendation.requiredGb}
          <span className="text-lg sm:text-xl">GB</span>
        </strong>
      </div>

      <Reveal className="recommendation-reveal mt-3">
        <section
          className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-foreground"
          aria-label={copy.recommendedPackage}
        >
          {packagesPending && canSeePackages ? (
            <div className="space-y-3" aria-label={copy.recommendedPackage} aria-busy="true">
              <div className="h-3 w-32 animate-pulse rounded bg-primary/15" />
              <div className="h-8 w-52 animate-pulse rounded bg-primary/15" />
              <div className="h-5 w-40 animate-pulse rounded bg-primary/15" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-primary/15" />
            </div>
          ) : recommended ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[0.65rem] font-bold uppercase tracking-wide text-primary sm:text-xs">
                    {match.status === "UNLIMITED_ALTERNATIVE"
                      ? copy.unlimitedAlternative
                      : copy.recommendedPackage}
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                    {recommended.unlimited ? copy.unlimited : `${recommended.dataGb} GB`}
                  </h3>
                  {recommended.validityDays ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {recommended.validityDays} {copy.validity}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-bold text-primary">
                  {copy.recommendedBadge}
                </span>
              </div>
              {recommended.salePrice != null && (
                <strong className="mt-3 block font-display text-3xl">
                  {new Intl.NumberFormat(
                    locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB",
                    { style: "currency", currency: recommended.currency },
                  ).format(recommended.salePrice)}
                </strong>
              )}
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.shortWhy}</p>
              {scopeNote && <p className="mt-1 text-sm text-muted-foreground">{scopeNote}</p>}
              {activationNote(recommended.activationPolicy, locale) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {activationNote(recommended.activationPolicy, locale)}
                </p>
              )}
              {recommended.unlimited && recommended.fairUseNote && (
                <p className="mt-1 text-xs text-muted-foreground">{recommended.fairUseNote}</p>
              )}

              <Button
                type="button"
                variant="cta"
                size="lg"
                className="mt-4 h-12 w-full text-sm"
                onClick={goToPackages}
              >
                {copy.seePackage(
                  recommended.unlimited ? copy.unlimited : `${recommended.dataGb} GB`,
                )}
                <ArrowRight className="size-4" />
              </Button>
              {recommended.salePrice != null && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="mt-2 h-12 w-full text-sm"
                  disabled={recommendedInCart}
                  onClick={() =>
                    addLine({
                      productId: recommended.id,
                      providerProductId: recommended.providerProductId,
                      serviceType: "ESIM",
                      name: recommended.name,
                      meta: recommended.unlimited ? copy.unlimited : `${recommended.dataGb} GB`,
                      price: recommended.salePrice,
                      currency: recommended.currency,
                      dataGb: recommended.dataGb,
                      validityDays: recommended.validityDays,
                      coverage: recommended.coverage,
                    })
                  }
                >
                  <ShoppingCart className="size-4" />{" "}
                  {recommendedInCart ? copy.inCart : copy.addToCart}
                </Button>
              )}
            </>
          ) : (
            <div>
              <span className="text-[0.65rem] font-bold uppercase tracking-wide text-primary sm:text-xs">
                {copy.recommendedPackage}
              </span>
              <h3 className="mt-1 font-display text-xl font-bold">
                {match.status === "NO_SUFFICIENT" ? copy.noSufficient : copy.noPackage}
              </h3>
            </div>
          )}
          {!packagesPending && !recommended && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3 h-12 w-full scroll-mb-24 text-sm"
              disabled={!canSeePackages}
              onClick={goToPackages}
            >
              {copy.allPackages}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </section>
      </Reveal>
    </>
  );
}

type LoungePreference = "COMFORT" | "PREMIUM" | "LONG_TRANSIT";

const LOUNGE_PREFERENCE_OPTIONS: Array<{
  key: LoungePreference;
  icon: React.ReactNode;
  tone: string;
}> = [
  { key: "COMFORT", icon: <Sofa />, tone: "" },
  { key: "PREMIUM", icon: <Crown />, tone: "" },
  { key: "LONG_TRANSIT", icon: <Luggage />, tone: "" },
];

export function LoungeFinder({
  state,
  onChange,
}: {
  state: LoungeFinderState;
  onChange: (state: LoungeFinderState) => void;
}) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const airport = getAirport(state.airportId);
  const [preference, setPreference] = useState<LoungePreference>("COMFORT");
  const [showMockResult, setShowMockResult] = useState(false);

  const goToLoungeOptions = () => {
    if (!airport) return;
    setShowMockResult(true);
  };

  const preferenceLabel = (key: LoungePreference) =>
    key === "COMFORT"
      ? copy.loungeComfort
      : key === "PREMIUM"
        ? copy.loungePremium
        : copy.loungeLong;

  // Data-driven mock lounge object. Provider-ready: replace with API response.
  const mockLounge = airport
    ? {
        id: "mock-iga-ist",
        providerId: "mock-provider",
        airportCode: airport.iata,
        airportName: airport.airport[locale],
        city: airport.city[locale],
        country: countryName(airport.countryIso, locale),
        terminal:
          locale === "tr"
            ? "Dış hatlar · Terminal 1"
            : locale === "de"
              ? "International · Terminal 1"
              : "International · Terminal 1",
        name: "iGA Lounge",
        description:
          locale === "tr"
            ? "Rahat koltuklar, ücretsiz Wi-Fi ve yiyecek/içecek seçenekleri"
            : locale === "de"
              ? "Bequeme Sitzplätze, kostenloses WLAN und Speisen/Getränke"
              : "Comfortable seating, free Wi-Fi and food/drink options",
        image: "",
        amenities: ["WIFI", "FOOD", "DRINKS", "CHARGING", "QUIET"],
        accessDuration: 180,
        currency: "EUR",
        price: 29.99,
        rating: 4.8,
        reviewCount: 1240,
        availability: true,
      }
    : null;

  return (
    <>
      <FinderProgress labels={copy.loungeSteps} active={state.travelers ? 3 : 0} />
      <FinderStep label={copy.airport}>
        <AirportPicker
          valueId={state.airportId}
          onSelect={(next) => {
            onChange({ ...state, airportId: next.id });
            setShowMockResult(false);
          }}
          trigger={
            <div>
              <PickerTrigger
                iso={airport?.countryIso}
                label={airport ? `${airport.iata} — ${airport.city[locale]}` : copy.chooseAirport}
              />
            </div>
          }
        />
      </FinderStep>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4">
        <FinderStep label={copy.date}>
          <input
            type="date"
            value={state.date}
            onChange={(event) => onChange({ ...state, date: event.target.value })}
            className="h-[3.25rem] min-h-[3.25rem] w-full rounded-xl border border-input bg-secondary/60 px-3 text-sm sm:h-14"
            aria-label={copy.date}
          />
        </FinderStep>
        <FinderStep label={copy.travelers}>
          <Stepper
            value={state.travelers}
            onChange={(travelers) => onChange({ ...state, travelers })}
            max={9}
            suffix={copy.personUnit}
            icon={<Users className="size-4 shrink-0" />}
          />
        </FinderStep>
      </div>

      <div className="mt-3">
        <FinderStep label={copy.situation}>
          <SegmentedChoice
            label={copy.situation}
            value={state.flightSituation}
            onChange={(flightSituation) => onChange({ ...state, flightSituation })}
            options={[
              {
                key: "DEPARTURE" as const,
                label: copy.departure,
                icon: <PlaneTakeoff className="size-[16px] shrink-0" aria-hidden="true" />,
              },
              {
                key: "TRANSIT" as const,
                label: copy.transit,
                icon: <ArrowRightLeft className="size-[16px] shrink-0" aria-hidden="true" />,
              },
              {
                key: "ARRIVAL" as const,
                label: copy.arrival,
                icon: <PlaneLanding className="size-[16px] shrink-0" aria-hidden="true" />,
              },
            ]}
          />
        </FinderStep>
      </div>

      <div className="mt-3">
        <FinderStep label={copy.loungeWhat}>
          <div className="grid grid-cols-3 gap-2">
            {LOUNGE_PREFERENCE_OPTIONS.map((option) => (
              <CompactChip
                key={option.key}
                selected={preference === option.key}
                icon={option.icon}
                label={preferenceLabel(option.key)}
                onClick={() => setPreference(option.key)}
              />
            ))}
          </div>
        </FinderStep>
      </div>

      <Button
        type="button"
        variant="default"
        size="lg"
        className="mt-4 h-14 w-full text-sm font-bold"
        disabled={!airport}
        onClick={goToLoungeOptions}
      >
        <Search className="size-4" /> {copy.loungeCta}
      </Button>

      {showMockResult && mockLounge && (
        <Reveal className="mt-3">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {copy.loungeRecommended}
                </span>
                <h3 className="mt-1 font-display text-lg font-bold sm:text-xl">
                  {mockLounge.name}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                ★ {mockLounge.rating}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mockLounge.airportName} ({mockLounge.airportCode})
            </p>
            <p className="text-xs text-muted-foreground">{mockLounge.terminal}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {mockLounge.amenities.slice(0, 5).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-secondary px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground sm:text-xs"
                >
                  {amenity}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">{copy.travelers}</span>
                <strong className="block font-display text-xl">
                  €{mockLounge.price.toFixed(2)}
                </strong>
              </div>
              <Button variant="cta" size="sm">
                {copy.loungeBuy(mockLounge.name)}
              </Button>
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full">
              {copy.loungeDetails}
            </Button>
          </section>
        </Reveal>
      )}
    </>
  );
}
