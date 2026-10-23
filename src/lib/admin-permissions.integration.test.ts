import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({role:'customer',tables:[] as string[],rows:[] as any[],rpc:[] as any[]}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let validator:any;const b:any={inputValidator:(v:any)=>{validator=v;return b;},middleware:()=>b,handler:(fn:any)=>async(input:any={})=>fn({data:validator?validator(input.data):input.data,context:{userId:state.role==='anonymous'?'':'10000000-0000-4000-8000-000000000001',supabase:{rpc:async(name:string,args:any)=>{state.rpc.push([name,args]);return {data:name==='has_role'?state.role==='admin':null,error:null};}}}})};return b;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
vi.mock('@/integrations/supabase/client.server',()=>({supabaseAdmin:{from:(table:string)=>{state.tables.push(table);const result={data:table==='orders'?state.rows:[],error:null,count:0};let chain:any;chain=new Proxy({},{get:(_,key)=>key==='then'?((resolve:any)=>Promise.resolve(result).then(resolve)):(..._args:any[])=>chain});return chain;},storage:{from:()=>{throw Error('REAL_STORAGE_FORBIDDEN');}}}}));
import {getAdminOrders,getAdminCustomers,setFeatureFlag} from './admin-control.functions';
import {updateProduct} from './admin-catalog.functions';
import {listAdminAccess,inviteAdminUser} from './admin-users.functions';
import {getProviderHub,syncProviderNow} from './provider-hub.functions';
import {listMedia,uploadMedia} from './admin-media.functions';
import {saveCmsDocument} from './admin-cms.functions';
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
 for(const role of ['anonymous','customer','forged-role'])it.each(negativeCases)(role+' cannot execute %s',async(_name,fn,data)=>{state.role=role;await expect((fn as any)({data})).rejects.toThrow();expect(state.tables).toEqual([]);});
 it('legitimate Admin reads both synthetic customers orders without provider calls',async()=>{state.role='admin';state.rows=[{id:'a',customer_id:'customer-a',order_items:[],gross_revenue:10},{id:'b',customer_id:'customer-b',order_items:[],gross_revenue:20}];const rows=await getAdminOrders({data:{}});expect(rows.map((r:any)=>r.id)).toEqual(['a','b']);expect(state.tables).toEqual(['orders']);expect(state.rpc[0]).toEqual(['has_role',{_user_id:'10000000-0000-4000-8000-000000000001',_role:'admin'}]);});
 it('legitimate Admin can read customer list and media metadata using the same guard',async()=>{state.role='admin';await getAdminCustomers({data:{}});await listMedia({data:{}});expect(state.tables).toContain('media_assets');expect(state.rpc.every(([name]:any)=>name==='has_role')).toBe(true);});
 it('even Admin cannot use unsafe legacy draft writer',async()=>{state.role='admin';await expect(saveCmsDocument({data:{kind:'HOMEPAGE' as any,copy:{},settings:{} as any}})).rejects.toThrow('E_LEGACY_CMS_WRITE_PAUSED');expect(state.tables).toEqual([]);});
});
