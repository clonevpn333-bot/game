// Contained story levels: enclosed, hand-designed spaces that exist in all
// three eras (each era its own geometry) and are solved by shifting time.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { ChunkGeo } from '../world/geo.js';
import { Collider, CF, SURF } from '../world/collision.js';
import { LAYER as Ly } from '../world/textures.js';
import { placeProp } from '../world/props.js';

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const KINDS = ['uber', 'ground', 'foliage', 'grass', 'emissive', 'glass', 'holo', 'sign'];

export class Level {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.o = new THREE.Vector3(...def.origin);
    this.flags = {};
    this.eraData = [null, null, null];
    this.active = false;
    this.hazards = [[], [], []];
    this.t = 0;
  }

  // world position from local
  W(x, y, z) { return new THREE.Vector3(this.o.x + x, this.o.y + y, this.o.z + z); }

  setFlag(k, v = true) {
    if (this.flags[k] === v) return;
    this.flags[k] = v;
    this.rebuild();
  }

  enter(onDone) {
    this.onDone = onDone;
    this.ret = { x: G.player.pos.x, y: G.player.pos.y, z: G.player.pos.z, era: G.era, yaw: G.player.yaw };
    this.active = true;
    G.level = this;
    G.world.hidden = true;
    G.world.setEraVisible([]);
    for (let e = 0; e < 3; e++) this.build(e);
    const s = this.def.spawn;
    const p = this.W(s[0], s[1], s[2]);
    if (G.era !== this.def.startEra) { G.shift.start(this.def.startEra); G.shift.t = 99; }
    G.player.teleport(p.x, p.y + 0.2, p.z, s[3] || 0);
    G.cam.yaw = s[3] || 0;
    G.cam.initialized = false;
    // clear the open-world population while inside
    for (const n of G.crowd.npcs) if (!n.persistent) n.alive = false;
    for (const v of G.vehicles.list.slice()) G.vehicles.remove(v);
    G.authority.clear(0); G.authority.clear(1); G.authority.clear(2);
    G.hud.showBanner(this.def.name.toUpperCase(), this.def.sub || '', 3.5);
    if (this.def.onEnter) this.def.onEnter(this);
  }

  exit(returnTo = null) {
    for (let e = 0; e < 3; e++) this._dispose(e);
    this.active = false;
    G.level = null;
    G.world.hidden = false;
    const r = returnTo || this.ret;
    if (G.era !== r.era) { G.shift.start(r.era); G.shift.t = 99; }
    G.world.setEraVisible([G.era]);
    G.player.teleport(r.x, r.y + 0.3, r.z, r.yaw || 0);
    G.cam.initialized = false;
    for (const n of G.crowd.npcs) if (n.levelNpc) n.alive = false;
    G.combat.drones.forEach((d) => { if (d.levelUnit) d.removeMe = true; });
    if (this.def.onExit) this.def.onExit(this);
  }

  _dispose(e) {
    const d = this.eraData[e];
    if (!d) return;
    for (const c of d.colliders) G.collision.remove(e, c);
    d.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    d.group.parent && d.group.parent.remove(d.group);
    for (const it of d.interacts) G.interact.removeDynamic(it);
    this.eraData[e] = null;
    this.hazards[e] = [];
  }

  rebuild() { for (let e = 0; e < 3; e++) { this._dispose(e); this.build(e); } }

  build(era) {
    const geo = new ChunkGeo();
    const data = { group: new THREE.Group(), colliders: [], interacts: [] };
    const L = this;
    const o = this.o;
    const ctx = {
      era, geo, facts: G.chronicle, signs: G.chunks.signs, lights: [], parking: [], spawns: [], interact: [], lanes: [],
      collider: (x0, y0, z0, x1, y1, z1, flags = CF.SOLID, surf = SURF.concrete) => {
        const c = new Collider(x0, y0, z0, x1, y1, z1, flags, surf);
        data.colliders.push(c);
        return c;
      },
      tree: () => {},
    };
    const api = {
      era, flags: this.flags, ctx,
      box(x0, y0, z0, x1, y1, z1, opt = {}) {
        const kind = opt.kind || 'uber';
        const col = opt.col || C('#b8b4ac');
        const m = opt.m || [opt.layer ?? Ly.concrete, opt.style ?? -1, opt.seed || 0, opt.w || 3];
        geo.get(kind).box(o.x + x0, o.y + y0, o.z + z0, o.x + x1, o.y + y1, o.z + z1, col, m, { topM: opt.topM, topCol: opt.topCol, vBase: o.y });
        if (opt.collide !== false && kind !== 'holo' && kind !== 'emissive') ctx.collider(o.x + x0, o.y + y0, o.z + z0, o.x + x1, o.y + y1, o.z + z1, opt.flags || CF.SOLID, opt.surf ?? SURF.concrete);
      },
      // floor slab + four walls (with gaps) + optional ceiling
      room(x0, z0, x1, z1, h, opt = {}) {
        const wl = opt.wall ?? Ly.concrete, wc = opt.wallCol || C('#a8a49c');
        const t = 0.4;
        if (!opt.noFloor) api.box(x0, -0.4, z0, x1, 0, z1, { layer: opt.floor ?? Ly.concrete, col: opt.floorCol || C('#c8c4bc') });
        if (opt.ceiling !== false) api.box(x0, h, z0, x1, h + 0.4, z1, { layer: opt.ceilLayer ?? Ly.concrete, col: opt.ceilCol || C('#8a8680') });
        const gaps = opt.gaps || {};
        const wall = (side, a0, a1) => {
          const g = gaps[side];
          const seg = (s0, s1, y0 = 0, y1 = h) => {
            if (s1 - s0 < 0.05) return;
            if (side === 'n') api.box(s0, y0, z0 - t, s1, y1, z0, { layer: wl, col: wc, style: opt.style, w: opt.floorH });
            if (side === 's') api.box(s0, y0, z1, s1, y1, z1 + t, { layer: wl, col: wc, style: opt.style, w: opt.floorH });
            if (side === 'w') api.box(x0 - t, y0, s0, x0, y1, s1, { layer: wl, col: wc, style: opt.style, w: opt.floorH });
            if (side === 'e') api.box(x1, y0, s0, x1 + t, y1, s1, { layer: wl, col: wc, style: opt.style, w: opt.floorH });
          };
          if (!g) { seg(a0, a1); return; }
          seg(a0, g[0]); seg(g[1], a1);
          seg(g[0], g[1], g[2] || 4, h);
        };
        wall('n', x0, x1); wall('s', x0, x1); wall('w', z0, z1); wall('e', z0, z1);
      },
      prop(name, x, y, z, yaw = 0, s = 1, opts = {}) { placeProp(ctx, name, o.x + x, o.y + y, o.z + z, yaw, s, null, opts); },
      glow(x0, y0, z0, x1, y1, z1, col, pat = 0) { geo.get('emissive').box(o.x + x0, o.y + y0, o.z + z0, o.x + x1, o.y + y1, o.z + z1, col, [0, pat, Math.random(), 0]); },
      holo(x0, y0, z0, x1, y1, z1, col) { geo.get('holo').box(o.x + x0, o.y + y0, o.z + z0, o.x + x1, o.y + y1, o.z + z1, col, [0, 3, 0.3, 0]); },
      light(x, y, z, color = 0xffd8a0, intensity = 30, dist = 22) {
        const l = new THREE.PointLight(color, intensity, dist, 1.6);
        l.position.set(o.x + x, o.y + y, o.z + z);
        data.group.add(l);
        geo.get('emissive').box(o.x + x - 0.4, o.y + y + 0.1, o.z + z - 0.4, o.x + x + 0.4, o.y + y + 0.18, o.z + z + 0.4, new THREE.Color(color).toArray().map((v) => v * 4), [0, 0, 0, 0]);
      },
      interact(x, y, z, r, id, label, cond) {
        const it = G.interact.addDynamic({ x: o.x + x, y: o.y + y, z: o.z + z, r, id, label, era, levelCond: cond });
        data.interacts.push(it);
        return it;
      },
      hazard(x0, z0, x1, z1, y0, y1, dps, label) { L.hazards[era].push({ x0: o.x + x0, z0: o.z + z0, x1: o.x + x1, z1: o.z + z1, y0: o.y + y0, y1: o.y + y1, dps, label }); },
      water(x0, z0, x1, z1, y, col = [0.2, 0.5, 0.6]) {
        geo.get('glass').quad([o.x + x0, o.y + y, o.z + z1], [o.x + x1, o.y + y, o.z + z1], [o.x + x1, o.y + y, o.z + z0], [o.x + x0, o.y + y, o.z + z0], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, [0, -1, 0, 0]);
      },
    };
    this.def.build(api, era, this.flags);
    // meshes
    const set = G.mats.sets[era];
    for (const kind of KINDS) {
      const gb = geo.b[kind];
      if (!gb || gb.empty) continue;
      const g = gb.build();
      if (!g || !set[kind]) continue;
      const mesh = new THREE.Mesh(g, set[kind]);
      mesh.castShadow = kind === 'uber';
      mesh.receiveShadow = true;
      if (kind === 'glass' || kind === 'holo') mesh.renderOrder = 2;
      data.group.add(mesh);
    }
    for (const c of data.colliders) G.collision.add(era, c);
    G.chunks.eraRoots[era].add(data.group);
    this.eraData[era] = data;
  }

  update(dt) {
    this.t += dt;
    const p = G.player;
    for (const h of this.hazards[G.era]) {
      if (p.pos.x > h.x0 && p.pos.x < h.x1 && p.pos.z > h.z0 && p.pos.z < h.z1 && p.pos.y > h.y0 && p.pos.y < h.y1) {
        p.damage(h.dps * dt, null, 'hazard');
        if (G.frame % 30 === 0 && h.label) G.hud.toast(h.label, 'warn', 1.2);
      }
    }
    if (p.pos.y < this.o.y - 20) {
      const s = this.def.checkpoint || this.def.spawn;
      const w = this.W(s[0], s[1], s[2]);
      p.teleport(w.x, w.y + 0.5, w.z, s[3] || 0);
      p.damage(15, null, 'fall');
    }
    if (this.def.update) this.def.update(this, dt);
  }

  local(v = G.player.pos) { return new THREE.Vector3(v.x - this.o.x, v.y - this.o.y, v.z - this.o.z); }
}

export { C };
