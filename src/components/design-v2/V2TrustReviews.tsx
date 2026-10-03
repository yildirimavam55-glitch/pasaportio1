import { Globe2, Heart, Star, Users } from "lucide-react";
import { Reveal } from "@/components/travel/Reveal";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { mediaUrl } from "@/components/design-v2/V2Sections";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { v2ItemText, v2Text, type V2Item, type V2Section } from "@/domain/storefront/v2";
import type { V2Media } from "@/lib/v2-storefront.functions";
import type { Locale } from "@/domain/enums";

const A11Y = localize({
  tr: { rating: "5 üzerinden {rating} yıldız", reviews: "Doğrulanmış müşteri yorumları" },
  de: { rating: "{rating} von 5 Sternen", reviews: "Verifizierte Kundenbewertungen" },
  en: { rating: "{rating} out of 5 stars", reviews: "Verified customer reviews" },
});

/** CMS-managed trust and social-proof section. Unverified or unpublished reviews never render. */
export function V2TrustReviews({ section, media }: { section: V2Section; media: V2Media }) {
  const { locale } = useI18n();
  const photo = mediaUrl(section.mediaId, media);
  const trustItems = section.items.filter((item) => item.visible && item.cardType === "trust").slice(0, 4);
  const reviews = section.items.filter((item) => item.visible && item.cardType === "review" && item.verified && item.published && v2ItemText(item.title, locale) && v2ItemText(item.text, locale));

  return (
    <section aria-labelledby={`${section.id}-title`} className="trust-story mt-8 overflow-hidden rounded-3xl bg-petrol-soft px-4 py-7 sm:mt-12 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
      <div className="relative min-h-[28rem] sm:min-h-[32rem] lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-10">
        <div className="relative z-10 min-w-0 lg:py-8">
          <Reveal className="trust-section-reveal">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary">
              <Users className="size-4 shrink-0" aria-hidden />
              <span>{v2Text(section, "eyebrow", locale)}</span>
            </p>
          </Reveal>
          <Reveal delay={70} className="trust-section-reveal">
            <h2 id={`${section.id}-title`} className="mt-5 font-display text-[2rem] font-bold leading-[1.07] text-foreground sm:text-5xl lg:text-5xl">
              {v2Text(section, "title", locale)}
              <span className="mt-1 block text-primary">{v2Text(section, "accent", locale)}</span>
            </h2>
          </Reveal>
          <Reveal delay={140} className="trust-section-reveal">
            <p className="mt-6 max-w-[45%] text-[13px] leading-relaxed text-muted-foreground sm:max-w-[40%] sm:text-base lg:mt-5 lg:max-w-xl">{v2Text(section, "subtitle", locale)}</p>
          </Reveal>
        </div>

        <Reveal delay={100} className="trust-section-reveal absolute inset-x-0 top-[9.5rem] bottom-0 sm:top-[10rem] lg:relative lg:inset-auto">
          <div className="relative ml-auto h-full w-[52%] sm:w-[55%] lg:mx-auto lg:h-auto lg:w-full lg:max-w-2xl lg:px-7 lg:pb-5 rtl:ml-0 rtl:mr-auto">
            <div className="relative h-full min-h-[17rem] overflow-hidden rounded-3xl bg-muted shadow-panel lg:h-[25rem]">
              {photo && <img src={photo} alt={v2Text(section, "imageAlt", locale)} loading="lazy" decoding="async" width={1408} height={1104} className="size-full object-cover object-[65%_center] lg:object-center" />}
            </div>
            <Reveal delay={210} className="trust-section-chip absolute bottom-2 -left-12 w-36 sm:bottom-5 sm:-left-16 sm:w-44 lg:bottom-3 lg:left-0">
              <BenefitChip icon={<Globe2 />} title={v2Text(section, "chipOneTitle", locale)} text={v2Text(section, "chipOneText", locale)} />
            </Reveal>
            <Reveal delay={280} className="trust-section-chip absolute right-0 top-4 w-36 sm:w-44 lg:right-0 lg:top-auto lg:bottom-14">
              <BenefitChip icon={<Heart />} title={v2Text(section, "chipTwoTitle", locale)} text={v2Text(section, "chipTwoText", locale)} />
            </Reveal>
          </div>
        </Reveal>
      </div>

      {reviews.length > 0 && (
        <Reveal delay={140} className="trust-section-reveal mt-8 sm:mt-10">
          <div role="region" aria-label={A11Y[locale].reviews} tabIndex={reviews.length > 1 ? 0 : undefined} className={reviews.length > 1 ? "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden" : "grid gap-3 sm:max-w-md"}>
            {reviews.map((review) => <ReviewCard key={review.id} review={review} media={media} locale={locale} />)}
          </div>
        </Reveal>
      )}

      {trustItems.length > 0 && (
        <Reveal delay={210} className="trust-section-reveal mt-8 sm:mt-10">
          <ul className="grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border lg:grid-cols-4">
            {trustItems.map((item, index) => (
              <li key={item.id} className={`flex min-w-0 flex-col items-center px-2 py-4 text-center sm:px-3 sm:py-5 ${index % 2 ? "border-l border-border" : ""} ${index > 1 ? "border-t border-border lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-border" : ""}`}>
                <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary"><StorefrontIcon name={item.icon} className="size-5" /></span>
                <strong className="mt-2 text-sm leading-tight text-foreground">{v2ItemText(item.title, locale)}</strong>
                <span className="mt-1 text-xs leading-snug text-muted-foreground">{v2ItemText(item.text, locale)}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-card/70 backdrop-blur-sm sm:px-3 sm:py-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[11px] leading-tight"><strong className="block">{title}</strong>{text}</span></div>;
}

function ReviewCard({ review, media, locale }: { review: V2Item; media: V2Media; locale: Locale }) {
  const avatar = mediaUrl(review.mediaId, media);
  const ratingLabel = A11Y[locale].rating.replace("{rating}", String(review.rating));
  return (
    <article className="w-[82%] shrink-0 snap-start rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border sm:w-auto">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">{avatar ? <img src={avatar} alt="" loading="lazy" className="size-full object-cover" /> : v2ItemText(review.title, locale).slice(0, 1)}</span>
        <div className="min-w-0"><strong className="block truncate text-sm text-foreground">{v2ItemText(review.title, locale)}</strong><span className="block truncate text-xs text-muted-foreground">{v2ItemText(review.cta, locale)}</span></div>
      </div>
      <div className="mt-3 flex gap-0.5 text-primary" role="img" aria-label={ratingLabel}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v2ItemText(review.text, locale)}</p>
    </article>
  );
}