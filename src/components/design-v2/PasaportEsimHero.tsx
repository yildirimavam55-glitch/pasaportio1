import { localize } from "@/i18n/overlay";
// ============= Full file contents =============

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/i18n";
import { HeroPromotion } from "./HeroPromotion";
import { v2Text, type V2Section } from "@/domain/storefront/v2";
import { trustBandItems } from "./hero-trust-band";
import { useWhatsAppHref } from "@/components/travel/WhatsAppSupportWidget";
import { combinedSourceRating, starFill } from "@/domain/storefront/review-carousel";
import { CalendarCheck, Mail, QrCode } from "lucide-react";
/** Sample figures only so the strip layout can be reviewed in the dev preview; never shipped, never presented as verified. */
const PREVIEW_SAMPLE_RATING = import.meta.env.DEV ? { rating: 4.8, displayRating: 4.8, count: 2000 } : null;
import fallbackHeroDesktop from "@/assets/pasaport-final-coast.jpg";
import fallbackHeroMobile from "@/assets/pasaport-final-coast-mobile.jpg";
import { AntennaSignal } from "./AntennaSignal";
import { useTrustIconEntry } from "./use-trust-icon-entry";

const COPY = localize({
 tr: { titleA: "Seyahatte internetin", titleB: "hazır.", subtitle: "190+ ülkede eSIM ile bağlantıda kal.", delivery: "Hızlı teslimat", setup: "Kolay kurulum", payment: "Ödeme bilgileri", support: "WhatsApp destek", deliveryInfo: "eSIM teslim bilgileri", setupInfo: "Adım adım kurulum", paymentInfo: "Ödeme seçeneklerini incele", supportInfo: "Kurulum için yardım", sample: "Örnek" },
  de: { titleA: "Dein Internet", titleB: "für unterwegs.", subtitle: "Mit eSIM in über 190 Ländern verbunden.", delivery: "Schnelle Lieferung", setup: "Einfach einrichten", payment: "Infos zur Zahlung", support: "WhatsApp Support", deliveryInfo: "Informationen zur eSIM-Lieferung", setupInfo: "Installation Schritt für Schritt", paymentInfo: "Zahlungsoptionen ansehen", supportInfo: "Hilfe bei der Einrichtung", sample: "Beispiel" },
  en: { titleA: "Your travel internet", titleB: "is ready.", subtitle: "Stay connected with eSIM in 190+ countries.", delivery: "Fast delivery", setup: "Easy installation", payment: "Payment information", support: "WhatsApp support", deliveryInfo: "eSIM delivery information", setupInfo: "Step-by-step installation", paymentInfo: "Review payment options", supportInfo: "Help with installation", sample: "Sample" },
  ar: { titleA: "إنترنت رحلتك", titleB: "جاهز.", subtitle: "ابقَ متصلاً عبر eSIM في أكثر من 190 دولة.", delivery: "تسليم سريع", setup: "إعداد سهل", payment: "معلومات الدفع", support: "دعم واتساب", deliveryInfo: "معلومات تسليم eSIM", setupInfo: "التثبيت خطوة بخطوة", paymentInfo: "اطّلع على خيارات الدفع", supportInfo: "المساعدة في التثبيت", sample: "نموذج" },
});
const oldTitles = ["Yurt dışında bağlantıda kal.", "Im Ausland verbunden bleiben.", "Stay connected abroad.", "Her yerde bağlantıda kal.", "Überall verbunden bleiben.", "Stay connected everywhere.", "ابقَ متصلاً أينما كنت.", "ابقَ على اتصال في الخارج."];
export function PasaportEsimHero({ section, image, mobileImage, benefits, reviews, children }: { section: V2Section; image: string; mobileImage?: string | undefined; benefits?: V2Section | undefined; reviews?: V2Section | undefined; children: ReactNode }) {
 const { locale, uiLocale } = useI18n();
 const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
 const storedTitle = v2Text(section, "title", locale);
 const approved = !storedTitle || oldTitles.includes(storedTitle);
 const fixture = section.mediaId === "2096d4af-5b89-49ad-b19f-7ca95ec54160" || section.mediaId === "builtin:esim-hero" || !image;
 const heroImage = fixture ? fallbackHeroDesktop : image;
 const mobileFixture = !mobileImage || section.mobileMediaId === '2096d4af-5b89-49ad-b19f-7ca95ec54160' || section.mobileMediaId === 'builtin:esim-hero';
 const heroMobile = mobileFixture ? (fixture ? fallbackHeroMobile : heroImage) : mobileImage;
 const desktop = fixture ? undefined : section.imageDisplay;
 const mobile = mobileFixture && fixture ? undefined : section.mobileImageDisplay;
  const style = { "--hero-desktop-position": desktop ? `${desktop.x}% ${desktop.y}%` : `50% calc(50px - 11.2113vw)`, "--hero-desktop-scale": (desktop?.zoom ?? 100) / 100, "--hero-desktop-fit": desktop?.fit ?? "cover", "--hero-mobile-position": `${mobile?.x ?? 88}% ${mobile?.y ?? 62}%`, "--hero-mobile-scale": (mobile?.zoom ?? 100) / 100, "--hero-mobile-fit": mobile?.fit ?? "cover" } as CSSProperties;
 return <><section data-testid="pasaport-esim-hero" className="pasaport-final-hero" style={style} data-has-trust-strip="true">
  <picture className="final-hero-photo"><source media="(min-width:1024px)" srcSet={heroImage}/><img src={heroMobile} alt="" width={1672} height={941} fetchPriority="high" loading="eager" decoding="async" onError={event => { const picture = event.currentTarget.parentElement; picture?.querySelector('source')?.remove(); const fallback = window.matchMedia("(min-width: 1024px)").matches ? fallbackHeroDesktop : fallbackHeroMobile; if (event.currentTarget.src !== new URL(fallback, window.location.origin).href) event.currentTarget.src = fallback; }} />{fixture && mobileFixture && <AntennaSignal />}</picture>
  <div className="final-hero-shade" aria-hidden="true" />
  <div className="final-hero-heading"><h1>{approved ? <>{c.titleA} <span className="final-hero-accent">{c.titleB}</span></> : storedTitle}</h1><p>{approved ? c.subtitle : v2Text(section, "subtitle", locale)}</p></div>
  <div className="final-hero-search">{children}</div>
  <div className="final-hero-gift"><HeroPromotion /></div>
  {/* One shared strip: below the photo on mobile, inside it on desktop. */}
  <div className="final-hero-trust"><PasaportMobileBenefits section={benefits} reviews={reviews} /></div>
 </section></>;
}
/** Google "G" mark, inline so no extra asset is loaded. */
function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.94 6.71-4.94z"/></svg>;
}
/** Trustpilot star mark. */
function TrustpilotMark() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#00B67A"/><path fill="#fff" d="M12 4.6l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 16.4l-4.6 2.6.9-5.2-3.8-3.7 5.2-.8z"/></svg>;
}
function StripStars({ rating }: { rating: number }) {
  return <span className="trust-strip-stars" role="img" aria-label={`${rating.toFixed(1)} / 5`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className="trust-strip-star"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path className="star-base" d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/><path className="star-fill" d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" style={{ clipPath: `inset(0 ${100 - starFill(rating, i)}% 0 0)` }}/></svg></span>)}</span>;
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
  const benefits = ["delivery", "refund", "setup"].flatMap((id) => { const item = items.find((entry) => entry.id === id); return item ? [item] : []; });
  const reviewsLabel = uiLocale === "de" ? "Bewertungen" : locale === "tr" ? "değerlendirme" : "reviews";
  const outOf = uiLocale === "de" ? "aus 5" : locale === "tr" ? "/ 5" : "out of 5";
  return (
    <div ref={ref} className="hero-trust-strip" data-trust-entered={entered} data-has-rating={Boolean(summary)}>
        <div className="trust-strip-segment trust-strip-rating">
          <span className="trust-strip-marks"><GoogleMark /><TrustpilotMark /></span>
          {summary && <span className="trust-strip-rating-text">
            <strong>{new Intl.NumberFormat(uiLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.displayRating)} {outOf}</strong>
            <StripStars rating={summary.rating} />
            <small>{new Intl.NumberFormat(uiLocale).format(summary.count)} {reviewsLabel}{isSample ? <em className="trust-strip-sample" title={c.sample}>{c.sample}</em> : null}</small>
          </span>}
        </div>
      {benefits.map(({ id, label, description }) => {
        const Icon = STRIP_ICONS[id] ?? Mail;
        return (
          <div key={id} className="trust-strip-segment" data-trust-kind={id}>
            <span className="trust-strip-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
            <span className="trust-strip-text"><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>
          </div>
        );
      })}
    </div>
  );
}
