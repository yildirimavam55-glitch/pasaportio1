import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plane, Plus, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADAPTER_LABELS, ADAPTER_TYPES } from "@/providers/adapters/types";
import { AUTH_LABELS, AUTH_TYPES, ENDPOINT_FIELDS, ENDPOINT_LABELS, FIELD_MAP_LABELS, MAPPABLE_FIELDS } from "@/domain/providers/field-mapping";
import { SYNC_INTERVALS } from "@/domain/providers/sync-engine";
import {
  getProviderChanges,
  getProviderHub,
  getProviderPriceHistory,
  getProviderSyncErrors,
  cancelProviderSync,
  refreshProviderBalance,
  saveProvider,
  syncProviderNow,
  testProviderConnection,
} from "@/lib/provider-hub.functions";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => adminHead("Provider Hub", "Çoklu provider bağlantıları, katalog senkronizasyonu ve değişiklik takibi."),
  component: Providers,
});

const emptyDraft = {
  id: null as string | null,
  code: "",
  name: "",
  serviceType: "ESIM" as "ESIM" | "LOUNGE",
  adapterType: "GENERIC_REST" as (typeof ADAPTER_TYPES)[number],
  active: true,
  priority: 1,
  currency: "EUR",
  minimumMarginPercent: "" as string | number,
  autoSync: true,
  syncIntervalHours: 24,
  lowBalanceThreshold: "" as string | number,
  maxCatalogueDropPercent: 20 as string | number,
  baseUrl: "",
  credentialSecretName: "",
  environment: "production" as "production" | "sandbox",
  config: {
    authType: "API_KEY_HEADER" as (typeof AUTH_TYPES)[number],
    endpoints: {} as Record<string, string>,
    fieldMap: {} as Record<string, string>,
    pageSize: 100,
    maxPages: 60,
  },
};

const dt = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("tr-TR") : "Yok");

