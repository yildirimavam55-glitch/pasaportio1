import type { V2Item,V2Section,LT } from './v2';
export const SECTION_LIMIT=30,ELEMENT_LIMIT=30,TEMPLATE_LIMIT=20;
export const ELEMENT_TYPES=['HEADING','SUBHEADING','TEXT','IMAGE','GALLERY','ICON','CARD','TRUST_CARD','BUTTON','GRID','DIVIDER','SPACER','FAQ','CTA'] as const;
export type ElementType=typeof ELEMENT_TYPES[number];
export const ELEMENT_LABELS:Record<ElementType,string>={HEADING:'Başlık',SUBHEADING:'Alt başlık',TEXT:'Metin',IMAGE:'Görsel',GALLERY:'Görsel grubu',ICON:'İkon',CARD:'Avantaj kartı',TRUST_CARD:'Güven kartı',BUTTON:'Buton',GRID:'Sütun / kart ızgarası',DIVIDER:'Ayırıcı',SPACER:'Boşluk',FAQ:'SSS öğesi',CTA:'Çağrı alanı'};
export const EDITORIAL_LAYOUTS=['stack','image-left','image-right','image-top','columns','icon-row','security-grid','banner','centered'] as const;
export type EditorialDevice={layout?:typeof EDITORIAL_LAYOUTS[number];columns?:number;gap?:number;padding?:number;fontSize?:number;span?:number;align?:'start'|'center'|'end'};
export type EditorialLayout=Partial<Record<'mobile'|'tablet'|'desktop',EditorialDevice>>;
export const LAYOUT_LABELS:Record<typeof EDITORIAL_LAYOUTS[number],string>={stack:'Alt alta', 'image-left':'Görsel solda · metin sağda','image-right':'Metin solda · görsel sağda','image-top':'Görsel üstte · metin altta',columns:'1–4 sütun','icon-row':'İkon sırası','security-grid':'Güven kartları',banner:'Geniş banner',centered:'Ortalanmış metin ve buton'};
const lt=(tr=''):LT=>({tr,de:'',en:''});
export const editorialId=()=>`ed-${crypto.randomUUID()}`;
export function createEditorialElement(type:ElementType):V2Item{
 if(!ELEMENT_TYPES.includes(type))throw Error('E_ELEMENT_UNKNOWN');
 const id=editorialId();return {id,elementType:type,visible:true,icon:['ICON','CARD','TRUST_CARD'].includes(type)?'ShieldCheck':'',entity:'',title:lt(),text:lt(),internalKey:id,cardType:'info',mediaId:null,href:'',labels:[],cta:lt(),imageAlt:lt(),focalX:50,focalY:50,rating:1,verified:false,published:false,...(['GRID','GALLERY'].includes(type)?{elements:[]}:{} )};
}
export function sanitizeEditorialLayout(raw:unknown):EditorialLayout{
 const result:EditorialLayout={};if(!raw||typeof raw!=='object')return result;
 for(const device of ['mobile','tablet','desktop'] as const){const value=(raw as any)[device];if(!value||typeof value!=='object')continue;const d:EditorialDevice={};
 if(EDITORIAL_LAYOUTS.includes(value.layout))d.layout=value.layout;if(['start','center','end'].includes(value.align))d.align=value.align;
 for(const [name,min,max]of [['columns',1,4],['gap',0,48],['padding',0,64],['fontSize',10,80],['span',1,4]] as const){const n=value[name];if(typeof n==='number'&&Number.isFinite(n))d[name]=Math.max(min,Math.min(max,Math.round(n)));}result[device]=d;
 }return result;
}
export function flattenEditorial(items:readonly V2Item[]):V2Item[]{return items.flatMap(item=>[item,...flattenEditorial(item.elements??[])]);}
/** Validate before any normalizer can truncate or replace IDs. Depth is at most one container. */
export function validateEditorial(items:any[],required=false){
 let count=0;const ids=new Set<string>();
 const visit=(rows:any[],depth:number,parent?:string)=>{for(const item of rows){
 if(++count>ELEMENT_LIMIT)throw Error('E_ITEM_LIMIT');if(!/^[a-zA-Z0-9_-]{1,64}$/.test(String(item?.id??'')))throw Error('E_ITEM_INVALID_ID');if(ids.has(item.id))throw Error('E_ITEM_DUPLICATE_ID');ids.add(item.id);
 if(required&&!ELEMENT_TYPES.includes(item.elementType))throw Error('E_ELEMENT_UNKNOWN');
 if(required){for(const [field,max] of [['title',200],['text',900],['cta',80],['imageAlt',240]] as const){const value=item[field];if(value&&typeof value==='object'&&Object.entries(value).some(([key,text])=>!key.startsWith('_')&&typeof text==='string'&&text.length>max))throw Error('E_EDITORIAL_TEXT_LIMIT');}if(Array.isArray(item.labels)&&item.labels.length>4)throw Error('E_LABEL_LIMIT');}
 if(parent==='GALLERY'&&item.elementType!=='IMAGE')throw Error('E_GALLERY_CHILD');
 if(item.elements!==undefined){if(!Array.isArray(item.elements)||!['GRID','GALLERY'].includes(item.elementType)||depth>=1)throw Error('E_ELEMENT_NESTING');visit(item.elements,depth+1,item.elementType);}
 }};visit(items,0);
}
export function cloneEditorialSection(source:V2Section):V2Section{
 const copy=structuredClone(source);copy.id=editorialId();
 const fresh=(items:V2Item[]):V2Item[]=>items.map(item=>{const id=editorialId();return {...item,id,internalKey:id,...(item.elements?{elements:fresh(item.elements)}:{})};});copy.items=fresh(copy.items);return copy;
}
export const EDITORIAL_PRESETS=['empty','image-left','image-right','image-top','columns','icon-row','security-grid','banner','centered','faq','gallery'] as const;
export type EditorialPreset=typeof EDITORIAL_PRESETS[number];
export const PRESET_LABELS:Record<EditorialPreset,string>={empty:'Boş bölüm','image-left':LAYOUT_LABELS['image-left'],'image-right':LAYOUT_LABELS['image-right'],'image-top':LAYOUT_LABELS['image-top'],columns:'Sütunlar / kartlar','icon-row':'İkon sırası','security-grid':'Güven kartları',banner:'Geniş banner',centered:'Metin + buton',faq:'SSS',gallery:'Görsel grubu'};
export function applyEditorialPreset(base:V2Section,preset:EditorialPreset):V2Section{
 const section=cloneEditorialSection(base);section.type='EDITORIAL_SECTION';section.schemaVersion=1;section.items=[];
 section.editorialLayout={mobile:{layout:'stack',columns:1},tablet:{layout:preset==='empty'||preset==='faq'||preset==='gallery'?'stack':preset,columns:2},desktop:{layout:preset==='empty'||preset==='faq'||preset==='gallery'?'stack':preset,columns:preset==='columns'?4:3}};
 const types:ElementType[]=preset==='empty'?[]:preset==='faq'?['FAQ']:preset==='gallery'?['GALLERY']:preset==='icon-row'?['ICON','ICON','ICON']:preset==='security-grid'?['TRUST_CARD','TRUST_CARD','TRUST_CARD']:preset==='columns'?['CARD','CARD']:preset==='centered'?['HEADING','TEXT','BUTTON']:['IMAGE','HEADING','TEXT','BUTTON'];section.items=types.map(createEditorialElement);return section;
}
export type SectionTemplate={version:1;id:string;name:string;section:V2Section};
export const TEMPLATE_STORAGE_KEY='pasaport-editorial-templates-v1';
export function makeTemplate(name:string,section:V2Section):SectionTemplate{
 if(section.type!=='EDITORIAL_SECTION')throw Error('E_TEMPLATE_TYPE');if(!name.trim()||name.trim().length>80)throw Error('E_TEMPLATE_NAME');validateEditorial(section.items,true);return {version:1,id:editorialId(),name:name.trim(),section:cloneEditorialSection(section)};
}
