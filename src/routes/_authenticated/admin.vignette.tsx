import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Car, RefreshCw, PlugZap } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, DataRow, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getVignetteAdmin } from "@/lib/admin-vignette.functions";
import { getVignetteSandbox, runVignetteSandbox } from "@/lib/vignette-sandbox.functions";

export const Route = createFileRoute("/_authenticated/admin/vignette")({
  head: () => ({ ...adminHead("Vignette", "Vignette servis durumu ve Vignette ID Sandbox tedarikçi kataloğu."), meta: [...adminHead("Vignette", "Vignette servis durumu ve Vignette ID Sandbox tedarikçi kataloğu.").meta, { name: "robots", content: "noindex, nofollow" }] }),
  component: VignetteAdmin,
});

const AVAILABILITY_LABEL = { ACTIVE: "Satışta", NOT_FOR_SALE: "Yakında / satışta değil", PAUSED: "Duraklatıldı" } as const;
type Tab = "overview" | "catalog" | "api" | "settings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = any;
/** One row per product × duration, flattened from the documented `price[duration]` object. Values copied verbatim. */
type Variant = { country: string; name: string; title: string; type: string; vehicle: string; status: string; duration: string; government_price: unknown; partner_fee: unknown; total_price: unknown; currency: unknown; restrictions: unknown };

const COUNTRY: Record<string, string> = { at: "Avusturya", bg: "Bulgaristan", ch: "İsviçre", cz: "Çekya", hu: "Macaristan", md: "Moldova", ro: "Romanya", si: "Slovenya", sk: "Slovakya" };
const DOC_PRODUCT_KEYS = ["name", "title", "type", "icon", "color", "country", "vehicle_type", "priority", "price", "restrictions", "status"];

function parse(rawJson: string | null | undefined): { raw: unknown; products: Product[] } {
  if (!rawJson) return { raw: null, products: [] };
  const raw = JSON.parse(rawJson);
  const products = Array.isArray(raw?.result) ? raw.result : [];
  return { raw, products };
}
function flatten(products: Product[]): Variant[] {
  return products.flatMap((p) => Object.entries((p.price ?? {}) as Record<string, any>).map(([duration, v]) => ({
    country: String(p.country ?? ""), name: String(p.name ?? ""), title: String(p.title ?? ""), type: String(p.type ?? ""), vehicle: String(p.vehicle_type ?? ""), status: String(p.status ?? ""),
    duration, government_price: v?.government_price, partner_fee: v?.partner_fee, total_price: v?.total_price, currency: v?.currency, restrictions: v?.restrictions,
  })));
}
function show(v: unknown) {
  if (v == null || v === "") return "—";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
function summarize(products: Product[]) {
  const v = flatten(products);
  return {
    variants: v.length,
    countries: [...new Set(products.map((p) => String(p.country ?? "")))].filter(Boolean).sort(),
    vehicles: [...new Set(products.map((p) => String(p.vehicle_type ?? "")))].filter(Boolean).sort(),
    currencies: [...new Set(v.map((x) => show(x.currency)))].filter((x) => x !== "—"),
  };
}

function VignetteAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [["overview", "Genel bakış"], ["catalog", "Tedarikçi kataloğu"], ["api", "API testi"], ["settings", "Ayarlar"]];
  return (
    <AdminGate title="Vignette">
      <div className="grid gap-3">
        <div className="admin-card flex flex-wrap gap-1 p-2">
          {tabs.map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? "default" : "ghost"} onClick={() => setTab(k)}>{l}</Button>)}
          <Button asChild size="sm" variant="ghost"><Link to="/admin/service-controls">Servis kontrolü</Link></Button>
        </div>
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold">Faz 1 · Yalnızca SANDBOX · Sipariş oluşturulmaz · Müşterilere gösterilmez · Satış fiyatı/marj yok</p>
        {tab === "overview" && <Overview />}
        {tab === "catalog" && <Catalog />}
        {tab === "api" && <ApiTest />}
        {tab === "settings" && <Settings />}
      </div>
    </AdminGate>
  );
}

function useSandbox() {
  return useQuery({ queryKey: ["admin-vignette-sandbox"], queryFn: () => getVignetteSandbox() });
}

function Overview() {
  const q = useQuery({ queryKey: ["admin-vignette"], queryFn: () => getVignetteAdmin() });
  const s = useSandbox();
  if (q.isPending) return <AdminLoading />;
  if (q.error) return <AdminError error={q.error} />;
  const sum = summarize(parse(s.data?.rawJson).products);
  return (
    <AdminPanel title="Genel bakış" action={<Car className="size-4 text-muted-foreground" />}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Servis durumu" value={AVAILABILITY_LABEL[q.data.availability]} />
        <Stat label="Yeni satın alma" value={q.data.checkout ? "Açık" : "Kapalı"} />
        <Stat label="Sandbox ürünleri" value={`${parse(s.data?.rawJson).products.length} (${sum.variants} süre)`} />
        <Stat label="Sandbox ülkeleri" value={String(sum.countries.length)} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Vignette henüz ticari olarak başlatılmadı. Tedarikçi verisi ayrı tutulur; storefront ürünleri ve fiyatları etkilenmez.</p>
    </AdminPanel>
  );
}