function Providers() {
  const [tab, setTab] = useState<"ESIM" | "LOUNGE">("ESIM");
  const [draft, setDraft] = useState<typeof emptyDraft | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"runs" | "changes" | "errors" | "prices">("runs");
  const queryClient = useQueryClient();

  const hub = useQuery({
    queryKey: ["provider-hub"],
    queryFn: () => getProviderHub(),
    // Progress keeps updating without the admin keeping this page open.
    refetchInterval: (query) =>
      ((query.state.data as any[]) ?? []).some((provider: any) => provider.activeRun) ? 10_000 : false,
  });
  const rows = (hub.data ?? []).filter((provider: any) => provider.serviceType === tab);
  const selected = (hub.data ?? []).find((provider: any) => provider.id === detailId) ?? null;

  const changes = useQuery({
    queryKey: ["provider-changes", detailId],
    queryFn: () => getProviderChanges({ data: { providerId: detailId! } }),
    enabled: Boolean(detailId) && detailTab === "changes",
  });
  const errors = useQuery({
    queryKey: ["provider-errors", detailId],
    queryFn: () => getProviderSyncErrors({ data: { providerId: detailId! } }),
    enabled: Boolean(detailId) && detailTab === "errors",
  });
  const prices = useQuery({
    queryKey: ["provider-prices", detailId],
    queryFn: () => getProviderPriceHistory({ data: { providerId: detailId! } }),
    enabled: Boolean(detailId) && detailTab === "prices",
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["provider-hub"] });

  const save = useMutation({
    mutationFn: (input: any) => saveProvider({ data: input }),
    onSuccess: () => {
      toast.success("Provider kaydedildi.");
      setDraft(null);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "Kaydedilemedi."),
  });
  const test = useMutation({
    mutationFn: (providerId: string) => testProviderConnection({ data: { providerId } }),
    onSuccess: (result: any) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "Bağlantı denenemedi."),
  });
  const sync = useMutation({
    mutationFn: (providerId: string) => syncProviderNow({ data: { providerId } }),
    onSuccess: (result: any) => {
      if (result.status === "FAILED") {
        toast.error(
          result.error === "CREDENTIAL_REQUIRED"
            ? "API anahtarı sunucuda tanımlı değil; hiçbir ürün kapatılmadı."
            : `Senkron başarısız: ${result.error ?? "bilinmeyen hata"} — ürünler değiştirilmedi.`,
        );
      } else if (result.status === "PARTIAL") {
        toast.message(
          `Senkron devam ediyor: ${result.created} yeni · ${result.updated} güncellendi. Kaldığı yerden otomatik sürecek.`,
        );
      } else {
        toast.success(`${result.created} yeni · ${result.updated} güncellendi · ${result.unavailable} kapandı`);
      }
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "Senkron çalıştırılamadı."),
  });
  /** Safe read-only balance check: never places an order. */
  const checkBalance = useMutation({
    mutationFn: (providerId: string) => refreshProviderBalance({ data: { providerId } }),
    onSuccess: (result: any) => {
      if (result.error) toast.error(result.error);
      else toast.success(`Bakiye: ${result.amount} ${result.currency}`);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "Bakiye okunamadı."),
  });
  const cancelSync = useMutation({
    mutationFn: (providerId: string) => cancelProviderSync({ data: { providerId } }),
    onSuccess: (result: any) => {
      toast.success(result.cancelled ? "Senkron durduruldu; içe aktarılan katalog korundu." : "Devam eden senkron yok.");
      invalidate();
    },
    onError: (error: any) => toast.error(error?.message ?? "Senkron durdurulamadı."),
  });

  const openNew = () => setDraft({ ...emptyDraft, serviceType: tab });
  const openEdit = (provider: any) =>
    setDraft({
      id: provider.id,
      code: provider.code,
      name: provider.name,
      serviceType: provider.serviceType,
      adapterType: provider.adapterType,
      active: provider.active,
      priority: provider.priority,
      currency: provider.currency ?? "EUR",
      minimumMarginPercent: provider.minimumMarginPercent ?? "",
      autoSync: provider.autoSync,
      syncIntervalHours: provider.syncIntervalHours,
      lowBalanceThreshold: provider.lowBalanceThreshold ?? "",
      maxCatalogueDropPercent: provider.maxCatalogueDropPercent ?? 20,
      baseUrl: provider.connection?.baseUrl ?? "",
      credentialSecretName: provider.credentialSecretName ?? "",
      environment: provider.connection?.environment ?? "production",
      config: {
        authType: provider.connection?.config?.authType ?? "API_KEY_HEADER",
        endpoints: provider.connection?.config?.endpoints ?? {},
        fieldMap: provider.connection?.config?.fieldMap ?? {},
        pageSize: provider.connection?.config?.pageSize ?? 100,
        maxPages: provider.connection?.config?.maxPages ?? 60,
      },
    });

  return (
    <AdminGate title="Provider Hub">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tab === "ESIM" ? "secondary" : "outline"} onClick={() => setTab("ESIM")}><RadioTower />eSIM</Button>
          <Button size="sm" variant={tab === "LOUNGE" ? "secondary" : "outline"} onClick={() => setTab("LOUNGE")}><Plane />Lounge</Button>
          <Button size="sm" className="ml-auto" onClick={openNew}><Plus />Provider ekle</Button>
        </div>

        {hub.isPending ? <AdminLoading /> : hub.error ? <AdminError error={hub.error} /> : (
          <AdminPanel title={tab === "ESIM" ? "eSIM provider’ları" : "Lounge provider’ları"}>
            {!rows.length ? <EmptyState title="Henüz provider bağlanmadı." detail="“Provider ekle” ile yerleşik, genel REST veya özel adaptör tanımlayabilirsin." /> : (
              <div className="grid gap-3 xl:grid-cols-2">
                {rows.map((provider: any) => (
                  <article key={provider.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{provider.name}</strong>
                      <StatusBadge value={provider.active ? (provider.connection?.status ?? "NOT_CONFIGURED") : "PAUSED"} />
                      {provider.stale && <StatusBadge value="CATALOGUE_STALE" />}
                      <span className="text-xs text-muted-foreground">Öncelik {provider.priority}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{ADAPTER_LABELS[provider.adapterType as keyof typeof ADAPTER_LABELS] ?? provider.adapterType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {provider.availableProductCount}/{provider.productCount} ürün uygun · Otomatik senkron {provider.autoSync ? `açık (${provider.syncIntervalHours} sa)` : "kapalı"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Son başarılı: {dt(provider.connection?.lastSuccessAt)} · Son deneme: {dt(provider.connection?.lastAttemptAt)} · Sıradaki: {dt(provider.connection?.nextSyncAt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bakiye: {provider.balance ? `${money(provider.balance.amount, provider.balance.currency)} (${provider.balance.health === "LOW" ? "Düşük" : provider.lowBalanceThreshold == null ? "Eşik tanımsız" : "Sağlıklı"})` : "Bilinmiyor"}
                      {provider.balance?.checkedAt ? ` · Son kontrol: ${dt(provider.balance.checkedAt)}` : ""}
                      {` · Düşük bakiye eşiği: ${provider.lowBalanceThreshold == null ? "tanımlı değil" : money(Number(provider.lowBalanceThreshold), provider.currency)}`}
                      {` · Kabul edilen katalog küçülme sınırı: %${provider.maxCatalogueDropPercent ?? 20}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Yeni {provider.changeSummary.newProducts} · Fiyat ↑{provider.changeSummary.priceIncreases} ↓{provider.changeSummary.priceDecreases} · Kapanan {provider.changeSummary.removed} · Dönen {provider.changeSummary.returnedProducts} · İnceleme {provider.changeSummary.needsReview}
                    </p>
                    {provider.activeRun && (
                      <p className="mt-1 text-xs text-foreground">
                        Senkron sürüyor · {provider.activeRun.items_processed ?? 0} ürün işlendi · Yeni {provider.activeRun.items_created ?? 0} · Güncel {provider.activeRun.items_updated ?? 0} · Hatalı {provider.activeRun.items_failed ?? 0} · Son kayıt noktası: sayfa {provider.activeRun.checkpoint_page ?? 0} ({dt(provider.activeRun.last_checkpoint_at)})
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" disabled={sync.isPending} onClick={() => sync.mutate(provider.id)}>
                        {provider.activeRun ? "Kaldığı yerden devam et" : "Şimdi senkronla"}
                      </Button>
                      {provider.activeRun && (
                        <Button size="sm" variant="outline" disabled={cancelSync.isPending} onClick={() => cancelSync.mutate(provider.id)}>
                          Senkronu durdur
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={test.isPending} onClick={() => test.mutate(provider.id)}>Bağlantıyı test et</Button>
                      <Button size="sm" variant="outline" disabled={checkBalance.isPending} onClick={() => checkBalance.mutate(provider.id)}>Bakiyeyi kontrol et</Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(provider)}>Ayarlar</Button>
                      <Button size="sm" variant="outline" onClick={() => { setDetailId(provider.id); setDetailTab("runs"); }}>Değişiklikler ve hatalar</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </AdminPanel>
        )}
        <p className="text-xs text-muted-foreground">
          Provider API anahtarları yalnızca sunucu tarafındaki güvenli ayarlarda tutulur; bu ekranda yalnızca anahtarın adı görünür, değeri hiçbir zaman gösterilmez.
          Bu aşamada sadece katalog senkronizasyonu çalışır: gerçek sipariş, eSIM sağlama veya bakiye harcaması yapılmaz.
        </p>
      </div>

      {/* Settings / add provider */}
      <AdminDrawer open={Boolean(draft)} title={draft?.id ? "Provider ayarları" : "Provider ekle"} subtitle={draft?.code} onClose={() => setDraft(null)}>
        {draft && (
          <div className="grid gap-3">
            <Field label="Adaptör türü" hint="Yerleşik, genel REST veya özel adaptör.">
              <select className="admin-input w-full rounded-md border border-border bg-card p-2 text-sm" value={draft.adapterType} onChange={(event) => setDraft({ ...draft, adapterType: event.target.value as any })}>
                {ADAPTER_TYPES.map((type) => <option key={type} value={type}>{ADAPTER_LABELS[type]}</option>)}
              </select>
            </Field>
            <Field label="Kod"><Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="ESIM_GO" /></Field>
            <Field label="Ad"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="eSIM Go" /></Field>
            <Field label="Servis">
              <select className="w-full rounded-md border border-border bg-card p-2 text-sm" value={draft.serviceType} onChange={(event) => setDraft({ ...draft, serviceType: event.target.value as any })}>
                <option value="ESIM">eSIM</option>
                <option value="LOUNGE">Lounge</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Öncelik"><Input type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></Field>
              <Field label="Para birimi"><Input value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum marj (%)"><Input type="number" value={draft.minimumMarginPercent} onChange={(event) => setDraft({ ...draft, minimumMarginPercent: event.target.value })} /></Field>
              <Field label="Düşük bakiye eşiği" hint="Bakiye bu tutarın altına düştüğünde tek bir operasyon uyarısı açılır."><Input type="number" value={draft.lowBalanceThreshold} onChange={(event) => setDraft({ ...draft, lowBalanceThreshold: event.target.value })} /></Field>
              <Field label="Kabul edilen katalog küçülme sınırı (%)" hint="Tedarikçi kataloğu bu orandan fazla küçülürse toplu pasife alma durdurulur."><Input type="number" value={draft.maxCatalogueDropPercent} onChange={(event) => setDraft({ ...draft, maxCatalogueDropPercent: event.target.value })} /></Field>
            </div>
            <Field label="API adresi" hint="https:// ile başlamalı."><Input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.saglayici.com/v1" /></Field>
            <Field label="API anahtarı referansı" hint="Yalnızca ad. Değer sunucudaki güvenli ayarlara girilir.">
              <Input value={draft.credentialSecretName} onChange={(event) => setDraft({ ...draft, credentialSecretName: event.target.value })} placeholder="ESIM_GO_API_KEY" />
            </Field>
            <Field label="Kimlik doğrulama türü">
              <select className="w-full rounded-md border border-border bg-card p-2 text-sm" value={draft.config.authType} onChange={(event) => setDraft({ ...draft, config: { ...draft.config, authType: event.target.value as any } })}>
                {AUTH_TYPES.map((type) => <option key={type} value={type}>{AUTH_LABELS[type]}</option>)}
              </select>
            </Field>

            <div className="flex flex-wrap items-center gap-4 rounded-md border border-border p-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Etkin</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.autoSync} onChange={(event) => setDraft({ ...draft, autoSync: event.target.checked })} />Otomatik senkron</label>
              <div className="flex items-center gap-2 text-sm">
                <Label htmlFor="interval">Aralık</Label>
                <select id="interval" className="rounded-md border border-border bg-card p-1 text-sm" value={draft.syncIntervalHours} onChange={(event) => setDraft({ ...draft, syncIntervalHours: Number(event.target.value) })}>
                  {SYNC_INTERVALS.map((hours) => <option key={hours} value={hours}>{hours} saat</option>)}
                </select>
              </div>
            </div>

            {draft.adapterType !== "NATIVE_ESIM_GO" && (
              <>
                <h3 className="admin-panel-title">Uç noktalar</h3>
                {ENDPOINT_FIELDS.map((field) => (
                  <Field key={field} label={ENDPOINT_LABELS[field]}>
                    <Input
                      value={draft.config.endpoints[field] ?? ""}
                      placeholder="/catalogue"
                      onChange={(event) => setDraft({ ...draft, config: { ...draft.config, endpoints: { ...draft.config.endpoints, [field]: event.target.value } } })}
                    />
                  </Field>
                ))}
                <h3 className="admin-panel-title">Alan eşlemeleri</h3>
                <p className="text-xs text-muted-foreground">Yalnızca alan adı eşlemesi yapılır; kod, betik veya sorgu çalıştırılmaz.</p>
                {MAPPABLE_FIELDS.map((field) => (
                  <Field key={field} label={FIELD_MAP_LABELS[field]}>
                    <Input
                      value={draft.config.fieldMap[field] ?? ""}
                      placeholder={field}
                      onChange={(event) => setDraft({ ...draft, config: { ...draft.config, fieldMap: { ...draft.config.fieldMap, [field]: event.target.value } } })}
                    />
                  </Field>
                ))}
              </>
            )}

            <div className="mt-2 flex gap-2">
              <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>Kaydet</Button>
              <Button variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Runs / changes / errors / price history */}
      <AdminDrawer open={Boolean(selected)} title={selected?.name ?? "Provider"} subtitle={selected?.code} onClose={() => setDetailId(null)}>
        {selected && (
          <div className="grid gap-4">
            <section>
              <h3 className="admin-panel-title">Bağlantı</h3>
              <DataRow label="Durum" value={<StatusBadge value={selected.connection?.status ?? "NOT_CONFIGURED"} />} />
              <DataRow label="Adaptör" value={ADAPTER_LABELS[selected.adapterType as keyof typeof ADAPTER_LABELS] ?? selected.adapterType} />
              <DataRow label="API anahtarı referansı" value={selected.credentialSecretName} />
              <DataRow label="Yetenekler" value={(selected.capabilities ?? []).join(", ") || "—"} />
              <DataRow label="Senkron durumu" value={selected.connection?.syncState ?? "IDLE"} />
              <DataRow label="Sıradaki senkron" value={dt(selected.connection?.nextSyncAt)} />
            </section>

            <div className="flex flex-wrap gap-2">
              {(["runs", "changes", "errors", "prices"] as const).map((key) => (
                <Button key={key} size="sm" variant={detailTab === key ? "secondary" : "outline"} onClick={() => setDetailTab(key)}>
                  {key === "runs" ? "Senkron geçmişi" : key === "changes" ? "Değişiklikler" : key === "errors" ? "Hatalar" : "Fiyat geçmişi"}
                </Button>
              ))}
            </div>

            {detailTab === "runs" && (!selected.runs?.length ? <EmptyState title="Senkron kaydı yok." /> : (
              <div className="grid gap-2">{selected.runs.map((run: any) => (
                <div key={run.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2"><strong>{dt(run.started_at)}</strong><StatusBadge value={run.status} /></div>
                  <p className="mt-1 text-muted-foreground">
                    {run.items_received} alındı · {run.items_created} yeni · {run.items_updated} güncellendi · {run.items_unchanged} değişmedi · {run.items_unavailable} kapandı · {run.items_returned} döndü · {run.price_changes} fiyat · {run.coverage_changes} kapsama · {run.items_failed} hata
                  </p>
                  <p className="mt-1 text-muted-foreground">Tam katalog: {run.complete ? "evet" : "hayır"} · Tetikleyici: {run.trigger}</p>
                  {run.deactivation_blocked && (
                    <p className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 font-semibold text-destructive">
                      ⚠️ Tedarikçi katalog boyutu beklenmedik şekilde değişti · Önceki: {run.previous_item_count ?? "—"} · Alınan: {run.items_received} · Fark: {run.previous_item_count == null ? "—" : `-${run.previous_item_count - run.items_received} / -%${run.drop_percent}`} · Katalog pasifleştirme inceleme bekliyor, mevcut ürünler korundu.
                    </p>
                  )}
                  {run.error_summary && <p className="mt-1 text-destructive">{run.error_summary}</p>}
                </div>
              ))}</div>
            ))}

            {detailTab === "changes" && (changes.isPending ? <AdminLoading /> : !changes.data?.length ? <EmptyState title="Değişiklik kaydı yok." /> : (
              <div className="grid gap-2">{changes.data.map((row: any) => (
                <div key={row.id} className="rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2"><strong>{row.productName}</strong><StatusBadge value={row.change_type} /></div>
                  <p className="mt-1 text-muted-foreground">
                    {row.details?.oldCost != null && `Eski maliyet ${money(row.details.oldCost, row.currency)} → `}
                    {row.details?.newCost != null && `${money(row.details.newCost, row.currency)} `}
                    {row.details?.changePercent != null && `(${row.details.changePercent > 0 ? "+" : ""}${row.details.changePercent}%) · `}
                    Satış {row.salePrice == null ? "—" : money(row.salePrice, row.currency)} · Marj {row.marginPercent == null ? "—" : `${row.marginPercent}%`}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{row.external_id} · {dt(row.created_at)}{row.needs_review ? " · inceleme gerekiyor" : ""}</p>
                </div>
              ))}</div>
            ))}

            {detailTab === "errors" && (errors.isPending ? <AdminLoading /> : !errors.data?.length ? <EmptyState title="Hata kaydı yok." /> : (
              <div className="grid gap-2">{errors.data.map((row: any) => (
                <div key={row.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <strong>{row.code ?? "HATA"}</strong>
                  <p className="mt-1">{row.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{row.external_id ?? "—"} · {dt(row.created_at)}</p>
                </div>
              ))}</div>
            ))}

            {detailTab === "prices" && (prices.isPending ? <AdminLoading /> : !prices.data?.length ? <EmptyState title="Fiyat geçmişi yok." /> : (
              <div className="grid gap-2">{prices.data.map((row: any) => (
                <div key={row.id} className="rounded-md border border-border p-3 text-xs">
                  <strong>{row.external_id}</strong>
                  <p className="mt-1 text-muted-foreground">
                    {row.old_cost == null ? "İlk kayıt" : `${money(Number(row.old_cost), row.currency)} → ${money(Number(row.new_cost), row.currency)}`}
                    {row.change_percent != null && ` (${Number(row.change_percent) > 0 ? "+" : ""}${row.change_percent}%)`}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{dt(row.created_at)}</p>
                </div>
              ))}</div>
            ))}
          </div>
        )}
      </AdminDrawer>
    </AdminGate>
  );
}
