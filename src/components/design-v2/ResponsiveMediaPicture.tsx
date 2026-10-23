import type { CSSProperties } from 'react';
import type { ResponsiveMediaValue } from '@/components/admin/ResponsiveMediaControls';
import { DEFAULT_IMAGE_DISPLAY } from '@/domain/storefront/image-display';
export function ResponsiveMediaPicture({value,resolve,alt,className=''}:{value:ResponsiveMediaValue;resolve:(id:string|null|undefined)=>string|undefined;alt:string;className?:string}){
 const desktop=resolve(value.mediaId),tablet=resolve(value.tabletMediaId),mobile=resolve(value.mobileMediaId);if(!desktop&&!tablet&&!mobile)return null;
 const styles:Record<string,string|number>={};for(const device of ['desktop','tablet','mobile'] as const){const crop=device==='desktop'?value.imageDisplay:device==='tablet'?value.tabletImageDisplay:value.mobileImageDisplay;const c=crop??value.imageDisplay??DEFAULT_IMAGE_DISPLAY;styles[`--media-${device}-position`]=`${c.x}% ${c.y}%`;styles[`--media-${device}-scale`]=c.zoom/100;styles[`--media-${device}-fit`]=c.fit;}
 return <span data-responsive-media className={`relative block overflow-hidden ${className}`} style={styles as CSSProperties}><picture>{desktop&&<source media="(min-width:1024px)" srcSet={desktop}/>} {(tablet||desktop)&&<source media="(min-width:640px)" srcSet={tablet||desktop}/>}<img alt={alt} loading="lazy" src={mobile||tablet||desktop} className="size-full object-cover"/></picture>{!!value.imageOverlay&&<span aria-hidden className="absolute inset-0 bg-black pointer-events-none" style={{opacity:value.imageOverlay/100}}/>}</span>;
}
