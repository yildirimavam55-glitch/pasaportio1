import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, EmptyState, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { MEDIA_CATEGORIES, MEDIA_USAGE, deleteMedia, listMedia, updateMedia, uploadMedia, type MediaCategory } from "@/lib/admin-media.functions";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => adminHead("Medya", "Görsel kütüphanesi ve kullanım bilgileri."),
  component: Media,
});

function Media() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const assets = useQuery({ queryKey: ["media", search, category], queryFn: () => listMedia({ data: { search, category } }) });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]!);
      return uploadMedia({
        data: {
          label: file.name,
          category: (category === "ALL" ? "GLOBAL" : category) as MediaCategory,
          usage: "BOTH",
          altText: "",
          fileName: file.name,
          contentType: file.type,
          base64: btoa(binary),
        },
      });
    },
    onSuccess: async () => { setMessage("Yüklendi."); await queryClient.invalidateQueries({ queryKey: ["media"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Yüklenemedi."),
  });

  const selected = (assets.data ?? []).find((asset: any) => asset.id === openId) ?? null;

  return (
    <AdminGate title="Medya kütüphanesi">
      <div className="grid gap-4">
        <AdminPanel title="Yükle ve filtrele">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Ara"><input className="admin-field mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Etiket veya alt metin" /></Field>
            <Field label="Kategori"><select className="admin-field mt-1 w-full" value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">Tümü</option>{MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="Görsel yükle" hint="PNG, JPG, WEBP veya AVIF · en fazla 10 MB">
              <label className="admin-field mt-1 flex min-h-11 w-full cursor-pointer items-center gap-2 text-xs font-semibold">
                <Upload className="size-4" />{upload.isPending ? "Yükleniyor…" : "Dosya seç"}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ""; }} />
              </label>
            </Field>
          </div>
          {message && <p className="mt-2 text-xs font-semibold text-primary">{message}</p>}
        </AdminPanel>

        {assets.isPending ? <AdminLoading /> : assets.error ? <AdminError error={assets.error} /> : (
          <AdminPanel title={`${assets.data?.length ?? 0} görsel`}>
            {!assets.data?.length ? <EmptyState title="Henüz görsel yüklenmedi." detail="Yüklediğiniz görseller CMS ekranından seçilebilir." /> : (
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {assets.data.map((asset: any) => (
                  <button key={asset.id} type="button" onClick={() => setOpenId(asset.id)} className="overflow-hidden rounded-md border border-border text-left">
                    <span className="block aspect-video bg-secondary/60">
                      {asset.url ? <img src={asset.url} alt={asset.altText || asset.label} loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center"><ImageIcon className="size-5 text-muted-foreground" /></span>}
                    </span>
                    <span className="block p-2 text-[11px]"><strong className="block truncate">{asset.label}</strong><span className="text-muted-foreground">{asset.category} · {asset.usage}</span></span>
                  </button>
                ))}
              </div>
            )}
          </AdminPanel>
        )}
      </div>
      <MediaDrawer asset={selected} onClose={() => setOpenId(null)} />
    </AdminGate>
  );
}

function MediaDrawer({ asset, onClose }: { asset: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const current = form && form.id === asset?.id ? form : asset ? { id: asset.id, label: asset.label, altText: asset.altText, category: asset.category, usage: asset.usage, focalX: asset.focalX, focalY: asset.focalY } : null;

  const save = useMutation({
    mutationFn: () => updateMedia({ data: current }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["media"] }); onClose(); },
  });
  const remove = useMutation({
    mutationFn: () => deleteMedia({ data: { id: asset.id } }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["media"] }); onClose(); },
  });

  if (!asset || !current) return null;
  const set = (patch: Record<string, unknown>) => setForm({ ...current, ...patch });

  return (
    <AdminDrawer open title={asset.label} subtitle={`${asset.category} · ${asset.usage}`} onClose={onClose}>
      <div className="grid gap-4">
        {asset.url && <img src={asset.url} alt={asset.altText || asset.label} className="w-full rounded-md border border-border object-cover" style={{ objectPosition: `${current.focalX}% ${current.focalY}%`, aspectRatio: "16/9" }} />}
        <Field label="Etiket"><input className="admin-field mt-1 w-full" value={current.label} onChange={(event) => set({ label: event.target.value })} /></Field>
        <Field label="Alternatif metin" hint="Erişilebilirlik ve SEO için zorunludur."><input className="admin-field mt-1 w-full" value={current.altText} onChange={(event) => set({ altText: event.target.value })} /></Field>
        <Field label="Kategori"><select className="admin-field mt-1 w-full" value={current.category} onChange={(event) => set({ category: event.target.value })}>{MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Kullanım"><select className="admin-field mt-1 w-full" value={current.usage} onChange={(event) => set({ usage: event.target.value })}>{MEDIA_USAGE.map((value) => <option key={value} value={value}>{value === "BOTH" ? "Masaüstü + mobil" : value === "DESKTOP" ? "Masaüstü" : "Mobil"}</option>)}</select></Field>
        <Field label={`Odak noktası · yatay %${current.focalX}`}><input type="range" min="0" max="100" className="mt-2 w-full" value={current.focalX} onChange={(event) => set({ focalX: Number(event.target.value) })} /></Field>
        <Field label={`Odak noktası · dikey %${current.focalY}`}><input type="range" min="0" max="100" className="mt-2 w-full" value={current.focalY} onChange={(event) => set({ focalY: Number(event.target.value) })} /></Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
          <Button variant="ghost" className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>Sil</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Görseller güvenli depolamada tutulur; dosya yolu dışarıya verilmez.</p>
      </div>
    </AdminDrawer>
  );
}
