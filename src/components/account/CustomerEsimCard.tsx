import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CLink as Link } from "@/components/design-v2/v2-context";
import {
  AlertTriangle,
  ChevronRight,
  QrCode,
  RefreshCcw,
} from "lucide-react";

import { EsimInstallSheet } from "./EsimInstallSheet";
import { Progress } from "@/components/ui/progress";
import { getCountryPhoto } from "@/components/travel/countryPhotos";
import { PURCHASE_COPY } from "./purchases-copy";
import { esimCategory } from "@/domain/esim/purchase-categories";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/domain/enums";
import { flagOf, getCountryByIso } from "@/domain/geo/countries";
import { commercialDataGb, customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { useIsV2 } from "@/components/design-v2/v2-context";
import { rebuyTarget } from "@/domain/esim/rebuy";
import {
  boundedUsagePercent,
  formatMegabytes,
  isUnlimitedEsim,
  normalizeCustomerEsimStatus,
  remainingDays,
  type CustomerEsimStatus,
} from "@/domain/esim/customer-esim";
import {
  getCustomerEsimActivation,
  type CustomerEsimRecord,
} from "@/lib/customer-account.functions";
import { localize } from "@/i18n/overlay";
import { ACCOUNT_DEMO_COPY } from "./demo-copy";

const STATUS_LABELS: Record<Locale, Record<CustomerEsimStatus, string>> = localize({
  tr: {
    PREPARING: "Hazırlanıyor",
    READY: "Kuruluma hazır",
    ACTIVE: "Aktif",
    EXPIRED: "Süresi doldu",
    EXHAUSTED: "Verisi bitti",
    CANCELLED: "İptal edildi",
    SUPPORT: "Sorun oluştu",
  },
  de: {
    PREPARING: "Wird vorbereitet",
    READY: "Installationsbereit",
    ACTIVE: "Aktiv",
    EXPIRED: "Abgelaufen",
    EXHAUSTED: "Daten verbraucht",
    CANCELLED: "Storniert",
    SUPPORT: "Problem aufgetreten",
  },
  en: {
    PREPARING: "Preparing",
    READY: "Ready to install",
    ACTIVE: "Active",
    EXPIRED: "Expired",
    EXHAUSTED: "Data used up",
    CANCELLED: "Cancelled",
    SUPPORT: "Issue occurred",
  },
});

const STATUS_TONE: Record<CustomerEsimStatus, string> = {
  PREPARING: "border-info/20 bg-info/10 text-info",
  READY: "border-primary/20 bg-primary-soft text-primary",
  ACTIVE: "border-success/20 bg-primary-soft text-primary",
  EXPIRED: "border-border bg-secondary text-muted-foreground",
  EXHAUSTED: "border-border bg-secondary text-muted-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  SUPPORT: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function esimStatusLabel(status: CustomerEsimStatus, locale: Locale) {
  return STATUS_LABELS[locale][status];
}

export function hasCapability(esim: CustomerEsimRecord, capability: string) {
  return esim.providerCapabilities.some((item) => item.toUpperCase() === capability);
}

/** Clean customer-facing identity derived from structured product fields — never the raw supplier title. */
function displayInfo(esim: CustomerEsimRecord, locale: Locale, v2: boolean) {
  const copy = ACCOUNT_COPY[locale];
  const info = esim.productInfo;
  const country = info?.destinationIso ? getCountryByIso(info.destinationIso) : undefined;
  const structuredIdentity = v2 && info?.coverageIsos.length
    ? customerCataloguePackageTitle({ locale, coverage: info.coverageIsos, destinationIso: info.destinationIso, packageKind: info.packageKind })
    : null;
  const name = structuredIdentity ?? ((country?.name[locale] ?? esim.destinationLabel ?? "").trim() || "eSIM");
  const flag = country && (!v2 || info?.coverageIsos.length === 1) ? `${flagOf(country.iso)} ` : "";

  const structuredGb = info?.dataGb != null ? commercialDataGb(info.dataGb) : null;
  const dataMb =
    info?.unlimitedData || isUnlimitedEsim(esim.totalDataMb, esim.installInfo)
      ? null
      : structuredGb != null
        ? Math.round(structuredGb * 1024)
        : esim.totalDataMb;
  const validityDays =
    info?.validityDays ??
    (esim.createdAt && esim.expiresAt
      ? Math.round(
          (new Date(esim.expiresAt).getTime() - new Date(esim.createdAt).getTime()) / 86_400_000,
        )
      : null);

  const parts: string[] = [];
  if (info?.unlimitedData || isUnlimitedEsim(esim.totalDataMb, esim.installInfo)) {
    parts.push(copy.unlimited);
  } else if (dataMb != null) {
    parts.push(formatMegabytes(dataMb, locale));
  }
  if (validityDays != null && validityDays > 0) {
    parts.push(`${validityDays} ${copy.esim.days}`);
  }
  const subtitle = parts.join(" · ") || esim.packageLabel || "eSIM";
  const coverageCount = info?.coverageCount ?? 0;

  return { flag, name, subtitle, coverageCount };
}

export function CustomerEsimCard({ esim, locale, activationPolicy, demo = false }: {
  esim: CustomerEsimRecord; locale: Locale; activationPolicy?: string | null; demo?: boolean;
}) {
  const copy = ACCOUNT_COPY[locale];
  const pc = PURCHASE_COPY[locale];
  const v2 = useIsV2();
  const [guideOpen, setGuideOpen] = useState(false);
  const status = normalizeCustomerEsimStatus(esim.status);
  const category = esimCategory({ status: esim.status, totalMb: esim.totalDataMb, remainingMb: esim.remainingDataMb, expiresAt: esim.expiresAt });
  const expired = category === 'used' || category === 'refunded' || category === 'refunding';
  const { name, subtitle } = displayInfo(esim, locale, v2);
  const photo = getCountryPhoto(esim.productInfo?.destinationIso);
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const days = remainingDays(esim.expiresAt);
  const canShowActivation = !expired && (esim.hasQr || esim.hasInstallInfo);
  const activation = useQuery({ queryKey: ['customer-esim-activation', esim.id], queryFn: () => getCustomerEsimActivation({ data: { esimId: esim.id } }), enabled: !demo && guideOpen && canShowActivation, staleTime: 60_000 });
  return <article data-demo-esim={demo ? esim.id : undefined} className="customer-esim-card snap-start border border-border bg-card shadow-card">
    {photo && <img src={photo.cardImage} alt="" loading="lazy" className="account-esim-photo" />}
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><h3 className="text-base font-bold">{name}</h3><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>
      <Badge variant="outline" className="max-w-28 whitespace-normal px-2 py-1 text-[11px]">{pc.cat[category]}</Badge>
    </div>
    {demo && <span className="mt-2 text-[11px] font-bold text-warning">DEMO · ••{esim.id.slice(-4)}</span>}
    {esim.travelerLabel && <p className="mt-2 text-xs text-muted-foreground">{esim.travelerLabel}</p>}
    <div className="my-4 grid gap-3 rounded-lg bg-secondary/60 p-3">
      <div><p className="text-xs text-muted-foreground">{pc.remainingData}</p>
        {isUnlimitedEsim(esim.totalDataMb, esim.installInfo) ? <p className="mt-1 text-xl font-bold">{copy.unlimited}</p> : usage != null && esim.remainingDataMb != null && esim.totalDataMb != null ? <><p className="mt-1 text-xl font-bold">{formatMegabytes(Math.max(0, esim.remainingDataMb), locale)} <span className="text-xs font-medium text-muted-foreground">/ {formatMegabytes(esim.totalDataMb, locale)}</span></p><Progress className="mt-2 h-1.5" value={100 - usage} aria-label={pc.remainingData} /></> : <p className="mt-1 text-xs text-muted-foreground">{copy.usageUnavailable}</p>}
      </div>
      <p className="text-xs font-medium">{days != null ? `${days} ${copy.daysLeft}` : `${pc.remainingTime}: ${pc.noData}`}</p>
      {usage != null && usage > 90 && <p className="flex gap-1 text-xs text-warning"><AlertTriangle className="size-4 shrink-0" />{ACCOUNT_DEMO_COPY[locale].low}</p>}
    </div>
    <p className="mb-4 text-[11px] leading-5 text-muted-foreground">{pc.activation}: {status === 'ACTIVE' ? `${pc.activationStored} · ${esimStatusLabel(status, locale)}` : pc.activationUnknown}</p>
    <div className="mt-auto grid gap-2">
      {!expired && (canShowActivation || demo) && <Button variant={status === 'READY' ? 'cta' : 'outline'} data-install-trigger={esim.id} className="min-h-11 whitespace-normal text-xs" onClick={() => setGuideOpen(true)}><QrCode className="size-4" />{status === 'READY' ? copy.installNow : copy.guide.title}</Button>}
      <Button asChild variant="outline" className="min-h-11 whitespace-normal text-xs"><Link to="/account/esims/$id" params={{ id: esim.id }} search={demo ? { demo: 1 } : {}} data-demo-detail-link={demo || undefined}>{pc.view}<ChevronRight className="size-4" /></Link></Button>
    </div>
    <EsimInstallSheet open={guideOpen} onOpenChange={setGuideOpen} title={`${name} · ${subtitle}`} locale={locale} esimId={esim.id} qrPayload={activation.data?.qrPayload ?? null} installInfo={activation.data?.installInfo ?? esim.installInfo} activationPolicy={activationPolicy ?? esim.productInfo?.activationPolicy} expired={expired} loading={activation.isLoading} demo={demo} />
  </article>;
}

/** Compact row for expired/used-up eSIMs — never a full carousel card. */
export function CustomerEsimHistoryRow({
  esim,
  locale,
}: {
  esim: CustomerEsimRecord;
  locale: Locale;
}) {
  const copy = ACCOUNT_COPY[locale];
  const v2 = useIsV2();
  const status = normalizeCustomerEsimStatus(esim.status);
  const { flag, name, subtitle } = displayInfo(esim, locale, v2);
  const days = remainingDays(esim.expiresAt);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-card">
      <span aria-hidden="true" className="text-lg">
        {flag.trim() || "📱"}
      </span>
      <Link
        to="/account/esims/$id"
        params={{ id: esim.id }}
        className="min-w-0 flex-1"
        aria-label={`${name} — ${copy.detail}`}
      >
        <p className="truncate text-sm font-bold uppercase tracking-wide">{name}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {subtitle} · {PURCHASE_COPY[locale].cat[esimCategory({ status: esim.status, totalMb: esim.totalDataMb, remainingMb: esim.remainingDataMb, expiresAt: esim.expiresAt })]}
          {days != null && days > 0 ? ` · ${days} ${copy.daysLeft}` : ""}
        </p>
      </Link>
      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 text-xs">
        <Link to="/esim" search={rebuyTarget(esim.productInfo)}>
          {copy.esim.buyAgain}
        </Link>
      </Button>
    </div>
  );
}
