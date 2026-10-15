/* Rewind core: pure logic (no DOM). Loaded in the browser as window.RewindCore
 * and in Node tests via require(). Keep this file free of browser APIs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RewindCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON3 = MONTHS.map((m) => m.slice(0, 3));

  /* Periods: what the user can "be in". Theme is derived from the year. */
  const PERIODS = [
    { id: '2020', label: '2020', long: 'All of 2020', key: '1' },
    { id: '2023-09', label: 'Sep 2023', long: 'September 2023', key: '2' },
    { id: '2023-10', label: 'Oct 2023', long: 'October 2023', key: '3' },
    { id: '2023-11', label: 'Nov 2023', long: 'November 2023', key: '4' },
    { id: '2023-12', label: 'Dec 2023', long: 'December 2023', key: '5' },
    { id: 'fall', label: 'All Fall 2023', long: 'Fall 2023 (Sep–Dec)', key: '6' },
  ];

  const ID_RE = /^\d{18,20}$/;

  /* TikTok video IDs are snowflakes: the top bits are a unix timestamp (seconds). */
  function dateFromId(id) {
    if (!ID_RE.test(String(id))) return null;
    const secs = Number(BigInt(id) >> 32n);
    const d = new Date(secs * 1000);
    if (!(secs > 1.4e9 && secs < 2.5e9)) return null;
    return d.toISOString().slice(0, 10);
  }

  /* Returns {id, creator|null, url} or {error} */
  function parseTikTokUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return { error: 'empty' };
    if (ID_RE.test(raw)) return { id: raw, creator: null };
    let u;
    try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return { error: 'not a URL' }; }
    const host = u.hostname.toLowerCase();
    if (/^(vm|vt)\.tiktok\.com$/.test(host) || (host.endsWith('tiktok.com') && /^\/t\//.test(u.pathname)))
      return { error: 'short link (open it, then paste the full tiktok.com/@name/video/ID URL)' };
    if (!(host === 'tiktok.com' || host.endsWith('.tiktok.com'))) return { error: 'not a tiktok.com URL' };
    let m = u.pathname.match(/^\/@([^/]+)\/video\/(\d{18,20})/);
    if (m) return { id: m[2], creator: decodeURIComponent(m[1]) };
    m = u.pathname.match(/\/(?:player\/v1|embed\/v2|embed)\/(\d{18,20})/);
    if (m) return { id: m[1], creator: null };
    return { error: 'no video ID found in URL' };
  }

  function periodOfDate(date) {
    if (!date) return null;
    if (date.startsWith('2020')) return '2020';
    const m = date.slice(0, 7);
    return ['2023-09', '2023-10', '2023-11', '2023-12'].includes(m) ? m : null;
  }
  const inScope = (date) => periodOfDate(date) !== null;

  function themeOfPeriod(period) {
    if (!period) return 'y2020';
    return period === '2020' || period.startsWith('2020') ? 'y2020' : period === 'all' ? null : 'fall';
  }

  function periodMatches(period, v) {
    if (!period || period === 'all') return true;
    if (period === 'fall') return v.date >= '2023-09-01' && v.date <= '2023-12-31';
    if (period === '2020') return v.year === 2020;
    return v.month === period; /* 'YYYY-MM' */
  }

  function normalizeVideo(raw) {
    const date = raw.date || dateFromId(raw.id);
    const creator = raw.creator && !['archive', 'unknown'].includes(raw.creator) ? raw.creator : null;
    return {
      id: String(raw.id),
      creator,
      title: raw.title || raw.label || 'Untitled post',
      date,
      year: Number(date.slice(0, 4)),
      month: date.slice(0, 7),
      era: periodOfDate(date) === '2020' ? '2020' : 'fall-2023',
      trends: Array.isArray(raw.trends) ? raw.trends.slice() : [],
      sound: raw.sound || null,
      status: ['verified', 'unverified', 'broken'].includes(raw.status) ? raw.status : 'unverified',
      lastChecked: raw.lastChecked || null,
      playback: raw.playback === 'ok' ? 'ok' : null,   // 'ok' only when it genuinely played in a real browser
      playbackChecked: raw.playbackChecked || null,
      provenance: raw.provenance || null,
      imported: !!raw.imported,
      url: tiktokUrl({ id: raw.id, creator }),
    };
  }

  function tiktokUrl(v) {
    return v.creator ? `https://www.tiktok.com/@${encodeURIComponent(v.creator)}/video/${v.id}` : `https://www.tiktok.com/player/v1/${v.id}`;
  }

  /* Library validation. Returns a list of problems (empty = ok). */
  function validateLibrary(videos) {
    const problems = [];
    const seen = new Set();
    for (const v of videos) {
      const tag = `${v.id}`;
      if (!ID_RE.test(String(v.id))) problems.push(`${tag}: bad id`);
      if (seen.has(v.id)) problems.push(`${tag}: duplicate id`);
      seen.add(v.id);
      const decoded = dateFromId(v.id);
      if (!decoded) problems.push(`${tag}: id has no decodable date`);
      else if (v.date && v.date !== decoded) problems.push(`${tag}: date ${v.date} != id date ${decoded}`);
      if (!inScope(v.date || decoded)) problems.push(`${tag}: outside 2020 / Sep–Dec 2023`);
      if (!['verified', 'unverified', 'broken'].includes(v.status)) problems.push(`${tag}: bad status ${v.status}`);
    }
    return problems;
  }

  function matchesQuery(v, q) {
    q = String(q || '').trim().toLowerCase().replace(/^@/, '');
    if (!q) return true;
    const monthName = MONTHS[Number(v.month.slice(5)) - 1].toLowerCase();
    const hay = [v.creator, v.title, v.sound, v.date, monthName, v.year, ...v.trends.map((t) => t.replace(/-/g, ' '))]
      .filter(Boolean).join(' ').toLowerCase();
    return q.split(/\s+/).every((tok) => hay.includes(tok));
  }

  function collectionMatches(col, v) {
    const r = col.rules || {};
    if (r.ids && r.ids.includes(v.id)) return true;
    if (r.creators && v.creator && r.creators.includes(v.creator)) return true;
    if (r.months && !r.months.includes(v.month)) return false;
    if (r.period && !periodMatches(r.period, v)) return false;
    if (r.tagsAny && !r.tagsAny.some((t) => v.trends.includes(t))) return false;
    return !!(r.months || r.tagsAny || r.period);
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* The specific meme/trend a post belongs to: its first tag that is not a generic vibe or editorial label. */
  const EDITORIAL = ['tiktok-top-100'];
  function trendKey(v, generic) {
    const g = generic || new Set();
    return v.trends.find((t) => !g.has(t) && !EDITORIAL.includes(t)) || (v.creator ? '@' + v.creator : v.id);
  }
  /* Reorder so the same trend (window 4) or creator (window 3) doesn't repeat back-to-back when avoidable. */
  function diversify(list, generic) {
    const out = [], rest = list.slice();
    while (rest.length) {
      const tk = new Set(out.slice(-4).map((v) => trendKey(v, generic))), ck = new Set(out.slice(-3).map((v) => v.creator).filter(Boolean));
      let i = rest.findIndex((v) => !tk.has(trendKey(v, generic)) && !(v.creator && ck.has(v.creator)));
      if (i < 0) i = rest.findIndex((v) => !tk.has(trendKey(v, generic)));
      out.push(rest.splice(i < 0 ? 0 : i, 1)[0]);
    }
    return out;
  }

  /* ---- taste model: learns from what the viewer finishes, flicks past, saves and hides ---- */
  const AFF_MAX = 4;
  function affinityKeys(v, generic) {
    const out = v.trends.map((t) => ['t:' + t, generic && generic.has(t) ? 0.8 : 1]);   // a specific trend counts double a broad vibe
    if (v.creator) out.push(['c:' + v.creator, 0.5]);
    if (v.sound) out.push(['s:' + v.sound, 0.8]);
    out.push(['e:' + v.era, 0.3]);
    return out;
  }
  /* How much one viewing says about taste: <0 flicked past or hidden, >0 watched/finished/saved. */
  function viewSignal({ dwellMs = 0, frac = 0, ended = false, favorited = false, hidden = false } = {}) {
    if (hidden) return -3;
    if (favorited) return 3;
    if (dwellMs < 1800) return -0.35;                    // flicked past: a whisper, scrolling is normal
    if (ended || frac >= 0.85) return 1;                 // watched it through (or looped)
    if (frac >= 0.5) return 0.5;
    if (frac >= 0.2) return 0;
    return dwellMs > 8000 ? 0.5 : -0.1;                  // no duration info: long dwell = interest, short = meh
  }
  function updateAffinity(aff, v, signal, generic) {
    const next = {};
    for (const k in aff) { const x = aff[k] * 0.985; if (Math.abs(x) > 0.02) next[k] = x; }   // old tastes fade slowly
    for (const [k, w] of affinityKeys(v, generic)) next[k] = Math.max(-AFF_MAX, Math.min(AFF_MAX, (next[k] || 0) + signal * w));
    return next;
  }
  function scoreVideo(v, aff, generic) { let s = 0; for (const [k] of affinityKeys(v, generic)) s += aff[k] || 0; return s; }
  /* Best-liked first, with noise + exploration so the feed never collapses into one corner, then spaced by trend/creator. */
  function rerank(items, aff, { rng = Math.random, generic, seen, explore = 0.4, strength = 0.5 } = {}) {
    const pool = items.map((v) => ({ v, s: strength * scoreVideo(v, aff, generic) + (rng() - 0.5) * 1.6 - (seen && seen.has(v.id) ? 1.5 : 0) })).sort((a, b) => b.s - a.s).map((x) => x.v);
    const out = [];
    while (pool.length) out.push(pool.splice(rng() < explore ? Math.floor(rng() * pool.length) : 0, 1)[0]);
    return diversify(out, generic);
  }

  /* opts: {period, tags[], collection (object), query, favoritesOnly, favorites:Set, hidden:Set,
   *        broken:Set (device-level), hideUnavailable, shuffle, rng, ids[],
   *        seen:Set (recently watched -> pushed to the back when shuffling), generic:Set (vibe ids, for trend spacing) } */
  function buildFeed(videos, opts = {}) {
    let a = videos.filter((v) => {
      if (opts.hidden && opts.hidden.has(v.id)) return false;
      if (opts.hideUnavailable !== false && (v.status === 'broken' || (opts.broken && opts.broken.has(v.id)))) return false;
      if (opts.ids && !opts.ids.includes(v.id)) return false;
      if (!periodMatches(opts.period, v)) return false;
      if (opts.tags && opts.tags.length && !opts.tags.some((t) => v.trends.includes(t))) return false;
      if (opts.collection && !collectionMatches(opts.collection, v)) return false;
      if (opts.favoritesOnly && !(opts.favorites && opts.favorites.has(v.id))) return false;
      if (opts.query && !matchesQuery(v, opts.query)) return false;
      return true;
    });
    a.sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id));
    if (!opts.shuffle) return a;
    a = shuffled(a, opts.rng);
    if (opts.affinity && Object.keys(opts.affinity).length) return rerank(a, opts.affinity, { rng: opts.rng || Math.random, generic: opts.generic, seen: opts.seen });
    if (opts.seen && opts.seen.size) a = [...a.filter((v) => !opts.seen.has(v.id)), ...a.filter((v) => opts.seen.has(v.id))];
    return opts.diversify === false ? a : diversify(a, opts.generic);
  }

  /* "Similar vibe": shared tags (rarer tags weigh more), same sound, same creator, nearby date. */
  function similar(target, videos, n = 6) {
    const freq = {};
    videos.forEach((v) => v.trends.forEach((t) => (freq[t] = (freq[t] || 0) + 1)));
    const day = (d) => Date.parse(d + 'T00:00:00Z') / 864e5;
    return videos
      .filter((v) => v.id !== target.id && v.status !== 'broken')
      .map((v) => {
        let s = 0;
        for (const t of v.trends) if (target.trends.includes(t)) s += 1 + 2 / Math.sqrt(freq[t]);
        if (target.sound && v.sound === target.sound) s += 3;
        if (target.creator && v.creator === target.creator) s += 1.5;
        if (v.era === target.era) s += 0.5;
        s += Math.max(0, 1 - Math.abs(day(v.date) - day(target.date)) / 45) * 0.8;
        return { v, s };
      })
      .filter((x) => x.s > 1)
      .sort((a, b) => b.s - a.s || a.v.id.localeCompare(b.v.id))
      .slice(0, n)
      .map((x) => x.v);
  }

  /* Playback queue with wrap-around, removal and jump-to-id. */
  class Queue {
    constructor(items = [], startId = null) { this.set(items, startId); }
    set(items, startId = null) {
      this.items = items.slice();
      const i = startId ? this.items.findIndex((v) => v.id === startId) : 0;
      this.index = i >= 0 ? i : 0;
    }
    get current() { return this.items[this.index] || null; }
    get length() { return this.items.length; }
    step(n) { if (!this.items.length) return null; this.index = (this.index + n + this.items.length) % this.items.length; return this.current; }
    next() { return this.step(1); }
    prev() { return this.step(-1); }
    jump(i) { if (!this.items.length) return null; this.index = Math.max(0, Math.min(this.items.length - 1, i)); return this.current; }
    removeCurrent() {
      if (!this.items.length) return null;
      this.items.splice(this.index, 1);
      if (this.index >= this.items.length) this.index = 0;
      return this.current;
    }
    peek(n = 4) { const out = []; for (let k = 1; k <= Math.min(n, this.items.length - 1); k++) out.push(this.items[(this.index + k) % this.items.length]); return out; }
  }

  /* Failure policy. Returns {mark, retry, message}. kind: 'invalid'|'server'|'playback'|'autoplay'|'timeout'|'stall' */
  const ERROR_CODES = { 1001: 'invalid', 2001: 'server', 3001: 'playback', 3002: 'autoplay' };
  function classifyError(code) { return ERROR_CODES[Number(code)] || 'playback'; }
  const FAILURE_COPY = {
    invalid: 'TikTok says this video no longer exists (removed or private).',
    server: 'TikTok’s player had a server error.',
    playback: 'The video couldn’t be played (it may be removed, region-locked or restricted).',
    autoplay: 'Your browser blocked autoplay. Tap play to start.',
    timeout: 'TikTok never answered. The post may be gone, or embeds are blocked on this network.',
    stall: 'Playback stalled for too long.',
  };
  function failurePolicy(kind) {
    return { markBroken: kind === 'invalid', countsAsFailure: kind !== 'autoplay', message: FAILURE_COPY[kind] || FAILURE_COPY.playback };
  }

  function formatDuration(ms) {
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'less than a minute';
    if (m === 1) return '1 minute';
    if (m < 60) return `${m} minutes`;
    const h = Math.floor(m / 60), r = m % 60;
    return `${h} hr${h > 1 ? 's' : ''}${r ? ` ${r} min` : ''}`;
  }
  function formatDate(date) {
    const [y, m, d] = date.split('-').map(Number);
    return `${MON3[m - 1]} ${d}, ${y}`;
  }
  function periodLabel(id) {
    const p = PERIODS.find((x) => x.id === id);
    if (p) return p.long;
    if (id === 'all') return 'Every era';
    const m = /^(\d{4})-(\d{2})$/.exec(id || '');
    return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(id);
  }

  return { MONTHS, MON3, PERIODS, dateFromId, parseTikTokUrl, periodOfDate, inScope, themeOfPeriod, periodMatches, normalizeVideo, tiktokUrl,
    validateLibrary, trendKey, diversify, viewSignal, updateAffinity, scoreVideo, rerank, matchesQuery, collectionMatches, buildFeed, similar, Queue, classifyError, failurePolicy, mulberry32, shuffled, formatDuration, formatDate, periodLabel };
});
