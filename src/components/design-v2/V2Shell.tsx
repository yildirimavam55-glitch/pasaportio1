import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { displayMoney } from "@/domain/currency/store";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Car, Plane, Search, ShoppingBag, Smartphone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { V2Context } from "./v2-context";
import { PublicShell } from "@/components/travel/PublicShell";
import { WhatsAppSupportWidget } from "@/components/travel/WhatsAppSupportWidget";
import { useCart } from "@/domain/cart/store";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";
import { useOptionalServices } from "@/components/travel/ServiceAvailability";
import { localize } from "@/i18n/overlay";
import { PromoBanner } from "./PromoBanner";
import { DEFAULT_IMAGE_DISPLAY, ESIM_DESKTOP_IMAGE_DISPLAY, type ImageDisplay } from "@/domain/storefront/image-display";

export type V2Service = "esim" | "lounge" | "vignette";

export const V2_NOINDEX = [
  { name: "robots", content: "noindex, nofollow" },
  { name: "googlebot", content: "noindex, nofollow" },
];

export function pick<T>(locale: Locale, value: Record<Locale, T>): T {
  return value[locale] ?? value.tr;
}

export type V2Nav = V2Service | "cart" | "account";
/** A = discovery (photos, search), B = transaction (cart/checkout), C = account (compact). */
export type V2Level = "discovery" | "transaction" | "account";

/**
 * THE single V2 customer shell. Every /design-v2 screen renders through it, so header,
 * brand, language, background, width, bottom nav, safe-area, docked actions and WhatsApp
 * placement are controlled here — never per page. It also switches shared customer
 * components (account pages, header links) into V2 mode via V2Context.
 */
export function V2Shell({
  service,
  nav,
  level = "discovery",
  commerceSelection = false,
  hideWhatsApp = false,
  stickySearch,
  purchaseSummary,
  heroPromotion = false,
  children,
}: {
  service?: V2Service;
  nav?: V2Nav;
  level?: V2Level;
  commerceSelection?: boolean;
  hideWhatsApp?: boolean;
  stickySearch?: ReactNode;
  purchaseSummary?: ReactNode;
  heroPromotion?: boolean;
  children: ReactNode;
}) {
  const active: V2Nav | undefined = nav ?? service;
  const width = level === "transaction" ? "max-w-xl md:max-w-3xl lg:max-w-[var(--page-max-width,80rem)]" : "max-w-xl md:max-w-[var(--page-max-width,80rem)]";
  const serviceAccent = service === "lounge" ? "[--v2-service:var(--color-v2-lounge)]" : service === "vignette" ? "[--v2-service:var(--color-v2-vignette)]" : "[--v2-service:var(--color-v2-esim)]";
  return (
    <V2Context.Provider value={true}>
      <PublicShell hideStickySearch hideFloatingWhatsApp mobilePasaport={heroPromotion} footerBottomSafe={purchaseSummary ? "purchase" : false} headerAccessory={stickySearch}>
        <div className={`${heroPromotion ? "pasaport-mobile-home" : ""} mx-auto w-full ${width} ${serviceAccent} overflow-x-clip px-4 pb-8 sm:px-6 sm:pb-12 lg:pb-16`}>
          {!heroPromotion && <PromoBanner />}
          <DesktopNav active={active} />
          {children}
        </div>
        <ActionDock showCart={level === "discovery"} showWhatsApp={!commerceSelection && !hideWhatsApp && !purchaseSummary} purchaseSummary={purchaseSummary} />
      </PublicShell>
    </V2Context.Provider>
  );
}

/**
 * Shared sticky/floating search used by every V2 discovery page (eSIM, Lounge, Vignette).
 * Attach `heroSearchRef` to the hero search field; the compact bar appears only after
 * the hero search scrolls out of view and re-opens the same picker sheet.
 */
