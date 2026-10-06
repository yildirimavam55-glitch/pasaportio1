import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, MoreHorizontal, Search, Settings2, Sparkles, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { Button } from "@/components/ui/button";
import { getCountryPricing, getManualPricingOverview, previewCopyCountryPrices, saveManualPrices } from "@/lib/manual-pricing.functions";
import { packageKeyLabel, profitAndMargin } from "@/domain/pricing/manual-prices";
import { ageLabel, costAnomalies, evaluateCompetitive, type CompetitiveResult, type CompetitiveStatus } from "@/domain/pricing/competitive";
import { commitResearchImport, getCompetitorStore, previewCompetitorImport, previewResearchImport, saveCompetitorPrices } from "@/lib/competitor-pricing.functions";
import { compareWithCompetitor, matchCompetitor, type AiraloIndicator, type MatchQuality } from "@/domain/pricing/airalo";

export const Route = createFileRoute("/_authenticated/admin/manual-pricing")({
  head: () => adminHead("Paket fiyatları", "Genel ve ülkeye özel manuel eSIM fiyatları."),
  component: ManualPricing,
});

const SOURCE_LABEL = { COUNTRY: "Ülkeye özel", GLOBAL: "Genel fiyat", AUTO: "Otomatik" } as const;
const pct = (value: number | null) => (value == null ? "—" : `%${value.toFixed(1).replace(".0", "")}`);
const parse = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));
const euro = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR" }).format(value);
const regionNames = new Intl.DisplayNames(["tr"], { type: "region" });
const countryName = (iso: string) => regionNames.of(iso) ?? iso;
const normalizeSearch = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

type Loss = { name: string; iso: string | null; key: string; cost: number | null; price: number | null; loss: number | null };
type SaveArgs = { scope: string; entries: { key: string; price: number | null }[]; confirmLoss?: boolean };
type Overview = Awaited<ReturnType<typeof getManualPricingOverview>>;
type CountryData = Awaited<ReturnType<typeof getCountryPricing>>;
type CountryRow = CountryData["rows"][number];
type PackageGroup = { key: string; rows: CountryRow[] };

const STATUS_LABEL: Record<CompetitiveStatus, string> = { COMPETITIVE: "Rekabetçi", REVIEW: "Kontrol et", UNSUITABLE: "Satışa uygun değil", NO_DATA: "Rakip verisi yok" }
const STATUS_DOT: Record<CompetitiveStatus, string> = { COMPETITIVE: "bg-primary", REVIEW: "bg-warning", UNSUITABLE: "bg-destructive", NO_DATA: "border border-muted-foreground" };
const Dot = ({ status }: { status: CompetitiveStatus }) => <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />;;
const STATUS_TONE: Record<CompetitiveStatus, string> = { COMPETITIVE: "bg-primary/10 text-primary", REVIEW: "bg-accent text-accent-foreground", UNSUITABLE: "bg-destructive/10 text-destructive", NO_DATA: "bg-muted text-muted-foreground" };
function StatusBadge({ status }: { status: CompetitiveStatus }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[status]}`}><Dot status={status} />{STATUS_LABEL[status]}</span>;
}
const AIRALO_LABEL: Record<AiraloIndicator, string> = { CHEAPER: "Airalo'dan uygun", CHEAPER_LOW_MARGIN: "Airalo'dan uygun · düşük marj", CLOSE: "Airalo'ya yakın", EXPENSIVE: "Airalo'dan pahalı", NO_DATA: "Airalo verisi yok" };
const AIRALO_TONE: Record<AiraloIndicator, CompetitiveStatus> = { CHEAPER: "COMPETITIVE", CHEAPER_LOW_MARGIN: "REVIEW", CLOSE: "REVIEW", EXPENSIVE: "UNSUITABLE", NO_DATA: "NO_DATA" };
const MATCH_LABEL: Record<MatchQuality, string> = { EXACT: "EXACT", SHORTER_VALIDITY: "SHORTER VALIDITY", COMPARABLE: "COMPARABLE", NO_MATCH: "NO MATCH" };
const trDate = (d: string) => d.split("-").reverse().join(".");
/** Airalo is one competitor: shown as its own comparison, never as a market median. */
function AiraloBlock({ group, price, cost, market }: { group: PackageGroup; price: number | null; cost: number | null; market: Market }) {
  const [open, setOpen] = useState(false);
  const airalo = (market?.competitors ?? []).filter((c) => c.competitor.toLowerCase() === "airalo");
  const { entry, quality } = matchCompetitor(group.key, airalo);
  const cmp = compareWithCompetitor({ price, cost, minMargin: group.rows[0]?.minMargin ?? 25, entry });
  const tone = AIRALO_TONE[cmp.indicator];
  if (!entry) return <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Dot status="NO_DATA" />Airalo · Veri yok</p>;
  const days = group.key.split("|")[1];
  const airaloDays = entry.key.split("|")[1];
  return <div className="mt-1.5 rounded-lg bg-secondary/40 p-2 text-[11px]">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold">Airalo <b className="tabular-nums">{entry.currency === "EUR" ? euro(entry.price) : `${entry.price} ${entry.currency}`}</b></span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[tone]}`}><Dot status={tone} />{AIRALO_LABEL[cmp.indicator]}</span>
      {quality === "SHORTER_VALIDITY" && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Airalo {airaloDays} gün · Pasaport {days} gün</span>}
      <Button variant="link" size="sm" className="h-auto px-0 text-[11px] text-muted-foreground" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Rakip detayı</Button>
    </div>
    {cmp.diff != null && <p className="mt-1 font-semibold">Airalo'ya göre {Math.abs(cmp.diff) < 0.005 ? "aynı fiyat" : `${euro(Math.abs(cmp.diff))} daha ${cmp.diff < 0 ? "uygun" : "pahalı"} · %${Math.abs(cmp.diffPct!).toFixed(1)}`}</p>}
    {cmp.fxRequired && <p className="mt-1 font-semibold text-destructive">FX_REQUIRED — kur yok, karşılaştırılmadı</p>}
    {open && <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-muted-foreground">
      <dt>Paket</dt><dd className="text-foreground">{packageKeyLabel(entry.key)}</dd>
      <dt>Kaynak</dt><dd className="text-foreground">Airalo App{entry.sourceType ? ` · ${entry.sourceType}` : ""}</dd>
      <dt>Kontrol</dt><dd className="text-foreground">{trDate(entry.checkedAt)}</dd>
      <dt>Match</dt><dd className="text-foreground">{MATCH_LABEL[quality]}</dd>
      <dt>Pazar güveni</dt><dd className="text-foreground">DÜŞÜK (tek rakip)</dd>
    </dl>}
  </div>;
}
const marketDiff = (diff: number | null) => diff == null ? null : Math.abs(diff) < 0.5 ? "Pazarla aynı" : diff < 0 ? `Pazardan %${Math.abs(diff).toFixed(0)} daha uygun` : `Pazardan %${diff.toFixed(0)} pahalı`;

