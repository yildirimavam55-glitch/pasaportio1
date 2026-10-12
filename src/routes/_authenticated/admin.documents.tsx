import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AdminGate, useIsAdmin } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import {
  COMPLETE_DOCUMENT_LOCALES, DOCUMENT_KINDS, DOCUMENT_LOCALES, LABEL_KEYS, RENDERABLE_LOCALES, RTL_DOCUMENT_LOCALES, SEED_LABELS,
  resolveDocumentLocale, type DocumentKind, type DocumentLabels, type DocumentLocale,
} from "@/domain/documents/catalog";
import { KIND_META, validateLabels, type PdfSnapshot } from "@/domain/documents/transfer";
import {
  applyPdfImport, exportPdfTemplates, getPdfTemplateVersions, listPdfTemplates, previewDocument, previewPdfImport,
  restorePdfTemplateVersion, savePdfTemplate,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  head: () => adminHead("Belgeler (PDF)", "PDF şablonları: düzenleme, sürüm geçmişi, JSON aktarımı ve sentetik önizleme."),
  component: Documents,
});

function b64url(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

function download(name: string, data: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Documents() {
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [locale, setLocale] = useState<DocumentLocale>("tr");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [draft, setDraft] = useState<PdfSnapshot | null>(null);
  const [note, setNote] = useState("");
  const [previewLabels, setPreviewLabels] = useState<DocumentLabels | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);

  const list = useQuery({ queryKey: ["pdf-templates"], queryFn: () => listPdfTemplates(), enabled: isAdmin });
  const stored = list.data?.templates.find((t) => t.kind === kind) ?? null;
  const versions = useQuery({ queryKey: ["pdf-versions", kind], queryFn: () => getPdfTemplateVersions({ data: { kind } }), enabled: isAdmin && !!stored });

  useEffect(() => {
    setDraft(stored ? { name: stored.name, description: stored.description, active: stored.active, translations: structuredClone(stored.translations) } : null);
    setPreviewLabels(undefined);
  }, [stored?.kind, stored?.currentVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useQuery({
    queryKey: ["doc-preview", kind, locale, stored?.currentVersion ?? 0, previewLabels ? JSON.stringify(previewLabels) : ""],
    queryFn: () => previewDocument({ data: { kind, locale, labels: previewLabels } }),
    enabled: isAdmin && list.isSuccess, staleTime: 60_000,
  });
  const url = useMemo(() => (preview.data ? b64url(preview.data.base64) : null), [preview.data]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["pdf-templates"] }).then(() => qc.invalidateQueries({ queryKey: ["pdf-versions"] }));
  const save = useMutation({
    mutationFn: () => savePdfTemplate({ data: { kind, snapshot: draft!, note } }),
    onSuccess: (r) => { setMsg(`Kaydedildi — sürüm ${r.version}.`); setNote(""); refresh(); },
  });
  const restore = useMutation({
    mutationFn: (version: number) => restorePdfTemplateVersion({ data: { kind, version } }),
    onSuccess: (r) => { setMsg(`Geri yüklendi — yeni sürüm ${r.version}.`); refresh(); },
  });
  const seed = useMutation({ mutationFn: () => applyPdfImport({ data: { useSeed: true, onlyMissing: true } }), onSuccess: (r) => { setMsg(`Başlangıç şablonları yüklendi: ${r.applied.length}.`); refresh(); } });

  const [importJson, setImportJson] = useState<string | null>(null);
  const importPreview = useMutation({ mutationFn: (json: string) => previewPdfImport({ data: { json } }) });
  const importApply = useMutation({
    mutationFn: () => applyPdfImport({ data: { json: importJson! } }),
    onSuccess: (r) => { setMsg(`İçe aktarıldı: ${r.applied.join(", ") || "değişiklik yok"}.`); setImportJson(null); importPreview.reset(); refresh(); },
  });

  const resolved = resolveDocumentLocale(locale, draft ? Object.fromEntries(Object.entries(draft.translations).map(([l, t]) => [l, t!.labels])) : SEED_LABELS);
  const current = draft?.translations[locale];
  const errors = current ? validateLabels(current.labels) : [];
  const dirty = !!stored && !!draft && JSON.stringify(draft) !== JSON.stringify({ name: stored.name, description: stored.description, active: stored.active, translations: stored.translations });

  const setLabel = (k: (typeof LABEL_KEYS)[number], v: string) =>
    setDraft((d) => d && { ...d, translations: { ...d.translations, [locale]: { ...d.translations[locale]!, labels: { ...d.translations[locale]!.labels, [k]: v } } } });

  return (
    <AdminGate title="Belgeler (PDF)">
      <div className="grid gap-4">
        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Yalnız örnek (sentetik) veriler, "ÖRNEK" damgası. Belge numarası atanmaz, gerçek fatura düzenlenmez, müşteri belgesi saklanmaz veya gönderilmez.
          Belge düzenleme özelliği kapalı; şirket ve vergi bilgileri ayrıca onaylanana kadar açılmaz.
        </p>
        {msg && <p role="status" className="rounded-md border border-primary/40 bg-primary/5 p-2 text-sm">{msg}</p>}
        {list.isPending ? <AdminLoading label="Şablonlar yükleniyor…" /> : list.error ? <AdminError error={list.error} /> : (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <AdminPanel title="Belge türleri">
                <ul className="grid gap-1">
                  {DOCUMENT_KINDS.map((k) => {
                    const t = list.data!.templates.find((x) => x.kind === k);
                    return (
                      <li key={k}>
                        <button type="button" onClick={() => { setKind(k); setMsg(null); }} className={`w-full rounded-md px-3 py-2 text-start text-sm font-semibold ${k === kind ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                          {t?.name ?? KIND_META[k].name}
                          <span className="block text-xs font-normal opacity-80">{t ? `Sürüm ${t.currentVersion} · ${Object.keys(t.translations).length} dil` : "Kayıtlı değil (kod şablonu)"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.data!.templates.length < DOCUMENT_KINDS.length && (
                  <Button size="sm" className="mt-3 w-full" disabled={seed.isPending} onClick={() => seed.mutate()}>Başlangıç şablonlarını yükle</Button>
                )}
              </AdminPanel>
              <AdminPanel title="JSON aktarımı">
                <div className="grid gap-2">
                  <Button size="sm" variant="outline" onClick={async () => download(`pasaportio-pdf-templates-${new Date().toISOString().slice(0, 10)}.json`, await exportPdfTemplates())}>Dışa aktar (JSON)</Button>
                  <label className="text-xs font-semibold">
                    İçe aktar
                    <input type="file" accept="application/json,.json" className="mt-1 block w-full text-xs" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const text = await f.text();
                      setImportJson(text);
                      importPreview.mutate(text);
                      e.target.value = "";
                    }} />
                  </label>
                  {importPreview.data && !importPreview.data.ok && (
                    <ul className="list-disc ps-4 text-xs text-destructive">{importPreview.data.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  )}
                  {importPreview.data?.ok && (
                    <div className="grid gap-2 text-xs">
                      <ul className="grid gap-1">
                        {importPreview.data.changes.map((c) => (
                          <li key={c.kind}><strong>{KIND_META[c.kind].name}</strong>: {c.change === "new" ? "yeni" : c.change === "changed" ? "değişecek" : "değişiklik yok"}
                            {c.locales.length > 0 && <span className="text-muted-foreground"> ({c.locales.map((l) => `${l.locale.toUpperCase()} ${l.change === "added" ? "eklenir" : l.change === "removed" ? "kaldırılır" : "değişir"}`).join(", ")})</span>}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={importApply.isPending || importPreview.data.changes.every((c) => c.change === "unchanged")} onClick={() => importApply.mutate()}>Uygula (yeni sürüm)</Button>
                        <Button size="sm" variant="outline" onClick={() => { setImportJson(null); importPreview.reset(); }}>Vazgeç</Button>
                      </div>
                    </div>
                  )}
                  {importApply.error && <AdminError error={importApply.error} />}
                </div>
              </AdminPanel>
            </div>

            <div className="grid min-w-0 gap-4">
              <AdminPanel title="Dil">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="Dil">
                  {DOCUMENT_LOCALES.map((l) => {
                    const has = draft ? !!draft.translations[l] : !!SEED_LABELS[l];
                    return (
                      <button key={l} type="button" role="tab" aria-selected={l === locale} onClick={() => { setLocale(l); setPreviewLabels(undefined); }}
                        className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${l === locale ? "border-primary bg-primary text-primary-foreground" : "border-border"} ${has ? "" : "opacity-60"}`}>
                        {l}{!has && " ↩"}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">↩ = metin yok, belge İngilizce oluşturulur. Zorunlu diller: {COMPLETE_DOCUMENT_LOCALES.join(", ").toUpperCase()}.</p>
                {resolved.fallback && (
                  <p className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
                    {resolved.reason === "script" ? `${locale.toUpperCase()}: bu dilin yazı tipi henüz eklenmedi` : `${locale.toUpperCase()}: bu dilin metni yok`} — belge İngilizce (EN) oluşturulur.
                  </p>
                )}
              </AdminPanel>

              <AdminPanel title={`Önizleme — ${draft?.name ?? KIND_META[kind].name}`} action={
                <div className="flex gap-1">
                  <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>Masaüstü</Button>
                  <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>Mobil</Button>
                </div>}>
                {preview.isPending ? <AdminLoading label="PDF oluşturuluyor…" /> : preview.error ? <AdminError error={preview.error} /> : url && (
                  <div className="grid gap-2">
                    <p className="text-xs text-muted-foreground">
                      {preview.data!.pages} sayfa · {(preview.data!.size / 1024).toFixed(0)} KB · dil {preview.data!.locale.toUpperCase()} · kaynak: {previewLabels ? "kaydedilmemiş düzenleme" : preview.data!.source === "database" ? "kayıtlı şablon" : "kod şablonu"}
                    </p>
                    <div className="overflow-x-auto rounded-md border border-border bg-muted/30 p-2">
                      <iframe title="PDF önizlemesi" src={url} className="mx-auto block h-[720px] max-w-full rounded bg-background" style={{ width: device === "mobile" ? 375 : 760 }} />
                    </div>
                    <a href={url} download={`ornek-${kind}-${locale}.pdf`} className="justify-self-start text-sm font-semibold text-primary underline">Örnek PDF'i indir</a>
                  </div>
                )}
              </AdminPanel>

              {!draft ? (
                <AdminPanel title="Şablon metinleri">
                  <p className="text-sm text-muted-foreground">Bu tür henüz kayıtlı değil. Düzenlemek için "Başlangıç şablonlarını yükle" düğmesini kullanın.</p>
                </AdminPanel>
              ) : (
                <AdminPanel title={`Metinleri düzenle — ${locale.toUpperCase()}`}>
                  <div className="grid gap-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold">Ad
                        <input className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                      </label>
                      <label className="text-xs font-semibold">Açıklama
                        <input className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                      </label>
                    </div>
                    {!current ? (
                      <div className="grid gap-2 text-sm">
                        <p className="text-muted-foreground">{locale.toUpperCase()} için metin yok; İngilizce kullanılıyor{!RENDERABLE_LOCALES.includes(locale) && " (bu dilin yazı tipi de henüz yok)"}.</p>
                        <Button size="sm" variant="outline" className="justify-self-start" disabled={!draft.translations.en}
                          onClick={() => setDraft({ ...draft, translations: { ...draft.translations, [locale]: { labels: { ...draft.translations.en!.labels }, draft: true } } })}>
                          İngilizceden başlat (taslak)
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <label className="flex items-center gap-1"><input type="checkbox" checked={current.draft} onChange={(e) => setDraft({ ...draft, translations: { ...draft.translations, [locale]: { ...current, draft: e.target.checked } } })} /> Taslak (anadil kontrolü gerekli)</label>
                          {!COMPLETE_DOCUMENT_LOCALES.includes(locale) && (
                            <Button size="sm" variant="outline" onClick={() => { const t = { ...draft.translations }; delete t[locale]; setDraft({ ...draft, translations: t }); }}>Bu dili kaldır</Button>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2" dir={RTL_DOCUMENT_LOCALES.includes(locale) ? "rtl" : "ltr"}>
                          {LABEL_KEYS.map((k) => (
                            <label key={k} className="grid gap-1 text-xs">
                              <span className="font-mono text-muted-foreground" dir="ltr">{k}</span>
                              <textarea rows={current.labels[k]?.length > 60 ? 3 : 1} className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm" value={current.labels[k] ?? ""} onChange={(e) => setLabel(k, e.target.value)} />
                            </label>
                          ))}
                        </div>
                        {errors.length > 0 && <ul className="list-disc ps-4 text-xs text-destructive">{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>}
                        <Button size="sm" variant="outline" className="justify-self-start" disabled={errors.length > 0} onClick={() => setPreviewLabels({ ...current.labels })}>Düzenlemeyi önizle</Button>
                      </>
                    )}
                    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                      <label className="grow text-xs font-semibold">Değişiklik notu
                        <input className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                      </label>
                      <Button disabled={!dirty || save.isPending || errors.length > 0} onClick={() => save.mutate()}>Kaydet (yeni sürüm)</Button>
                      <Button variant="outline" disabled={!dirty} onClick={() => { setDraft({ name: stored!.name, description: stored!.description, active: stored!.active, translations: structuredClone(stored!.translations) }); setPreviewLabels(undefined); }}>Değişiklikleri at</Button>
                    </div>
                    {save.error && <AdminError error={save.error} />}
                  </div>
                </AdminPanel>
              )}

              {stored && (
                <AdminPanel title="Sürüm geçmişi">
                  {versions.isPending ? <AdminLoading label="Yükleniyor…" /> : versions.error ? <AdminError error={versions.error} /> : (
                    <ul className="grid gap-1 text-sm">
                      {versions.data!.versions.map((v: any) => (
                        <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                          <span><strong>v{v.version}</strong> · {new Date(v.created_at).toLocaleString("tr-TR")} · {v.change_note || "—"}{v.restored_from ? ` (v${v.restored_from} kaynağından)` : ""}</span>
                          {v.version !== stored.currentVersion
                            ? <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(v.version)}>Geri yükle</Button>
                            : <span className="text-xs text-muted-foreground">Güncel</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {restore.error && <AdminError error={restore.error} />}
                </AdminPanel>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
