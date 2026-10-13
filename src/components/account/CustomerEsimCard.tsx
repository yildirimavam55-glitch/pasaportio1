import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CLink as Link } from "@/components/design-v2/v2-context";
import {
  AlertTriangle,
  ChevronRight,
  QrCode,
  RefreshCcw,
  Smartphone, Menu, Clock3, Undo2, CalendarDays,
} from "lucide-react";

import { ACCOUNT_V1_COPY } from "./v1-copy";
import { accountPhotoIso, refundPresentation } from "./v1-presentation";
import { getEsimRefundState } from "@/lib/refunds.functions";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { formatDate } from "./copy";
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
  const c = ACCOUNT_V1_COPY[locale];
  const v2 = useIsV2();
  const [guideOpen, setGuideOpen] = useState(false);
  const [method, setMethod] = useState<'qr' | 'guide'>('qr');
  const status = normalizeCustomerEsimStatus(esim.status);
  const category = esimCategory({ status: esim.status, totalMb: esim.totalDataMb, remainingMb: esim.remainingDataMb, expiresAt: esim.expiresAt });
  const pending = category === 'pending';
  const expired = category === 'used' || category === 'refunded' || category === 'refunding';
  const { name, subtitle } = displayInfo(esim, locale, v2);
  const iso = accountPhotoIso(esim);
  const photo = getCountryPhoto(iso);
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const activation = useQuery({ queryKey: ['customer-esim-activation', esim.id], queryFn: () => getCustomerEsimActivation({ data: { esimId: esim.id } }), enabled: !demo && guideOpen && !expired && (esim.hasQr || esim.hasInstallInfo), staleTime: 60_000 });
  const refund = useQuery({ queryKey: ['esim-refund-state', esim.id], queryFn: () => getEsimRefundState({ data: { esimId: esim.id } }), enabled: !demo && pending, staleTime: 30_000 });
  const purchaseAt = demo ? esim.createdAt : refund.data?.purchaseAt ?? (esim.orderItemId ? esim.createdAt : null);
  const refundInfo = refundPresentation(purchaseAt, new Date(), refund.data);
  const openMethod = (next: 'qr' | 'guide') => { setMethod(next); setGuideOpen(true); };
  return <article data-demo-esim={demo ? esim.id : undefined} data-esim-category={category} className="customer-esim-card snap-start border border-border bg-card shadow-card">
    <div className="account-card-summary">
      <div className="account-card-photo-wrap">
        {photo ? <img src={photo.cardImage} alt="" loading="lazy" className="account-esim-photo" /> : <div className="account-esim-photo grid place-items-center bg-primary-soft"><Smartphone className="size-8 text-primary" /></div>}
        <Badge variant="outline" className={`account-card-badge ${STATUS_TONE[status]}`}>{pc.cat[category]}</Badge>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-bold">{iso && <CountryFlag iso={iso} className="text-base" />}<span className="min-w-0">{name}</span></p>
        <h3 className="mt-1 text-sm font-bold">{name} eSIM · {subtitle}</h3>
        {demo && <p className="mt-1 text-[10px] font-bold text-warning">DEMO</p>}
        {esim.travelerLabel && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{esim.travelerLabel}</p>}
        {pending ? <><p className="mt-2 text-[11px] text-muted-foreground">{c.installed}: {c.noInstall}</p><p className="mt-1 flex gap-1 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5 shrink-0" />{copy.esim.purchaseDate}: {purchaseAt ? formatDate(purchaseAt, locale) : pc.noData}</p></> : <div className="mt-2">
          <p className="text-xs font-bold">{esim.remainingDataMb != null && usage != null ? `${formatMegabytes(Math.max(0, esim.remainingDataMb), locale)} · ${pc.remainingData}` : c.noUsage}</p>
          {usage != null && <Progress value={100 - usage} className="mt-2 h-1.5" aria-label={pc.remainingData} />}
          <p className="mt-2 text-[10px] text-muted-foreground">{pc.activation}: {status === 'ACTIVE' ? pc.activationStored : pc.activationUnknown}</p>
        </div>}
      </div>
    </div>
    {pending && <div className="account-refund-note"><Clock3 className="size-5 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[11px] leading-4">{c.refundInfo}</p><p className="mt-1 text-[10px] text-muted-foreground">{refundInfo.purchaseAt ? refundInfo.open ? `${c.remaining}: ${refundInfo.daysLeft} ${pc.days}` : c.closed : c.purchaseUnknown}</p>{!refundInfo.verifiedEligible && <p className="mt-1 text-[10px] text-muted-foreground">{c.unverified}</p>}</div></div>}
    <div className="account-quick-actions mt-auto" data-card-actions>
      <Button variant="outline" className="account-square-action" onClick={() => openMethod('qr')} disabled={expired || (!demo && !esim.hasQr)} aria-label={c.qr}><QrCode /><span>{c.qr}</span></Button>
      <Button variant="outline" className="account-square-action" data-install-trigger={esim.id} onClick={() => openMethod('guide')} disabled={expired} aria-label={c.install}><Smartphone /><span>{c.install}</span></Button>
      <Button asChild variant="outline" className="account-square-action"><Link to="/esim" search={rebuyTarget(esim.productInfo)} aria-label={c.rebuy}><RefreshCcw /><span>{c.rebuy}</span></Link></Button>
      {pending ? <Button asChild variant="outline" className="account-square-action text-destructive"><Link to="/account/support" aria-label={refundInfo.verifiedEligible ? c.refund : c.review}><Undo2 /><span>{refundInfo.verifiedEligible ? c.refund : c.review}</span></Link></Button> : <Button asChild variant="outline" className="account-square-action"><Link to="/account/esims/$id" params={{ id: esim.id }} search={demo ? { demo: 1 } : {}} data-demo-detail-link={demo || undefined} aria-label={c.detail}><Menu /><span>{c.detail}</span></Link></Button>}
    </div>
    {pending && <Link to="/account/esims/$id" params={{ id: esim.id }} search={demo ? { demo: 1 } : {}} data-demo-detail-link={demo || undefined} className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold text-primary">{pc.view}<ChevronRight className="size-3" /></Link>}
    <EsimInstallSheet open={guideOpen} onOpenChange={setGuideOpen} initialMethod={method} title={`${name} · ${subtitle}`} locale={locale} esimId={esim.id} qrPayload={activation.data?.qrPayload ?? null} installInfo={activation.data?.installInfo ?? esim.installInfo} activationPolicy={activationPolicy ?? esim.productInfo?.activationPolicy} expired={expired} loading={activation.isLoading} demo={demo} />
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