function SourceBadge({ source }: { source: keyof typeof SOURCE_LABEL }) {
  const tone = source === "COUNTRY" ? "bg-primary/10 text-primary" : source === "GLOBAL" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{SOURCE_LABEL[source]}</span>;
}

function useSave(onDone: () => void) {
  const queryClient = useQueryClient();
  const [losses, setLosses] = useState<{ args: SaveArgs; list: Loss[]; count: number } | null>(null);
  const mutation = useMutation({
    mutationFn: (args: SaveArgs) => saveManualPrices({ data: args }),
    onSuccess: async (result, args) => {
      if (!result.ok) { setLosses({ args, list: result.losses, count: result.lossCount }); return; }
      setLosses(null);
      toast.success(`Kaydedildi. ${result.updated} ürün fiyatı güncellendi.`);
      await queryClient.invalidateQueries({ queryKey: ["manual-pricing"] });
      onDone();
    },
    onError: (error: Error) => toast.error(error.message || "Kaydedilemedi."),
  });
  const lossDialog = losses && (
    <div className="mt-3 rounded-lg border border-destructive/35 bg-destructive/5 p-3 text-sm">
      <p className="font-bold text-destructive">Zararına satış: {losses.count} ürün tedarikçi maliyetinin altında kalıyor.</p>
      <ul className="mt-2 space-y-1 text-xs">
        {losses.list.slice(0, 10).map((loss) => <li key={`${loss.iso}-${loss.key}-${loss.name}`}>{loss.iso} · {packageKeyLabel(loss.key)} — Alış {money(loss.cost)} · Satış {money(loss.price)}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" onClick={() => mutation.mutate({ ...losses.args, confirmLoss: true })}>Zararına rağmen kaydet</Button>
        <Button size="sm" variant="outline" onClick={() => setLosses(null)}>Vazgeç</Button>
      </div>
    </div>
  );
  return { save: mutation.mutate, pending: mutation.isPending, lossDialog };
}

function ManualPricing() {
  const [view, setView] = useState<"country" | "global" | "copy" | "competitors">("country");
  const [selectedIso, setSelectedIso] = useState("TR");
  const overview = useQuery({ queryKey: ["manual-pricing", "overview"], queryFn: () => getManualPricingOverview() });
  return (
    <AdminGate title="Paket fiyatları">
      {overview.isLoading ? <AdminLoading /> : overview.error ? <AdminError error={overview.error} /> : overview.data && (
        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <CountryPicker countries={overview.data.countries} selectedIso={selectedIso} onSelect={(iso) => { setSelectedIso(iso); setView("country"); }} />
            <div className="flex shrink-0 gap-1">
              <Button variant={view === "competitors" ? "default" : "outline"} size="icon" aria-label="Rakip fiyatları" title="Rakip fiyatları" onClick={() => setView(view === "competitors" ? "country" : "competitors")}><Users /></Button>
              <Button variant={view === "global" ? "default" : "outline"} size="icon" aria-label="Genel fiyatlar" title="Genel fiyatlar" onClick={() => setView(view === "global" ? "country" : "global")}><Settings2 /></Button>
              <Button variant={view === "copy" ? "default" : "outline"} size="icon" aria-label="Diğer işlemler" title="Diğer işlemler" onClick={() => setView(view === "copy" ? "country" : "copy")}><MoreHorizontal /></Button>
            </div>
          </div>
          {view === "country" && <MarketDashboard data={overview.data} onSelect={setSelectedIso} />}
          {view === "competitors" ? <CompetitorPanel iso={selectedIso} countries={overview.data.countries.map((country) => country.iso)} onClose={() => setView("country")} />
            : view === "global" ? <GlobalPrices data={overview.data} onClose={() => setView("country")} />
            : view === "copy" ? <CopyPrices countries={overview.data.countries.map((country) => country.iso)} onClose={() => setView("country")} />
              : <CountryPrices iso={selectedIso} summary={overview.data.countries.find((country) => country.iso === selectedIso) ?? null} counts={overview.data.competitive.countries[selectedIso] ?? null} />}
        </div>
      )}
    </AdminGate>
  );
}

function CountryPicker({ countries, selectedIso, onSelect }: { countries: Overview["countries"]; selectedIso: string; onSelect: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = normalizeSearch(query.trim());
    return countries
      .map((country) => ({ ...country, name: countryName(country.iso) }))
      .filter((country) => !needle || normalizeSearch(`${country.name} ${country.iso}`).includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      .slice(0, 40);
  }, [countries, query]);
  const choose = (iso: string) => { onSelect(iso); setQuery(""); setOpen(false); };
  return (
    <div className="relative min-w-0">
      <button type="button" aria-label="Ülke ara" aria-expanded={open} className="grid h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-input bg-background px-3 text-left shadow-sm transition-colors hover:border-primary/40" onClick={() => setOpen(true)}>
        <Search className="size-4 shrink-0 text-primary" />
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><CountryFlag iso={selectedIso} /><span className="truncate">{countryName(selectedIso)}</span></span>
        <span className="hidden text-xs text-muted-foreground sm:inline">Ülke ara</span>
      </button>
      {open && <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border p-2">
          <Search className="ml-1 size-4 text-muted-foreground" />
          <input autoFocus aria-label="Ülke ara" className="h-9 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Ülke ara..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="ghost" size="icon" className="size-9" aria-label="Aramayı kapat" onClick={() => { setOpen(false); setQuery(""); }}><X /></Button>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {matches.length ? matches.map((country) => (
            <Button key={country.iso} variant="ghost" className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] justify-start px-2.5 py-2 text-left" onClick={() => choose(country.iso)}>
              <CountryFlag iso={country.iso} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{country.name}</span><span className="block text-[10px] font-normal text-muted-foreground">{country.packages} paket</span></span>
              {country.iso === selectedIso && <Check className="size-4 text-primary" />}
            </Button>
          )) : <p className="p-4 text-center text-sm text-muted-foreground">Eşleşen ülke bulunamadı.</p>}
        </div>
      </div>}
    </div>
  );
}

