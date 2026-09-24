import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, Plus } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, DataRow, EmptyState, Field, StatusBadge, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { archivePricingRule, listPricingRules, previewPricingRuleImpact, savePricingRule } from "@/lib/admin-catalog.functions";
import { itemMargin } from "@/domain/finance/formulas";
import { explainPrice, pricingFromRule, validateRuleInput } from "@/domain/pricing-rule";

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
  currency: string;
  providerId: string | null;
  original: { markupPercent: string; roundingMode: string } | null;
  active: boolean;
  priority: number;
};

const emptyDraft = (): Draft => ({ id: null, name: "", serviceType: "ESIM", strategy: "MARKUP_PERCENT", markupPercent: "35", fixedMarkup: "", minimumMarginPercent: "", roundingMode: "NEAREST_99", currency: "EUR", providerId: null, original: null, active: true, priority: 100 });

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
        currency: draft!.currency,
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
  const num = (value: string | undefined) => (value == null || value.trim() === "" ? null : Number(value.replace(",", ".")));
  const ruleInput = draft ? {
    strategy: draft.strategy,
    markupPercent: num(draft.markupPercent),
    fixedMarkup: num(draft.fixedMarkup),
    minimumMarginPercent: num(draft.minimumMarginPercent),
    currency: draft.currency,
  } : null;
  const validation = ruleInput ? validateRuleInput(ruleInput) : null;
  // Same rule→pricing conversion and engine as the catalogue sync.
  const pricing = draft && !validation ? pricingFromRule({
    strategy: draft.strategy, markup_percent: ruleInput!.markupPercent, fixed_markup: ruleInput!.fixedMarkup,
    minimum_margin_percent: ruleInput!.minimumMarginPercent, rounding_mode: draft.roundingMode, currency: draft.currency,
  }, "EUR", null) : null;
  const explained = pricing ? explainPrice(cost, pricing) : null;
  const minimum = ruleInput?.minimumMarginPercent ?? null;

  // Debounced, read-only impact preview on real products.
  const [impactKey, setImpactKey] = useState<string | null>(null);
  useEffect(() => {
    if (!draft || validation) { setImpactKey(null); return; }
    const key = JSON.stringify({ s: draft.serviceType, p: draft.providerId, st: draft.strategy, m: ruleInput!.markupPercent, f: ruleInput!.fixedMarkup, n: ruleInput!.minimumMarginPercent, r: draft.roundingMode, c: draft.currency });
    const timer = setTimeout(() => setImpactKey(key), 350);
    return () => clearTimeout(timer);
  }, [draft, validation]);
  const impact = useQuery({
    queryKey: ["pricing-impact", impactKey],
    enabled: Boolean(impactKey),
    queryFn: () => {
      const k = JSON.parse(impactKey!);
      return previewPricingRuleImpact({ data: { serviceType: k.s || null, providerId: k.p, strategy: k.st, markupPercent: k.m, fixedMarkup: k.f, minimumMarginPercent: k.n, roundingMode: k.r, currency: k.c } });
    },
    placeholderData: (previous) => previous,
  });
  const markupChanged = Boolean(draft?.original && draft.original.markupPercent !== draft.markupPercent);
  const confirmSave = () => {
    if (validation) return;
    const count = impact.data?.affected ?? 0;
    const message = draft?.active && draft.strategy !== "MANUAL"
      ? `Kural kaydedilecek. Bu kural kapsamındaki yaklaşık ${count} ürünün mağaza fiyatı, bir sonraki katalog senkronunda yeniden hesaplanır. Manuel fiyatlı ürünler değişmez. Devam edilsin mi?`
      : "Kural kaydedilsin mi?";
    if (confirm(message)) save.mutate();
  };

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
                    currency: row.currency ?? "EUR",
                    providerId: row.provider_id ?? null,
                    original: { markupPercent: row.markup_percent == null ? "" : String(row.markup_percent), roundingMode: row.rounding_mode ?? "NONE" },
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
            {draft.strategy === "MARKUP_PERCENT" && <Field label="Kâr oranı (%)" hint="35 yazın = %35 kâr. Ondalık kullanılabilir (örn. 32.5)."><input type="number" inputMode="decimal" step="0.1" min="0" max="500" placeholder="35" className="admin-field mt-1 w-full" value={draft.markupPercent} onChange={(event) => setDraft({ ...draft, markupPercent: event.target.value })} /></Field>}
            {draft.strategy === "FIXED_MARKUP" && <Field label="Sabit kâr"><input type="number" step="0.01" className="admin-field mt-1 w-full" value={draft.fixedMarkup} onChange={(event) => setDraft({ ...draft, fixedMarkup: event.target.value })} /></Field>}
            <Field label="Minimum marj (%)"><input type="number" step="0.1" className="admin-field mt-1 w-full" value={draft.minimumMarginPercent} onChange={(event) => setDraft({ ...draft, minimumMarginPercent: event.target.value })} /></Field>
            <Field label="Yuvarlama">
              <select className="admin-field mt-1 w-full" value={draft.roundingMode} onChange={(event) => setDraft({ ...draft, roundingMode: event.target.value })}>
                <option value="NEAREST_99">… ,99 ile bitir</option>
                <option value="NEAREST_95">… ,95 ile bitir</option>
                <option value="TWO_DECIMALS">2 ondalık</option>
                <option value="INTEGER">Tam sayıya yukarı</option>
                <option value="NONE">Yuvarlama yok</option>
              </select>
            </Field>
            <Field label="Öncelik"><input type="number" className="admin-field mt-1 w-full" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Aktif</label>

            <Field label="Para birimi">
              <select className="admin-field mt-1 w-full" value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })}>
                {["EUR", "USD", "GBP", "TRY"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            {validation && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs font-semibold text-destructive">{validation}</p>}

            <section className="rounded-md border border-border p-3" aria-live="polite">
              <h3 className="admin-panel-title">Fiyat hesaplama önizlemesi</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">Katalog senkronunun kullandığı hesaplamanın aynısıdır. Kaydetmeden hiçbir ürün değişmez.</p>
              <Field label="Örnek tedarikçi maliyeti"><input type="number" inputMode="decimal" step="0.01" min="0" className="admin-field mt-1 w-full" value={sampleCost} onChange={(event) => setSampleCost(event.target.value)} /></Field>
              {explained ? (
                <div className="mt-2">
                  <DataRow label="Tedarikçi maliyeti" value={money(cost, draft.currency)} />
                  <DataRow label="Kâr" value={draft.strategy === "MARKUP_PERCENT" ? `%${ruleInput!.markupPercent}` : draft.strategy === "FIXED_MARKUP" ? `+${money(ruleInput!.fixedMarkup, draft.currency)}` : "—"} />
                  <DataRow label="Yuvarlama öncesi" value={money(explained.rawPrice, draft.currency)} />
                  <DataRow label="Yuvarlama" value={ROUNDING_LABELS[draft.roundingMode] ?? draft.roundingMode} />
                  <DataRow label="Satış fiyatı" value={<strong className="text-sm">{money(explained.salePrice, draft.currency)}</strong>} />
                  <DataRow label="Brüt marj" value={`${money(explained.marginAbsolute, draft.currency)} · %${explained.marginPercent.toFixed(1)}`} />
                  {minimum != null && explained.marginPercent < minimum && <p className="mt-2 text-xs font-semibold text-destructive">Bu ayar minimum marjın altında kalıyor.</p>}
                </div>
              ) : draft.strategy === "MANUAL" ? <p className="mt-2 text-xs text-muted-foreground">Elle fiyatlamada fiyat her ürüne ayrı girilir; kural fiyat hesaplamaz.</p> : null}
            </section>

            {draft.strategy !== "MANUAL" && !validation && (
              <section className="rounded-md border border-border p-3">
                <h3 className="admin-panel-title">Etki önizlemesi (gerçek ürünler)</h3>
                {markupChanged && <p className="mt-1 text-xs font-semibold">Mevcut kâr %{draft.original!.markupPercent || "—"} → yeni kâr %{draft.markupPercent}</p>}
                {impact.isPending && impactKey ? <AdminLoading label="Hesaplanıyor…" /> : impact.data?.error ? <p className="mt-2 text-xs text-destructive">{impact.data.error}</p> : impact.data ? (
                  <>
                    <p className="mt-1 text-xs">Etkilenecek ürün: <strong>{impact.data.affected}</strong> · manuel fiyatlı (değişmez): {impact.data.overridden}</p>
                    <div className="mt-2 grid gap-1">
                      {impact.data.samples.map((row: any) => (
                        <div key={row.id} className="flex items-center justify-between gap-2 border-b border-border py-1 text-[11px] last:border-0">
                          <span className="min-w-0 truncate">{row.name}<span className="ml-1 text-muted-foreground">(maliyet {money(row.providerCost, row.currency)})</span></span>
                          <span className={`shrink-0 font-semibold ${row.currentPrice != null && row.newPrice !== row.currentPrice ? "text-primary" : ""}`}>{row.currentPrice == null ? "—" : money(row.currentPrice, row.currency)} → {money(row.newPrice, row.currency)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">Yalnızca önizleme. Fiyatlar, kural kaydedildikten sonra bir sonraki katalog senkronunda uygulanır.</p>
                  </>
                ) : null}
              </section>
            )}

            <div className="flex gap-2">
              <Button onClick={confirmSave} disabled={save.isPending || Boolean(validation)}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
              <Button variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminGate>
  );
}
