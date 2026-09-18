import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { MediaField } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/button";
import { deleteCampaign, listCampaigns, saveCampaign } from "@/lib/merchandising.functions";
import { emptyLocaleText, sanitizeMarketing, type MarketingContent } from "@/domain/merchandising";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/marketing/campaigns")({
  head: () => adminHead("Kampanyalar", "Süreli kampanya içerikleri."),
  component: Campaigns,
});

type Draft = {
  id: string | null;
  name: string;
  serviceType: "" | "ESIM" | "LOUNGE";
  startsAt: string;
  endsAt: string;
  active: boolean;
  priority: number;
  ctaHref: string;
  mediaId: string | null;
  mobileMediaId: string | null;
  content: MarketingContent;
};

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  serviceType: "",
  startsAt: "",
  endsAt: "",
  active: true,
  priority: 0,
  ctaHref: "",
  mediaId: null,
  mobileMediaId: null,
  content: { title: emptyLocaleText(), description: emptyLocaleText(), cta: emptyLocaleText(), seoTitle: emptyLocaleText(), seoDescription: emptyLocaleText() },
});

const dateValue = (value: string | null) => (value ? String(value).slice(0, 10) : "");

function Campaigns() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [locale, setLocale] = useState<Locale>("tr");
  const list = useQuery({ queryKey: ["campaigns"], queryFn: () => listCampaigns() });

  const save = useMutation({
    mutationFn: () => saveCampaign({
      data: {
        id: draft!.id,
        name: draft!.name,
        serviceType: draft!.serviceType || null,
        startsAt: draft!.startsAt || null,
        endsAt: draft!.endsAt || null,
        active: draft!.active,
        priority: draft!.priority,
        ctaHref: draft!.ctaHref,
        mediaId: draft!.mediaId,
        mobileMediaId: draft!.mobileMediaId,
        content: draft!.content,
      },
    }),
    onSuccess: async () => { toast.success("Kampanya kaydedildi."); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCampaign({ data: { id } }),
    onSuccess: async () => { toast.success("Kampanya silindi."); await queryClient.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = (list.data ?? []) as any[];
  const now = Date.now();
  const setText = (key: keyof MarketingContent, value: string) =>
    setDraft((current) => (current ? { ...current, content: { ...current.content, [key]: { ...current.content[key], [locale]: value } } } : current));

  return (
    <AdminGate title="Pazarlama · Kampanyalar">
      <AdminPanel title="Kampanyalar" action={<Button size="sm" variant="cta" onClick={() => setDraft(emptyDraft())}><Plus />Kampanya ekle</Button>}>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !rows.length ? (
          <EmptyState title="Henüz kampanya yok." detail="Süreli duyuru ve kampanyaları buradan yönetebilirsin." />
        ) : (
          <div className="grid gap-1.5">
            {rows.map((row) => {
              const expired = row.ends_at ? new Date(row.ends_at).getTime() < now : false;
              const scheduled = row.starts_at ? new Date(row.starts_at).getTime() > now : false;
              return (
                <div key={row.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setDraft({
                      id: row.id,
                      name: row.name,
                      serviceType: row.service_type ?? "",
                      startsAt: dateValue(row.starts_at),
                      endsAt: dateValue(row.ends_at),
                      active: row.active,
                      priority: row.priority,
                      ctaHref: row.cta_href ?? "",
                      mediaId: row.media_id,
                      mobileMediaId: row.mobile_media_id,
                      content: sanitizeMarketing(row.content),
                    })}
                  >
                    <strong>{row.name}</strong>
                    <span className="ml-2 text-muted-foreground">{row.service_type ?? "Tüm servisler"} · {dateValue(row.starts_at) || "—"} → {dateValue(row.ends_at) || "—"}</span>
                  </button>
                  <StatusBadge value={expired ? "COMPLETED" : !row.active ? "PAUSED" : scheduled ? "PENDING" : "ACTIVE"} />
                  <button type="button" className="size-7 rounded text-destructive hover:bg-destructive/10" aria-label="Sil" onClick={() => { if (confirm("Kampanya silinsin mi?")) remove.mutate(row.id); }}><Trash2 className="mx-auto size-3.5" /></button>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Bitiş tarihi geçen kampanya müşteri tarafında otomatik olarak gösterilmez.</p>
      </AdminPanel>

      <AdminDrawer open={Boolean(draft)} title={draft?.id ? "Kampanyayı düzenle" : "Yeni kampanya"} onClose={() => setDraft(null)}>
        {draft && (
          <div className="grid gap-3">
            <div className="flex gap-1">
              {(["tr", "de", "en"] as const).map((value) => (
                <Button key={value} size="sm" variant={locale === value ? "secondary" : "outline"} onClick={() => setLocale(value)}>{value.toUpperCase()}</Button>
              ))}
            </div>
            <Field label="Kampanya adı"><input className="admin-field mt-1 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Servis">
              <select className="admin-field mt-1 w-full" value={draft.serviceType} onChange={(event) => setDraft({ ...draft, serviceType: event.target.value as Draft["serviceType"] })}>
                <option value="">Her ikisi</option>
                <option value="ESIM">eSIM</option>
                <option value="LOUNGE">Lounge</option>
              </select>
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Başlangıç"><input type="date" className="admin-field mt-1 w-full" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></Field>
              <Field label="Bitiş"><input type="date" className="admin-field mt-1 w-full" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></Field>
            </div>
            <Field label={`Başlık (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.content.title[locale]} onChange={(event) => setText("title", event.target.value)} /></Field>
            <Field label={`Açıklama (${locale.toUpperCase()})`}><textarea rows={3} className="admin-field mt-1 w-full" value={draft.content.description[locale]} onChange={(event) => setText("description", event.target.value)} /></Field>
            <Field label={`Buton metni (${locale.toUpperCase()})`}><input className="admin-field mt-1 w-full" value={draft.content.cta[locale]} onChange={(event) => setText("cta", event.target.value)} /></Field>
            <Field label="Buton hedefi" hint="Yalnızca site içi adres (örn. /esim/paketler)."><input className="admin-field mt-1 w-full" value={draft.ctaHref} onChange={(event) => setDraft({ ...draft, ctaHref: event.target.value })} /></Field>
            <MediaField label="Masaüstü görseli" category="CAMPAIGN" value={draft.mediaId} onChange={(id) => setDraft({ ...draft, mediaId: id })} />
            <MediaField label="Mobil görseli" category="CAMPAIGN" value={draft.mobileMediaId} onChange={(id) => setDraft({ ...draft, mobileMediaId: id })} />
            <Field label="Öncelik"><input type="number" className="admin-field mt-1 w-full" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Aktif</label>
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
