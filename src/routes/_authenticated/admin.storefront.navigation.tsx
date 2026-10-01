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
import type { FooterGroup, LocaleText, NavigationLink, StorefrontConfig } from "@/domain/storefront/registry";
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
              <div className="mt-4 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.footer.newsletterVisible} onChange={(event) => patch({ footer: { ...draft.footer, newsletterVisible: event.target.checked } })} />Newsletter alanını göster</label>
                <p className="mt-1 text-[10px] text-muted-foreground">Abonelik altyapısı olmadığı için alan kamuya açık görünse bile giriş ve buton devre dışı kalır.</p>
                <div className="mt-3 grid gap-2">
                  <Field label={`Newsletter başlığı (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.footer.newsletterTitle[locale]} onChange={(event) => patch({ footer: { ...draft.footer, newsletterTitle: { ...draft.footer.newsletterTitle, [locale]: event.target.value } } })}/></Field>
                  <Field label={`Newsletter açıklaması (${locale.toUpperCase()})`}><textarea rows={2} className="admin-field mt-1 w-full" value={draft.footer.newsletterDescription[locale]} onChange={(event) => patch({ footer: { ...draft.footer, newsletterDescription: { ...draft.footer.newsletterDescription, [locale]: event.target.value } } })}/></Field>
                  <Field label={`Giriş metni (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.footer.newsletterPlaceholder[locale]} onChange={(event) => patch({ footer: { ...draft.footer, newsletterPlaceholder: { ...draft.footer.newsletterPlaceholder, [locale]: event.target.value } } })}/></Field>
                  <Field label={`Buton (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.footer.newsletterCta[locale]} onChange={(event) => patch({ footer: { ...draft.footer, newsletterCta: { ...draft.footer.newsletterCta, [locale]: event.target.value } } })}/></Field>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <strong className="text-xs">Sosyal bağlantılar</strong>
                <div className="mt-2 grid gap-2">{draft.footer.socials.map((social,index)=><div key={`${social.id}-${index}`} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] gap-2"><input className="admin-field" aria-label="Platform" value={social.id} onChange={(event)=>patch({footer:{...draft.footer,socials:draft.footer.socials.map((row,i)=>i===index?{...row,id:event.target.value}:row)}})}/><input className="admin-field" aria-label="HTTPS adresi" value={social.url} placeholder="https://" onChange={(event)=>patch({footer:{...draft.footer,socials:draft.footer.socials.map((row,i)=>i===index?{...row,url:event.target.value}:row)}})}/><label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={social.active} onChange={(event)=>patch({footer:{...draft.footer,socials:draft.footer.socials.map((row,i)=>i===index?{...row,active:event.target.checked}:row)}})}/>Aktif</label></div>)}</div>
                <Button className="mt-2" size="sm" variant="outline" onClick={()=>patch({footer:{...draft.footer,socials:[...draft.footer.socials,{id:"sosyal",url:"",active:false}]}})}><Plus/>Bağlantı ekle</Button>
              </div>
              <div className="mt-4 border-t border-border pt-3"><strong className="text-xs">Ödeme logoları</strong><p className="mt-1 text-[10px] text-muted-foreground">Canlı ödeme sağlayıcısı yapılandırılmadığı için Visa, Mastercard, PayPal, Apple Pay ve Google Pay logoları güvenli olarak gizli tutulur.</p></div>
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
    <AdminPanel title={title} action={<Button size="sm" variant="outline" onClick={() => onChange([...rows, { id: `link-${Math.random().toString(36).slice(2, 7)}`, href: "/", visible: true, group: "help", label: emptyText() }])}><Plus />Ekle</Button>}>
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
              <Field label="Grup"><select className="admin-field mt-1 w-full" value={row.group ?? "help"} onChange={(event) => onChange(rows.map((item) => item.id === row.id ? { ...item, group: event.target.value as FooterGroup } : item))}><option value="services">Hizmetler</option><option value="help">Yardım</option><option value="legal">Yasal</option></select></Field>
              <Field label="Hedef" hint="Yalnızca site içi adres (örn. /esim/paketler)."><input className="admin-field mt-1 w-full" value={row.href} onChange={(event) => onChange(rows.map((item) => (item.id === row.id ? { ...item, href: event.target.value } : item)))} /></Field>
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
