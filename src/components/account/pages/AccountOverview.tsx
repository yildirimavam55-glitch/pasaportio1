import { EsimsPage, useAccountDemo } from "./EsimsPage";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Clock3, PackageCheck, RefreshCcw, Signal } from "lucide-react";

import { CustomerEsimCard } from "@/components/account/CustomerEsimCard";
import { EsimCarousel } from "@/components/account/EsimCarousel";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY, formatDate, formatMoney, numberLocale } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { isHistoryEsim, normalizeCustomerEsimStatus } from "@/domain/esim/customer-esim";
import { useI18n } from "@/i18n";
import { getCustomerAccount } from "@/lib/customer-account.functions";


export function AccountOverview() {
  const { locale } = useI18n();
  const demo = useAccountDemo();
  const copy = ACCOUNT_COPY[locale];
  const account = useQuery({
    queryKey: ["customer-account"],
    queryFn: () => getCustomerAccount(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const profile = account.data?.profile;
  const email = profile?.email ?? "";
  const firstName = (profile?.full_name?.trim() || email.split("@")[0] || "").split(" ")[0] ?? "";
  const esims = account.data?.esims ?? [];
  const active = esims.filter(
    (esim) =>
      !isHistoryEsim({
        status: esim.status,
        totalMb: esim.totalDataMb,
        remainingMb: esim.remainingDataMb,
        expiresAt: esim.expiresAt,
      }) && normalizeCustomerEsimStatus(esim.status) === "ACTIVE",
  );
  const pending = esims.filter(
    (esim) =>
      !isHistoryEsim({
        status: esim.status,
        totalMb: esim.totalDataMb,
        remainingMb: esim.remainingDataMb,
        expiresAt: esim.expiresAt,
      }) && normalizeCustomerEsimStatus(esim.status) !== "ACTIVE",
  );
  const orders = account.data?.orders ?? [];
  const updated = account.data?.fetchedAt
    ? new Intl.DateTimeFormat(numberLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(account.data.fetchedAt))
    : "—";

  if (demo) return <EsimsPage />;

  return (
    <AccountLayout
      active="overview"
      title={`${copy.hello}${firstName ? `, ${firstName}` : ""}`}
      lead={email}
      actions={
        <Button
          variant="outline"
          size="icon"
          aria-label={copy.refresh}
          disabled={account.isFetching}
          onClick={() => void account.refetch()}
        >
          <RefreshCcw className={account.isFetching ? "animate-spin" : ""} />
        </Button>
      }
    >
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        {copy.updated}: {updated}
      </p>
      {account.isError && (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {copy.loadError}
        </p>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Signal className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold">{copy.activeEsims}</h2>
        </div>
        {active.length ? (
          <EsimCarousel label={copy.activeEsims}>
            {active.map((esim) => (
              <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />
            ))}
          </EsimCarousel>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">{copy.emptyEsims}</p>
            <Button asChild variant="cta" className="mt-4">
              <Link to="/" search={{ service: "esim" }} hash="finder">
                {copy.findEsim}
              </Link>
            </Button>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="size-5 text-primary" />
            <h2 className="font-display text-xl font-bold">{copy.pendingEsims}</h2>
          </div>
          <EsimCarousel label={copy.pendingEsims}>
            {pending.map((esim) => (
              <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />
            ))}
          </EsimCarousel>
        </section>
      )}

      <div className="mt-8 hidden gap-3 sm:grid-cols-2 lg:grid">
        <Link
          to="/account/esims"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 font-semibold shadow-card"
        >
          <Signal className="size-5 text-primary" />
          <span className="flex-1 truncate">{copy.allEsims}</span>
          <span className="text-sm text-muted-foreground">{esims.length}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/account/orders"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 font-semibold shadow-card"
        >
          <PackageCheck className="size-5 text-primary" />
          <span className="flex-1 truncate">{copy.nav.orders}</span>
          <span className="text-sm text-muted-foreground">{orders.length}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>

      {orders.length > 0 && (
        <section className="mt-8 grid gap-2">
          {orders.slice(0, 3).map((order) => (
            <Link
              key={order.id}
              to="/account/orders/$id"
              params={{ id: order.id }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">#{order.order_number}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(order.created_at, locale)}
                </p>
              </div>
              <strong className="text-sm">
                {formatMoney(Number(order.gross_revenue), order.currency, locale)}
              </strong>
            </Link>
          ))}
        </section>
      )}
    </AccountLayout>
  );
}
