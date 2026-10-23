import type { AdminCtx } from '@/lib/admin-guard';
import { assertAdminRole } from '@/lib/admin-guard';
export const atomicBuilderEnabled=()=>{const enabled=process.env['CMS_ATOMIC_V1_ENABLED']==='true';if(enabled&&process.env['CMS_PUBLIC_PROJECTION_ENABLED']!=='true')throw new Error('E_BUILDER_CUTOVER_REQUIRED');return enabled;};
export const publicContentSelection=()=>process.env['CMS_PUBLIC_PROJECTION_ENABLED']==='true'?'data:public_data':'data';
export type BuilderRevision=number|null;
/** Use the authenticated JWT client, never a service-role impersonation. No unsafe fallback in atomic mode. */
export async function readBuilder(ctx:AdminCtx,key:string){
 await assertAdminRole(ctx);const {data,error}=await ctx.supabase.rpc('builder_read' as never,{_key:key} as never);
 if(error||!data)throw new Error('E_BUILDER_READ');return data as any;
}
export async function writeBuilder(ctx:AdminCtx,key:string,revision:BuilderRevision|undefined,action:'draft'|'publish'|'restore'|'discard',config?:unknown,versionId?:string){
 await assertAdminRole(ctx);if(revision===undefined||revision!==null&&(!Number.isSafeInteger(revision)||revision<0))throw new Error('E_BUILDER_REVISION');
 const {data,error}=await ctx.supabase.rpc('builder_write' as never,{_key:key,_expected_revision:revision,_action:action,_config:config??null,_version_id:versionId??null} as never);
 if(error)throw new Error(error.code==='40001'?'E_BUILDER_CONFLICT: Taslak başka yönetici tarafından değişti. Yeniden yükleyin.':'E_BUILDER_WRITE');return data;
}
