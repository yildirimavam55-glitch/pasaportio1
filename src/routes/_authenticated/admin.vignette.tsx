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
type Row = Record<string, unknown>;

/** Only picks a field when the API actually returned a key with one of these names. Never computes. */
const COLUMNS: { label: string; keys: string[] }[] = [
  { label: "Ülke", keys: ["country", "country_name", "countryName"] },
  { label: "Ülke kodu", keys: ["country_code", "countryCode", "country_iso", "iso"] },
  { label: "Ürün adı", keys: ["name", "title", "product_name", "productName"] },
  { label: "Tedarikçi ürün ID", keys: ["id", "product_id", "productId", "code", "slug"] },
  { label: "Ürün tipi", keys: ["type", "product_type", "productType", "kind"] },
  { label: "Araç kategorisi", keys: ["vehicle_type", "vehicleType", "vehicle_category", "vehicle", "category"] },
  { label: "Geçerlilik", keys: ["duration", "validity", "period", "valid_days", "days", "duration_type"] },
  { label: "Resmî/baz fiyat", keys: ["price", "base_price", "government_price", "official_price", "basePrice"] },
  { label: "Partner ücreti", keys: ["fee", "partner_fee", "service_fee", "commission", "partnerFee", "serviceFee"] },
  { label: "Toplam tedarik maliyeti", keys: ["total", "total_price", "partner_price", "cost", "totalPrice", "partnerPrice"] },
  { label: "Para birimi", keys: ["currency", "currency_code", "currencyCode"] },
];

function pickKey(sample: Row[], keys: string[]) {
  return keys.find((k) => sample.some((r) => r[k] !== undefined)) ?? null;
}
function show(v: unknown) {
  if (v == null || v === "") return "—";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
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

function summarize(products: Row[]) {
  const ck = pickKey(products, COLUMNS[1].keys) ?? pickKey(products, COLUMNS[0].keys);
  const cur = pickKey(products, COLUMNS[10].keys);
  return {
    countries: ck ? [...new Set(products.map((p) => show(p[ck])))].filter((x) => x !== "—") : [],
    currencies: cur ? [...new Set(products.map((p) => show(p[cur])))].filter((x) => x !== "—") : [],
  };
}

function Overview() {
  const q = useQuery({ queryKey: ["admin-vignette"], queryFn: () => getVignetteAdmin() });
  const s = useSandbox();
  if (q.isPending) return <AdminLoading />;
  if (q.error) return <AdminError error={q.error} />;
  const sum = summarize(s.data?.products ?? []);
  return (
    <AdminPanel title="Genel bakış" action={<Car className="size-4 text-muted-foreground" />}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Servis durumu" value={AVAILABILITY_LABEL[q.data.availability]} />
        <Stat label="Yeni satın alma" value={q.data.checkout ? "Açık" : "Kapalı"} />
        <Stat label="Sandbox ürünleri" value={String(s.data?.products.length ?? 0)} />
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
  const sum = summarize(d.products);
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
        <DataRow label="Ürün sayısı" value={last?.productCount ?? d.products.length} />
        <DataRow label="Ülke sayısı" value={sum.countries.length} />
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
  const products = s.data?.products ?? [];
  const cols = useMemo(() => COLUMNS.map((c) => ({ ...c, key: pickKey(products, c.keys) })), [products]);
  const allKeys = useMemo(() => [...new Set(products.flatMap((p) => Object.keys(p)))], [products]);
  const col = (label: string) => cols.find((c) => c.label === label)?.key ?? null;
  const opts = (k: string | null) => (k ? [...new Set(products.map((p) => show(p[k])))].filter((x) => x !== "—").sort() : []);
  const cK = col("Ülke kodu") ?? col("Ülke"), vK = col("Araç kategorisi"), dK = col("Geçerlilik");
  const rows = products.filter((p) =>
    (!country || (cK && show(p[cK]) === country)) &&
    (!vehicle || (vK && show(p[vK]) === vehicle)) &&
    (!duration || (dK && show(p[dK]) === duration)) &&
    (!search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase())));
  if (s.isPending) return <AdminLoading />;
  if (s.error) return <AdminError error={s.error} />;
  const priceMap = ["Resmî/baz fiyat", "Partner ücreti", "Toplam tedarik maliyeti", "Para birimi"].map((l) => [l, col(l)] as const);
  const numericKeys = allKeys.filter((k) => products.some((p) => typeof p[k] === "number" || (typeof p[k] === "string" && /^\d+(\.\d+)?$/.test(p[k] as string))));
  return (
    <div className="grid gap-3">
      <AdminPanel title={`Tedarikçi kataloğu (${products.length})`} action={<Button size="sm" variant="outline" disabled={refresh.isPending || !s.data.keyConfigured} onClick={() => refresh.mutate()}><RefreshCw className="size-4" />Yenile</Button>}>
        <p className="text-xs text-muted-foreground">Kaynak: son başarılı Sandbox yenilemesi {s.data.catalogueAt ? `(${new Date(s.data.catalogueAt).toLocaleString("tr-TR")})` : "— henüz yok"}. Değerler API'den olduğu gibi gösterilir; eksik fiyat hesaplanmaz.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Input placeholder="Ara" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Ülke" value={country} onChange={setCountry} options={opts(cK)} />
          <Select label="Araç kategorisi" value={vehicle} onChange={setVehicle} options={opts(vK)} />
          <Select label="Süre" value={duration} onChange={setDuration} options={opts(dK)} />
        </div>
        {products.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Henüz ürün alınmadı. “Yenile” ile Sandbox kataloğunu çekin.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground">{cols.map((c) => <th key={c.label} className="whitespace-nowrap pr-3">{c.label}<span className="block font-mono text-[9px]">{c.key ?? "alan yok"}</span></th>)}</tr></thead>
              <tbody>{rows.map((p, i) => <tr key={i} className="border-t border-border">{cols.map((c) => <td key={c.label} className="py-1.5 pr-3">{c.key ? show(p[c.key]) : "—"}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </AdminPanel>
      <AdminPanel title="Fiyat incelemesi">
        <p className="text-xs text-muted-foreground">Aşağıda yalnızca API yanıtında gerçekten bulunan alan adları eşlenir. Eşleşme alan adına göredir; anlamı tedarikçi ile teyit edilmelidir.</p>
        <div className="mt-2">{priceMap.map(([l, k]) => <DataRow key={l} label={l} value={k ? <code>{k}</code> : "API'de karşılık gelen alan bulunamadı"} />)}</div>
        <p className="mt-3 text-xs font-semibold">Yanıttaki tüm alanlar</p>
        <p className="mt-1 font-mono text-[11px]">{allKeys.join(", ") || "—"}</p>
        <p className="mt-2 text-xs font-semibold">Sayısal alanlar</p>
        <p className="mt-1 font-mono text-[11px]">{numericKeys.join(", ") || "—"}</p>
      </AdminPanel>
      <AdminPanel title="Ham API yanıtı (temizlenmiş)" action={<Button size="sm" variant="ghost" onClick={() => setShowRaw((v) => !v)}>{showRaw ? "Gizle" : "Göster"}</Button>}>
        {showRaw ? <pre className="max-h-[480px] overflow-auto rounded-md bg-secondary/40 p-3 text-[11px]">{JSON.stringify(s.data.raw, null, 2)}</pre> : <p className="text-xs text-muted-foreground">Kimlik bilgileri hiçbir zaman gösterilmez.</p>}
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
