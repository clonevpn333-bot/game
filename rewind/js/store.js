/* Rewind store: localStorage-backed settings, favorites, hidden posts, imports and per-device playback health.
 * Every access is guarded: private windows / blocked storage fall back to memory. */
(function () {
  'use strict';
  const PREFIX = 'rewind.v4.';
  const mem = {};
  const get = (k, d) => { try { const v = localStorage.getItem(PREFIX + k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch { return k in mem ? mem[k] : d; } };
  const set = (k, v) => { mem[k] = v; try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* memory only */ } };

  const DEFAULTS = {
    intensity: 70, blur: 35, depth: 50, reduceMotion: null /* null = follow OS */, ambience: false,
    autoplayNext: false, autoSkip: true, hideUnavailable: true, shuffle: true, adapt: true, englishOnly: true,
  };
  const listeners = new Set();
  const emit = (what) => listeners.forEach((f) => f(what));

  const Store = {
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    settings() { return { ...DEFAULTS, ...get('settings', {}) }; },
    setSetting(k, v) { set('settings', { ...get('settings', {}), [k]: v }); emit('settings'); },
    setSettings(obj) { set('settings', { ...get('settings', {}), ...obj }); emit('settings'); },
    favorites() { return new Set(get('favorites', [])); },
    toggleFavorite(id) { const f = Store.favorites(); const on = !f.has(id); on ? f.add(id) : f.delete(id); set('favorites', [...f]); emit('favorites'); return on; },
    hidden() { return new Set(get('hidden', [])); },
    hide(id) { const h = Store.hidden(); h.add(id); set('hidden', [...h]); emit('hidden'); },
    clearHidden() { set('hidden', []); emit('hidden'); },
    imported() { return get('imported', []); },
    addImported(list) { const cur = Store.imported(); const ids = new Set(cur.map((v) => v.id)); const add = list.filter((v) => !ids.has(v.id)); set('imported', [...cur, ...add]); emit('imported'); return add.length; },
    removeImported(id) { set('imported', Store.imported().filter((v) => v.id !== id)); emit('imported'); },
    /* health: {id: {state:'ok'|'broken'|'timeout', kind, code, at}} — evidence from THIS browser only */
    health() { return get('health', {}); },
    recordHealth(id, entry) { const h = Store.health(); h[id] = { ...entry, at: new Date().toISOString() }; set('health', h); emit('health'); },
    clearHealth() { set('health', {}); emit('health'); },
    /* every post you have been shown (up to 4000): the feed serves unseen posts first, so nothing repeats until you've seen it all */
    seen() { return new Set(get('seen', [])); },
    markSeen(id) { const a = get('seen', []).filter((x) => x !== id); a.push(id); set('seen', a.slice(-4000)); },
    seenCount() { return get('seen', []).length; },
    clearSeen() { set('seen', []); },
    taste() { return get('taste', {}); },
    setTaste(t) { set('taste', t); },
    clearTaste() { set('taste', {}); },
    iosSound() { return get('iosSound', null); },
    setIosSound(v) { set('iosSound', v); },
    onboarded() { return !!get('onboarded', false); },
    setOnboarded() { set('onboarded', true); },
    lastPeriod() { return get('period', null); },
    setLastPeriod(p) { set('period', p); },
    sessionMs() { try { return JSON.parse(sessionStorage.getItem(PREFIX + 'sessionMs') || '{}'); } catch { return mem.sessionMs || {}; } },
    addSessionMs(period, ms) { const s = Store.sessionMs(); s[period] = (s[period] || 0) + ms; mem.sessionMs = s; try { sessionStorage.setItem(PREFIX + 'sessionMs', JSON.stringify(s)); } catch { /* memory */ } return s[period]; },
  };
  window.RewindStore = Store;
})();
