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
  for (const [p, min] of [['2020', 250], ['2023-09', 170], ['2023-10', 180], ['2023-11', 140], ['2023-12', 150]]) {
    const inP = live.filter((v) => v.lang !== 'non-en' && core.periodMatches(p, v)); assert.ok(inP.length >= min, `${p} has only ${inP.length}`);
    const counts = {}; inP.forEach((v) => { const k = core.trendKey(v, generic); counts[k] = (counts[k] || 0) + 1; });
    const top = Math.max(...Object.values(counts)); assert.ok(top / inP.length <= 0.1, `${p}: one trend is ${Math.round(100 * top / inP.length)}%`);
  }
  for (let m = 1; m <= 12; m++) assert.ok(live.filter((v) => v.month === '2020-' + String(m).padStart(2, '0')).length >= 5, `2020-${m} thin`);
});

test('taste: viewSignal reads watching, flicking, saving and hiding', () => {
  assert.ok(core.viewSignal({ dwellMs: 600 }) < 0 && core.viewSignal({ dwellMs: 600 }) > -0.5, 'flicked past is only a whisper');
  assert.ok(core.viewSignal({ dwellMs: 9000, frac: 0.95 }) > 0.9, 'watched through');
  assert.ok(core.viewSignal({ dwellMs: 5000, frac: 0.55 }) > 0, 'watched most');
  assert.equal(core.viewSignal({ favorited: true }), 3); assert.equal(core.viewSignal({ hidden: true }), -3);
});

test('taste: affinity is bounded, decays, and moves trend/creator/sound weights', () => {
  const generic = new Set(meta.vibes.map((v) => v.id)); const v = vids.find((x) => x.sound && x.trends.includes('iconic-sounds'));
  let aff = {}; for (let i = 0; i < 50; i++) aff = core.updateAffinity(aff, v, 3, generic);
  for (const k in aff) assert.ok(Math.abs(aff[k]) <= 6, 'clamped');
  assert.ok(aff['t:iconic-sounds'] > 0 && aff['s:' + v.sound] > 0);
  const other = vids.find((x) => !x.trends.includes('iconic-sounds') && x.creator !== v.creator);
  const before = aff['t:iconic-sounds']; for (let i = 0; i < 200; i++) aff = core.updateAffinity(aff, other, 0.1, generic);
  assert.ok(aff['t:iconic-sounds'] < before / 2, 'old taste fades');
});

test('taste: liked vibes rise to the top, disliked sink, but exploration keeps variety', () => {
  const generic = new Set(meta.vibes.map((v) => v.id)); const live = vids.filter((v) => v.status !== 'broken');
  const share = (list, tag, n = 30) => list.slice(0, n).filter((v) => v.trends.includes(tag)).length / n;
  const base = []; for (let i = 0; i < 20; i++) base.push(share(core.rerank(live, {}, { rng: core.mulberry32(i), generic }), 'dances'));
  const baseAvg = base.reduce((a, b) => a + b) / base.length;
  let aff = {}; const dance = live.find((v) => v.trends.includes('dances'));
  for (let i = 0; i < 6; i++) aff = core.updateAffinity(aff, dance, 1, generic);
  const liked = []; for (let i = 0; i < 20; i++) liked.push(share(core.rerank(live, aff, { rng: core.mulberry32(i), generic }), 'dances'));
  const likedAvg = liked.reduce((a, b) => a + b) / liked.length;
  assert.ok(likedAvg > baseAvg + 0.06, `dances share ${baseAvg.toFixed(2)} -> ${likedAvg.toFixed(2)}`);
  assert.ok(likedAvg < 0.6, 'gentle: never a monoculture');
  // disliking memes pushes them down
  let neg = {}; const meme = live.find((v) => v.trends.includes('memes'));
  for (let i = 0; i < 6; i++) neg = core.updateAffinity(neg, meme, -1, generic);
  const memeBase = share(core.rerank(live, {}, { rng: core.mulberry32(3), generic }), 'memes'), memeNeg = share(core.rerank(live, neg, { rng: core.mulberry32(3), generic }), 'memes');
  assert.ok(memeNeg <= memeBase, 'disliked vibe does not rise');
  // result is a permutation (nothing lost or duplicated)
  const r = core.rerank(live, aff, { rng: core.mulberry32(1), generic }); assert.deepEqual(r.map((v) => v.id).sort(), live.map((v) => v.id).sort());
  // spacing still holds
  let clashes = 0; for (let i = 4; i < r.length; i++) { const k = core.trendKey(r[i], generic); if (r.slice(i - 4, i).some((x) => core.trendKey(x, generic) === k)) clashes++; } assert.ok(clashes <= r.length * 0.02, 'clashes ' + clashes);
});

