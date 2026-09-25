import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Globe,
  AlertTriangle, BarChart3, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronDown,
  CircleDollarSign, ClipboardList, CloudUpload, DatabaseZap, ExternalLink, Flag,
  Image, LayoutDashboard, LayoutTemplate, LoaderCircle, LogOut, MapPin, Megaphone, Menu, MonitorCog, PanelLeftClose, Plane,
  PlugZap, RadioTower, ReceiptText, RotateCw, Route, Search, Settings, ShieldCheck,
  Car, Smartphone, Sparkles, ToggleLeft, Users, WalletCards, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BRAND } from "@/domain/experience/config";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/platform.functions";
import { adminSearch, getAdminIdentity } from "@/lib/admin-control.functions";
import { Button } from "@/components/ui/button";


type AdminLink = { to: string; label: string; icon: typeof LayoutDashboard };
type AdminGroup = { label: string; links: AdminLink[] };

const groups: AdminGroup[] = [
  { label: "İşletme", links: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/orders", label: "Siparişler", icon: ClipboardList },
    { to: "/admin/customers", label: "Müşteriler", icon: Users },
    { to: "/admin/analytics", label: "Analitik", icon: BarChart3 },
  ]},
  { label: "eSIM", links: [
    { to: "/admin", label: "eSIM genel bakış", icon: RadioTower },
    { to: "/admin/products", label: "Paketler", icon: Boxes },
    { to: "/admin/esim/coverage", label: "Kapsama", icon: Globe },
    { to: "/admin/smart-finders/esim", label: "Smart Finder", icon: Sparkles },
    { to: "/admin/esim/devices", label: "Cihaz uyumluluğu", icon: Smartphone },
    { to: "/admin/esim/fulfillment", label: "eSIM teslimat", icon: DatabaseZap },
    { to: "/admin/esim/route-presets", label: "Rota şablonları", icon: Route },
  ]},
  { label: "Lounge", links: [
    { to: "/admin", label: "Lounge genel bakış", icon: Plane },
    { to: "/admin/products", label: "Lounge’lar", icon: Building2 },
    { to: "/admin/lounge/bookings", label: "Rezervasyonlar", icon: BriefcaseBusiness },
  ]},
  { label: "Vignette", links: [
    { to: "/admin/vignette", label: "Vignette genel bakış", icon: Car },
    { to: "/admin/storefront/v2/vignette", label: "Vignette storefront", icon: LayoutTemplate },
  ]},
  { label: "Katalog & Provider", links: [
    { to: "/admin/providers", label: "Provider Hub", icon: PlugZap },
    { to: "/admin/esim/provider-import", label: "Katalog senkronu", icon: CloudUpload },
    { to: "/admin/test-catalogue", label: "Test kataloğu", icon: Boxes },
    { to: "/admin/pricing-rules", label: "Fiyatlandırma kuralları", icon: CircleDollarSign },
  ]},
  { label: "Mağaza yönetimi", links: [
    { to: "/admin/storefront", label: "Storefront", icon: LayoutTemplate },
    { to: "/legacy-v1", label: "Legacy V1 (geri dönüş)", icon: LayoutTemplate },
    { to: "/admin/storefront/navigation", label: "Menü & alt bilgi", icon: Menu },
    { to: "/admin/cms", label: "Sayfalar / CMS", icon: MonitorCog },
    { to: "/admin/guides", label: "Rehberler", icon: BookOpen },
    { to: "/admin/content/seo", label: "İçerik → SEO", icon: Search },
    { to: "/admin/media", label: "Medya", icon: Image },
    { to: "/admin/theme", label: "Tema", icon: Sparkles },
    { to: "/admin/destinations", label: "Destinasyonlar", icon: MapPin },
    { to: "/admin/airports", label: "Havalimanları", icon: Plane },
    { to: "/admin/marketing/campaigns", label: "Kampanyalar", icon: Megaphone },
  ]},
  { label: "Finans & Operasyon", links: [
    { to: "/admin/finance", label: "Finans", icon: CircleDollarSign },
    { to: "/admin/refunds", label: "İadeler", icon: RotateCw },
    { to: "/admin/alerts", label: "Operasyon uyarıları", icon: AlertTriangle },
  ]},
  { label: "Sistem", links: [
    { to: "/admin/service-controls", label: "Servis kontrolleri", icon: ToggleLeft },
    { to: "/admin/flags", label: "Özellik bayrakları", icon: Flag },
    { to: "/admin/audit", label: "Denetim kaydı", icon: ShieldCheck },
    { to: "/admin/settings", label: "Ayarlar", icon: Settings },
    { to: "/admin/settings/users", label: "Admin Kullanıcıları", icon: Users },
  ]},
];


