import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, History, Loader2, MapPin, MessageCircle, Share2, Smartphone, Sparkles, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { getCountryByIso, searchCountries } from "@/domain/geo/countries";
import { listEsimPackages, type EsimPackage } from "@/lib/esim-catalogue.functions";
import { recommendTripPackages, type TripPlanResult } from "@/lib/trip-planner.functions";
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { useCart } from "@/domain/cart/store";
import { money as formatMoney } from "@/components/design-v2/V2Shell";
import type { UsageKind } from "@/domain/experience/types";

const C = localize({
  tr: {
    title: "Seyahat planlayıcı", lead: "Ülkelerini, tarihlerini ve kullanımını gir; katalogdaki gerçek paketleri senin için karşılaştıralım.",
    countries: "Varış ülkeleri", addCountry: "Ülke ekle", dates: "Seyahat tarihleri", from: "Gidiş", to: "Dönüş", usage: "Tahmini kullanım",
    submit: "Paketleri karşılaştır", loading: "Paketler karşılaştırılıyor…", results: "Önerilen paketler", need: "Tahmini ihtiyaç", days: "gün",
    add: "Sepete ekle", added: "Sepette", cart: "Sepete git", saved: "Kayıtlı seyahatler", save: "Bu seyahati kaydet", savedOk: "Kaydedildi",
    use: "Yükle", remove: "Sil", empty: "Henüz kayıtlı seyahat yok.", none: "Bu ülkeler için uygun paket bulunamadı.", error: "Öneri alınamadı. Lütfen tekrar dene.",
    unlimited: "Sınırsız", coverage: "ülke kapsama", newTrip: "Yeni seyahat",
    usageLabels: ["Mesajlaşma", "Haritalar", "Sosyal medya", "Video"] as string[],
  },
  de: {
    title: "Reiseplaner", lead: "Gib Länder, Daten und Nutzung ein – wir vergleichen echte Pakete aus dem Katalog für dich.",
    countries: "Zielländer", addCountry: "Land hinzufügen", dates: "Reisedaten", from: "Abreise", to: "Rückkehr", usage: "Geschätzte Nutzung",
    submit: "Pakete vergleichen", loading: "Pakete werden verglichen…", results: "Empfohlene Pakete", need: "Geschätzter Bedarf", days: "Tage",
    add: "In den Warenkorb", added: "Im Warenkorb", cart: "Zum Warenkorb", saved: "Gespeicherte Reisen", save: "Diese Reise speichern", savedOk: "Gespeichert",
    use: "Laden", remove: "Löschen", empty: "Noch keine gespeicherten Reisen.", none: "Für diese Länder wurden keine passenden Pakete gefunden.", error: "Empfehlung fehlgeschlagen. Bitte erneut versuchen.",
    unlimited: "Unbegrenzt", coverage: "Länder Abdeckung", newTrip: "Neue Reise",
    usageLabels: ["Messaging", "Karten", "Social Media", "Video"] as string[],
  },
  en: {
    title: "Trip planner", lead: "Enter your destinations, dates and usage — we compare real catalogue packages for you.",
    countries: "Destination countries", addCountry: "Add country", dates: "Travel dates", from: "Departure", to: "Return", usage: "Estimated usage",
    submit: "Compare packages", loading: "Comparing packages…", results: "Recommended packages", need: "Estimated need", days: "days",
    add: "Add to cart", added: "In cart", cart: "Go to cart", saved: "Saved trips", save: "Save this trip", savedOk: "Saved",
    use: "Load", remove: "Delete", empty: "No saved trips yet.", none: "No suitable packages found for these countries.", error: "Could not get a recommendation. Please try again.",
    unlimited: "Unlimited", coverage: "countries covered", newTrip: "New trip",
    usageLabels: ["Messaging", "Maps", "Social media", "Video"] as string[],
  },
});

type SavedTrip = { id: string; countries: string[]; startDate: string; endDate: string; usage: UsageKind[] };
const STORAGE_KEY = "pasaport.trips";

