import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, AdminTable, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminCustomerDetail, getAdminCustomers } from "@/lib/admin-control.functions";
import { DeletionRequestsPanel } from "@/components/admin/DeletionRequestsPanel";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => adminHead("Müşteriler", "Müşteri profilleri, satın alma geçmişi ve seyahatler."),
  component: Customers,
});

function Customers() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["admin-customers", search], queryFn: () => getAdminCustomers({ data: { search } }) });

  return (
    <AdminGate title="Müşteriler">
      <div className="grid gap-4">
        <AdminPanel title="Ara">
          <Field label="İsim veya e-posta"><input className="admin-field mt-1 w-full max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Müşteri ara" /></Field>
        </AdminPanel>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : (
          <AdminPanel title={`${list.data?.length ?? 0} müşteri`}>
            {!list.data?.length ? <EmptyState title="Henüz müşteri kaydı yok." /> : (
              <>
                <div className="grid gap-2 lg:hidden">
                  {list.data.map((customer: any) => (
                    <button key={customer.id} type="button" onClick={() => setOpenId(customer.id)} className="rounded-md border border-border p-3 text-left text-xs">
                      <strong>{customer.full_name ?? customer.email ?? "Müşteri"}</strong>
                      <p className="mt-1 text-muted-foreground">{customer.country_iso ?? "—"} · {customer.preferred_locale} · {customer.orders} sipariş</p>
                      <p className="mt-1 font-semibold">{money(customer.lifetimeRevenue)}</p>
                    </button>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <AdminTable head={["Müşteri", "E-posta", "Ülke", "Dil", "Sipariş", "Yaşam boyu ciro", "Servisler", "Seyahat", "Son satın alma", ""]}>
                    {list.data.map((customer: any) => (
                      <tr key={customer.id}>
                        <td className="font-semibold">{customer.full_name ?? "—"}</td>
                        <td>{customer.email ?? "—"}</td>
                        <td>{customer.country_iso ?? "—"}</td>
                        <td>{customer.preferred_locale}</td>
                        <td>{customer.orders}</td>
                        <td className="font-semibold">{money(customer.lifetimeRevenue)}</td>
                        <td>{customer.services.length ? customer.services.map((service: string) => <StatusBadge key={service} value={service} />) : "—"}</td>
                        <td>{customer.trips}</td>
                        <td>{customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString("tr-TR") : "—"}</td>
                        <td><Button size="sm" variant="outline" onClick={() => setOpenId(customer.id)}>Detay</Button></td>
                      </tr>
                    ))}
                  </AdminTable>
                </div>
              </>
            )}
          </AdminPanel>
        )}
        <DeletionRequestsPanel />
      </div>
      <CustomerDetail id={openId} onClose={() => setOpenId(null)} />
    </AdminGate>
  );
}

function CustomerDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin-customer-detail", id], queryFn: () => getAdminCustomerDetail({ data: { id: id! } }), enabled: Boolean(id) });
  const profile = detail.data?.profile;
  return (
    <AdminDrawer open={Boolean(id)} title={profile?.full_name ?? profile?.email ?? "Müşteri"} subtitle={profile?.email ?? undefined} onClose={onClose}>
      {detail.isPending ? <AdminLoading /> : detail.error ? <AdminError error={detail.error} /> : profile ? (
        <div className="grid gap-4">
          <section>
            <h3 className="admin-panel-title">Profil</h3>
            <DataRow label="Müşteri ülkesi" value={profile.country_iso ?? "—"} />
            <DataRow label="Dil" value={profile.preferred_locale} />
            <DataRow label="Kayıt tarihi" value={new Date(profile.created_at).toLocaleDateString("tr-TR")} />
            <DataRow label="Sipariş" value={detail.data?.totals.orders ?? 0} />
            <DataRow label="Yaşam boyu ciro" value={money(detail.data?.totals.lifetimeRevenue)} />
            <DataRow label="Brüt kâr katkısı" value={money(detail.data?.totals.grossContribution)} />
            <DataRow label="Satın alınan servisler" value={detail.data?.services.length ? detail.data.services.join(", ") : "—"} />
            <DataRow label="Son satın alma" value={detail.data?.lastPurchase ? new Date(detail.data.lastPurchase).toLocaleDateString("tr-TR") : "—"} />
          </section>
          <section>
            <h3 className="admin-panel-title">Seyahatler</h3>
            {!detail.data?.trips.length ? <EmptyState title="Seyahat kaydı yok." /> : (
              <div className="grid gap-2">{detail.data.trips.map((trip: any) => (
                <div key={trip.id} className="rounded-md border border-border p-3 text-xs">
                  <strong>{trip.title}</strong>
                  <p className="mt-1 text-muted-foreground">{trip.destinations?.name ?? "Destinasyon belirtilmedi"} · {trip.start_date ?? "—"} → {trip.end_date ?? "—"}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Seyahat destinasyonu müşteri ülkesinden bağımsızdır.</p>
                </div>
              ))}</div>
            )}
          </section>
          <section>
            <h3 className="admin-panel-title">Siparişler</h3>
            {!detail.data?.orders.length ? <EmptyState title="Sipariş yok." /> : (
              <div className="grid gap-2">{detail.data.orders.map((order: any) => (
                <div key={order.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2"><strong>{order.order_number}</strong><StatusBadge value={order.payment_status} /></div>
                  <p className="mt-1">{money(order.gross_revenue, order.currency)} · Brüt kâr {money(order.gross_profit, order.currency)}</p>
                  <p className="mt-1 text-muted-foreground">{(order.order_items ?? []).map((item: any) => item.product_name_snapshot).join(", ")}</p>
                </div>
              ))}</div>
            )}
          </section>
        </div>
      ) : null}
    </AdminDrawer>
  );
}
