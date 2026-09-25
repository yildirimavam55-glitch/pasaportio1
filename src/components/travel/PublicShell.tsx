import { useNavigate } from "@tanstack/react-router";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublishedStorefront } from "@/lib/storefront.functions";
import { itemText } from "@/domain/storefront/registry";
import {
  Check,
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
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
import { waLink } from "@/lib/whatsapp";
import { WhatsAppLogo } from "./WhatsAppLogo";

import { useI18n } from "@/i18n";
import { GLOBAL_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { supabase } from "@/integrations/supabase/client";
import { CountryFlag } from "./CountryFlag";
import { StickyQuickSearch } from "./StickyQuickSearch";
import { useThemePreference, type ThemePreference } from "@/components/ThemePreference";

const localeMeta = {
  tr: { iso: "TR", short: "TR" },
  de: { iso: "DE", short: "DE" },
  en: { iso: "GB", short: "EN" },
} as const;

const ACCOUNT_COPY = {
  tr: { trips: "Seyahatlerim", signIn: "Giriş yap", signOut: "Çıkış yap" },
  de: { trips: "Meine Reisen", signIn: "Anmelden", signOut: "Abmelden" },
  en: { trips: "My trips", signIn: "Sign in", signOut: "Sign out" },
} as const;

const THEME_COPY = {
  tr: { title: "Görünüm", light: "Açık", dark: "Koyu", system: "Sistem" },
  de: { title: "Darstellung", light: "Hell", dark: "Dunkel", system: "System" },
  en: { title: "Appearance", light: "Light", dark: "Dark", system: "System" },
} as const;

const MENU_CLOSE_LABEL = {
  tr: "Menüyü kapat",
  de: "Menü schließen",
  en: "Close menu",
} as const;

const WHATSAPP_LABEL = {
  tr: "WhatsApp destek",
  de: "WhatsApp-Support",
  en: "WhatsApp support",
} as const;

function Brand() {
  return (
    <Link
      to="/"
      search={{ service: "esim" }}
      aria-label="Ana sayfa"
      className="flex shrink-0 items-center gap-2 text-primary"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand">
        <Signal className="size-5" aria-hidden="true" />
      </span>
      <span className="font-display text-xl font-bold">{BRAND.name}</span>
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
  const { locale, setLocale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={copy.language.label}
          className="min-h-10 gap-1 px-2 text-xs sm:min-h-11 sm:px-3"
        >
          <CountryFlag iso={localeMeta[locale].iso} />
          <span>{localeMeta[locale].short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {(["tr", "de", "en"] as const).map((code) => (
          <DropdownMenuItem key={code} onSelect={() => setLocale(code)} className="min-h-11 gap-3">
            <CountryFlag iso={localeMeta[code].iso} />
            <span className="flex-1">{copy.language[code]}</span>
            {locale === code && <Check className="size-4 text-primary" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  const { locale } = useI18n();
  const config = useQuery({
    queryKey: ["storefront", "global"],
    queryFn: () => getPublishedStorefront({ data: { service: "global" } }),
    staleTime: 60_000,
  });
  const data = config.data?.config;
  const text = itemText(data?.footerText, locale, fallback) || fallback;
  const links = (data?.footerLinks ?? []).filter(
    (link) =>
      link.visible &&
      !/support|destek/i.test(link.href) &&
      !/destek|support|hilfe/i.test(itemText(link.label, locale)),
  );
  const copyright = itemText(data?.copyright, locale, "");
  return (
    <footer id="support" className={`border-t border-border bg-secondary/50 pt-10 ${bottomSafe === "purchase" ? "pb-[calc(12.5rem+env(safe-area-inset-bottom))] sm:pb-10" : bottomSafe ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-10" : "pb-10"}`}>
      <div className="mx-auto flex max-w-site flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Brand />
        <p className="max-w-md text-sm text-muted-foreground">{text}</p>
        <div className="grid gap-2">
          {links.length > 0 && (
            <nav
              className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold"
              aria-label="Alt bilgi menüsü"
            >
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary"
                >
                  {itemText(link.label, locale)}
                </a>
              ))}
            </nav>
          )}
          <Link to="/destek" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Headphones className="size-4" /> {supportLabel}
          </Link>
          {copyright && <span className="text-xs text-muted-foreground">{copyright}</span>}
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
}) {
  const { locale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const isHeaderOverlayOpen = menuOpen || languageOpen || accountOpen;
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto grid min-h-14 max-w-site grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6 lg:flex">
          <Brand />
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="Ana menü"
          >
            {onServiceChange ? (
              <>
                <button type="button" className="nav-link" onClick={() => onServiceChange("esim")}>
                  {copy.nav.esim}
                </button>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => onServiceChange("lounge")}
                >
                  {copy.nav.lounge}
                </button>
              </>
            ) : (
              <>
                <Link to="/esim" className="nav-link">
                  {copy.nav.esim}
                </Link>
                <Link to="/lounge" className="nav-link">
                  {copy.nav.lounge}
                </Link>
              </>
            )}
            <Link
              to="/"
              search={{ service: activeService ?? "esim" }}
              hash="popular"
              className="nav-link"
            >
              {copy.nav.destinations}
            </Link>
            <Link
              to="/"
              search={{ service: activeService ?? "esim" }}
              hash="how"
              className="nav-link"
            >
              {copy.nav.how}
            </Link>
            <Link
              to="/destek"
              className="nav-link"
            >
              {copy.nav.support}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
            <Button asChild className="hidden lg:inline-flex">
              <Link to="/" search={{ service: activeService ?? "esim" }} hash="finder">
                {copy.nav.plan}
              </Link>
            </Button>
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
                <Button variant="ghost" size="icon" className="size-11" aria-label="Menü">
                  <Menu className="size-[18px] sm:size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showCloseButton={false}
                className="w-[86vw] max-w-sm bg-background p-6"
              >
                <div className="flex items-center justify-between">
                  <SheetTitle>
                    <Brand />
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={MENU_CLOSE_LABEL[locale]}
                      className="grid size-12 place-items-center rounded-2xl border-2 border-primary bg-card text-primary shadow-sm transition hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <X className="size-5" strokeWidth={2.5} />
                    </Button>
                  </SheetClose>
                </div>
                <nav className="mt-10 grid gap-2">
                  {onServiceChange ? (
                    <>
                      <SheetClose asChild>
                        <button
                          type="button"
                          className="mobile-menu-link"
                          onClick={() => onServiceChange("esim")}
                        >
                          {copy.nav.esim}
                        </button>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          type="button"
                          className="mobile-menu-link"
                          onClick={() => onServiceChange("lounge")}
                        >
                          {copy.nav.lounge}
                        </button>
                      </SheetClose>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Link to="/esim" className="mobile-menu-link">
                          {copy.nav.esim}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/lounge" className="mobile-menu-link">
                          {copy.nav.lounge}
                        </Link>
                      </SheetClose>
                    </>
                  )}
                  <SheetClose asChild>
                    <Link
                      to="/"
                      search={{ service: activeService ?? "esim" }}
                      hash="popular"
                      className="mobile-menu-link"
                    >
                      {copy.nav.destinations}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/"
                      search={{ service: activeService ?? "esim" }}
                      hash="how"
                      className="mobile-menu-link"
                    >
                      {copy.nav.how}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/destek"
                      className="mobile-menu-link"
                    >
                      {copy.nav.support}
                    </Link>
                  </SheetClose>
                  {signedIn ? (
                    <>
                      <SheetClose asChild>
                        <Link to="/account" className="mobile-menu-link">
                          {copy.nav.account}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={() => void signOut()}
                          className="mobile-menu-link flex items-center gap-2 text-left text-destructive"
                        >
                          <LogOut className="size-4" />
                          {ACCOUNT_COPY[locale].signOut}
                        </button>
                      </SheetClose>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Link
                        to="/auth"
                        search={{ redirect: "/account" }}
                        className="mobile-menu-link flex items-center gap-2"
                      >
                        <LogIn className="size-4" />
                        {ACCOUNT_COPY[locale].signIn}
                      </Link>
                    </SheetClose>
                  )}
                </nav>
                <ThemePreferenceMenu />
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
      <PublicFooter fallback={copy.footer} supportLabel={copy.nav.support} bottomSafe={footerBottomSafe} />
      {!hideFloatingWhatsApp && <Button
        asChild
        size="lg"
        className="fixed bottom-20 right-4 z-40 size-12 rounded-full p-0 shadow-lg sm:bottom-6 sm:right-6"
        style={{ backgroundColor: "#25D366" }}
      >
        <a
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={WHATSAPP_LABEL[locale]}
          className="text-white hover:brightness-95"
        >
          <WhatsAppLogo className="size-6" />
        </a>
      </Button>}

    </div>
  );
}
