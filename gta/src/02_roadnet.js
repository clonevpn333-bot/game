// ============================================================================
// NEON BAY · 02_roadnet.js — procedural road network: PRNG, density field, landmass, agent-grown graph, POIs
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ROAD_CLASS = {
  highway:     { seg: 34, width: 15, lanes: 6, speed: 26, snap: 26, branch: 0.10, color: 0x3b3f47 },
  arterial:    { seg: 26, width: 11, lanes: 4, speed: 18, snap: 20, branch: 0.16, color: 0x35383f },
  boulevard:   { seg: 24, width: 12, lanes: 4, speed: 16, snap: 20, branch: 0.14, color: 0x34373e },
  collector:   { seg: 20, width: 8,  lanes: 2, speed: 12, snap: 16, branch: 0.20, color: 0x2f3239 },
  residential: { seg: 15, width: 6,  lanes: 2, speed: 9,  snap: 12, branch: 0.16, color: 0x2b2e34 },
  alley:       { seg: 12, width: 4,  lanes: 1, speed: 7,  snap: 9,  branch: 0.05, color: 0x24262b },
};
const CLASS_DOWNGRADE = { highway: 'arterial', arterial: 'collector', boulevard: 'collector', collector: 'residential', residential: 'alley', alley: 'alley' };

