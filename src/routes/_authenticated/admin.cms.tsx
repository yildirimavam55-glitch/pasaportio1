import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Globe2, Plane, RadioTower } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { CMS_LOCALES, defaultSettings, emptyCopy, listCmsDocuments, saveCmsDocument, type CmsCopy, type CmsKind, type CmsSettings } from "@/lib/admin-cms.functions";
import { listMedia } from "@/lib/admin-media.functions";

export const Route = createFileRoute("/_authenticated/admin/cms")({
  head: () => adminHead("Sayfalar ve CMS", "Global, eSIM ve Lounge içerik yönetimi."),
  component: Cms,
});

const KINDS: Array<{ kind: CmsKind; label: string; detail: string; icon: typeof Globe2 }> = [
  { kind: "GLOBAL_CONTENT", label: "Global içerik", detail: "Header, footer, destek ve ortak sayfalar", icon: Globe2 },
  { kind: "ESIM_CONTENT", label: "eSIM içerik", detail: "Finder çevresi, eğitim ve destinasyon içeriği", icon: RadioTower },
  { kind: "LOUNGE_CONTENT", label: "Lounge içerik", detail: "Havalimanı, Lounge ve rezervasyon içeriği", icon: Plane },
];

function Cms() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<CmsKind>("GLOBAL_CONTENT");
  const [locale, setLocale] = useState<(typeof CMS_LOCALES)[number]>("tr");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const documents = useQuery({ queryKey: ["cms-documents"], queryFn: () => listCmsDocuments() });
  const media = useQuery({ queryKey: ["media", "all"], queryFn: () => listMedia({ data: {} }) });

  const current = (documents.data ?? []).find((row: any) => row.kind === kind) ?? null;
  const [settings, setSettings] = useState<CmsSettings>(defaultSettings());
  const [copy, setCopy] = useState<Record<string, CmsCopy>>({ tr: emptyCopy(), de: emptyCopy(), en: emptyCopy() });

  useEffect(() => {
    setMessage(null);
    setSettings(current?.settings ?? defaultSettings());
    setCopy(current?.copy ?? { tr: emptyCopy(), de: emptyCopy(), en: emptyCopy() });
  }, [current, kind]);

  const save = useMutation({
    mutationFn: (publish: boolean) => saveCmsDocument({ data: { kind, settings, copy, publish } }),
    onSuccess: async (_, publish) => { setMessage(publish ? "Yayınlandı." : "Taslak kaydedildi."); await queryClient.invalidateQueries({ queryKey: ["cms-documents"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Kaydedilemedi."),
  });

  const active = copy[locale] ?? emptyCopy();
  const setCopyField = (field: keyof CmsCopy, value: string) => setCopy((state) => ({ ...state, [locale]: { ...(state[locale] ?? emptyCopy()), [field]: value } }));
  const setSetting = (patch: Partial<CmsSettings>) => setSettings((state) => ({ ...state, ...patch }));
  const mediaOptions = media.data ?? [];

  return (
    <AdminGate title="Sayfalar / CMS">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          {KINDS.map(({ kind: value, label, detail, icon: Icon }) => {
            const document = (documents.data ?? []).find((row: any) => row.kind === value);
            return (
              <button key={value} type="button" onClick={() => setKind(value)} className={`admin-card p-3.5 text-left ${kind === value ? "border-primary ring-1 ring-primary" : ""}`}>
                <span className="grid size-9 place-items-center rounded-md bg-primary-soft"><Icon className="size-4" /></span>
                <strong className="mt-3 block text-sm">{label}</strong>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                <span className="mt-2 inline-flex"><StatusBadge value={document?.status ?? "DRAFT"} /></span>
              </button>
            );
          })}
        </div>

        {documents.isPending ? <AdminLoading /> : documents.error ? <AdminError error={documents.error} /> : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <AdminPanel title="İçerik" action={<div className="flex gap-1">{CMS_LOCALES.map((code) => <Button key={code} size="sm" variant={locale === code ? "secondary" : "outline"} onClick={() => setLocale(code)}>{code.toUpperCase()}</Button>)}</div>}>
              <div className="grid gap-3">
                <Field label="Hero başlığı"><input className="admin-field mt-1 w-full" value={active.heroHeadline} onChange={(event) => setCopyField("heroHeadline", event.target.value)} /></Field>
                <Field label="Hero açıklaması"><textarea rows={3} className="admin-field mt-1 w-full" value={active.heroDescription} onChange={(event) => setCopyField("heroDescription", event.target.value)} /></Field>
                <Field label="Hero buton metni"><input className="admin-field mt-1 w-full" value={active.heroCtaLabel} onChange={(event) => setCopyField("heroCtaLabel", event.target.value)} /></Field>
                <Field label="Bölüm başlığı"><input className="admin-field mt-1 w-full" value={active.sectionHeadline} onChange={(event) => setCopyField("sectionHeadline", event.target.value)} /></Field>
                <Field label="Bölüm açıklaması"><textarea rows={3} className="admin-field mt-1 w-full" value={active.sectionDescription} onChange={(event) => setCopyField("sectionDescription", event.target.value)} /></Field>
                <Field label="Kampanya metni"><textarea rows={2} className="admin-field mt-1 w-full" value={active.campaign} onChange={(event) => setCopyField("campaign", event.target.value)} /></Field>
                <Field label="Çapraz satış metni"><textarea rows={2} className="admin-field mt-1 w-full" value={active.crossSell} onChange={(event) => setCopyField("crossSell", event.target.value)} /></Field>
                <Field label="Destek içeriği"><textarea rows={2} className="admin-field mt-1 w-full" value={active.support} onChange={(event) => setCopyField("support", event.target.value)} /></Field>
                <Field label="Header metni"><input className="admin-field mt-1 w-full" value={active.header} onChange={(event) => setCopyField("header", event.target.value)} /></Field>
                <Field label="Footer metni"><textarea rows={2} className="admin-field mt-1 w-full" value={active.footer} onChange={(event) => setCopyField("footer", event.target.value)} /></Field>

                <div>
                  <span className="text-xs font-semibold">Sık sorulan sorular</span>
                  <div className="mt-2 grid gap-2">
                    {active.faq.map((row, index) => (
                      <div key={index} className="rounded-md border border-border p-2">
                        <input className="admin-field w-full" placeholder="Soru" value={row.question} onChange={(event) => setCopy((state) => { const next = [...(state[locale]?.faq ?? [])]; next[index] = { ...next[index]!, question: event.target.value }; return { ...state, [locale]: { ...(state[locale] ?? emptyCopy()), faq: next } }; })} />
                        <textarea rows={2} className="admin-field mt-2 w-full" placeholder="Cevap" value={row.answer} onChange={(event) => setCopy((state) => { const next = [...(state[locale]?.faq ?? [])]; next[index] = { ...next[index]!, answer: event.target.value }; return { ...state, [locale]: { ...(state[locale] ?? emptyCopy()), faq: next } }; })} />
                        <Button size="sm" variant="ghost" className="mt-1" onClick={() => setCopy((state) => ({ ...state, [locale]: { ...(state[locale] ?? emptyCopy()), faq: (state[locale]?.faq ?? []).filter((_, position) => position !== index) } }))}>Kaldır</Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setCopy((state) => ({ ...state, [locale]: { ...(state[locale] ?? emptyCopy()), faq: [...(state[locale]?.faq ?? []), { question: "", answer: "" }] } }))}>Soru ekle</Button>
                  </div>
                </div>
              </div>
            </AdminPanel>

            <div className="grid gap-4">
              <AdminPanel title="Yayın ve düzen">
                <div className="grid gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={settings.visible} onChange={(event) => setSetting({ visible: event.target.checked })} />Görünür</label>
                  <Field label="Sıra"><input type="number" className="admin-field mt-1 w-full" value={settings.sortOrder} onChange={(event) => setSetting({ sortOrder: Number(event.target.value) })} /></Field>
                  <Field label="Varyant"><select className="admin-field mt-1 w-full" value={settings.variant} onChange={(event) => setSetting({ variant: event.target.value as CmsSettings["variant"] })}><option value="default">Standart</option><option value="highlight">Vurgulu</option><option value="quiet">Sade</option></select></Field>
                  <Field label="Arka plan"><select className="admin-field mt-1 w-full" value={settings.background} onChange={(event) => setSetting({ background: event.target.value as CmsSettings["background"] })}><option value="card">Kart</option><option value="soft">Yumuşak</option><option value="petrol">Petrol</option><option value="sand">Kum</option></select></Field>
                  <Field label="Boşluk"><select className="admin-field mt-1 w-full" value={settings.spacing} onChange={(event) => setSetting({ spacing: event.target.value as CmsSettings["spacing"] })}><option value="compact">Sıkı</option><option value="normal">Normal</option><option value="roomy">Ferah</option></select></Field>
                  <Field label="Hero görseli (masaüstü)"><select className="admin-field mt-1 w-full" value={settings.heroDesktopMediaId ?? ""} onChange={(event) => setSetting({ heroDesktopMediaId: event.target.value || null })}><option value="">Seçilmedi</option>{mediaOptions.map((asset: any) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></Field>
                  <Field label="Hero görseli (mobil)"><select className="admin-field mt-1 w-full" value={settings.heroMobileMediaId ?? ""} onChange={(event) => setSetting({ heroMobileMediaId: event.target.value || null })}><option value="">Seçilmedi</option>{mediaOptions.map((asset: any) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></Field>
                  <Field label="Hero buton bağlantısı" hint="Yalnızca site içi yollar (/esim, /lounge)."><input className="admin-field mt-1 w-full" value={settings.heroCtaHref} onChange={(event) => setSetting({ heroCtaHref: event.target.value })} /></Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>Taslağı kaydet</Button>
                  <Button size="sm" variant="secondary" onClick={() => setPreview((value) => !value)}>{preview ? "Önizlemeyi kapat" : "Önizle"}</Button>
                  <Button size="sm" onClick={() => save.mutate(true)} disabled={save.isPending}>Yayınla</Button>
                </div>
                {message && <p className="mt-2 text-xs font-semibold text-primary">{message}</p>}
                <p className="mt-2 text-[10px] text-muted-foreground">İçerik yalnızca yapılandırılmış alanlardan oluşur; CSS veya JavaScript girilemez.</p>
              </AdminPanel>

              {preview && (
                <AdminPanel title="Önizleme">
                  <div className={`rounded-lg border border-border p-4 ${settings.background === "petrol" ? "bg-primary text-primary-foreground" : settings.background === "sand" ? "bg-sand-soft" : settings.background === "soft" ? "bg-secondary/50" : "bg-card"} ${settings.spacing === "roomy" ? "py-8" : settings.spacing === "compact" ? "py-2" : ""}`}>
                    <h3 className={`font-display font-bold ${settings.variant === "highlight" ? "text-2xl" : "text-lg"}`}>{active.heroHeadline || "Hero başlığı"}</h3>
                    <p className="mt-2 text-sm opacity-80">{active.heroDescription || "Hero açıklaması"}</p>
                    {active.heroCtaLabel && <span className="mt-3 inline-flex rounded-md bg-cta px-3 py-2 text-xs font-bold text-white">{active.heroCtaLabel}</span>}
                  </div>
                </AdminPanel>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
