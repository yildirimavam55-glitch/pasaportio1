export type CardDevice={titleColor?:string;bodyColor?:string;color?:string;background?:string;borderColor?:string;iconSize?:number;padding?:number;gap?:number;columns?:number;titleFont?:string;bodyFont?:string;titleSize?:number;bodySize?:number;titleWeight?:number;bodyWeight?:number;titleLine?:number;bodyLine?:number;iconColor?:string;circleSize?:number;circleColor?:string;visible?:boolean;showDescription?:boolean};
export type CardDesign=CardDevice&{radius?:number;mobile?:CardDevice;tablet?:CardDevice;desktop?:CardDevice};
export const CARD_NUMBERS={iconSize:[12,80],padding:[0,48],gap:[0,40],columns:[1,6],titleSize:[10,48],bodySize:[10,32],titleWeight:[300,900],bodyWeight:[300,900],titleLine:[1,2.2],bodyLine:[1,2.2],circleSize:[24,112]} as const;
export const CARD_COLORS=['color','background','borderColor','iconColor','circleColor','titleColor','bodyColor'] as const;
export const CARD_FONTS=['theme','heading','body','sans','serif','mono'] as const;
const hex=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v:undefined;
const clean=(raw:unknown):CardDevice=>{const v=(raw??{}) as Record<string,unknown>;const out:Record<string,unknown>={};for(const k of CARD_COLORS){const c=hex(v[k]);if(c)out[k]=c;}for(const [k,[min,max]] of Object.entries(CARD_NUMBERS)){const n=v[k];if(typeof n==='number'&&Number.isFinite(n))out[k]=Math.min(max,Math.max(min,k.endsWith('Line')?Math.round(n*100)/100:Math.round(n)));}for(const k of ['titleFont','bodyFont'])if(CARD_FONTS.includes(v[k] as typeof CARD_FONTS[number]))out[k]=v[k];for(const k of ['visible','showDescription'])if(typeof v[k]==='boolean')out[k]=v[k];return out as CardDevice;};
export function sanitizeCardDesign(value:unknown):CardDesign {const v=(value??{}) as CardDesign;const out:CardDesign=clean(v);if(typeof v.radius==='number'&&Number.isFinite(v.radius))out.radius=Math.min(48,Math.max(0,Math.round(v.radius)));for(const d of ['mobile','tablet','desktop'] as const)if(v[d])out[d]=clean(v[d]);return out;}
/** Stable precedence: semantic theme defaults in CSS, section, item, then device overrides. */
export function resolveTrustDesign(section:CardDesign|undefined,item:CardDesign|undefined,device:'mobile'|'tablet'|'desktop'):CardDevice {
 const s=sanitizeCardDesign(section),i=sanitizeCardDesign(item);const {mobile:sm,tablet:st,desktop:sd,...sg}=s;const {mobile:im,tablet:it,desktop:id,...ig}=i;
 const visual=(v:CardDevice|undefined)=>{const {visible,showDescription,...rest}=v??{};return rest;};
 const sectionDevice={...visual(sm),...(device!=='mobile'?visual(st):{}),...(device==='desktop'?visual(sd):{}),...s[device]};
 const itemDevice={...visual(im),...(device!=='mobile'?visual(it):{}),...(device==='desktop'?visual(id):{}),...i[device]};
 const layer=(v:CardDevice)=>v.color?{...v,titleColor:v.titleColor??v.color,bodyColor:v.bodyColor??v.color}:v;
 return {...layer(sg),...layer(sectionDevice),...layer(ig),...layer(itemDevice)};
}
export function trustSectionDesign(design:import('./v2').V2SectionDesign|undefined):CardDesign {
 if(!design)return {};const d:CardDesign={};if(design.font!=='theme')d.titleFont=d.bodyFont=design.font;if(design.headingColor)d.titleColor=design.headingColor;if(design.bodyColor)d.bodyColor=design.bodyColor;
 for(const device of ['mobile','tablet','desktop'] as const){const t=design[device];if(t)d[device]={...(t.headingSize?{titleSize:t.headingSize}:{}),...(t.bodySize?{bodySize:t.bodySize}:{})};}
 if(design.weight!=='default')d.titleWeight=({normal:400,medium:500,semibold:600,bold:700})[design.weight];if(design.lineHeight!=='default')d.titleLine=d.bodyLine=({tight:1.25,normal:1.5,relaxed:1.625})[design.lineHeight];return d;
}
export const trustFont=(value:string)=>(({theme:'inherit',heading:'var(--font-heading,var(--font-display))',body:'var(--font-body,var(--font-sans))',sans:'Arial, sans-serif',serif:'Georgia, serif',mono:'ui-monospace, monospace'} as Record<string,string>)[value]??'inherit');
