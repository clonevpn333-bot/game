// Persistent story state: chapter, checkpoint, decisions, injuries, relationships.
const KEY = 'tlv.save.v1';
const SETTINGS_KEY = 'tlv.settings.v1';

export function freshState() {
  return {
    chapter: 1,
    checkpoint: 'start',
    flags: {},          // story decisions & discoveries
    injuries: { arm: 0 }, // persists across chapters (e.g. Kai's arm from the crash)
    sera: 0,            // relationship score
    evidence: [],       // ATLAS discoveries
    deaths: 0,
    playTime: 0,
    savedAt: 0,
  };
}

export const state = freshState();

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    Object.assign(state, freshState(), JSON.parse(raw));
    return true;
  } catch { return false; }
}
export function save() {
  state.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
export function reset() { Object.assign(state, freshState()); }
export function setFlag(k, v = true) { state.flags[k] = v; }
export function flag(k) { return state.flags[k]; }
export function addEvidence(id) { if (!state.evidence.includes(id)) state.evidence.push(id); }

export const settings = { quality: 'high', master: 0.9, music: 0.7, sfx: 0.9, sensitivity: 1, invertY: false, subtitleSpeed: 1, showFps: false };
export function loadSettings() { try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch {} return settings; }
export function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {} }

export const CHAPTERS = [
  { n: 1, id: 'wrongturn', name: 'WRONG TURN', genre: 'High-speed driving action' },
  { n: 2, id: 'storm', name: 'BELOW THE STORM', genre: 'Naval action' },
  { n: 3, id: 'room611', name: 'ROOM 611', genre: 'First-person survival horror' },
  { n: 4, id: 'fallenking', name: 'THE FALLEN KING', genre: 'Medieval action RPG' },
  { n: 5, id: 'works', name: 'RUNNING OUT OF TIME', genre: '2.5D precision platformer' },
  { n: 6, id: 'table', name: 'THE GENERAL', genre: 'Real-time tactics' },
  { n: 7, id: 'lindmere', name: 'THE QUIET PLACE', genre: 'Pixel-art narrative exploration' },
];
