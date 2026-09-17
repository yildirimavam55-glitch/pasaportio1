import { Link, useRouterState } from "@tanstack/react-router";
import { Check, Globe2, Headphones, Home, Menu, Plane, Search, Signal, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BRAND } from "@/domain/experience/config";
import { useI18n } from "@/i18n";
import { GLOBAL_CONTENT, localized, type ServiceSlug } from "@/content/travel-content";
import { supabase } from "@/integrations/supabase/client";

const localeMeta = { tr: { flag: "🇹🇷", short: "TR" }, de: { flag: "🇩🇪", short: "DE" }, en: { flag: "🇬🇧", short: "EN" } } as const;

function Brand() {
  return <Link to="/" aria-label="Ana sayfa" className="flex shrink-0 items-center gap-2 text-primary"><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-brand"><Signal className="size-5" aria-hidden="true" /></span><span className="font-display text-xl font-bold">{BRAND.name}</span></Link>;
}
function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const copy = localized(GLOBAL_CONTENT, locale);
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={copy.language.label} className="min-h-10 gap-1.5"><span aria-hidden="true">{localeMeta[locale].flag}</span><span>{localeMeta[locale].short}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-44">{(["tr","de","en"] as const).map((code) => <DropdownMenuItem key={code} onSelect={() => setLocale(code)} className="min-h-11 gap-3"><span aria-hidden="true">{localeMeta[code].flag}</span><span className="flex-1">{copy.language[code]}</span>{locale === code && <Check className="size-4 text-primary" aria-hidden="true" />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
export function PublicShell({ children, activeService, onServiceChange }: { children: ReactNode; activeService?: ServiceSlug; onServiceChange?: (service: ServiceSlug) => void }) {
  const { locale } = useI18n(); const copy = localized(GLOBAL_CONTENT, locale);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session))); const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session))); return () => data.subscription.unsubscribe(); }, []);
  const accountTo = signedIn ? "/hesabim/seyahatler" : "/auth";
  const selectAndFind = (service: ServiceSlug) => { onServiceChange?.(service); window.setTimeout(() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); };
  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur-lg"><div className="mx-auto grid min-h-16 max-w-site grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:flex"><Brand/><nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Ana menü"><Link to="/esim" className="nav-link">{copy.nav.esim}</Link><Link to="/lounge" className="nav-link">{copy.nav.lounge}</Link><Link to="/" search={{ service: activeService ?? "esim" }} hash="popular" className="nav-link">{copy.nav.destinations}</Link><Link to="/" search={{ service: activeService ?? "esim" }} hash="how" className="nav-link">{copy.nav.how}</Link><Link to="/" search={{ service: activeService ?? "esim" }} hash="support" className="nav-link">{copy.nav.support}</Link></nav><div className="flex shrink-0 items-center gap-1"><LanguageMenu/><Button asChild variant="ghost" size="icon" className="size-10"><Link to={accountTo} search={signedIn ? undefined : { redirect: "/hesabim/seyahatler" }} aria-label={copy.nav.account}><UserRound/></Link></Button><Button asChild className="hidden lg:inline-flex"><Link to="/" search={{ service: activeService ?? "esim" }} hash="finder">{copy.nav.plan}</Link></Button><Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="size-10 lg:hidden" aria-label="Menü"><Menu/></Button></SheetTrigger><SheetContent side="right" className="w-[86vw] max-w-sm bg-background p-6"><div className="flex items-center justify-between"><SheetTitle><Brand/></SheetTitle><SheetClose asChild><Button variant="ghost" size="icon" aria-label="Kapat"><X/></Button></SheetClose></div><nav className="mt-10 grid gap-2"><SheetClose asChild><Link to="/esim" className="mobile-menu-link">{copy.nav.esim}</Link></SheetClose><SheetClose asChild><Link to="/lounge" className="mobile-menu-link">{copy.nav.lounge}</Link></SheetClose><SheetClose asChild><Link to="/" search={{ service: activeService ?? "esim" }} hash="popular" className="mobile-menu-link">{copy.nav.destinations}</Link></SheetClose><SheetClose asChild><Link to="/" search={{ service: activeService ?? "esim" }} hash="how" className="mobile-menu-link">{copy.nav.how}</Link></SheetClose><SheetClose asChild><Link to="/" search={{ service: activeService ?? "esim" }} hash="support" className="mobile-menu-link">{copy.nav.support}</Link></SheetClose></nav></SheetContent></Sheet></div></div></header>
    <main>{children}</main>
    <footer id="support" className="border-t border-border bg-secondary/50 pb-28 pt-10 md:pb-10"><div className="mx-auto flex max-w-site flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between"><Brand/><p className="max-w-md text-sm text-muted-foreground">{copy.footer}</p><a href="mailto:destek@travely.example" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Headphones className="size-4"/> {copy.nav.support}</a></div></footer>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/98 pb-safe shadow-nav md:hidden" aria-label="Mobil menü"><div className="grid grid-cols-4"><Link to="/" className="bottom-link" activeOptions={{ exact: true }}><Home/><span>{copy.mobile.home}</span></Link><button type="button" className={`bottom-link ${activeService === "esim" ? "is-active" : ""}`} onClick={() => selectAndFind("esim")}><Signal/><span>{copy.mobile.esim}</span></button><button type="button" className={`bottom-link ${activeService === "lounge" ? "is-active" : ""}`} onClick={() => selectAndFind("lounge")}><Plane/><span>{copy.mobile.lounge}</span></button><Link to={accountTo} search={signedIn ? undefined : { redirect: "/hesabim/seyahatler" }} className={`bottom-link ${pathname.startsWith("/hesabim") || pathname === "/auth" ? "is-active" : ""}`}><UserRound/><span>{copy.mobile.account}</span></Link></div></nav>
  </div>;
}
