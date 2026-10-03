import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, GripVertical, History, Lock, Plus, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { MediaField } from "@/components/admin/MediaPicker";
import { IconPicker } from "@/components/admin/IconPicker";
import { Button } from "@/components/ui/button";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { listMedia } from "@/lib/admin-media.functions";
import { discardV2Draft, getV2PageEditor, restoreV2Version, saveV2Page } from "@/lib/v2-storefront.functions";
import { V2_BUILTIN_URLS, V2_PREVIEW_WINDOW } from "@/components/design-v2/V2Sections";
import {
  createV2Section,
  defaultV2Page,
  missingV2Translations,
  V2_ADDABLE,
  V2_ALIGNS,
  V2_HEIGHTS,
  V2_ITEM_MODE,
  V2_OVERLAYS,
  V2_PAGES,
  V2_PROTECTED,
  V2_SAFE_LINKS,
  V2_SECTION_LABELS,
  V2_SINGLETON,
  V2_TEXT_FIELDS,
  type LT,
  type V2Item,
  type V2PageConfig,
  type V2PageId,
  type V2Section,
} from "@/domain/storefront/v2";
import { getCountryByIso, searchCountries } from "@/domain/geo/countries";
import { getAirportByIata, searchAirports } from "@/domain/geo/airports";
import type { Locale } from "@/domain/enums";
import { LOCALE_REGISTRY, UI_LOCALES, type UiLocale } from "@/i18n/locales";

const PAGE_LABEL: Record<V2PageId, string> = { esim: "eSIM ana sayfası", lounge: "Lounge ana sayfası", vignette: "Vignette ana sayfası" };
const LINK_LABEL: Record<string, string> = { "/esim": "eSIM", "/lounge": "Lounge", "/vignette": "Vignette", "/destek": "Destek / kurulum rehberi", "/sepet": "Sepet", "/account": "Hesabım" };
const DEVICES = [{ id: "360", w: 360 }, { id: "390", w: 390 }, { id: "430", w: 430 }, { id: "Masaüstü", w: 1024 }] as const;
const PRESET = { left: "Sola", center: "Orta", compact: "Kompakt", normal: "Normal", tall: "Yüksek", light: "Hafif", strong: "Güçlü" } as Record<string, string>;

export const Route = createFileRoute("/_authenticated/admin/storefront/v2/$page")({
  head: ({ params }) => adminHead(`V2 ${PAGE_LABEL[(params.page as V2PageId)] ?? "sayfa"} düzenleyici`, "V2 storefront bölümlerini, metinlerini ve görsellerini düzenle, önizle ve yayınla."),
  component: EditorPage,
});

function EditorPage() {
  const { page: raw } = Route.useParams();
  const page = ((V2_PAGES as readonly string[]).includes(raw) ? raw : "esim") as V2PageId;
  return <AdminGate title={`V2 · ${PAGE_LABEL[page]}`}><Editor key={page} page={page} /></AdminGate>;
}

