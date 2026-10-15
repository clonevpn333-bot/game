// Road network: nodes (intersections), roads (centerlines), directed lanes,
// connectors through intersections, signal control, curb parking and routing.
// Lanes and connectors are both "links": vehicles live on a link at distance s.
import { C } from './config.js';
import { makePolyline, samplePolyline, quadBezierPoints, segmentsIntersect, MinHeap, clamp } from '../core/math.js';

const tmp = { x: 0, z: 0, h: 0 };

function offsetPoints(pts, off) {
  // offset to the right of travel direction: right = (-dz, dx)
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    let dx = 0, dz = 0;
    if (i > 0) { dx += pts[i][0] - pts[i - 1][0]; dz += pts[i][1] - pts[i - 1][1]; }
    if (i < n - 1) { dx += pts[i + 1][0] - pts[i][0]; dz += pts[i + 1][1] - pts[i][1]; }
    const L = Math.hypot(dx, dz) || 1;
    dx /= L; dz /= L;
    out.push([pts[i][0] - dz * off, pts[i][1] + dx * off]);
  }
  return out;
}

function trimPoints(pts, t0, t1) {
  // trim t0 meters from start and t1 from end
  const pl = makePolyline(pts);
  const L = pl.length;
  const a = clamp(t0, 0, L * 0.45), b = clamp(L - t1, L * 0.55, L);
  const out = [];
  samplePolyline(pl, a, tmp); out.push([tmp.x, tmp.z]);
  for (let i = 1; i < pl.n - 1; i++) if (pl.cum[i] > a && pl.cum[i] < b) out.push([pl.pts[i * 2], pl.pts[i * 2 + 1]]);
  samplePolyline(pl, b, tmp); out.push([tmp.x, tmp.z]);
  return { pts: out, a, b, L };
}

export class RoadNetwork {
  constructor() {
    this.nodes = [];
    this.roads = [];
    this.links = []; // lanes + connectors
    this.lanes = [];
    this.connectors = [];
    this.slots = [];
  }

  addNode(x, z, opts = {}) {
    const n = { id: this.nodes.length, x, z, y: opts.y || 0, kind: opts.kind || 'grid', control: opts.control || 'stop', arms: [], inLanes: [], outLanes: [], connectors: [], trim: opts.trim ?? 9, gi: opts.gi, gj: opts.gj, signal: null, failed: false, powered: true, district: opts.district || null, name: opts.name || '' };
    this.nodes.push(n);
    return n;
  }

  addRoad(a, b, opts = {}) {
    const A = this.nodes[a], B = this.nodes[b];
    const pts = opts.pts || [[A.x, A.z], [B.x, B.z]];
    const ys = opts.ys || pts.map((_, i) => A.y + (B.y - A.y) * (i / (pts.length - 1)));
    const r = { id: this.roads.length, a, b, pts, ys, kind: opts.kind || 'street', speed: opts.speed || 13, oneway: !!opts.oneway, name: opts.name || '', width: opts.width || C.ROAD_W, lanes: [], parking: opts.parking !== false, blockL: opts.blockL || null, blockR: opts.blockR || null, damaged: 0 };
    this.roads.push(r);
    A.arms.push(r.id); B.arms.push(r.id);
    return r;
  }

  roadY(road, x, z) {
    // height along the road at the projection of (x,z)
    const pl = road._pl || (road._pl = makePolyline(road.pts));
    let best = Infinity, by = 0;
    for (let i = 1; i < pl.n; i++) {
      const x0 = pl.pts[(i - 1) * 2], z0 = pl.pts[(i - 1) * 2 + 1], x1 = pl.pts[i * 2], z1 = pl.pts[i * 2 + 1];
      const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
      let t = L2 ? ((x - x0) * dx + (z - z0) * dz) / L2 : 0;
      t = clamp(t, 0, 1);
      const px = x0 + dx * t, pz = z0 + dz * t;
      const d2 = (px - x) ** 2 + (pz - z) ** 2;
      if (d2 < best) { best = d2; by = road.ys[i - 1] + (road.ys[i] - road.ys[i - 1]) * t; }
    }
    return by;
  }

