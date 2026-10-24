import {resolveTrustDesign,trustSectionDesign} from '@/domain/storefront/card-design';
import type { CSSProperties } from 'react';
import type { UiLocale } from '@/i18n/locales';
import type { V2Section } from '@/domain/storefront/v2';
import { RegisteredCards } from './RegisteredCards';

/** BENEFIT_ROW remains the only source of trust items, including order and device settings. */
export function HeroTrustCards({section,locale,resolve}:{section:V2Section|undefined;locale:UiLocale;resolve?:((id:string|null|undefined)=>string|undefined)|undefined}) {
 if(!section?.visible) return null;
 const inherited=trustSectionDesign(section.design);
 const style=Object.fromEntries((['mobile','tablet','desktop'] as const).map(device=>['--hero-benefit-columns-'+device,Math.min(section.items.filter(i=>i.visible&&resolveTrustDesign(inherited,i.cardDesign,device).visible!==false).length,4)||1])) as CSSProperties;
 return <div className="reference-hero-benefits" style={style}><RegisteredCards items={section.items} locale={locale} resolve={resolve} linkedTitle sectionDesign={inherited}/></div>;
}
