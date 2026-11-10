// Persistent state: progression, settings, and the cross-format LEDGER.
// The ledger stores shared object identities (things the player did in one
// reality that another reality must honour).
const KEY = 'framebreak.save.v1';

export const DEFAULT_SETTINGS = {
  master: 0.8, music: 0.75, sfx: 0.9,
  resScale: 1, shadows: 2, effects: 2, textures: 2, post: 2,
  particles: 1, physics: 1, drawDistance: 1,
  shake: 1, showPerf: false, fullscreen: false, easy: false,
};

function blank() {
  return {
    version: 1,
    chapter: 0,            // highest chapter index reached (0 = nothing yet)
    checkpoint: null,      // { chapter, id }
    completed: [],         // chapter ids finished at least once
    flags: {},             // story flags
    ledger: {},            // cross-format object identities
    stats: { deaths: 0, time: 0, bestCombo: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export class Save {
  constructor() { this.data = blank(); this.load(); }
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.version === 1) {
          this.data = { ...blank(), ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) }, stats: { ...blank().stats, ...(d.stats || {}) } };
        }
      }
    } catch { /* storage unavailable: play without persistence */ }
  }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ } }
  get settings() { return this.data.settings; }
  hasProgress() { return this.data.chapter > 0 || !!this.data.checkpoint; }
  newGame() {
    const s = this.data.settings, c = this.data.completed;
    this.data = blank(); this.data.settings = s; this.data.completed = c; this.write();
  }
  setCheckpoint(chapter, id) {
    this.data.checkpoint = { chapter, id };
    if (chapter > this.data.chapter) this.data.chapter = chapter;
    this.write();
  }
  complete(chapter) {
    if (!this.data.completed.includes(chapter)) this.data.completed.push(chapter);
    this.write();
  }
  flag(name, value = true) { this.data.flags[name] = value; this.write(); }
  getFlag(name) { return this.data.flags[name]; }
  // Ledger: record({id:'shard', ...}) merges state for a shared identity.
  record(id, state) { this.data.ledger[id] = { ...(this.data.ledger[id] || {}), ...state }; this.write(); }
  recall(id) { return this.data.ledger[id]; }
}