export function useV2StickySearch() {
  const heroSearchRef = useRef<HTMLDivElement | null>(null);
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);
  useEffect(() => {
    const target = heroSearchRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(Boolean(entry?.isIntersecting)),
      { rootMargin: "-56px 0px 0px", threshold: 0.05 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return { heroSearchRef, heroSearchVisible };
}

export function V2StickySearchButton({ heroSearchVisible, label, onOpen }: { heroSearchVisible: boolean; label: string; onOpen: () => void }) {
  return (
    <div aria-hidden={heroSearchVisible} className={`sticky top-14 z-40 h-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none sm:top-16 lg:top-16 ${heroSearchVisible ? "pointer-events-none -translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}>
      <div className="mx-auto max-w-site px-3 pt-1 sm:px-6 lg:pt-2">
        <Button type="button" variant="outline" onClick={onOpen} className="mx-auto grid h-11 w-full max-w-finder grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-card px-3 text-left shadow-panel lg:h-14 lg:max-w-3xl lg:px-5">
          <Search className="size-4 shrink-0 text-primary" /><span className="truncate text-sm text-muted-foreground">{label}</span><ArrowRight className="size-4 shrink-0" />
        </Button>
      </div>
    </div>
  );
}

export const NAV_LABELS = localize({
  tr: { cart: "Sepet", account: "Hesabım" },
  de: { cart: "Warenkorb", account: "Konto" },
  en: { cart: "Cart", account: "Account" },
});

function useNavItems() {
  const { locale } = useI18n();
  const l = pick(locale, NAV_LABELS);
  const services = useOptionalServices();
  return ([
    { id: "esim" as const, to: "/esim", search: { country: "" }, icon: Smartphone, label: "eSIM" },
    { id: "lounge" as const, to: "/lounge", search: { iata: "" }, icon: Plane, label: "Lounge" },
    { id: "vignette" as const, to: "/vignette", search: undefined, icon: Car, label: "Vignette" },
    { id: "cart" as const, to: "/sepet", search: undefined, icon: ShoppingBag, label: l.cart },
    { id: "account" as const, to: "/account", search: undefined, icon: UserRound, label: l.account },
  ]).filter((item) => (item.id === "lounge" || item.id === "vignette" ? services[item.id] : true));
}

function CountBadge() {
  const { count } = useCart();
  if (!count) return null;
  return <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count}</span>;
}

function BottomNav({ active }: { active?: V2Nav | undefined }) {
  const items = useNavItems();
  return (
    <nav aria-label="V2" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-xl">
        {items.map(({ id, to, search, icon: Icon, label }) => {
          const on = id === active;
          return (
            <Link key={id} to={to as never} search={search as never} aria-current={on ? "page" : undefined}
              className={`flex min-h-[3.7rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${on ? "text-[var(--v2-service,var(--color-primary))]" : "text-muted-foreground"}`}>
              <span className="relative"><Icon className="size-5" />{id === "cart" && <CountBadge />}</span>
              <span className="max-w-full truncate px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Tablet bridge only. Desktop navigation lives in the shared public header. */
function DesktopNav({ active }: { active?: V2Nav | undefined }) {
  const items = useNavItems();
  return (
    <nav aria-label="V2" className="mb-4 hidden items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm sm:flex lg:hidden">
      {items.map(({ id, to, search, icon: Icon, label }) => {
        const on = id === active;
        return (
          <Link key={id} to={to as never} search={search as never} aria-current={on ? "page" : undefined}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="relative"><Icon className="size-4" />{id === "cart" && <CountBadge />}</span>{label}
          </Link>
        );
      })}
    </nav>
  );
}

const HERO_HEIGHT = {
  compact: "h-[14.5rem] lg:h-[27rem]",
  normal: "h-[17rem] lg:h-[29rem]",
  tall: "h-[20rem] lg:h-[30rem]",
} as const;
const HERO_OVERLAY = {
  light: "from-[var(--v2-service)]/80 via-[var(--v2-service)]/15 to-transparent",
  normal: "from-[var(--v2-service)]/95 via-[var(--v2-service)]/30 to-transparent",
  strong: "from-[var(--v2-service)]/95 via-[var(--v2-service)]/60 to-[var(--v2-service)]/20",
} as const;

/** Full-bleed photo hero with the search floating over its bottom edge. Presets only — no free CSS. */
export function V2Hero({ image, desktopImage, desktopFocus = "center", imageDisplay, mobileImageDisplay, alt = "", eyebrow, title, subtitle, align = "left", height = "normal", overlay = "normal", desktopFooter, children }: { image: string; desktopImage?: string | undefined; desktopFocus?: "center" | "phone"; imageDisplay?: ImageDisplay | undefined; mobileImageDisplay?: ImageDisplay | undefined; alt?: string; eyebrow?: string; title: string; subtitle?: string; align?: "left" | "center"; height?: keyof typeof HERO_HEIGHT; overlay?: keyof typeof HERO_OVERLAY; desktopFooter?: ReactNode; children?: ReactNode }) {
  const desktop = imageDisplay ?? (desktopFocus === "phone" ? ESIM_DESKTOP_IMAGE_DISPLAY : DEFAULT_IMAGE_DISPLAY);
  const mobile = mobileImageDisplay ?? DEFAULT_IMAGE_DISPLAY;
  const imageStyle = {
    "--hero-mobile-position": `${mobile.x}% ${mobile.y}%`,
    "--hero-mobile-origin": `${mobile.x}% ${mobile.y}%`,
    "--hero-mobile-scale": mobile.zoom / 100,
    "--hero-mobile-fit": mobile.fit,
    "--hero-desktop-position": `${desktop.x}% ${desktop.y}%`,
    "--hero-desktop-origin": `${desktop.x}% ${desktop.y}%`,
    "--hero-desktop-scale": desktop.zoom / 100,
    "--hero-desktop-fit": desktop.fit,
  } as CSSProperties;
  return (
    <section className="relative -mx-4 sm:-mx-6 lg:mx-0">
      <div className={`relative ${HERO_HEIGHT[height]} overflow-hidden bg-[var(--v2-service)] text-primary-foreground sm:mx-4 sm:mt-3 sm:rounded-3xl lg:mx-0 lg:mt-4`}>
        <picture>
          {desktopImage && <source media="(min-width: 640px)" srcSet={desktopImage} />}
          {image && <img src={image} alt={alt} fetchPriority="high" decoding="async" width={1024} height={768} className="v2-hero-image absolute inset-0 size-full" style={imageStyle} />}
        </picture>
        <div className={`absolute inset-0 bg-gradient-to-t ${HERO_OVERLAY[overlay]}`} />
        <div className={`absolute inset-x-5 bottom-10 max-w-[21rem] lg:inset-x-14 lg:bottom-[13rem] lg:max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
          {eyebrow && <p className="text-sm font-semibold opacity-95 lg:text-lg">{eyebrow}</p>}
          <h1 className="mt-0.5 font-display text-[1.85rem] font-bold leading-[1.04] lg:text-[3.35rem] xl:text-[3.65rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13px] font-medium leading-snug opacity-90 lg:mt-3 lg:max-w-xl lg:text-xl">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="relative z-10 -mt-6 px-3.5 lg:absolute lg:bottom-[7.25rem] lg:left-14 lg:mt-0 lg:w-[60%] lg:max-w-[40rem] lg:px-0">{children}</div>}
      {desktopFooter && <div className="absolute inset-x-14 bottom-7 z-10 hidden lg:block">{desktopFooter}</div>}
    </section>
  );
}

/** Rounded search field used inside the hero. */
export function HeroField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative rounded-full bg-card shadow-panel ring-1 ring-border lg:min-h-16">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      {children}
      <span aria-hidden className="pointer-events-none absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[var(--v2-service)] text-primary-foreground">
        <ArrowRight className="size-5" />
      </span>
    </div>
  );
}

export const heroInputClass = "h-[3.35rem] w-full rounded-full bg-transparent pl-12 pr-14 text-sm text-foreground outline-hidden placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring lg:h-16 lg:text-base";

/** Compact icon row with dividers (value props). */
export function TrustRow({ items, compact = false }: { items: Array<{ icon: ReactNode; label: string }>; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className={`${compact ? "mt-2" : "mt-4"} flex divide-x divide-border lg:-mt-1 lg:w-full lg:rounded-2xl lg:bg-card lg:px-5 lg:py-5 lg:shadow-card lg:ring-1 lg:ring-border`}>
      {items.map((item) => (
        <li key={item.label} className={`flex min-w-0 flex-1 flex-col items-center ${compact ? "gap-0.5 py-1" : "gap-1"} px-1.5 text-center text-[10px] font-medium leading-tight text-foreground lg:flex-row lg:justify-center lg:gap-3 lg:px-5 lg:text-sm`}>
          <span className={`text-[var(--v2-service)] ${compact ? "[&_svg]:size-[18px]" : "[&_svg]:size-5"} lg:[&_svg]:size-6`}>{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-2 lg:mb-4 lg:mt-12">
      <h2 className="min-w-0 font-display text-base font-bold text-foreground lg:text-3xl">{children}</h2>
      {action && <span className="shrink-0 whitespace-nowrap">{action}</span>}
    </div>
  );
}

/** Horizontal rail of photo cards. */
export function PhotoRail({ children }: { children: ReactNode }) {
  return <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [overscroll-behavior-inline:contain] [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:gap-4 lg:px-0 lg:[&>li]:w-[calc((100%_-_4rem)/5)]">{children}</ul>;
}

export function PhotoCard({ image, badge, title, sub, price, onClick }: { image?: string | undefined; badge?: ReactNode; title: string; sub?: string | undefined; price?: string | undefined; onClick: () => void }) {
  return (
    <li className="w-[7.55rem] shrink-0 snap-start">
      <button type="button" onClick={onClick} className="w-full overflow-hidden rounded-xl bg-card text-left shadow-sm ring-1 ring-border">
        <div className="relative h-[5.35rem] bg-muted lg:h-40">
          {image && <img src={image} alt="" loading="lazy" decoding="async" width={256} height={192} className="size-full object-cover" />}
          {badge && <span className="absolute bottom-1.5 left-1.5">{badge}</span>}
        </div>
        <div className="px-2 py-1.5 lg:p-3">
          <p className="truncate text-xs font-bold text-foreground lg:text-sm">{title}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
          {price && <p className="text-xs font-bold text-primary">{price}</p>}
        </div>
      </button>
    </li>
  );
}

export function PromoCard({ image, title, sub, to, compactDesktop = false }: { image: string; title: string; sub?: string; to: "/esim" | "/lounge" | "/vignette" | "/destek" | "/sepet" | "/account"; compactDesktop?: boolean }) {
  return (
    <Link to={to} search={(to === "/esim" ? { country: "" } : to === "/lounge" ? { iata: "" } : undefined) as never} className={`relative mt-5 block h-24 overflow-hidden rounded-xl text-primary-foreground lg:h-48 lg:rounded-2xl ${compactDesktop ? "lg:mt-14" : "lg:mt-14"}`}>
      {image && <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--v2-service)]/95 via-[var(--v2-service)]/60 to-transparent" />
      <div className="relative flex h-full items-center justify-between gap-3 p-4 lg:p-8">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight lg:text-3xl">{title}</p>
          {sub && <p className="mt-0.5 text-xs opacity-90 lg:mt-2 lg:text-base">{sub}</p>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-[var(--v2-service)]"><ArrowRight className="size-5" /></span>
      </div>
    </Link>
  );
}

/** Equal-height image promotion used only in the desktop eSIM cross-service row. */
export function DesktopPromoCard({ image, title, cta, to, imagePosition = "center" }: { image: string; title: string; cta: string; to: "/lounge" | "/vignette"; imagePosition?: string }) {
  return (
    <Link to={to} search={(to === "/lounge" ? { iata: "" } : undefined) as never} className="group relative flex h-52 min-w-0 items-end overflow-hidden rounded-2xl text-primary-foreground shadow-sm ring-1 ring-border">
      <img src={image} alt="" loading="lazy" decoding="async" width={1600} height={700} className="absolute inset-0 size-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.015]" style={{ objectPosition: imagePosition }} />
      <span className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/55 to-transparent" />
      <span className="relative flex w-full items-end justify-between gap-5 p-7">
        <span className="min-w-0">
          <strong className="block font-display text-2xl font-bold leading-tight">{title}</strong>
          <span className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-primary shadow-sm">
            {cta}<ArrowRight className="size-4 rtl:rotate-180" />
          </span>
        </span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card/95 text-primary transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
          <ArrowRight className="size-5 rtl:rotate-180" />
        </span>
      </span>
    </Link>
  );
}

export function HowItWorks({ title, steps }: { title: string; steps: Array<{ t: string; s: string }> }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <ol className={`grid gap-3 border-b border-border pb-2 ${steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {steps.map((step, i) => (
          <li key={step.t} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
            <span className="row-span-2 grid size-7 place-items-center rounded-full bg-[var(--v2-service)] font-display text-xs font-bold text-primary-foreground">{i + 1}</span>
            <span className="text-[11px] font-bold leading-tight text-foreground">{step.t}</span>
            <span className="text-[9px] leading-snug text-muted-foreground">{step.s}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

const DOCK = localize({
  tr: { cart: "Sepete git", wa: "WhatsApp destek" },
  de: { cart: "Zum Warenkorb", wa: "WhatsApp-Support" },
  en: { cart: "Go to cart", wa: "WhatsApp support" },
});

/**
 * One docked row above the bottom nav: existing cart CTA (when it has items) + WhatsApp.
 * Both share a single row so neither stacks over the other; page bottom padding keeps
 * the last cards/rows scrollable clear of it.
 */
function ActionDock({ showCart, showWhatsApp, purchaseSummary }: { showCart: boolean; showWhatsApp: boolean; purchaseSummary?: ReactNode }) {
  const { locale } = useI18n();
  const l = pick(locale, DOCK);
  const { count } = useCart();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-30 px-4 pb-1.5 sm:bottom-4 lg:left-auto lg:right-[max(1.5rem,calc((100vw-77rem)/2-4.5rem))] lg:w-[25rem] lg:px-0">
      <div className="mx-auto flex max-w-xl items-center justify-end gap-2 lg:mx-0">
        {purchaseSummary}
        {!purchaseSummary && showCart && count > 0 && (
          <Link to="/sepet" className="pointer-events-auto flex h-[3.25rem] min-w-0 flex-1 items-center justify-between gap-2 rounded-full bg-primary pl-4 pr-2.5 text-sm font-semibold text-primary-foreground shadow-lg">
            <span className="flex min-w-0 items-center gap-2"><ShoppingBag className="size-4 shrink-0" /><span className="truncate">{l.cart}</span></span>
            <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-primary-foreground/15 px-2 text-xs">{count}</span>
          </Link>
        )}
        {showWhatsApp && <WhatsAppSupportWidget surface="v2-dock" placement="fixed" />}
      </div>
    </div>
  );
}

/** Kept for page imports; the docked row now renders the cart CTA. */
export function CartBar(_props: { count: number; label: string }) {
  return null;
}

export function money(value: number, currency: string, locale?: string) {
  return displayMoney(value, currency, locale);
}
