// Tiny pub/sub bus. Cross-format interactions are routed through here so that
// no chapter needs to know about another chapter's internals.
export class Events {
  constructor() { this.map = new Map(); }
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, payload) {
    const set = this.map.get(type);
    if (set) for (const fn of [...set]) fn(payload);
    const any = this.map.get('*');
    if (any) for (const fn of [...any]) fn(type, payload);
  }
}
