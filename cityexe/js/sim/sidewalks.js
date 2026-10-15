// Sidewalk graph: corners of every block, edges along block sides (sidewalks /
// promenades / bridge walkways) and crosswalks at intersections. Pedestrians
// path over this graph; crosswalks at signals are gated by the traffic phase.
import { C, nodeX, nodeZ } from './config.js';
import { MinHeap, clamp } from '../core/math.js';

const W = C.WALK_OFF;

export class Sidewalks {
  constructor(city) {
    this.city = city;
    this.nodes = []; // {id, x, z, adj: [{to, len, gate: {node, group} | null}]}
    this.cornerId = new Map();
    this.build();
  }

  corner(bx, bz, k) {
    const key = `${bx},${bz},${k}`;
    if (this.cornerId.has(key)) return this.cornerId.get(key);
    const x0 = nodeX(bx) + W, x1 = nodeX(bx + 1) - W, z0 = nodeZ(bz) + W, z1 = nodeZ(bz + 1) - W;
    const pos = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]][k];
    const id = this.nodes.length;
    this.nodes.push({ id, x: pos[0], z: pos[1], adj: [], bx, bz, k });
    this.cornerId.set(key, id);
    return id;
  }

  link(a, b, gate = null) {
    const A = this.nodes[a], B = this.nodes[b];
    const len = Math.hypot(A.x - B.x, A.z - B.z);
    A.adj.push({ to: b, len, gate });
    B.adj.push({ to: a, len, gate });
  }

  sideExists(blk, side) {
    if (!blk) return false;
    if (blk.water) return side === 'W' || side === 'E' ? true : blk.sides[side] != null;
    return true;
  }

  build() {
    const city = this.city;
    const net = city.net;
    // block sides
    for (const blk of city.blocks) {
      const { bx, bz } = blk;
      const [nw, ne, se, sw] = [0, 1, 2, 3].map((k) => this.corner(bx, bz, k));
      blk.swCorners = [nw, ne, se, sw];
      if (this.sideExists(blk, 'N')) this.link(nw, ne);
      if (this.sideExists(blk, 'S')) this.link(sw, se);
      if (this.sideExists(blk, 'W')) this.link(nw, sw);
      if (this.sideExists(blk, 'E')) this.link(ne, se);
    }
    // crossings at each grid node (i,j): corners around it
    for (let i = 0; i <= C.NB; i++) for (let j = 0; j <= C.NB; j++) {
      const nid = city.grid[i] && city.grid[i][j];
      const B = (bx, bz) => city.blockAt(bx, bz);
      const nwB = B(i - 1, j - 1), neB = B(i, j - 1), swB = B(i - 1, j), seB = B(i, j);
      const cNW = nwB ? nwB.swCorners[2] : null; // SE corner of NW block
      const cNE = neB ? neB.swCorners[3] : null; // SW corner of NE block
      const cSW = swB ? swB.swCorners[1] : null; // NE corner of SW block
      const cSE = seB ? seB.swCorners[0] : null; // NW corner of SE block
      const nodeOk = nid != null && nid >= 0;
      const node = nodeOk ? net.nodes[nid] : null;
      const armRoad = (di, dj) => {
        if (!nodeOk) return null;
        for (const rid of node.arms) {
          const r = net.roads[rid];
          const o = r.a === nid ? net.nodes[r.b] : net.nodes[r.a];
          if (r.kind === 'ramp' || r.kind === 'highway') continue;
          if (Math.sign(o.x - node.x) === di && Math.sign(o.z - node.z) === dj) return r;
        }
        return null;
      };
      const tryLink = (a, b, blkA, blkB, arm, group) => {
        if (a == null || b == null) return;
        if (blkA && blkB && blkA.water && blkB.water) return;
        const r = arm;
        if (r) {
          if (r.kind === 'bridge' && !(blkA && blkA.water) && !(blkB && blkB.water)) { /* normal */ }
          const gate = node && node.signal ? { node: nid, group } : node ? { node: nid, group: -1 } : null;
          this.link(a, b, gate);
        } else if (!(blkA && blkA.water) && !(blkB && blkB.water)) {
          this.link(a, b, null);
        } else if (blkA && blkB && (blkA.water !== blkB.water)) {
          // land corner to promenade corner across a missing road: only if both sides are on the same bank
        }
      };
      // north arm separates NW and NE corners (crossing moves E-W, conflicts with N-S traffic group 0)
      tryLink(cNW, cNE, nwB, neB, armRoad(0, -1), 0);
      tryLink(cSW, cSE, swB, seB, armRoad(0, 1), 0);
      tryLink(cNW, cSW, nwB, swB, armRoad(-1, 0), 1);
      tryLink(cNE, cSE, neB, seB, armRoad(1, 0), 1);
    }
  }

  // nearest point on any sidewalk segment to (x,z)
  nearestPoint(x, z) {
    let best = null, bd = Infinity;
    const bx = Math.floor(x / C.BLOCK + C.NB / 2), bz = Math.floor(z / C.BLOCK + C.NB / 2);
    for (let i = bx - 1; i <= bx + 1; i++) for (let j = bz - 1; j <= bz + 1; j++) {
      const blk = this.city.blockAt(i, j);
      if (!blk) continue;
      const [nw, ne, se, sw] = blk.swCorners;
      const sides = [['N', nw, ne], ['S', sw, se], ['W', nw, sw], ['E', ne, se]];
      for (const [s, a, b] of sides) {
        if (!this.sideExists(blk, s)) continue;
        const A = this.nodes[a], B = this.nodes[b];
        const dx = B.x - A.x, dz = B.z - A.z, L2 = dx * dx + dz * dz;
        const t = clamp(((x - A.x) * dx + (z - A.z) * dz) / L2, 0, 1);
        const px = A.x + dx * t, pz = A.z + dz * t;
        const d = (px - x) ** 2 + (pz - z) ** 2;
        if (d < bd) { bd = d; best = { x: px, z: pz, a, b }; }
      }
    }
    return best;
  }

  // point on sidewalk in front of a building
  buildingPoint(b) {
    const p = this.nearestPoint(b.sw[0], b.sw[1]);
    return p;
  }

  // A* path between two sidewalk points; returns array of waypoints {x,z,gate}
  path(from, to) {
    if ((from.a === to.a && from.b === to.b) || (from.a === to.b && from.b === to.a)) return [{ x: to.x, z: to.z, gate: null }];
    const nodes = this.nodes;
    const START = -1;
    const g = new Map(), prev = new Map();
    const heap = new MinHeap();
    const h = (id) => { const n = nodes[id]; return Math.hypot(n.x - to.x, n.z - to.z); };
    const push = (id, cost, p, gate) => {
      if (cost < (g.get(id) ?? Infinity)) { g.set(id, cost); prev.set(id, [p, gate]); heap.push(cost + h(id), id); }
    };
    push(from.a, Math.hypot(nodes[from.a].x - from.x, nodes[from.a].z - from.z), START, null);
    push(from.b, Math.hypot(nodes[from.b].x - from.x, nodes[from.b].z - from.z), START, null);
    const goalSet = new Set([to.a, to.b]);
    let best = null, bestCost = Infinity;
    let iter = 0;
    const closed = new Set();
    while (heap.size && iter++ < 4000) {
      const id = heap.pop();
      if (closed.has(id)) continue;
      closed.add(id);
      const cg = g.get(id);
      if (cg + h(id) >= bestCost) break;
      if (goalSet.has(id)) {
        const c = cg + Math.hypot(nodes[id].x - to.x, nodes[id].z - to.z);
        if (c < bestCost) { bestCost = c; best = id; }
      }
      for (const e of nodes[id].adj) {
        const extra = e.gate && e.gate.group >= 0 ? 6 : 0;
        push(e.to, cg + e.len + extra, id, e.gate);
      }
    }
    if (best == null) return null;
    // each waypoint carries the gate of the segment that arrives at it
    const out = [{ x: to.x, z: to.z, gate: null }];
    let cur = best;
    let guard = 0;
    while (cur !== START && guard++ < 1000) {
      const [p, gate] = prev.get(cur);
      out.push({ x: nodes[cur].x, z: nodes[cur].z, gate });
      cur = p;
    }
    out.reverse();
    return out;
  }
}