test('taste: buildFeed uses affinity when given', () => {
  const generic = new Set(meta.vibes.map((v) => v.id)); let aff = {}; const dance = vids.find((v) => v.trends.includes('dances'));
  for (let i = 0; i < 6; i++) aff = core.updateAffinity(aff, dance, 1, generic);
  const f = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(2), generic, affinity: aff });
  assert.equal(new Set(f.map((v) => v.id)).size, f.length);
  assert.ok(f.slice(0, 20).filter((v) => v.trends.includes('dances')).length >= 3);
});

test('language: detects non-English captions, keeps English names and slang', () => {
  const non = ['que lindo este video para todos', '#рекомендации #реки', 'こんにちは', 'mañana de fresa', 'obrigado por tudo você é demais', 'Est-ce que tu viens ce soir', 'ich liebe das nicht', 'yang penting happy', 'Все ясно автору', '#dúo con @x los pingüino me la van a mascar'];
  const ok = ['POV: you finally understand why everyone says this is the vibe', 'he really said that lol', 'Mia Khalifa / bread meme', 'Die Hard Christmas debate', 'Dan and Ben at the mall', 'Wash your strawberries very well! #рекомендации', 'cafe vibes only', 'Tilted Tower Dance'];
  for (const t of non) assert.equal(core.detectLanguage(t), 'non-en', t);
  for (const t of ok) assert.notEqual(core.detectLanguage(t), 'non-en', t);
  assert.equal(core.detectLanguage('#fyp #viral'), 'unknown'); assert.equal(core.detectLanguage(''), 'unknown');
});

test('language: englishOnly drops non-English posts from the feed, nothing else', () => {
  const marked = vids.map((v, i) => (i % 10 === 0 ? { ...v, lang: 'non-en' } : v));
  const all = core.buildFeed(marked, {}), en = core.buildFeed(marked, { englishOnly: true });
  assert.ok(en.length < all.length && en.every((v) => v.lang !== 'non-en'));
  assert.equal(all.length - en.length, marked.filter((v) => v.lang === 'non-en' && v.status !== 'broken').length);
});

test('fall 2023 has real depth in the vibing categories the viewer asked for', () => {
  const fall = vids.filter((v) => v.status !== 'broken' && v.lang !== 'non-en' && v.date >= '2023-09-01');
  const n = (t) => fall.filter((v) => v.trends.includes(t)).length;
  assert.ok(fall.length >= 700, 'fall total ' + fall.length); assert.ok(n('iconic-sounds') >= 40 && n('pop-songs') >= 30 && n('rizz') >= 30 && n('cozy') >= 30 && n('ecstasy') >= 4, JSON.stringify({ s: n('iconic-sounds'), p: n('pop-songs'), r: n('rizz'), c: n('cozy'), e: n('ecstasy') }));
});

test('feed: a long viewing session never repeats a post until the pool is used up', () => {
  const pool = vids.filter((v) => v.status !== 'broken' && v.lang !== 'non-en' && core.periodMatches('fall', v)); const seen = new Set(), shown = [];
  for (let round = 0; round < 3; round++) {
    const feed = core.buildFeed(vids, { period: 'fall', shuffle: true, rng: core.mulberry32(round + 1), seen, englishOnly: true, generic: new Set(meta.vibes.map((x) => x.id)) });
    for (const v of feed.slice(0, 200)) { assert.ok(!seen.has(v.id), 'repeat after ' + shown.length + ' videos'); seen.add(v.id); shown.push(v.id); }
  }
  assert.equal(new Set(shown).size, shown.length); assert.ok(shown.length === Math.min(600, shown.length) && pool.length > 600);
});

test('no repeats even when the viewer strongly likes what they already saw', () => {
  const generic = new Set(meta.vibes.map((x) => x.id)); const pool = vids.filter((v) => v.status !== 'broken' && v.lang !== 'non-en');
  const liked = pool.filter((v) => v.trends.includes('dances')).slice(0, 25); const seen = new Set(liked.map((v) => v.id));
  const aff = { 't:dances': 6, 't:iconic-sounds': 6, 't:pop-songs': 6 };   // maximal taste for exactly what was already shown
  for (let i = 0; i < 20; i++) {
    const feed = core.buildFeed(vids, { shuffle: true, rng: core.mulberry32(i + 7), seen, englishOnly: true, generic, affinity: aff });
    const firstSeen = feed.findIndex((v) => seen.has(v.id)); assert.ok(firstSeen === -1 || firstSeen >= feed.length - seen.size, 'a seen post jumped the queue (seed ' + i + ')');
    const re = core.rerank(feed.slice(0, 60), aff, { rng: core.mulberry32(i), generic, seen }); assert.deepEqual(re.map((v) => v.id).sort(), feed.slice(0, 60).map((v) => v.id).sort());
  }
});
