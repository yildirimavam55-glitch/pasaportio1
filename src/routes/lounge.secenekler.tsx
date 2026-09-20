import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  PlaneLanding,
  PlaneTakeoff,
  ArrowRightLeft,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import {
  CheckoutPausedNote,
  ServicePausedState,
  useServiceAvailability,
} from "@/components/travel/ServiceAvailability";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { getAirportByIata } from "@/domain/geo/airports";
import { useCart } from "@/domain/cart/store";
import { listLoungeOptions, type LoungeOption } from "@/lib/lounge-catalogue.functions";
import type { Locale } from "@/domain/enums";
import loungeImage from "@/assets/lounge-card.jpg.asset.json";

const searchSchema = z.object({
  airport: z.string().max(40).catch("").default(""),
  iata: z.string().max(3).catch("").default(""),
  date: z.string().max(10).catch("").default(""),
  situation: z.enum(["DEPARTURE", "TRANSIT", "ARRIVAL"]).catch("DEPARTURE").default("DEPARTURE"),
  travelers: z.coerce.number().int().min(1).max(9).catch(1).default(1),
});

const COPY = {
  tr: {
    title: "Lounge seçenekleri",
    back: "Finder’a dön",
    lead: "Seçimine uyan yayınlanmış Lounge seçenekleri.",
    travelers: "kişi",
    stay: "dk kalış",
    terminal: "Terminal",
    perPerson: "kişi başı",
    total: "toplam",
    select: "Lounge’u Seç",
    empty: "Bu havalimanı için şu anda yayınlanmış Lounge seçeneği bulunmuyor.",
    changeAirport: "Havalimanını değiştir",
    goToCart: "Sepete git",
    departure: "Kalkış",
    transit: "Aktarma",
    arrival: "Varış",
    recommended: "Önerilen Lounge",
    other: "Diğer Lounge’lar",
    buy: "Satın Al",
    reserve: "Rezerve et",
  },
  de: {
    title: "Lounge-Optionen",
    back: "Zurück zum Finder",
    lead: "Veröffentlichte Lounges passend zu deiner Auswahl.",
    travelers: "Pers.",
    stay: "Min. Aufenthalt",
    terminal: "Terminal",
    perPerson: "pro Person",
    total: "gesamt",
    select: "Lounge wählen",
    empty: "Für diesen Flughafen ist derzeit keine Lounge veröffentlicht.",
    changeAirport: "Flughafen ändern",
    goToCart: "Zum Warenkorb",
    departure: "Abflug",
    transit: "Umstieg",
    arrival: "Ankunft",
    recommended: "Empfohlene Lounge",
    other: "Weitere Lounges",
    buy: "Kaufen",
    reserve: "Reservieren",
  },
  en: {
    title: "Lounge options",
    back: "Back to finder",
    lead: "Published lounges matching your selection.",
    travelers: "people",
    stay: "min stay",
    terminal: "Terminal",
    perPerson: "per person",
    total: "total",
    select: "Select lounge",
    empty: "No lounge is currently published for this airport.",
    changeAirport: "Change airport",
    goToCart: "Go to cart",
    departure: "Departure",
    transit: "Transit",
    arrival: "Arrival",
    recommended: "Recommended Lounge",
    other: "Other Lounges",
    buy: "Buy",
    reserve: "Reserve",
  },
} satisfies Record<Locale, Record<string, string>>;

const AMENITY_LABELS: Record<Locale, Record<string, string>> = {
  tr: {
    WIFI: "Wi-Fi",
    FOOD: "Yemek",
    SNACKS: "Atıştırmalık",
    DRINKS: "İçecek",
    CHARGING: "Şarj",
    QUIET: "Sessiz alan",
  },
  de: {
    WIFI: "WLAN",
    FOOD: "Essen",
    SNACKS: "Snacks",
    DRINKS: "Getränke",
    CHARGING: "Laden",
    QUIET: "Ruhebereich",
  },
  en: {
    WIFI: "Wi-Fi",
    FOOD: "Food",
    SNACKS: "Snacks",
    DRINKS: "Drinks",
    CHARGING: "Charging",
    QUIET: "Quiet area",
  },
};

