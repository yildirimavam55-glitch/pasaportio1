import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  Download,
  Infinity as InfinityIcon,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import QRCode from "qrcode";

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
  isUnlimitedEsim,
  normalizeCustomerEsimStatus,
  remainingDays,
  type CustomerEsimStatus,
} from "@/domain/esim/customer-esim";
import {
  getCustomerEsimActivation,
  type CustomerEsimRecord,
} from "@/lib/customer-account.functions";

const COPY = {
  tr: {
    traveler: "Yolcu",
    remaining: "Kalan",
    used: "Kullanıldı",
    total: "Toplam",
    days: "gün kaldı",
    expiresToday: "Bugün sona eriyor",
    unlimited: "Sınırsız veri",
    usageUnavailable: "Kullanım bilgisi sağlayıcıdan alınamıyor",
    usageUpdating: "Kullanım bilgisi güncelleniyor",
    low: "Verinizin %20'sinden azı kaldı",
    qr: "QR kodu",
    install: "Kurulum",
    topup: "Yükleme yap",
    buyAgain: "Tekrar satın al",
    extend: "Uzat",
    activationTitle: "eSIM kurulumu",
    activationText: "QR kodunu kurulum yapacağınız telefonda Ayarlar bölümünden okutun.",
    noQr: "QR kodu henüz hazır değil.",
    iccid: "ICCID",
    close: "Kapat",
    download: "QR'ı indir",
    statuses: {
      PREPARING: "Hazırlanıyor",
      READY: "Kuruluma hazır",
      ACTIVE: "Aktif",
      EXPIRED: "Süresi doldu",
      EXHAUSTED: "Veri tükendi",
      CANCELLED: "İptal / İade",
      SUPPORT: "Destek gerekiyor",
    },
  },
  de: {
    traveler: "Reisende Person",
    remaining: "Verbleibend",
    used: "Verbraucht",
    total: "Gesamt",
    days: "Tage verbleibend",
    expiresToday: "Läuft heute ab",
    unlimited: "Unbegrenzte Daten",
    usageUnavailable: "Nutzungsdaten sind vom Anbieter nicht verfügbar",
    usageUpdating: "Nutzungsdaten werden aktualisiert",
    low: "Weniger als 20 % Datenvolumen verbleiben",
    qr: "QR-Code",
    install: "Installation",
    topup: "Aufladen",
    buyAgain: "Erneut kaufen",
    extend: "Verlängern",
    activationTitle: "eSIM installieren",
    activationText: "Scanne den QR-Code in den Einstellungen des Telefons, das du verwenden möchtest.",
    noQr: "Der QR-Code ist noch nicht verfügbar.",
    iccid: "ICCID",
    close: "Schließen",
    download: "QR herunterladen",
    statuses: {
      PREPARING: "Wird vorbereitet",
      READY: "Installationsbereit",
      ACTIVE: "Aktiv",
      EXPIRED: "Abgelaufen",
      EXHAUSTED: "Daten verbraucht",
      CANCELLED: "Storniert / Erstattet",
      SUPPORT: "Support erforderlich",
    },
  },
  en: {
    traveler: "Traveler",
    remaining: "Remaining",
    used: "Used",
    total: "Total",
    days: "days remaining",
    expiresToday: "Expires today",
    unlimited: "Unlimited data",
    usageUnavailable: "Usage data is unavailable from the provider",
    usageUpdating: "Usage information is updating",
    low: "Less than 20% of your data remains",
    qr: "QR code",
    install: "Install",
    topup: "Top up",
    buyAgain: "Buy again",
    extend: "Extend",
    activationTitle: "Install your eSIM",
    activationText: "Scan the QR code from the settings on the phone you want to use.",
    noQr: "The QR code is not ready yet.",
    iccid: "ICCID",
    close: "Close",
    download: "Download QR",
    statuses: {
      PREPARING: "Preparing",
      READY: "Ready to install",
      ACTIVE: "Active",
      EXPIRED: "Expired",
      EXHAUSTED: "Data exhausted",
      CANCELLED: "Cancelled / Refunded",
      SUPPORT: "Support required",
    },
  },
} as const;

const STATUS_TONE: Record<CustomerEsimStatus, string> = {
  PREPARING: "border-info/20 bg-info/10 text-info",
  READY: "border-primary/20 bg-primary-soft text-primary",
  ACTIVE: "border-success/20 bg-primary-soft text-primary",
  EXPIRED: "border-border bg-secondary text-muted-foreground",
  EXHAUSTED: "border-warning/30 bg-accent-soft text-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  SUPPORT: "border-destructive/20 bg-destructive/10 text-destructive",
};

function hasCapability(esim: CustomerEsimRecord, capability: string) {
  return esim.providerCapabilities.some((item) => item.toUpperCase() === capability);
}

