import { useStorefrontChrome } from "./useStorefrontChrome";
import { ConfiguredNavigation } from "@/components/admin/ChromeControls";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublishedStorefront } from "@/lib/storefront.functions";
import { itemText } from "@/domain/storefront/registry";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coins,
  BookOpen,
  FileText,
  House,
  ShieldCheck,
  ExternalLink,
  Globe2,
  Headphones,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plane,
  Search,
  Signal,
  ShoppingBag,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BRAND } from "@/domain/experience/config";
import { WhatsAppSupportWidget } from "./WhatsAppSupportWidget";

import { useI18n, LOCALE_REGISTRY, localeFromPath, type UiLocale } from "@/i18n";
import { GLOBAL_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { supabase } from "@/integrations/supabase/client";
import { CountryFlag } from "./CountryFlag";
import { StickyQuickSearch } from "./StickyQuickSearch";
import { useThemePreference, type ThemePreference } from "@/components/ThemePreference";
import { usePublishedTheme } from "@/components/PublishedTheme";
import { useIsV2 } from "@/components/design-v2/v2-context";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useCart } from "@/domain/cart/store";
import { isHiddenServiceHref, useOptionalServices } from "./ServiceAvailability";
import { localize } from "@/i18n/overlay";
import { CommercePanels, type CommercePanel } from "@/components/design-v2/commerce-panels";
import { CartContents } from "@/components/design-v2/CartContents";
import { COMMERCE_COPY } from "@/components/design-v2/commerce-copy";
import { cartBadge } from "@/domain/cart/presentation";
import { useIsMobile } from "@/hooks/use-mobile";
import { LocaleCurrencyPicker } from "./LocaleCurrencyPicker";
import { WhatsAppLogo } from "./WhatsAppLogo";
import { waLink } from "@/lib/whatsapp";

/** Flag shown next to each language (language, not location). */
const LOCALE_FLAG: Record<UiLocale, string> = localize({
  tr: "TR", de: "DE", en: "GB", fr: "FR", es: "ES", it: "IT", pt: "PT",
  nl: "NL", pl: "PL", ar: "SA", ru: "RU", ja: "JP", ko: "KR", zh: "CN",
});

const ACCOUNT_COPY = localize({
  tr: { trips: "Seyahatlerim", signIn: "Giriş yap", signOut: "Çıkış yap" },
  de: { trips: "Meine Reisen", signIn: "Anmelden", signOut: "Abmelden" },
  en: { trips: "My trips", signIn: "Sign in", signOut: "Sign out" },
} as const);

const THEME_COPY = localize({
  tr: { title: "Görünüm", light: "Açık", dark: "Koyu", system: "Sistem" },
  de: { title: "Darstellung", light: "Hell", dark: "Dunkel", system: "System" },
  en: { title: "Appearance", light: "Light", dark: "Dark", system: "System" },
} as const);

const MENU_CLOSE_LABEL = localize({
  tr: "Menüyü kapat",
  de: "Menü schließen",
  en: "Close menu",
} as const);

const DRAWER_COPY = localize({
  tr: { menu: "Menü", home: "Ana Sayfa", guides: "Blog ve Rehberler", setup: "Kurulum Rehberi", faq: "Sıkça Sorulan Sorular", language: "Dil", currency: "Para Birimi", privacy: "Gizlilik Politikası", terms: "Kullanım Şartları", imprint: "Künye", enter: "Giriş Yap / Üye Ol" },
  de: { menu: "Menü", home: "Startseite", guides: "Blog & Ratgeber", setup: "Installationsanleitung", faq: "Häufige Fragen", language: "Sprache", currency: "Währung", privacy: "Datenschutz", terms: "Nutzungsbedingungen", imprint: "Impressum", enter: "Anmelden / Registrieren" },
  en: { menu: "Menu", home: "Home", guides: "Blog & Guides", setup: "Installation guide", faq: "FAQ", language: "Language", currency: "Currency", privacy: "Privacy policy", terms: "Terms of use", imprint: "Imprint", enter: "Sign in / Register" },
} as const);

