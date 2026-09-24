import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/travel/PublicShell";
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

/** Same public shell (header, account, footer) + compact service switcher. */
export function V2Shell({ service, children }: { service: V2Service; children: ReactNode }) {
  return (
    <PublicShell hideStickySearch>
      <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-3">
        <ServiceSwitcher active={service} />
        {children}
      </div>
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

export function V2Hero({ image, title, subtitle, children }: { image: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="mt-3 overflow-hidden rounded-3xl bg-primary text-primary-foreground">
      <div className="relative h-44">
        <img src={image} alt="" fetchPriority="high" decoding="async" width={1024} height={768} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <h1 className="absolute bottom-3 left-4 right-4 font-display text-[1.7rem] font-semibold leading-tight">{title}</h1>
      </div>
      <div className="space-y-3 p-4 pt-2">
        {subtitle && <p className="text-sm font-medium opacity-90">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export function TrustRow({ items }: { items: Array<{ icon: ReactNode; label: string }> }) {
  if (!items.length) return null;
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 text-xs font-semibold text-foreground ring-1 ring-border">
          <span className="text-primary">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-6 font-display text-lg font-semibold text-foreground">{children}</h2>;
}

export function CartBar({ count, label }: { count: number; label: string }) {
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
      <Link to="/sepet" className="mx-auto flex min-h-12 max-w-xl items-center justify-between rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
        <span>{label}</span>
        <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5">{count}</span>
      </Link>
    </div>
  );
}

export function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}
