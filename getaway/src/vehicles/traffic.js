// GETAWAY! — traffic: lane following on the road graph, signals, car-following, yielding, turn signals,
// panic & flee behavior, honking, stuck recovery, streaming spawn/despawn and parked cars.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, pick, chance, wrapAngle, dist2XZ } from '../core/utils.js';
import { signal } from '../world/signals.js';
import { TRAFFIC_MIX } from './types.js';
import { HR } from '../world/layout.js';

const _t = new THREE.Vector3();
export function laneOffset(e, lane) { return e.kind === 'hwy' ? 2.3 + lane * 3.6 : e.kind === 'res' ? 2.0 : 1.75 + lane * 3.5; }
// point on edge polyline at distance s, offset to the right by `off`
export function edgePoint(e, s, off, out = _t) {
  const P = e.pts; let acc = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i]; const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (s <= acc + L || i === P.length - 1) {
      const t = clamp((s - acc) / (L || 1), 0, 1.5); const dx = b.x - a.x, dz = b.z - a.z; const hl = Math.hypot(dx, dz) || 1;
      const rx = -dz / hl, rz = dx / hl; // right of travel
      return out.set(a.x + dx * t + rx * off, a.y + (b.y - a.y) * Math.min(1, t), a.z + dz * t + rz * off);
    }
    acc += L;
  }
  return out.set(P[0].x, P[0].y, P[0].z);
}
export function edgeDir(e, s) { const P = e.pts; let acc = 0; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; const L = Math.hypot(b.x - a.x, b.z - a.z); if (s <= acc + L || i === P.length - 1) return Math.atan2(b.x - a.x, b.z - a.z); acc += L; } return 0; }
// project world xz onto edge -> s
export function projectS(e, x, z) {
  const P = e.pts; let acc = 0, best = 1e9, bs = 0;
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; const dx = b.x - a.x, dz = b.z - a.z; const L2 = dx * dx + dz * dz; const L = Math.sqrt(L2); const L3 = Math.hypot(dx, b.y - a.y, dz); const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (L2 || 1), 0, 1); const px = a.x + dx * t, pz = a.z + dz * t; const d = (x - px) ** 2 + (z - pz) ** 2; if (d < best) { best = d; bs = acc + t * L3; } acc += L3; }
  return bs;
}
// steering/throttle toward a point at a desired speed
export function driveTo(v, tx, tz, speed, { aggressive = false, reverseOk = true } = {}) {
  const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const dx = tx - v.pos.x, dz = tz - v.pos.z;
  const fwd = dx * s + dz * c, lat = dx * c - dz * s; const ang = Math.atan2(lat, fwd);
  const ctrl = v.ctrl; const dist = Math.hypot(dx, dz);
  if (fwd < -2 && dist < 18 && reverseOk && Math.abs(ang) > 2.2) { ctrl.steer = clamp(ang * 1.5, -1, 1); ctrl.throttle = 0; ctrl.brake = 0.8; ctrl.handbrake = false; return ang; }
  ctrl.steer = clamp(-ang * (aggressive ? 2.6 : 2.0), -1, 1);
  const turnSlow = Math.abs(ang) > 0.5 ? clamp(1.25 - Math.abs(ang) * 0.5, 0.35, 1) : 1;
  const tgt = speed * turnSlow; const err = tgt - v.vF;
  ctrl.throttle = clamp(err * (aggressive ? 0.6 : 0.35), 0, 1); ctrl.brake = err < -1.5 ? clamp(-err * 0.18, 0, 1) : 0; ctrl.handbrake = aggressive && Math.abs(ang) > 1.1 && v.speed > 14;
  return ang;
}

