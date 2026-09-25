import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CalendarCheck, Headphones, LockKeyhole, Search, Sofa } from "lucide-react";
import { CartBar, HeroField, heroInputClass, HowItWorks, money, PhotoCard, PhotoRail, pick, PromoCard, SectionTitle, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import esimPromo from "@/assets/esim-cross-sell.jpg.asset.json";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getAirport, getAirportByIata, POPULAR_AIRPORT_IDS, searchAirports } from "@/domain/geo/airports";
import { listLoungeOptions, type LoungeOption } from "@/lib/lounge-catalogue.functions";
import heroImage from "@/assets/lounge-hero-mobile.jpg";

const searchSchema = z.object({ iata: z.string().max(3).catch("").default("") });

export const Route = createFileRoute("/design-v2/lounge")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Lounge — Design V2 preview" },
      { name: "description", content: "Internal lounge design preview." },
      { property: "og:title", content: "Lounge — Design V2 preview" },
      { property: "og:description", content: "Internal lounge design preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...V2_NOINDEX,
    ],
  }),
  component: LoungeV2,
});

const T = {
  tr: { h: "Havalimanında daha fazla konfor.", q: "Hangi havalimanından uçuyorsun?", ph: "Havalimanı ara, örn. IST", picker: "Havalimanı seç", empty: "Eşleşen havalimanı bulunamadı.", popular: "Popüler havalimanları", select: "Seç", added: "Eklendi", cart: "Sepete git", none: "Bu havalimanı için şu anda yayınlanmış Lounge yok.", back: "Başka havalimanı", terminal: "Terminal", stay: "dk kalış", access: "Lounge erişimi", online: "Online rezervasyon", pay: "Kolay seçim", support: "WhatsApp destek", from: "başlayan", promo: "Yurt dışında bağlantıda kal.", promoSub: "Seyahatin için eSIM al.", how: "Nasıl çalışır?", steps: [{ t: "Havalimanı seç", s: "Lounge seçeneklerini gör." }, { t: "Sepete ekle", s: "Yayınlanmış seçeneğini ekle." }, { t: "Hesabından takip et", s: "Rezervasyon bilgilerini gör." }] },
  de: { h: "Mehr Komfort am Flughafen.", q: "Von welchem Flughafen fliegst du?", ph: "Flughafen, z. B. IST", picker: "Flughafen wählen", empty: "Kein passender Flughafen gefunden.", popular: "Beliebte Flughäfen", select: "Wählen", added: "Hinzugefügt", cart: "Zum Warenkorb", none: "Für diesen Flughafen gibt es aktuell keine Lounge.", back: "Anderer Flughafen", terminal: "Terminal", stay: "Min. Aufenthalt", access: "Lounge-Zugang", online: "Online buchen", pay: "Einfache Auswahl", support: "WhatsApp-Support", from: "ab", promo: "Im Ausland verbunden bleiben.", promoSub: "eSIM für deine Reise.", how: "So funktioniert’s", steps: [{ t: "Flughafen wählen", s: "Lounges ansehen." }, { t: "In den Warenkorb", s: "Verfügbare Option hinzufügen." }, { t: "Im Konto verfolgen", s: "Buchungsdetails ansehen." }] },
  en: { h: "More comfort at the airport.", q: "Which airport are you flying from?", ph: "Search airport, e.g. IST", picker: "Choose airport", empty: "No matching airport found.", popular: "Popular airports", select: "Select", added: "Added", cart: "Go to cart", none: "No published lounges at this airport right now.", back: "Other airport", terminal: "Terminal", stay: "min stay", access: "Lounge access", online: "Book online", pay: "Easy choice", support: "WhatsApp support", from: "from", promo: "Stay connected abroad.", promoSub: "Get an eSIM for your trip.", how: "How it works", steps: [{ t: "Pick an airport", s: "See lounge options." }, { t: "Add to cart", s: "Add a published option." }, { t: "Track in account", s: "See booking details." }] },
};

