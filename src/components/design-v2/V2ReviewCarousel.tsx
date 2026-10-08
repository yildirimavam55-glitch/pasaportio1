import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useI18n } from '@/i18n';
import { v2ItemText, type V2Section } from '@/domain/storefront/v2';
import { publicReview, reviewAutoplay } from '@/domain/storefront/trust-comparison';
import { REVIEW_INTERVAL_MS, reviewCapacity, reviewExcerpt, reviewPositionCount } from '@/domain/storefront/review-carousel';
import { STORY_COPY } from './trust-story-copy';
import { ReviewSourceMark } from './ReviewSourceMark';

export function V2ReviewCarousel({ section, preview }: { section: V2Section; preview: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = STORY_COPY[uiLocale as keyof typeof STORY_COPY] ?? STORY_COPY[locale];
  const genuine = section.items.filter(publicReview).filter(r => r.cardType === 'review').map(r => ({
    id: r.id, text: r.text[r.originalLanguage ?? 'en'] || v2ItemText(r.text, locale),
    name: r.title[r.originalLanguage ?? 'en'] || v2ItemText(r.title, locale), rating: r.rating,
    source: r.reviewSource ?? 'Direct', url: r.reviewSourceUrl, date: r.reviewDate, sample: false,
  }));
  const samples = c.samples.map((text, i) => ({ id: `sample-${i}`, text, name: c.traveler,
    rating: 5, source: i === 1 ? 'Trustpilot' : 'Google', url: undefined, date: undefined, sample: true }));
  const reviews = preview ? [...samples.filter(r => !genuine.some(g => g.source === r.source)), ...genuine] : genuine;
  const rail = useRef<HTMLDivElement>(null), region = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0), [capacity, setCapacity] = useState(1);
  const [paused, setPaused] = useState(false), [hover, setHover] = useState(false), [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false), [tab, setTab] = useState(true), [reduced, setReduced] = useState(false);
  const positions = reviewPositionCount(reviews.length, capacity);
  const move = (index: number, manual = true) => {
    if (manual) setPaused(true);
    const next = (index + positions) % positions, node = rail.current;
    const card = node?.firstElementChild as HTMLElement | null;
    if (node && card) node.scrollTo({ left: (getComputedStyle(node).direction === 'rtl' ? -1 : 1) * next * (card.offsetWidth + 12), behavior: reduced ? 'instant' : 'smooth' });
    setActive(next);
  };
  useEffect(() => {
    const node = region.current, track = rail.current;
    if (!node || !track) return;
    const observer = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: .15 });
    observer.observe(node);
    const resize = new ResizeObserver(() => setCapacity(reviewCapacity(track.clientWidth)));
    resize.observe(track);
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(mq.matches), visibility = () => setTab(!document.hidden);
    motion(); visibility(); mq.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); resize.disconnect(); mq.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, [reviews.length]);
  useEffect(() => { move(Math.min(active, positions - 1), false); }, [capacity, reviews.length]);
  useEffect(() => {
    if (!reviewAutoplay({ enough: positions > 1, paused, hover, focused, visible, tab, reduced })) return;
    const timer = setInterval(() => move(active + 1, false), REVIEW_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [positions, paused, hover, focused, visible, tab, reduced, active]);
  if (!reviews.length) return null;
  const hasSamples = reviews.some(r => r.sample);
  const heading = section.text['familyReviewsTitle']?.[uiLocale] || section.text['familyReviewsTitle']?.[locale] || c.reviews;
  return <div className="family-reviews approved-reviews" ref={region} role="region" aria-label={heading}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
    <div className="family-review-heading"><h3>{heading}</h3>
      <div className="family-source-marks"><ReviewSourceMark source="Google"/><span className="review-source-divider" aria-hidden="true"/><ReviewSourceMark source="Trustpilot"/></div>
      {hasSamples && <p className="review-design-notice">{c.previewNotice}</p>}
    </div>
    <div className="family-review-rail" ref={rail} tabIndex={0} aria-label={heading}
      onPointerDown={() => setPaused(true)} onWheel={() => setPaused(true)}
      onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(active + (e.key === 'ArrowRight' ? 1 : -1) * (getComputedStyle(e.currentTarget).direction === 'rtl' ? -1 : 1)); } }}
      onScroll={e => { const card = e.currentTarget.firstElementChild as HTMLElement | null; if (card) setActive(Math.max(0, Math.min(positions - 1, Math.round(Math.abs(e.currentTarget.scrollLeft) / (card.offsetWidth + 12))))); }}>
      {reviews.map(r => { const excerpt = reviewExcerpt(r.text); return <article key={r.id} className="family-review-card" data-review-source={r.source}>
        <header className="review-card-identity"><span className="review-avatar" aria-hidden="true">{r.sample ? 'EX' : r.name.slice(0, 2).toUpperCase()}</span>
          <div className="reviewer-name"><strong>{r.name}</strong>{r.sample && <span className="sample-badge">{c.sample}</span>}</div>
          {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer"><ReviewSourceMark source={r.source}/></a> : <ReviewSourceMark source={r.source}/>}</header>
        <div className="family-stars" aria-label={`${r.rating} / 5`}>{Array.from({ length: r.rating }, (_, i) => <Star key={i} fill="currentColor" aria-hidden="true"/>)}</div>
        <p>“{excerpt.text}”</p>
        {excerpt.truncated && <Dialog onOpenChange={open => { if (open) setPaused(true); }}><DialogTrigger asChild><Button className="review-read-more" variant="ghost">{c.readMore}<ArrowRight className="rtl:rotate-180"/></Button></DialogTrigger><DialogContent><DialogTitle>{r.name}</DialogTitle><DialogDescription className="whitespace-pre-wrap">{r.text}</DialogDescription></DialogContent></Dialog>}
        {r.date && <time className="review-date" dateTime={r.date}>{r.date}</time>}
      </article>; })}
    </div>
    {positions > 1 && <div className="family-carousel-controls">
      <Button variant="ghost" size="icon" aria-label={c.previous} onClick={() => move(active - 1)}><ArrowLeft/></Button>
      <div>{Array.from({ length: positions }, (_, i) => <Button key={i} variant="ghost" size="icon" aria-label={`${c.slide} ${i + 1}`} aria-current={active === i ? 'true' : undefined} onClick={() => move(i)}><span className="review-dot"/></Button>)}</div>
      <Button variant="ghost" size="icon" aria-label={paused ? c.resume : c.pause} onClick={() => setPaused(!paused)}>{paused ? <Play/> : <Pause/>}</Button>
      <Button variant="ghost" size="icon" aria-label={c.next} onClick={() => move(active + 1)}><ArrowRight/></Button>
    </div>}
    {hasSamples && <p className="family-preview-note">{c.note}</p>}
  </div>;
}