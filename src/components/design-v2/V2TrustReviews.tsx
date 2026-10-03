import { Globe2, Heart, Star, Users, Zap } from "lucide-react";
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
  const { locale, uiLocale } = useI18n();
  const a11y = A11Y[locale];
  const photo = mediaUrl(section.mediaId, media);
  // Checkout currently takes no real payments; do not advertise payment security as a live benefit.
  const trustItems = section.items.filter((item) => item.visible && item.cardType === "trust" && item.id !== "trust-payment").slice(0, 4);
  const reviews = section.items.filter((item) => item.visible && item.cardType === "review" && item.verified && item.published && v2ItemText(item.title, locale) && Boolean(item.text[uiLocale]?.trim()));
  const rating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1).replace(".", uiLocale === "en" ? "." : ",") : null;

  return (
    <section aria-labelledby={`${section.id}-title`} className="trust-story relative mt-7 overflow-hidden rounded-3xl bg-petrol-soft px-4 py-7 sm:mt-10 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
      <div className="relative min-h-[29rem] sm:min-h-[31rem] lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-6">
        <div className="relative z-10 min-w-0 lg:py-9">
          <Reveal className="trust-section-reveal">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary">
              <Users className="size-4 shrink-0" aria-hidden />
              <span>{v2Text(section, "eyebrow", locale)}</span>
            </p>
          </Reveal>
          <Reveal delay={70} className="trust-section-reveal">
            <h2 id={`${section.id}-title`} className="mt-5 font-display text-[2rem] font-bold leading-[1.07] text-foreground sm:text-5xl lg:text-5xl">
              {v2Text(section, "title", locale)}
              <span className="mt-1 block text-success">{v2Text(section, "accent", locale)}</span>
            </h2>
          </Reveal>
          <Reveal delay={140} className="trust-section-reveal">
            <p className="mt-5 max-w-[42%] text-[13px] leading-relaxed text-muted-foreground sm:max-w-[43%] sm:text-base lg:max-w-xl">{v2Text(section, "subtitle", locale)}</p>
          </Reveal>
          {rating && <Reveal delay={210} className="trust-section-reveal mt-5 max-w-[52%] lg:max-w-none">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex gap-0.5 text-primary" role="img" aria-label={a11y.rating.replace("{rating}", rating)}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < Math.round(Number(rating.replace(",", "."))) ? "currentColor" : "none"} aria-hidden />)}</span>
              <strong className="text-sm text-foreground">{rating} / 5</strong>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{a11y.reviews}</p>
          </Reveal>}
        </div>

        <Reveal delay={140} className="trust-section-reveal absolute inset-x-0 top-[11rem] bottom-0 sm:top-[10rem] lg:relative lg:inset-auto">
          <div className="relative ml-auto h-full w-[52%] sm:w-[55%] lg:mx-auto lg:h-auto lg:w-full lg:max-w-2xl lg:px-8 lg:py-4 rtl:ml-0 rtl:mr-auto">
            <div className="relative h-full min-h-[17rem] overflow-hidden rounded-[2rem] bg-muted shadow-panel ring-[4px] ring-foreground lg:h-[27rem]">
              {photo && <img src={photo} alt={v2Text(section, "imageAlt", locale)} loading="lazy" decoding="async" width={1408} height={1104} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 55vw, 42vw" className="size-full object-cover object-[66%_center] lg:object-center" />}
              <span aria-hidden className="absolute left-1/2 top-0 h-2 w-12 -translate-x-1/2 rounded-b-full bg-foreground" />
            </div>
            <Reveal delay={210} className="trust-section-chip absolute right-0 top-4 w-[min(44vw,10rem)] lg:right-0 lg:top-8 lg:w-48">
              <BenefitChip icon={<Zap />} title={v2Text(section, "chipOneTitle", locale)} text={v2Text(section, "chipOneText", locale)} />
            </Reveal>
            <Reveal delay={280} className="trust-section-chip absolute bottom-20 -left-12 w-[min(44vw,10rem)] sm:-left-16 lg:bottom-24 lg:left-0 lg:w-48 rtl:left-auto rtl:-right-12 sm:rtl:-right-16 lg:rtl:right-0">
              <BenefitChip icon={<Globe2 />} title={v2Text(section, "chipTwoTitle", locale)} text={v2Text(section, "chipTwoText", locale)} />
            </Reveal>
            <Reveal delay={350} className="trust-section-chip absolute right-0 bottom-3 w-[min(44vw,10rem)] lg:right-0 lg:bottom-7 lg:w-48">
              <BenefitChip icon={<Heart />} title={v2Text(section, "chipThreeTitle", locale)} />
            </Reveal>
          </div>
        </Reveal>
      </div>

      {reviews.length > 0 && (
        <Reveal delay={140} className="trust-section-reveal mt-7 sm:mt-9">
          <div role="region" aria-label={a11y.reviews} tabIndex={reviews.length > 1 ? 0 : undefined} className={reviews.length > 1 ? "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden" : "grid gap-3 sm:max-w-md"}>
            {reviews.map((review) => <ReviewCard key={review.id} review={review} media={media} locale={locale} ratingLabel={a11y.rating} />)}
          </div>
        </Reveal>
      )}

      {trustItems.length > 0 && (
        <Reveal delay={210} className="trust-section-reveal mt-7 sm:mt-9">
          <ul className={`grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border ${trustItems.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {trustItems.map((item, index) => (
              <li key={item.id} className={`flex min-w-0 flex-col items-center px-2 py-4 text-center sm:px-3 sm:py-5 ${index % 2 ? "border-l border-border" : ""} ${index > 1 ? "border-t border-border lg:border-t-0" : ""} ${index > 0 ? "lg:border-l lg:border-border" : ""} ${trustItems.length === 3 && index === 2 ? "col-span-2 lg:col-span-1 lg:border-l" : ""}`}>
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

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-card/70 backdrop-blur-sm sm:px-3 sm:py-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[11px] leading-tight"><strong className="block">{title}</strong>{text && <span className="block">{text}</span>}</span></div>;
}

function ReviewCard({ review, media, locale, ratingLabel }: { review: V2Item; media: V2Media; locale: Locale; ratingLabel: string }) {
  const avatar = mediaUrl(review.mediaId, media);
  const label = ratingLabel.replace("{rating}", String(review.rating));
  return (
    <article className="w-[82%] shrink-0 snap-start rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border sm:w-auto">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">{avatar ? <img src={avatar} alt="" loading="lazy" className="size-full object-cover" /> : v2ItemText(review.title, locale).slice(0, 1)}</span>
        <div className="min-w-0"><strong className="block truncate text-sm text-foreground">{v2ItemText(review.title, locale)}</strong><span className="block truncate text-xs text-muted-foreground">{v2ItemText(review.cta, locale)}</span></div>
      </div>
      <div className="mt-3 flex gap-0.5 text-primary" role="img" aria-label={label}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v2ItemText(review.text, locale)}</p>
    </article>
  );
}