import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, EmptyState, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { MediaField } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/button";
import { listDestinations, saveDestination } from "@/lib/merchandising.functions";
import { sanitizeMarketing, type MarketingContent } from "@/domain/merchandising";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/destinations")({
  head: () => adminHead("Destinasyonlar", "Ülke vitrin içerikleri ve görselleri."),
  component: Destinations,
});

type Row = {
  countryId: string;
  name: string;
  iso2: string;
  region: string | null;
  featured: boolean;
  customerVisible: boolean;
  sortOrder: number;
  mediaId: string | null;
  mobileMediaId: string | null;
  content: MarketingContent;
};

function Destinations() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["admin-destinations", search], queryFn: () => listDestinations({ data: { search } }) });
  const selected = ((list.data ?? []) as Row[]).find((row) => row.countryId === openId) ?? null;

  return (
    <AdminGate title="Destinasyonlar">
      <div className="grid gap-3">
        <AdminPanel title="Ülke vitrini">
          <Field label="Ara"><input className="admin-field mt-1 w-full sm:max-w-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ülke adı" /></Field>
          <p className="mt-2 text-[11px] text-muted-foreground">Ülke listesi sistem referans verisidir. Burada yalnızca vitrin bilgileri yönetilir: öne çıkarma, görünürlük, görsel, pazarlama metni, sıralama ve SEO.</p>
          <div className="mt-3">
            {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !list.data?.length ? <EmptyState title="Ülke bulunamadı." /> : (
              <div className="grid gap-1.5">
                {(list.data as Row[]).map((row) => (
                  <button key={row.countryId} type="button" onClick={() => setOpenId(row.countryId)} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:border-primary">
                    <span><strong>{row.name}</strong> <span className="text-muted-foreground">{row.iso2}{row.region ? ` · ${row.region}` : ""}</span></span>
                    <span className="text-muted-foreground">{row.customerVisible ? "Görünür" : "Gizli"}</span>
                    <span>{row.featured ? <Star className="size-3.5 text-warning" /> : null}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
      <DestinationDrawer row={selected} onClose={() => setOpenId(null)} />
    </AdminGate>
  );
}

function DestinationDrawer({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState<Locale>("tr");
  const [form, setForm] = useState<Row | null>(null);
  useEffect(() => { setForm(row ? { ...row, content: sanitizeMarketing(row.content) } : null); }, [row]);

  const save = useMutation({
    mutationFn: () => saveDestination({ data: { countryId: form!.countryId, featured: form!.featured, customerVisible: form!.customerVisible, sortOrder: form!.sortOrder, mediaId: form!.mediaId, mobileMediaId: form!.mobileMediaId, content: form!.content } }),
    onSuccess: async () => { toast.success("Kaydedildi."); await queryClient.invalidateQueries({ queryKey: ["admin-destinations"] }); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!row || !form) return <AdminDrawer open={false} title="Destinasyon" onClose={onClose}><span /></AdminDrawer>;
  const set = (patch: Partial<Row>) => setForm((current) => (current ? { ...current, ...patch } : current));
  const setText = (key: keyof MarketingContent, value: string) =>
    set({ content: { ...form.content, [key]: { ...form.content[key], [locale]: value } } });

  return (
    <AdminDrawer open title={row.name} subtitle="Vitrin içeriği" onClose={onClose}>
      <div className="grid gap-3">
        <div className="flex gap-1">
          {(["tr", "de", "en"] as const).map((value) => (
            <Button key={value} size="sm" variant={locale === value ? "secondary" : "outline"} onClick={() => setLocale(value)}>{value.toUpperCase()}</Button>
          ))}
        </div>
        <Field label={`Pazarlama başlığı (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={form.content.title[locale]} onChange={(event) => setText("title", event.target.value)} /></Field>
        <Field label={`Kısa açıklama (${locale.toUpperCase()})`}><textarea rows={3} className="admin-field mt-1 w-full" value={form.content.description[locale]} onChange={(event) => setText("description", event.target.value)} /></Field>
        <Field label={`SEO başlığı (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={form.content.seoTitle[locale]} onChange={(event) => setText("seoTitle", event.target.value)} /></Field>
        <Field label={`SEO açıklaması (${locale.toUpperCase()})`}><textarea rows={2} className="admin-field mt-1 w-full" value={form.content.seoDescription[locale]} onChange={(event) => setText("seoDescription", event.target.value)} /></Field>
        <MediaField label="Masaüstü görseli" category="DESTINATION" value={form.mediaId} onChange={(id) => set({ mediaId: id })} />
        <MediaField label="Mobil görseli" category="DESTINATION" value={form.mobileMediaId} onChange={(id) => set({ mobileMediaId: id })} />
        <Field label="Sıralama"><input type="number" className="admin-field mt-1 w-full" value={form.sortOrder} onChange={(event) => set({ sortOrder: Number(event.target.value) || 0 })} /></Field>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.customerVisible} onChange={(event) => set({ customerVisible: event.target.checked })} />Müşteriye görünür</label>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.featured} onChange={(event) => set({ featured: event.target.checked })} />Öne çıkar</label>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </AdminDrawer>
  );
}