export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { data, isPending } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isPending) return <main className="grid min-h-screen place-items-center bg-secondary"><p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Yetki kontrol ediliyor…</p></main>;
  if (!data?.isAdmin) return <main className="grid min-h-screen place-items-center bg-secondary p-4"><div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card"><AlertTriangle className="mx-auto size-10 text-destructive"/><h1 className="mt-4 font-display text-2xl font-bold">Yönetici yetkisi gerekiyor</h1><p className="mt-2 text-sm text-muted-foreground">Bu alan yalnızca açıkça yönetici rolü atanmış hesaplara açıktır.</p><div className="mt-5 flex justify-center gap-4 text-sm font-bold text-primary"><Link to="/account">Hesabıma dön</Link><Link to="/" search={{service:"esim"}}>Ana sayfa</Link></div></div></main>;

  return <div className="admin-shell min-h-screen bg-secondary/55 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
    {mobileOpen && <button type="button" aria-label="Menüyü kapat" className="fixed inset-0 z-40 bg-primary/45 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-primary-foreground/10 bg-primary text-primary-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
      <div className="flex min-h-16 items-center justify-between border-b border-primary-foreground/10 px-4">
        <Link to="/admin" className="font-display text-lg font-bold">{BRAND.name}<span className="ml-2 text-[10px] font-bold opacity-60">ADMIN</span></Link>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><X /></Button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Yönetim navigasyonu">
        {groups.map((group, index) => <NavGroup key={group.label} group={group} pathname={pathname} defaultOpen={index < 3} onNavigate={() => setMobileOpen(false)} />)}
      </nav>
      <div className="border-t border-primary-foreground/10 p-3">
        <Link to="/" search={{ service: "esim" }} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold opacity-80 hover:bg-primary-foreground/10 hover:opacity-100"><ExternalLink className="size-4" /> Mağazayı görüntüle</Link>
      </div>
    </aside>
    <main className="min-w-0">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Yönetim menüsünü aç"><Menu /></Button>
        <div className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase text-muted-foreground">İş kontrol merkezi</span><h1 className="truncate font-display text-lg font-bold">{title}</h1></div>
        <Button variant="ghost" size="icon" aria-label="Yönetimde ara" onClick={() => setSearchOpen(true)}><Search /></Button>
        <Link to="/admin/alerts" className="relative grid size-9 place-items-center rounded-md border border-border" aria-label="Operasyon uyarıları"><AlertTriangle className="size-4" /></Link>
        <AdminAccount />
      </header>
      <AdminSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="p-3 sm:p-5 xl:p-6">{children}</div>
    </main>
  </div>;
}

