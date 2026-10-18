import type { ReactNode } from "react";
import { CalendarCheck, Mail, Package, QrCode, Smartphone } from "lucide-react";
import { localize } from "@/i18n/overlay";
import { useI18n } from "@/i18n";
import { HeroPromotion } from "./HeroPromotion";
import type { V2Section } from "@/domain/storefront/v2";
import { combinedSourceRating, starFill } from "@/domain/storefront/review-carousel";
import { heroHeadingParts, publishedHeroPerk, publishedHeroText } from "./hero-cms-copy";
import { trustBandItems } from "./hero-trust-band";
import { useWhatsAppHref } from "@/components/travel/WhatsAppSupportWidget";
import { useTrustIconEntry } from "./use-trust-icon-entry";
import { CataloguePhoto } from "./CataloguePhoto";
import { HERO_SUMMIT_ID, STOREFRONT_IMAGE_SLOTS, resolveHeroMediaId } from "./storefront-image";
import esimHeroSummit from "@/assets/pasaport-summit.jpg";
import esimHeroSeaside from "@/assets/pasaport-seaside-hero.jpg";

/** Sample figures only so the strip layout can be reviewed in the dev preview; never shipped, never presented as verified. */
const PREVIEW_SAMPLE_RATING = import.meta.env.DEV ? { rating: 4.8, displayRating: 4.8, count: 2000 } : null;

const COPY = localize({
  tr: {
    titleBefore: "Dünyada",
    titleAccent: "kesintisiz",
    titleAfter: "internet seninle.",
    subtitle: "eSIM ile 190+ ülkede her zaman bağlı kal.",
    delivery: "Hızlı teslimat",
    deliveryInfo: "Dakikalar içinde",
    setup: "Kolay kurulum",
    setupInfo: "Sadece birkaç adım",
    refund: "14 gün iade",
    refundInfo: "Esnek ve güvenli alışveriş",
    phoneActive: "Anında aktif",
    payment: "Ödeme bilgileri",
    support: "WhatsApp destek",
    paymentInfo: "Ödeme seçeneklerini incele",
    supportInfo: "Kurulum için yardım",
    sample: "Örnek",
  },
  de: {
    titleBefore: "Weltweit",
    titleAccent: "unterbrechungsfrei",
    titleAfter: "online mit dir.",
    subtitle: "Mit eSIM in über 190 Ländern immer verbunden.",
    delivery: "Schnelle Lieferung",
    deliveryInfo: "In wenigen Minuten",
    setup: "Einfach einrichten",
    setupInfo: "Nur ein paar Schritte",
    refund: "14 Tage Rückgabe",
    refundInfo: "Flexibel und sicher einkaufen",
    phoneActive: "Sofort aktiv",
    payment: "Infos zur Zahlung",
    support: "WhatsApp Support",
    paymentInfo: "Zahlungsoptionen ansehen",
    supportInfo: "Hilfe bei der Einrichtung",
    sample: "Beispiel",
  },
  en: {
    titleBefore: "Worldwide",
    titleAccent: "uninterrupted",
    titleAfter: "internet with you.",
    subtitle: "Stay always connected with eSIM in 190+ countries.",
    delivery: "Fast delivery",
    deliveryInfo: "In minutes",
    setup: "Easy installation",
    setupInfo: "Just a few steps",
    refund: "14-day refunds",
    refundInfo: "Flexible and secure shopping",
    phoneActive: "Active instantly",
    payment: "Payment information",
    support: "WhatsApp support",
    paymentInfo: "Review payment options",
    supportInfo: "Help with installation",
    sample: "Sample",
  },
  ar: {
    titleBefore: "إنترنت",
    titleAccent: "متواصل",
    titleAfter: "حول العالم معك.",
    subtitle: "ابقَ متصلاً دائمًا عبر eSIM في أكثر من 190 دولة.",
    delivery: "تسليم سريع",
    deliveryInfo: "خلال دقائق",
    setup: "إعداد سهل",
    setupInfo: "بضع خطوات فقط",
    refund: "استرداد خلال 14 يومًا",
    refundInfo: "تسوق مرن وآمن",
    phoneActive: "نشط فورًا",
    payment: "معلومات الدفع",
    support: "دعم واتساب",
    paymentInfo: "اطّلع على خيارات الدفع",
    supportInfo: "المساعدة في التثبيت",
    sample: "نموذج",
  },
});