function Editor({ page }: { page: V2PageId }) {
  const queryClient = useQueryClient();
  const editor = useQuery({ queryKey: ["v2-editor", page], queryFn: () => getV2PageEditor({ data: { page } }) });
  const mediaList = useQuery({ queryKey: ["media-all"], queryFn: () => listMedia({ data: {} }) });
  const [draft, setDraft] = useState<V2PageConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("hero");
  const [lang, setLang] = useState<Locale>("tr");
  const [trustPreviewLocale, setTrustPreviewLocale] = useState<UiLocale | null>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("390");
  const [dragId, setDragId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => { if (editor.data && !dirty) setDraft(editor.data.draft); }, [editor.data, dirty]);

  const media = useMemo(() => Object.fromEntries((mediaList.data ?? []).filter((m) => m.url).map((m) => [m.id, { url: m.url as string, alt: m.altText ?? "" }])), [mediaList.data]);
  const pushPreview = useCallback(() => {
    if (!draft || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ type: "v2-cms-preview", page, config: draft, media, locale: selectedId === "trust-reviews" ? trustPreviewLocale ?? lang : lang }, window.location.origin);
  }, [draft, media, page, lang, selectedId, trustPreviewLocale]);
  useEffect(() => { pushPreview(); }, [pushPreview]);
  useEffect(() => {
    const onReady = (event: MessageEvent) => { if (event.origin === window.location.origin && event.data?.type === "v2-cms-ready" && event.data.page === page) pushPreview(); };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [page, pushPreview]);

  const refresh = () => { setDirty(false); void queryClient.invalidateQueries({ queryKey: ["v2-editor", page] }); void queryClient.invalidateQueries({ queryKey: ["v2-storefront", page] }); };
  const save = useMutation({
    mutationFn: (publish: boolean) => saveV2Page({ data: { page, config: draft, publish } }),
    onSuccess: (_r, publish) => { toast.success(publish ? "Yayınlandı." : "Taslak kaydedildi."); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Kaydedilemedi."),
  });
  const discard = useMutation({ mutationFn: () => discardV2Draft({ data: { page } }), onSuccess: () => { toast.success("Taslak yayındaki sürüme döndü."); refresh(); } });
  const restore = useMutation({
    mutationFn: (versionId: string) => restoreV2Version({ data: { page, versionId } }),
    onSuccess: () => { toast.success("Sürüm geri yüklendi ve yayınlandı."); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Geri yüklenemedi."),
  });

  if (editor.isLoading || !draft) return <AdminLoading />;
  if (editor.error) return <AdminError error={editor.error} />;

  const update = (next: V2PageConfig) => { setDraft(next); setDirty(true); };
  const sections = draft.sections;
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0]!;
  const patchSection = (id: string, patch: Partial<V2Section>) => update({ ...draft, sections: sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (id: string, delta: number) => {
    const index = sections.findIndex((s) => s.id === id);
    const target = index + delta;
    if (index <= 0 || target <= 0 || target >= sections.length) return; // hero stays first
    const next = [...sections];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    update({ ...draft, sections: next });
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = sections.findIndex((s) => s.id === dragId);
    const to = sections.findIndex((s) => s.id === targetId);
    if (from <= 0 || to <= 0) return;
    const next = [...sections];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row!);
    update({ ...draft, sections: next });
    setDragId(null);
  };
  const duplicate = (s: V2Section) => {
    const copy = { ...structuredClone(s), id: `${s.id.slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}` };
    const index = sections.findIndex((x) => x.id === s.id);
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    update({ ...draft, sections: next });
    setSelectedId(copy.id);
  };
  const remove = (s: V2Section) => {
    if (!window.confirm(`“${V2_SECTION_LABELS[s.type]}” bölümü kaldırılsın mı? Sayfayı varsayılana döndürerek geri getirebilirsin.`)) return;
    update({ ...draft, sections: sections.filter((x) => x.id !== s.id) });
    setSelectedId("hero");
  };
  const defaults = defaultV2Page(page);
  const resetSection = (s: V2Section) => {
    const original = defaults.sections.find((x) => x.id === s.id);
    if (original) patchSection(s.id, original);
  };
  const add = (type: V2Section["type"]) => {
    const s = createV2Section(type);
    update({ ...draft, sections: [...sections, s] });
    setSelectedId(s.id);
  };
  const missing = { de: missingV2Translations(draft, "de"), en: missingV2Translations(draft, "en") };
  const width = DEVICES.find((d) => d.id === device)!.w;

  return (
    <div className="space-y-3">
      <div className="admin-card flex flex-wrap items-center gap-2 p-3">
        <Button asChild variant="ghost" size="sm"><Link to="/admin/storefront"><ArrowLeft />Storefront</Link></Button>
        <div className="mr-auto min-w-0">
          <p className="text-sm font-bold">{PAGE_LABEL[page]}</p>
          <p className="text-[11px] text-muted-foreground">
            {editor.data?.publishedAt ? `Yayında: ${new Date(editor.data.publishedAt).toLocaleString("tr-TR")}` : "Henüz yayınlanmadı — mevcut onaylı tasarım gösteriliyor"}
            {(dirty || editor.data?.hasDraftChanges) && " · Yayınlanmamış değişiklikler var"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}><History />Geçmiş</Button>
        <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Tüm sayfa onaylı varsayılan tasarıma dönsün mü? (Kaydedene kadar yalnız taslakta)")) update(defaults); }}><RotateCcw />Varsayılana dön</Button>
        {editor.data?.hasDraftChanges && !dirty && <Button variant="outline" size="sm" onClick={() => discard.mutate()}>Taslağı at</Button>}
        <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate(false)}><Save />Taslak kaydet</Button>
        <Button size="sm" disabled={save.isPending} onClick={() => { if (window.confirm("Bu sürüm müşterilere yayınlansın mı?")) save.mutate(true); }}><Upload />Yayınla</Button>
      </div>

      {showHistory && (
        <AdminPanel title="Sürüm geçmişi" action={<Button size="icon" variant="ghost" className="size-8" onClick={() => setShowHistory(false)}><X /></Button>}>
          {editor.data?.versions.length ? (
            <ul className="divide-y divide-border text-xs">
              {editor.data.versions.map((v) => (
                <li key={v.id} className="flex items-center gap-2 py-2">
                  <span className="w-20 font-bold">{v.event === "publish" ? "Yayın" : v.event === "restore" ? "Geri yükleme" : "Taslak"}</span>
                  <span className="flex-1 text-muted-foreground">{new Date(v.createdAt).toLocaleString("tr-TR")} · {v.author} · {v.sections} bölüm</span>
                  <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => { if (window.confirm("Bu sürüm geri yüklenip yayınlansın mı?")) restore.mutate(v.id); }}>Geri yükle</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">Henüz kayıtlı sürüm yok.</p>}
        </AdminPanel>
      )}

      <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,auto)]">
        <AdminPanel title="Bölümler">
          <ol className="space-y-1">
            {sections.map((s, index) => {
              const locked = V2_PROTECTED.includes(s.type);
              return (
                <li key={s.id} draggable={!locked} onDragStart={() => setDragId(s.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(s.id)}
                  className={`flex items-center gap-1 rounded-md border p-1.5 text-xs ${s.id === selected.id ? "border-primary bg-primary-soft" : "border-border bg-background"} ${s.visible ? "" : "opacity-60"}`}>
                  {locked ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />}
                  <button type="button" onClick={() => setSelectedId(s.id)} className="min-w-0 flex-1 truncate text-left font-semibold">{V2_SECTION_LABELS[s.type]}<span className="block truncate text-[10px] font-normal text-muted-foreground">{s.text["title"]?.tr || s.id}</span></button>
                  {!locked && <>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Yukarı" disabled={index <= 1} onClick={() => move(s.id, -1)}><ArrowUp /></Button>
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Aşağı" disabled={index >= sections.length - 1} onClick={() => move(s.id, 1)}><ArrowDown /></Button>
                    <Button size="icon" variant="ghost" className="size-7" aria-label={s.visible ? "Gizle" : "Göster"} onClick={() => patchSection(s.id, { visible: !s.visible })}>{s.visible ? <Eye /> : <EyeOff />}</Button>
                  </>}
                </li>
              );
            })}
          </ol>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-primary"><Plus className="inline size-3.5" /> Bölüm ekle</summary>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {V2_ADDABLE.map((type) => <Button key={type} size="sm" variant="outline" className="h-auto whitespace-normal py-1.5 text-[11px]" onClick={() => add(type)}>{V2_SECTION_LABELS[type]}</Button>)}
            </div>
          </details>
        </AdminPanel>

        <AdminPanel title={V2_SECTION_LABELS[selected.type]} action={
          <div className="flex gap-1">
            {defaults.sections.some((x) => x.id === selected.id) && <Button size="sm" variant="ghost" onClick={() => resetSection(selected)}><RotateCcw />Sıfırla</Button>}
            {!V2_SINGLETON.includes(selected.type) && <Button size="sm" variant="ghost" onClick={() => duplicate(selected)}><Copy />Çoğalt</Button>}
            {!V2_PROTECTED.includes(selected.type) && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(selected)}><Trash2 />Kaldır</Button>}
          </div>}>
          <div className="mb-3 flex items-center gap-1">
            {(["tr", "de", "en"] as const).map((code) => (
              <Button key={code} size="sm" variant={lang === code ? "default" : "outline"} onClick={() => setLang(code)} className="uppercase">
                {code}{code !== "tr" && missing[code] > 0 && <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-[10px]">{missing[code]}</span>}
              </Button>
            ))}
            <span className="ml-2 text-[10px] text-muted-foreground">Boş DE/EN alanlarda Türkçe metin gösterilir.</span>
          </div>
          {V2_PROTECTED.includes(selected.type) && <p className="mb-3 rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Arama mantığı kodda korunur. Burada yalnızca metin, görsel ve görünüm ön ayarları değişir; bölüm gizlenemez veya taşınamaz.</p>}
          <SectionForm section={selected} lang={lang} page={page} trustPreviewLocale={trustPreviewLocale} onTrustLocale={setTrustPreviewLocale} onChange={(patch) => patchSection(selected.id, patch)} />
        </AdminPanel>

        <AdminPanel title="Önizleme (taslak)" className="xl:w-[27rem]" action={
          <div className="flex gap-1">{DEVICES.map((d) => <Button key={d.id} size="sm" variant={device === d.id ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setDevice(d.id)}>{d.id}</Button>)}</div>}>
          <div className="overflow-auto rounded-md border border-border bg-secondary/40 p-2">
            <iframe
              ref={frame}
              name={V2_PREVIEW_WINDOW}
              title="V2 önizleme"
              src={page === "esim" ? "/esim?country=" : page === "lounge" ? "/lounge?iata=" : "/vignette"}
              onLoad={pushPreview}
              style={{ width, height: 760, transform: width > 430 ? "scale(0.4)" : undefined, transformOrigin: "top left" }}
              className="mx-auto block rounded-md bg-background"
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Önizleme yalnızca sende görünür. Müşteriler “Yayınla” diyene kadar mevcut yayındaki sürümü görür.</p>
        </AdminPanel>
      </div>
    </div>
  );
}

function LTInput({ label, value, lang, onChange, multiline = false, uiLang }: { label: string; value: LT | undefined; lang: Locale; onChange: (v: LT) => void; multiline?: boolean; uiLang?: UiLocale }) {
  const code = uiLang ?? lang;
  const current = value ?? { tr: "", de: "", en: "" };
  const cls = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal";
  return (
    <Field label={`${label} · ${code.toUpperCase()}`} {...(code !== "tr" && current.tr ? { hint: `TR: ${current.tr}` } : {})}>
      {multiline
        ? <textarea rows={3} className={cls} value={current[code] ?? ""} onChange={(e) => onChange({ ...current, [code]: e.target.value })} />
        : <input className={cls} value={current[code] ?? ""} onChange={(e) => onChange({ ...current, [code]: e.target.value })} />}
    </Field>
  );
}

function Select<T extends string>({ label, value, options, onChange, labels = PRESET }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Record<string, string> }) {
  return (
    <Field label={label}>
      <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
      </select>
    </Field>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const builtin = value && V2_BUILTIN_URLS[value];
  return (
    <div className="space-y-1">
      {builtin && <div className="flex items-center gap-2 rounded-md border border-border p-2 text-xs"><img src={builtin} alt="" className="size-12 rounded object-cover" /><span className="flex-1">Onaylı varsayılan görsel</span></div>}
      <MediaField label={label} value={builtin ? null : value} onChange={onChange} hint="Medya kütüphanesinden seç veya yükle. Kaldırırsan görsel alanı boş kalır." />
    </div>
  );
}

function SectionForm({ section: s, lang, page, trustPreviewLocale, onTrustLocale, onChange }: { section: V2Section; lang: Locale; page: V2PageId; trustPreviewLocale: UiLocale | null; onTrustLocale: (code: UiLocale) => void; onChange: (patch: Partial<V2Section>) => void }) {
  const setText = (key: string, value: LT) => onChange({ text: { ...s.text, [key]: value } });
  const mode = V2_ITEM_MODE[s.type];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {s.type !== "TRUST_REVIEWS" && V2_TEXT_FIELDS[s.type].map(([key, label]) => <LTInput key={key} label={label} lang={lang} value={s.text[key]} onChange={(v) => setText(key, v)} multiline={key === "text" || key === "lead"} />)}
      </div>

      {s.type === "SEARCH_HERO" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageField label="Hero görseli (masaüstü + varsayılan)" value={s.mediaId} onChange={(v) => onChange({ mediaId: v })} />
          <ImageField label="Mobil hero görseli (isteğe bağlı)" value={s.mobileMediaId} onChange={(v) => onChange({ mobileMediaId: v })} />
          <Select label="Metin hizası" value={s.align} options={V2_ALIGNS} onChange={(align) => onChange({ align })} />
          <Select label="Yükseklik" value={s.height} options={V2_HEIGHTS} onChange={(height) => onChange({ height })} />
          <Select label="Karartma" value={s.overlay} options={V2_OVERLAYS} onChange={(overlay) => onChange({ overlay })} />
        </div>
      )}

      {s.type === "PROMO_BANNER" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageField label="Banner görseli" value={s.mediaId} onChange={(v) => onChange({ mediaId: v })} />
          <Select label="Hedef sayfa" value={s.href} options={V2_SAFE_LINKS} labels={LINK_LABEL} onChange={(href) => onChange({ href })} />
          <Field label="Başlangıç tarihi"><input type="date" className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={s.startsAt} onChange={(e) => onChange({ startsAt: e.target.value })} /></Field>
          <Field label="Bitiş tarihi"><input type="date" className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" value={s.endsAt} onChange={(e) => onChange({ endsAt: e.target.value })} /></Field>
          <Field label="Kupon / indirim" hint="İndirim motoru henüz yok; sahte indirim gösterilemez. Gerçek kupon altyapısı gelince buradan seçilecek.">
            <select disabled className="mt-1 w-full rounded-md border border-border bg-secondary px-2 py-1.5 text-sm"><option>Aktif kupon yok</option></select>
          </Field>
        </div>
      )}

      {s.type === "INSTALLATION_STEPS" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Görünüm" value={s.variant === "simple" ? "simple" : "animated"} options={["animated", "simple"] as const} labels={{ animated: "Animasyonlu (dekoratif QR)", simple: "Sade adım listesi" }} onChange={(variant) => onChange({ variant })} />
          <Select label="Buton hedefi" value={s.href} options={V2_SAFE_LINKS} labels={LINK_LABEL} onChange={(href) => onChange({ href })} />
        </div>
      )}
      {s.type === "FAQ" && <Select label="Satır yüksekliği" value={s.variant === "comfortable" ? "comfortable" : "default"} options={["default", "comfortable"] as const} labels={{ default: "Kompakt", comfortable: "Rahat" }} onChange={(variant) => onChange({ variant })} />}
      {s.type === "SPACER" && <Select label="Boşluk" value={s.height} options={V2_HEIGHTS} onChange={(height) => onChange({ height })} />}
      {s.type === "DESTINATION_CAROUSEL" && <p className="rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Fiyatlar her zaman gerçek katalogdan gelir; yalnız yayınlanmış fiyatı olan destinasyonlar müşteriye görünür.</p>}
      {s.type === "REGION_DISCOVERY" && <p className="rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Bölgeler, ülke sayıları ve fiyatlar gerçek katalogdan otomatik gelir; burada yalnız metinler düzenlenir.</p>}
      {s.type === "TRUST_REVIEWS" && <TrustReviewsEditor section={s} lang={lang} uiLang={trustPreviewLocale ?? lang} onUiLang={onTrustLocale} onChange={onChange} />}
      {page === "lounge" && !V2_PROTECTED.includes(s.type) && s.type !== "DESTINATION_CAROUSEL" && (
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={s.showOnResults} onChange={(e) => onChange({ showOnResults: e.target.checked })} />Havalimanı sonuçlarının altında da göster</label>
      )}

      {mode && <ItemsEditor mode={mode} page={page} items={s.items} lang={lang} onChange={(items) => onChange({ items })} />}
    </div>
  );
}

function TrustReviewsEditor({ section, lang, uiLang, onUiLang, onChange }: { section: V2Section; lang: Locale; uiLang: UiLocale; onUiLang: (code: UiLocale) => void; onChange: (patch: Partial<V2Section>) => void }) {
  const trustItems = section.items.filter((item) => item.cardType === "trust");
  const reviews = section.items.filter((item) => item.cardType === "review");
  const setItem = (id: string, patch: Partial<V2Item>) => onChange({ items: section.items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) });
  const moveReview = (id: string, delta: number) => {
    const reviewIds = reviews.map((item) => item.id);
    const index = reviewIds.indexOf(id);
    const target = index + delta;
    if (target < 0 || target >= reviewIds.length) return;
    const nextReviews = [...reviews];
    const [row] = nextReviews.splice(index, 1);
    if (!row) return;
    nextReviews.splice(target, 0, row);
    onChange({ items: [...section.items.filter((item) => item.cardType !== "review"), ...nextReviews] });
  };
  const makeReview = (type: "REAL" | "DEMO", code: UiLocale = uiLang, countryCode = "", name = "", body = ""): V2Item => {
    const id = `review-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    return { id, visible: true, icon: "", entity: "", title: { tr: "", de: "", en: "", [code]: name }, text: { tr: "", de: "", en: "", [code]: body }, internalKey: id, cardType: "review", mediaId: null, href: "", labels: [], cta: { tr: "", de: "", en: "" }, imageAlt: { tr: "", de: "", en: "" }, focalX: 50, focalY: 50, rating: 5, verified: false, published: false, reviewType: type, reviewStatus: "DRAFT", originalLanguage: code, countryCode, reviewDate: "", createdAt: now, updatedAt: now };
  };
  const demoExamples = [
    ["IT", "it", "Giulia R.", "L'installazione è stata semplice e veloce. Comoda da usare durante il viaggio."],
    ["JP", "ja", "Haruto S.", "設定は簡単で、旅行中も便利に使えました。"],
    ["US", "en", "Emily C.", "Setup was easy, and having the eSIM ready for my trip was convenient."],
    ["TR", "tr", "Elif Y.", "Kurulum çok kolaydı. Seyahatim boyunca eSIM'i rahatça kullanabildim."],
    ["FR", "fr", "Camille D.", "Installation simple et rapide. Très pratique pour mon voyage."],
    ["ES", "es", "Lucía M.", "La instalación fue muy sencilla y resultó muy práctico durante mi viaje."],
  ] as const;
  const addExamples = () => onChange({ items: [...section.items, ...demoExamples.filter(([, , name]) => !reviews.some((review) => review.reviewType === "DEMO" && review.title[review.originalLanguage ?? "en"] === name)).slice(0, Math.max(0, 30 - section.items.length)).map(([country, language, name, text]) => makeReview("DEMO", language, country, name, text))] });
  const reviewCountries = ["TR", "DE", "IT", "JP", "US", "FR", "ES", "GB", "NL", "PT", "PL", "AE", "CH", "AT"];
  const countryLabel = (code: string) => new Intl.DisplayNames([LOCALE_REGISTRY[uiLang].bcp47], { type: "region" }).of(code) ?? code;

  return <div className="space-y-4">
    <Field label="Trust & Reviews dili"><select className="admin-field mt-1 w-full" value={uiLang} onChange={(event) => onUiLang(event.target.value as UiLocale)}>{UI_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></Field>
    <div className="grid gap-2 sm:grid-cols-2">{V2_TEXT_FIELDS.TRUST_REVIEWS.map(([key, label]) => <LTInput key={key} label={label} lang={lang} uiLang={uiLang} value={section.text[key]} onChange={(value) => onChange({ text: { ...section.text, [key]: value } })} />)}</div>
    <ImageField label="Ana seyahat görseli" value={section.mediaId} onChange={(mediaId) => onChange({ mediaId })} />
    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={section.visible} onChange={(event) => onChange({ visible: event.target.checked })} />Bölüm mağazada görünür</label>
    <div className="rounded-md border border-border p-3">
      <p className="text-xs font-bold">Güven çubuğu</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Kurulum iddiası dahil tüm metinler yayınlanmadan önce içerik onayı gerektirir.</p>
      <div className="mt-3 space-y-3">{trustItems.map((item) => <div key={item.id} className="grid gap-2 rounded-md bg-secondary/40 p-2 sm:grid-cols-2"><IconPicker value={item.icon} onChange={(icon) => setItem(item.id, { icon })} /><LTInput label="Başlık" value={item.title} lang={lang} uiLang={uiLang} onChange={(title) => setItem(item.id, { title })} /><div className="sm:col-span-2"><LTInput label="Açıklama" value={item.text} lang={lang} uiLang={uiLang} onChange={(text) => setItem(item.id, { text })} /></div></div>)}</div>
    </div>
    <div className="rounded-md border border-border p-3">
       <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold">Müşteri yorumları</p><p className="mt-1 text-[10px] text-muted-foreground">Mağaza yalnız GERÇEK + DOĞRULANMIŞ + YAYINDA yorumları gösterir. Demo yorumları sadece bu editörün önizlemesinde görünür.</p></div><Button size="sm" variant="outline" onClick={() => onChange({ items: [...section.items, makeReview("REAL")] })}><Plus />Yorum ekle</Button></div>
       <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={addExamples} disabled={section.items.length >= 30}>DEMO / TEST örnekleri ekle</Button><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={section.showDemoReviews === true} onChange={(event) => onChange({ showDemoReviews: event.target.checked })} />Demoları önizlemede göster</label><Button size="sm" variant="outline" onClick={() => onChange({ showDemoReviews: false })}>Tüm demoları gizle</Button></div>
      {!reviews.length && <p className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">Henüz yorum yok. Mağazada yorum kartları otomatik olarak gizlenir.</p>}
      <ul className="mt-3 space-y-3">{reviews.map((review, index) => <li key={review.id} className="rounded-md border border-border bg-background p-3">
         <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><div className="min-w-0"><strong className="block truncate text-xs">{review.title[review.originalLanguage ?? "en"] || "Yeni yorum"} <span className="text-muted-foreground">· {review.reviewType === "REAL" ? "GERÇEK" : "DEMO / TEST"}</span></strong><span className="text-[10px] text-muted-foreground">{review.reviewStatus ?? "DRAFT"} · Sıra {index + 1} · {review.verified ? "Doğrulandı" : "Doğrulama bekliyor"}</span></div><div className="flex"><Button size="icon" variant="ghost" className="size-7" aria-label="Yorumu yukarı taşı" disabled={index === 0} onClick={() => moveReview(review.id, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" className="size-7" aria-label="Yorumu aşağı taşı" disabled={index === reviews.length - 1} onClick={() => moveReview(review.id, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Yorumu sil" onClick={() => { if (window.confirm("Yorum silinsin mi?")) onChange({ items: section.items.filter((item) => item.id !== review.id) }); }}><Trash2 /></Button></div></div>
         <div className="mt-3 grid gap-3 sm:grid-cols-2">
           <Field label="Tür"><select className="admin-field mt-1 w-full" value={review.reviewType ?? "DEMO"} onChange={(event) => setItem(review.id, { reviewType: event.target.value as "REAL" | "DEMO", verified: false, published: false, reviewStatus: "DRAFT" })}><option value="REAL">GERÇEK</option><option value="DEMO">DEMO / TEST</option></select></Field>
           <Field label="Orijinal dil"><select className="admin-field mt-1 w-full" value={review.originalLanguage ?? "en"} onChange={(event) => setItem(review.id, { originalLanguage: event.target.value as UiLocale })}>{UI_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></Field>
           <LTInput label="Ad ve soyad baş harfi (orijinal)" value={review.title} lang={lang} uiLang={review.originalLanguage ?? "en"} onChange={(title) => setItem(review.id, { title })} />
           <Field label="Ülke / bayrak"><select className="admin-field mt-1 w-full" value={review.countryCode ?? ""} onChange={(event) => setItem(review.id, { countryCode: event.target.value })}><option value="">Ülke seç</option>{reviewCountries.map((code) => <option key={code} value={code}>{countryLabel(code)} ({code})</option>)}</select></Field>
           <div className="sm:col-span-2"><LTInput label="Orijinal yorum (otomatik çeviri yapılmaz)" value={review.text} lang={lang} uiLang={review.originalLanguage ?? "en"} multiline onChange={(text) => setItem(review.id, { text })} /></div>
           <MediaField label="Müşteri avatarı" value={review.mediaId} onChange={(mediaId) => setItem(review.id, { mediaId })} category="GLOBAL" />
           <Field label="Puan"><select className="admin-field mt-1 w-full" value={review.rating} onChange={(event) => setItem(review.id, { rating: Number(event.target.value) })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></Field>
           <Field label="Yorum tarihi"><input type="date" className="admin-field mt-1 w-full" value={review.reviewDate ?? ""} onChange={(event) => setItem(review.id, { reviewDate: event.target.value })} /></Field>
           <Field label="Durum"><select className="admin-field mt-1 w-full" value={review.reviewStatus ?? "DRAFT"} onChange={(event) => setItem(review.id, { reviewStatus: event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED", published: event.target.value === "PUBLISHED" })}><option value="DRAFT">Taslak</option><option value="PUBLISHED">Yayın için hazır</option><option value="ARCHIVED">Arşiv</option></select></Field>
         </div>
         <div className="mt-3 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={review.verified} disabled={review.reviewType !== "REAL"} onChange={(event) => setItem(review.id, { verified: event.target.checked })} />Gerçek müşteri olarak doğrulandı</label></div>
      </li>)}</ul>
    </div>
  </div>;
}

function ItemsEditor({ mode, page, items, lang, onChange }: { mode: NonNullable<(typeof V2_ITEM_MODE)[keyof typeof V2_ITEM_MODE]>; page: V2PageId; items: V2Item[]; lang: Locale; onChange: (items: V2Item[]) => void }) {
  const [query, setQuery] = useState("");
  const set = (id: string, patch: Partial<V2Item>) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    onChange(next);
  };
  const blank = (): V2Item => ({ id: `item-${Math.random().toString(36).slice(2, 8)}`, visible: true, icon: mode === "benefit" ? "CheckCircle2" : "", entity: "", title: { tr: "", de: "", en: "" }, text: { tr: "", de: "", en: "" }, internalKey: "", cardType: "products", mediaId: null, href: "", labels: [], cta: { tr: "", de: "", en: "" }, imageAlt: { tr: "", de: "", en: "" }, focalX: 50, focalY: 50, rating: 5, verified: false, published: false });
  const isAirport = page === "lounge";
  const results = mode === "destination" && query.trim()
    ? (isAirport ? searchAirports(query, 8).map((a) => ({ code: a.iata, label: `${a.city.tr} (${a.iata})` })) : searchCountries(query, 8).map((c) => ({ code: c.iso, label: c.name.tr })))
      .filter((r) => !items.some((it) => it.entity === r.code))
    : [];
  const entityLabel = (code: string) => (isAirport ? (() => { const a = getAirportByIata(code); return a ? `${a.city.tr} (${a.iata})` : code; })() : getCountryByIso(code)?.name.tr ?? code);
  const title = { benefit: "Avantajlar", card: "Kartlar", faq: "Sorular", destination: isAirport ? "Havalimanları" : "Ülkeler", step: "Adımlar", info: "Bilgi kartları" }[mode];

  return (
    <div className="rounded-md border border-border p-2">
      <p className="mb-2 text-xs font-bold">{title} · {items.filter((i) => i.visible).length}/{items.length} görünür</p>
      <ul className="space-y-2">
        {items.map((it, index) => (
          <li key={it.id} className={`rounded-md border border-border bg-background p-2 ${it.visible ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-1">
              {mode === "benefit" && <StorefrontIcon name={it.icon} className="size-4 text-primary" />}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{mode === "destination" ? entityLabel(it.entity) : it.title[lang] || it.title.tr || "(boş)"}</span>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Yukarı" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Aşağı" disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" className="size-7" aria-label={it.visible ? "Gizle" : "Göster"} onClick={() => set(it.id, { visible: !it.visible })}>{it.visible ? <Eye /> : <EyeOff />}</Button>
              <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Kaldır" onClick={() => onChange(items.filter((x) => x.id !== it.id))}><Trash2 /></Button>
            </div>
            {mode !== "destination" && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {mode === "benefit" && <IconPicker value={it.icon} onChange={(icon) => set(it.id, { icon })} />}
                <LTInput label={mode === "faq" ? "Soru" : "Başlık"} lang={lang} value={it.title} onChange={(title) => set(it.id, { title })} />
                {(mode === "card" || mode === "faq") && <LTInput label={mode === "faq" ? "Cevap" : "Metin"} lang={lang} value={it.text} onChange={(text) => set(it.id, { text })} multiline />}
              </div>
            )}
          </li>
        ))}
      </ul>
      {mode === "destination" ? (
        <div className="mt-2">
          <input className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder={isAirport ? "Havalimanı ekle (IST, Frankfurt…)" : "Ülke ekle (İtalya, Japonya…)"} value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{results.map((r) => <Button key={r.code} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { onChange([...items, { ...blank(), id: `${isAirport ? "a" : "c"}-${r.code}`, entity: r.code }]); setQuery(""); }}><Plus />{r.label}</Button>)}</div>}
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => onChange([...items, blank()])}><Plus />Ekle</Button>
      )}
    </div>
  );
}
