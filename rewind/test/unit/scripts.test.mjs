import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Copy the project into a temp dir so the scripts never touch the real library.
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'rewind-'));
  const src = fileURLToPath(new URL('../../', import.meta.url));
  for (const d of ['js', 'data', 'scripts']) cpSync(join(src, d), join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  // Tests must not depend on whatever statuses the real library currently holds.
  const f = join(dir, 'data/library.json'); const l = JSON.parse(readFileSync(f, 'utf8'));
  l.videos = l.videos.filter((v) => v.status !== 'broken').slice(0, 12);   // small + fast; the real library is covered by core.test
  l.videos.forEach((v) => { v.status = 'unverified'; v.lastChecked = null; v.playback = null; }); writeFileSync(f, JSON.stringify(l));
  return dir;
}
const run = (dir, script, args, env = {}) => new Promise((res) => {
  const p = spawn(process.execPath, [join(dir, 'scripts', script), ...args], { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('close', (code) => res({ code, out }));
});
const lib = (dir) => JSON.parse(readFileSync(join(dir, 'data/library.json'), 'utf8')).videos;

async function mockOembed(handler) {
  const s = createServer((req, res) => {
    const u = new URL(req.url, 'http://x').searchParams.get('url');
    const r = handler(u);
    res.writeHead(r.status, { 'content-type': 'application/json' }).end(JSON.stringify(r.body || {}));
  });
  await new Promise((r) => s.listen(0, r));
  return { base: `http://127.0.0.1:${s.address().port}/oembed`, close: () => s.close() };
}

test('verify-links: marks ok verified, gone broken, leaves errors alone', async () => {
  const dir = sandbox();
  const ids = lib(dir).slice(0, 3).map((v) => v.id);
  const m = await mockOembed((u) => u.includes(ids[0]) ? { status: 200, body: { title: 'x', author_unique_id: 'realhandle', html: '<b/>' } }
    : u.includes(ids[1]) ? { status: 400 } : { status: 503 });
  const r = await run(dir, 'verify-links.mjs', [], { OEMBED_BASE: m.base });
  m.close();
  assert.equal(r.code, 0, r.out);
  const v = Object.fromEntries(lib(dir).map((x) => [x.id, x]));
  assert.equal(v[ids[0]].status, 'verified'); assert.equal(v[ids[0]].creator, 'realhandle'); assert.ok(v[ids[0]].lastChecked);
  assert.equal(v[ids[1]].status, 'broken');
  assert.equal(v[ids[2]].status, 'unverified');
  assert.ok(readFileSync(join(dir, 'data/library.js'), 'utf8').includes('realhandle'));
});

test('verify-links: unreachable network changes nothing', async () => {
  const dir = sandbox(); const before = readFileSync(join(dir, 'data/library.json'), 'utf8');
  const r = await run(dir, 'verify-links.mjs', [], { OEMBED_BASE: 'http://127.0.0.1:9/oembed' });
  assert.match(r.out, /inconclusive/); assert.equal(readFileSync(join(dir, 'data/library.json'), 'utf8'), before);
});

test('add-videos: validates scope, dedupes, records provenance', async () => {
  const dir = sandbox(); const n0 = lib(dir).length;
  const good = 'https://www.tiktok.com/@newperson/video/7290505556610141000'; // Oct 2023 range ID
  const out2021 = 'https://www.tiktok.com/@old/video/7000000000000000000';
  const d0 = lib(dir)[0]; const dupe = `https://www.tiktok.com/@${d0.creator || 'x'}/video/${d0.id}`;
  const r = await run(dir, 'add-videos.mjs', [good, out2021, dupe, 'https://vm.tiktok.com/abc', '--offline', '--tags=memes,cozy', '--provenance=https://example.com/src', '--title=Test post'], {});
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /dupe/); assert.match(r.out, /outside/); assert.match(r.out, /short link/);
  const v = lib(dir); assert.equal(v.length, n0 + 1);
  const added = v.find((x) => x.creator === 'newperson');
  assert.equal(added.status, 'unverified'); assert.deepEqual(added.trends, ['memes', 'cozy']); assert.equal(added.provenance, 'https://example.com/src');
  assert.equal(added.date, '2023-10-16'); // decoded from the ID itself
});

test('apply-health: ok -> verified, invalid -> broken, timeouts ignored', async () => {
  const dir = sandbox(); const [a, b, c] = lib(dir).slice(0, 3).map((v) => v.id);
  writeFileSync(join(dir, 'h.json'), JSON.stringify({ results: { [a]: { state: 'ok', at: '2026-01-02T00:00:00Z' }, [b]: { state: 'error', kind: 'invalid', code: 1001, at: '2026-01-02' }, [c]: { state: 'broken', kind: 'timeout' } } }));
  const r = await run(dir, 'apply-health.mjs', [join(dir, 'h.json')]); assert.equal(r.code, 0, r.out);
  const v = Object.fromEntries(lib(dir).map((x) => [x.id, x]));
  assert.equal(v[a].status, 'verified'); assert.equal(v[a].lastChecked, '2026-01-02'); assert.equal(v[b].status, 'broken'); assert.equal(v[c].status, 'unverified');
});

test('build-library refuses an invalid library', async () => {
  const dir = sandbox(); const l = JSON.parse(readFileSync(join(dir, 'data/library.json'), 'utf8'));
  l.videos[0].date = '2021-01-01'; writeFileSync(join(dir, 'data/library.json'), JSON.stringify(l));
  const r = await run(dir, 'build-library.mjs', []); assert.notEqual(r.code, 0); assert.match(r.out, /!= id date|outside/);
});
