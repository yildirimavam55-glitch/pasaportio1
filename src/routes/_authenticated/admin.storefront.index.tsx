import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Image, Languages, LayoutTemplate, Lock, Menu, Palette, PanelsTopLeft, Pencil } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getV2Overview } from "@/lib/v2-storefront.functions";
import { V2_ADDABLE, V2_PROTECTED, V2_SECTION_LABELS, V2_SECTION_TYPES, type V2PageId } from "@/domain/storefront/v2";

export const Route = createFileRoute("/_authenticated/admin/storefront/")({
  head: () => adminHead("V2 Storefront", "V2 mağaza sayfaları, bölümler, çeviriler, medya, tema ve menüler için tek yönetim merkezi."),
  component: StorefrontHub,
});

const TABS = ["Genel bakış", "Sayfalar", "Menüler", "Bölümler", "Medya", "Tema", "Çeviriler"] as const;
const PAGE_LABEL: Record<V2PageId, string> = { esim: "eSIM ana sayfası", lounge: "Lounge ana sayfası", vignette: "Vignette ana sayfası" };
const PREVIEW_URL: Record<V2PageId, string> = { esim: "/esim", lounge: "/lounge", vignette: "/vignette" };
const LATER = [
  ["Ülke paket sayfası", "Paket seçici çekirdek ticarettir; destek bölümleri sonraki aşamada yönetilebilir olacak."],
  ["Sepet sunumu", "Sepet mantığı kodda korunur."],
  ["Hesap (genel görünüm)", "Hesap ve eSIM güvenliği kodda korunur."],
  ["Destek", "Sonraki aşama."],
  ["Kurulum rehberi", "Sonraki aşama."],
] as const;
const SECTION_HELP: Partial<Record<(typeof V2_SECTION_TYPES)[number], string>> = {
  SEARCH_HERO: "Görsel, başlıklar ve arama metni. Arama mantığı kodda.",
  BENEFIT_ROW: "Onaylı ikonlarla kısa avantaj satırı.",
  DESTINATION_CAROUSEL: "Gerçek ülke/havalimanı seçimi; fiyatlar katalogdan.",
  REGION_DISCOVERY: "Gerçek bölgesel paket özetleri.",
  PROMO_BANNER: "Başlık, görsel, güvenli hedef, tarih aralığı.",
  INSTALLATION_STEPS: "Adımlar, buton, animasyon ön ayarı.",
  FAQ: "Soru-cevap listesi.",
};

