import { sanitizeCardDesign,type CardDesign } from '@/domain/storefront/card-design';
/** Shared with the existing V2 item editor and its acceptance workspace. */
export function CardDesignControls({id,value,onChange}:{id:string;value?:CardDesign;onChange:(value:CardDesign)=>void}){
 const v=value??{};const set=(patch:Partial<CardDesign>)=>onChange(sanitizeCardDesign({...v,...patch}));
 return <fieldset className="admin-builder-controls"><legend>Kart tasarımı</legend>
 {(['color','background','borderColor'] as const).map(key=><label key={key}>{key}<input type="color" aria-label={`card-${id}-${key}`} value={v[key]??(key==='background'?'#ffffff':'#07584f')} onChange={e=>set({[key]:e.target.value})}/></label>)}
 <label>Köşe<input type="number" min={0} max={48} aria-label={`card-${id}-radius`} value={v.radius??16} onChange={e=>set({radius:Number(e.target.value)})}/></label>
 {(['mobile','tablet','desktop'] as const).map(device=><fieldset key={device}><legend>{device}</legend>{(['iconSize','padding','gap','columns'] as const).map(key=><label key={key}>{key}<input aria-label={`card-${id}-${device}-${key}`} type="number" min={key==='columns'?1:key==='iconSize'?12:0} max={key==='columns'?6:key==='iconSize'?80:48} value={v[device]?.[key]??(key==='iconSize'?24:key==='columns'?device==='mobile'?1:device==='tablet'?2:3:12)} onChange={e=>set({[device]:{...v[device],[key]:Number(e.target.value)}})}/></label>)}</fieldset>)}
 </fieldset>;
}
