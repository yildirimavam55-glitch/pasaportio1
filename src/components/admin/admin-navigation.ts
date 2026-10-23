import {
  Globe, Mail,
  AlertTriangle, BarChart3, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronDown,
  CircleDollarSign, ClipboardList, CloudUpload, DatabaseZap, ExternalLink, Flag,
  Image, LayoutDashboard, LayoutTemplate, LoaderCircle, LogOut, MapPin, Megaphone, Menu, MonitorCog, PanelLeftClose, Plane, Scale,
  PlugZap, RadioTower, ReceiptText, RotateCw, Route, Search, Settings, ShieldCheck,
  Car, Smartphone, Sparkles, ToggleLeft, Users, WalletCards, X,
} from "lucide-react";

export type AdminLink = { to: string; label: string; icon: typeof LayoutDashboard; hash?: string };
export type AdminGroup = { label: string; links: AdminLink[] };

export const ADMIN_GROUPS: AdminGroup[] = [
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
    { to: "/admin/esim/cost-analysis", label: "10 GB maliyet", icon: Globe },
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
    { to: "/admin/manual-pricing", label: "Paket fiyatları", icon: CircleDollarSign },
    { to: "/admin/repricing", label: "Fiyat kontrol kuyruğu", icon: CircleDollarSign },
  ]},
  {label:"Website Baukasten",links:[
    {to:"/admin/storefront/v2/esim",label:"Seiten · Vorschau & Versionen",icon:LayoutTemplate},
    {to:"/admin/theme",label:"Globales Design",icon:Sparkles},
    {to:"/admin/media",label:"Medienbibliothek",icon:Image},
    {to:"/admin/storefront/v2/esim",hash:"v2-page-translations",label:"Sprachen · 14 Vorschauen",icon:Globe},
    {to:"/admin/storefront/navigation",label:"Menü, Footer & Konto",icon:Menu},
  ]},
  { label: "Mağaza yönetimi", links: [
    { to: "/admin/storefront", label: "Storefront", icon: LayoutTemplate },
    { to: "/admin/storefront/navigation", label: "Menü & alt bilgi", icon: Menu },
    { to: "/admin/legal", label: "Yasal", icon: Scale },
    { to: "/admin/emails", label: "E-postalar", icon: Mail },
    { to: "/admin/documents", label: "Belgeler (PDF)", icon: ClipboardList },
    { to: "/admin/cms", label: "Sayfalar / CMS", icon: MonitorCog },
    { to: "/admin/storefront/v2/esim", hash: "reviews", label: "İçerik → Yorumlar", icon: Users },
    { to: "/admin/guides", label: "Rehberler", icon: BookOpen },
    { to: "/admin/content/seo", label: "İçerik → SEO", icon: Search },
    { to: "/admin/media", label: "Medya", icon: Image },
    { to: "/admin/theme", label: "Tema", icon: Sparkles },
    { to: "/admin/destinations", label: "Destinasyonlar", icon: MapPin },
    { to: "/admin/airports", label: "Havalimanları", icon: Plane },
    { to: "/admin/marketing/campaigns", label: "Kampanyalar", icon: Megaphone },
    { to: "/admin/marketing/promotions", label: "İndirimler / Kuponlar", icon: Megaphone },
  ]},
  { label: "Finans & Operasyon", links: [
    { to: "/admin/finance", label: "Finans", icon: CircleDollarSign },
    { to: "/admin/currencies", label: "Para birimleri", icon: CircleDollarSign },
    { to: "/admin/refunds", label: "İade Talepleri", icon: RotateCw },
    { to: "/admin/alerts", label: "Bildirim merkezi", icon: AlertTriangle },
  ]},
  { label: "Sistem", links: [
    { to: "/admin/service-controls", label: "Servis kontrolleri", icon: ToggleLeft },
    { to: "/admin/flags", label: "Özellik bayrakları", icon: Flag },
    { to: "/admin/audit", label: "Denetim kaydı", icon: ShieldCheck },
    { to: "/admin/security", label: "Güvenlik durumu", icon: ShieldCheck },
    { to: "/admin/settings", label: "Ayarlar", icon: Settings },
    { to: "/admin/settings/users", label: "Admin Kullanıcıları", icon: Users },
  ]},
];


