import type { V2PageConfig } from './v2';
import type { ThemeConfig } from '@/domain/theme/config';
import type { StorefrontConfig } from './registry';
export type EditorSnapshot={page:V2PageConfig;theme:ThemeConfig;chrome:StorefrontConfig};
export type EditorSession={revision:number;draft:EditorSnapshot;published:EditorSnapshot;versions:{revision:number;event:'draft'|'publish'|'restore';value:EditorSnapshot}[]};
export function newEditorSession(value:EditorSnapshot):EditorSession{return {revision:0,draft:structuredClone(value),published:structuredClone(value),versions:[]};}
/** Synthetic offline adapter only. Real Admin uses authenticated atomic PostgreSQL RPC. */
export function saveEditorSession(current:EditorSession,value:EditorSnapshot,expected:number,publish=false):EditorSession{
 if(current.revision!==expected)throw new Error('E_BUILDER_CONFLICT');
 return {revision:current.revision+1,draft:structuredClone(value),published:publish?structuredClone(value):current.published,versions:[{revision:current.revision+1,event:publish?'publish' as const:'draft' as const,value:structuredClone(value)},...current.versions].slice(0,30)};
}
export function restoreEditorSession(current:EditorSession,index:number):EditorSession{
 const version=current.versions[index];if(!version)throw new Error('E_VERSION');const next=saveEditorSession(current,version.value,current.revision);next.versions[0]!.event='restore';return next;
}