function StorefrontHub() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Genel bakış");
  const overview = useQuery({ queryKey: ["v2-overview"], queryFn: () => getV2Overview() });
  return (
    <AdminGate title="V2 Storefront">
      <div className="space-y-3">
        <div className="admin-card flex flex-wrap gap-1 p-2">
          {TABS.map((t) => <Button key={t} size="sm" variant={tab === t ? "default" : "ghost"} onClick={() => setTab(t)}>{t}</Button>)}
        </div>
        {overview.isLoading ? <AdminLoading /> : overview.error ? <AdminError error={overview.error} /> : (
          <>
            {(tab === "Genel bakış" || tab === "Sayfalar") && (
              <AdminPanel title={tab === "Genel bakış" ? "Yönetilebilir sayfalar" : "Sayfalar"}>
                <div className="grid gap-2 md:grid-cols-3">
                  {(overview.data ?? []).map((p) => (
                    <div key={p.page} className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2"><PanelsTopLeft className="size-4 text-primary" /><p className="flex-1 text-sm font-bold">{PAGE_LABEL[p.page]}</p><StatusBadge value={p.customized ? "PUBLISHED" : "DEFAULT"} /></div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{p.sections} bölüm · {p.hidden} gizli{p.hasDraftChanges ? " · yayınlanmamış taslak var" : ""}</p>
                      <p className="text-[11px] text-muted-foreground">{p.publishedAt ? `Son yayın: ${new Date(p.publishedAt).toLocaleString("tr-TR")}` : "Onaylı varsayılan tasarım yayında"}</p>
                      <div className="mt-2 flex gap-1">
                        <Button asChild size="sm"><Link to="/admin/storefront/v2/$page" params={{ page: p.page }}><Pencil />Düzenle</Link></Button>
                        <Button asChild size="sm" variant="outline"><a href={PREVIEW_URL[p.page]} target="_blank" rel="noreferrer"><ExternalLink />Önizle</a></Button>
                      </div>
                    </div>
                  ))}
                </div>
                {tab === "Sayfalar" && (
                  <ul className="mt-3 divide-y divide-border text-xs">
                    {LATER.map(([name, note]) => <li key={name} className="flex items-center gap-2 py-2"><Lock className="size-3.5 text-muted-foreground" /><span className="w-44 font-semibold">{name}</span><span className="text-muted-foreground">{note}</span></li>)}
                  </ul>
                )}
                <p className="mt-3 text-[11px] text-muted-foreground">Çekirdek sayfalar silinemez. İçerik bölümleri gizlenebilir, sıralanabilir, kaldırılabilir; fiyat, ürün, sepet, ödeme ve teslimat kodda korunur.</p>
              </AdminPanel>
            )}
            {tab === "Bölümler" && (
              <AdminPanel title="Bölüm kütüphanesi">
                <ul className="grid gap-2 md:grid-cols-2">
                  {V2_SECTION_TYPES.map((type) => (
                    <li key={type} className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
                      {V2_PROTECTED.includes(type) ? <Lock className="mt-0.5 size-3.5" /> : <LayoutTemplate className="mt-0.5 size-3.5 text-primary" />}
                      <span><strong>{V2_SECTION_LABELS[type]}</strong>{V2_ADDABLE.includes(type) && <span className="ml-1 text-[10px] text-primary">eklenebilir</span>}<span className="block text-muted-foreground">{SECTION_HELP[type] ?? "Yeniden kullanılabilir içerik bölümü."}</span></span>
                    </li>
                  ))}
                </ul>
              </AdminPanel>
            )}
            {tab === "Çeviriler" && (
              <AdminPanel title="Eksik çeviriler">
                <ul className="divide-y divide-border text-sm">
                  {(overview.data ?? []).map((p) => (
                    <li key={p.page} className="flex items-center gap-3 py-2"><Languages className="size-4 text-primary" /><span className="flex-1 font-semibold">{PAGE_LABEL[p.page]}</span><span className="text-xs">DE eksik: {p.missingDe}</span><span className="text-xs">EN eksik: {p.missingEn}</span><Button asChild size="sm" variant="outline"><Link to="/admin/storefront/v2/$page" params={{ page: p.page }}>Düzenle</Link></Button></li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">Eksik DE/EN alanlarda müşteriye Türkçe metin gösterilir (mevcut yedekleme kuralı).</p>
              </AdminPanel>
            )}
            {tab === "Menüler" && <LinkCard icon={Menu} title="Menü & alt bilgi" text="Üst menü, alt bilgi ve mobil menü bağlantıları. Alt servis navigasyonu (eSIM/Lounge/Vignette/Sepet/Hesap) iş akışı gerektirdiği için kodda korunur." to="/admin/storefront/navigation" />}
            {tab === "Medya" && <LinkCard icon={Image} title="Medya kütüphanesi" text="Yükle, değiştir, alt metin ekle. Kullanımdaki görseller (V2 sayfaları dahil) silinmeden önce uyarı verir." to="/admin/media" />}
            {tab === "Tema" && <LinkCard icon={Palette} title="Tema" text="Kontrollü tasarım tokenları: marka rengi, CTA, durum renkleri, yazı tipi, köşe ve gölge ön ayarları. Serbest CSS yok." to="/admin/theme" />}
          </>
        )}
      </div>
    </AdminGate>
  );
}

function LinkCard({ icon: Icon, title, text, to }: { icon: typeof Menu; title: string; text: string; to: "/admin/storefront/navigation" | "/admin/media" | "/admin/theme" }) {
  return (
    <AdminPanel title={title}>
      <div className="flex items-start gap-3"><Icon className="size-5 text-primary" /><p className="flex-1 text-sm text-muted-foreground">{text}</p><Button asChild size="sm"><Link to={to}>Aç</Link></Button></div>
    </AdminPanel>
  );
}
