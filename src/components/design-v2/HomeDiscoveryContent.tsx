import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ChevronRight, Check, Smartphone, Wifi, ShoppingCart, RotateCcw } from 'lucide-react';
import { StorefrontIcon } from '@/domain/storefront/icons';
import type { V2Item, V2Section } from '@/domain/storefront/v2';
import type { UiLocale } from '@/i18n/locales';
import { HOME_COPY, homeText } from '@/domain/storefront/home-presentation';
import { resolveTrustDesign, trustFont, trustSectionDesign, type CardDesign } from '@/domain/storefront/card-design';
import { sanitizeImageDisplay } from '@/domain/storefront/image-display';
import { CataloguePhoto } from './CataloguePhoto';
import { RailArrows, useRailControls } from './HomeRailControls';
import { V2SectionFrame } from './V2SectionFrame';
import './home-discovery.css';

export function homeCardStyle(section:V2Section,item?:V2Item):CSSProperties {
 const settings=section.homePresentation;
 const sectionDesign:CardDesign={...trustSectionDesign(section.design),...settings?.cards};
 const styles:Record<string,string|number>={'--hd-arrow-size':(settings?.arrowSize??30)+'px'};
 if(settings?.cards?.radius!==undefined)styles['--hd-radius']=settings.cards.radius+'px';
 if(item?.cardDesign?.radius!==undefined)styles['--hd-radius']=item.cardDesign.radius+'px';
 for(const device of ['mobile','tablet','desktop'] as const)for(const [key,value] of Object.entries(resolveTrustDesign(sectionDesign,item?.cardDesign,device))){
  if(['mobile','tablet','desktop','radius','columns'].includes(key))continue;
  let css:string|number=value as string|number;
  if(key==='visible'||key==='showDescription')css=value?'block':'none';
  else if(key.endsWith('Font'))css=trustFont(String(value),key==='titleFont'?'title':'body');
  else if(['titleSize','bodySize','iconSize','padding','gap','circleSize'].includes(key))css=value+'px';
  styles[`--hd-${device}-${key}`]=css;
 }
 const crop=sanitizeImageDisplay(item?.imageDisplay??section.imageDisplay);
 styles['--hd-photo-fit']=crop.fit;styles['--hd-photo-position']=`${crop.x}% ${crop.y}%`;styles['--hd-photo-scale']=crop.zoom/100;
 styles['--hd-overlay']=(item?.imageOverlay??section.imageOverlay??(section.overlay==='strong'?90:section.overlay==='light'?68:84))/100;
 return styles as CSSProperties;
}
export function HomeSectionHeading({section,locale,titleIndex,linkIndex,href}:{section:V2Section;locale:UiLocale;titleIndex:number;linkIndex:number;href:string}){
 const c=HOME_COPY[locale];return <div className="hd-heading"><h2 data-v2-heading>{homeText(section.text['title'],locale,c[titleIndex]!)}</h2><a href={href}>{homeText(section.text['all'],locale,c[linkIndex]!)}<ArrowRight aria-hidden="true"/></a></div>;
}
export type HomePhotoCardProps={id:string;title:string;image?:string|undefined;fallback?:string|undefined;badge?:ReactNode;price?:string|undefined;coverage?:string|undefined;href?:string|undefined;onPick?:(()=>void)|undefined;section:V2Section;item?:V2Item|undefined};
export function HomePhotoCard({id,title,image,fallback,badge,price,coverage,href,onPick,section,item}:HomePhotoCardProps){
 const body=<><CataloguePhoto src={image} fallback={fallback} alt={title}/><span className="hd-photo-shade" aria-hidden="true"/><span className="hd-photo-copy">{badge&&<span className="hd-flag">{badge}</span>}<strong>{title}</strong>{coverage&&<span>{coverage}</span>}{price&&<span data-catalogue-price>{price}</span>}</span><span className="hd-card-arrow" aria-hidden="true"><ChevronRight/></span></>;
 return <li data-home-card={id} style={homeCardStyle(section,item)}>{href?<a href={href} className="hd-photo-card">{body}</a>:<button type="button" className="hd-photo-card" onClick={onPick}>{body}</button>}</li>;
}
/** The public catalogue adapter and the offline acceptance canvas use this exact rail. */
export function HomePhotoRail({section,locale,regional=false,children,count}:{section:V2Section;locale:UiLocale;regional?:boolean;children:ReactNode;count:number}){
 const rail=useRailControls<HTMLUListElement>([count,locale,section.showArrows]);const c=HOME_COPY[locale];
 return <div className={`hd-discovery ${regional?'hd-regions':'hd-countries'}`} data-home-section={section.type} data-gap={section.cardGap} data-preview={section.mobilePreview} style={homeCardStyle(section)}>
 <HomeSectionHeading section={section} locale={locale} titleIndex={regional?2:0} linkIndex={regional?3:1} href={regional?'/esim/bolge':'/esim/ulkeler'}/>
 <div className="hd-rail-frame">{section.showArrows&&<RailArrows edge={rail.edge} scroll={rail.scroll} previous={c[16]!} next={c[17]!}/>}<ul ref={rail.ref} onScroll={rail.update} className="hd-rail" aria-label={homeText(section.text['title'],locale,c[regional?2:0]!)} tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();rail.scroll((e.key==='ArrowRight')!==(getComputedStyle(e.currentTarget).direction==='rtl'));}}}>{children}</ul></div></div>;
}
export function HomeCompatibilityContent({section,locale,lead}:{section?:V2Section|undefined;locale:UiLocale;lead?:string|undefined}){
 const c=HOME_COPY[locale];return <><span className="hd-compat-icon" aria-hidden="true"><StorefrontIcon name={section?.items.find(i=>i.visible)?.icon||'Smartphone'}/></span><span className="hd-compat-copy"><strong>{homeText(section?.text['title'],locale,c[4]!)}</strong><span>{lead||homeText(section?.text['subtitle'],locale,c[5]!)}</span></span><ChevronRight className="hd-compat-chevron" aria-hidden="true"/></>;
}
const kinds=['package','qr','connection'] as const;
/** Deliberately incomplete QR-like ornament: no finder squares, encoded payload or customer data. */
function StepIllustration({kind,icon}:{kind:string;icon:string}){
 return <span className={`hd-scene hd-scene-${kind}`} aria-hidden="true">
  {kind==='package'?<><StorefrontIcon name={icon||'ShoppingCart'}/><span className="hd-selected-plan"><i/><i/><Check/></span></>:kind==='qr'?<><svg viewBox="0 0 48 48" className="hd-qr-pattern"><path d="M6 5h9v7H6zM24 5h5v4h-5zM35 5h7v10h-7zM19 15h6v6h-6zM5 20h8v5H5zM33 22h9v6h-9zM16 28h5v8h-5zM5 35h6v7H5zM27 33h5v9h-5zM38 36h5v6h-5zM28 15h4v4h-4zM22 25h5v4h-5zM35 15h4v4h-4zM12 15h3v3h-3zM23 40h3v3h-3z" fill="currentColor"/></svg>{icon&&icon!=='QrCode'&&<StorefrontIcon name={icon} className="hd-custom-qr-icon"/>}<span className="hd-scan-line"/><Check className="hd-qr-check"/></>:<><StorefrontIcon name={icon||'Smartphone'}/><Wifi className="hd-connection"/><span className="hd-signal hd-signal-one"/><span className="hd-signal hd-signal-two"/></>}
 </span>;
}
export function HomeInstallation({section,locale,preview=false}:{section:V2Section;locale:UiLocale;preview?:boolean}){
 const ref=useRef<HTMLElement>(null);const [phase,setPhase]=useState<'idle'|'playing'|'done'>('idle');const [run,setRun]=useState(0);const [reduced,setReduced]=useState(false);
 const enabled=section.homePresentation?.animationEnabled!==false&&section.variant!=='simple';const duration=section.homePresentation?.duration??8;const c=HOME_COPY[locale];
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(mq.matches);update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(!enabled||reduced){setPhase('done');return;}
  setPhase('idle');const node=ref.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.55)){setPhase('playing');observer.disconnect();}},{threshold:[.55]});observer.observe(node);return()=>observer.disconnect();
 },[run,enabled,reduced,duration]);
 useEffect(()=>{if(phase!=='playing')return;const timer=window.setTimeout(()=>setPhase('done'),duration*1000);return()=>window.clearTimeout(timer);},[phase,duration]);
 const steps=section.items.filter(i=>i.visible).slice(0,3);
 return <V2SectionFrame section={section}><section ref={ref} className="hd-install hd-discovery" data-home-section="INSTALLATION_STEPS" data-phase={phase} data-run={run} data-animated={enabled&&!reduced} style={{...homeCardStyle(section),'--hd-duration':duration+'s'} as CSSProperties} aria-label={homeText(section.text['title'],locale,c[6]!)}>
 <HomeSectionHeading section={section} locale={locale} titleIndex={6} linkIndex={7} href="/esim/kurulum"/>
 <ol className="hd-steps">{steps.map((item,index)=>{const kind=kinds.includes(item.cardType as typeof kinds[number])?item.cardType:kinds[index]!;return <li key={`${item.id}-${run}`} data-install-step={index+1} data-presentation={kind} className="hd-step" style={homeCardStyle(section,item)}><span className="hd-step-number" aria-hidden="true">{index+1}</span><StepIllustration kind={kind} icon={item.icon}/><span className="hd-step-copy"><strong>{homeText(item.title,locale,c[9+index*2]!)}</strong><span>{homeText(item.text,locale,c[10+index*2]!)}</span></span></li>;})}</ol>
 <div className="hd-install-tools"><p className="sr-only">{c[15]}</p><button type="button" data-install-replay onClick={()=>setRun(n=>n+1)} disabled={!enabled||reduced}><RotateCcw aria-hidden="true"/>{homeText(section.text['replay'],locale,c[8]!)}</button>{preview&&<span className="sr-only">Preview</span>}</div>
 </section></V2SectionFrame>;
}
