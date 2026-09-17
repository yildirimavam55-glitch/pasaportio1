import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, Boxes, ClipboardList, CloudUpload, LoaderCircle, PlugZap, SlidersHorizontal, Smartphone, Users, FlaskConical } from "lucide-react";

import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import { getBusinessDashboard } from "@/lib/admin-analytics.functions";
import { resolveRange, type DateRangeKey } from "@/domain/analytics/dashboard";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminDashboard });

const RANGES: Array<{ key: DateRangeKey; label: string }> = [
  { key: "today", label: "Bugün" },
  { key: "yesterday", label: "Dün" },
  { key: "last7", label: "Son 7 gün" },
  { key: "last30", label: "Son 30 gün" },
  { key: "thisMonth", label: "Bu ay" },
  { key: "lastMonth", label: "Geçen ay" },
  { key: "custom", label: "Özel tarih" },
];

const ALERT_LABELS: Record<string, string> = {
  PAID_NOT_FULFILLED: "Ödendi, teslim edilmedi",
  PROVIDER_ERROR: "Provider hatası",
  CATALOGUE_SYNC_FAILED: "Katalog senkron hatası",
  CATALOGUE_STALE: "Katalog güncel değil",
  LOW_PROVIDER_BALANCE: "Düşük provider bakiyesi",
  MARGIN_BELOW_MINIMUM: "Marj minimum altında",
  QR_DELIVERY_FAILED: "QR teslimi başarısız",
  VOUCHER_DELIVERY_FAILED: "Voucher teslimi başarısız",
  REFUND_REQUEST: "İade talebi",
};

const SOURCES = [
  "GOOGLE_ADS",
  "META",
  "TIKTOK",
  "GOOGLE_ORGANIC",
  "DIRECT",
  "CRM",
  "EMAIL",
  "WHATSAPP",
  "AFFILIATE",
  "PARTNER",
  "UNKNOWN",
] as const;

const quickLinks = [
  { to: "/admin/orders", label: "Siparişler", icon: ClipboardList },
  { to: "/admin/customers", label: "Müşteriler", icon: Users },
  { to: "/admin/products", label: "Ürünler", icon: Boxes },
  { to: "/admin/providers", label: "Provider Hub", icon: PlugZap },
  { to: "/admin/esim/provider-import", label: "Gerçek provider verisi", icon: CloudUpload },
  { to: "/admin/smart-finders/esim", label: "Smart Finders", icon: SlidersHorizontal },
  { to: "/admin/esim/devices", label: "Cihaz uyumluluğu", icon: Smartphone },
  { to: "/admin/test-catalogue", label: "Test kataloğu", icon: FlaskConical },
] as const;

const field = "min-h-10 rounded-xl border border-border bg-background px-3 text-sm";
const card = "rounded-card border border-border bg-card p-4 shadow-card";

