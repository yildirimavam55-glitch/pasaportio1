import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ role: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/admin-guard", () => ({ assertAdminRole: mocks.role }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
import { handleCmsTranslation } from "./cms-translation.server";
const context = { userId: "synthetic-admin", supabase: {} };
const invoke = ({ context, data }: { context: { userId: string; supabase: object }; data: unknown }) => handleCmsTranslation(context, data);
beforeEach(() => {
 mocks.role.mockReset().mockResolvedValue(undefined); mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null });
 vi.stubGlobal("fetch", vi.fn(async () => new Response("synthetic provider failure", { status: 503 })));
 for (const [key,value] of Object.entries({ CMS_TRANSLATION_ENABLED: "true", CMS_TRANSLATION_APPROVED: "true", CMS_TRANSLATION_PROVIDER: "openai", CMS_TRANSLATION_MODEL: "gpt-4.1-mini", CMS_TRANSLATION_API_KEY: "synthetic-offline-only" })) vi.stubEnv(key,value);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("actual CMS server handler with synthetic role/limiter/provider boundaries", () => {
 it("uses the authenticated context for Admin verification before any budget or provider access", async () => {
  mocks.role.mockRejectedValueOnce(new Error("ADMIN_REQUIRED"));
  await expect(invoke({context,data:{entries:{title:"Kaynak"}}})).rejects.toThrow("ADMIN_REQUIRED");
  expect(mocks.role).toHaveBeenCalledWith(context); expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
 });
 it("unapproved configuration never imports an active limiter or calls a provider", async () => {
  vi.stubEnv("CMS_TRANSLATION_APPROVED","false");
  await expect(invoke({context,data:{entries:{title:"Kaynak"}}})).rejects.toThrow("Übersetzungsdienst nicht konfiguriert");
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
 });
 it("fails closed on the global limiter and never sends content to the provider", async () => {
  mocks.rpc.mockResolvedValueOnce({data:false,error:null});
  await expect(invoke({context,data:{entries:{title:"Kaynak"}}})).rejects.toThrow("E_TRANSLATION_BUDGET");
  expect(mocks.rpc).toHaveBeenCalledWith("consume_rate_limit",{_bucket:"cms-translation:global:daily",_limit:10,_window_seconds:86400}); expect(fetch).not.toHaveBeenCalled();
 });
 it("requires both shared global and per-admin reservations, and returns only safe upstream failure codes", async () => {
  const result = await invoke({context,data:{entries:{title:"Kaynak"}}});
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc).toHaveBeenLastCalledWith("consume_rate_limit",{_bucket:"cms-translation:user:synthetic-admin",_limit:2,_window_seconds:60});
  expect(result).toEqual({translations:{},failures:{title:"E_TRANSLATION_PROVIDER"}});
  expect(JSON.stringify(result)).not.toContain("synthetic provider failure");
 });
});

import { translatePage, pendingPage } from '@/domain/storefront/page-translation';
import { defaultV2Page, createV2Section } from '@/domain/storefront/v2';
import { demoLT } from '@/builder-preview/translation-fixtures';
it('runs the whole-page planner through the real private handler, fake Admin/limiter/fetch, resumes only the failed subbatch',async()=>{
 let page=defaultV2Page('esim');page.sections=[];
 for(let i=0;i<8;i++){const section=createV2Section(i===0?'SEARCH_HERO':'NOTICE');section.id=`section${i}`;section.text={title:demoLT(`Kaynak ${i}`)};page.sections.push(section);}
 let calls=0;
 vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init:RequestInit)=>{
  const payload=JSON.parse(String(init.body));const input=JSON.parse(payload.messages[1].content);calls++;
  if(calls===2)return new Response('',{status:503});
  const result=Object.fromEntries(Object.entries(input.sources).map(([id,source])=>[id,Object.fromEntries(input.targets[id].map((locale:string)=>[locale,`Translated ${String(source).match(/\d+/)![0]}`]))]));
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));
 }));
 const execute=()=>translatePage({getPage:()=>page,apply:next=>{page=next;},transport:data=>handleCmsTranslation(context,data)});
 const first=await execute();expect(first.requests).toBe(2);expect(first.completed).toBe(65);expect(pendingPage(page)).toHaveLength(39);
 const before=calls;const second=await execute();expect(second.completed).toBe(39);expect(second.code).toBe('DONE');expect(calls-before).toBe(1);
 expect(mocks.role).toHaveBeenCalledTimes(3);expect(mocks.rpc).toHaveBeenCalledTimes(6);
 const after=calls;await execute();expect(calls).toBe(after);
});
