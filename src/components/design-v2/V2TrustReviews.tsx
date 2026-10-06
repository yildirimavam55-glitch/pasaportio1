import { useEffect, useRef, useState } from "react";
import { ArrowRight, ImagePlus, RadioTower, Search, Signal, Star, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { Reveal } from "@/components/travel/Reveal";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/components/design-v2/V2Sections";
import { useI18n } from "@/i18n";
import { LOCALE_REGISTRY } from "@/i18n/locales";
import { localize } from "@/i18n/overlay";
import { comparisonFigures, v2ItemText, v2Text, type V2Item, type V2Section } from "@/domain/storefront/v2";
import type { V2Media } from "@/lib/v2-storefront.functions";
import type { Locale } from "@/domain/enums";
import travelerFallback from "@/assets/trust-traveler.jpg";

const LABELS = localize({
  tr: { rating: "5 üzerinden {rating} yıldız", reviews: "Müşteri yorumları", real: "Gerçek müşteri yorumlarına dayalı", demo: "DEMO / TEST — gerçek müşteri yorumu değildir", editorial: "Editoryal örnekler · gerçek müşteri yorumu değildir", slide: "Yorum {index}", country: "Ülke", previewRating: "Müşteri deneyimlerine göre", paymentPreview: "DEMO / ÖNİZLEME — ödeme henüz aktif değil" },
  de: { rating: "{rating} von 5 Sternen", reviews: "Kundenbewertungen", real: "Basierend auf echten Kundenerfahrungen", demo: "DEMO / TEST — keine echte Kundenbewertung", editorial: "Redaktionelle Beispiele · keine Kundenbewertungen", slide: "Bewertung {index}", country: "Land", previewRating: "Basierend auf echten Kundenerfahrungen", paymentPreview: "DEMO / VORSCHAU — Zahlung noch nicht verfügbar" },
  en: { rating: "{rating} out of 5 stars", reviews: "Customer reviews", real: "Based on real customer reviews", demo: "DEMO / TEST — not a real customer review", editorial: "Editorial examples · not customer reviews", slide: "Review {index}", country: "Country", previewRating: "Based on customer experiences", paymentPreview: "DEMO / PREVIEW — payment not yet available" },
});


/** Public reviews are additionally filtered on the server; demos can only appear in the Admin iframe. */
export function V2TrustReviews({ section, media, preview = false, onDestinationSearch }: { section: V2Section; media: V2Media; preview?: boolean; onDestinationSearch?: (() => void) | undefined }) {
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
      <div className="trust-story-copy relative z-10 min-w-0 lg:py-4">
        <Reveal className="trust-section-reveal"><p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary"><Users className="size-4 shrink-0" aria-hidden /><span>{v2Text(section, "eyebrow", locale)}</span></p></Reveal>
        <Reveal delay={70} className="trust-section-reveal"><h2 id={`${section.id}-title`} className="mt-5 font-display text-[1.625rem] font-bold leading-[1.08] text-foreground sm:text-5xl"><span className="block">{v2Text(section, "title", locale)}</span><span className="block text-success">{v2Text(section, "accent", locale)}</span></h2></Reveal>
        <Reveal delay={140} className="trust-section-reveal"><p className="mt-4 max-w-xl text-[13px] leading-[1.5] text-muted-foreground sm:text-base">{v2Text(section, "subtitle", locale)}</p></Reveal>
      </div>
      <Reveal delay={210} className="trust-section-reveal trust-story-visual pointer-events-none relative mt-5 pb-7 pt-6 lg:mt-0 lg:py-6">
        <div className="relative mx-auto w-[min(100%,34rem)] lg:w-full">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-card shadow-panel lg:aspect-[4/3]">
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

     {trustItems.length > 0 && <Reveal delay={210} className="trust-section-reveal mt-5"><ul className={`grid grid-cols-1 gap-2.5 sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:bg-card sm:shadow-soft sm:ring-1 sm:ring-border ${trustItems.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
       {trustItems.map((item, index) => <li key={item.id} className={`flex min-w-0 items-center gap-3 rounded-2xl bg-card px-3 py-2 text-start shadow-soft ring-1 ring-border sm:flex-col sm:gap-0 sm:rounded-none sm:px-4 sm:pb-4 sm:pt-2 sm:text-center sm:shadow-none sm:ring-0 ${index > 0 ? "sm:border-s" : ""}`}>
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden sm:h-32 sm:w-full">{item.visualMode !== "ICON" && mediaUrl(item.mediaId, media) ? <img src={mediaUrl(item.mediaId, media)} alt={v2ItemText(item.imageAlt, locale) || media[item.mediaId ?? ""]?.alt || ""} loading="lazy" decoding="async" width={320} height={320} onLoad={(event) => { event.currentTarget.dataset['wide'] = String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight >= 2); }} className={`${BENEFIT_IMAGE_SIZE[item.imageScale ?? (item.id === "trust-payment" ? 160 : 100)] ?? BENEFIT_IMAGE_SIZE[100]} max-h-full shrink-0 object-contain data-[wide=true]:max-w-none`} /> : <StorefrontIcon name={item.icon} className="size-10 text-success sm:size-14" />}</span>
          <span className="min-w-0 flex-1 sm:w-full"><strong className="block w-full max-w-full min-w-0 hyphens-auto break-words text-[clamp(14px,3.9vw,17px)] leading-tight text-foreground sm:text-base">{v2ItemText(item.title, locale)}</strong><span className="mt-1 block w-full max-w-full min-w-0 hyphens-auto break-words text-xs leading-snug text-muted-foreground sm:text-sm">{v2ItemText(item.text, locale)}</span></span>
          {preview && item.id === "trust-payment" && <span className="mt-1 text-[8px] font-bold leading-tight text-muted-foreground">{labels.paymentPreview}</span>}
      </li>)}
    </ul></Reveal>}

    {settings?.whyEnabled !== false && <Reveal delay={140} className="trust-section-reveal mt-5 border-t border-border/70 pt-5">
      <div aria-labelledby={`${section.id}-why`}>
        <p className="text-xs font-bold uppercase tracking-wide text-success">{v2Text(section, "whyEyebrow", locale)}</p>
        <h3 id={`${section.id}-why`} className="mt-2 font-display text-xl font-bold leading-tight text-foreground sm:text-3xl">{v2Text(section, "whyTitle", locale)}</h3>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-base">{v2Text(section, "whyDescription", locale)}</p>
         {settings?.comparisonStatus !== "HIDDEN" && <RoamingComparison section={section} media={media} preview={preview} locale={locale} uiLocale={uiLocale} onDestinationSearch={onDestinationSearch} />}
      </div>
    </Reveal>}
     {v2Text(section, "cta", locale) && !(settings?.whyEnabled !== false && settings?.comparisonStatus !== "HIDDEN") && (onDestinationSearch ? <Button type="button" className="mt-4" onClick={onDestinationSearch}>{v2Text(section, "cta", locale)}</Button> : <Button asChild className="mt-4"><Link to={section.href}>{v2Text(section, "cta", locale)}</Link></Button>)}

  </section>;
}

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return <div className="flex items-center gap-1.5 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-border/50 backdrop-blur-sm sm:gap-2 sm:px-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-success [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[10px] leading-tight sm:text-xs"><strong className="block">{title}</strong>{text && <span className="block">{text}</span>}</span></div>;
}

function ReviewCard({ review, media, locale, uiLocale, ratingLabel, demoLabel }: { review: V2Item; media: V2Media; locale: Locale; uiLocale: keyof typeof LOCALE_REGISTRY; ratingLabel: string; demoLabel: string }) {
  const name = review.reviewType === "EDITORIAL" ? v2ItemText(review.title, locale) : review.title[review.originalLanguage ?? "en"] || v2ItemText(review.title, locale);
  const original = review.reviewType === "EDITORIAL" ? v2ItemText(review.text, locale) : review.text[review.originalLanguage ?? "en"] || "";
  const country = review.countryCode ? new Intl.DisplayNames([LOCALE_REGISTRY[uiLocale].bcp47], { type: "region" }).of(review.countryCode) : v2ItemText(review.cta, locale);
  return <article className="w-[min(55%,12rem)] shrink-0 snap-start rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border sm:w-[32%] lg:w-[calc((100%-1.5rem)/3)]">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary">{mediaUrl(review.mediaId, media) ? <img src={mediaUrl(review.mediaId, media)} alt="" loading="lazy" className="size-full object-cover" /> : <span aria-hidden>{name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>}</span><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{name}</strong><span className="flex items-center gap-1 text-xs text-muted-foreground">{review.countryCode && <CountryFlag iso={review.countryCode} className="h-3 w-4 shrink-0 rounded-sm" />}<span className="truncate">{country}</span></span></div></div>
    <div className="mt-3 flex gap-0.5 text-success" role="img" aria-label={ratingLabel.replace("{rating}", String(review.rating))}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
    <p lang={review.reviewType === "EDITORIAL" ? uiLocale : review.originalLanguage} className="mt-2 text-sm leading-relaxed text-muted-foreground">{original}</p>
    {review.reviewType === "DEMO" && <p className="mt-2 text-[10px] font-bold text-muted-foreground">{demoLabel}</p>}
  </article>;
}


const COMPARE = localize({
  tr: { eyebrow: "Roaming'e alternatif", pre: "En fazla", post: "daha uygun*", desc: "eSIM fiyatlarını seçili roaming teklifleriyle karşılaştırın.", cta: "eSIM fiyatlarını gör", roaming: "Operatör roaming", roamingSupport: "Yurt dışında yüksek maliyet", travely: "Travely eSIM", travelySupport: "Daha hesaplı internet", save: "Tasarrufunuz", advantage: "Fiyat avantajı", demo: "DEMO / ÖNİZLEME — yalnız yönetici görünümü", sample: "* Örnek karşılaştırma. Fiyatlar operatöre, ülkeye ve döneme göre değişebilir.", unavailable: "Henüz doğrulanmış fiyat karşılaştırması bulunmuyor.", fbHead: "Yurt dışında internet için paketini ve fiyatını önceden gör.", fbDesc: "Seyahat edeceğin ülke için eSIM seçeneklerini karşılaştır.", chart: "Fiyat karşılaştırması" },
  de: { eyebrow: "Die Alternative zum Roaming", pre: "Bis zu", post: "günstiger*", desc: "Vergleiche eSIM-Preise mit ausgewählten Roaming-Angeboten.", cta: "eSIM-Preise ansehen", roaming: "Mobilfunk-Roaming", roamingSupport: "Hohe Kosten im Ausland", travely: "Travely eSIM", travelySupport: "Mehr Freiheit für weniger", save: "Du sparst", advantage: "Preisvorteil", demo: "DEMO / ÖNİZLEME — yalnız yönetici görünümü", sample: "* Beispielvergleich. Preise können je nach Anbieter, Land und Zeitraum variieren.", unavailable: "Henüz doğrulanmış fiyat karşılaştırması bulunmuyor.", fbHead: "Internet fürs Ausland – transparent und ohne überraschende Roaming-Kosten.", fbDesc: "Vergleiche unsere eSIM-Pakete für dein Reiseziel.", chart: "Preisvergleich" },
  en: { eyebrow: "The alternative to roaming", pre: "Up to", post: "cheaper*", desc: "Compare eSIM prices with selected roaming offers.", cta: "See eSIM prices", roaming: "Carrier roaming", roamingSupport: "Higher costs abroad", travely: "Travely eSIM", travelySupport: "More freedom for less", save: "You save", advantage: "Price advantage", demo: "DEMO / ÖNİZLEME — yalnız yönetici görünümü", sample: "* Example comparison. Prices may vary by provider, country and period.", unavailable: "Henüz doğrulanmış fiyat karşılaştırması bulunmuyor.", fbHead: "Internet abroad – transparent, with no surprise roaming charges.", fbDesc: "Compare our eSIM packages for your destination.", chart: "Price comparison" },
});

/** Labelled sample shown only inside the Admin preview when no verified figures exist. */
const SAMPLE_FIGURES = { roaming: 21.99, travely: 10.99, saving: 11, percent: 50 };

/**
 * Structured comparison animates calculated prices; IMAGE mode retains the CMS-selected graphic.
 * Public: only VERIFIED figures. Admin preview: labelled sample when not verified.
 */
function RoamingComparison({ section, media, preview, locale, uiLocale, onDestinationSearch }: { section: V2Section; media: V2Media; preview: boolean; locale: Locale; uiLocale: keyof typeof LOCALE_REGISTRY; onDestinationSearch?: (() => void) | undefined }) {
  const c = COMPARE[locale];
  const t = (key: string) => v2Text(section, key, locale);
  const trust = section.trust;
  const figures = comparisonFigures(trust);
  const verified = trust?.comparisonStatus === "VERIFIED" && trust.comparisonPreviewOnly === false && Boolean(trust.comparisonVerifiedAt) && figures !== null;
  const demo = !verified && preview && trust?.comparisonStatus !== "HIDDEN";
  const data = verified ? figures : demo ? (figures ?? SAMPLE_FIGURES) : null;
  const bcp47 = LOCALE_REGISTRY[uiLocale].bcp47;
  const comparisonRef = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [instant, setInstant] = useState(false);
  useEffect(() => {
    if (trust?.comparisonMode === "IMAGE" || !data || played.current) return;
    const node = comparisonRef.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) { played.current = true; setInstant(true); return; }
    let frame = 0;
    let start = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || played.current) return;
      played.current = true;
      observer.disconnect();
      const tick = (now: number) => {
        if (!start) start = now;
        const next = Math.min(1600, now - start);
        setElapsed(next);
        if (next < 1600) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [data?.roaming, data?.travely, trust?.comparisonMode]);
  const ease = (value: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
  const redProgress = instant ? 1 : ease(elapsed / 1250);
  const tealProgress = instant ? 1 : ease((elapsed - 200) / 1050);
  const revealed = instant || elapsed >= 1100;
  // IMAGE mode: one finished graphic replaces the structured card. Same verification gate — public only when VERIFIED.
  if (trust?.comparisonMode === "IMAGE") {
    const desktop = mediaUrl(trust.comparisonImageId ?? null, media);
    const mobile = mediaUrl(trust.comparisonMobileImageId ?? null, media) ?? desktop;
    // Intrinsic dimensions reserve the exact box before the (lazy) image arrives, per breakpoint.
    const desktopAsset = media[trust.comparisonImageId ?? ""];
    const mobileAsset = trust.comparisonMobileImageId ? media[trust.comparisonMobileImageId] : undefined;
    const dims = (asset?: { width?: number; height?: number }) => asset?.width && asset.height ? { width: asset.width, height: asset.height } : {};
    const imageVerified = trust.comparisonStatus === "VERIFIED" && Boolean(trust.comparisonVerifiedAt);
    if (!desktop || (!imageVerified && !preview)) return null;
    const alt = v2ItemText(trust.comparisonImageAlt ?? { tr: "", de: "", en: "" }, locale) || media[trust.comparisonImageId ?? ""]?.alt || "";
    return <div className="mt-4 min-w-0 overflow-hidden rounded-2xl">
      {preview && !imageVerified && <p className="mb-2 inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary">{c.demo}</p>}
      <picture><source media="(max-width: 639px)" srcSet={mobile} {...dims(mobileAsset ?? desktopAsset)} /><img src={desktop} alt={alt} loading="lazy" decoding="async" {...dims(desktopAsset)} className="mx-auto block h-auto w-full max-w-5xl rounded-2xl object-contain" /></picture>
    </div>;
  }
  const money = (n: number) => new Intl.NumberFormat(bcp47, { style: "currency", currency: "EUR" }).format(n);
  const pct = (n: number) => new Intl.NumberFormat(bcp47, { style: "percent", maximumFractionDigits: 0 }).format(n / 100);
  const cta = t("comparisonCta") || c.cta;
  const ctaClass = "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-soft transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 motion-reduce:transition-none";
  const ctaNode = onDestinationSearch && section.href === "/esim"
    ? <Button type="button" className={ctaClass} onClick={onDestinationSearch}><Search className="size-4 shrink-0" aria-hidden />{cta}<ArrowRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden /></Button>
    : <Button asChild className={ctaClass}><Link to={section.href}><Search className="size-4 shrink-0" aria-hidden />{cta}<ArrowRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden /></Link></Button>;
  const reference = [t("comparisonDestination"), t("comparisonAllowance"), t("comparisonValidity")].filter(Boolean).join(" · ");

  return <div ref={comparisonRef} data-roaming-comparison className="mx-auto mt-5 min-w-0 max-w-4xl overflow-hidden rounded-2xl border border-border bg-secondary p-4 shadow-soft sm:p-6 lg:p-8">
    {!data ? <div className="min-w-0">
      {demo && <p className="mb-3 inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary">{c.demo}</p>}
      {preview && <p className="mt-3 inline-block rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{c.unavailable}</p>}
      <p className="max-w-md font-display text-2xl font-bold leading-tight text-foreground">{c.fbHead}</p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">{c.fbDesc}</p>
      {ctaNode}
    </div> : <div role="group" aria-label={c.chart} className="min-w-0">
      {demo && <p className="mb-3 inline-block rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary">{c.demo}</p>}
      <div className="mb-5 px-1 sm:mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-success">{t("comparisonTitle") || c.eyebrow}</p>
        <h4 className="mt-2 font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">
          <span>{c.pre} </span><bdi className="text-primary">{pct(data.percent)}</bdi><span> {t("statisticLabel") || c.post}</span>
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t("comparisonDescription") || c.desc}</p>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {([{"key": "roaming", "label": t("comparisonALabel") || c.roaming, "support": t("comparisonASupport") || c.roamingSupport, "price": data.roaming, "progress": redProgress, "ratio": data.roaming / Math.max(data.roaming, data.travely), "Icon": RadioTower}, {"key": "travely", "label": t("comparisonBLabel") || c.travely, "support": t("comparisonBSupport") || c.travelySupport, "price": data.travely, "progress": tealProgress, "ratio": data.travely / Math.max(data.roaming, data.travely), "Icon": Signal}] as const).map((row) => <div key={row.key} data-comparison-row={row.key} className="min-w-0 rounded-xl border border-border/60 bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4"><span className={`grid size-10 shrink-0 place-items-center rounded-full ${row.key === "roaming" ? "bg-comparison-coral/10 text-comparison-coral" : "bg-primary-soft text-primary"}`}><row.Icon className="size-5" aria-hidden /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold leading-tight text-foreground sm:text-base">{row.label}</p>{row.support && <p className="mt-0.5 break-words text-xs leading-snug text-muted-foreground sm:text-sm">{row.support}</p>}</div><div className="min-w-0 shrink-0 text-end"><span className="sr-only">{money(row.price)}</span><span className="grid font-display text-xl font-bold tabular-nums text-foreground sm:text-3xl"><bdi aria-hidden="true" className="invisible col-start-1 row-start-1">{money(row.price)}</bdi><bdi aria-hidden="true" className="col-start-1 row-start-1 self-center whitespace-nowrap">{money(Math.round(row.price * row.progress * 100) / 100)}</bdi></span></div></div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted sm:h-3.5"><div data-price-bar={row.key} className={`h-full w-full origin-left rounded-full rtl:origin-right ${row.key === "roaming" ? "bg-comparison-coral" : "bg-primary"}`} style={{ transform: `scaleX(${row.ratio * row.progress})` }} aria-hidden /></div>
        </div>)}
      </div>
      <div data-savings className={`mt-3 grid min-h-28 grid-cols-2 items-center gap-2 rounded-xl border border-border/60 bg-petrol-soft px-4 py-4 sm:px-7 ${revealed ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"} transition-[opacity,transform] duration-500 motion-reduce:transition-none`}>
        <div className="min-w-0 border-e border-border pe-3"><p className="break-words text-[11px] font-bold uppercase text-muted-foreground sm:text-xs">{t("comparisonSavingLabel") || c.save}</p><bdi className="mt-1 block font-display text-2xl font-bold tabular-nums text-foreground sm:text-4xl">{money(data.saving)}</bdi></div>
        <div className="min-w-0 ps-2"><bdi className="block font-display text-3xl font-bold tabular-nums text-primary sm:text-4xl">{pct(data.percent)}</bdi><p className="break-words text-xs font-semibold text-muted-foreground sm:text-sm">{t("comparisonAdvantageLabel") || c.advantage}</p></div>
      </div>
      <div className="px-1">{ctaNode}</div>
      {reference && <p className="mt-4 text-xs font-semibold text-muted-foreground">{reference}</p>}
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t("comparisonFootnote") || c.sample}</p>
    </div>}
  </div>;
}
