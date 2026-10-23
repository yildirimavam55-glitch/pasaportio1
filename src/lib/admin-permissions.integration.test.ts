import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({role:'customer',tables:[] as string[],rows:[] as any[],rpc:[] as any[]}));
// Load original TypeScript handlers before the TanStack RPC compiler rewrites transport.
// Only transport/session/client boundaries are synthetic; handler bodies and Admin guard are real.
import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
const nativeRequire=createRequire(import.meta.url);const cache=new Map<string,any>();
const client={from:(table:string)=>{state.tables.push(table);const result={data:table==='orders'?state.rows:[],error:null,count:0};let chain:any;chain=new Proxy({},{get:(_,key)=>key==='then'?((resolve:any)=>Promise.resolve(result).then(resolve)):(..._args:any[])=>chain});return chain;},storage:{from:()=>{throw Error('REAL_STORAGE_FORBIDDEN');}}};
function originalModule(path:string):any{
 const full=resolve(path);if(cache.has(full))return cache.get(full).exports;
 const module={exports:{} as any};cache.set(full,module);
 const requireOriginal=(name:string):any=>{
  if(name==='@tanstack/react-start')return {createServerFn:()=>{let validator:any;const b:any={inputValidator:(v:any)=>{validator=v;return b;},middleware:()=>b,handler:(fn:any)=>async(input:any={})=>fn({data:validator?validator(input.data):input.data,context:{userId:state.role==='anonymous'?'':'10000000-0000-4000-8000-000000000001',supabase:{rpc:async(name:string,args:any)=>{state.rpc.push([name,args]);return {data:name==='has_role'?state.role==='admin':null,error:null};}}}})};return b;}};
  if(name==='@/integrations/supabase/auth-middleware')return {requireSupabaseAuth:{}};
  if(name==='@/integrations/supabase/client.server')return {supabaseAdmin:client};
  if(name.startsWith('@/')||name.startsWith('.')){const file=name.startsWith('@/')?resolve('src',name.slice(2)):resolve(dirname(full),name);const selected=[file,file+'.ts',file+'.tsx',file+'/index.ts'].find(p=>existsSync(p)&&/\.(ts|tsx)$/.test(p));if(!selected)throw Error('TEST_MODULE_MISSING '+name);return originalModule(selected);}
  return nativeRequire(name);
 };
 const js=ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},transformers:{before:[context=>{const visit=(node:ts.Node):ts.VisitResult<ts.Node>=>ts.isMetaProperty(node)&&node.keywordToken===ts.SyntaxKind.ImportKeyword?ts.factory.createIdentifier('__testImportMeta'):ts.visitEachChild(node,visit,context);return source=>ts.visitNode(source,visit) as ts.SourceFile;}]}}).outputText;
 new Function('require','module','exports','__testImportMeta',js)(requireOriginal,module,module.exports,{env:{DEV:false,PROD:false,MODE:'test'}});return module.exports;
}
const {getAdminOrders,getAdminCustomers,setFeatureFlag}=originalModule('src/lib/admin-control.functions.ts');
const {updateProduct}=originalModule('src/lib/admin-catalog.functions.ts');
const {listAdminAccess,inviteAdminUser}=originalModule('src/lib/admin-users.functions.ts');
const {getProviderHub,syncProviderNow}=originalModule('src/lib/provider-hub.functions.ts');
const {listMedia,uploadMedia}=originalModule('src/lib/admin-media.functions.ts');
const {saveCmsDocument}=originalModule('src/lib/admin-cms.functions.ts');
const negativeCases=[
 ['orders',getAdminOrders,{}],['customers',getAdminCustomers,{}],['flags',setFeatureFlag,{key:'LIVE_PAYMENTS',enabled:true}],
 ['product mutation',updateProduct,{id:'20000000-0000-4000-8000-000000000001',patch:{sale_price:0}}],
 ['admin list',listAdminAccess,undefined],['role invitation',inviteAdminUser,{email:'synthetic@example.invalid',name:'Synthetic'}],
 ['provider hub',getProviderHub,undefined],['provider sync',syncProviderNow,{id:'20000000-0000-4000-8000-000000000002'}],
 ['media list',listMedia,{}],['upload traversal',uploadMedia,{category:'../../private',contentType:'image/svg+xml',base64:'PHN2Zy8+'}],
 ['legacy CMS',saveCmsDocument,{kind:'HOMEPAGE',copy:{},settings:{}}],
] as const;
describe('real Admin handlers and real role guard with synthetic clients (middleware tested separately)',()=>{
 beforeEach(()=>{state.role='customer';state.tables=[];state.rpc=[];state.rows=[];});
 for(const role of ['anonymous','customer','forged-role'])it.each(negativeCases)(role+' cannot execute %s',async(_name,fn,data)=>{state.role=role;await expect((fn as any)({data})).rejects.toThrow('Yönetici yetkisi gerekiyor.');expect(state.rpc[0]?.[0]).toBe('has_role');expect(state.tables).toEqual([]);});
 it('legitimate Admin reads both synthetic customers orders without provider calls',async()=>{state.role='admin';state.rows=[{id:'a',customer_id:'customer-a',order_items:[],gross_revenue:10},{id:'b',customer_id:'customer-b',order_items:[],gross_revenue:20}];const rows=await getAdminOrders({data:{}});expect(rows.map((r:any)=>r.id)).toEqual(['a','b']);expect(state.tables).toEqual(['orders']);expect(state.rpc[0]).toEqual(['has_role',{_user_id:'10000000-0000-4000-8000-000000000001',_role:'admin'}]);});
 it('legitimate Admin can read customer list and media metadata using the same guard',async()=>{state.role='admin';await getAdminCustomers({data:{}});await listMedia({data:{}});expect(state.tables).toContain('media_assets');expect(state.rpc.every(([name]:any)=>name==='has_role')).toBe(true);});
 it('even Admin cannot use unsafe legacy draft writer',async()=>{state.role='admin';await expect(saveCmsDocument({data:{kind:'HOMEPAGE' as any,copy:{},settings:{} as any}})).rejects.toThrow('E_LEGACY_CMS_WRITE_PAUSED');expect(state.tables).toEqual([]);});
});
