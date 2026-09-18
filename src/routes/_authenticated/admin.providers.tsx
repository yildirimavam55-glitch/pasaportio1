import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plane, RadioTower } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getAdminProviders, setProviderActive } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => adminHead("Provider Hub", "eSIM ve Lounge provider yönetimi."),
  component: Providers,
});

function Providers() {
  const [tab, setTab] = useState<"ESIM" | "LOUNGE">("ESIM");
  const [openId, setOpenId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["admin-providers"], queryFn: () => getAdminProviders() });
  const toggle = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setProviderActive({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-providers"] }),
  });

  const rows = (providers.data ?? []).filter((provider: any) => provider.service_type === tab);
  const selected = (providers.data ?? []).find((provider: any) => provider.id === openId) ?? null;

  return (
    <AdminGate title="Provider Hub">
      <div className="grid gap-4">
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "ESIM" ? "secondary" : "outline"} onClick={() => setTab("ESIM")}><RadioTower />eSIM</Button>
          <Button size="sm" variant={tab === "LOUNGE" ? "secondary" : "outline"} onClick={() => setTab("LOUNGE")}><Plane />Lounge</Button>
        </div>
        {providers.isPending ? <AdminLoading /> : providers.error ? <AdminError error={providers.error} /> : (
          <AdminPanel title={tab === "ESIM" ? "eSIM Provider’ları" : "Lounge Provider’ları"}>
            {!rows.length ? <EmptyState title={`Henüz ${tab === "ESIM" ? "eSIM" : "Lounge"} provider bağlanmadı.`} /> : (
              <div className="grid gap-3 xl:grid-cols-2">
                {rows.map((provider: any) => (
                  <article key={provider.id} className={`rounded-md border p-3 ${tab === "ESIM" ? "border-success/30 bg-primary-soft/30" : "border-warning/35 bg-sand-soft/45"}`}>
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 place-items-center rounded-md bg-card">{tab === "ESIM" ? <RadioTower className="size-4 text-success" /> : <Plane className="size-4 text-warning" />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><strong>{provider.name}</strong><StatusBadge value={provider.active ? (provider.connection?.status ?? "NOT_CONFIGURED") : "PAUSED"} /></div>
                        <p className="mt-1 text-xs text-muted-foreground">{provider.catalogueItems} katalog ürünü · {provider.availableMappings}/{provider.mappings} eşleşme uygun · Öncelik {provider.priority}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Son senkron: {provider.lastSync?.started_at ? new Date(provider.lastSync.started_at).toLocaleString("tr-TR") : "Yok"} · Son başarılı: {provider.lastSuccessfulSync?.started_at ? new Date(provider.lastSuccessfulSync.started_at).toLocaleString("tr-TR") : "Yok"}</p>
                        <div className="mt-2 flex flex-wrap gap-1">{(provider.capabilities ?? []).map((capability: string) => <span key={capability} className="rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold">{capability}</span>)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tab === "ESIM"
                        ? <Button asChild size="sm"><Link to="/admin/esim/provider-import">Şimdi senkronla</Link></Button>
                        : <Button size="sm" disabled title="Lounge katalog senkronu henüz bağlanmadı.">Şimdi senkronla</Button>}
                      <Button size="sm" variant="outline" onClick={() => setOpenId(provider.id)}>Geçmiş ve hatalar</Button>
                      <Button size="sm" variant={provider.active ? "outline" : "secondary"} disabled={toggle.isPending} onClick={() => toggle.mutate({ id: provider.id, active: !provider.active })}>{provider.active ? "Duraklat" : "Devam ettir"}</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </AdminPanel>
        )}
        <p className="text-xs text-muted-foreground">Provider kimlik bilgileri sunucuda saklanır ve yönetim panelinde hiçbir zaman gösterilmez.</p>
      </div>

      <AdminDrawer open={Boolean(selected)} title={selected?.name ?? "Provider"} subtitle={selected?.code} onClose={() => setOpenId(null)}>
        {selected && (
          <div className="grid gap-4">
            <section>
              <h3 className="admin-panel-title">Bağlantı</h3>
              <DataRow label="Durum" value={<StatusBadge value={selected.connection?.status ?? "NOT_CONFIGURED"} />} />
              <DataRow label="Ortam" value={selected.connection?.environment ?? "—"} />
              <DataRow label="Senkron planı" value={selected.connection?.sync_cron ?? "Planlanmadı"} />
              <DataRow label="Dakikalık limit" value={selected.connection?.rate_limit_per_minute ?? "—"} />
              <DataRow label="Bakiye" value="Provider bakiye uçları henüz bağlı değil." />
            </section>
            <section>
              <h3 className="admin-panel-title">Senkron geçmişi</h3>
              {!selected.history?.length ? <EmptyState title="Senkron kaydı yok." /> : (
                <div className="grid gap-2">{selected.history.map((run: any) => (
                  <div key={run.id} className="rounded-md border border-border p-3 text-xs">
                    <div className="flex items-center justify-between gap-2"><strong>{new Date(run.started_at).toLocaleString("tr-TR")}</strong><StatusBadge value={run.status} /></div>
                    <p className="mt-1 text-muted-foreground">{run.items_received} alındı · {run.items_created} yeni · {run.items_updated} güncellendi · {run.items_unavailable} kapandı · {run.items_failed} hata</p>
                    {run.error_summary && <p className="mt-1 text-destructive">{run.error_summary}</p>}
                  </div>
                ))}</div>
              )}
            </section>
            <section>
              <h3 className="admin-panel-title">Senkron hataları</h3>
              {!selected.errors?.length ? <EmptyState title="Hata kaydı yok." /> : (
                <div className="grid gap-2">{selected.errors.map((row: any) => (
                  <div key={row.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                    <strong>{row.code ?? "HATA"}</strong>
                    <p className="mt-1">{row.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{row.external_id ?? "—"} · {new Date(row.created_at).toLocaleString("tr-TR")}</p>
                  </div>
                ))}</div>
              )}
            </section>
          </div>
        )}
      </AdminDrawer>
    </AdminGate>
  );
}
