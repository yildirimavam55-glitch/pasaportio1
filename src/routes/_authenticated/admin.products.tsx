import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Plane, RadioTower } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminCatalogue, getAdminCatalogueFacets } from "@/lib/admin-control.functions";
import { bulkUpdateProducts, listPricingRules, updateProduct } from "@/lib/admin-catalog.functions";
import { itemMargin } from "@/domain/finance/formulas";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => adminHead("Katalog", "eSIM paketleri ve Lounge ürün grupları."),
  component: Products,
});

function Products() {
  const queryClient = useQueryClient();
  const [service, setService] = useState<"ESIM" | "LOUNGE">("ESIM");
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("ALL");
  const [place, setPlace] = useState("ALL");
  const [availability, setAvailability] = useState<"ALL" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [lifecycle, setLifecycle] = useState("ALL");
  const [marginOnly, setMarginOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRule, setBulkRule] = useState("");

  // Server-side paging: the catalogue holds thousands of products, so the
  // browser only ever receives the current page.
  const query = { page, limit: 50, service, search, providerId: provider, countryIso: place, availability, lifecycle, packageKind: "ALL", marginOnly };
  const catalogue = useQuery({
    queryKey: ["admin-catalogue-v4", query],
    queryFn: () => getAdminCatalogue({ data: query }),
    placeholderData: (previous) => previous,
  });
  const facets = useQuery({ queryKey: ["admin-catalogue-facets"], queryFn: () => getAdminCatalogueFacets() });
  const rules = useQuery({ queryKey: ["pricing-rules"], queryFn: () => listPricingRules() });

  useEffect(() => { setPage(1); }, [service, search, provider, place, availability, lifecycle, marginOnly]);

  const placeOf = (product: any) =>
    product.service_type === "ESIM"
      ? (product.esim_product_details?.regions?.name ?? product.destinations?.name ?? product.esim_product_details?.country_iso ?? product.esim_product_details?.package_kind ?? "Diğer kapsama")
      : `${product.lounge_product_details?.iata ?? product.airports?.iata ?? "Havalimanı yok"} · ${product.lounge_product_details?.terminal ?? "Terminal belirtilmedi"}`;

  const rows: any[] = (catalogue.data?.rows ?? []) as any[];
  const filtered = rows;

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const product of filtered) map.set(placeOf(product), [...(map.get(placeOf(product)) ?? []), product]);
    return [...map.entries()];
  }, [filtered]);

  const providerOptions = (facets.data?.providers ?? []).filter((row) => row.service_type === service);
  const placeOptions = service === "ESIM" ? (facets.data?.countries ?? []) : [];
  const selected = rows.find((product: any) => product.id === openId) ?? null;


  const bulk = useMutation({
    mutationFn: (action: Parameters<typeof bulkUpdateProducts>[0]["data"]["action"]) =>
      bulkUpdateProducts({ data: { ids: selectedIds, action, pricingRuleId: bulkRule || null } }),
    onSuccess: async () => { setSelectedIds([]); await queryClient.invalidateQueries({ queryKey: ["admin-catalogue-v4"] }); },
  });

  const toggle = (id: string) => setSelectedIds((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));

  return (
    <AdminGate title="Ürün kataloğu">
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Button size="sm" variant={service === "ESIM" ? "secondary" : "outline"} onClick={() => { setService("ESIM"); setSelectedIds([]); setPlace("ALL"); setProvider("ALL"); }}><RadioTower />eSIM paketleri</Button>
          <Button size="sm" variant={service === "LOUNGE" ? "secondary" : "outline"} onClick={() => { setService("LOUNGE"); setSelectedIds([]); setPlace("ALL"); setProvider("ALL"); }}><Plane />Lounge’lar</Button>
        </div>

        <AdminPanel title="Filtreler">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ara"><input className="admin-field mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ürün adı" /></Field>
            <Field label="Provider">
              <select className="admin-field mt-1 w-full" value={provider} onChange={(event) => setProvider(event.target.value)}>
                <option value="ALL">Tümü</option>
                {providerOptions.map((row: { id: string; name: string }) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </Field>
            <Field label={service === "ESIM" ? "Ülke" : "Havalimanı"}>
              <select className="admin-field mt-1 w-full" value={place} onChange={(event) => setPlace(event.target.value)}>
                <option value="ALL">Tümü</option>
                {placeOptions.map((name: string) => <option key={name} value={name}>{name}</option>)}
              </select>
            </Field>
            <Field label="Uygunluk">
              <select className="admin-field mt-1 w-full" value={availability} onChange={(event) => setAvailability(event.target.value as "ALL" | "AVAILABLE" | "UNAVAILABLE")}>

                <option value="ALL">Tümü</option>
                <option value="AVAILABLE">Satışa uygun</option>
                <option value="UNAVAILABLE">Provider’da yok</option>
              </select>
            </Field>
            <Field label="Yaşam döngüsü">
              <select className="admin-field mt-1 w-full" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>
                <option value="ALL">Tümü</option>
                {["IMPORTED", "DRAFT", "READY", "PUBLISHED", "PAUSED", "UNAVAILABLE", "ARCHIVED"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <label className="flex items-end gap-2 text-xs font-semibold"><input type="checkbox" checked={marginOnly} onChange={(event) => setMarginOnly(event.target.checked)} />Yalnızca marj uyarısı olanlar</label>
          </div>
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
                {((rules.data ?? []) as any[]).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <Button size="sm" variant="secondary" disabled={bulk.isPending || !bulkRule} onClick={() => bulk.mutate("ASSIGN_RULE")}>Kuralı ata</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Seçimi temizle</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Toplu işlemler yalnızca ticari alanları değiştirir; provider kapsama ve maliyet verisi hiçbir zaman değiştirilmez.</p>
          </AdminPanel>
        )}

        {catalogue.isPending ? <AdminLoading /> : catalogue.error ? <AdminError error={catalogue.error} /> : (
          <AdminPanel title={service === "ESIM" ? "Ülke / bölge / rota grupları" : "Havalimanı → terminal → Lounge"}>
            {!groups.length ? <EmptyState title={service === "ESIM" ? "Eşleşen eSIM ürünü yok." : "Eşleşen Lounge ürünü yok."} detail="Katalog, provider senkronu ile dolar." /> : (
              <div className="grid gap-2">
                {groups.map(([name, products]) => (
                  <details key={name} className="group rounded-md border border-border bg-background">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                      <span className={`grid size-8 place-items-center rounded-md ${service === "ESIM" ? "bg-primary-soft text-success" : "bg-sand-soft text-warning"}`}>{service === "ESIM" ? <RadioTower className="size-4" /> : <Plane className="size-4" />}</span>
                      <strong className="min-w-0 flex-1 text-sm">{name}</strong>
                      <span className="text-xs text-muted-foreground">{products.length} ürün</span>
                      <ChevronDown className="size-4 transition group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-border p-2">
                      {products.map((product: any) => {
                        const margin = itemMargin(Number(product.sale_price ?? 0), Number(product.provider_cost ?? 0));
                        return (
                          <div key={product.id} className="flex items-start gap-2 border-b border-border px-2 py-2.5 text-xs last:border-0">
                            <input type="checkbox" className="mt-1" aria-label="Ürünü seç" checked={selectedIds.includes(product.id)} onChange={() => toggle(product.id)} />
                            <button type="button" onClick={() => setOpenId(product.id)} className="grid w-full gap-2 text-left hover:opacity-80 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
                              <span><strong>{product.name}</strong><span className="ml-2 text-muted-foreground">{service === "ESIM" ? (product.esim_product_details?.unlimited_data ? "Sınırsız" : `${product.esim_product_details?.data_gb ?? "—"} GB · ${product.esim_product_details?.validity_days ?? "—"} gün`) : (product.lounge_product_details?.lounge_name ?? "Lounge")}</span></span>
                              <span>{product.sale_price == null ? "Fiyat yok" : money(product.sale_price, product.currency)}</span>
                              <span className={product.margin_flagged ? "font-semibold text-destructive" : ""}>{margin.percent == null ? "—" : `%${margin.percent.toFixed(1)} marj`}</span>
                              <span className="text-muted-foreground">{product.providers?.name ?? "Provider yok"}</span>
                              <StatusBadge value={product.lifecycle} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                Toplam {catalogue.data?.total ?? 0} ürün · filtrelenen {catalogue.data?.filtered ?? 0} · sayfa {catalogue.data?.page ?? 1}/{catalogue.data?.pageCount ?? 1}
              </span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" disabled={page <= 1 || catalogue.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Önceki</Button>
              <Button size="sm" variant="outline" disabled={page >= (catalogue.data?.pageCount ?? 1) || catalogue.isFetching} onClick={() => setPage((current) => current + 1)}>Sonraki</Button>
            </div>
          </AdminPanel>

        )}
      </div>
      <ProductDrawer product={selected} onClose={() => setOpenId(null)} />
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
        salePrice: form.salePrice === "" ? null : Number(form.salePrice),
        pricingRuleId: form.pricingRuleId || null,
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

  const rule = (rules.data ?? []).find((row: any) => row.id === form.pricingRuleId);
  const minimumMargin = rule?.minimum_margin_percent == null ? null : Number(rule.minimum_margin_percent);
  const margin = itemMargin(form.salePrice === "" ? 0 : Number(form.salePrice), Number(product.provider_cost ?? 0));
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
          <Field label="Satış fiyatı" hint="Elle girilen fiyat, manuel geçersiz kılma olarak işaretlenir."><input type="number" step="0.01" min="0" className="admin-field mt-1 w-full" value={form.salePrice} onChange={(event) => set({ salePrice: event.target.value })} /></Field>
          <Field label="Fiyatlandırma kuralı">
            <select className="admin-field mt-1 w-full" value={form.pricingRuleId} onChange={(event) => set({ pricingRuleId: event.target.value })}>
              <option value="">Kural yok</option>
              {(rules.data ?? []).map((row: any) => <option key={row.id} value={row.id}>{row.name} · {row.strategy}</option>)}
            </select>
          </Field>
          <div className="rounded-md border border-border p-3 text-xs">
            <DataRow label="Brüt marj" value={`${money(margin.absolute, product.currency)}${margin.percent == null ? "" : ` · %${margin.percent.toFixed(1)}`}`} />
            <DataRow label="Minimum marj" value={minimumMargin == null ? "Tanımlı değil" : `%${minimumMargin.toFixed(1)}`} />
            {belowMinimum && <p className="mt-2 flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="size-4" />Bu fiyat minimum marjın altında.</p>}
          </div>
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
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </AdminDrawer>
  );
}