export function PasaportEsimHero({
  section,
  image,
  mobileImage,
  benefits,
  reviews: _reviews,
  children,
}: {
  section: V2Section;
  image: string;
  mobileImage?: string | undefined;
  benefits?: V2Section | undefined;
  reviews?: V2Section | undefined;
  children: ReactNode;
}) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
  const desktopId = resolveHeroMediaId(section.mediaId);
  const mobileId = resolveHeroMediaId(section.mediaId, section.mobileMediaId, true);
  const desktopSrc = desktopId === HERO_SUMMIT_ID ? esimHeroSummit : (image || esimHeroSummit);
  const mobileSrc = mobileId === HERO_SUMMIT_ID ? esimHeroSummit : (mobileImage || desktopSrc);
  const afterWords = c.titleAfter.trim().split(/\s+/);
  const mintTitle = uiLocale === "ar" || afterWords.length === 0 ? c.titleAccent : `${c.titleAccent} ${afterWords[0]}`;
  const titleEnd = uiLocale === "ar" ? c.titleAfter : afterWords.slice(1).join(" ");
  const heading = heroHeadingParts(
    publishedHeroText(section, "title", locale, ""),
    publishedHeroText(section, "eyebrow", locale, ""),
    { kicker: c.titleBefore, accent: mintTitle, end: titleEnd },
  );
  const subtitle = publishedHeroText(section, "subtitle", locale, c.subtitle);
  const delivery = publishedHeroPerk(benefits, "delivery", locale, { label: c.delivery, info: c.deliveryInfo });
  const setup = publishedHeroPerk(benefits, "setup", locale, { label: c.setup, info: c.setupInfo });
  const refund = publishedHeroPerk(benefits, "refund", locale, { label: c.refund, info: c.refundInfo });
  return (
    <section data-testid="pasaport-esim-hero" className="pasaport-final-hero pasaport-premium-hero">
      <picture className="final-hero-photo">
        {desktopSrc && mobileSrc && desktopSrc !== mobileSrc ? <source media="(min-width: 768px)" srcSet={desktopSrc} /> : null}
        <CataloguePhoto
          src={mobileSrc || desktopSrc}
          fallbacks={[esimHeroSummit, esimHeroSeaside, image, mobileImage]}
          alt=""
          priority
          imageKey={STOREFRONT_IMAGE_SLOTS.heroDesktop}
        />
      </picture>
      <div className="final-hero-shade" aria-hidden="true" />
      <div className="final-hero-heading">
        <h1>
          <span className="final-hero-kicker">{heading.kicker}</span>
          <span className="final-hero-accent">{heading.accent}</span>
          {heading.end ? <span className="final-hero-end">{heading.end}</span> : null}
        </h1>
        <p>{subtitle}</p>
        <ul className="final-hero-perks">
          <li>
            <span className="final-hero-perk-icon" aria-hidden="true">
              <Package size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>{delivery.label}</strong>
              <small>{delivery.info}</small>
            </span>
          </li>
          <li>
            <span className="final-hero-perk-icon" aria-hidden="true">
              <Smartphone size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>{setup.label}</strong>
              <small>{setup.info}</small>
            </span>
          </li>
          <li>
            <span className="final-hero-perk-icon" aria-hidden="true">
              <CalendarCheck size={18} strokeWidth={1.75} />
            </span>
            <span>
              <strong>{refund.label}</strong>
              <small>{refund.info}</small>
            </span>
          </li>
        </ul>
      </div>
      <div className="final-hero-search">{children}</div>
      <div className="final-hero-gift">
        <HeroPromotion />
      </div>
    </section>
  );
}

/** Google "G" mark, inline so no extra asset is loaded. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.94 6.71-4.94z" />
    </svg>
  );
}

/** Trustpilot star mark. */
function TrustpilotMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#00B67A" />
      <path fill="#fff" d="M12 4.6l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 16.4l-4.6 2.6.9-5.2-3.8-3.7 5.2-.8z" />
    </svg>
  );
}

function StripStars({ rating }: { rating: number }) {
  return (
    <span className="trust-strip-stars" role="img" aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="trust-strip-star">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path className="star-base" d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
            <path className="star-fill" d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" style={{ clipPath: `inset(0 ${100 - starFill(rating, i)}% 0 0)` }} />
          </svg>
        </span>
      ))}
    </span>
  );
}

const STRIP_ICONS: Record<string, typeof Mail> = { delivery: Mail, refund: CalendarCheck, setup: QrCode };

/**
 * Premium glass trust strip below the hero search: optional verified Google+Trustpilot
 * summary (rendered only when both sources are verified in the CMS) plus the delivery,
 * refund and setup benefits from the Admin-edited BENEFIT_ROW section. Informational only.
 */
export function PasaportMobileBenefits({ section, reviews }: { section?: V2Section | undefined; reviews?: V2Section | undefined }) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
  const items = trustBandItems(section, locale, useWhatsAppHref());
  const { ref, entered } = useTrustIconEntry();
  const verified = combinedSourceRating(reviews?.trust?.sourceRatings);
  const summary = verified ?? PREVIEW_SAMPLE_RATING;
  const isSample = !verified && Boolean(summary);
  const benefits = ["delivery", "refund", "setup"].flatMap((id) => {
    const item = items.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  const reviewsLabel = uiLocale === "de" ? "Bewertungen" : locale === "tr" ? "değerlendirme" : "reviews";
  const outOf = uiLocale === "de" ? "aus 5" : locale === "tr" ? "/ 5" : "out of 5";
  return (
    <div ref={ref} className="hero-trust-strip" data-trust-entered={entered} data-has-rating={Boolean(summary)}>
      <div className="trust-strip-segment trust-strip-rating">
        <span className="trust-strip-marks">
          <GoogleMark />
          <TrustpilotMark />
        </span>
        {summary && (
          <span className="trust-strip-rating-text">
            <strong>
              {new Intl.NumberFormat(uiLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.displayRating)} {outOf}
            </strong>
            <StripStars rating={summary.rating} />
            <small>
              {new Intl.NumberFormat(uiLocale).format(summary.count)} {reviewsLabel}
              {isSample ? (
                <em className="trust-strip-sample" title={c.sample}>
                  {c.sample}
                </em>
              ) : null}
            </small>
          </span>
        )}
      </div>
      {benefits.map(({ id, label, description }) => {
        const Icon = STRIP_ICONS[id] ?? Mail;
        return (
          <div key={id} className="trust-strip-segment" data-trust-kind={id}>
            <span className="trust-strip-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="trust-strip-text">
              <strong>{label}</strong>
              {description ? <small>{description}</small> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