function ApiTest() {
  const s = useSandbox();
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: (mode: "test" | "refresh") => runVignetteSandbox({ data: { mode } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-vignette-sandbox"] }),
  });
  if (s.isPending) return <AdminLoading />;
  if (s.error) return <AdminError error={s.error} />;
  const d = s.data;
  const sum = summarize(parse(d.rawJson).products);
  const last = run.data ?? (d.latest ? { ok: d.latest.ok, httpStatus: d.latest.http_status, error: d.latest.error, productCount: d.latest.product_count } : null);
  return (
    <AdminPanel title="API testi (Sandbox)">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={run.isPending || !d.keyConfigured} onClick={() => run.mutate("test")}><PlugZap className="size-4" />Bağlantıyı test et</Button>
        <Button size="sm" variant="outline" disabled={run.isPending || !d.keyConfigured} onClick={() => run.mutate("refresh")}><RefreshCw className="size-4" />Ürünleri yenile</Button>
      </div>
      {!d.keyConfigured && <p className="mt-2 text-xs font-semibold text-destructive">Sandbox API anahtarı henüz eklenmedi.</p>}
      {run.error && <div className="mt-2"><AdminError error={run.error} /></div>}
      <div className="mt-3">
        <DataRow label="Ortam" value="SANDBOX" />
        <DataRow label="Uç nokta" value={<code>GET {d.endpoint}</code>} />
        <DataRow label="Kimlik doğrulama" value="Authorization: Bearer (sunucu tarafında)" />
        <DataRow label="Bağlantı durumu" value={last ? <StatusBadge value={last.ok ? "SUCCESS" : "FAILED"} /> : "Henüz test edilmedi"} />
        <DataRow label="HTTP durumu" value={last?.httpStatus ?? "—"} />
        <DataRow label="Hata" value={last?.error ?? "—"} />
        <DataRow label="Son başarılı senkron" value={d.lastSuccessAt ? new Date(d.lastSuccessAt).toLocaleString("tr-TR") : "—"} />
        <DataRow label="Ürün sayısı" value={`${last?.productCount ?? 0} ürün · ${sum.variants} süre varyantı`} />
        <DataRow label="Ülke sayısı" value={`${sum.countries.length} (${sum.countries.join(", ").toUpperCase()})`} />
        <DataRow label="Para birimleri" value={sum.currencies.join(", ") || "—"} />
      </div>
    </AdminPanel>
  );
}

