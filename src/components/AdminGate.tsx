import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle, BarChart3, Boxes, BriefcaseBusiness, Building2, ChevronDown,
  CircleDollarSign, ClipboardList, CloudUpload, DatabaseZap, ExternalLink, Flag,
  Image, LayoutDashboard, LoaderCircle, Menu, MonitorCog, PanelLeftClose, Plane,
  PlugZap, RadioTower, ReceiptText, RotateCw, Search, Settings, ShieldCheck,
  Smartphone, Sparkles, Users, WalletCards, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { BRAND } from "@/domain/experience/config";
import { getMyAccess } from "@/lib/platform.functions";
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
    { to: "/admin/smart-finders/esim", label: "Smart Finder", icon: Sparkles },
    { to: "/admin/esim/devices", label: "Cihaz uyumluluğu", icon: Smartphone },
    { to: "/admin/esim/fulfillment", label: "eSIM teslimat", icon: DatabaseZap },
  ]},
  { label: "Lounge", links: [
    { to: "/admin", label: "Lounge genel bakış", icon: Plane },
    { to: "/admin/products", label: "Lounge’lar", icon: Building2 },
    { to: "/admin/lounge/bookings", label: "Rezervasyonlar", icon: BriefcaseBusiness },
  ]},
  { label: "Katalog & Provider", links: [
    { to: "/admin/providers", label: "Provider Hub", icon: PlugZap },
    { to: "/admin/esim/provider-import", label: "Katalog senkronu", icon: CloudUpload },
    { to: "/admin/test-catalogue", label: "Test kataloğu", icon: Boxes },
  ]},
  { label: "Mağaza yönetimi", links: [
    { to: "/admin/cms", label: "Sayfalar / CMS", icon: MonitorCog },
    { to: "/admin/media", label: "Medya", icon: Image },
    { to: "/admin/theme", label: "Tema", icon: Sparkles },
  ]},
  { label: "Finans & Operasyon", links: [
    { to: "/admin/finance", label: "Finans", icon: CircleDollarSign },
    { to: "/admin/refunds", label: "İadeler", icon: RotateCw },
    { to: "/admin/alerts", label: "Operasyon uyarıları", icon: AlertTriangle },
  ]},
  { label: "Sistem", links: [
    { to: "/admin/flags", label: "Özellik bayrakları", icon: Flag },
    { to: "/admin/audit", label: "Denetim kaydı", icon: ShieldCheck },
    { to: "/admin/settings", label: "Ayarlar", icon: Settings },
  ]},
];

export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { data, isPending } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isPending) return <main className="grid min-h-screen place-items-center bg-secondary"><p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Yetki kontrol ediliyor…</p></main>;
  if (!data?.isAdmin) return <main className="grid min-h-screen place-items-center bg-secondary p-4"><div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card"><AlertTriangle className="mx-auto size-10 text-destructive"/><h1 className="mt-4 font-display text-2xl font-bold">Yönetici yetkisi gerekiyor</h1><p className="mt-2 text-sm text-muted-foreground">Bu alan yalnızca açıkça yönetici rolü atanmış hesaplara açıktır.</p><Link to="/" search={{service:"esim"}} className="mt-5 inline-flex text-sm font-bold text-primary">Ana sayfaya dön</Link></div></main>;

  return <div className="admin-shell min-h-screen bg-secondary/55 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
    {mobileOpen && <button type="button" aria-label="Menüyü kapat" className="fixed inset-0 z-40 bg-primary/45 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-primary-foreground/10 bg-primary text-primary-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
      <div className="flex min-h-16 items-center justify-between border-b border-primary-foreground/10 px-4">
        <Link to="/admin" search={{ service: "all" }} className="font-display text-lg font-bold">{BRAND.name}<span className="ml-2 text-[10px] font-bold opacity-60">ADMIN</span></Link>
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
        <Button variant="ghost" size="icon" aria-label="Yönetimde ara"><Search /></Button>
        <Link to="/admin/alerts" className="relative grid size-9 place-items-center rounded-md border border-border" aria-label="Operasyon uyarıları"><AlertTriangle className="size-4" /></Link>
        <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex"><span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">A</span><span className="text-xs font-semibold">Admin</span></div>
      </header>
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
      const serviceSearch = label === "eSIM genel bakış" ? { service: "esim" as const } : label === "Lounge genel bakış" ? { service: "lounge" as const } : to === "/admin" ? { service: "all" as const } : undefined;
      const linkProps = serviceSearch ? { search: serviceSearch } : {};
      return <Link key={`${group.label}-${label}`} to={to} {...linkProps} onClick={onNavigate} className="flex min-h-9 items-center gap-2.5 rounded-md px-3 text-xs font-semibold opacity-70 hover:bg-primary-foreground/10 hover:opacity-100" activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}><Icon className="size-4" /><span className="truncate">{label}</span></Link>;
    })}</div>}
  </section>;
}