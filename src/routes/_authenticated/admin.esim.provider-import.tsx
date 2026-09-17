import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CloudUpload, EyeOff, LoaderCircle, PlugZap } from "lucide-react";

import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import {
  applyEsimImport,
  createEsimProvider,
  getEsimImportOverview,
  hideTestEsimCatalogue,
  previewEsimImport,
  type ImportPreview,
} from "@/lib/provider-import.functions";

export const Route = createFileRoute("/_authenticated/admin/esim/provider-import")({
  component: ProviderImportPage,
});

const STRATEGIES = [
  { value: "MARKUP_PERCENT", label: "Markup %" },
  { value: "FIXED_MARKUP", label: "Sabit markup" },
  { value: "MINIMUM_MARGIN", label: "Minimum marj" },
  { value: "MANUAL", label: "Manuel (maliyet)" },
] as const;

const ROUNDING = [
  { value: "NEAREST_99", label: ",99" },
  { value: "NEAREST_95", label: ",95" },
  { value: "TWO_DECIMALS", label: "2 hane" },
  { value: "INTEGER", label: "Tam sayı" },
  { value: "NONE", label: "Yuvarlama yok" },
] as const;

const SAMPLE = `[
  {
    "externalId": "TR-10GB-30",
    "name": "Türkiye 10 GB / 30 gün",
    "dataGb": 10,
    "validityDays": 30,
    "coverage": ["TR"],
    "providerCost": 5.10,
    "currency": "EUR",
    "supportsHotspot": true,
    "networks": ["Turkcell", "Vodafone TR"]
  }
]`;

const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm";

