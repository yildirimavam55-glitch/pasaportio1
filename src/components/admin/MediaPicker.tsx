import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDrawer, EmptyState, Field } from "@/components/admin/AdminUi";
import { listMedia, uploadMedia, MEDIA_CATEGORIES, type MediaAsset } from "@/lib/admin-media.functions";

/** Image field that always opens the Media Library — raw storage paths are never shown. */
export function MediaField({ label, hint, value, onChange, category = "HERO" }: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (id: string | null) => void;
  category?: string;
}) {
  const [open, setOpen] = useState(false);
  const media = useQuery({ queryKey: ["media-all"], queryFn: () => listMedia({ data: {} }) });
  const selected = (media.data ?? []).find((asset) => asset.id === value) ?? null;

  return (
    <div className="text-xs font-semibold">
      <span className="block">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background p-2">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary">
          {selected?.url ? <img src={selected.url} alt={selected.altText || selected.label} className="size-full object-cover" /> : <ImagePlus className="size-5 text-muted-foreground" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate">{selected ? selected.label : "Görsel seçilmedi"}</p>
          <p className="truncate text-[10px] font-normal text-muted-foreground">{selected ? `${selected.category} · ${selected.usage === "BOTH" ? "Masaüstü + mobil" : selected.usage === "MOBILE" ? "Mobil" : "Masaüstü"}` : "Medya kütüphanesinden seç"}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Seç</Button>
        {value && <Button type="button" size="icon" variant="ghost" className="size-9" aria-label="Görseli kaldır" onClick={() => onChange(null)}><X /></Button>}
      </div>
      {hint && <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{hint}</span>}
      <MediaLibraryDialog open={open} defaultCategory={category} onClose={() => setOpen(false)} onSelect={(asset) => { onChange(asset.id); setOpen(false); }} />
    </div>
  );
}

export function MediaLibraryDialog({ open, onClose, onSelect, defaultCategory = "ALL" }: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  defaultCategory?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const media = useQuery({ queryKey: ["media-all"], queryFn: () => listMedia({ data: {} }), enabled: open });

  const rows = (media.data ?? []).filter((asset) =>
    (category === "ALL" || asset.category === category) &&
    (!search || `${asset.label} ${asset.altText}`.toLowerCase().includes(search.toLowerCase())),
  );

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
      await uploadMedia({ data: { label: file.name, category: (category === "ALL" ? "GLOBAL" : category) as any, usage: "BOTH", altText: "", fileName: file.name, contentType: file.type, base64 } });
      await queryClient.invalidateQueries({ queryKey: ["media-all"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDrawer open={open} title="Medya kütüphanesi" subtitle="Görsel seç veya yeni görsel yükle" onClose={onClose}>
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Ara"><input className="admin-field mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Görsel adı" /></Field>
          <Field label="Kategori">
            <select className="admin-field mt-1 w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="ALL">Tümü</option>
              {MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><Upload />{busy ? "Yükleniyor…" : "Yeni görsel yükle"}</Button>
        </div>
        {!rows.length ? (
          <EmptyState title="Görsel bulunamadı." detail="Yeni bir görsel yükleyerek başlayabilirsin." />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map((asset) => (
              <button key={asset.id} type="button" onClick={() => onSelect(asset)} className="overflow-hidden rounded-md border border-border bg-card text-left transition hover:border-primary">
                <span className="block aspect-[4/3] bg-secondary">{asset.url && <img src={asset.url} alt={asset.altText || asset.label} className="size-full object-cover" />}</span>
                <span className="block p-2">
                  <span className="block truncate text-xs font-semibold">{asset.label}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{asset.category} · {asset.altText || "Alt metin yok"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminDrawer>
  );
}
