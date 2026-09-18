import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Field, Metric, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getBusinessDashboard } from "@/lib/admin-analytics.functions";
import { getAnalyticsFilterOptions } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => adminHead("Analitik", "Servis, kaynak ve müşteri yolculuğu analitiği."),
  component: Analytics,
});

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function Analytics() {
  const [filters, setFilters] = useState({
    from: day(-29), to: day(0), serviceType: "ALL", customerCountry: "", destination: "",
    airport: "", providerId: "", source: "", campaign: "", locale: "", compare: true,
  });
  const options = useQuery({ queryKey: ["analytics-options"], queryFn: () => getAnalyticsFilterOptions() });
  const report = useQuery({ queryKey: ["analytics-report", filters], queryFn: () => getBusinessDashboard({ data: filters }) });
  const set = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));
  const data = report.data;
  const currency = data?.kpis.currency ?? "EUR";

  return (
    <AdminGate title="Analitik">
      <div className="grid gap-4">
        <AdminPanel title="Filtreler">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Başlangıç"><input type="date" className="admin-field mt-1 w-full" value={filters.from} onChange={(event) => set({ from: event.target.value })} /></Field>
            <Field label="Bitiş"><input type="date" className="admin-field mt-1 w-full" value={filters.to} onChange={(event) => set({ to: event.target.value })} /></Field>
            <Field label="Servis"><select className="admin-field mt-1 w-full" value={filters.serviceType} onChange={(event) => set({ serviceType: event.target.value })}><option value="ALL">Tümü</option><option value="ESIM">eSIM</option><option value="LOUNGE">Lounge</option></select></Field>
            <Field label="Müşteri ülkesi"><select className="admin-field mt-1 w-full" value={filters.customerCountry} onChange={(event) => set({ customerCountry: event.target.value })}><option value="">Tümü</option>{(options.data?.customerCountries ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Seyahat destinasyonu"><select className="admin-field mt-1 w-full" value={filters.destination} onChange={(event) => set({ destination: event.target.value })}><option value="">Tümü</option>{(options.data?.destinations ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Havalimanı"><select className="admin-field mt-1 w-full" value={filters.airport} onChange={(event) => set({ airport: event.target.value })}><option value="">Tümü</option>{(options.data?.airports ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Provider"><select className="admin-field mt-1 w-full" value={filters.providerId} onChange={(event) => set({ providerId: event.target.value })}><option value="">Tümü</option>{(options.data?.providers ?? []).map((provider: any) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
            <Field label="Trafik kaynağı"><select className="admin-field mt-1 w-full" value={filters.source} onChange={(event) => set({ source: event.target.value })}><option value="">Tümü</option>{(options.data?.sources ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Kampanya"><select className="admin-field mt-1 w-full" value={filters.campaign} onChange={(event) => set({ campaign: event.target.value })}><option value="">Tümü</option>{(options.data?.campaigns ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Dil"><select className="admin-field mt-1 w-full" value={filters.locale} onChange={(event) => set({ locale: event.target.value })}><option value="">Tümü</option>{(options.data?.locales ?? []).map((value: string) => <option key={value}>{value}</option>)}</select></Field>
            <div className="flex items-end gap-2">
              <Button size="sm" variant={filters.compare ? "secondary" : "outline"} onClick={() => set({ compare: !filters.compare })}>Önceki dönemle karşılaştır</Button>
              <Button size="sm" variant="ghost" onClick={() => setFilters({ from: day(-29), to: day(0), serviceType: "ALL", customerCountry: "", destination: "", airport: "", providerId: "", source: "", campaign: "", locale: "", compare: true })}>Sıfırla</Button>
            </div>
          </div>
        </AdminPanel>

        {report.isPending ? <AdminLoading /> : report.error ? <AdminError error={report.error} /> : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Brüt ciro" value={money(data.kpis.grossRevenue, currency)} detail={data.previousKpis ? `Önceki dönem ${money(data.previousKpis.grossRevenue, currency)}` : undefined} />
              <Metric label="Sipariş" value={data.kpis.orders} detail={data.previousKpis ? `Önceki dönem ${data.previousKpis.orders}` : undefined} />
              <Metric label="Brüt kâr" value={money(data.kpis.grossContribution, currency)} tone="profit" detail="Net ciro − provider maliyeti − komisyon" />
              <Metric label="Dönüşüm" value={data.kpis.conversionRate == null ? "Veri yok" : `%${(data.kpis.conversionRate * 100).toFixed(2)}`} detail="Satın alma / ziyaret oturumu" />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <AdminPanel title="Trafik kaynağı performansı">
                {!data.bySource.length ? <EmptyState title="Henüz atıf verisi yok." /> : (
                  <AdminTable head={["Kaynak", "Ziyaret", "Finder", "Satın alma", "Ciro", "Brüt kâr"]}>
                    {data.bySource.map((row: any) => <tr key={row.source}><td className="font-semibold">{row.source}</td><td>{row.visits}</td><td>{row.finderStarts}</td><td>{row.purchases}</td><td>{money(row.revenue, currency)}</td><td>{money(row.grossContribution, currency)}</td></tr>)}
                  </AdminTable>
                )}
              </AdminPanel>

              <AdminPanel title="Atıf: ilk ve son temas">
                {!data.firstTouch.length && !data.lastTouch.length ? <EmptyState title="Atıf kaydı yok." /> : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><h3 className="text-xs font-bold">İlk temas</h3>{data.firstTouch.map((row: any) => <p key={row.label} className="mt-1 flex justify-between text-xs"><span>{row.label}</span><strong>{row.count}</strong></p>)}</div>
                    <div><h3 className="text-xs font-bold">Son temas</h3>{data.lastTouch.map((row: any) => <p key={row.label} className="mt-1 flex justify-between text-xs"><span>{row.label}</span><strong>{row.count}</strong></p>)}</div>
                  </div>
                )}
              </AdminPanel>

              <AdminPanel title="Kampanyalar (utm)">
                {!data.campaigns.length ? <EmptyState title="Kampanya verisi yok." /> : (
                  <AdminTable head={["Kampanya", "Kaynak", "Ziyaret", "Sipariş", "Dönüşüm", "Ciro", "Brüt kâr"]}>
                    {data.campaigns.map((row: any) => <tr key={`${row.campaign}-${row.source}`}><td className="font-semibold">{row.campaign}</td><td>{row.source}</td><td>{row.visitors}</td><td>{row.orders}</td><td>{row.conversionRate == null ? "—" : `%${(row.conversionRate * 100).toFixed(1)}`}</td><td>{money(row.revenue, currency)}</td><td>{money(row.grossContribution, currency)}</td></tr>)}
                  </AdminTable>
                )}
              </AdminPanel>

              <AdminPanel title="Finder hunisi">
                {!data.funnel.some((step: any) => step.count > 0) ? <EmptyState title="Henüz etkinlik verisi yok." /> : (
                  <div className="grid gap-2">
                    {data.funnel.map((step: any) => (
                      <div key={step.key} className="text-xs">
                        <div className="flex justify-between"><span>{step.label}</span><strong>{step.count}</strong></div>
                        <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, step.rate == null ? 0 : step.rate * 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminPanel>

              <AdminPanel title="En çok satan ürünler">
                {!data.topProducts.length ? <EmptyState title="Satış verisi yok." /> : (
                  <AdminTable head={["Ürün", "Adet", "Ciro", "Brüt kâr"]}>
                    {data.topProducts.map((row: any) => <tr key={row.productName}><td>{row.productName}</td><td>{row.quantity}</td><td>{money(row.revenue, currency)}</td><td>{money(row.grossContribution, currency)}</td></tr>)}
                  </AdminTable>
                )}
              </AdminPanel>

              <AdminPanel title="Müşteri ülkesi ve seyahat destinasyonu">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><h3 className="text-xs font-bold">Müşteri ülkesi</h3>{!data.topCustomerCountries.length ? <p className="mt-1 text-xs text-muted-foreground">Veri yok.</p> : data.topCustomerCountries.map((row: any) => <p key={row.label} className="mt-1 flex justify-between text-xs"><span>{row.label}</span><strong>{row.count}</strong></p>)}</div>
                  <div><h3 className="text-xs font-bold">Seyahat destinasyonu</h3>{!data.topTravelDestinations.length ? <p className="mt-1 text-xs text-muted-foreground">Veri yok.</p> : data.topTravelDestinations.map((row: any) => <p key={row.label} className="mt-1 flex justify-between text-xs"><span>{row.label}</span><strong>{row.count}</strong></p>)}</div>
                </div>
              </AdminPanel>
            </div>
            <p className="text-xs text-muted-foreground">Tüm değerler gerçek kayıtlardan hesaplanır; veri yoksa boş gösterilir.</p>
          </>
        ) : null}
      </div>
    </AdminGate>
  );
}
