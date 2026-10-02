import {
  CheckCircle2,
  CreditCard,
  Headphones,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserRound,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/travel/Reveal";
import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: {
    eyebrow: "Neden bizi tercih etmelisin?",
    title: "Seyahatinde sürprizlere yer yok.",
    lead: "Daha kolay, daha ekonomik, daha güvenli.",
    refundTitle: "14 gün koşulsuz iade",
    refundText: "eSIM'ini henüz kullanmadıysan 14 gün içinde kolayca iade edebilirsin.",
    deliveryTitle: "Dakikalar içinde hazır",
    deliveryText: "Satın al, QR kodunu al ve seyahate hazır ol. Fiziksel SIM bekleme.",
    savingTitle: "Roaming'e göre çok daha ekonomik",
    savingText: "Yüksek roaming ücretleriyle uğraşmadan, uygun fiyatlı internet.",
    roaming: "Operatör Roaming",
    daily: "Günlük ücretler",
    esim: "Bizim eSIM",
    packagesFrom: "başlayan paketler",
    supportTitle: "Gerçek destek",
    supportText: "Bir sorun olduğunda yalnız değilsin. WhatsApp üzerinden bize ulaşabilirsin.",
    securePayment: "Güvenli ödeme",
    refundShort: "14 gün iade",
    fastDelivery: "Hızlı teslimat",
    whatsappSupport: "WhatsApp destek",
  },
  de: {
    eyebrow: "Warum solltest du uns wählen?",
    title: "Auf deiner Reise bleibt kein Raum für Überraschungen.",
    lead: "Einfacher, günstiger, sicherer.",
    refundTitle: "14 Tage Rückgabe ohne Wenn und Aber",
    refundText: "Wenn du deine eSIM noch nicht genutzt hast, kannst du sie innerhalb von 14 Tagen einfach zurückgeben.",
    deliveryTitle: "In wenigen Minuten bereit",
    deliveryText: "Kaufen, QR-Code erhalten und reisebereit sein. Keine Wartezeit auf eine physische SIM.",
    savingTitle: "Deutlich günstiger als Roaming",
    savingText: "Preiswertes Internet ohne hohe Roaming-Gebühren.",
    roaming: "Mobilfunk-Roaming",
    daily: "Tägliche Gebühren",
    esim: "Unsere eSIM",
    packagesFrom: "Pakete ab",
    supportTitle: "Persönlicher Support",
    supportText: "Bei einem Problem bist du nicht allein. Du erreichst uns über WhatsApp.",
    securePayment: "Sichere Zahlung",
    refundShort: "14 Tage Rückgabe",
    fastDelivery: "Schnelle Lieferung",
    whatsappSupport: "WhatsApp-Support",
  },
  en: {
    eyebrow: "Why choose us?",
    title: "No surprises on your trip.",
    lead: "Easier, more affordable, more secure.",
    refundTitle: "14-day unconditional refund",
    refundText: "If you have not used your eSIM yet, you can easily return it within 14 days.",
    deliveryTitle: "Ready in minutes",
    deliveryText: "Buy, receive your QR code and get ready to travel. No waiting for a physical SIM.",
    savingTitle: "Much more affordable than roaming",
    savingText: "Affordable internet without dealing with high roaming fees.",
    roaming: "Operator roaming",
    daily: "Daily charges",
    esim: "Our eSIM",
    packagesFrom: "packages from",
    supportTitle: "Real support",
    supportText: "You are not alone when something goes wrong. Reach us on WhatsApp.",
    securePayment: "Secure payment",
    refundShort: "14-day refund",
    fastDelivery: "Fast delivery",
    whatsappSupport: "WhatsApp support",
  },
});

