// GETAWAY! — persistent save + settings (localStorage, guarded)
const KEY = 'getaway_save_v1';
const SKEY = 'getaway_settings_v1';

const DEFAULT_SAVE = () => ({
  completed: {},             // missionId -> { bestTime, bestScore, grade, plays }
  unlockedVehicles: ['rostr', 'rivolta', 'strada', 'saetta', 'sedan', 'hatch', 'muscle', 'moto'],
  vehicleMods: {},           // typeId -> { color, rims, boost }
  tracks: ['main', 'freeroam'],
  pursuit: {                 // campaign memory of how the player escapes
    escapes: 0, highway: 0, tunnel: 0, swaps: 0, aircraft: 0, alley: 0, water: 0, onfoot: 0, offroad: 0,
  },
  stats: { stolen: 0, escapes: 0, distance: 0, airtime: 0, nearMiss: 0, explosions: 0, busted: 0 },
  campaignEnding: null,
  lastMission: 0,
  secrets: [],
});

export const DEFAULT_SETTINGS = () => ({
  quality: 'high', master: 0.9, music: 0.75, sfx: 0.9, sensitivity: 1, invertY: false,
  fov: 72, shake: 1, bloom: true, shadows: true, pedDensity: 1, trafficDensity: 1, subtitles: true, units: 'kmh',
  motionBlurFx: true,
});

function readJSON(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

export function loadSave() {
  const d = DEFAULT_SAVE(); const s = readJSON(KEY);
  if (s) { Object.assign(d, s); d.pursuit = Object.assign(DEFAULT_SAVE().pursuit, s.pursuit || {}); d.stats = Object.assign(DEFAULT_SAVE().stats, s.stats || {}); } for (const v of ['rivolta', 'strada']) if (!d.unlockedVehicles.includes(v)) d.unlockedVehicles.push(v);
  return d;
}
export function storeSave(s) { writeJSON(KEY, s); }
export function loadSettings() { return Object.assign(DEFAULT_SETTINGS(), readJSON(SKEY) || {}); }
export function storeSettings(s) { writeJSON(SKEY, s); }
export function resetSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
