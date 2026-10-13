import { CLink as Link } from "@/components/design-v2/v2-context";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, Database, Globe2, Info, Search, Signal, Smartphone } from "lucide-react";
import { PURCHASE_COPY } from "@/components/account/purchases-copy";
import { getCountryPhoto } from "@/components/travel/countryPhotos";

import { AccountLayout } from "@/components/account/AccountLayout";
import { EsimRefundPanel } from "@/components/refunds/EsimRefundPanel";
import { EsimInstallSheet } from "../EsimInstallSheet";
import { demoEsimRecord } from "../demo-presentation";
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
import { customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { useIsV2 } from "@/components/design-v2/v2-context";
import { canOfferTopUp, rebuyTarget } from "@/domain/esim/rebuy";
import { PANEL_COPY } from "@/components/account/panel-copy";
import { useI18n } from "@/i18n";
import { useAccountDemo } from "@/components/account/pages/EsimsPage";
import { createAccountDemo } from "@/domain/esim/account-demo";
import {
  getCustomerEsimActivation,
  getCustomerEsimDetail,
} from "@/lib/customer-account.functions";


/** Preview-only, in-memory detail for demo ids. Never fetched, written, or given real codes. */
function demoDetail(id: string, now: Date) {
  const d = createAccountDemo(now).find((e) => e.id === id);
  if (!d) return null;
  return {
    esim: demoEsimRecord(d),
    orderRef: null, purchase: null,
    coverage: { countryIsos: [d.iso], dataGb: d.total, validityDays: 30, unlimited: false, activationPolicy: null, networkOperators: [], fairUseNote: null, topupSupported: false },
  } as unknown as Awaited<ReturnType<typeof getCustomerEsimDetail>>;
}

export function EsimDetailPage({ id }: { id: string }) {
  const { locale } = useI18n();
  const copy = ACCOUNT_COPY[locale];
  const v2 = useIsV2();
  const [countryQuery, setCountryQuery] = useState("");
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const isDemoId = id.startsWith("demo-");
  const demoAllowed = useAccountDemo();
  const [now] = useState(() => new Date());
  const demoData = useMemo(() => (isDemoId && demoAllowed ? demoDetail(id, now) : null), [isDemoId, demoAllowed, id, now]);

  const realDetail = useQuery({
    queryKey: ["customer-esim-detail", id],
    queryFn: () => getCustomerEsimDetail({ data: { esimId: id } }),
    enabled: !isDemoId,
    staleTime: 30_000,
  });
  const detail = isDemoId ? { data: demoData, isLoading: false } : realDetail;
  const esim = detail.data?.esim;
  const expired = esim
    ? isHistoryEsim({
        status: esim.status,
        totalMb: esim.totalDataMb,
        remainingMb: esim.remainingDataMb,
        expiresAt: esim.expiresAt,
      })
    : false;
  const canShowActivation = Boolean(!isDemoId && esim && !expired && (esim.hasQr || esim.hasInstallInfo));
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
  const canTopUp = canOfferTopUp(esim.topupSupported && hasCapability(esim, "TOPUP"));
  const panel = PANEL_COPY[locale];
  const usageUpdatedAt = usageTimestamp(esim.installInfo);
  const pc = PURCHASE_COPY[locale];
  const heroIso = esim.productInfo?.destinationIso ?? (coverage?.countryIsos.length === 1 ? coverage.countryIsos[0] : null);
  const photo = getCountryPhoto(heroIso);
  const v2Identity = v2 && coverage?.countryIsos.length
    ? customerCataloguePackageTitle({ locale, coverage: coverage.countryIsos, destinationIso: esim.productInfo?.destinationIso ?? null, packageKind: esim.productInfo?.packageKind ?? null })
    : null;

  return (
    <AccountLayout
      active="esims"
      title={v2Identity ?? (esim.packageLabel || esim.destinationLabel || "eSIM")}
      lead={v2Identity ? undefined : esim.destinationLabel ?? undefined}
      actions={<>{isDemoId && <Badge variant="outline" className="border-warning/40 text-warning">DEMO</Badge>}<Badge variant="outline">{esimStatusLabel(status, locale)}</Badge></>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          <section className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            {photo ? <img src={photo.cardImage} alt="" loading="lazy" className="h-24 w-28 shrink-0 rounded-xl object-cover sm:h-28 sm:w-40" /> : null}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold">{v2Identity ?? (esim.packageLabel || esim.destinationLabel || "eSIM")}</h2>
              {heroIso && <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden="true">{flagOf(heroIso)}</span>{getCountryByIso(heroIso)?.name[locale] ?? heroIso}</p>}
              <p className="mt-1 text-sm text-muted-foreground">
                {[unlimited ? copy.unlimited : coverage?.dataGb ? `${coverage.dataGb} GB` : null, coverage?.validityDays ? `${coverage.validityDays} ${copy.esim.days}` : null].filter(Boolean).join(" · ")}
              </p>
              {coverage?.networkOperators?.length ? <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Signal className="size-3.5" />{coverage.networkOperators.join(" / ")}</p> : null}
            </div>
          </section>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" />{pc.remainingData}</p>
              {unlimited ? (
                <>
                  <p className="mt-2 font-display text-2xl font-bold">{copy.unlimited}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{fairUseText(esim.installInfo) ?? coverage?.fairUseNote ?? copy.usageUnavailable}</p>
                </>
              ) : usage != null && esim.totalDataMb != null && esim.remainingDataMb != null ? (
                <>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {formatMegabytes(Math.max(0, esim.remainingDataMb), locale)}{" "}
                    <span className="text-sm font-semibold text-muted-foreground">/ {formatMegabytes(esim.totalDataMb, locale)}</span>
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${100 - usage}%` }} />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{copy.usageUnavailable}</p>
              )}
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-primary" />{pc.remainingTime}</p>
              {days != null ? (
                <>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {days} {pc.days}
                    {coverage?.validityDays ? <span className="text-sm font-semibold text-muted-foreground"> / {coverage.validityDays} {pc.days}</span> : null}
                  </p>
                  {coverage?.validityDays ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-warning/20">
                      <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, (days / coverage.validityDays) * 100)}%` }} />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{pc.noData}</p>
              )}
            </section>
          </div>
          <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{pc.activation}</p>
                <p className="text-xs text-muted-foreground">{status === "ACTIVE" ? `${pc.activationStored}: ${esimStatusLabel(status, locale)}` : pc.activationUnknown}</p>
                <p className="mt-1 text-xs text-muted-foreground">{pc.activationNote}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                {usageUpdatedAt ? `${panel.usageUpdated}: ${formatDate(usageUpdatedAt, locale)}` : panel.usageNotLive}
              </p>
            </div>
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
            <h2 className="font-display text-lg font-bold">{pc.installOptions}</h2>
            <Button variant="default" disabled className="mt-3 h-auto min-h-14 w-full whitespace-normal py-3 text-left"><Smartphone className="size-5 shrink-0" /><span className="min-w-0 flex-1">{pc.iphoneAuto}</span><span className="text-xs">{pc.soon}</span></Button>
            <Button variant="cta" data-install-trigger={esim.id} className="mt-3 min-h-11 w-full whitespace-normal" onClick={() => setInstallOpen(true)}>{copy.guide.title}</Button>
            <EsimInstallSheet open={installOpen} onOpenChange={setInstallOpen} title={v2Identity ?? esim.packageLabel ?? 'eSIM'} locale={locale} esimId={esim.id} qrPayload={activation.data?.qrPayload ?? null} installInfo={activation.data?.installInfo ?? esim.installInfo} activationPolicy={coverage?.activationPolicy} expired={expired} loading={activation.isLoading} demo={isDemoId} />
          </section>
          {!isDemoId && <EsimRefundPanel esimId={esim.id} />}
          {isDemoId && <Button asChild variant="outline" className="min-h-11"><Link to="/account/support">{pc.nav.support}</Link></Button>}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            {canTopUp ? (
              <Button variant="cta" className="min-h-11 w-full">
                {copy.esim.topup}
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{esim.topupSupported ? panel.topupNotOffered : copy.esim.topupUnavailable}</p>
                <Button asChild variant="cta" className="mt-3 min-h-11 w-full">
                  <Link to="/esim" search={rebuyTarget(esim.productInfo)}>
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

/** Only a real provider usage timestamp counts; record edit times are not usage updates. */
function usageTimestamp(info: unknown): string | null {
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  const value = (info as Record<string, unknown>)["usage_updated_at"];
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : null;
}
