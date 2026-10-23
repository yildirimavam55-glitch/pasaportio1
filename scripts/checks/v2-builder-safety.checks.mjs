// Node 24 type-stripping permits offline checks without installing application dependencies.
// Deliberately .checks.mjs, so Vitest does not execute node:test suites twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreV2Draft, collectMediaUsage, removeUnusedMedia, MEDIA_REFERENCE_SOURCES } from '../../src/lib/v2-builder-safety.ts';
import { assertAdminRole } from '../../src/lib/admin-guard.ts';

for (const result of [{data: false}, {data: null}, {data: true, error: {message: 'denied'}}]) test('actual admin guard rejects denied or failed role checks', async () => {
  await assert.rejects(() => assertAdminRole({ userId: 'synthetic-user', supabase: { rpc: async (name, args) => {
    assert.equal(name, 'has_role'); assert.equal(args._user_id, 'synthetic-user'); assert.equal(args._role, 'admin'); return result;
  } } }));
});

const asset = { id: '11111111-1111-4111-8111-111111111111', storage_path: 'hero/original.jpg' };
const versionId = '22222222-2222-4222-8222-222222222222';
function restoreDb(published = { sections: ['live'] }, options = {}) {
  const current = { id: 'doc', updated_at: '2026-10-22T00:00:00Z', status: published ? 'PUBLISHED' : 'DRAFT', published_at: published ? '2026-10-01' : null, data: { published, draft: { sections: ['old'] }, other: 'preserve' } };
  const original = structuredClone(current);
  const version = { id: versionId, document_id: 'doc', snapshot: { page: 'esim', config: { sections: ['restored'] } }, ...options.version };
  let writes = 0;
  const db = { from(table) {
    let updating = false, payload;
    const q = { select() { return q; }, eq() { return q; }, update(value) { updating = true; payload = value; return q; }, async maybeSingle() {
      if (updating) { writes++; if (options.conflict) return { data: null }; Object.assign(current, payload); return { data: { id: 'doc' } }; }
      return table === 'cms_documents' ? { data: current, error: options.readError } : { data: options.missing ? null : version, error: options.versionError };
    } }; return q;
  } };
  return { db, current, original, writes: () => writes };
}

for (const published of [{ sections: ['live'] }, null]) test(`restore preserves publication (${published ? 'published' : 'draft only'})`, async () => {
  const m = restoreDb(published);
  await restoreV2Draft(m.db, 'esim', versionId, x => x);
  assert.deepEqual(m.current.data.published, m.original.data.published);
  assert.equal(m.current.status, m.original.status);
  assert.equal(m.current.published_at, m.original.published_at);
  assert.equal(m.current.data.other, 'preserve');
  assert.deepEqual(m.current.data.draft, { sections: ['restored'] });
});
for (const [label, options] of [
  ['missing version', { missing: true }], ['foreign page', { version: { snapshot: { page: 'lounge', config: { sections: [] } } } }],
  ['foreign document', { version: { document_id: 'other' } }], ['invalid config', { version: { snapshot: { page: 'esim', config: {} } } }],
  ['read error', { readError: {} }], ['version read error', { versionError: {} }],
]) test(`restore rejects ${label} without writing`, async () => {
  const m = restoreDb(undefined, options);
  await assert.rejects(() => restoreV2Draft(m.db, 'esim', versionId, x => x));
  assert.equal(m.writes(), 0);
});
test('restore detects failed compare-and-swap', async () => {
  const m = restoreDb(undefined, { conflict: true });
  await assert.rejects(() => restoreV2Draft(m.db, 'esim', versionId, x => x), /E_RESTORE_CONFLICT/);
  assert.deepEqual(m.current, m.original);
});
test('invalid page never silently becomes esim', async () => {
  await assert.rejects(() => restoreV2Draft({}, 'wrong', versionId, x => x), /E_RESTORE_VERSION/);
});

