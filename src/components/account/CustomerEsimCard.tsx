import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
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

const STATUS_LABELS: Record<Locale, Record<CustomerEsimStatus, string>> = {
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
};

const STATUS_TONE: Record<CustomerEsimStatus, string> = {
  PREPARING: "border-info/20 bg-info/10 text-info",
  READY: "border-primary/20 bg-primary-soft text-primary",
  ACTIVE: "border-success/20 bg-primary-soft text-primary",
  EXPIRED: "border-border bg-secondary text-muted-foreground",
  EXHAUSTED: "border-warning/30 bg-accent-soft text-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  SUPPORT: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function esimStatusLabel(status: CustomerEsimStatus, locale: Locale) {
  return STATUS_LABELS[locale][status];
}

export function hasCapability(esim: CustomerEsimRecord, capability: string) {
  return esim.providerCapabilities.some((item) => item.toUpperCase() === capability);
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
  const [guideOpen, setGuideOpen] = useState(false);
  const status = normalizeCustomerEsimStatus(esim.status);
  const expired = isHistoryEsim({
    status: esim.status,
    totalMb: esim.totalDataMb,
    remainingMb: esim.remainingDataMb,
    expiresAt: esim.expiresAt,
  });
  const unlimited = isUnlimitedEsim(esim.totalDataMb, esim.installInfo);
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const days = remainingDays(esim.expiresAt);
  const fairUse = fairUseText(esim.installInfo);
  const lowData =
    esim.totalDataMb != null &&
    esim.remainingDataMb != null &&
    esim.remainingDataMb / esim.totalDataMb <= 0.2;
  const canShowActivation = !expired && (esim.hasQr || esim.hasInstallInfo);
  const canTopUp = esim.topupSupported && hasCapability(esim, "TOPUP");

  const activation = useQuery({
    queryKey: ["customer-esim-activation", esim.id],
    queryFn: () => getCustomerEsimActivation({ data: { esimId: esim.id } }),
    enabled: guideOpen && canShowActivation,
    staleTime: 60_000,
  });

  return (
    <article className="customer-esim-card snap-start border border-border bg-card shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-muted-foreground">
            {esim.destinationLabel || "eSIM"}
          </p>
          <h3 className="mt-1 truncate font-display text-xl font-bold">
            {esim.packageLabel || "eSIM"}
          </h3>
        </div>
        <Badge variant="outline" className={STATUS_TONE[status]}>
          {STATUS_LABELS[locale][status]}
        </Badge>
      </div>

      {esim.travelerLabel && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="size-4 text-primary" />
          <strong className="text-foreground">{esim.travelerLabel}</strong>
        </p>
      )}

      <div className="mt-5 rounded-xl bg-secondary/70 p-4">
        {unlimited ? (
          <div className="flex gap-3">
            <InfinityIcon className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold">{copy.unlimited}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {fairUse ?? copy.usageUnavailable}
              </p>
            </div>
          </div>
        ) : usage != null && esim.totalDataMb != null && esim.remainingDataMb != null ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="font-display text-2xl font-bold">
                {formatMegabytes(Math.max(0, esim.remainingDataMb), locale)}{" "}
                <span className="text-sm font-semibold text-muted-foreground">{copy.remaining}</span>
              </p>
              <span className="text-xs text-muted-foreground">
                {formatMegabytes(esim.totalDataMb, locale)} {copy.total}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-transform duration-500"
                style={{ transform: `translateX(-${usage}%)` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold">
              <span>%{Math.round(100 - usage)}</span>
              {days != null && (
                <span className="text-muted-foreground">
                  {days === 0 ? copy.expiresToday : `${days} ${copy.daysLeft}`}
                </span>
              )}
            </div>
            {lowData && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlertTriangle className="size-4 text-warning" />
                {locale === "tr"
                  ? "Verinin %20'sinden azı kaldı"
                  : locale === "de"
                    ? "Weniger als 20 % verbleiben"
                    : "Less than 20% remains"}
              </p>
            )}
          </>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <RefreshCcw className="mt-0.5 size-4 shrink-0 text-primary" />
            {copy.usageUnavailable}
          </p>
        )}
        {!unlimited && usage == null && days != null && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-foreground">
            <CalendarClock className="size-4 text-primary" />
            {days === 0 ? copy.expiresToday : `${days} ${copy.daysLeft}`}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {canTopUp && (
          <Button variant="cta" className="col-span-2 min-h-11">
            <Plus />
            {copy.esim.topup}
          </Button>
        )}
        {canShowActivation && (
          <>
            <Button variant="outline" className="min-h-11" onClick={() => setGuideOpen(true)}>
              <QrCode />
              {copy.esim.qr}
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => setGuideOpen(true)}>
              <BookOpen />
              {copy.esim.guide}
            </Button>
          </>
        )}
        {!canTopUp && (
          <Button asChild variant={canShowActivation ? "secondary" : "cta"} className="min-h-11">
            <Link to="/" search={{ service: "esim" }} hash="finder">
              <RefreshCcw />
              {copy.esim.buyAgain}
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="min-h-11">
          <Link to="/account/esims/$id" params={{ id: esim.id }}>
            {copy.detail}
            <ChevronRight />
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
            <SheetDescription>{esim.packageLabel || esim.destinationLabel || "eSIM"}</SheetDescription>
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
                activationPolicy={activationPolicy ?? null}
                expired={expired}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </article>
  );
}
