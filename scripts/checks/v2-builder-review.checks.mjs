// Integration of the actual server-function handlers with an in-memory transport.
// No Supabase calls, SQL execution, RPC deployment, accounts, credentials or Storage access.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { assertAdminRole } from '../../src/lib/admin-guard.ts';

const sources = new Map([
  ['@tanstack/react-start', `export function createServerFn() {
    let validate = x => x, middlewares = [];
    const api = { inputValidator(fn) { validate = fn; return api; }, middleware(v) { middlewares = v; return api; },
      handler(fn) { return async (request = {}) => {
        const data = validate(request.data); const context = request.context ?? {};
        for (const middleware of middlewares) await middleware({context});
        return fn({data, context});
      }; } }; return api;
  }`],
  ['@/integrations/supabase/auth-middleware', `export async function requireSupabaseAuth({context}) {
    if (!context.userId) throw Error('E_AUTH_REQUIRED');
  }`],
  ['@/lib/admin-guard', `export async function assertAdminRole(context) { return globalThis.__v2Review.assertAdminRole(context); }
export async function adminDb(context) {
    await globalThis.__v2Review.assertAdminRole(context); return globalThis.__v2Review.db;
  }
  export async function audit(...args) {
    if (globalThis.__v2Review.auditError) throw Error('synthetic audit failure');
    globalThis.__v2Review.audits.push(args);
  }`],
  ['@supabase/supabase-js', `export function createClient() { return globalThis.__v2Review.db; }`],
  ['@/domain/storefront/v2', `export const V2_PAGES = ['esim','lounge','vignette'];
    export const collectV2MediaIds = () => []; export const missingV2Translations = () => 0;
    export const defaultV2Page = page => ({page, sections: []});
    export const sanitizeV2Page = value => structuredClone(value);
    export const withEditorialStarters = value => value;`],
]);
const hooks = registerHooks({resolve(specifier, context, next) {
  if (sources.has(specifier)) return {url: 'data:text/javascript,' + encodeURIComponent(sources.get(specifier)), shortCircuit: true};
  if (specifier === './builder-persistence.server') return {url: new URL('../../src/lib/builder-persistence.server.ts', import.meta.url).href, shortCircuit: true};
  if (specifier === './v2-builder-safety') return {url: new URL('../../src/lib/v2-builder-safety.ts', import.meta.url).href, shortCircuit: true};
  if (specifier.includes('client.server')) {
    globalThis.__v2Review.storageAccess++;
    throw Error('UNEXPECTED_STORAGE_ACCESS');
  }
  return next(specifier, context);
}});
const { deleteMedia } = await import('../../src/lib/admin-media.functions.ts');
const { restoreV2Version, saveV2Page, getPublishedV2Page } = await import('../../src/lib/v2-storefront.functions.ts');

const mediaId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const oldPublished = {page: 'esim', sections: [], label: 'PUBLIC_MARKER'};
const restored = {page: 'esim', sections: [], label: 'RESTORED_DRAFT_MARKER'};
let h;
beforeEach(() => {
  h = {assertAdminRole, queries: [], audits: [], storageAccess: 0, writes: 0, versionError: false, auditError: false,
    doc: {id: 'document', key: 'storefront_v2_esim', status: 'PUBLISHED', visible: true,
      published_at: '2026-10-01', updated_at: 'revision-0', data: {published: structuredClone(oldPublished), draft: {page: 'esim', sections: [], secret: 'DRAFT_ONLY_MARKER'}}},
    versions: [{id: versionId, document_id: 'document', snapshot: {page: 'esim', config: restored}}]};
  h.db = {from(table) {
    let op = 'select', payload, filters = [];
    const query = {select() {return query;}, eq(key,value) {filters.push([key,value]);return query;},
      order() {return query;}, limit() {return query;},
      update(v) {op='update';payload=v;return query;}, insert(v) {op='insert';payload=v;return query;},
      maybeSingle() {return Promise.resolve(run());}, single() {return Promise.resolve(run());},
      then(resolve,reject) {return Promise.resolve(run()).then(resolve,reject);}};
    function run() {
      h.queries.push({table,op});
      if (table === 'cms_versions' && op === 'insert') {
        if (h.versionError) return {data:null,error:{message:'synthetic version failure'}};
        h.versions.push(structuredClone(payload)); return {data:null,error:null};
      }
      if (table === 'cms_versions' && h.beforeVersionRead) { const hook=h.beforeVersionRead; h.beforeVersionRead=null; hook(); }
      if (table === 'cms_versions') return {data:h.versions.find(v=>filters.every(([k,x])=>v[k]===x)) ?? null,error:null};
      if (table !== 'cms_documents') throw Error('Unexpected table in handler integration: '+table);
      if (!h.doc || !filters.every(([k,v])=>h.doc[k]===v)) return {data:null,error:null};
      if (op === 'update') {
        Object.assign(h.doc,structuredClone(payload)); h.doc.updated_at='revision-'+(++h.writes);
      }
      return {data:structuredClone(h.doc),error:null};
    }
    return query;
  }};
  globalThis.__v2Review=h;
});
function context(role='admin') {
  return {userId:role==='anon'?null:'synthetic-'+role,
    supabase:{rpc:async (name,args)=>({data:name==='has_role' && args._role==='admin' && role==='admin',error:null}),
      auth:{getUser:async()=>({data:{user:{email:'synthetic@example.invalid'}}})}}};
}

