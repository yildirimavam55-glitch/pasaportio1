import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel } from "@/components/admin/AdminUi";
import { getSecurityStatus, type ControlState } from "@/lib/security-status.functions";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({ meta: [{ title: "Güvenlik durumu · Travely Admin" }, { name: "robots", content: "noindex" }] }),
  component: SecurityPage,
});

const tone: Record<ControlState, string> = {
  ACTIVE: "bg-primary/10 text-primary",
  FAIL: "bg-destructive/10 text-destructive",
  DISABLED: "bg-secondary text-muted-foreground",
  ENABLED: "bg-accent text-accent-foreground",
};

function SecurityPage() {
  const { data, isPending, error } = useQuery({ queryKey: ["security-status"], queryFn: () => getSecurityStatus() });
  return (
    <AdminGate title="Güvenlik durumu">
      {isPending ? <AdminLoading /> : error ? <AdminError error={error} /> : data ? (
        <AdminPanel title="Güvenlik temel kuralları (salt okunur)">
          <p className="mb-4 text-sm text-muted-foreground">
            Durumlar veritabanı ve sunucu kontrollerinden okunur. Bu korumalar Admin panelinden kapatılamaz; değişiklik yalnızca sahip onaylı geliştirme ile yapılır.
          </p>
          <ul className="divide-y divide-border">
            {data.controls.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{c.label}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone[c.state]}`}>{c.state}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Son kontrol: {new Date(data.checkedAt).toLocaleString("tr-TR")}</p>
        </AdminPanel>
      ) : null}
    </AdminGate>
  );
}
