// Civilian traffic: lane-following cars that choose turns at intersections,
// queue behind each other, yield to the player and become physical wrecks
// when hit.
import * as THREE from 'three';
import { CITY, rng } from './city.js';
import { buildCar } from '../../vehicles/carModel.js';
import { CarBody, HANDLING, collideCars } from '../../vehicles/carPhysics.js';
import { placeWarped } from './warp.js';

const LANES = [3.4, 9.4];
const COLORS = [0x2a2c30, 0xd8d8d2, 0x6f7479, 0x1d2e4a, 0x5e1a1a, 0x2f4a3a, 0x9a8a70, 0x101010, 0xb0b4b8, 0x3a2a4a];
const TYPES = ['sedan', 'sedan', 'hatch', 'hatch', 'van', 'sedan'];

/** Point on a lane: street axis 'z' (N-S street at x=i*P) or 'x' (E-W at z=j*P). */
function lanePos(axis, line, dir, lane, along) {
  const { P } = CITY;
  const off = LANES[lane];
  if (axis === 'z') return new THREE.Vector3(line * P - dir * off, 0, along);
  return new THREE.Vector3(along, 0, line * P + dir * off);
}

export class Traffic {
  constructor(scene, { count = 26 } = {}) {
    this.scene = scene; this.count = count; this.cars = [];
    this.R = rng(42);
    // pre-build a few templates per type/colour combination, then clone (shares geometry)
    this.templates = [];
    for (let i = 0; i < 8; i++) {
      const type = TYPES[i % TYPES.length];
      this.templates.push(buildCar(type, { color: COLORS[i % COLORS.length], wheelStyle: i % 3 === 0 ? 'steel' : 'twin', exhaust: false, dirt: 0.5, taxiSign: i === 5, chips: 80 }));
    }
    for (let i = 0; i < count; i++) {
      const tpl = this.templates[i % this.templates.length];
      const mesh = tpl.clone(true);
      // clones share materials; keep body references
      mesh.body = mesh.children[0]; mesh.def = tpl.def; mesh.halfExtents = tpl.halfExtents;
      mesh.wheels = tpl.wheels.map((w) => { const steer = mesh.children[tpl.children.indexOf(w.steer)]; return { ...w, steer, spin: steer.children[0] }; });
      mesh.visible = false; scene.add(mesh);
      const body = new CarBody(mesh, { ...HANDLING.traffic });
      this.cars.push({ mesh, body, active: false, wp: [], speed: 12, axis: 'z', line: 0, dir: 1, lane: 0, wreck: 0, honk: 0 });
    }
  }

  spawnNear(c, player, minD = 140, maxD = 260) {
    const { P, N } = CITY;
    for (let tries = 0; tries < 12; tries++) {
      const axis = this.R() < 0.5 ? 'z' : 'x';
      const line = Math.floor(this.R() * (N + 1));
      const dir = this.R() < 0.5 ? 1 : -1;
      const lane = this.R() < 0.5 ? 0 : 1;
      const along = (Math.floor(this.R() * N) + 0.5) * P + (this.R() - 0.5) * P * 0.5;
      const p = lanePos(axis, line, dir, lane, along);
      const d = p.distanceTo(player.pos);
      if (d < minD || d > maxD) continue;
      if (this.cars.some((o) => o.active && o.body.pos.distanceToSquared(p) < 400)) continue;
      Object.assign(c, { active: true, axis, line, dir, lane, wreck: 0, speed: 10 + this.R() * 6, wp: [] });
      const yaw = axis === 'z' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      c.body.place(p.x, p.z, yaw); c.body.kinematic = true; c.body.vel.set(Math.sin(yaw) * c.speed, 0, Math.cos(yaw) * c.speed);
      c.body.enabled = true;
      c.mesh.visible = true;
      this.planNext(c);
      return true;
    }
    return false;
  }

