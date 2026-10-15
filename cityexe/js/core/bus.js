// Minimal event bus used by the simulation to tell UI/audio/render what happened.
export class Bus {
  constructor() { this.h = new Map(); }
  on(type, fn) { if (!this.h.has(type)) this.h.set(type, []); this.h.get(type).push(fn); return () => this.off(type, fn); }
  off(type, fn) { const a = this.h.get(type); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  emit(type, data) { const a = this.h.get(type); if (a) for (const fn of a.slice()) fn(data); }
}
