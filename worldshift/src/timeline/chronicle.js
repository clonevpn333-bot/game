// The Chronicle: a causal fact store. Facts set in an era propagate forward
// in time (1996 -> 2047 -> 2189) unless a later era overrides them. World
// generators read facts while building, and the chronicle remembers which
// chunk depended on which fact so changes rebuild exactly what they affect.
import { G, ERA_YEARS } from '../core/state.js';

export class Chronicle {
  constructor() {
    this.facts = new Map();     // id -> { values: [v1996, v2047, v2189], meta }
    this.deps = new Map();      // id -> Set("ci,cj|era")
    this.tracking = null;       // { key, era } while a chunk builds
    this.journal = [];          // discovered cause → effect entries
    this.pending = [];          // consequences waiting to be discovered by visiting a later era
    this.listeners = [];
  }

  _track(id) {
    if (!this.tracking) return;
    let s = this.deps.get(id);
    if (!s) { s = new Set(); this.deps.set(id, s); }
    s.add(this.tracking.key + '|' + this.tracking.era);
  }

  get(id, era = G.era) {
    this._track(id);
    const f = this.facts.get(id);
    if (!f) return undefined;
    for (let e = era; e >= 0; e--) if (f.values[e] !== undefined) return f.values[e];
    return undefined;
  }
  has(id, era = G.era) {
    const v = this.get(id, era);
    return v !== undefined && v !== false && v !== null;
  }
  // when was it set (earliest era)?
  origin(id) {
    const f = this.facts.get(id);
    if (!f) return -1;
    return f.values.findIndex((v) => v !== undefined);
  }

  // Set a fact in an era. `effects` describes visible consequences in later
  // eras for the journal: [{ era, text, at: {x,z} }]
  set(id, value, era = G.era, info = {}) {
    let f = this.facts.get(id);
    if (!f) { f = { values: [undefined, undefined, undefined], meta: {} }; this.facts.set(id, f); }
    const prev = this.get(id, era);
    f.values[era] = value;
    Object.assign(f.meta, info.meta || {});
    if (prev === value) return;
    // invalidate dependent chunks in this and later eras
    const dep = this.deps.get(id);
    if (dep && G.chunks) {
      for (const k of dep) {
        const [key, e] = k.split('|');
        const ee = +e;
        if (ee < era) continue;
        const [ci, cj] = key.split(',').map(Number);
        G.chunks.invalidate(ci, cj, [ee]);
      }
    }
    if (info.effects) {
      for (const eff of info.effects) {
        if (eff.era <= era) continue;
        this.pending.push({ id, cause: info.cause || id, causeEra: era, ...eff, discovered: false, t: Date.now() });
      }
    }
    if (info.cause) {
      this.journal.push({ kind: 'cause', id, text: info.cause, era, t: Date.now() });
    }
    for (const fn of this.listeners) fn(id, value, era, info);
    if (G.world && G.world.onFactChanged) G.world.onFactChanged(id, era);
  }

  onChange(fn) { this.listeners.push(fn); }

  // Called when the player arrives in an era: reveal consequences there
  revealFor(era) {
    const found = [];
    for (const p of this.pending) {
      if (!p.discovered && p.era === era) {
        p.discovered = true;
        found.push(p);
        this.journal.push({ kind: 'effect', id: p.id, text: p.text, cause: p.cause, era, causeEra: p.causeEra, at: p.at, t: Date.now() });
      }
    }
    return found;
  }

  // Markers on the map for consequences not yet seen
  undiscovered(era) {
    return this.pending.filter((p) => !p.discovered && p.era === era && p.at);
  }

  serialize() {
    const facts = {};
    for (const [k, f] of this.facts) facts[k] = { values: f.values, meta: f.meta };
    return { facts, journal: this.journal, pending: this.pending };
  }
  load(data) {
    if (!data) return;
    this.facts.clear();
    for (const [k, f] of Object.entries(data.facts || {})) this.facts.set(k, { values: f.values, meta: f.meta || {} });
    this.journal = data.journal || [];
    this.pending = data.pending || [];
  }

  yearsBetween(a, b) { return Math.abs(ERA_YEARS[b] - ERA_YEARS[a]); }
}
