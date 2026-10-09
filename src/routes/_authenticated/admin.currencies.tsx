import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getCurrencyAdmin, refreshCurrencyRates, updateCurrencyConfig } from "@/lib/currency.functions";
import { CURRENCY_SYMBOL, type CurrencyCode } from "@/domain/currency/currencies";

export const Route = createFileRoute("/_authenticated/admin/currencies")({
  head: () => adminHead("Para birimleri", "Görüntüleme para birimleri, kurlar ve ödeme desteği."),
  component: Currencies,
});

function Currencies() {
  const qc = useQueryClient();
  const load = useServerFn(getCurrencyAdmin);
  const update = useServerFn(updateCurrencyConfig);
  const refresh = useServerFn(refreshCurrencyRates);
  const q = useQuery({ queryKey: ["admin-currency"], queryFn: () => load() });
  const set = (data: unknown) => qc.setQueryData(["admin-currency"], data);
  const patch = useMutation({ mutationFn: (v: { code: CurrencyCode; patch: Record<string, boolean> }) => update({ data: v }), onSuccess: set, onError: (e) => toast.error(String(e)) });
  const rf = useMutation({ mutationFn: () => refresh(), onSuccess: (d) => { set(d); toast.success("Kurlar yenilendi"); }, onError: (e) => toast.error(String(e)) });
  if (q.isPending) return <AdminGate title="Para birimleri"><AdminLoading /></AdminGate>;
  if (q.error) return <AdminGate title="Para birimleri"><AdminError error={q.error} /></AdminGate>;
  const d = q.data!;
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("tr-TR") : "—");
  return (
    <AdminGate title="Para birimleri">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm">
          <div>
            <p>Kur durumu: <strong>{d.status}</strong> · Son yenileme: {fmt(d.lastRefreshAt)} · Sonraki: {fmt(d.nextUpdateAt)}</p>
            <p className="text-muted-foreground">Kaynak: ECB (frankfurter). AED/SAR/QAR resmi USD sabit kuru ile türetilir. Fiyat kaynağı: EUR. Ödeme sağlayıcısı bağlı olmadığından yalnız EUR tahsilat para birimidir.</p>
            {d.lastError && <p className="text-destructive">Hata: {d.lastError}</p>}
          </div>
          <Button onClick={() => rf.mutate()} disabled={rf.isPending}>Kurları yenile</Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-xs"><tr><th className="p-2">Para birimi</th><th className="p-2">Etkin</th><th className="p-2">Kur (1 EUR)</th><th className="p-2">Kaynak</th><th className="p-2">Son güncelleme</th><th className="p-2">Tahsilat</th></tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="p-2 font-semibold">{CURRENCY_SYMBOL[r.code]} {r.code}</td>
                  <td className="p-2"><Switch checked={r.enabled && r.display} disabled={r.code === "EUR" || patch.isPending} onCheckedChange={(v) => patch.mutate({ code: r.code, patch: { enabled: v, display: v } })} aria-label={`${r.code} etkin`} /></td>
                  <td className="p-2">{r.rate ?? <span className="text-destructive">Kur yok — gösterilmez</span>}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.rateSource ?? "—"}</td>
                  <td className="p-2 text-xs">{fmt(r.lastUpdated)}</td>
                  <td className="p-2 text-xs">{r.code === "EUR" ? "Fiyat para birimi" : "Doğrulanmadı (sağlayıcı yok)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}