function ProviderImportPage() {
  const client = useQueryClient();
  const overview = useQuery({ queryKey: ["esim-import-overview"], queryFn: () => getEsimImportOverview() });

  const [providerId, setProviderId] = useState("");
  const [newProvider, setNewProvider] = useState({ code: "", name: "" });
  const [payloadText, setPayloadText] = useState("");
  const [pricing, setPricing] = useState({
    strategy: "MARKUP_PERCENT" as (typeof STRATEGIES)[number]["value"],
    markupPercent: 60,
    fixedMarkup: 4,
    minimumMarginPercent: 25,
    roundingMode: "NEAREST_99" as (typeof ROUNDING)[number]["value"],
    currency: "EUR",
  });
  const [publish, setPublish] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const providers = overview.data?.providers ?? [];
  const activeProviderId = providerId || providers[0]?.id || "";
  const refresh = () => client.invalidateQueries({ queryKey: ["esim-import-overview"] });
  const payload = () => ({ providerId: activeProviderId, payloadText, pricing, publish, markMissingUnavailable: true });

  const addProvider = useMutation({
    mutationFn: () => createEsimProvider({ data: newProvider }),
    onSuccess: (result) => {
      setProviderId(result.id);
      setNewProvider({ code: "", name: "" });
      setNotice("Provider kaydedildi.");
      setError("");
      void refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const runPreview = useMutation({
    mutationFn: () => previewEsimImport({ data: payload() }),
    onSuccess: (result) => {
      setPreview(result);
      setError("");
      setNotice("Önizleme hazır. Hiçbir kayıt değiştirilmedi.");
    },
    onError: (e: Error) => {
      setPreview(null);
      setError(e.message);
    },
  });

  const runImport = useMutation({
    mutationFn: () => applyEsimImport({ data: payload() }),
    onSuccess: (result) => {
      setError("");
      setNotice(
        `İçe aktarıldı — yeni: ${result.created}, güncellenen: ${result.updated}, değişmeyen: ${result.unchanged}, kullanılamaz: ${result.unavailable}, hatalı: ${result.failed + result.invalid}.`,
      );
      setPreview(null);
      void refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const hideTests = useMutation({
    mutationFn: () => hideTestEsimCatalogue({ data: { serviceType: "ALL" } }),
    onSuccess: () => {
      setNotice("Test paketleri gizlendi. Kayıtlar silinmedi.");
      setError("");
      void refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const counts = overview.data?.counts;

  return (
    <AdminGate title="Gerçek provider verisi">
      <div className="grid gap-4">
        <section className="grid gap-3 rounded-card border border-border bg-card p-5 shadow-card sm:grid-cols-4">
          {[
            { label: "Gerçek eSIM ürünü", value: counts?.real ?? 0 },
            { label: "Yayında", value: counts?.published ?? 0 },
            { label: "Test ürünü", value: counts?.test ?? 0 },
            { label: "Görünür test ürünü", value: counts?.testVisible ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border p-3">
              <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
              <strong className="mt-1 block font-display text-2xl">{overview.isPending ? "—" : item.value}</strong>
            </div>
          ))}
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><EyeOff className="size-4" /> Test paketlerini gizle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            showTestCatalogue kapatılır ve tüm INTERNAL_TEST ürünleri PAUSED durumuna alınır. Hiçbir kayıt silinmez.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Şu anki durum: showTestCatalogue = {overview.data?.showTestCatalogue ? "AÇIK" : "KAPALI"}
          </p>
          <Button className="mt-3" variant="cta" disabled={hideTests.isPending} onClick={() => hideTests.mutate()}>
            Test paketlerini gizle
          </Button>
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><PlugZap className="size-4" /> Provider</h2>
          {providers.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Henüz eSIM provider tanımlanmadı.</p>
          ) : (
            <select className={`${field} mt-3`} value={activeProviderId} onChange={(event) => setProviderId(event.target.value)} aria-label="Provider">
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.code}) · {provider.productCount} ürün
                </option>
              ))}
            </select>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className={field} placeholder="Provider kodu (örn. AIRALO)" value={newProvider.code} onChange={(e) => setNewProvider((s) => ({ ...s, code: e.target.value }))} aria-label="Provider kodu" />
            <input className={field} placeholder="Provider adı" value={newProvider.name} onChange={(e) => setNewProvider((s) => ({ ...s, name: e.target.value }))} aria-label="Provider adı" />
            <Button variant="outline" disabled={addProvider.isPending} onClick={() => addProvider.mutate()}>Provider ekle</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">API anahtarları burada tutulmaz; kimlik bilgileri yalnızca sunucu tarafında saklanır.</p>
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Provider katalog verisi (JSON)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider’ın gerçek katalog çıktısını yapıştırın. Eksik alanı olan kayıtlar içe aktarılmaz — veri uydurulmaz.
          </p>
          <textarea
            className="mt-3 min-h-52 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs"
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            placeholder={SAMPLE}
            aria-label="Provider katalog JSON"
          />

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Strateji
              <select className={field} value={pricing.strategy} onChange={(e) => setPricing((s) => ({ ...s, strategy: e.target.value as typeof s.strategy }))}>
                {STRATEGIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Markup %
              <input type="number" className={field} value={pricing.markupPercent} onChange={(e) => setPricing((s) => ({ ...s, markupPercent: Number(e.target.value) }))} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Min. marj %
              <input type="number" className={field} value={pricing.minimumMarginPercent} onChange={(e) => setPricing((s) => ({ ...s, minimumMarginPercent: Number(e.target.value) }))} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Yuvarlama
              <select className={field} value={pricing.roundingMode} onChange={(e) => setPricing((s) => ({ ...s, roundingMode: e.target.value as typeof s.roundingMode }))}>
                {ROUNDING.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
            İçe aktarılan ürünleri hemen yayınla (kapalıysa DRAFT olarak gelir)
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" disabled={!activeProviderId || !payloadText || runPreview.isPending} onClick={() => runPreview.mutate()}>
              {runPreview.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null} Önizle
            </Button>
            <Button variant="cta" disabled={!preview || runImport.isPending} onClick={() => runImport.mutate()}>
              <CloudUpload className="size-4" /> İçe aktar ve eşleştir
            </Button>
          </div>

          {notice && <p className="mt-3 text-sm font-semibold text-primary">{notice}</p>}
          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="size-4" /> {error}</p>
          )}
        </section>

        {preview && (
          <section className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Önizleme — {preview.providerCode}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Toplam {preview.summary.total} · yeni {preview.summary.created} · güncellenecek {preview.summary.updated} · değişmeyen{" "}
              {preview.summary.unchanged} · geçersiz {preview.summary.invalid} · marj uyarısı {preview.summary.marginFlagged} · kaybolan{" "}
              {preview.missing.length}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Durum", "Provider ID", "Ürün", "Veri", "Gün", "Kapsama", "Maliyet", "Satış", "Marj %"].map((head) => (
                      <th key={head} className="py-2 pr-3 font-semibold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.diff.map((row) => (
                    <tr key={row.externalId} className="border-t border-border">
                      <td className="py-2 pr-3 text-xs font-bold">{row.status}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.externalId}</td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3">{row.unlimited ? "Sınırsız" : `${row.dataGb} GB`}</td>
                      <td className="py-2 pr-3">{row.validityDays}</td>
                      <td className="py-2 pr-3">{row.coverageCount} ülke · {row.packageKind}</td>
                      <td className="py-2 pr-3">{row.providerCost.toFixed(2)} {row.currency}</td>
                      <td className="py-2 pr-3 font-semibold">{row.salePrice.toFixed(2)} {pricing.currency}</td>
                      <td className={`py-2 pr-3 ${row.belowMinimumMargin ? "font-bold text-destructive" : ""}`}>
                        {row.marginPercent.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.issues.length > 0 && (
              <div className="mt-4 rounded-xl border border-destructive/40 p-3">
                <strong className="text-sm">İçe aktarılamayan kayıtlar</strong>
                <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  {preview.issues.slice(0, 20).map((issue, index) => (
                    <li key={`${issue.externalId ?? "row"}-${index}`}>#{issue.index + 1} {issue.externalId ?? ""} — {issue.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.missing.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Bu dışa aktarımda bulunmayan {preview.missing.length} provider ürünü UNAVAILABLE olarak işaretlenecek, silinmeyecek.
              </p>
            )}
          </section>
        )}
      </div>
    </AdminGate>
  );
}
