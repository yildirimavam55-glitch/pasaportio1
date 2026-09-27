import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ShieldCheck } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getPlatformSettings, savePlatformSettings } from "@/lib/platform-settings.functions";
import { DEFAULT_SETTINGS, type PlatformSettings, type MaintenanceService } from "@/domain/platform/settings";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/settings/")({
  head: () => adminHead("Ayarlar", "Marka, destek, bölge ve bakım mesajı ayarları."),
  component: SettingsPage,
});

const LOCALES: Locale[] = ["tr", "de", "en"];
const LOCALE_LABEL: Record<Locale, string> = { tr: "TR", de: "DE", en: "EN" };

function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["platform-settings"], queryFn: () => getPlatformSettings() });
  const [form, setForm] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [locale, setLocale] = useState<Locale>("tr");

  useEffect(() => { if (query.data) { setForm(query.data.settings); setDirty(false); } }, [query.data]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: () => savePlatformSettings({ data: { settings: form } }),
    onSuccess: async () => {
      setDirty(false);
      toast.success("Ayarlar kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["service-availability"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Kaydedilemedi."),
  });

  const set = (patch: Partial<PlatformSettings>) => { setForm({ ...form, ...patch }); setDirty(true); };
  const setMaintenance = (service: MaintenanceService, patch: Record<string, unknown>) => {
    set({ maintenance: { ...form.maintenance, [service]: { ...form.maintenance[service], ...patch } } });
  };
  const setText = (service: MaintenanceService, key: "storefrontTitle" | "storefrontBody" | "checkoutMessage", value: string) => {
    setMaintenance(service, { [key]: { ...form.maintenance[service][key], [locale]: value } });
  };

  return (
    <AdminGate title="Ayarlar">
      <div className="grid gap-4">
        {query.isPending ? <AdminLoading /> : query.error ? <AdminError error={query.error} /> : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}><Save />Kaydet</Button>
              {dirty && <span className="text-xs font-semibold text-warning">Kaydedilmemiş değişiklikler var.</span>}
              {query.data?.updatedAt && <span className="text-[10px] text-muted-foreground">Son güncelleme: {new Date(query.data.updatedAt).toLocaleString("tr-TR")}</span>}
            </div>

            <AdminPanel title="İşletme bilgileri">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Marka adı"><input className="admin-field mt-1 w-full" value={form.brandName} onChange={(event) => set({ brandName: event.target.value })} /></Field>
                <Field label="Gönderen adı" hint="İşlem e-postalarında görünen isim."><input className="admin-field mt-1 w-full" value={form.senderName} onChange={(event) => set({ senderName: event.target.value })} /></Field>
                <Field label="Destek e-postası"><input className="admin-field mt-1 w-full" value={form.supportEmail} onChange={(event) => set({ supportEmail: event.target.value })} placeholder="destek@ornek.com" /></Field>
                <Field label="Destek bağlantısı" hint="https:// ile başlayan adres veya site içi yol."><input className="admin-field mt-1 w-full" value={form.supportUrl} onChange={(event) => set({ supportUrl: event.target.value })} placeholder="/destek" /></Field>
              </div>
            </AdminPanel>

            <AdminPanel title="Bölge ve raporlama">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Varsayılan dil">
                  <select className="admin-field mt-1 w-full" value={form.defaultLocale} onChange={(event) => set({ defaultLocale: event.target.value as Locale })}>
                    {LOCALES.map((value) => <option key={value} value={value}>{LOCALE_LABEL[value]}</option>)}
                  </select>
                </Field>
                <Field label="Raporlama para birimi" hint="Üç harfli kod, örn. EUR."><input className="admin-field mt-1 w-full" value={form.reportingCurrency} onChange={(event) => set({ reportingCurrency: event.target.value.toUpperCase().slice(0, 3) })} /></Field>
                <Field label="Saat dilimi"><input className="admin-field mt-1 w-full" value={form.timezone} onChange={(event) => set({ timezone: event.target.value })} /></Field>
              </div>
            </AdminPanel>

            <AdminPanel
              title="Bakım mesajları"
              action={<div className="flex gap-1">{LOCALES.map((value) => <Button key={value} size="sm" variant={locale === value ? "secondary" : "ghost"} onClick={() => setLocale(value)}>{LOCALE_LABEL[value]}</Button>)}</div>}
            >
              <p className="text-xs text-muted-foreground">Servis duraklatıldığında müşteriye gösterilecek metinler. Boş bırakılan diller Türkçe metne düşer.</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {(["esim", "lounge"] as MaintenanceService[]).map((service) => (
                  <div key={service} className="grid gap-3 rounded-md border border-border p-3">
                    <strong className="text-sm">{service === "esim" ? "eSIM" : "Lounge"}</strong>
                    <Field label="Başlık"><input className="admin-field mt-1 w-full" value={form.maintenance[service].storefrontTitle[locale]} onChange={(event) => setText(service, "storefrontTitle", event.target.value)} /></Field>
                    <Field label="Açıklama"><textarea rows={3} className="admin-field mt-1 w-full" value={form.maintenance[service].storefrontBody[locale]} onChange={(event) => setText(service, "storefrontBody", event.target.value)} /></Field>
                    <Field label="Satın alma duraklatıldığında gösterilecek mesaj"><input className="admin-field mt-1 w-full" value={form.maintenance[service].checkoutMessage[locale]} onChange={(event) => setText(service, "checkoutMessage", event.target.value)} /></Field>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" checked={form.maintenance[service].showAlternative} onChange={(event) => setMaintenance(service, { showAlternative: event.target.checked })} />
                      Diğer servise yönlendiren buton gösterilsin
                    </label>
                  </div>
                ))}
              </div>
            </AdminPanel>

            <AdminPanel
              title="WhatsApp destek kartı"
              action={<div className="flex gap-1">{LOCALES.map((value) => <Button key={value} size="sm" variant={locale === value ? "secondary" : "ghost"} onClick={() => setLocale(value)}>{LOCALE_LABEL[value]}</Button>)}</div>}
            >
              <p className="text-xs text-muted-foreground">Yüzen WhatsApp butonuna ilk dokunuşta açılan kart. WhatsApp numarası mevcut yapılandırmadan gelir. Boş bırakılan alanlarda varsayılan çevrili metin kullanılır.</p>
              <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={form.whatsappWidget.enabled} onChange={(event) => set({ whatsappWidget: { ...form.whatsappWidget, enabled: event.target.checked } })} />
                Widget açık
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  ["title", "Başlık", "travely Destek"],
                  ["cta", "Buton metni", "WhatsApp'ta destek al"],
                  ["message", "Kart mesajı", ""],
                  ["prefill", "WhatsApp'a hazır mesaj (müşteri kendisi gönderir)", "Merhaba, travely hakkında destek almak istiyorum."],
                ] as const).map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <textarea rows={key === "message" ? 3 : 1} className="admin-field mt-1 w-full" placeholder={placeholder} value={form.whatsappWidget[key][locale]} onChange={(event) => set({ whatsappWidget: { ...form.whatsappWidget, [key]: { ...form.whatsappWidget[key], [locale]: event.target.value } } })} />
                  </Field>
                ))}
              </div>
            </AdminPanel>

            <AdminPanel title="Güvenlik">
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" />Sağlayıcı anahtarları, ödeme anahtarları ve veritabanı erişim bilgileri bu ekranda tutulmaz ve hiçbir yönetim ekranında gösterilmez.</p>
            </AdminPanel>
          </>
        )}
      </div>
    </AdminGate>
  );
}