  makeLane(road, fromId, toId, pts) {
    const from = this.nodes[fromId], to = this.nodes[toId];
    const off = road.oneway ? 0 : C.LANE_OFF;
    const op = offsetPoints(pts, off);
    const tr = trimPoints(op, from.trim, to.trim);
    const pl = makePolyline(tr.pts);
    pl.ys = new Float32Array(pl.n);
    for (let i = 0; i < pl.n; i++) pl.ys[i] = this.roadY(road, pl.pts[i * 2], pl.pts[i * 2 + 1]);
    const lane = { id: this.links.length, type: 'lane', road: road.id, from: fromId, to: toId, pl, length: pl.length, speed: road.speed, cars: [], out: [], slots: [], blocked: 0, kind: road.kind, closed: false, flooded: false, busStops: [] };
    this.links.push(lane); this.lanes.push(lane);
    road.lanes.push(lane.id);
    from.outLanes.push(lane.id); to.inLanes.push(lane.id);
    return lane;
  }

  build() {
    for (const r of this.roads) {
      this.makeLane(r, r.a, r.b, r.pts);
      if (!r.oneway) this.makeLane(r, r.b, r.a, r.pts.slice().reverse());
    }
    for (const node of this.nodes) this.buildConnectors(node);
    for (const node of this.nodes) this.buildConflicts(node);
    for (const node of this.nodes) this.setupSignal(node);
    for (const lane of this.lanes) this.buildSlots(lane);
    this.maxSpeed = Math.max(...this.lanes.map((l) => l.speed));
  }

  laneEnd(lane) { const p = lane.pl; return [p.pts[(p.n - 1) * 2], p.pts[(p.n - 1) * 2 + 1]]; }
  laneStart(lane) { return [lane.pl.pts[0], lane.pl.pts[1]]; }
  laneDirEnd(lane) { const p = lane.pl, n = p.n; const dx = p.pts[(n - 1) * 2] - p.pts[(n - 2) * 2], dz = p.pts[(n - 1) * 2 + 1] - p.pts[(n - 2) * 2 + 1]; const L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; }
  laneDirStart(lane) { const p = lane.pl; const dx = p.pts[2] - p.pts[0], dz = p.pts[3] - p.pts[1]; const L = Math.hypot(dx, dz) || 1; return [dx / L, dz / L]; }

  buildConnectors(node) {
    const ins = node.inLanes.map((id) => this.links[id]);
    const outs = node.outLanes.map((id) => this.links[id]);
    for (const li of ins) {
      for (const lo of outs) {
        const uturn = lo.road === li.road;
        if (uturn && outs.length > 1) continue;
        if (node.noUturn && uturn) continue;
        const p0 = this.laneEnd(li), p2 = this.laneStart(lo);
        const d0 = this.laneDirEnd(li), d2 = this.laneDirStart(lo);
        const dot = d0[0] * d2[0] + d0[1] * d2[1];
        const cross = d0[0] * d2[1] - d0[1] * d2[0];
        let turn = 'S';
        if (uturn) turn = 'U';
        else if (dot < 0.8) turn = cross > 0 ? 'R' : 'L';
        // control point: intersection of the two tangent lines
        let p1;
        const den = d0[0] * d2[1] - d0[1] * d2[0];
        if (Math.abs(den) < 0.15) p1 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
        else {
          const t = ((p2[0] - p0[0]) * d2[1] - (p2[1] - p0[1]) * d2[0]) / den;
          p1 = [p0[0] + d0[0] * t, p0[1] + d0[1] * t];
          if (t < 0 || t > 40) p1 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
        }
        if (uturn) {
          const mx = (p0[0] + p2[0]) / 2 + d0[0] * 7, mz = (p0[1] + p2[1]) / 2 + d0[1] * 7;
          p1 = [mx, mz];
        }
        const pts = quadBezierPoints(p0, p1, p2, turn === 'S' ? 2 : 8);
        const pl = makePolyline(pts);
        const y0 = li.pl.ys[li.pl.n - 1], y1 = lo.pl.ys[0];
        pl.ys = new Float32Array(pl.n);
        for (let i = 0; i < pl.n; i++) pl.ys[i] = y0 + (y1 - y0) * (pl.cum[i] / (pl.length || 1));
        const con = { id: this.links.length, type: 'con', node: node.id, inLane: li.id, outLane: lo.id, pl, length: pl.length, speed: turn === 'S' ? Math.min(li.speed, lo.speed) : turn === 'U' ? 4 : 7.5, cars: [], turn, conflicts: [], group: 0, blocked: 0 };
        this.links.push(con); this.connectors.push(con);
        li.out.push(con.id);
        node.connectors.push(con.id);
      }
    }
  }

