import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const core = createRequire(import.meta.url)('../../js/core.js');
const lib = JSON.parse(readFileSync(new URL('../../data/library.json', import.meta.url)));
const meta = JSON.parse(readFileSync(new URL('../../data/meta.json', import.meta.url)));
const vids = lib.videos.map(core.normalizeVideo);

test('dateFromId decodes the snowflake timestamp', () => {
  assert.equal(core.dateFromId('6862153058223197445'), '2020-08-18');
  assert.equal(core.dateFromId('7317421325822315809'), '2023-12-27');
  assert.equal(core.dateFromId('123'), null);
  assert.equal(core.dateFromId('abc'), null);
});

test('parseTikTokUrl handles real shapes and rejects junk', () => {
  assert.deepEqual(core.parseTikTokUrl('https://www.tiktok.com/@bellapoarch/video/6862153058223197445?lang=en'), { id: '6862153058223197445', creator: 'bellapoarch' });
  assert.equal(core.parseTikTokUrl('tiktok.com/@a.b_c/video/7287054057124924677').creator, 'a.b_c');
  assert.equal(core.parseTikTokUrl('https://www.tiktok.com/player/v1/7287054057124924677').id, '7287054057124924677');
  assert.equal(core.parseTikTokUrl('7287054057124924677').id, '7287054057124924677');
  assert.match(core.parseTikTokUrl('https://vm.tiktok.com/ZMabc/').error, /short link/);
  assert.match(core.parseTikTokUrl('https://youtube.com/watch?v=1').error, /not a tiktok/);
  assert.ok(core.parseTikTokUrl('').error);
  assert.ok(core.parseTikTokUrl('https://www.tiktok.com/@x').error);
});

test('scope: only 2020 and Sep–Dec 2023', () => {
  for (const d of ['2020-01-01', '2020-12-31', '2023-09-01', '2023-12-31']) assert.ok(core.inScope(d), d);
  for (const d of ['2019-12-31', '2021-01-01', '2023-08-31', '2024-01-01']) assert.ok(!core.inScope(d), d);
});

test('shipped library is valid, unique, and honest about status', () => {
  assert.deepEqual(core.validateLibrary(lib.videos), []);
  assert.ok(vids.length >= 70);
  // Nothing may claim "verified" without a lastChecked date.
  for (const v of vids) if (v.status === 'verified') assert.ok(v.lastChecked, `${v.id} verified without lastChecked`);
  // Every tag used must be known or a trend slug (lowercase-kebab).
  for (const v of vids) for (const t of v.trends) assert.match(t, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('validateLibrary catches problems', () => {
  const bad = core.validateLibrary([
    { id: '6862153058223197445', date: '2020-08-19', status: 'verified' },
    { id: '6862153058223197445', date: '2020-08-18', status: 'nope' },
    { id: '7000000000000000000', date: '2021-01-01', status: 'unverified' },
  ]);
  assert.ok(bad.some((p) => /!= id date/.test(p)));
  assert.ok(bad.some((p) => /duplicate/.test(p)));
  assert.ok(bad.some((p) => /bad status/.test(p)));
  assert.ok(bad.some((p) => /outside/.test(p)));
});

test('buildFeed filters by period, tags, search, favorites, broken', () => {
  const f = (o) => core.buildFeed(vids, o);
  assert.ok(f({ period: '2020' }).every((v) => v.year === 2020));
  assert.ok(f({ period: 'fall' }).every((v) => v.year === 2023));
  assert.equal(f({ period: 'fall' }).length + f({ period: '2020' }).length, vids.filter((v) => v.status !== 'broken').length);
  assert.equal(f({ hideUnavailable: false }).length, vids.length);
  const oct = f({ period: '2023-10' });
  assert.ok(oct.length > 0 && oct.every((v) => v.month === '2023-10'));
  assert.ok(f({ tags: ['dances'] }).every((v) => v.trends.includes('dances')));
  assert.ok(f({ query: 'roman empire' }).length >= 5);
  assert.ok(f({ query: '@bellapoarch' }).every((v) => v.creator === 'bellapoarch'));
  assert.ok(f({ query: 'october 2023' }).every((v) => v.month === '2023-10'));
  const fav = new Set([vids[0].id]);
  assert.deepEqual(f({ favoritesOnly: true, favorites: fav }).map((v) => v.id), [vids[0].id]);
  const broken = new Set([vids[1].id]);
  assert.ok(!f({ broken }).some((v) => v.id === vids[1].id));
  assert.ok(f({ broken, hideUnavailable: false }).some((v) => v.id === vids[1].id));
  assert.ok(!f({ hidden: new Set([vids[2].id]) }).some((v) => v.id === vids[2].id));
});

test('buildFeed: chronological by default, deterministic shuffle with seed', () => {
  const a = core.buildFeed(vids, { period: 'fall' });
  assert.deepEqual(a.map((v) => v.date), [...a.map((v) => v.date)].sort());
  const live = vids.filter((v) => v.status !== 'broken');
  const s1 = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(1) }).map((v) => v.id);
  const s2 = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(1) }).map((v) => v.id);
  assert.deepEqual(s1, s2);
  assert.deepEqual([...s1].sort(), live.map((v) => v.id).sort());
});

