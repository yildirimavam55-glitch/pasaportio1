import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Bold, Eye, FileText, Heading1, Heading2, Heading3, History, Italic, Languages, Link2, List, ListOrdered, Mail, Minus, Pilcrow, RotateCcw, Save, Undo2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { UI_LOCALES, LOCALE_REGISTRY, type UiLocale } from "@/i18n/locales";
import {
  LEGAL_DOCUMENTS, LEGAL_DOCUMENT_LABELS, LEGAL_ROUTES, MISSING_LABEL, REQUIRED_COMPANY_FIELDS,
  impressumFromCompany, isOutdated, sourceHash,
  type CompanyInformation, type LegalCenterConfig, type LegalDocument, type LegalDocumentId,
} from "@/domain/legal/content";
import { getLegalCenterEditor, publishLegalDocument, saveLegalDraft, translateLegalDocument, unpublishLegalDocument } from "@/lib/legal-center.functions";
import { LegalDocumentView } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/_authenticated/admin/legal")({
  head: () => adminHead("Yasal", "Yasal belgeler ve şirket bilgileri."),
  component: LegalAdmin,
});

const COMPANY_FIELDS: Array<[keyof CompanyInformation, string]> = [
  ["brandName", "Marka"], ["legalName", "Yasal şirket / işletme adı"], ["legalForm", "Hukuki tür"], ["representative", "Sahip / Genel Müdür"],
  ["street", "Cadde"], ["houseNumber", "Kapı no"], ["postalCode", "Posta kodu"], ["city", "Şehir"], ["country", "Ülke"],
  ["email", "E-posta"], ["telephone", "Telefon"], ["commercialRegister", "Ticaret sicili"], ["registerCourt", "Sicil mahkemesi"],
  ["registrationNumber", "Kayıt numarası"], ["vatId", "KDV kimliği / USt-IdNr."], ["businessId", "Vergi / işletme kimliği"],
  ["responsibleContact", "Sorumlu kişi"], ["disputeResolutionStatus", "Tüketici uyuşmazlık çözümü bilgisi / durumu"],
];

type EditorData = Awaited<ReturnType<typeof getLegalCenterEditor>>;
type View = { mode: "overview" } | { mode: "edit"; id: LegalDocumentId } | { mode: "company" };