export function V2TrustStory() {
  const { locale, dir } = useI18n();
  const c = COPY[locale];
  const trustItems = [
    { icon: CreditCard, label: c.securePayment },
    { icon: ShieldCheck, label: c.refundShort },
    { icon: Zap, label: c.fastDelivery },
    { icon: Headphones, label: c.whatsappSupport },
  ];
  return (
    <section aria-labelledby="trust-story-title" className="relative my-8 border-y border-border py-4 lg:my-16 lg:py-8" dir={dir} data-trust-story>
      <div className="mx-auto max-w-4xl">
        <Reveal className="flex min-h-[42svh] items-center py-10 lg:min-h-80 lg:py-14">
          <header className="max-w-2xl">
            <p className="text-xs font-bold uppercase text-primary">{c.eyebrow}</p>
            <h2 id="trust-story-title" className="mt-2 text-balance font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">{c.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground lg:text-lg">{c.lead}</p>
            <div className="mt-7 flex items-center gap-3 text-primary" aria-hidden="true">
              <span className="grid size-12 place-items-center rounded-full bg-primary-soft"><Smartphone className="size-6" /></span>
              <span className="h-px w-12 bg-border" />
              <span className="grid size-12 place-items-center rounded-full bg-primary-soft"><QrCode className="size-6" /></span>
              <span className="h-px w-12 bg-border" />
              <span className="grid size-12 place-items-center rounded-full bg-primary-soft"><CheckCircle2 className="size-6" /></span>
            </div>
          </header>
        </Reveal>

        <div className="relative before:absolute before:bottom-0 before:start-6 before:top-0 before:w-px before:bg-border lg:before:start-1/2">
          <StoryStep
            icon={<ShieldCheck className="size-7" />}
            title={c.refundTitle}
            text={c.refundText}
            visual={<div className="grid size-28 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/15"><ShieldCheck className="size-14" strokeWidth={1.5} /></div>}
          />
          <StoryStep
            reverse
            icon={<Zap className="size-7" />}
            title={c.deliveryTitle}
            text={c.deliveryText}
            visual={<DeliveryVisual />}
          />
          <StoryStep
            icon={<CreditCard className="size-7" />}
            title={c.savingTitle}
            text={c.savingText}
            visual={<PriceComparison roaming={c.roaming} daily={c.daily} esim={c.esim} packagesFrom={c.packagesFrom} />}
          />
          <StoryStep
            reverse
            icon={<Headphones className="size-7" />}
            title={c.supportTitle}
            text={c.supportText}
            visual={<SupportVisual />}
          />
        </div>

        <Reveal className="py-10 lg:py-12">
          <ul className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border sm:grid-cols-4 sm:divide-y-0" aria-label={c.eyebrow}>
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex min-h-20 items-center gap-2 px-3 py-3 text-xs font-semibold text-foreground sm:justify-center">
                <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function StoryStep({ icon, title, text, visual, reverse = false }: { icon: ReactNode; title: string; text: string; visual: ReactNode; reverse?: boolean }) {
  return (
    <Reveal className="relative flex min-h-[48svh] items-center py-10 ps-16 lg:min-h-[25rem] lg:ps-0">
      <article className={`grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <span className="absolute start-0 top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-card text-primary shadow-soft ring-1 ring-border lg:start-1/2 lg:-translate-x-1/2 rtl:lg:translate-x-1/2" aria-hidden="true">{icon}</span>
          <h3 className="text-balance font-display text-2xl font-bold leading-tight text-foreground lg:text-3xl">{title}</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">{text}</p>
        </div>
        <div className="flex min-h-40 items-center justify-center" aria-hidden="true">{visual}</div>
      </article>
    </Reveal>
  );
}

function DeliveryVisual() {
  return (
    <div className="relative flex items-center gap-3 text-primary">
      <span className="grid h-36 w-20 place-items-center rounded-[1.4rem] bg-card shadow-panel ring-2 ring-primary"><Smartphone className="size-9" strokeWidth={1.5} /></span>
      <span className="grid size-14 place-items-center rounded-xl bg-card shadow-soft ring-1 ring-border"><QrCode className="size-9" /></span>
      <Zap className="absolute -end-3 -top-3 size-7 fill-primary-soft" />
    </div>
  );
}

function PriceComparison({ roaming, daily, esim, packagesFrom }: { roaming: string; daily: string; esim: string; packagesFrom: string }) {
  return (
    <div className="grid w-full max-w-sm grid-cols-2 gap-2">
      <div className="rounded-xl bg-secondary p-3 ring-1 ring-border">
        <p className="text-xs font-bold text-muted-foreground">{roaming}</p>
        <p className="mt-3 text-[10px] text-muted-foreground">{daily}</p>
        <strong className="mt-0.5 block font-display text-xl text-foreground">10–15 €</strong>
      </div>
      <div className="rounded-xl bg-primary-soft p-3 ring-1 ring-primary/15">
        <p className="text-xs font-bold text-primary">{esim}</p>
        <strong className="mt-3 block font-display text-xl text-primary">1,99 €'dan</strong>
        <p className="mt-0.5 text-[10px] text-foreground">{packagesFrom}</p>
      </div>
    </div>
  );
}

function SupportVisual() {
  return (
    <div className="relative flex h-40 w-full max-w-xs items-center justify-center">
      <div className="flex -space-x-3 rtl:space-x-reverse">
        {[0, 1, 2].map((item) => <span key={item} className="grid size-14 place-items-center rounded-full bg-card text-primary shadow-soft ring-2 ring-background"><UserRound className="size-6" /></span>)}
      </div>
      <span className="absolute bottom-3 end-8 grid size-14 place-items-center rounded-full bg-success text-primary-foreground shadow-brand"><WhatsAppLogo className="size-7" /></span>
    </div>
  );
}