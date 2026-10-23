import {sanitizeV2Page} from './v2';
import {TEMPLATE_LIMIT,makeTemplate,type SectionTemplate} from './editorial';
/** Device-local owner library, explicitly exportable. Never included in public CMS documents. */
export function parseTemplates(input:string):SectionTemplate[]{
 if(input.length>1024*1024)throw Error('E_TEMPLATE_SIZE');const raw=JSON.parse(input);
 if(!Array.isArray(raw)||raw.length>TEMPLATE_LIMIT)throw Error('E_TEMPLATE_LIMIT');const ids=new Set<string>();
 return raw.map(value=>{if(value?.version!==1||!/^ed-[a-zA-Z0-9_-]+$/.test(value.id)||ids.has(value.id))throw Error('E_TEMPLATE_VERSION_ID');ids.add(value.id);
 if(value.section?.type!=='EDITORIAL_SECTION')throw Error('E_TEMPLATE_TYPE');
 const clean=sanitizeV2Page({version:1,page:'esim',sections:[value.section]},'esim').sections.find(s=>s.id===value.section.id);if(!clean)throw Error('E_TEMPLATE_SECTION');const result=makeTemplate(value.name,clean);return {...result,id:value.id,section:clean};});
}
