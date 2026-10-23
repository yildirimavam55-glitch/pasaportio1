import { useEffect,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublishedStorefront } from '@/lib/storefront.functions';
import { defaultStorefront,sanitizeStorefront,type StorefrontConfig } from '@/domain/storefront/registry';
/** Same published source for header, drawer, footer and presentation-only account chrome. */
export function useStorefrontChrome(){
 const query=useQuery({queryKey:['storefront-global'],queryFn:()=>getPublishedStorefront({data:{service:'global'}})});
 const [preview,setPreview]=useState<StorefrontConfig>();
 useEffect(()=>{if(window.parent===window||window.name!=='v2-cms-preview')return;
 const receive=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='v2-chrome-preview')setPreview(sanitizeStorefront(event.data.config,'global'));};
 window.addEventListener('message',receive);window.parent.postMessage({type:'v2-chrome-ready'},location.origin);return()=>window.removeEventListener('message',receive);
 },[]);
 return {...query,config:preview??query.data?.config??defaultStorefront('global')};
}