test('collections and moods resolve to real, non-empty feeds', () => {
  for (const c of meta.collections) {
    const n = core.buildFeed(vids, { collection: c }).length;
    assert.ok(n > 0, `collection ${c.id} is empty`);
  }
  for (const m of meta.moods) {
    const n = core.buildFeed(vids, { period: m.period, tags: m.tagsAny }).length;
    assert.ok(n > 0, `mood ${m.id} is empty`);
  }
});

test('similar() prefers shared trends, never returns self or broken', () => {
  const roman = vids.find((v) => v.trends.includes('roman-empire'));
  const s = core.similar(roman, vids, 5);
  assert.ok(s.length && !s.some((v) => v.id === roman.id));
  assert.ok(s[0].trends.includes('roman-empire'));
  const withBroken = vids.map((v) => (v.id === s[0].id ? { ...v, status: 'broken' } : v));
  assert.ok(!core.similar(roman, withBroken, 5).some((v) => v.id === s[0].id));
});

test('Queue wraps, jumps, removes', () => {
  const q = new core.Queue(vids.slice(0, 3));
  assert.equal(q.prev().id, vids[2].id);
  assert.equal(q.next().id, vids[0].id);
  q.jump(99); assert.equal(q.index, 2);
  q.removeCurrent(); assert.equal(q.length, 2); assert.equal(q.index, 0);
  assert.equal(new core.Queue([]).next(), null);
  assert.equal(new core.Queue(vids.slice(0, 5), vids[3].id).current.id, vids[3].id);
  assert.equal(new core.Queue(vids.slice(0, 5)).peek(2).length, 2);
});

test('error classification and failure policy', () => {
  assert.equal(core.classifyError(1001), 'invalid');
  assert.equal(core.classifyError('3002'), 'autoplay');
  assert.equal(core.classifyError(9999), 'playback');
  assert.equal(core.failurePolicy('invalid').markBroken, true);
  assert.equal(core.failurePolicy('timeout').markBroken, false);
  assert.equal(core.failurePolicy('autoplay').countsAsFailure, false);
});

test('formatting helpers', () => {
  assert.equal(core.formatDuration(5000), 'less than a minute');
  assert.equal(core.formatDuration(18 * 60000), '18 minutes');
  assert.equal(core.formatDuration(125 * 60000), '2 hrs 5 min');
  assert.equal(core.formatDate('2023-10-07'), 'Oct 7, 2023');
});

test('shuffle: different seeds give different orders, unseen first, trends spaced out', () => {
  const generic = new Set(meta.vibes.map((v) => v.id));
  const live = vids.filter((v) => v.status !== 'broken');
  const orders = [1, 2, 3].map((n) => core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(n), generic }).map((v) => v.id).join());
  assert.equal(new Set(orders).size, 3, 'each shuffle should differ');
  // seen posts are served last
  const seen = new Set(live.slice(0, 50).map((v) => v.id));
  const f = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(9), seen, generic, diversify: false });
  const firstSeen = f.findIndex((v) => seen.has(v.id));
  assert.ok(firstSeen >= live.length - 50, 'all unseen posts come before seen ones');
  // no trend repeats inside a window of 4 across a whole-library feed (when avoidable)
  const d = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(5), generic });
  let clashes = 0;
  for (let i = 4; i < d.length; i++) { const k = core.trendKey(d[i], generic); if (d.slice(i - 4, i).some((x) => core.trendKey(x, generic) === k)) clashes++; }
  assert.ok(clashes <= d.length * 0.01, `trend clashes: ${clashes}`);
});

test('coverage: every target period is well represented, no trend dominates', () => {
  const generic = new Set(meta.vibes.map((v) => v.id));
  const live = vids.filter((v) => v.status !== 'broken');
  for (const [p, min] of [['2020', 150], ['2023-09', 80], ['2023-10', 80], ['2023-11', 70], ['2023-12', 50]]) {
    const inP = live.filter((v) => core.periodMatches(p, v)); assert.ok(inP.length >= min, `${p} has only ${inP.length}`);
    const counts = {}; inP.forEach((v) => { const k = core.trendKey(v, generic); counts[k] = (counts[k] || 0) + 1; });
    const top = Math.max(...Object.values(counts)); assert.ok(top / inP.length <= 0.1, `${p}: one trend is ${Math.round(100 * top / inP.length)}%`);
  }
  for (let m = 1; m <= 12; m++) assert.ok(live.filter((v) => v.month === '2020-' + String(m).padStart(2, '0')).length >= 5, `2020-${m} thin`);
});
