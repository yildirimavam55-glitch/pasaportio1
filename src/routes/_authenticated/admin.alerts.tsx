import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getNotificationCenter, setAlertStatus } from "@/lib/balance-monitor.functions";

export const Route = createFileRoute("/_authenticated/admin/alerts")({
  head: () => adminHead("Bildirim merkezi", "Sağlayıcı bakiyesi ve operasyon uyarıları."),
  component: Alerts,
});

const dt = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("tr-TR") : "—");
const TYPE_LABEL: Record<string, string> = {
  LOW_PROVIDER_BALANCE: "Düşük bakiye",
  CRITICAL_PROVIDER_BALANCE: "Kritik bakiye",
  EMPTY_PROVIDER_BALANCE: "Boş / yetersiz bakiye",
  PROVIDER_BALANCE_DROP: "Ani bakiye düşüşü",
  PROVIDER_BALANCE_UNAVAILABLE: "Bakiye API'si erişilemiyor",
};

function AlertRow({ row, onAction, busy }: { row: any; onAction?: (status: "ACKNOWLEDGED" | "RESOLVED") => void; busy?: boolean }) {
  const c = row.context ?? {};
  return (
    <li className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={row.severity} />
        <StatusBadge value={row.status} />
        <strong className="text-sm">{TYPE_LABEL[row.type] ?? row.type}</strong>
        {row.providerName && <span className="text-xs font-semibold">{row.providerName}</span>}
        {row.type === "REFUND_REQUEST" && row.entity_id ? <Link to="/admin/refunds" search={{ id: row.entity_id }} className="text-xs font-semibold text-primary underline">Talebi aç</Link> : null}
        <span className="ms-auto text-xs text-muted-foreground">Tespit: {dt(c.detectedAt ?? row.created_at)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{row.message}</p>
      {row.isBalance && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-5">
          <div><dt className="text-muted-foreground">Güncel</dt><dd className="font-semibold">{c.currentAmount == null ? "—" : money(c.currentAmount, c.currency)}</dd></div>
          <div><dt className="text-muted-foreground">Önceki</dt><dd>{c.previousAmount == null ? "—" : money(c.previousAmount, c.currency)}</dd></div>
          <div><dt className="text-muted-foreground">Değişim</dt><dd>{c.changeAmount == null ? "—" : `${money(c.changeAmount, c.currency)}${c.changePercent == null ? "" : ` (%${c.changePercent})`}`}</dd></div>
          <div><dt className="text-muted-foreground">Son başarılı kontrol</dt><dd>{dt(c.lastSuccessAt)}</dd></div>
          <div><dt className="text-muted-foreground">Güncellendi</dt><dd>{dt(row.updated_at)}</dd></div>
        </dl>
      )}
      {onAction && (
        <div className="flex flex-wrap gap-2">
          {row.status === "OPEN" && <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("ACKNOWLEDGED")}>Gördüm</Button>}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("RESOLVED")}>Çözüldü</Button>
        </div>
      )}
    </li>
  );
}

function Alerts() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notification-center"], queryFn: () => getNotificationCenter() });
  const action = useMutation({
    mutationFn: (input: { id: string; status: "ACKNOWLEDGED" | "RESOLVED" }) => setAlertStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-center"] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "İşlem yapılamadı."),
  });
  return (
    <AdminGate title="Bildirim merkezi">
      {query.isPending ? <AdminLoading /> : query.error ? <AdminError error={query.error} /> : (
        <div className="grid gap-4">
          <AdminPanel title="Açık uyarılar">
            {!query.data.active.length ? <EmptyState title="Açık uyarı yok." /> : (
              <ul className="grid gap-2">
                {query.data.active.map((row: any) => <AlertRow key={row.id} row={row} busy={action.isPending} onAction={(status) => action.mutate({ id: row.id, status })} />)}
              </ul>
            )}
          </AdminPanel>
          <AdminPanel title="Son çözülenler">
            {!query.data.resolved.length ? <EmptyState title="Henüz çözülen uyarı yok." /> : (
              <ul className="grid gap-2">{query.data.resolved.map((row: any) => <AlertRow key={row.id} row={row} />)}</ul>
            )}
          </AdminPanel>
        </div>
      )}
    </AdminGate>
  );
}
