// Interactions, inventory, progression, and the generic timeline actions
// anyone can perform anywhere: plant a tree, tag a wall, bury a time capsule.
// Each becomes a Chronicle fact that later eras render as its aged version.
import * as THREE from 'three';
import { G, ERA_YEARS } from '../core/state.js';
import { chunkCoord, chunkKey, terrainHeight } from '../world/layout.js';
import { placeProp } from '../world/props.js';
import { signQuad } from '../world/signs.js';
import { LAYER as L } from '../world/textures.js';
import { CF, SURF } from '../world/collision.js';

// ------------------------------------------------------------ inventory --
export class Inventory {
  constructor() {
    this.items = { seed: 0, spray: 0, capsule: 0, bypass: 0, charges: 0, core: 0, deed: 0 };
    this.cash = [40, 0, 0]; // dollars / credits / scrap
  }
  add(id, n = 1) {
    this.items[id] = (this.items[id] || 0) + n;
    G.audio.play('pickup');
  }
  has(id, n = 1) { return (this.items[id] || 0) >= n; }
  take(id, n = 1) { if (!this.has(id, n)) return false; this.items[id] -= n; return true; }
  money(era = G.era) { return this.cash[era]; }
  addMoney(n, era = G.era) { this.cash[era] += n; }
  serialize() { return { items: this.items, cash: this.cash, weapons: G.combat.owned, ammo: G.combat.state }; }
  load(d) {
    if (!d) return;
    Object.assign(this.items, d.items || {});
    this.cash = d.cash || this.cash;
    if (d.weapons) { G.combat.owned = d.weapons; G.combat.state = d.ammo || {}; for (const w of d.weapons) if (!G.combat.state[w]) G.combat.state[w] = { mag: 0, reserve: 0 }; }
  }
}

// ---------------------------------------------------------- progression --
export class Progress {
  constructor() { this.xp = 0; this.rank = 1; }
  addXP(n) {
    this.xp += n;
    const need = this.rank * 120;
    if (this.xp >= need) {
      this.xp -= need;
      this.rank++;
      this.apply();
      G.hud.showBanner(`CHRONO RANK ${this.rank}`, this.perkText(), 3);
      G.audio.play('objective');
    }
  }
  perkText() {
    return ['', '', 'Shift recharge +15%', 'Max health +15', 'Peek radius & charge +', 'Shift cost −15%', 'Max health +15', 'Shift recharge +15%'][this.rank] || 'Max health +10';
  }
  apply() {
    const r = this.rank;
    G.shift.rechargeRate = 0.11 * (1 + (r >= 2 ? 0.15 : 0) + (r >= 7 ? 0.15 : 0));
    G.shift.cost = 0.34 * (r >= 5 ? 0.85 : 1);
    G.player.maxHealth = 100 + (r >= 3 ? 15 : 0) + (r >= 6 ? 15 : 0) + Math.max(0, r - 7) * 10 + (G.chronicle.has('clinic.upgrade', 1) ? 25 : 0);
  }
  serialize() { return { xp: this.xp, rank: this.rank }; }
  load(d) { if (d) { this.xp = d.xp; this.rank = d.rank; this.apply(); } }
}

