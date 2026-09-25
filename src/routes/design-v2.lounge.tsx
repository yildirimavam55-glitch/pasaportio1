import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { CartBar, HeroField, heroInputClass, money, PhotoCard, PhotoRail, pick, SectionTitle, useV2StickySearch, V2Hero, V2Shell, V2StickySearchButton, V2_NOINDEX } from "@/components/design-v2/V2Shell";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { countryPhotoRegistry } from "@/components/travel/countryPhotos";
import { useI18n } from "@/i18n";
import { useCart } from "@/domain/cart/store";
import { getAirportByIata, searchAirports } from "@/domain/geo/airports";
import { listLoungeOptions, type LoungeOption } from "@/lib/lounge-catalogue.functions";
import { mediaUrl, useV2Page, V2Sections, v2PageQuery } from "@/components/design-v2/V2Sections";
import { v2Text, type V2Section } from "@/domain/storefront/v2";
import { V2ProductSelectionCard, V2SelectedProductSummary } from "@/components/design-v2/V2ProductSelection";

const searchSchema = z.object({ iata: z.string().max(3).catch("").default("") });

export const Route = createFileRoute("/design-v2/lounge")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("lounge")),
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
  tr: { h: "Havalimanında daha fazla konfor.", q: "Hangi havalimanından uçuyorsun?", ph: "Havalimanı ara, örn. IST", picker: "Havalimanı seç", empty: "Eşleşen havalimanı bulunamadı.", popular: "Popüler havalimanları", select: "Sepete ekle", added: "Sepette", cart: "Sepete git", decrease: "Azalt", increase: "Artır", none: "Bu havalimanı için henüz Lounge seçeneği yok.", back: "Başka havalimanı", terminal: "Terminal", stay: "dk kalış", access: "Havalimanı keşfi", online: "Kolay arama", pay: "Net müsaitlik", support: "WhatsApp destek", from: "başlayan", promo: "Yurt dışında bağlantıda kal.", promoSub: "Seyahatin için eSIM al.", vignette: "Avrupa yollarına hazırlan", vignetteSub: "Vinyet hizmetinin durumunu gör.", info: "Lounge hizmeti nasıl çalışacak?", infoItems: [{ title: "Havalimanını bul", text: "Şehir, havalimanı adı veya IATA koduyla arama yap." }, { title: "Gerçek seçenekleri gör", text: "Yalnızca yayınlanmış Lounge teklifleri ve gerçek fiyatları gösterilir." }, { title: "Seçeneğini incele", text: "Terminal ve kalış bilgileri yalnız mevcut teklifte yer alıyorsa görünür." }, { title: "Hesabından takip et", text: "Rezervasyon bilgileri, hizmet aktif olduğunda hesabında yer alır." }], how: "Nasıl çalışır?", steps: [{ t: "Havalimanı seç", s: "Yayınlanmış seçenekleri ara." }, { t: "Seçeneği incele", s: "Gerçek detay ve fiyatı gör." }, { t: "Hesabından takip et", s: "Rezervasyon bilgilerini gör." }], faq: "Lounge hakkında sık sorulanlar", questions: [["Lounge nedir?", "Lounge, yayınlanmış teklifte belirtilen koşullarla kullanılabilen havalimanı bekleme alanıdır."], ["Hangi havalimanlarında Lounge var?", "Aramada yalnız sistemde bulunan havalimanları listelenir; gerçek yayınlanmış teklif yoksa bunu açıkça gösteririz."], ["Rezervasyon nasıl yapılır?", "Gerçek bir teklif bulunduğunda detay ve fiyatı inceleyip seçebilirsin. Rezervasyon bilgileri hizmet aktif olduğunda hesabında görünür."], ["Hangi hizmetler dahil?", "Yalnızca seçilen gerçek teklifte belirtilen terminal, kalış ve olanak bilgileri geçerlidir."], ["Şu anda seçenek yoksa ne olur?", "Sahte Lounge veya fiyat göstermeyiz; ilgili havalimanı için dürüst boş durum gösterilir."]] },
  de: { h: "Mehr Komfort am Flughafen.", q: "Von welchem Flughafen fliegst du?", ph: "Flughafen, z. B. IST", picker: "Flughafen wählen", empty: "Kein passender Flughafen gefunden.", popular: "Beliebte Flughäfen", select: "In den Warenkorb", added: "Im Warenkorb", cart: "Zum Warenkorb", decrease: "Weniger", increase: "Mehr", none: "Für diesen Flughafen gibt es noch keine Lounge-Option.", back: "Anderer Flughafen", terminal: "Terminal", stay: "Min. Aufenthalt", access: "Flughafensuche", online: "Einfache Suche", pay: "Klare Verfügbarkeit", support: "WhatsApp-Support", from: "ab", promo: "Im Ausland verbunden bleiben.", promoSub: "eSIM für deine Reise.", vignette: "Bereit für Europas Straßen", vignetteSub: "Status des Vignettenangebots ansehen.", info: "Wie wird der Lounge-Service funktionieren?", infoItems: [{ title: "Flughafen finden", text: "Suche nach Stadt, Flughafenname oder IATA-Code." }, { title: "Echte Optionen sehen", text: "Nur veröffentlichte Lounge-Angebote und echte Preise werden angezeigt." }, { title: "Option prüfen", text: "Terminal- und Aufenthaltsdaten erscheinen nur, wenn das Angebot sie enthält." }, { title: "Im Konto verfolgen", text: "Buchungsdaten erscheinen im Konto, sobald der Service aktiv ist." }], how: "So funktioniert’s", steps: [{ t: "Flughafen wählen", s: "Veröffentlichte Optionen suchen." }, { t: "Option prüfen", s: "Echte Details und Preise sehen." }, { t: "Im Konto verfolgen", s: "Buchungsdetails ansehen." }], faq: "Häufige Fragen zu Lounges", questions: [["Was ist eine Lounge?", "Eine Lounge ist ein Wartebereich am Flughafen, der unter den Bedingungen des veröffentlichten Angebots genutzt werden kann."], ["An welchen Flughäfen gibt es Lounges?", "Die Suche zeigt vorhandene Flughäfen. Gibt es kein echtes veröffentlichtes Angebot, wird dies klar angezeigt."], ["Wie reserviere ich?", "Wenn ein echtes Angebot verfügbar ist, kannst du Details und Preis prüfen. Buchungsdaten erscheinen im Konto, sobald der Service aktiv ist."], ["Welche Leistungen sind enthalten?", "Es gelten nur Terminal-, Aufenthalts- und Ausstattungsangaben des ausgewählten echten Angebots."], ["Was passiert, wenn nichts verfügbar ist?", "Wir zeigen keine erfundenen Lounges oder Preise, sondern einen ehrlichen Leerzustand."]] },
  en: { h: "More comfort at the airport.", q: "Which airport are you flying from?", ph: "Search airport, e.g. IST", picker: "Choose airport", empty: "No matching airport found.", popular: "Popular airports", select: "Add to cart", added: "In cart", cart: "Go to cart", decrease: "Decrease", increase: "Increase", none: "There is no Lounge option for this airport yet.", back: "Other airport", terminal: "Terminal", stay: "min stay", access: "Airport discovery", online: "Easy search", pay: "Clear availability", support: "WhatsApp support", from: "from", promo: "Stay connected abroad.", promoSub: "Get an eSIM for your trip.", vignette: "Get ready for Europe's roads", vignetteSub: "Check the status of Vignette service.", info: "How will Lounge booking work?", infoItems: [{ title: "Find your airport", text: "Search by city, airport name, or IATA code." }, { title: "See real options", text: "Only published Lounge offers and real prices will be shown." }, { title: "Review the option", text: "Terminal and stay details appear only when included in the offer." }, { title: "Track it in your account", text: "Booking information will appear in your account when the service is active." }], how: "How it works", steps: [{ t: "Pick an airport", s: "Search published options." }, { t: "Review the option", s: "See real details and price." }, { t: "Track in account", s: "See booking details." }], faq: "Frequently asked Lounge questions", questions: [["What is a Lounge?", "A Lounge is an airport waiting area available under the conditions of a published offer."], ["Which airports have Lounges?", "The search lists airports in the system. If there is no real published offer, the empty state says so clearly."], ["How do I book?", "When a real offer is available, you can review its details and price. Booking details appear in your account when the service is active."], ["What is included?", "Only the terminal, stay, and amenity details provided by the selected real offer apply."], ["What if nothing is available?", "We do not show invented Lounges or prices; an honest empty state is displayed instead."]] },
};

