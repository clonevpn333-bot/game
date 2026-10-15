// City Archive (major events by year), citizen life logs, and city records.
import { C, SEASONS } from './config.js';

export class History {
  constructor(world) {
    this.world = world;
    this.events = []; // {t, text, type, x, z, b, who, minor, anomaly}
    this.records = { longestChase: null, biggestFire: null, worstCrash: null, mostArrests: null, richest: null, oldest: null, longestBlackout: null };
    this.landmarks = []; // physical evidence: craters, memorials, ruins {kind, x, z, text, t, r}
    this.counters = { robberies: 0, arrests: 0, fires: 0, crashes: 0, chases: 0, births: 0, deaths: 0, newBiz: 0, closedBiz: 0, blackouts: 0 };
  }

  dateStr(t) {
    if (t < 0) return 'Before Y1';
    const d = Math.floor(t / 1440);
    const y = Math.floor(d / C.YEAR_DAYS) + 1;
    const s = Math.floor((d % C.YEAR_DAYS) / C.SEASON_DAYS);
    const sd = (d % C.SEASON_DAYS) + 1;
    return `Y${y} ${SEASONS[s]} ${sd}`;
  }
  timeStr(t) {
    const m = Math.floor(((t % 1440) + 1440) % 1440);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  cityEvent(text, opts = {}) {
    const W = this.world;
    const e = { t: W.time, text, ...opts };
    this.events.push(e);
    if (this.events.length > 900) {
      // drop oldest minor events first
      const i = this.events.findIndex((x) => x.minor);
      this.events.splice(i >= 0 ? i : 0, 1);
    }
    W.emit('cityEvent', e);
    return e;
  }

  citizenLog(c, text, major = false) {
    const W = this.world;
    const entry = { t: W.time, text, major };
    c.log.push(entry);
    const cap = c.bookmarked ? 200 : 24;
    while (c.log.length > cap) {
      const i = c.log.findIndex((x) => !x.major);
      c.log.splice(i >= 0 ? i : 0, 1);
    }
    if (c.bookmarked) W.emit('bookmarkEvent', { c, entry });
    return entry;
  }

  record(key, value, text, data = {}) {
    const r = this.records[key];
    if (!r || value > r.value) {
      const isNew = !!r;
      this.records[key] = { value, text, t: this.world.time, ...data };
      if (isNew) this.cityEvent(`New city record: ${text}`, { type: 'record', ...data });
      return true;
    }
    return false;
  }

  landmark(kind, x, z, text, opts = {}) {
    const lm = { kind, x, z, text, t: this.world.time, ...opts };
    this.landmarks.push(lm);
    this.world.emit('landmark', lm);
    return lm;
  }

  byYear() {
    const out = new Map();
    for (const e of this.events) {
      const y = Math.floor(Math.floor(e.t / 1440) / C.YEAR_DAYS) + 1;
      if (!out.has(y)) out.set(y, []);
      out.get(y).push(e);
    }
    return out;
  }
}