  /** Append waypoints to the next intersection and through it. */
  planNext(c) {
    const { P, N } = CITY;
    const pos = c.body.pos;
    const along = c.axis === 'z' ? pos.z : pos.x;
    let nextI = c.dir > 0 ? Math.ceil(along / P + 0.05) : Math.floor(along / P - 0.05);
    nextI = Math.max(0, Math.min(N, nextI));
    const centre = nextI * P;
    const stop = centre - c.dir * (CITY.HALF + 3);
    c.wp.push(lanePos(c.axis, c.line, c.dir, c.lane, stop));
    // choose: straight / right / left, staying inside the grid
    const options = ['s', 's', 's', 'r', 'l'];
    let choice = options[Math.floor(this.R() * options.length)];
    const edge = (v) => v <= 0 || v >= N;
    if (choice === 's' && edge(nextI) && (nextI === 0 ? c.dir < 0 : c.dir > 0)) choice = 'r';
    if (choice !== 's') {
      // right turn: new heading is the old rotated clockwise (seen from above)
      const nAxis = c.axis === 'z' ? 'x' : 'z';
      let nDir;
      if (c.axis === 'z') nDir = choice === 'r' ? -c.dir : c.dir; else nDir = choice === 'r' ? c.dir : -c.dir;
      const nLine = nextI;
      const curLine = c.line;
      // stay in grid
      const newAlongStart = curLine * P;
      const exit = lanePos(nAxis, nLine, nDir, c.lane, newAlongStart + nDir * (CITY.HALF + 3));
      const entry = c.wp[c.wp.length - 1];
      const corner = c.axis === 'z' ? new THREE.Vector3(entry.x, 0, exit.z) : new THREE.Vector3(exit.x, 0, entry.z);
      const mid = entry.clone().lerp(corner, 0.5).lerp(exit.clone().lerp(corner, 0.5), 0.5);
      if ((nDir > 0 && curLine >= N) || (nDir < 0 && curLine <= 0)) { choice = 's'; }
      else {
        c.wp.push(mid, exit);
        Object.assign(c, { axis: nAxis, line: nLine, dir: nDir });
        return;
      }
    }
    c.wp.push(lanePos(c.axis, c.line, c.dir, c.lane, centre + c.dir * (CITY.HALF + 3)));
  }

  update(dt, player, ctx) {
    const pp = player.pos;
    for (const c of this.cars) {
      if (!c.active) { if (this.R() < 0.05) this.spawnNear(c, player); continue; }
      const d = c.body.pos.distanceTo(pp);
      if (d > 330 || (c.wreck > 0 && (c.wreck -= dt) <= 0 && d > 60)) { c.active = false; c.mesh.visible = false; c.body.enabled = false; continue; }
      if (!c.body.kinematic) {
        // a wreck: physics with brakes on
        c.body.input = { throttle: 0, brake: 0.6, steer: 0, handbrake: 1, nitro: 0 };
        c.body.update(dt, null);
        placeWarped(c.mesh, c.body.pos, c.body.yaw, c.body.pitch, c.body.roll);
        continue;
      }
      // follow waypoints
      let target = c.wp[0];
      if (!target) { this.planNext(c); target = c.wp[0]; }
      if (target && target.distanceToSquared(c.body.pos) < 9) { c.wp.shift(); if (c.wp.length < 2) this.planNext(c); target = c.wp[0]; }
      // car-following: slow for anything ahead in our path
      let want = c.speed;
      const f = c.body.forward;
      const check = (op, isPlayer) => {
        const dx = op.x - c.body.pos.x, dz = op.z - c.body.pos.z;
        const ahead = dx * f.x + dz * f.z, lat = Math.abs(dx * f.z - dz * f.x);
        if (ahead > 0 && ahead < 26 && lat < 2.6) want = Math.min(want, Math.max(0, (ahead - 7) * 0.8));
        if (isPlayer && ahead > 0 && ahead < 20 && lat < 3 && c.honk <= 0) { c.honk = 4; ctx?.honk?.(c.body.pos); }
      };
      for (const o of this.cars) if (o !== c && o.active) check(o.body.pos, false);
      check(pp, true);
      c.honk -= dt;
      if (c.yieldT > 0) { c.yieldT -= dt; want = 0; }
      c.body.kinematicMove(dt, target, want, null);
      placeWarped(c.mesh, c.body.pos, c.body.yaw, c.body.pitch, 0);
    }
    this.separate();
  }

  /** Traffic never overlaps itself: separate pairs and make the one behind wait. */
  separate() {
    const list = this.cars.filter((c) => c.active);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.body.pos.distanceToSquared(b.body.pos) > 49) continue;
      if (!collideCars(a.body, b.body, 0.1) && a.body.pos.distanceToSquared(b.body.pos) > 16) continue;
      // whoever is heading into the other yields
      const ab = b.body.pos.clone().sub(a.body.pos);
      const aInto = a.body.forward.dot(ab) > 0, bInto = b.body.forward.dot(ab.negate()) > 0;
      if (aInto) a.yieldT = 1.2; if (bInto && !aInto) b.yieldT = 1.2;
    }
  }

  /** Convert to a free physics body (after an impact). */
  wreck(c) { if (!c.body.kinematic) return; c.body.kinematic = false; c.wreck = 9; }

  get active() { return this.cars.filter((c) => c.active); }
  hideAll() { for (const c of this.cars) { c.active = false; c.mesh.visible = false; } }
}
