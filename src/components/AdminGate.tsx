import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";
import { ADMIN_GROUPS as groups, type AdminGroup } from "@/components/admin/admin-navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Globe, Mail,
  AlertTriangle, BarChart3, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronDown,
  CircleDollarSign, ClipboardList, CloudUpload, DatabaseZap, ExternalLink, Flag,
  Image, LayoutDashboard, LayoutTemplate, LoaderCircle, LogOut, MapPin, Megaphone, Menu, MonitorCog, PanelLeftClose, Plane, Scale,
  PlugZap, RadioTower, ReceiptText, RotateCw, Route, Search, Settings, ShieldCheck,
  Car, Smartphone, Sparkles, ToggleLeft, Users, WalletCards, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BRAND } from "@/domain/experience/config";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/platform.functions";
import { adminSearch, getAdminAlerts, getAdminIdentity } from "@/lib/admin-control.functions";
import { Button } from "@/components/ui/button";


/** Shares AdminGate's access query so pages only fetch admin data once access is confirmed. */
export function useIsAdmin(): boolean {
  const { data } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });
  return Boolean(data?.isAdmin);
}

export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { data, isPending } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isPending) return <main className="grid min-h-screen place-items-center bg-secondary"><p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Yetki kontrol ediliyor…</p></main>;
  if (!data?.isAdmin) return <main className="grid min-h-screen place-items-center bg-secondary p-4"><div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card"><AlertTriangle className="mx-auto size-10 text-destructive"/><h1 className="mt-4 font-display text-2xl font-bold">Yönetici yetkisi gerekiyor</h1><p className="mt-2 text-sm text-muted-foreground">Bu alan yalnızca açıkça yönetici rolü atanmış hesaplara açıktır.</p><div className="mt-5 flex justify-center gap-4 text-sm font-bold text-primary"><Link to="/account">Hesabıma dön</Link><Link to="/" search={{service:"esim"}}>Ana sayfa</Link></div></div></main>;

  return <AdminWorkspaceShell title={title} brand={BRAND.name} mobileOpen={mobileOpen} onMobileOpen={setMobileOpen}
    navigation={groups.map((group,index)=><NavGroup key={group.label} group={group} pathname={pathname} defaultOpen={index<3} onNavigate={()=>setMobileOpen(false)}/>)}
    actions={<><Button variant="ghost" size="icon" aria-label="Yönetimde ara" onClick={()=>setSearchOpen(true)}><Search/></Button><Link to="/admin/alerts" className="relative grid size-9 shrink-0 place-items-center rounded-md border border-border" aria-label="Bildirim merkezi"><AlertTriangle className="size-4"/><UnreadBadge/></Link><AdminAccount/></>}>
    <AdminSearch open={searchOpen} onClose={()=>setSearchOpen(false)}/>{children}
  </AdminWorkspaceShell>;
}

function NavGroup({ group, pathname, defaultOpen, onNavigate }: { group: AdminGroup; pathname: string; defaultOpen: boolean; onNavigate: () => void }) {
  const hasActive = group.links.some((item) => pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)));
  const [open, setOpen] = useState(defaultOpen || hasActive);
  return <section className="mb-2">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-8 w-full items-center justify-between px-3 text-[10px] font-bold uppercase opacity-55"><span>{group.label}</span><ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <div className="grid gap-0.5">{group.links.map(({ to, label, icon: Icon, hash }) => {
      if (label === "eSIM genel bakış" || label === "Lounge genel bakış") {
        return <Link key={`${group.label}-${label}`} to="/admin" search={{ service: label === "eSIM genel bakış" ? "esim" : "lounge" }} onClick={onNavigate} className="flex min-h-9 items-center gap-2.5 rounded-md px-3 text-xs font-semibold opacity-70 hover:bg-primary-foreground/10 hover:opacity-100"><Icon className="size-4" /><span className="truncate">{label}</span></Link>;
      }
      return <Link key={`${group.label}-${label}`} to={to} {...(hash ? { hash } : {})} onClick={onNavigate} className="flex min-h-9 items-center gap-2.5 rounded-md px-3 text-xs font-semibold opacity-70 hover:bg-primary-foreground/10 hover:opacity-100" activeOptions={{ exact: to === "/admin" }} activeProps={{ className: "bg-primary-foreground/15 opacity-100" }}><Icon className="size-4" /><span className="truncate">{label}</span></Link>;
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

function UnreadBadge() {
  const q = useQuery({ queryKey: ["admin-alerts"], queryFn: () => getAdminAlerts(), refetchInterval: 60_000 });
  const n = (q.data ?? []).filter((a: any) => a.status === "OPEN").length;
  return n ? <span className="absolute -end-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-label={`${n} okunmamış`}>{n}</span> : null;
}
