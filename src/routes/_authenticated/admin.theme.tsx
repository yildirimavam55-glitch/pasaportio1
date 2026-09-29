import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { History, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { ThemePreview } from "@/components/admin/ThemePreview";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getThemeSettings, publishTheme, restoreThemeVersion, saveThemeDraft } from "@/lib/admin-theme.functions";
import { listMedia } from "@/lib/admin-media.functions";
import { DEFAULT_THEME, type ThemeConfig } from "@/domain/theme/config";

type ThemeVersion = { id: string; createdAt: string; action: string; actor: string };

export const Route = createFileRoute("/_authenticated/admin/theme")({
  head: () => adminHead("Tema", "Marka ve görsel tema kontrolleri."),
  component: Theme,
});

const COLORS: Array<{ key: keyof ThemeConfig["colors"]; label: string }> = [
  { key: "primary", label: "Petrol (ana renk)" },
  { key: "cta", label: "Eylem turuncusu" },
  { key: "success", label: "Başarı" },
  { key: "warning", label: "Uyarı" },
  { key: "info", label: "Bilgi" },
];

function Theme() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["theme-settings"], queryFn: () => getThemeSettings() });
  const media = useQuery({ queryKey: ["media", "all"], queryFn: () => listMedia({ data: {} }) });
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [message, setMessage] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [savedDraft, setSavedDraft] = useState<ThemeConfig>(DEFAULT_THEME);

  useEffect(() => { if (settings.data?.draft) { setTheme(settings.data.draft as ThemeConfig); setSavedDraft(settings.data.draft as ThemeConfig); } }, [settings.data]);
  const hasUnsavedChanges = JSON.stringify(theme) !== JSON.stringify(savedDraft);
  const draftDiffersFromPublished = JSON.stringify(savedDraft) !== JSON.stringify(settings.data?.published ?? DEFAULT_THEME);
  const selectedLogo = (media.data ?? []).find((asset: any) => asset.id === theme.logoMediaId);

  const save = useMutation({
    mutationFn: () => saveThemeDraft({ data: { theme } }),
    onSuccess: async (saved) => { setSavedDraft(saved); setMessage("Taslak kaydedildi. Canlı mağaza değişmedi."); await queryClient.invalidateQueries({ queryKey: ["theme-settings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Kaydedilemedi."),
  });
  const restore = useMutation({
    mutationFn: (versionId: string) => restoreThemeVersion({ data: { versionId } }),
    onSuccess: async (restored) => { setTheme(restored); setSavedDraft(restored); setMessage("Sürüm taslağa geri yüklendi. Canlı mağaza değişmedi."); await queryClient.invalidateQueries({ queryKey: ["theme-settings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Sürüm geri yüklenemedi."),
  });
  const publish = useMutation({
    mutationFn: () => publishTheme(),
    onSuccess: async () => { setMessage("Tema yayınlandı. Müşteri sitesi bu temayı kullanır."); await queryClient.invalidateQueries({ queryKey: ["theme-settings"] }); await queryClient.invalidateQueries({ queryKey: ["published-theme"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Yayınlanamadı."),
  });

  const set = (patch: Partial<ThemeConfig>) => setTheme((current) => ({ ...current, ...patch }));
  if (settings.isPending) return <AdminGate title="Tema"><AdminLoading /></AdminGate>;
  if (settings.error) return <AdminGate title="Tema"><AdminError error={settings.error} /></AdminGate>;

  return (
    <AdminGate title="Tema">
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <AdminPanel title="Marka">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Logo"><select className="admin-field mt-1 w-full" value={theme.logoMediaId ?? ""} onChange={(event) => set({ logoMediaId: event.target.value || null })}><option value="">Seçilmedi</option>{(media.data ?? []).map((asset: any) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></Field>
              <Field label="Favicon"><select className="admin-field mt-1 w-full" value={theme.faviconMediaId ?? ""} onChange={(event) => set({ faviconMediaId: event.target.value || null })}><option value="">Seçilmedi</option>{(media.data ?? []).map((asset: any) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></Field>
            </div>
            {!(media.data ?? []).length && <p className="mt-2 text-xs text-muted-foreground">Önce Medya kütüphanesine görsel yükleyin.</p>}
          </AdminPanel>

          <AdminPanel title="Renkler">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COLORS.map(({ key, label }) => (
                <label key={key} className="flex min-h-12 items-center gap-3 rounded-md border border-border p-2 text-xs font-semibold">
                  <input type="color" aria-label={label} value={theme.colors[key]} onChange={(event) => set({ colors: { ...theme.colors, [key]: event.target.value } })} className="size-8 cursor-pointer rounded border border-border bg-transparent" />
                  <span className="min-w-0"><span className="block truncate">{label}</span><span className="block text-[10px] font-normal uppercase text-muted-foreground">{theme.colors[key]}</span></span>
                </label>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title="Tipografi ve biçim">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlık yazı tipi"><select className="admin-field mt-1 w-full" value={theme.headingFont} onChange={(event) => set({ headingFont: event.target.value as ThemeConfig["headingFont"] })}>{["Outfit", "Manrope", "Sora", "Urbanist"].map((value) => <option key={value}>{value}</option>)}</select></Field>
              <Field label="Metin yazı tipi"><select className="admin-field mt-1 w-full" value={theme.bodyFont} onChange={(event) => set({ bodyFont: event.target.value as ThemeConfig["bodyFont"] })}>{["Manrope", "Inter", "Figtree", "Work Sans"].map((value) => <option key={value}>{value}</option>)}</select></Field>
              <Field label="Köşe yuvarlaklığı"><select className="admin-field mt-1 w-full" value={theme.radius} onChange={(event) => set({ radius: event.target.value as ThemeConfig["radius"] })}><option value="sharp">Az</option><option value="soft">Orta</option><option value="round">Yüksek</option></select></Field>
              <Field label="Gölge"><select className="admin-field mt-1 w-full" value={theme.shadow} onChange={(event) => set({ shadow: event.target.value as ThemeConfig["shadow"] })}><option value="none">Yok</option><option value="subtle">Hafif</option><option value="raised">Belirgin</option></select></Field>
              <Field label="Düğme biçimi"><select className="admin-field mt-1 w-full" value={theme.buttonStyle} onChange={(event) => set({ buttonStyle: event.target.value as ThemeConfig["buttonStyle"] })}><option value="solid">Dolu</option><option value="outline">Çerçeveli</option><option value="pill">Yuvarlak</option></select></Field>
              <Field label="Bölüm yüzeyi"><select className="admin-field mt-1 w-full" value={theme.surface} onChange={(event) => set({ surface: event.target.value as ThemeConfig["surface"] })}><option value="light">Açık</option><option value="soft">Yumuşak</option><option value="contrast">Kontrast</option></select></Field>
            </div>
          </AdminPanel>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Taslağı kaydet</Button>
            <Button onClick={() => { if (window.confirm("Kaydedilmiş tema taslağı canlı V2 mağazada yayınlansın mı?")) publish.mutate(); }} disabled={publish.isPending || hasUnsavedChanges || !draftDiffersFromPublished}>Yayınla</Button>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${hasUnsavedChanges ? "bg-warning/15 text-warning" : draftDiffersFromPublished ? "bg-info/15 text-info" : "bg-success/15 text-success"}`}>{hasUnsavedChanges ? "Kaydedilmemiş değişiklik" : draftDiffersFromPublished ? "Yayınlanmamış taslak" : "Canlı sürümle aynı"}</span>
            <span className="text-xs text-muted-foreground">Son yayın: {settings.data?.publishedAt ? new Date(settings.data.publishedAt).toLocaleString("tr-TR") : "Henüz yayınlanmadı"}</span>
          </div>
          {message && <p className="text-xs font-semibold text-primary">{message}</p>}
        </div>

        <div className="grid content-start gap-4 xl:sticky xl:top-20">
          <AdminPanel title="Taslak önizleme">
            <div className="mb-3 flex gap-2"><Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}><Monitor /> Masaüstü</Button><Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}><Smartphone /> Mobil</Button></div>
            <p className="mb-3 text-xs text-muted-foreground">Bu görünüm yerel taslağı gösterir; kaydetmek veya yayınlamak gerekmez.</p>
            <ThemePreview theme={theme} logoUrl={selectedLogo?.url ?? null} device={device} />
          </AdminPanel>
          <AdminPanel title="Sürüm geçmişi">
            <div className="grid max-h-96 gap-2 overflow-y-auto">
              {((settings.data?.versions ?? []) as ThemeVersion[]).map((version) => <div key={version.id} className="rounded-md border border-border p-3 text-xs"><div className="flex items-start justify-between gap-2"><span className="flex items-center gap-1 font-bold"><History className="size-3" /> {version.action === "publish" ? "Yayın" : version.action === "restore" ? "Taslağa geri yükleme" : "Taslak"}</span><Button size="sm" variant="ghost" disabled={restore.isPending} onClick={() => { if (window.confirm("Bu sürüm yalnızca taslağa geri yüklensin mi? Canlı mağaza değişmeyecek.")) restore.mutate(version.id); }}><RotateCcw /> Geri yükle</Button></div><p className="mt-1 text-muted-foreground">{new Date(version.createdAt).toLocaleString("tr-TR")}</p><p className="truncate text-muted-foreground" title={version.actor}>{version.actor}</p></div>)}
              {!settings.data?.versions?.length && <p className="text-xs text-muted-foreground">Henüz tema sürümü yok.</p>}
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminGate>
  );
}