// -------------------------------------------------------- player marks ---
// Rendered by the chunk builder for every era at/after the mark's era.
export function emitPlayerMarks(ctx, c, era) {
  const f = ctx.facts;
  const key = chunkKey(c.ci, c.cj);
  const plants = f.get('plant@' + key, 2) || [];
  for (const p of plants) {
    if (p.era > era) continue;
    const y = Math.max(terrainHeight(p.x, p.z), p.y || 0);
    const age = era - p.era; // 0 sapling, 1 grown (51 yrs), 2 ancient
    if (age === 0) placeProp(ctx, 'bush_2', p.x, y, p.z, 0, 0.3, null, { noCollide: true });
    else if (ERA_YEARS[era] - ERA_YEARS[p.era] < 100) placeProp(ctx, 'tree_oak_' + (p.v || 0), p.x, y, p.z, p.v || 0, 1.4);
    else {
      placeProp(ctx, 'tree_giant_' + ((p.v || 0) % 2), p.x, y, p.z, p.v || 0, 1.35);
      ctx.collider(p.x - 1.5, y, p.z - 1.5, p.x + 1.5, y + 24, p.z + 1.5, CF.SOLID | CF.CLIMB, SURF.wood);
    }
  }
  const tags = f.get('tag@' + key, 2) || [];
  for (const t of tags) {
    if (t.era > era) continue;
    const age = era - t.era;
    const sg = ctx.signs.get('t:ASH');
    const col = age === 0 ? [1.1, 1.1, 1.1] : age === 1 ? [0.95, 0.95, 0.95] : [0.4, 0.42, 0.38];
    signQuad(ctx.geo.get('sign'), sg, t.x, t.y, t.z, t.nx, t.nz, 2.4, 0.9, col, 0, 0);
    if (age === 1 && ERA_YEARS[era] - ERA_YEARS[t.era] < 100) {
      // preserved under glass as "historic street art", with a plaque
      ctx.geo.get('glass').boxRot(t.x + t.nx * 0.12, t.y, t.z + t.nz * 0.12, 1.4, 0.6, 0.03, Math.atan2(t.nx, t.nz), [0.8, 0.9, 1.0], [0, -1, 0, 0]);
      ctx.geo.get('emissive').boxRot(t.x + t.nx * 0.1, t.y - 0.75, t.z + t.nz * 0.1, 0.5, 0.08, 0.02, Math.atan2(t.nx, t.nz), [2, 1.8, 1.2], [0, 0, 0, 0]);
    }
  }
  const caps = f.get('capsule@' + key, 2) || [];
  for (const cp of caps) {
    if (cp.era > era) continue;
    const y = terrainHeight(cp.x, cp.z) + 0.15;
    if (cp.era === era) {
      ctx.geo.get('uber').box(cp.x - 0.5, y - 0.1, cp.z - 0.5, cp.x + 0.5, y + 0.12, cp.z + 0.5, [0.8, 0.7, 0.6], [L.dirt, -1, 0, 0], { faces: 4 | 1 | 2 | 16 | 32 });
    } else if (!f.has(`capsule.dug@${cp.id}`, era)) {
      ctx.geo.get('uber').box(cp.x - 0.4, y - 0.05, cp.z - 0.4, cp.x + 0.4, y + 0.05, cp.z + 0.4, [0.6, 0.55, 0.45], [L.rubble, -1, 0, 0], { faces: 4 });
      ctx.interact.push({ x: cp.x, y, z: cp.z, r: 2.2, id: 'capsule_dig', label: `Dig up your time capsule (buried ${ERA_YEARS[cp.era]})`, era, data: cp });
    }
  }
}

function addListFact(id, item, effects, cause) {
  const prev = G.chronicle.get(id, 2) || [];
  // facts propagate forward, so store the list on the latest era to make it visible everywhere
  G.chronicle.set(id, [...prev, item], 0, { effects, cause });
}

// ---------------------------------------------------------- interaction --
export class Interaction {
  constructor() {
    this.prompting = false;
    this.current = null;
    this.handlers = {};
    this.conds = {};
    this.dynamic = []; // mission-added interactables {x,y,z,r,id,label,era}
    this.capsuleId = 1;
  }
  on(id, fn) { this.handlers[id] = fn; }
  cond(name, fn) { this.conds[name] = fn; }
  addDynamic(it) { this.dynamic.push(it); return it; }
  removeDynamic(it) { const i = this.dynamic.indexOf(it); if (i >= 0) this.dynamic.splice(i, 1); }

  _candidates() {
    const out = [...this.dynamic.filter((d) => d.era === undefined || d.era === G.era)];
    G.chunks.forEachActive(G.era, (c, ec) => { for (const it of ec.interactables) out.push(it); });
    return out;
  }

  update(dt, input) {
    const p = G.player;
    this.prompting = false;
    if (p.vehicle || p.dead) return;
    let best = null, bd = 1e9;
    for (const it of this._candidates()) {
      const d = Math.hypot(it.x - p.pos.x, it.z - p.pos.z);
      if (d > it.r || Math.abs((it.y ?? p.pos.y) - (p.pos.y + 1)) > 2.6) continue;
      if (it.levelCond && !it.levelCond()) continue;
      if (it.cond && this.conds[it.cond] && !this.conds[it.cond](it)) continue;
      if (it.cond && !this.conds[it.cond]) continue;
      if (d < bd) { bd = d; best = it; }
    }
    // generic timeline actions when nothing specific is nearby
    let generic = null;
    if (!best) generic = this._genericAction();
    const label = best ? best.label : generic ? generic.label : null;
    if (label) {
      G.hud.setPrompt(`<kbd>E</kbd>${label}`);
      this.prompting = true;
      if (input.keyPressed('KeyE')) {
        if (best) this._run(best);
        else generic.run();
      }
    }
  }

  _run(it) {
    const h = this.handlers[it.id];
    if (h) h(it);
    else if (G.missions) G.missions.onInteract(it.id, it);
  }