function LoungeV2() {
  const { locale } = useI18n();
  const c = pick(locale, T);
  const { iata } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { heroSearchRef, heroSearchVisible } = useV2StickySearch();
  const { config, media } = useV2Page("lounge");
  const heroSection = config.sections[0];
  const stickyLabel = v2Text(heroSection, "sticky", locale) || v2Text(heroSection, "placeholder", locale) || c.ph;
  const { lines, addLine, updateQuantity, count } = useCart();
  const [selectedOffer, setSelectedOffer] = useState<LoungeOption | null>(null);
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const matches = useMemo(() => searchAirports(query, 40), [query]);
  const airport = iata ? getAirportByIata(iata) : undefined;
  const choose = (code: string) => {
    setSelectedOffer(null);
    setSelectionQuantity(1);
    setQuery("");
    setPickerOpen(false);
    void navigate({ search: { iata: code } });
  };
  const selectedCartLine = selectedOffer ? lines.find((line) => line.productId === selectedOffer.id) : undefined;
  const selectOffer = (offer: LoungeOption) => {
    setSelectedOffer(offer);
    setSelectionQuantity(lines.find((line) => line.productId === offer.id)?.quantity ?? 1);
  };
  const addSelectedOffer = () => {
    if (!selectedOffer || selectedCartLine) return;
    addLine({ productId: selectedOffer.id, serviceType: "LOUNGE", name: selectedOffer.loungeName ?? selectedOffer.name, meta: [selectedOffer.iata, selectedOffer.terminal].filter(Boolean).join(" · "), price: selectedOffer.salePrice, currency: selectedOffer.currency, quantity: selectionQuantity, airport: selectedOffer.iata, terminal: selectedOffer.terminal, situation: "DEPARTURE", isTest: selectedOffer.isTest });
  };
  const summary = selectedOffer ? <V2SelectedProductSummary title={selectedOffer.loungeName ?? selectedOffer.name} subtitle={[selectedOffer.iata, selectedOffer.terminal ? `${c.terminal} ${selectedOffer.terminal}` : null].filter(Boolean).join(" · ")} price={money(selectedOffer.salePrice ?? 0, selectedOffer.currency)} quantity={selectedCartLine?.quantity ?? selectionQuantity} inCart={Boolean(selectedCartLine)} addLabel={c.select} addedLabel={c.added} cartLabel={c.cart} decreaseLabel={c.decrease} increaseLabel={c.increase} whatsappLabel={c.support} onQuantityChange={(quantity) => selectedCartLine ? updateQuantity(selectedCartLine.productId, quantity) : setSelectionQuantity(quantity)} onAdd={addSelectedOffer} /> : undefined;

  return (
    <V2Shell service="lounge" commerceSelection={Boolean(selectedOffer)} purchaseSummary={summary} stickySearch={!airport ? <V2StickySearchButton heroSearchVisible={heroSearchVisible} label={stickyLabel} onOpen={() => setPickerOpen(true)} /> : undefined}>

      <V2Sections
        config={config}
        media={media}
        {...(airport ? { only: (section: V2Section) => section.type === "SEARCH_HERO" } : {})}
        slots={{
          hero: (section) => (
      <V2Hero image={mediaUrl(section.mobileMediaId ?? section.mediaId, media) ?? ""} desktopImage={mediaUrl(section.mediaId, media)} eyebrow={v2Text(section, "eyebrow", locale)} title={v2Text(section, "title", locale)} subtitle={v2Text(section, "subtitle", locale)} align={section.align} height={section.height} overlay={section.overlay}>
        <div ref={heroSearchRef}><HeroField icon={<Search className="size-5" />}>
          <V2PickerSheet
            open={pickerOpen}
            onOpenChange={(open) => { setPickerOpen(open); if (!open) setQuery(""); }}
            title={c.picker}
            searchLabel={c.ph}
            query={query}
            onQueryChange={setQuery}
            {...(airport ? { selectedId: airport.iata } : {})}
            emptyLabel={c.empty}
            items={matches.map((item) => ({ id: item.iata, label: `${item.city[locale]} (${item.iata})`, detail: item.airport[locale], leading: <CountryFlag iso={item.countryIso} className="h-4 w-6 rounded-sm" /> }))}
            onSelect={choose}
          >
            <Button type="button" variant="ghost" className={`${heroInputClass} justify-start font-normal hover:bg-transparent`}>
              <span className="truncate">{airport ? `${airport.city[locale]} (${airport.iata})` : v2Text(section, "placeholder", locale) || c.ph}</span>
            </Button>
          </V2PickerSheet>
        </HeroField></div>
      </V2Hero>
          ),
          destinations: (section) => <PopularAirports c={c} section={section} onPick={choose} />,
        }}
      />
      {airport && <>
        <Lounges iata={airport.iata} title={`${airport.iata} · ${airport.airport[locale]}`} c={c} selectedOffer={selectedOffer} onSelect={selectOffer} onBack={() => { setSelectedOffer(null); void navigate({ search: { iata: "" } }); }} />
        <V2Sections config={config} media={media} only={(section) => section.showOnResults && section.type !== "SEARCH_HERO"} slots={{ hero: () => null }} />
      </>}
      <CartBar count={count} label={c.cart} />
    </V2Shell>
  );
}

