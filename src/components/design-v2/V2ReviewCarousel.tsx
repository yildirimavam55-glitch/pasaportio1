import { localize } from "@/i18n/overlay";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { type V2Section } from '@/domain/storefront/v2';
import { publicReview, reviewAutoplay } from '@/domain/storefront/trust-comparison';
import { HOMEPAGE_TEST_RATING, REVIEW_INTERVAL_MS, reviewDotIndices, reviewRatingSummary, reviewLanguagePresentation, starFill, reviewAdminSampleMode } from '@/domain/storefront/review-carousel';
import { STORY_COPY } from './trust-story-copy';
import { ReviewSourceMark } from './ReviewSourceMark';
import { REVIEW_COPY } from './review-copy';
import { useIsAdmin } from '@/components/AdminGate';

function RatingStars({ rating }: { rating: number }) {
  const id = useId();
  const path = 'm12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z';
  return <div className="combined-stars" role="img" aria-label={`${rating.toFixed(1)} / 5`}>{Array.from({length:5},(_,i)=><svg className="rating-star-svg" key={i} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id={`${id}-${i}`}><rect width={24 * starFill(rating,i) / 100} height="24"/></clipPath></defs><path className="rating-star-base" d={path} fill="currentColor" stroke="none"/><path className="rating-star-fill" d={path} fill="currentColor" stroke="none" clipPath={`url(#${id}-${i})`}/></svg>)}</div>;
}
const REVIEW_HEADINGS = localize({ tr: 'Gezginler ne diyor?', de: 'Das sagen Reisende', en: 'What travelers say', ar: 'ماذا يقول المسافرون' });
type PresentedReview = { id: string; text: string; name: string; rating: number; source: string; url?: string | undefined; date?: string | undefined; sample: boolean; originalText?: string; originalLanguage?: string; translated?: boolean };
function ReviewCard({ review: r, readMore, sampleLabel, locale, onReading }: { review: PresentedReview; readMore: string; sampleLabel: string; locale: string; onReading: (id: string, reading: boolean) => void }) {
  const text = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false), [long, setLong] = useState(false), [original, setOriginal] = useState(false);
  const copy = REVIEW_COPY[locale as keyof typeof REVIEW_COPY] ?? REVIEW_COPY.en;
  useEffect(() => {
    const node = text.current;
    if (!node || expanded) return;
    const measure = () => setLong(node.scrollHeight > node.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(node); measure();
    return () => observer.disconnect();
  }, [r.text, expanded]);
  const language = r.originalLanguage ? new Intl.DisplayNames([locale], { type: 'language' }).of(r.originalLanguage) : '';
  const toggleExpanded = () => { const next = !expanded; setExpanded(next); onReading(r.id, next || original); };
  const toggleOriginal = () => { const next = !original; setOriginal(next); onReading(r.id, next || expanded); };
  return <article className="family-review-card" data-review-source={r.source} data-expanded={expanded}>
    <div className="review-card-top">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer"><ReviewSourceMark source={r.source}/></a> : <ReviewSourceMark source={r.source}/>}<RatingStars rating={r.rating}/></div>
    {!r.sample && r.originalLanguage && (r.translated || r.originalLanguage !== locale) && <div className="review-language-note">{r.translated ? copy.translated : copy.language} · {language}</div>}
    <p ref={text} className="review-text" dir="auto" lang={r.translated ? locale : r.originalLanguage}>“{r.text}”</p>
    {(long || expanded) && <Button className="review-read-more" variant="ghost" aria-expanded={expanded} onClick={toggleExpanded}>{expanded ? copy.less : readMore}<ArrowRight className="rtl:rotate-180"/></Button>}
    {r.translated && <Button className="review-original-toggle" variant="ghost" aria-expanded={original} onClick={toggleOriginal}>{original ? copy.hideOriginal : copy.original}</Button>}
    {original && <div className="review-original-text" lang={r.originalLanguage} dir="auto">{r.originalText}</div>}
    <footer className="review-card-identity"><span className="review-avatar" aria-hidden="true">{r.sample ? 'EX' : r.name.slice(0,2).toUpperCase()}</span><div className="reviewer-name"><strong>{r.name}</strong>{r.sample ? <span className="sample-badge">{sampleLabel}</span> : r.date && <time dateTime={r.date}>{r.date}</time>}</div></footer>
  </article>;
}
export function V2ReviewCarousel({ section, preview }: { section: V2Section; preview: boolean }) {
  return preview ? <AdminReviewPreview section={section}/> : <ReviewCarousel section={section} adminPreview={false}/>;
}
function AdminReviewPreview({ section }: { section: V2Section }) {
  const isAdmin = useIsAdmin();
  return <ReviewCarousel section={section} adminPreview={isAdmin}/>;
}
function ReviewCarousel({ section, adminPreview }: { section: V2Section; adminPreview: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = STORY_COPY[uiLocale as keyof typeof STORY_COPY] ?? STORY_COPY[locale];
  const sampleMode = reviewAdminSampleMode(adminPreview, adminPreview, section.trust?.reviewSampleMode);
  const genuine = useMemo(() => section.items.filter(publicReview).filter(r => r.cardType === 'review')
    .map(r => ({ ...reviewLanguagePresentation(r, uiLocale), id: r.id, name: r.title[r.originalLanguage ?? 'en'] || r.title[locale] || '', rating: r.rating, url: r.reviewSourceUrl, date: r.reviewDate, sample: false }))
    .sort((a,b) => a.priority - b.priority), [section.items, uiLocale, locale]);
  const samples = c.samples.map((text,i)=>({id:`sample-${i}`,text,name:c.traveler,rating:5,source:i===1?'Trustpilot':'Google',sample:true}));
  const reviews: PresentedReview[] = sampleMode ? [...samples.filter(r=>!genuine.some(g=>g.source===r.source)),...genuine] : genuine;
  const cmsSummary = reviewRatingSummary(section.trust?.sourceRatings, sampleMode);
  const summary = cmsSummary ?? HOMEPAGE_TEST_RATING;
  const region=useRef<HTMLDivElement>(null), touchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [active,setActive]=useState(0), [enough,setEnough]=useState(false), [touch,setTouch]=useState(false), [hover,setHover]=useState(false), [focused,setFocused]=useState(false), [visible,setVisible]=useState(false), [tab,setTab]=useState(true), [reduced,setReduced]=useState(false);
  const [reading, setReading] = useState<string[]>([]);
  const onReading = useCallback((id: string, expanded: boolean) => setReading(ids => expanded ? [...new Set([...ids,id])] : ids.filter(value => value !== id)), []);
  const [viewport, carousel] = useEmblaCarousel({ loop: true, align: 'start', direction: uiLocale === 'ar' ? 'rtl' : 'ltr', containScroll: false, duration: reduced ? 0 : 25 });
  const releaseTouch=useCallback(()=>{if(touchTimer.current)clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>setTouch(false),1200);},[]);
  useEffect(() => {
    if (!carousel) return;
    const sync = () => { setActive(carousel.selectedScrollSnap()); setEnough(carousel.scrollSnapList().length > 1 && (carousel.canScrollNext() || carousel.canScrollPrev())); };
    const down = () => { setTouch(true); if(touchTimer.current)clearTimeout(touchTimer.current); };
    sync(); carousel.on('select',sync).on('reInit',sync).on('pointerDown',down).on('pointerUp',releaseTouch);
    return () => { carousel.off('select',sync).off('reInit',sync).off('pointerDown',down).off('pointerUp',releaseTouch); };
  }, [carousel, releaseTouch]);
  useEffect(()=>{
    const node=region.current;if(!node)return;
    const observer=new IntersectionObserver(([e])=>setVisible(Boolean(e?.isIntersecting)),{threshold:.15});observer.observe(node);
    const mq=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(mq.matches),visibility=()=>setTab(!document.hidden);
    motion();visibility();mq.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();mq.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);if(touchTimer.current)clearTimeout(touchTimer.current);};
  },[]);
  useEffect(()=>{setReading([]);carousel?.scrollTo(0,true);},[uiLocale,carousel,reviews.length]);
  useEffect(()=>{
    if(!carousel || !reviewAutoplay({enough,paused:touch || reading.length > 0,hover,focused,visible,tab,reduced}))return;
    const timer=setInterval(()=>carousel.scrollNext(),REVIEW_INTERVAL_MS);return()=>clearInterval(timer);
  },[carousel,enough,touch,reading.length,hover,focused,visible,tab,reduced]);
  const savedHeading=section.text['familyReviewsTitle']?.[uiLocale]||section.text['familyReviewsTitle']?.[locale];
  const heading=savedHeading && !Object.values(STORY_COPY).some(copy => copy.reviews === savedHeading) ? savedHeading : REVIEW_HEADINGS[uiLocale as keyof typeof REVIEW_HEADINGS] ?? REVIEW_HEADINGS[locale];
  return <div id="traveler-reviews" className="family-reviews approved-reviews combined-reviews" ref={region} role="region" aria-label={heading}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <div className="review-rating-summary" data-rating-available="true" data-storefront-test-rating={cmsSummary ? undefined : 'true'}>
      <div className="family-source-marks"><ReviewSourceMark source="Google"/><span className="review-source-divider" aria-hidden="true"/><ReviewSourceMark source="Trustpilot"/></div>
      <div className="combined-score"><RatingStars rating={summary.rating}/><bdi>{new Intl.NumberFormat(uiLocale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(summary.displayRating)}</bdi></div>
      <span className="combined-count">{new Intl.NumberFormat(uiLocale).format(summary.count)} {c.reviewCountLabel}</span>
    </div>
    {reviews.length > 0 && <div className="review-carousel-viewport" ref={viewport} onWheel={()=>{setTouch(true);releaseTouch();}}>
      <div className="family-review-rail" tabIndex={0} aria-label={heading}
        onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setTouch(true);releaseTouch();if((e.key==='ArrowRight') !== (uiLocale==='ar'))carousel?.scrollNext();else carousel?.scrollPrev();}}}>
        {reviews.map(r=><ReviewCard key={`${uiLocale}-${r.id}`} review={r} readMore={c.readMore} sampleLabel={c.sample} locale={uiLocale} onReading={onReading}/>)}
      </div>
    </div>}
    {enough&&<div className="review-pagination">{reviewDotIndices(carousel?.scrollSnapList().length ?? reviews.length,active).map(i=><Button key={i} variant="ghost" size="icon" aria-label={`${c.slide} ${i+1}`} aria-current={active===i?'true':undefined} onClick={()=>{setTouch(true);releaseTouch();carousel?.scrollTo(i,reduced);}}><span className="review-dot"/></Button>)}</div>}
  </div>;
}
