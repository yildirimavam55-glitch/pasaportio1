import { CardDesignControls } from "@/components/admin/CardDesignControls";
import { blockContract } from "@/domain/storefront/block-registry";
import { ResponsivePreview } from "@/components/admin/ResponsivePreview";
import { EditorialItemControls } from "@/components/admin/EditorialItemControls";
import { ResponsiveMediaControls } from "@/components/admin/ResponsiveMediaControls";
import { V2PageTranslation } from "@/components/design-v2/V2PageTranslation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Eye, EyeOff, GripVertical, History, Lock, Menu, Redo2, Undo2, Plus, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { MediaField } from "@/components/admin/MediaPicker";
import { HomepageImagesEditor } from '@/components/admin/HomepageImagesEditor';
import { V2TurkishTextEditor } from "@/components/design-v2/V2TurkishTextEditor";
import { manualEdit, sourceEdit, needsMachineTranslation, mergeMachineTranslation, mergeTranslatedDraft } from "@/domain/storefront/translation-workflow";
import { V2TypographyControls } from "@/components/design-v2/V2TypographyControls";
import { ImageDisplayControls } from "@/components/admin/ImageDisplayControls";
import { DEFAULT_IMAGE_DISPLAY, ESIM_DESKTOP_IMAGE_DISPLAY } from "@/domain/storefront/image-display";
import { IconPicker } from "@/components/admin/IconPicker";
import { Button } from "@/components/ui/button";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { listMedia } from "@/lib/admin-media.functions";
import { translateReview } from "@/lib/review-translate.functions";
import { translateTrustCopy } from "@/lib/trust-translate.functions";
import { useServerFn } from "@tanstack/react-start";
import { discardV2Draft, getV2PageEditor, restoreV2Version, saveV2Page } from "@/lib/v2-storefront.functions";
import { V2_BUILTIN_URLS, V2_PREVIEW_FOCUS, V2_PREVIEW_SELECT, V2_PREVIEW_WINDOW } from "@/components/design-v2/V2Sections";
import { createDraftHistory, pushDraftHistory, redoDraftHistory, undoDraftHistory, type DraftHistory } from "@/domain/storefront/draft-history";
import {
  createV2Section,
  defaultV2Page,
  missingV2Translations,
  V2_ADDABLE,
  V2_ALIGNS,
  V2_DESIGN_ALIGNMENTS,
  V2_DESIGN_BACKGROUNDS,
  V2_DESIGN_FONTS,
  V2_DESIGN_LINES,
  V2_DESIGN_POSITIONS,
  V2_DESIGN_RADII,
  V2_DESIGN_SPACING,
  V2_DESIGN_TRACKING,
  V2_DESIGN_WEIGHTS,
  V2_DESIGN_WIDTHS,
  V2_HEIGHTS,
  V2_ITEM_MODE,
  V2_ITEM_LINKS,
  V2_OVERLAYS,
  V2_PAGES,
  comparisonFigures,
  V2_PROTECTED,
  V2_SAFE_LINKS,
  V2_SECTION_LABELS,
  V2_SINGLETON,
  V2_TEXT_FIELDS,
  editorialReviewCards,
  ltStatus,
  type LT,
  type V2Item,
  type V2ItemLink,
  type V2PageConfig,
  type V2PageId,
  type V2Section,
} from "@/domain/storefront/v2";
import { getCountryByIso, searchCountries } from "@/domain/geo/countries";
import { getAirportByIata, searchAirports } from "@/domain/geo/airports";
import type { Locale } from "@/domain/enums";
import { LOCALE_REGISTRY, UI_LOCALES, type UiLocale } from "@/i18n/locales";

