import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AdminGate, useIsAdmin } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { DOCUMENT_KINDS, DOCUMENT_LOCALES, DRAFT_LOCALES, LABEL_KEYS, SEED_LABELS, resolveDocumentLocale, type DocumentKind, type DocumentLocale } from "@/domain/documents/catalog";
import { previewDocument } from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  head: () => adminHead("Belgeler (PDF)", "Fatura, sipariş özeti, iade dekontu ve eSIM rehberi PDF önizlemesi."),
  component: Documents,
});

const KIND_NAME: Record<DocumentKind, string> = {
  invoice: "Fatura", "order-summary": "Sipariş özeti", "credit-note": "İade / alacak dekontu", "esim-guide": "eSIM kurulum rehberi",
};

function Documents() {
  const isAdmin = useIsAdmin();
  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [locale, setLocale] = useState<DocumentLocale>("tr");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const q = useQuery({ queryKey: ["doc-preview", kind, locale], queryFn: () => previewDocument({ data: { kind, locale } }), enabled: isAdmin, staleTime: 60_000 });
  const url = useMemo(() => {
    if (!q.data) return null;
    const bin = atob(q.data.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  }, [q.data]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const resolved = resolveDocumentLocale(locale);
  const labels = SEED_LABELS[resolved.locale]!;

  const exportSeed = () => {
    const blob = new Blob([JSON.stringify({ format: "pasaportio.pdf-templates", version: 1, labels: SEED_LABELS }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pasaportio-pdf-templates-seed.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AdminGate title="Belgeler (PDF)">
      <div className="grid gap-4">
        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Yalnız önizleme: örnek (sentetik) veriler, "ÖRNEK" damgası, belge numarası atanmaz, hiçbir şey kaydedilmez veya gönderilmez.
          Şirket ve vergi bilgileri girilip ayrıca onaylanana kadar geçerli fatura oluşturulmaz. Metin düzenleme ve sürüm geçmişi, şablon tabloları onaylandığında açılır.
        </p>
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <AdminPanel title="Belge türleri">
            <ul className="grid gap-1">
              {DOCUMENT_KINDS.map((k) => (
                <li key={k}>
                  <button type="button" onClick={() => setKind(k)} className={`w-full rounded-md px-3 py-2 text-start text-sm font-semibold ${k === kind ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{KIND_NAME[k]}</button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={exportSeed}>Şablon metinlerini JSON indir</Button>
          </AdminPanel>
          <div className="grid min-w-0 gap-4">
            <AdminPanel title={KIND_NAME[kind]} action={
              <div className="flex gap-1">
                <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>Masaüstü</Button>
                <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>Mobil</Button>
              </div>}>
              <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Dil">
                {DOCUMENT_LOCALES.map((l) => (
                  <button key={l} type="button" role="tab" aria-selected={l === locale} onClick={() => setLocale(l)}
                    className={`rounded border px-2 py-1 text-xs font-semibold uppercase ${l === locale ? "border-primary bg-primary text-primary-foreground" : "border-border"} ${SEED_LABELS[l] ? "" : "opacity-60"}`}>{l}</button>
                ))}
              </div>
              {resolved.fallback && (
                <p className="mb-3 rounded-md border border-border bg-muted/40 p-2 text-xs">
                  {resolved.reason === "script" ? "Bu dilin yazı tipi henüz eklenmedi" : "Bu dilin metni yok"} — belge İngilizce oluşturulur.
                </p>
              )}
              {DRAFT_LOCALES.includes(locale) && <p className="mb-3 text-xs text-muted-foreground">Arapça metinler taslaktır; yayından önce anadil kontrolü gerekir.</p>}
              {q.isPending ? <AdminLoading label="PDF oluşturuluyor…" /> : q.error ? <AdminError error={q.error} /> : url && (
                <div className="grid gap-2">
                  <p className="text-xs text-muted-foreground">{q.data!.pages} sayfa · {(q.data!.size / 1024).toFixed(0)} KB · dil {q.data!.locale.toUpperCase()}</p>
                  <div className="overflow-x-auto rounded-md border border-border bg-muted/30 p-2">
                    <iframe title="PDF önizlemesi" src={url} className="mx-auto block h-[720px] max-w-full rounded bg-background" style={{ width: device === "mobile" ? 375 : 760 }} />
                  </div>
                  <a href={url} download={`ornek-${kind}-${locale}.pdf`} className="justify-self-start text-sm font-semibold text-primary underline">Örnek PDF'i indir</a>
                </div>
              )}
            </AdminPanel>
            <AdminPanel title="Şablon metinleri (salt okunur)">
              <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[180px_minmax(0,1fr)]" dir={resolved.locale === "ar" ? "rtl" : "ltr"}>
                {LABEL_KEYS.map((k) => (<div key={k} className="contents"><dt className="text-muted-foreground" dir="ltr">{k}</dt><dd className="break-words">{labels[k]}</dd></div>))}
              </dl>
            </AdminPanel>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
