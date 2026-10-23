import type { CSSProperties } from 'react';
import type { V2Item,V2Section,LT } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
import type { EditorialLayout } from '@/domain/storefront/editorial';
import { sanitizeCardDesign } from '@/domain/storefront/card-design';
import { RegisteredCards } from './RegisteredCards';
import { StorefrontIcon } from '@/domain/storefront/icons';
import { ResponsiveMediaPicture } from './ResponsiveMediaPicture';
import { V2SectionFrame } from './V2SectionFrame';
import './editorial-section.css';
export function editorialStyle(layout:EditorialLayout|undefined):CSSProperties{
 const out:Record<string,string|number>={};for(const device of ['mobile','tablet','desktop'] as const){const d=layout?.[device];if(!d)continue;for(const key of ['columns','gap','padding','fontSize','span','align'] as const)if(d[key]!==undefined)out[`--ed-${device}-${key}`]=['gap','padding','fontSize'].includes(key)?d[key]+'px':d[key]!;}return out as CSSProperties;
}
function visualStyle(item:V2Item):CSSProperties{
 const out=editorialStyle(item.editorialLayout) as Record<string,string|number>;const d=sanitizeCardDesign(item.cardDesign);
 for(const key of ['color','background','borderColor','radius'] as const)if(d[key]!==undefined)out[`--ed-${key}`]=key==='radius'?d[key]+'px':d[key]!;
 for(const device of ['mobile','tablet','desktop'] as const)for(const key of ['color','background','borderColor','iconSize','padding','gap'] as const)if(d[device]?.[key]!==undefined)out[`--ed-${device}-${key}`]=['iconSize','padding','gap'].includes(key)?d[device]![key]+'px':d[device]![key]!;return out as CSSProperties;
}
type Props={section:V2Section;locale:UiLocale;resolve:(id:string|null|undefined)=>string|undefined};
export function EditorialSection({section,locale,resolve}:Props){
 const t=(v:LT|undefined)=>v?.[locale]?.trim()||v?.tr||'';
 const render=(item:V2Item)=>{if(!item.visible)return null;const kind=item.elementType;const title=t(item.title),text=t(item.text);const image=<ResponsiveMediaPicture value={item} resolve={resolve} alt={t(item.imageAlt)} className="editorial-image"/>;
 let content;
 switch(kind){
 case 'HEADING':content=<h2>{title}</h2>;break;
 case 'SUBHEADING':content=<h3>{title}</h3>;break;
 case 'TEXT':content=<p>{text||title}</p>;break;
 case 'IMAGE':content=<figure>{image}{title&&<figcaption>{title}</figcaption>}</figure>;break;
 case 'ICON':content=<><StorefrontIcon name={item.icon} className="editorial-icon"/>{title&&<h3>{title}</h3>}{text&&<p>{text}</p>}</>;break;
 case 'CARD':case 'TRUST_CARD':content=<RegisteredCards items={[item]} locale={locale} resolve={resolve}/>;break;
 case 'BUTTON':content=item.href?<a className="editorial-button" href={item.href}>{t(item.cta)||title}</a>:<span>{t(item.cta)||title}</span>;break;
 case 'CTA':content=<>{image}{title&&<h3>{title}</h3>}{text&&<p>{text}</p>}{item.href&&<a className="editorial-button" href={item.href}>{t(item.cta)||title}</a>}</>;break;
 case 'FAQ':content=<details><summary>{title}</summary><p>{text}</p></details>;break;
 case 'DIVIDER':content=<hr/>;break;
 case 'SPACER':content=<div aria-hidden className="editorial-spacer"/>;break;
 case 'GALLERY':case 'GRID':content=<div className="editorial-grid">{(item.elements??[]).map(render)}</div>;break;
 default:return null;
 }
 const mediaIndex=section.items.filter(i=>i.visible&&['IMAGE','GALLERY'].includes(i.elementType??'')).findIndex(i=>i.id===item.id);const rows=Math.max(1,Math.ceil(section.items.filter(i=>i.visible&&!['IMAGE','GALLERY'].includes(i.elementType??'')).length/Math.max(1,section.items.filter(i=>i.visible&&['IMAGE','GALLERY'].includes(i.elementType??'')).length)));
 return <div key={item.id} className="editorial-element" data-editorial-element={item.id} data-element-type={kind} data-editorial-media={['IMAGE','GALLERY'].includes(kind??'')||undefined} style={{...visualStyle(item),'--ed-media-row':mediaIndex*rows+1,'--ed-media-rows':rows} as CSSProperties}>{content}</div>;
 };
 const layout=section.editorialLayout;const items=section.items.filter(i=>i.visible);
 return <V2SectionFrame section={section}><section data-editorial-section={section.id} className="editorial-section" style={editorialStyle(layout)} data-layout-mobile={layout?.mobile?.layout??'stack'} data-layout-tablet={layout?.tablet?.layout??layout?.mobile?.layout??'stack'} data-layout-desktop={layout?.desktop?.layout??layout?.tablet?.layout??'stack'}>
 <div className="editorial-all editorial-grid">{items.map(render)}</div>
 </section></V2SectionFrame>;
}
