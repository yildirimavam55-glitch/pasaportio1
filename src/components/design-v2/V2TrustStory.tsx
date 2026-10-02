import { Check, ShieldCheck } from "lucide-react";
import setupPhoto from "@/assets/trust-setup.jpg";
import refundPhoto from "@/assets/trust-refund.jpg";
import roamingPhoto from "@/assets/trust-roaming.jpg";
import paymentPhoto from "@/assets/trust-payment.jpg";
import { Reveal } from "@/components/travel/Reveal";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: {
    eyebrow: "Neden biz?",
    title: "Seyahatte internet hiç bu kadar kolay olmamıştı.",
    lead: "Daha uygun, daha kolay, daha güvenli.",
    setupMetric: "60 saniye",
    setupTitle: "60 saniyede kurulum",
    setupText: "Satın al, QR kodunu al ve eSIM’ini hızlıca kur.",
    refundMetric: "14 gün",
    refundTitle: "14 gün iade güvencesi",
    refundText: "eSIM kullanılmadıysa 14 gün içinde koşulsuz iade.",
    savingMetric: "%60’a kadar",
    savingTitle: "Roaming’e göre daha uygun",
    savingText: "Yüksek roaming ücretleri yerine uygun eSIM paketleri.",
    payTitle: "Güvenli ödeme",
    payText: "Ödemeniz güvenli ödeme altyapısı üzerinden korunarak işlenir.",
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
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 id="trust-story-title" className="mt-4 text-balance font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {c.title}
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{c.lead}</p>
          </Reveal>
        </header>

        <ol className="mx-auto mt-16 max-w-6xl space-y-24 sm:mt-24 sm:space-y-32 lg:space-y-40">
          {stories.map((story, index) => (
            <li key={story.id}>
              <Reveal>
                <article className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-16 ${index % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="relative overflow-hidden rounded-hero lg:col-span-7">
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

                  <div className="px-1 lg:col-span-5 lg:px-0">
                    {story.metric ? (
                      <p className="font-display text-5xl font-bold leading-none text-primary sm:text-6xl lg:text-7xl">
                        {story.metric}
                      </p>
                    ) : null}
                    <div className={`mt-${story.metric ? "5" : "0"} flex items-center gap-2`}>
                      {story.accent === "refund" ? <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
                      {story.accent === "payment" ? <Check className="size-5 shrink-0 text-primary" aria-hidden="true" /> : null}
                      <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{story.title}</h3>
                    </div>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{story.text}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}