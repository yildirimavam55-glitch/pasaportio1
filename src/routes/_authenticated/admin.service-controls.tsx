import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Plane, RadioTower } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { listFeatureFlags, setFeatureFlag } from "@/lib/admin-control.functions";

export const Route = createFileRoute("/_authenticated/admin/service-controls")({
  head: () => adminHead("Servis kontrolleri", "Mağaza ve satın alma durumlarının yönetimi."),
  component: ServiceControls,
});

const SERVICES = [
  { key: "esim", label: "eSIM", icon: RadioTower, storefront: "storefront.esim", checkout: "checkout.esim" },
  { key: "lounge", label: "Lounge", icon: Plane, storefront: "storefront.lounge", checkout: "checkout.lounge" },
] as const;

function ServiceControls() {
  const queryClient = useQueryClient();
  const flags = useQuery({ queryKey: ["feature-flags"], queryFn: () => listFeatureFlags() });
  const [pending, setPending] = useState<{ key: string; enabled: boolean; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: { key: string; enabled: boolean }) => setFeatureFlag({ data: input }),
    onSuccess: async () => {
      setPending(null);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      await queryClient.invalidateQueries({ queryKey: ["service-availability"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Değiştirilemedi."),
  });

  const rowOf = (key: string) => (flags.data ?? []).find((flag: any) => flag.key === key);

  return (
    <AdminGate title="Servis kontrolleri">
      <div className="grid gap-4">
        {flags.isPending ? <AdminLoading /> : flags.error ? <AdminError error={flags.error} /> : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {SERVICES.map((service) => {
                const storefront = rowOf(service.storefront);
                const checkout = rowOf(service.checkout);
                const Icon = service.icon;
                return (
                  <AdminPanel key={service.key} title={service.label} action={<Icon className="size-4 text-muted-foreground" />}>
                    <div className="grid gap-3">
                      <ControlRow
                        title="Mağaza"
                        detail="Kapalıyken müşteriye bakım mesajı gösterilir; mevcut satın alımlar erişilebilir kalır."
                        row={storefront}
                        onToggle={() => storefront && setPending({ key: service.storefront, enabled: !storefront.enabled, label: `${service.label} mağazası` })}
                      />
                      <ControlRow
                        title="Yeni satın almalar"
                        detail="Kapalıyken müşteriler gezinebilir, ancak yeni sipariş oluşturulamaz."
                        row={checkout}
                        onToggle={() => checkout && setPending({ key: service.checkout, enabled: !checkout.enabled, label: `${service.label} satın alma` })}
                      />
                    </div>
                  </AdminPanel>
                );
              })}
            </div>

            {pending && (
              <div className="rounded-md border border-warning/50 bg-sand-soft/60 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />{pending.label} {pending.enabled ? "tekrar açılacak" : "duraklatılacak"}. Onaylıyor musunuz?</p>
                <p className="mt-1 text-xs text-muted-foreground">Bu değişiklik müşteri deneyimini anında etkiler ve denetim kaydına yazılır.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => update.mutate({ key: pending.key, enabled: pending.enabled })} disabled={update.isPending}>Onayla</Button>
                  <Button size="sm" variant="outline" onClick={() => setPending(null)}>Vazgeç</Button>
                </div>
                {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
              </div>
            )}

            <AdminPanel title="Bakım mesajları">
              <p className="text-xs text-muted-foreground">Müşteriye gösterilen duraklatma metinleri TR / DE / EN olarak Ayarlar ekranında düzenlenir.</p>
              <Link to="/admin/settings" className="mt-2 inline-flex text-xs font-bold text-primary">Ayarlar → Bakım mesajları</Link>
            </AdminPanel>
          </>
        )}
      </div>
    </AdminGate>
  );
}

function ControlRow({ title, detail, row, onToggle }: { title: string; detail: string; row: any; onToggle: () => void }) {
  if (!row) return <p className="text-xs text-muted-foreground">{title}: kayıt bulunamadı.</p>;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-sm">{title}</strong>
        <StatusBadge value={row.enabled ? "ACTIVE" : "PAUSED"} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Son değişiklik: {row.updated_at ? new Date(row.updated_at).toLocaleString("tr-TR") : "—"}</p>
      <Button size="sm" variant="outline" className="mt-2" onClick={onToggle}>{row.enabled ? "Duraklat" : "Aç"}</Button>
    </div>
  );
}
