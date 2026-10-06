import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Plane, RadioTower, Ticket } from "lucide-react";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { adminScopeOf, countryLabel, matchContext, resolveCountryQuery, type CountrySummary, type MatchContext } from "@/domain/esim/admin-catalogue";
import { foldText } from "@/domain/geo/countries";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminCatalogue, getAdminCatalogueFacets } from "@/lib/admin-control.functions";
import { bulkUpdateProducts, listPricingRules, updateProduct } from "@/lib/admin-catalog.functions";
import { itemMargin } from "@/domain/finance/formulas";
import { explainPrice, pricingFromRule } from "@/domain/pricing-rule";
import { selectPricingRule } from "@/domain/providers/sync-engine";

const ROUNDING_LABELS: Record<string, string> = { NONE: "Yuvarlama yok", TWO_DECIMALS: "2 ondalık", INTEGER: "Tam sayıya yukarı", NEAREST_99: "… ,99 ile bitir", NEAREST_95: "… ,95 ile bitir" };

/** Truthful price source: stored data only, never inferred from the current rule. */
function priceSource(product: any): "REVIEW" | "MANUAL" | "APPLIED" | "LEGACY" {
  if (product.pricing_review_required) return "REVIEW";
  if (product.price_overridden) return "MANUAL";
  return product.pricing_snapshot ? "APPLIED" : "LEGACY";
}

function PriceSourceBadge({ product }: { product: any }) {
  const source = priceSource(product);
  if (source === "REVIEW") return <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Fiyat incelemesi gerekli</span>;
  if (source === "MANUAL") return <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-foreground">Manuel fiyat</span>;
  if (source === "LEGACY") return <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground"title="Bu fiyat için kayıtlı bir fiyat kuralı çıktısı yok; aktif kuralın bu fiyatı ürettiği kanıtlanamaz.">Önceki katalog fiyatı · kural kaydı yok</span>;
  return <span className="inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Kural uygulandı</span>;
}

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => adminHead("Katalog", "eSIM paketleri ve Lounge ürün grupları."),
  component: Products,
});

type Service = "ESIM" | "LOUNGE" | "VIGNETTE";
type Scope = "ALL" | "COUNTRY" | "REGION" | "GLOBAL" | "SUBDIVISION";
type DataType = "ALL" | "STANDARD" | "UNLIMITED";

const SCOPE_LABEL: Record<Exclude<Scope, "ALL">, string> = { COUNTRY: "Ülke ürünü", REGION: "Bölgesel", GLOBAL: "Global", SUBDIVISION: "Alt bölge" };

function detailOf(product: any) {
  const details = product.esim_product_details;
  return Array.isArray(details) ? details[0] : details;
}

function unlimitedTier(name: string): string {
  if (/unlimited plus/i.test(name)) return "Sınırsız Plus";
  if (/unlimited essential/i.test(name)) return "Sınırsız Essential";
  if (/unlimited lite/i.test(name)) return "Sınırsız Lite";
  return "Sınırsız";
}