export class TrafficAI {
  constructor(v, edge, lane, s) { this.v = v; this.edge = edge; this.lane = lane; this.s = s; this.next = null; this.state = 'drive'; this.stuckT = 0; this.honkT = 0; this.panicT = 0; this.speedMul = rand(0.85, 1.08); this.v.ai = this; this.kind = 'traffic'; }
  chooseNext(graph) {
    const node = graph.nodes[this.edge.b]; const outs = node.out.map((id) => graph.edges[id]).filter((e) => !(e.b === this.edge.a && e.pts.length === 2 && node.out.length > 1));
    if (!outs.length) return graph.edges[node.out[0]] || null;
    const h0 = edgeDir(this.edge, this.edge.len - 1);
    const w = outs.map((e) => { const d = Math.abs(wrapAngle(edgeDir(e, 1) - h0)); return d < 0.3 ? 3 : d > 2.8 ? 0.05 : 1; });
    let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < outs.length; i++) { r -= w[i]; if (r <= 0) return outs[i]; } return outs[0];
  }
  update(dt, graph) {
    const v = this.v; if (v.dead || v.mode !== 'drive' || v.flipped) { v.ctrl.throttle = 0; v.ctrl.brake = 1; v.hazard = !v.dead; return; }
    if (this.state === 'abandoned') { v.ctrl.throttle = 0; v.ctrl.brake = 0.3; v.ctrl.steer = 0; return; }
    if (this.state === 'stopped') { v.ctrl.throttle = 0; v.ctrl.brake = 1; v.hazard = true; this.stopT -= dt; if (this.stopT <= 0) { this.state = 'drive'; v.hazard = false; } return; }
    const e = this.edge; this.s = projectS(e, v.pos.x, v.pos.z);
    if (!this.next && this.s > e.len - 45) { this.next = this.chooseNext(graph); if (this.next) { this.lane = Math.min(this.lane, this.next.lanes - 1); const turn = wrapAngle(edgeDir(this.next, 1) - edgeDir(e, e.len - 1)); v.indicator = Math.abs(turn) < 0.3 ? 0 : turn > 0 ? -1 : 1; } }
    if (this.next && this.s >= e.len - (graph.nodes[e.b].kind === 'isect' ? HR * 0.6 : 2)) { this.edge = this.next; this.next = null; this.s = projectS(this.edge, v.pos.x, v.pos.z); setTimeout(() => { v.indicator = 0; }, 2500); }
    const ed = this.edge; const off = laneOffset(ed, this.lane);
    const panic = this.panicT > 0; if (panic) this.panicT -= dt;
    let speed = ed.speed * this.speedMul * (panic ? 1.5 : 1);
    // look-ahead target
    const look = clamp(6 + v.speed * 0.55, 6, 26); let ts = this.s + look;
    let tgt;
    if (ts > ed.len && this.next) tgt = edgePoint(this.next, ts - ed.len, laneOffset(this.next, this.lane), new THREE.Vector3());
    else tgt = edgePoint(ed, Math.min(ts, ed.len), off, new THREE.Vector3());
    // signals / yield at end of edge
    const node = graph.nodes[ed.b]; const toEnd = ed.len - this.s - HR - 1.5;
    if (node.kind === 'isect' && toEnd > -1) {
      const last = ed.pts[ed.pts.length - 1], prev = ed.pts[ed.pts.length - 2]; const axis = Math.abs(last.x - prev.x) > Math.abs(last.z - prev.z) ? 'ew' : 'ns';
      const sig = signal(node, axis, G.time);
      if (!panic && (sig === 'r' || (sig === 'y' && toEnd > 8))) speed = Math.min(speed, Math.max(0, Math.sqrt(Math.max(0, 2 * 5 * (toEnd - 0.5)))));
      if (!node.light && toEnd < 18) speed = Math.min(speed, 7);
      if (this.next && Math.abs(wrapAngle(edgeDir(this.next, 1) - edgeDir(ed, ed.len - 1))) > 0.6 && toEnd < 25) speed = Math.min(speed, 8);
    }
    // rail crossing gate
    if (G.trains && G.trains.blocking(v.pos.x, v.pos.z, Math.sin(v.yaw), Math.cos(v.yaw))) speed = 0;
    // car following / obstacles
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw); let gap = 99, otherSp = 0;
    const near = G.vehicles.query(v.pos.x + s * 15, v.pos.z + c * 15, 18, this._n || (this._n = []));
    for (const o of near) { if (o === v) continue; const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z; const f = dx * s + dz * c, l = dx * c - dz * s; if (f < 1 || f > 32 || Math.abs(l) > 2.3 + o.spec.W * 0.3) continue; const g2 = f - (v.spec.L + o.spec.L) / 2; if (g2 < gap) { gap = g2; otherSp = o.vel.x * s + o.vel.z * c; this.blocker = o; } }
    if (G.peds) { const pg = G.peds.obstacleAhead(v, 20); if (pg < gap) { gap = pg; otherSp = 0; this.blocker = 'ped'; } }
    if (G.player && !G.player.vehicle) { const p = G.player.pos; const dx = p.x - v.pos.x, dz = p.z - v.pos.z; const f = dx * s + dz * c, l = dx * c - dz * s; if (f > 0 && f < 20 && Math.abs(l) < 1.8) { const g2 = f - v.spec.L / 2 - 0.5; if (g2 < gap) { gap = g2; otherSp = 0; this.blocker = 'player'; } } }
    if (gap < 99) speed = Math.min(speed, Math.max(0, otherSp + (gap - 3.5) * 0.7));
    if (gap < 2.5) speed = 0;
    driveTo(v, tgt.x, tgt.z, speed, { aggressive: panic, reverseOk: false });
    if (gap < 3 && v.speed < 1) { v.ctrl.throttle = 0; v.ctrl.brake = 1; }
    // stuck handling & honking
    if (v.speed < 0.6 && speed < 0.5 && gap < 6) { this.stuckT += dt; if (this.stuckT > 4 && this.honkT <= 0 && (this.blocker === 'player' || (this.blocker && this.blocker.isPlayer))) { this.honkT = rand(1.2, 3); if (G.audio) G.audio.horn(v.pos, rand(0.2, 0.6), v.spec.mass > 4000 ? 0.7 : 1); } }
    else this.stuckT = 0; this.honkT -= dt;
    if (this.stuckT > 14 && this.blocker && this.blocker !== 'ped') { v.ctrl.throttle = 0; v.ctrl.brake = 0.7; v.ctrl.steer = 0.6; if (this.stuckT > 17) this.stuckT = 0; }
  }
  onHit(by, imp) { if (imp > 6 && this.state === 'drive') { this.state = 'stopped'; this.stopT = rand(3, 7); if (G.audio && chance(0.6)) setTimeout(() => G.audio.horn(this.v.pos, 0.8), 600); } }
  panic(t = 8) { this.panicT = Math.max(this.panicT, t); }
}

