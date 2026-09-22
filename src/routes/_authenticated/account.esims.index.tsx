import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AccountLayout } from "@/components/account/AccountLayout";
import { CustomerEsimCard } from "@/components/account/CustomerEsimCard";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Button } from "@/components/ui/button";
import { isHistoryEsim, normalizeCustomerEsimStatus } from "@/domain/esim/customer-esim";
import { useI18n } from "@/i18n";
import { getCustomerAccount, type CustomerEsimRecord } from "@/lib/customer-account.functions";

export const Route = createFileRoute("/_authenticated/account/esims/")({
  head: () => ({
    meta: [
      { title: "eSIM'lerim — Travely" },
      { name: "description", content: "Satın aldığın eSIM'lerin durumu, kullanımı ve kurulumu." },
      { property: "og:title", content: "eSIM'lerim — Travely" },
      {
        property: "og:description",
        content: "Satın aldığın eSIM'lerin durumu, kullanımı ve kurulumu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EsimsPage,
});

function EsimsPage() {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const account = useQuery({
    queryKey: ["customer-account"],
    queryFn: () => getCustomerAccount(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const esims = account.data?.esims ?? [];
  const past = esims.filter((esim) => history(esim));
  const live = esims.filter((esim) => !history(esim));
  const active = live.filter((esim) => normalizeCustomerEsimStatus(esim.status) === "ACTIVE");
  const pending = live.filter((esim) => normalizeCustomerEsimStatus(esim.status) !== "ACTIVE");

  return (
    <AccountLayout active="esims" title={copy.nav.esims}>
      {account.isError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {copy.loadError}
        </p>
      )}
      {!esims.length && !account.isLoading && (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{copy.emptyEsims}</p>
          <Button asChild variant="cta" className="mt-4">
            <Link to="/" search={{ service: "esim" }} hash="finder">
              {copy.findEsim}
            </Link>
          </Button>
        </div>
      )}
      <Group title={copy.activeEsims} items={active} locale={locale} />
      <Group title={copy.pendingEsims} items={pending} locale={locale} />
      <Group title={copy.pastEsims} items={past} locale={locale} />
    </AccountLayout>
  );
}

function history(esim: CustomerEsimRecord) {
  return isHistoryEsim({
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
}: {
  title: string;
  items: CustomerEsimRecord[];
  locale: ReturnType<typeof useI18n>["locale"];
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 font-display text-xl font-bold">
        {title} <span className="text-sm font-semibold text-muted-foreground">({items.length})</span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((esim) => (
          <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />
        ))}
      </div>
    </section>
  );
}