function PopularAirports({ c, section, onPick }: { c: (typeof T)["tr"]; section: V2Section; onPick: (iata: string) => void }) {
  const { locale } = useI18n();
  const airports = section.items.filter((item) => item.visible).flatMap((item) => {
    const a = getAirportByIata(item.entity);
    return a ? [a] : [];
  });
  const results = useQueries({
    queries: airports.map((a) => ({
      queryKey: ["v2-lounges", a.iata],
      queryFn: () => listLoungeOptions({ data: { iata: a.iata, situation: "DEPARTURE" as const } }),
      staleTime: 5 * 60_000,
    })),
  });
  return (
    <>
      <SectionTitle>{v2Text(section, "title", locale) || c.popular}</SectionTitle>
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

function Lounges({ iata, title, c, selectedOffer, onSelect, onBack }: { iata: string; title: string; c: (typeof T)["tr"]; selectedOffer: LoungeOption | null; onSelect: (offer: LoungeOption) => void; onBack: () => void }) {
  const { lines } = useCart();
  const { data = [], isLoading } = useQuery({
    queryKey: ["v2-lounges", iata],
    queryFn: () => listLoungeOptions({ data: { iata, situation: "DEPARTURE" } }),
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
              <li key={o.id}>
                <V2ProductSelectionCard service="lounge" selected={selectedOffer?.id === o.id} onSelect={() => onSelect(o)} className="min-h-32">
                  <span className="flex min-h-32 w-full flex-col items-start p-4 pr-11">
                    <span className="font-display text-base font-semibold text-foreground">{o.loungeName ?? o.name}</span>
                    <span className="text-xs text-muted-foreground">{o.terminal ? `${c.terminal} ${o.terminal}` : ""}{o.maxStayMinutes ? ` · ${o.maxStayMinutes} ${c.stay}` : ""}</span>
                    {o.amenities.length > 0 && <span className="mt-2 flex flex-wrap gap-1.5">{o.amenities.slice(0, 4).map((a) => <span key={a} className="rounded-full bg-sand-soft px-2.5 py-1 text-xs font-medium text-foreground">{a}</span>)}</span>}
                    <span className="mt-auto pt-3 text-lg font-bold text-[var(--v2-service)]">{o.salePrice != null ? money(o.salePrice, o.currency) : ""}</span>
                    {inCart && <span className="sr-only">{c.added}</span>}
                  </span>
                </V2ProductSelectionCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
