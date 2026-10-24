import type { UiLocale } from '@/i18n/locales';
import type { V2Section } from '@/domain/storefront/v2';
import { HERO_TITLE } from '@/domain/storefront/hero-title';
import { resolveHeroCopy } from '@/domain/storefront/hero-presentation';

/** One heading for the public storefront and V2 preview. Existing manual copy always wins. */
export function HeroHeading({section,locale,title,subtitle,defaultSubtitle}:{section:V2Section;locale:UiLocale;title:string;subtitle:string;defaultSubtitle:string}) {
 const fallback=HERO_TITLE[locale];
 const copy=resolveHeroCopy(section,title,subtitle,defaultSubtitle,{subtitle},locale);
 const accent=section.text['accent']?.[locale]?.trim();
 return <>{copy.useDefaultTitle && !accent ? <>{fallback.titleA}<span className="final-hero-accent">{fallback.titleB}</span></> : <>{copy.title}{accent && <span className="final-hero-accent">{accent}</span>}</>}</>;
}