function Catalog() {
  const s = useSandbox();
  const qc = useQueryClient();
  const refresh = useMutation({ mutationFn: () => runVignetteSandbox({ data: { mode: "refresh" } }), onSettled: () => qc.invalidateQueries({ queryKey: ["admin-vignette-sandbox"] }) });
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [duration, setDuration] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const { raw, products } = useMemo(() => parse(s.data?.rawJson), [s.data?.rawJson]);
  const variants = useMemo(() => flatten(products), [products]);
  if (s.isPending) return <AdminLoading />;
  if (s.error) return <AdminError error={s.error} />;
  const uniq = (xs: string[]) => [...new Set(xs)].filter(Boolean);
  const durations = uniq(variants.map((v) => v.duration)).sort((a, b) => Number(a) - Number(b));
  const rows = variants.filter((v) => (!country || v.country === country) && (!vehicle || v.vehicle === vehicle) && (!duration || v.duration === duration) && (!search || `${v.name} ${v.title} ${v.country} ${COUNTRY[v.country] ?? ""}`.toLowerCase().includes(search.toLowerCase())));
  const productKeys = uniq(products.flatMap((p) => Object.keys(p)));
  const priceKeys = uniq(products.flatMap((p) => Object.values((p.price ?? {}) as Record<string, any>).flatMap((v) => Object.keys(v ?? {}))));
  const extra = productKeys.filter((k) => !DOC_PRODUCT_KEYS.includes(k));
  return (
    <div className="grid gap-3">
      <AdminPanel title={`Tedarikçi kataloğu (${products.length} ürün · ${variants.length} süre)`} action={<Button size="sm" variant="outline" disabled={refresh.isPending || !s.data.keyConfigured} onClick={() => refresh.mutate()}><RefreshCw className="size-4" />Yenile</Button>}>
        <p className="text-xs text-muted-foreground">Kaynak: son başarılı Sandbox yenilemesi {s.data.catalogueAt ? `(${new Date(s.data.catalogueAt).toLocaleString("tr-TR")})` : "— henüz yok"}. Değerler API'den olduğu gibi gösterilir; hiçbir fiyat hesaplanmaz.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input placeholder="Ara (ürün, ülke)" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Ülke" value={country} onChange={setCountry} options={uniq(products.map((p) => String(p.country ?? ""))).sort()} />
          <Select label="Araç kategorisi" value={vehicle} onChange={setVehicle} options={uniq(products.map((p) => String(p.vehicle_type ?? ""))).sort()} />
          <Select label="Süre (gün)" value={duration} onChange={setDuration} options={durations} />
        </div>
        {variants.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Henüz ürün alınmadı. “Yenile” ile Sandbox kataloğunu çekin.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground">{[["Ülke", ""], ["Ülke kodu", "country"], ["Ürün adı", "title"], ["Tedarikçi ürün ID", "name"], ["Ürün tipi", "type"], ["Araç kategorisi", "vehicle_type"], ["Süre (gün)", "price.{key}"], ["Resmî fiyat", "government_price"], ["Partner ücreti", "partner_fee"], ["Toplam tedarik maliyeti", "total_price"], ["Para birimi", "currency"], ["Kısıt", "restrictions"]].map(([l, k]) => <th key={l} className="whitespace-nowrap pb-1 pr-3">{l}{k && <span className="block font-mono text-[9px]">{k}</span>}</th>)}</tr></thead>
              <tbody>{rows.map((v) => <tr key={`${v.name}-${v.duration}`} className="border-t border-border"><td className="py-1.5 pr-3">{COUNTRY[v.country] ?? "—"}</td><td className="pr-3 uppercase">{v.country}</td><td className="pr-3">{v.title}</td><td className="pr-3 font-mono">{v.name}</td><td className="pr-3">{v.type}</td><td className="pr-3">{v.vehicle}</td><td className="pr-3">{v.duration}</td><td className="pr-3">{show(v.government_price)}</td><td className="pr-3">{show(v.partner_fee)}</td><td className="pr-3 font-semibold">{show(v.total_price)}</td><td className="pr-3">{show(v.currency)}</td><td className="pr-3">{show(v.restrictions)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </AdminPanel>
      <AdminPanel title="Fiyat incelemesi">
        <DataRow label="A. Resmî / devlet vinyet fiyatı" value={<code>price.&#123;süre&#125;.government_price</code>} />
        <DataRow label="B. Vignette ID / partner ücreti" value={<code>price.&#123;süre&#125;.partner_fee</code>} />
        <DataRow label="C. Nihai tedarik maliyetimiz" value={<code>price.&#123;süre&#125;.total_price</code>} />
        <DataRow label="Para birimi" value={<code>price.&#123;süre&#125;.currency</code>} />
        <p className="mt-2 text-xs text-muted-foreground">Not: Sandbox verisinde total_price, government_price + partner_fee toplamından büyüktür; aradaki fark API'de ayrı bir alan olarak dönmez. Anlamı tedarikçiyle teyit edilmelidir.</p>
        <p className="mt-3 text-xs font-semibold">Ürün alanları</p><p className="mt-1 font-mono text-[11px]">{productKeys.join(", ") || "—"}</p>
        <p className="mt-2 text-xs font-semibold">Fiyat alanları</p><p className="mt-1 font-mono text-[11px]">{priceKeys.join(", ") || "—"}</p>
        {extra.length > 0 && <p className="mt-2 text-xs font-semibold text-warning">Beklenmeyen alanlar: {extra.join(", ")}</p>}
      </AdminPanel>
      <AdminPanel title="Ham API yanıtı (temizlenmiş)" action={<Button size="sm" variant="ghost" onClick={() => setShowRaw((v) => !v)}>{showRaw ? "Gizle" : "Göster"}</Button>}>
        {showRaw ? <pre className="max-h-[480px] overflow-auto rounded-md bg-secondary/40 p-3 text-[11px]">{JSON.stringify(raw, null, 2)}</pre> : <p className="text-xs text-muted-foreground">Kimlik bilgileri hiçbir zaman gösterilmez.</p>}
      </AdminPanel>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return <select aria-label={label} className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{label}: tümü</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
}

function Settings() {
  const s = useSandbox();
  return (
    <AdminPanel title="Ayarlar">
      <DataRow label="Ortam" value="SANDBOX (Production devre dışı)" />
      <DataRow label="API anahtarı" value={s.data?.keyConfigured ? "Güvenli olarak kayıtlı" : "Eklenmedi"} />
      <DataRow label="Sipariş oluşturma" value="Kapalı (Faz 1)" />
      <DataRow label="Müşteri görünürlüğü" value="Kapalı" />
      <DataRow label="Kâr marjı / satış fiyatı" value="Henüz uygulanmadı" />
    </AdminPanel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}