const FOOTER_COPY = localize({
  tr: { services: "Hizmetler", help: "Yardım", legal: "Yasal", newsletterUnavailable: "Abonelik yakında kullanıma açılacak.", social: "Sosyal medya" },
  de: { services: "Services", help: "Hilfe", legal: "Rechtliches", newsletterUnavailable: "Die Anmeldung wird demnächst verfügbar.", social: "Soziale Medien" },
  en: { services: "Services", help: "Help", legal: "Legal", newsletterUnavailable: "Subscription will be available soon.", social: "Social media" },
} as const);

/** Destinations / how-it-works entries open their homepage section in the visitor's language. */
function footerTarget(link: { id: string; href: string }, uiLocale: string): { to: string; hash?: string } {
  if(link.href==='/?service=esim')return {to:'/esim'};
  if(link.href==='/?service=lounge')return {to:'/lounge'};
  if (link.id === "service-destinations" || link.id === "nav-destinations") return { to: `/${uiLocale}`, hash: "popular" };
  if (link.id === "nav-how") return { to: `/${uiLocale}`, hash: "how" };
  const [path, hash] = link.href.split("#");
  if (!path) return { to: `/${uiLocale}`, hash: hash ?? "" };
  return hash !== undefined ? { to: path, hash } : { to: path };
}

function Brand({ mobilePasaport = false }: { mobilePasaport?: boolean }) {
  const theme = usePublishedTheme();
  const { uiLocale } = useI18n();
  return (
    <Link
      to={`/${uiLocale}`}
      aria-label="Ana sayfa"
      className="flex shrink-0 items-center gap-2 text-primary"
    >
       {mobilePasaport && !theme.logoUrl && <span className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Signal className="size-5" aria-hidden="true" /></span><span className="font-display text-[23px] font-bold">pasaport.io</span></span>}
       <span className={mobilePasaport && !theme.logoUrl ? "hidden" : "flex items-center gap-2"}>
      {theme.logoUrl ? <img src={theme.logoUrl} alt={BRAND.logoLabel} width={144} height={36} className="h-9 w-auto max-w-36 object-contain" /> : <>
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand"><Signal className="size-5" aria-hidden="true" /></span>
        <span className="font-display text-xl font-bold">{BRAND.name}</span>
      </>}
      </span>
    </Link>
  );
}
function LanguageMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale, uiLocale, setLocale } = useI18n();
  const navigate = useNavigate();
  const copy = localized(GLOBAL_CONTENT, locale);
  const choose = (code: UiLocale) => {
    setLocale(code);
    // Keep the equivalent page: a locale homepage maps to the new locale's homepage.
    const path = window.location.pathname.replace(/\/+$/, "");
    if (localeFromPath(path) && path.split("/").length === 2) {
      void navigate({ to: "/$locale", params: { locale: code }, search: ((s: object) => s) as never });
    }
  };
  const currency = useCurrency();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={copy.language.label}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(true)}
        className="public-header-language min-h-10 gap-1 px-2 text-xs sm:min-h-11 sm:px-3"
      >
        <CountryFlag iso={LOCALE_FLAG[uiLocale]} />
        <span>{uiLocale.toUpperCase()}</span>
        <span className="text-muted-foreground" data-testid="header-currency-code"><span className="public-header-currency-separator">· </span>{currency.code}</span>
      </Button>
      <LocaleCurrencyPicker open={open} onOpenChange={onOpenChange} onChooseLocale={choose} />
    </>
  );
}

