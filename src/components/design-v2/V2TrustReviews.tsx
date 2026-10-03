import { useRef, useState } from "react";
import { Globe2, Heart, Star, Users, Zap } from "lucide-react";
import { Reveal } from "@/components/travel/Reveal";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/components/design-v2/V2Sections";
import { useI18n } from "@/i18n";
import { LOCALE_REGISTRY } from "@/i18n/locales";
import { localize } from "@/i18n/overlay";
import { v2ItemText, v2Text, type V2Item, type V2Section } from "@/domain/storefront/v2";
import type { V2Media } from "@/lib/v2-storefront.functions";
import type { Locale } from "@/domain/enums";
import globeVisual from "@/assets/trust-globe.jpg";
import returnVisual from "@/assets/trust-return.jpg";
import installVisual from "@/assets/trust-install.jpg";
import paymentVisual from "@/assets/trust-payment.jpg";

const LABELS = localize({
  tr: { rating: "5 üzerinden {rating} yıldız", reviews: "Müşteri yorumları", real: "Gerçek müşteri yorumlarına dayalı", demo: "DEMO / TEST — gerçek müşteri yorumu değildir", slide: "Yorum {index}", country: "Ülke", previewRating: "Önizleme puanı — gerçek müşteri puanı değil", paymentPreview: "DEMO / ÖNİZLEME — ödeme henüz aktif değil" },
  de: { rating: "{rating} von 5 Sternen", reviews: "Kundenbewertungen", real: "Basierend auf echten Kundenbewertungen", demo: "DEMO / TEST — keine echte Kundenbewertung", slide: "Bewertung {index}", country: "Land", previewRating: "Vorschauwert — keine echte Kundenbewertung", paymentPreview: "DEMO / VORSCHAU — Zahlung noch nicht verfügbar" },
  en: { rating: "{rating} out of 5 stars", reviews: "Customer reviews", real: "Based on real customer reviews", demo: "DEMO / TEST — not a real customer review", slide: "Review {index}", country: "Country", previewRating: "Preview rating — not a real customer rating", paymentPreview: "DEMO / PREVIEW — payment not yet available" },
});

