import { Check, Globe2, Headphones, ShieldCheck, Zap } from "lucide-react";
import setupPhoto from "@/assets/trust-setup.jpg";
import refundPhoto from "@/assets/trust-refund.jpg";
import roamingPhoto from "@/assets/trust-roaming.jpg";
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
    setupMetric: "60 saniye",
    setupTitle: "60 saniyede kurulum",
    setupText: "Satın al, QR kodunu al ve eSIM’ini hızlıca kur.",
    refundMetric: "14 gün",
    refundTitle: "14 gün iade güvencesi",
    refundText: "eSIM kullanılmadıysa 14 gün içinde koşulsuz iade.",
    savingMetric: "%60’a kadar",
    savingTitle: "Roaming’e göre %60’a kadar daha uygun",
    savingText: "Yüksek roaming ücretleri yerine uygun eSIM paketleriyle tasarruf edin.",
    payTitle: "Güvenli ödeme",
    payText: "Ödemeniz güvenli ödeme altyapısı üzerinden korunarak işlenir.",
    closingTitle: "Seyahatin her anında yanınızda.",
    countries: "190+ ülkede bağlantı",
    support: "7/24 destek",
    delivery: "Anında dijital teslimat",
  },
  de: {
    eyebrow: "Warum wir?",
    title: "Internet auf Reisen war noch nie so einfach.",
    lead: "Günstiger, einfacher, sicherer.",
    setupMetric: "60 Sekunden",
    setupTitle: "Einrichtung in 60 Sekunden",
    setupText: "Kaufen, QR-Code erhalten und eSIM schnell einrichten.",
    refundMetric: "14 Tage",
    refundTitle: "14 Tage Rückgabegarantie",
    refundText: "Unbenutzte eSIM innerhalb von 14 Tagen ohne Wenn und Aber zurückgeben.",
    savingMetric: "Bis zu 60 %",
    savingTitle: "Günstiger als Roaming",
    savingText: "Günstige eSIM-Pakete statt hoher Roaming-Gebühren.",
    payTitle: "Sichere Zahlung",
    payText: "Deine Zahlung wird über eine sichere Zahlungsinfrastruktur verarbeitet.",
    closingTitle: "Auf jeder Reise an deiner Seite.",
    countries: "Verbindung in 190+ Ländern",
    support: "24/7 Support",
    delivery: "Sofortige digitale Lieferung",
  },
  en: {
    eyebrow: "Why us?",
    title: "Internet while travelling has never been this easy.",
    lead: "More affordable, easier, safer.",
    setupMetric: "60 seconds",
    setupTitle: "Set up in 60 seconds",
    setupText: "Buy, get your QR code and install your eSIM quickly.",
    refundMetric: "14 days",
    refundTitle: "14-day refund guarantee",
    refundText: "Unconditional refund within 14 days if the eSIM is unused.",
    savingMetric: "Up to 60%",
    savingTitle: "More affordable than roaming",
    savingText: "Affordable eSIM packages instead of high roaming fees.",
    payTitle: "Secure payment",
    payText: "Your payment is processed through a secure payment infrastructure.",
    closingTitle: "With you throughout your journey.",
    countries: "Connected in 190+ countries",
    support: "24/7 support",
    delivery: "Instant digital delivery",
  },
});

type Copy = (typeof COPY)["en"];
type Story = {
  id: string;
  image: string;
  alt: string;
  metric?: string;
  title: string;
  text: string;
  accent?: "refund" | "payment";
};

/** A native-scroll, photography-led trust story. Each scene reveals once without pinning the page. */
export function V2TrustStory() {
  const { locale, dir } = useI18n();
  const c = COPY[locale] as Copy;
  const stories: Story[] = [
    { id: "setup", image: setupPhoto, alt: c.setupTitle, metric: c.setupMetric, title: c.setupTitle, text: c.setupText },
    { id: "refund", image: refundPhoto, alt: c.refundTitle, metric: c.refundMetric, title: c.refundTitle, text: c.refundText, accent: "refund" },
    { id: "saving", image: roamingPhoto, alt: c.savingTitle, metric: c.savingMetric, title: c.savingTitle, text: c.savingText },
    { id: "payment", image: paymentPhoto, alt: c.payTitle, title: c.payTitle, text: c.payText, accent: "payment" },
  ];

  return (
    <section aria-labelledby="trust-story-title" dir={dir} data-trust-story className="bg-background pb-20 pt-20 sm:pb-28 sm:pt-28 lg:pb-36 lg:pt-32">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <Reveal className="trust-story-reveal">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.eyebrow}</p>
          </Reveal>
          <Reveal delay={80} className="trust-story-reveal">
            <h2 id="trust-story-title" className="mt-4 text-balance font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {c.title}
            </h2>
          </Reveal>
          <Reveal delay={140} className="trust-story-reveal">
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{c.lead}</p>
          </Reveal>
        </header>

        <ol className="mx-auto mt-14 max-w-6xl space-y-14 sm:mt-20 sm:space-y-20 lg:space-y-24">
          {stories.map((story, index) => (
            <li key={story.id} className="relative">
              <article className={`grid items-center gap-5 lg:grid-cols-12 lg:gap-14 ${index % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <Reveal className="trust-story-image-reveal lg:col-span-7">
                  <div className="relative overflow-hidden rounded-hero">
                    <img
                      src={story.image}
                      alt={story.alt}
                      width={1408}
                      height={1056}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 motion-safe:hover:scale-[1.015] motion-reduce:transition-none"
                    />
                  </div>
                </Reveal>
                  <div className="px-1 lg:col-span-5 lg:px-0">
                    {story.metric ? (
                      <Reveal className="trust-story-text-reveal">
                        <p className="font-display text-[2.65rem] font-bold leading-none text-primary sm:text-6xl lg:text-7xl">{story.metric}</p>
                      </Reveal>
                    ) : null}
                    <Reveal delay={70} className="trust-story-text-reveal">
                      <div className={`${story.metric ? "mt-4" : "mt-0"} flex items-center gap-2`}>
                        {story.accent === "refund" ? <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        {story.accent === "payment" ? <Check className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{story.title}</h3>
                      </div>
                    </Reveal>
                    <Reveal delay={130} className="trust-story-text-reveal">
                      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{story.text}</p>
                    </Reveal>
                  </div>
              </article>
            </li>
          ))}
        </ol>

        <Reveal className="trust-story-image-reveal mx-auto mt-16 max-w-6xl sm:mt-24">
          <div className="relative isolate overflow-hidden rounded-hero">
            <img src={closingPhoto.url} alt="" width={1400} height={900} loading="lazy" decoding="async" className="h-[25rem] w-full object-cover sm:h-[31rem] lg:h-[36rem]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-service)] via-[var(--v2-service)]/35 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 px-5 pb-7 text-primary-foreground sm:px-10 sm:pb-10 lg:px-14 lg:pb-12">
              <h3 className="max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">{c.closingTitle}</h3>
              <ul className="mt-6 grid grid-cols-3 gap-3 border-t border-primary-foreground/35 pt-5">
                {[[Globe2, c.countries], [Headphones, c.support], [Zap, c.delivery]].map(([Icon, label]) => (
                  <li key={label as string} className="flex min-w-0 flex-col gap-2 text-xs font-semibold leading-snug sm:flex-row sm:items-center sm:text-sm">
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span>{label as string}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}