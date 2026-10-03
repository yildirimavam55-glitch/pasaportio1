import { useRef, useState } from "react";
import { Globe2, Heart, Star, Users, Wallet, Zap } from "lucide-react";
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
import giuliaAvatar from "@/assets/trust-demo-giulia.jpg";
import harutoAvatar from "@/assets/trust-demo-haruto.jpg";
import emilyAvatar from "@/assets/trust-demo-emily.jpg";

const LABELS = localize({
  tr: { rating: "5 üzerinden {rating} yıldız", reviews: "Müşteri yorumları", real: "Gerçek müşteri yorumlarına dayalı", demo: "DEMO / TEST — gerçek müşteri yorumu değildir", slide: "Yorum {index}", country: "Ülke", previewRating: "Müşteri deneyimlerine göre", paymentPreview: "DEMO / ÖNİZLEME — ödeme henüz aktif değil" },
  de: { rating: "{rating} von 5 Sternen", reviews: "Kundenbewertungen", real: "Basierend auf echten Kundenerfahrungen", demo: "DEMO / TEST — keine echte Kundenbewertung", slide: "Bewertung {index}", country: "Land", previewRating: "Basierend auf echten Kundenerfahrungen", paymentPreview: "DEMO / VORSCHAU — Zahlung noch nicht verfügbar" },
  en: { rating: "{rating} out of 5 stars", reviews: "Customer reviews", real: "Based on real customer reviews", demo: "DEMO / TEST — not a real customer review", slide: "Review {index}", country: "Country", previewRating: "Based on customer experiences", paymentPreview: "DEMO / PREVIEW — payment not yet available" },
});

/** Only the authenticated CMS iframe displays the unverified comparison test. */
const WHY = localize({
  tr: { eyebrow: "Neden Travely?", title: ["Daha az risk.", "Daha uygun internet.", "Daha kolay seyahat."], body: "eSIM paketini seç, fiyatını baştan gör ve birkaç adımda bağlantıya hazır ol.", roamingTitle: "Roaming'e alternatif", roamingText: "Roaming'e alternatif, seyahatinize uygun eSIM paketlerini keşfedin.", offerTop: "ROAMING'E KIYASLA", offerLabel: "FİYAT AVANTAJI*", offerBottom: "Seçili roaming tekliflerine kıyasla", footnote: "*Tasarım testi için önizleme değeridir. Nihai fiyat avantajı, yayın öncesinde doğrulanmış Travely ve roaming fiyatlarıyla belirlenecektir." },
  de: { eyebrow: "Warum Travely?", title: ["Weniger Risiko.", "Günstigeres Internet.", "Einfacher reisen."], body: "eSIM-Paket wählen, den Preis vorab sehen und in wenigen Schritten verbunden sein.", roamingTitle: "Die Alternative zum Roaming", roamingText: "Entdecke als Alternative zum Roaming eSIM-Pakete, die zu deiner Reise passen.", offerTop: "BIS ZU", offerLabel: "PREISVORTEIL", offerBottom: "gegenüber ausgewählten Roaming-Angeboten*", footnote: "*Vorschauwert für den Design-Test. Der endgültige Preisvorteil wird vor Veröffentlichung anhand verifizierter Travely- und Roamingpreise festgelegt." },
  en: { eyebrow: "Why Travely?", title: ["Less risk.", "Better-value internet.", "Easier travel."], body: "Choose an eSIM plan, see the price up front and get connected in a few steps.", roamingTitle: "An alternative to roaming", roamingText: "Discover eSIM plans that suit your trip as an alternative to roaming.", offerTop: "UP TO", offerLabel: "PRICE ADVANTAGE", offerBottom: "compared with selected roaming offers*", footnote: "*Preview value for design testing. The final price advantage will be determined from verified Travely and roaming prices before publication." },
});