function LoungeV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const { iata } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { count } = useCart();
  const matches = useMemo(() => searchAirports(query, 40), [query]);
  const airport = iata ? getAirportByIata(iata) : undefined;
  const choose = (code: string) => {
    setQuery("");
    setPickerOpen(false);
    void navigate({ search: { iata: code } });
  };

  return (
    <V2Shell service="lounge">
      <V2Hero image={heroImage} eyebrow="Lounge" title={c.h} subtitle={c.q}>
        <HeroField icon={<Search className="size-5" />}>
          <V2PickerSheet
            open={pickerOpen}
            onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }}
            title={c.picker}
            searchLabel={c.ph}
            query={query}
            onQueryChange={setQuery}
            selectedId={airport?.iata}
            emptyLabel={c.empty}
            items={matches.map((item) => ({ id: item.iata, label: `${item.city[locale]} (${item.iata})`, detail: item.airport[locale], leading: <CountryFlag iso={item.countryIso} className="h-4 w-6 rounded-sm" /> }))}
            onSelect={choose}
          >
            <Button type="button" variant="ghost" className={`${heroInputClass} justify-start font-normal hover:bg-transparent`}>
              <span className="truncate">{airport ? `${airport.city[locale]} (${airport.iata})` : c.ph}</span>
            </Button>
          </V2PickerSheet>
        </HeroField>
      </V2Hero>

      {airport ? (
        <Lounges iata={airport.iata} title={`${airport.iata} · ${airport.airport[locale]}`} c={c} onBack={() => void navigate({ search: { iata: "" } })} />
      ) : (
        <>
          <TrustRow
            items={[
              { icon: <Sofa className="size-6" />, label: c.access },
              { icon: <CalendarCheck className="size-6" />, label: c.online },
              { icon: <LockKeyhole className="size-6" />, label: c.pay },
              { icon: <Headphones className="size-6" />, label: c.support },
            ]}
          />
          <PopularAirports c={c} onPick={choose} />
          <PromoCard image={esimPromo.url} title={c.promo} sub={c.promoSub} to="/design-v2/esim" />
          <HowItWorks title={c.how} steps={c.steps} />
        </>
      )}
      <CartBar count={count} label={c.cart} />
    </V2Shell>
  );
}

function PopularAirports({ c, onPick }: { c: (typeof T)["tr"]; onPick: (iata: string) => void }) {
  const { locale } = useI18n();
  const airports = POPULAR_AIRPORT_IDS.flatMap((id) => {
    const a = getAirport(id);
    return a ? [a] : [];
  }).slice(0, 8);
  const results = useQueries({
    queries: airports.map((a) => ({
      queryKey: ["v2-lounges", a.iata],
      queryFn: () => listLoungeOptions({ data: { iata: a.iata, situation: "DEPARTURE" as const } }),
      staleTime: 5 * 60_000,
    })),
  });
  return (
    <>
      <SectionTitle>{c.popular}</SectionTitle>
      <PhotoRail>
        {airports.map((a, i) => {
          const prices = (results[i]?.data ?? []).flatMap((o) => (o.salePrice != null ? [{ v: o.salePrice, cur: o.currency }] : []));
          const min = prices.sort((x, y) => x.v - y.v)[0];
          return (
            <PhotoCard
              key={a.iata}
              image={countryPhotoRegistry[a.countryIso]?.cardImage}
              title={a.city[locale]}
              sub={`(${a.iata})`}
              price={min ? `${c.from} ${money(min.v, min.cur)}` : undefined}
              onClick={() => onPick(a.iata)}
            />
          );
        })}
      </PhotoRail>
    </>
  );
}

function Lounges({ iata, title, c, onBack }: { iata: string; title: string; c: (typeof T)["tr"]; onBack: () => void }) {
  const { lines, addLine } = useCart();
  const { data = [], isLoading } = useQuery({
    queryKey: ["v2-lounges", iata],
    queryFn: () => listLoungeOptions({ data: { iata, situation: "DEPARTURE" } }),
  });
  const add = (o: LoungeOption) =>
    addLine({
      productId: o.id,
      serviceType: "LOUNGE",
      name: o.loungeName ?? o.name,
      meta: [o.iata, o.terminal].filter(Boolean).join(" · "),
      price: o.salePrice,
      currency: o.currency,
      airport: o.iata,
      terminal: o.terminal,
      situation: "DEPARTURE",
      isTest: o.isTest,
    });
  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        <button type="button" onClick={onBack} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-primary">{c.back}</button>
      </div>
      {isLoading ? (
        <div className="mt-3 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : data.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((o) => {
            const inCart = lines.some((l) => l.productId === o.id);
            return (
              <li key={o.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <p className="font-display text-base font-semibold text-foreground">{o.loungeName ?? o.name}</p>
                <p className="text-xs text-muted-foreground">
                  {o.terminal ? `${c.terminal} ${o.terminal}` : ""}
                  {o.maxStayMinutes ? ` · ${o.maxStayMinutes} ${c.stay}` : ""}
                </p>
                {o.amenities.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {o.amenities.slice(0, 4).map((a) => (
                      <li key={a} className="rounded-full bg-sand-soft px-2.5 py-1 text-xs font-medium text-foreground">{a}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">{o.salePrice != null ? money(o.salePrice, o.currency) : ""}</span>
                  <button type="button" onClick={() => add(o)} className={`min-h-11 min-w-24 rounded-full px-4 text-sm font-semibold ${inCart ? "bg-accent-soft text-primary" : "bg-primary text-primary-foreground"}`}>
                    {inCart ? c.added : c.select}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
