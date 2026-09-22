import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, Plus } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { archivePricingRule, listPricingRules, savePricingRule } from "@/lib/admin-catalog.functions";
import { itemMargin } from "@/domain/finance/formulas";

export const Route = createFileRoute("/_authenticated/admin/pricing-rules")({
  head: () => adminHead("Fiyatlandırma kuralları", "Kâr marjı ve fiyat kuralları."),
  component: PricingRules,
});

type Draft = {
  id: string | null;
  name: string;
  serviceType: "" | "ESIM" | "LOUNGE";
  strategy: "MANUAL" | "MARKUP_PERCENT" | "FIXED_MARKUP";
  markupPercent: string;
  fixedMarkup: string;
  minimumMarginPercent: string;
  roundingMode: string;
  active: boolean;
  priority: number;
};

const emptyDraft = (): Draft => ({ id: null, name: "", serviceType: "ESIM", strategy: "MARKUP_PERCENT", markupPercent: "35", fixedMarkup: "", minimumMarginPercent: "", roundingMode: "NEAREST_99", active: true, priority: 100 });

const ROUNDING_LABELS: Record<string, string> = {
  NONE: "Yuvarlama yok",
  TWO_DECIMALS: "2 ondalık",
  INTEGER: "Tam sayıya yukarı",
  NEAREST_99: "… ,99 ile bitir",
  NEAREST_95: "… ,95 ile bitir",
};

