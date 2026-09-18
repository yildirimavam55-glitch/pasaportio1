import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, AdminTable, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminOrderDetail, getAdminOrders } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => adminHead("Siparişler", "eSIM ve Lounge sipariş yönetimi."),
  component: Orders,
});

const PAYMENT = ["ALL", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];
const FULFILLMENT = ["ALL", "PENDING", "PROCESSING", "FULFILLED", "FAILED", "CANCELLED"];

function Orders() {
  const [filters, setFilters] = useState({ service: "ALL", search: "", from: "", to: "", paymentStatus: "ALL", fulfillmentStatus: "ALL" });
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["admin-orders", filters], queryFn: () => getAdminOrders({ data: filters }) });
  const set = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <AdminGate title="Siparişler">
      <div className="grid gap-4">
        <AdminPanel title="Filtreler">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Ara"><input className="admin-field mt-1 w-full" placeholder="Sipariş no, e-posta, ürün" value={filters.search} onChange={(event) => set({ search: event.target.value })} /></Field>
            <Field label="Başlangıç"><input type="date" className="admin-field mt-1 w-full" value={filters.from} onChange={(event) => set({ from: event.target.value })} /></Field>
            <Field label="Bitiş"><input type="date" className="admin-field mt-1 w-full" value={filters.to} onChange={(event) => set({ to: event.target.value })} /></Field>
            <Field label="Ödeme durumu"><select className="admin-field mt-1 w-full" value={filters.paymentStatus} onChange={(event) => set({ paymentStatus: event.target.value })}>{PAYMENT.map((value) => <option key={value} value={value}>{value === "ALL" ? "Tümü" : value}</option>)}</select></Field>
            <Field label="Teslimat durumu"><select className="admin-field mt-1 w-full" value={filters.fulfillmentStatus} onChange={(event) => set({ fulfillmentStatus: event.target.value })}>{FULFILLMENT.map((value) => <option key={value} value={value}>{value === "ALL" ? "Tümü" : value}</option>)}</select></Field>
            <div className="sm:col-span-2 xl:col-span-3 flex flex-wrap items-end gap-2">
              {["ALL", "ESIM", "LOUNGE"].map((value) => <Button key={value} size="sm" variant={filters.service === value ? "secondary" : "outline"} onClick={() => set({ service: value })}>{value === "ALL" ? "Tümü" : value === "ESIM" ? "eSIM" : "Lounge"}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => setFilters({ service: "ALL", search: "", from: "", to: "", paymentStatus: "ALL", fulfillmentStatus: "ALL" })}>Filtreleri temizle</Button>
            </div>
          </div>
        </AdminPanel>

        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : (
          <AdminPanel title={`${list.data?.length ?? 0} sipariş`}>
            {!list.data?.length ? <EmptyState title="Bu filtrelerle sipariş yok." detail="Gerçek satış verisi oluştukça burada listelenir." /> : (
              <>
                {/* Mobilde kart, masaüstünde tablo */}
                <div className="grid gap-2 lg:hidden">
                  {list.data.map((order: any) => (
                    <button key={order.id} type="button" onClick={() => setOpenId(order.id)} className="rounded-md border border-border p-3 text-left text-xs">
                      <div className="flex items-center justify-between gap-2"><strong>{order.order_number}</strong><StatusBadge value={order.payment_status} /></div>
                      <p className="mt-1 text-muted-foreground">{order.guest_email ?? "Kayıtlı müşteri"} · {new Date(order.created_at).toLocaleDateString("tr-TR")}</p>
                      <p className="mt-1 font-semibold">{money(order.gross_revenue, order.currency)} · Brüt kâr {money(order.gross_profit, order.currency)}</p>
                    </button>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <AdminTable head={["Sipariş", "Müşteri", "Servis / Ürün", "Satış", "Provider maliyeti", "Brüt kâr", "Ödeme", "Teslimat", "Tarih", ""]}>
                    {list.data.map((order: any) => (
                      <tr key={order.id}>
                        <td className="font-semibold">{order.order_number}</td>
                        <td>{order.guest_email ?? "Kayıtlı müşteri"}</td>
                        <td>{(order.order_items ?? []).map((item: any) => <div key={item.id}><span className="font-semibold">{item.service_type === "ESIM" ? "eSIM" : "Lounge"}</span> · {item.product_name_snapshot}</div>)}</td>
                        <td>{money(order.gross_revenue, order.currency)}</td>
                        <td>{money(order.provider_cost_total, order.currency)}</td>
                        <td className="font-semibold">{money(order.gross_profit, order.currency)}</td>
                        <td><StatusBadge value={order.payment_status} /></td>
                        <td><StatusBadge value={order.fulfillment_status} /></td>
                        <td>{new Date(order.created_at).toLocaleDateString("tr-TR")}</td>
                        <td><Button size="sm" variant="outline" onClick={() => setOpenId(order.id)}>Detay</Button></td>
                      </tr>
                    ))}
                  </AdminTable>
                </div>
              </>
            )}
          </AdminPanel>
        )}
      </div>
      <OrderDetail id={openId} onClose={() => setOpenId(null)} />
    </AdminGate>
  );
}

function OrderDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["admin-order-detail", id], queryFn: () => getAdminOrderDetail({ data: { id: id! } }), enabled: Boolean(id) });
  const order = detail.data?.order;
  return (
    <AdminDrawer open={Boolean(id)} title={order?.order_number ?? "Sipariş"} subtitle={order ? new Date(order.created_at).toLocaleString("tr-TR") : undefined} onClose={onClose}>
      {detail.isPending ? <AdminLoading /> : detail.error ? <AdminError error={detail.error} /> : order ? (
        <div className="grid gap-4">
          <section>
            <h3 className="admin-panel-title">Özet</h3>
            <DataRow label="Müşteri" value={detail.data?.customer?.full_name ?? detail.data?.customer?.email ?? order.guest_email ?? "Misafir"} />
            <DataRow label="Müşteri ülkesi" value={order.customer_country_iso ?? "—"} />
            <DataRow label="Dil" value={order.locale ?? "—"} />
            <DataRow label="Kaynak" value={detail.data?.attribution ? `${detail.data.attribution.last_touch_source}${detail.data.attribution.utm_campaign ? ` · ${detail.data.attribution.utm_campaign}` : ""}` : "Bilinmiyor"} />
            <DataRow label="Ödeme" value={<StatusBadge value={order.payment_status} />} />
            <DataRow label="Teslimat" value={<StatusBadge value={order.fulfillment_status} />} />
          </section>

          <section>
            <h3 className="admin-panel-title">Finans</h3>
            <DataRow label="Brüt ciro" value={money(order.gross_revenue, order.currency)} />
            <DataRow label="İndirim" value={money(order.discount_total, order.currency)} />
            <DataRow label="İade" value={money(order.refunded_total, order.currency)} />
            <DataRow label="Provider maliyeti" value={money(order.provider_cost_total, order.currency)} />
            <DataRow label="Ödeme komisyonu" value={money(order.payment_fee, order.currency)} />
            <DataRow label="Vergi (ayrı raporlanır)" value={money(order.tax_total, order.currency)} />
            <DataRow label="Brüt kâr" value={<strong>{money(order.gross_profit, order.currency)}</strong>} />
          </section>

          <section>
            <h3 className="admin-panel-title">Kalemler</h3>
            <div className="grid gap-2">
              {(order.order_items ?? []).map((item: any) => (
                <div key={item.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2"><strong>{item.product_name_snapshot}</strong><StatusBadge value={item.fulfillment_status} /></div>
                  <p className="mt-1 text-muted-foreground">{item.service_type === "ESIM" ? `eSIM · ${item.destination_snapshot ?? "—"}` : `Lounge · ${item.airport_iata_snapshot ?? "—"}`}</p>
                  <p className="mt-1">Satış {money(item.sale_price, order.currency)} · Maliyet {money(item.provider_cost, order.currency)} · Kâr {money(Number(item.sale_price ?? 0) - Number(item.provider_cost ?? 0), order.currency)}</p>
                  <p className="mt-1 text-muted-foreground">Provider referansı: {item.provider_reference ?? "—"}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="admin-panel-title">Zaman çizelgesi</h3>
            <ol className="mt-2 grid gap-2">
              {(detail.data?.timeline ?? []).map((entry: any, index: number) => (
                <li key={index} className="flex gap-3 text-xs">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div><strong>{entry.label}</strong>{entry.detail && <span className="block text-muted-foreground">{entry.detail}</span>}<span className="block text-[10px] text-muted-foreground">{entry.at ? new Date(entry.at).toLocaleString("tr-TR") : "—"}</span></div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[10px] text-muted-foreground">Güvenlik: QR aktivasyon içeriği ve voucher kodu yönetim panelinde hiçbir zaman gösterilmez.</p>
          </section>
        </div>
      ) : null}
    </AdminDrawer>
  );
}