  _genericAction() {
    const p = G.player;
    const inv = G.inventory;
    if (p.state !== 'ground') return null;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    // spray tag on the wall in front
    if (inv.has('spray')) {
      const h = G.collision.raycast(G.era, p.pos.x, p.pos.y + 1.5, p.pos.z, fx, 0, fz, 1.6);
      if (h && !h.terrain && Math.abs(h.ny) < 0.2) {
        return { label: 'Spray your tag', run: () => this.spray(h) };
      }
    }
    // plant / bury on soil (grass or dirt ground, not roads)
    const g = G.collision.ground(G.era, p.pos.x, p.pos.z, p.pos.y + 0.3);
    const soil = g.surf === SURF.grass || g.surf === SURF.dirt || (g.collider === null && g.y > -100);
    if (soil && inv.has('seed')) return { label: `Plant a seed (${inv.items.seed})`, run: () => this.plant(p.pos.x + fx * 0.8, p.pos.z + fz * 0.8, g.y) };
    if (soil && inv.has('capsule')) return { label: 'Bury a time capsule', run: () => this.bury(p.pos.x + fx * 0.8, p.pos.z + fz * 0.8) };
    return null;
  }

  plant(x, z, y = 0) {
    const inv = G.inventory;
    if (!inv.take('seed')) return;
    const era = G.era;
    const cc = chunkCoord(x, z);
    const key = 'plant@' + chunkKey(cc.ci, cc.cj);
    const effects = [];
    if (era < 1) effects.push({ era: 1, text: `the seed you planted in ${ERA_YEARS[era]} is a towering oak`, at: { x, z } });
    if (era < 2) effects.push({ era: 2, text: `your tree has become an ancient colossus`, at: { x, z } });
    const prev = G.chronicle.get(key, 2) || [];
    G.chronicle.set(key, [...prev, { x, z, y, era, v: Math.floor(Math.random() * 3) }], 0, { effects, cause: `Planted a seed (${ERA_YEARS[era]})` });
    G.audio.play('plant', G.player.pos);
    G.hud.toast(`Seed planted in ${ERA_YEARS[era]}. Time will do the rest.`, 'good');
    G.events.emit('planted', { x, z, era });
    if (G.progress) G.progress.addXP(10);
  }

  spray(h) {
    const era = G.era;
    const cc = chunkCoord(h.x, h.z);
    const key = 'tag@' + chunkKey(cc.ci, cc.cj);
    const effects = [];
    if (era < 1) effects.push({ era: 1, text: 'your tag is preserved under glass as "historic street art"', at: { x: h.x, z: h.z } });
    if (era < 2) effects.push({ era: 2, text: 'a faded echo of your tag survives on the ruins', at: { x: h.x, z: h.z } });
    const prev = G.chronicle.get(key, 2) || [];
    G.chronicle.set(key, [...prev, { x: h.x + h.nx * 0.02, y: h.y, z: h.z + h.nz * 0.02, nx: h.nx, nz: h.nz, era }], 0, { effects, cause: `Tagged a wall (${ERA_YEARS[era]})` });
    G.inventory.take('spray');
    G.audio.play('spray', G.player.pos);
    G.hud.toast('Tagged. Somebody will remember this.', 'good');
    if (G.progress) G.progress.addXP(5);
  }

  bury(x, z) {
    if (!G.inventory.take('capsule')) return;
    const era = G.era;
    const cash = Math.min(G.inventory.cash[era], 100);
    G.inventory.cash[era] -= cash;
    const cc = chunkCoord(x, z);
    const key = 'capsule@' + chunkKey(cc.ci, cc.cj);
    const id = `${Math.round(x)}_${Math.round(z)}_${era}`;
    const effects = [];
    for (let e = era + 1; e < 3; e++) effects.push({ era: e, text: `your time capsule has waited ${ERA_YEARS[e] - ERA_YEARS[era]} years underground`, at: { x, z } });
    const prev = G.chronicle.get(key, 2) || [];
    G.chronicle.set(key, [...prev, { x, z, era, id, cash }], 0, { effects, cause: `Buried a time capsule with ${cash} (${ERA_YEARS[era]})` });
    G.audio.play('plant', G.player.pos);
    G.hud.toast(`Time capsule buried with ${['$', '₡', '⚙'][era]}${cash}.`, 'good');
  }

  digCapsule(it) {
    const cp = it.data;
    const era = G.era;
    G.chronicle.set(`capsule.dug@${cp.id}`, true, era);
    // value appreciates with time: collector value / interest
    const years = ERA_YEARS[era] - ERA_YEARS[cp.era];
    const val = Math.round((cp.cash + 20) * Math.pow(1.045, years) * (era === 2 ? 0.05 : 1));
    G.inventory.addMoney(val, era);
    G.audio.play('pickup');
    G.hud.toast(`The capsule is rusted shut… inside: ${years}-year-old cash and a photo. Worth ${['$', '₡', '⚙'][era]}${val} now.`, 'good', 5);
  }
}
