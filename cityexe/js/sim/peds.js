// Pedestrian agents: the physical body of a citizen while outdoors on foot.
// Movement follows sidewalk-graph waypoints; crosswalks at signals wait for the
// right phase; pedestrians on crosswalks become obstacles cars stop for.
import { clamp, wrapAngle, dist, SpatialHash } from '../core/math.js';
import { rand } from '../core/rng.js';

let PID = 0;
export class Peds {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.byCid = new Map();
    this.hash = new SpatialHash(10);
    this.frame = 0;
    this._q = [];
  }

  spawn(c, x, z, h = 0) {
    let p = this.byCid.get(c.id);
    if (p) { p.x = x; p.z = z; return p; }
    p = {
      id: PID++, cid: c.id, x, z, y: 0, h, v: 0, speed: 1.25 + rand.float() * 0.35, path: null, wi: 0, lane: (rand.float() * 2 - 1) * 1.1,
      state: 'idle', onArrive: null, anim: rand.float() * 10, action: '', wait: 0, player: false, run: false, vx: 0, vz: 0,
      target: null, umbrella: false, fallen: 0, idleT: 0, radius: 0.45, lod: 0, acc: 0,
    };
    this.list.push(p);
    this.byCid.set(c.id, p);
    c.ped = p;
    return p;
  }

  despawn(p) {
    const i = this.list.indexOf(p);
    if (i >= 0) this.list.splice(i, 1);
    this.byCid.delete(p.cid);
    const c = this.world.citizens[p.cid];
    if (c && c.ped === p) c.ped = null;
    p.dead = true;
  }

  // walk to target point along sidewalks; final hop straight to (tx,tz)
  walkTo(p, tx, tz, onArrive, opts = {}) {
    const SW = this.world.sidewalks;
    const direct = opts.direct || dist(p.x, p.z, tx, tz) < 6;
    let path;
    if (direct) path = [{ x: tx, z: tz, gate: null }];
    else {
      const a = SW.nearestPoint(p.x, p.z), b = SW.nearestPoint(tx, tz);
      const mid = a && b ? SW.path(a, b) : null;
      path = [];
      if (a && dist(p.x, p.z, a.x, a.z) > 0.8) path.push({ x: a.x, z: a.z, gate: null });
      if (mid) path.push(...mid); else if (b) path.push({ x: b.x, z: b.z });
      path.push({ x: tx, z: tz, gate: null });
    }
    p.path = path; p.wi = 0;
    p.state = 'walk';
    p.onArrive = onArrive || null;
    p.run = !!opts.run;
    p.action = '';
    return true;
  }

  // walk straight to a series of free waypoints (e.g. inside the park)
  walkPoints(p, pts, onArrive, run = false) {
    p.path = pts.map(([x, z]) => ({ x, z, gate: null }));
    p.wi = 0; p.state = 'walk'; p.onArrive = onArrive || null; p.run = run; p.action = '';
  }

  stop(p, action = '') { p.path = null; p.state = 'idle'; p.action = action; p.onArrive = null; }

  gateOpen(g) {
    if (!g || g.group < 0) return true;
    const n = this.world.city.net.nodes[g.node];
    if (!n.signal || n.failed || !n.powered) return true;
    return n.signal.state[g.group] === 'R' && n.signal.state[1 - g.group] !== 'Y';
  }

  update(dt) {
    const W = this.world;
    this.frame++;
    this.hash.clear();
    const cam = W.focus;
    const rain = W.weather.precip > 0.25 && !W.weather.snowing;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      this.hash.insert(p, p.x, p.z);
      if (p.player) continue;
      // simulation LOD: far pedestrians tick less often with a larger step
      const d2 = (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2;
      p.lod = d2 > 260 * 260 ? 2 : d2 > 140 * 140 ? 1 : 0;
      const every = p.lod === 2 ? 4 : p.lod === 1 ? 2 : 1;
      p.acc += dt;
      if ((this.frame + p.id) % every !== 0) continue;
      const sdt = p.acc; p.acc = 0;
      p.umbrella = rain && (p.cid % 3 !== 0);
      this.step(p, sdt);
    }
  }

  step(p, dt) {
    const W = this.world;
    if (p.fallen > 0) { p.fallen -= dt; p.v = 0; return; }
    if (p.state === 'walk' && p.path) {
      const wp = p.path[p.wi];
      if (!wp) { this.arrive(p); return; }
      // waiting at a crosswalk?
      if (wp.gate && !p.crossing) {
        if (!this.gateOpen(wp.gate) && !p.run) { p.v = 0; p.waitCross = (p.waitCross || 0) + dt; if (p.waitCross < 60) { this.faceTo(p, wp.x, wp.z, dt); return; } }
        p.crossing = true; p.waitCross = 0;
      }
      const dx = wp.x - p.x, dz = wp.z - p.z;
      const d = Math.hypot(dx, dz);
      const last = p.wi === p.path.length - 1;
      // keep to the right side of the sidewalk
      let tx = wp.x, tz = wp.z;
      if (!last && d > 1.5) { tx += (-dz / d) * p.lane * 0.5; tz += (dx / d) * p.lane * 0.5; }
      const sp = p.run ? p.speed * 3.2 : p.speed * (W.weather.precip > 0.5 ? 1.15 : 1);
      p.v = sp;
      const ddx = tx - p.x, ddz = tz - p.z, dd = Math.hypot(ddx, ddz) || 1;
      const step = Math.min(sp * dt, d);
      p.x += (ddx / dd) * step;
      p.z += (ddz / dd) * step;
      const th = Math.atan2(ddx, ddz);
      p.h += wrapAngle(th - p.h) * Math.min(1, dt * 8);
      if (d < (last ? 0.25 : 0.9)) {
        p.wi++;
        p.crossing = false;
        if (p.wi >= p.path.length) this.arrive(p);
      }
      p.anim += dt * sp * 2.4;
      // pedestrians on crosswalks are obstacles for cars
      if (p.crossing) W.extraObstacles.push({ x: p.x, z: p.z, radius: 0.6, ped: p, y: 0 });
    } else {
      p.v = 0;
      p.anim += dt * 0.5;
    }
  }

  faceTo(p, x, z, dt) { const th = Math.atan2(x - p.x, z - p.z); p.h += wrapAngle(th - p.h) * Math.min(1, dt * 5); }

  arrive(p) {
    p.state = 'idle'; p.path = null; p.v = 0; p.run = false;
    const cb = p.onArrive; p.onArrive = null;
    if (cb) cb(p);
  }

  near(x, z, r) { return this.hash.query(x, z, r, this._q).filter((p) => dist(p.x, p.z, x, z) < r); }
}