type StatusFilter = "ALL" | CompetitiveStatus;
function MarketDashboard({ data, onSelect }: { data: Overview; onSelect: (iso: string) => void }) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const t = data.competitive.totals;
  const list = filter === "ALL" ? [] : Object.entries(data.competitive.countries).filter(([, c]) => c[filter] > 0)
    .map(([iso, c]) => ({ iso, n: c[filter], name: countryName(iso) })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "tr")).slice(0, 60);
  const chips: [StatusFilter, string, number][] = [["ALL", `Tümü · ${data.countries.length} ülke`, 0], ["COMPETITIVE", STATUS_LABEL.COMPETITIVE, t.COMPETITIVE], ["REVIEW", STATUS_LABEL.REVIEW, t.REVIEW], ["UNSUITABLE", STATUS_LABEL.UNSUITABLE, t.UNSUITABLE], ["NO_DATA", "Rakip verisi yok", t.NO_DATA]];
  return <section className="mb-4 rounded-xl border border-border bg-card p-2.5" aria-label="Rekabet özeti">
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      {chips.map(([key, label, n]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>{key !== "ALL" && <Dot status={key} />}{label}{key !== "ALL" && <span className="ml-1 tabular-nums opacity-80">{n}</span>}</button>)}
    </div>
    {data.competitive.entries === 0 && filter === "ALL" && <p className="mt-2 text-[11px] text-muted-foreground">Henüz rakip fiyatı girilmedi. Rakip fiyatlarını eklemek için kişi simgesini kullan.</p>}
    {filter !== "ALL" && <div className="mt-2 flex flex-wrap gap-1.5">
      {list.length ? list.map((c) => <button key={c.iso} type="button" onClick={() => onSelect(c.iso)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold hover:border-primary/40"><CountryFlag iso={c.iso} />{c.name}<span className="tabular-nums text-muted-foreground">{c.n}</span></button>) : <p className="text-xs text-muted-foreground">Bu durumda ülke yok.</p>}
    </div>}
  </section>;
}

function groupCountryRows(rows: CountryRow[]): PackageGroup[] {
  const grouped = new Map<string, CountryRow[]>();
  for (const row of rows) grouped.set(row.key, [...(grouped.get(row.key) ?? []), row]);
  return [...grouped.entries()].map(([key, groupedRows]) => ({ key, rows: groupedRows })).sort((a, b) => {
    const [aData, aDays] = a.key.split("|");
    const [bData, bDays] = b.key.split("|");
    if (aData === "U" && bData !== "U") return 1;
    if (aData !== "U" && bData === "U") return -1;
    if (aData !== bData) return Number(aData) - Number(bData);
    return Number(aDays) - Number(bDays);
  });
}

type CountryCounts = Overview["competitive"]["countries"][string] | null;
function CountryPrices({ iso, summary, counts }: { iso: string; summary: Overview["countries"][number] | null; counts: CountryCounts }) {
  const query = useQuery({ queryKey: ["manual-pricing", "country", iso], queryFn: () => getCountryPricing({ data: { iso } }) });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<"standard" | "unlimited">("standard");
  const { save, pending, lossDialog } = useSave(() => setEdits({}));
  const groups = useMemo(() => groupCountryRows(query.data?.rows ?? []), [query.data]);
  const standard = groups.filter((group) => !group.key.startsWith("U|"));
  const unlimited = groups.filter((group) => group.key.startsWith("U|"));
  const visible = kind === "standard" ? standard : unlimited;
  const [suggestOpen, setSuggestOpen] = useState(false);
  const market = query.data ? { competitors: query.data.competitors, rates: query.data.rates, policy: query.data.policy } : null;
  const changed = Object.entries(edits).filter(([key, value]) => {
    const current = groups.find((group) => group.key === key)?.rows[0]?.country ?? null;
    return parse(value) !== current;
  });
  if (query.isLoading) return <AdminLoading label={`${countryName(iso)} paketleri yükleniyor…`} />;
  if (query.error) return <AdminError error={query.error} />;
  return <section className="min-w-0 pb-20">
    <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0"><h2 className="flex items-center gap-2 font-display text-xl font-bold"><CountryFlag iso={iso} className="text-base" /><span className="truncate">{countryName(iso)}</span></h2><p className="mt-0.5 text-xs text-muted-foreground">{summary?.packages ?? query.data?.rows.length ?? 0} paket · Vitrin paketleri: {summary?.published ?? 0}</p></div>
      <Button size="sm" variant="outline" onClick={() => setSuggestOpen((v) => !v)}><Sparkles />Önerilen fiyatları oluştur</Button>
    </header>
    {counts && <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">{(["COMPETITIVE", "REVIEW", "UNSUITABLE", "NO_DATA"] as const).map((k) => <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${STATUS_TONE[k]}`}><Dot status={k} />{STATUS_LABEL[k]}: {counts[k]}</span>)}{counts.showcase > 0 && <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">Vitrin için önerilen: {counts.showcase}</span>}</div>}
    {suggestOpen && market && <SuggestionPreview iso={iso} groups={groups} market={market} onClose={() => setSuggestOpen(false)} />}
    <div className="mb-3 grid grid-cols-2 rounded-xl bg-secondary p-1" aria-label="Paket türü">
      <Button variant="ghost" className={`h-9 ${kind === "standard" ? "!bg-primary !text-primary-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setKind("standard")}>STANDARD · {standard.length}</Button>
      <Button variant="ghost" className={`h-9 ${kind === "unlimited" ? "!bg-primary !text-primary-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setKind("unlimited")}>UNLIMITED · {unlimited.length}</Button>
    </div>
    {lossDialog}
    <div className="space-y-2 md:hidden">
      {visible.map((group) => <MobilePriceRow key={group.key} group={group} iso={iso} market={market} edit={edits[group.key] ?? null} onEdit={(value) => setEdits((current) => ({ ...current, [group.key]: value }))} />)}
    </div>
    <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Paket</th><th className="px-3 py-2">Maliyet</th><th className="px-3 py-2">Travely</th><th className="px-3 py-2">Pazar</th><th className="px-3 py-2">Fark</th><th className="px-3 py-2">Kâr</th><th className="px-3 py-2">Marj</th><th className="px-3 py-2">Durum</th></tr></thead>
        <tbody>{visible.map((group) => <DesktopPriceRow key={group.key} group={group} iso={iso} market={market} edit={edits[group.key] ?? null} onEdit={(value) => setEdits((current) => ({ ...current, [group.key]: value }))} />)}</tbody>
      </table>
    </div>
    {changed.length > 0 && <div className="sticky bottom-3 z-30 mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-2.5 shadow-panel backdrop-blur">
      <span className="pl-1 text-sm font-bold">{changed.length} değişiklik</span>
      <Button variant="cta" disabled={pending} onClick={() => save({ scope: iso, entries: changed.map(([key, value]) => ({ key, price: parse(value) })) })}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
    </div>}
  </section>;
}

function resolvedGroup(group: PackageGroup, edit: string | null) {
  const first = group.rows[0];
  if (!first) return null;
  const draft = edit === null ? first.price : parse(edit);
  const active = draft ?? first.general ?? first.autoPrice;
  const cost = Math.max(...group.rows.map((row) => row.cost ?? 0));
  const metrics = profitAndMargin(active, cost);
  const low = metrics.margin != null && !metrics.loss && metrics.margin < first.minMargin;
  const source = edit === null ? first.source : draft != null ? "COUNTRY" : first.general != null ? "GLOBAL" : "AUTO";
  return { first, active, cost, metrics, low, source };
}

type Market = { competitors: CountryData["competitors"]; rates: CountryData["rates"]; policy: CountryData["policy"] } | null;
/** Evaluates against the cheapest equivalent variant; the price applies to every variant of the structure. */
function competitiveFor(group: PackageGroup, price: number | null, market: Market) {
  const first = group.rows[0]!;
  const { cheapest, anomalous } = costAnomalies(group.rows.map((r) => r.cost), market?.policy.anomalyCostMultiple);
  const result = evaluateCompetitive({ cost: cheapest, price, minMargin: first.minMargin, competitors: (market?.competitors ?? []).filter((c) => c.key === group.key), rates: market?.rates ?? {}, policy: market?.policy });
  return { result, cheapest, expensiveVariants: anomalous.filter(Boolean).length };
}

function CompetitorList({ result, expensiveVariants }: { result: CompetitiveResult; expensiveVariants: number }) {
  return <div className="mt-2 space-y-1 rounded-lg bg-secondary/40 p-2 text-[11px]">
    {result.competitors.length === 0 ? <p className="text-muted-foreground">Rakip verisi yok</p> : result.competitors.map((c) => <p key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><span className="truncate">{c.competitor} · <span className={c.stale ? "font-semibold text-destructive" : "text-muted-foreground"}>{ageLabel(c.checkedAt)}</span></span><span className="tabular-nums font-semibold">{c.currency === "EUR" ? euro(c.price) : `${c.price} ${c.currency}`}{c.eur == null && " · Kur yok"}</span></p>)}
    {result.reasons.map((r) => <p key={r} className="font-semibold text-muted-foreground">• {r}</p>)}
    {expensiveVariants > 0 && <p className="font-semibold text-destructive">{expensiveVariants} pahalı tedarikçi varyantı satışa uygun değil (katalogda kalır)</p>}
  </div>;
}

function PriceInput({ iso, group, value, onEdit }: { iso: string; group: PackageGroup; value: string; onEdit: (value: string) => void }) {
  return <div className="relative w-28"><input aria-label={`${iso} satış fiyatı ${packageKeyLabel(group.key)}`} inputMode="decimal" className="h-10 w-full rounded-lg border-2 border-primary/35 bg-background px-2.5 pr-7 text-right text-base font-bold tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" value={value} onChange={(event) => onEdit(event.target.value)} onFocus={(event) => event.currentTarget.select()} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span></div>;
}

function MobilePriceRow({ group, iso, market, edit, onEdit }: { group: PackageGroup; iso: string; market: Market; edit: string | null; onEdit: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const details = resolvedGroup(group, edit);
  if (!details) return null;
  const { result, expensiveVariants } = competitiveFor(group, details.active, market);
  const value = edit === null ? String(details.active ?? "") : edit;
  return <article className={`rounded-lg border bg-card p-3 ${details.metrics.loss ? "border-destructive/50" : "border-border"}`}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0"><h3 className="truncate text-sm font-bold">{packageKeyLabel(group.key)}</h3><p className="mt-1 text-xs text-muted-foreground">Maliyet {euro(details.cost)}{group.rows.length > 1 ? ` · ${group.rows.length} ürün` : ""} · Pazar {result.market == null ? "Veri yok" : euro(result.market)}</p></div>
      <div className="flex flex-col items-end gap-1"><StatusBadge status={result.status} /><SourceBadge source={details.source} /></div>
    </div>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><p className="text-[11px] font-semibold text-muted-foreground">Satış fiyatı</p><p className={`mt-0.5 truncate text-xs ${details.metrics.loss || details.low ? "font-bold text-destructive" : "text-muted-foreground"}`}>{details.metrics.loss ? "Zarar" : details.low ? "Düşük marj" : `Kâr ${euro(details.metrics.profit)} · ${pct(details.metrics.margin)}`}</p></div>
      <PriceInput iso={iso} group={group} value={value} onEdit={onEdit} />
    </div>
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {marketDiff(result.diffPct) && <span className="font-semibold">{marketDiff(result.diffPct)}</span>}
      {result.suggested != null && <span>Önerilen: <b className="tabular-nums">{euro(result.suggested)}</b></span>}
      {result.suggested != null && result.suggested !== details.active && <Button variant="link" size="sm" className="h-auto px-0 text-[11px]" onClick={() => onEdit(String(result.suggested))}>Önerilen fiyatı uygula</Button>}
      <Button variant="link" size="sm" className="h-auto px-0 text-[11px] text-muted-foreground" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Rakipler {result.competitors.length}</Button>
    </div>
    <AiraloBlock group={group} price={details.active} cost={details.cost} market={market} />
    {open && <CompetitorList result={result} expensiveVariants={expensiveVariants} />}
    {details.first.country != null && <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-[11px]" onClick={() => onEdit("")}>Ülkeye özel fiyatı kaldır</Button>}
  </article>;
}

function DesktopPriceRow({ group, iso, market, edit, onEdit }: { group: PackageGroup; iso: string; market: Market; edit: string | null; onEdit: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const details = resolvedGroup(group, edit);
  if (!details) return null;
  const { result, expensiveVariants } = competitiveFor(group, details.active, market);
  const value = edit === null ? String(details.active ?? "") : edit;
  return <><tr className="border-t border-border">
    <td className="px-3 py-2 font-semibold"><button type="button" className="flex items-center gap-1 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}><ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />{packageKeyLabel(group.key)}</button>{group.rows.length > 1 && <span className="ml-5 text-xs font-normal text-muted-foreground">×{group.rows.length}</span>}<div className="ml-5"><SourceBadge source={details.source} /></div></td>
    <td className="px-3 py-2 tabular-nums text-muted-foreground">{euro(details.cost)}</td>
    <td className="px-3 py-2"><PriceInput iso={iso} group={group} value={value} onEdit={onEdit} />{result.suggested != null && result.suggested !== details.active && <Button variant="link" size="sm" className="block h-auto px-0 pt-1 text-[10px]" onClick={() => onEdit(String(result.suggested))}>Önerilen {euro(result.suggested)} uygula</Button>}{details.first.country != null && <Button variant="link" size="sm" className="block h-auto px-0 pt-1 text-[10px]" onClick={() => onEdit("")}>Ülkeye özel fiyatı kaldır</Button>}</td>
    <td className="px-3 py-2 tabular-nums">{result.market == null ? <span className="text-xs text-muted-foreground">Veri yok</span> : euro(result.market)}</td>
    <td className="px-3 py-2 tabular-nums">{result.diffPct == null ? "—" : `${result.diffPct > 0 ? "+" : ""}${result.diffPct.toFixed(1)}%`}</td>
    <td className={`px-3 py-2 tabular-nums ${details.metrics.loss ? "font-bold text-destructive" : ""}`}>{euro(details.metrics.profit)}</td>
    <td className={`px-3 py-2 tabular-nums ${details.low ? "font-bold text-destructive" : ""}`}>{pct(details.metrics.margin)}{details.metrics.loss ? <span className="block text-[10px]">Zarar</span> : details.low ? <span className="block text-[10px]">Düşük marj</span> : null}</td>
    <td className="px-3 py-2"><StatusBadge status={result.status} /></td>
  </tr>
  <tr><td colSpan={8} className="px-3 pb-2 pt-0"><AiraloBlock group={group} price={details.active} cost={details.cost} market={market} /></td></tr>
  {open && <tr><td colSpan={8} className="px-3 pb-3"><CompetitorList result={result} expensiveVariants={expensiveVariants} /></td></tr>}</>;
}

function GlobalPrices({ data, onClose }: { data: Overview; onClose: () => void }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { save, pending, lossDialog } = useSave(() => setEdits({}));
  const rows = [...data.groups].sort((a, b) => {
    const [aData, aDays] = a.key.split("|"); const [bData, bDays] = b.key.split("|");
    if (aData === "U" && bData !== "U") return 1; if (aData !== "U" && bData === "U") return -1;
    return aData === bData ? Number(aDays) - Number(bDays) : Number(aData) - Number(bData);
  });
  const changed = Object.entries(edits).filter(([key, value]) => parse(value) !== (data.global[key] ?? null));
  return <AdminPanel title="Genel fiyatlar" action={<Button variant="ghost" size="sm" onClick={onClose}>Ülke fiyatlarına dön</Button>}>
    <p className="mb-3 text-xs text-muted-foreground">Bu gelişmiş ayarlar, ülkeye özel fiyatı bulunmayan paketlerde kullanılır.</p>
    {lossDialog}
    <div className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-2.5">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{packageKeyLabel(row.key)}</p><p className="text-[10px] text-muted-foreground">Alış {euro(row.minCost)} – {euro(row.maxCost)} · {row.countries} ülke</p></div>
        <div className="relative w-28"><input aria-label={`Genel fiyat ${packageKeyLabel(row.key)}`} inputMode="decimal" className="h-9 w-full rounded-lg border border-input bg-background px-2 pr-7 text-right font-semibold" placeholder="Otomatik" value={edits[row.key] ?? (data.global[row.key]?.toString() ?? "")} onChange={(event) => setEdits((current) => ({ ...current, [row.key]: event.target.value }))} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span></div>
      </div>)}
    </div>
    {changed.length > 0 && <div className="sticky bottom-3 z-30 mt-4 flex items-center justify-between rounded-xl border border-border bg-card/95 p-2.5 shadow-panel backdrop-blur"><span className="pl-1 text-sm font-bold">{changed.length} değişiklik</span><Button variant="cta" disabled={pending} onClick={() => save({ scope: "GLOBAL", entries: changed.map(([key, value]) => ({ key, price: parse(value) })) })}>Kaydet</Button></div>}
  </AdminPanel>;
}

function CopyPrices({ countries, onClose }: { countries: string[]; onClose: () => void }) {
  const [from, setFrom] = useState("DE");
  const [to, setTo] = useState("AT");
  const preview = useMutation({ mutationFn: () => previewCopyCountryPrices({ data: { from, to } }) });
  const { save, pending, lossDialog } = useSave(() => preview.reset());
  return <AdminPanel title="Diğer işlemler" action={<Button variant="ghost" size="sm" onClick={onClose}>Ülke fiyatlarına dön</Button>}>
    <details className="group rounded-lg border border-border bg-card" open>
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 text-sm font-bold">Fiyatları kopyala<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
      <div className="border-t border-border p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Kaynak ülke<select className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-2 text-sm" value={from} onChange={(event) => { setFrom(event.target.value); preview.reset(); }}>{countries.map((iso) => <option key={iso} value={iso}>{countryName(iso)}</option>)}</select></label>
          <label className="text-xs font-semibold">Hedef ülke<select className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-2 text-sm" value={to} onChange={(event) => { setTo(event.target.value); preview.reset(); }}>{countries.map((iso) => <option key={iso} value={iso}>{countryName(iso)}</option>)}</select></label>
        </div>
        <Button className="mt-3" size="sm" variant="outline" disabled={from === to || preview.isPending} onClick={() => preview.mutate()}>Kopyalamayı önizle</Button>
        {preview.data && <div className="mt-4 text-sm"><p className="mb-2 text-xs text-muted-foreground">Eşleşmeyen: {preview.data.skipped.map(packageKeyLabel).join(", ") || "yok"}</p>{preview.data.matches.length === 0 ? <p>Kopyalanacak eşleşen ülkeye özel fiyat yok.</p> : <ul className="space-y-1">{preview.data.matches.map((match) => <li key={match.key}>{packageKeyLabel(match.key)}: {euro(match.current)} → <b>{euro(match.price)}</b>{match.loss && <span className="font-semibold text-destructive"> · Zarar</span>}</li>)}</ul>}{lossDialog}{preview.data.matches.length > 0 && <Button className="mt-3" size="sm" variant="cta" disabled={pending} onClick={() => save({ scope: to, entries: preview.data.matches.map((match) => ({ key: match.key, price: match.price })) })}>Onayla ve {countryName(to)} için uygula</Button>}</div>}
      </div>
    </details>
  </AdminPanel>;
}
function SuggestionPreview({ iso, groups, market, onClose }: { iso: string; groups: PackageGroup[]; market: NonNullable<Market>; onClose: () => void }) {
  const rows = groups.map((group) => {
    const d = resolvedGroup(group, null);
    const { result } = competitiveFor(group, d?.active ?? null, market);
    return { key: group.key, current: d?.active ?? null, result };
  }).filter((r) => r.result.status !== "NO_DATA");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const { save, pending, lossDialog } = useSave(onClose);
  const chosen = rows.filter((r) => selected[r.key] && r.result.suggested != null);
  return <div className="mb-3 rounded-xl border border-border bg-card p-3">
    <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold">Önerilen fiyatlar · önizleme</p><Button variant="ghost" size="icon" className="size-8" aria-label="Kapat" onClick={onClose}><X /></Button></div>
    {rows.length === 0 ? <p className="text-xs text-muted-foreground">Bu ülke için rakip verisi yok; öneri oluşturulamaz.</p> : <ul className="divide-y divide-border text-sm">
      {rows.map((r) => <li key={r.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-1.5">
        <input type="checkbox" aria-label={`${packageKeyLabel(r.key)} seç`} disabled={r.result.suggested == null || r.result.suggested === r.current} checked={!!selected[r.key]} onChange={(e) => setSelected((s) => ({ ...s, [r.key]: e.target.checked }))} />
        <span className="truncate font-semibold">{packageKeyLabel(r.key)}</span>
        <span className="text-right text-xs tabular-nums">{r.result.suggested == null ? <span className="font-semibold text-destructive">Güvenli rekabet mümkün değil</span> : r.result.suggested === r.current ? "Zaten önerilen fiyatta" : <>{euro(r.current)} → <b>önerilen {euro(r.result.suggested)}</b></>}</span>
      </li>)}
    </ul>}
    {lossDialog}
    {chosen.length > 0 && <Button className="mt-3" size="sm" variant="cta" disabled={pending} onClick={() => save({ scope: iso, entries: chosen.map((r) => ({ key: r.key, price: r.result.suggested })) })}>Seçilen fiyatları uygula ({chosen.length})</Button>}
  </div>;
}

function CompetitorPanel({ iso, countries, onClose }: { iso: string; countries: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ["manual-pricing", "competitors"], queryFn: () => getCompetitorStore() });
  const [country, setCountry] = useState(iso);
  const [csv, setCsv] = useState("");
  const [names, setNames] = useState<string[] | null>(null);
  const preview = useMutation({ mutationFn: () => previewCompetitorImport({ data: { csv } }) });
  const save = useMutation({
    mutationFn: (args: { add?: any[]; removeIds?: string[]; competitors?: string[] }) => saveCompetitorPrices({ data: args }),
    onSuccess: async (r) => { toast.success(`Kaydedildi. ${r.added} fiyat eklendi.`); preview.reset(); setCsv(""); await queryClient.invalidateQueries({ queryKey: ["manual-pricing"] }); },
    onError: (e: Error) => toast.error(e.message || "Kaydedilemedi."),
  });
  if (store.isLoading) return <AdminLoading />;
  if (store.error || !store.data) return <AdminError error={store.error} />;
  const list = store.data.entries.filter((e) => e.iso === country).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  const currentNames = names ?? store.data.competitors;
  const readFile = (file: File | undefined) => { if (!file || file.size > 500_000) return; file.text().then(setCsv); };
  return <AdminPanel title="Rakip fiyatları" action={<Button variant="ghost" size="sm" onClick={onClose}>Ülke fiyatlarına dön</Button>}>
    <p className="mb-3 text-xs text-muted-foreground">Yalnızca senin araştırıp girdiğin fiyatlar kullanılır; otomatik veri toplama yok. Karşılaştırma aynı ülke, paket türü, veri ve gün ile yapılır.</p>
    <details className="mb-3 rounded-lg border border-border"><summary className="cursor-pointer p-2.5 text-sm font-bold">Rakip adları</summary>
      <div className="grid gap-2 border-t border-border p-2.5 sm:grid-cols-4">{currentNames.map((n, i) => <input key={i} aria-label={`Rakip ${i + 1}`} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" value={n} onChange={(e) => setNames(currentNames.map((x, j) => (j === i ? e.target.value : x)))} />)}</div>
      {names && <Button className="mx-2.5 mb-2.5" size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ competitors: names })}>Adları kaydet</Button>}
    </details>
    {RESEARCH_FILES.map((f) => <ResearchImport key={f.id} fileId={f.id} label={f.label} history={store.data.history.filter((h) => h.file === f.file)} />)}
    <details className="mb-3 rounded-lg border border-border"><summary className="cursor-pointer p-2.5 text-sm font-bold">CSV içe aktar</summary>
      <div className="border-t border-border p-2.5">
        <p className="mb-2 text-[11px] text-muted-foreground">Sütunlar: rakip, ülke (TR), tür (STANDARD/UNLIMITED), GB, gün, fiyat, para birimi, kaynak, kontrol tarihi (05.10.2026)</p>
        <input type="file" accept=".csv,text/csv,text/plain" aria-label="CSV dosyası" className="mb-2 block w-full text-xs" onChange={(e) => readFile(e.target.files?.[0])} />
        <textarea aria-label="CSV metni" className="h-28 w-full rounded-lg border border-input bg-background p-2 font-mono text-xs" placeholder="Airalo,TR,STANDARD,10,30,15.99,EUR,airalo.com,05.10.2026" value={csv} onChange={(e) => { setCsv(e.target.value); preview.reset(); }} />
        <Button className="mt-2" size="sm" variant="outline" disabled={!csv.trim() || preview.isPending} onClick={() => preview.mutate()}>Önizle</Button>
        {preview.data && <div className="mt-3 text-xs">
          <p className="font-semibold">{preview.data.valid.length} geçerli · {preview.data.invalid.length} reddedildi</p>
          {preview.data.invalid.slice(0, 20).map((r) => <p key={r.line} className="text-destructive">Satır {r.line}: {r.error}</p>)}
          <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">{preview.data.valid.slice(0, 200).map((e, i) => <li key={i}>{e.competitor} · {e.iso} · {packageKeyLabel(e.key)} · {e.price} {e.currency} · {e.checkedAt}</li>)}</ul>
          {preview.data.valid.length > 0 && <Button className="mt-2" size="sm" variant="cta" disabled={save.isPending} onClick={() => save.mutate({ add: preview.data!.valid })}>Onayla ve {preview.data.valid.length} fiyatı kaydet</Button>}
        </div>}
      </div>
    </details>
    <label className="text-xs font-semibold">Ülke<select className="mt-1 mb-2 block h-10 w-full rounded-lg border border-input bg-background px-2 text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>{countries.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}</select></label>
    {list.length === 0 ? <p className="text-sm text-muted-foreground">{countryName(country)} için rakip verisi yok.</p> : <ul className="divide-y divide-border rounded-lg border border-border text-sm">
      {list.map((e) => <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 p-2">
        <span className="min-w-0"><span className="block truncate font-semibold">{e.competitor} · {packageKeyLabel(e.key)}</span><span className="block truncate text-[10px] text-muted-foreground">{ageLabel(e.checkedAt)}{e.source ? ` · ${e.source}` : ""}</span></span>
        <span className="tabular-nums font-semibold">{e.price} {e.currency}</span>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Sil" disabled={save.isPending} onClick={() => save.mutate({ removeIds: [e.id] })}><X /></Button>
      </li>)}
    </ul>}
  </AdminPanel>;
}

const RESEARCH_FILES = [
  { id: "airalo-2026-10-05", file: "Pasaport_Airalo_Video_Fiyatlari.xlsx", label: "Airalo içe aktarımı · App video 1 · 05.10.2026" },
  { id: "airalo-2026-10-05-video2", file: "Pasaport_Airalo_Video2_Fiyatlari.xlsx", label: "Airalo içe aktarımı · App video 2 · 05.10.2026" },
  { id: "airalo-2026-10-05-video3", file: "Pasaport_Airalo_Video3_Fiyatlari.xlsx", label: "Airalo içe aktarımı · App video 3 · 05.10.2026" },
  { id: "airalo-2026-10-06-video4", file: "Pasaport_Airalo_Video4_Fiyatlari.xlsx", label: "Airalo içe aktarımı · App video 4 · 06.10.2026" },
];
function ResearchImport({ fileId, label, history }: { fileId: string; label: string; history: { file?: string; at: string; competitor: string; checkedAt: string; rows: number; countries: number; newRecords: number; updated: number; invalid: number; sourceType: string }[] }) {
  const queryClient = useQueryClient();
  const preview = useMutation({ mutationFn: () => previewResearchImport({ data: { fileId } }) });
  const commit = useMutation({
    mutationFn: () => commitResearchImport({ data: { fileId } }),
    onSuccess: async (r) => { toast.success(`Airalo verisi içe aktarıldı: ${r.newRecords} yeni, ${r.updated} güncellendi.`); preview.reset(); await queryClient.invalidateQueries({ queryKey: ["manual-pricing"] }); },
    onError: (e: Error) => toast.error(e.message || "İçe aktarılamadı."),
  });
  const s = preview.data?.summary;
  const items: [string, number][] = s ? [["Satır", s.rows], ["Ülke", s.countries], ["Standard", s.standard], ["Unlimited", s.unlimited], ["Yeni", s.newRecords], ["Güncellenecek", s.updated], ["Değişmeyen", s.unchanged], ["Tekrar", s.duplicates], ["Geçersiz", s.invalid], ["Ülke eşleşmesi gerekli", s.countryMatchRequired]] : [];
  return <details className="mb-3 rounded-lg border border-border" open={history.length === 0}><summary className="cursor-pointer p-2.5 text-sm font-bold">{label}</summary>
    <div className="border-t border-border p-2.5 text-xs">
      <p className="mb-2 text-muted-foreground">Kaynak: Airalo uygulamasındaki müşteri fiyatları (manuel araştırma). Satış fiyatları değişmez; yalnızca karşılaştırma için kullanılır.</p>
      <Button size="sm" variant="outline" disabled={preview.isPending} onClick={() => preview.mutate()}>Önizle</Button>
      {preview.error && <p className="mt-2 text-destructive">{(preview.error as Error).message}</p>}
      {s && <div className="mt-3">
        <p className="font-bold">AIRALO IMPORT</p>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-5">{items.map(([k, v]) => <div key={k} className="flex justify-between gap-2 rounded bg-secondary/40 px-2 py-1"><dt className="text-muted-foreground">{k}</dt><dd className="font-bold tabular-nums">{v}</dd></div>)}</dl>
        {preview.data!.invalid.slice(0, 20).map((r) => <p key={r.line} className="text-destructive">Satır {r.line}: {r.error}</p>)}
        {preview.data!.countryMatchRequired.slice(0, 20).map((r) => <p key={r.line} className="text-destructive">Satır {r.line}: COUNTRY_MATCH_REQUIRED ({r.countryName})</p>)}
        {s.newRecords + s.updated > 0 ? <Button className="mt-2" size="sm" variant="cta" disabled={commit.isPending} onClick={() => commit.mutate()}>Airalo verisini içe aktar</Button> : <p className="mt-2 font-semibold text-muted-foreground">İçe aktarılacak yeni veya değişen kayıt yok.</p>}
      </div>}
      {history.length > 0 && <div className="mt-3"><p className="font-bold">İçe aktarma geçmişi</p><ul className="mt-1 space-y-1">{[...history].reverse().slice(0, 10).map((h) => <li key={h.at} className="rounded bg-secondary/40 px-2 py-1">{h.competitor} · {trDate(h.checkedAt)} · {h.rows} satır · {h.countries} ülke · Yeni {h.newRecords} · Güncellendi {h.updated} · Geçersiz {h.invalid} · Kaynak: Airalo App Research</li>)}</ul></div>}
    </div>
  </details>;
}
