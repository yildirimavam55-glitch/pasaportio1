import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdminError, AdminLoading, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/button";
import { DELETION_CONFIRM_TEXT, listDeletionRequests, processDeletionRequest } from "@/lib/account-deletion-admin.functions";

export function DeletionRequestsPanel() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<Record<string, string>>({});
  const list = useQuery({ queryKey: ["admin-deletion-requests"], queryFn: () => listDeletionRequests() });
  const act = useMutation({
    mutationFn: (input: { id: string; status: "IN_REVIEW" | "REJECTED" | "COMPLETED" }) =>
      processDeletionRequest({ data: { ...input, confirm: confirm[input.id] } }),
    onSuccess: () => { toast.success("Talep güncellendi."); void qc.invalidateQueries({ queryKey: ["admin-deletion-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPanel title="Hesap silme talepleri">
      <p className="mb-3 text-xs text-muted-foreground">
        Tamamlanınca kişisel bilgiler anonimleştirilir ve giriş kapatılır. Siparişler, ödemeler, iadeler ve faturalar yasal saklama süresi için korunur.
      </p>
      {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !list.data?.length ? <EmptyState title="Bekleyen silme talebi yok." /> : (
        <div className="grid gap-2">
          {list.data.map((row: any) => (
            <div key={row.id} className="rounded-md border border-border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{row.full_name ?? row.email ?? row.user_id}</strong>
                <StatusBadge value={row.status} />
              </div>
              <p className="mt-1 text-muted-foreground">{new Date(row.requested_at).toLocaleString("tr-TR")}{row.reason ? ` · ${row.reason}` : ""}</p>
              {(row.status === "REQUESTED" || row.status === "IN_REVIEW") && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {row.status === "REQUESTED" && <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ id: row.id, status: "IN_REVIEW" })}>İncelemeye al</Button>}
                  {row.status === "IN_REVIEW" && (
                    <>
                      <input className="admin-field" placeholder={DELETION_CONFIRM_TEXT} value={confirm[row.id] ?? ""} onChange={(e) => setConfirm({ ...confirm, [row.id]: e.target.value })} />
                      <Button size="sm" variant="destructive" disabled={act.isPending || confirm[row.id] !== DELETION_CONFIRM_TEXT} onClick={() => act.mutate({ id: row.id, status: "COMPLETED" })}>Anonimleştir ve kapat</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate({ id: row.id, status: "REJECTED" })}>Reddet</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