function loadTrips(): SavedTrip[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedTrip[];
    return Array.isArray(raw) ? raw.filter((t) => Array.isArray(t.countries) && t.countries.length).slice(0, 10) : [];
  } catch { return []; }
}

const USAGE_ICONS = [MessageCircle, MapPin, Share2, Video] as const;
const USAGE_KEYS: UsageKind[] = ["MESSAGING", "MAPS", "SOCIAL", "VIDEO"];

export function TripPlanner() {
  const { locale, uiLocale } = useI18n();
  const c = C[locale];
  const money = (v: number, cur: string) => formatMoney(v, cur, uiLocale);
  const { lines, addLine } = useCart();
  const [countries, setCountries] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usage, setUsage] = useState<UsageKind[]>(["MESSAGING", "MAPS"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<TripPlanResult | null>(null);
  const [saved, setSaved] = useState<SavedTrip[]>(() => (typeof window === "undefined" ? [] : loadTrips()));
  const [justSaved, setJustSaved] = useState(false);

  const matches = useMemo(() => (query ? searchCountries(query, 8, locale).filter((c2) => !countries.includes(c2.iso)) : []), [query, locale, countries]);
  const packagesQuery = useQuery({
    queryKey: ["trip-planner-packages", countries],
    queryFn: () => listEsimPackages({ data: { coverageIsos: countries } }),
    enabled: Boolean(result) && countries.length > 0,
  });
  const byId = useMemo(() => new Map((packagesQuery.data ?? []).map((p) => [p.id, p])), [packagesQuery.data]);
  const recommended = (result?.recommendations ?? []).flatMap((r) => {
    const pkg = byId.get(r.packageId);
    return pkg ? [{ pkg, reason: r.reason }] : [];
  });

  const submit = async () => {
    if (!countries.length || busy) return;
    setBusy(true); setError(false); setResult(null);
    try {
      const res = await recommendTripPackages({ data: { countries, startDate, endDate, usage, locale } });
      setResult(res);
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  const saveTrip = () => {
    if (!countries.length) return;
    const trip: SavedTrip = { id: `${Date.now()}`, countries, startDate, endDate, usage };
    const next = [trip, ...saved].slice(0, 10);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };
  const loadTrip = (trip: SavedTrip) => {
    setCountries(trip.countries); setStartDate(trip.startDate); setEndDate(trip.endDate); setUsage(trip.usage); setResult(null);
  };
  const removeTrip = (id: string) => {
    const next = saved.filter((t) => t.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addPkg = (pkg: EsimPackage) => {
    if (lines.some((l) => l.productId === pkg.id)) return;
    addLine({
      productId: pkg.id,
      providerProductId: pkg.providerProductId,
      serviceType: "ESIM",
      name: customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily }),
      meta: pkg.unlimited ? c.unlimited : `${pkg.dataGb ?? "—"} GB`,
      price: pkg.salePrice,
      currency: pkg.currency,
      quantity: 1,
      dataGb: pkg.dataGb,
      validityDays: pkg.validityDays,
      coverage: pkg.coverage,
      destinationIso: pkg.countryIso,
      packageKind: pkg.packageKind,
      regionFamily: pkg.regionFamily,
      isTest: pkg.isTest,
    });
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">{c.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.lead}</p>
      </header>

      {saved.length > 0 && (
        <section className="rounded-2xl bg-card p-3 ring-1 ring-border">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" />{c.saved}</h2>
          <ul className="mt-2 grid gap-2">
            {saved.map((trip) => (
              <li key={trip.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {trip.countries.map((iso) => <CountryFlag key={iso} iso={iso} className="h-3 w-4.5 rounded-sm" />)}
                  <span className="truncate">{trip.countries.map((iso) => getCountryByIso(iso)?.name[locale] ?? iso).join(" · ")}</span>
                  {trip.startDate && <span className="shrink-0 text-muted-foreground">{trip.startDate} → {trip.endDate}</span>}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => loadTrip(trip)}>{c.use}</Button>
                <Button type="button" variant="ghost" size="sm" aria-label={c.remove} onClick={() => removeTrip(trip.id)}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
        <div>
          <h2 className="text-sm font-semibold">{c.countries}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {countries.map((iso) => (
              <Button key={iso} type="button" variant="secondary" size="sm" onClick={() => setCountries(countries.filter((x) => x !== iso))} className="gap-1.5">
                <CountryFlag iso={iso} className="h-3 w-4.5 rounded-sm" />{getCountryByIso(iso)?.name[locale] ?? iso} ✕
              </Button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.addCountry}
            aria-label={c.addCountry}
            className="mt-2 min-h-11 w-full rounded-xl bg-secondary px-3 text-sm outline-none ring-1 ring-border focus:ring-primary"
          />
          {matches.length > 0 && (
            <ul className="mt-1 grid overflow-hidden rounded-xl ring-1 ring-border">
              {matches.map((m) => (
                <li key={m.iso}>
                  <Button type="button" variant="ghost" onClick={() => { setCountries([...countries, m.iso]); setQuery(""); }} className="min-h-11 w-full justify-start gap-2 rounded-none">
                    <CountryFlag iso={m.iso} className="h-3.5 w-5 rounded-sm" />{m.name[locale]}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-primary" />{c.dates}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">{c.from}
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-11 rounded-xl bg-secondary px-3 text-sm text-foreground ring-1 ring-border" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">{c.to}
              <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="min-h-11 rounded-xl bg-secondary px-3 text-sm text-foreground ring-1 ring-border" />
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">{c.usage}</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {USAGE_KEYS.map((key, i) => {
              const on = usage.includes(key);
              const Icon = USAGE_ICONS[i] ?? MessageCircle;
              return (
                <Button key={key} type="button" variant={on ? "secondary" : "outline"} size="sm" aria-pressed={on}
                  onClick={() => setUsage(on ? usage.filter((u) => u !== key) : [...usage, key])} className="min-h-11 justify-start gap-2">
                  <Icon className="size-4 shrink-0" /><span className="truncate">{c.usageLabels[i]}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={submit} disabled={!countries.length || busy} className="min-h-11 gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? c.loading : c.submit}
          </Button>
          <Button type="button" variant="outline" onClick={saveTrip} disabled={!countries.length} className="min-h-11">{justSaved ? c.savedOk : c.save}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{c.error}</p>}
      </section>

      {result && (
        <section className="grid gap-3" aria-live="polite">
          <h2 className="font-display text-xl font-bold">{c.results}</h2>
          <p className="text-sm text-muted-foreground">{c.need}: ≈ {result.requiredGb} GB · {result.days} {c.days}</p>
          {packagesQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          ) : recommended.length === 0 ? (
            <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">{c.none}</p>
          ) : (
            <ul className="grid gap-2">
              {recommended.map(({ pkg, reason }) => {
                const inCart = lines.some((l) => l.productId === pkg.id);
                return (
                  <li key={pkg.id} className="grid gap-2 rounded-2xl bg-card p-4 ring-1 ring-border">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-display text-base font-bold">
                          {pkg.countryIso && <CountryFlag iso={pkg.countryIso} className="h-4 w-6 rounded-sm" />}
                          <span className="truncate">{pkg.unlimited ? `∞ ${c.unlimited}` : `${pkg.dataGb ?? "—"} GB`} · {pkg.validityDays ?? "—"} {c.days}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{customerCataloguePackageTitle({ locale, destinationIso: pkg.countryIso, coverage: pkg.coverage, packageKind: pkg.packageKind, regionFamily: pkg.regionFamily })} · {pkg.coverage.length} {c.coverage}</p>
                      </div>
                      <strong className="text-lg text-primary">{pkg.salePrice != null ? money(pkg.salePrice, pkg.currency) : ""}</strong>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{reason}</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => addPkg(pkg)} disabled={inCart} className="min-h-11">{inCart ? c.added : c.add}</Button>
                      {inCart && <Button asChild variant="outline" size="sm" className="min-h-11"><Link to="/sepet">{c.cart}<ArrowRight className="size-4 rtl:rotate-180" /></Link></Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Smartphone className="size-4 shrink-0" />{c.title} · pasaport.io</p>
    </div>
  );
}
