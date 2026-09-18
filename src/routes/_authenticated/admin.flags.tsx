import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { FLAG_DEFINITIONS, listFeatureFlags, setFeatureFlag } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/flags")({
  head: () => adminHead("Özellik bayrakları", "Servis ve satın alma akışlarının kontrolü."),
  component: Flags,
});

function Flags() {
  const queryClient = useQueryClient();
  const flags = useQuery({ queryKey: ["feature-flags"], queryFn: () => listFeatureFlags() });
  const [confirm, setConfirm] = useState<{ key: string; enabled: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: (input: { key: string; enabled: boolean }) => setFeatureFlag({ data: input }),
    onSuccess: async () => { setConfirm(null); setError(null); await queryClient.invalidateQueries({ queryKey: ["feature-flags"] }); },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Değiştirilemedi."),
  });

  return (
    <AdminGate title="Özellik bayrakları">
      <div className="grid gap-4">
        {flags.isPending ? <AdminLoading /> : flags.error ? <AdminError error={flags.error} /> : (
          <AdminPanel title="Servis ve akış kontrolleri">
            {!flags.data?.length ? <EmptyState title="Bayrak kaydı yok." /> : (
              <div className="grid gap-2">
                {FLAG_DEFINITIONS.map((definition) => {
                  const row = (flags.data ?? []).find((flag: any) => flag.key === definition.key);
                  if (!row) return null;
                  const pending = confirm?.key === definition.key;
                  return (
                    <div key={definition.key} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm">{definition.label}</strong>
                        <StatusBadge value={row.enabled ? "ACTIVE" : "PAUSED"} />
                        {definition.critical && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold">Kritik</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{definition.detail}</p>
                      {pending ? (
                        <div className="mt-3 rounded-md border border-warning/40 bg-sand-soft/50 p-3 text-xs">
                          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />{row.enabled ? "Bu özelliği kapatmak müşteri akışını durdurur." : "Bu özelliği açmak müşteri akışını canlıya alır."} Onaylıyor musunuz?</p>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={() => update.mutate({ key: definition.key, enabled: !row.enabled })} disabled={update.isPending}>Onayla</Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => (definition.critical ? setConfirm({ key: definition.key, enabled: !row.enabled }) : update.mutate({ key: definition.key, enabled: !row.enabled }))}>{row.enabled ? "Kapat" : "Aç"}</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>}
          </AdminPanel>
        )}
        <p className="text-xs text-muted-foreground">Araç kiralama ve transfer servisleri kapalıdır ve bu ekrandan açılamaz.</p>
      </div>
    </AdminGate>
  );
}
