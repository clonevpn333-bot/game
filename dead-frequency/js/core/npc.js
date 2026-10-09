'use strict';
// Simple articulated humans built from primitives, with procedural animation.

// Human class lives in humans.js (rigged, mocap-animated characters).

const NPCs = {
  list: [],
  spawn(who, o = {}) { const h = new Human(G.level.root, who, o); this.list.push(h); return h; },
  get(who) { return this.list.find(n => n.who === who); },
  update(dt) { for (const n of this.list) if (n.visible && !n.managed) n.update(dt); },
  clear() { for (const n of this.list) n.remove(); this.list = []; },
};