class RoadNetwork {
  constructor(seed, size) {
    this.seed = (seed == null ? 20240704 : seed) >>> 0;
    this.rng = mulberry32(this.seed);
    this.size = size || 1500; this.half = this.size / 2;
    this.nodes = []; this.edges = []; this.districts = []; this.pois = []; this.bridges = [];
    this.centralIslands = []; this._cell = 24; this._hash = new Map();  // spatial hash for node snapping (a lookup, NOT a road grid)
    this._noiseSeed = mulberry32(this.seed ^ 0x9e3779b9);
    this._perm = new Float32Array(512); for (let i = 0; i < 512; i++) this._perm[i] = this._noiseSeed();
    this.build();
  }
  // ---- deterministic value noise (0..1), 2 octaves ----
  _h(ix, iz) { const i = (((ix * 73856093) ^ (iz * 19349663)) >>> 0) & 511; return this._perm[i]; }
  _vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = this._h(ix, iz), b = this._h(ix + 1, iz), c = this._h(ix, iz + 1), d = this._h(ix + 1, iz + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  density(x, z) {
    if (!this.isLand(x, z)) return 0.02;
    let d = this._vnoise(x * 0.0045, z * 0.0045) * 0.55 + this._vnoise(x * 0.012, z * 0.012) * 0.3;
    for (const p of this.peaks) { const dx = x - p.x, dz = z - p.z, dd = dx * dx + dz * dz; d += p.w * Math.exp(-dd / (2 * p.r * p.r)); }
    return d;
  }
  _grad(x, z) {
    const e = 8, dx = this.density(x + e, z) - this.density(x - e, z), dz = this.density(x, z + e) - this.density(x, z - e);
    const g = new THREE.Vector3(dx, 0, dz); const l = g.length(); return l > 1e-5 ? g.multiplyScalar(1 / l) : new THREE.Vector3(0, 0, 0);
  }
  // ---- landmass: western mainland + eastern beach island + central islands, split by a meandering bay ----
  isLand(x, z) {
    const h = this.half;
    const r = Math.hypot(x, z), ang = Math.atan2(z, x);
    const lobe = Math.cos(ang * 2) * h * 0.05 + Math.cos(ang * 3 + 1.1) * h * 0.04 + (this._vnoise(Math.cos(ang) * 3 + 9, Math.sin(ang) * 3 + 9) - 0.5) * h * 0.14;
    if (r > h * 0.9 + lobe) return false;                                           // organic outer coastline (blobby, not square)
    const wob = Math.sin(z * 0.006) * 46 + Math.sin(z * 0.016 + 1.3) * 24 + (this._vnoise(z * 0.011 + 3, 7.3) - 0.5) * 70;
    const bl = this.bayL + wob, br = this.bayR + 34 + wob * 0.7;                     // meandering bay banks split mainland from beach island
    if (x > bl && x < br && Math.abs(z) < h * 0.9) {
      for (const isl of this.centralIslands) if (Math.hypot(x - isl.x, z - isl.z) < isl.r) return true;
      return false;
    }
    return true;
  }
  // ---- node/edge helpers with snapping ----
  _key(x, z) { return Math.floor(x / this._cell) + ',' + Math.floor(z / this._cell); }
  _nearNode(x, z, tol) {
    const cx = Math.floor(x / this._cell), cz = Math.floor(z / this._cell); let best = null, bd = tol * tol;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const arr = this._hash.get((cx + dx) + ',' + (cz + dz)); if (!arr) continue; for (const nn of arr) { const d = (nn.position.x - x) ** 2 + (nn.position.z - z) ** 2; if (d < bd) { bd = d; best = nn; } } }
    return best;
  }
  _addNode(x, z, districtId, type) {
    const n = { id: this.nodes.length, position: new THREE.Vector3(x, 0, z), degree: 0, districtId: districtId != null ? districtId : this.districtIdAt(x, z), type: type || 'intersection', edges: [] };
    this.nodes.push(n); const k = this._key(x, z); if (!this._hash.has(k)) this._hash.set(k, []); this._hash.get(k).push(n); return n;
  }
  _addEdge(a, b, cls, isBridge) {
    if (a === b) return null;
    for (const eid of a.edges) { const e = this.edges[eid]; if ((e.a === b.id) || (e.b === b.id)) return e; } // no duplicate
    const e = { id: this.edges.length, a: a.id, b: b.id, class: cls, lanes: ROAD_CLASS[cls].lanes, width: ROAD_CLASS[cls].width, elevated: false, isBridge: !!isBridge, districtId: a.districtId };
    this.edges.push(e); a.edges.push(e.id); b.edges.push(e.id); a.degree++; b.degree++; if (isBridge) this.bridges.push(e.id); return e;
  }
  districtIdAt(x, z) { let best = 0, bd = 1e18; for (const d of this.districts) { const dd = (d.centroid.x - x) ** 2 + (d.centroid.z - z) ** 2; if (dd < bd) { bd = dd; best = d.id; } } return best; }
  districtAt(x, z) { return this.districts[this.districtIdAt(x, z)]; }
  getPOI(name) { for (const p of this.pois) if (p.name === name) return p; return null; }
  // ---- agent-based road growth: an agent lays a chain of short segments, steering along the ----
  // ---- density gradient with bounded turn-rate (so roads curve), branching and snapping. ----
  _grow(px, pz, dx, dz, cls, steps, districtHint) {
    const C = ROAD_CLASS[cls]; let pos = new THREE.Vector3(px, 0, pz), dir = new THREE.Vector3(dx, 0, dz); if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0); dir.normalize();
    let prev = this._nearNode(px, pz, C.snap) || this._addNode(px, pz, districtHint);
    for (let i = 0; i < steps; i++) {
      const grad = this._grad(pos.x, pos.z);
      const steer = dir.clone().addScaledVector(grad, cls === 'highway' ? 0.12 : cls === 'arterial' ? 0.24 : 0.4);
      steer.x += (this.rng() - 0.5) * (cls === 'highway' ? 0.12 : 0.34); steer.z += (this.rng() - 0.5) * (cls === 'highway' ? 0.12 : 0.34);
      if (steer.lengthSq() < 1e-6) steer.copy(dir); steer.normalize();
      const maxTurn = cls === 'highway' ? 0.18 : cls === 'arterial' ? 0.32 : 0.5;
      dir.lerp(steer, maxTurn).normalize();
      const next = pos.clone().addScaledVector(dir, C.seg);
      if (Math.abs(next.x) > this.half - 26 || Math.abs(next.z) > this.half - 26) break;
      let bridge = false;
      if (!this.isLand(next.x, next.z)) {
        // probe ahead a few segments for the far shore; if reachable, span a bridge, else stop
        let landed = null; for (let k = 2; k <= 7; k++) { const t = pos.clone().addScaledVector(dir, C.seg * k); if (Math.abs(t.x) > this.half - 26 || Math.abs(t.z) > this.half - 26) break; if (this.isLand(t.x, t.z)) { landed = t; break; } }
        if (!landed || (cls !== 'highway' && cls !== 'arterial' && cls !== 'boulevard')) break;
        next.copy(landed); bridge = true;
      }
      const snap = this._nearNode(next.x, next.z, C.snap);
      const node = snap || this._addNode(next.x, next.z, districtHint);
      this._addEdge(prev, node, cls, bridge);
      if (snap) break;                                     // merged into an existing road → intersection formed
      prev = node; pos = node.position.clone();
      if (this.rng() < C.branch && cls !== 'alley') {      // branch a lower-class road off to one side
        const side = this.rng() < 0.5 ? 1 : -1, perp = new THREE.Vector3(-dir.z * side, 0, dir.x * side);
        this._grow(pos.x, pos.z, perp.x, perp.z, CLASS_DOWNGRADE[cls], Math.max(4, (steps * 0.55) | 0), districtHint);
      }
    }
  }
  // ---- fill a district with local streets seeded from its arterials ----
  _localStreets(d) {
    // seed local streets FROM existing skeleton nodes so every street grafts onto the network (no floating fragments)
    let seeds = this.nodes.filter(n => n.districtId === d.id);
    if (seeds.length < 2) seeds = this.nodes.filter(n => n.position.distanceTo(d.centroid) < 220);
    if (!seeds.length) return;
    const seedN = d.type === 'downtown' ? 16 : d.type === 'suburb' ? 12 : d.type === 'beach' ? 9 : 7;
    const cls = d.type === 'downtown' ? 'collector' : 'residential';
    for (let i = 0; i < seedN; i++) {
      const s = seeds[(this.rng() * seeds.length) | 0].position;
      const dir = this.rng() * TAU;
      this._grow(s.x, s.z, Math.cos(dir), Math.sin(dir), cls, d.type === 'suburb' ? 10 : 7, d.id);
      if (d.type === 'suburb' && this.rng() < 0.5) this._culDeSac(s.x, s.z, d.id);  // curvy dead-end bulbs
    }
  }
  _culDeSac(x, z, did) {
    const a = this.rng() * TAU, len = rnd(30, 60), steps = 4 + (this.rng() * 3 | 0); let px = x, pz = z, dir = a;
    let prev = this._nearNode(px, pz, 12) || this._addNode(px, pz, did, 'intersection');
    for (let i = 0; i < steps; i++) { dir += (this.rng() - 0.5) * 0.7; px += Math.cos(dir) * (len / steps); pz += Math.sin(dir) * (len / steps); if (!this.isLand(px, pz) || Math.abs(px) > this.half - 26 || Math.abs(pz) > this.half - 26) return; const n = this._addNode(px, pz, did, i === steps - 1 ? 'deadend' : 'intersection'); this._addEdge(prev, n, 'residential', false); prev = n; }
    prev.type = 'deadend'; prev.cul = true;                                        // the circular bulb marker
  }
  build() {
    const h = this.half;
    // bay channel between mainland (west) and beach island (east)
    this.bayL = h * 0.16; this.bayR = h * 0.30;
    this.centralIslands = [ { x: (this.bayL + this.bayR) / 2, z: -h * 0.30, r: 66 }, { x: (this.bayL + this.bayR) / 2 + 8, z: h * 0.34, r: 48 } ];
    // districts + their density peaks
    this.districts = [
      { id: 0, type: 'downtown',   centroid: new THREE.Vector3(-h * 0.42, 0, -h * 0.34) },
      { id: 1, type: 'commercial', centroid: new THREE.Vector3(-h * 0.30, 0,  h * 0.06) },
      { id: 2, type: 'industrial', centroid: new THREE.Vector3(-h * 0.44, 0,  h * 0.5) },
      { id: 3, type: 'beach',      centroid: new THREE.Vector3( h * 0.52, 0,  0) },
      { id: 4, type: 'suburb',     centroid: new THREE.Vector3( h * 0.44, 0, -h * 0.46) },
      { id: 5, type: 'suburb',     centroid: new THREE.Vector3(this.centralIslands[0].x, 0, this.centralIslands[0].z) },
    ];
    this.peaks = [
      { x: -h * 0.42, z: -h * 0.34, w: 1.35, r: 150 }, { x: -h * 0.30, z: h * 0.06, w: 0.9, r: 170 },
      { x: -h * 0.44, z: h * 0.5, w: 0.5, r: 150 }, { x: h * 0.52, z: 0, w: 0.75, r: 180 }, { x: h * 0.44, z: -h * 0.46, w: 0.4, r: 150 },
    ];
    // Stage 2: highway spine + arterial growth from downtown, along density and coast, bridging the bay
    const dt = this.districts[0].centroid, beach = this.districts[3].centroid;
    this._grow(dt.x, dt.z, 1, 0.15, 'highway', 30, 0);                              // downtown → east, will bridge to the beach island
    this._grow(dt.x, dt.z, 0.2, 1, 'highway', 26, 0);                              // downtown → south toward the port
    this._grow(dt.x, dt.z, -0.4, -1, 'arterial', 20, 0);
    this._grow(beach.x, beach.z, 0, 1, 'boulevard', 22, 3);                        // beach shore boulevard
    this._grow(beach.x, beach.z, 0, -1, 'boulevard', 22, 3);
    for (const d of this.districts) { this._grow(d.centroid.x, d.centroid.z, Math.cos(d.id), Math.sin(d.id * 1.7), 'arterial', 16, d.id); }
    // redundant bay crossings + bridges tying the small central islands back to the mainland
    this._grow(dt.x, dt.z - h * 0.28, 1, 0.05, 'arterial', 22, 0);                  // northern east–west crossing
    this._grow(beach.x - 20, beach.z + h * 0.2, -1, 0, 'arterial', 20, 3);          // southern crossing back west
    for (const isl of this.centralIslands) this._grow(isl.x, isl.z, -1, 0.12, 'arterial', 7, this.districtIdAt(isl.x, isl.z));
    // Stage 3 (partial): local streets per district DNA
    for (const d of this.districts) this._localStreets(d);
    // POIs — named anchors (missions + minimap reference these by NAME, never coordinates)
    const near = (c) => { let b = null, bd = 1e18; for (const n of this.nodes) { const dd = n.position.distanceTo(c); if (dd < bd) { bd = dd; b = n; } } return b ? b.position.clone() : c.clone(); };
    this.pois = [
      { name: 'downtownTower', position: near(this.districts[0].centroid), districtId: 0 },
      { name: 'cityHall', position: near(this.districts[1].centroid), districtId: 1 },
      { name: 'portCranes', position: near(this.districts[2].centroid), districtId: 2 },
      { name: 'pier', position: near(this.districts[3].centroid.clone().add(new THREE.Vector3(0, 0, -80))), districtId: 3 },
      { name: 'beachMall', position: near(this.districts[3].centroid.clone().add(new THREE.Vector3(0, 0, 80))), districtId: 3 },
      { name: 'suburbGate', position: near(this.districts[4].centroid), districtId: 4 },
      { name: 'islandEnclave', position: near(this.districts[5].centroid), districtId: 5 },
    ];
  }
  // ---- accessors the later stages consume ----
  edgePolyline(edge, seg) { const a = this.nodes[edge.a].position, b = this.nodes[edge.b].position, n = seg || 1, out = []; for (let i = 0; i <= n; i++) out.push(a.clone().lerp(b, i / n)); return out; }
  nearestEdge(x, z) { let best = null, bd = 1e18; const P = new THREE.Vector3(x, 0, z); for (const e of this.edges) { const a = this.nodes[e.a].position, b = this.nodes[e.b].position; const ab = b.clone().sub(a), t = clamp(P.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1); const proj = a.clone().addScaledVector(ab, t); const dd = proj.distanceToSquared(P); if (dd < bd) { bd = dd; best = { edge: e, point: proj, dist: Math.sqrt(dd) }; } } return best; }
  onRoad(x, z) { const ne = this.nearestEdge(x, z); return ne ? ne.dist < ROAD_CLASS[ne.edge.class].width * 0.5 + 1.5 : false; }
}
if (typeof window !== 'undefined') window.RoadNetwork = RoadNetwork; // exposed for the migration test harness

