import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { REFUND_COPY } from "@/components/refunds/refund-copy";
import { getAdminRefundEvents, listAdminRefundRequests, markRefundAlertRead, updateAdminRefundRequest } from "@/lib/refunds.functions";

export const Route = createFileRoute("/_authenticated/admin/refunds")({
  head: () => adminHead("İade Talepleri", "14 gün iade güvencesi talepleri: inceleme, onay ve ret."),
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  component: Refunds,
});

type Row = Awaited<ReturnType<typeof listAdminRefundRequests>>[number];
const TR = REFUND_COPY.tr;
const USAGE: Record<string, string> = { DEMO: "Demo", VERIFIED_UNUSED: "Doğrulandı · kullanılmamış", VERIFIED_USED: "Doğrulandı · kullanılmış", UNKNOWN: "Doğrulanamadı" };
const date = (v: string | null) => (v ? new Date(v).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—");

function Refunds() {
  const q = useQuery({ queryKey: ["admin-refund-requests"], queryFn: () => listAdminRefundRequests() });
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(search.id ?? null);
  useEffect(() => { if (search.id) setOpenId(search.id); }, [search.id]);
  useEffect(() => { if (openId) void markRefundAlertRead({ data: { id: openId } }).then(() => qc.invalidateQueries({ queryKey: ["admin-alerts"] })).catch(() => {}); }, [openId, qc]);
  const current = q.data?.find((r) => r.id === openId) ?? null;
  return (
    <AdminGate title="İade Talepleri">
      <p className="mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs font-semibold">
        <AlertTriangle className="size-4 shrink-0" />Ödeme iadesi entegrasyonu henüz aktif değil. “Onaylandı” para iadesi yapıldığı anlamına gelmez; “İade edildi” yalnızca ödeme sağlayıcısı onayından sonra ayarlanabilir.
      </p>
      {q.isPending ? <AdminLoading /> : q.error ? <AdminError error={q.error} /> : (
        <AdminPanel title={`İade talepleri (${q.data.length})`}>
          {!q.data.length ? <EmptyState title="Henüz iade talebi yok." /> : (
            <ul className="grid gap-2">
              {q.data.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)} className="grid w-full gap-1 rounded-md border border-border p-3 text-left text-sm hover:bg-secondary/50">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={r.status} />
                      {r.isTest && <span className="rounded bg-warning/15 px-1.5 text-[10px] font-bold">TEST / DEMO</span>}
                      <strong className="min-w-0 truncate">{r.product ?? "eSIM"}</strong>
                      <span className="text-muted-foreground">{r.country ?? ""}</span>
                      <span className="ml-auto font-semibold">{r.amount == null ? "—" : money(r.amount, r.currency)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.customer.email ?? r.customer.id} · {r.orderNumber ? `#${r.orderNumber}` : "sipariş yok"} · {r.daysSincePurchase ?? "—"} gün önce · {r.windowOpenAtRequest ? "14 gün içinde" : "süre dışı"} · Kullanım: {USAGE[r.usageNow] ?? r.usageNow} · Talep: {date(r.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      )}
      {current && <RefundDrawer row={current} onClose={() => setOpenId(null)} />}
    </AdminGate>
  );
}

function RefundDrawer({ row, onClose }: { row: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["admin-refund-events", row.id], queryFn: () => getAdminRefundEvents({ data: { id: row.id } }) });
  const [adminNote, setAdminNote] = useState("");
  const [customerMessage, setCustomerMessage] = useState(row.customerMessage ?? "");
  const act = useMutation({
    mutationFn: (action: "START_REVIEW" | "APPROVE" | "REJECT" | "CANCEL" | "NOTE") =>
      updateAdminRefundRequest({ data: { id: row.id, action, ...(adminNote.trim() ? { adminNote: adminNote.trim() } : {}), customerMessage: customerMessage.trim() } }),
    onSuccess: async () => {
      setAdminNote("");
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-refund-requests"] }), qc.invalidateQueries({ queryKey: ["admin-refund-events", row.id] }), qc.invalidateQueries({ queryKey: ["admin-alerts"] })]);
    },
  });
  const openStatus = row.status === "REQUESTED" || row.status === "UNDER_REVIEW";
  const basis = row.amountBasis as Record<string, any>;
  return (
    <AdminDrawer open title={row.product ?? "İade talebi"} subtitle={`${TR.statuses[row.status]}${row.isTest ? " · TEST / DEMO" : ""}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-1">
          <DataRow label="Müşteri" value={`${row.customer.name ?? ""} ${row.customer.email ?? row.customer.id ?? ""}`.trim()} />
          <DataRow label="Sipariş" value={row.orderNumber ? `#${row.orderNumber} (${row.paymentStatus ?? "—"})` : "—"} />
          <DataRow label="eSIM" value={row.esimId ?? "—"} />
          <DataRow label="Aktivasyon" value={row.activation} />
          <DataRow label="Sipariş kalemi" value={row.orderItemId ?? "—"} />
          <DataRow label="Ülke" value={row.country ?? "—"} />
          <DataRow label="Satın alma" value={date(row.purchaseAt)} />
          <DataRow label="Satın almadan bu yana" value={row.daysSincePurchase == null ? "—" : `${row.daysSincePurchase} gün`} />
          <DataRow label="14 gün (talep anında)" value={row.windowOpenAtRequest ? "İçinde" : "Dışında"} />
          <DataRow label="Liste fiyatı" value={row.listAmount == null ? "—" : money(row.listAmount, row.currency)} />
          <DataRow label="İndirim / kupon" value={row.discountAmount ? `-${money(row.discountAmount, row.currency)}${basis?.["couponCode"] ? ` (${basis["couponCode"]})` : ""}` : "—"} />
          <DataRow label="Ödenen (iade esası)" value={row.amount == null ? (row.isTest ? "Demo — ödeme yok" : "—") : money(row.amount, row.currency)} />
          <DataRow label="Sağlayıcı bağlı" value={row.providerLinked ? "Evet" : "Hayır"} />
          <DataRow label="Sağlayıcı durumu" value={row.providerStatus ?? "—"} />
          <DataRow label="Kullanım (talep anında)" value={USAGE[row.usageAtRequest] ?? row.usageAtRequest} />
          <DataRow label="Kullanım (şimdi)" value={USAGE[row.usageNow] ?? row.usageNow} />
          <DataRow label="Kullanılan veri" value={row.usedMb == null ? "Güvenilir veri yok" : `${row.usedMb} MB`} />
          <DataRow label="Uygunluk" value={row.eligibility} />
          <DataRow label="Neden" value={`${row.reasonCode ? TR.reasons[row.reasonCode as keyof typeof TR.reasons] ?? row.reasonCode : "—"}${row.reasonNote ? ` — ${row.reasonNote}` : ""}`} />
          <DataRow label="Talep tarihi" value={date(row.createdAt)} />
        </div>

        <Field label="Müşteriye gösterilecek yanıt / ret gerekçesi">
          <textarea rows={2} className="admin-field mt-1 w-full" value={customerMessage} onChange={(e) => setCustomerMessage(e.target.value)} />
        </Field>
        <Field label="Dahili yönetici notu (müşteri görmez)">
          <textarea rows={2} className="admin-field mt-1 w-full" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        </Field>
        {act.error && <p className="text-xs font-semibold text-destructive">{(act.error as Error).message}</p>}
        <div className="flex flex-wrap gap-2">
          {row.status === "REQUESTED" && <Button size="sm" variant="secondary" disabled={act.isPending} onClick={() => act.mutate("START_REVIEW")}>İncelemeye al</Button>}
          {openStatus && <Button size="sm" disabled={act.isPending} onClick={() => act.mutate("APPROVE")}>Onayla</Button>}
          {openStatus && <Button size="sm" variant="destructive" disabled={act.isPending || !customerMessage.trim()} onClick={() => act.mutate("REJECT")}>Reddet</Button>}
          {row.status !== "REJECTED" && row.status !== "REFUNDED" && row.status !== "CANCELLED" && <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate("CANCEL")}>İptal et</Button>}
          <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate("NOTE")}>Notu / yanıtı kaydet</Button>
        </div>
        {row.status === "APPROVED" && <p className="text-xs font-semibold text-warning">Onaylandı — ödeme iadesi entegrasyonu henüz aktif değil; para iadesi yapılmadı.</p>}

        <div>
          <h3 className="text-sm font-bold">Geçmiş</h3>
          <ul className="mt-2 grid gap-1 text-xs">
            {(events.data ?? []).map((e: any) => (
              <li key={e.id} className="rounded border border-border p-2">
                <strong>{e.event}</strong> · {e.actor_type} · {date(e.created_at)}{e.from_status || e.to_status ? ` · ${e.from_status ?? "—"} → ${e.to_status ?? "—"}` : ""}
                {e.note && <span className="block text-muted-foreground">{e.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminDrawer>
  );
}
