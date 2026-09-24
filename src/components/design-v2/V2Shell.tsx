import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Car, Home, Plane, ShoppingBag, Smartphone, UserRound } from "lucide-react";
import { PublicShell } from "@/components/travel/PublicShell";
import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import { waLink } from "@/lib/whatsapp";
import { useCart } from "@/domain/cart/store";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";

export type V2Service = "esim" | "lounge" | "vignette";

export const V2_NOINDEX = [
  { name: "robots", content: "noindex, nofollow" },
  { name: "googlebot", content: "noindex, nofollow" },
];

const TABS: Array<{ id: V2Service; to: "/design-v2/esim" | "/design-v2/lounge" | "/design-v2/vignette"; label: string }> = [
  { id: "esim", to: "/design-v2/esim", label: "eSIM" },
  { id: "lounge", to: "/design-v2/lounge", label: "Lounge" },
  { id: "vignette", to: "/design-v2/vignette", label: "Vignette" },
];

export function pick<T>(locale: Locale, value: Record<Locale, T>): T {
  return value[locale] ?? value.tr;
}

/** Same public shell (header, account, footer) + compact service switcher + V2 bottom nav. */
export function V2Shell({ service, children }: { service: V2Service; children: ReactNode }) {
  return (
    <PublicShell hideStickySearch hideFloatingWhatsApp>
      <div className="mx-auto w-full max-w-xl overflow-x-clip px-4 pb-44 pt-3">
        <ServiceSwitcher active={service} />
        {children}
      </div>
      <ActionDock />
      <BottomNav active={service} />
    </PublicShell>
  );
}