  buildConflicts(node) {
    const cons = node.connectors.map((id) => this.links[id]);
    for (let i = 0; i < cons.length; i++) for (let j = i + 1; j < cons.length; j++) {
      const a = cons[i], b = cons[j];
      if (a.inLane === b.inLane) continue;
      let conflict = a.outLane === b.outLane;
      if (!conflict) {
        const pa = a.pl.pts, pb = b.pl.pts;
        outer: for (let s = 1; s < a.pl.n; s++) for (let t = 1; t < b.pl.n; t++) {
          if (segmentsIntersect(pa[(s - 1) * 2], pa[(s - 1) * 2 + 1], pa[s * 2], pa[s * 2 + 1], pb[(t - 1) * 2], pb[(t - 1) * 2 + 1], pb[t * 2], pb[t * 2 + 1])) { conflict = true; break outer; }
        }
      }
      if (conflict) { a.conflicts.push(b.id); b.conflicts.push(a.id); }
    }
  }

  setupSignal(node) {
    // group approaches by axis: 0 = north/south-bound, 1 = east/west-bound
    for (const lid of node.inLanes) {
      const d = this.laneDirEnd(this.links[lid]);
      this.links[lid].group = Math.abs(d[1]) > Math.abs(d[0]) ? 0 : 1;
    }
    for (const cid of node.connectors) this.links[cid].group = this.links[this.links[cid].inLane].group;
    if (node.control === 'signal') {
      const offset = ((node.gi || 0) * 7 + (node.gj || 0) * 3) % 40;
      node.signal = { green: [17, 17], yellow: 3, allRed: 1.5, t: offset, phase: 0, state: ['G', 'R'] };
    }
  }

  // advance signal timers; returns true if any state changed (render update)
  updateSignals(dt) {
    let changed = false;
    for (const n of this.nodes) {
      const s = n.signal;
      if (!s) continue;
      s.t += dt;
      const g = s.green, y = s.yellow, ar = s.allRed;
      const cycle = g[0] + y + ar + g[1] + y + ar;
      const t = s.t % cycle;
      let st0 = 'R', st1 = 'R';
      if (t < g[0]) st0 = 'G';
      else if (t < g[0] + y) st0 = 'Y';
      else if (t < g[0] + y + ar) { /* all red */ }
      else if (t < g[0] + y + ar + g[1]) st1 = 'G';
      else if (t < g[0] + y + ar + g[1] + y) st1 = 'Y';
      if (n.failed || !n.powered) { st0 = st1 = 'X'; }
      if (s.state[0] !== st0 || s.state[1] !== st1) { s.state[0] = st0; s.state[1] = st1; changed = true; }
    }
    return changed;
  }

  // Is the movement from this in-lane currently controlled as an all-way stop?
  isStopControlled(node) { return node.control === 'stop' || (node.signal && (node.failed || !node.powered)); }

  buildSlots(lane) {
    const road = this.roads[lane.road];
    if (!road.parking || road.kind !== 'street') return;
    const step = 7;
    const L = lane.length;
    const startS = 8, endS = L - 10;
    for (let s = startS; s <= endS; s += step) {
      samplePolyline(lane.pl, s, tmp);
      const off = C.PARK_OFF - C.LANE_OFF;
      const dx = Math.sin(tmp.h), dz = Math.cos(tmp.h);
      const slot = { id: this.slots.length, lane: lane.id, s, x: tmp.x - dz * off, z: tmp.z + dx * off, h: tmp.h, car: null, reserved: null, busStop: false };
      this.slots.push(slot);
      lane.slots.push(slot.id);
    }
  }

  // ---------- routing over lanes ----------
  laneCost(lane) {
    let c = lane.length / lane.speed;
    const n = this.nodes[lane.to];
    if (n.signal) c += 7; else if (n.control === 'stop') c += 4;
    c += lane.cars.length * 1.2;
    if (lane.blocked > 0) c += 90;
    if (lane.closed || lane.flooded) c += 100000;
    return c;
  }

