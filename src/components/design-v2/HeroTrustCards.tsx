import type { UiLocale } from '@/i18n/locales';
import type { V2Section } from '@/domain/storefront/v2';
import { RegisteredCards } from './RegisteredCards';

/** BENEFIT_ROW remains the only source of trust items, including order and device settings. */
export function HeroTrustCards({section,locale,resolve}:{section:V2Section|undefined;locale:UiLocale;resolve?:((id:string|null|undefined)=>string|undefined)|undefined}) {
 if(!section?.visible) return null;
 return <div className="reference-hero-benefits"><RegisteredCards items={section.items} locale={locale} resolve={resolve} compact/></div>;
}
