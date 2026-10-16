import { useEffect, useState } from 'react';
import { ChevronLeft, Signal } from 'lucide-react';
import { useI18n } from '@/i18n';
import { type V2Section } from '@/domain/storefront/v2';
import { trustPreviewHost } from '@/domain/storefront/trust-comparison';
import type { V2Media } from '@/lib/v2-storefront.functions';
import { mediaUrl } from './V2Sections';
import { STORY_COPY } from './trust-story-copy';
import familyImage from '@/assets/pasaport-family-arrivals.jpg';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { V2ReviewCarousel } from './V2ReviewCarousel';
import { PaymentStrip } from './PaymentStrip';
import { Reveal } from '@/components/travel/Reveal';

export function V2TrustReviews({section,media,preview=false,onDestinationSearch,searchField}:{section:V2Section;media:V2Media;preview?:boolean;onDestinationSearch?:(()=>void)|undefined;searchField?:React.ReactNode}) {
 const {locale,uiLocale}=useI18n(); useCurrency();
 const c=STORY_COPY[uiLocale as keyof typeof STORY_COPY]??STORY_COPY[locale];
 const [designPreview,setDesignPreview]=useState(preview);
 useEffect(()=>setDesignPreview(preview || trustPreviewHost(window.location.hostname)), [preview]);
 const photo=section.mediaId && !['builtin:trust-traveler','536a6bd7-2418-4668-8149-6b85bfd2b98d','533377df-ddd6-4803-a0cb-6f5727c933b6'].includes(section.mediaId)?mediaUrl(section.mediaId,media)??familyImage:familyImage;
 const custom=(key:string,fallback:string)=> section.text[key]?.[uiLocale] || section.text[key]?.[locale] || fallback;
 return <section className="family-proof" data-family-proof>
  <Reveal><div className="family-story"><div className="family-story-left"><div className="family-story-copy"><h2><span>{custom('familyTitle',c.title)}</span><span>{custom('familyAccent',c.accent)}</span></h2><p>{custom('familySubtitle',c.subtitle)}</p></div><div className="family-story-payment"><PaymentStrip preview={designPreview}/></div></div>
   <div className="family-scene"><img src={photo} alt="" width={1400} height={1000} loading="lazy" decoding="async"/><div className="family-phone" aria-label={c.chatNote}><div className="phone-status" aria-hidden="true">14:21 <Signal size={10}/></div><div className="phone-group"><ChevronLeft size={13}/><span>👨‍👩‍👧‍👦</span><strong>{custom("familyGroup",c.family)}</strong></div><div className="phone-chat">{c.chat.map((message,i)=><div key={i} className={`chat-bubble ${i>0&&i<4?'outgoing':''}`}>{custom(`familyChat${i}`,message)}<small aria-hidden="true">14:{12+i} {i>0&&i<4?'✓✓':''}</small></div>)}</div><div className="phone-input" aria-hidden="true">＋ <span>···</span> ♧</div></div></div>
  </div></Reveal>
  <Reveal><V2ReviewCarousel section={section} preview={preview}/></Reveal>

 </section>;
}
