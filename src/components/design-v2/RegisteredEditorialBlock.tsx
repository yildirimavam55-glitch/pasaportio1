import type { V2Section } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
import { blockContract } from '@/domain/storefront/block-registry';
import { RegisteredCards } from './RegisteredCards';
import { V2EditorialGrid } from './V2EditorialGrid';
import { V2EditorialFaq } from './V2EditorialFaq';
import { V2SectionFrame } from './V2SectionFrame';
type Props={section:V2Section;locale:UiLocale;resolve:(id:string|null|undefined)=>string|undefined};
/** Shared actual public + acceptance renderers. Data-bound/animated types retain their existing adapters. */
const EDITORIAL_RENDERERS={
 BENEFIT_ROW:({section,locale,resolve}:Props)=><V2SectionFrame section={section}><RegisteredCards items={section.items} locale={locale} resolve={resolve}/></V2SectionFrame>,
 INFO_GRID:({section,locale,resolve}:Props)=><V2EditorialGrid section={section} locale={locale} resolve={resolve}/>,
 FAQ:({section,locale}:Props)=><V2SectionFrame section={section}><V2EditorialFaq title={section.text['title']?.[locale]||section.text['title']?.tr||''} questions={section.items.filter(i=>i.visible).map(i=>[i.title[locale]||i.title.tr,i.text[locale]||i.text.tr])} relaxed={section.variant==='comfortable'}/></V2SectionFrame>,
};
export function renderRegisteredEditorialBlock(props:Props){
 const key=blockContract(props.section.type).renderer;
 const render=EDITORIAL_RENDERERS[key as keyof typeof EDITORIAL_RENDERERS];return render?render(props):undefined;
}
