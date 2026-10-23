import { useStorefrontChrome } from "@/components/travel/useStorefrontChrome";
import { AccountEditorial } from "./AccountEditorial";
import { getActiveUiLocale } from "@/i18n/overlay";
import { useRouterState } from "@tanstack/react-router";
import { CLink as Link, useIsV2 } from "@/components/design-v2/v2-context";
import { V2Shell } from "@/components/design-v2/V2Shell";
import {
  Armchair,
  Car,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LifeBuoy,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Signal,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { PublicShell } from "@/components/travel/PublicShell";
import { useI18n } from "@/i18n";
import { useOptionalServices } from "@/components/travel/ServiceAvailability";
import { ACCOUNT_COPY } from "./copy";
import { PURCHASE_COPY } from "./purchases-copy";

export type AccountSectionKey =
  | "overview"
  | "purchases"
  | "esims"
  | "lounge"
  | "vignette"
  | "orders"
  | "profile"
  | "security"
  | "notifications"
  | "support";

const NAV: Array<{ key: AccountSectionKey; to: string; icon: typeof LayoutGrid; sub?: boolean }> = [
  { key: "overview", to: "/account", icon: LayoutGrid },
  { key: "esims", to: "/account/esims", icon: Signal },
  { key: "purchases", to: "/account/purchases", icon: ShoppingBag },
  { key: "lounge", to: "/account/lounge", icon: Armchair, sub: true },
  { key: "vignette", to: "/account/vignette", icon: Car, sub: true },
  { key: "orders", to: "/account/orders", icon: PackageCheck },
  { key: "support", to: "/account/support", icon: LifeBuoy },
  { key: "profile", to: "/account/profile", icon: UserRound },
  { key: "security", to: "/account/security", icon: ShieldCheck },
];

/** Shared chrome for every customer-portal page. */
export function AccountLayout({
  active,
  title,
  lead,
  actions,
  children,
}: {
  active: AccountSectionKey;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const chrome=useStorefrontChrome().config;
  const copy = ACCOUNT_COPY[locale];
  const pc = PURCHASE_COPY[locale];
  const label = (key: AccountSectionKey) => (pc.nav as Record<string, string>)[key] ?? (copy.nav as Record<string, string>)[key] ?? key;
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const v2 = useIsV2();
  const services = useOptionalServices();
  // Paused optional services (Admin → Service Controls) leave the menu; direct links to past purchases keep working.
  const nav = NAV.filter(({ key }) => (key === "lounge" ? services.lounge : key === "vignette" ? services.vignette : true));
  const inner = (
        <div className={v2 ? "grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8" : "grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"}>
          <aside className={v2 ? "hidden lg:block" : "hidden lg:block"}>
            <p className="px-3 text-xs font-bold uppercase text-primary">{copy.eyebrow}</p>
            <nav className="mt-3 grid gap-1" aria-label={copy.eyebrow}>
              {nav.map(({ key, to, icon: Icon, sub }) => {
                const current = key === active;
                return (
                  <Link
                    key={key}
                    to={to}
                    className={`flex items-center gap-3 rounded-xl px-3 text-sm transition ${sub ? "ml-4 min-h-10 font-medium" : "min-h-11 font-semibold"} ${
                      current
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    aria-current={current ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label(key)}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            {active !== "overview" && (
              <Link
                to="/account"
                className={`mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary ${v2 ? "lg:hidden" : "lg:hidden"}`}
              >
                <ChevronLeft className="size-4" />
                {copy.back}
              </Link>
            )}
            <header className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${active === "overview" ? "account-welcome" : ""}`}>
              <div className="min-w-0 flex items-center gap-3">
                {active === "overview" && <span className="account-welcome-avatar">{title.split(",").at(-1)?.trim().slice(0,2).toUpperCase()}</span>}
                <div className="min-w-0"><h1 className={v2 ? "font-display text-xl font-bold sm:text-2xl" : "font-display text-2xl font-bold sm:text-3xl"}>{title}</h1>
                {lead && <div className="mt-1 text-xs text-muted-foreground">{lead}</div>}</div>
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </header>
            <div className={v2 ? "mt-4 lg:mt-6" : "mt-6"}>{chrome.accountPresentation?.position==="before" && <AccountEditorial config={chrome} locale={getActiveUiLocale()}/>}
            {children}
            {chrome.accountPresentation?.position!=="before" && <AccountEditorial config={chrome} locale={getActiveUiLocale()}/>}</div>

            {(active === "overview" || active === "purchases") && (
              <nav className={`account-mobile-nav mt-3 grid grid-cols-2 gap-2 ${active === 'purchases' ? 'lg:hidden' : ''}`} aria-label={copy.eyebrow}>
                {nav.filter(({key}) => !['overview','esims'].includes(key)).map(({ key, to, icon: Icon }) => (
                  <Link key={key} to={to} aria-current={key === active ? "page" : undefined} className={`account-menu-tile ${key === 'security' ? 'col-span-2' : ''}`}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon className="size-5" /></span>
                    <span className="min-w-0"><span className="block text-xs font-bold">{label(key)}</span></span>
                    {key === 'security' && <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />}
                  </Link>
                ))}
              </nav>
            )}
            <p className="sr-only">{pathname}</p>
          </div>
        </div>
  );
  return v2 ? (
    <V2Shell level="account" nav="account">{inner}</V2Shell>
  ) : (
    <PublicShell hideStickySearch>
      <div className="mx-auto max-w-site px-4 pb-14 pt-5 sm:px-6 sm:pt-8">{inner}</div>
    </PublicShell>
  );
}
