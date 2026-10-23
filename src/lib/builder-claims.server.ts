import { createHash } from 'node:crypto';
import type { V2PageConfig,V2Item } from '@/domain/storefront/v2';
/** An Admin-edited flag/URL is NOT evidence. Approval lives outside the editable CMS. */
export function claimDigest(item:V2Item){return createHash('sha256').update(JSON.stringify({title:item.title,text:item.text,cta:item.cta,labels:item.labels,imageAlt:item.imageAlt,href:item.href,media:[item.mediaId,item.tabletMediaId??null,item.mobileMediaId??null]})).digest('hex');}
export function assertClaimApprovals(config:V2PageConfig,approved:Record<string,{source:string;reviewedAt:string}>={}){
 const visible=(items:V2Item[]):V2Item[]=>items.filter(i=>i.visible).flatMap(i=>[i,...visible(i.elements??[])]);
 for(const section of config.sections.filter(s=>s.visible&&(s.type==='BENEFIT_ROW'||s.type==='INFO_GRID'&&s.variant==='security'||s.type==='EDITORIAL_SECTION'))){
  for(const item of visible(section.items).filter(i=>section.type!=='EDITORIAL_SECTION'||['CARD','TRUST_CARD'].includes(i.elementType??''))){
   const proof=approved[claimDigest(item)];
   if(!proof||!/^https:\/\//.test(proof.source)||!Number.isFinite(Date.parse(proof.reviewedAt)))throw new Error('E_CMS_CLAIM_APPROVAL_REQUIRED');
  }
 }
}
export function claimApprovalsFromEnvironment():Record<string,{source:string;reviewedAt:string}>{
 try{const v=JSON.parse(process.env['CMS_APPROVED_CLAIM_DIGESTS']??'{}');if(!v||typeof v!=='object'||Array.isArray(v)||Object.entries(v).some(([key,value])=>!/^[a-f0-9]{64}$/.test(key)||!value||typeof value!=='object'||typeof (value as any).source!=='string'||typeof (value as any).reviewedAt!=='string'))throw new Error();return v;}catch{throw new Error('E_CMS_CLAIM_APPROVAL_CONFIG');}
}