function installString(info: Record<string, unknown>, key: string) {
  const value = info[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function CustomerEsimCard({ esim, locale }: { esim: CustomerEsimRecord; locale: Locale }) {
  const copy = COPY[locale];
  const [activationOpen, setActivationOpen] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const status = normalizeCustomerEsimStatus(esim.status);
  const unlimited = isUnlimitedEsim(esim.totalDataMb, esim.installInfo);
  const usage = boundedUsagePercent(esim.totalDataMb, esim.remainingDataMb);
  const days = remainingDays(esim.expiresAt);
  const fairUse = fairUseText(esim.installInfo);
  const lowData = esim.totalDataMb != null && esim.remainingDataMb != null && esim.remainingDataMb / esim.totalDataMb <= 0.2;
  const readyForActivation = status === "READY" || status === "ACTIVE";
  const canTopUp = esim.topupSupported && hasCapability(esim, "TOPUP");
  const canExtend = hasCapability(esim, "EXTENSION");
  const activation = useQuery({
    queryKey: ["customer-esim-activation", esim.id],
    queryFn: () => getCustomerEsimActivation({ data: { esimId: esim.id } }),
    enabled: activationOpen && readyForActivation && (esim.hasQr || esim.hasInstallInfo),
    staleTime: 60_000,
  });

  useEffect(() => {
    let current = true;
    if (!activation.data?.qrPayload) {
      setQrImage(null);
      return () => { current = false; };
    }
    void QRCode.toDataURL(activation.data.qrPayload, { width: 640, margin: 2 }).then((image) => {
      if (current) setQrImage(image);
    });
    return () => { current = false; };
  }, [activation.data?.qrPayload]);

  return (
    <article className="customer-esim-card snap-start border border-border bg-card shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-muted-foreground">{esim.destinationLabel || "eSIM"}</p>
          <h3 className="mt-1 truncate font-display text-xl font-bold">{esim.packageLabel || "eSIM"}</h3>
        </div>
        <Badge variant="outline" className={STATUS_TONE[status]}>{copy.statuses[status]}</Badge>
      </div>

      {esim.travelerLabel && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4 text-primary" /> {copy.traveler}: <strong className="text-foreground">{esim.travelerLabel}</strong></p>
      )}

      <div className="mt-5 rounded-xl bg-secondary/70 p-4">
        {unlimited ? (
          <div className="flex gap-3"><InfinityIcon className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="font-bold">{copy.unlimited}</p>{fairUse ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{fairUse}</p> : <p className="mt-1 text-xs text-muted-foreground">{copy.usageUnavailable}</p>}</div></div>
        ) : usage != null && esim.totalDataMb != null && esim.remainingDataMb != null ? (
          <>
            <div className="flex items-end justify-between gap-3 text-sm"><span>{copy.remaining}<strong className="ml-1 text-foreground">{formatMegabytes(Math.max(0, esim.remainingDataMb), locale)}</strong></span><span className="text-xs text-muted-foreground">{Math.round(usage)}% {copy.used.toLocaleLowerCase(locale)}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/15"><div className="h-full rounded-full bg-primary transition-transform duration-500" style={{ transform: `translateX(-${100 - usage}%)` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{copy.total}: {formatMegabytes(esim.totalDataMb, locale)}</p>
            {lowData && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-foreground"><AlertTriangle className="size-4 text-warning" />{copy.low}</p>}
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><RefreshCcw className="size-4 text-primary" />{status === "PREPARING" ? copy.usageUpdating : copy.usageUnavailable}</p>
        )}
        {days != null && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-foreground"><CalendarClock className="size-4 text-primary" />{days === 0 ? copy.expiresToday : `${days} ${copy.days}`}</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {readyForActivation && esim.hasQr && <Button variant="outline" className="min-h-11" onClick={() => setActivationOpen(true)}><QrCode />{copy.qr}</Button>}
        {readyForActivation && esim.hasInstallInfo && <Button variant="outline" className="min-h-11" onClick={() => setActivationOpen(true)}><Smartphone />{copy.install}</Button>}
        {canTopUp ? <Button className="min-h-11"><RefreshCcw />{copy.topup}</Button> : <Button asChild variant="cta" className="min-h-11"><Link to="/" search={{ service: "esim" }} hash="finder">{copy.buyAgain}</Link></Button>}
        {canExtend && <Button variant="secondary" className="min-h-11"><CalendarClock />{copy.extend}</Button>}
      </div>

      <Sheet open={activationOpen} onOpenChange={(open) => { setActivationOpen(open); if (!open) setQrImage(null); }}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2">
          <SheetHeader className="pr-10 text-left"><SheetTitle>{copy.activationTitle}</SheetTitle><SheetDescription>{copy.activationText}</SheetDescription></SheetHeader>
          <div className="mt-5 grid gap-4">
            {activation.isLoading && <div className="mx-auto size-48 animate-pulse rounded-xl bg-secondary" />}
            {qrImage && <img src={qrImage} alt={copy.qr} width={640} height={640} className="mx-auto size-52 rounded-xl border border-border bg-card p-2" />}
            {!activation.isLoading && !qrImage && !activation.data?.qrPayload && <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">{copy.noQr}</p>}
            {activation.data?.iccid && <p className="text-sm"><span className="text-muted-foreground">{copy.iccid}</span><strong className="ml-2 break-all">{activation.data.iccid}</strong></p>}
            {activation.data && ["smdp_address", "activation_code", "apn", "manual_instructions"].map((key) => { const value=installString(activation.data.installInfo,key); return value ? <div key={key} className="rounded-xl bg-secondary p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{key.replaceAll("_", " ")}</p><p className="mt-1 break-all text-sm font-semibold">{value}</p></div> : null; })}
            {qrImage && <Button asChild variant="outline"><a href={qrImage} download={`travely-esim-${esim.id}.png`}><Download />{copy.download}</a></Button>}
            <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" />{locale === "tr" ? "Bu bilgiler yalnızca hesabınızda gösterilir." : locale === "de" ? "Diese Daten werden nur in deinem Konto angezeigt." : "These details are shown only in your account."}</p>
          </div>
        </SheetContent>
      </Sheet>
    </article>
  );
}