const PAGE_LABEL: Record<V2PageId, string> = { esim: "eSIM ana sayfası", lounge: "Lounge ana sayfası", vignette: "Vignette ana sayfası" };
const LINK_LABEL: Record<string, string> = { "": "Varsayılan hedef", "/esim": "eSIM", "/lounge": "Lounge", "/vignette": "Vignette", "/destek": "Destek / kurulum rehberi", "/sepet": "Sepet", "/account": "Hesabım", "/legal/terms": "Kullanım koşulları", "/legal/refund": "İade koşulları" };
const DEVICES = [{ id: "mobile", label: "Mobil · 390", w: 390 }, { id: "tablet", label: "Tablet · 768", w: 768 }, { id: "desktop", label: "Masaüstü · 1440", w: 1440 }] as const;
const PREVIEW_BOX = { width: 400, height: 760 };
const PRESET = { left: "Sola", center: "Orta", compact: "Kompakt", normal: "Normal", tall: "Yüksek", light: "Hafif", strong: "Güçlü" } as Record<string, string>;
const DESIGN_LABELS: Record<string, string> = { default: "pasaport.io varsayılanı", narrow: "Dar", wide: "Geniş", full: "Tam genişlik", brand: "Marka", dark: "Koyu", custom: "Özel renk", small: "Küçük", medium: "Orta", large: "Büyük", theme: "Tema varsayılanı", heading: "Başlık yazı tipi", body: "Gövde yazı tipi", semibold: "Yarı kalın", bold: "Kalın", tight: "Sıkı", relaxed: "Rahat", right: "Sağ" };

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
  const [baseRevision,setBaseRevision]=useState<number|null>(null);
  const savingSnapshot=useRef<V2PageConfig|null>(null);
  const [selectedId, setSelectedId] = useState<string>("hero");
  const lang: Locale = "tr";
  const [previewLocale, setPreviewLocale] = useState<UiLocale>("tr");
  const draftRef = useRef<V2PageConfig | null>(null);
  draftRef.current = draft;
  const [trustPreviewLocale, setTrustPreviewLocale] = useState<UiLocale | null>(null);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("mobile");
  const [dragId, setDragId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [translatingTrust, setTranslatingTrust] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [history, setHistory] = useState<DraftHistory<V2PageConfig>>(createDraftHistory);
  const lastEdit = useRef(0);

  useEffect(() => { if (editor.data && !dirty) { setDraft(editor.data.draft); setBaseRevision(editor.data.revision??null); setHistory(createDraftHistory()); } }, [editor.data, dirty]);
  useEffect(() => {
    const selectHash = () => { if (window.location.hash === "#reviews") setSelectedId("trust-reviews"); };
    selectHash();
    window.addEventListener("hashchange", selectHash);
    return () => window.removeEventListener("hashchange", selectHash);
  }, []);

  const media = useMemo(() => Object.fromEntries((mediaList.data ?? []).filter((m) => m.url).map((m) => [m.id, { url: m.url as string, alt: m.altText ?? "", ...(m.width && m.height ? { width: m.width, height: m.height } : {}) }])), [mediaList.data]);
  const pushPreview = useCallback(() => {
    if (!draft || !frame.current?.contentWindow) return;
    frame.current.contentWindow.postMessage({ type: "v2-cms-preview", page, config: draft, media, locale: previewLocale }, window.location.origin);
  }, [draft, media, page, previewLocale]);
  useEffect(() => { pushPreview(); }, [pushPreview]);
  useEffect(() => {
    const onReady = (event: MessageEvent) => { if (event.origin === window.location.origin && event.data?.type === "v2-cms-ready" && event.data.page === page) pushPreview(); };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [page, pushPreview]);
  // Click-to-edit: the preview frame reports the clicked section; open its settings.
  useEffect(() => {
    const onSelect = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === V2_PREVIEW_SELECT && event.data.page === page && typeof event.data.id === "string") setSelectedId(event.data.id);
    };
    window.addEventListener("message", onSelect);
    return () => window.removeEventListener("message", onSelect);
  }, [page]);
  const selectFromList = (id: string) => {
    setSelectedId(id);
    frame.current?.contentWindow?.postMessage({ type: V2_PREVIEW_FOCUS, page, id }, window.location.origin);
  };

  const refresh = () => { setDirty(false); void queryClient.invalidateQueries({ queryKey: ["v2-editor", page] }); void queryClient.invalidateQueries({ queryKey: ["v2-storefront", page] }); };
  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const snapshot = draft!;
      savingSnapshot.current=snapshot;
      let config = snapshot;
      if (draftRef.current !== snapshot) throw new Error("Taslak değişti; yeniden kontrol edip kaydedin.");
      return saveV2Page({ data: { page, config, publish,expectedRevision:baseRevision } });
    },
    onSuccess: (_r, publish) => { if(draftRef.current!==savingSnapshot.current){void queryClient.invalidateQueries({queryKey:["v2-editor",page]});toast.info("Kaydedilen sürümden sonra düzenlemeler var; yerel metinler korundu. Revizyonu karşılaştırıp yeniden yükleyin.");return;} toast.success(publish ? "Yayınlandı." : "Taslak kaydedildi."); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Kaydedilemedi."),
  });
  const discard = useMutation({ mutationFn: () => discardV2Draft({ data: { page,expectedRevision:baseRevision } }), onSuccess: () => { toast.success("Taslak yayındaki sürüme döndü."); refresh(); } });
  const restore = useMutation({
    mutationFn: (versionId: string) => restoreV2Version({ data: { page, versionId,expectedRevision:baseRevision } }),
    onSuccess: () => { toast.success("Sürüm taslağa geri yüklendi. Canlı sürüm değişmedi."); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Geri yüklenemedi."),
  });

  if (editor.isLoading || !draft) return <AdminLoading />;
  if (editor.error) return <AdminError error={editor.error} />;

  const update = (next: V2PageConfig) => {
    const now = Date.now();
    // Rapid typing collapses into one undo step.
    if (now - lastEdit.current > 600) setHistory((h) => pushDraftHistory(h, draft));
    lastEdit.current = now;
    setDraft(next); setDirty(true);
  };
  const undo = () => { const result = undoDraftHistory(history, draft); if (!result) return; lastEdit.current = 0; setHistory(result.history); setDraft(result.value); setDirty(true); };
  const redo = () => { const result = redoDraftHistory(history, draft); if (!result) return; lastEdit.current = 0; setHistory(result.history); setDraft(result.value); setDirty(true); };
  const translateTrust = async () => {
    const target = draft.sections.find((section) => section.id === selectedId) ?? draft.sections.find((section) => section.type === "TRUST_REVIEWS");
    if (!target || translatingTrust) return;
    setTranslatingTrust(true);
    try {
      const result = await translateSection(page, draft, target.id);
      if (!result.count && !result.failures) { toast.info("Çevrilecek yeni Türkçe metin yok."); return; }
      update(mergeTranslatedDraft(draftRef.current ?? draft, draft, result.config));
      if (result.failures) toast.warning("Çevirilerin bir kısmı eksik. Başarılı sonuçlar korundu; eksikleri yeniden deneyin.");
      else toast.success("Sonuçlar kontrol edildi. Değişmiş kaynaklar ve elle düzenlenen metinler korunur; durumları gözden geçirin.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Çeviri başarısız oldu."); }
    finally { setTranslatingTrust(false); }
  };
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
        <div className="flex rounded-md border border-border p-0.5" aria-label="Düzenlenen sayfa">{V2_PAGES.map((id) => <Button key={id} asChild size="sm" variant={id === page ? "default" : "ghost"}><Link to="/admin/storefront/v2/$page" params={{ page: id }}>{id === "esim" ? "Ana sayfa" : PAGE_LABEL[id]}</Link></Button>)}</div>
        <Button variant="outline" size="sm" aria-label="Geri al" title="Geri al (yalnız taslak)" disabled={!history.past.length} onClick={undo}><Undo2 />Geri al</Button>
        <Button variant="outline" size="sm" aria-label="İleri al" title="İleri al (yalnız taslak)" disabled={!history.future.length} onClick={redo}><Redo2 />İleri al</Button>
        <Button asChild variant="outline" size="sm"><Link to="/admin/storefront/navigation"><Menu />Menü & alt bilgi</Link></Button>
        <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}><History />Geçmiş</Button>
        <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Tüm sayfa onaylı varsayılan tasarıma dönsün mü? (Kaydedene kadar yalnız taslakta)")) update(defaults); }}><RotateCcw />Varsayılana dön</Button>
        {editor.data?.hasDraftChanges && !dirty && <Button variant="outline" size="sm" onClick={() => discard.mutate()}>Taslağı at</Button>}
        {draft && <V2PageTranslation page={draft} onChange={config=>{setDraft(config);setDirty(true);}} transport={input=>translateTrustCopy({data:input})} />}
        <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate(false)}><Save />Entwurf speichern</Button>
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
                  <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => { if (window.confirm("Bu sürüm yalnızca taslağa geri yüklensin mi? Canlı sürüm değişmeyecek.")) restore.mutate(v.id); }}>Taslağa geri yükle</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground">Henüz kayıtlı sürüm yok.</p>}
        </AdminPanel>
      )}

      <div className="grid gap-3 2xl:grid-cols-[16rem_minmax(0,1fr)_minmax(0,26rem)]">
        <AdminPanel title="Bölümler">
          <ol className="space-y-1">
            {sections.map((s, index) => {
              const locked = V2_PROTECTED.includes(s.type);
              return (
                <li key={s.id} draggable={!locked} onDragStart={() => setDragId(s.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(s.id)}
                  className={`flex items-center gap-1 rounded-md border p-1.5 text-xs ${s.id === selected.id ? "border-primary bg-primary-soft" : "border-border bg-background"} ${s.visible ? "" : "opacity-60"}`}>
                  {locked ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />}
                  <button type="button" onClick={() => selectFromList(s.id)} className="min-w-0 flex-1 truncate text-left font-semibold">{V2_SECTION_LABELS[s.type]}<span className="block truncate text-[10px] font-normal text-muted-foreground">{s.text["title"]?.tr || s.id}</span></button>
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
          <p className="mb-3 text-xs font-bold">TR – Hauptsprache / Ana dil</p>
          <label className="mb-3 block text-xs">Vorschau in: / Önizleme dili
            <select aria-label="Vorschau in" value={previewLocale} className="admin-field mt-1 w-full" onChange={e => setPreviewLocale(e.target.value as UiLocale)}>{UI_LOCALES.map(code => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select>
          </label>
          {V2_PROTECTED.includes(selected.type) && <p className="mb-3 rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Arama mantığı kodda korunur. Burada yalnızca metin, görsel ve görünüm ön ayarları değişir; bölüm gizlenemez veya taşınamaz.</p>}
           {<div className="mb-3 flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={translatingTrust} onClick={() => void translateTrust()}>{translatingTrust ? "Çevriliyor…" : "Alle 13 Sprachen übersetzen"}</Button><span className="text-xs text-muted-foreground">Türkçe kaynak 13 dile çevrilir; elle düzenlenen çeviriler korunur. Gerçek çeviri, servis yapılandırılıp ayrıca onaylandıktan sonra kullanılabilir; yayınlamaz.</span></div>}
          <LocaleStatusRow section={selected} />
          <SectionDesignEditor section={selected} onChange={(design) => patchSection(selected.id, design ? { design } : { design: undefined } as unknown as Partial<V2Section>)} />
          <SectionForm section={selected} previewLocale={previewLocale} lang={lang} page={page} trustPreviewLocale={trustPreviewLocale} onTrustLocale={setTrustPreviewLocale} onTrustSourceBlur={() => void translateTrust()} onChange={(patch) => patchSection(selected.id, patch)} />
        </AdminPanel>

        <AdminPanel title="Önizleme (taslak)" className="min-w-0" action={
          <div className="flex flex-wrap gap-1" role="group" aria-label="Önizleme cihazı">{DEVICES.map((d) => <Button key={d.id} size="sm" aria-pressed={device === d.id} variant={device === d.id ? "default" : "outline"} className="h-7 px-2 text-[11px]" onClick={() => setDevice(d.id)}>{d.label}</Button>)}</div>}>
          <ResponsivePreview width={width} height={PREVIEW_BOX.height}>{scale=><div className="overflow-hidden rounded-md border border-border bg-secondary/40">
            <iframe
              ref={frame}
              name={V2_PREVIEW_WINDOW}
              title="V2 önizleme"
              src={page === "esim" ? "/esim?country=" : page === "lounge" ? "/lounge?iata=" : "/vignette"}
              onLoad={pushPreview}
              data-preview-width={width}
              style={{ width, height: Math.round(PREVIEW_BOX.height / scale), transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left" }}
              className="block bg-background"
            />
          </div>}</ResponsivePreview>
          <p className="mt-2 text-[10px] text-muted-foreground">Bir bölüme tıklayınca ayarları açılır. Geri al / ileri al yalnız bu taslağı değiştirir. Önizleme yalnızca sende görünür. Müşteriler “Yayınla” diyene kadar mevcut yayındaki sürümü görür.</p>
        </AdminPanel>
      </div>
    </div>
  );
}

const DEFAULT_DESIGN: NonNullable<V2Section["design"]> = { width: "default", spacing: "default", background: "default", radius: "default", font: "theme", weight: "default", lineHeight: "default", letterSpacing: "default", textAlign: "default", position: "top-left" };

function SectionDesignEditor({ section, onChange }: { section: V2Section; onChange: (design: NonNullable<V2Section["design"]> | undefined) => void }) {
  const design = section.design ?? DEFAULT_DESIGN;
  const set = (patch: Partial<typeof design>) => onChange({ ...design, ...patch });
  const setResponsive = (device: "desktop" | "tablet" | "mobile", key: "headingSize" | "bodySize", value: string) => set({ [device]: { ...design[device], [key]: value ? Number(value) : undefined } });
  const enhanced = section.type === "SEARCH_HERO" || section.type === "NOTICE";
  const positionSupported = section.type !== "SEARCH_HERO" && section.type !== "SPACER";
  return (
    <details className="mb-4 rounded-md border border-border bg-secondary/30 p-3">
      <summary className="cursor-pointer text-xs font-bold">Tasarım ayarları</summary>
      <p className="mt-2 text-[11px] text-muted-foreground">Bu ayarlar tüm dillerde ortaktır. Boş veya varsayılan değerler mevcut pasaport.io görünümünü aynen korur.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Select label="İçerik genişliği" value={design.width} options={V2_DESIGN_WIDTHS} labels={DESIGN_LABELS} onChange={(width) => set({ width })} />
        <Select label="Bölüm aralığı" value={design.spacing} options={V2_DESIGN_SPACING} labels={DESIGN_LABELS} onChange={(spacing) => set({ spacing })} />
        <Select label="Arka plan" value={design.background} options={V2_DESIGN_BACKGROUNDS} labels={DESIGN_LABELS} onChange={(background) => set({ background })} />
        {design.background === "custom" && <Field label="Özel arka plan rengi"><input type="color" className="admin-field mt-1 h-10 w-full" value={design.customColor ?? "#faf7ef"} onChange={(event) => set({ customColor: event.target.value })} /></Field>}
        <Select label="Köşe yuvarlaklığı" value={design.radius} options={V2_DESIGN_RADII} labels={DESIGN_LABELS} onChange={(radius) => set({ radius })} />
        {!enhanced && <Select label="Yazı tipi" value={design.font} options={V2_DESIGN_FONTS} labels={DESIGN_LABELS} onChange={(font) => set({ font })} />}
        <Select label="Yazı kalınlığı" value={design.weight} options={V2_DESIGN_WEIGHTS} labels={DESIGN_LABELS} onChange={(weight) => set({ weight })} />
        <Select label="Satır yüksekliği" value={design.lineHeight} options={V2_DESIGN_LINES} labels={DESIGN_LABELS} onChange={(lineHeight) => set({ lineHeight })} />
        <Select label="Harf aralığı" value={design.letterSpacing} options={V2_DESIGN_TRACKING} labels={DESIGN_LABELS} onChange={(letterSpacing) => set({ letterSpacing })} />
        <Select label="Metin hizası" value={design.textAlign} options={V2_DESIGN_ALIGNMENTS} labels={DESIGN_LABELS} onChange={(textAlign) => set({ textAlign })} />
      </div>
      {positionSupported && <div className="mt-3"><p className="mb-2 text-xs font-semibold">İçerik konumu</p><div className="grid w-44 grid-cols-3 gap-1">{V2_DESIGN_POSITIONS.map((position) => <Button key={position} type="button" size="icon" variant={design.position === position ? "default" : "outline"} className="size-9" title={position} aria-label={position} onClick={() => set({ position })}><span className="size-2 rounded-full bg-current" /></Button>)}</div></div>}
      {!enhanced && <div className="mt-4 grid gap-3 sm:grid-cols-3">{(["desktop", "tablet", "mobile"] as const).map((device) => <div key={device} className="rounded-md border border-border bg-background p-2"><p className="text-xs font-bold capitalize">{device}</p><Field label="Başlık px"><input type="number" min="18" max="80" className="admin-field mt-1 w-full" value={design[device]?.headingSize ?? ""} placeholder="Varsayılan" onChange={(event) => setResponsive(device, "headingSize", event.target.value)} /></Field><Field label="Metin px"><input type="number" min="11" max="28" className="admin-field mt-1 w-full" value={design[device]?.bodySize ?? ""} placeholder="Varsayılan" onChange={(event) => setResponsive(device, "bodySize", event.target.value)} /></Field></div>)}</div>}
      {(section.type === "SEARCH_HERO" || section.type === "NOTICE") && <V2TypographyControls design={design} onChange={onChange} />}
      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => onChange(undefined)}><RotateCcw />Tasarımı varsayılana döndür</Button>
    </details>
  );
}

const NUMERIC_TEXT = ["statistic", "comparisonAValue", "comparisonBValue", "comparisonHighlight"];
type LTRef = { id: string; value: LT | undefined; original?: LT | undefined };
function sectionLTs(section: V2Section, defaultSection?: V2Section): LTRef[] {
  const refs: LTRef[] = [];
  for (const key of Object.keys(section.text)) if (!NUMERIC_TEXT.includes(key)) refs.push({ id: `text:${key}`, value: section.text[key], original: defaultSection?.text[key] });
  const translatable = (item: V2Item) => section.type === "TRUST_REVIEWS" ? item.cardType === "trust" || item.cardType === "chip" : item.cardType !== "review";
  for (const item of section.items.filter(translatable)) {
    const original = defaultSection?.items.find((row) => row.id === item.id);
    for (const field of ["title", "text", "imageAlt", "cta"] as const) refs.push({ id: `item:${item.id}:${field}`, value: item[field], original: original?.[field] });
    item.labels.forEach((label, index) => refs.push({ id: `item:${item.id}:label:${index}`, value: label, original: original?.labels[index] }));
  }
  if (section.trust) {
    refs.push({ id: "trust:manualCaption", value: section.trust.manualCaption, original: defaultSection?.trust?.manualCaption });
    if (section.trust.comparisonImageAlt) refs.push({ id: "trust:comparisonImageAlt", value: section.trust.comparisonImageAlt, original: defaultSection?.trust?.comparisonImageAlt });
  }
  return refs;
}
/** Only missing or stale machine-owned values qualify; manual and unknown legacy values remain protected. */
function needsTranslation(value: LT, code: UiLocale, _original?: LT) { return needsMachineTranslation(value, code); }
async function translateSection(page: V2PageId, config: V2PageConfig, sectionId: string): Promise<{ config: V2PageConfig; count: number; failures: number }> {
  const section = config.sections.find((row) => row.id === sectionId);
  if (!section) return { config, count: 0, failures: 0 };
  const defaults = defaultV2Page(page).sections;
  const defaultSection = defaults.find((row) => row.id === section.id) ?? defaults.find((row) => row.type === section.type);
  const entries: Record<string, string> = {};
  for (const ref of sectionLTs(section, defaultSection)) {
    const value = ref.value;
    if (value?.tr?.trim() && UI_LOCALES.some((code) => code !== "tr" && needsTranslation(value, code, ref.original))) entries[ref.id] = value.tr.trim();
  }
  const ids = Object.keys(entries);
  if (!ids.length) return { config, count: 0, failures: 0 };
  const translations: Record<string, Record<string, string>> = {};
  let failures = 0;
  const refs = sectionLTs(section, defaultSection);
  for (let index = 0; index < ids.length; index += 6) {
    const batch = ids.slice(index, index + 6);
    let result;
    try { result = await translateTrustCopy({ data: { entries: Object.fromEntries(batch.map(id => [id, entries[id]!])), targets: Object.fromEntries(batch.map(id => [id, UI_LOCALES.filter(code => code !== "tr" && needsMachineTranslation(refs.find(ref => ref.id === id)?.value, code))])) } }); } catch (error) { if (!Object.keys(translations).length) throw error; failures += ids.length - index; break; }
    Object.assign(translations, result.translations);
    failures += Object.keys(result.failures).length;
  }
  const merge = (id: string, value: LT | undefined, _original?: LT): any => value && translations[id] ? mergeMachineTranslation(value, value, translations[id]!) : value;
  const orig = (key: string) => defaultSection?.text[key];
  const translatable = (item: V2Item) => section.type === "TRUST_REVIEWS" ? item.cardType === "trust" || item.cardType === "chip" : item.cardType !== "review";
  const next: V2Section = {
    ...section,
    text: Object.fromEntries(Object.entries(section.text).map(([key, value]) => [key, NUMERIC_TEXT.includes(key) ? value : merge(`text:${key}`, value, orig(key))])),
    items: section.items.map((item) => {
      if (!translatable(item)) return item;
      const original = defaultSection?.items.find((row) => row.id === item.id);
      return { ...item, title: merge(`item:${item.id}:title`, item.title, original?.title), text: merge(`item:${item.id}:text`, item.text, original?.text), imageAlt: merge(`item:${item.id}:imageAlt`, item.imageAlt, original?.imageAlt), cta: merge(`item:${item.id}:cta`, item.cta, original?.cta), labels: item.labels.map((label, index) => merge(`item:${item.id}:label:${index}`, label, original?.labels[index])) };
    }),
    ...(section.trust ? { trust: { ...section.trust, manualCaption: merge("trust:manualCaption", section.trust.manualCaption, defaultSection?.trust?.manualCaption), ...(section.trust.comparisonImageAlt ? { comparisonImageAlt: merge("trust:comparisonImageAlt", section.trust.comparisonImageAlt, defaultSection?.trust?.comparisonImageAlt) } : {}) } } : {}),
  };
  return { config: { ...config, sections: config.sections.map((row) => row.id === section.id ? next : row) }, count: Object.keys(translations).length, failures };
}
function LocaleStatusRow({ section }: { section: V2Section }) {
  const refs = sectionLTs(section).filter((ref) => ref.value?.tr?.trim());
  if (!refs.length) return null;
  const rank = ["MISSING", "OUTDATED", "MANUALLY_EDITED", "AUTO_TRANSLATED", "SOURCE"] as const;
  return (
    <div className="mb-3 flex flex-wrap gap-1" aria-label="Dil durumları">
      {UI_LOCALES.map((code) => {
        const status = rank.find((s) => refs.some((ref) => ltStatus(ref.value, code) === s)) ?? "SOURCE";
        const label = status === "MISSING" ? "EKSİK" : status === "OUTDATED" ? "OUTDATED / MANUALLY_EDITED" : status;
        const tone = status === "MISSING" || status === "OUTDATED" ? "bg-warning/20" : status === "MANUALLY_EDITED" ? "bg-secondary" : "bg-primary/10";
        return <span key={code} data-locale-status={status} className={`rounded px-1.5 py-0.5 text-[10px] ${tone}`}>{code.toUpperCase()} {label}{status === "SOURCE" || status === "AUTO_TRANSLATED" ? " ✓" : ""}</span>;
      })}
    </div>
  );
}

function LTInput({ label, value, lang, onChange, multiline = false, uiLang, onSourceBlur }: { label: string; value: LT | undefined; lang: Locale; onChange: (v: LT) => void; multiline?: boolean; uiLang?: UiLocale; onSourceBlur?: () => void }) {
  const code = uiLang ?? lang;
  const current = value ?? { tr: "", de: "", en: "" };
  const cls = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-normal";
  return (
    <Field label={`${label} · ${code.toUpperCase()}${onSourceBlur ? ` · ${{ SOURCE: "SOURCE", MISSING: "EKSİK", AUTO_TRANSLATED: "AUTO_TRANSLATED", MANUALLY_EDITED: "MANUALLY_EDITED", OUTDATED: "OUTDATED / MANUALLY_EDITED" }[ltStatus(current, code)]}` : ""}`} {...(code !== "tr" && current.tr ? { hint: `TR: ${current.tr}` } : {})}>
      {multiline
        ? <textarea rows={3} className={cls} value={current[code] ?? ""} onChange={(e) => onChange(code === "tr" ? sourceEdit(current, e.target.value) : manualEdit(current, code, e.target.value))} />
        : <input className={cls} value={current[code] ?? ""} onChange={(e) => onChange(code === "tr" ? sourceEdit(current, e.target.value) : manualEdit(current, code, e.target.value))} />}
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

function ImageField({ label, value, onChange, category = "HERO" }: { label: string; value: string | null; onChange: (v: string | null) => void; category?: string }) {
  const builtin = value && V2_BUILTIN_URLS[value];
  return (
    <div className="space-y-1">
      {builtin && <div className="flex items-center gap-2 rounded-md border border-border p-2 text-xs"><img src={builtin} alt="" className="size-12 rounded object-cover" /><span className="flex-1">Onaylı varsayılan görsel</span><Button type="button" size="icon" variant="ghost" className="size-9" aria-label="Görseli kaldır" onClick={() => onChange(null)}><X className="size-4" /></Button></div>}
       <MediaField label={label} value={builtin ? null : value} onChange={onChange} category={category} fallbackUrl={builtin || undefined} recommendation={category === 'HERO' ? 'Masaüstü: 1920 × 800+ · mobil: portre · JPEG / WebP / AVIF' : '800 × 600 · JPEG / WebP / AVIF'} hint="Medya kütüphanesinden seç veya yükle. Varsayılan görsel varsa kaldırınca geri döner; taslak ve sürüm akışı korunur." />
    </div>
  );
}

function SectionForm({ section: s, lang, previewLocale, page, trustPreviewLocale, onTrustLocale, onTrustSourceBlur, onChange }: { section: V2Section; lang: Locale; previewLocale: UiLocale; page: V2PageId; trustPreviewLocale: UiLocale | null; onTrustLocale: (code: UiLocale) => void; onTrustSourceBlur: () => void; onChange: (patch: Partial<V2Section>) => void }) {
  const setText = (key: string, value: LT) => onChange({ text: { ...s.text, [key]: value }, ...(s.type === "SEARCH_HERO" && key === "title" ? { heroTextMode: { ...s.heroTextMode, [lang]: "custom" as const } } : {}) });
  const mode = V2_ITEM_MODE[s.type];
  const contract=blockContract(s.type);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Şema v{contract.schemaVersion} · {contract.unsupported.length?"Desteklenmeyen: "+contract.unsupported.join(", "):"Kayıtlı içerik ve görünüm alanları"}</p>
      {s.type==="INFO_GRID"&&<label>Baustein<select aria-label="Kart türü" value={s.variant} onChange={e=>onChange({variant:e.target.value})}><option value="default">Bilgi kartları</option><option value="security">Güven kartları · yayın için kanıt onayı gerekir</option></select></label>}
      <div className="grid gap-3 sm:grid-cols-2">
        {(s.type === "SEARCH_HERO" || s.type === "NOTICE") && <div className="sm:col-span-2"><V2TurkishTextEditor section={s} previewLocale={previewLocale} onChange={onChange} /></div>}
        {s.type !== "TRUST_REVIEWS" && s.type !== "SEARCH_HERO" && s.type !== "NOTICE" && blockContract(s.type).textFields.map(([key, label]) => <LTInput key={key} label={label} lang={lang} value={s.text[key]} onChange={(v) => setText(key, v)} multiline={key === "text" || key === "lead"} />)}
      </div>

      {s.type === "SEARCH_HERO" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-3"><ImageField label="Hero görseli (masaüstü + varsayılan)" value={s.mediaId} onChange={(v) => onChange({ mediaId: v })} />
            <ImageDisplayControls value={s.imageDisplay} defaults={page === "esim" && s.mediaId === "builtin:esim-hero" ? ESIM_DESKTOP_IMAGE_DISPLAY : DEFAULT_IMAGE_DISPLAY} onChange={(imageDisplay) => onChange({ imageDisplay, heroDesktopCrop: "custom" })} />
          </div>
          <div className="space-y-3"><ImageField label="Mobil hero görseli (isteğe bağlı)" value={s.mobileMediaId} onChange={(v) => onChange({ mobileMediaId: v })} />
            <ImageDisplayControls title="Mobil görsel ayarları" value={s.mobileImageDisplay} onChange={(mobileImageDisplay) => onChange({ mobileImageDisplay })} />
          </div>
          <div className="space-y-3"><ImageField label="Tablet hero görseli (isteğe bağlı · 640–1023 px)" value={s.tabletMediaId ?? null} onChange={(tabletMediaId) => onChange({ tabletMediaId })} />
            <ImageDisplayControls title="Tablet görsel ayarları" value={s.tabletImageDisplay} onChange={(tabletImageDisplay) => onChange({ tabletImageDisplay })} />
          </div>
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

      {s.type === "PROMO_BANNER" && <ResponsiveMediaControls value={s} onChange={onChange} picker={(label,value,onChange)=><MediaField label={label} value={value} onChange={onChange}/>}/>}
      {s.type === "INSTALLATION_STEPS" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Görünüm" value={s.variant === "simple" ? "simple" : "animated"} options={["animated", "simple"] as const} labels={{ animated: "Animasyonlu (dekoratif QR)", simple: "Sade adım listesi" }} onChange={(variant) => onChange({ variant })} />
          <Select label="Buton hedefi" value={s.href} options={V2_SAFE_LINKS} labels={LINK_LABEL} onChange={(href) => onChange({ href })} />
        </div>
      )}
      {s.type === "FAQ" && <Select label="Satır yüksekliği" value={s.variant === "comfortable" ? "comfortable" : "default"} options={["default", "comfortable"] as const} labels={{ default: "Kompakt", comfortable: "Rahat" }} onChange={(variant) => onChange({ variant })} />}
      {s.type === "SPACER" && <Select label="Boşluk" value={s.height} options={V2_HEIGHTS} onChange={(height) => onChange({ height })} />}
      {s.type === "DESTINATION_CAROUSEL" && <p className="rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Fiyatlar her zaman gerçek katalogdan gelir; yalnız yayınlanmış fiyatı olan destinasyonlar müşteriye görünür.</p>}
      {page === 'esim' && (s.type === 'DESTINATION_CAROUSEL' || s.type === 'REGION_DISCOVERY') && <HomepageImagesEditor key={s.id} section={s} onChange={onChange} />}
      {s.type === "REGION_DISCOVERY" && <>
        <p className="rounded-md bg-secondary p-2 text-[11px] text-muted-foreground">Bölgeler, ülke sayıları ve fiyatlar gerçek katalogdan otomatik gelir.</p>

      </>}
      {s.type === "TRUST_REVIEWS" && <div className="grid gap-3 sm:grid-cols-2">{V2_TEXT_FIELDS.TRUST_REVIEWS.filter(([key])=>key.startsWith("family")).map(([key,label])=><LTInput key={key} label={label} lang={lang} uiLang={trustPreviewLocale ?? lang} value={s.text[key]} onSourceBlur={onTrustSourceBlur} onChange={value=>setText(key,value)} />)}</div>}
      {s.type === "TRUST_REVIEWS" && <TrustReviewsEditor section={s} lang={lang} uiLang={trustPreviewLocale ?? lang} onUiLang={onTrustLocale} onSourceBlur={onTrustSourceBlur} onChange={onChange} />}
      {page === "lounge" && !V2_PROTECTED.includes(s.type) && s.type !== "DESTINATION_CAROUSEL" && (
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={s.showOnResults} onChange={(e) => onChange({ showOnResults: e.target.checked })} />Havalimanı sonuçlarının altında da göster</label>
      )}

      {s.type === 'TRUST_REVIEWS' && <p className="text-xs text-muted-foreground">Roaming ve rakip karşılaştırmaları ana sayfada gösterilmez. Eski değerler ve sürümler korunur.</p>}
      {mode && <ItemsEditor mode={mode} page={page} items={s.items} lang={lang} onChange={(items) => onChange({ items })} />}
    </div>
  );
}

function TrustReviewsEditor({ section, lang, uiLang, onUiLang, onSourceBlur, onChange }: { section: V2Section; lang: Locale; uiLang: UiLocale; onUiLang: (code: UiLocale) => void; onSourceBlur: () => void; onChange: (patch: Partial<V2Section>) => void }) {
  const trustItems = section.items.filter((item) => item.cardType === "trust");
  const chips = section.items.filter((item) => item.cardType === "chip");
  const settings = section.trust;
  const setTrust = (patch: Partial<NonNullable<V2Section["trust"]>>) => onChange({ trust: { background: "mint", focal: "right", ratingMode: "real", manualRating: 4.8, maxRating: 5, manualCaption: { tr: "", de: "", en: "" }, autoplay: false, whyEnabled: true, comparisonEnabled: false, comparisonPreviewOnly: true, illustrationId: null, ...settings, ...patch } });
  const moveItem = (id: string, delta: number) => { const next = [...section.items]; const index = next.findIndex((item) => item.id === id); const target = index + delta; if (index < 0 || target < 0 || target >= next.length || next[target]?.cardType !== next[index]?.cardType) return; const moving = next[index]; const swapped = next[target]; if (!moving || !swapped) return; next[index] = swapped; next[target] = moving; onChange({ items: next }); };
  const addItem = (cardType: "chip" | "trust") => { if (section.items.length >= 30) return; const id = `${cardType}-${Math.random().toString(36).slice(2, 8)}`; onChange({ items: [...section.items, { id, visible: true, icon: "Globe2", entity: "", title: { tr: "", de: "", en: "" }, text: { tr: "", de: "", en: "" }, internalKey: id, cardType, mediaId: null, href: "", labels: [], cta: { tr: "", de: "", en: "" }, imageAlt: { tr: "", de: "", en: "" }, focalX: 50, focalY: 50, position: "top-right", rating: 5, verified: false, published: false }] }); };
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
  const makeReview = (type: "REAL" | "EDITORIAL", code: UiLocale = uiLang, countryCode = "", name = "", body = ""): V2Item => {
    const id = `review-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    return { id, visible: true, icon: "", entity: "", title: { tr: "", de: "", en: "", [code]: name }, text: { tr: "", de: "", en: "", [code]: body }, internalKey: id, cardType: "review", mediaId: null, href: "", labels: [], cta: { tr: "", de: "", en: "" }, imageAlt: { tr: "", de: "", en: "" }, focalX: 50, focalY: 50, rating: 5, verified: false, published: false, reviewType: type, reviewStatus: "DRAFT", originalLanguage: code, countryCode, reviewDate: "", createdAt: now, updatedAt: now };
  };
  const addExamples = () => onChange({ items: [...section.items, ...editorialReviewCards().filter((entry) => !reviews.some((review) => review.id === entry.id)).slice(0, Math.max(0, 30 - section.items.length))], showDemoReviews: true });
  const reviewCountries = ["TR", "DE", "IT", "JP", "US", "CA", "TH", "FR", "ES", "GB", "NL", "PT", "PL", "AE", "CH", "AT"];
  const countryLabel = (code: string) => new Intl.DisplayNames([LOCALE_REGISTRY[uiLang].bcp47], { type: "region" }).of(code) ?? code;

  return <div className="space-y-4">
    <p className="rounded-md bg-warning/10 p-2 text-xs text-foreground">Yayınlamadan önce bu bilginin doğruluğunu kontrol edin. Manuel puanlar ve fiyat karşılaştırmaları müşteri verisi değildir.</p>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">Google + Trustpilot birleşik puanı</p><p className="my-2 text-xs text-muted-foreground">Gerçek birleşik puan, kaynak puanları ve yorum sayılarıyla ağırlıklı hesaplanır. Her iki kaynağın bağlantısını ve doğruluğunu onaylayın. Örnek 4.8 / 210 yalnız önizlemede görünür.</p>{(['Google','Trustpilot'] as const).map(source => {
      const row = settings?.sourceRatings?.find(r => r.source === source) ?? { source, rating: 0, count: 0, sourceUrl: '', verified: false };
      const update = (patch: Partial<typeof row>) => setTrust({ sourceRatings: [...(settings?.sourceRatings ?? []).filter(r => r.source !== source), { ...row, ...patch, verified: patch.verified ?? false }] });
      return <div key={source} className="my-3 grid gap-2 sm:grid-cols-2"><p className="text-xs font-bold sm:col-span-2">{source}</p><Field label="Kaynak puanı"><input className="admin-field w-full" type="number" min="0" max="5" step="0.1" value={row.rating} onChange={e => update({ rating: Number(e.target.value) })}/></Field><Field label="Toplam yorum"><input className="admin-field w-full" type="number" min="0" step="1" value={row.count} onChange={e => update({ count: Number(e.target.value) })}/></Field><Field label="Gerçek kaynak URL"><input className="admin-field w-full" type="url" value={row.sourceUrl} onChange={e => update({ sourceUrl: e.target.value })}/></Field><label className="text-xs"><input type="checkbox" checked={row.verified} onChange={e => update({ verified: e.target.checked })}/> Kaynak puanı ve sayı doğrulandı</label></div>;
    })}<label className="text-xs"><input type="checkbox" checked={settings?.reviewSampleMode !== false} onChange={e => setTrust({ reviewSampleMode: e.target.checked })}/> Yalnız önizlemede örnek puan / yorumları göster</label></div>
    <Field label="Trust & Reviews dili"><select className="admin-field mt-1 w-full" value={uiLang} onChange={(event) => onUiLang(event.target.value as UiLocale)}>{UI_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></Field>
    <div className="rounded-md border border-border p-3"><p className="mb-3 text-xs font-bold">1. Ana sosyal kanıt</p><div className="grid gap-2 sm:grid-cols-2">{V2_TEXT_FIELDS.TRUST_REVIEWS.filter(([key]) => ["eyebrow", "title", "accent", "subtitle", "imageAlt", "cta"].includes(key)).map(([key, label]) => <LTInput key={key} label={label} lang={lang} uiLang={uiLang} value={section.text[key]} onSourceBlur={onSourceBlur} onChange={(value) => onChange({ text: { ...section.text, [key]: value } })} />)}</div></div>
    <ImageField label="MAIN SOCIAL PROOF IMAGE · Ana seyahat görseli" value={section.mediaId} onChange={(mediaId) => onChange({ mediaId })} />
    <div className="grid gap-2 sm:grid-cols-2"><Select label="Görsel odağı" value={settings?.focal ?? "right"} options={["left", "center", "right"] as const} labels={{ left: "Sol", center: "Orta", right: "Sağ" }} onChange={(focal) => setTrust({ focal })} /><Select label="Arka plan" value={settings?.background ?? "mint"} options={["mint", "cream", "white"] as const} labels={{ mint: "Mint", cream: "Krem", white: "Beyaz" }} onChange={(background) => setTrust({ background })} /><Select label="Buton hedefi" value={section.href} options={V2_SAFE_LINKS} labels={LINK_LABEL} onChange={(href) => onChange({ href })} /></div>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">Görsel etiketleri</p>{chips.map((chip, index) => <div key={chip.id} className="mt-3 grid gap-2 border-t border-border pt-2 sm:grid-cols-2"><div className="flex items-center gap-2 text-xs"><label><input type="checkbox" checked={chip.visible} onChange={(event) => setItem(chip.id, { visible: event.target.checked })} /> Göster</label><Button variant="ghost" size="icon" aria-label="Yukarı" disabled={index === 0} onClick={() => moveItem(chip.id, -1)}><ArrowUp /></Button><Button variant="ghost" size="icon" aria-label="Aşağı" disabled={index === chips.length - 1} onClick={() => moveItem(chip.id, 1)}><ArrowDown /></Button><Button variant="ghost" size="icon" aria-label="Kaldır" onClick={() => onChange({ items: section.items.filter((item) => item.id !== chip.id) })}><Trash2 /></Button></div><Select label="Konum" value={chip.position ?? "top-right"} options={["top-right", "middle-left", "bottom-right"] as const} labels={{ "top-right": "Üst sağ", "middle-left": "Orta sol", "bottom-right": "Alt sağ" }} onChange={(position) => setItem(chip.id, { position })} /><IconPicker value={chip.icon} onChange={(icon) => setItem(chip.id, { icon })} /><MediaField label="Özel simge" value={chip.mediaId} onChange={(mediaId) => setItem(chip.id, { mediaId })} category="GLOBAL" /><LTInput label="Başlık" value={chip.title} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(title) => setItem(chip.id, { title })} /><LTInput label="Açıklama" value={chip.text} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(text) => setItem(chip.id, { text })} /></div>)}<Button variant="outline" size="sm" className="mt-2" onClick={() => addItem("chip")}>Etiket ekle</Button></div>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">Puan & görünüm</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><Select label="Puan kaynağı" value={settings?.ratingMode ?? "real"} options={["real", "manual", "off"] as const} labels={{ real: "Onaylı gerçek yorumlar", manual: "MANUEL / ÖNİZLEME", off: "Kapalı" }} onChange={(ratingMode) => setTrust({ ratingMode })} />{settings?.ratingMode === "manual" && <><Field label="Manuel puan (yalnız yönetici önizlemesi)"><input type="number" min="0" max="5" step="0.1" className="admin-field mt-1 w-full" value={settings.manualRating} onChange={(event) => setTrust({ manualRating: Number(event.target.value) })} /></Field><LTInput label="Puan açıklaması" value={settings.manualCaption} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(manualCaption) => setTrust({ manualCaption })} /></>}<label className="text-xs"><input type="checkbox" checked={section.showDots} onChange={(event) => onChange({ showDots: event.target.checked })} /> Sayfa noktaları</label><label className="text-xs"><input type="checkbox" checked={settings?.autoplay ?? false} onChange={(event) => setTrust({ autoplay: event.target.checked })} /> Otomatik kaydırma</label></div><p className="mt-2 text-xs text-muted-foreground">Kart sayısı: otomatik. Manuel puan yalnız yönetici önizlemesinde görünür; gerçek müşteri puanına karışmaz. Kaydırma kullanıcı kontrolündedir.</p></div>
    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={section.visible} onChange={(event) => onChange({ visible: event.target.checked })} />Bölüm mağazada görünür</label>
    <div className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold">2. Müşteri yorumları</p><p className="mt-1 text-[10px] text-muted-foreground">Mağaza yalnız GERÇEK + DOĞRULANMIŞ + YAYINDA yorumları gösterir. Demo yorumları sadece bu editörün önizlemesinde görünür.</p></div><Button size="sm" variant="outline" onClick={() => onChange({ items: [...section.items, makeReview("REAL")] })}><Plus />Yorum ekle</Button></div>
       <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={addExamples} disabled={section.items.length >= 30}>8 editoryal örnek ekle</Button><Button size="sm" variant="outline" onClick={() => onChange({ items: [...section.items, makeReview("EDITORIAL")] })}>Editoryal kart ekle</Button><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={section.showDemoReviews === true} onChange={(event) => onChange({ showDemoReviews: event.target.checked })} />Örnekleri önizlemede göster</label><Button size="sm" variant="outline" onClick={() => onChange({ showDemoReviews: false })}>Tüm örnekleri gizle</Button></div>
      {!reviews.length && <p className="mt-3 rounded-md bg-secondary p-3 text-xs text-muted-foreground">Henüz yorum yok. Mağazada yorum kartları otomatik olarak gizlenir.</p>}
      <ul className="mt-3 space-y-3">{reviews.map((review, index) => <li key={review.id} className="rounded-md border border-border bg-background p-3">
         <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><div className="min-w-0"><strong className="block truncate text-xs">{review.title[review.originalLanguage ?? "en"] || "Yeni yorum"} <span className="text-muted-foreground">· {review.reviewType === "REAL" ? "GERÇEK" : review.reviewType === "EDITORIAL" ? "EDİTORYAL / ÖRNEK" : "DEMO / TEST"}</span></strong><span className="text-[10px] text-muted-foreground">{review.reviewStatus ?? "DRAFT"} · Sıra {index + 1} · {review.verified ? "Doğrulandı" : "Doğrulama bekliyor"}</span></div><div className="flex"><Button size="icon" variant="ghost" className="size-7" aria-label="Yorumu yukarı taşı" disabled={index === 0} onClick={() => moveReview(review.id, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" className="size-7" aria-label="Yorumu aşağı taşı" disabled={index === reviews.length - 1} onClick={() => moveReview(review.id, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Yorumu sil" onClick={() => { if (window.confirm("Yorum silinsin mi?")) onChange({ items: section.items.filter((item) => item.id !== review.id) }); }}><Trash2 /></Button></div></div>
         <div className="mt-3 grid gap-3 sm:grid-cols-2">
           <Field label="Tür"><select className="admin-field mt-1 w-full" value={review.reviewType ?? "DEMO"} onChange={(event) => setItem(review.id, { reviewType: event.target.value as "REAL" | "DEMO" | "EDITORIAL", verified: false, published: false, reviewStatus: "DRAFT" })}><option value="REAL">GERÇEK</option><option value="EDITORIAL">EDİTORYAL / ÖRNEK</option><option value="DEMO">DEMO / TEST</option></select></Field>
           <Field label="Orijinal dil"><select className="admin-field mt-1 w-full" value={review.originalLanguage ?? "en"} onChange={(event) => setItem(review.id, { originalLanguage: event.target.value as UiLocale })}>{UI_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></Field>
           <LTInput label="Ad ve soyad baş harfi (orijinal)" value={review.title} lang={lang} uiLang={review.originalLanguage ?? "en"} onChange={(title) => setItem(review.id, { title })} />
           <Field label="Ülke / bayrak"><select className="admin-field mt-1 w-full" value={review.countryCode ?? ""} onChange={(event) => setItem(review.id, { countryCode: event.target.value })}><option value="">Ülke seç</option>{reviewCountries.map((code) => <option key={code} value={code}>{countryLabel(code)} ({code})</option>)}</select></Field>
           <div className="sm:col-span-2"><LTInput label={review.reviewType === "EDITORIAL" ? "Editoryal metin" : "Orijinal yorum (mağazada yalnız orijinal metin gösterilir)"} value={review.text} lang={lang} uiLang={review.reviewType === "EDITORIAL" ? uiLang : review.originalLanguage ?? "en"} multiline onChange={(text) => setItem(review.id, { text })} />{review.reviewType !== "EDITORIAL" && <ReviewTranslator review={review} onChange={(text) => setItem(review.id, { text })} />}</div>
           <MediaField label="Müşteri avatarı" value={review.mediaId} onChange={(mediaId) => setItem(review.id, { mediaId })} category="GLOBAL" />
           <Field label="Puan"><select className="admin-field mt-1 w-full" value={review.rating} onChange={(event) => setItem(review.id, { rating: Number(event.target.value) })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></Field>
           <Field label="Kaynak"><select className="admin-field mt-1 w-full" value={review.reviewSource ?? "Direct"} onChange={e => setItem(review.id, { reviewSource: e.target.value as "Google" | "Trustpilot" | "Direct" })}>{["Direct","Google","Trustpilot"].map(source=><option key={source}>{source}</option>)}</select></Field><Field label="Kaynak bağlantısı"><input type="url" className="admin-field mt-1 w-full" value={review.reviewSourceUrl ?? ""} onChange={e=>setItem(review.id,{reviewSourceUrl:e.target.value})}/></Field><Field label="Yorum tarihi"><input type="date" className="admin-field mt-1 w-full" value={review.reviewDate ?? ""} onChange={(event) => setItem(review.id, { reviewDate: event.target.value })} /></Field>
           <Field label="Durum"><select className="admin-field mt-1 w-full" value={review.reviewStatus ?? "DRAFT"} onChange={(event) => setItem(review.id, { reviewStatus: event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED", published: event.target.value === "PUBLISHED" })}><option value="DRAFT">Taslak</option><option value="PUBLISHED">Yayın için hazır</option><option value="ARCHIVED">Arşiv</option></select></Field>
         </div>
         <div className="mt-3 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={review.visible} onChange={(event) => setItem(review.id, { visible: event.target.checked })} />Görünür</label><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={review.verified} disabled={review.reviewType !== "REAL"} onChange={(event) => setItem(review.id, { verified: event.target.checked })} />Gerçek müşteri olarak doğrulandı</label></div>
      </li>)}</ul>
    </div>
    <div className="rounded-md border border-border p-3">
       <p className="text-xs font-bold">3. Güven avantajları</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Kurulum iddiası dahil tüm metinler yayınlanmadan önce içerik onayı gerektirir.</p>
        <div className="mt-3 space-y-3">{trustItems.map((item, index) => <div key={item.id} className="grid gap-2 rounded-md bg-secondary/40 p-2 sm:grid-cols-2"><div className="flex items-center gap-1"><label className="mr-auto text-xs"><input type="checkbox" checked={item.visible} onChange={(event) => setItem(item.id, { visible: event.target.checked })} /> Göster</label><Button size="icon" variant="ghost" aria-label="Yukarı" disabled={index === 0} onClick={() => moveItem(item.id, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label="Aşağı" disabled={index === trustItems.length - 1} onClick={() => moveItem(item.id, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" aria-label="Kaldır" onClick={() => onChange({ items: section.items.filter((row) => row.id !== item.id) })}><Trash2 /></Button></div><Select label="Görsel modu" value={item.visualMode ?? (item.mediaId ? "CUSTOM_IMAGE" : "ICON")} options={["ICON", "CUSTOM_IMAGE"] as const} labels={{ ICON: "Simge", CUSTOM_IMAGE: "Özel görsel" }} onChange={(visualMode) => setItem(item.id, { visualMode })} /><div className="sm:col-span-2">{item.visualMode === "ICON" ? <IconPicker value={item.icon} onChange={(icon) => setItem(item.id, { icon })} /> : <ImageField label="Avantaj görseli · Bild ändern / Replace image · Bild hochladen / Upload image" value={item.mediaId} category="GLOBAL" onChange={(mediaId) => setItem(item.id, { mediaId, visualMode: mediaId ? "CUSTOM_IMAGE" : "ICON" })} />}</div>{item.visualMode !== "ICON" && <div className="sm:col-span-2"><Select label="Görsel ayarları · Görsel ölçeği" value={String(item.imageScale ?? (item.id === "trust-payment" ? 160 : 100))} options={["80", "100", "120", "140", "160"] as const} labels={{ "80": "80%", "100": "100%", "120": "120%", "140": "140%", "160": "160%" }} onChange={(scale) => setItem(item.id, { imageScale: Number(scale) as 80 | 100 | 120 | 140 | 160 })} /></div>}<div className="sm:col-span-2"><LTInput label="Görsel alternatif metni / Alt text" value={item.imageAlt} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(imageAlt) => setItem(item.id, { imageAlt })} /></div><LTInput label="Başlık" value={item.title} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(title) => setItem(item.id, { title })} /><div className="sm:col-span-2"><LTInput label="Açıklama" value={item.text} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(text) => setItem(item.id, { text })} /></div>{item.id === "trust-payment" && <p className="sm:col-span-2 text-[10px] text-muted-foreground">Ödeme sağlayıcısı etkin değil; bu görsel yalnız yönetici önizlemesinde görünür.</p>}</div>)}</div><Button variant="outline" size="sm" onClick={() => addItem("trust")}>Avantaj ekle</Button>
    </div>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">4. Neden pasaport.io?</p><label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={settings?.whyEnabled !== false} onChange={(event) => setTrust({ whyEnabled: event.target.checked })} /> Göster</label><div className="mt-3 grid gap-2 sm:grid-cols-2">{V2_TEXT_FIELDS.TRUST_REVIEWS.filter(([key]) => key.startsWith("why")).map(([key, label]) => <LTInput key={key} label={label} value={section.text[key]} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(value) => onChange({ text: { ...section.text, [key]: value } })} />)}</div></div>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">Üçlü karşılaştırma · kaynaklı fiyatlar</p><p className="text-xs text-muted-foreground">Üç satırda ülke, veri, süre ve para birimi aynı olmalı. Eksik veya doğrulanmamış veriler mağazada fiyat göstermez. Düzenleme taslağa döner.</p>{(["roaming","other","pasaport"] as const).map(kind=>{ const row=settings?.comparisonEntries?.find(e=>e.kind===kind) ?? {kind,price:0,currency:"EUR",destination:"",allowance:"",validity:"",provider:"",sourceUrl:"",checkedAt:""}; const update=(patch:Partial<typeof row>)=>setTrust({comparisonEntries:(["roaming","other","pasaport"] as const).map(k=>k===kind?{...row,...patch}:settings?.comparisonEntries?.find(e=>e.kind===k)??{...row,kind:k,price:0,provider:"",sourceUrl:""}),comparisonStatus:"DRAFT",comparisonPreviewOnly:true}); return <fieldset key={kind} className="mt-3 grid gap-2 border border-border p-2 sm:grid-cols-2"><legend>{kind}</legend>{(["provider","destination","allowance","validity","currency","sourceUrl","checkedAt"] as const).map(key=><Field key={key} label={({provider:"Sağlayıcı",destination:"Destinasyon",allowance:"Veri miktarı",validity:"Geçerlilik",currency:"Para birimi",sourceUrl:"Kaynak URL",checkedAt:"Kontrol tarihi"})[key]}><input type={key==="checkedAt"?"date":key==="sourceUrl"?"url":"text"} className="admin-field mt-1 w-full" value={row[key]} onChange={e=>update({[key]:e.target.value})}/></Field>)}<Field label="Fiyat"><input type="number" min="0" step="0.01" className="admin-field mt-1 w-full" value={row.price||""} onChange={e=>update({price:Number(e.target.value)})}/></Field></fieldset>;})}</div>
    <div className="rounded-md border border-border p-3"><p className="text-xs font-bold">5. Roaming karşılaştırması</p><div className="mt-2 inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Sunum">{(["STRUCTURED", "IMAGE"] as const).map((mode) => <button key={mode} type="button" aria-pressed={(settings?.comparisonMode ?? "STRUCTURED") === mode} onClick={() => setTrust({ comparisonMode: mode })} className={`rounded px-3 py-1.5 text-xs font-semibold ${(settings?.comparisonMode ?? "STRUCTURED") === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{mode === "STRUCTURED" ? "Yapılandırılmış içerik" : "Yalnız görsel"}</button>)}</div>{settings?.comparisonMode === "IMAGE" && <div className="mt-3 grid gap-2 rounded-md bg-secondary/40 p-2 sm:grid-cols-2"><p className="text-[11px] text-muted-foreground sm:col-span-2">Hazır tanıtım görseli yapılandırılmış kartın yerine gösterilir; yapılandırılmış içerik saklanır. Görseldeki metin çevrilmez. Görsel fiyat iddiası içerdiği için mağazada yalnız durum "Doğrulandı" ve doğrulama tarihi doluysa görünür.</p><MediaField label="Masaüstü görseli" value={settings.comparisonImageId ?? null} onChange={(comparisonImageId) => setTrust({ comparisonImageId, comparisonStatus: "DRAFT", comparisonPreviewOnly: true })} category="GLOBAL" /><MediaField label="Mobil görsel (isteğe bağlı)" value={settings.comparisonMobileImageId ?? null} onChange={(comparisonMobileImageId) => setTrust({ comparisonMobileImageId, comparisonStatus: "DRAFT", comparisonPreviewOnly: true })} category="GLOBAL" /><div className="sm:col-span-2"><LTInput label="Alternatif metin" value={settings.comparisonImageAlt ?? { tr: "", de: "", en: "" }} lang={lang} uiLang={uiLang} onSourceBlur={onSourceBlur} onChange={(comparisonImageAlt) => setTrust({ comparisonImageAlt })} /></div></div>}<div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Roaming fiyatı (EUR)"><input type="number" inputMode="decimal" min={0} step="0.01" className="admin-field mt-1 w-full" value={settings?.comparisonRoamingPrice ?? ""} onChange={(event) => setTrust({ comparisonRoamingPrice: event.target.value === "" ? null : Number(event.target.value), comparisonStatus: "DRAFT", comparisonPreviewOnly: true })} /></Field><Field label="pasaport.io eSIM fiyatı (EUR)"><input type="number" inputMode="decimal" min={0} step="0.01" className="admin-field mt-1 w-full" value={settings?.comparisonTravelyPrice ?? ""} onChange={(event) => setTrust({ comparisonTravelyPrice: event.target.value === "" ? null : Number(event.target.value), comparisonStatus: "DRAFT", comparisonPreviewOnly: true })} /></Field><p className="text-xs text-muted-foreground sm:col-span-2">{(() => { const f = comparisonFigures(settings); return f ? `Otomatik hesaplanan: tasarruf ${f.saving.toFixed(2)} € · fiyat avantajı %${f.percent}. Rakamlar çevrilmez; her dilde yerel biçimde gösterilir.` : "Roaming fiyatı pasaport.io fiyatından yüksek olmalıdır."; })()}</p></div><Select label="Durum" value={settings?.comparisonStatus ?? "DRAFT"} options={["DRAFT", "VERIFIED", "HIDDEN"] as const} labels={{ DRAFT: "Taslak · örnekler yalnız yönetici önizlemesinde", VERIFIED: "Doğrulandı · yayına uygun", HIDDEN: "Gizli" }} onChange={(comparisonStatus) => setTrust({ comparisonStatus, comparisonPreviewOnly: comparisonStatus !== "VERIFIED", comparisonEnabled: comparisonStatus !== "HIDDEN" })} /><p className="my-2 text-xs text-muted-foreground">Fiyat değiştiğinde durum Taslak olur; doğrulayıp yeniden "Doğrulandı" seçin. Kaynak, yöntem ve doğrulama tarihini gelecekteki güncellemeler için saklayın.</p><div className="grid gap-2 sm:grid-cols-2">{V2_TEXT_FIELDS.TRUST_REVIEWS.filter(([key]) => key.startsWith("comparison") || key.startsWith("statistic")).map(([key, label]) => <LTInput key={key} label={label} value={section.text[key]} lang={lang} uiLang={uiLang} {...(!["statistic", "comparisonAValue", "comparisonBValue", "comparisonHighlight"].includes(key) ? { onSourceBlur } : {})} onChange={(value) => onChange({ text: { ...section.text, [key]: value } })} />)}</div><Field label="Doğrulama tarihi"><input type="date" className="admin-field mt-1 w-full" value={settings?.comparisonVerifiedAt ?? ""} onChange={(event) => setTrust({ comparisonVerifiedAt: event.target.value })} /></Field><Select label="CTA hedefi" value={section.href} options={V2_SAFE_LINKS} labels={LINK_LABEL} onChange={(href) => onChange({ href })} /></div>
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
    if (!row) return;
    next.splice(target, 0, row);
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
                <EditorialItemControls item={it} onChange={patch=>set(it.id,patch)}/>
                <CardDesignControls id={it.id} value={it.cardDesign} onChange={cardDesign=>set(it.id,{cardDesign})}/>
                <ResponsiveMediaControls value={it} onChange={patch=>set(it.id,patch)} picker={(label,value,onChange)=><MediaField label={label} value={value} onChange={onChange}/>}/>

              </div>
            )}
            {(mode === 'step' || mode === 'card') && <MediaField label="Adım görseli (isteğe bağlı)" category="ESIM" value={it.mediaId} recommendation="600 × 600 · PNG / WebP / SVG" hint="Görsel seçilmezse mevcut simge/adım gösterilir." onChange={mediaId => set(it.id, { mediaId })} />}
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

/** Admin-only AI translations (TR/DE/EN) for review management; the storefront still renders the original language only. */
function ReviewTranslator({ review, onChange }: { review: V2Item; onChange: (text: V2Item["text"]) => void }) {
  const run = useServerFn(translateReview);
  const original = review.originalLanguage ?? "en";
  const source = review.text[original] ?? "";
  const mutation = useMutation({
    mutationFn: () => run({ data: { text: source, language: original } }),
    onSuccess: (t) => { const next = { ...review.text }; (["tr", "de", "en"] as const).forEach((code) => { if (code !== original) next[code] = t[code]; }); onChange(next); toast.success("Çeviriler oluşturuldu"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Çeviri başarısız"),
  });
  const targets = (["tr", "de", "en"] as const).filter((code) => code !== original);
  return <div className="mt-2 rounded-md bg-secondary p-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">Yönetim için AI çevirisi (TR / DE / EN) — müşteriye gösterilmez.</span><Button size="sm" variant="outline" disabled={!source.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Çevriliyor…" : "AI ile çevir"}</Button></div>
    {targets.some((code) => review.text[code]) && <dl className="mt-2 space-y-1 text-xs">{targets.map((code) => review.text[code] ? <div key={code}><dt className="inline font-bold uppercase">{code}: </dt><dd className="inline text-muted-foreground">{review.text[code]}</dd></div> : null)}</dl>}
  </div>;
}

