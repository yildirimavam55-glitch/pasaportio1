import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { MediaField } from "@/components/admin/MediaPicker";
import { IconPicker } from "@/components/admin/IconPicker";
import { Button } from "@/components/ui/button";
import { deleteRoutePreset, listRoutePresets, saveRoutePreset } from "@/lib/merchandising.functions";
import { emptyLocaleText, sanitizeMarketing, type MarketingContent } from "@/domain/merchandising";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/esim/route-presets")({
  head: () => adminHead("Rota şablonları", "Sıla Yolu ve diğer çoklu ülke rotaları."),
  component: RoutePresets,
});

type Draft = {
  id: string | null;
  name: string;
  icon: string;
  countries: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  mediaId: string | null;
  mobileMediaId: string | null;
  content: MarketingContent;
};

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  icon: "Route",
  countries: "",
  active: true,
  featured: false,
  sortOrder: 0,
  mediaId: null,
  mobileMediaId: null,
  content: { title: emptyLocaleText(), description: emptyLocaleText(), cta: emptyLocaleText(), seoTitle: emptyLocaleText(), seoDescription: emptyLocaleText() },
});

function RoutePresets() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>("tr");
  const list = useQuery({ queryKey: ["route-presets"], queryFn: () => listRoutePresets() });

  const save = useMutation({
    mutationFn: () => saveRoutePreset({
      data: {
        id: draft!.id,
        name: draft!.name,
        icon: draft!.icon,
        countries: draft!.countries.split(",").map((code) => code.trim()).filter(Boolean),
        active: draft!.active,
        featured: draft!.featured,
        sortOrder: draft!.sortOrder,
        mediaId: draft!.mediaId,
        mobileMediaId: draft!.mobileMediaId,
        content: draft!.content,
      },
    }),
    onSuccess: async () => { toast.success("Rota kaydedildi."); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["route-presets"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRoutePreset({ data: { id } }),
    onSuccess: async () => { toast.success("Rota silindi."); await queryClient.invalidateQueries({ queryKey: ["route-presets"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = (list.data ?? []) as any[];
  const setText = (key: keyof MarketingContent, value: string) =>
    setDraft((current) => (current ? { ...current, content: { ...current.content, [key]: { ...current.content[key], [locale]: value } } } : current));

  return (
    <AdminGate title="eSIM · Rota şablonları">
      <AdminPanel title="Rotalar" action={<Button size="sm" variant="cta" onClick={() => setDraft(emptyDraft())}><Plus />Rota ekle</Button>}>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !rows.length ? (
          <EmptyState title="Henüz rota yok." detail="Sıla Yolu gibi çoklu ülke rotalarını buradan yönetebilirsin." />
        ) : (
          <div className="grid gap-1.5">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft({
                    id: row.id,
                    name: row.content?.title?.tr || row.slug,
                    icon: row.icon,
                    countries: (row.countries ?? []).join(", "),
                    active: row.active,
                    featured: row.featured,
                    sortOrder: row.sort_order,
                    mediaId: row.media_id,
                    mobileMediaId: row.mobile_media_id,
                    content: sanitizeMarketing(row.content),
                  })}
                >
                  <strong>{row.content?.title?.tr || row.slug}</strong>
                  <span className="ml-2 text-muted-foreground">{(row.countries ?? []).join(", ") || "Ülke seçilmedi"}</span>
                </button>
                <StatusBadge value={row.active ? "ACTIVE" : "PAUSED"} />
                <button type="button" className="size-7 rounded text-destructive hover:bg-destructive/10" aria-label="Sil" onClick={() => { if (confirm("Bu rota silinsin mi?")) remove.mutate(row.id); }}><Trash2 className="mx-auto size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Sıla Yolu dahil tüm rotalar buradan düzenlenebilir; hiçbiri koda gömülü değildir.</p>
      </AdminPanel>

      <AdminDrawer open={Boolean(draft)} title={draft?.id ? "Rotayı düzenle" : "Yeni rota"} onClose={() => setDraft(null)}>
        {draft && (
          <div className="grid gap-3">
            <div className="flex gap-1">
              {(["tr", "de", "en"] as const).map((value) => (
                <Button key={value} size="sm" variant={locale === value ? "secondary" : "outline"} onClick={() => setLocale(value)}>{value.toUpperCase()}</Button>
              ))}
            </div>
            <Field label="Yönetim adı"><input className="admin-field mt-1 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label={`Müşteri başlığı (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.content.title[locale]} onChange={(event) => setText("title", event.target.value)} /></Field>
            <Field label={`Açıklama (${locale.toUpperCase()})`}><textarea rows={3} className="admin-field mt-1 w-full" value={draft.content.description[locale]} onChange={(event) => setText("description", event.target.value)} /></Field>
            <Field label="Ülkeler / duraklar" hint="ISO kodlarını virgülle ayır: TR, BG, RS, AT, DE"><input className="admin-field mt-1 w-full" value={draft.countries} onChange={(event) => setDraft({ ...draft, countries: event.target.value })} /></Field>
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
            <MediaField label="Masaüstü görseli" category="DESTINATION" value={draft.mediaId} onChange={(id) => setDraft({ ...draft, mediaId: id })} />
            <MediaField label="Mobil görseli" category="DESTINATION" value={draft.mobileMediaId} onChange={(id) => setDraft({ ...draft, mobileMediaId: id })} />
            <Field label="Sıralama"><input type="number" className="admin-field mt-1 w-full" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) || 0 })} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Aktif</label>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />Öne çıkar</label>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
              <Button variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
            </div>
          </div>
        )}
      </AdminDrawer>
    </AdminGate>
  );
}
