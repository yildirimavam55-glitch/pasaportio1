import { validateEditorial } from './editorial';
/** One versioned presentation contract. Never grants commerce or customer authority. */
export type BlockRole='admin'|'customer'|'anonymous';
export const V2_SECTION_TYPES = [
  "SEARCH_HERO",
  "BENEFIT_ROW",
  "DESTINATION_CAROUSEL",
  "TRUST_REVIEWS",
  "INFO_CAROUSEL",
  "REGION_DISCOVERY",
  "NOTICE",
  "INFO_GRID",
  "HOW_IT_WORKS",
  "INSTALLATION_STEPS",
  "COMPATIBILITY",
  "PROMO_BANNER",
  "GUIDE_CAROUSEL",
  "FAQ",
  "SPACER",
  "EDITORIAL_SECTION",
] as const;
export type V2SectionType = (typeof V2_SECTION_TYPES)[number];

/** Search hero carries the core search: editable copy/media, never hidden, removed or moved. */
export const V2_PROTECTED: readonly V2SectionType[] = ["SEARCH_HERO"];
/** Sections tied to live catalogue data or a single page capability — not duplicable. */
export const V2_SINGLETON: readonly V2SectionType[] = ["SEARCH_HERO", "DESTINATION_CAROUSEL", "TRUST_REVIEWS", "INFO_CAROUSEL", "REGION_DISCOVERY", "COMPATIBILITY", "GUIDE_CAROUSEL"];
export const V2_ADDABLE: readonly V2SectionType[] = ["BENEFIT_ROW", "PROMO_BANNER", "NOTICE", "INFO_GRID", "HOW_IT_WORKS", "INSTALLATION_STEPS", "FAQ", "SPACER", "EDITORIAL_SECTION"];

export const V2_TEXT_FIELDS: Record<V2SectionType, Array<[string, string]>> = {
  SEARCH_HERO: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["accent", "Vurgulu ikinci satır"], ["subtitle", "Alt başlık"], ["placeholder", "Arama metni"], ["sticky", "Sabit arama metni"], ["imageAlt", "Görsel açıklaması"]],
  BENEFIT_ROW: [],
  DESTINATION_CAROUSEL: [["title", "Başlık"]],
  TRUST_REVIEWS: [
    ["familyTitle", "Aile başlığı"], ["familyAccent", "Aile vurgusu"], ["familySubtitle", "Aile açıklaması"], ["familyGroup","Sohbet grup adı"], ["familyChat0","Sohbet mesajı 1"], ["familyChat1","Sohbet mesajı 2"], ["familyChat2","Sohbet mesajı 3"], ["familyChat3","Sohbet mesajı 4"], ["familyChat4","Sohbet mesajı 5"], ["familyBenefit0","Kompakt fayda 1"], ["familyBenefit1","Kompakt fayda 2"], ["familyBenefit2","Kompakt fayda 3"], ["familyReviewsTitle","Yorum başlığı"], ["familyBudget","Dönüşüm başlığı"], ["familyPlan","Dönüşüm açıklaması"], ["familyCta","Arama butonu"],["eyebrow", "Güven etiketi"], ["title", "Başlık"], ["accent", "Yeşil başlık satırı"], ["subtitle", "Açıklama"], ["imageAlt", "Seyahat görseli alt metni"], ["cta", "Buton metni"], ["whyEyebrow", "Neden pasaport.io üst başlığı"], ["whyTitle", "Neden pasaport.io başlığı"], ["whyDescription", "Neden pasaport.io açıklaması"], ["statisticPrefix", "Tasarruf ön eki (ör. \"…'e kadar\")"], ["statisticLabel", "Tasarruf başlığı"], ["comparisonTitle", "Karşılaştırma son mesaj başlığı"], ["comparisonDescription", "Karşılaştırma son mesaj açıklaması"], ["comparisonCta", "Karşılaştırma buton metni"], ["comparisonALabel", "Roaming etiketi"], ["comparisonASupport", "Roaming alt metni"], ["comparisonBLabel", "pasaport.io etiketi"], ["comparisonBSupport", "pasaport.io alt metni"], ["comparisonFootnote", "Kaynak / yöntem notu"], ["comparisonSavingLabel", "Tasarruf etiketi"], ["comparisonAdvantageLabel", "Fiyat avantajı etiketi"], ["comparisonDestination", "Karşılaştırılan destinasyon / referans"], ["comparisonAllowance", "Karşılaştırılan veri miktarı"], ["comparisonValidity", "Karşılaştırılan geçerlilik süresi"]],
  INFO_CAROUSEL: [["title", "Başlık"], ["subtitle", "Alt başlık"]],
  REGION_DISCOVERY: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["lead", "Açıklama"], ["worldwide", "Dünya bannerı"], ["cta", "Buton metni"]],
  NOTICE: [["title", "Başlık"], ["text", "Metin"]],
  INFO_GRID: [["title", "Başlık"]],
  HOW_IT_WORKS: [["title", "Başlık"]],
  INSTALLATION_STEPS: [["title", "Başlık"], ["subtitle", "Alt başlık"], ["ready", "Hazır etiketi"], ["adding", "Ekleniyor etiketi"], ["cta", "Buton metni"]],
  COMPATIBILITY: [["title", "Başlık"]],
  PROMO_BANNER: [["title", "Başlık"], ["subtitle", "Alt başlık"]],
  GUIDE_CAROUSEL: [["title", "Başlık"], ["lead", "Açıklama"], ["all", "Tümü bağlantısı"]],
  FAQ: [["title", "Başlık"]],
  SPACER: [],
  EDITORIAL_SECTION: [],
};

