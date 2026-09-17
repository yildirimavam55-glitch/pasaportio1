import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import { getEsimUsageSettings, saveEsimUsageSettings } from "@/lib/esim-settings.functions";
import {
  DEFAULT_USAGE_SETTINGS,
  SETTINGS_LIMITS,
  USAGE_KEYS,
  estimateUsageNeed,
  sanitizeUsageSettings,
  type EsimUsageSettings,
} from "@/domain/esim/usage-recommendation";
import type { UsageIntensity, UsageKind } from "@/domain/experience/types";

export const Route = createFileRoute("/_authenticated/admin/smart-finders/esim")({ component: EsimRecommendationSettings });

const USAGE_LABELS: Record<UsageKind, string> = {
  MESSAGING: "Mesajlaşma", SOCIAL: "Sosyal medya", MAPS: "Harita", VIDEO: "Video", WORK: "İş / toplantı", GAMING: "Oyun", HOTSPOT: "Hotspot",
};
const INTENSITY_LABELS: Record<UsageIntensity, string> = { LOW: "Düşük", NORMAL: "Normal", HIGH: "Yoğun" };

function NumberField({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <span className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3">
        <input
          type="number"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(Math.min(max, Math.max(min, next)));
          }}
        />
        {suffix && <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function EsimRecommendationSettings() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["esim-usage-settings"], queryFn: () => getEsimUsageSettings() });
  const [draft, setDraft] = useState<EsimUsageSettings>(DEFAULT_USAGE_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (settings: EsimUsageSettings) => saveEsimUsageSettings({ data: { settings } }),
    onSuccess: (settings) => {
      setDraft(settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["esim-usage-settings"] });
    },
  });

  const effective = sanitizeUsageSettings(draft);
  const preview = estimateUsageNeed({ days: 10, usage: ["MESSAGING", "SOCIAL", "MAPS"] }, effective);

  return (
    <AdminGate title="Smart Finders · eSIM önerisi">
      {isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" /> Ayarlar yükleniyor…</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <section className="rounded-card border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Günlük kullanım ağırlıkları</h2>
              <p className="mt-1 text-sm text-muted-foreground">Kişi başı günlük tahmini veri tüketimi (MB).</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {USAGE_KEYS.map((key) => (
                  <NumberField
                    key={key}
                    label={USAGE_LABELS[key]}
                    value={draft.perDayMb[key]}
                    min={SETTINGS_LIMITS.perDayMb.min}
                    max={SETTINGS_LIMITS.perDayMb.max}
                    suffix="MB/gün"
                    onChange={(value) => setDraft({ ...draft, perDayMb: { ...draft.perDayMb, [key]: value } })}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-card border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Yoğunluk çarpanları</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(Object.keys(INTENSITY_LABELS) as UsageIntensity[]).map((key) => (
                  <NumberField
                    key={key}
                    label={INTENSITY_LABELS[key]}
                    value={draft.intensityMultipliers[key]}
                    min={SETTINGS_LIMITS.multiplier.min}
                    max={SETTINGS_LIMITS.multiplier.max}
                    step={0.1}
                    suffix="×"
                    onChange={(value) => setDraft({ ...draft, intensityMultipliers: { ...draft.intensityMultipliers, [key]: value } })}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-card border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Güvenlik payı ve minimum ihtiyaç</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Paket boyutları burada tanımlanmaz. GB seçenekleri, geçerlilik ve kapsama gerçek ürün kataloğundan gelir; sistem ihtiyacı karşılayan en küçük mevcut paketi seçer.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Güvenlik payı"
                  value={draft.safetyBufferPercent}
                  min={SETTINGS_LIMITS.safetyBufferPercent.min}
                  max={SETTINGS_LIMITS.safetyBufferPercent.max}
                  suffix="%"
                  onChange={(safetyBufferPercent) => setDraft({ ...draft, safetyBufferPercent })}
                />
                <NumberField
                  label="Minimum öneri"
                  value={draft.minimumRecommendedGb}
                  min={SETTINGS_LIMITS.minimumRecommendedGb.min}
                  max={SETTINGS_LIMITS.minimumRecommendedGb.max}
                  step={0.5}
                  suffix="GB"
                  onChange={(minimumRecommendedGb) => setDraft({ ...draft, minimumRecommendedGb })}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => mutation.mutate(effective)} disabled={mutation.isPending}>
                {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Save />} Kaydet
              </Button>
              <Button variant="outline" onClick={() => setDraft(DEFAULT_USAGE_SETTINGS)}>
                <RotateCcw /> Varsayılanlara dön
              </Button>
              {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><CheckCircle2 className="size-4" /> Kaydedildi</span>}
              {mutation.isError && <span className="text-sm text-destructive">{(mutation.error as Error).message}</span>}
            </div>
          </div>

          <aside className="rounded-card border border-border bg-card p-5 lg:sticky lg:top-5 lg:self-start">
            <h2 className="font-display text-lg font-bold">Önizleme hesaplayıcı</h2>
            <p className="mt-1 text-sm text-muted-foreground">10 gün · 1 kişi · Mesajlaşma, Sosyal medya, Harita</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">Tahmini kullanım</dt><dd className="mt-1 text-lg font-bold">~{preview.estimatedGb} GB</dd></div>
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">Güvenlik payı eklenmiş</dt><dd className="mt-1 text-lg font-bold">{preview.safetyAdjustedGb} GB</dd></div>
              <div className="rounded-xl bg-accent-soft p-3">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">Gerekli veri (ihtiyaç)</dt>
                <dd className="mt-1 text-lg font-bold">{preview.requiredGb} GB</dd>
                <dd className="mt-1 text-xs text-muted-foreground">Katalogdaki bu değeri karşılayan en küçük paket önerilir.</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </AdminGate>
  );
}