function ProductRow({ product, selected, onToggle, onOpen, match }: { product: any; selected: boolean; onToggle: () => void; onOpen: () => void; match?: MatchContext | null }) {
  const detail = detailOf(product);
  const isEsim = product.service_type === "ESIM";
  const scope = isEsim ? adminScopeOf(detail) : null;
  const coverage: string[] = detail?.coverage_country_isos ?? [];
  const title = isEsim
    ? `${detail?.unlimited_data ? unlimitedTier(product.name ?? "") : `${detail?.data_gb == null ? "—" : Number(detail.data_gb)} GB`} · ${detail?.validity_days ?? "—"} gün`
    : (product.lounge_product_details?.lounge_name ?? product.name);
  const where = !isEsim
    ? `${product.lounge_product_details?.iata ?? product.airports?.iata ?? "—"} · ${product.lounge_product_details?.terminal ?? "Terminal belirtilmedi"}`
    : scope === "COUNTRY" && detail?.country_iso
      ? countryLabel(detail.country_iso)
      : `${detail?.regions?.name ?? SCOPE_LABEL[scope ?? "REGION"]} · ${coverage.length} ülke`;
  const margin = itemMargin(Number(product.sale_price ?? 0), Number(product.provider_cost ?? 0));
  return (
    <div className="flex items-start gap-2 border-b border-border px-2 py-2.5 text-xs last:border-0">
      <input type="checkbox" className="mt-1" aria-label="Ürünü seç" checked={selected} onChange={onToggle} />
      <button type="button" onClick={onOpen} className="grid w-full min-w-0 gap-1.5 text-left hover:opacity-80 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            {isEsim && scope === "COUNTRY" && detail?.country_iso && <CountryFlag iso={detail.country_iso} />}
            <strong className="text-sm">{title}</strong>
          </span>
          <span className="mt-0.5 block text-muted-foreground">{where}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            {isEsim && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{detail?.unlimited_data ? "UNLIMITED" : "STANDARD"}</span>}
            {isEsim && scope && scope !== "COUNTRY" && <span className="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">{SCOPE_LABEL[scope]}</span>}
            <StatusBadge value={product.lifecycle} />
            {match && match.kind !== "COUNTRY" && <span className="rounded-full border border-info/30 px-2 py-0.5 text-[10px] font-semibold text-info">{match.label}</span>}
          </span>
          <span className="mt-1 block truncate text-[10px] text-muted-foreground">{product.name} · {product.provider_external_id ?? "—"}</span>
        </span>
        <span className="grid content-start gap-0.5 sm:text-right">
          <span className="text-sm font-semibold">{product.sale_price == null ? "Fiyat yok" : money(product.sale_price, product.currency)} <span className="text-[10px] font-normal text-muted-foreground">satış</span></span>
          <span className="text-muted-foreground">{product.provider_cost == null ? "—" : money(product.provider_cost, product.provider_currency ?? product.currency)} tedarikçi maliyeti</span>
          <span className={product.margin_flagged ? "font-semibold text-destructive" : ""}>{margin.percent == null ? "—" : `%${margin.percent.toFixed(1)} marj`}</span>
          <span className="text-muted-foreground">{product.providers?.name ?? "Provider yok"}</span>
          <span><PriceSourceBadge product={product} /></span>
        </span>
      </button>
    </div>
  );
}

function ProductSection({ title, query, selectedIds, onToggle, onOpen, matchIso, rowsRef }: { title: string; query: Record<string, unknown>; selectedIds: string[]; onToggle: (id: string) => void; onOpen: (product: any) => void; matchIso?: string; rowsRef?: never }) {
  const [page, setPage] = useState(1);
  const full = { limit: 100, ...query, page };
  const result = useQuery({ queryKey: ["admin-catalogue-v4", full], queryFn: () => getAdminCatalogue({ data: full as any }), placeholderData: (previous) => previous });
  void rowsRef;
  if (result.isPending) return <AdminLoading />;
  if (result.error) return <AdminError error={result.error} />;
  const rows = (result.data?.rows ?? []) as any[];
  return (
    <section className="grid gap-1">
      <h4 className="px-2 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title} · {result.data?.filtered ?? 0}</h4>
      {!rows.length ? <p className="px-2 pb-2 text-xs text-muted-foreground">Ürün yok.</p> : rows.map((product) => (
        <ProductRow key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={() => onToggle(product.id)} onOpen={() => onOpen(product)} match={matchIso ? matchContext(detailOf(product), matchIso) : null} />
      ))}
      {(result.data?.pageCount ?? 1) > 1 && (
        <div className="flex items-center gap-2 px-2 py-1 text-xs">
          <span className="text-muted-foreground">sayfa {result.data?.page}/{result.data?.pageCount}</span>
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</Button>
          <Button size="sm" variant="outline" disabled={page >= (result.data?.pageCount ?? 1)} onClick={() => setPage((value) => value + 1)}>Sonraki</Button>
        </div>
      )}
    </section>
  );
}

