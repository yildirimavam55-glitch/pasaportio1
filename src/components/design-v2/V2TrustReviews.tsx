import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Globe2, Info, Pause, Play, RadioTower, Signal, Smartphone, Sparkles, Star, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { v2ItemText, v2Text, type V2Section } from '@/domain/storefront/v2';
import { comparisonScale, publicReview, verifiedComparison, reviewAutoplay, trustPreviewHost, comparisonForPresentation } from '@/domain/storefront/trust-comparison';
import type { V2Media } from '@/lib/v2-storefront.functions';
import { mediaUrl } from './V2Sections';
import { STORY_COPY } from './trust-story-copy';
import familyImage from '@/assets/pasaport-family-arrivals.jpg';
import { displayMoney } from '@/domain/currency/store';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { ReviewSourceMark } from './ReviewSourceMark';

export function V2TrustReviews({section,media,preview=false,onDestinationSearch}:{section:V2Section;media:V2Media;preview?:boolean;onDestinationSearch?:(()=>void)|undefined}) {
 const {locale,uiLocale}=useI18n(); useCurrency();
 const c=STORY_COPY[uiLocale as keyof typeof STORY_COPY]??STORY_COPY[locale];
 const [designPreview,setDesignPreview]=useState(preview);
 useEffect(()=>setDesignPreview(preview || trustPreviewHost(window.location.hostname)), [preview]);
 const photo=section.mediaId && !['builtin:trust-traveler','536a6bd7-2418-4668-8149-6b85bfd2b98d','533377df-ddd6-4803-a0cb-6f5727c933b6'].includes(section.mediaId)?mediaUrl(section.mediaId,media)??familyImage:familyImage;
 const genuine=section.items.filter(publicReview).filter(r=>r.cardType==='review').map(r=>({id:r.id,text:r.text[r.originalLanguage??'en']||v2ItemText(r.text,locale),name:r.title[r.originalLanguage??'en']||v2ItemText(r.title,locale),rating:r.rating,source:r.reviewSource??'Direct',url:r.reviewSourceUrl,date:r.reviewDate,sample:false}));
 const samples=c.samples.map((text,i)=>({id:`sample-${i}`,text,name:c.traveler,rating:5,source:i===0?'Google':'Trustpilot',url:undefined,date:undefined,sample:true}));
 const reviews=designPreview?[...samples.filter(s=>!genuine.some(r=>r.source===s.source)),...genuine]:genuine;
 const rail=useRef<HTMLDivElement>(null),region=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(false),[tab,setTab]=useState(true),[reduced,setReduced]=useState(false),[capacity,setCapacity]=useState(1);
 const canAdvance=reviews.length>capacity;
 const move=(index:number,manual=true)=>{ if(manual)setPaused(true); const positions=Math.max(1,reviews.length-capacity+1);const n=(index+positions)%positions; const node=rail.current; const card=node?.children[n] as HTMLElement|undefined; if(node&&card)node.scrollTo({left:(getComputedStyle(node).direction==='rtl'?-1:1)*n*(card.offsetWidth+12),behavior:reduced?'instant':'smooth'});setActive(n); };
 useEffect(()=>{const node=region.current;if(!node)return;const io=new IntersectionObserver(([e])=>setVisible(Boolean(e?.isIntersecting)),{threshold:.15});io.observe(node);const mq=matchMedia('(prefers-reduced-motion:reduce)'),desktop=matchMedia('(min-width:1024px)');const update=()=>{setReduced(mq.matches);setCapacity(desktop.matches?2:1);};update();mq.addEventListener('change',update);desktop.addEventListener('change',update);const visibility=()=>setTab(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{io.disconnect();mq.removeEventListener('change',update);desktop.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[reviews.length]);
 useEffect(()=>{if(!reviewAutoplay({enough:canAdvance,paused,hover,focused,visible,tab,reduced}))return;const timer=setInterval(()=>move((active+1)%(reviews.length-capacity+1),false),7000);return()=>clearInterval(timer);},[canAdvance,paused,hover,focused,visible,tab,reduced,active,reviews.length,capacity]);
 const approved=section.trust?.comparisonStatus==='VERIFIED' && !section.trust.comparisonPreviewOnly && Boolean(section.trust.comparisonVerifiedAt);
 const verified=verifiedComparison(section.trust?.comparisonEntries,approved);
 const entries=comparisonForPresentation(verified,designPreview);
 const ordered=entries?['roaming','other','pasaport'].map(k=>entries.find(e=>e.kind===k)).filter((e):e is NonNullable<typeof e>=>Boolean(e)):[];
 const bars=comparisonScale(ordered.map(e=>e.price));
 const comparison=useRef<HTMLDivElement>(null);
 const [barsRevealed,setBarsRevealed]=useState(false);
 useEffect(()=>{const node=comparison.current;if(!node||ordered.length===0)return;const mq=matchMedia('(prefers-reduced-motion:reduce)');if(mq.matches){setBarsRevealed(true);return;}const observer=new IntersectionObserver(([entry])=>{if(entry?.isIntersecting){setBarsRevealed(true);observer.disconnect();}},{threshold:.2});observer.observe(node);const motion=()=>{if(mq.matches){setBarsRevealed(true);observer.disconnect();}};mq.addEventListener('change',motion);return()=>{observer.disconnect();mq.removeEventListener('change',motion);};},[ordered.length]);
 const saving=ordered.length===3?Math.floor((1-(ordered[2]?.price??0)/Math.max(...ordered.slice(0,2).map(e=>e.price)))*100):0;
 const custom=(key:string,fallback:string)=> section.text[key]?.[uiLocale] || section.text[key]?.[locale] || fallback;
 return <section className="family-proof" data-family-proof>
  <div className="family-story"><div className="family-story-copy"><h2><span>{custom('familyTitle',c.title)}</span><span>{custom('familyAccent',c.accent)}</span></h2><p>{custom('familySubtitle',c.subtitle)}</p></div>
   <div className="family-scene"><img src={photo} alt="" width={1400} height={1000} loading="lazy" decoding="async"/><div className="family-phone" aria-label={c.chatNote}><div className="phone-status" aria-hidden="true">14:21 <Signal size={10}/></div><div className="phone-group"><ChevronLeft size={13}/><span>👨‍👩‍👧‍👦</span><strong>{custom("familyGroup",c.family)}</strong></div><div className="phone-chat">{c.chat.map((message,i)=><div key={i} className={`chat-bubble ${i>0&&i<4?'outgoing':''}`}>{custom(`familyChat${i}`,message)}<small aria-hidden="true">14:{12+i} {i>0&&i<4?'✓✓':''}</small></div>)}</div><div className="phone-input" aria-hidden="true">＋ <span>···</span> ♧</div></div></div>
  </div>
  <ul className="family-benefits">{[Zap,Globe2,Sparkles].map((Icon,i)=><li key={i}><span><Icon aria-hidden="true"/></span><strong>{custom(`familyBenefit${i}`,c.benefits[i]??"")}</strong></li>)}</ul>
  {reviews.length>0&&<div className="family-reviews" ref={region} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
    <div className="family-review-heading"><h3>{custom("familyReviewsTitle",c.reviews)}</h3><div className="family-source-marks">{(designPreview||reviews.some(r=>r.source==="Google"))&&<ReviewSourceMark source="Google"/>}{(designPreview||reviews.some(r=>r.source==="Trustpilot"))&&<ReviewSourceMark source="Trustpilot"/>}</div></div>
    <div className="family-review-rail" ref={rail} tabIndex={0} aria-label={c.reviews} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(active+(e.key==='ArrowRight'?1:-1)*(getComputedStyle(e.currentTarget).direction==='rtl'?-1:1));}}} onPointerDown={()=>setPaused(true)} onScroll={e=>{const node=e.currentTarget;const card=node.firstElementChild as HTMLElement|null;if(card)setActive(Math.min(reviews.length-capacity,Math.round(Math.abs(node.scrollLeft)/(card.offsetWidth+12))));}}>{reviews.map(r=><article key={r.id} className="family-review-card" data-review-source={r.source}>{r.sample&&<span className="sample-badge">{c.sample}</span>}<p>“{r.text}”</p><div className="family-stars" aria-label={`${r.rating} / 5`}>{Array.from({length:r.rating},(_,i)=><Star key={i} size={17} fill="currentColor"/>)}</div><footer><span className="review-avatar">{r.sample?'EX':r.name.slice(0,2).toUpperCase()}</span><span>{r.name}{r.date&&<small>{r.date}</small>}</span>{r.url?<a href={r.url} target="_blank" rel="noopener noreferrer"><ReviewSourceMark source={r.source}/></a>:<ReviewSourceMark source={r.source}/>}</footer></article>)}</div>
   {canAdvance&&<div className="family-carousel-controls"><Button variant="ghost" size="icon" aria-label={c.previous} onClick={()=>move(Math.max(0,active-1))}><ArrowLeft/></Button><div>{Array.from({length:reviews.length-capacity+1},(_,i)=><Button key={i} variant="ghost" size="icon" aria-label={`${c.slide} ${i+1}`} aria-current={active===i?'true':undefined} onClick={()=>move(i)}><span className="review-dot"/></Button>)}</div><Button variant="ghost" size="icon" aria-label={c.next} onClick={()=>move((active+1)%(reviews.length-capacity+1))}><ArrowRight/></Button><Button variant="ghost" size="icon" aria-label={paused?c.resume:c.pause} onClick={()=>setPaused(!paused)}>{paused?<Play/>:<Pause/>}</Button></div>}
   {reviews.some(r=>r.sample)&&<p className="family-preview-note">{c.note}</p>}
  </div>}
   <div className="family-comparison" ref={comparison} data-bars-revealed={barsRevealed}><div className="family-compare-heading"><div><h3>{entries&&saving>0?<>{c.save} <em>{saving}%</em>*</>:c.neutral}</h3><p>{c.desc}</p></div>{designPreview&&!verified&&<span className="sample-badge"><Info size={12}/>{c.illustrative}</span>}</div>
    <div className="family-price-grid">{[RadioTower,Smartphone,Signal].map((Icon,i)=><article className={`family-price-option option-${i}`} key={i}><span className="compare-icon"><Icon/></span><div className="price-copy"><strong>{c.options[i]}</strong>{ordered[i]&&<small>{verified?ordered[i]?.currency:c.example}</small>}</div>{ordered[i]&&<><bdi>{verified?displayMoney(ordered[i]?.price??0,ordered[i]?.currency??'EUR',uiLocale):new Intl.NumberFormat(uiLocale,{style:'currency',currency:'EUR'}).format(ordered[i]?.price??0)}</bdi><div className="compare-track"><span className="compare-bar-track"><span className="compare-bar-fill" data-price-ratio={bars[i]} style={{'--price-ratio':bars[i],'--bar-delay':`${i*125}ms`} as CSSProperties}/></span></div></>}</article>)}</div>
   <div className="family-conversion"><Wallet aria-hidden="true"/><div><strong>{custom("familyBudget",c.budget)}</strong><p>{custom("familyPlan",c.plan)}</p></div><Button onClick={onDestinationSearch}>{custom("familyCta",c.cta)}<ArrowRight className="rtl:rotate-180"/></Button></div>
   <div className="family-compare-foot">{designPreview&&!verified&&<small>{c.foot}</small>}<details><summary>{c.details}</summary>{verified?.map(e=><p key={e.kind}>{e.provider} · {e.destination} · {e.allowance} · {e.validity} · {e.checkedAt} · <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">{e.sourceUrl}</a></p>)??<p>{designPreview?`${c.illustrative} — ${c.example}`:c.neutral}</p>}</details></div>
  </div>
 </section>;
}
