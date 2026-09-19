import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublishedStorefront } from "@/lib/storefront.functions";
import { itemText } from "@/domain/storefront/registry";
import {
  Check,
  Globe2,
  Headphones,
  Home,
  Menu,
  Plane,
  Search,
  Signal,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BRAND } from "@/domain/experience/config";
import { useI18n } from "@/i18n";
import { GLOBAL_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { supabase } from "@/integrations/supabase/client";
import { CountryFlag } from "./CountryFlag";
import { EsimServiceIcon, LoungeServiceIcon } from "./ServiceIcons";

const localeMeta = {
  tr: { iso: "TR", short: "TR" },
  de: { iso: "DE", short: "DE" },
  en: { iso: "GB", short: "EN" },
} as const;

function Brand() {
  return (
    <Link
      to="/"
      search={{ service: "esim" }}
      aria-label="Ana sayfa"
      className="flex shrink-0 items-center gap-2 text-primary"
    >
      <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-brand">
        <Signal className="size-5" aria-hidden="true" />
      </span>
      <span className="font-display text-xl font-bold">{BRAND.name}</span>
    </Link>
  );
}
function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  return (
    <DropdownMenu>
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
/** Footer content is owned by the storefront editor; falls back to built-in copy. */
function PublicFooter({ fallback, supportLabel }: { fallback: string; supportLabel: string }) {
  const { locale } = useI18n();
  const config = useQuery({
    queryKey: ["storefront", "global"],
    queryFn: () => getPublishedStorefront({ data: { service: "global" } }),
    staleTime: 60_000,
  });
  const data = config.data?.config;
  const text = itemText(data?.footerText, locale, fallback) || fallback;
  const links = (data?.footerLinks ?? []).filter((link) => link.visible);
  const copyright = itemText(data?.copyright, locale, "");
  return (
    <footer id="support" className="border-t border-border bg-secondary/50 pb-28 pt-10 md:pb-10">
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
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Headphones className="size-4" /> {supportLabel}
          </span>
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
}: {
  children: ReactNode;
  activeService?: ServiceSlug;
  onServiceChange?: (service: ServiceSlug) => void;
}) {
  const { locale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const selectAndFind = (service: ServiceSlug) => {
    onServiceChange?.(service);
    window.setTimeout(
      () =>
        document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      30,
    );
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto grid min-h-12 max-w-site grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6 lg:flex">
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
              to="/"
              search={{ service: activeService ?? "esim" }}
              hash="support"
              className="nav-link"
            >
              {copy.nav.support}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <LanguageMenu />
            <Button asChild variant="ghost" size="icon" className="size-9 sm:size-10">
              {signedIn ? (
                <Link to="/hesabim/seyahatler" aria-label={copy.nav.account}>
                  <UserRound className="size-[18px] sm:size-5" />
                </Link>
              ) : (
                <Link
                  to="/auth"
                  search={{ redirect: "/hesabim/seyahatler" }}
                  aria-label={copy.nav.account}
                >
                  <UserRound className="size-[18px] sm:size-5" />
                </Link>
              )}
            </Button>
            <Button asChild className="hidden lg:inline-flex">
              <Link to="/" search={{ service: activeService ?? "esim" }} hash="finder">
                {copy.nav.plan}
              </Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 sm:size-10" aria-label="Menü">
                  <Menu className="size-[18px] sm:size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm bg-background p-6">
                <div className="flex items-center justify-between">
                  <SheetTitle>
                    <Brand />
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Kapat">
                      <X />
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
                      to="/"
                      search={{ service: activeService ?? "esim" }}
                      hash="support"
                      className="mobile-menu-link"
                    >
                      {copy.nav.support}
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <PublicFooter fallback={copy.footer} supportLabel={copy.nav.support} />
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/98 pb-safe shadow-nav md:hidden"
        aria-label="Mobil menü"
      >
        <div className="grid grid-cols-4">
          <Link
            to="/"
            search={{ service: activeService ?? "esim" }}
            className="bottom-link"
            activeOptions={{ exact: true }}
          >
            <Home className="size-[1.15rem]" />
            <span>{copy.mobile.home}</span>
          </Link>
          <button
            type="button"
            className={`bottom-link ${activeService === "esim" ? "is-active" : ""}`}
            onClick={() => selectAndFind("esim")}
          >
            <EsimServiceIcon className="size-[1.15rem]" />
            <span>{copy.mobile.esim}</span>
          </button>
          <button
            type="button"
            className={`bottom-link ${activeService === "lounge" ? "is-active" : ""}`}
            onClick={() => selectAndFind("lounge")}
          >
            <LoungeServiceIcon className="size-[1.15rem]" />
            <span>{copy.mobile.lounge}</span>
          </button>
          {signedIn ? (
            <Link
              to="/hesabim/seyahatler"
              className={`bottom-link ${pathname.startsWith("/hesabim") ? "is-active" : ""}`}
            >
              <UserRound className="size-[1.15rem]" />
              <span>{copy.mobile.account}</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ redirect: "/hesabim/seyahatler" }}
              className={`bottom-link ${pathname === "/auth" ? "is-active" : ""}`}
            >
              <UserRound className="size-[1.15rem]" />
              <span>{copy.mobile.account}</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
