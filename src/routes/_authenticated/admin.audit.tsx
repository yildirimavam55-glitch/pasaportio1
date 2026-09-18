import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { listAuditLog } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => adminHead("Denetim kaydı", "Yönetici işlemlerinin kaydı."),
  component: Audit,
});

/** Compact before/after summary — secrets are never written to the audit log. */
function summarize(value: unknown) {
  if (value == null) return "—";
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
  if (!entries.length) return "—";
  return entries.map(([key, entry]) => `${key}: ${typeof entry === "object" ? "…" : String(entry).slice(0, 40)}`).join(" · ");
}

function Audit() {
  const [search, setSearch] = useState("");
  const log = useQuery({ queryKey: ["admin-audit", search], queryFn: () => listAuditLog({ data: { search } }) });
  return (
    <AdminGate title="Denetim kaydı">
      <div className="grid gap-4">
        <AdminPanel title="Ara">
          <Field label="İşlem"><input className="admin-field mt-1 w-full max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="örn. product.update" /></Field>
        </AdminPanel>
        {log.isPending ? <AdminLoading /> : log.error ? <AdminError error={log.error} /> : (
          <AdminPanel title={`${log.data?.length ?? 0} kayıt`}>
            {!log.data?.length ? <EmptyState title="Henüz denetim kaydı yok." detail="Fiyat, yayın, görünürlük, bayrak, provider ve iade işlemleri burada kaydedilir." /> : (
              <div className="admin-table-wrap">
                <AdminTable head={["Tarih", "Yönetici", "İşlem", "Varlık", "Öncesi", "Sonrası"]}>
                  {log.data.map((row: any) => (
                    <tr key={row.id}>
                      <td>{new Date(row.created_at).toLocaleString("tr-TR")}</td>
                      <td>{row.admin?.full_name ?? row.admin?.email ?? "—"}</td>
                      <td className="font-semibold">{row.action}</td>
                      <td>{row.entity_type ?? "—"}</td>
                      <td className="max-w-56 truncate">{summarize(row.before_data)}</td>
                      <td className="max-w-56 truncate">{summarize(row.after_data)}</td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            )}
          </AdminPanel>
        )}
      </div>
    </AdminGate>
  );
}
