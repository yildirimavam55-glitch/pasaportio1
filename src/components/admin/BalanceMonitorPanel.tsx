import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminError, AdminLoading, AdminPanel, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBalanceMonitor, updateBalanceMonitorSettings } from "@/lib/balance-monitor.functions";
import type { BalanceMonitorSettings } from "@/domain/providers/balance-monitor";

const dt = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("tr-TR") : "Yok");
const FRESHNESS_LABEL: Record<string, string> = { FRESH: "Taze", STALE: "Eski", UNAVAILABLE: "Erişilemiyor", NEVER_CHECKED: "Hiç kontrol edilmedi" };
const CHANNEL_LABEL: Record<string, string> = { EMAIL: "E-posta", TELEGRAM: "Telegram", WHATSAPP: "WhatsApp" };

/** Admin-only supplier balance monitoring. Read-only toward suppliers. */
export function BalanceMonitorPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["balance-monitor"], queryFn: () => getBalanceMonitor() });
  const [editing, setEditing] = useState<{ providerId: string; settings: BalanceMonitorSettings } | null>(null);
  const save = useMutation({
    mutationFn: (input: { providerId: string; settings: BalanceMonitorSettings }) => updateBalanceMonitorSettings({ data: input }),
    onSuccess: () => {
      toast.success("İzleme ayarları kaydedildi.");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["balance-monitor"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Kaydedilemedi."),
  });

  if (query.isPending) return <AdminLoading />;
  if (query.error) return <AdminError error={query.error} />;
  const rows = (query.data?.providers ?? []).filter((row: any) => row.supportsBalance);
  const anyScheduler = rows.some((row: any) => row.schedulerActive);

  return (
    <AdminPanel title="Bakiye izleme">
      <p className={`mb-3 rounded-md border p-2 text-xs ${anyScheduler ? "border-border text-muted-foreground" : "border-destructive/40 bg-destructive/5 font-semibold text-destructive"}`}>
        {anyScheduler
          ? "Otomatik izleme aktif — zamanlanmış kontroller düzenli olarak geliyor."
          : "Otomatik izleme aktif değil — zamanlayıcı kurulmadı. Bakiye şu an yalnızca “Bakiyeyi kontrol et” ile elle okunur."}
      </p>
      {!rows.length ? <EmptyState title="Bakiye sorgusunu destekleyen provider yok." /> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((row: any) => {
            const s: BalanceMonitorSettings = row.settings;
            const unit = s.thresholdCurrency ?? row.latest?.currency ?? "";
            const draft = editing?.providerId === row.providerId ? editing : null;
            return (
              <article key={row.providerId} className="min-w-0 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{row.name}</strong>
                  <StatusBadge value={row.freshness === "FRESH" ? "ACTIVE" : row.freshness} />
                  <span className="text-xs text-muted-foreground">{FRESHNESS_LABEL[row.freshness]}</span>
                  {!s.enabled && <StatusBadge value="PAUSED" />}
                </div>
                <p className="mt-1 text-sm font-semibold">{row.latest ? money(row.latest.amount, row.latest.currency) : "Bakiye bilinmiyor"}</p>
                <p className="text-xs text-muted-foreground">Son başarılı kontrol: {dt(row.latest?.checkedAt)} · Son zamanlanmış çalışma: {dt(row.lastScheduledRunAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Düşük ≤ {s.lowThreshold} {unit} · Kritik ≤ {s.criticalThreshold} {unit} · Ani düşüş ≥ %{s.dropPercent} / {s.dropWindowHours} sa · Erişilemez: {s.unavailableAfterMinutes} dk · Aralık: {s.checkIntervalMinutes} dk
                </p>
                {!row.thresholdsConfirmed && <p className="mt-1 text-xs font-semibold text-destructive">Varsayılan eşikler henüz onaylanmadı — tutarlar sağlayıcının kendi para birimindedir.</p>}
                {row.latest && s.thresholdCurrency && s.thresholdCurrency !== row.latest.currency && (
                  <p className="mt-1 text-xs font-semibold text-destructive">Eşik para birimi ({s.thresholdCurrency}) sağlayıcı bakiyesiyle ({row.latest.currency}) aynı değil — seviye uyarıları devre dışı.</p>
                )}
                {row.recent.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 text-[11px] text-muted-foreground">
                    {row.recent.slice(0, 5).map((snap: any) => (
                      <li key={snap.checkedAt}>{dt(snap.checkedAt)} · {snap.ok ? money(snap.amount, snap.currency) : `Hata (${snap.errorCode})`} · {snap.source === "SCHEDULED" ? "zamanlanmış" : "elle"}</li>
                    ))}
                  </ul>
                )}
                {draft ? (
                  <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(draft); }}>
                    {([
                      ["lowThreshold", "Düşük bakiye eşiği"],
                      ["criticalThreshold", "Kritik bakiye eşiği"],
                      ["dropPercent", "Ani düşüş (%)"],
                      ["dropWindowHours", "Ani düşüş penceresi (saat)"],
                      ["unavailableAfterMinutes", "Erişilemez sayılma (dk)"],
                      ["checkIntervalMinutes", "Kontrol aralığı (dk)"],
                    ] as const).map(([key, label]) => (
                      <Field key={key} label={label}>
                        <Input type="number" value={String(draft.settings[key])} onChange={(event) => setEditing({ ...draft, settings: { ...draft.settings, [key]: Number(event.target.value) } })} />
                      </Field>
                    ))}
                    <Field label="Eşik para birimi" hint="Boş bırakılırsa sağlayıcının bildirdiği para birimi kullanılır.">
                      <Input value={draft.settings.thresholdCurrency ?? ""} maxLength={3} onChange={(event) => setEditing({ ...draft, settings: { ...draft.settings, thresholdCurrency: event.target.value.toUpperCase() || null } })} />
                    </Field>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" checked={draft.settings.enabled} onChange={(event) => setEditing({ ...draft, settings: { ...draft.settings, enabled: event.target.checked } })} /> İzleme açık
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button size="sm" type="submit" disabled={save.isPending}>Kaydet ve onayla</Button>
                      <Button size="sm" type="button" variant="outline" onClick={() => setEditing(null)}>Vazgeç</Button>
                    </div>
                  </form>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing({ providerId: row.providerId, settings: { ...s } })}>Eşikleri düzenle</Button>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-3 rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Ek bildirim kanalları:</strong>{" "}
        {(query.data?.channels ?? []).map((channel: any) => `${CHANNEL_LABEL[channel.channel] ?? channel.channel} (bağlı değil)`).join(" · ")}
        {" — onayınız olmadan hiçbir harici mesaj servisi bağlanmaz."}
      </div>
    </AdminPanel>
  );
}
