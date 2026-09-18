import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2, Upload } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getStorefrontEditor, saveStorefrontDraft } from "@/lib/storefront.functions";
import type { LocaleText, NavigationLink, StorefrontConfig } from "@/domain/storefront/registry";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/storefront/navigation")({
  head: () => adminHead("Menü & alt bilgi", "Alt bilgi metinleri ve bağlantıları."),
  component: NavigationEditor,
});

const emptyText = (): LocaleText => ({ tr: "", de: "", en: "" });

function NavigationEditor() {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState<Locale>("tr");
  const [draft, setDraft] = useState<StorefrontConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const editor = useQuery({ queryKey: ["storefront-editor", "global"], queryFn: () => getStorefrontEditor({ data: { service: "global" } }) });

  useEffect(() => { if (editor.data) { setDraft(editor.data.draft); setDirty(false); } }, [editor.data]);

  const save = useMutation({
    mutationFn: (publish: boolean) => saveStorefrontDraft({ data: { service: "global", config: draft!, publish } }),
    onSuccess: async (_result, publish) => { setDirty(false); toast.success(publish ? "Yayınlandı." : "Taslak kaydedildi."); await queryClient.invalidateQueries({ queryKey: ["storefront-editor", "global"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const patch = (next: Partial<StorefrontConfig>) => { setDraft((current) => (current ? { ...current, ...next } : current)); setDirty(true); };
  const editLinks = (key: "navigation" | "footerLinks", rows: NavigationLink[]) => patch({ [key]: rows } as Partial<StorefrontConfig>);

  return (
    <AdminGate title="Mağaza · Menü & alt bilgi">
      {editor.isPending || !draft ? <AdminLoading /> : editor.error ? <AdminError error={editor.error} /> : (
        <div className="grid gap-3">
          <AdminPanel title="Diller" action={
            <div className="flex items-center gap-2">
              {dirty && <span className="rounded-full bg-warning/20 px-2 py-1 text-[10px] font-bold">Kaydedilmemiş</span>}
              <Button size="sm" variant="secondary" disabled={save.isPending} onClick={() => save.mutate(false)}><Save />Taslak</Button>
              <Button size="sm" variant="cta" disabled={save.isPending} onClick={() => save.mutate(true)}><Upload />Yayınla</Button>
            </div>
          }>
            <div className="flex gap-1">
              {(["tr", "de", "en"] as const).map((value) => (
                <Button key={value} size="sm" variant={locale === value ? "secondary" : "outline"} onClick={() => setLocale(value)}>{value.toUpperCase()}</Button>
              ))}
            </div>
          </AdminPanel>

          <div className="grid gap-3 lg:grid-cols-2">
            <LinkList
              title="Alt bilgi bağlantıları"
              rows={draft.footerLinks}
              locale={locale}
              onChange={(rows) => editLinks("footerLinks", rows)}
            />
            <AdminPanel title="Alt bilgi metinleri">
              <div className="grid gap-2">
                <Field label={`Açıklama (${locale.toUpperCase()})`}>
                  <textarea className="admin-field mt-1 w-full" rows={3} value={draft.footerText[locale] ?? ""} onChange={(event) => patch({ footerText: { ...draft.footerText, [locale]: event.target.value } })} />
                </Field>
                <Field label={`Telif metni (${locale.toUpperCase()})`}>
                  <input className="admin-field mt-1 w-full" value={draft.copyright[locale] ?? ""} onChange={(event) => patch({ copyright: { ...draft.copyright, [locale]: event.target.value } })} />
                </Field>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Üst menü ve mobil alt menü yapısı ürün tarafında sabittir; buradan yalnızca alt bilgi içeriği yönetilir. Yönetim sayfaları hiçbir zaman genel menüye eklenemez.</p>
            </AdminPanel>
          </div>
        </div>
      )}
    </AdminGate>
  );
}

function LinkList({ title, rows, locale, onChange }: { title: string; rows: NavigationLink[]; locale: Locale; onChange: (rows: NavigationLink[]) => void }) {
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= rows.length) return;
    const copy = [...rows];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row!);
    onChange(copy);
  };
  return (
    <AdminPanel title={title} action={<Button size="sm" variant="outline" onClick={() => onChange([...rows, { id: `link-${Math.random().toString(36).slice(2, 7)}`, href: "/", visible: true, label: emptyText() }])}><Plus />Ekle</Button>}>
      {!rows.length ? <EmptyState title="Bağlantı yok." /> : (
        <div className="grid gap-2">
          {rows.map((row, index) => (
            <div key={row.id} className="grid gap-2 rounded-md border border-border p-2.5">
              <div className="flex items-center gap-1">
                <strong className="flex-1 truncate text-xs">{row.label[locale] || row.label.tr || "Bağlantı"}</strong>
                <button type="button" className="size-7 rounded hover:bg-secondary" aria-label="Yukarı" onClick={() => move(index, -1)}><ArrowUp className="mx-auto size-3.5" /></button>
                <button type="button" className="size-7 rounded hover:bg-secondary" aria-label="Aşağı" onClick={() => move(index, 1)}><ArrowDown className="mx-auto size-3.5" /></button>
                <button type="button" className="size-7 rounded hover:bg-secondary" aria-label={row.visible ? "Gizle" : "Göster"} onClick={() => onChange(rows.map((item) => (item.id === row.id ? { ...item, visible: !item.visible } : item)))}>{row.visible ? <Eye className="mx-auto size-3.5" /> : <EyeOff className="mx-auto size-3.5" />}</button>
                <button type="button" className="size-7 rounded text-destructive hover:bg-destructive/10" aria-label="Sil" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}><Trash2 className="mx-auto size-3.5" /></button>
              </div>
              <Field label={`Etiket (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={row.label[locale] ?? ""} onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, label: { ...item.label, [locale]: event.target.value } } : item)))} /></Field>
              <Field label="Hedef" hint="Yalnızca site içi adres (örn. /esim/paketler)."><input className="admin-field mt-1 w-full" value={row.href} onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, href: event.target.value } : item)))} /></Field>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