function PricingRules() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sampleCost, setSampleCost] = useState("10");
  const list = useQuery({ queryKey: ["pricing-rules"], queryFn: () => listPricingRules() });

  const save = useMutation({
    mutationFn: () => savePricingRule({
      data: {
        id: draft!.id,
        name: draft!.name,
        serviceType: draft!.serviceType || null,
        strategy: draft!.strategy,
        markupPercent: draft!.markupPercent === "" ? null : Number(draft!.markupPercent),
        fixedMarkup: draft!.fixedMarkup === "" ? null : Number(draft!.fixedMarkup),
        minimumMarginPercent: draft!.minimumMarginPercent === "" ? null : Number(draft!.minimumMarginPercent),
        roundingMode: draft!.roundingMode,
        active: draft!.active,
        priority: draft!.priority,
      },
    }),
    onSuccess: async () => { toast.success("Kural kaydedildi."); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["pricing-rules"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => archivePricingRule({ data: { id } }),
    onSuccess: async () => { toast.success("Kural arşivlendi."); await queryClient.invalidateQueries({ queryKey: ["pricing-rules"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = ((list.data as any)?.rules ?? []) as any[];
  const reviewCount = Number((list.data as any)?.pricingReviewRequired ?? 0);
  const cost = Number(sampleCost) || 0;
  const rawPreview = !draft ? 0
    : draft.strategy === "FIXED_MARKUP" ? cost + (Number(draft.fixedMarkup) || 0)
    : draft.strategy === "MARKUP_PERCENT" ? cost * (1 + (Number(draft.markupPercent) || 0) / 100)
    : cost;
  const previewPrice = applyRounding(rawPreview, (draft?.roundingMode ?? "TWO_DECIMALS") as RoundingMode);
  const preview = itemMargin(previewPrice, cost);
  const minimum = draft?.minimumMarginPercent === "" ? null : Number(draft?.minimumMarginPercent);

  return (
    <AdminGate title="Fiyatlandırma kuralları">
      <AdminPanel title="Kurallar" action={<Button size="sm" variant="cta" onClick={() => setDraft(emptyDraft())}><Plus />Kural ekle</Button>}>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !rows.length ? (
          <EmptyState title="Henüz kural yok." detail="Provider maliyeti üzerinden satış fiyatı hesaplayan kurallar burada tanımlanır." />
        ) : (
          <div className="grid gap-1.5">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft({
                    id: row.id,
                    name: row.name,
                    serviceType: row.service_type ?? "",
                    strategy: row.strategy,
                    markupPercent: row.markup_percent == null ? "" : String(row.markup_percent),
                    fixedMarkup: row.fixed_markup == null ? "" : String(row.fixed_markup),
                    minimumMarginPercent: row.minimum_margin_percent == null ? "" : String(row.minimum_margin_percent),
                    roundingMode: row.rounding_mode ?? "NONE",
                    active: row.active,
                    priority: row.priority ?? 0,
                  })}
                >
                  <strong>{row.name}</strong>
                  <span className="ml-2 text-muted-foreground">
                    {row.service_type ?? "Tüm servisler"} · {row.strategy === "MARKUP_PERCENT" ? `%${row.markup_percent ?? "—"} kâr` : row.strategy === "FIXED_MARKUP" ? `+${money(Number(row.fixed_markup ?? 0))}` : row.strategy}
                    {" · "}{ROUNDING_LABELS[row.rounding_mode] ?? row.rounding_mode}
                    {" · "}öncelik {row.priority ?? 0}
                    {" · "}{row.productCount ?? 0} ürün
                  </span>
                </button>
                <StatusBadge value={row.active ? "ACTIVE" : "PAUSED"} />
                <button type="button" className="size-7 rounded hover:bg-secondary" aria-label="Arşivle" onClick={() => { if (confirm("Kural arşivlensin mi?")) archive.mutate(row.id); }}><Archive className="mx-auto size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Öncelik sırası: ürün bazlı manuel fiyat → provider + servis kuralı → provider kuralı → servis kuralı → varsayılan kural. Aynı seviyede en küçük öncelik numarası kazanır.
          Bir üründe elle girilmiş fiyat varsa kural onu sessizce değiştirmez; manuel fiyat her zaman korunur.
        </p>
        {reviewCount > 0 && (
          <p className="mt-2 rounded-md border border-warning/50 bg-sand-soft/60 p-2 text-[11px] font-semibold">
            {reviewCount} ürün fiyat incelemesi bekliyor: geçerli bir kural bulunamadığı için fiyatları değiştirilmedi ve yayınlanmadı.
          </p>
        )}
      </AdminPanel>

      <AdminDrawer open={Boolean(draft)} title={draft?.id ? "Kuralı düzenle" : "Yeni kural"} onClose={() => setDraft(null)}>
        {draft && (
          <div className="grid gap-3">
            <Field label="Kural adı"><input className="admin-field mt-1 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Servis">
              <select className="admin-field mt-1 w-full" value={draft.serviceType} onChange={(event) => setDraft({ ...draft, serviceType: event.target.value as Draft["serviceType"] })}>
                <option value="">Tüm servisler</option>
                <option value="ESIM">eSIM</option>
                <option value="LOUNGE">Lounge</option>
              </select>
            </Field>
            <Field label="Strateji">
              <select className="admin-field mt-1 w-full" value={draft.strategy} onChange={(event) => setDraft({ ...draft, strategy: event.target.value as Draft["strategy"] })}>
                <option value="MANUAL">Elle fiyatlama</option>
                <option value="MARKUP_PERCENT">Yüzde kâr</option>
                <option value="FIXED_MARKUP">Sabit kâr</option>
              </select>
            </Field>
            {draft.strategy === "MARKUP_PERCENT" && <Field label="Kâr oranı (%)"><input type="number" step="0.1" className="admin-field mt-1 w-full" value={draft.markupPercent} onChange={(event) => setDraft({ ...draft, markupPercent: event.target.value })} /></Field>}
            {draft.strategy === "FIXED_MARKUP" && <Field label="Sabit kâr"><input type="number" step="0.01" className="admin-field mt-1 w-full" value={draft.fixedMarkup} onChange={(event) => setDraft({ ...draft, fixedMarkup: event.target.value })} /></Field>}
            <Field label="Minimum marj (%)"><input type="number" step="0.1" className="admin-field mt-1 w-full" value={draft.minimumMarginPercent} onChange={(event) => setDraft({ ...draft, minimumMarginPercent: event.target.value })} /></Field>
            <Field label="Yuvarlama">
              <select className="admin-field mt-1 w-full" value={draft.roundingMode} onChange={(event) => setDraft({ ...draft, roundingMode: event.target.value })}>
                <option value="NONE">Yuvarlama yok</option>
                <option value="NEAREST">En yakın tam sayı</option>
                <option value="UP">Yukarı yuvarla</option>
                <option value="DOWN">Aşağı yuvarla</option>
              </select>
            </Field>
            <Field label="Öncelik"><input type="number" className="admin-field mt-1 w-full" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Aktif</label>

            <section className="rounded-md border border-border p-3">
              <h3 className="admin-panel-title">Önizleme</h3>
              <Field label="Örnek provider maliyeti"><input type="number" step="0.01" className="admin-field mt-1 w-full" value={sampleCost} onChange={(event) => setSampleCost(event.target.value)} /></Field>
              <div className="mt-2">
                <DataRow label="Provider maliyeti" value={money(cost)} />
                <DataRow label="Hesaplanan satış fiyatı" value={money(previewPrice)} />
                <DataRow label="Marj" value={`${money(preview.absolute)}${preview.percent == null ? "" : ` · %${preview.percent.toFixed(1)}`}`} />
                {minimum != null && preview.percent != null && preview.percent < minimum && <p className="mt-2 text-xs font-semibold text-destructive">Bu ayar minimum marjın altında kalıyor.</p>}
              </div>
            </section>

            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
              <Button variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminGate>
  );
}
