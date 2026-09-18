import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Plane, RadioTower } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminCatalogue } from "@/lib/admin-control.functions";
import { listPricingRules, updateProduct } from "@/lib/admin-catalog.functions";
import { itemMargin } from "@/domain/finance/formulas";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => adminHead("Katalog", "eSIM paketleri ve Lounge ürün grupları."),
  component: Products,
});

function Products() {
  const [service, setService] = useState<"ESIM" | "LOUNGE">("ESIM");
  const [openId, setOpenId] = useState<string | null>(null);
  const catalogue = useQuery({ queryKey: ["admin-catalogue-v3"], queryFn: () => getAdminCatalogue() });

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const product of catalogue.data ?? []) {
      if (product.service_type !== service) continue;
      const key = service === "ESIM"
        ? (product.esim_product_details?.regions?.name ?? product.destinations?.name ?? product.esim_product_details?.country_iso ?? product.esim_product_details?.package_kind ?? "Diğer kapsama")
        : `${product.lounge_product_details?.iata ?? product.airports?.iata ?? "Havalimanı yok"} · ${product.lounge_product_details?.terminal ?? "Terminal belirtilmedi"}`;
      map.set(key, [...(map.get(key) ?? []), product]);
    }
    return [...map.entries()];
  }, [catalogue.data, service]);

  const selected = (catalogue.data ?? []).find((product: any) => product.id === openId) ?? null;

  return (
    <AdminGate title="Ürün kataloğu">
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Button size="sm" variant={service === "ESIM" ? "secondary" : "outline"} onClick={() => setService("ESIM")}><RadioTower />eSIM paketleri</Button>
          <Button size="sm" variant={service === "LOUNGE" ? "secondary" : "outline"} onClick={() => setService("LOUNGE")}><Plane />Lounge’lar</Button>
        </div>
        {catalogue.isPending ? <AdminLoading /> : catalogue.error ? <AdminError error={catalogue.error} /> : (
          <AdminPanel title={service === "ESIM" ? "Ülke / bölge / rota grupları" : "Havalimanı → terminal → Lounge"}>
            {!groups.length ? <EmptyState title={service === "ESIM" ? "Henüz eSIM ürünü yok." : "Henüz Lounge ürünü yok."} detail="Katalog, provider senkronu ile dolar." /> : (
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
                          <button key={product.id} type="button" onClick={() => setOpenId(product.id)} className="grid w-full gap-2 border-b border-border px-2 py-2.5 text-left text-xs last:border-0 hover:bg-secondary/40 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
                            <span><strong>{product.name}</strong><span className="ml-2 text-muted-foreground">{service === "ESIM" ? (product.esim_product_details?.unlimited_data ? "Sınırsız" : `${product.esim_product_details?.data_gb ?? "—"} GB · ${product.esim_product_details?.validity_days ?? "—"} gün`) : (product.lounge_product_details?.lounge_name ?? "Lounge")}</span></span>
                            <span>{product.sale_price == null ? "Fiyat yok" : money(product.sale_price, product.currency)}</span>
                            <span className={product.margin_flagged ? "font-semibold text-destructive" : ""}>{margin.percent == null ? "—" : `%${margin.percent.toFixed(1)} marj`}</span>
                            <span className="text-muted-foreground">{product.providers?.name ?? "Provider yok"}</span>
                            <StatusBadge value={product.lifecycle} />
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            )}
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
      await queryClient.invalidateQueries({ queryKey: ["admin-catalogue-v3"] });
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