/** Public reviews are additionally filtered on the server; demos can only appear in the Admin iframe. */
export function V2TrustReviews({ section, media, preview = false }: { section: V2Section; media: V2Media; preview?: boolean }) {
  const { locale, uiLocale } = useI18n();
  const labels = LABELS[locale];
  const photo = mediaUrl(section.mediaId, media);
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reviews = section.items.filter((item) => item.visible && item.cardType === "review" && Boolean(item.text[item.originalLanguage ?? "en"]?.trim()) && (item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED" || preview && section.showDemoReviews && item.reviewType === "DEMO" && item.reviewStatus !== "ARCHIVED"));
  const realReviews = reviews.filter((item) => item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED");
  const demoReviews = reviews.filter((item) => item.reviewType === "DEMO");
  const rating = realReviews.length ? (realReviews.reduce((sum, item) => sum + item.rating, 0) / realReviews.length).toFixed(1).replace(".", uiLocale === "en" ? "." : ",") : null;
  // Checkout currently has no production-enabled payment methods. No logos are eligible.
  const activePaymentMethods: readonly string[] = [];
  const trustItems = section.items.filter((item) => item.visible && item.cardType === "trust" && (item.id !== "trust-payment" || preview || activePaymentMethods.length > 0));
  const paymentSlot = section.items.find((item) => item.id === "trust-payment" && item.visible && item.cardType === "trust");
  const benefitItems = !preview && activePaymentMethods.length === 0 && paymentSlot ? [...trustItems, paymentSlot] : trustItems;
  const visuals: Record<string, string> = { "trust-countries": globeVisual, "trust-refund": returnVisual, "trust-install": installVisual, "trust-payment": paymentVisual };
  const displayRating = rating ?? (preview && demoReviews.length > 0 ? uiLocale === "en" ? "4.8" : "4,8" : null);
  const scrollTo = (index: number) => rail.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });

  return <section aria-labelledby={`${section.id}-title`} className="trust-story relative -mx-4 mt-5 overflow-hidden rounded-[2rem] bg-petrol-soft px-6 pb-5 pt-5 sm:mx-0 sm:mt-8 sm:px-7 sm:pt-8 lg:px-10">
    <div className="trust-story-main relative min-h-[25rem] sm:min-h-[29rem] lg:grid lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-6">
      <div className="trust-story-copy relative z-10 min-w-0 lg:py-8">
        <Reveal className="trust-section-reveal"><p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary"><Users className="size-4 shrink-0" aria-hidden /><span>{v2Text(section, "eyebrow", locale)}</span></p></Reveal>
        <Reveal delay={70} className="trust-section-reveal"><h2 id={`${section.id}-title`} className="mt-5 font-display text-[1.625rem] font-bold leading-[1.08] text-foreground sm:text-5xl"><span className="block">{v2Text(section, "title", locale)}</span><span className="block text-success">{v2Text(section, "accent", locale)}</span></h2></Reveal>
        <Reveal delay={140} className="trust-section-reveal"><p className="mt-4 max-w-[55%] text-[13px] leading-[1.5] text-muted-foreground sm:max-w-[52%] sm:text-base lg:max-w-lg">{v2Text(section, "subtitle", locale)}</p></Reveal>
        {displayRating && <Reveal delay={210} className="trust-section-reveal mt-4 max-w-[54%] lg:max-w-none"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="flex gap-0.5 text-success" role="img" aria-label={labels.rating.replace("{rating}", displayRating)}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} fill={i < Math.round(Number(displayRating.replace(",", "."))) ? "currentColor" : "none"} aria-hidden />)}</span><strong className="text-sm text-foreground">{displayRating} / 5</strong></div><p className="mt-1 text-xs text-muted-foreground">{rating ? labels.real : labels.previewRating}</p></Reveal>}
      </div>
      <Reveal delay={210} className="trust-section-reveal trust-story-visual pointer-events-none absolute inset-0 lg:relative lg:h-[27rem]">
        <div className="trust-phone-stage relative h-full w-full">
          <div className="trust-phone absolute bottom-[2%] right-[3%] top-[3%] w-[43%] overflow-hidden rounded-[2rem] border-[6px] border-foreground bg-foreground shadow-panel sm:right-[10%] sm:w-[43%] lg:inset-y-2 lg:right-[14%] lg:w-[58%] rtl:right-auto rtl:left-[3%] sm:rtl:left-[10%] lg:rtl:left-[14%]">
            {photo && <img src={photo} alt={v2Text(section, "imageAlt", locale)} loading="lazy" decoding="async" width={1408} height={1104} sizes="(max-width: 640px) 48vw, (max-width: 1024px) 43vw, 30vw" className="h-full w-full object-cover object-[68%_center]" />}
            <span aria-hidden className="absolute left-1/2 top-0 h-2 w-12 -translate-x-1/2 rounded-b-full bg-foreground" />
          </div>
          <Reveal delay={280} className="trust-section-chip absolute right-0 top-[10%] z-20 w-28 sm:w-40 lg:right-[2%] lg:w-44 rtl:right-auto rtl:left-0 lg:rtl:left-[2%]"><BenefitChip icon={<Zap />} title={v2Text(section, "chipOneTitle", locale)} text={v2Text(section, "chipOneText", locale)} /></Reveal>
          <Reveal delay={350} className="trust-section-chip absolute bottom-[28%] left-[1%] z-20 w-[min(40vw,10rem)] lg:left-[6%] lg:w-44 rtl:left-auto rtl:right-[1%] lg:rtl:right-[6%]"><BenefitChip icon={<Globe2 />} title={v2Text(section, "chipTwoTitle", locale)} text={v2Text(section, "chipTwoText", locale)} /></Reveal>
          <Reveal delay={420} className="trust-section-chip absolute bottom-[7%] right-0 z-20 w-[min(42vw,10rem)] lg:right-[2%] lg:w-44 rtl:right-auto rtl:left-0 lg:rtl:left-[2%]"><BenefitChip icon={<Heart />} title={v2Text(section, "chipThreeTitle", locale)} /></Reveal>
        </div>
      </Reveal>
    </div>

    {reviews.length > 0 && <Reveal delay={140} className="trust-section-reveal mt-5">
      {demoReviews.length > 0 && <p className="mb-2 text-xs font-bold text-muted-foreground">{labels.demo}</p>}
      <div ref={rail} role="region" aria-label={labels.reviews} tabIndex={reviews.length > 1 ? 0 : undefined} onScroll={(event) => { const node = event.currentTarget; const first = node.firstElementChild as HTMLElement | null; if (first) setActive(Math.min(reviews.length - 1, Math.round(Math.abs(node.scrollLeft) / (first.offsetWidth + 12)))); }} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review) => <ReviewCard key={review.id} review={review} media={media} locale={locale} uiLocale={uiLocale} ratingLabel={labels.rating} demoLabel={labels.demo} />)}
      </div>
       {reviews.length > 1 && <div className="mt-2 flex justify-center gap-2 lg:hidden">{reviews.map((review, index) => <Button key={review.id} type="button" variant="ghost" size="icon" onClick={() => scrollTo(index)} aria-label={labels.slide.replace("{index}", String(index + 1))} aria-current={active === index ? "true" : undefined} className="size-7 rounded-full p-0"><span className={`block size-2 rounded-full ${active === index ? "bg-success" : "bg-border"}`} /></Button>)}</div>}
    </Reveal>}

     {benefitItems.length > 0 && <Reveal delay={210} className="trust-section-reveal mt-5"><ul className={`grid overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border ${benefitItems.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
       {benefitItems.map((item, index) => <li key={item.id} className={`flex min-w-0 flex-col items-center border-border px-1 pb-4 pt-2 text-center sm:px-4 ${index > 0 ? "border-l" : ""}`}>
         {item.id === "trust-payment" && !preview && activePaymentMethods.length === 0 ? <><span aria-hidden className="block h-20 sm:h-32" /><strong className="text-[10px] leading-tight text-foreground sm:text-base">{labels.paymentPreview}</strong></> : <><img src={visuals[item.id] ?? globeVisual} alt="" loading="lazy" decoding="async" width={816} height={816} className="h-20 w-20 max-w-full object-contain sm:h-32 sm:w-32" /><strong className="text-[10px] leading-tight text-foreground sm:text-base">{v2ItemText(item.title, locale)}</strong><span className="mt-1 text-[9px] leading-snug text-muted-foreground sm:text-sm">{v2ItemText(item.text, locale)}</span>{item.id === "trust-payment" && preview && activePaymentMethods.length === 0 && <span className="mt-1 text-[9px] font-bold leading-tight text-muted-foreground">{labels.paymentPreview}</span>}</>}
      </li>)}
    </ul></Reveal>}
  </section>;
}

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return <div className="flex items-center gap-1.5 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-border/50 backdrop-blur-sm sm:gap-2 sm:px-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-success [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[10px] leading-tight sm:text-xs"><strong className="block">{title}</strong>{text && <span className="block">{text}</span>}</span></div>;
}

function ReviewCard({ review, media, locale, uiLocale, ratingLabel, demoLabel }: { review: V2Item; media: V2Media; locale: Locale; uiLocale: keyof typeof LOCALE_REGISTRY; ratingLabel: string; demoLabel: string }) {
  const avatar = mediaUrl(review.mediaId, media);
  const name = review.title[review.originalLanguage ?? "en"] || v2ItemText(review.title, locale);
  const original = review.text[review.originalLanguage ?? "en"] || "";
  const country = review.countryCode ? new Intl.DisplayNames([LOCALE_REGISTRY[uiLocale].bcp47], { type: "region" }).of(review.countryCode) : v2ItemText(review.cta, locale);
  return <article className="w-[83%] shrink-0 snap-start rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border sm:w-[46%] lg:w-auto">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">{avatar ? <img src={avatar} alt="" loading="lazy" className="size-full object-cover" /> : name.slice(0, 1)}</span><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{name}</strong><span className="flex items-center gap-1 text-xs text-muted-foreground">{review.countryCode && <CountryFlag iso={review.countryCode} className="h-3 w-4 shrink-0 rounded-sm" />}<span className="truncate">{country}</span></span></div></div>
    <div className="mt-3 flex gap-0.5 text-success" role="img" aria-label={ratingLabel.replace("{rating}", String(review.rating))}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
    <p lang={review.originalLanguage} className="mt-2 text-sm leading-relaxed text-muted-foreground">{original}</p>
    {review.reviewType === "DEMO" && <p className="mt-2 text-[10px] font-bold text-muted-foreground">{demoLabel}</p>}
  </article>;
}
