import {
  Check,
  CheckCircle2,
  Globe2,
  Headphones,
  LockKeyhole,
  QrCode,
  RotateCcw,
  Zap,
  type LucideIcon,
} from "lucide-react";
import introPhoto from "@/assets/trust-roaming.jpg";
import setupPhoto from "@/assets/trust-setup.jpg";
import refundPhoto from "@/assets/trust-refund.jpg";
import paymentPhoto from "@/assets/trust-payment.jpg";
import closingPhoto from "@/assets/airport-istanbul.jpg.asset.json";
import { Reveal } from "@/components/travel/Reveal";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: {
    eyebrow: "Neden Travely?",
    title: "Seyahatte internet hiç bu kadar kolay olmamıştı.",
    lead: "Daha uygun, daha kolay, daha güvenli.",
    setupMetric: "60 saniyede",
    setupTitle: "eSIM’inizi kurun",
    setupText: "Satın al, QR kodunu al ve eSIM’ini hızlıca kur. Dakikalar içinde online ol.",
    setupUiTitle: "eSIM Kurulumu",
    setupSteps: ["Satın alındı", "QR kodu alındı", "eSIM kurulumu"],
    refundMetric: "14 gün",
    refundTitle: "İade güvencesi",
    refundText: "eSIM kullanılmadıysa 14 gün içinde koşulsuz iade.",
    orderTitle: "Sipariş Detayı",
    orderProduct: "Türkiye eSIM",
    orderPlan: "10 GB · 30 Gün",
    refundAccepted: "İade talebiniz kabul edildi.",
    refundDestination: "İadeniz ödeme yönteminize yapılacaktır.",
    savingTitle: "Roaming’e göre %60’a kadar daha uygun",
    savingText: "Yüksek roaming ücretleri yerine uygun eSIM paketleriyle seyahat edin.",
    roaming: "Roaming",
    roamingCost: "Daha yüksek maliyet",
    travelyEsim: "Travely eSIM",
    esimCost: "Daha düşük maliyet",
    savingMetric: "%60’a kadar",
    payTitle: "Güvenli ödeme",
    payText: "Ödemeniz güvenli ödeme altyapısı üzerinden korunarak işlenir.",
    payment: "Ödeme",
    protectedPayment: "Korumalı ödeme adımı",
    paymentPending: "Canlı ödeme yöntemleri yakında burada gösterilecek.",
    closingTitle: "Seyahatin her anında yanınızda.",
    countries: "190+ ülkede bağlantı",
    support: "7/24 destek",
    delivery: "Anında dijital teslimat",
  },
  de: {
    eyebrow: "Warum Travely?",
    title: "Internet auf Reisen war noch nie so einfach.",
    lead: "Günstiger, einfacher, sicherer.",
    setupMetric: "In 60 Sekunden",
    setupTitle: "eSIM einrichten",
    setupText: "Kaufen, QR-Code erhalten und eSIM schnell installieren. In wenigen Minuten online.",
    setupUiTitle: "eSIM-Einrichtung",
    setupSteps: ["Gekauft", "QR-Code erhalten", "eSIM installiert"],
    refundMetric: "14 Tage",
    refundTitle: "Rückgabegarantie",
    refundText: "Unbenutzte eSIM innerhalb von 14 Tagen ohne Wenn und Aber zurückgeben.",
    orderTitle: "Bestelldetails",
    orderProduct: "Türkei eSIM",
    orderPlan: "10 GB · 30 Tage",
    refundAccepted: "Rückgabeantrag angenommen.",
    refundDestination: "Die Erstattung erfolgt über deine Zahlungsmethode.",
    savingTitle: "Bis zu 60 % günstiger als Roaming",
    savingText: "Reise mit günstigen eSIM-Paketen statt hoher Roaming-Gebühren.",
    roaming: "Roaming",
    roamingCost: "Höhere Kosten",
    travelyEsim: "Travely eSIM",
    esimCost: "Niedrigere Kosten",
    savingMetric: "Bis zu 60 %",
    payTitle: "Sichere Zahlung",
    payText: "Deine Zahlung wird über eine sichere Zahlungsinfrastruktur verarbeitet.",
    payment: "Zahlung",
    protectedPayment: "Geschützter Zahlungsschritt",
    paymentPending: "Live-Zahlungsmethoden werden demnächst hier angezeigt.",
    closingTitle: "Auf jeder Reise an deiner Seite.",
    countries: "Verbindung in 190+ Ländern",
    support: "24/7 Support",
    delivery: "Sofortige digitale Lieferung",
  },
  en: {
    eyebrow: "Why Travely?",
    title: "Internet while travelling has never been this easy.",
    lead: "More affordable, easier, safer.",
    setupMetric: "In 60 seconds",
    setupTitle: "Install your eSIM",
    setupText: "Buy, receive your QR code and install your eSIM quickly. Get online in minutes.",
    setupUiTitle: "eSIM installation",
    setupSteps: ["Purchased", "QR code received", "eSIM installed"],
    refundMetric: "14 days",
    refundTitle: "Refund guarantee",
    refundText: "Unconditional refund within 14 days if the eSIM is unused.",
    orderTitle: "Order details",
    orderProduct: "Türkiye eSIM",
    orderPlan: "10 GB · 30 days",
    refundAccepted: "Your refund request was accepted.",
    refundDestination: "Your refund will be returned to your payment method.",
    savingTitle: "Up to 60% more affordable than roaming",
    savingText: "Travel with affordable eSIM packages instead of high roaming fees.",
    roaming: "Roaming",
    roamingCost: "Higher cost",
    travelyEsim: "Travely eSIM",
    esimCost: "Lower cost",
    savingMetric: "Up to 60%",
    payTitle: "Secure payment",
    payText: "Your payment is processed through a secure payment infrastructure.",
    payment: "Payment",
    protectedPayment: "Protected payment step",
    paymentPending: "Live payment methods will be shown here soon",
    closingTitle: "With you throughout your journey.",
    countries: "Connected in 190+ countries",
    support: "24/7 support",
    delivery: "Instant digital delivery",
  },
});

