import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Metric, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { getAdminFinance } from "@/lib/admin-control.functions";
import { FINANCE_DEFINITIONS } from "@/domain/finance/formulas";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  head: () => adminHead("Finans", "Gelir, maliyet ve katkı raporu."),
  component: Finance,
});

function Finance() {
  const finance = useQuery({ queryKey: ["admin-finance"], queryFn: () => getAdminFinance() });
  if (finance.isPending) return <AdminGate title="Finans"><AdminLoading /></AdminGate>;
  if (finance.error) return <AdminGate title="Finans"><AdminError error={finance.error} /></AdminGate>;
  const totals = finance.data?.totals;
  const currency = totals?.currency ?? "EUR";

  return (
    <AdminGate title="Finans">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Brüt ciro" value={money(totals?.revenue, currency)} />
          <Metric label="İndirim" value={money(totals?.discounts, currency)} />
          <Metric label="İade" value={money(totals?.refunded, currency)} />
          <Metric label="Net ciro" value={money(totals?.netRevenue, currency)} detail="Brüt ciro − indirim − iade" />
          <Metric label="Provider maliyeti" value={money(totals?.providerCost, currency)} />
          <Metric label="Ödeme komisyonu" value={money(totals?.fees, currency)} />
          <Metric label="Vergi" value={money(totals?.tax, currency)} detail="Ayrı raporlanır, kârdan düşülmez" />
          <Metric label="Brüt kâr" value={money(totals?.grossProfit, currency)} tone="profit" detail={totals?.marginPercent == null ? "Marj için satış gerekli" : `%${totals.marginPercent.toFixed(1)} marj`} />
        </div>

        <AdminPanel title="Finansal tanımlar (tek kaynak)">
          <p className="mb-3 text-sm text-muted-foreground">Panel, siparişler ve finans ekranı aynı hesaplama tanımlarını kullanır. İndirim ve iade yalnızca bir kez düşülür.</p>
          <AdminTable head={["Ölçüt", "Formül", "Not"]}>
            {FINANCE_DEFINITIONS.map((row) => <tr key={row.label}><td className="font-semibold">{row.label}</td><td>{row.formula}</td><td className="text-muted-foreground">{row.note}</td></tr>)}
          </AdminTable>
        </AdminPanel>

        <AdminPanel title="İade talepleri">
          {!finance.data?.refunds.length ? <EmptyState title="İade talebi yok." /> : (
            <AdminTable head={["Tarih", "Tutar", "Durum", "Sebep"]}>
              {finance.data.refunds.map((refund: any) => <tr key={refund.id}><td>{new Date(refund.created_at).toLocaleDateString("tr-TR")}</td><td>{money(refund.amount, refund.currency)}</td><td>{refund.status}</td><td>{refund.reason ?? "—"}</td></tr>)}
            </AdminTable>
          )}
        </AdminPanel>

        <p className="text-xs text-muted-foreground">Ödeme entegrasyonu henüz açılmadığından komisyon ve mutabakat alanları gerçek PSP verisi geldiğinde dolar.</p>
      </div>
    </AdminGate>
  );
}