function ServiceSwitcher({ active }: { active: V2Service }) {
  return (
    <nav aria-label="Service" className="grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors ${
              on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {on && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

const NAV_LABELS = {
  tr: { home: "Ana sayfa", account: "Hesabım" },
  de: { home: "Start", account: "Konto" },
  en: { home: "Home", account: "Account" },
};

function BottomNav({ active }: { active: V2Service }) {
  const { locale } = useI18n();
  const l = pick(locale, NAV_LABELS);
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold";
  const cls = (on: boolean) => `${item} ${on ? "text-primary" : "text-muted-foreground"}`;
  return (
    <nav aria-label="V2" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-xl">
        <Link to="/design-v2" className={cls(false)}><Home className="size-5" />{l.home}</Link>
        <Link to="/design-v2/esim" search={{ country: "" }} className={cls(active === "esim")}><Smartphone className="size-5" />eSIM</Link>
        <Link to="/design-v2/lounge" search={{ iata: "" }} className={cls(active === "lounge")}><Plane className="size-5" />Lounge</Link>
        <Link to="/design-v2/vignette" className={cls(active === "vignette")}><Car className="size-5" />Vignette</Link>
        <Link to="/account" className={cls(false)}><UserRound className="size-5" />{l.account}</Link>
      </div>
    </nav>
  );
}

/** Full-bleed photo hero with the search floating over its bottom edge. */
export function V2Hero({ image, eyebrow, title, subtitle, children }: { image: string; eyebrow?: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative -mx-4 mt-3">
      <div className="relative h-[19rem] overflow-hidden text-primary-foreground sm:mx-4 sm:rounded-3xl">
        <img src={image} alt="" fetchPriority="high" decoding="async" width={1024} height={768} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/35 to-primary/5" />
        <div className="absolute inset-x-5 bottom-12">
          {eyebrow && <p className="text-sm font-semibold opacity-90">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-[2rem] font-bold leading-[1.08] tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm font-medium opacity-90">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="relative z-10 -mt-7 px-4">{children}</div>}
    </section>
  );
}

/** Rounded search field used inside the hero. */
export function HeroField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative rounded-full bg-card shadow-lg ring-1 ring-border">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      {children}
      <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground">
        <ArrowRight className="size-5" />
      </span>
    </div>
  );
}

export const heroInputClass = "h-14 w-full rounded-full bg-transparent pl-12 pr-14 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent";

/** Compact icon row with dividers (value props). */
export function TrustRow({ items }: { items: Array<{ icon: ReactNode; label: string }> }) {
  if (!items.length) return null;
  return (
    <ul className="mt-5 flex divide-x divide-border">
      {items.map((item) => (
        <li key={item.label} className="flex flex-1 flex-col items-center gap-1.5 px-1 text-center text-[11px] font-medium leading-tight text-foreground">
          <span className="text-primary">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-bold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** Horizontal rail of photo cards. */
export function PhotoRail({ children }: { children: ReactNode }) {
  return <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">{children}</ul>;
}

export function PhotoCard({ image, badge, title, sub, price, onClick }: { image?: string | undefined; badge?: ReactNode; title: string; sub?: string | undefined; price?: string | undefined; onClick: () => void }) {
  return (
    <li className="w-32 shrink-0 snap-start">
      <button type="button" onClick={onClick} className="w-full overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 ring-border">
        <div className="relative h-24 bg-muted">
          {image && <img src={image} alt="" loading="lazy" decoding="async" width={256} height={192} className="size-full object-cover" />}
          {badge && <span className="absolute bottom-1.5 left-1.5">{badge}</span>}
        </div>
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-bold text-foreground">{title}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
          {price && <p className="text-xs font-bold text-primary">{price}</p>}
        </div>
      </button>
    </li>
  );
}

export function PromoCard({ image, title, sub, to }: { image: string; title: string; sub?: string; to: "/design-v2/esim" | "/design-v2/lounge" }) {
  return (
    <Link to={to} search={(to === "/design-v2/esim" ? { country: "" } : { iata: "" }) as never} className="relative mt-7 block h-32 overflow-hidden rounded-3xl text-primary-foreground">
      <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/70 to-transparent" />
      <div className="relative flex h-full items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-tight">{title}</p>
          {sub && <p className="mt-1 text-sm opacity-90">{sub}</p>}
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-primary"><ArrowRight className="size-5" /></span>
      </div>
    </Link>
  );
}

export function HowItWorks({ title, steps }: { title: string; steps: Array<{ t: string; s: string }> }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((step, i) => (
          <li key={step.t} className="flex flex-col gap-1.5">
            <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</span>
            <span className="text-sm font-bold leading-tight text-foreground">{step.t}</span>
            <span className="text-xs leading-snug text-muted-foreground">{step.s}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

const DOCK = {
  tr: { cart: "Sepete git", wa: "WhatsApp destek" },
  de: { cart: "Zum Warenkorb", wa: "WhatsApp-Support" },
  en: { cart: "Go to cart", wa: "WhatsApp support" },
};

/**
 * One docked row above the bottom nav: existing cart CTA (when it has items) + WhatsApp.
 * Both share a single row so neither stacks over the other; page bottom padding keeps
 * the last cards/rows scrollable clear of it.
 */
function ActionDock() {
  const { locale } = useI18n();
  const l = pick(locale, DOCK);
  const { count } = useCart();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 px-4 pb-2 sm:bottom-4">
      <div className="mx-auto flex max-w-xl items-center justify-end gap-2">
        {count > 0 && (
          <Link to="/sepet" className="pointer-events-auto flex h-11 flex-1 items-center justify-between rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg">
            <span className="flex items-center gap-2"><ShoppingBag className="size-4" />{l.cart}</span>
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5">{count}</span>
          </Link>
        )}
        <a
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.wa}
          className="pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full shadow-lg hover:brightness-95"
          style={{ backgroundColor: "#25D366", color: "#fff" }}
        >
          <WhatsAppLogo className="size-6" />
        </a>
      </div>
    </div>
  );
}

/** Kept for page imports; the docked row now renders the cart CTA. */
export function CartBar(_props: { count: number; label: string }) {
  return null;
}

export function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}
