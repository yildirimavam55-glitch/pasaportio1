import { V2SectionFrame } from './V2SectionFrame';
import { ResponsiveMediaPicture } from './ResponsiveMediaPicture';
import { StorefrontIcon } from '@/domain/storefront/icons';
import { type V2Section } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
/** Pure presentation. Does not accept catalogue, money, auth, provider or order callbacks. */
export function V2EditorialGrid({section,locale,resolve}:{section:V2Section;locale:UiLocale;resolve:(id:string|null|undefined)=>string|undefined}){
 const text=(value:import('@/domain/storefront/v2').LT|undefined)=>value?.[locale]?.trim()||value?.tr||'';
 return <V2SectionFrame section={section}><section data-editorial-grid><h2 data-v2-heading className="mb-3 font-display text-xl font-bold">{text(section.text['title'])}</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">{section.items.filter(i=>i.visible).map(item=><article key={item.id} className="rounded-xl bg-card p-3 ring-1 ring-border lg:p-5">
 <ResponsiveMediaPicture value={item} resolve={resolve} alt={text(item.imageAlt)} className="aspect-[4/3] rounded-xl"/>{item.icon&&<StorefrontIcon name={item.icon} className="size-5"/>}<h3 data-v2-heading className="text-sm font-bold text-foreground">{text(item.title)}</h3><p data-v2-body className="mt-1 text-xs leading-relaxed text-muted-foreground lg:text-sm">{text(item.text)}</p>{item.labels.map((v,i)=><span key={i} className="text-xs">{text(v)}</span>)}{item.href&&text(item.cta)&&<a className="mt-2 inline-flex rounded-md bg-primary px-3 py-2 text-primary-foreground" href={item.href}>{text(item.cta)}</a>}</article>)}</div></section></V2SectionFrame>;
}
