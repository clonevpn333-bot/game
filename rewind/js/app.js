/* Rewind app: feed state, playback handling, UI wiring. Pure logic lives in core.js, persistence in store.js. */
(function () {
  'use strict';
  const C = window.RewindCore, S = window.RewindStore, D = window.REWIND_DATA;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n) => `<svg viewBox="0 0 24 24"><use href="#i-${n}"/></svg>`;
  const vibeLabel = Object.fromEntries(D.vibes.map((v) => [v.id, v.label]));
  const MAX_FAILS = 4, MAX_TIMEOUTS = 3;
  const GENERIC = new Set(D.vibes.map((v) => v.id));
  /* A gentle head start toward "vibing" content (sounds, songs, cozy/fall mood, dances). Learned taste adds on top of it. */
  const PRIOR = { 't:iconic-sounds': 1.6, 't:pop-songs': 1.6, 't:cozy': 1.3, 't:fall-vibe': 1.3, 't:aesthetic': 1.1, 't:dances': 1.0, 't:rizz': 0.8, 't:ecstasy': 1.4 };
  const tasteWithPrior = () => { const t = { ...PRIOR }; for (const [k, x] of Object.entries(S.taste())) t[k] = (t[k] || 0) + x; return t; };
  /* iOS only allows sound / play while handling a fresh tap. Programmatic unmute outside a gesture makes it PAUSE the video. */
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const recentGesture = (ms = 1200) => Date.now() - (state.lastGesture || 0) < ms;

  /* ---------------- state ---------------- */
  const state = {
    period: 'fall', tags: [], collection: null, mood: null, query: '', favoritesOnly: false, override: null /* {ids,title} */,
    view: { id: null, start: 0, frac: 0, ended: false }, failures: 0, timeouts: 0, blocked: false, muted: false, userMuted: false, soundOn: false, activated: false, lastGesture: 0, lastNav: 0, dir: 1,
  };
  const queue = new C.Queue([]);
  let library = [];
  let settings = S.settings();
  let skipTimer = null, skelTimer = null, skelTimer2 = null, toastTimer = null, tapTimer = null;

  function loadLibrary() {
    const seen = new Set();
    library = [...D.videos, ...S.imported()].map(C.normalizeVideo).filter((v) => !seen.has(v.id) && seen.add(v.id));
  }
  const brokenIds = () => new Set(Object.entries(S.health()).filter(([, h]) => h.state === 'broken' && h.kind === 'invalid').map(([id]) => id));
  const okHere = (id) => (S.health()[id] || {}).state === 'ok';
  const playable = (v) => v.status !== 'broken' && !brokenIds().has(v.id) && !S.hidden().has(v.id);

  /* ---------------- atmosphere / theme ---------------- */
  const atmo = new window.Atmosphere($('atmo'));
  const ambience = new window.Ambience();
  const osReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => (settings.reduceMotion == null ? osReduce.matches : settings.reduceMotion);

  function applySettings() {
    settings = S.settings();
    const r = reduced();
    document.body.classList.toggle('reduce-motion', r);
    const root = document.documentElement.style;
    root.setProperty('--nostalgia', settings.intensity / 100);
    root.setProperty('--bg-blur', (settings.blur / 100) * 14 + 'px');
    root.setProperty('--depth', settings.depth / 100);
    atmo.configure({ intensity: settings.intensity, depth: settings.depth, reduceMotion: r });
    $('actShuffle').classList.toggle('accent', settings.shuffle);
    $('actShuffle').setAttribute('aria-pressed', settings.shuffle);
  }
  osReduce.addEventListener?.('change', applySettings);

  function effectivePeriod(v) { return state.period === 'all' ? (v ? v.month : '2020') : state.period; }
  function applyTheme(v) {
    const p = effectivePeriod(v);
    const theme = C.themeOfPeriod(p) || 'y2020';
    const variant = theme === 'fall' ? (/^2023-\d\d$/.test(p) ? p : v && v.year === 2023 ? v.month : 'fall') : '2020';
    document.body.dataset.theme = theme;
    document.body.dataset.period = variant;
    atmo.setScene(theme, theme === 'fall' ? variant : null);
    ambience.setScene(theme);
  }

  /* ---------------- feed ---------------- */
  function feedOpts() {
    return { period: state.period, tags: state.tags, collection: state.collection, query: state.query, favoritesOnly: state.favoritesOnly,
      favorites: S.favorites(), hidden: S.hidden(), broken: brokenIds(), hideUnavailable: settings.hideUnavailable, englishOnly: settings.englishOnly, shuffle: settings.shuffle,
      seen: S.seen(), generic: GENERIC, affinity: settings.adapt ? tasteWithPrior() : { ...PRIOR } };
  }
  /* If every post that matches the current filters has been seen, forget (all but the last 40) so the feed can continue. */
  function resetSeenIfExhausted() {
    const seen = S.seen(), pool = C.buildFeed(library, { ...feedOpts(), shuffle: false });
    if (pool.length && pool.every((v) => seen.has(v.id))) { const keep = [...seen].slice(-40); S.clearSeen(); keep.forEach((id) => S.markSeen(id)); dbg('seen everything: starting over'); }
  }
  function rebuildFeed(startId = null, dir = 1) {
    if (state.override) {
      const byId = new Map(library.map((v) => [v.id, v]));
      queue.set(state.override.ids.map((id) => byId.get(id)).filter((v) => v && playable(v)), startId);
    } else {
      queue.set(C.buildFeed(library, feedOpts()), startId);
    }
    present(dir);
  }
  function clearContext() { state.collection = null; state.mood = null; state.query = ''; state.favoritesOnly = false; state.override = null; }
  function setPeriod(p, { startId = null, keepTags = false } = {}) {
    clearContext(); state.period = p; if (!keepTags) state.tags = []; S.setLastPeriod(p); closeMenu(); resetFailures();
    rebuildFeed(startId);
  }
  function setCollection(id) {
    const col = D.collections.find((c) => c.id === id); if (!col) return;
    clearContext(); state.collection = col; state.period = 'all'; state.tags = []; closeMenu(); resetFailures(); rebuildFeed();
  }
  function setMood(id) {
    const m = D.moods.find((x) => x.id === id); if (!m) return;
    clearContext(); state.mood = m; state.period = m.period; state.tags = m.tagsAny.slice();
    S.setSettings({ shuffle: m.shuffle, intensity: m.intensity }); applySettings(); closeMenu(); resetFailures(); rebuildFeed();
    toast(`${m.name} — ${m.blurb}`);
  }
  function toggleTag(t) {
    state.tags = state.tags.includes(t) ? state.tags.filter((x) => x !== t) : [...state.tags, t]; state.mood = null; rebuildFeed(queue.current && state.tags.length === 0 ? queue.current.id : null);
  }
  function showFavorites() { clearContext(); state.favoritesOnly = true; state.period = 'all'; state.tags = []; closeMenu(); rebuildFeed(); }
  function playOverride(ids, title, startId = null) { clearContext(); state.override = { ids, title }; state.period = 'all'; state.tags = []; closeMenu(); closeModal(); rebuildFeed(startId); }

  /* On-screen event log: open the page with ?debug=1 (for diagnosing device-specific behaviour). */
  let DEBUG = qs.has('debug') && !sessionStorage.getItem('rewind.nodebug'); const dlog = [];
  function dbg(msg) {
    if (!DEBUG) return; dlog.push(((performance.now() / 1000) | 0) + 's ' + msg); if (dlog.length > 14) dlog.shift();
    let el = document.getElementById('dbg'); if (!el) { el = document.createElement('pre'); el.id = 'dbg'; el.style.cssText = 'position:fixed;left:6px;right:6px;top:60px;z-index:99;max-height:40vh;overflow:hidden;margin:0;padding:8px;font:10px/1.35 ui-monospace,Menlo,monospace;color:#9fffb0;background:rgba(0,0,0,.72);border-radius:8px;white-space:pre-wrap'; el.title = 'tap to hide'; el.onclick = () => { DEBUG = false; try { sessionStorage.setItem('rewind.nodebug', '1'); } catch (e) {} el.remove(); }; document.body.appendChild(el); }
    el.textContent = dlog.join('\n');
  }
  /* ---- learn from what is viewed / skipped, and adapt the videos still to come ---- */
  function learn(v, signal) {
    if (!settings.adapt || !v) return;
    S.setTaste(C.updateAffinity(S.taste(), v, signal, GENERIC)); dbg(`taste ${signal > 0 ? '+' : ''}${signal} ${v.id.slice(-5)}`);
  }
  function recordView() {
    const v = queue.current, w = state.view; if (!v || w.id !== v.id || !w.start) return;     // never actually played: no signal
    learn(v, C.viewSignal({ dwellMs: performance.now() - w.start, frac: w.frac, ended: w.ended }));
  }
  /* Gentle by design: the next LOOKAHEAD videos are never touched (so scrolling never reshuffles what is coming), and the
   * rest is only re-ranked every ADAPT_EVERY videos (or right away after a save/hide), at half strength with lots of exploration. */
  const LOOKAHEAD = 4, ADAPT_EVERY = 8;
  function adaptQueue(force = false) {
    if (!settings.adapt || !settings.shuffle || state.override || state.favoritesOnly || !queue.length) return;
    state.sinceAdapt = (state.sinceAdapt || 0) + 1;
    if (!force && state.sinceAdapt < ADAPT_EVERY) return;
    const cut = queue.index + 1 + LOOKAHEAD, head = queue.items.slice(0, cut), tail = queue.items.slice(cut); if (tail.length < 6) return;
    state.sinceAdapt = 0; queue.items = [...head, ...C.rerank(tail, tasteWithPrior(), { generic: GENERIC, seen: S.seen() })]; dbg('feed gently re-ranked');
  }
  const go = (n, why = 'user') => {
    if (!queue.length) return;
    /* One physical swipe must move exactly one video: ignore repeat triggers (duplicate touch/pointer/wheel events). */
    if (why === 'user' && Date.now() - state.lastNav < 450) { dbg('nav ignored (too soon)'); return; }
    clearTimeout(skipTimer); $('skipbar').hidden = true;
    recordView();
    /* End of the feed: never loop back to what you just watched. Build a fresh order (unseen first) instead. */
    if (n > 0 && queue.index >= queue.length - 1 && settings.shuffle && !state.override) { dbg('end of feed: fresh shuffle'); state.lastNav = Date.now(); state.dir = 1; resetSeenIfExhausted(); rebuildFeed(null, 1); return; }
    state.dir = n >= 0 ? 1 : -1; state.lastNav = Date.now(); queue.step(n); adaptQueue(); dbg(`go ${n} (${why}) -> ${queue.current && queue.current.id.slice(-5)}`); present(state.dir);
  };
  const next = () => go(1), prev = () => go(-1);

  /* ---------------- player ---------------- */
  const player = new window.TikTokPlayer($('playerHost'), {
    onReady: () => { $('skTitle').textContent = 'Connected'; hideSkeleton(); if (state.userMuted) player.mute(); else if (state.soundOn) { if (!IOS) player.unmute(); else if (qs.has('iossound')) iosTryUnmute(); } },   // iOS: never touch sound on its own (pauses the video); ?iossound re-enables the experimental probe
    onPlaying: (v) => { state.failures = 0; state.timeouts = 0; hideStates(); S.recordHealth(v.id, { state: 'ok' }); S.markSeen(v.id); state.playingSince = performance.now(); if (state.view.id === v.id && !state.view.start) state.view.start = state.playingSince; dbg('playing ' + v.id.slice(-5)); setStatusDot(v); syncSound(); if (state.soundOn && !state.userMuted) wantSound(); schedulePreload(); },
    onPaused: () => {
      /* iOS pauses a video it dislikes (e.g. after an unmute attempt). Resume it muted, but never fight a pause the viewer chose. */
      if (!IOS || !queue.current) return;
      const userPaused = Date.now() - (state.userPausedAt || 0) < 6000, early = performance.now() - (state.presentedAt || 0) < 7000;
      if (userPaused || !early || Date.now() < (state.iosProbeUntil || 0)) return;   // a sound probe is running: it decides what to do
      if ((state.pauseFix = (state.pauseFix || 0) + 1) <= 2) { dbg('iOS paused it, resuming (muted) #' + state.pauseFix); player.play(); }
      else { dbg('iOS keeps pausing: asking for a tap'); $('stTap').hidden = false; }
    },
    onTime: (t) => { if (t && t.duration > 0 && state.view.id) state.view.frac = Math.max(state.view.frac, t.currentTime / t.duration); },
    onEnded: (v) => {
      /* A genuine end comes after the clip has actually played. An "ended" within 2.5 s of starting is spurious
       * (e.g. a preloaded player reporting its state): restart instead of skipping the video. */
      const played = performance.now() - (state.playingSince || 0); dbg(`ended after ${Math.round(played)}ms`);
      if (played < 2500) { player.play(); return; }
      state.view.ended = true;
      if (settings.autoplayNext) go(1, 'autoplay-next');
    },
    onNeedsTap: () => { hideSkeleton(); $('stTap').hidden = false; },
    onFail: (kind, code, v) => { dbg(`FAIL ${kind} ${code ?? ''} ${v && v.id.slice(-5)}`); handleFailure(kind, code, v); },
    onPreloadFail: (v, kind) => preloadFailed(v, kind),
    onMute: (m) => { state.muted = m; syncSound(); if (m && state.soundOn && !state.userMuted) wantSound(); },
  }, { readyTimeout: Number(qs.get('readyTimeout')) || 0, startTimeout: Number(qs.get('startTimeout')) || 0, stallTimeout: Number(qs.get('stallTimeout')) || 0 });

  /* TikTok starts muted until the browser allows sound: make that obvious and one tap to fix. */
  function syncSound() {
    const m = player.muted; state.muted = m;
    $('actMute').innerHTML = icon(m ? 'mute' : 'vol');
    $('actMute').classList.toggle('on', m && state.userMuted); $('actMute').classList.toggle('pulse', m && !state.userMuted);
    $('soundHint').hidden = !(m && !state.userMuted && player.state === 'playing');
  }
  /* iOS: sound can only be switched on by a tap, but a tap in OUR page might count (it did for the sound button).
   * So make exactly ONE attempt, inside the swipe's own tap, then check whether iOS paused the video. If it did, put it
   * back muted, remember that this iPhone refuses, and never try again (no repeated blips). */
  function iosTryUnmute() {
    if (!IOS || state.userMuted || !state.soundOn || S.iosSound() === 'blocked' || !recentGesture(1500)) return;
    const id = queue.current && queue.current.id; state.iosProbeUntil = Date.now() + 1700; player.unmute(); dbg('iOS: one unmute attempt inside the swipe');
    setTimeout(() => {
      if (!queue.current || queue.current.id !== id) return;
      if (player.state === 'paused' && Date.now() - (state.userPausedAt || 0) > 3000) {
        S.setIosSound('blocked'); state.soundOn = false; player.mute(); player.play(); dbg('iOS refused sound: remembered');
        toast('iPhone blocks automatic sound. Tap the speaker on the video when you want it');
      } else if (player.state === 'playing' && !player.muted) { S.setIosSound('ok'); dbg('iOS accepted sound'); }
    }, 1400);
  }

  /* TikTok re-mutes every fresh player right after it loads, which overrides an early unmute. Once the viewer has turned sound
   * on, keep asking (a few tries over the first seconds of each video) until the player stops reporting muted. */
  let soundTries = 0, soundT = null;
  function wantSound() {
    if (!state.soundOn || state.userMuted) return;
    if (IOS) return;   // iOS pauses the video when sound is switched on without a tap inside the player; never do it automatically
    if (soundTries >= 4) return; soundTries++; clearTimeout(soundT);
    player.unmute(); dbg('re-asserting sound #' + soundTries);
    soundT = setTimeout(() => { if (player.muted && state.soundOn && !state.userMuted) wantSound(); }, 700);
  }
  function setMuted(m) {
    state.userMuted = m; state.activated = true; if (!m) { state.soundOn = true; soundTries = 0; } m ? player.mute() : player.unmute(); syncSound();
    if (IOS && !m) { const id = queue.current && queue.current.id; setTimeout(() => {   // if iOS refused (it pauses the clip), put it back muted, remember, explain
      if (queue.current && queue.current.id === id && player.state === 'paused' && Date.now() - (state.userPausedAt || 0) > 2500) { S.setIosSound('blocked'); state.soundOn = false; player.mute(); player.play(); toast('iPhone only allows sound when you tap the speaker on the video itself'); }
    }, 1500); }
  }
  function hideStates() { $('stSkeleton').hidden = true; $('stTap').hidden = true; $('stPanel').hidden = true; clearTimeout(skelTimer); clearTimeout(skelTimer2); }
  function hideSkeleton() { $('stSkeleton').hidden = true; clearTimeout(skelTimer); clearTimeout(skelTimer2); }
  function resetFailures() { state.failures = 0; state.timeouts = 0; state.blocked = false; }

  function showSkeleton(v) {
    hideStates();
    $('skTitle').textContent = `Tuning in to ${C.MON3[Number(v.month.slice(5)) - 1]} ${v.year}…`;
    $('skSub').textContent = 'Waiting for TikTok’s player';
    $('skSkip').hidden = true; $('stSkeleton').hidden = false;
    const slow = player.slow || !player.warm;
    clearTimeout(skelTimer2);
    skelTimer = setTimeout(() => { $('skSub').textContent = slow ? 'Slow connection — still tuning in…' : 'Taking a while…'; $('skSkip').hidden = false; }, Math.min(5000, player.readyTimeout * 0.4));
    skelTimer2 = setTimeout(() => { $('skSub').textContent = 'Still nothing — it may be gone. Skip, or keep waiting.'; }, Math.min(14000, player.readyTimeout * 0.8));
  }

  function handleFailure(kind, code, v) {
    const pol = C.failurePolicy(kind);
    S.recordHealth(v.id, { state: pol.markBroken ? 'broken' : kind === 'timeout' ? 'timeout' : 'error', kind, code: code ?? null });
    if (pol.countsAsFailure) { state.failures++; if (kind === 'timeout') state.timeouts++; else state.timeouts = 0; }
    setStatusDot(v); hideStates();
    if (state.timeouts >= MAX_TIMEOUTS || state.failures >= MAX_FAILS) { state.blocked = true; showBlocked(); return; }
    if (settings.autoSkip && queue.length > 1) {
      const msg = kind === 'invalid' ? 'This post is gone — skipping' : kind === 'timeout' ? 'No response from TikTok — skipping' : 'Couldn’t play this one — skipping';
      $('skipText').textContent = msg; $('skipbar').hidden = false;
      clearTimeout(skipTimer); skipTimer = setTimeout(() => { $('skipbar').hidden = true; skipCurrent(kind === 'invalid'); }, 1800);
    } else showErrorPanel(kind, v);
  }
  /* Preload the next video once the current one is playing (so the two never fight for bandwidth). */
  let preloadT = null;
  function schedulePreload() {
    clearTimeout(preloadT);
    const c = navigator.connection; if (c && c.saveData) return;
    /* On iOS the preload is what makes sound and instant play possible: the next video is already loaded, so it can be
     * unmuted and played inside the swipe's own tap. ?nopreload switches it off (for diagnosing). */
    if (qs.has('nopreload')) return;
    preloadT = setTimeout(() => { const n = queue.peek(1)[0]; if (n && playable(n)) player.preload(n, { loop: !settings.autoplayNext }); }, 900);
  }
  /* A preloaded video turned out to be gone: drop it from the feed before the user ever reaches it. */
  function preloadFailed(v, kind) {
    if (kind !== 'invalid') return schedulePreload();
    S.recordHealth(v.id, { state: 'broken', kind: 'invalid', code: 1001 });
    const i = queue.items.findIndex((x) => x.id === v.id);
    if (i >= 0 && i !== queue.index) { queue.items.splice(i, 1); if (i < queue.index) queue.index--; }
    renderSide(); schedulePreload();
  }
  function skipCurrent(remove) { if (remove && settings.hideUnavailable) { queue.removeCurrent(); present(1); } else go(1, 'skip'); }

  function panel(html) { $('stPanel').innerHTML = html; $('stPanel').hidden = false; $('stSkeleton').hidden = true; $('stTap').hidden = true; }
  function showErrorPanel(kind, v) {
    const copy = { invalid: ['This post is gone', '👻'], timeout: ['TikTok didn’t answer', '⏳'], autoplay: ['Tap to play', '▶'] }[kind] || ['Couldn’t play this one', '⚠'];
    panel(`<div class="glyph">${copy[1]}</div><p class="state-title">${copy[0]}</p><p class="state-sub">${esc(C.failurePolicy(kind).message)}</p>
      <div class="row"><button class="btn" data-act="skip">Skip</button><button class="btn ghost" data-act="retry">Retry</button><a class="btn ghost" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Open on TikTok</a></div>`);
  }
  function showBlocked() {
    const v = queue.current;
    panel(`<div class="glyph">📡</div><p class="state-title">TikTok isn’t responding</p>
      <p class="state-sub">Several videos in a row failed, so auto-skip paused instead of looping forever.</p>
      <ul><li>Slow connection? Give it another go — the first video takes the longest.</li><li>Is tiktok.com reachable from here?</li><li>Ad/tracker blockers can block TikTok embeds.</li><li>Running from a file? Try <code>npm start</code> and open localhost.</li><li>Some posts are removed or region-locked.</li></ul>
      <div class="row"><button class="btn" data-act="retryall">Try again</button>${v ? `<a class="btn ghost" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Open on TikTok</a>` : ''}<button class="btn ghost" data-act="skip">Skip</button></div>`);
  }
  function showEmpty() {
    player.destroyFrame(); hideStates(); $('meta').hidden = true; $('actions').hidden = true; $('shield').hidden = true;
    let title = 'Nothing here yet', sub = 'No posts match this selection.';
    if (state.favoritesOnly) { title = 'No favorites yet'; sub = 'Tap the heart (or press F) on anything that hits you right in the feelings.'; }
    else if (state.query) { title = 'No matches'; sub = `Nothing for “${state.query}”.`; }
    else if (/^\d{4}-\d\d$/.test(state.period) || state.period === '2020') { title = `${C.periodLabel(state.period)} is empty so far`; sub = 'The archive only holds real posts we have links for. Add some, or jump to another month.'; }
    panel(`<div class="glyph">🫥</div><p class="state-title">${esc(title)}</p><p class="state-sub">${esc(sub)}</p>
      <div class="row"><button class="btn" data-act="reset">Show everything</button><button class="btn ghost" data-act="transport">Transport me</button><button class="btn ghost" data-open="add">Add a video</button></div>`);
  }

  function setStatusDot(v) {
    const h = S.health()[v.id] || {}; const el = $('metaStatus');
    const ok = h.state === 'ok', bad = h.state === 'broken';
    el.className = 'status-dot' + (ok ? ' ok' : bad ? ' bad' : '');
    el.title = ok ? 'Played fine in this browser' : bad ? 'TikTok reports this post as unavailable' : v.status === 'verified' ? 'Verified to exist (link check)' : 'Not verified yet — date checked from its ID only';
  }

  /* ---------------- present current video ---------------- */
  function present(dir = 1) {
    const v = queue.current; if (v) S.markSeen(v.id); $('soundHint').hidden = true; soundTries = 0; state.presentedAt = performance.now(); state.pauseFix = 0; state.view = { id: v ? v.id : null, start: 0, frac: 0, ended: false };
    renderAll();
    if (!v) { applyTheme(null); showEmpty(); return; }
    $('meta').hidden = false; $('actions').hidden = false; $('shield').hidden = false;
    applyTheme(v);
    const fi = $('frameInner'); fi.classList.remove('enter-up', 'enter-down'); void fi.offsetWidth; fi.classList.add(dir < 0 ? 'enter-down' : 'enter-up');
    renderMeta(v); showSkeleton(v);
    $('actOpen').href = v.url;
    player.load(v, { autoplay: true, loop: !settings.autoplayNext });
    try { history.replaceState(null, '', '#v=' + v.id); } catch { /* file:// */ }
    document.title = `${C.formatDate(v.date)} · rewind.`;
  }
  function renderMeta(v) {
    $('metaEra').textContent = v.year === 2020 ? '2020' : 'Fall 2023';
    $('metaDate').textContent = C.formatDate(v.date);
    const mm = $('meta'); mm.classList.remove('flash'); void mm.offsetWidth; mm.classList.add('flash');
    $('metaCreator').textContent = v.creator ? '@' + v.creator : 'Original creator unknown';
    $('metaTitle').textContent = v.title;
    const tags = v.trends.filter((t) => vibeLabel[t]).slice(0, 2).map((t) => `<span class="tag">${esc(vibeLabel[t])}</span>`);
    if (v.sound) tags.unshift(`<span class="tag sound">♪ ${esc(v.sound)}</span>`);
    $('metaTags').innerHTML = tags.join('');
    const fav = S.favorites().has(v.id);
    $('actFav').classList.toggle('on', fav); $('actFav').setAttribute('aria-pressed', fav);
    setStatusDot(v);
  }

  /* ---------------- rendering ---------------- */
  const monthCounts = () => { const m = {}; library.filter(playable).forEach((v) => (m[v.month] = (m[v.month] || 0) + 1)); return m; };
  function renderAll() { renderRail(); renderTitle(); renderChips(); renderTimeline(); renderSide(); }

  function renderRail() {
    const mc = monthCounts(); const sum = (f) => Object.entries(mc).filter(([k]) => f(k)).reduce((a, [, n]) => a + n, 0);
    const cnt = (id) => id === '2020' ? sum((k) => k.startsWith('2020')) : id === 'fall' ? sum((k) => k.startsWith('2023')) : mc[id] || 0;
    const noCtx = !state.collection && !state.mood && !state.favoritesOnly && !state.query && !state.override;
    $('eraList').innerHTML = C.PERIODS.map((p) => {
      const on = noCtx && (state.period === p.id || (p.id === '2020' && state.period.startsWith('2020')));
      return `<button type="button" class="item${on ? ' on' : ''}${cnt(p.id) ? '' : ' empty'}" data-period="${p.id}"><span class="dot"></span><span class="t">${esc(p.label)}</span><span class="count">${cnt(p.id)}</span></button>`;
    }).join('');
    $('moodList').innerHTML = D.moods.map((m) => `<button type="button" class="item${state.mood && state.mood.id === m.id ? ' on' : ''}" data-mood="${m.id}"><span class="dot"></span><span><span class="t">${esc(m.name)}</span><span class="sub">${esc(m.blurb)}</span></span></button>`).join('');
    $('collList').innerHTML = D.collections.map((c) => {
      const n = C.buildFeed(library, { collection: c, hidden: S.hidden(), broken: brokenIds() }).length;
      return `<button type="button" class="item${state.collection && state.collection.id === c.id ? ' on' : ''}${n ? '' : ' empty'}" data-coll="${c.id}"><span class="dot"></span><span><span class="t">${esc(c.name)}</span><span class="sub">${esc(c.blurb)}</span></span><span class="count">${n}</span></button>`;
    }).join('');
    $('favCount').textContent = S.favorites().size;
    $('btnFavs').classList.toggle('on', state.favoritesOnly);
  }

  function titleParts() {
    if (state.override) return [`${esc(state.override.title)}`, ''];
    if (state.favoritesOnly) return ['Your <em>favorites</em>', 'saved on this device'];
    if (state.query) return [`Results for <em>“${esc(state.query)}”</em>`, ''];
    if (state.collection) return [`<em>${esc(state.collection.name)}</em>`, esc(state.collection.blurb)];
    if (state.mood) return [`<em>${esc(state.mood.name)}</em>`, esc(state.mood.blurb)];
    const p = state.period;
    if (p === '2020') return ['Hello, <em>2020.</em>', 'bedroom LEDs & quarantine energy'];
    if (p === 'fall') return ['Fall <em>2023</em>', 'September through December'];
    if (p === 'all') return ['Every <em>era</em>', ''];
    const [y, m] = p.split('-'); return [`<em>${C.MONTHS[Number(m) - 1]}</em> ${y}`, y === '2020' ? 'quarantine year' : 'fall 2023'];
  }
  function renderTitle() { const [t, s] = titleParts(); $('eraTitle').innerHTML = t + (s ? `<small>${s}</small>` : ''); }

  function renderChips() {
    const scope = library.filter((v) => playable(v) && C.periodMatches(state.collection ? 'all' : state.period, v));
    const used = new Set(scope.flatMap((v) => v.trends));
    const ctx = [];
    if (state.collection) ctx.push(['collection', state.collection.name]);
    if (state.favoritesOnly) ctx.push(['favorites', 'Favorites']);
    if (state.query) ctx.push(['query', `“${state.query}”`]);
    if (state.override) ctx.push(['override', state.override.title]);
    $('chips').innerHTML = ctx.map(([k, l]) => `<button type="button" class="chip ctx" data-clear="${k}" title="Clear">${esc(l)} ✕</button>`).join('')
      + `<button type="button" class="chip${state.tags.length ? '' : ' on'}" data-tag="">All vibes</button>`
      + D.vibes.filter((v) => used.has(v.id) || state.tags.includes(v.id)).map((v) => `<button type="button" class="chip${state.tags.includes(v.id) ? ' on' : ''}" data-tag="${v.id}">${esc(v.label)}</button>`).join('');
  }

  function renderTimeline() {
    const mc = monthCounts(); const max = Math.max(1, ...Object.values(mc));
    const cell = (id, lab) => { const n = mc[id] || 0; const on = state.override || state.favoritesOnly || state.query ? false : C.periodMatches(state.period, { date: id + '-15', year: Number(id.slice(0, 4)), month: id });
      return `<button type="button" class="tl-cell${n ? ' has' : ' none'}${on ? ' on' : ''}" style="--fill:${(0.25 + 0.75 * n / max).toFixed(2)}" data-period="${id}" title="${C.periodLabel(id)} · ${n} post${n === 1 ? '' : 's'}" aria-label="${C.periodLabel(id)}, ${n} posts">${lab}</button>`; };
    const m2020 = C.MON3.map((m, i) => cell('2020-' + String(i + 1).padStart(2, '0'), m.slice(0, 3)));
    const m2023 = ['09', '10', '11', '12'].map((m) => cell('2023-' + m, C.MON3[Number(m) - 1]));
    $('timeline').innerHTML = `<div class="tl-group"><span class="tl-label">2020</span><div class="tl-cells">${m2020.join('')}</div></div><span class="tl-gap">· · ·</span><div class="tl-group"><span class="tl-label">2023</span><div class="tl-cells">${m2023.join('')}</div></div>`;
  }

  function renderSide() {
    const v = queue.current; const p = effectivePeriod(v);
    const label = C.periodLabel(p);
    $('nowBig').innerHTML = label.replace(/(\d{4})/, '<em>$1</em>');
    $('nowSub').textContent = `${queue.length} post${queue.length === 1 ? '' : 's'} in this feed`;
    updateSession();
    $('posText').textContent = queue.length ? `${queue.index + 1} / ${queue.length}` : '';
    const sc = $('scrub'); sc.max = Math.max(1, queue.length); sc.value = queue.index + 1; sc.disabled = queue.length < 2;
    const row = (x, i, list) => `<button type="button" class="vrow" data-play="${x.id}" data-list="${list}"><span class="vi">${String(x.month.slice(5))}</span><span><span class="vt">${esc(x.title)}</span><span class="vs">${x.creator ? '@' + esc(x.creator) + ' · ' : ''}${C.formatDate(x.date)}</span></span></button>`;
    const sim = v ? C.similar(v, library.filter(playable), 4) : [];
    $('similarList').innerHTML = sim.length ? sim.map((x, i) => row(x, i, 'sim')).join('') : '<p class="empty-note">Nothing similar yet.</p>';
    const nx = queue.peek(4);
    $('nextList').innerHTML = nx.length ? nx.map((x, i) => row(x, i, 'next')).join('') : '<p class="empty-note">That’s everything here.</p>';
  }
  function updateSession() {
    const v = queue.current; const p = effectivePeriod(v); const ms = S.sessionMs()[p] || 0;
    const t = `You’ve been in <b>${esc(C.periodLabel(p))}</b> for ${C.formatDuration(ms)}`;
    $('sessionBig').innerHTML = t; $('sessionLine').textContent = t.replace(/<[^>]+>/g, '');
  }
  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now(), dt = now - lastTick; lastTick = now;
    if (document.hidden || dt > 60000) return;
    S.addSessionMs(effectivePeriod(queue.current), dt); updateSession();
  }, 15000);

  /* ---------------- actions ---------------- */
  function toast(msg, action) {
    const t = $('toast'); t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
    if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); action.fn(); };
    t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2800);
  }
  function toggleFav(burst) {
    const v = queue.current; if (!v) return;
    const on = S.toggleFavorite(v.id); renderMeta(v); renderRail();
    if (on) { learn(v, 3); adaptQueue(true); }
    if (on && burst) { const b = $('burst'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
    if (on) toast('Saved to favorites', { label: 'More like this', fn: () => playSimilar(v) });
    else { toast('Removed from favorites'); if (state.favoritesOnly) rebuildFeed(); }
  }
  function playSimilar(v) {
    const sim = C.similar(v, library.filter(playable), 20);
    if (!sim.length) return toast('Nothing similar in the archive yet');
    playOverride([v.id, ...sim.map((x) => x.id)], 'More like this', v.id);
  }
  function toggleShuffle() { S.setSetting('shuffle', !settings.shuffle); applySettings(); rebuildFeed(queue.current && queue.current.id); toast(settings.shuffle ? 'Shuffle on' : 'Shuffle off — chronological'); }
  function hideCurrent() { const v = queue.current; if (!v) return; learn(v, -3); S.hide(v.id); toast('Hidden from your feed', { label: 'Undo', fn: () => { const h = S.hidden(); h.delete(v.id); localStorage.setItem('rewind.v4.hidden', JSON.stringify([...h])); rebuildFeed(v.id); } }); skipCurrent(true); }

  function transport() {
    const pool = library.filter(playable); if (!pool.length) return;
    const proven = pool.filter((v) => okHere(v.id) || v.status === 'verified');
    const pick = C.shuffled(proven.length ? proven : pool)[0];
    const p = pick.year === 2020 ? '2020' : pick.month;
    const w = $('warp'); $('warpText').textContent = C.periodLabel(pick.year === 2020 ? pick.month : p);
    document.body.dataset.theme = pick.year === 2020 ? 'y2020' : 'fall'; document.body.dataset.period = pick.year === 2020 ? '2020' : pick.month;
    w.classList.add('on'); closeMenu();
    setTimeout(() => {
      clearContext(); state.period = p; state.tags = []; resetFailures();
      const list = C.buildFeed(library, { ...feedOpts(), shuffle: true, rng: Math.random, seen: new Set() }); queue.set(list, pick.id); present(1);
    }, reduced() ? 150 : 650);
    setTimeout(() => w.classList.remove('on'), reduced() ? 400 : 1300);
  }

  /* ---------------- menu / modals ---------------- */
  const openMenu = () => document.body.classList.add('menu-open');
  function closeMenu() { document.body.classList.remove('menu-open'); }
  let lastFocus = null;
  function openModal(html, { wide = false, label = 'Dialog' } = {}) {
    lastFocus = document.activeElement; const root = $('modalRoot');
    root.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="modal-x" type="button" data-close aria-label="Close">${icon('close')}</button>${html}</div>`;
    root.hidden = false; const f = root.querySelector('input,textarea,button:not([data-close])'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
    return root.firstElementChild;
  }
  function closeModal() { const root = $('modalRoot'); if (root.hidden) return; root.hidden = true; root.innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  const modalOpen = () => !$('modalRoot').hidden;

  const toggleRow = (id, title, sub, on) => `<div class="field"><div class="lab"><b>${title}</b><span>${sub}</span></div><button type="button" class="switch" role="switch" id="${id}" aria-checked="${on}" aria-label="${esc(title)}"></button></div>`;
  const rangeRow = (id, title, sub, val) => `<div class="field"><div class="lab"><b>${title}</b><span>${sub}</span></div><input type="range" id="${id}" min="0" max="100" value="${val}" aria-label="${esc(title)}"></div>`;

  function modalSettings() {
    const s = S.settings(); const m = openModal(`<h2>Atmosphere</h2><p class="lead">Dial the nostalgia up or down.</p>
      ${rangeRow('sIntensity', 'Nostalgia intensity', 'How strongly the era colors the room', s.intensity)}
      ${rangeRow('sBlur', 'Background blur', 'Softer = dreamier', s.blur)}
      ${rangeRow('sDepth', 'Depth', 'Size & vignette of the floating light', s.depth)}
      ${toggleRow('sReduce', 'Reduce motion', 'Calm, still backgrounds and no transitions', reduced())}
      ${toggleRow('sAmbience', 'Ambient room tone', 'Soft synthesized hum. Off by default', s.ambience)}
      <h3 style="margin-top:18px">Playback</h3>
      ${toggleRow('sEnglish', 'English only', 'Hide videos in other languages (Spanish, Portuguese, Korean…)', s.englishOnly)}
      ${toggleRow('sAdapt', 'Adapt to what I watch', 'The feed learns from what you finish, skip, save and hide. Stays on this device', s.adapt)}
      ${toggleRow('sAuto', 'Autoplay next', 'Move on when a video ends', s.autoplayNext)}
      ${toggleRow('sSkip', 'Auto-skip unavailable', 'Skip removed or unresponsive posts', s.autoSkip)}
      ${toggleRow('sHideBad', 'Hide known-broken posts', 'Keep removed posts out of your feed', s.hideUnavailable)}`, { label: 'Atmosphere settings' });
    const bind = (id, key) => { m.querySelector('#' + id).addEventListener('input', (e) => { S.setSetting(key, Number(e.target.value)); applySettings(); }); };
    bind('sIntensity', 'intensity'); bind('sBlur', 'blur'); bind('sDepth', 'depth');
    const sw = (id, key, after) => { const b = m.querySelector('#' + id); b.onclick = async () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); S.setSetting(key, on); applySettings(); if (after) await after(on); }; };
    sw('sReduce', 'reduceMotion'); sw('sEnglish', 'englishOnly', () => rebuildFeed(null)); sw('sAdapt', 'adapt'); sw('sAuto', 'autoplayNext'); sw('sSkip', 'autoSkip'); sw('sHideBad', 'hideUnavailable', () => rebuildFeed(queue.current && queue.current.id));
    sw('sAmbience', 'ambience', async (on) => { if (on) await ambience.enable(document.body.dataset.theme); else ambience.disable(); });
  }

  function modalHelp() {
    const k = [['↓ / J', 'Next'], ['↑ / K', 'Previous'], ['Space', 'Play / pause'], ['F', 'Favorite'], ['M', 'Mute'], ['S', 'Shuffle'], ['T', 'Transport me'], ['1–6', '2020 · Sep · Oct · Nov · Dec · All Fall'], ['[ / ]', 'Previous / next era'], ['/', 'Search'], ['O', 'Open on TikTok'], ['H', 'Hide this post'], ['?', 'This list'], ['Esc', 'Close']];
    openModal(`<h2>Shortcuts</h2><p class="lead">Scroll, swipe, or keep your hands on the keys.</p><div class="keys">${k.map(([a, b]) => `<div><span>${b}</span><kbd>${a}</kbd></div>`).join('')}</div>`, { label: 'Keyboard shortcuts' });
  }

  function modalSearch() {
    const m = openModal(`<h2>Search</h2><p class="lead">Creator, trend, sound, tag or month.</p><input type="search" id="q" placeholder="roman empire, @bellapoarch, dreams, october…" autocomplete="off"><div class="results" id="qres"></div><div class="btn-row" id="qact"></div>`, { label: 'Search' });
    const input = m.querySelector('#q'), res = m.querySelector('#qres'), act = m.querySelector('#qact');
    const run = () => {
      const q = input.value.trim(); if (!q) { res.innerHTML = '<p class="empty-note">Try “ceiling challenge”, “dances”, or “november”.</p>'; act.innerHTML = ''; return; }
      const hits = library.filter((v) => playable(v) && C.matchesQuery(v, q)).sort((a, b) => a.date.localeCompare(b.date));
      res.innerHTML = hits.slice(0, 40).map((x) => `<button type="button" class="vrow" data-search-play="${x.id}"><span class="vi">${x.month.slice(5)}</span><span><span class="vt">${esc(x.title)}</span><span class="vs">${x.creator ? '@' + esc(x.creator) + ' · ' : ''}${C.formatDate(x.date)}${x.sound ? ' · ♪ ' + esc(x.sound) : ''}</span></span></button>`).join('') || '<p class="empty-note">Nothing found. Try another word.</p>';
      act.innerHTML = hits.length ? `<button class="btn" type="button" id="qall">Play all ${hits.length}</button>` : '';
      if (hits.length) act.firstChild.onclick = () => { closeModal(); clearContext(); state.query = q; state.period = 'all'; state.tags = []; rebuildFeed(); };
    };
    input.addEventListener('input', run); run();
    res.addEventListener('click', (e) => { const b = e.target.closest('[data-search-play]'); if (!b) return; const q = input.value.trim(); closeModal(); clearContext(); state.query = q; state.period = 'all'; state.tags = []; rebuildFeed(b.dataset.searchPlay); });
  }

  function modalAdd() {
    const picked = new Set();
    const m = openModal(`<h2>Add <em>videos</em></h2><p class="lead">Paste real TikTok links, one per line. The upload date is read from the video ID and must be 2020 or Sep–Dec 2023.</p>
      <textarea id="links" placeholder="https://www.tiktok.com/@creator/video/7287054057124924677"></textarea>
      <div class="tagpick" id="tagpick">${D.vibes.map((v) => `<button type="button" class="chip" data-v="${v.id}">${esc(v.label)}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn" type="button" id="doAdd">Add to my archive</button><button class="btn ghost" type="button" id="doExport">Export my additions</button></div>
      <div class="feedback" id="fb"></div>
      <div class="note"><b>Honest labels:</b> added posts start as <b>unverified</b> until they actually play for you. To add them permanently, export and run <code>npm run add</code> (see README).</div>`, { label: 'Add videos' });
    m.querySelector('#tagpick').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; picked.has(b.dataset.v) ? picked.delete(b.dataset.v) : picked.add(b.dataset.v); b.classList.toggle('on'); });
    m.querySelector('#doAdd').onclick = () => {
      const lines = m.querySelector('#links').value.split(/\s+/).filter(Boolean); const fb = m.querySelector('#fb'); const ok = [], out = [];
      const have = new Set(library.map((v) => v.id));
      for (const l of lines) {
        const p = C.parseTikTokUrl(l); if (p.error) { out.push(`<span class="bad">✕ ${esc(l.slice(0, 50))} — ${esc(p.error)}</span>`); continue; }
        if (have.has(p.id)) { out.push(`<span class="bad">✕ ${p.id} — already in the archive</span>`); continue; }
        const date = C.dateFromId(p.id); if (!date || !C.inScope(date)) { out.push(`<span class="bad">✕ ${p.id} — uploaded ${date || '?'}, outside 2020 / Sep–Dec 2023</span>`); continue; }
        have.add(p.id); ok.push({ id: p.id, creator: p.creator, title: 'Added by you', date, trends: [...picked], status: 'unverified', provenance: 'user import', imported: true });
        out.push(`<span class="good">✓ ${p.id} — ${C.formatDate(date)}</span>`);
      }
      if (ok.length) { S.addImported(ok); loadLibrary(); renderAll(); toast(`Added ${ok.length} post${ok.length > 1 ? 's' : ''}`); }
      fb.innerHTML = out.join('') || 'Paste at least one link.';
    };
    m.querySelector('#doExport').onclick = () => download('rewind-additions.json', { schema: 1, videos: S.imported().map(({ imported, ...r }) => r) });
  }

  function modalHealth() {
    const lib = { verified: 0, unverified: 0, broken: 0 }; library.forEach((v) => lib[v.status]++);
    const h = Object.values(S.health()); const n = (f) => h.filter(f).length;
    const m = openModal(`<h2>Library <em>health</em></h2><p class="lead">What we know — and what we don’t.</p>
      <h3>Archive status</h3><div class="stats"><div class="stat"><b>${lib.verified}</b><span>link-verified</span></div><div class="stat"><b>${lib.unverified}</b><span>unverified</span></div><div class="stat"><b>${lib.broken}</b><span>known broken</span></div></div>
      <h3>Played on this device</h3><div class="stats"><div class="stat"><b>${n((x) => x.state === 'ok')}</b><span>played fine</span></div><div class="stat"><b>${n((x) => x.state === 'broken')}</b><span>gone</span></div><div class="stat"><b>${n((x) => x.state === 'timeout' || x.state === 'error')}</b><span>no response</span></div></div>
      <div class="note"><b>Unverified</b> means the date was decoded from the video ID but nobody has confirmed the post still plays. Playing a video here records the result. “Gone” posts are hidden automatically.</div>
      <div class="btn-row"><button class="btn ghost" type="button" id="hExport">Export results</button><button class="btn ghost" type="button" id="hReset">Reset device results</button><button class="btn ghost" type="button" id="hRestore">Restore hidden (${S.hidden().size})</button><button class="btn ghost" type="button" id="hTaste">Reset what Rewind learned</button></div>`, { label: 'Library health' });
    m.querySelector('#hExport').onclick = () => download('rewind-health.json', { exportedAt: new Date().toISOString(), results: S.health() });
    m.querySelector('#hReset').onclick = () => { S.clearHealth(); closeModal(); rebuildFeed(queue.current && queue.current.id); toast('Device results cleared'); };
    m.querySelector('#hTaste').onclick = () => { S.clearTaste(); S.clearSeen(); closeModal(); rebuildFeed(queue.current && queue.current.id); toast('Taste reset — fresh start'); };
    m.querySelector('#hRestore').onclick = () => { S.clearHidden(); closeModal(); rebuildFeed(queue.current && queue.current.id); toast('Hidden posts restored'); };
  }

  function modalOnboard() {
    const m = openModal(`<h2>Welcome to <em>rewind.</em></h2><p class="lead">Real TikToks, from the moments the internet felt different.</p>
      <ol class="steps"><li><div><b>Choose an era</b><span>2020 quarantine glow, or the amber haze of Sep–Dec 2023.</span></div></li><li><div><b>Scroll old TikToks</b><span>Swipe, wheel, or use ↑ ↓. Dead posts get skipped for you.</span></div></li><li><div><b>Save favorites</b><span>Tap the heart (or double-tap the video) to keep it.</span></div></li><li><div><b>Explore vibes</b><span>Filters, moods, collections, a timeline — or hit <i>Transport me</i>.</span></div></li></ol>
      <div class="cta"><button class="big y2020" type="button" data-start="2020"><b>Enter 2020</b><span>LED lights, late nights</span></button><button class="big yfall" type="button" data-start="fall"><b>Enter Fall 2023</b><span>Amber, cozy, crisp air</span></button></div>`, { label: 'Welcome' });
    m.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => { S.setOnboarded(); closeModal(); setPeriod(b.dataset.start); }));
  }

  function download(name, obj) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const openers = { search: modalSearch, add: modalAdd, health: modalHealth, settings: modalSettings, help: modalHelp };

  /* ---------------- events ---------------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const open = t.closest('[data-open]'); if (open) { closeMenu(); openers[open.dataset.open]?.(); return; }
    if (t.closest('[data-close]') || t === $('modalRoot')) return closeModal();
    const per = t.closest('button[data-period]'); if (per) return setPeriod(per.dataset.period);
    const mood = t.closest('[data-mood]'); if (mood) return setMood(mood.dataset.mood);
    const coll = t.closest('[data-coll]'); if (coll) return setCollection(coll.dataset.coll);
    const tag = t.closest('[data-tag]'); if (tag) { if (tag.dataset.tag === '') { state.tags = []; state.mood = null; rebuildFeed(); } else toggleTag(tag.dataset.tag); return; }
    const clr = t.closest('[data-clear]'); if (clr) { const cur = queue.current; clearContext(); state.period = 'all'; rebuildFeed(cur && cur.id); return; }
    const pl = t.closest('[data-play]'); if (pl) { const id = pl.dataset.play; if (pl.dataset.list === 'sim') { const v = library.find((x) => x.id === id); playSimilar(v); const i = queue.items.findIndex((x) => x.id === id); if (i >= 0) { queue.jump(i); present(1); } } else { const i = queue.items.findIndex((x) => x.id === id); if (i >= 0) { queue.jump(i); present(1); } } return; }
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'skip') skipCurrent(false); else if (a === 'retry') present(1); else if (a === 'retryall') { resetFailures(); present(1); }
      else if (a === 'reset') { clearContext(); state.period = 'all'; state.tags = []; rebuildFeed(); } else if (a === 'transport') transport();
    }
  });
  $('btnTransport').onclick = transport; $('btnNext').onclick = next; $('btnPrev').onclick = prev; $('btnMenu').onclick = openMenu; $('scrim').onclick = closeMenu;
  $('btnFavs').onclick = showFavorites; $('actFav').onclick = () => toggleFav(false); $('actShuffle').onclick = toggleShuffle;
  $('actMute').onclick = () => setMuted(!player.muted); $('soundHint').onclick = () => setMuted(false); $('actSimilar').onclick = () => { const v = queue.current; if (!v) return; const sim = C.similar(v, library.filter(playable), 8);
    openModal(`<h2>Similar <em>vibe</em></h2><p class="lead">More in the feeling of “${esc(v.title)}”.</p><div class="results">${sim.map((x) => `<button type="button" class="vrow" data-sim="${x.id}"><span class="vi">${x.month.slice(5)}</span><span><span class="vt">${esc(x.title)}</span><span class="vs">${x.creator ? '@' + esc(x.creator) + ' · ' : ''}${C.formatDate(x.date)}</span></span></button>`).join('') || '<p class="empty-note">Nothing similar yet.</p>'}</div>${sim.length ? '<div class="btn-row"><button class="btn" type="button" id="simAll">Play all as a feed</button></div>' : ''}`, { label: 'Similar vibe' })
      .addEventListener('click', (e) => { const r = e.target.closest('[data-sim]'); if (r) playOverride([v.id, ...sim.map((x) => x.id)], 'More like this', r.dataset.sim); if (e.target.id === 'simAll') playSimilar(v); }); };
  $('skSkip').onclick = () => skipCurrent(false); $('skipCancel').onclick = () => { clearTimeout(skipTimer); $('skipbar').hidden = true; showErrorPanel('playback', queue.current); };
  $('btnTap').onclick = () => { $('stTap').hidden = true; player.play(); };
  $('scrub').addEventListener('input', (e) => { const i = Number(e.target.value) - 1; if (i !== queue.index) { queue.jump(i); clearTimeout(scrubT); scrubT = setTimeout(() => present(1), 220); renderMetaOnly(); } });
  let scrubT; function renderMetaOnly() { $('posText').textContent = `${queue.index + 1} / ${queue.length}`; }

  /* wheel + swipe + tap on the shield (a cross-origin iframe would otherwise swallow these) */
  let wheelAcc = 0, wheelT = 0;
  $('feed').addEventListener('wheel', (e) => { e.preventDefault(); const now = Date.now(); if (now - wheelT > 160) wheelAcc = 0; wheelT = now; wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40 && now - state.lastNav > 520) { go(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; } }, { passive: false });
  let pd = null, lastTap = 0;
  $('shield').addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, t: Date.now() }; try { e.target.setPointerCapture(e.pointerId); } catch { /* ok */ } });
  $('shield').addEventListener('pointerup', (e) => {
    if (!pd) return; const dy = e.clientY - pd.y, dx = e.clientX - pd.x, dt = Date.now() - pd.t; pd = null;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) return void go(dy < 0 ? 1 : -1);
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 400) {
      const now = Date.now();
      if (now - lastTap < 300) { clearTimeout(tapTimer); lastTap = 0; const v = queue.current; if (v && !S.favorites().has(v.id)) toggleFav(true); else { const b = $('burst'); b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); } }
      else { lastTap = now; tapTimer = setTimeout(() => { state.userPausedAt = Date.now(); player.toggle(); }, 260); }
    }
  });
  $('shield').addEventListener('pointercancel', () => (pd = null));

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape') { if (modalOpen()) closeModal(); else closeMenu(); return; }
    if (typing || (modalOpen() && e.key !== '?')) return;
    const k = e.key.toLowerCase();
    if (e.key === 'ArrowDown' || k === 'j') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowUp' || k === 'k') { e.preventDefault(); prev(); }
    else if (e.key === ' ') { e.preventDefault(); state.userPausedAt = Date.now(); player.toggle(); }
    else if (k === 'f') toggleFav(false); else if (k === 'm') setMuted(!player.muted); else if (k === 's') toggleShuffle(); else if (k === 't') transport();
    else if (k === 'o') { const v = queue.current; if (v) window.open(v.url, '_blank', 'noopener'); }
    else if (k === 'h') hideCurrent();
    else if (e.key === '/') { e.preventDefault(); modalSearch(); } else if (e.key === '?') { modalOpen() ? closeModal() : modalHelp(); }
    else if (/^[1-6]$/.test(e.key)) setPeriod(C.PERIODS[Number(e.key) - 1].id);
    else if (e.key === '[' || e.key === ']') { const i = C.PERIODS.findIndex((p) => p.id === state.period); const n = (Math.max(0, i) + (e.key === ']' ? 1 : -1) + C.PERIODS.length) % C.PERIODS.length; setPeriod(C.PERIODS[n].id); }
  });

  /* ---------------- boot ---------------- */
  function boot() {
    loadLibrary(); applySettings();
    const hashId = (location.hash.match(/v=(\d+)/) || [])[1]; const hv = hashId && library.find((v) => v.id === hashId);
    state.period = hv ? (hv.year === 2020 ? '2020' : 'fall') : S.lastPeriod() || (qs.get('period') || 'fall');
    if (qs.get('period')) state.period = qs.get('period');
    if (settings.ambience) document.addEventListener('pointerdown', function once() { ambience.enable(document.body.dataset.theme); document.removeEventListener('pointerdown', once); }, { once: true });
    rebuildFeed(hv ? hv.id : null);
    if (!S.onboarded() && !qs.has('skipIntro')) modalOnboard();
  }
  window.__rewind = { state, queue, player, get library() { return library; }, present, go };
  /* A tap INSIDE the TikTok player is the one gesture iOS accepts for sound. We can't see it, but the page loses focus to the
   * iframe when it happens: use that moment (a real activation inside the player) to switch sound on. */
  addEventListener('blur', () => setTimeout(() => {
    const el = document.activeElement; if (!el || el.tagName !== 'IFRAME' || !player.muted || state.userMuted) return;
    state.soundOn = true; player.unmute(); dbg('tap inside the player: sound on');
  }, 0));
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => addEventListener(ev, () => { state.activated = true; state.lastGesture = Date.now(); }, { capture: true, passive: true }));
  /* Measure the REAL visible height (iOS Safari's toolbars make 100vh/100dvh unreliable) and keep it current. */
  function fit() { const h = (window.visualViewport && visualViewport.height) || innerHeight; document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px'); }
  fit(); addEventListener('resize', fit); addEventListener('orientationchange', () => setTimeout(fit, 250)); if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  boot();
})();
