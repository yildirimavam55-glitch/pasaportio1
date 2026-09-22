import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Globe2, Search } from "lucide-react";

import { AccountLayout } from "@/components/account/AccountLayout";
import { EsimInstallGuide } from "@/components/account/EsimInstallGuide";
import { esimStatusLabel, hasCapability } from "@/components/account/CustomerEsimCard";
import { ACCOUNT_COPY, formatDate, formatMoney } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  boundedUsagePercent,
  fairUseText,
  formatMegabytes,
  isHistoryEsim,
  isUnlimitedEsim,
  normalizeCustomerEsimStatus,
  remainingDays,
} from "@/domain/esim/customer-esim";
import { flagOf, foldText, getCountryByIso } from "@/domain/geo/countries";
import { useI18n } from "@/i18n";
import {
  getCustomerEsimActivation,
  getCustomerEsimDetail,
} from "@/lib/customer-account.functions";

export const Route = createFileRoute("/_authenticated/account/esims/$id")({
  head: () => ({
    meta: [
      { title: "eSIM detayı — Travely" },
      { name: "description", content: "eSIM'inin durumu, kapsama listesi ve kurulum bilgileri." },
      { property: "og:title", content: "eSIM detayı — Travely" },
      {
        property: "og:description",
        content: "eSIM'inin durumu, kapsama listesi ve kurulum bilgileri.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EsimDetailPage,
});

function EsimDetailPage() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const [countryQuery, setCountryQuery] = useState("");
  const [countriesOpen, setCountriesOpen] = useState(false);

  const detail = useQuery({
    queryKey: ["customer-esim-detail", id],
    queryFn: () => getCustomerEsimDetail({ data: { esimId: id } }),
    staleTime: 30_000,
  });
  const esim = detail.data?.esim;
  const expired = esim
    ? isHistoryEsim({
        status: esim.status,
        totalMb: esim.totalDataMb,
        remainingMb: esim.remainingDataMb,
        expiresAt: esim.expiresAt,
      })
    : false;
  const canShowActivation = Boolean(esim && !expired && (esim.hasQr || esim.hasInstallInfo));
  const activation = useQuery({
    queryKey: ["customer-esim-activation", id],
    queryFn: () => getCustomerEsimActivation({ data: { esimId: id } }),
    enabled: canShowActivation,
    staleTime: 60_000,
  });

  const coverage = detail.data?.coverage;
  const countries = useMemo(() => {
    const list = (coverage?.countryIsos ?? []).map((iso) => ({
      iso,
      name: getCountryByIso(iso)?.name[locale] ?? iso,
    }));
    const needle = foldText(countryQuery.trim());
    const filtered = needle
      ? list.filter((item) => foldText(item.name).includes(needle) || foldText(item.iso).includes(needle))
      : list;
    return filtered.sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [coverage?.countryIsos, countryQuery, locale]);

  if (detail.isLoading) {
    return (
      <AccountLayout active="esims" title={copy.nav.esims}>
        <div className="h-48 animate-pulse rounded-2xl bg-secondary" />
      </AccountLayout>
    );
  }

  if (!esim) {
    return (
      <AccountLayout active="esims" title={copy.nav.esims}>
        <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{copy.notFound}</p>
          <Button asChild className="mt-4">
            <Link to="/account/esims">{copy.nav.esims}</Link>
          </Button>
        </div>
      </AccountLayout>
    );
  }

  const status = normalizeCustomerEsimStatus(esim.status);
  const unlimited = isUnlimitedEsim(esim.totalDataMb, esim.installInfo) || coverage?.unlimited;
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const days = remainingDays(esim.expiresAt);
  const purchase = detail.data?.purchase;
  const canTopUp = esim.topupSupported && hasCapability(esim, "TOPUP");

  return (
    <AccountLayout
      active="esims"
      title={esim.packageLabel || esim.destinationLabel || "eSIM"}
      lead={esim.destinationLabel ?? undefined}
      actions={<Badge variant="outline">{esimStatusLabel(status, locale)}</Badge>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{copy.esim.status}</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Row label={copy.esim.purchaseDate} value={formatDate(esim.createdAt, locale)} />
              <Row
                label={copy.esim.validity}
                value={
                  coverage?.validityDays
                    ? `${coverage.validityDays} ${copy.esim.days}`
                    : days != null
                      ? `${days} ${copy.daysLeft}`
                      : "—"
                }
              />
              <Row
                label={copy.esim.package}
                value={
                  unlimited
                    ? copy.unlimited
                    : coverage?.dataGb
                      ? `${coverage.dataGb} GB`
                      : esim.totalDataMb != null
                        ? formatMegabytes(esim.totalDataMb, locale)
                        : "—"
                }
              />
              <Row
                label={copy.esim.network}
                value={coverage?.networkOperators?.length ? coverage.networkOperators.join(", ") : "—"}
              />
              {esim.hasIccid && activation.data?.iccid && (
                <Row label={copy.esim.iccid} value={activation.data.iccid} />
              )}
              {detail.data?.orderRef && (
                <div className="grid gap-1">
                  <dt className="text-xs font-bold uppercase text-muted-foreground">
                    {copy.esim.order}
                  </dt>
                  <dd>
                    <Link
                      to="/account/orders/$id"
                      params={{ id: detail.data.orderRef.id }}
                      className="font-semibold text-primary"
                    >
                      #{detail.data.orderRef.orderNumber}
                    </Link>
                  </dd>
                </div>
              )}
              {purchase?.salePrice != null && purchase.currency && (
                <Row
                  label={copy.orders.price}
                  value={formatMoney(purchase.salePrice, purchase.currency, locale)}
                />
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">
              {unlimited ? copy.unlimited : copy.esim.package}
            </h2>
            {unlimited ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {fairUseText(esim.installInfo) ?? coverage?.fairUseNote ?? copy.usageUnavailable}
              </p>
            ) : usage != null && esim.totalDataMb != null && esim.remainingDataMb != null ? (
              <>
                <p className="mt-2 font-display text-2xl font-bold">
                  {formatMegabytes(Math.max(0, esim.remainingDataMb), locale)}{" "}
                  <span className="text-sm font-semibold text-muted-foreground">
                    {copy.remaining} · {formatMegabytes(esim.totalDataMb, locale)} {copy.total}
                  </span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ transform: `translateX(-${usage}%)` }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{copy.usageUnavailable}</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Globe2 className="size-5 text-primary" />
              <h2 className="font-display text-lg font-bold">{copy.esim.coverage}</h2>
            </div>
            {coverage?.countryIsos.length ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {coverage.countryIsos.length} {copy.esim.countries}
                </p>
                {!countriesOpen ? (
                  <Button
                    variant="outline"
                    className="mt-4 min-h-11"
                    onClick={() => setCountriesOpen(true)}
                  >
                    {copy.esim.viewCountries}
                  </Button>
                ) : (
                  <>
                    <div className="relative mt-4">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={countryQuery}
                        onChange={(event) => setCountryQuery(event.target.value)}
                        placeholder={copy.esim.searchCountry}
                        className="pl-9"
                      />
                    </div>
                    <ul className="mt-3 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border">
                      {countries.map((country) => (
                        <li
                          key={country.iso}
                          className="flex min-h-11 items-center gap-3 border-b border-border/60 px-3 text-sm last:border-b-0"
                        >
                          <span aria-hidden="true">{flagOf(country.iso)}</span>
                          <span className="truncate">{country.name}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{copy.esim.noCoverage}</p>
            )}
          </section>
        </div>

        <aside className="grid gap-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{copy.guide.title}</h2>
            <div className="mt-4">
              {activation.isLoading ? (
                <div className="h-48 animate-pulse rounded-xl bg-secondary" />
              ) : (
                <EsimInstallGuide
                  locale={locale}
                  esimId={esim.id}
                  qrPayload={activation.data?.qrPayload ?? null}
                  installInfo={activation.data?.installInfo ?? esim.installInfo}
                  activationPolicy={coverage?.activationPolicy ?? null}
                  expired={expired}
                />
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            {canTopUp ? (
              <Button variant="cta" className="min-h-11 w-full">
                {copy.esim.topup}
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{copy.esim.topupUnavailable}</p>
                <Button asChild variant="cta" className="mt-3 min-h-11 w-full">
                  <Link to="/" search={{ service: "esim" }} hash="finder">
                    {copy.esim.newPackage}
                  </Link>
                </Button>
              </>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy.esim.priceNote}</p>
          </section>
        </aside>
      </div>
    </AccountLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="break-all font-semibold">{value}</dd>
    </div>
  );
}