/** How items of a section are edited: title-only, title+text, question/answer, destination. */

export const BLOCK_CONTRACTS=Object.fromEntries(V2_SECTION_TYPES.map(type=>[type,{
 type,schemaVersion:1, renderer:type, previewRenderer:type,
 textFields:V2_TEXT_FIELDS[type], itemTextFields:['title','text','cta','imageAlt','labels'] as const,
 protected:V2_PROTECTED.includes(type),singleton:V2_SINGLETON.includes(type),addable:V2_ADDABLE.includes(type),
 editRoles:['admin'] as BlockRole[], publicFields:['text','design','items','media'] as const,
 forbiddenFields:['price','provider_cost','customer_id','role','order_id','payment_status','qr_code','activation_code'] as const,
 mediaVariants:['desktop','tablet','mobile'] as const,
 designFields:['width','spacing','background','radius','font','weight','lineHeight','letterSpacing','textAlign','position','headingColor','bodyColor','accentColor','mobile','tablet','desktop'],
 itemMode: type==='DESTINATION_CAROUSEL'?'catalogue':type==='TRUST_REVIEWS'?'evidence':'editorial',
 unsupported: ({REGION_DISCOVERY:['arbitrary-products','free-prices'],DESTINATION_CAROUSEL:['free-prices','provider-editing'],TRUST_REVIEWS:['comparison-publishing','fake-reviews','trust-chip-grid','per-item-design'],FAQ:['item-media','item-cta','item-icon','per-item-design'],HOW_IT_WORKS:['item-icon','item-cta','per-item-design'],INSTALLATION_STEPS:['item-icon','item-cta','per-item-design'],COMPATIBILITY:['device-authority','custom-checker'],GUIDE_CAROUSEL:['guide-data-editing']} as Partial<Record<V2SectionType,string[]>>)[type]??[],
 } ])) as unknown as Record<V2SectionType,BlockContract>;
export type BlockContract={type:V2SectionType;schemaVersion:number;renderer:V2SectionType;previewRenderer:V2SectionType;textFields:Array<[string,string]>;itemTextFields:readonly string[];protected:boolean;singleton:boolean;addable:boolean;editRoles:BlockRole[];publicFields:readonly string[];forbiddenFields:readonly string[];mediaVariants:readonly string[];designFields:string[];itemMode:string;unsupported:string[]};
export function blockContract(type:unknown):BlockContract{
 if(typeof type!=='string'||!Object.hasOwn(BLOCK_CONTRACTS,type))throw new Error('E_BLOCK_UNKNOWN');
 return BLOCK_CONTRACTS[type as V2SectionType];
}
/** Pure, lossless identity upgrade for schema 0/1. Unknown/future content blocks writes, never disappears. */
export function upgradeBlockDocument(raw:unknown):any{
 if(!raw||typeof raw!=='object')return raw;
 const value=raw as any;
 if(value.version!=null&&value.version!==0&&value.version!==1)throw new Error('E_DOCUMENT_FUTURE_VERSION');
 if(!Array.isArray(value.sections))return raw;
 if(value.sections.length>30)throw new Error('E_BLOCK_LIMIT');
 const ids=new Set<string>();
 for(const block of value.sections){
  const contract=blockContract(block?.type);
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(String(block.id??'')))throw new Error('E_BLOCK_INVALID_ID');
  if(!block.id||ids.has(block.id))throw new Error('E_BLOCK_DUPLICATE_ID');ids.add(block.id);
  if(block.schemaVersion!=null&&(!Number.isInteger(block.schemaVersion)||block.schemaVersion<0||block.schemaVersion>contract.schemaVersion))throw new Error('E_BLOCK_FUTURE_VERSION');
  if(Array.isArray(block.items)&&block.items.length>30)throw new Error('E_ITEM_LIMIT');
  validateEditorial(block.items??[],block.type==='EDITORIAL_SECTION');
  const itemIds=new Set<string>();for(const item of block.items??[]){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(String(item.id??'')))throw new Error('E_ITEM_INVALID_ID');if(!item.id||itemIds.has(item.id))throw new Error('E_ITEM_DUPLICATE_ID');itemIds.add(item.id);}
 }
 return {...value,version:1,sections:value.sections.map((b:any)=>b.schemaVersion===0?{...b,schemaVersion:1}:b)};
}
