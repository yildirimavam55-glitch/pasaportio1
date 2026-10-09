import { useRouterState } from "@tanstack/react-router";
import { CLink as Link, useIsV2 } from "@/components/design-v2/v2-context";
import { V2Shell } from "@/components/design-v2/V2Shell";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PackageCheck,
  ShieldCheck,
  Signal,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { PublicShell } from "@/components/travel/PublicShell";
import { useI18n } from "@/i18n";
import { ACCOUNT_COPY } from "./copy";

export type AccountSectionKey =
  | "overview"
  | "esims"
  | "orders"
  | "profile"
  | "security"
  | "notifications"
  | "support";

const NAV: Array<{ key: AccountSectionKey; to: string; icon: typeof LayoutGrid }> = [
  { key: "esims", to: "/account/esims", icon: Signal },
  { key: "orders", to: "/account/orders", icon: PackageCheck },
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
  const copy = ACCOUNT_COPY[locale];
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const v2 = useIsV2();
  const inner = (
        <div className={v2 ? "grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8" : "grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"}>
          <aside className={v2 ? "hidden lg:block" : "hidden lg:block"}>
            <p className="px-3 text-xs font-bold uppercase text-primary">{copy.eyebrow}</p>
            <nav className="mt-3 grid gap-1" aria-label={copy.eyebrow}>
              {NAV.map(({ key, to, icon: Icon }) => {
                const current = key === active;
                return (
                  <Link
                    key={key}
                    to={to}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                      current
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    aria-current={current ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{copy.nav[key]}</span>
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
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className={v2 ? "font-display text-xl font-bold sm:text-2xl" : "font-display text-2xl font-bold sm:text-3xl"}>{title}</h1>
                {lead && <div className="mt-1 text-sm text-muted-foreground">{lead}</div>}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </header>
            <div className={v2 ? "mt-4 lg:mt-6" : "mt-6"}>{children}</div>

            {(active === "overview" || active === "esims") && (
              <nav className={v2 ? "mt-6 grid gap-2 lg:hidden" : "mt-10 grid gap-2 lg:hidden"} aria-label={copy.eyebrow}>
                {NAV.filter((item) => item.key !== "overview").map(({ key, to, icon: Icon }) => (
                  <Link
                    key={key}
                    to={to}
                    className={v2 ? "flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-3 text-sm font-semibold" : "flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 font-semibold shadow-card"}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{copy.nav[key]}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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
