// Persistent story state: flags, hidden relationship values, choice log, checkpoints.
// Relationships are never shown as meters. They shift through actions as much as words.
const KEY = 'marchlight.save.v1';

export class StoryState {
  constructor() { this.reset(); }
  reset() {
    this.chapter = 'prologue'; this.checkpoint = 'wake';
    this.flags = {};
    // trust: does this person believe Rook; warmth: closeness; nia.spark: romantic tension (only matters if pursued)
    this.rel = { nia: { trust: 0, warmth: 0, spark: 0 }, bram: { trust: 2, warmth: 3 }, tomas: { trust: 1, warmth: 1 } };
    this.look = null;
    this.log = [];        // journal entries
    this.choices = [];    // [{ id, value }]
    this.people = {};     // people met: name -> note
    this.playtime = 0;
  }
  flag(k, v = true) { this.flags[k] = v; }
  has(k) { return !!this.flags[k]; }
  adjust(who, key, d) { if (!this.rel[who]) this.rel[who] = {}; this.rel[who][key] = (this.rel[who][key] || 0) + d; }
  choice(id, value) { this.choices.push({ id, value }); this.flags['choice:' + id] = value; }
  meet(name, note) { this.people[name] = note; }
  journal(text) { if (!this.log.includes(text)) this.log.push(text); }
  save(game) {
    const p = game?.player;
    const data = { chapter: this.chapter, checkpoint: this.checkpoint, flags: this.flags, rel: this.rel, look: this.look, log: this.log, choices: this.choices, people: this.people, playtime: this.playtime,
      weapons: game ? { owned: game.weapons.owned, ammo: game.weapons.ammo } : null, t: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }
  load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (!d) return false; Object.assign(this, d); this._weapons = d.weapons; return true; } catch { return false; }
  }
  static exists() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
  static clear() { try { localStorage.removeItem(KEY); } catch { /* */ } }
}