function NavGroup({ group, pathname, defaultOpen, onNavigate }: { group: AdminGroup; pathname: string; defaultOpen: boolean; onNavigate: () => void }) {
  const hasActive = group.links.some((item) => pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)));
  const [open, setOpen] = useState(defaultOpen || hasActive);
  return <section className="mb-2">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-8 w-full items-center justify-between px-3 text-[10px] font-bold uppercase opacity-55"><span>{group.label}</span><ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <div className="grid gap-0.5">{group.links.map(({ to, label, icon: Icon }) => {
      if (label === "eSIM genel bakış" || label === "Lounge genel bakış") {
        return <Link key={`${group.label}-${label}`} to="/admin" search={{ service: label === "eSIM genel bakış" ? "esim" : "lounge" }} onClick={onNavigate} className="flex min-h-9 items-center gap-2.5 rounded-md px-3 text-xs font-semibold opacity-70 hover:bg-primary-foreground/10 hover:opacity-100"><Icon className="size-4" /><span className="truncate">{label}</span></Link>;
      }
      return <Link key={`${group.label}-${label}`} to={to} onClick={onNavigate} className="flex min-h-9 items-center gap-2.5 rounded-md px-3 text-xs font-semibold opacity-70 hover:bg-primary-foreground/10 hover:opacity-100" activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}><Icon className="size-4" /><span className="truncate">{label}</span></Link>;
    })}</div>}
  </section>;
}
function AdminAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["admin-identity"], queryFn: () => getAdminIdentity() });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = data?.name || data?.email || "Yönetici";
  const initial = String(name).trim().charAt(0).toUpperCase() || "A";

  const signOut = async () => {
    setBusy(true);
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      setOpen(false);
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="relative shrink-0 border-l border-border pl-2 sm:pl-3">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} className="flex min-h-10 items-center gap-2 rounded-md px-1 hover:bg-secondary/60">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initial}</span>
      <span className="hidden min-w-0 text-left sm:block"><span className="block max-w-40 truncate text-xs font-semibold">{name}</span><span className="block text-[10px] text-muted-foreground">Admin</span></span>
      <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <>
      <button type="button" aria-label="Menüyü kapat" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div role="menu" className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-md border border-border bg-card p-1 shadow-panel">
        <div className="px-3 py-2"><p className="truncate text-xs font-semibold">{name}</p>{data?.email && <p className="truncate text-[10px] text-muted-foreground">{data.email}</p>}<p className="text-[10px] font-bold uppercase text-muted-foreground">Admin</p></div>
        <Link to="/account" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold hover:bg-secondary/60">Hesabım</Link>
        <Link to="/admin/settings" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold hover:bg-secondary/60">Admin Ayarları</Link>
        <button type="button" role="menuitem" disabled={busy} onClick={signOut} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60"><LogOut className="size-4" />{busy ? "Çıkış yapılıyor…" : "Çıkış Yap"}</button>
      </div>
    </>}
  </div>;
}


function AdminSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const query = useQuery({ queryKey: ["admin-search", term], queryFn: () => adminSearch({ data: { q: term } }), enabled: open && term.trim().length > 1 });
  useEffect(() => { if (!open) setTerm(""); }, [open]);
  if (!open) return null;
  const results = query.data;
  const groupsFound: Array<[string, Array<{ id: string; label: string; detail: string; to: string }>]> = results ? [
    ["Siparişler", results.orders.map((row: any) => ({ id: row.id, label: row.order_number, detail: row.payment_status, to: "/admin/orders" }))],
    ["Müşteriler", results.customers.map((row: any) => ({ id: row.id, label: row.full_name ?? row.email ?? "Müşteri", detail: row.email ?? "", to: "/admin/customers" }))],
    ["Ürünler", results.products.map((row: any) => ({ id: row.id, label: row.name, detail: `${row.service_type}${row.sale_price != null ? ` · ${Number(row.sale_price).toFixed(2)} ${row.currency}` : ""}`, to: "/admin/products" }))],
    ["Provider’lar", results.providers.map((row: any) => ({ id: row.id, label: row.name, detail: row.service_type, to: "/admin/providers" }))],
    ["Havalimanları", results.airports.map((row: any) => ({ id: row.id, label: `${row.iata} · ${row.name}`, detail: row.city ?? "", to: "/admin/airports" }))],
    ["Destinasyonlar", results.destinations.map((row: any) => ({ id: row.id, label: row.name, detail: row.slug, to: "/admin/destinations" }))],
  ].filter(([, rows]) => rows.length) as any : [];

  return <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-20">
    <button type="button" aria-label="Aramayı kapat" className="absolute inset-0 bg-primary/45 backdrop-blur-sm" onClick={onClose} />
    <div role="dialog" aria-modal="true" aria-label="Yönetimde ara" className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-panel">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Sipariş no, müşteri, ürün, provider, havalimanı, destinasyon" className="min-h-10 w-full bg-transparent text-sm outline-none" />
        <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={onClose} aria-label="Kapat"><X /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {term.trim().length < 2 ? <p className="p-4 text-center text-xs text-muted-foreground">Aramak için en az 2 karakter yazın.</p>
          : query.isPending ? <p className="p-4 text-center text-xs text-muted-foreground">Aranıyor…</p>
          : !groupsFound.length ? <p className="p-4 text-center text-xs text-muted-foreground">Sonuç bulunamadı.</p>
          : groupsFound.map(([label, rows]) => <section key={label} className="mb-3">
              <h3 className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{label}</h3>
              <div className="grid gap-1">{rows.map((row) => <Link key={row.id} to={row.to as never} onClick={onClose} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary/50"><span className="truncate font-semibold">{row.label}</span><span className="shrink-0 text-muted-foreground">{row.detail}</span></Link>)}</div>
            </section>)}
      </div>
    </div>
  </div>;
}
