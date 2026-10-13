import { useAccountDemo } from "./EsimsPage";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, RefreshCcw } from "lucide-react";

import { createAccountDemo } from "@/domain/esim/account-demo";
import { demoEsimRecord } from "../demo-presentation";
import { ACCOUNT_V1_COPY } from "../v1-copy";
import { esimCategory } from "@/domain/esim/purchase-categories";
import { CustomerEsimCard } from "@/components/account/CustomerEsimCard";
import { EsimCarousel } from "@/components/account/EsimCarousel";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
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
  const c = ACCOUNT_V1_COPY[locale];
  const visible = demo ? createAccountDemo(new Date()).map(demoEsimRecord) : esims;
  const grouped = (category: 'active' | 'pending') => visible.filter(e => esimCategory({status:e.status,totalMb:e.totalDataMb,remainingMb:e.remainingDataMb,expiresAt:e.expiresAt}) === category);

  return (
    <AccountLayout
      active="overview"
      title={`${copy.hello}${firstName ? `, ${firstName}` : ""}`}
      lead={c.welcome}
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
      {account.isError && (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {copy.loadError}
        </p>
      )}

      {(['active','pending'] as const).map(category => {
        const items = grouped(category);
        if (category === 'pending' && !items.length) return null;
        return <section key={category} className="account-package-section" data-account-group={category}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-3">
            <h2 className="min-w-0 font-display text-base font-bold sm:text-lg">{category === 'active' ? c.active : c.pending}</h2>
            <Link to="/account/esims" search={demo ? {demo:1} : {}} className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">{c.all}<ChevronRight className="size-3.5" /></Link>
          </div>
          {account.isPending && !demo ? <div className="h-48 animate-pulse rounded-lg bg-secondary" aria-busy="true" /> : items.length ? <EsimCarousel label={category === 'active' ? c.active : c.pending}>{items.map(esim => <CustomerEsimCard key={esim.id} esim={esim} locale={locale} demo={demo} />)}</EsimCarousel> : <p className="py-3 text-xs text-muted-foreground">{c.noActive}</p>}
        </section>;
      })}
      {!visible.length && !account.isPending && !account.isError && <Button asChild variant="cta" className="mt-3"><Link to="/esim">{copy.findEsim}</Link></Button>}
    </AccountLayout>
  );
}