for (const role of ['anon','customer','admin']) test(`delete handler is blocked for ${role}; no Storage or media operation`, async () => {
  await assert.rejects(()=>deleteMedia({context:context(role),data:{id:mediaId,force:true,enabled:true}}),
    role==='anon'?/E_AUTH_REQUIRED/:role==='customer'?/Yönetici/:/E_MEDIA_FINAL_DELETE_DISABLED/);
  assert.equal(h.storageAccess,0); assert.equal(h.queries.length,0); assert.equal(h.audits.length,0);
});
test('a newly introduced reference after an earlier scan cannot enable deletion',async()=>{
  h.doc.data.draft.mediaId=mediaId;
  const before=structuredClone(h.doc);
  await assert.rejects(()=>deleteMedia({context:context(),data:{id:mediaId}}),/E_MEDIA_FINAL_DELETE_DISABLED/);
  assert.deepEqual(h.doc,before); assert.equal(h.storageAccess,0); assert.equal(h.queries.length,0);
});
test('Admin UI has no final deletion action and shows the safety notice',()=>{
  const s=readFileSync('src/routes/_authenticated/admin.media.tsx','utf8');
  assert.match(s,/<Button[^>]*disabled[^>]*>Sil<\/Button>/);
  assert.match(s,/Kalıcı silme kapalıdır/);
  assert.doesNotMatch(s,/deleteMedia\(|remove\.mutate/);
});
test('actual restore handler preserves published content and appends draft history/audit',async()=>{
  const before=structuredClone(h.doc);
  await restoreV2Version({context:context(),data:{page:'esim',versionId}});
  assert.deepEqual(h.doc.data.published,before.data.published);
  assert.equal(h.doc.status,before.status); assert.equal(h.doc.published_at,before.published_at);
  assert.deepEqual(h.doc.data.draft,restored);
  assert.equal(h.versions.at(-1).snapshot.event,'restore');
  assert.equal(h.audits.at(-1)[1],'storefront_v2.restore_draft');
});
for (const role of ['anon','customer']) test(`restore handler denies ${role} before document reads`,async()=>{
  await assert.rejects(()=>restoreV2Version({context:context(role),data:{page:'esim',versionId}}));
  assert.equal(h.queries.length,0);
});
test('restore compare-and-swap rejects an intervening Admin write with real filter matching',async()=>{
  h.beforeVersionRead=()=>{h.doc.updated_at='revision-other-admin';h.doc.data.draft={page:'esim',sections:[],label:'ADMIN_B'};};
  await assert.rejects(()=>restoreV2Version({context:context(),data:{page:'esim',versionId}}),/E_RESTORE_CONFLICT/);
  assert.equal(h.doc.data.draft.label,'ADMIN_B'); assert.equal(h.versions.length,1); assert.equal(h.audits.length,0);
});
test('documents remaining stale-save overwrite risk; does not claim atomic RPC is active',async()=>{
  const adminA={...context(),userId:'synthetic-admin-A'}, adminB={...context(),userId:'synthetic-admin-B'};
  const a={page:'esim',sections:[],label:'ADMIN_A'}, b={page:'esim',sections:[],label:'STALE_ADMIN_B'};
  await saveV2Page({context:adminA,data:{page:'esim',config:a,publish:false}});
  await saveV2Page({context:adminB,data:{page:'esim',config:b,publish:false}});
  assert.equal(h.doc.data.draft.label,'STALE_ADMIN_B'); // Explicit release blocker, not approved semantics.
  assert.deepEqual(h.doc.data.published,oldPublished);
});
test('actual public server output includes published, never draft; not a direct PostgREST grant test',async()=>{
  const result=await getPublishedV2Page({data:{page:'esim'}});
  assert.equal(result.config.label,'PUBLIC_MARKER');
  assert.doesNotMatch(JSON.stringify(result),/DRAFT_ONLY_MARKER/);
});
test('save version failure reports partial write and never claims success',async()=>{
  h.versionError=true;
  await assert.rejects(()=>saveV2Page({context:context(),data:{page:'esim',config:restored,publish:false}}),/E_CMS_PARTIAL_WRITE_VERSION/);
  assert.deepEqual(h.doc.data.draft,restored); // Explicitly demonstrates current non-atomic behavior.
  assert.deepEqual(h.doc.data.published,oldPublished); assert.equal(h.audits.length,0);
});
test('save audit failure reports partial write and keeps evidence of completed writes',async()=>{
  h.auditError=true;
  await assert.rejects(()=>saveV2Page({context:context(),data:{page:'esim',config:restored,publish:false}}),/E_CMS_PARTIAL_WRITE_AUDIT/);
  assert.deepEqual(h.doc.data.draft,restored); assert.equal(h.versions.length,2);
});
test('restore history failure cannot publish the restored snapshot',async()=>{
  h.versionError=true;
  await assert.rejects(()=>restoreV2Version({context:context(),data:{page:'esim',versionId}}),/E_CMS_PARTIAL_WRITE_VERSION/);
  assert.deepEqual(h.doc.data.published,oldPublished); assert.deepEqual(h.doc.data.draft,restored);
});

test('publication proposal clears table AND column grants for both browser roles',()=>{
  const s=readFileSync('docs/migration/pending/v2_publication_boundary_proposal.sql','utf8');
  assert.match(s,/REVOKE SELECT ON TABLE public\.%I FROM PUBLIC, anon, authenticated/);
  assert.match(s,/REVOKE SELECT \(%s\) ON TABLE public\.%I FROM PUBLIC, anon, authenticated/);
  assert.match(s,/NEW\.data->'published'/); assert.doesNotMatch(s,/NEW\.data->'draft'/);
  assert.match(s,/GRANT SELECT \(id,key,kind,status,visible,published_at,public_data\)/);
  assert.match(s,/GRANT SELECT \(id,published,published_at\)/);
  assert.doesNotMatch(s,/GRANT SELECT \([^)]*\bdraft\b|GRANT SELECT \([^)]*\bdata\b/);
  assert.match(s,/ROLLBACK;/);
});
test('atomic proposal has revision, locking, identity guard and no exception swallowing',()=>{
  const s=readFileSync('docs/migration/pending/v2_builder_atomicity_proposal.sql','utf8');
  assert.match(s,/NEW\.builder_revision := OLD\.builder_revision \+ 1/);
  assert.match(s,/_expected_revision IS NULL OR doc\.builder_revision <> _expected_revision/);
  assert.match(s,/FOR UPDATE/); assert.match(s,/pg_advisory_xact_lock/);
  assert.match(s,/r\.user_id = auth\.uid\(\) AND r\.role = 'admin'/);
  assert.ok(s.indexOf('r.user_id = auth.uid()')<s.indexOf('SELECT * INTO doc'));
  assert.match(s,/SECURITY DEFINER SET search_path = ''/);
  assert.match(s,/FROM PUBLIC, anon/); assert.match(s,/ROLLBACK;/);
  assert.doesNotMatch(s,/WHEN OTHERS|_expected_updated_at|set_config/);
});
// These last checks inspect proposal text; they do not prove PostgreSQL permissions,
// transactional rollback or inter-session locking. Those remain explicit approval gates.
test.after(()=>{hooks.deregister();delete globalThis.__v2Review;});