function CountryPanel({ summary, selectedIds, onToggle, onOpen }: { summary: CountrySummary; selectedIds: string[]; onToggle: (id: string) => void; onOpen: (product: any) => void }) {
  const [showWide, setShowWide] = useState(false);
  const base = { service: "ESIM" };
  return (
    <div className="border-t border-border p-2">
      {summary.standard > 0 && <ProductSection title="Standard" query={{ ...base, countryIso: summary.iso, scope: "COUNTRY", dataType: "STANDARD" }} selectedIds={selectedIds} onToggle={onToggle} onOpen={onOpen} />}
      {summary.unlimited > 0 && <ProductSection title="Unlimited" query={{ ...base, countryIso: summary.iso, scope: "COUNTRY", dataType: "UNLIMITED" }} selectedIds={selectedIds} onToggle={onToggle} onOpen={onOpen} />}
      {summary.standard + summary.unlimited === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">Bu ülkeye özel ürün yok.</p>}
      {summary.regional + summary.global > 0 && (
        <div className="mt-2 rounded-md bg-secondary/30 p-1">
          <Button size="sm" variant="ghost" onClick={() => setShowWide((value) => !value)}>
            {showWide ? "Kapsayan çok ülkeli ürünleri gizle" : `${countryLabel(summary.iso)} ülkesini kapsayan çok ülkeli ürünler (${summary.regional} bölgesel · ${summary.global} global)`}
          </Button>
          {showWide && (
            <>
              {summary.regional > 0 && <ProductSection title="Bölgesel / çok ülkeli" query={{ ...base, coverageIso: summary.iso, scope: "REGION" }} selectedIds={selectedIds} onToggle={onToggle} onOpen={onOpen} matchIso={summary.iso} />}
              {summary.global > 0 && <ProductSection title="Global" query={{ ...base, coverageIso: summary.iso, scope: "GLOBAL" }} selectedIds={selectedIds} onToggle={onToggle} onOpen={onOpen} matchIso={summary.iso} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Products() {
  const queryClient = useQueryClient();
  const [service, setService] = useState<Service>("ESIM");
  const [openProduct, setOpenProduct] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("ALL");
  const [scope, setScope] = useState<Scope>("ALL");
  const [dataType, setDataType] = useState<DataType>("ALL");
  const [availability, setAvailability] = useState<"ALL" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [lifecycle, setLifecycle] = useState("ALL");
  const [marginOnly, setMarginOnly] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [openCountries, setOpenCountries] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRule, setBulkRule] = useState("");

  const facets = useQuery({ queryKey: ["admin-catalogue-facets-v2"], queryFn: () => getAdminCatalogueFacets() });
  const rules = useQuery({ queryKey: ["pricing-rules"], queryFn: () => listPricingRules() });
  const summaries = (facets.data?.countrySummaries ?? []) as CountrySummary[];
  const knownIsos = useMemo(() => summaries.map((row) => row.iso), [summaries]);

  // A search that is an ISO code or a country name becomes a coverage search,
  // so every result can say why it matched.
  const countryMatch = service === "ESIM" ? resolveCountryQuery(search, knownIsos) : null;
  const filtersActive = Boolean(search.trim()) || provider !== "ALL" || scope !== "ALL" || dataType !== "ALL" || availability !== "ALL" || lifecycle !== "ALL" || marginOnly;
  const browseCountries = service === "ESIM" && !filtersActive;

  // Server-side paging: the catalogue holds thousands of products, so the
  // browser only ever receives the current page.
  const query = {
    page, limit: 50, service,
    search: countryMatch ? "" : search,
    coverageIso: countryMatch ?? "",
    providerId: provider, countryIso: "ALL", availability, lifecycle, packageKind: "ALL", marginOnly,
    scope: service === "ESIM" ? scope : "ALL", dataType: service === "ESIM" ? dataType : "ALL",
  };
  const catalogue = useQuery({
    queryKey: ["admin-catalogue-v4", query],
    queryFn: () => getAdminCatalogue({ data: query as any }),
    placeholderData: (previous) => previous,
    enabled: !browseCountries,
  });

  useEffect(() => { setPage(1); }, [service, search, provider, scope, dataType, availability, lifecycle, marginOnly]);

  const rows: any[] = (catalogue.data?.rows ?? []) as any[];
  const providerOptions = (facets.data?.providers ?? []).filter((row) => row.service_type === service);

  const countryRows = useMemo(() => {
    const term = countrySearch.trim();
    const list = summaries
      .filter((row) => row.standard + row.unlimited > 0)
      .map((row) => ({ ...row, name: countryLabel(row.iso) }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    if (!term) return list;
    const folded = foldText(term);
    return list.filter((row) => row.iso === term.toUpperCase() || foldText(row.name).includes(folded) || foldText(countryLabel(row.iso, "en")).includes(folded) || foldText(countryLabel(row.iso, "de")).includes(folded));
  }, [summaries, countrySearch]);

  const bulk = useMutation({
    mutationFn: (action: Parameters<typeof bulkUpdateProducts>[0]["data"]["action"]) =>
      bulkUpdateProducts({ data: { ids: selectedIds, action, pricingRuleId: bulkRule || null } }),
    onSuccess: async () => { setSelectedIds([]); await queryClient.invalidateQueries({ queryKey: ["admin-catalogue-v4"] }); },
  });

  const toggle = (id: string) => setSelectedIds((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));
  const switchService = (next: Service) => { setService(next); setSelectedIds([]); setProvider("ALL"); setScope("ALL"); setDataType("ALL"); };
  const scopes = facets.data?.scopes;

  return (
    <AdminGate title="Ürün kataloğu">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={service === "ESIM" ? "secondary" : "outline"} onClick={() => switchService("ESIM")}><RadioTower />eSIM</Button>
          <Button size="sm" variant={service === "LOUNGE" ? "secondary" : "outline"} onClick={() => switchService("LOUNGE")}><Plane />Lounge</Button>
          <Button size="sm" variant={service === "VIGNETTE" ? "secondary" : "outline"} onClick={() => switchService("VIGNETTE")}><Ticket />Vignette</Button>
        </div>

        <AdminPanel title="Filtreler">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Ara"><input className="admin-field mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={service === "ESIM" ? "Ürün adı, ülke adı veya ISO (AU, Australia)" : "Ürün adı"} /></Field>
            <Field label="Tedarikçi">
              <select className="admin-field mt-1 w-full" value={provider} onChange={(event) => setProvider(event.target.value)}>
                <option value="ALL">Tümü</option>
                {providerOptions.map((row: { id: string; name: string }) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
            {service === "ESIM" && (
              <>
                <Field label="Kapsama">
                  <select className="admin-field mt-1 w-full" value={scope} onChange={(event) => setScope(event.target.value as Scope)}>
                    <option value="ALL">Tümü</option>
                    <option value="COUNTRY">Ülkeye özel</option>
                    <option value="REGION">Bölgesel</option>
                    <option value="GLOBAL">Global</option>
                    <option value="SUBDIVISION">Alt bölge</option>
                  </select>
                </Field>
                <Field label="Tür">
                  <select className="admin-field mt-1 w-full" value={dataType} onChange={(event) => setDataType(event.target.value as DataType)}>
                    <option value="ALL">Tümü</option>
                    <option value="STANDARD">Standard</option>
                    <option value="UNLIMITED">Unlimited</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Durum">
              <select className="admin-field mt-1 w-full" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>
                <option value="ALL">Tümü</option>
                <option value="PUBLISHED">Yayında</option>
                <option value="DRAFT">Taslak</option>
                <option value="PRICE_REVIEW">Fiyat incelemesi</option>
                {["IMPORTED", "READY", "PAUSED", "UNAVAILABLE", "ARCHIVED"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Uygunluk">
              <select className="admin-field mt-1 w-full" value={availability} onChange={(event) => setAvailability(event.target.value as "ALL" | "AVAILABLE" | "UNAVAILABLE")}>
                <option value="ALL">Tümü</option>
                <option value="AVAILABLE">Satışa uygun</option>
                <option value="UNAVAILABLE">Provider’da yok</option>
              </select>
            </Field>
            <label className="flex items-end gap-2 text-xs font-semibold"><input type="checkbox" checked={marginOnly} onChange={(event) => setMarginOnly(event.target.checked)} />Yalnızca marj uyarısı olanlar</label>
          </div>
          {countryMatch && <p className="mt-2 text-[11px] text-muted-foreground">“{search}” bir ülke olarak algılandı: <strong>{countryLabel(countryMatch)} ({countryMatch})</strong> kapsamındaki tüm ürünler gösteriliyor; her ürünün neden eşleştiği etiketlidir.</p>}
        </AdminPanel>

        {selectedIds.length > 0 && (
          <AdminPanel title={`${selectedIds.length} ürün seçildi`}>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("PUBLISH")}>Yayınla</Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("PAUSE")}>Duraklat</Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("SHOW")}>Müşteriye göster</Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("HIDE")}>Müşteriden gizle</Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("FEATURE")}>Öne çıkar</Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("UNFEATURE")}>Öne çıkarmayı kaldır</Button>
              <select className="admin-field h-9" value={bulkRule} onChange={(event) => setBulkRule(event.target.value)}>
                <option value="">Fiyat kuralı seç</option>
                {(((rules.data as any)?.rules ?? []) as any[]).map((row: any) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={bulk.isPending || !bulkRule} onClick={() => bulk.mutate("ASSIGN_RULE")}>Kuralı ata</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Seçimi temizle</Button>
            </div>
          </AdminPanel>
        )}

        {browseCountries ? (
          facets.isPending ? <AdminLoading /> : facets.error ? <AdminError error={facets.error} /> : (
            <AdminPanel title="Ülkeler" action={<span className="text-[11px] text-muted-foreground">{countryRows.length} ülke</span>}>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {scopes && (["REGION", "GLOBAL", "SUBDIVISION"] as const).filter((key) => scopes[key] > 0).map((key) => (
                  <Button key={key} size="sm" variant="outline" onClick={() => setScope(key)}>{SCOPE_LABEL[key]} ürünler · {scopes[key]}</Button>
                ))}
              </div>
              <input className="admin-field mb-2 w-full" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)} placeholder="Ülke ara (ad veya ISO)" aria-label="Ülke ara" />
              <p className="mb-2 text-[10px] text-muted-foreground">Sayı = o ülkeye özel ürünler (Standard + Unlimited). Ülkeyi de kapsayan bölgesel/global ürünler ayrıca gösterilir ve bu sayıya eklenmez.</p>
              {!countryRows.length ? <EmptyState title="Eşleşen ülke yok." /> : (
                <div className="grid gap-1.5">
                  {countryRows.map((row) => {
                    const open = openCountries.includes(row.iso);
                    return (
                      <div key={row.iso} className="rounded-md border border-border bg-background">
                        <button type="button" aria-expanded={open} onClick={() => setOpenCountries((current) => open ? current.filter((iso) => iso !== row.iso) : [...current, row.iso])} className="flex w-full items-center gap-3 p-2.5 text-left">
                          <CountryFlag iso={row.iso} className="text-base" />
                          <strong className="min-w-0 flex-1 truncate text-sm">{row.name}</strong>
                          <span className="w-8 text-xs font-semibold text-muted-foreground">{row.iso}</span>
                          <span className="text-right text-xs"><strong>{row.standard + row.unlimited}</strong> ürün<span className="block text-[10px] text-muted-foreground">{row.standard} std · {row.unlimited} unl{row.regional + row.global ? ` · +${row.regional + row.global} kapsayan` : ""}</span></span>
                          <ChevronDown className={`size-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
                        </button>
                        {open && <CountryPanel summary={row} selectedIds={selectedIds} onToggle={toggle} onOpen={setOpenProduct} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminPanel>
          )
        ) : catalogue.isPending ? <AdminLoading /> : catalogue.error ? <AdminError error={catalogue.error} /> : (
          <AdminPanel title="Sonuçlar" action={service === "ESIM" && filtersActive ? <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setProvider("ALL"); setScope("ALL"); setDataType("ALL"); setAvailability("ALL"); setLifecycle("ALL"); setMarginOnly(false); }}>Ülke listesine dön</Button> : undefined}>
            {!rows.length ? <EmptyState title={service === "VIGNETTE" ? "Katalogda Vignette ürünü yok." : "Eşleşen ürün yok."} detail="Katalog, provider senkronu ile dolar." /> : (
              <div className="rounded-md border border-border bg-background">
                {rows.map((product) => (
                  <ProductRow key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={() => toggle(product.id)} onOpen={() => setOpenProduct(product)} match={countryMatch ? matchContext(detailOf(product), countryMatch) : null} />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                Toplam {catalogue.data?.total ?? 0} ürün · eşleşen {catalogue.data?.filtered ?? 0} · sayfa {catalogue.data?.page ?? 1}/{catalogue.data?.pageCount ?? 1}
              </span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" disabled={page <= 1 || catalogue.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Önceki</Button>
              <Button size="sm" variant="outline" disabled={page >= (catalogue.data?.pageCount ?? 1) || catalogue.isFetching} onClick={() => setPage((current) => current + 1)}>Sonraki</Button>
            </div>
          </AdminPanel>
        )}
      </div>
      <ProductDrawer product={openProduct} onClose={() => setOpenProduct(null)} />
    </AdminGate>
  );
}

function ProductDrawer({ product, onClose }: { product: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const rules = useQuery({ queryKey: ["pricing-rules"], queryFn: () => listPricingRules(), enabled: Boolean(product) });
  const [form, setForm] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return setForm(null);
    setMessage(null);
    setForm({
      name: product.name ?? "",
      salePrice: product.sale_price == null ? "" : String(product.sale_price),
      pricingMode: product.price_overridden ? "MANUAL" : "AUTO",
      pricingRuleId: product.pricing_rule_id ?? "",
      badge: product.badge ?? "",
      featured: Boolean(product.featured),
      customerVisible: Boolean(product.customer_visible),
      sortOrder: Number(product.sort_order ?? 0),
      lifecycle: product.lifecycle,
      marketingDescription: (product.product_translations ?? []).find((row: any) => row.locale === "tr")?.short_description ?? "",
    });
  }, [product]);

  const save = useMutation({
    mutationFn: () => updateProduct({
      data: {
        id: product.id,
        name: form.name,
        // Price is only sent when the pricing source or manual value actually changed,
        // so editing a badge never turns a product into a manual override.
        ...(form.pricingMode === "MANUAL" && (!product.price_overridden || Number(form.salePrice) !== Number(product.sale_price))
          ? { pricingMode: "MANUAL" as const, salePrice: form.salePrice === "" ? null : Number(String(form.salePrice).replace(",", ".")) }
          : form.pricingMode === "AUTO" && product.price_overridden ? { pricingMode: "AUTO" as const } : {}),
        badge: form.badge || null,
        featured: form.featured,
        customerVisible: form.customerVisible,
        sortOrder: Number(form.sortOrder) || 0,
        lifecycle: form.lifecycle,
        marketingDescription: form.marketingDescription || null,
      },
    }),
    onSuccess: async () => {
      setMessage("Kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-catalogue-v4"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Kaydedilemedi."),
  });

  if (!product || !form) return <AdminDrawer open={false} title="Ürün" onClose={onClose}><span /></AdminDrawer>;

  const ruleRows = (((rules.data as any)?.rules ?? []) as any[]);
  const rule = ruleRows.find((row: any) => row.id === form.pricingRuleId) ?? null;
  const cost = product.provider_cost == null ? null : Number(product.provider_cost);
  const snapshot = (product.pricing_snapshot ?? null) as any;
  // What the sync would compute today: same rule precedence + same engine.
  const activeRule = selectPricingRule(ruleRows as any[], { providerId: product.primary_provider_id ?? "", serviceType: product.service_type }) as any;
  const activePricing = pricingFromRule(activeRule, product.currency ?? "EUR", null);
  const auto = activePricing && cost != null ? explainPrice(cost, activePricing) : null;
  const manualValue = Number(String(form.salePrice).replace(",", "."));
  const manualInvalid = form.pricingMode === "MANUAL" && (form.salePrice === "" || !Number.isFinite(manualValue) || manualValue <= 0);
  const effectivePrice = form.pricingMode === "MANUAL" ? (manualInvalid ? 0 : manualValue) : Number(product.sale_price ?? 0);
  const margin = itemMargin(effectivePrice, Number(cost ?? 0));
  const minimumMargin = (rule ?? activeRule)?.minimum_margin_percent == null ? null : Number((rule ?? activeRule).minimum_margin_percent);
  const belowMinimum = minimumMargin != null && margin.percent != null && margin.percent < minimumMargin;
  const set = (patch: Record<string, unknown>) => setForm((current: any) => ({ ...current, ...patch }));

  return (
    <AdminDrawer open title={product.name} subtitle={product.service_type === "ESIM" ? "eSIM paketi" : "Lounge ürünü"} onClose={onClose}>
      <div className="grid gap-4">
        <section>
          <h3 className="admin-panel-title">Provider verisi (salt okunur)</h3>
          <DataRow label="Provider" value={product.providers?.name ?? "—"} />
          <DataRow label="Provider maliyeti" value={money(product.provider_cost, product.provider_currency ?? product.currency)} />
          <DataRow label="Provider uygunluğu" value={<StatusBadge value={product.provider_available ? "AVAILABLE" : "UNAVAILABLE"} />} />
          {product.service_type === "ESIM" ? (
            <>
              <DataRow label="Kapsama" value={(product.esim_product_details?.coverage_country_isos ?? []).join(", ") || product.esim_product_details?.country_iso || "—"} />
              <DataRow label="Veri" value={product.esim_product_details?.unlimited_data ? "Sınırsız" : `${product.esim_product_details?.data_gb ?? "—"} GB`} />
              <DataRow label="Geçerlilik" value={`${product.esim_product_details?.validity_days ?? "—"} gün`} />
            </>
          ) : (
            <>
              <DataRow label="Havalimanı" value={`${product.lounge_product_details?.iata ?? "—"} · ${product.lounge_product_details?.terminal ?? "—"}`} />
              <DataRow label="Lounge" value={product.lounge_product_details?.lounge_name ?? "—"} />
            </>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Bu alanlar provider senkronuna aittir ve panelden değiştirilemez. Aşağıdaki ticari alanlar ise senkron tarafından hiçbir zaman ezilmez.</p>
        </section>

        <section className="grid gap-3">
          <h3 className="admin-panel-title">Ticari alanlar</h3>
          <Field label="Müşteriye görünen ad"><input className="admin-field mt-1 w-full" value={form.name} onChange={(event) => set({ name: event.target.value })} /></Field>
          <section className="rounded-md border border-border p-3" aria-label="Fiyat dökümü">
            <div className="flex items-center justify-between gap-2"><h3 className="admin-panel-title">Fiyat dökümü</h3><PriceSourceBadge product={product} /></div>
            <DataRow label="Tedarikçi" value={product.providers?.name ?? "—"} />
            <DataRow label="Tedarikçi paketi" value={product.provider_external_id ?? "—"} />
            <DataRow label="Tedarikçi maliyeti" value={cost == null ? "—" : money(cost, product.provider_currency ?? product.currency)} />
            <DataRow label="Mevcut fiyat kaynağı" value={
              priceSource(product) === "MANUAL" ? "Manuel satış fiyatı"
              : priceSource(product) === "REVIEW" ? "Fiyat incelemesi gerekli"
              : snapshot ? "Otomatik · kural uygulandı"
              : "Önceki katalog fiyatı (fiyat kaydı yok)"} />
            <DataRow label="Uygulanmış kural (geçmiş)" value={snapshot?.pricingRuleName ?? (snapshot ? "—" : "Henüz fiyat kaydı yok")} />
            <DataRow label="Eşleşen kural (şu an)" value={activeRule ? `${activeRule.name}${activePricing?.markupPercent != null ? ` · %${activePricing.markupPercent}` : ""}` : "Eşleşen aktif kural yok"} />
            {snapshot && (
              <>
                <DataRow label="Kâr (kayıt)" value={snapshot.markupPercent != null ? `%${Number(snapshot.markupPercent)}` : snapshot.fixedMarkup != null ? `+${money(snapshot.fixedMarkup, snapshot.currency)}` : "—"} />
                {snapshot.rawPrice != null && <DataRow label="Yuvarlama öncesi (kayıt)" value={money(snapshot.rawPrice, snapshot.currency)} />}
                <DataRow label="Yuvarlama (kayıt)" value={ROUNDING_LABELS[snapshot.roundingMode] ?? snapshot.roundingMode ?? "—"} />
                <DataRow label="Kuralla bulunan fiyat (kayıt)" value={money(snapshot.salePrice, snapshot.currency)} />
              </>
            )}
            {auto && (
              <>
                <DataRow label="Eşleşen kural kârı" value={activePricing?.markupPercent != null ? `%${activePricing.markupPercent}` : activePricing?.fixedMarkup != null ? `+${money(activePricing.fixedMarkup, activePricing.currency)}` : "—"} />
                <DataRow label="Yuvarlama öncesi fiyat" value={money(auto.rawPrice, activePricing!.currency)} />
                <DataRow label="Yuvarlama" value={ROUNDING_LABELS[auto.roundingMode] ?? auto.roundingMode} />
                <DataRow label="Hesaplanan mağaza fiyatı" value={money(auto.salePrice, activePricing!.currency)} />
              </>
            )}
            <DataRow label="Mevcut mağaza fiyatı" value={<strong className="text-sm">{product.sale_price == null ? "Fiyat yok" : money(product.sale_price, product.currency)}</strong>} />
            <DataRow label="Son fiyat güncellemesi" value={product.priced_at ? new Date(product.priced_at).toLocaleString("tr-TR") : "—"} />
            {auto && !product.price_overridden && (
              <p className="mt-2 rounded bg-secondary/40 p-2 text-[11px]">
                {Number(product.sale_price) === auto.salePrice
                  ? "Mevcut fiyat eşleşen kuralın sonucuyla aynı."
                  : <>Bir sonraki katalog fiyatlaması: <strong>{money(auto.salePrice, activePricing!.currency)}</strong> (şu an {money(product.sale_price, product.currency)}). Hiçbir fiyat otomatik olarak şimdi değiştirilmez.</>}
                {!snapshot && <span className="block text-muted-foreground">Bir sonraki katalog güncellemesinde otomatik fiyatlanacak.</span>}
              </p>
            )}
          </section>

          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold">Fiyat kaynağı</legend>
            <p className="text-[11px] text-muted-foreground">Mevcut onaylı satış fiyatı korunur; eski otomatik kural fiyatı değiştirmez.</p>
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold"><input type="radio" name="pricing-mode" checked={form.pricingMode === "AUTO"} onChange={() => set({ pricingMode: "AUTO" })} />Mevcut fiyatı koru</label>
            <label className="mt-1 flex items-center gap-2 text-xs font-semibold"><input type="radio" name="pricing-mode" checked={form.pricingMode === "MANUAL"} onChange={() => set({ pricingMode: "MANUAL" })} />Manuel satış fiyatı</label>
            {form.pricingMode === "AUTO" && product.price_overridden && (
              <p className="mt-2 text-[11px]">Kaydedince yalnız manuel işaret kaldırılır; satış fiyatı {money(Number(product.sale_price), product.currency ?? "EUR")} olarak aynı kalır.</p>
            )}
            {form.pricingMode === "MANUAL" && (
              <div className="mt-2">
                <Field label={`Satış fiyatı (${product.currency ?? "EUR"})`} hint="Yalnızca müşteri fiyatını değiştirir; tedarikçi maliyeti değişmez.">
                  <input type="number" inputMode="decimal" step="0.01" min="0.01" className="admin-field mt-1 w-full" value={form.salePrice} onChange={(event) => set({ salePrice: event.target.value })} />
                </Field>
                {manualInvalid && <p role="alert" className="mt-1 text-xs font-semibold text-destructive">Satış fiyatı 0'dan büyük bir sayı olmalı.</p>}
              </div>
            )}
            <div className="mt-2 text-xs">
              <DataRow label="Tedarikçi maliyeti" value={cost == null ? "—" : money(cost, product.provider_currency ?? product.currency)} />
              <DataRow label={form.pricingMode === "MANUAL" ? "Manuel satış fiyatı" : "Satış fiyatı"} value={money(effectivePrice, product.currency)} />
              <DataRow label="Brüt marj (€)" value={money(margin.absolute, product.currency)} />
              <DataRow label="Brüt marj (%)" value={margin.percent == null ? "—" : `%${margin.percent.toFixed(1)}`} />
              <DataRow label="Minimum marj" value={minimumMargin == null ? "Tanımlı değil" : `%${minimumMargin.toFixed(1)}`} />
              {belowMinimum && <p className="mt-2 flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="size-4" />Bu fiyat minimum marjın altında.</p>}
            </div>
          </fieldset>
          <Field label="Rozet"><input className="admin-field mt-1 w-full" value={form.badge} onChange={(event) => set({ badge: event.target.value })} placeholder="örn. En çok tercih edilen" /></Field>
          <Field label="Pazarlama açıklaması (TR)"><textarea rows={3} className="admin-field mt-1 w-full" value={form.marketingDescription} onChange={(event) => set({ marketingDescription: event.target.value })} /></Field>
          <Field label="Sıralama"><input type="number" className="admin-field mt-1 w-full" value={form.sortOrder} onChange={(event) => set({ sortOrder: event.target.value })} /></Field>
          <Field label="Yaşam döngüsü">
            <select className="admin-field mt-1 w-full" value={form.lifecycle} onChange={(event) => set({ lifecycle: event.target.value })}>
              {["DRAFT", "READY", "PUBLISHED", "PAUSED", "ARCHIVED"].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.customerVisible} onChange={(event) => set({ customerVisible: event.target.checked })} />Müşteriye görünür</label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.featured} onChange={(event) => set({ featured: event.target.checked })} />Öne çıkar</label>
        </section>

        {message && <p className="text-xs font-semibold text-primary">{message}</p>}
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending || manualInvalid}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </AdminDrawer>
  );
}
