import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Globe2, Info, Pause, Play, RadioTower, Signal, Smartphone, Sparkles, Star, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { v2ItemText, v2Text, type V2Section } from '@/domain/storefront/v2';
import { comparisonForPresentation, comparisonScale, publicReview, verifiedComparison, reviewAutoplay, trustPreviewHost } from '@/domain/storefront/trust-comparison';
import type { V2Media } from '@/lib/v2-storefront.functions';
import { mediaUrl } from './V2Sections';
import { STORY_COPY } from './trust-story-copy';
import familyImage from '@/assets/pasaport-family-arrivals.jpg';
import { displayMoney } from '@/domain/currency/store';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { V2ReviewCarousel } from './V2ReviewCarousel';
import { PaymentStrip } from './PaymentStrip';
import { Reveal } from '@/components/travel/Reveal';
import { usePublishedTheme } from '@/components/PublishedTheme';
import { getCountryByIso } from '@/domain/geo/countries';

export function V2TrustReviews({section,media,preview=false,onDestinationSearch,searchField}:{section:V2Section;media:V2Media;preview?:boolean;onDestinationSearch?:(()=>void)|undefined;searchField?:React.ReactNode}) {
 const {locale,uiLocale}=useI18n(); useCurrency();
 const motionEnabled=usePublishedTheme().homepageScrollAnimations;
 const c=STORY_COPY[uiLocale as keyof typeof STORY_COPY]??STORY_COPY[locale];
 const [designPreview,setDesignPreview]=useState(preview);
 useEffect(()=>setDesignPreview(preview || trustPreviewHost(window.location.hostname)), [preview]);
 const photo=section.mediaId && !['builtin:trust-traveler','536a6bd7-2418-4668-8149-6b85bfd2b98d','533377df-ddd6-4803-a0cb-6f5727c933b6'].includes(section.mediaId)?mediaUrl(section.mediaId,media)??familyImage:familyImage;
 const approved=section.trust?.comparisonStatus==='VERIFIED' && !section.trust.comparisonPreviewOnly && Boolean(section.trust.comparisonVerifiedAt);
 const verified=verifiedComparison(section.trust?.comparisonEntries,approved);
 // Approved verified figures win; otherwise the owner-requested researched example (sourced, dated) is shown.
 const entries=comparisonForPresentation(verified);
 const sampleComparison=!verified && Boolean(entries);
 const ordered=entries?['roaming','other','pasaport'].map(k=>entries.find(e=>e.kind===k)).filter((e):e is NonNullable<typeof e>=>Boolean(e)):[];
 const bars=comparisonScale(ordered.map(e=>e.price));
 const comparison=useRef<HTMLDivElement>(null);
 const [barsRevealed,setBarsRevealed]=useState(false);
 useEffect(()=>{const node=comparison.current;if(!node||ordered.length===0)return;const mq=matchMedia('(prefers-reduced-motion:reduce)');if(!motionEnabled||mq.matches||typeof IntersectionObserver==='undefined'){setBarsRevealed(true);return;}const observer=new IntersectionObserver(([entry])=>{if(entry?.isIntersecting){setBarsRevealed(true);observer.disconnect();}},{threshold:0});observer.observe(node);const motion=()=>{if(mq.matches){setBarsRevealed(true);observer.disconnect();}};mq.addEventListener('change',motion);return()=>{observer.disconnect();mq.removeEventListener('change',motion);};},[ordered.length,motionEnabled]);
 const custom=(key:string,fallback:string)=> section.text[key]?.[uiLocale] || section.text[key]?.[locale] || fallback;
 return <section className="family-proof" data-family-proof>
  <Reveal><div className="family-story"><div className="family-story-left"><div className="family-story-copy"><h2><span>{custom('familyTitle',c.title)}</span><span>{custom('familyAccent',c.accent)}</span></h2><p>{custom('familySubtitle',c.subtitle)}</p></div><div className="family-story-payment"><PaymentStrip preview={designPreview}/></div></div>
   <div className="family-scene"><img src={photo} alt="" width={1400} height={1000} loading="lazy" decoding="async"/><div className="family-phone" aria-label={c.chatNote}><div className="phone-status" aria-hidden="true">14:21 <Signal size={10}/></div><div className="phone-group"><ChevronLeft size={13}/><span>👨‍👩‍👧‍👦</span><strong>{custom("familyGroup",c.family)}</strong></div><div className="phone-chat">{c.chat.map((message,i)=><div key={i} className={`chat-bubble ${i>0&&i<4?'outgoing':''}`}>{custom(`familyChat${i}`,message)}<small aria-hidden="true">14:{12+i} {i>0&&i<4?'✓✓':''}</small></div>)}</div><div className="phone-input" aria-hidden="true">＋ <span>···</span> ♧</div></div></div>
  </div></Reveal>
  <Reveal><V2ReviewCarousel section={section} preview={preview}/></Reveal>
   <Reveal><div className="family-comparison" ref={comparison} data-bars-revealed={barsRevealed} data-comparison-verified={Boolean(verified)} data-comparison-sample={sampleComparison}><div className="family-compare-heading"><div><h3>{c.neutral}</h3><p>{c.desc}</p>{sampleComparison&&<p className="sample-badge">{c.illustrative} · {getCountryByIso(ordered[0]?.destinationIso)?.name[locale]??ordered[0]?.destination} · {ordered[0]?.allowance}</p>}</div></div>
    <div className="family-price-grid">{[RadioTower,Smartphone,Signal].map((Icon,i)=>{const entry=ordered[i];return <article className={`family-price-option option-${i}`} key={i}><span className="compare-icon"><Icon/></span><div className="price-copy"><strong>{c.options[i]}</strong></div>{entry&&<bdi>{displayMoney(entry.price,entry.currency,uiLocale)}</bdi>}<div className="compare-track" aria-hidden="true"><span className="compare-bar-track">{entry&&<span className="compare-bar-fill" data-price-ratio={bars[i]} style={{'--price-ratio':bars[i],'--bar-delay':`${i*125}ms`} as CSSProperties}/>}</span></div></article>})}</div>
   <div className="family-conversion"><Wallet aria-hidden="true"/><div><strong>{custom("familyBudget",c.budget)}</strong><p>{custom("familyPlan",c.plan)}</p></div>{searchField ?? <Button onClick={onDestinationSearch}>{custom("familyCta",c.cta)}<ArrowRight className="rtl:rotate-180"/></Button>}</div>
   <div className="family-compare-foot"><details><summary>{c.details}</summary>{sampleComparison?<>{ordered.map(e=><p key={e.kind}>{e.provider} · {e.allowance} · {e.validityDays?new Intl.NumberFormat(uiLocale,{style:'unit',unit:'day',unitDisplay:'long'}).format(e.validityDays):e.validity} · <bdi>{displayMoney(e.price,e.currency,uiLocale)}</bdi> · {new Date(`${e.checkedAt}T00:00:00Z`).toLocaleDateString(uiLocale,{timeZone:'UTC'})} · <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">{new URL(e.sourceUrl).hostname}</a></p>)}<p>{c.foot}</p></>:verified?.map(e=><p key={e.kind}>{e.provider} · {e.destination} · {e.allowance} · {e.validity} · {e.checkedAt} · <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">{e.sourceUrl}</a></p>)??<p>{c.neutral}</p>}</details></div>
  </div></Reveal>
 </section>;
}
