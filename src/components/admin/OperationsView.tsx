import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, AdminTable, DataRow, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/button";
import { getAdminOperations, getAdminProviders } from "@/lib/admin-control.functions";

const STATUSES = [
  { value: "ALL", label: "Tümü" },
  { value: "ATTENTION", label: "Müdahale gerekiyor" },
  { value: "PENDING", label: "Bekleyen / işlemde" },
  { value: "FAILED", label: "Başarısız" },
  { value: "FULFILLED", label: "Tamamlanan" },
];

/** Next operational action per alert type, without revealing any fulfilment secret. */
const NEXT_ACTION: Record<string, string> = {
  PAID_NOT_FULFILLED: "Ödeme alındı ama teslimat tamamlanmadı — provider talebini tekrar başlatın.",
  PROVIDER_ERROR: "Provider hata döndürdü — Provider Hub’daki hata kaydını inceleyin.",
  PROVISIONING_DELAYED: "Sağlama gecikti — provider durumunu kontrol edin.",
  QR_DELIVERY_FAILED: "QR teslimi başarısız — müşteri e-posta adresini doğrulayıp yeniden gönderin.",
  VOUCHER_DELIVERY_FAILED: "Voucher teslimi başarısız — müşteri iletişim bilgisini doğrulayın.",
};

