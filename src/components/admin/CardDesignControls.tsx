import { sanitizeCardDesign,CARD_FONTS,CARD_NUMBERS,type CardDesign,type CardDevice } from '@/domain/storefront/card-design';
/** Shared with the existing V2 item editor and its acceptance workspace. */
export function CardDesignControls({id,value,onChange,fields=['iconSize','padding','gap','columns'],inheritValues=false,advanced=false}:{advanced?:boolean;inheritValues?:boolean;fields?:readonly ('iconSize'|'padding'|'gap'|'columns')[];id:string;value?:CardDesign|undefined;onChange:(value:CardDesign)=>void}){
 const labels:Record<string,string>={color:'Yazı rengi',background:'Arka plan',borderColor:'Çerçeve rengi',mobile:'Mobil',tablet:'Tablet',desktop:'Masaüstü',iconSize:'İkon boyutu',padding:'İç boşluk',gap:'Aralık',columns:'Sütun'};
 const v=value??{};const set=(patch:Partial<CardDesign>)=>onChange(sanitizeCardDesign({...v,...patch}));
 return <fieldset className="admin-builder-controls"><legend>Kart tasarımı</legend>{inheritValues&&<p>Boş boyutlar ve seçilmemiş renkler temadan devralınır; yalnız değiştirdiğin değer uygulanır.</p>}
 {(['color','background','borderColor'] as const).map(key=><label key={key}>{labels[key]}<input type="color" aria-label={`card-${id}-${key}`} value={v[key]??(key==='background'?'#ffffff':'#07584f')} onChange={e=>set({[key]:e.target.value})}/></label>)}
 <label>Köşe<input type="number" min={0} max={48} aria-label={`card-${id}-radius`} value={v.radius??(inheritValues?'':16)} placeholder={inheritValues?'Varsayılan':undefined} onChange={e=>{const next={...v};if(e.target.value==='')delete next.radius;else next.radius=Number(e.target.value);onChange(sanitizeCardDesign(next));}}/></label>
 {(['mobile','tablet','desktop'] as const).map(device=><fieldset key={device}><legend>{labels[device]}</legend>{(['color','background','borderColor'] as const).map(key=><label key={key}>{labels[key]}<input type="color" aria-label={`card-${id}-${device}-${key}`} value={v[device]?.[key]??v[key]??(key==='background'?'#ffffff':'#07584f')} onChange={e=>set({[device]:{...v[device],[key]:e.target.value}})}/></label>)}{fields.map(key=><label key={key}>{labels[key]}<input aria-label={`card-${id}-${device}-${key}`} type="number" placeholder={inheritValues?"Varsayılan":undefined} min={key==='columns'?1:key==='iconSize'?12:0} max={key==='columns'?6:key==='iconSize'?80:48} value={v[device]?.[key]??(inheritValues?'':key==='iconSize'?24:key==='columns'?device==='mobile'?1:device==='tablet'?2:3:12)} onChange={e=>set({[device]:{...v[device],[key]:e.target.value===''?undefined:Number(e.target.value)}})}/></label>)}</fieldset>)}
 {advanced&&<TrustTypographyControls id={id} value={v} onChange={onChange}/>}
 {inheritValues&&<button type="button" onClick={()=>onChange({})}>Tema değerlerine dön</button>}
 </fieldset>;
}

function TrustTypographyControls({id,value,onChange}:{id:string;value:CardDesign;onChange:(v:CardDesign)=>void}) {
 const labels:Record<string,string>={titleFont:'Başlık yazı ailesi',bodyFont:'Açıklama yazı ailesi',titleSize:'Başlık px',bodySize:'Açıklama px',titleWeight:'Başlık kalınlığı',bodyWeight:'Açıklama kalınlığı',titleLine:'Başlık satır yüksekliği',bodyLine:'Açıklama satır yüksekliği',circleSize:'İkon daire boyutu',iconColor:'İkon rengi',circleColor:'İkon daire arka planı',titleColor:'Başlık rengi',bodyColor:'Açıklama rengi',visible:'Cihazda görünür',showDescription:'Açıklamayı göster'};
 return <div data-trust-typography>{(['base','mobile','tablet','desktop'] as const).map(device=>{
  const d:CardDevice=device==='base'?value:value[device]??{};
  const set=(key:string,next:unknown)=>{const obj={...d};if(next===undefined)delete obj[key as keyof CardDevice];else Object.assign(obj,{[key]:next});onChange(sanitizeCardDesign(device==='base'?obj: {...value,[device]:obj}));};
  return <fieldset key={device}><legend>{device==='base'?'Kart varsayılanı':device}</legend>
   {(['titleFont','bodyFont'] as const).map(key=><label key={key}>{labels[key]}<select aria-label={`trust-${id}-${device}-${key}`} value={d[key]??''} onChange={e=>set(key,e.target.value||undefined)}><option value="">Devral / Inherit</option>{CARD_FONTS.map(font=><option key={font} value={font}>{font}</option>)}</select></label>)}
   {(['titleSize','bodySize','titleWeight','bodyWeight','titleLine','bodyLine','circleSize'] as const).map(key=><label key={key}>{labels[key]}<input aria-label={`trust-${id}-${device}-${key}`} type="number" min={CARD_NUMBERS[key][0]} max={CARD_NUMBERS[key][1]} step={key.endsWith('Line')?0.05:1} value={d[key]??''} placeholder="Devral" onChange={e=>set(key,e.target.value===''?undefined:Number(e.target.value))}/></label>)}
   {(['iconColor','circleColor','titleColor','bodyColor'] as const).map(key=><label key={key}>{labels[key]}<input aria-label={`trust-${id}-${device}-${key}`} type="color" value={d[key]??(key==='iconColor'?'#ffffff':'#008f68')} onChange={e=>set(key,e.target.value)}/><button type="button" onClick={()=>set(key,undefined)}>Devral</button></label>)}
   {(['visible','showDescription'] as const).map(key=><label key={key}>{labels[key]}<select aria-label={`trust-${id}-${device}-${key}`} value={d[key]===undefined?'':String(d[key])} onChange={e=>set(key,e.target.value===''?undefined:e.target.value==='true')}><option value="">Devral</option><option value="true">Göster</option><option value="false">Gizle</option></select></label>)}
  </fieldset>;
 })}</div>;
}
