import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, MoreHorizontal, Search, Settings2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { Button } from "@/components/ui/button";
import { getCountryPricing, getManualPricingOverview, previewCopyCountryPrices, saveManualPrices } from "@/lib/manual-pricing.functions";
import { packageKeyLabel, profitAndMargin } from "@/domain/pricing/manual-prices";

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
  const [view, setView] = useState<"country" | "global" | "copy">("country");
  const [selectedIso, setSelectedIso] = useState("TR");
  const overview = useQuery({ queryKey: ["manual-pricing", "overview"], queryFn: () => getManualPricingOverview() });
  return (
    <AdminGate title="Paket fiyatları">
      {overview.isLoading ? <AdminLoading /> : overview.error ? <AdminError error={overview.error} /> : overview.data && (
        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <CountryPicker countries={overview.data.countries} selectedIso={selectedIso} onSelect={(iso) => { setSelectedIso(iso); setView("country"); }} />
            <div className="flex shrink-0 gap-1">
              <Button variant={view === "global" ? "default" : "outline"} size="icon" aria-label="Genel fiyatlar" title="Genel fiyatlar" onClick={() => setView(view === "global" ? "country" : "global")}><Settings2 /></Button>
              <Button variant={view === "copy" ? "default" : "outline"} size="icon" aria-label="Diğer işlemler" title="Diğer işlemler" onClick={() => setView(view === "copy" ? "country" : "copy")}><MoreHorizontal /></Button>
            </div>
          </div>
          {view === "global" ? <GlobalPrices data={overview.data} onClose={() => setView("country")} />
            : view === "copy" ? <CopyPrices countries={overview.data.countries.map((country) => country.iso)} onClose={() => setView("country")} />
              : <CountryPrices iso={selectedIso} summary={overview.data.countries.find((country) => country.iso === selectedIso) ?? null} />}
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

function CountryPrices({ iso, summary }: { iso: string; summary: Overview["countries"][number] | null }) {
  const query = useQuery({ queryKey: ["manual-pricing", "country", iso], queryFn: () => getCountryPricing({ data: { iso } }) });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<"standard" | "unlimited">("standard");
  const { save, pending, lossDialog } = useSave(() => setEdits({}));
  const groups = useMemo(() => groupCountryRows(query.data?.rows ?? []), [query.data]);
  const standard = groups.filter((group) => !group.key.startsWith("U|"));
  const unlimited = groups.filter((group) => group.key.startsWith("U|"));
  const visible = kind === "standard" ? standard : unlimited;
  const changed = Object.entries(edits).filter(([key, value]) => {
    const current = groups.find((group) => group.key === key)?.rows[0]?.country ?? null;
    return parse(value) !== current;
  });
  if (query.isLoading) return <AdminLoading label={`${countryName(iso)} paketleri yükleniyor…`} />;
  if (query.error) return <AdminError error={query.error} />;
  return <section className="min-w-0 pb-20">
    <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0"><h2 className="flex items-center gap-2 font-display text-xl font-bold"><CountryFlag iso={iso} className="text-base" /><span className="truncate">{countryName(iso)}</span></h2><p className="mt-0.5 text-xs text-muted-foreground">{summary?.packages ?? query.data?.rows.length ?? 0} paket</p></div>
    </header>
    <div className="mb-3 grid grid-cols-2 rounded-xl bg-secondary p-1" aria-label="Paket türü">
      <Button variant="ghost" className={`h-9 ${kind === "standard" ? "!bg-primary !text-primary-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setKind("standard")}>STANDARD · {standard.length}</Button>
      <Button variant="ghost" className={`h-9 ${kind === "unlimited" ? "!bg-primary !text-primary-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => setKind("unlimited")}>UNLIMITED · {unlimited.length}</Button>
    </div>
    {lossDialog}
    <div className="space-y-2 md:hidden">
      {visible.map((group) => <MobilePriceRow key={group.key} group={group} iso={iso} edit={edits[group.key] ?? null} onEdit={(value) => setEdits((current) => ({ ...current, [group.key]: value }))} />)}
    </div>
    <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Paket</th><th className="px-3 py-2">Alış</th><th className="px-3 py-2">Satış fiyatı</th><th className="px-3 py-2">Kâr</th><th className="px-3 py-2">Marj</th><th className="px-3 py-2">Kaynak</th></tr></thead>
        <tbody>{visible.map((group) => <DesktopPriceRow key={group.key} group={group} iso={iso} edit={edits[group.key] ?? null} onEdit={(value) => setEdits((current) => ({ ...current, [group.key]: value }))} />)}</tbody>
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

function PriceInput({ iso, group, value, onEdit }: { iso: string; group: PackageGroup; value: string; onEdit: (value: string) => void }) {
  return <div className="relative w-28"><input aria-label={`${iso} satış fiyatı ${packageKeyLabel(group.key)}`} inputMode="decimal" className="h-10 w-full rounded-lg border-2 border-primary/35 bg-background px-2.5 pr-7 text-right text-base font-bold tabular-nums outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15" value={value} onChange={(event) => onEdit(event.target.value)} onFocus={(event) => event.currentTarget.select()} /><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span></div>;
}

function MobilePriceRow({ group, iso, edit, onEdit }: { group: PackageGroup; iso: string; edit: string | null; onEdit: (value: string) => void }) {
  const details = resolvedGroup(group, edit);
  if (!details) return null;
  const value = edit === null ? String(details.active ?? "") : edit;
  return <article className={`rounded-lg border bg-card p-3 ${details.metrics.loss ? "border-destructive/50" : "border-border"}`}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="min-w-0"><h3 className="truncate text-sm font-bold">{packageKeyLabel(group.key)}</h3><p className="mt-1 text-xs text-muted-foreground">Alış {euro(details.cost)}{group.rows.length > 1 ? ` · ${group.rows.length} ürün` : ""}</p></div>
      <SourceBadge source={details.source} />
    </div>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><p className="text-[11px] font-semibold text-muted-foreground">Satış fiyatı</p><p className={`mt-0.5 truncate text-xs ${details.metrics.loss || details.low ? "font-bold text-destructive" : "text-muted-foreground"}`}>{details.metrics.loss ? "Zarar" : details.low ? "Düşük marj" : `Kâr ${euro(details.metrics.profit)} · ${pct(details.metrics.margin)}`}</p></div>
      <PriceInput iso={iso} group={group} value={value} onEdit={onEdit} />
    </div>
    {details.first.country != null && <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-[11px]" onClick={() => onEdit("")}>Ülkeye özel fiyatı kaldır</Button>}
  </article>;
}

function DesktopPriceRow({ group, iso, edit, onEdit }: { group: PackageGroup; iso: string; edit: string | null; onEdit: (value: string) => void }) {
  const details = resolvedGroup(group, edit);
  if (!details) return null;
  const value = edit === null ? String(details.active ?? "") : edit;
  return <tr className="border-t border-border">
    <td className="px-3 py-2 font-semibold">{packageKeyLabel(group.key)}{group.rows.length > 1 && <span className="ml-1 text-xs font-normal text-muted-foreground">×{group.rows.length}</span>}</td>
    <td className="px-3 py-2 tabular-nums text-muted-foreground">{euro(details.cost)}</td>
    <td className="px-3 py-2"><PriceInput iso={iso} group={group} value={value} onEdit={onEdit} />{details.first.country != null && <Button variant="link" size="sm" className="block h-auto px-0 pt-1 text-[10px]" onClick={() => onEdit("")}>Override'ı kaldır</Button>}</td>
    <td className={`px-3 py-2 tabular-nums ${details.metrics.loss ? "font-bold text-destructive" : ""}`}>{euro(details.metrics.profit)}</td>
    <td className={`px-3 py-2 tabular-nums ${details.low ? "font-bold text-destructive" : ""}`}>{pct(details.metrics.margin)}{details.metrics.loss ? <span className="block text-[10px]">Zarar</span> : details.low ? <span className="block text-[10px]">Düşük marj</span> : null}</td>
    <td className="px-3 py-2"><SourceBadge source={details.source} /></td>
  </tr>;
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