export class Traffic {
  constructor(world) {
    this.world = world; this.graph = world.graph; this.cars = []; this.parked = []; this.target = 34; this.parkTarget = 22; this.t = 0; this.enabled = true; this.density = 1;
    this.roads = world.graph.live.filter((e) => !e.tunnel || true);
    G.on('gunshot', (p) => this.scare(p, 50)); G.on('explosion', (p) => this.scare(p, 90));
    G.on('vehicleCollision', (a, b, imp) => { if (a.ai && a.ai.onHit) a.ai.onHit(b, imp); if (b.ai && b.ai.onHit) b.ai.onHit(a, imp); });
  }
  scare(p, r) { for (const v of this.cars) if (v.ai && v.pos.distanceTo(p) < r) v.ai.panic(rand(6, 12)); }
  update(dt) {
    const P = G.player ? G.player.focus : null; if (!P) return;
    for (const v of this.cars) if (v.ai && !v.removed) v.ai.update(dt, this.graph);
    this.t -= dt; if (this.t > 0) return; this.t = 0.4;
    const cam = G.camera; const camDir = cam.getWorldDirection(_t.clone());
    const visible = (p) => { const dx = p.x - cam.position.x, dz = p.z - cam.position.z; const d = Math.hypot(dx, dz) || 1; return (dx * camDir.x + dz * camDir.z) / d > 0.35; };
    // despawn
    for (const v of [...this.cars]) {
      if (v.removed || v.isPlayer || v.keep) { if (v.removed || v.isPlayer || v.ai?.kind !== 'traffic') this.cars.splice(this.cars.indexOf(v), 1); continue; }
      const d = v.pos.distanceTo(P);
      if ((d > 300 && (!visible(v.pos) || d > 420)) || (v.wreck && d > 140 && !visible(v.pos)) || (v.ai && v.ai.stuckT > 30 && !visible(v.pos))) { this.cars.splice(this.cars.indexOf(v), 1); G.vehicles.remove(v); }
    }
    for (const v of [...this.parked]) { if (v.removed || v.isPlayer || !v.parked || v.keep) { this.parked.splice(this.parked.indexOf(v), 1); continue; } if (v.pos.distanceTo(P) > 220 && !visible(v.pos)) { this.parked.splice(this.parked.indexOf(v), 1); G.vehicles.remove(v); } }
    if (!this.enabled) return;
    // spawn moving traffic
    const want = Math.round(this.target * this.density * (G.settings ? G.settings.trafficDensity : 1));
    const fill = this.fillNow; this.fillNow = false;
    for (let tries = 0; tries < (fill ? 4000 : 40) && this.cars.length < want; tries++) {
      const e = pick(this.roads); const s = rand(10, Math.max(12, e.len - 20)); const lane = (Math.random() * e.lanes) | 0;
      const p = edgePoint(e, s, laneOffset(e, lane), new THREE.Vector3()); const d = Math.hypot(p.x - P.x, p.z - P.z);
      if (fill ? (d < 25 || d > 230) : (d < 110 || d > 260 || (visible(p) && d < 200))) continue;
      if (G.vehicles.query(p.x, p.z, 10, []).length) continue;
      const mix = TRAFFIC_MIX[e.kind === 'hwy' ? 'hwy' : e.kind === 'res' ? 'res' : 'city'];
      const v = G.vehicles.spawn(pick(mix), { x: p.x, y: p.y, z: p.z, yaw: edgeDir(e, s) });
      v.pos.y = this.world.static.groundAt(p.x, p.z, p.y + 1, 0.5).h; v.vel.set(Math.sin(v.yaw), 0, Math.cos(v.yaw)).multiplyScalar(e.speed * 0.7);
      new TrafficAI(v, e, lane, s); v.hasDriver = true; this.cars.push(v);
    }
    // parked cars
    for (let tries = 0; tries < (fill ? 3000 : 30) && this.parked.length < this.parkTarget * this.density; tries++) {
      {
        const sp = pick(this.world.parking); if (!sp || sp.taken) continue; const d = Math.hypot(sp.x - P.x, sp.z - P.z); if (d < (fill ? 12 : 40) || d > 170) continue;
        if (!fill && visible(sp) && d < 120) continue;
        const type = sp.police ? 'police' : pick(['sedan', 'hatch', 'sedan', 'pickup', 'suv', 'muscle', 'van', 'saetta', 'moto', 'hatch', 'taxi']);
        const y = sp.y ?? this.world.static.groundAt(sp.x, sp.z, 50, 0).h;
        const v = G.vehicles.spawn(type, { x: sp.x, y, z: sp.z, yaw: sp.yaw + rand(-0.04, 0.04), parked: true }); v.parkSpot = sp; sp.taken = true; v.onRemoved = () => { sp.taken = false; };
        this.parked.push(v);
      }
    }
  }
  populate() { this.fillNow = true; this.t = 0; }
  clear() { for (const v of [...this.cars, ...this.parked]) if (!v.isPlayer && !v.keep) G.vehicles.remove(v); this.cars = []; this.parked = []; for (const sp of this.world.parking) sp.taken = false; }
}