function ThemePreferenceMenu() {
  const { locale } = useI18n();
  const { preference, setPreference } = useThemePreference();
  const copy = THEME_COPY[locale];
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "light", label: copy.light, icon: Sun },
    { value: "dark", label: copy.dark, icon: Moon },
    { value: "system", label: copy.system, icon: Monitor },
  ];
  return (
    <section className="mt-7 border-t border-border pt-5" aria-labelledby="appearance-label">
      <h3 id="appearance-label" className="text-xs font-bold uppercase text-muted-foreground">
        {copy.title}
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            variant={preference === value ? "default" : "outline"}
            onClick={() => setPreference(value)}
            aria-pressed={preference === value}
            className="h-auto min-h-12 min-w-0 flex-col gap-1 px-1 py-2 text-xs"
          >
            <Icon className="size-4" />
            <span className="max-w-full truncate">{label}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
/** Footer content is owned by the storefront editor; falls back to built-in copy. */
function PublicFooter({ fallback, supportLabel, bottomSafe = false }: { fallback: string; supportLabel: string; bottomSafe?: boolean | "purchase" }) {
  const { locale, uiLocale } = useI18n();
  const config=useStorefrontChrome();
  const data = config.config;
  const text = itemText(data?.footerText, uiLocale, fallback) || fallback;
  const optionalServices = useOptionalServices();
  const links = (data?.footerLinks ?? []).filter((link) => link.visible && link.href && !isHiddenServiceHref(link.href, optionalServices));
  const copyright = itemText(data?.copyright, uiLocale, "");
  const footerCopy = FOOTER_COPY[locale];
  const groups = [
    { id: "services", title: itemText(data.footer.groupLabels?.services,uiLocale,footerCopy.services) },
    { id: "help", title: itemText(data.footer.groupLabels?.help,uiLocale,footerCopy.help) },
    { id: "legal", title: itemText(data.footer.groupLabels?.legal,uiLocale,footerCopy.legal) },
  ] as const;
  const socials = (data?.footer.socials ?? []).filter((social) => social.active && social.url);
  return (
    <footer id="support" className={`${config.isPending ? "lg:min-h-[23.6rem]" : ""} border-t border-primary-foreground/10 bg-primary text-primary-foreground ${bottomSafe === "purchase" ? "pb-[calc(12.5rem+env(safe-area-inset-bottom))] sm:pb-8" : bottomSafe ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-8" : "pb-8"}`}>
      <div className="mx-auto max-w-site px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-7 lg:grid-cols-[1.15fr_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div>
            <div className="[&_a]:text-primary-foreground [&_a>span:first-of-type]:bg-primary-foreground [&_a>span:first-of-type]:text-primary">
              <Brand />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-primary-foreground/70">{text}</p>
            <Link to="/destek" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-foreground">
              <Headphones className="size-4" /> {supportLabel}
            </Link>
          </div>
          {groups.map((group) => {
            const groupLinks = links.filter((link) => (link.group ?? "help") === group.id);
            return <div key={group.id} className="border-t border-primary-foreground/15 pt-1 lg:border-0 lg:pt-0">
              <details className="group lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-bold lg:min-h-0 lg:cursor-default">
                  {group.title}<ChevronDown className="size-4 transition group-open:rotate-180 lg:hidden" />
                </summary>
                <nav aria-label={group.title} className="hidden gap-2 pb-3 pt-1.5 text-sm group-open:grid">
                  {groupLinks.map((link) => <Link key={link.id} {...footerTarget(link, uiLocale)} className="text-primary-foreground/68 transition hover:text-primary-foreground">{itemText(link.label, uiLocale)}</Link>)}
                </nav>
              </details>
              <div className="hidden lg:block">
                <h2 className="text-sm font-bold">{group.title}</h2>
                <nav aria-label={group.title} className="mt-4 grid gap-2 text-sm">
                  {groupLinks.map((link) => <Link key={link.id} {...footerTarget(link, uiLocale)} className="text-primary-foreground/68 transition hover:text-primary-foreground">{itemText(link.label, uiLocale)}</Link>)}
                </nav>
              </div>
            </div>;
          })}
        </div>
        {data?.footer.newsletterVisible && <div className="mt-8 grid gap-3 border-t border-primary-foreground/15 pt-6 md:grid-cols-[1fr_minmax(18rem,0.8fr)] md:items-center">
          <div><h2 className="font-display text-lg font-bold">{itemText(data.footer.newsletterTitle, locale)}</h2><p className="mt-1 text-xs text-primary-foreground/65">{itemText(data.footer.newsletterDescription, locale)}</p></div>
          <div><div className="flex gap-2"><input disabled aria-label={itemText(data.footer.newsletterPlaceholder, locale)} placeholder={itemText(data.footer.newsletterPlaceholder, locale)} className="min-h-11 min-w-0 flex-1 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-3 text-sm placeholder:text-primary-foreground/50"/><Button disabled variant="secondary">{itemText(data.footer.newsletterCta, locale)}</Button></div><p className="mt-1.5 text-[10px] text-primary-foreground/55">{footerCopy.newsletterUnavailable}</p></div>
        </div>}
        <div className="mt-8 flex flex-col gap-4 border-t border-primary-foreground/15 pt-5 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-h-4">{copyright}</span>
          {socials.length > 0 && <nav aria-label={footerCopy.social} className="flex flex-wrap gap-3">{socials.map((social) => <a key={social.id} href={social.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary-foreground"><ExternalLink className="size-3"/>{social.id}</a>)}</nav>}
        </div>
      </div>
    </footer>
  );
}
export function PublicShell({
  children,
  activeService,
  onServiceChange,
  hideStickySearch = false,
  hideFloatingWhatsApp = false,
  headerAccessory,
  footerBottomSafe = false,
  mobilePasaport = false,
}: {
  children: ReactNode;
  activeService?: ServiceSlug;
  onServiceChange?: (service: ServiceSlug, options?: { scrollToFinder?: boolean }) => void;
  /** Customer portal pages never show the homepage destination search. */
  hideStickySearch?: boolean;
  /** Design-preview pages dock their own WhatsApp button; production keeps the default. */
  hideFloatingWhatsApp?: boolean;
  /** Optional page-owned compact content directly below the shared header. */
  headerAccessory?: ReactNode;
  /** Pages with fixed mobile action rows keep the footer scrollable above them. */
  footerBottomSafe?: boolean | "purchase";
  mobilePasaport?: boolean;
}) {
  const publishedTheme = usePublishedTheme();
  const isV2 = useIsV2();
  const optionalServices = useOptionalServices();
  const chrome=useStorefrontChrome().config;
  const { locale, uiLocale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { count } = useCart();
  const [panel, setPanel] = useState<CommercePanel>(null);
  const cartTrigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const mobile = useIsMobile();
  const commerce = COMMERCE_COPY[locale];
  useEffect(() => { setPanel(null); }, [location.href]);
  useEffect(() => {
    const added = () => { toast.success(commerce.added, { duration: 3000, action: { label: commerce.view, onClick: () => setPanel("cart") } }); };
    window.addEventListener("cart:item-added", added);
    return () => { window.removeEventListener("cart:item-added", added); };
  }, [commerce]);
  const currency = useCurrency();
  const drawerCopy = DRAWER_COPY[locale];
  const guidesPath = uiLocale === "tr" ? "/tr/rehber" : uiLocale === "de" ? "/de/ratgeber" : uiLocale === "en" ? "/en/guides" : "/guides";
   const isHeaderOverlayOpen = menuOpen || languageOpen || accountOpen || panel !== null;
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = async () => {
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await navigate({ to: "/", search: { service: "esim" }, replace: true });
      window.location.replace("/?service=esim");
    } catch {
      toast.error(
        locale === "tr"
          ? "Çıkış yapılamadı. Lütfen tekrar deneyin."
          : locale === "de"
            ? "Abmeldung fehlgeschlagen. Bitte versuche es erneut."
            : "Unable to sign out. Please try again.",
      );
    }
  };
  return (
    <CommercePanels.Provider value={{ panel, setPanel }}>
    <div className={`${isV2 ? "v2-theme theme-surface" : ""} ${mobilePasaport ? "pasaport-mobile-reference" : ""} min-h-screen bg-background text-foreground`} data-theme-button={isV2 ? publishedTheme.buttonStyle : undefined} data-theme-surface={isV2 ? publishedTheme.surface : undefined}>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="public-header-row mx-auto grid min-h-14 max-w-site grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6 lg:flex">
          <Brand mobilePasaport={mobilePasaport} />
          <nav className="hidden lg:flex gap-4" aria-label="Menü"><ConfiguredNavigation rows={chrome.navigation.filter(row=>!isHiddenServiceHref(row.href,optionalServices))} locale={uiLocale} render={(row,label,icon)=><Link {...footerTarget(row,uiLocale)} className="nav-link inline-flex gap-2">{icon}{label}</Link>}/></nav>
          <div className="public-header-actions flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button ref={cartTrigger} onClick={() => { setMenuOpen(false); setAccountOpen(false); setLanguageOpen(false); setPanel("cart"); }} variant="ghost" size="icon" aria-label={`${commerce.cart} (${count})`} data-testid="header-cart" className="relative inline-flex size-11 overflow-visible">
                <ShoppingBag className="size-5" />
                {count > 0 && <span data-testid="cart-count" aria-hidden="true" className="absolute end-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">{cartBadge(count)}</span>}
            </Button>
            <LanguageMenu
              open={languageOpen}
              onOpenChange={(open) => {
                setLanguageOpen(open);
                if (open) {
                  setAccountOpen(false);
                  setMenuOpen(false);
                }
              }}
            />
            {signedIn ? (
              <DropdownMenu
                open={accountOpen}
                onOpenChange={(open) => {
                  setAccountOpen(open);
                  if (open) {
                    setLanguageOpen(false);
                    setMenuOpen(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={copy.nav.account}
                  >
                    <UserRound className="size-[18px] sm:size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/account">{copy.nav.account}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/esims">{ACCOUNT_COPY[locale].trips}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" />
                    {ACCOUNT_COPY[locale].signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="icon" className="size-11">
                <Link
                  to="/auth"
                  search={{ redirect: "/account" }}
                  aria-label={copy.nav.account}
                >
                  <UserRound className="size-[18px] sm:size-5" />
                </Link>
              </Button>
            )}
            <Sheet
              open={menuOpen}
              onOpenChange={(open) => {
                setMenuOpen(open);
                if (open) {
                  setLanguageOpen(false);
                  setAccountOpen(false);
                }
              }}
            >
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-11" aria-label={drawerCopy.menu} aria-expanded={menuOpen}>
                  <Menu className="size-[18px] sm:size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={uiLocale === "ar" ? "right" : "left"}
                dir={uiLocale === "ar" ? "rtl" : "ltr"}
                showCloseButton={false}
                className="w-[88vw] max-w-[23rem] overflow-y-auto border-e border-primary/20 bg-background px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:px-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <SheetTitle><Brand /></SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label={MENU_CLOSE_LABEL[locale]} className="size-11 rounded-full text-foreground hover:bg-primary/10">
                      <X className="size-6" aria-hidden="true" />
                    </Button>
                  </SheetClose>
                </div>
                {!signedIn && (
                  <SheetClose asChild>
                    <Link to="/auth" search={{ redirect: "/account" }} className="mt-6 flex min-h-14 items-center gap-3 rounded-full border border-primary/60 bg-primary/10 px-4 text-sm font-semibold text-foreground transition hover:bg-primary/15">
                      <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{drawerCopy.enter}</span>
                      <ChevronRight className="size-5 shrink-0 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  </SheetClose>
                )}
                <nav aria-label={drawerCopy.menu} className="mt-6 grid gap-2 border-b border-border/60 pb-5"><ConfiguredNavigation rows={chrome.navigation.filter(row=>!isHiddenServiceHref(row.href,optionalServices))} locale={uiLocale} render={(row,label,icon)=><SheetClose asChild><Link {...footerTarget(row,uiLocale)} className="mobile-menu-link flex min-h-12 items-center gap-3">{icon}{label}</Link></SheetClose>}/>{signedIn&&<SheetClose asChild><Link to="/account" className="mobile-menu-link">{copy.nav.account}</Link></SheetClose>}</nav>
                <div className="grid gap-1 border-b border-border/60 py-4">
                  <Button variant="ghost" type="button" className="mobile-menu-link flex min-h-12 w-full items-center justify-start gap-3 px-3 text-left" onClick={() => { setMenuOpen(false); setLanguageOpen(true); }}>
                    <Globe2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{drawerCopy.language}</span>
                    <CountryFlag iso={LOCALE_FLAG[uiLocale]} />
                    <span className="text-xs">{uiLocale.toUpperCase()}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" type="button" className="mobile-menu-link flex min-h-12 w-full items-center justify-start gap-3 px-3 text-left" onClick={() => { setMenuOpen(false); setLanguageOpen(true); }}>
                    <Coins className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{drawerCopy.currency}</span>
                    <span className="text-xs">{currency.code}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  </Button>
                </div>
                <nav aria-label={FOOTER_COPY[locale].legal} className="grid gap-2 py-4"><ConfiguredNavigation rows={chrome.footerLinks.filter(row=>row.group==='legal')} locale={uiLocale} render={(row,label,icon)=><SheetClose asChild><Link {...footerTarget(row,uiLocale)} className="mobile-menu-link flex min-h-11 gap-3">{icon}{label}</Link></SheetClose>}/></nav>
                <ThemePreferenceMenu />
                <a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-7 flex min-h-14 items-center justify-center gap-3 rounded-full border border-primary bg-primary/10 px-4 text-sm font-semibold text-foreground transition hover:bg-primary/15">
                  <WhatsAppLogo className="size-5 shrink-0 text-primary" />
                  <span>{copy.nav.support}</span>
                  <ChevronRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                </a>
                {signedIn && <SheetClose asChild><Button variant="ghost" type="button" onClick={() => void signOut()} className="mt-3 w-full justify-start gap-2 text-destructive"><LogOut className="size-4" />{ACCOUNT_COPY[locale].signOut}</Button></SheetClose>}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      {!isHeaderOverlayOpen && headerAccessory}
      {!hideStickySearch && activeService !== "lounge" && (
        <StickyQuickSearch service="esim" suppressed={isHeaderOverlayOpen} />
      )}
      <main>{children}</main>
      <Sheet open={panel === "cart"} onOpenChange={(open) => setPanel(open ? "cart" : null)}>
        <SheetContent side={mobile ? "bottom" : "right"} dir={uiLocale === "ar" ? "rtl" : "ltr"} showCloseButton={false} aria-describedby={undefined} onCloseAutoFocus={(event) => { event.preventDefault(); cartTrigger.current?.focus(); }} className={mobile ? "max-h-[85dvh] rounded-t-lg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4" : "w-full sm:max-w-[440px]"}>
          <div className="flex items-center justify-between gap-3"><SheetTitle>{commerce.cart} ({count})</SheetTitle><SheetClose asChild><Button variant="ghost" size="icon" aria-label={commerce.closeCart}><X className="size-5" /></Button></SheetClose></div>
          <CartContents inPanel />
        </SheetContent>
      </Sheet>
      <PublicFooter fallback={copy.footer} supportLabel={copy.nav.support} bottomSafe={footerBottomSafe} />
      {!hideFloatingWhatsApp && <WhatsAppSupportWidget surface="shell" placement="fixed" />}

    </div>
    </CommercePanels.Provider>
  );
}
