// Every errand, date, job and mission that happens somewhere gets a pin.
// The newest one becomes your GPS route automatically; all of them show on
// the map (M) with how long you have left.
export class Tasks {
  constructor(W) {
    this.W = W; this.list = [];
    // your shift: pinned an hour before it starts, cleared when you clock in
    W.on('hour', ({ hour }) => {
      const c = W.life?.player;
      if (!c || !c.job || c.status !== 'ok') { this.remove('work'); return; }
      if (c.working) { this.remove('work'); return; }
      const start = Math.floor(c.job.shift[0] / 60) % 24, end = Math.floor(c.job.shift[1] / 60) % 24;
      if (c.job.days && !c.job.days[W.day % 7]) return;
      if ((hour + 1) % 24 === start) this.add({ key: 'work', icon: '💼', label: `Your shift starts at ${start}:00 — clock in (C)`, b: W.economy.biz[c.job.biz].b, until: W.time + ((end - hour + 24) % 24) * 60 });
    });
  }
  // spec: { key, label, icon, b (building id) | x,z, until (game minutes) }
  add(spec) {
    const W = this.W;
    const b = spec.b != null ? W.city.buildings[spec.b] : null;
    const t = { icon: '📍', ...spec, x: b ? b.door[0] : spec.x, z: b ? b.door[1] : spec.z, place: b ? W.citizenAI.buildingName(b.id) : spec.place || '', added: W.time };
    if (t.x == null) return null;
    this.list = this.list.filter((o) => o.key !== t.key);
    this.list.push(t);
    W.emit('task', t);
    return t;
  }
  remove(key) { this.list = this.list.filter((o) => o.key !== key); }
  get(key) { return this.list.find((o) => o.key === key); }
  active() { const now = this.W.time; this.list = this.list.filter((t) => t.until == null || t.until > now); return this.list; }
  serialize() { return this.list; }
  deserialize(d) { this.list = Array.isArray(d) ? d : []; }
}
