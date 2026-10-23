import { HeroHeading } from "./HeroHeading";
import { HeroTrustCards } from "./HeroTrustCards";
import { HERO_COPY as COPY } from "@/domain/storefront/hero-copy";
// ============= Full file contents =============

import type { ReactNode } from "react";
import { V2HeroView } from "./V2HeroView";
import { resolveHeroCopy } from "@/domain/storefront/hero-presentation";
import { useI18n } from "@/i18n";
import { HeroPromotion } from "./HeroPromotion";
import { defaultV2Page, v2Text, type V2Section } from "@/domain/storefront/v2";
import { combinedSourceRating, starFill } from "@/domain/storefront/review-carousel";
/** Sample figures only so the strip layout can be reviewed in the dev preview; never shipped, never presented as verified. */
const PREVIEW_SAMPLE_RATING = import.meta.env.DEV ? { rating: 4.8, displayRating: 4.8, count: 2000 } : null;
import { useTrustIconEntry } from "./use-trust-icon-entry";

export function PasaportEsimHero({ section, image, tabletImage, mobileImage, benefits, reviews, resolve, children }: { section: V2Section; image: string; tabletImage?: string | undefined; mobileImage?: string | undefined; benefits?: V2Section | undefined; reviews?: V2Section | undefined; resolve?: ((id:string|null|undefined)=>string|undefined)|undefined; children: ReactNode }) {
 const { locale, uiLocale } = useI18n();
 const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
 const defaults = defaultV2Page("esim").sections.find(s => s.type === "SEARCH_HERO");
 const copy = resolveHeroCopy(section, v2Text(section, "title", locale), v2Text(section, "subtitle", locale), defaults ? v2Text(defaults, "subtitle", locale) : "", c, uiLocale);
 return <V2HeroView section={section} image={image} tabletImage={tabletImage} mobileImage={mobileImage}
   heading={<HeroHeading section={section} locale={uiLocale} title={copy.title} subtitle={copy.subtitle} defaultSubtitle={defaults ? v2Text(defaults, "subtitle", locale) : ""} />}
   subtitle={copy.subtitle} promotion={<HeroPromotion />} trust={<PasaportMobileBenefits section={benefits} reviews={reviews} resolve={resolve} />}>
   {children}
 </V2HeroView>;
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

/**
 * Premium glass trust strip below the hero search: optional verified Google+Trustpilot
 * summary (rendered only when both sources are verified in the CMS) plus the delivery,
 * refund and setup benefits from the Admin-edited BENEFIT_ROW section. Informational only.
 */
export function PasaportMobileBenefits({ section, reviews, resolve }: { resolve?: ((id:string|null|undefined)=>string|undefined)|undefined; section?: V2Section | undefined; reviews?: V2Section | undefined }) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
  const { ref, entered } = useTrustIconEntry();
  const verified = combinedSourceRating(reviews?.trust?.sourceRatings);
  const summary = verified ?? PREVIEW_SAMPLE_RATING;
  const isSample = !verified && Boolean(summary);
  const benefitSection=section??defaultV2Page("esim").sections.find(s=>s.type==="BENEFIT_ROW");
  const reviewsLabel = uiLocale === "de" ? "Bewertungen" : locale === "tr" ? "değerlendirme" : "reviews";
  const outOf = uiLocale === "de" ? "aus 5" : locale === "tr" ? "/ 5" : "out of 5";
  return (
    <div ref={ref} className="hero-trust-strip registered-trust-strip" data-trust-entered={entered} data-has-rating={Boolean(summary)}>
        {verified && <div className="trust-strip-segment trust-strip-rating">
          <span className="trust-strip-marks"><GoogleMark /><TrustpilotMark /></span>
          {summary && <span className="trust-strip-rating-text">
            <strong>{new Intl.NumberFormat(uiLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.displayRating)} {outOf}</strong>
            <StripStars rating={summary.rating} />
            <small>{new Intl.NumberFormat(uiLocale).format(summary.count)} {reviewsLabel}{isSample ? <em className="trust-strip-sample" title={c.sample}>{c.sample}</em> : null}</small>
          </span>}
        </div>}
      <HeroTrustCards section={benefitSection} locale={uiLocale} resolve={resolve}/>
    </div>
  );
}