type Copy = (typeof COPY)["en"];

function SetupPanel({ c }: { c: Copy }) {
  return (
    <Reveal delay={80} className="trust-story-product-reveal absolute bottom-4 right-4 w-[10.5rem] sm:bottom-6 sm:right-6 sm:w-[12rem]">
      <div className="rounded-2xl border border-card/80 bg-card/95 p-3 shadow-panel backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <QrCode className="size-4 text-primary" aria-hidden="true" />
          <strong className="text-xs text-foreground">{c.setupUiTitle}</strong>
        </div>
        <ul className="mt-2 space-y-1.5">
          {c.setupSteps.map((step) => <li key={step} className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground"><CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />{step}</li>)}
        </ul>
      </div>
    </Reveal>
  );
}

function SetupMetric({ label }: { label: string }) {
  return (
    <Reveal delay={140} className="trust-story-product-reveal absolute left-4 top-4 sm:left-6 sm:top-6">
      <div className="grid size-20 place-items-center rounded-full border border-card/70 bg-primary text-center text-primary-foreground shadow-panel">
        <Zap className="size-4" aria-hidden="true" />
        <strong className="-mt-2 max-w-14 text-[11px] leading-tight">{label}</strong>
      </div>
    </Reveal>
  );
}

function RefundPanel({ c }: { c: Copy }) {
  return (
    <Reveal delay={60} className="trust-story-side-reveal absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[18rem]">
      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-panel backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">{c.orderTitle}</p><p className="mt-1 text-sm font-bold text-foreground">{c.orderProduct}</p><p className="text-[11px] text-muted-foreground">{c.orderPlan}</p></div>
          <RotateCcw className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="mt-3 rounded-xl bg-primary-soft p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-primary"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{c.refundAccepted}</p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{c.refundDestination}</p>
        </div>
      </div>
    </Reveal>
  );
}

function PaymentPanel({ c }: { c: Copy }) {
  return (
    <Reveal delay={80} className="trust-story-side-reveal absolute bottom-4 left-4 w-[11.5rem] sm:bottom-6 sm:left-6 sm:w-[13rem]">
      <div className="rounded-2xl border border-card/80 bg-card/95 p-3.5 shadow-panel backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-foreground">{c.payment}</strong><LockKeyhole className="size-4 text-primary" aria-hidden="true" /></div>
        <div className="mt-3 rounded-xl border border-border bg-secondary/60 px-3 py-2.5"><p className="text-[10px] font-bold text-foreground">{c.protectedPayment}</p></div>
        <p className="mt-3 border-t border-border pt-2.5 text-[9px] font-semibold leading-snug text-muted-foreground">{c.paymentPending}</p>
      </div>
    </Reveal>
  );
}

function Comparison({ c }: { c: Copy }) {
  return (
    <div className="mt-5 space-y-4 sm:mt-7 sm:space-y-5" aria-label={c.savingTitle}>
      <Reveal delay={70} className="trust-story-side-reveal">
        <div><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-foreground">{c.roaming}</p><p className="mt-1 text-xs text-muted-foreground">{c.roamingCost}</p></div></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[88%] rounded-full bg-destructive/65" /></div></div>
      </Reveal>
      <Reveal delay={130} className="trust-story-side-reveal">
        <div><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-foreground">{c.travelyEsim}</p><p className="mt-1 text-xs text-muted-foreground">{c.esimCost}</p></div><strong className="font-display text-2xl text-primary">{c.savingMetric}</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-primary-soft"><div className="h-full w-[42%] rounded-full bg-primary" /></div></div>
      </Reveal>
    </div>
  );
}

/** Native-scroll trust narrative. Visual and copy layers reveal once; scrolling is never intercepted. */
export function V2TrustStory() {
  const { locale, dir } = useI18n();
  const c = COPY[locale] as Copy;
  const closingSignals: [LucideIcon, string][] = [[Globe2, c.countries], [Headphones, c.support], [Zap, c.delivery]];

  return (
    <section aria-labelledby="trust-story-title" dir={dir} data-trust-story className="overflow-clip bg-background pb-8 pt-7 sm:pb-16 sm:pt-14 lg:pb-20">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div data-trust-scene="intro" className="relative mx-auto max-w-6xl overflow-hidden rounded-hero">
          <Reveal className="trust-story-image-reveal"><img src={introPhoto} alt="" width={1408} height={1056} loading="lazy" decoding="async" className="h-[21.25rem] w-full object-cover object-center sm:h-[29rem] lg:h-[32.5rem]" /></Reveal>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" aria-hidden="true" />
          <header className="absolute inset-x-0 bottom-0 px-5 pb-6 sm:px-10 sm:pb-9 lg:max-w-3xl lg:px-14 lg:pb-11">
            <Reveal className="trust-story-text-reveal"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.eyebrow}</p></Reveal>
            <Reveal delay={80} className="trust-story-text-reveal"><h2 id="trust-story-title" className="mt-3 text-balance font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">{c.title}</h2></Reveal>
            <Reveal delay={150} className="trust-story-text-reveal"><p className="mt-4 text-base text-muted-foreground sm:text-lg">{c.lead}</p></Reveal>
          </header>
        </div>

        <ol className="mx-auto max-w-6xl">
          <li data-trust-scene="setup" className="trust-story-flow relative pt-6 sm:pt-10 lg:pt-12">
            <div className="grid items-center gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-12">
              <div className="relative lg:col-span-7"><Reveal className="trust-story-image-reveal"><div className="overflow-hidden rounded-hero"><img src={setupPhoto} alt={c.setupTitle} width={1408} height={792} loading="lazy" decoding="async" className="aspect-video w-full object-cover" /></div></Reveal><SetupMetric label={c.setupMetric} /><SetupPanel c={c} /></div>
              <div className="px-1 lg:col-span-5"><Reveal delay={190} className="trust-story-text-reveal"><h3 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{c.setupTitle}</h3></Reveal><Reveal delay={250} className="trust-story-text-reveal"><p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{c.setupText}</p></Reveal></div>
            </div>
          </li>

          <li data-trust-scene="refund" className="trust-story-flow relative pt-7 sm:pt-10 lg:pt-12">
            <div className="grid items-center gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-12">
               <div className="relative lg:order-2 lg:col-span-7"><Reveal className="trust-story-side-reveal"><div className="overflow-hidden rounded-hero"><img src={refundPhoto} alt={c.refundTitle} width={1408} height={792} loading="lazy" decoding="async" className="aspect-video w-full object-cover" /></div></Reveal><RefundPanel c={c} /></div>
              <div className="px-1 lg:order-1 lg:col-span-5"><Reveal delay={130} className="trust-story-side-reveal"><p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{c.refundMetric}</p></Reveal><Reveal delay={190} className="trust-story-text-reveal"><h3 className="mt-3 flex items-center gap-2 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl"><RotateCcw className="size-5 shrink-0 text-primary" aria-hidden="true" />{c.refundTitle}</h3></Reveal><Reveal delay={250} className="trust-story-text-reveal"><p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{c.refundText}</p></Reveal></div>
            </div>
          </li>

          <li data-trust-scene="saving" className="trust-story-flow relative py-8 sm:py-11 lg:py-12">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
              <div className="lg:col-span-6"><Reveal className="trust-story-side-reveal"><p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{c.savingMetric}</p></Reveal><Reveal delay={70} className="trust-story-text-reveal"><h3 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">{c.savingTitle}</h3></Reveal><Reveal delay={130} className="trust-story-text-reveal"><p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{c.savingText}</p></Reveal></div>
              <div className="relative rounded-hero bg-primary-soft/55 p-4 sm:p-6 lg:col-span-6"><div className="absolute right-5 top-4 font-display text-7xl text-primary/10" aria-hidden="true">%</div><Comparison c={c} /></div>
            </div>
          </li>

          <li data-trust-scene="payment" className="trust-story-flow relative pb-7 sm:pb-11 lg:pb-12">
            <div className="grid items-center gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-12">
              <div className="relative lg:col-span-7"><Reveal className="trust-story-image-reveal"><div className="overflow-hidden rounded-hero"><img src={paymentPhoto} alt={c.payTitle} width={1408} height={792} loading="lazy" decoding="async" className="aspect-video w-full object-cover" /></div></Reveal><PaymentPanel c={c} /></div>
              <div className="px-1 lg:col-span-5"><Reveal delay={150} className="trust-story-side-reveal"><LockKeyhole className="size-6 text-primary" aria-hidden="true" /></Reveal><Reveal delay={210} className="trust-story-text-reveal"><h3 className="mt-3 font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{c.payTitle}</h3></Reveal><Reveal delay={270} className="trust-story-text-reveal"><p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{c.payText}</p></Reveal><Reveal delay={330} className="trust-story-text-reveal"><p className="mt-4 inline-flex max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><LockKeyhole className="size-3.5 shrink-0 text-primary" aria-hidden="true" />{c.paymentPending}</p></Reveal></div>
            </div>
          </li>
        </ol>

        <Reveal className="trust-story-image-reveal mx-auto max-w-6xl">
          <div data-trust-scene="closing" className="relative isolate overflow-hidden rounded-hero">
            <img src={closingPhoto.url} alt="" width={1400} height={900} loading="lazy" decoding="async" className="h-[16.875rem] w-full object-cover sm:h-[24rem] lg:h-[28.125rem]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)] via-[var(--v2-service)]/30 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-primary-foreground sm:px-10 sm:pb-8 lg:px-14 lg:pb-10">
              <h3 className="max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">{c.closingTitle}</h3>
              <ul className="mt-4 grid grid-cols-3 gap-3 border-t border-primary-foreground/35 pt-4 sm:mt-5">
                {closingSignals.map(([Icon, label]) => <li key={label} className="flex min-w-0 flex-col gap-2 text-xs font-semibold leading-snug sm:flex-row sm:items-center sm:text-sm"><Icon className="size-5 shrink-0" aria-hidden="true" /><span>{label}</span></li>)}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}