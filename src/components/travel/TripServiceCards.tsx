import { CalendarDays, Clock3, Download, LifeBuoy, Mail, PlaneTakeoff, QrCode, RefreshCw, ShieldCheck, Signal, Ticket, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { FULFILLMENT_COPY, type CustomerTrip, type EsimFulfillment, type LoungeFulfillment, type TripService } from "@/domain/fulfillment/types";

function StatusRow({ paymentText, deliveryText, tone }: { paymentText: string; deliveryText: string; tone: "ok" | "wait" | "warn" }) {
  const toneClass = tone === "ok" ? "bg-primary-soft text-primary" : tone === "wait" ? "bg-secondary text-muted-foreground" : "bg-accent-soft text-foreground";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {paymentText}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${toneClass}`}>
        <Clock3 className="size-3.5" aria-hidden="true" />
        {deliveryText}
      </span>
    </div>
  );
}

function CodePlaceholder({ label, notice }: { label: string; notice: string }) {
  return (
    <div className="mx-auto grid w-44 gap-2 text-center">
      <div className="grid size-44 place-items-center rounded-xl border border-dashed border-border bg-secondary/60" role="img" aria-label={label}>
        <QrCode className="size-16 text-primary" aria-hidden="true" />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{notice}</span>
    </div>
  );
}

function DeliveryActions({ service }: { service: TripService }) {
  const { locale } = useI18n();
  const copy = FULFILLMENT_COPY[locale];
  const [emailState, setEmailState] = useState(service.deliveryEmailState);
  const ready = service.fulfillment === "READY" || service.fulfillment === "DELIVERY_EMAIL_FAILED";

  if (service.fulfillment === "FULFILLMENT_PROCESSING") {
    return (
      <div className="mt-4 rounded-xl bg-secondary/70 p-3 text-sm text-muted-foreground">{copy.processingHint}</div>
    );
  }
  if (service.fulfillment === "FULFILLMENT_FAILED") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-accent-soft p-3 text-sm">
        <span>{copy.emailFailedHint}</span>
        <Button asChild size="sm" variant="outline"><a href="#support"><LifeBuoy /> {copy.support}</a></Button>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!ready}>
              {service.kind === "ESIM" ? <QrCode /> : <Ticket />}
              {service.kind === "ESIM" ? copy.showQr : copy.showEntryCode}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogTitle>{service.kind === "ESIM" ? copy.qrTitle : copy.voucherTitle}</DialogTitle>
            <DialogDescription>{copy.qrHint}</DialogDescription>
            <CodePlaceholder label={service.kind === "ESIM" ? copy.showQr : copy.showEntryCode} notice={copy.mockNotice} />
          </DialogContent>
        </Dialog>
        {service.kind === "ESIM" && (
          <Button size="sm" variant="outline" disabled={!ready}><Download /> {copy.installGuide}</Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={!ready || emailState === "QUEUED"}
          onClick={() => setEmailState("QUEUED")}
        >
          <RefreshCw /> {copy.resendEmail}
        </Button>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="size-3.5" aria-hidden="true" />
        {copy.deliveryLabel}: {service.deliveryEmail} · {copy.email[emailState]}
        {emailState === "FAILED" && <span>· {copy.emailFailedHint}</span>}
      </p>
    </div>
  );
}

function EsimCard({ service }: { service: EsimFulfillment }) {
  const { locale } = useI18n();
  const copy = FULFILLMENT_COPY[locale];
  return (
    <article className="rounded-card border border-border bg-card p-4 shadow-card">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Signal className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">
            <span aria-hidden="true">{service.flag} </span>
            {service.destinationLabel}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{service.packageLabel}</p>
        </div>
      </header>
      <div className="mt-3"><StatusRow paymentText={copy.payment[service.payment]} deliveryText={copy.fulfillment[service.fulfillment]} tone={service.fulfillment === "READY" ? "ok" : service.fulfillment === "FULFILLMENT_PROCESSING" ? "wait" : "warn"} /></div>
      {(service.remainingData || service.expiresOn) && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {service.remainingData && (<div><dt className="text-xs text-muted-foreground">Data</dt><dd className="font-semibold">{service.remainingData}{service.totalData ? ` / ${service.totalData}` : ""}</dd></div>)}
          {service.expiresOn && (<div><dt className="text-xs text-muted-foreground">{locale === "tr" ? "Geçerlilik" : locale === "de" ? "Gültig bis" : "Valid until"}</dt><dd className="font-semibold">{service.expiresOn}</dd></div>)}
        </dl>
      )}
      <DeliveryActions service={service} />
    </article>
  );
}

function LoungeCard({ service }: { service: LoungeFulfillment }) {
  const { locale } = useI18n();
  const copy = FULFILLMENT_COPY[locale];
  return (
    <article className="rounded-card border border-border bg-card p-4 shadow-card">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><PlaneTakeoff className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">
            <span aria-hidden="true">{service.flag} </span>
            {service.iata} {service.airportLabel}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {service.loungeName}
            {service.terminal ? ` · ${service.terminal}` : ""}
          </p>
        </div>
      </header>
      <div className="mt-3"><StatusRow paymentText={copy.payment[service.payment]} deliveryText={copy.fulfillment[service.fulfillment]} tone={service.fulfillment === "READY" ? "ok" : service.fulfillment === "FULFILLMENT_PROCESSING" ? "wait" : "warn"} /></div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />{locale === "tr" ? "Tarih" : locale === "de" ? "Datum" : "Date"}</dt><dd className="font-semibold">{service.visitAt}</dd></div>
        <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" aria-hidden="true" />{locale === "tr" ? "Yolcu" : locale === "de" ? "Reisende" : "Travelers"}</dt><dd className="font-semibold">{service.travelers}</dd></div>
        {service.bookingReference && (
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">{locale === "tr" ? "Rezervasyon referansı" : locale === "de" ? "Buchungsreferenz" : "Booking reference"}</dt><dd className="font-mono text-sm font-semibold">{service.bookingReference}</dd></div>
        )}
      </dl>
      <DeliveryActions service={service} />
    </article>
  );
}

export function TripCard({ trip }: { trip: CustomerTrip }) {
  const { locale } = useI18n();
  const copy = FULFILLMENT_COPY[locale];
  return (
    <section className="rounded-card border border-border bg-secondary/40 p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">{trip.title}</h2>
          <p className="text-sm text-muted-foreground">{trip.dateLabel}</p>
        </div>
        {trip.isMock && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold">{copy.mockNotice}</span>}
      </header>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {trip.services.map((service) => (service.kind === "ESIM" ? <EsimCard key={service.id} service={service} /> : <LoungeCard key={service.id} service={service} />))}
      </div>
    </section>
  );
}
