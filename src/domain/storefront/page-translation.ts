import { V2_TEXT_FIELDS, ltStatus, type LT, type V2PageConfig } from './v2';
import { TRANSLATION_TARGETS, mergeMachineTranslation, needsMachineTranslation } from './translation-workflow';
import type { UiLocale } from '@/i18n/locales';
export type Field = { id: string; value: LT; path: (string | number)[] };
export type TranslationRequest = { entries: Record<string, string>; targets: Record<string, Exclude<UiLocale,'tr'>[]> };
export type TranslationResponse = { translations: Record<string, Partial<Record<UiLocale,string>>>; failures: Record<string,string>; partialTranslations?:Record<string,Partial<Record<UiLocale,string>>> };
export type Problem = { field: string; locale: UiLocale; code: string };
const excluded = /^(statistic|comparison|familyChat)/;
/** Explicit CMS field whitelist; never recurse into arbitrary commerce/provider/customer data. */
export function pageFields(page: V2PageConfig): Field[] {
 const fields: Field[] = [], sectionIds = new Set<string>();
 page.sections.forEach((section, si) => {
  if(sectionIds.has(section.id)) throw new Error('E_DUPLICATE_SECTION'); sectionIds.add(section.id);
  const add = (suffix: (string|number)[], value: LT | undefined, itemId?: string) => {
   if(value?.tr.trim()) fields.push({id:JSON.stringify([section.id,itemId??null,...suffix]),value,path:['sections',si,...(itemId===undefined?[]:['items',section.items.findIndex(i=>i.id===itemId)]),...suffix]});
  };
  for(const [key] of V2_TEXT_FIELDS[section.type]) if(!excluded.test(key)) add(['text',key],section.text[key]);
  const itemIds=new Set<string>();
  for(const item of section.items){
   if(itemIds.has(item.id)) throw new Error('E_DUPLICATE_ITEM'); itemIds.add(item.id);
   if(item.cardType==='review'||item.reviewType||item.entity||section.type==='DESTINATION_CAROUSEL'||section.type==='REGION_DISCOVERY') continue;
   for(const key of ['title','text','cta','imageAlt'] as const) add([key],item[key],item.id);
   item.labels.forEach((value,index)=>add(['labels',index],value,item.id));
  }
  // Caption/alt are editorial only; review bodies, numeric ratings and comparison evidence stay excluded.
  if(section.trust){add(['trust','manualCaption'],section.trust.manualCaption);add(['trust','comparisonImageAlt'],section.trust.comparisonImageAlt);}
 });
 return fields;
}
export function pageSummary(page: V2PageConfig){
 const fields=pageFields(page);
 return TRANSLATION_TARGETS.map(locale=>{
  const counts={MISSING:0,OUTDATED:0,AUTO_TRANSLATED:0,MANUALLY_EDITED:0,SOURCE:0};
  for(const f of fields) counts[ltStatus(f.value,locale)]++;
  return {locale,...counts};
 });
}
export function pendingPage(page: V2PageConfig): Problem[]{
 return pageFields(page).flatMap(f=>TRANSLATION_TARGETS.filter(locale=>needsMachineTranslation(f.value,locale)).map(locale=>({field:f.id,locale,code:'E_PENDING'})));
}
export function manualPageReviews(page:V2PageConfig):Problem[]{
 return pageFields(page).flatMap(f=>TRANSLATION_TARGETS.filter(locale=>ltStatus(f.value,locale)==='OUTDATED'&&!needsMachineTranslation(f.value,locale)).map(locale=>({field:f.id,locale,code:'E_MANUAL_REVIEW'})));
}
/** Deduplicate exact sources only. Provenance is retained independently for each field. */
export function pagePlan(page: V2PageConfig){
 const groups=new Map<string,{id:string; source:string; fields:Field[]; targets:Exclude<UiLocale,'tr'>[]}>();
 for(const f of pageFields(page)){
  const targets=TRANSLATION_TARGETS.filter(l=>needsMachineTranslation(f.value,l)); if(!targets.length)continue;
  let g=groups.get(f.value.tr);if(!g){g={id:`f${groups.size}`,source:f.value.tr,fields:[],targets:[]};groups.set(f.value.tr,g);}
  g.fields.push(f);g.targets=TRANSLATION_TARGETS.filter(l=>g!.targets.includes(l)||targets.includes(l));
 }
 const batches: (typeof groups extends Map<string,infer G>?G:never)[][]=[];const invalid:Problem[]=[];
 for(const g of groups.values()){
  if(g.source.length>900){for(const f of g.fields)for(const locale of g.targets)if(needsMachineTranslation(f.value,locale))invalid.push({field:f.id,locale,code:'E_SIZE'});continue;}
  let batch=batches.at(-1);if(!batch||batch.length===6||batch.reduce((n,x)=>n+x.source.length,0)+g.source.length>3600){batch=[];batches.push(batch);}batch.push(g);
 }
 return {batches,invalid};
}
export type PageRun = { requests:number; completed:number; total:number; problems:Problem[]; paused:boolean; code:string };
/** Bounded explicit action. No polling, sleeps, automatic retry or background work. */
export async function translatePage(options:{getPage:()=>V2PageConfig; apply:(page:V2PageConfig)=>void; transport:(input:TranslationRequest)=>Promise<TranslationResponse>; maxRequests?:number; progress?:(done:number,total:number)=>void}):Promise<PageRun>{
 const start=options.getPage(), plan=pagePlan(start), total=pendingPage(start).length;
 let requests=0,code='',completed=0;const problems=[...plan.invalid];
 const max=options.maxRequests??2;
 for(const batch of plan.batches){
  if(requests>=max){code='E_PAUSED_LIMIT';break;}
  const input={entries:Object.fromEntries(batch.map(g=>[g.id,g.source])),targets:Object.fromEntries(batch.map(g=>[g.id,g.targets]))};
  let result:TranslationResponse; requests++;
  try{result=await options.transport(input);}catch(error){
   code=error instanceof Error&&error.message.includes('E_TRANSLATION_BUDGET')?'E_TRANSLATION_BUDGET':error instanceof Error&&error.message.includes('konfiguriert')?'E_NOT_CONFIGURED':'E_TRANSLATION_PROVIDER';break;
  }
  const current=options.getPage(), next=structuredClone(current), now=new Map(pageFields(current).map(f=>[f.id,f]));
  for(const group of batch)for(const field of group.fields){
   const target=now.get(field.id);
   for(const locale of group.targets){
    if(!needsMachineTranslation(field.value,locale))continue;
    const output=result.translations[group.id]?.[locale]??result.partialTranslations?.[group.id]?.[locale];
    if(!target||target.value.tr!==field.value.tr){problems.push({field:field.id,locale,code:'E_STALE_SOURCE'});continue;}
    if(!needsMachineTranslation(target.value,locale))continue; // intervening manual edits win
    if(!output?.trim()){problems.push({field:field.id,locale,code:result.failures[group.id]??'E_INCOMPLETE'});continue;}
    let parent:any=next;for(const part of target.path.slice(0,-1))parent=parent[part];
    const key=target.path.at(-1)!;parent[key]=mergeMachineTranslation(parent[key],field.value,{[locale]:output});completed++;
   }
  }
  options.apply(next);options.progress?.(completed,total);
 }
 const pending=pendingPage(options.getPage());
 for(const p of pending)if(!problems.some(x=>x.field===p.field&&x.locale===p.locale))problems.push({...p,code:code||p.code});
 return {requests,completed,total,problems,paused:!!pending.length,code:code||(problems.length?'E_INCOMPLETE':'DONE')};
}
