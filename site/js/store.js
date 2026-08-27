/* Per-key profile: favorites, recently played, play counts, last position.
 * Namespaced by hub key so a regenerated link starts a clean profile. */
let NS = 'nova.p.anon';
let state = blank();

function blank() { return { favorites: [], recents: [], plays: {}, seenAt: {}, created: Date.now() }; }

export function initStore(key) {
  NS = 'nova.p.' + key;
  try {
    const raw = localStorage.getItem(NS);
    state = raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch { state = blank(); }
  return state;
}
function save() { try { localStorage.setItem(NS, JSON.stringify(state)); } catch {} }

export const isFavorite = (id) => state.favorites.includes(id);
export function toggleFavorite(id) {
  const i = state.favorites.indexOf(id);
  if (i < 0) state.favorites.unshift(id); else state.favorites.splice(i, 1);
  save();
  return i < 0;
}
export const favorites = () => state.favorites.slice();

export function markPlayed(id) {
  state.recents = [id, ...state.recents.filter((x) => x !== id)].slice(0, 24);
  state.plays[id] = (state.plays[id] || 0) + 1;
  state.seenAt[id] = Date.now();
  save();
}
export const recents = () => state.recents.slice();
export const playCount = (id) => state.plays[id] || 0;
export const lastPlayed = (id) => state.seenAt[id] || 0;
export const totalPlays = () => Object.values(state.plays).reduce((a, b) => a + b, 0);

export function resetProfile() { state = blank(); save(); }

/* Small generic prefs bucket (server URL for Summit, sound, etc.) */
const PREFS = 'nova.prefs';
export function pref(key, value) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(PREFS) || '{}'); } catch {}
  if (value === undefined) return all[key];
  all[key] = value;
  try { localStorage.setItem(PREFS, JSON.stringify(all)); } catch {}
  return value;
}
