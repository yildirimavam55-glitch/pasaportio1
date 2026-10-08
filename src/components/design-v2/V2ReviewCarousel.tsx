import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Globe2, Plane, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useI18n } from '@/i18n';
import { v2ItemText, type V2Section } from '@/domain/storefront/v2';
import { publicReview, reviewAutoplay } from '@/domain/storefront/trust-comparison';
import { REVIEW_INTERVAL_MS, reviewCapacity, reviewExcerpt, combinedSourceRating, starFill } from '@/domain/storefront/review-carousel';
import { STORY_COPY } from './trust-story-copy';
import { ReviewSourceMark } from './ReviewSourceMark';

function RatingStars({ rating }: { rating: number }) {
  return <div className="combined-stars" role="img" aria-label={`${rating.toFixed(1)} / 5`}>{Array.from({length:5},(_,i)=><span className="partial-star" key={i}><Star aria-hidden="true"/><span style={{width:`${starFill(rating,i)}%`} as CSSProperties}><Star aria-hidden="true" fill="currentColor"/></span></span>)}</div>;
}
export function V2ReviewCarousel({ section, preview }: { section: V2Section; preview: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = STORY_COPY[uiLocale as keyof typeof STORY_COPY] ?? STORY_COPY[locale];
  const sampleMode = preview && section.trust?.reviewSampleMode !== false;
  const genuine = section.items.filter(publicReview).filter(r => r.cardType === 'review').map(r => ({
    id:r.id, text:r.text[r.originalLanguage ?? 'en'] || v2ItemText(r.text,locale), name:r.title[r.originalLanguage ?? 'en'] || v2ItemText(r.title,locale),
    rating:r.rating, source:r.reviewSource ?? 'Direct', url:r.reviewSourceUrl, date:r.reviewDate, sample:false,
  }));
  const samples = c.samples.map((text,i)=>({id:`sample-${i}`,text,name:c.traveler,rating:5,source:i===1?'Trustpilot':'Google',url:undefined,date:undefined,sample:true}));
  const reviews = sampleMode ? [...samples.filter(r=>!genuine.some(g=>g.source===r.source)),...genuine] : genuine;
  const realSummary = combinedSourceRating(section.trust?.sourceRatings);
  const summary = realSummary ?? (sampleMode ? {rating:4.8,displayRating:4.8,count:210} : null);
  const rail=useRef<HTMLDivElement>(null),region=useRef<HTMLDivElement>(null),settle=useRef<ReturnType<typeof setTimeout>|null>(null),touchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [active,setActive]=useState(0),[capacity,setCapacity]=useState(1),[touch,setTouch]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(false),[tab,setTab]=useState(true),[reduced,setReduced]=useState(false);
  const enough=reviews.length>capacity;
  const move=(index:number)=>{
    const node=rail.current,card=node?.firstElementChild as HTMLElement|null;
    if(!node||!card)return;
    const count=reviews.length,n=(index+count)%count,loop=index===count;
    const left=(getComputedStyle(node).direction==='rtl'?-1:1)*(card.offsetWidth+12);
    node.scrollTo({left:(loop?count:n)*left,behavior:reduced?'instant':'smooth'});
    if(settle.current)clearTimeout(settle.current);
    if(loop)settle.current=setTimeout(()=>node.scrollTo({left:0,behavior:'instant'}),650);
    setActive(n);
  };
  const releaseTouch=()=>{if(touchTimer.current)clearTimeout(touchTimer.current);touchTimer.current=setTimeout(()=>setTouch(false),1200);};
  useEffect(()=>{
    const node=region.current,track=rail.current;if(!node||!track)return;
    const observer=new IntersectionObserver(([e])=>setVisible(Boolean(e?.isIntersecting)),{threshold:.15});observer.observe(node);
    const resize=new ResizeObserver(()=>setCapacity(reviewCapacity(track.clientWidth)));resize.observe(track);
    const mq=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(mq.matches),visibility=()=>setTab(!document.hidden);
    motion();visibility();mq.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();resize.disconnect();mq.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);if(settle.current)clearTimeout(settle.current);if(touchTimer.current)clearTimeout(touchTimer.current);};
  },[reviews.length]);
  useEffect(()=>{setActive(0);rail.current?.scrollTo({left:0,behavior:'instant'});},[capacity,uiLocale,reviews.length]);
  useEffect(()=>{
    if(!reviewAutoplay({enough,paused:touch,hover,focused,visible,tab,reduced}))return;
    const timer=setInterval(()=>move(active+1),REVIEW_INTERVAL_MS);return()=>clearInterval(timer);
  },[enough,touch,hover,focused,visible,tab,reduced,active]);
  if(!reviews.length&&!summary)return null;
  const heading=section.text['familyReviewsTitle']?.[uiLocale]||section.text['familyReviewsTitle']?.[locale]||c.reviews;
  const renderCards=enough?[...reviews,...reviews.slice(0,capacity)]:reviews;
  return <div className="family-reviews approved-reviews combined-reviews" ref={region} role="region" aria-label={heading}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <Plane className="review-plane" aria-hidden="true"/><Globe2 className="review-globe" aria-hidden="true"/>
    <div className="family-review-heading"><h3>{heading}</h3></div>
    <div className="review-rating-summary">
      <div className="family-source-marks"><ReviewSourceMark source="Google"/><span className="review-source-divider" aria-hidden="true"/><ReviewSourceMark source="Trustpilot"/></div>
      {summary&&<><RatingStars rating={summary.rating}/><div className="combined-score"><bdi>{summary.displayRating.toFixed(1)} / 5</bdi><span>{new Intl.NumberFormat(uiLocale).format(summary.count)} {c.reviewCountLabel}</span></div></>}
    </div>
    {summary&&<p className="combined-caption">{realSummary?c.combinedLabel:c.combinedCaption}</p>}
    <div className="family-review-rail" ref={rail} tabIndex={0} aria-label={heading}
      onPointerDown={()=>{setTouch(true);if(touchTimer.current)clearTimeout(touchTimer.current);}} onPointerUp={releaseTouch} onPointerCancel={releaseTouch}
      onWheel={()=>{setTouch(true);releaseTouch();}}
      onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(active+(e.key==='ArrowRight'?1:-1)*(getComputedStyle(e.currentTarget).direction==='rtl'?-1:1));}}}
      onScroll={e=>{const card=e.currentTarget.firstElementChild as HTMLElement|null;if(card){const n=Math.round(Math.abs(e.currentTarget.scrollLeft)/(card.offsetWidth+12));if(n<reviews.length)setActive(n);}}}>
      {renderCards.map((r,i)=>{const excerpt=reviewExcerpt(r.text),clone=i>=reviews.length;return <article key={`${r.id}-${i}`} className="family-review-card" data-review-source={r.source} aria-hidden={clone||undefined} inert={clone||undefined}>
        <div className="review-card-top">{r.url?<a href={r.url} target="_blank" rel="noopener noreferrer"><ReviewSourceMark source={r.source}/></a>:<ReviewSourceMark source={r.source}/>}<div className="family-stars" aria-label={`${r.rating} / 5`}>{Array.from({length:r.rating},(_,i)=><Star key={i} fill="currentColor" aria-hidden="true"/>)}</div></div>
        <p>“{excerpt.text}”</p>
        {excerpt.truncated&&!clone&&<Dialog><DialogTrigger asChild><Button className="review-read-more" variant="ghost">{c.readMore}<ArrowRight className="rtl:rotate-180"/></Button></DialogTrigger><DialogContent><DialogTitle>{r.name}</DialogTitle><DialogDescription>{r.text}</DialogDescription></DialogContent></Dialog>}
        <footer className="review-card-identity"><span className="review-avatar" aria-hidden="true">{r.sample?'EX':r.name.slice(0,2).toUpperCase()}</span><div className="reviewer-name"><strong>{r.name}</strong>{r.sample?<span className="sample-badge">{c.sample}</span>:r.date&&<time dateTime={r.date}>{r.date}</time>}</div></footer>
      </article>;})}
    </div>
    {enough&&<div className="review-pagination">{reviews.map((r,i)=><Button key={r.id} variant="ghost" size="icon" aria-label={`${c.slide} ${i+1}`} aria-current={active===i?'true':undefined} onClick={()=>move(i)}><span className="review-dot"/></Button>)}</div>}
  </div>;
}
