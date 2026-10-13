import { CLink as Link } from "@/components/design-v2/v2-context";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { DemoEsimPackages } from "../DemoEsimPackages";
import { ACCOUNT_DEMO_COPY } from "../demo-copy";
import { accountDemoAllowed } from "@/domain/esim/account-demo";
import { useQuery } from "@tanstack/react-query";

import { AccountLayout } from "@/components/account/AccountLayout";
import {
  CustomerEsimCard,
  CustomerEsimHistoryRow,
} from "@/components/account/CustomerEsimCard";
import { EsimCarousel } from "@/components/account/EsimCarousel";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { ESIM_CATEGORIES, esimCategory, type EsimCategory } from "@/domain/esim/purchase-categories";
import { PURCHASE_COPY } from "@/components/account/purchases-copy";
import { useI18n } from "@/i18n";
import { getCustomerAccount, type CustomerEsimRecord } from "@/lib/customer-account.functions";


export function EsimsPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const demo = useAccountDemo();
  const account = useQuery({
    queryKey: ["customer-account"],
    queryFn: () => getCustomerAccount(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const esims = account.data?.esims ?? [];
  const pc = PURCHASE_COPY[locale];
  const byCat = (cat: EsimCategory) => esims.filter((esim) => category(esim) === cat);

  return (
    <AccountLayout active="esims" title={ACCOUNT_DEMO_COPY[locale].title}>
      {demo && <DemoEsimPackages />}
      {demo && esims.length > 0 && <h2 className="mt-8 text-lg font-bold">{ACCOUNT_DEMO_COPY[locale].real} ({esims.length})</h2>}
      {account.isError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {copy.loadError}
        </p>
      )}
      {!demo && !esims.length && !account.isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{copy.emptyEsims}</p>
          <Button asChild variant="cta" className="mt-4">
            <Link to="/" search={{ service: "esim" }} hash="finder">
              {copy.findEsim}
            </Link>
          </Button>
        </div>
      )}
      {ESIM_CATEGORIES.map((cat) => (
        <Group key={cat} title={pc.cat[cat]} items={byCat(cat)} locale={locale} kind={cat === "active" || cat === "pending" ? "carousel" : "list"} />
      ))}
    </AccountLayout>
  );
}

function category(esim: CustomerEsimRecord) {
  return esimCategory({
    status: esim.status,
    totalMb: esim.totalDataMb,
    remainingMb: esim.remainingDataMb,
    expiresAt: esim.expiresAt,
  });
}

function Group({
  title,
  items,
  locale,
  kind,
}: {
  title: string;
  items: CustomerEsimRecord[];
  locale: ReturnType<typeof useI18n>["locale"];
  kind: "carousel" | "list";
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 font-display text-xl font-bold">
        {title} <span className="text-sm font-semibold text-muted-foreground">({items.length})</span>
      </h2>
      {kind === "carousel" ? (
        <EsimCarousel label={title}>
          {items.map((esim) => (
            <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />
          ))}
        </EsimCarousel>
      ) : (
        <div className="grid gap-2">
          {items.map((esim) => (
            <CustomerEsimHistoryRow key={esim.id} esim={esim} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Query flag is opt-in and never permits fixtures on the published hostname. Auth gate stays intact. */
export function useAccountDemo() {
  const href = useRouterState({ select: s => s.location.href });
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const url = new URL(href, window.location.origin);
    setEnabled(accountDemoAllowed(window.location.hostname, url.searchParams.get('demo') === '1'));
  }, [href]);
  return enabled;
}
