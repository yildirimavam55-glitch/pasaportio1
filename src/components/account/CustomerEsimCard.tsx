import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CLink as Link } from "@/components/design-v2/v2-context";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Infinity as InfinityIcon,
  Plus,
  QrCode,
  RefreshCcw,
  UserRound,
} from "lucide-react";

import { EsimInstallGuide } from "@/components/account/EsimInstallGuide";
import { ACCOUNT_COPY } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Locale } from "@/domain/enums";
import { flagOf, getCountryByIso } from "@/domain/geo/countries";
import { commercialDataGb, customerCataloguePackageTitle } from "@/domain/esim/customer-presentation";
import { useIsV2 } from "@/components/design-v2/v2-context";
import {
  boundedUsagePercent,
  fairUseText,
  formatMegabytes,
  isHistoryEsim,
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

export function CustomerEsimCard({
  esim,
  locale,
  activationPolicy,
}: {
  esim: CustomerEsimRecord;
  locale: Locale;
  activationPolicy?: string | null;
}) {
  const copy = ACCOUNT_COPY[locale];
  const v2 = useIsV2();
  const [guideOpen, setGuideOpen] = useState(false);
  const status = normalizeCustomerEsimStatus(esim.status);
  const expired = isHistoryEsim({
    status: esim.status,
    totalMb: esim.totalDataMb,
    remainingMb: esim.remainingDataMb,
    expiresAt: esim.expiresAt,
  });
  const { flag, name, subtitle, coverageCount } = displayInfo(esim, locale, v2);
  const unlimited = isUnlimitedEsim(esim.totalDataMb, esim.installInfo);
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const days = remainingDays(esim.expiresAt);
  const fairUse = fairUseText(esim.installInfo);
  const lowData =
    esim.totalDataMb != null &&
    esim.remainingDataMb != null &&
    esim.totalDataMb > 0 &&
    esim.remainingDataMb / esim.totalDataMb < 0.1;
  const canShowActivation = !expired && (esim.hasQr || esim.hasInstallInfo);
  const canTopUp = esim.topupSupported && hasCapability(esim, "TOPUP");
  const policy = activationPolicy ?? esim.productInfo?.activationPolicy ?? null;
  const readyNote =
    policy === "ON_FIRST_NETWORK_CONNECTION" ? copy.readyNoteFirstUse : copy.readyNote;

  const activation = useQuery({
    queryKey: ["customer-esim-activation", esim.id],
    queryFn: () => getCustomerEsimActivation({ data: { esimId: esim.id } }),
    enabled: guideOpen && canShowActivation,
    staleTime: 60_000,
  });

  return (
    <article className="customer-esim-card snap-start border border-border bg-card shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold uppercase tracking-wide">
            {flag}
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{subtitle}</p>
          {coverageCount > 1 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {coverageCount} {copy.coverageCountries}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 px-2 py-0 text-[11px]">
          {STATUS_LABELS[locale][status]}
        </Badge>
      </div>

      {esim.travelerLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <UserRound className="size-3.5" />
          {esim.travelerLabel}
        </p>
      )}

      {status === "ACTIVE" && (
        <div className="mt-3 rounded-lg bg-secondary/60 px-3 py-2.5">
          {unlimited ? (
            <div className="flex gap-2.5">
              <InfinityIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-bold">{copy.unlimited}</p>
                {fairUse && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {fairUse}
                  </p>
                )}
              </div>
            </div>
          ) : usage != null && esim.totalDataMb != null && esim.remainingDataMb != null ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-lg font-bold leading-6">
                  {formatMegabytes(Math.max(0, esim.remainingDataMb), locale)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    {copy.remaining}
                  </span>
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {formatMegabytes(esim.totalDataMb, locale)} {copy.total}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-transform duration-500"
                  style={{ transform: `translateX(-${usage}%)` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold">
                <span>%{Math.round(100 - usage)}</span>
                {days != null && (
                  <span className="font-medium text-muted-foreground">
                    {days === 0 ? copy.expiresToday : `${days} ${copy.daysLeft}`}
                  </span>
                )}
              </div>
              {lowData && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <AlertTriangle className="size-3.5 text-warning" />
                  {ACCOUNT_DEMO_COPY[locale].low}
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCcw className="size-3.5 shrink-0 text-primary" />
              {copy.usageUnavailable}
            </p>
          )}
          {!unlimited && usage == null && days != null && (
            <p className="flex items-center gap-2 text-[11px] font-semibold">
              {days === 0 ? copy.expiresToday : `${days} ${copy.daysLeft}`}
            </p>
          )}
        </div>
      )}

      {status === "READY" && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{readyNote}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {canTopUp && (
          <Button variant="cta" className="col-span-2 min-h-10 text-xs">
            <Plus className="size-4" />
            {copy.esim.topup}
          </Button>
        )}
        {status === "READY" && canShowActivation && (
          <Button variant="cta" className="col-span-2 min-h-10 text-xs" onClick={() => setGuideOpen(true)}>
            <QrCode className="size-4" />
            {copy.installNow}
          </Button>
        )}
        {status !== "READY" && canShowActivation && (
          <>
            <Button variant="outline" className="min-h-10 text-xs" onClick={() => setGuideOpen(true)}>
              <QrCode className="size-4" />
              {copy.esim.qr}
            </Button>
            <Button variant="outline" className="min-h-10 text-xs" onClick={() => setGuideOpen(true)}>
              <BookOpen className="size-4" />
              {copy.esim.guide}
            </Button>
          </>
        )}
        {status === "READY" && (
          <Button variant="outline" className="min-h-10 text-xs" onClick={() => setGuideOpen(true)}>
            <QrCode className="size-4" />
            {copy.esim.qr}
          </Button>
        )}
        <Button
          asChild
          variant={expired ? "cta" : "outline"}
          className="min-h-10 text-xs"
        >
          <Link to="/" search={{ service: "esim" }} hash="finder">
            <RefreshCcw className="size-4" />
            {copy.esim.buyAgain}
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-10 text-xs">
          <Link to="/account/esims/$id" params={{ id: esim.id }}>
            {copy.detail}
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        >
          <SheetHeader className="pr-10 text-left">
            <SheetTitle>{copy.guide.title}</SheetTitle>
            <SheetDescription>
              {flag}
              {name} · {subtitle}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            {activation.isLoading ? (
              <div className="mx-auto size-48 animate-pulse rounded-xl bg-secondary" />
            ) : (
              <EsimInstallGuide
                locale={locale}
                esimId={esim.id}
                qrPayload={activation.data?.qrPayload ?? null}
                installInfo={activation.data?.installInfo ?? esim.installInfo}
                activationPolicy={policy}
                expired={expired}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </article>
  );
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
          {subtitle} · {STATUS_LABELS[locale][status]}
          {days != null && days > 0 ? ` · ${days} ${copy.daysLeft}` : ""}
        </p>
      </Link>
      <Button asChild variant="outline" size="sm" className="h-8 shrink-0 text-xs">
        <Link to="/" search={{ service: "esim" }} hash="finder">
          {copy.esim.buyAgain}
        </Link>
      </Button>
    </div>
  );
}
