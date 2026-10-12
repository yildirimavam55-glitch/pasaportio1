import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { LOCALE_REGISTRY } from "@/i18n/locales";
import { allowedVariables, COMPLETE_LOCALES, EMAIL_LOCALES, PREVIEW_DATA, type EmailLocale, type EmailTemplateKey, type TemplateCopy } from "@/domain/email/catalog";
import { renderEmail, resolveCopy, validateCopy } from "@/domain/email/render";
import {
  applyEmailImport, exportEmailTemplates, getEmailTemplateVersions, listEmailTemplates,
  previewEmailImport, restoreEmailTemplateVersion, saveEmailTemplate,
} from "@/lib/email-templates.functions";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => adminHead("E-postalar", "İşlem e-postası şablonları, önizleme ve sürüm geçmişi."),
  component: Emails,
});

type Tpl = Awaited<ReturnType<typeof listEmailTemplates>>["templates"][number];
const dt = (v: string) => new Date(v).toLocaleString("tr-TR");
const EMPTY: TemplateCopy = { subject: "", preheader: "", body: "" };

function Emails() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["email-templates"], queryFn: () => listEmailTemplates() });
  const [selected, setSelected] = useState<EmailTemplateKey | null>(null);
  const templates = list.data?.templates ?? [];
  const current = templates.find((t) => t.key === selected) ?? templates[0] ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["email-templates"] });

  return (
    <AdminGate title="E-postalar">
      <div className="grid gap-4">
        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Gerçek e-posta gönderimi kapalı. Şablonlar yalnız saklanır, önizlenir ve dışa aktarılır; önizlemede yalnız örnek (sentetik) veriler kullanılır.
          QR kodu ve aktivasyon bilgisi hiçbir e-postaya eklenmez.
        </p>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : (
          <>
            {templates.length < 9 && <SeedPanel count={templates.length} onDone={refresh} />}
            {templates.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <AdminPanel title="Şablonlar">
                  <ul className="grid gap-1">
                    {templates.map((t) => (
                      <li key={t.key}>
                        <button type="button" onClick={() => setSelected(t.key)} className={`w-full rounded-md px-3 py-2 text-start text-sm ${current?.key === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                          <span className="block font-semibold">{t.name}</span>
                          <span className="block text-xs opacity-80">Sürüm {t.currentVersion} · {Object.keys(t.translations).length} dil{t.active ? "" : " · pasif"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </AdminPanel>
                {current && <Editor key={`${current.key}-${current.currentVersion}`} tpl={current} onSaved={refresh} />}
              </div>
            )}
            <TransferPanel onDone={refresh} />
          </>
        )}
      </div>
    </AdminGate>
  );
}

function SeedPanel({ count, onDone }: { count: number; onDone: () => void }) {
  const apply = useMutation({
    mutationFn: () => applyEmailImport({ data: { useSeed: true, onlyMissing: true } }),
    onSuccess: (r) => { toast.success(`${r.applied.length} başlangıç şablonu yüklendi.`); onDone(); },
    onError: (e) => toast.error(String((e as Error).message)),
  });
  return (
    <AdminPanel title="Başlangıç şablonları">
      <p className="mb-3 text-sm text-muted-foreground">{count === 0 ? "Henüz şablon yok." : `${9 - count} şablon eksik.`} Koddaki taşınabilir yedekten eksik şablonlar (TR/DE/EN) yüklenir; mevcut şablonlar değişmez.</p>
      <Button size="sm" disabled={apply.isPending} onClick={() => apply.mutate()}>Eksik şablonları yükle</Button>
    </AdminPanel>
  );
}

function Editor({ tpl, onSaved }: { tpl: Tpl; onSaved: () => void }) {
  const [locale, setLocale] = useState<EmailLocale>("tr");
  const [draft, setDraft] = useState(() => ({ name: tpl.name, description: tpl.description, active: tpl.active, translations: { ...tpl.translations } as Partial<Record<EmailLocale, TemplateCopy>> }));
  const [note, setNote] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const own = draft.translations[locale];
  const copy = own ?? EMPTY;
  const isComplete = COMPLETE_LOCALES.includes(locale);
  const errors = own ? validateCopy(tpl.key, own) : [];
  const resolved = resolveCopy(draft.translations, locale);
  const rendered = useMemo(() => (resolved ? renderEmail(tpl.key, resolved.copy, locale, PREVIEW_DATA) : null), [resolved, tpl.key, locale]);
  const dirty = JSON.stringify(draft) !== JSON.stringify({ name: tpl.name, description: tpl.description, active: tpl.active, translations: tpl.translations });

  const setField = (field: keyof TemplateCopy, value: string) =>
    setDraft((d) => ({ ...d, translations: { ...d.translations, [locale]: { ...(d.translations[locale] ?? EMPTY), [field]: value } } }));
  const save = useMutation({
    mutationFn: () => saveEmailTemplate({ data: { key: tpl.key, snapshot: draft, note } }),
    onSuccess: (r) => { toast.success(`Kaydedildi — sürüm ${r.version}.`); setNote(""); onSaved(); },
    onError: (e) => toast.error(String((e as Error).message)),
  });

  return (
    <div className="grid min-w-0 gap-4">
      <AdminPanel title={tpl.name} action={<StatusBadge value={tpl.active ? "ACTIVE" : "INACTIVE"} />}>
        <p className="mb-3 text-xs text-muted-foreground">{tpl.description} · Son güncelleme {dt(tpl.updatedAt)}</p>
        <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Dil">
          {EMAIL_LOCALES.map((l) => (
            <button key={l} type="button" role="tab" aria-selected={l === locale} onClick={() => setLocale(l)}
              className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${l === locale ? "border-primary bg-primary text-primary-foreground" : "border-border"} ${draft.translations[l] ? "" : "opacity-60"}`}>
              {l}
            </button>
          ))}
        </div>
        {!own && (
          <div className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-xs">
            {LOCALE_REGISTRY[locale].nativeName}: kendi metni yok — müşteriye İngilizce sürüm gönderilir.
            <Button size="sm" variant="outline" className="ms-2" onClick={() => setDraft((d) => ({ ...d, translations: { ...d.translations, [locale]: { ...(d.translations.en ?? EMPTY) } } }))}>İngilizceden başlat</Button>
          </div>
        )}
        {own && (
          <div className="grid gap-3">
            <Field label="Konu"><input className="admin-field mt-1 w-full" dir={locale === "ar" ? "rtl" : "ltr"} value={copy.subject} onChange={(e) => setField("subject", e.target.value)} /></Field>
            <Field label="Önizleme metni" hint="Gelen kutusunda konunun yanında görünür."><input className="admin-field mt-1 w-full" dir={locale === "ar" ? "rtl" : "ltr"} value={copy.preheader} onChange={(e) => setField("preheader", e.target.value)} /></Field>
            <Field label="Metin" hint={'"# " başlık · boş satır yeni paragraf · [[button:Etiket]] düğme · HTML kullanılamaz'}>
              <textarea className="admin-field mt-1 min-h-64 w-full font-mono text-xs" dir={locale === "ar" ? "rtl" : "ltr"} value={copy.body} onChange={(e) => setField("body", e.target.value)} />
            </Field>
            <p className="text-xs text-muted-foreground">İzin verilen değişkenler: {allowedVariables(tpl.key).map((v) => `{{${v}}}`).join(" ")}</p>
            {!isComplete && <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setDraft((d) => { const t = { ...d.translations }; delete t[locale]; return { ...d, translations: t }; })}>Bu dili kaldır (İngilizceye düş)</Button>}
            {errors.length > 0 && <ul className="list-disc ps-5 text-xs text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
        )}
        <div className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Değişiklik notu"><input className="admin-field mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. Konu kısaltıldı" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} /> Aktif</label>
          <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>Yeni sürüm olarak kaydet</Button>
        </div>
      </AdminPanel>

      <AdminPanel title="Önizleme" action={
        <div className="flex gap-1">
          <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>Masaüstü</Button>
          <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>Mobil</Button>
        </div>}>
        {rendered ? (
          <div className="grid gap-2">
            <p className="text-xs text-muted-foreground">{resolved?.fallback ? `Yedek dil: ${resolved.locale.toUpperCase()} · ` : ""}Örnek veriler · gönderilmez</p>
            <div className="rounded-md border border-border p-2 text-sm"><strong>{rendered.subject}</strong><span className="block text-xs text-muted-foreground">{rendered.preheader}</span></div>
            <div className="overflow-x-auto rounded-md border border-border bg-muted/30 p-2">
              <iframe title="E-posta önizlemesi" sandbox="" srcDoc={rendered.html} className="mx-auto block h-[560px] max-w-full rounded bg-background" style={{ width: device === "mobile" ? 375 : 640 }} />
            </div>
          </div>
        ) : <EmptyState title="Önizlenecek metin yok" />}
      </AdminPanel>

      <VersionPanel tpl={tpl} onRestored={onSaved} />
    </div>
  );
}

function VersionPanel({ tpl, onRestored }: { tpl: Tpl; onRestored: () => void }) {
  const q = useQuery({ queryKey: ["email-template-versions", tpl.key, tpl.currentVersion], queryFn: () => getEmailTemplateVersions({ data: { key: tpl.key } }) });
  const restore = useMutation({
    mutationFn: (version: number) => restoreEmailTemplateVersion({ data: { key: tpl.key, version } }),
    onSuccess: (r) => { toast.success(`Geri yüklendi — yeni sürüm ${r.version}.`); onRestored(); },
    onError: (e) => toast.error(String((e as Error).message)),
  });
  return (
    <AdminPanel title="Sürüm geçmişi">
      <p className="mb-2 text-xs text-muted-foreground">Sürümler değiştirilemez ve silinemez. Geri yükleme, eski içerikle yeni bir sürüm oluşturur.</p>
      {q.isPending ? <AdminLoading /> : q.error ? <AdminError error={q.error} /> : (
        <ul className="grid gap-2">
          {(q.data?.versions ?? []).map((v: any) => (
            <li key={v.version} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm">
              <strong>Sürüm {v.version}</strong>
              {v.version === tpl.currentVersion && <StatusBadge value="CURRENT" />}
              <span className="text-xs text-muted-foreground">{dt(v.created_at)} · {v.change_note || "—"}{v.restored_from ? ` (kaynak: ${v.restored_from})` : ""}</span>
              {v.version !== tpl.currentVersion && (
                <Button size="sm" variant="outline" className="ms-auto" disabled={restore.isPending} onClick={() => { if (window.confirm(`Sürüm ${v.version} geri yüklensin mi?`)) restore.mutate(v.version); }}>Geri yükle</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}

function TransferPanel({ onDone }: { onDone: () => void }) {
  const [json, setJson] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const preview = useMutation({ mutationFn: (text: string) => previewEmailImport({ data: { json: text } }) });
  const apply = useMutation({
    mutationFn: (text: string) => applyEmailImport({ data: { json: text } }),
    onSuccess: (r) => { toast.success(`${r.applied.length} şablon içe aktarıldı.`); setJson(null); preview.reset(); onDone(); },
    onError: (e) => toast.error(String((e as Error).message)),
  });
  useEffect(() => { if (json) preview.mutate(json); }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    try {
      const bundle = await exportEmailTemplates();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pasaportio-email-templates-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(String((e as Error).message)); }
  };
  const result = preview.data;
  const changed = result?.ok ? result.changes.filter((c) => c.kind !== "unchanged") : [];
  return (
    <AdminPanel title="JSON dışa / içe aktarma">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={download}>JSON olarak dışa aktar</Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium">
          JSON dosyası seç
          <input type="file" accept="application/json,.json" className="sr-only" aria-label="İçe aktarılacak JSON dosyası"
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setFileName(f.name); setJson(await f.text()); e.target.value = ""; }} />
        </label>
        {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
      </div>
      {preview.isPending && <AdminLoading label="Dosya doğrulanıyor…" />}
      {result && !result.ok && (
        <div className="mt-3 text-xs text-destructive"><strong>Dosya içe aktarılamaz:</strong><ul className="list-disc ps-5">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
      )}
      {result?.ok && (
        <div className="mt-3 grid gap-2 text-sm">
          <strong>Değişiklik önizlemesi</strong>
          {changed.length === 0 ? <p className="text-xs text-muted-foreground">Dosya mevcut şablonlarla aynı; değişiklik yok.</p> : (
            <ul className="grid gap-1 text-xs">
              {changed.map((c) => (
                <li key={c.key}><StatusBadge value={c.kind === "new" ? "NEW" : "CHANGED"} /> <strong>{c.key}</strong> {c.locales.map((l) => `${l.locale.toUpperCase()} ${l.kind === "added" ? "eklenecek" : l.kind === "removed" ? "kaldırılacak" : "değişecek"}`).join(", ")}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Her değişen şablon için yeni sürüm oluşur; hiçbir şablon silinmez ve eski sürümler korunur.</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={!changed.length || apply.isPending} onClick={() => json && apply.mutate(json)}>İçe aktarmayı onayla</Button>
            <Button size="sm" variant="outline" onClick={() => { setJson(null); setFileName(""); preview.reset(); }}>Vazgeç</Button>
          </div>
        </div>
      )}
    </AdminPanel>
  );
}