function LegalAdmin() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["legal-editor"], queryFn: () => getLegalCenterEditor() });
  const [config, setConfig] = useState<LegalCenterConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<View>({ mode: "overview" });
  const [previewId, setPreviewId] = useState<LegalDocumentId | null>(null);

  useEffect(() => { if (query.data && !dirty) setConfig(query.data.draft); }, [query.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => { setDirty(false); await qc.invalidateQueries({ queryKey: ["legal-editor"] }); };
  const save = useMutation({
    mutationFn: (documentId: LegalDocumentId | null) => saveLegalDraft({ data: { config, documentId } }),
    onSuccess: async () => { toast.success("Taslak kaydedildi. Yayındaki sayfa değişmedi."); await refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const publish = useMutation({
    mutationFn: (documentId: LegalDocumentId) => publishLegalDocument({ data: { config, documentId } }),
    onSuccess: async () => { toast.success("Belge yayınlandı."); await refresh(); await qc.invalidateQueries({ queryKey: ["legal-center", "published"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const unpublish = useMutation({
    mutationFn: (documentId: LegalDocumentId) => unpublishLegalDocument({ data: { documentId } }),
    onSuccess: async () => { toast.success("Belge yayından kaldırıldı."); await qc.invalidateQueries({ queryKey: ["legal-editor"] }); await qc.invalidateQueries({ queryKey: ["legal-center", "published"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.error) return <AdminGate title="Yasal"><AdminError error={query.error} /></AdminGate>;
  if (query.isPending || !config) return <AdminGate title="Yasal"><AdminLoading /></AdminGate>;

  const data = query.data;
  const patch = (next: LegalCenterConfig) => { setConfig(next); setDirty(true); };
  const companyMissing = REQUIRED_COMPANY_FIELDS.filter((k) => !config.company[k].trim());

  return (
    <AdminGate title="Yasal">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={view.mode === "overview" || view.mode === "edit" ? "secondary" : "outline"} onClick={() => setView({ mode: "overview" })}><FileText />Belgeler</Button>
          <Button size="sm" variant={view.mode === "company" ? "secondary" : "outline"} onClick={() => setView({ mode: "company" })}>Şirket Bilgileri{companyMissing.length > 0 && <span className="ms-1 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold">{companyMissing.length}</span>}</Button>
          {dirty && <span className="rounded-full bg-warning/20 px-2 py-1 text-[10px] font-bold">Kaydedilmemiş değişiklik</span>}
        </div>

        {view.mode === "company" && (
          <AdminPanel title="Şirket Bilgileri" action={<Button size="sm" variant="secondary" disabled={save.isPending} onClick={() => save.mutate(null)}><Save />Taslağı kaydet</Button>}>
            <p className="mb-3 text-xs text-muted-foreground">Boş alanlar boş kalır ve “{MISSING_LABEL}” olarak işaretlenir. Hiçbir değer otomatik doldurulmaz. Şirket bilgileri, bir belge yayınlandığında yayına alınır.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {COMPANY_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input className="admin-field mt-1 w-full" value={config.company[key]} onChange={(e) => patch({ ...config, company: { ...config.company, [key]: e.target.value } })} />
                  {!config.company[key].trim() && <span className="mt-0.5 block text-[10px] font-bold text-warning">{MISSING_LABEL}</span>}
                </Field>
              ))}
            </div>
          </AdminPanel>
        )}

        {view.mode === "overview" && (
          <>
            <AdminPanel title="Yasal durum özeti">
              <p className="mb-3 text-[11px] text-muted-foreground">Bu durumlar yalnızca içerik hazırlığını gösterir; hukuki uygunluk garantisi değildir.</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {LEGAL_DOCUMENTS.map((id) => (
                  <DocumentCard key={id} id={id} draft={config.documents[id]} data={data} companyMissing={id === "imprint" && companyMissing.length > 0}
                    onEdit={() => setView({ mode: "edit", id })} onPreview={() => setPreviewId(previewId === id ? null : id)} />
                ))}
              </div>
            </AdminPanel>
            {previewId && <PreviewPanel doc={config.documents[previewId]} title={`Önizleme · ${LEGAL_DOCUMENT_LABELS[previewId]}`} />}
          </>
        )}

        {view.mode === "edit" && (
          <DocumentEditor
            key={view.id}
            id={view.id}
            config={config}
            data={data}
            onChange={(doc) => patch({ ...config, documents: { ...config.documents, [view.id]: doc } })}
            onSave={() => save.mutate(view.id)}
            onPublish={() => { if (window.confirm(`${LEGAL_DOCUMENT_LABELS[view.id]} yayınlansın mı? Müşteriler ${LEGAL_ROUTES[view.id]} sayfasında bu sürümü görecek.`)) publish.mutate(view.id); }}
            onUnpublish={() => { if (window.confirm("Belge yayından kaldırılsın mı?")) unpublish.mutate(view.id); }}
            busy={save.isPending || publish.isPending || unpublish.isPending}
            onBack={() => setView({ mode: "overview" })}
          />
        )}
      </div>
    </AdminGate>
  );
}

function docMissing(doc: LegalDocument) { return doc.body.tr.includes(MISSING_LABEL) || doc.body.tr.includes("EKSİK"); }

function DocumentCard({ id, draft, data, companyMissing, onEdit, onPreview }: { id: LegalDocumentId; draft: LegalDocument; data: EditorData; companyMissing: boolean; onEdit: () => void; onPreview: () => void }) {
  const published = data.published.documents[id];
  const changed = published && JSON.stringify({ ...published, publishedAt: undefined }) !== JSON.stringify({ ...draft, publishedAt: undefined });
  const chips: Array<[string, string]> = [[published ? "Yayınlandı" : "Taslak", published ? "bg-success/15 text-success" : "bg-secondary"]];
  if (changed) chips.push(["Yayınlanmamış değişiklik", "bg-warning/20"]);
  if (companyMissing || docMissing(draft)) chips.push([MISSING_LABEL, "bg-destructive/10 text-destructive"]);
  if (draft.reviewRequired) chips.push(["İnceleme gerekli", "bg-warning/20"]);
  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <strong className="text-sm">{LEGAL_DOCUMENT_LABELS[id]}</strong>
      <span className="text-[10px] text-muted-foreground">{LEGAL_ROUTES[id]}</span>
      <div className="flex flex-wrap gap-1">{chips.map(([label, cls]) => <span key={label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>)}</div>
      <span className="text-[11px] text-muted-foreground">Son güncelleme: {draft.lastUpdated || "—"}{published?.publishedAt ? ` · Yayın: ${new Date(published.publishedAt).toLocaleString("tr-TR")}` : ""}</span>
      <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={onEdit}>Düzenle</Button><Button size="sm" variant="outline" onClick={onPreview}><Eye />Önizle</Button></div>
    </div>
  );
}

function PreviewPanel({ doc, title, locale = "tr" }: { doc: LegalDocument; title: string; locale?: UiLocale }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <AdminPanel title={title} action={<div className="flex gap-1"><Button size="sm" variant={device === "desktop" ? "secondary" : "outline"} onClick={() => setDevice("desktop")}>Masaüstü</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "outline"} onClick={() => setDevice("mobile")}>Mobil</Button></div>}>
      <p className="mb-2 text-[10px] text-muted-foreground">Önizleme yayın değildir. Müşteri sayfası yalnızca “Yayınla” sonrası değişir.</p>
      <div className={`mx-auto overflow-hidden rounded-md border border-border bg-background ${device === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}>
        <LegalDocumentView doc={doc} locale={locale} lastUpdatedLabel={locale === "de" ? "Zuletzt aktualisiert" : locale === "tr" ? "Son güncelleme" : "Last updated"} />
      </div>
    </AdminPanel>
  );
}

function DocumentEditor({ id, config, data, onChange, onSave, onPublish, onUnpublish, busy, onBack }: {
  id: LegalDocumentId; config: LegalCenterConfig; data: EditorData; onChange: (doc: LegalDocument) => void;
  onSave: () => void; onPublish: () => void; onUnpublish: () => void; busy: boolean; onBack: () => void;
}) {
  const doc = config.documents[id];
  const [locale, setLocale] = useState<UiLocale>("tr");
  const [preview, setPreview] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dir = LOCALE_REGISTRY[locale].dir;
  const published = data.published.documents[id];
  const versions = data.versions.filter((v) => v.documentId === id && v.document);

  const setText = (field: "title" | "body", value: string) => {
    const next: LegalDocument = { ...doc, [field]: { ...doc[field], [locale]: value } };
    if (locale !== "tr") next.translations = { ...doc.translations, [locale]: { status: value.trim() || next.title[locale].trim() ? "MANUAL" : "EMPTY", sourceHash: sourceHash(doc) } };
    onChange(next);
  };

  const applyFormat = (kind: "h1" | "h2" | "h3" | "p" | "b" | "i" | "ul" | "ol" | "link" | "mail" | "hr") => {
    const el = area.current; const value = doc.body[locale];
    const start = el?.selectionStart ?? value.length; const end = el?.selectionEnd ?? value.length;
    const sel = value.slice(start, end);
    let insert = sel;
    if (kind === "b") insert = `**${sel || "kalın metin"}**`;
    else if (kind === "i") insert = `*${sel || "italik metin"}*`;
    else if (kind === "link") { const url = window.prompt("Bağlantı adresi (https://… veya /sayfa)"); if (!url) return; insert = `[${sel || url}](${url.trim()})`; }
    else if (kind === "mail") { const mail = window.prompt("E-posta adresi"); if (!mail) return; insert = `[${sel || mail.trim()}](mailto:${mail.trim()})`; }
    else if (kind === "hr") insert = "\n\n---\n\n";
    else {
      const prefix = { h1: "# ", h2: "## ", h3: "### ", p: "", ul: "- ", ol: "1. " }[kind];
      const lines = (sel || (kind === "p" ? "Paragraf" : "Metin")).split("\n").map((l, i) => `${kind === "ol" ? `${i + 1}. ` : prefix}${l.replace(/^(#{1,3} |- |\d+\. )/, "")}`);
      insert = `\n\n${lines.join("\n")}\n\n`;
    }
    setText("body", (value.slice(0, start) + insert + value.slice(end)).replace(/^\n+/, ""));
    requestAnimationFrame(() => el?.focus());
  };

  const translate = useMutation({
    mutationFn: (targets: UiLocale[]) => translateLegalDocument({ data: { title: doc.title.tr, body: doc.body.tr, targets } }),
    onSuccess: (result) => {
      const hash = sourceHash(doc);
      const next: LegalDocument = { ...doc, title: { ...doc.title }, body: { ...doc.body }, translations: { ...doc.translations } };
      const done = Object.keys(result.translations) as UiLocale[];
      for (const l of done) { const t = result.translations[l]!; next.title[l] = t.title; next.body[l] = t.body; next.translations[l] = { status: "AUTO", sourceHash: hash }; }
      onChange(next);
      toast.success(`${done.length} dil çevrildi. Kaydetmeyi unutmayın.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const translateAll = () => {
    const targets = UI_LOCALES.filter((l) => l !== "tr" && doc.translations[l].status !== "MANUAL");
    const skipped = UI_LOCALES.filter((l) => l !== "tr" && doc.translations[l].status === "MANUAL");
    if (!doc.body.tr.trim()) { toast.error("Önce Türkçe metni yazın."); return; }
    if (!targets.length) { toast.info("Tüm diller elle düzenlenmiş; üzerine yazılmadı."); return; }
    if (!window.confirm(`${targets.length} dil çevrilecek.${skipped.length ? ` Elle düzenlenen ${skipped.length} dil (${skipped.join(", ").toUpperCase()}) korunacak.` : ""}`)) return;
    translate.mutate(targets);
  };

  const statusLabel = (l: UiLocale) => l === "tr" ? "Ana dil" : isOutdated(doc, l) ? "Güncel değil" : { AUTO: "Otomatik çeviri", MANUAL: "Elle düzenlendi", EMPTY: "Boş", SOURCE: "" }[doc.translations[l].status];

  return (
    <div className="grid gap-4">
      <AdminPanel title={LEGAL_DOCUMENT_LABELS[id]} action={<Button size="sm" variant="outline" onClick={onBack}>← Belgeler</Button>}>
        <div className="flex flex-wrap gap-1">
          {UI_LOCALES.map((code) => (
            <Button key={code} size="sm" variant={locale === code ? "secondary" : "outline"} onClick={() => setLocale(code)} title={statusLabel(code)}>
              {code.toUpperCase()}
              {code !== "tr" && <span className={`ms-1 inline-block size-1.5 rounded-full ${isOutdated(doc, code) ? "bg-warning" : doc.translations[code].status === "EMPTY" ? "bg-muted-foreground/30" : doc.translations[code].status === "MANUAL" ? "bg-primary" : "bg-success"}`} />}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{LOCALE_REGISTRY[locale].nativeName} · {statusLabel(locale)}{locale === "tr" ? " — diğer diller bu metinden çevrilir." : ""}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={translate.isPending} onClick={translateAll}><Languages />{translate.isPending ? "Çevriliyor…" : "Tüm dillere çevir"}</Button>
          {locale !== "tr" && <Button size="sm" variant="outline" disabled={translate.isPending} onClick={() => { if (doc.translations[locale].status !== "MANUAL" || window.confirm("Bu dildeki elle yapılan düzenlemelerin üzerine yazılsın mı?")) translate.mutate([locale]); }}><RotateCcw />Bu dili yeniden çevir</Button>}
          {id === "imprint" && locale === "tr" && <Button size="sm" variant="outline" onClick={() => { if (!doc.body.tr.trim() || window.confirm("Türkçe metin şirket bilgilerinden oluşturulan taslakla değiştirilsin mi? Kaydedene kadar yayına etkisi yoktur.")) setText("body", impressumFromCompany(config.company)); }}><Wand2 />Şirket bilgilerinden oluştur</Button>}
        </div>

        <div className="mt-4 grid gap-3" dir={dir}>
          <Field label="Başlık"><input dir={dir} className="admin-field mt-1 w-full" value={doc.title[locale]} onChange={(e) => setText("title", e.target.value)} /></Field>
          <div>
            <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-border bg-secondary/40 p-1" dir="ltr">
              {([["h1", Heading1, "Başlık 1"], ["h2", Heading2, "Başlık 2"], ["h3", Heading3, "Başlık 3"], ["p", Pilcrow, "Paragraf"], ["b", Bold, "Kalın"], ["i", Italic, "İtalik"], ["ul", List, "Madde listesi"], ["ol", ListOrdered, "Numaralı liste"], ["link", Link2, "Bağlantı"], ["mail", Mail, "E-posta bağlantısı"], ["hr", Minus, "Ayırıcı"]] as const).map(([kind, Icon, label]) => (
                <button key={kind} type="button" title={label} aria-label={label} className="grid size-8 place-items-center rounded hover:bg-background" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat(kind)}><Icon className="size-4" /></button>
              ))}
            </div>
            <textarea ref={area} dir={dir} rows={18} className="admin-field w-full rounded-t-none font-mono text-xs leading-6" value={doc.body[locale]} onChange={(e) => setText("body", e.target.value)} />
            <p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">Düz metin biçimlendirme: # Başlık · **kalın** · *italik* · - madde · 1. numaralı · [metin](https://…) · --- ayırıcı. HTML ve kod çalıştırılmaz.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" dir="ltr">
            <Field label="Son güncelleme tarihi"><input type="date" className="admin-field mt-1 w-full" value={doc.lastUpdated} onChange={(e) => onChange({ ...doc, lastUpdated: e.target.value })} /></Field>
            <label className="flex items-center gap-2 self-end text-xs"><input type="checkbox" checked={doc.reviewRequired} onChange={(e) => onChange({ ...doc, reviewRequired: e.target.checked })} />Hukuk incelemesi gerekli (yalnızca Admin’de gösterilir)</label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          <Button variant="secondary" disabled={busy} onClick={onSave}><Save />Taslağı kaydet</Button>
          <Button variant="outline" onClick={() => setPreview(!preview)}><Eye />{preview ? "Önizlemeyi kapat" : "Önizle"}</Button>
          <Button variant="cta" disabled={busy} onClick={onPublish}><Upload />Yayınla</Button>
          {published && <Button variant="outline" disabled={busy} onClick={onUnpublish}><Undo2 />Yayından kaldır</Button>}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Taslak kaydetmek yayındaki {LEGAL_ROUTES[id]} sayfasını değiştirmez. {published ? `Yayındaki sürüm: ${new Date(published.publishedAt).toLocaleString("tr-TR")}.` : "Henüz yayınlanmadı."}</p>
      </AdminPanel>

      {preview && <PreviewPanel doc={doc} locale={locale} title={`Önizleme · ${LOCALE_REGISTRY[locale].nativeName}`} />}

      <AdminPanel title="Sürüm geçmişi">
        {!versions.length ? <p className="text-xs text-muted-foreground">Henüz kayıtlı sürüm yok.</p> : (
          <div className="grid gap-1.5">
            {versions.slice(0, 30).map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
                <History className="size-3.5 text-muted-foreground" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${v.event === "publish" ? "bg-success/15 text-success" : "bg-secondary"}`}>{v.event === "publish" ? "Yayın" : "Taslak"}</span>
                <span className="flex-1">{new Date(v.createdAt).toLocaleString("tr-TR")}</span>
                <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Bu sürüm taslağa geri yüklensin mi? Kaydedip yayınlayana kadar müşteri sayfası değişmez.")) { if (v.document) onChange(v.document); toast.success("Sürüm taslağa yüklendi."); } }}><RotateCcw />Geri yükle</Button>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
