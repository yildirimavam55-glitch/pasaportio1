import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CalendarCheck, Headphones, LockKeyhole, Search, Sofa } from "lucide-react";
import { CartBar, HeroField, heroInputClass, HowItWorks, money, PhotoCard, PhotoRail, pick, PromoCard, SectionTitle, TrustRow, V2Hero, V2Shell, V2_NOINDEX } from "@/components/design-v2/V2Shell";
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
  tr: { h: "Havalimanında daha fazla konfor.", q: "Hangi havalimanından uçuyorsun?", ph: "Havalimanı ara (örn. IST, FRA, DXB)", popular: "Popüler havalimanları", select: "Seç", added: "Eklendi", cart: "Sepete git", none: "Bu havalimanı için şu anda yayınlanmış Lounge yok.", back: "Başka havalimanı", terminal: "Terminal", stay: "dk kalış", access: "Lounge erişimi", online: "Online rezervasyon", pay: "Güvenli ödeme", support: "7/24 destek", from: "başlayan", promo: "Yurt dışında bağlantıda kal.", promoSub: "Seyahatin için eSIM al.", how: "Nasıl çalışır?", steps: [{ t: "Havalimanı seç", s: "Lounge seçeneklerini gör." }, { t: "Online al", s: "Güvenli ödeme." }, { t: "Onayını göster", s: "Girişte rezervasyonunu göster." }] },
  de: { h: "Mehr Komfort am Flughafen.", q: "Von welchem Flughafen fliegst du?", ph: "Flughafen suchen (z. B. IST, FRA, DXB)", popular: "Beliebte Flughäfen", select: "Wählen", added: "Hinzugefügt", cart: "Zum Warenkorb", none: "Für diesen Flughafen gibt es aktuell keine Lounge.", back: "Anderer Flughafen", terminal: "Terminal", stay: "Min. Aufenthalt", access: "Lounge-Zugang", online: "Online buchen", pay: "Sichere Zahlung", support: "24/7 Support", from: "ab", promo: "Im Ausland verbunden bleiben.", promoSub: "eSIM für deine Reise.", how: "So funktioniert’s", steps: [{ t: "Flughafen wählen", s: "Lounges ansehen." }, { t: "Online kaufen", s: "Sichere Zahlung." }, { t: "Bestätigung zeigen", s: "Am Eingang vorzeigen." }] },
  en: { h: "More comfort at the airport.", q: "Which airport are you flying from?", ph: "Search airport (e.g. IST, FRA, DXB)", popular: "Popular airports", select: "Select", added: "Added", cart: "Go to cart", none: "No published lounges at this airport right now.", back: "Other airport", terminal: "Terminal", stay: "min stay", access: "Lounge access", online: "Book online", pay: "Secure payment", support: "24/7 support", from: "from", promo: "Stay connected abroad.", promoSub: "Get an eSIM for your trip.", how: "How it works", steps: [{ t: "Pick an airport", s: "See lounge options." }, { t: "Buy online", s: "Secure payment." }, { t: "Show confirmation", s: "Show it at the entrance." }] },
};

function LoungeV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const { iata } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const { count } = useCart();
  const matches = useMemo(() => (query.trim() ? searchAirports(query, 6) : []), [query]);
  const airport = iata ? getAirportByIata(iata) : undefined;
  const choose = (code: string) => {
    setQuery("");
    void navigate({ search: { iata: code } });
  };

  return (
    <V2Shell service="lounge">
      <V2Hero image={heroImage} eyebrow="Lounge" title={c.h} subtitle={c.q}>
        <HeroField icon={<Search className="size-5" />}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.ph} aria-label={c.ph} className={heroInputClass} />
        </HeroField>
        {matches.length > 0 && (
          <ul className="absolute inset-x-4 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-card text-foreground shadow-lg ring-1 ring-border">
            {matches.map((a) => (
              <li key={a.iata}>
                <button type="button" onClick={() => choose(a.iata)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium hover:bg-muted">
                  <span className="w-10 font-bold text-primary">{a.iata}</span>
                  {a.airport[locale]}
                </button>
              </li>
            ))}
          </ul>
        )}
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
