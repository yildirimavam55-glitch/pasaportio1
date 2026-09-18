import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getThemeSettings, publishTheme, saveThemeDraft } from "@/lib/admin-theme.functions";
import { listMedia } from "@/lib/admin-media.functions";
import { DEFAULT_THEME, type ThemeConfig } from "@/domain/theme/config";

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

  useEffect(() => { if (settings.data?.draft) setTheme(settings.data.draft as ThemeConfig); }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveThemeDraft({ data: { theme } }),
    onSuccess: async () => { setMessage("Taslak kaydedildi."); await queryClient.invalidateQueries({ queryKey: ["theme-settings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Kaydedilemedi."),
  });
  const publish = useMutation({
    mutationFn: () => publishTheme(),
    onSuccess: async () => { setMessage("Tema yayınlandı. Müşteri sitesi bu temayı kullanır."); await queryClient.invalidateQueries({ queryKey: ["theme-settings"] }); await queryClient.invalidateQueries({ queryKey: ["published-theme"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Yayınlanamadı."),
  });

  const set = (patch: Partial<ThemeConfig>) => setTheme((current) => ({ ...current, ...patch }));
  const radiusClass = theme.radius === "sharp" ? "rounded-sm" : theme.radius === "soft" ? "rounded-lg" : "rounded-2xl";
  const shadowClass = theme.shadow === "none" ? "" : theme.shadow === "subtle" ? "shadow-card" : "shadow-panel";
  const buttonClass = theme.buttonStyle === "pill" ? "rounded-full" : theme.buttonStyle === "outline" ? "border-2 bg-transparent" : "";

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
            <Button onClick={() => publish.mutate()} disabled={publish.isPending}>Yayınla</Button>
            <span className="text-xs text-muted-foreground">Son yayın: {settings.data?.publishedAt ? new Date(settings.data.publishedAt).toLocaleString("tr-TR") : "Henüz yayınlanmadı"}</span>
          </div>
          {message && <p className="text-xs font-semibold text-primary">{message}</p>}
        </div>

        <AdminPanel title="Önizleme">
          <div className={`border border-border p-4 ${radiusClass} ${shadowClass} ${theme.surface === "contrast" ? "bg-secondary" : theme.surface === "soft" ? "bg-secondary/40" : "bg-card"}`}>
            <span className="text-xs font-semibold" style={{ color: theme.colors.primary }}>Travel Platform</span>
            <h3 className="mt-2 font-display text-xl font-bold" style={{ fontFamily: `${theme.headingFont}, sans-serif` }}>Görsel sistem</h3>
            <p className="mt-1 text-sm text-muted-foreground" style={{ fontFamily: `${theme.bodyFont}, sans-serif` }}>Renk, tipografi, düğme ve yüzey önizlemesi.</p>
            <button type="button" className={`mt-4 min-h-11 px-4 text-sm font-bold text-white ${radiusClass} ${buttonClass}`} style={theme.buttonStyle === "outline" ? { color: theme.colors.cta, borderColor: theme.colors.cta } : { backgroundColor: theme.colors.cta }}>Örnek eylem</button>
          </div>
        </AdminPanel>
      </div>
    </AdminGate>
  );
}
