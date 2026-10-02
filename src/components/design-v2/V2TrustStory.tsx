import { CreditCard, Globe2, Headphones, Lock, Percent, Plane, QrCode, RotateCcw, Smartphone, Timer, Zap, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/travel/Reveal";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: {
    eyebrow: "Neden biz?",
    title: "Seyahatte internet hiç bu kadar kolay olmamıştı.",
    lead: "Daha uygun, daha kolay, daha güvenli.",
    setupTitle: "60 saniyede kurulum", setupText: "Satın al, QR kodunu okut ve eSIM'ini hızlıca kur.", seconds: "saniye",
    refundTitle: "14 gün iade güvencesi", refundText: "eSIM kullanılmadıysa 14 gün içinde koşulsuz iade.", days: "gün",
    savingTitle: "Roaming'e göre %60'a kadar daha uygun", savingText: "Yüksek roaming ücretleri yerine, uygun eSIM paketleriyle tasarruf edin.", upTo: "kadar",
    payTitle: "Güvenli ödeme", payText: "Ödemeniz güvenli ödeme altyapısı üzerinden korunarak işlenir.",
    countries: "190+ ülkede bağlantı", support: "7/24 destek", delivery: "Anında dijital teslimat",
  },
  de: {
    eyebrow: "Warum wir?",
    title: "Internet auf Reisen war noch nie so einfach.",
    lead: "Günstiger, einfacher, sicherer.",
    setupTitle: "Einrichtung in 60 Sekunden", setupText: "Kaufen, QR-Code scannen und eSIM schnell einrichten.", seconds: "Sek.",
    refundTitle: "14 Tage Rückgabegarantie", refundText: "Unbenutzte eSIM innerhalb von 14 Tagen ohne Wenn und Aber zurückgeben.", days: "Tage",
    savingTitle: "Bis zu 60 % günstiger als Roaming", savingText: "Statt hoher Roaming-Gebühren mit günstigen eSIM-Paketen sparen.", upTo: "bis zu",
    payTitle: "Sichere Zahlung", payText: "Deine Zahlung wird über eine sichere Zahlungsinfrastruktur verarbeitet.",
    countries: "Verbindung in 190+ Ländern", support: "24/7 Support", delivery: "Sofortige digitale Lieferung",
  },
  en: {
    eyebrow: "Why us?",
    title: "Internet while travelling has never been this easy.",
    lead: "More affordable, easier, safer.",
    setupTitle: "Set up in 60 seconds", setupText: "Buy, scan the QR code and install your eSIM quickly.", seconds: "sec",
    refundTitle: "14-day refund guarantee", refundText: "Unconditional refund within 14 days if the eSIM is unused.", days: "days",
    savingTitle: "Up to 60% cheaper than roaming", savingText: "Save with affordable eSIM packages instead of high roaming fees.", upTo: "up to",
    payTitle: "Secure payment", payText: "Your payment is processed through a secure payment infrastructure.",
    countries: "Connected in 190+ countries", support: "24/7 support", delivery: "Instant digital delivery",
  },
});

type Copy = (typeof COPY)["en"];
const PAYMENT_BRANDS = ["VISA", "Mastercard", "Apple Pay", "Google Pay"] as const;

/** "Neden biz?" trust section: normal scroll, each part reveals once via IntersectionObserver. */
export function V2TrustStory() {
  const { locale, dir } = useI18n();
  const c = COPY[locale] as Copy;
  const strip: [LucideIcon, string][] = [[Globe2, c.countries], [Headphones, c.support], [Zap, c.delivery]];

  return (
    <section aria-labelledby="trust-story-title" dir={dir} data-trust-story className="relative mt-6 overflow-hidden pb-10 pt-16 lg:pb-16 lg:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,var(--color-primary-soft),transparent_70%)] opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-1">
        <Reveal className="flex justify-center" >
          <div className="flex items-center gap-1 text-primary/50" aria-hidden="true">
            <span className="h-px w-16 border-t border-dashed border-primary/30" />
            <Plane className="size-5 -rotate-12 text-primary/70 rtl:-scale-x-100" />
          </div>
        </Reveal>
        <div className="mx-auto mt-4 max-w-xl text-center">
          <Reveal><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.eyebrow}</p></Reveal>
          <Reveal delay={90}><h2 id="trust-story-title" className="mt-3 text-balance font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">{c.title}</h2></Reveal>
          <Reveal delay={180}><p className="mt-3 text-base text-muted-foreground">{c.lead}</p></Reveal>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5">
          <TrustCard delay={0} title={c.setupTitle} text={c.setupText} visual={<Badge main={<QrCode className="size-9 sm:size-11" />} side={<Timer className="size-4" />} tag={`60 ${c.seconds}`} />} />
          <TrustCard delay={120} title={c.refundTitle} text={c.refundText} visual={<Badge main={<RotateCcw className="size-9 sm:size-11" />} side={<Smartphone className="size-4" />} tag={`14 ${c.days}`} />} />
          <TrustCard delay={0} title={c.savingTitle} text={c.savingText} visual={<Badge main={<Globe2 className="size-9 sm:size-11" />} side={<Percent className="size-4" />} tag="%60" />} />
          <TrustCard delay={120} title={c.payTitle} text={c.payText} visual={<Badge main={<Lock className="size-9 sm:size-11" />} side={<CreditCard className="size-4" />} />}>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PAYMENT_BRANDS.map((b) => <span key={b} className="rounded-md bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground ring-1 ring-border">{b}</span>)}
            </div>
          </TrustCard>
        </ul>

        <Reveal className="mt-8">
          <ul className="grid grid-cols-3 gap-2 rounded-3xl bg-card px-3 py-5 ring-1 ring-border">
            {strip.map(([Icon, label]) => (
              <li key={label} className="flex flex-col items-center gap-2 text-center text-xs font-semibold text-foreground sm:text-sm">
                <Icon className="size-6 text-primary" aria-hidden="true" />{label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function TrustCard({ title, text, visual, delay, children }: { title: string; text: string; visual: React.ReactNode; delay: number; children?: React.ReactNode }) {
  return (
    <li>
      <Reveal delay={delay} className="h-full">
        <article className="h-full rounded-3xl bg-card p-4 shadow-soft ring-1 ring-border sm:p-6">
          {visual}
          <h3 className="mt-4 font-display text-base font-bold leading-snug text-foreground sm:text-lg">{title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{text}</p>
          {children}
        </article>
      </Reveal>
    </li>
  );
}

function Badge({ main, side, tag }: { main: React.ReactNode; side: React.ReactNode; tag?: string }) {
  return (
    <div className="relative h-20 w-24 sm:h-24 sm:w-28" aria-hidden="true">
      <span className="absolute inset-y-0 start-0 grid w-20 place-items-center rounded-[1.4rem] bg-primary text-primary-foreground sm:w-24">{main}</span>
      <span className="absolute -bottom-1 -end-1 flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[11px] font-bold text-primary ring-2 ring-card">{side}{tag}</span>
    </div>
  );
}
