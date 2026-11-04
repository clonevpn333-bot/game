// Persistent progress / settings (localStorage, defensive).
const KEY = 'floor99.save.v1';

export const DEFAULTS = () => ({
  version: 1,
  settings: { quality: 'high', sensitivity: 1, invertY: false, fov: 75, master: 0.8, music: 0.65, sfx: 0.85, voiceVol: 0.9, voice: true, shake: 1, damageNumbers: true, difficulty: 'normal' },
  progress: { completed: {}, lastFloor: null, started: false },
  unlocked: { weapons: ['revolver'], melee: ['blades'], abilities: [], cosmetics: { suit: [0, 1, 2], armor: [0, 1], visor: [0, 1], helmet: [0] }, tracks: ['menu'], mods: [], shop: [] },
  loadout: { guns: ['revolver', 'shotgun', 'rifle'], melee: 'blades', mods: [] },
  look: { suit: 0, armor: 0, visor: 0, helmet: 0 },
  fans: 0,
  records: {},
  challenges: [],
});

export class Save {
  constructor() {
    this.data = DEFAULTS();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = merge(DEFAULTS(), JSON.parse(raw));
    } catch (e) { /* private mode etc. */ }
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { } }
  reset() { this.data = DEFAULTS(); this.write(); }
  unlockWeapon(id) { if (!this.data.unlocked.weapons.includes(id)) { this.data.unlocked.weapons.push(id); this._autoEquip(id); this.write(); return true; } return false; }
  _autoEquip(id) {
    const g = this.data.loadout.guns;
    if (!g.includes(id) && g.length < 3) g.push(id);
    else if (!g.includes(id)) { g[g.length - 1] = id; }
  }
  unlockAbility(id) { if (!this.data.unlocked.abilities.includes(id)) { this.data.unlocked.abilities.push(id); this.write(); return true; } return false; }
  unlockMelee(id) { if (!this.data.unlocked.melee.includes(id)) { this.data.unlocked.melee.push(id); this.write(); return true; } return false; }
  unlockTrack(id) { if (!this.data.unlocked.tracks.includes(id)) { this.data.unlocked.tracks.push(id); this.write(); } }
  record(floor, r) {
    const rec = this.data.records[floor] || { plays: 0 };
    rec.plays++;
    if (!rec.bestTime || r.time < rec.bestTime) rec.bestTime = r.time;
    if (!rec.bestScore || r.score > rec.bestScore) rec.bestScore = r.score;
    rec.stars = Math.max(rec.stars || 0, r.stars);
    rec.bestCombo = Math.max(rec.bestCombo || 0, r.combo);
    rec.kills = Math.max(rec.kills || 0, r.kills);
    rec.accuracy = Math.max(rec.accuracy || 0, r.accuracy);
    rec.last = r;
    this.data.records[floor] = rec;
    this.data.progress.completed[floor] = true;
    this.write();
  }
  totalStars() { return Object.values(this.data.records).reduce((s, r) => s + (r.stars || 0), 0); }
}

function merge(a, b) {
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b === undefined ? a : b;
  const out = { ...a };
  for (const k in b) out[k] = (k in a && typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) ? merge(a[k], b[k]) : b[k];
  return out;
}
