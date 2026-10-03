import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StorefrontIcon } from "@/domain/storefront/icons";
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
import travelerFallback from "@/assets/trust-traveler.jpg";

const LABELS = localize({
  tr: { rating: "5 üzerinden {rating} yıldız", reviews: "Müşteri yorumları", real: "Gerçek müşteri yorumlarına dayalı", demo: "DEMO / TEST — gerçek müşteri yorumu değildir", editorial: "Editoryal örnekler · gerçek müşteri yorumu değildir", slide: "Yorum {index}", country: "Ülke", previewRating: "Müşteri deneyimlerine göre", paymentPreview: "DEMO / ÖNİZLEME — ödeme henüz aktif değil" },
  de: { rating: "{rating} von 5 Sternen", reviews: "Kundenbewertungen", real: "Basierend auf echten Kundenerfahrungen", demo: "DEMO / TEST — keine echte Kundenbewertung", editorial: "Redaktionelle Beispiele · keine Kundenbewertungen", slide: "Bewertung {index}", country: "Land", previewRating: "Basierend auf echten Kundenerfahrungen", paymentPreview: "DEMO / VORSCHAU — Zahlung noch nicht verfügbar" },
  en: { rating: "{rating} out of 5 stars", reviews: "Customer reviews", real: "Based on real customer reviews", demo: "DEMO / TEST — not a real customer review", editorial: "Editorial examples · not customer reviews", slide: "Review {index}", country: "Country", previewRating: "Based on customer experiences", paymentPreview: "DEMO / PREVIEW — payment not yet available" },
});

const BENEFIT_IMAGE_SIZE: Record<80 | 100 | 120 | 140 | 160, string> = {
  80: "size-[min(100%,3.8rem)] sm:size-[min(100%,5.6rem)]",
  100: "size-[min(100%,4.75rem)] sm:size-[min(100%,7rem)]",
  120: "size-[min(100%,5.7rem)] sm:size-[min(100%,8rem)]",
  140: "size-[min(100%,6.65rem)] sm:size-[min(100%,8rem)]",
  160: "size-[min(100%,7.6rem)] sm:size-[min(100%,8rem)]",
};