export function OperationsView({ service }: { service: "ESIM" | "LOUNGE" }) {
  const [filters, setFilters] = useState({ status: "ALL", from: "", to: "", providerId: "ALL" });
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useQuery({ queryKey: ["admin-ops", service, filters], queryFn: () => getAdminOperations({ data: { service, ...filters } }) });
  const providers = useQuery({ queryKey: ["admin-providers"], queryFn: () => getAdminProviders() });
  const set = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));
  const selected = (rows.data ?? []).find((row: any) => row.id === openId) ?? null;
  const attention = (rows.data ?? []).filter((row: any) => row.attention).length;

  return (
    <div className="grid gap-4">
      <AdminPanel title="Filtreler">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Durum"><select className="admin-field mt-1 w-full" value={filters.status} onChange={(event) => set({ status: event.target.value })}>{STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
          <Field label="Provider"><select className="admin-field mt-1 w-full" value={filters.providerId} onChange={(event) => set({ providerId: event.target.value })}><option value="ALL">Tümü</option>{(providers.data ?? []).filter((provider: any) => provider.service_type === service).map((provider: any) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></Field>
          <Field label="Başlangıç"><input type="date" className="admin-field mt-1 w-full" value={filters.from} onChange={(event) => set({ from: event.target.value })} /></Field>
          <Field label="Bitiş"><input type="date" className="admin-field mt-1 w-full" value={filters.to} onChange={(event) => set({ to: event.target.value })} /></Field>
        </div>
      </AdminPanel>

      {attention > 0 && <p className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" />{attention} kayıt müdahale bekliyor.</p>}

      {rows.isPending ? <AdminLoading /> : rows.error ? <AdminError error={rows.error} /> : (
        <AdminPanel title={`${rows.data?.length ?? 0} kayıt`}>
          {!rows.data?.length ? <EmptyState title="Bu filtrelerle kayıt yok." /> : (
            <>
              <div className="grid gap-2 lg:hidden">
                {rows.data.map((row: any) => (
                  <button key={row.id} type="button" onClick={() => setOpenId(row.id)} className={`rounded-md border p-3 text-left text-xs ${row.attention ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-2"><strong>{row.order_items?.orders?.order_number ?? "—"}</strong><StatusBadge value={row.order_items?.fulfillment_status ?? row.status} /></div>
                    <p className="mt-1 text-muted-foreground">{service === "ESIM" ? `${row.destination_label ?? "—"} · ${row.package_label ?? "—"}` : `${row.airport_iata ?? "—"} · ${row.lounge_name ?? "—"}`}</p>
                  </button>
                ))}
              </div>
              <div className="hidden lg:block">
                <AdminTable head={service === "ESIM"
                  ? ["Sipariş", "Destinasyon", "Paket", "Yolcu", "Provider", "Ödeme", "Teslimat", "Oluşturma", ""]
                  : ["Sipariş", "Havalimanı", "Lounge", "Yolcu", "Provider", "Ödeme", "Teslimat", "Ziyaret", ""]}>
                  {rows.data.map((row: any) => (
                    <tr key={row.id} className={row.attention ? "bg-destructive/5" : ""}>
                      <td className="font-semibold">{row.order_items?.orders?.order_number ?? "—"}</td>
                      <td>{service === "ESIM" ? (row.destination_label ?? "—") : (`${row.airport_iata ?? "—"} · ${row.terminal ?? "—"}`)}</td>
                      <td>{service === "ESIM" ? (row.package_label ?? row.order_items?.product_name_snapshot ?? "—") : (row.lounge_name ?? "—")}</td>
                      <td>{service === "ESIM" ? (row.traveler_label ?? "—") : row.travelers_count}</td>
                      <td>{row.order_items?.providers?.name ?? "—"}</td>
                      <td><StatusBadge value={row.order_items?.orders?.payment_status ?? "—"} /></td>
                      <td><StatusBadge value={row.order_items?.fulfillment_status ?? row.status} /></td>
                      <td>{service === "ESIM" ? new Date(row.created_at).toLocaleDateString("tr-TR") : (row.visit_at ? new Date(row.visit_at).toLocaleString("tr-TR") : "—")}</td>
                      <td><Button size="sm" variant="outline" onClick={() => setOpenId(row.id)}>Detay</Button></td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            </>
          )}
        </AdminPanel>
      )}

      <AdminDrawer open={Boolean(selected)} title={selected?.order_items?.orders?.order_number ?? "Operasyon kaydı"} subtitle={service === "ESIM" ? "eSIM teslimatı" : "Lounge rezervasyonu"} onClose={() => setOpenId(null)}>
        {selected && (
          <div className="grid gap-4">
            {selected.attention && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">{NEXT_ACTION[selected.attention] ?? "Bu kayıt müdahale bekliyor."}</p>}
            <section>
              <DataRow label="Ürün" value={selected.order_items?.product_name_snapshot ?? "—"} />
              <DataRow label="Provider" value={selected.order_items?.providers?.name ?? "—"} />
              <DataRow label="Provider referansı" value={selected.order_items?.provider_reference ?? "—"} />
              <DataRow label="Ödeme" value={<StatusBadge value={selected.order_items?.orders?.payment_status ?? "—"} />} />
              <DataRow label="Teslimat" value={<StatusBadge value={selected.order_items?.fulfillment_status ?? selected.status} />} />
              {service === "ESIM" ? (
                <>
                  <DataRow label="Destinasyon" value={selected.destination_label ?? "—"} />
                  <DataRow label="Paket" value={selected.package_label ?? "—"} />
                  <DataRow label="Geçerlilik sonu" value={selected.expires_at ? new Date(selected.expires_at).toLocaleString("tr-TR") : "—"} />
                </>
              ) : (
                <>
                  <DataRow label="Havalimanı" value={`${selected.airport_iata ?? "—"} · ${selected.terminal ?? "—"}`} />
                  <DataRow label="Lounge" value={selected.lounge_name ?? "—"} />
                  <DataRow label="Ziyaret" value={selected.visit_at ? new Date(selected.visit_at).toLocaleString("tr-TR") : "—"} />
                  <DataRow label="Rezervasyon referansı" value={selected.booking_reference ?? "—"} />
                </>
              )}
            </section>
            <p className="text-[10px] text-muted-foreground">Güvenlik: QR aktivasyon içeriği, ICCID ve voucher kodu operasyon ekranlarında gösterilmez.</p>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