  // Returns array of link ids from (and including) startLane to destLane: [lane, con, lane, con, ..., lane]
  route(startLaneId, destLaneId, opts = {}) {
    if (startLaneId === destLaneId && !opts.forceLoop) return [startLaneId];
    const links = this.links;
    const dest = links[destLaneId];
    const [dx, dz] = this.laneStart(dest);
    const vmax = this.maxSpeed || 25;
    const g = new Map();
    const prev = new Map();
    const heap = new MinHeap();
    g.set(startLaneId, 0);
    heap.push(0, startLaneId);
    const closed = new Set();
    let found = false, iter = 0;
    while (heap.size && iter++ < 6000) {
      const lid = heap.pop();
      if (closed.has(lid)) continue;
      closed.add(lid);
      if (lid === destLaneId && iter > 1) { found = true; break; }
      const lane = links[lid];
      const base = g.get(lid) + (lid === startLaneId ? 0 : this.laneCost(lane));
      for (const cid of lane.out) {
        const con = links[cid];
        const nl = con.outLane;
        const cost = base + con.length / con.speed + (con.turn === 'L' ? 2 : con.turn === 'U' ? 6 : 0) + (opts.avoid && opts.avoid.has(nl) ? 500 : 0);
        if (cost < (g.get(nl) ?? Infinity)) {
          g.set(nl, cost);
          prev.set(nl, [lid, cid]);
          const [ex, ez] = this.laneEnd(links[nl]);
          heap.push(cost + Math.hypot(ex - dx, ez - dz) / vmax, nl);
        }
        if (nl === destLaneId && !closed.has(nl)) { /* continue search for best */ }
      }
    }
    if (!found && !prev.has(destLaneId)) return null;
    const path = [destLaneId];
    let cur = destLaneId;
    let guard = 0;
    while (cur !== startLaneId && guard++ < 2000) {
      const p = prev.get(cur);
      if (!p) return null;
      path.push(p[1], p[0]);
      cur = p[0];
    }
    path.reverse();
    return path;
  }

  routeLength(path, startS, endS) {
    let L = 0;
    for (let i = 0; i < path.length; i++) L += this.links[path[i]].length;
    return Math.max(0, L - startS - (this.links[path[path.length - 1]].length - endS));
  }

  // nearest lane to point (optionally constrained by direction similarity)
  nearestLane(x, z, opts = {}) {
    let best = null, bd = Infinity, bs = 0;
    for (const lane of this.lanes) {
      if (opts.noHighway && (lane.kind === 'highway' || lane.kind === 'ramp')) continue;
      if (opts.y !== undefined && Math.abs(lane.pl.ys[0] - opts.y) > 4 && Math.abs(lane.pl.ys[lane.pl.n - 1] - opts.y) > 4) continue;
      const pl = lane.pl;
      for (let i = 1; i < pl.n; i++) {
        const x0 = pl.pts[(i - 1) * 2], z0 = pl.pts[(i - 1) * 2 + 1], x1 = pl.pts[i * 2], z1 = pl.pts[i * 2 + 1];
        const ddx = x1 - x0, ddz = z1 - z0, L2 = ddx * ddx + ddz * ddz;
        let t = L2 ? ((x - x0) * ddx + (z - z0) * ddz) / L2 : 0;
        t = clamp(t, 0, 1);
        const px = x0 + ddx * t, pz = z0 + ddz * t;
        let d2 = (px - x) ** 2 + (pz - z) ** 2;
        if (opts.heading !== undefined) {
          const h = Math.atan2(ddx, ddz);
          let dh = Math.abs(((opts.heading - h + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          d2 += dh * dh * 40;
        }
        if (d2 < bd) { bd = d2; best = lane; bs = pl.cum[i - 1] + (pl.cum[i] - pl.cum[i - 1]) * t; }
      }
    }
    return best ? { lane: best, s: bs, d: Math.sqrt(bd) } : null;
  }

  sample(link, s, out) {
    samplePolyline(link.pl, s, out);
    const pl = link.pl;
    // height
    let lo = 1, hi = pl.n - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pl.cum[m] < s) lo = m + 1; else hi = m; }
    const s0 = pl.cum[lo - 1], s1 = pl.cum[lo];
    const t = s1 > s0 ? clamp((s - s0) / (s1 - s0), 0, 1) : 0;
    out.y = pl.ys[lo - 1] + (pl.ys[lo] - pl.ys[lo - 1]) * t;
    return out;
  }
}