export const Route = createFileRoute("/lounge/secenekler")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Lounge seçenekleri | travely" },
      {
        name: "description",
        content: "Havalimanı, tarih ve uçuş durumuna göre yayınlanmış Lounge seçeneklerini gör.",
      },
      { property: "og:title", content: "Lounge seçenekleri | travely" },
      { property: "og:description", content: "Uçuşuna uygun Lounge seçeneklerini karşılaştır." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoungeOptionsPage,
});

function LoungeOptionsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const navigate = useNavigate();
  const search = Route.useSearch();
  const airport = getAirportByIata(search.iata);
  const availability = useServiceAvailability();
  const { lines, addLine } = useCart();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(search.travelers);
  const { data: options = [], isPending } = useQuery({
    queryKey: ["lounge-options", search.iata, search.situation],
    queryFn: () => listLoungeOptions({ data: { iata: search.iata, situation: search.situation } }),
  });

  const selectedOption = options.find((option) => option.id === selectedId) ?? null;
  const selectedInCart = Boolean(
    selectedOption && lines.some((line) => line.productId === selectedOption.id),
  );
  const situationIcon =
    search.situation === "TRANSIT" ? (
      <ArrowRightLeft className="size-4 text-primary" />
    ) : search.situation === "ARRIVAL" ? (
      <PlaneLanding className="size-4 text-primary" />
    ) : (
      <PlaneTakeoff className="size-4 text-primary" />
    );
  const situationLabel =
    search.situation === "TRANSIT"
      ? copy.transit
      : search.situation === "ARRIVAL"
        ? copy.arrival
        : copy.departure;

  if (!availability.isPending && !availability.lounge.storefront) {
    return (
      <PublicShell activeService="lounge">
        <ServicePausedState service="lounge" />
      </PublicShell>
    );
  }

  return (
    <PublicShell activeService="lounge">
      <section className="mx-auto max-w-site px-4 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-8 md:pb-8">
        <Link
          to="/lounge"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" /> {copy.back}
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.lead}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border/70 bg-secondary/55 p-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            {airport && <CountryFlag iso={airport.countryIso} />}
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {search.iata || "—"} {airport ? airport.city[locale] : ""}
          </span>
          {search.date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {search.date}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            {situationIcon}
            {situationLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 text-primary" aria-hidden="true" />
            {search.travelers} {copy.travelers}
          </span>
        </div>

        {isPending ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-44 animate-pulse rounded-card bg-secondary" />
            ))}
          </div>
        ) : options.length ? (
          <div className="mt-5">
            <h2 className="text-xs font-bold uppercase text-primary">{copy.recommended}</h2>
            <div className="mt-2">
              {options.slice(0, 1).map((option) => (
                <LoungeCard
                  key={option.id}
                  option={option}
                  featured
                  travelers={search.travelers}
                  selected={selectedId === option.id}
                  onSelect={() => setSelectedId(option.id)}
                  copy={copy}
                  locale={locale}
                  search={search}
                />
              ))}
            </div>
            {options.length > 1 && (
              <>
                <h2 className="mt-7 font-display text-xl font-bold">{copy.other}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {options.slice(1).map((option) => (
                    <LoungeCard
                      key={option.id}
                      option={option}
                      featured={false}
                      travelers={search.travelers}
                      selected={selectedId === option.id}
                      onSelect={() => setSelectedId(option.id)}
                      copy={copy}
                      locale={locale}
                      search={search}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">{copy.empty}</p>
            <div className="mt-4 flex justify-center">
              <Link to="/lounge">
                <Button variant="secondary">{copy.changeAirport}</Button>
              </Link>
            </div>
          </div>
        )}

        {selectedOption && (
          <div className="mobile-purchase-bar fixed inset-x-0 z-40 border-t border-border/80 bg-card/98 p-3 shadow-nav backdrop-blur md:static md:mt-6 md:rounded-2xl md:border">
            <div className="mx-auto flex max-w-site items-center gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {selectedOption.loungeName ?? selectedOption.name}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {quantity} {copy.travelers} ·{" "}
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: selectedOption.currency,
                  }).format((selectedOption.salePrice ?? 0) * quantity)}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg bg-secondary/60 p-1">
                <Button type="button" variant="ghost" size="icon" className="size-8 bg-card" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="−">
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-5 text-center text-sm font-bold">{quantity}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8 bg-card" disabled={quantity >= 9} onClick={() => setQuantity((value) => Math.min(9, value + 1))} aria-label="+">
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button
                variant="cta"
                size="lg"
                className="shrink-0"
                onClick={() => {
                  if (selectedInCart) {
                    void navigate({ to: "/sepet" });
                    return;
                  }
                  addLine({
                    productId: selectedOption.id,
                    serviceType: "LOUNGE",
                    name: selectedOption.loungeName ?? selectedOption.name,
                    meta: "",
                    price: selectedOption.salePrice || 0,
                    currency: selectedOption.currency,
                    quantity,
                    isTest: selectedOption.isTest,
                    airport: selectedOption.iata,
                    terminal: selectedOption.terminal,
                    date: search.date || null,
                    situation: search.situation,
                  });
                  void navigate({ to: "/sepet" });
                }}
              >
                {selectedInCart ? copy.goToCart : copy.reserve}
              </Button>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}

function LoungeCard({
  option,
  featured,
  travelers,
  copy,
  locale,
  search,
  selected,
  onSelect,
}: {
  option: LoungeOption;
  featured: boolean;
  travelers: number;
  copy: (typeof COPY)["tr"];
  locale: Locale;
  search: { date: string; situation: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const { lines, addLine } = useCart();
  const availability = useServiceAvailability();
  const inCart = lines.some((line) => line.productId === option.id);
  const price = option.salePrice ?? 0;
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: option.currency }).format(
      value,
    );

  return (
    <article
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-colors ${featured ? "p-5 sm:max-w-xl" : "min-h-44 p-4"} ${selected ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border bg-card"} shadow-soft`}
    >
      {featured && (
        <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden">
          <img src={loungeImage.url} alt="" loading="lazy" className="size-full object-cover" />
          <div className="absolute inset-0 bg-image-scrim" />
          <span className="absolute bottom-3 left-3 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary">
            {copy.recommended}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <strong className="font-display text-lg">{option.loungeName ?? option.name}</strong>
        {option.isTest && (
          <span className="shrink-0 rounded-full border border-primary px-2 py-0.5 text-xs font-bold text-primary">
            TEST
          </span>
        )}
      </div>
      <span className="mt-0.5 text-sm text-muted-foreground">
        {option.iata}
        {option.terminal ? ` · ${copy.terminal} ${option.terminal}` : ""}
      </span>
      {option.maxStayMinutes != null && (
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock3 className="size-4 text-primary" aria-hidden="true" />
          {option.maxStayMinutes} {copy.stay}
        </span>
      )}
      {option.amenities.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {option.amenities.slice(0, featured ? 6 : 2).map((amenity) => (
            <li
              key={amenity}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              <Check className="size-3 text-primary" />
              {AMENITY_LABELS[locale][amenity] ?? amenity}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <strong className="block text-xl">
          {money(price)}{" "}
          <span className="text-sm font-medium text-muted-foreground">/ {copy.perPerson}</span>
        </strong>
        {travelers > 1 && (
          <span className="text-sm text-muted-foreground">
            {money(price * travelers)} {copy.total}
          </span>
        )}
      </div>
      {availability.lounge.checkout && featured ? (
        <Button
          variant="cta"
          className={`mt-4 h-12 w-full ${!selected && !featured ? "hidden md:inline-flex" : ""}`}
          disabled={inCart && selected}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
            if (inCart) return;
            addLine({
              productId: option.id,
              serviceType: "LOUNGE",
              name: option.loungeName ?? option.name,
              meta: "",
              price,
              currency: option.currency,
              quantity: travelers,
              isTest: option.isTest,
              airport: option.iata,
              terminal: option.terminal,
              date: search.date || null,
              situation: search.situation,
            });
          }}
        >
          {inCart ? copy.goToCart : copy.select}
        </Button>
      ) : (
        <CheckoutPausedNote service="lounge" className="mt-3" />
      )}
      {inCart && (
        <Link to="/sepet" className="mt-2 block text-center text-sm font-semibold text-primary">
          {copy.goToCart}
        </Link>
      )}
    </article>
  );
}
