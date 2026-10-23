export type CardDevice={color?:string;background?:string;borderColor?:string;iconSize?:number;padding?:number;gap?:number;columns?:number};
export type CardDesign={color?:string;background?:string;borderColor?:string;radius?:number;mobile?:CardDevice;tablet?:CardDevice;desktop?:CardDevice};
const hex=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v:undefined;
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,Math.round(v))):undefined;
export function sanitizeCardDesign(value:unknown):CardDesign{
 const v=(value??{}) as any;const result:CardDesign={};
 for(const key of ['color','background','borderColor'] as const){const c=hex(v[key]);if(c)result[key]=c;}
 const radius=number(v.radius,0,48);if(radius!==undefined)result.radius=radius;
 for(const key of ['mobile','tablet','desktop'] as const)if(v[key]){
  const d:CardDevice={};for(const color of ['color','background','borderColor'] as const){const c=hex(v[key][color]);if(c)d[color]=c;}for(const [name,min,max] of [['iconSize',12,80],['padding',0,48],['gap',0,40],['columns',1,6]] as const){const n=number(v[key][name],min,max);if(n!==undefined)d[name]=n;}result[key]=d;
 }
 return result;
}
