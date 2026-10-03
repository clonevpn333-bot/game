// Minimal event bus
export class Events {
  constructor() { this.h = new Map(); }
  on(name, fn) {
    if (!this.h.has(name)) this.h.set(name, []);
    this.h.get(name).push(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) {
    const a = this.h.get(name);
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  emit(name, ...args) {
    const a = this.h.get(name);
    if (!a) return;
    for (const fn of a.slice()) {
      try { fn(...args); } catch (e) { console.error('event handler', name, e); }
    }
  }
}