function scanDb(rows = {}, fault) {
  return { from(table) {
    let offset = 0, end = 99;
    const q = { select() { return q; }, order() { return q; }, range(a,b) { offset = a; end = b; return q; }, then(resolve, reject) {
      const data = rows[table] ?? [];
      return Promise.resolve(fault?.(table, offset) ?? { data: data.slice(offset, end + 1), count: data.length, error: null }).then(resolve, reject);
    } }; return q;
  } };
}
for (const [table] of MEDIA_REFERENCE_SOURCES) test(`reference blocks deletion: ${table}`, async () => {
  const db = scanDb({ [table]: [{ id: 'reference', nested: { mobileMediaId: asset.id } }] });
  const usage = await collectMediaUsage(db, asset);
  assert.equal(usage.length, 1);
  await assert.rejects(() => removeUnusedMedia(asset, usage, () => { throw Error('must not call Storage'); }, () => { throw Error('must not delete row'); }));
});
test('checks references beyond library 300 and API page boundaries', async () => {
  const rows = Array.from({ length: 405 }, (_, i) => ({ id: String(i).padStart(4, '0'), snapshot: i === 404 ? { image: asset.id } : {} }));
  assert.equal((await collectMediaUsage(scanDb({ cms_versions: rows }), asset)).length, 1);
});
test('own library record is not a use, but alias to the same file is', async () => {
  assert.deepEqual(await collectMediaUsage(scanDb({ media_assets: [asset] }), asset), []);
  assert.equal((await collectMediaUsage(scanDb({ media_assets: [asset, { ...asset, id: 'alias' }] }), asset)).length, 1);
});
test('URL/path reference blocks deletion', async () => {
  assert.equal((await collectMediaUsage(scanDb({ guides: [{ id: 'guide', hero_image_url: 'https://example.invalid/' + asset.storage_path }] }), asset)).length, 1);
});
for (const [label, result] of [
  ['permission error', { data: [], count: 0, error: {} }], ['unknown count', { data: [], count: null }],
  ['limit exceeded', { data: [], count: 10001 }], ['truncated response', { data: [], count: 1 }],
]) test(`scan fails closed: ${label}`, async () => {
  await assert.rejects(() => collectMediaUsage(scanDb({}, () => result), asset), /E_MEDIA_USAGE/);
});
test('changing counts fail closed', async () => {
  const rows = Array.from({length: 101}, (_, i) => ({ id: String(i) }));
  await assert.rejects(() => collectMediaUsage(scanDb({ cms_versions: rows }, (table, offset) => table === 'cms_versions' && offset ? { data: [], count: 102 } : null), asset), /E_MEDIA_USAGE_CHANGED/);
});
test('orphan deletion requires successful Storage and metadata removal', async () => {
  const calls = [];
  const usage = await collectMediaUsage(scanDb(), asset);
  assert.deepEqual(await removeUnusedMedia(asset, usage, async () => { calls.push('storage'); return { error: null }; }, async () => { calls.push('record'); return { error: null, data: { id: asset.id } }; }), { ok: true });
  assert.deepEqual(calls, ['storage', 'record']);
});
test('Storage error never deletes metadata or returns success', async () => {
  await assert.rejects(() => removeUnusedMedia(asset, [], async () => ({ error: {} }), async () => { throw Error('must not delete metadata'); }), /E_MEDIA_STORAGE_REMOVE/);
});
test('metadata failure after Storage is explicitly partial', async () => {
  await assert.rejects(() => removeUnusedMedia(asset, [], async () => ({ error: null }), async () => ({ error: {}, data: null })), /E_MEDIA_RECORD_REMOVE_AFTER_STORAGE/);
});

test('server endpoints retain authentication and Admin authorization', () => {
  for (const [file, names] of [['src/lib/v2-storefront.functions.ts', ['saveV2Page', 'restoreV2Version']], ['src/lib/admin-media.functions.ts', ['deleteMedia', 'getMediaUsage']]]) {
    const source = readFileSync(file, 'utf8');
    for (const name of names) {
      const body = source.slice(source.indexOf(`export const ${name} =`)).split('\nexport ')[0];
      assert.match(body, /middleware\(\[requireSupabaseAuth\]\)/);
      assert.match(body, /await adminDb\(/);
    }
  }
});
test('partial version/audit failures have explicit errors; force override is absent', () => {
  const source = readFileSync('src/lib/v2-storefront.functions.ts', 'utf8');
  assert.match(source, /if \(versionError\) throw new Error\("E_CMS_PARTIAL_WRITE_VERSION/);
  assert.match(source, /E_CMS_PARTIAL_WRITE_AUDIT/);
  const media = readFileSync('src/lib/admin-media.functions.ts', 'utf8');
  assert.doesNotMatch(media.slice(media.indexOf('export const deleteMedia =')), /force/);
});