/** Public reviews are additionally filtered on the server; demos can only appear in the Admin iframe. */
export function V2TrustReviews({ section, media, preview = false }: { section: V2Section; media: V2Media; preview?: boolean }) {
  const { locale, uiLocale } = useI18n();
  const labels = LABELS[locale];
  const settings = section.trust;
  const chips = section.items.filter((item) => item.cardType === "chip" && item.visible);
  const photo = mediaUrl(section.mediaId, media) ?? (!preview ? travelerFallback : undefined);
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reviews = section.items.filter((item) => item.visible && item.cardType === "review" && Boolean((item.reviewType === "EDITORIAL" ? v2ItemText(item.text, locale) : item.text[item.originalLanguage ?? "en"])?.trim()) && (item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED" || preview && section.showDemoReviews && (item.reviewType === "DEMO" || item.reviewType === "EDITORIAL") && item.reviewStatus !== "ARCHIVED"));
  const realReviews = reviews.filter((item) => item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED");
  const displayReviews = reviews;
  const rating = realReviews.length ? (realReviews.reduce((sum, item) => sum + item.rating, 0) / realReviews.length).toFixed(1).replace(".", uiLocale === "en" ? "." : ",") : null;
  const trustItems = section.items.filter((item) => item.visible && item.cardType === "trust" && (item.id !== "trust-payment" || preview));
  const manual = settings?.ratingMode === "manual";
  const displayRating = settings?.ratingMode === "off" ? null : preview && manual ? settings.manualRating.toFixed(1).replace(".", uiLocale === "en" ? "." : ",") : rating;
  const scrollTo = (index: number) => rail.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  useEffect(() => {
    if (!settings?.autoplay || displayReviews.length < 2 || typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = rail.current;
    if (!node) return;
    let paused = false;
    const pause = () => { paused = true; };
    node.addEventListener("pointerdown", pause);
    node.addEventListener("focusin", pause);
    const timer = window.setInterval(() => {
      if (!paused && node.isConnected) {
        const first = node.firstElementChild as HTMLElement | null;
        const next = first ? Math.round(Math.abs(node.scrollLeft) / (first.offsetWidth + 12)) + 1 : 0;
        node.children[next % displayReviews.length]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      }
    }, 8000);
    return () => { window.clearInterval(timer); node.removeEventListener("pointerdown", pause); node.removeEventListener("focusin", pause); };
  }, [settings?.autoplay, displayReviews.length]);

  return <section aria-labelledby={`${section.id}-title`} className={`trust-story relative -mx-4 mt-5 overflow-hidden rounded-[2rem] px-6 pb-5 pt-5 sm:mx-0 sm:mt-8 sm:px-7 sm:pt-8 lg:px-10 ${settings?.background === "white" ? "bg-card" : settings?.background === "cream" ? "bg-secondary" : "bg-petrol-soft"}`}>
    <div className="trust-story-main relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-6">
      <div className="trust-story-copy relative z-10 min-w-0 lg:py-8">
        <Reveal className="trust-section-reveal"><p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary"><Users className="size-4 shrink-0" aria-hidden /><span>{v2Text(section, "eyebrow", locale)}</span></p></Reveal>
        <Reveal delay={70} className="trust-section-reveal"><h2 id={`${section.id}-title`} className="mt-5 font-display text-[1.625rem] font-bold leading-[1.08] text-foreground sm:text-5xl"><span className="block">{v2Text(section, "title", locale)}</span><span className="block text-success">{v2Text(section, "accent", locale)}</span></h2></Reveal>
        <Reveal delay={140} className="trust-section-reveal"><p className="mt-4 max-w-xl text-[13px] leading-[1.5] text-muted-foreground sm:text-base">{v2Text(section, "subtitle", locale)}</p></Reveal>
      </div>
      <Reveal delay={210} className="trust-section-reveal trust-story-visual pointer-events-none relative mt-5 pb-7 pt-6 lg:mt-0 lg:py-8">
        <div className="relative mx-auto w-[min(100%,34rem)] lg:w-full">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-card shadow-panel lg:aspect-[5/4]">
            {photo ? <img src={photo} alt={v2Text(section, "imageAlt", locale)} loading="lazy" decoding="async" width={1408} height={1104} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 540px, 42vw" className={`h-full w-full object-cover ${settings?.focal === "left" ? "object-left" : settings?.focal === "center" ? "object-center" : "object-right"}`} /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-label="Social Proof görseli ekle"><ImagePlus className="size-9" aria-hidden /><span className="text-sm font-semibold">Social Proof görseli ekle</span></div>}
          </div>
          {chips.map((chip, index) => <Reveal key={chip.id} delay={280 + index * 70} className={`trust-section-chip absolute z-20 w-[min(41vw,10rem)] lg:w-44 ${chip.position === "middle-left" ? "bottom-[26%] left-0 rtl:left-auto rtl:right-0" : chip.position === "bottom-right" ? "-bottom-4 right-0 rtl:right-auto rtl:left-0" : "right-0 -top-4 rtl:right-auto rtl:left-0"}`}><BenefitChip icon={mediaUrl(chip.mediaId, media) ? <img src={mediaUrl(chip.mediaId, media)} alt="" className="size-4 object-contain" /> : <StorefrontIcon name={chip.icon} className="size-4" />} title={v2ItemText(chip.title, locale)} text={v2ItemText(chip.text, locale)} /></Reveal>)}
        </div>
      </Reveal>
    </div>

    {(displayReviews.length > 0 || displayRating) && <Reveal delay={140} className="trust-section-reveal mt-2">
      {displayRating && <div className="mb-4 flex flex-wrap items-start gap-x-3 gap-y-1"><span className="flex gap-0.5 text-success" role="img" aria-label={labels.rating.replace("{rating}", displayRating)}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} fill="currentColor" aria-hidden />)}</span><div><strong className="text-sm text-foreground">{displayRating} {uiLocale === "de" ? "von" : "/"} {settings?.maxRating ?? 5}</strong><p className="text-xs text-muted-foreground">{preview && manual ? v2ItemText(settings.manualCaption, locale) : labels.real}</p></div></div>}
      {preview && manual && <p className="mb-2 text-[10px] font-bold text-muted-foreground">{labels.demo}</p>}
      {preview && displayReviews.some((item) => item.reviewType !== "REAL") && <p className="mb-2 text-xs text-muted-foreground">{labels.editorial}</p>}
      {displayReviews.length > 0 && <div ref={rail} role="region" aria-label={labels.reviews} tabIndex={displayReviews.length > 1 ? 0 : undefined} onScroll={(event) => { const node = event.currentTarget; const first = node.firstElementChild as HTMLElement | null; if (first) setActive(Math.min(displayReviews.length - 1, Math.round(Math.abs(node.scrollLeft) / (first.offsetWidth + 12)))); }} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {displayReviews.map((review) => <ReviewCard key={review.id} review={review} media={media} locale={locale} uiLocale={uiLocale} ratingLabel={labels.rating} demoLabel={labels.demo} />)}
      </div>}
       {section.showDots && displayReviews.length > 1 && <div className="mt-2 flex justify-center gap-1">{displayReviews.map((review, index) => <Button key={review.id} type="button" variant="ghost" size="icon" onClick={() => scrollTo(index)} aria-label={labels.slide.replace("{index}", String(index + 1))} aria-current={active === index ? "true" : undefined} className="size-6 rounded-full p-0"><span className={`block size-2 rounded-full ${active === index ? "bg-success" : "bg-border"}`} /></Button>)}</div>}
    </Reveal>}

     {trustItems.length > 0 && <Reveal delay={210} className="trust-section-reveal mt-5"><ul className={`grid overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border ${trustItems.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
       {trustItems.map((item, index) => <li key={item.id} className={`flex min-w-0 flex-col items-center border-border px-1 pb-4 pt-2 text-center sm:px-4 ${index > 0 ? "border-l" : ""}`}>
          <span className="grid h-20 w-full min-w-0 place-items-center sm:h-32">{item.visualMode !== "ICON" && mediaUrl(item.mediaId, media) ? <img src={mediaUrl(item.mediaId, media)} alt={v2ItemText(item.imageAlt, locale) || media[item.mediaId ?? ""]?.alt || ""} loading="lazy" decoding="async" width={320} height={320} className={`${BENEFIT_IMAGE_SIZE[item.imageScale ?? (item.id === "trust-payment" ? 140 : 100)] ?? BENEFIT_IMAGE_SIZE[100]} max-h-full max-w-full object-contain`} /> : <StorefrontIcon name={item.icon} className="size-10 text-success sm:size-14" />}</span>
         <strong className="text-[10px] leading-tight text-foreground sm:text-base">{v2ItemText(item.title, locale)}</strong><span className="mt-1 text-[9px] leading-snug text-muted-foreground sm:text-sm">{v2ItemText(item.text, locale)}</span>
         {preview && item.id === "trust-payment" && <span className="mt-1 text-[8px] font-bold leading-tight text-muted-foreground">{labels.paymentPreview}</span>}
      </li>)}
    </ul></Reveal>}

    {settings?.whyEnabled !== false && <Reveal delay={140} className="trust-section-reveal mt-6 border-t border-border/70 pt-5">
      <div aria-labelledby={`${section.id}-why`}>
        <p className="text-xs font-bold uppercase tracking-wide text-success">{v2Text(section, "whyEyebrow", locale)}</p>
        <h3 id={`${section.id}-why`} className="mt-2 font-display text-xl font-bold leading-tight text-foreground sm:text-3xl">{v2Text(section, "whyTitle", locale)}</h3>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-base">{v2Text(section, "whyDescription", locale)}</p>
        {settings?.illustrationId && mediaUrl(settings.illustrationId, media) && <img src={mediaUrl(settings.illustrationId, media)} alt="" loading="lazy" className="mt-3 h-24 w-auto object-contain" />}
        {settings?.comparisonEnabled && (!settings.comparisonPreviewOnly || preview) && <div className="mt-4 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
          <p className="text-sm font-bold text-foreground">{v2Text(section, "comparisonTitle", locale)}</p>
          <div className="mt-2 flex flex-wrap items-end gap-4 text-xs text-muted-foreground"><div>{v2Text(section, "comparisonALabel", locale)}<strong className="block text-lg text-foreground">{v2Text(section, "comparisonAValue", locale)}</strong></div><div>{v2Text(section, "comparisonBLabel", locale)}<strong className="block text-lg text-primary">{v2Text(section, "comparisonBValue", locale)}</strong></div></div>
          {v2Text(section, "statistic", locale) && <strong className="mt-2 block font-display text-4xl text-primary">{v2Text(section, "statistic", locale)}</strong>}
          <p className="text-xs text-muted-foreground">{v2Text(section, "statisticLabel", locale)} {v2Text(section, "comparisonHighlight", locale)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{v2Text(section, "comparisonFootnote", locale)}</p>
        </div>}
      </div>
    </Reveal>}
    {v2Text(section, "cta", locale) && <Button asChild className="mt-4"><Link to={section.href}>{v2Text(section, "cta", locale)}</Link></Button>}

  </section>;
}

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return <div className="flex items-center gap-1.5 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-border/50 backdrop-blur-sm sm:gap-2 sm:px-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-success [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[10px] leading-tight sm:text-xs"><strong className="block">{title}</strong>{text && <span className="block">{text}</span>}</span></div>;
}

function ReviewCard({ review, media, locale, uiLocale, ratingLabel, demoLabel }: { review: V2Item; media: V2Media; locale: Locale; uiLocale: keyof typeof LOCALE_REGISTRY; ratingLabel: string; demoLabel: string }) {
  const name = review.reviewType === "EDITORIAL" ? v2ItemText(review.title, locale) : review.title[review.originalLanguage ?? "en"] || v2ItemText(review.title, locale);
  const original = review.reviewType === "EDITORIAL" ? v2ItemText(review.text, locale) : review.text[review.originalLanguage ?? "en"] || "";
  const country = review.countryCode ? new Intl.DisplayNames([LOCALE_REGISTRY[uiLocale].bcp47], { type: "region" }).of(review.countryCode) : v2ItemText(review.cta, locale);
  return <article className="w-[min(55%,12rem)] shrink-0 snap-start rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border sm:w-[32%] lg:w-[30%]">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">{mediaUrl(review.mediaId, media) ? <img src={mediaUrl(review.mediaId, media)} alt="" loading="lazy" className="size-full object-cover" /> : <span aria-hidden>{name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>}</span><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{name}</strong><span className="flex items-center gap-1 text-xs text-muted-foreground">{review.countryCode && <CountryFlag iso={review.countryCode} className="h-3 w-4 shrink-0 rounded-sm" />}<span className="truncate">{country}</span></span></div></div>
    <div className="mt-3 flex gap-0.5 text-success" role="img" aria-label={ratingLabel.replace("{rating}", String(review.rating))}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
    <p lang={review.reviewType === "EDITORIAL" ? uiLocale : review.originalLanguage} className="mt-2 text-sm leading-relaxed text-muted-foreground">{original}</p>
    {review.reviewType === "DEMO" && <p className="mt-2 text-[10px] font-bold text-muted-foreground">{demoLabel}</p>}
  </article>;
}

