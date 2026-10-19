import { type V2Section } from '@/domain/storefront/v2';
import type { V2Media } from '@/lib/v2-storefront.functions';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { V2ReviewCarousel } from './V2ReviewCarousel';
import { PaymentStrip } from './PaymentStrip';
import { Reveal } from '@/components/travel/Reveal';

export function V2TrustReviews({section,media:_media,preview=false,onDestinationSearch:_onDestinationSearch,searchField:_searchField}:{section:V2Section;media:V2Media;preview?:boolean;onDestinationSearch?:(()=>void)|undefined;searchField?:React.ReactNode}) {
 useCurrency();
 return <section className="family-proof shop-trust" data-family-proof>
  <Reveal><V2ReviewCarousel section={section} preview={preview}/></Reveal>
  <PaymentStrip preview={preview}/>
 </section>;
}