/** Local presentation fixtures, never included in CMS data or customer-review statistics. */
const PREVIEW_REVIEWS = [
  { name: "Laura M.", countryCode: "IT", rating: 5, text: "Hat in ganz Italien problemlos funktioniert. Die Einrichtung war einfach und die Verbindung während meiner Reise stabil.", avatar: giuliaAvatar },
  { name: "Max T.", countryCode: "JP", rating: 5, text: "Sofort nach dem Kauf eingerichtet. In Tokio, Osaka und Kyoto überall problemlos verbunden.", avatar: harutoAvatar },
  { name: "Sophie K.", countryCode: "US", rating: 5, text: "Einfach, schnell und zuverlässig. Bei einer Frage habe ich über WhatsApp direkt Hilfe bekommen.", avatar: emilyAvatar },
  { name: "Daniel R.", countryCode: "TH", rating: 5, text: "Vor der Reise eingerichtet und nach der Ankunft direkt verbunden." },
  { name: "Anna L.", countryCode: "AE", rating: 4, text: "Die Einrichtung war unkompliziert und für meine Reise eine sehr praktische Lösung." },
  { name: "Mert K.", countryCode: "TR", rating: 5, text: "Schnell gekauft, einfach installiert und direkt einsatzbereit." },
] as const;

/** Public reviews are additionally filtered on the server; demos can only appear in the Admin iframe. */
export function V2TrustReviews({ section, media, preview = false }: { section: V2Section; media: V2Media; preview?: boolean }) {
  const { locale, uiLocale } = useI18n();
  const labels = LABELS[locale];
  const why = WHY[locale];
  const photo = mediaUrl(section.mediaId, media);
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reviews = section.items.filter((item) => item.visible && item.cardType === "review" && Boolean(item.text[item.originalLanguage ?? "en"]?.trim()) && (item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED" || preview && section.showDemoReviews && item.reviewType === "DEMO" && item.reviewStatus !== "ARCHIVED"));
  const realReviews = reviews.filter((item) => item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED");
  const displayReviews = preview && section.showDemoReviews ? PREVIEW_REVIEWS : reviews;
  const rating = realReviews.length ? (realReviews.reduce((sum, item) => sum + item.rating, 0) / realReviews.length).toFixed(1).replace(".", uiLocale === "en" ? "." : ",") : null;
  const trustItems = section.items.filter((item) => item.visible && item.cardType === "trust" && item.id !== "trust-payment");
  const visuals: Record<string, string> = { "trust-countries": globeVisual, "trust-refund": returnVisual, "trust-install": installVisual };
  const displayRating = preview && section.showDemoReviews ? (uiLocale === "en" ? "4.8" : "4,8") : rating;
  const scrollTo = (index: number) => rail.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });

  return <section aria-labelledby={`${section.id}-title`} className="trust-story relative -mx-4 mt-5 overflow-hidden rounded-[2rem] bg-petrol-soft px-6 pb-5 pt-5 sm:mx-0 sm:mt-8 sm:px-7 sm:pt-8 lg:px-10">
    <div className="trust-story-main relative min-h-[25rem] sm:min-h-[29rem] lg:grid lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-6">
      <div className="trust-story-copy relative z-10 min-w-0 lg:py-8">
        <Reveal className="trust-section-reveal"><p className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs font-bold text-primary"><Users className="size-4 shrink-0" aria-hidden /><span>{v2Text(section, "eyebrow", locale)}</span></p></Reveal>
        <Reveal delay={70} className="trust-section-reveal"><h2 id={`${section.id}-title`} className="mt-5 font-display text-[1.625rem] font-bold leading-[1.08] text-foreground sm:text-5xl"><span className="block">{v2Text(section, "title", locale)}</span><span className="block text-success">{v2Text(section, "accent", locale)}</span></h2></Reveal>
        <Reveal delay={140} className="trust-section-reveal"><p className="mt-4 max-w-[55%] text-[13px] leading-[1.5] text-muted-foreground sm:max-w-[52%] sm:text-base lg:max-w-lg">{v2Text(section, "subtitle", locale)}</p></Reveal>
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

    {displayReviews.length > 0 && <Reveal delay={140} className="trust-section-reveal mt-2">
      {displayRating && <div className="mb-4 flex flex-wrap items-start gap-x-3 gap-y-1"><span className="flex gap-0.5 text-success" role="img" aria-label={labels.rating.replace("{rating}", displayRating)}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} fill="currentColor" aria-hidden />)}</span><div><strong className="text-sm text-foreground">{displayRating} {uiLocale === "de" ? "von" : "/"} 5</strong><p className="text-xs text-muted-foreground">{preview && section.showDemoReviews ? labels.previewRating : labels.real}</p></div></div>}
      {preview && section.showDemoReviews && <p className="mb-2 text-[10px] font-bold text-muted-foreground">{labels.demo}</p>}
      <div ref={rail} role="region" aria-label={labels.reviews} tabIndex={displayReviews.length > 1 ? 0 : undefined} onScroll={(event) => { const node = event.currentTarget; const first = node.firstElementChild as HTMLElement | null; if (first) setActive(Math.min(displayReviews.length - 1, Math.round(Math.abs(node.scrollLeft) / (first.offsetWidth + 12)))); }} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {displayReviews.map((review) => "avatar" in review ? <PreviewReviewCard key={review.name} review={review} uiLocale={uiLocale} ratingLabel={labels.rating} /> : <ReviewCard key={review.id} review={review} media={media} locale={locale} uiLocale={uiLocale} ratingLabel={labels.rating} demoLabel={labels.demo} />)}
      </div>
       {displayReviews.length > 1 && <div className="mt-2 flex justify-center gap-1">{displayReviews.map((review, index) => <Button key={"name" in review ? review.name : review.id} type="button" variant="ghost" size="icon" onClick={() => scrollTo(index)} aria-label={labels.slide.replace("{index}", String(index + 1))} aria-current={active === index ? "true" : undefined} className="size-6 rounded-full p-0"><span className={`block size-2 rounded-full ${active === index ? "bg-success" : "bg-border"}`} /></Button>)}</div>}
    </Reveal>}

     {trustItems.length > 0 && <Reveal delay={210} className="trust-section-reveal mt-5"><ul className={`grid overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border ${trustItems.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
       {trustItems.map((item, index) => <li key={item.id} className={`flex min-w-0 flex-col items-center border-border px-1 pb-4 pt-2 text-center sm:px-4 ${index > 0 ? "border-l" : ""}`}>
         <img src={visuals[item.id] ?? globeVisual} alt="" loading="lazy" decoding="async" width={816} height={816} className="h-20 w-20 max-w-full object-contain sm:h-32 sm:w-32" />
         <strong className="text-[10px] leading-tight text-foreground sm:text-base">{v2ItemText(item.title, locale)}</strong><span className="mt-1 text-[9px] leading-snug text-muted-foreground sm:text-sm">{v2ItemText(item.text, locale)}</span>
      </li>)}
    </ul></Reveal>}

    <Reveal delay={140} className="trust-section-reveal mt-6 border-t border-border/70 pt-5" >
      <div aria-labelledby={`${section.id}-why`}>
        <p className="text-xs font-bold uppercase tracking-wide text-success">{why.eyebrow}</p>
        <h3 id={`${section.id}-why`} className="mt-2 font-display text-xl font-bold leading-tight text-foreground sm:text-3xl">{why.title.map((line) => <span key={line} className="block">{line}</span>)}</h3>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-base">{why.body}</p>
        {preview && <div className="mt-4 border-y border-border py-4 text-primary"><span className="block text-xs font-bold uppercase">{why.offerTop}</span><strong className="block font-display text-5xl leading-none sm:text-6xl">{uiLocale === "tr" ? "%50'YE VARAN" : uiLocale === "de" ? "50 %" : "50%"}</strong><span className="block text-sm font-bold uppercase">{why.offerLabel}</span><span className="mt-2 block text-xs text-muted-foreground">{why.offerBottom}</span><p className="mt-3 max-w-lg text-[11px] leading-relaxed text-muted-foreground">{why.footnote}</p></div>}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-success"><Wallet className="size-5" aria-hidden /></span>
          <div className="min-w-0"><strong className="block text-sm text-foreground">{why.roamingTitle}</strong><span className="block text-xs leading-snug text-muted-foreground">{why.roamingText}</span></div>
        </div>
      </div>
    </Reveal>
  </section>;
}

function BenefitChip({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return <div className="flex items-center gap-1.5 rounded-2xl bg-card/95 px-2 py-2 text-foreground shadow-card ring-1 ring-border/50 backdrop-blur-sm sm:gap-2 sm:px-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-success [&>svg]:size-4">{icon}</span><span className="min-w-0 text-[10px] leading-tight sm:text-xs"><strong className="block">{title}</strong>{text && <span className="block">{text}</span>}</span></div>;
}

function ReviewCard({ review, locale, uiLocale, ratingLabel, demoLabel }: { review: V2Item; media: V2Media; locale: Locale; uiLocale: keyof typeof LOCALE_REGISTRY; ratingLabel: string; demoLabel: string }) {
  const name = review.title[review.originalLanguage ?? "en"] || v2ItemText(review.title, locale);
  const original = review.text[review.originalLanguage ?? "en"] || "";
  const country = review.countryCode ? new Intl.DisplayNames([LOCALE_REGISTRY[uiLocale].bcp47], { type: "region" }).of(review.countryCode) : v2ItemText(review.cta, locale);
  return <article className="w-[min(55%,12rem)] shrink-0 snap-start rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border sm:w-[32%] lg:w-[30%]">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary"><span aria-hidden>{name.trim().slice(0, 1).toUpperCase()}</span></span><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{name}</strong><span className="flex items-center gap-1 text-xs text-muted-foreground">{review.countryCode && <CountryFlag iso={review.countryCode} className="h-3 w-4 shrink-0 rounded-sm" />}<span className="truncate">{country}</span></span></div></div>
    <div className="mt-3 flex gap-0.5 text-success" role="img" aria-label={ratingLabel.replace("{rating}", String(review.rating))}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-4" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
    <p lang={review.originalLanguage} className="mt-2 text-sm leading-relaxed text-muted-foreground">{original}</p>
    {review.reviewType === "DEMO" && <p className="mt-2 text-[10px] font-bold text-muted-foreground">{demoLabel}</p>}
  </article>;
}

function PreviewReviewCard({ review, uiLocale, ratingLabel }: { review: typeof PREVIEW_REVIEWS[number]; uiLocale: keyof typeof LOCALE_REGISTRY; ratingLabel: string }) {
  const country = new Intl.DisplayNames([LOCALE_REGISTRY[uiLocale].bcp47], { type: "region" }).of(review.countryCode);
  return <article className="w-[min(55%,12rem)] shrink-0 snap-start rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border sm:w-[32%] lg:w-[30%]">
    <div className="flex min-w-0 items-center gap-2">
      {"avatar" in review && review.avatar ? <img src={review.avatar} alt="" loading="lazy" className="size-9 shrink-0 rounded-full object-cover" /> : <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{review.name[0]}</span>}
      <div className="min-w-0"><strong className="block truncate text-xs text-foreground">{review.name}</strong><span className="flex items-center gap-1 text-[11px] text-muted-foreground"><CountryFlag iso={review.countryCode} className="h-3 w-4" /><span className="truncate">{country}</span></span></div>
    </div>
    <div className="mt-2 flex gap-0.5 text-success" role="img" aria-label={ratingLabel.replace("{rating}", String(review.rating))}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className="size-3" fill={index < review.rating ? "currentColor" : "none"} aria-hidden />)}</div>
    <p lang="de" className="mt-2 text-xs leading-snug text-muted-foreground">{review.text}</p>
  </article>;
}
