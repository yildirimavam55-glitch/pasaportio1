import { createHash } from 'node:crypto';
import type { V2PageConfig,V2Item } from '@/domain/storefront/v2';
/** An Admin-edited flag/URL is NOT evidence. Approval lives outside the editable CMS. */
export function claimDigest(item:V2Item){return createHash('sha256').update(JSON.stringify({title:item.title,text:item.text,cta:item.cta,labels:item.labels,imageAlt:item.imageAlt,href:item.href,media:[item.mediaId,item.tabletMediaId??null,item.mobileMediaId??null]})).digest('hex');}
export function assertClaimApprovals(config:V2PageConfig,approved:Record<string,{source:string;reviewedAt:string}>={}){
 for(const section of config.sections.filter(s=>s.visible&&(s.type==='BENEFIT_ROW'||s.type==='INFO_GRID'&&s.variant==='security'))){
  for(const item of section.items.filter(i=>i.visible)){
   const proof=approved[claimDigest(item)];
   if(!proof||!/^https:\/\//.test(proof.source)||!Number.isFinite(Date.parse(proof.reviewedAt)))throw new Error('E_CMS_CLAIM_APPROVAL_REQUIRED');
  }
 }
}
export function claimApprovalsFromEnvironment():Record<string,{source:string;reviewedAt:string}>{
 try{return JSON.parse(process.env['CMS_APPROVED_CLAIM_DIGESTS']??'{}');}catch{throw new Error('E_CMS_CLAIM_APPROVAL_CONFIG');}
}
