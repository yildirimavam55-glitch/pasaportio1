import type { ReactNode } from 'react';
import { ImageDisplayControls } from './ImageDisplayControls';
import type { ImageDisplay } from '@/domain/storefront/image-display';
export type ResponsiveMediaValue={mediaId:string|null;tabletMediaId?:string|null;mobileMediaId?:string|null;imageDisplay?:ImageDisplay;tabletImageDisplay?:ImageDisplay;mobileImageDisplay?:ImageDisplay;imageOverlay?:number};
export function ResponsiveMediaControls({value,onChange,picker}:{value:ResponsiveMediaValue;onChange:(patch:Partial<ResponsiveMediaValue>)=>void;picker:(label:string,id:string|null,onChange:(id:string|null)=>void)=>ReactNode}){
 return <fieldset className="grid gap-3"><legend>Bu kullanım · 3 cihaz (diğer sayfalar değişmez)</legend>{(['desktop','tablet','mobile'] as const).map(device=>{const key=device==='desktop'?'mediaId':device==='tablet'?'tabletMediaId':'mobileMediaId';const crop=device==='desktop'?'imageDisplay':device==='tablet'?'tabletImageDisplay':'mobileImageDisplay';return <fieldset key={device}><legend>{device}</legend>{picker(device,value[key]??null,id=>onChange({[key]:id}))}<ImageDisplayControls value={value[crop]} onChange={display=>onChange({[crop]:display})}/></fieldset>;})}<label>Overlay<input type="range" aria-label="media-overlay" min="0" max="90" value={value.imageOverlay??0} onChange={e=>onChange({imageOverlay:Number(e.target.value)})}/></label></fieldset>;
}