function money(value: number, currency = "EUR") {
  return `${value.toFixed(2)} ${currency}`;
}
function percent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function AdminDashboard() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("last30");
  const preset = useMemo(() => resolveRange(rangeKey, new Date()), [rangeKey]);
  const [custom, setCustom] = useState(preset);
  const range = rangeKey === "custom" ? custom : preset;

  const [serviceType, setServiceType] = useState<"ALL" | "ESIM" | "LOUNGE">("ALL");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [locale, setLocale] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");
  const [destination, setDestination] = useState("");
  const [compare, setCompare] = useState(true);

  const filters = {
    from: range.from,
    to: range.to,
    serviceType,
    source: source || undefined,
    campaign: campaign || undefined,
    locale: locale || undefined,
    customerCountry: customerCountry || undefined,
    destination: destination || undefined,
    compare,
  };

  const dashboard = useQuery({
    queryKey: ["business-dashboard", filters],
    queryFn: () => getBusinessDashboard({ data: filters }),
  });

  const data = dashboard.data;
  const kpis = data?.kpis;
  const currency = kpis?.currency ?? "EUR";
  const noSales = !kpis || kpis.orders === 0;

  const chartData = (data?.series ?? []).map((point, index) => ({
    ...point,
    previousRevenue: data?.previousSeries?.[index]?.revenue ?? 0,
  }));

  const kpiCards = [
    { label: "Ciro", value: kpis ? money(kpis.grossRevenue, currency) : "—" },
    { label: "Sipariş sayısı", value: kpis?.orders ?? "—" },
    { label: "Satılan hizmet", value: kpis?.servicesSold ?? "—" },
    { label: "eSIM satışları", value: kpis?.esimSales ?? "—" },
    { label: "Lounge rezervasyonları", value: kpis?.loungeBookings ?? "—" },
    { label: "Provider maliyeti", value: kpis ? money(kpis.providerCost, currency) : "—" },
    { label: "Ödeme komisyonları", value: kpis ? money(kpis.paymentFees, currency) : "—" },
    { label: "İndirimler", value: kpis ? money(kpis.discounts, currency) : "—" },
    { label: "İadeler", value: kpis ? money(kpis.refunds, currency) : "—" },
    { label: "Brüt katkı", value: kpis ? money(kpis.grossContribution, currency) : "—", highlight: true },
    { label: "Ortalama sepet", value: kpis ? money(kpis.averageOrderValue, currency) : "—" },
    { label: "Dönüşüm oranı", value: percent(kpis?.conversionRate ?? null) },
    { label: "Tekrar satın alma", value: percent(kpis?.repeatPurchaseRate ?? null) },
  ];

  return (
    <AdminGate title="İş panosu">
      <div className="grid gap-4">
        <section className={card}>
          <div className="flex flex-wrap gap-2">
            {RANGES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRangeKey(item.key)}
                aria-pressed={rangeKey === item.key}
                className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition ${
                  rangeKey === item.key ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {rangeKey === "custom" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                aria-label="Başlangıç"
                className={field}
                value={custom.from}
                onChange={(event) => setCustom((s) => ({ ...s, from: event.target.value }))}
              />
              <span className="text-sm text-muted-foreground">—</span>
              <input
                type="date"
                aria-label="Bitiş"
                className={field}
                value={custom.to}
                onChange={(event) => setCustom((s) => ({ ...s, to: event.target.value }))}
              />
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <select aria-label="Servis" className={field} value={serviceType} onChange={(e) => setServiceType(e.target.value as typeof serviceType)}>
              <option value="ALL">Tüm servisler</option>
              <option value="ESIM">eSIM</option>
              <option value="LOUNGE">Lounge</option>
            </select>
            <select aria-label="Trafik kaynağı" className={field} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Tüm kaynaklar</option>
              {SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input aria-label="Kampanya" className={field} placeholder="Kampanya (utm_campaign)" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            <select aria-label="Dil" className={field} value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="">Tüm diller</option>
              <option value="tr">TR</option>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
            <input aria-label="Müşteri ülkesi" className={field} placeholder="Müşteri ülkesi (ISO)" value={customerCountry} onChange={(e) => setCustomerCountry(e.target.value)} />
            <input aria-label="Seyahat destinasyonu" className={field} placeholder="Seyahat destinasyonu" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
            Önceki dönemle karşılaştır
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Dönem: {range.from} → {range.to}
            {data?.previousRange ? ` · Karşılaştırma: ${data.previousRange.from} → ${data.previousRange.to}` : ""}
          </p>
        </section>

        {dashboard.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Veriler yükleniyor…</p>
        )}
        {dashboard.isError && (
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> {(dashboard.error as Error).message}</p>
        )}

        {noSales && !dashboard.isPending && (
          <p className={`${card} text-sm font-semibold`}>Henüz satış yok.</p>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {kpiCards.map((item) => (
            <div key={item.label} className={`${card} ${item.highlight ? "border-primary/50" : ""}`}>
              <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
              <strong className="mt-1 block font-display text-xl">{item.value}</strong>
            </div>
          ))}
        </section>
        <p className="text-xs text-muted-foreground">
          Ciro kâr değildir. Provider maliyeti, ödeme komisyonu, indirim ve iadeler ciroyla aynı satırda gösterilmez; brüt katkı ayrı hesaplanır.
        </p>

        <section className={card}>
          <h2 className="font-display text-lg font-bold">Ciro ve brüt katkı — zaman içinde</h2>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip />
                <Legend />
                <Area name="Ciro" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                <Area name="Brüt katkı" type="monotone" dataKey="grossContribution" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.12} />
                {compare && <Line name="Önceki dönem cirosu" type="monotone" dataKey="previousRevenue" stroke="hsl(var(--muted-foreground))" dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} width={44} allowDecimals={false} />
                <Tooltip />
                <Bar name="Sipariş" dataKey="orders" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Servise göre satış">
            <Table
              head={["Servis", "Sipariş", "Ciro", "Provider maliyeti", "Brüt katkı"]}
              rows={(data?.byService ?? []).map((row) => [
                row.serviceType === "ESIM" ? "eSIM" : "Lounge",
                row.orders,
                money(row.revenue, currency),
                money(row.providerCost, currency),
                money(row.grossContribution, currency),
              ])}
              empty="Henüz satış yok."
            />
          </Panel>

          <Panel title="Trafik kaynağı performansı">
            <Table
              head={["Kaynak", "Ziyaret", "Finder", "Satın alma", "Ciro", "Brüt katkı"]}
              rows={(data?.bySource ?? []).map((row) => [
                row.source,
                row.visits,
                row.finderStarts,
                row.purchases,
                money(row.revenue, currency),
                money(row.grossContribution, currency),
              ])}
              empty="Henüz trafik verisi yok."
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MiniList title="İlk temas (first touch)" rows={data?.firstTouch ?? []} empty="Veri yok." />
              <MiniList title="Son temas (last touch)" rows={data?.lastTouch ?? []} empty="Veri yok." />
            </div>
          </Panel>

          <Panel title="Finder hunisi">
            <Table
              head={["Adım", "Sayı", "Dönüşüm", "Kayıp"]}
              rows={(data?.funnel ?? []).map((step) => [step.label, step.count, percent(step.conversionRate), percent(step.dropOffRate)])}
              empty="Henüz etkinlik verisi yok."
            />
          </Panel>

          <Panel title="Kampanya performansı">
            <Table
              head={["Kampanya", "Kaynak", "Ziyaretçi", "Finder", "Sipariş", "Dönüşüm", "Ciro", "Provider maliyeti", "Brüt katkı", "Servis", "Destinasyon"]}
              rows={(data?.campaigns ?? []).map((row) => [
                row.campaign,
                row.source,
                row.visitors,
                row.finderStarts,
                row.orders,
                percent(row.conversionRate),
                money(row.revenue, currency),
                money(row.providerCost, currency),
                money(row.grossContribution, currency),
                row.topService ?? "—",
                row.topDestination ?? "—",
              ])}
              empty="Henüz kampanya verisi yok."
            />
          </Panel>

          <Panel title="En çok satan ürünler">
            <Table
              head={["Ürün", "Servis", "Destinasyon/Havalimanı", "Sipariş", "Ciro", "Provider maliyeti", "Brüt katkı"]}
              rows={(data?.topProducts ?? []).map((row) => [
                row.product,
                row.serviceType === "ESIM" ? "eSIM" : "Lounge",
                row.place ?? "—",
                row.orders,
                money(row.revenue, currency),
                money(row.providerCost, currency),
                money(row.grossContribution, currency),
              ])}
              empty="Henüz satış yok."
            />
          </Panel>

          <Panel title="Destinasyon ve müşteri ülkesi">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniList
                title="Seyahat destinasyonları"
                rows={(data?.topTravelDestinations ?? []).map((row) => ({ label: row.label, count: row.count }))}
                empty="Henüz satış yok."
              />
              <MiniList
                title="Müşteri ülkeleri"
                rows={(data?.topCustomerCountries ?? []).map((row) => ({ label: row.label, count: row.count }))}
                empty="Henüz satış yok."
              />
            </div>
          </Panel>

          <Panel title="eSIM analitiği">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniList title="Destinasyonlar" rows={data?.esim.topDestinations ?? []} empty="Veri yok." />
              <MiniList title="Bölgeler" rows={data?.esim.topRegions ?? []} empty="Veri yok." />
              <MiniList title="Önerilen GB" rows={data?.esim.topRecommendedGb ?? []} empty="Veri yok." />
              <MiniList title="Satın alınan GB" rows={data?.esim.topPurchasedGb ?? []} empty="Veri yok." />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Uyumluluk kontrolü açılışı: {data?.esim.compatibilityChecks ?? 0}</p>
          </Panel>

          <Panel title="Lounge analitiği">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniList title="Havalimanları" rows={data?.lounge.topAirports ?? []} empty="Veri yok." />
              <MiniList title="Lounge’lar" rows={data?.lounge.topLounges ?? []} empty="Veri yok." />
              <MiniList title="Kalkış / Aktarma / Varış" rows={data?.lounge.situations ?? []} empty="Veri yok." />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Ortalama yolcu: {data?.lounge.averageTravelers == null ? "—" : data.lounge.averageTravelers.toFixed(1)}
            </p>
          </Panel>

          <Panel title="Rota analitiği">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniList title="Rota modu" rows={data?.routes.modes ?? []} empty="Veri yok." />
              <MiniList title="Rota presetleri" rows={data?.routes.presets ?? []} empty="Veri yok." />
              <MiniList title="Seçilen ülkeler" rows={data?.routes.countries ?? []} empty="Veri yok." />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Raporlar yalnızca toplulaştırılmıştır; kişisel seyahat planı gösterilmez.</p>
          </Panel>

          <Panel title="Çapraz satış">
            <Table
              head={["Yön", "Görüntülenme", "Tıklama", "Satın alma", "Ciro"]}
              rows={(data?.crossSell ?? []).map((row) => [
                row.direction === "ESIM_TO_LOUNGE" ? "eSIM → Lounge" : "Lounge → eSIM",
                row.viewed,
                row.clicked,
                row.purchased,
                money(row.revenue, currency),
              ])}
              empty="Veri yok."
            />
            <p className="mt-2 text-xs text-muted-foreground">Tıklamalar dönüşüm olarak sayılmaz.</p>
          </Panel>

          <Panel title="Dikkat gerektirenler">
            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.entries(ALERT_LABELS).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>{label}</span>
                  <strong className={data?.alertCounts?.[key] ? "text-destructive" : "text-muted-foreground"}>
                    {data?.alertCounts?.[key] ?? 0}
                  </strong>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Son katalog içe aktarımı">
            {data?.lastImport ? (
              <ul className="grid gap-1 text-sm">
                <li>Provider: <strong>{data.lastImport.provider}</strong></li>
                <li>Durum: {data.lastImport.status}</li>
                <li>Tarih: {new Date(data.lastImport.startedAt).toISOString().slice(0, 16).replace("T", " ")}</li>
                <li>Alınan {data.lastImport.received} · yeni {data.lastImport.created} · güncellenen {data.lastImport.updated} · kullanılamaz {data.lastImport.unavailable} · hatalı {data.lastImport.failed}</li>
                {data.lastImport.error && <li className="text-destructive">{data.lastImport.error}</li>}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz ürün içe aktarılmadı.</p>
            )}
            <Button asChild variant="outline" className="mt-3">
              <Link to="/admin/esim/provider-import">İçe aktarma ekranını aç</Link>
            </Button>
          </Panel>
        </div>

        <section className={card}>
          <h2 className="font-display text-lg font-bold">Hızlı erişim</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="group flex min-h-12 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold">
                <Icon className="size-4 text-primary" /> {label}
                <ArrowRight className="ml-auto size-4 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminGate>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: Array<Array<string | number>>; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="py-2 pr-3 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniList({ title, rows, empty }: { title: string; rows: Array<{ label: string; count: number }>; empty: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <strong className="text-xs font-semibold uppercase text-muted-foreground">{title}</strong>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 grid gap-1 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span className="truncate">{row.label}</span>
              <strong>{row.count}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
