import type { CSSProperties } from 'react';
import type { V2Item,LT } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
import { StorefrontIcon } from '@/domain/storefront/icons';
import { ResponsiveMediaPicture } from './ResponsiveMediaPicture';
import { sanitizeCardDesign } from '@/domain/storefront/card-design';
import './registered-cards.css';
export function RegisteredCards({items,locale,resolve,compact=false,linkedTitle=false}:{items:V2Item[];locale:UiLocale;resolve?:((id:string|null|undefined)=>string|undefined)|undefined;compact?:boolean;linkedTitle?:boolean}){
 const text=(v:LT|undefined)=>v?.[locale]?.trim()||v?.tr||'';
 return <div className={`registered-cards ${compact?'registered-cards-compact':''}`} data-registered-cards>{items.filter(i=>i.visible).map(item=>{
  const d=sanitizeCardDesign(item.cardDesign);const style:Record<string,string|number>={};
  if(d.color)style['--rc-color']=d.color;if(d.background)style['--rc-bg']=d.background;if(d.borderColor)style['--rc-border']=d.borderColor;if(d.radius!==undefined)style['--rc-radius']=d.radius+'px';
  for(const device of ['mobile','tablet','desktop'] as const)for(const key of ['iconSize','padding','gap','columns'] as const)if(d[device]?.[key]!==undefined)style[`--rc-${device}-${key}`]=key==='columns'?d[device]![key]!:d[device]![key]+'px';
  for(const device of ['mobile','tablet','desktop'] as const)for(const key of ['color','background','borderColor'] as const)if(d[device]?.[key])style[`--rc-${device}-${key}`]=d[device]![key]!;
  const textStyle=d.color||d.mobile?.color||d.tablet?.color||d.desktop?.color?{color:'inherit'}:undefined;
  return <article key={item.id} data-registered-card={item.id} style={style as CSSProperties}>
   {resolve&&<ResponsiveMediaPicture value={item} resolve={resolve} alt={text(item.imageAlt)} className="aspect-[4/3] rounded-xl"/>}
   {item.icon&&<StorefrontIcon name={item.icon} className="registered-card-icon"/>}
   <h3 data-v2-heading style={textStyle}>{linkedTitle&&item.href?<a href={item.href}>{text(item.title)}</a>:text(item.title)}</h3>{text(item.text)&&<p data-v2-body style={textStyle}>{text(item.text)}</p>}
   {item.labels.map((label,index)=><span key={index}>{text(label)}</span>)}
   {item.href&&(!linkedTitle||(text(item.cta)&&text(item.cta)!==text(item.title)))&&<a href={item.href}>{text(item.cta)||text(item.title)}</a>}
  </article>;
 })}</div>;
}
