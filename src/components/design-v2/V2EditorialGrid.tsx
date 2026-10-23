import { RegisteredCards } from "./RegisteredCards";
import { V2SectionFrame } from './V2SectionFrame';
import { ResponsiveMediaPicture } from './ResponsiveMediaPicture';
import { StorefrontIcon } from '@/domain/storefront/icons';
import { type V2Section } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
/** Pure presentation. Does not accept catalogue, money, auth, provider or order callbacks. */
export function V2EditorialGrid({section,locale,resolve}:{section:V2Section;locale:UiLocale;resolve:(id:string|null|undefined)=>string|undefined}){
 const text=(value:import('@/domain/storefront/v2').LT|undefined)=>value?.[locale]?.trim()||value?.tr||'';
 return <V2SectionFrame section={section}><section data-editorial-grid><h2 data-v2-heading className="mb-3 font-display text-xl font-bold">{text(section.text['title'])}</h2><RegisteredCards items={section.items} locale={locale} resolve={resolve}/></section></V2SectionFrame>;
}
