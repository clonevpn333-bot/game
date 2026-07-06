// ============================================================================
// NEON BAY · 03_city.js — the city: terrain, roads, signals, landmarks, mall, districts, elevators, buildings
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
class City {
  constructor(scene) {
    this.scene = scene; this.boxes = []; this.shops = []; this.clubs = []; this.vendors = []; this.cullables = []; this.size = 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
  }
  build() {
    // ---- NETWORK-DRIVEN Neon Bay: an organic road graph, not a grid. Everything below is placed
    // ---- relative to the RoadNetwork (roads, blocks, water, signals, landmarks). No grid anywhere. ----
    this.net = new RoadNetwork(20240704, 1500);
    const net = this.net, half = net.half;
    this.size = net.size; this.half = half;
    this.lot = 30; this.road = 12; this.cell = 60; this.n = 8;                       // legacy scalars a few helpers still read (Story spawn offset, minimap fallbacks)
    this.bayX0 = net.bayL; this.bayX1 = net.bayR;                                      // approximate bay span for boat bounds
    this.brng = mulberry32((net.seed ^ 0x51ed5) >>> 0);                               // deterministic rng for landmark detailing
    this.DECO = [0xf3c7d4, 0xbfe4e8, 0xf5e3b8, 0xc7e8c9, 0xe8c9f0, 0xffd9b0];         // ocean-drive pastels
    this.DIST_NAMES = ['Downtown', 'Little Havana', 'The Docklands', 'Vice Beach', 'Sunset Heights', 'Starfish Island'];
    this.errands = []; this.workposts = []; this.beachSpots = []; this.camps = []; this.homes = []; this.displays = [];
    this._lodMats = new Map(); this._cull = new Map(); this._lod = []; this._reservedPlots = []; // _lod is a scratch shell list; district cells swap in their own via _cullGroup
    this.roadMat = mat(0x101216, { roughness: 0.2, metalness: 0.14, envMapIntensity: 2.3, emissive: 0x090b12, emissiveIntensity: 1, map: asphaltTexture() }); // rain-slicked, textured tarmac
    // offshore islets (boat destinations): Isla Privada + a small cay
    this.islets = [ { x: half + 150, z: -120, r: 52, h: 4.2, priv: true }, { x: half + 138, z: 150, r: 34, h: 2.8 } ];
    this.privIslet = this.islets[0];
    // airport anchor used by the arrival-flight intro (a southern road node = where you touch down)
    { const en = this.net.nodes[this.nearestNode(0, this.half * 0.55)], ex = en ? en.position : new THREE.Vector3(0, 0, this.half * 0.55); this.airport = { x: ex.x, z: ex.z, exit: { x: ex.x, z: ex.z } }; }
    this._buildTerrain();
    this._buildRoads();
    this._streetLights();
    this._scatterKnockables();
    this._buildTrain();
    this._buildSignals();
    this._buildLandmarks();     // reserve landmark plots + set `places` BEFORE the district fill
    this._buildDistricts();     // lattice of buildings fronting the streets, thinned by density
    this._finalizeLOD();
    // ---- hidden packages, food carts, and the NPC daily-life schedule pools ----
    this.packages = [];
    for (let i = 0; i < 12; i++) { let px2, pz2, t = 0; do { const a = this.brng() * TAU, r = 30 + this.brng() * (half * 0.7); [px2, pz2] = this.snapSidewalk(Math.cos(a) * r, Math.sin(a) * r); t++; } while (!net.isLand(px2, pz2) && t < 20); const pk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(0x3ae08a, { emissive: 0x2fe07a, emissiveIntensity: 1.8 })); pk.position.set(px2, 0.5, pz2); this.group.add(pk); this.packages.push({ m: pk, x: px2, z: pz2, got: false }); }
    for (let i = 0; i < 11; i++) { let vx, vz, t = 0; do { const a = this.brng() * TAU, r = 24 + this.brng() * (half * 0.65); [vx, vz] = this.snapSidewalk(Math.cos(a) * r, Math.sin(a) * r); t++; } while (!net.isLand(vx, vz) && t < 20); this._vendorStall(vx, vz); this.vendors.push({ x: vx, z: vz }); }
    for (const v of this.vendors) this.errands.push({ x: v.x, z: v.z + 2.4 });
    this.jobs = this.workposts.slice();
    this.leisureSpots = [];
    for (const s of this.shops) if (s.type === 'diner' || s.type === 'club' || s.type === 'shop') this.leisureSpots.push({ x: s.x, z: s.z + (s.d || 12) / 2 + 2 });
    for (const b of this.beachSpots) this.leisureSpots.push({ x: b.x, z: b.z });
    for (const v of this.vendors) this.leisureSpots.push({ x: v.x, z: v.z + 2.4 });
    if (this.plaza) this.leisureSpots.push({ x: this.plaza.x, z: this.plaza.z + 8 });
    if (!this.homes.length) this.homes.push({ x: (this.homePos || { x: 0 }).x, z: (this.homePos || { z: 0 }).z });
    if (!this.leisureSpots.length) this.leisureSpots = this.errands.slice();
  }
  // ---- ocean + an organic land mesh whose coastline follows RoadNetwork.isLand ----
  _buildTerrain() {
    const net = this.net, span = this.size;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), mat(0x223a52, { roughness: 0.15, metalness: 0.35, envMapIntensity: 1.6, emissive: 0x0e2036, emissiveIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -0.5, 0); water.renderOrder = -1; this.group.add(water); this.water = water;
    const R = 180, geo = new THREE.PlaneGeometry(span, span, R, R); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cnt = pos.count, colors = new Float32Array(cnt * 3);
    const cGrass = new THREE.Color(0x2c3a30), cCore = new THREE.Color(0x3a3a42), cSand = new THREE.Color(0xbda878), cWater = new THREE.Color(0x1c3247), tmp = new THREE.Color();
    for (let i = 0; i < cnt; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (!net.isLand(x, z)) { pos.setY(i, -0.9); cWater.toArray(colors, i * 3); continue; }
      const coast = !net.isLand(x + 7, z) || !net.isLand(x - 7, z) || !net.isLand(x, z + 7) || !net.isLand(x, z - 7);
      pos.setY(i, this.groundH(x, z) + 0.02);
      if (coast) cSand.toArray(colors, i * 3);
      else { tmp.copy(cGrass).lerp(cCore, clamp(net.density(x, z) * 1.15, 0, 1)); tmp.toArray(colors, i * 3); }
    }
    geo.computeVertexNormals(); geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const land = new THREE.Mesh(geo, mat(0xffffff, { keepColor: true, vertexColors: true, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.35 }));
    land.receiveShadow = true; this.group.add(land); this.land = land;
    // islet mounds (sand discs with grassy crowns) — boat destinations
    for (const I of this.islets) {
      const g = new THREE.CircleGeometry(I.r, 40); g.rotateX(-Math.PI / 2); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) P.setY(i, this.groundH(I.x + P.getX(i), I.z + P.getZ(i)) + 0.05);
      g.computeVertexNormals(); const m = new THREE.Mesh(g, mat(0x4c8a4f)); m.position.set(I.x, 0, I.z); m.receiveShadow = true; this.group.add(m);
      const ring = new THREE.RingGeometry(I.r * 0.86, I.r, 40); ring.rotateX(-Math.PI / 2); const s = new THREE.Mesh(ring, mat(0xd6c493)); s.position.set(I.x, 0.06, I.z); this.group.add(s);
    }
  }
  // ---- merged road ribbons per edge + centre-line markings + intersection patches + bridge rails ----
  _buildRoads() {
    const net = this.net, P = [], I = [], U = [], MP = [], MI = []; let vc = 0, mvc = 0; const TILE = 8;
    // road-surface quad: also emits world-planar UVs so the asphalt texture tiles across the whole network
    const rquad = (p1, p2, p3, p4, y) => { for (const p of [p1, p2, p3, p4]) { P.push(p.x, y, p.z); U.push(p.x / TILE, p.z / TILE); } I.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3); vc += 4; };
    const quad = (p1, p2, p3, p4, y, arr, iarr, base) => { arr.push(p1.x, y, p1.z, p2.x, y, p2.z, p3.x, y, p3.z, p4.x, y, p4.z); iarr.push(base, base + 1, base + 2, base, base + 2, base + 3); return base + 4; };
    for (const e of net.edges) {
      const a = net.nodes[e.a].position, b = net.nodes[e.b].position, dir = b.clone().sub(a); const len = dir.length(); if (len < 0.4) continue; dir.multiplyScalar(1 / len);
      const perp = new THREE.Vector3(dir.z, 0, -dir.x), w = ROAD_CLASS[e.class].width / 2, y = e.isBridge ? 0.12 : 0.06;
      rquad(a.clone().addScaledVector(perp, w), b.clone().addScaledVector(perp, w), b.clone().addScaledVector(perp, -w), a.clone().addScaledVector(perp, -w), y);
      if (e.class !== 'alley' && e.class !== 'residential') { const mw = 0.28; mvc = quad(a.clone().addScaledVector(perp, mw), b.clone().addScaledVector(perp, mw), b.clone().addScaledVector(perp, -mw), a.clone().addScaledVector(perp, -mw), y + 0.02, MP, MI, mvc); }
    }
    for (const n of net.nodes) { if (n.degree < 1) continue; let w = 0; for (const eid of n.edges) w = Math.max(w, ROAD_CLASS[net.edges[eid].class].width / 2); const c = n.position; rquad(new THREE.Vector3(c.x - w, 0, c.z - w), new THREE.Vector3(c.x + w, 0, c.z - w), new THREE.Vector3(c.x + w, 0, c.z + w), new THREE.Vector3(c.x - w, 0, c.z + w), 0.055); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); rg.setIndex(I); rg.computeVertexNormals();
    const road = new THREE.Mesh(rg, this.roadMat); road.receiveShadow = true; this.group.add(road); this.roadMesh = road;
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(MP, 3)); mg.setIndex(MI); mg.computeVertexNormals();
    this.group.add(new THREE.Mesh(mg, mat(0xffe14a, { emissive: 0xffd23a, emissiveIntensity: 1.0 })));
    const railMat = mat(0xb8c0ca);
    for (const e of net.edges) { if (!e.isBridge) continue; const a = net.nodes[e.a].position, b = net.nodes[e.b].position, dir = b.clone().sub(a); const len = dir.length(); dir.multiplyScalar(1 / len); const perp = new THREE.Vector3(dir.z, 0, -dir.x), w = ROAD_CLASS[e.class].width / 2, mid = a.clone().lerp(b, 0.5); for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, len), railMat); rail.position.set(mid.x + perp.x * s * w, 0.55, mid.z + perp.z * s * w); rail.rotation.y = Math.atan2(dir.x, dir.z); this.group.add(rail); } }
  }
  // ---- elevator access + on-demand furnished floors (walls read as glass from inside — the shaft culls away) ----
  nearElevator(pos) { if (!this.elevators) return null; for (const el of this.elevators) { if (Math.hypot(pos.x - el.x, pos.z - el.z) < 3.2) return el; } return null; }
  floorY(el, f) { return el.h0 + 0.85 + (f - 1) * 4; }
  floorRoom(el, f) {
    if (!this._rooms) this._rooms = new Map();
    const key = el.cx + ',' + el.cz + ':' + f; if (this._rooms.has(key)) return this._rooms.get(key);
    const y = this.floorY(el, f), G = new THREE.Group(), w = el.w - 1.2, d = el.d - 1.2, rng = mulberry32(((el.cx * 73 + el.cz * 131 + f * 7) | 0) >>> 0);
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), mat(pick([0x2c3242, 0x3a3040, 0x2a3a34, 0x3d3849]), { emissive: 0x22242c, emissiveIntensity: 0.25 })); carpet.position.set(el.cx, y - 0.1, el.cz); G.add(carpet);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.1, d * 0.5), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.2 })); panel.position.set(el.cx, y + 3.0, el.cz); G.add(panel);
    const nDesk = 2 + (rng() * 3 | 0);
    for (let i = 0; i < nDesk; i++) { const dx = el.cx + (rng() - 0.5) * (w - 4), dz = el.cz + (rng() - 0.5) * (d - 5); const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.0), mat(0x5a4632)); desk.position.set(dx, y + 0.5, dz); G.add(desk); const mon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.06), mat(0x0c1018, { emissive: pick([0x2fd0e0, 0x3a5a8a, 0x1a2a3a]), emissiveIntensity: 0.9 })); mon.position.set(dx, y + 1.14, dz - 0.2); G.add(mon); const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), mat(0x22262e)); chair.position.set(dx, y + 0.55, dz + 1.0); G.add(chair); }
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10), mat(0xa06a3a)); pot.position.set(el.cx + w / 2 - 1, y + 0.35, el.cz + d / 2 - 1); G.add(pot);
    const frond = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), mat(0x2f7e44)); frond.position.set(el.cx + w / 2 - 1, y + 0.95, el.cz + d / 2 - 1); G.add(frond);
    // elevator doors on this floor (the way back down)
    const doors = new THREE.Mesh(new THREE.BoxGeometry(Math.min(el.w * 0.45, 3), 2.6, 0.14), mat(0x1a2530, { emissive: 0x2fd0e0, emissiveIntensity: 0.5 })); doors.position.set(el.cx, y + 1.4, el.cz - el.d / 2 + 0.45); G.add(doors);
    this.group.add(G); this._rooms.set(key, { G, y });
    if (this._rooms.size > 8) { const first = this._rooms.keys().next().value; const old = this._rooms.get(first); this.group.remove(old.G); this._rooms.delete(first); } // cap live rooms
    return this._rooms.get(key);
  }
  // ---- elevated metro loop: a lit three-car train orbits the city on a guideway ----
  _buildTrain() {
    const half = this.half, cx = -half * 0.06, cz = 0, r = half * 0.6, y = 15;
    this.trainTrack = { cx, cz, r, y };
    const guide = new THREE.Mesh(new THREE.TorusGeometry(r, 0.38, 6, 140), mat(0x2a2e38, { metalness: 0.3, roughness: 0.5 }));
    guide.rotation.x = Math.PI / 2; guide.position.set(cx, y - 1.5, cz); this.group.add(guide);
    const rail2 = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 4, 140), mat(0x8a919c, { metalness: 0.6, roughness: 0.3 }));
    rail2.rotation.x = Math.PI / 2; rail2.position.set(cx, y - 1.05, cz); this.group.add(rail2);
    for (let a = 0; a < 30; a++) { const ang = a / 30 * TAU, px = cx + Math.cos(ang) * r, pz = cz + Math.sin(ang) * r; if (!this.net.isLand(px, pz)) continue; const h = y - 1.6, pyl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, h, 8), mat(0x272b33)); pyl.position.set(px, h / 2, pz); pyl.castShadow = true; this.group.add(pyl); this.boxes.push({ x: px, z: pz, hw: 0.9, hd: 0.9 }); }
    this.trainCars = [];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 8.6), mat(0x3a4250, { metalness: 0.35, roughness: 0.4 })); body.castShadow = true; car.add(body);
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.8, 8.0), mat(0x101a28, { emissive: 0xffd9a0, emissiveIntensity: 0.9, transparent: true, opacity: 0.92 })); band.position.y = 0.42; car.add(band);
      const roofl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 7.8), mat(0x2fe6ff, { emissive: 0x2fe6ff, emissiveIntensity: 1.2 })); roofl.position.y = 1.32; car.add(roofl);
      if (i === 0) { const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 3 })); head.position.set(0, 0, -4.4); car.add(head); }
      this.group.add(car); this.trainCars.push(car);
    }
    this.trainT = 0;
  }
  // ---- curbside cones + trash cans you can plough through (they fly off when hit) ----
  _scatterKnockables() {
    const net = this.net; this.knockables = []; const rng = mulberry32((net.seed ^ 0xCA5) >>> 0);
    const addCone = (x, z) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 10), mat(0xff6a1a, { emissive: 0xff5a10, emissiveIntensity: 0.5 })); c.position.y = 0.4; c.castShadow = true; g.add(c); const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.16, 10), mat(0xe8e8e8, { emissive: 0x888888, emissiveIntensity: 0.3 })); band.position.y = 0.42; g.add(band); const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), mat(0x1a1a1a)); base.position.y = 0.04; g.add(base); g.position.set(x, this.groundH(x, z), z); this.group.add(g); this.knockables.push({ m: g, x, z, knocked: false }); };
    const addCan = (x, z) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 1.0, 10), mat(pick([0x2f5a3a, 0x3a3f48, 0x4a3a2a]))); c.position.y = 0.5; c.castShadow = true; g.add(c); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 10), mat(0x2a2a2a)); lid.position.y = 1.0; g.add(lid); g.position.set(x, this.groundH(x, z), z); this.group.add(g); this.knockables.push({ m: g, x, z, knocked: false }); };
    for (const e of net.edges) { if (e.class === 'alley' || e.class === 'highway' || e.isBridge) continue; const a = net.nodes[e.a].position, b = net.nodes[e.b].position, len = a.distanceTo(b); if (len < 24 || rng() > 0.28) continue; const t = 0.3 + rng() * 0.4, p = a.clone().lerp(b, t), dir = b.clone().sub(a).normalize(), perp = new THREE.Vector3(dir.z, 0, -dir.x), off = ROAD_CLASS[e.class].width / 2 - 0.6, side = rng() < 0.5 ? 1 : -1, x = p.x + perp.x * off * side, z = p.z + perp.z * off * side; if (!net.isLand(x, z)) continue; if (rng() < 0.6) addCone(x, z); else addCan(x, z); }
  }
  // ---- traffic signals on real intersections: incident edges split into two phase groups by angle ----
  _buildSignals() {
    const net = this.net;
    this.sigMatA = mat(0x114018, { emissive: 0x2fe06a, emissiveIntensity: 2.2 });
    this.sigMatB = mat(0x401111, { emissive: 0xff3a2a, emissiveIntensity: 2.2 });
    this.sigMatV = this.sigMatA; this.sigMatH = this.sigMatB;                          // legacy aliases
    this.signals = [];
    const CW = [], CWI = []; let cwv = 0;  // merged zebra crosswalk stripes
    const cwQuad = (p1, p2, p3, p4) => { for (const p of [p1, p2, p3, p4]) CW.push(p.x, 0.075, p.z); CWI.push(cwv, cwv + 1, cwv + 2, cwv, cwv + 2, cwv + 3); cwv += 4; };
    for (const n of net.nodes) {
      if (n.degree < 3) continue;
      let big = false; for (const eid of n.edges) { const cl = net.edges[eid].class; if (cl === 'highway' || cl === 'arterial' || cl === 'boulevard' || cl === 'collector') { big = true; break; } }
      if (!big) continue;
      const inc = n.edges.map(eid => { const e = net.edges[eid], o = e.a === n.id ? e.b : e.a, op = net.nodes[o].position; return { eid, ang: Math.atan2(op.z - n.position.z, op.x - n.position.x) }; });
      inc.sort((p, q) => p.ang - q.ang); n.sigGroup = new Map(); inc.forEach((it, i) => n.sigGroup.set(it.eid, i % 2));
      n.signal = true; this.signals.push(n.id);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 5.2, 8), mat(0x23262d)); pole.position.set(n.position.x, 2.6, n.position.z); pole.castShadow = true; this.group.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), mat(0x14161b)); head.position.set(n.position.x, 4.9, n.position.z); this.group.add(head);
      const la = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.sigMatA); la.position.set(n.position.x, 5.15, n.position.z + 0.28); this.group.add(la);
      const lb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.sigMatB); lb.position.set(n.position.x, 4.72, n.position.z + 0.28); this.group.add(lb);
      if (this.brng() < 0.6) this._lamp(n.position.x + 2.4, n.position.z + 2.4);
      // zebra crosswalk on each approach: stripes run parallel to traffic, banded across the road
      for (const eid of n.edges) { const e = net.edges[eid], o = e.a === n.id ? e.b : e.a, dir = net.nodes[o].position.clone().sub(n.position).normalize(), perp = new THREE.Vector3(dir.z, 0, -dir.x), rh = ROAD_CLASS[e.class].width / 2, t0 = rh + 0.4, t1 = rh + 2.8;
        for (let po = -rh + 0.5; po <= rh - 0.5; po += 0.95) { const a = n.position.clone().addScaledVector(dir, t0).addScaledVector(perp, po - 0.18), b = n.position.clone().addScaledVector(dir, t1).addScaledVector(perp, po - 0.18), cc = n.position.clone().addScaledVector(dir, t1).addScaledVector(perp, po + 0.18), d = n.position.clone().addScaledVector(dir, t0).addScaledVector(perp, po + 0.18); cwQuad(a, b, cc, d); } }
    }
    if (CWI.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(CW, 3)); g.setIndex(CWI); g.computeVertexNormals(); this.group.add(new THREE.Mesh(g, mat(0xe8ecf2, { emissive: 0x9498a0, emissiveIntensity: 0.45 }))); }
  }
  // ---- pick a build spot beside the road nearest a POI, on the land side, and reserve the plot ----
  _spotNear(pos, off) {
    const ne = this.net.nearestEdge(pos.x, pos.z); if (!ne) return pos.clone();
    const a = this.net.nodes[ne.edge.a].position, b = this.net.nodes[ne.edge.b].position, dir = b.clone().sub(a).normalize(), perp = new THREE.Vector3(dir.z, 0, -dir.x);
    const s = (off || 22) + ROAD_CLASS[ne.edge.class].width / 2;
    let cand = ne.point.clone().addScaledVector(perp, s); if (!this.net.isLand(cand.x, cand.z)) cand = ne.point.clone().addScaledVector(perp, -s);
    return cand;
  }
  _reserve(p, r) { this._reservedPlots.push({ x: p.x, z: p.z, r: r || 20 }); }
  _isReserved(x, z) { for (const p of this._reservedPlots) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true; return false; }
  // ---- named landmarks anchored to POIs; also fills `this.places` for the story/minimap/GPS ----
  _buildLandmarks() {
    const net = this.net, G = this.group, poi = (n) => { const p = net.getPOI(n); return p ? p.position.clone() : new THREE.Vector3(0, 0, 0); };
    // DOWNTOWN — a supertall spire, the bank, the gun shop, the county lockup
    const dt = poi('downtownTower'), tw = this._spotNear(dt, 24); this._tower(tw.x, tw.z, 26, 26, 210, FACADES[0], this.brng, G, { tall: true }); this._reserve(tw, 30); this.downtownTower = { x: tw.x, z: tw.z };
    const bk = this._spotNear(dt.clone().add(new THREE.Vector3(60, 0, 20)), 20); this._bank(bk.x, bk.z, 34, G); this._reserve(bk, 24);
    const gs = this._spotNear(dt.clone().add(new THREE.Vector3(-55, 0, 40)), 20); this._gunshop(gs.x, gs.z, 34, G); this._reserve(gs, 24);
    const jl = this._spotNear(dt.clone().add(new THREE.Vector3(30, 0, -70)), 20); this._jail(jl.x, jl.z, 40, G); this._reserve(jl, 28);
    // COMMERCIAL / Little Havana — city hall plaza, Tony's diner, the dealership
    const ch = poi('cityHall'), pl = this._spotNear(ch, 24); this._plaza(pl.x, pl.z, 46, this.brng, G); this._reserve(pl, 30);
    const td = this._spotNear(ch.clone().add(new THREE.Vector3(50, 0, 30)), 20); this._venue(td.x, td.z, 34, 'diner', this.brng, G); this._reserve(td, 24); this.tonyDiner = { x: td.x, z: td.z };
    const mm = this._spotNear(ch.clone().add(new THREE.Vector3(-40, 0, -50)), 22); this._dealership(mm.x, mm.z, 40, this.brng, G); this._reserve(mm, 28); this.motormax = { x: mm.x, z: mm.z };
    // INDUSTRIAL / docklands — Sal's garage + container warehouses
    const pc = poi('portCranes'), sg = this._spotNear(pc, 22); this._warehouse(sg.x, sg.z, 40, this.brng, G); this._reserve(sg, 26); this.salGarage = { x: sg.x, z: sg.z };
    // BEACH / Ocean Drive — Dezzy's club, the beach mall, the pier
    const bm = poi('beachMall'), dz = this._spotNear(bm, 22); this._venue(dz.x, dz.z, 36, 'club', this.brng, G); this._reserve(dz, 26); this.dezzyClub = { x: dz.x, z: dz.z };
    const pier = poi('pier');
    for (let p = 0; p < 5; p++) this.palm(bm.x + 8 + p * 8, bm.z - 20, G);
    this.beachSpots.push({ x: bm.x + 10, z: bm.z + 14 }); this.errands.push({ x: bm.x + 10, z: bm.z + 14 });
    // BAYSIDE GALLERIA — a real mall: anchor box + glowing entrance + interior kiosks + a parking field
    const ml = this._spotNear(bm.clone().add(new THREE.Vector3(-70, 0, -40)), 30); this._mall(ml.x, ml.z); this._reserve(ml, 52); this.places = this.places || {};
    this.mallPos = { x: ml.x, z: ml.z };
    // SUBURB / Sunset Heights — your house
    const sub = poi('suburbGate'), hm = this._spotNear(sub, 20); this._houses(hm.x, hm.z, 34, this.brng, G, true); this._reserve(hm, 24); this.homePos = { x: hm.x, z: hm.z };
    // ISLAND enclave — Starfish villas
    const en = poi('islandEnclave'); this.starfish = { x: en.x, z: en.z, rx: 24, rz: 28 }; this._starfish(); this._reserve(en, 34); this.starfishPlace = { x: en.x, z: en.z };
    // offshore Isla Privada villa + a lighthouse on the cay
    this._mansion(this.islets[0]); this._lighthouse(net.half);
    // ---- named story/minimap places (all by NAME, resolved to these landmark plots) ----
    const bayMid = { x: (net.bayL + net.bayR) / 2, z: 0 };
    this.places = {
      tonyDiner: this.tonyDiner, salGarage: this.salGarage, dezzyClub: this.dezzyClub,
      docks: { x: pc.x, z: pc.z }, strip: { x: bm.x, z: bm.z - 30 }, gunshop: { x: gs.x, z: gs.z },
      bank: { x: bk.x, z: bk.z }, home: this.homePos, motormax: this.motormax, jail: { x: jl.x, z: jl.z },
      beach: { x: poi('beachMall').x + 20, z: poi('beachMall').z }, waterfront: bayMid,
      finale: { x: bayMid.x, z: net.half * 0.55 }, privado: { x: this.privIslet.x, z: this.privIslet.z },
      marina: { x: pier.x, z: pier.z }, starfish: this.starfishPlace, mall: this.mallPos,
    };
  }
  // ---- BAYSIDE GALLERIA: anchor box + parking field between road and doors + interior kiosk strip ----
  // (real-mall anatomy: one big-box anchor, a lit parking lot out front, small tenants inside one shell)
  _mall(cx, cz) {
    const G = this.group, W = 46, D = 28, H = 9;
    // parking field out front (south side): pale slab + bays + lamp poles + spots for parked cars
    const lot = new THREE.Mesh(new THREE.BoxGeometry(W + 18, 0.18, 26), mat(0x23262c, { roughness: 0.3, metalness: 0.1, envMapIntensity: 1.4 })); lot.position.set(cx, 0.09, cz + D / 2 + 14); lot.receiveShadow = true; G.add(lot);
    this.mallParking = [];
    for (let i = 0; i < 8; i++) { const px = cx - W / 2 - 2 + i * ((W + 8) / 7), pz = cz + D / 2 + 9 + (i % 2) * 10; const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 4.6), mat(0xd8dce4, { emissive: 0x888c94, emissiveIntensity: 0.35 })); stripe.position.set(px, 0.12, pz); G.add(stripe); if (i % 2 === 0) this.mallParking.push({ x: px + 1.6, z: pz, yaw: 0 }); }
    this._lamp(cx - W / 2 - 4, cz + D / 2 + 14); this._lamp(cx + W / 2 + 4, cz + D / 2 + 14);
    // the anchor shell (walk in through the glowing south entrance; inside, the shell culls to glass)
    const shellCol = 0x2e3138, shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat(shellCol, { emissive: shellCol, emissiveIntensity: 0.1 })); shell.position.set(cx, H / 2, cz); shell.castShadow = true; shell.receiveShadow = true; G.add(shell);
    const ent = new THREE.Mesh(new THREE.BoxGeometry(10, 5.4, 0.5), mat(0x101a24, { emissive: 0x2fd0e0, emissiveIntensity: 1.1, transparent: true, opacity: 0.85 })); ent.position.set(cx, 2.7, cz + D / 2 + 0.2); G.add(ent);
    this._neonSign('GALLERIA', 0xff5fb0, cx, H + 1.6, cz + D / 2 + 0.4, 18, G);
    // collision: back + sides + front split around the 10-wide door
    this.boxes.push({ x: cx, z: cz - D / 2, hw: W / 2, hd: 0.5 });
    this.boxes.push({ x: cx - W / 2, z: cz, hw: 0.5, hd: D / 2 }); this.boxes.push({ x: cx + W / 2, z: cz, hw: 0.5, hd: D / 2 });
    for (const s of [-1, 1]) this.boxes.push({ x: cx + s * (W / 4 + 2.5), z: cz + D / 2, hw: W / 4 - 2.5, hd: 0.5 });
    // interior: tiled floor, kiosk strip along the back, benches + planters down the middle
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.16, D - 1), mat(0xb4b9c3, { emissive: 0x9aa0aa, emissiveIntensity: 0.22 })); floor.position.set(cx, 0.1, cz); floor.receiveShadow = true; G.add(floor);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.1, 1.4), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.4 })); strip.position.set(cx, H - 1.2, cz); G.add(strip);
    const KIOSK = [['KICKS+', 0x2fe6ff], ['GLOW SKIN', 0xff5fb0], ['BAY BOOKS', 0xffd23a], ['NOODLE-GO', 0xff5a5a], ['TECHTRIX', 0x9b5cff]];
    for (let i = 0; i < KIOSK.length; i++) {
      const kx = cx - W / 2 + 6 + i * ((W - 12) / (KIOSK.length - 1)), kz = cz - D / 2 + 3.2;
      const booth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.2, 3.4), mat(pick(FACADES))); booth.position.set(kx, 1.6, kz); booth.castShadow = true; G.add(booth);
      this._neonSign(KIOSK[i][0], KIOSK[i][1], kx, 3.9, kz + 1.85, 5, G);
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.0, 0.8), mat(0x5a4632)); counter.position.set(kx, 0.6, kz + 2.6); G.add(counter);
      this.boxes.push({ x: kx, z: kz, hw: 2.8, hd: 1.8, h: 3.4 });
      this.shops.push({ x: kx, z: kz + 2.6, w: 5, d: 3, type: 'shop', name: KIOSK[i][0] });
      this.workposts.push({ x: kx, z: kz + 1.9, yaw: Math.PI }); // leisure spots for these kiosks get added by the shops pass in build()
    }
    for (const sx of [-8, 0, 8]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8), mat(0x6a4a2e)); bench.position.set(cx + sx, 0.42, cz + 3); G.add(bench); const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 10), mat(0x7a6a58)); planter.position.set(cx + sx + 2, 0.5, cz + 3); G.add(planter); const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), mat(0x2f7e44)); bush.position.set(cx + sx + 2, 1.15, cz + 3); G.add(bush); this.errands.push({ x: cx + sx, z: cz + 3 }); }
    const pl = new THREE.PointLight(0xfff0d0, 10, 34, 2); pl.position.set(cx, H - 2, cz); G.add(pl);
    if (this._lod) this._lod.push({ x: cx, z: cz, w: W, d: D, h: H, c: shellCol });
  }
  // ---- fill each district with buildings fronting its streets, thinned by the density field ----
  _buildDistricts() {
    const net = this.net, half = net.half, STR = 30, rng = mulberry32((net.seed ^ 0xB00B5) >>> 0);
    for (let gx = -half + 34; gx <= half - 34; gx += STR) {
      for (let gz = -half + 34; gz <= half - 34; gz += STR) {
        const x = gx + (rng() - 0.5) * 9, z = gz + (rng() - 0.5) * 9;
        if (!net.isLand(x, z)) continue;
        const ne = net.nearestEdge(x, z); if (!ne) continue;
        const rw = ROAD_CLASS[ne.edge.class].width / 2;
        if (ne.dist < rw + 6.5 || ne.dist > 40) continue;                              // line the street, leave a clear carriageway
        if (this._isReserved(x, z)) continue;
        const d = net.districtAt(x, z), dens = net.density(x, z);
        if (rng() > 0.32 + dens * 0.95) continue;       // wilderness thins out at the fringe
        if (d.type === 'suburb' && rng() < 0.44) continue; // suburbs breathe: yards and gaps between houses, stores spread out
        this._placeBuilding(x, z, 30, d, rng);
      }
    }
  }
  _placeBuilding(x, z, LOT, d, rng) {
    const G = this._cullGroup(x, z), dens = this.net.density(x, z), r = rng(), t = d.type;
    if (t === 'downtown') {
      if (r < 0.12) this._venue(x, z, LOT, ['shop', 'club', 'diner'][(rng() * 3) | 0], rng, G);
      else this._tower(x, z, LOT - 8, LOT - 10, 56 + dens * 92 + rng() * 40, FACADES[(rng() * FACADES.length) | 0], rng, G, { tall: rng() < 0.7 });
    } else if (t === 'commercial') {
      if (r < 0.14) this._park(x, z, LOT, rng, G);
      else if (r < 0.5) this._venue(x, z, LOT, ['shop', 'diner', 'club', 'shop'][(rng() * 4) | 0], rng, G);
      else this._tower(x, z, LOT - 12, LOT - 14, 26 + dens * 60 + rng() * 24, FACADES[(rng() * FACADES.length) | 0], rng, G, { tall: rng() < 0.3 });
    } else if (t === 'industrial') {
      if (r < 0.1) this._camp(x, z, LOT, rng, G);
      else if (r < 0.72) this._warehouse(x, z, LOT, rng, G);
      else this._block(x, z, LOT, rng, 0.5, G);
    } else if (t === 'beach') {
      if (r < 0.14) this._park(x, z, LOT, rng, G);
      else if (r < 0.5) this._venue(x, z, LOT, ['hotel', 'club', 'diner', 'hotel', 'shop'][(rng() * 5) | 0], rng, G);
      else { this._tower(x, z, LOT - 12, LOT - 14, 16 + dens * 46 + rng() * 18, this.DECO[(rng() * this.DECO.length) | 0], rng, G); if (rng() < 0.3) this.palm(x + LOT / 2 + 3, z, G); }
    } else {
      if (r < 0.14) this._park(x, z, LOT, rng, G);
      else if (r < 0.26) this._venue(x, z, LOT, pick(['shop', 'diner']), rng, G); // the lone corner store / diner every few blocks
      else { this._houses(x, z, LOT, rng, G, false); this.homes.push({ x, z }); }
    }
    this._lod = [];
  }
  // ---- coarse super-cell groups for frustum/distance culling (+ cheap LOD shells for the far field) ----
  _cullGroup(x, z) {
    const CS = 120, kx = Math.floor(x / CS), kz = Math.floor(z / CS), k = kx + ',' + kz;
    let e = this._cull.get(k);
    if (!e) { const g = new THREE.Group(); this.group.add(g); const cull = { o: g, lod: null, p: new THREE.Vector3((kx + 0.5) * CS, 18, (kz + 0.5) * CS), r: CS }; this.cullables.push(cull); e = { g, lodSpecs: [], cull }; this._cull.set(k, e); }
    this._lod = e.lodSpecs; return e.g;
  }
  _finalizeLOD() {
    for (const e of this._cull.values()) {
      if (!e.lodSpecs.length) continue;
      const L = new THREE.Group();
      for (const s of e.lodSpecs) { const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), this._lodMat(s.c)); m.position.set(s.x, s.h / 2, s.z); L.add(m); }
      L.visible = false; this.group.add(L); e.cull.lod = L;
    }
  }
  // ---- lane-graph navigation the car/police AI drive on ----
  nearestNode(x, z) { let best = 0, bd = 1e18; for (const n of this.net.nodes) { const dx = n.position.x - x, dz = n.position.z - z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = n.id; } } return best; }
  nodePos(id) { const n = this.net.nodes[id]; return n ? n.position : new THREE.Vector3(); }
  edgeBetween(a, b) { const na = this.net.nodes[a]; if (!na) return null; for (const eid of na.edges) { const e = this.net.edges[eid]; if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return eid; } return null; }
  // choose the next node to head to from `atId`, having come from `fromId`; scorer(node)->higher is better
  pickNext(fromId, atId, scorer) {
    const at = this.net.nodes[atId]; if (!at || !at.edges.length) return fromId;
    const nb = at.edges.map(eid => { const e = this.net.edges[eid]; return e.a === atId ? e.b : e.a; });
    let cands = nb.filter(n => n !== fromId); if (!cands.length) cands = nb;                 // dead-end → U-turn
    if (scorer) { let best = cands[0], bs = -1e18; for (const n of cands) { const s = scorer(this.net.nodes[n]); if (s > bs) { bs = s; best = n; } } return best; }
    return cands[(Math.random() * cands.length) | 0];
  }
  // A* over the lane graph (edge length = euclidean); returns node-id path start..goal or null
  pathfind(startId, goalId, maxExpand) {
    const net = this.net, N = net.nodes, goal = N[goalId]; if (!N[startId] || !goal) return null; if (startId === goalId) return [startId];
    const g = new Float64Array(N.length).fill(Infinity), f = new Float64Array(N.length).fill(Infinity), came = new Int32Array(N.length).fill(-1);
    const inOpen = new Uint8Array(N.length), closed = new Uint8Array(N.length), open = [startId];
    g[startId] = 0; f[startId] = goal.position.distanceTo(N[startId].position); inOpen[startId] = 1;
    let expand = 0; const lim = maxExpand || 2500;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inOpen[cur] = 0;
      if (cur === goalId) { const path = [cur]; let p = cur; while (came[p] !== -1) { p = came[p]; path.push(p); } return path.reverse(); }
      closed[cur] = 1; if (++expand > lim) break;
      for (const eid of N[cur].edges) { const e = net.edges[eid], nb = e.a === cur ? e.b : e.a; if (closed[nb]) continue;
        const tg = g[cur] + N[cur].position.distanceTo(N[nb].position);
        if (tg < g[nb]) { came[nb] = cur; g[nb] = tg; f[nb] = tg + goal.position.distanceTo(N[nb].position); if (!inOpen[nb]) { open.push(nb); inOpen[nb] = 1; } }
      }
    }
    return null;
  }
  _lodMat(c) { if (!this._lodMats.has(c)) this._lodMats.set(c, mat(new THREE.Color(c).multiplyScalar(0.94).getHex())); return this._lodMats.get(c); }
  // real windows: instanced glass panes (lit + dark) and a slab ring per storey —
  // actual geometry with floors between rows, not a painted-on texture.
  _towerWindows(x, z, w, d, h0, shaftH, G) {
    if (!this._winGeo) {
      this._winGeo = new THREE.BoxGeometry(2.2, 2.3, 0.14);
      this._winLit = mat(0xffedc0, { emissive: 0xffe2a8, emissiveIntensity: 1.4 });
      this._winLitCool = mat(0xcfe4ff, { emissive: 0x9fc4ff, emissiveIntensity: 1.3 });
      this._winDark = mat(0x1a2330); this._winDark.roughness = 0.4;
      this._slabMat = mat(0x555a64);
    }
    const floorH = 4, rows = Math.max(1, Math.floor((shaftH - 2.2) / floorH));
    const colsX = Math.max(1, Math.floor((w - 1.6) / 3.4)), colsZ = Math.max(1, Math.floor((d - 1.6) / 3.4));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
    const litM = [], litCoolM = [], darkM = [];
    // only ~13% of rooms are lit at night → a dark skyline with scattered warm/cool windows
    const place = (px, py, pz, ry) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); P.set(px, py, pz); M.compose(P, Q, S); const r = Math.random(); (r < 0.09 ? litM : r < 0.13 ? litCoolM : darkM).push(M.clone()); };
    for (let r = 0; r < rows; r++) {
      const wy = h0 + 2.2 + r * floorH;
      for (let c2 = 0; c2 < colsX; c2++) { const wx = x - ((colsX - 1) * 3.4) / 2 + c2 * 3.4; place(wx, wy, z + d / 2 + 0.09, 0); place(wx, wy, z - d / 2 - 0.09, Math.PI); }
      for (let c2 = 0; c2 < colsZ; c2++) { const wz = z - ((colsZ - 1) * 3.4) / 2 + c2 * 3.4; place(x + w / 2 + 0.09, wy, wz, Math.PI / 2); place(x - w / 2 - 0.09, wy, wz, -Math.PI / 2); }
    }
    const inst = (mats, m3) => { if (!mats.length) return; const im = new THREE.InstancedMesh(this._winGeo, m3, mats.length); for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]); im.instanceMatrix.needsUpdate = true; G.add(im); };
    inst(litM, this._winLit); inst(litCoolM, this._winLitCool); inst(darkM, this._winDark);
    // one slab ring per storey — the "floors between the windows"
    const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), this._slabMat, rows);
    for (let r = 0; r < rows; r++) { P.set(x, h0 + 0.6 + r * floorH, z); Q.identity(); M.compose(P, Q, S); slabs.setMatrixAt(r, M); }
    slabs.instanceMatrix.needsUpdate = true; G.add(slabs);
  }
  _dealership(cx, cz, LOT, rng, G) {
    // MOTORMAX: showroom pad with display cars to buy (B) + a spray shop pad (E in car)
    this.displays = this.displays || [];
    const pad = new THREE.Mesh(new THREE.BoxGeometry(LOT - 4, 0.26, LOT - 4), mat(0xd8dde6)); pad.position.set(cx, 0.14, cz); pad.receiveShadow = true; G.add(pad);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 10), mat(0x2a2e36)); pole.position.set(cx - LOT / 2 + 4, 7, cz + LOT / 2 - 4); pole.castShadow = true; G.add(pole);
    this._neonSign('MOTORMAX', 0x2fe6ff, cx - LOT / 2 + 4, 13, cz + LOT / 2 - 3.4, 12, G);
    const specs = [{ kind: 'sports', color: 0xd23b3b, price: 3500, label: 'VELOCE GT' }, { kind: 'monster', color: 0x2f9e54, price: 5000, label: 'RHINO XL' }];
    specs.forEach((s, i) => {
      const px = cx - 8 + i * 16, pz = cz - 6;
      const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.5, 22), mat(0xb8c0ca)); ped2.position.set(px, 0.4, pz); G.add(ped2);
      this.boxes.push({ x: px, z: pz, hw: 4.6, hd: 4.6, h: 0.9 });
      const car = buildSpecial(s.kind, s.color); car.position.set(px, 0.65, pz); G.add(car);
      this.displays.push({ x: px, z: pz, kind: s.kind, color: s.color, price: s.price, label: s.label, root: car });
      this._neonSign('$' + s.price, 0xffe24a, px, 4.6, pz + 4.9, 5, G);
    });
    // spray pad
    const sp = new THREE.Mesh(new THREE.BoxGeometry(9, 0.28, 9), mat(0xff5fb0, { emissive: 0xff4fa0, emissiveIntensity: 0.5 })); sp.position.set(cx + 12, 0.16, cz + 12); G.add(sp);
    this._neonSign('SPRAY', 0xff5fb0, cx + 12, 4.2, cz + 16.4, 6, G);
    const spole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), mat(0x2a2e36)); spole.position.set(cx + 12, 2, cz + 16.6); G.add(spole);
    this.sprayPad = { x: cx + 12, z: cz + 12 };
    this._lod.push({ x: cx, z: cz, w: LOT - 6, d: LOT - 6, h: 3, c: 0xd8dde6 });
  }
  // ---- Bay County lockup: walled yard, watchtower, and the holding cell you wake up in when they bust you ----
  _jail(cx, cz, LOT, G) {
    const wallM = mat(0x9aa0a8), barM = mat(0x3a3f48), t = 0.6, H = 4.4, W = LOT - 6, hw = W / 2;
    const yard = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 0.24, W + 4), mat(0x70747c, { map: noiseTexture(104, 108, 116, 8) })); yard.position.set(cx, 0.13, cz); yard.receiveShadow = true; G.add(yard);
    const seg = (w, d, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM); m.position.set(cx + ox, H / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: w / 2 + 0.25, hd: d / 2 + 0.25 }); };
    seg(W, t, 0, -hw); seg(t, W + t, -hw, 0); seg(t, W + t, hw, 0);
    const gw = (W - 6) / 2; seg(gw, t, -(3 + gw / 2), hw); seg(gw, t, 3 + gw / 2, hw); // gate gap onto the street
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.5, 1.5), wallM); tower.position.set(cx + hw - 4, 3.75, cz - hw + 4); tower.castShadow = true; G.add(tower);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 3.8), mat(0x2b3340, { emissive: 0x9fd0ff, emissiveIntensity: 0.3 })); cab.position.set(cx + hw - 4, 8.6, cz - hw + 4); cab.castShadow = true; G.add(cab);
    this.boxes.push({ x: cx + hw - 4, z: cz - hw + 4, hw: 1.0, hd: 1.0, h: 10 });
    this._neonSign('BAY COUNTY JAIL', 0x9fd0ff, cx, H + 1.5, cz + hw + 0.35, 17, G);
    // cell block: open side faces the yard; the left half is the holding cage
    const bw = 26, bd = 13, bh = 4.6, bz = cz - hw + 8, blkM = mat(0x848a94, { emissive: 0x848a94, emissiveIntensity: 0.16 });
    const bf = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.2, bd), mat(0x565b66, { emissive: 0x565b66, emissiveIntensity: 0.3 })); bf.position.set(cx, 0.14, bz); bf.receiveShadow = true; G.add(bf);
    const br = new THREE.Mesh(new THREE.BoxGeometry(bw + 1, 0.5, bd + 1), blkM); br.position.set(cx, bh, bz); br.castShadow = true; G.add(br);
    const bwall = (w2, d2, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, bh, d2), blkM); m.position.set(cx + ox, bh / 2, bz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: bz + oz, hw: w2 / 2 + 0.25, hd: d2 / 2 + 0.25 }); };
    bwall(bw, t, 0, -bd / 2); bwall(t, bd, -bw / 2, 0); bwall(t, bd, bw / 2, 0);
    const lampJ = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.7, 0.14, 4), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.7 })); lampJ.position.set(cx, bh - 0.4, bz); G.add(lampJ);
    this._lamp(cx - 10, cz + 10); this._lamp(cx + 10, cz + 2); // yard floods
    // the cage: vertical bars with one sliding door section that only opens from outside (or with three good picks)
    const doorX = cx - 7.5, frontZ = bz + bd / 2 - 0.5;
    const bars = (x0, z0, len, vert, skipC, skipW) => {
      const n2 = Math.max(2, Math.round(len / 0.55));
      for (let i = 0; i <= n2; i++) { const o = -len / 2 + (i / n2) * len, px = vert ? x0 : x0 + o, pz = vert ? z0 + o : z0; if (skipW && Math.abs((vert ? pz : px) - skipC) < skipW / 2) continue; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.4, 6), barM); b.position.set(px, 1.7, pz); G.add(b); }
      for (const ry of [0.14, 3.32]) { const r = new THREE.Mesh(new THREE.BoxGeometry(vert ? 0.1 : len, 0.1, vert ? len : 0.1), barM); r.position.set(x0, ry, z0); G.add(r); }
    };
    bars(cx - 2, bz, bd - 1, true); // cage side wall
    this.boxes.push({ x: cx - 2, z: bz, hw: 0.16, hd: (bd - 1) / 2, h: 3.5 });
    const fl = bw / 2 - 2; bars(cx - 2 - fl / 2, frontZ, fl, false, doorX, 2.6); // cage front with the door gap
    this.boxes.push({ x: (cx - bw / 2 + doorX - 1.3) / 2, z: frontZ, hw: (doorX - 1.3 - (cx - bw / 2)) / 2, hd: 0.16, h: 3.5 });
    this.boxes.push({ x: (doorX + 1.3 + cx - 2) / 2, z: frontZ, hw: (cx - 2 - (doorX + 1.3)) / 2, hd: 0.16, h: 3.5 });
    const door = new THREE.Group();
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.3, 6), barM); b.position.set(-1.1 + i * 0.55, 1.7, 0); door.add(b); }
    for (const ry of [0.2, 3.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), barM); r.position.set(0, ry, 0); door.add(r); }
    door.position.set(doorX + 2.7, 0, frontZ); G.add(door); // parked in its open slot; it slides shut when they book you
    this.jailDoor = door; this.jailDoorBox = { x: doorX, z: frontZ, hw: 1.4, hd: 0.2, h: 3.5 };
    this.jail = { cell: { x: doorX, z: bz - 2 }, door: { x: doorX, z: frontZ } };
    this.jailOpen = true;
    // bunk + steel toilet in the cage, duty desk on the guard side
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.2), mat(0x4a5a6c)); bunk.position.set(cx - 11, 0.55, bz - 4.6); G.add(bunk); this.boxes.push({ x: cx - 11, z: bz - 4.6, hw: 1.4, hd: 0.7, h: 1 });
    const mtr = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 1.1), mat(0xd8dde6)); mtr.position.set(cx - 11, 0.9, bz - 4.6); G.add(mtr);
    const toi = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.55, 10), mat(0xc8ced8)); toi.position.set(cx - 3.4, 0.32, bz - 4.9); G.add(toi);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 1.2), mat(0x5a4632)); desk.position.set(cx + 6, 0.75, bz - 2); desk.castShadow = true; G.add(desk); this.boxes.push({ x: cx + 6, z: bz - 2, hw: 1.9, hd: 0.8, h: 1.3 });
    if (this._lod) { this._lod.push({ x: cx, z: bz, w: bw, d: bd, h: bh, c: 0x848a94 }); this._lod.push({ x: cx, z: cz, w: W, d: W, h: H, c: 0x9aa0a8 }); }
  }
  jailDoorClose() { if (!this.jailDoor) return; this.jailOpen = false; if (this.boxes.indexOf(this.jailDoorBox) < 0) this.boxes.push(this.jailDoorBox); }
  jailDoorOpen() { if (!this.jailDoor) return; this.jailOpen = true; const i = this.boxes.indexOf(this.jailDoorBox); if (i >= 0) this.boxes.splice(i, 1); }
  // ---- AMMU-BAY: the island's legal-carry gun counter (walk in, E at the counter to buy) ----
  _gunshop(cx, cz, LOT, G) {
    const w = LOT - 12, d = LOT - 18, h = 5.8, t = 0.4, col = 0x4a5260, wallMat = mat(col, { emissive: col, emissiveIntensity: 0.18 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3a4048, { emissive: 0x3a4048, emissiveIntensity: 0.32 })); floor.position.set(cx, 0.14, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), wallMat); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this._neonSign('AMMU-BAY', 0xff9a3a, cx, h + 1.1, cz + d / 2 + 0.25, w * 0.8, G);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.5, 0.3), mat(0xff9a3a, { emissive: 0xff9a3a, emissiveIntensity: 1.6 })); strip.position.set(cx, h + 0.25, cz + d / 2 + 0.2); G.add(strip);
    const cnt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.05, 1.4), mat(0x2b3340)); cnt.position.set(cx, 0.8, cz - d * 0.18); cnt.castShadow = true; G.add(cnt);
    const showcase = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.3, 1.2), mat(0x9fe8ff, { emissive: 0x4fd0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.6 })); showcase.position.set(cx, 1.45, cz - d * 0.18); G.add(showcase);
    this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9, h: 1.5 });
    for (let i = 0; i < 4; i++) { // wall racks with hardware on pegs
      const rx = cx - w / 2 + 4 + i * (w - 8) / 3;
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.12), mat(0x2c313b)); rack.position.set(rx, 2.6, cz - d / 2 + 0.35); G.add(rack);
      const g1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.1), mat(0x14171c)); g1.position.set(rx, 3.1, cz - d / 2 + 0.45); G.add(g1);
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.1), mat(0x14171c)); g2.position.set(rx - 0.45, 2.6, cz - d / 2 + 0.45); G.add(g2);
    }
    const tgt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 1.0), mat(0xe8e2d2)); tgt.position.set(cx + w / 2 - 0.4, 1.7, cz + d * 0.2); G.add(tgt);
    const sil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.55), mat(0x2b2b33)); sil.position.set(cx + w / 2 - 0.44, 1.7, cz + d * 0.2); G.add(sil);
    const lampG = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.14, d * 0.55), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.8 })); lampG.position.set(cx, h - 0.4, cz); G.add(lampG);
    this.workposts.push({ x: cx, z: cz - d * 0.18 - 1.35, yaw: 0 });
    this.errands.push({ x: cx, z: cz + d / 2 + 2.5 });
    this.shops.push({ x: cx, z: cz, w, d, type: 'gunshop', name: 'AMMU-BAY' });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
  }
  // ---- Bay Mutual: marble, columns, tellers — and a vault that only argues with a drawn pistol ----
  _bank(cx, cz, LOT, G) {
    const w = LOT - 10, d = LOT - 14, h = 9, t = 0.5, col = 0xd9d3c6, wallMat = mat(col, { emissive: col, emissiveIntensity: 0.14 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat(0xbfb9ac, { emissive: 0xbfb9ac, emissiveIntensity: 0.24 })); floor.position.set(cx, 0.15, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.8, d + 1.4), mat(0xc9c3b6)); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    for (let i = 0; i < 4; i++) { const px = cx - w / 2 + (i + 0.5) * (w / 4); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, h, 14), wallMat); c2.position.set(px, h / 2, cz + d / 2 - 0.7); c2.castShadow = true; G.add(c2); this.boxes.push({ x: px, z: cz + d / 2 - 0.7, hw: 0.85, hd: 0.85 }); }
    const steps = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.5, 3), mat(0xcac4b7)); steps.position.set(cx, 0.25, cz + d / 2 + 1.4); G.add(steps);
    this._neonSign('BAY MUTUAL', 0xffd23a, cx, h + 1.2, cz + d / 2 + 0.3, w * 0.7, G);
    const cnt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 1.15, 1.4), mat(0x6b5638)); cnt.position.set(cx, 0.86, cz - d * 0.2); cnt.castShadow = true; G.add(cnt);
    this.boxes.push({ x: cx, z: cz - d * 0.2, hw: w * 0.33 + 0.2, hd: 0.9, h: 1.5 });
    const teller = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 1.0, 0.08), mat(0xbfe4e8, { transparent: true, opacity: 0.35 })); teller.position.set(cx, 2.0, cz - d * 0.2); G.add(teller);
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 22), mat(0x8a8f98)); vault.rotation.x = Math.PI / 2; vault.position.set(cx, 2.2, cz - d / 2 + 0.7); G.add(vault);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 10, 22), mat(0xffd23a, { emissive: 0xd4a92f, emissiveIntensity: 0.8 })); ring.position.set(cx, 2.2, cz - d / 2 + 1.02); G.add(ring);
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), mat(0xc9a23a)); pole.position.set(cx + sx * 2.2, 0.65, cz + 1 + i * 2.4); G.add(pole); }
    const chand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.16, d * 0.4), mat(0xfff2d8, { emissive: 0xffe9c0, emissiveIntensity: 1.4 })); chand.position.set(cx, h - 0.7, cz); G.add(chand);
    this.workposts.push({ x: cx - w * 0.15, z: cz - d * 0.2 - 1.4, yaw: 0 });
    this.workposts.push({ x: cx + w * 0.15, z: cz - d * 0.2 - 1.4, yaw: 0 });
    this.shops.push({ x: cx, z: cz, w, d, type: 'bank', name: 'Bay Mutual' });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
  }
  // ---- northwest suburbs: lawns, picket fences, family homes — and your own place ----
  _houses(cx, cz, LOT, rng, G, mine) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.24, LOT), mat(0x4c8a4f, { map: noiseTexture(76, 134, 80, 14) })); lawn.material.map.repeat.set(5, 5); lawn.position.set(cx, 0.12, cz); lawn.receiveShadow = true; G.add(lawn);
    const HOUSE = [0xf2e0c8, 0xd8e8f0, 0xf0d2d8, 0xe2e8d0, 0xf5e6bc, 0xd9c9ee], ROOFS = [0x9a4f3a, 0x6b4a3a, 0x54606e, 0x7a5a46];
    const house = (hx, hz, open) => {
      const w2 = 15, d2 = 11, h2 = 3.4, col = open ? 0xf5e6bc : HOUSE[(rng() * HOUSE.length) | 0], rcol = ROOFS[(rng() * ROOFS.length) | 0], wallMat = mat(col);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w2 * 0.74, 2.6, 4), mat(rcol)); roof.scale.z = d2 / w2 * 1.15; roof.rotation.y = Math.PI / 4; roof.position.set(hx, h2 + 1.3, hz); roof.castShadow = true; G.add(roof);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), mat(0x8a5a4a)); chim.position.set(hx + w2 / 2 - 2, h2 + 1.6, hz - 2); G.add(chim);
      if (open) { // your place: front door's always open for you
        const t2 = 0.4, wallMat2 = mat(col, { emissive: col, emissiveIntensity: 0.16 });
        const floor2 = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.2, d2), mat(0x7a5a3c, { emissive: 0x7a5a3c, emissiveIntensity: 0.28 })); floor2.position.set(hx, 0.14, hz); floor2.receiveShadow = true; G.add(floor2);
        const wall2 = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h2, dd), wallMat2); m.position.set(hx + ox, h2 / 2, hz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: hx + ox, z: hz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
        wall2(w2, t2, 0, -d2 / 2); wall2(t2, d2, -w2 / 2, 0); wall2(t2, d2, w2 / 2, 0);
        wall2(w2 * 0.36, t2, -w2 * 0.32, d2 / 2); wall2(w2 * 0.36, t2, w2 * 0.32, d2 / 2); // front walls leave a door-width gap
        const ceil2 = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.6, t2, d2 + 0.6), wallMat); ceil2.position.set(hx, h2, hz); ceil2.castShadow = true; G.add(ceil2);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 3.2), mat(0x8a3a58)); bed.position.set(hx - w2 / 2 + 1.8, 0.5, hz - d2 / 2 + 2.2); bed.castShadow = true; G.add(bed);
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.8), mat(0xe8ecf2)); pil.position.set(hx - w2 / 2 + 1.8, 0.9, hz - d2 / 2 + 1.1); G.add(pil);
        this.boxes.push({ x: hx - w2 / 2 + 1.8, z: hz - d2 / 2 + 2.2, hw: 1.2, hd: 1.7, h: 1 });
        const couch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.2), mat(0x4a6c8a)); couch.position.set(hx + 2.5, 0.55, hz + 1.5); couch.castShadow = true; G.add(couch);
        this.boxes.push({ x: hx + 2.5, z: hz + 1.5, hw: 1.7, hd: 0.7, h: 1 });
        const tv = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.14), mat(0x10141c, { emissive: 0x2f7fd4, emissiveIntensity: 0.9 })); tv.position.set(hx + 2.5, 1.3, hz - d2 / 2 + 0.5); G.add(tv);
        const lamp3 = new THREE.Mesh(new THREE.BoxGeometry(w2 * 0.4, 0.12, d2 * 0.4), mat(0xffe8c8, { emissive: 0xffdca8, emissiveIntensity: 1.2 })); lamp3.position.set(hx, h2 - 0.35, hz); G.add(lamp3);
        this.homePos = { x: hx, z: hz };
        this.shops.push({ x: hx, z: hz, w: w2, d: d2, type: 'home', name: 'your place' });
        this._neonSign('CASA MIA', 0x4dff9e, hx, h2 + 0.6, hz + d2 / 2 + 0.28, 5.5, G);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), wallMat); body.position.set(hx, h2 / 2, hz); body.castShadow = true; body.receiveShadow = true; G.add(body);
        this.boxes.push({ x: hx, z: hz, hw: w2 / 2 + 0.2, hd: d2 / 2 + 0.2, h: h2 + 2 });
        const doorM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.12), mat(0x5a4632)); doorM.position.set(hx, 1.15, hz + d2 / 2 + 0.07); G.add(doorM);
        for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.1), mat(0x18243a, { emissive: 0xffe2a8, emissiveIntensity: rng() < 0.6 ? 0.9 : 0.15 })); win.position.set(hx + sx * w2 * 0.28, 1.9, hz + d2 / 2 + 0.06); G.add(win); }
      }
      if (this._lod) this._lod.push({ x: hx, z: hz, w: w2, d: d2, h: h2 + 2, c: col });
    };
    house(cx - 11, cz - 6, mine);
    if (!mine && rng() < 0.35) this._smallShop(cx + 11, cz - 4, 13, 9, 4.4, rng, G, false); // the corner store every block needs
    else house(cx + 11, cz - 6, false);
    // driveway path, white picket fence with a gate gap, greenery
    const path = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, LOT / 2 - 2)); path.material = mat(0x8f959e); path.position.set(cx - 11, 0.15, cz + LOT / 4 + 1); G.add(path);
    const fz = cz + LOT / 2 - 1.2;
    for (const [rx2, rw2] of [[cx - 17, 9], [cx + 6, 29]]) { for (const ry2 of [0.3, 0.62]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(rw2, 0.14, 0.13), mat(0xeef2f6)); rail.position.set(rx2, ry2, fz); G.add(rail); } }
    for (let i = 0; i < 16; i++) { const px3 = cx - 21.5 + i * 2.9; if (Math.abs(px3 - (cx - 11)) < 1.6) continue; const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.12), mat(0xeef2f6)); post.position.set(px3, 0.42, fz); G.add(post); }
    for (let i = 0; i < 3; i++) { const bush = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), mat(0x3f8f4a)); bush.position.set(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), 0.75, cz + rnd(2, LOT / 2 - 5)); bush.castShadow = true; G.add(bush); }
    for (let i = 0; i < 2; i++) { const mound = new THREE.Mesh(new THREE.SphereGeometry(rnd(2.6, 4.2), 14, 10), mat(0x55924e)); mound.scale.y = 0.16; mound.position.set(cx + rnd(-LOT / 2 + 7, LOT / 2 - 7), 0.12, cz - LOT / 2 + rnd(4, 11)); G.add(mound); } // rolling back yards
    this.palm(cx + rnd(-8, 8), cz + LOT / 2 - 6, G);
    this.errands.push({ x: cx - 11, z: cz + LOT / 2 - 4 });
    this.homes = this.homes || []; // front-yard doorstep nodes NPCs return to at night
    this.homes.push({ x: cx - 11, z: cz - 6 + 8 }); this.homes.push({ x: cx + 11, z: cz - 6 + 8 });
  }
  inBay(x, z) { const net = this.net; return x > net.bayL - 20 && x < net.bayR + 20 && Math.abs(z) < net.half * 0.94 && !net.isLand(x, z); }
  // water is anywhere the landmass isn't — unless a bridge/causeway deck carries the road across it
  isWater(x, z) {
    if (this.net.isLand(x, z)) return false;
    for (const I of (this.islets || [])) if (Math.hypot(x - I.x, z - I.z) < I.r - 5) return false;
    const ne = this.net.nearestEdge(x, z); if (ne && ne.edge.isBridge && ne.dist < ROAD_CLASS[ne.edge.class].width * 0.6) return false;
    return true;
  }
  // which neighbourhood are you standing in? (drives the GTA-style area callout)
  districtAt(x, z) {
    if (this.privIslet && Math.hypot(x - this.privIslet.x, z - this.privIslet.z) < this.privIslet.r + 6) return 'Isla Privada';
    if (this.starfish && ((x - this.starfish.x) / (this.starfish.rx + 4)) ** 2 + ((z - this.starfish.z) / (this.starfish.rz + 4)) ** 2 < 1) return 'Starfish Island';
    if (!this.net.isLand(x, z)) return 'Neon Bay';
    return this.DIST_NAMES[this.net.districtIdAt(x, z)] || 'Neon Bay';
  }
  // ---- terrain: flat where roads and blocks are; only the islets rise ----
  groundH(x, z) {
    let h = 0;
    for (const I of (this.islets || [])) { const di = Math.hypot(x - I.x, z - I.z); if (di < I.r) h = Math.max(h, I.h * Math.pow(Math.cos(di / I.r * Math.PI / 2), 1.35)); }
    return h;
  }
  // ground mesh that actually follows groundH — real dunes and hills, not painted flats
  _shore(cx, cz, w, d, color, sx, sz) {
    const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, this.groundH(cx + P.getX(i), cz + P.getZ(i)) + 0.03);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(cx, 0, cz); m.receiveShadow = true; this.group.add(m); return m;
  }
  // Starfish Island: gated old-money villas on a dry oval mid-bay, reached by boat
  _starfish() {
    const S = this.starfish, G = this.group;
    const geo = new THREE.CircleGeometry(1, 44); geo.scale(S.rx, 1, S.rz); geo.rotateX(-Math.PI / 2);
    const grass = new THREE.Mesh(geo, mat(0x4c8a4f)); grass.position.set(S.x, 0.16, S.z); grass.receiveShadow = true; G.add(grass);
    const ringG = new THREE.RingGeometry(0.86, 1, 44); ringG.scale(S.rx + 3, S.rz + 3, 1); ringG.rotateX(-Math.PI / 2);
    const sand = new THREE.Mesh(ringG, mat(0xd6c493)); sand.position.set(S.x, 0.12, S.z); G.add(sand);
    const path = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, S.rz * 1.7), mat(0x8f959e)); path.position.set(S.x, 0.2, S.z); G.add(path);
    const villaCols = [0xf2e0c8, 0xf0d2d8, 0xd9c9ee, 0xf5e6bc];
    for (let i = 0; i < 4; i++) {
      const ang = i / 4 * TAU + 0.4, vx = S.x + Math.cos(ang) * S.rx * 0.55, vz = S.z + Math.sin(ang) * S.rz * 0.55;
      const w = 9, d = 7, h = 4.2, col = villaCols[i], wallMat = mat(col, { emissive: col, emissiveIntensity: 0.14 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); body.position.set(vx, 0.3 + h / 2, vz); body.castShadow = true; G.add(body);
      this.boxes.push({ x: vx, z: vz, hw: w / 2 + 0.2, hd: d / 2 + 0.2, h: h + 1 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.5, d + 1), mat(new THREE.Color(col).multiplyScalar(0.8).getHex())); roof.position.set(vx, 0.3 + h, vz); G.add(roof);
      for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), mat(0x18243a, { emissive: 0xffe2a8, emissiveIntensity: 0.7 })); win.position.set(vx + sx * w * 0.28, 2.4, vz + d / 2 + 0.06); G.add(win); }
      this.palm(vx + rnd(-3, 3), vz + d / 2 + 2.5, G);
    }
    this._neonSign('STARFISH ISLAND', 0xffd27a, S.x, 5, S.z + S.rz - 2, 14, G);
    this.starfishPlace = { x: S.x, z: S.z };
  }
  // south-shore lighthouse: a rotating beacon you can see across the bay
  _lighthouse(half) {
    const G = this.group, lx = -half + 40, lz = -half - 28, gH = this.groundH(lx, lz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 2, 16), mat(0x8a8f98)); base.position.set(lx, gH + 1, lz); base.castShadow = true; G.add(base);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 16, 16), mat(0xf0f0f4)); tower.position.set(lx, gH + 10, lz); tower.castShadow = true; G.add(tower);
    for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.78, 2, 16), mat(0xd23b3b)); band.position.set(lx, gH + 5 + i * 4.5, lz); G.add(band); }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 16), mat(0x2a2e36)); gallery.position.set(lx, gH + 18.2, lz); G.add(gallery);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 12), mat(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 2.6, transparent: true, opacity: 0.9 })); lantern.position.set(lx, gH + 19.7, lz); G.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2, 12), mat(0x2a2e36)); cap.position.set(lx, gH + 21.9, lz); G.add(cap);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 4, 1, true), mat(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 1.4, transparent: true, opacity: 0.14, side: THREE.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.set(lx, gH + 19.7, lz); G.add(beam);
    this.boxes.push({ x: lx, z: lz, hw: 2.2, hd: 2.2, h: gH + 22 });
    this.lighthouseBeam = beam;
  }
  _mansion(I) {
    const gH = this.groundH(I.x, I.z), G = this.group, y0 = gH + 0.28, wallMat = mat(0xf2ede2);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 16), mat(0xd8d2c4)); pad.position.set(I.x, gH - 0.02, I.z); pad.receiveShadow = true; G.add(pad);
    const w = 14, d = 9, h = 3.6, t = 0.4;
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(I.x + ox, y0 + h / 2, I.z + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: I.x + ox, z: I.z + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25, h: gH + h + 1 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    wall(w * 0.34, t, -w * 0.33, d / 2); wall(w * 0.34, t, w * 0.33, d / 2); // grand open entry
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.5, d + 1.2), mat(0xe0d8c8)); roof.position.set(I.x, y0 + h, I.z); roof.castShadow = true; G.add(roof);
    const para = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.6, d + 1.0), wallMat); para.position.set(I.x, y0 + h + 0.4, I.z); G.add(para);
    const lampM = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, d * 0.5), mat(0xffe8c8, { emissive: 0xffdca8, emissiveIntensity: 1.4 })); lampM.position.set(I.x, y0 + h - 0.35, I.z); G.add(lampM);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.05, 1.1), mat(0x3a2a4a)); bar2.position.set(I.x - 3, y0 + 0.8, I.z - 2.6); G.add(bar2);
    const bedM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 3.4), mat(0xc9a23a)); bedM.position.set(I.x + 4, y0 + 0.5, I.z - 2.2); G.add(bedM);
    // infinity pool + loungers on the pad
    const pool = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 4.4), mat(0x2fd0e0, { emissive: 0x2fb8d0, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })); pool.position.set(I.x - 2, gH + 0.3, I.z + 5.4); G.add(pool);
    for (let i = 0; i < 2; i++) { const lng = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 2.2), mat(0xf0f0f4)); lng.position.set(I.x + 4.5 + i * 1.6, gH + 0.45, I.z + 5.2); lng.rotation.x = -0.14; G.add(lng); }
    this._neonSign('ISLA PRIVADA', 0xffd23a, I.x, y0 + h + 1.7, I.z + d / 2 + 0.4, 12, G);
    // the stash: a golden briefcase on a pedestal inside
    const ped4 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 12), mat(0x8a8f98)); ped4.position.set(I.x, y0 + 0.45, I.z + 1); G.add(ped4);
    const bc = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), mat(0xffd23a, { emissive: 0xd4a92f, emissiveIntensity: 1.2 })); bc.position.set(I.x, y0 + 1.2, I.z + 1); G.add(bc);
    this.briefcase = { x: I.x, z: I.z + 1, m: bc, got: false };
    this.privIslet = I;
  }
  _warehouse(cx, cz, LOT, rng, G) {
    // dockland warehouse: open loading front, crates inside, containers in the yard
    const w = LOT - 10, d = LOT - 16, h = 8 + rng() * 4, t = 0.5, col = pick([0x8a8f98, 0xa08a6a, 0x7a8a96, 0x96786a]);
    const wallMat = mat(col);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3a3d44)); floor.position.set(cx, 0.12, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), mat(new THREE.Color(col).multiplyScalar(0.8).getHex())); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this.boxes.push({ x: cx, z: cz - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: cx - w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: cx + w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (let i = 0; i < 3; i++) { const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), mat(0x9a7a4a)); crate.position.set(cx + rnd(-w / 3, w / 3), 1.2, cz - d * 0.25 + rnd(-2, 2)); crate.castShadow = true; G.add(crate); this.boxes.push({ x: crate.position.x, z: crate.position.z, hw: 1.3, hd: 1.3, h: 2.4 }); }
    const cCols = [0xc84a3a, 0x3a6ac8, 0x3aa06a, 0xc8a23a];
    for (let i = 0; i < 2; i++) { const cont = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 2.6), mat(pick(cCols))); cont.position.set(cx - w / 2 + 3, 1.3 + (i === 1 ? 2.6 : 0), cz + d / 2 + 3.6); cont.rotation.y = rnd(-0.08, 0.08); cont.castShadow = true; G.add(cont); if (i === 0) this.boxes.push({ x: cont.position.x, z: cont.position.z, hw: 3.7, hd: 1.5, h: 5.4 }); }
    this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
    this.shops.push({ x: cx, z: cz, w, d, type: 'warehouse' });
  }
  _airport(half) {
    const cz = -half - 105; // runway centre (south of the city), runway runs along Z
    const tar = new THREE.Mesh(new THREE.PlaneGeometry(150, 320), mat(0x40444d)); tar.rotation.x = -Math.PI / 2; tar.position.set(0, 0.05, cz); tar.receiveShadow = true; this.group.add(tar);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 300), mat(0x2b2e35)); rw.position.set(0, 0.16, cz); this.group.add(rw);
    for (let i = -6; i <= 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 12), mat(0xf0f0f4, { emissive: 0x9aa, emissiveIntensity: 0.4 })); d.position.set(0, 0.33, cz + i * 22); this.group.add(d); }
    const term = new THREE.Mesh(new THREE.BoxGeometry(120, 16, 30), mat(0xc6ccd6)); term.position.set(92, 8, cz - 20); term.castShadow = true; term.receiveShadow = true; this.group.add(term);
    this.boxes.push({ x: 92, z: cz - 20, hw: 60, hd: 16, h: 16 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(118, 10, 0.4), mat(0x0e2036, { emissive: 0x2f6fd4, emissiveIntensity: 0.4 })); glass.position.set(92, 8, cz - 4.8); this.group.add(glass);
    const ctrl = new THREE.Mesh(new THREE.BoxGeometry(9, 30, 9), mat(0xb0b8c2)); ctrl.position.set(150, 15, cz - 20); ctrl.castShadow = true; this.group.add(ctrl);
    const ctop = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 13), mat(0x123, { emissive: 0x2f6fd4, emissiveIntensity: 0.3 })); ctop.position.set(150, 32, cz - 20); this.group.add(ctop); this.boxes.push({ x: 150, z: cz - 20, hw: 6, hd: 6, h: 35 });
    this.airport = { z: cz, exit: { x: 24, z: -half - 40 } };
  }
  _road(x, z, w, d, roadMat, yellow, white, vertical) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), roadMat); r.position.set(x, 0.07, z); r.receiveShadow = true; this.group.add(r);
    const len = vertical ? d : w, dash = 3.2, gap = 4.2, n = Math.floor(len / (dash + gap));
    for (let i = 0; i < n; i++) { const o = -len / 2 + i * (dash + gap) + dash / 2; const seg = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.35 : dash, 0.02, vertical ? dash : 0.35), yellow); seg.position.set(vertical ? x : x + o, 0.17, vertical ? z + o : z); this.group.add(seg); }
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.2 : len, 0.02, vertical ? len : 0.2), white); e.position.set(vertical ? x + s * (w / 2 - 1.4) : x, 0.16, vertical ? z : z + s * (d / 2 - 1.4)); this.group.add(e); }
  }
  // closed street-facing wall with a centered walk-through doorway (kills the hollow open-front look)
  _frontWall(x, zf, w, h, t, wmat, doorW, G, faceOut) {
    const dh = Math.min(2.7, h - 0.35), side = Math.max(0.7, (w - doorW) / 2), trim = mat(0x2a2e36), no = faceOut || 1;
    for (const s of [-1, 1]) {
      const px = x + s * (doorW / 2 + side / 2);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(side, h, t), wmat); panel.position.set(px, h / 2, zf); panel.castShadow = true; panel.receiveShadow = true; G.add(panel);
      this.boxes.push({ x: px, z: zf, hw: side / 2 + 0.2, hd: t / 2 + 0.2 });
      const win = new THREE.Mesh(new THREE.BoxGeometry(Math.min(side * 0.72, 3.4), Math.min(h * 0.5, 2.1), 0.06), mat(0x18243a, { emissive: pick(WIN_GLOW), emissiveIntensity: 0.85, transparent: true, opacity: 0.9 })); win.position.set(px, h * 0.54, zf + no * (t * 0.5 + 0.02)); G.add(win);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.5, h - dh, t), wmat); lintel.position.set(x, dh + (h - dh) / 2, zf); lintel.castShadow = true; G.add(lintel); // header above the door — walk under it, no collision box
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, dh, 0.2), trim); post.position.set(x + s * (doorW / 2 + 0.09), dh / 2, zf + no * 0.05); G.add(post); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.5, 0.2, 0.22), trim); head.position.set(x, dh, zf + no * 0.05); G.add(head);
  }
  _tower(x, z, w, d, h, color, rng, G, opts) {
    // EVERY tower is enterable: an open-front ground-floor lobby you can walk into,
    // with the tall shaft above it (visual only, so 2D collision leaves the floor clear).
    opts = opts || {};
    const h0 = Math.min(4.8, h - 1), t = 0.4, trimMat = mat(new THREE.Color(color).multiplyScalar(0.8).getHex());
    const wallCol0 = new THREE.Color(color).multiplyScalar(0.92).getHex(), wallMat = mat(wallCol0, { emissive: wallCol0, emissiveIntensity: 0.14 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3d3849, { emissive: 0x3d3849, emissiveIntensity: 0.3 })); floor.position.set(x, 0.12, z); floor.receiveShadow = true; G.add(floor);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h0, dd), wallMat); m.position.set(x + ox, h0 / 2, z + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);           // back + two sides
    this._frontWall(x, z + d / 2, w, h0, t, wallMat, 2.8, G);                     // closed front + doorway
    this.boxes.push({ x, z: z - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: x - w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: x + w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h0, 12), trimMat); c.position.set(x + sx * (w / 2 - 0.55), h0 / 2, z + d / 2 - 0.55); c.castShadow = true; G.add(c); this.boxes.push({ x: c.position.x, z: c.position.z, hw: 0.6, hd: 0.6 }); }
    // lobby fit-out: reception desk, glowing elevator doors, ceiling glow, point light
    const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.3), mat(0x5a4632)); desk.position.set(x, 0.82, z - d * 0.2); desk.castShadow = true; G.add(desk);
    this.boxes.push({ x, z: z - d * 0.2, hw: w * 0.25 + 0.2, hd: 0.85, h: 1.4 });
    const elev = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.45, 3), h0 - 1.0, 0.16), mat(0x1a2530, { emissive: 0x2fd0e0, emissiveIntensity: 0.5 })); elev.position.set(x, (h0 - 1.0) / 2, z - d / 2 + 0.35); G.add(elev);
    // a working elevator: E beside the doors opens the floor picker (ride to any storey or the roof)
    if (!this.elevators) this.elevators = [];
    this.elevators.push({ x, z: z - d / 2 + 1.4, cx: x, cz: z, w, d, h0, hTop: h, floors: Math.max(1, Math.floor((h - h0 - 2.2) / 4)), doorMat: elev.material });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.16, d * 0.6), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(x, h0 - 0.4, z); G.add(panel);
    const rug2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.05, d * 0.4), mat(0x33405e)); rug2.position.set(x, 0.24, z + d * 0.12); rug2.receiveShadow = true; G.add(rug2);
    const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10), mat(0xa06a3a)); pot2.position.set(x + w / 2 - 1.3, 0.5, z + d / 2 - 1.5); G.add(pot2);
    const frond2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), mat(0x2f7e44)); frond2.position.set(x + w / 2 - 1.3, 1.1, z + d / 2 - 1.5); G.add(frond2);
    // ---- massing above the lobby — REAL 3D windows + floor slabs ----
    const shaftH = h - h0;
    if (opts.tall && shaftH > 26) {
      // stepped skyscraper: full base → setback → slender crown, with windows on the two lower masses
      const seg = (y0, y1, sc) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * sc, y1 - y0, d * sc), mat(color)); b.position.set(x, y0 + (y1 - y0) / 2, z); b.castShadow = true; b.receiveShadow = true; G.add(b); };
      const yA = h0 + shaftH * 0.58, yB = h0 + shaftH * 0.84;
      seg(h0, yA, 1.0); seg(yA, yB, 0.78); seg(yB, h, 0.55);
      this._towerWindows(x, z, w, d, h0, shaftH * 0.58, G);
      this._towerWindows(x, z, w * 0.78, d * 0.78, yA, shaftH * 0.26, G);
      for (const st of [[h0, 1.0], [yA, 1.0], [yB, 0.78]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(w * st[1] + 0.8, 0.6, d * st[1] + 0.8), trimMat); l.position.set(x, st[0], z); l.castShadow = true; G.add(l); }
      const para = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55 + 0.6, 1.0, d * 0.55 + 0.6), trimMat); para.position.set(x, h - 0.2, z); para.castShadow = true; G.add(para);
      const mh = Math.min(16, h * 0.13), mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.34, mh, 8), mat(0x2a2e36)); mast.position.set(x, h + mh / 2, z); mast.castShadow = true; G.add(mast);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat(0xff3a3a, { emissive: 0xff2a2a, emissiveIntensity: 2.6 })); beacon.position.set(x, h + mh, z); G.add(beacon);
    } else {
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, d), mat(color)); shaft.position.set(x, h0 + shaftH / 2, z); shaft.castShadow = true; shaft.receiveShadow = true; G.add(shaft);
      this._towerWindows(x, z, w, d, h0, shaftH, G);
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8), trimMat); ledge.position.set(x, h0, z); ledge.castShadow = true; G.add(ledge);
      const para = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.0, d + 0.6), trimMat); para.position.set(x, h - 0.2, z); para.castShadow = true; G.add(para);
      const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), mat(0x33373f)); tank.position.set(x + rnd(-w * 0.2, w * 0.2), h + 1.2, z + rnd(-d * 0.2, d * 0.2)); tank.castShadow = true; G.add(tank);
    }
    const awn = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.8, 5), 0.3, 1.0), mat(pick(NEONS))); awn.position.set(x, h0 + 0.2, z + d / 2 + 0.5); G.add(awn);
    if (h > 46 && rng() < 0.7) { const nc = pick(NEONS), sh = Math.min(h * 0.5, 20); const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, sh, 0.5), mat(nc, { emissive: nc, emissiveIntensity: 2.2 })); sign.position.set(x + (rng() < .5 ? -1 : 1) * (w / 2 + 0.4), h0 + shaftH * 0.55, z + d / 2 + 0.3); G.add(sign); }
    if (this._lod) this._lod.push({ x, z, w, d, h, c: color });
    this.shops.push({ x, z, w, d, type: 'tower' });
  }
  _neonSign(text, hex, x, y, z, w, G) {
    const t = signTexture(text, '#' + hex.toString(16).padStart(6, '0'));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 2.4, transparent: true })); s.position.set(x, y, z); G.add(s);
    if (!this.neons) this.neons = []; if (this.brng && this.brng() < 0.22) { s.userData.base = 2.4; s.userData.flick = 0; this.neons.push(s); } // a fifth of signs are bad tubes that stutter
    return s;
  }
  _venue(cx, cz, LOT, type, rng, G) {
    const w = LOT - 10, d = LOT - 14, h = type === 'club' ? 6.5 : 5.4, t = 0.4;
    const accent = type === 'club' ? pick([0xff3d9a, 0x9b5cff, 0x2fe6ff]) : type === 'hotel' ? 0xffd27a : type === 'diner' ? 0xff5a5a : pick(NEONS);
    const wallCol = pick(FACADES), wallMat = mat(wallCol, { emissive: wallCol, emissiveIntensity: 0.16 }), floorCol = type === 'club' ? 0x241c38 : 0x4a4658, floorMat = mat(floorCol, { emissive: floorCol, emissiveIntensity: 0.3 });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h: h + 1, c: wallCol });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat); floor.position.set(cx, 0.18, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), wallMat); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this._frontWall(cx, cz + d / 2, w, h, t, wallMat, 3.0, G); // closed front + doorway
    this.boxes.push({ x: cx, z: cz - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: cx - w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: cx + w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, h, 14), wallMat); p.position.set(cx + sx * (w / 2 - 0.6), h / 2, cz + d / 2 - 0.6); p.castShadow = true; G.add(p); this.boxes.push({ x: p.position.x, z: p.position.z, hw: 0.7, hd: 0.7 }); }
    this._neonSign(pick(VENUE_NAMES[type]), accent, cx, h + 1.0, cz + d / 2 + 0.25, w * 0.9, G);
    const under = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.5, 0.3), mat(accent, { emissive: accent, emissiveIntensity: 1.6 })); under.position.set(cx, h + 0.25, cz + d / 2 + 0.2); G.add(under);
    const rec = { x: cx, z: cz, w, d, type, strip: under, name: pick(VENUE_NAMES[type]) };
    // day-shift staff post behind the counter/desk/booth (clerks clock in and out with the sun)
    this.workposts.push(type === 'club' ? { x: cx + w * 0.28, z: cz - d / 2 + 1.6, yaw: 0 } : type === 'hotel' ? { x: cx, z: cz - d * 0.22 - 1.4, yaw: 0 } : type === 'diner' ? { x: cx, z: cz - d * 0.16 - 1.35, yaw: 0 } : { x: cx, z: cz - d * 0.18 - 1.4, yaw: 0 });
    if (type === 'diner' || type === 'shop') this.errands.push({ x: cx + rnd(-3, 3), z: cz + d / 2 + 2.5 });
    if (type === 'club') {
      const cols = [0xff3d9a, 0x2fe6ff, 0x9b5cff, 0x4dff9e, 0xffe24a];
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const col = cols[(a + b + 4) % cols.length]; const tile = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 2.6), mat(col, { emissive: col, emissiveIntensity: 1.4 })); tile.position.set(cx + a * 2.8, 0.32, cz + b * 2.8 - 2); G.add(tile); }
      const dj = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.1, 1.6), mat(0x101018, { emissive: accent, emissiveIntensity: 0.6 })); dj.position.set(cx, 0.75, cz - d / 2 + 1.6); G.add(dj);
      for (const sx of [-1, 0, 1]) { const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 12, 1, true), mat(pick(cols), { emissive: pick(cols), emissiveIntensity: 1.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide })); beam.position.set(cx + sx * 6, h - 2.2, cz - 1); beam.rotation.x = Math.PI + sx * 0.2; G.add(beam); }
      const pl = new THREE.PointLight(accent, 12, 30, 2); pl.position.set(cx, h - 1.4, cz - 1); G.add(pl);
      // back bar with glowing bottles + PA stacks flanking the booth
      const barC = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, d * 0.45), mat(0x3a2a4a)); barC.position.set(cx - w / 2 + 1.7, 0.8, cz + d * 0.1); barC.castShadow = true; G.add(barC);
      this.boxes.push({ x: cx - w / 2 + 1.7, z: cz + d * 0.1, hw: 0.8, hd: d * 0.225, h: 1.3 });
      const shelfB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, d * 0.4), mat(0x241a34)); shelfB.position.set(cx - w / 2 + 0.6, 1.5, cz + d * 0.1); G.add(shelfB);
      for (let i = 0; i < 6; i++) { const bc2 = pick([0x2fe6ff, 0xff5fb0, 0x4dff9e, 0xffd23a]); const bot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.13), mat(bc2, { emissive: bc2, emissiveIntensity: 1.0 })); bot.position.set(cx - w / 2 + 0.6, 1.15 + (i % 2) * 0.6, cz + d * 0.1 - d * 0.16 + i * d * 0.065); G.add(bot); }
      for (const sx of [-1, 1]) { const spk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.9), mat(0x14121e)); spk.position.set(cx + sx * w * 0.32, 0.95, cz - d / 2 + 1.2); spk.castShadow = true; G.add(spk); const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12), mat(0x2b2436, { emissive: accent, emissiveIntensity: 0.5 })); cone.rotation.x = Math.PI / 2; cone.position.set(cx + sx * w * 0.32, 1.3, cz - d / 2 + 1.66); G.add(cone); this.boxes.push({ x: cx + sx * w * 0.32, z: cz - d / 2 + 1.2, hw: 0.55, hd: 0.55, h: 2 }); }
      rec.dance = [{ x: cx - 3, z: cz - 1 }, { x: cx + 3, z: cz - 2 }, { x: cx, z: cz + 2 }]; this.clubs.push(rec);
    } else if (type === 'hotel') {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.6), mat(0x5a4632)); desk.position.set(cx, 0.85, cz - d * 0.22); desk.castShadow = true; G.add(desk);
      this.boxes.push({ x: cx, z: cz - d * 0.22, hw: w * 0.25 + 0.2, hd: 1.0, h: 1.4 });
      for (const sx of [-1, 1]) { const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.3), mat(0x8a3a58)); sofa.position.set(cx + sx * (w / 2 - 3), 0.55, cz + d * 0.2); G.add(sofa); }
      const chand = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), mat(0xfff2cf, { emissive: 0xffe6b0, emissiveIntensity: 2.2 })); chand.position.set(cx, h - 1.2, cz); G.add(chand);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.06, d * 0.36), mat(0x7a2f3f)); rug.position.set(cx, 0.24, cz + d * 0.02); rug.receiveShadow = true; G.add(rug);
      for (const sx of [-1, 1]) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10), mat(0xa06a3a)); pot.position.set(cx + sx * (w / 2 - 1.5), 0.5, cz - d * 0.34); G.add(pot);
        const frond = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), mat(0x2f7e44)); frond.position.set(cx + sx * (w / 2 - 1.5), 1.15, cz - d * 0.34); G.add(frond);
        const art = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 0.06), mat(pick([0xf3c7d4, 0xbfe4e8, 0xf5e3b8]), { emissive: 0x333, emissiveIntensity: 0.2 })); art.position.set(cx + sx * w * 0.28, 2.5, cz - d / 2 + 0.26); G.add(art);
      }
    } else if (type === 'diner') {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.05, 1.3), mat(0xc23232)); counter.position.set(cx, 0.82, cz - d * 0.16); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.16, hw: w * 0.3 + 0.2, hd: 0.9, h: 1.3 });
      for (let s = -2; s <= 2; s++) { const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), mat(0x2b2b33)); stool.position.set(cx + s * 2.2, 0.55, cz - d * 0.16 + 1.6); G.add(stool); }
      for (const ox of [-w * 0.25, w * 0.25]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.16, d * 0.5), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz); G.add(panel); }
      for (let b2 = 0; b2 < 2; b2++) { // window booths: table + facing vinyl benches
        const bx2 = cx + w / 2 - 2.0, bz2 = cz + d * 0.02 + b2 * 3.6;
        const tab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.0), mat(0xe8e2d2)); tab.position.set(bx2, 0.6, bz2); tab.castShadow = true; G.add(tab);
        for (const s2 of [-1, 1]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.55), mat(0xc23232)); bench.position.set(bx2, 0.55, bz2 + s2 * 0.95); G.add(bench); }
        this.boxes.push({ x: bx2, z: bz2, hw: 0.85, hd: 1.35, h: 1.2 });
      }
      const menu = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.95, 0.08), mat(0x14171c, { emissive: 0xffd9a0, emissiveIntensity: 0.8 })); menu.position.set(cx, h - 1.25, cz - d / 2 + 0.3); G.add(menu);
    } else {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.1, 1.4), mat(0x6b4a2e)); counter.position.set(cx, 0.85, cz - d * 0.18); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9, h: 1.4 });
      for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, d * 0.5), mat(0x45414c)); sh.position.set(cx + sx * (w / 2 - 1.2), 1.3, cz - d * 0.05); G.add(sh); }
      for (const ox of [-w * 0.22, w * 0.22]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.16, d * 0.55), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz - d * 0.05); G.add(panel); }
      // centre aisle gondola stacked with goods + a lit drinks fridge
      const aisle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, d * 0.4), mat(0x4a4550)); aisle.position.set(cx + w * 0.1, 0.95, cz + d * 0.04); aisle.castShadow = true; G.add(aisle);
      this.boxes.push({ x: cx + w * 0.1, z: cz + d * 0.04, hw: 0.55, hd: d * 0.2, h: 1.8 });
      for (let i2 = 0; i2 < 4; i2++) { const gd = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.55), mat(pick([0xd23b3b, 0x2fb85e, 0xf0b83a, 0x4fd0ff]))); gd.position.set(cx + w * 0.1, 0.55 + (i2 % 3) * 0.4, cz + d * 0.04 - 1.1 + i2 * 0.75); G.add(gd); }
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.7), mat(0xd8dde6)); fridge.position.set(cx - w / 2 + 1.1, 1.2, cz - d * 0.28); G.add(fridge);
      const fglass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.7, 0.08), mat(0x9fe8ff, { emissive: 0x7fd0e8, emissiveIntensity: 1.1, transparent: true, opacity: 0.7 })); fglass.position.set(cx - w / 2 + 1.1, 1.25, cz - d * 0.28 + 0.38); G.add(fglass);
      this.boxes.push({ x: cx - w / 2 + 1.1, z: cz - d * 0.28, hw: 0.8, hd: 0.5, h: 2.4 });
    }
    this.shops.push(rec);
  }
  _smallShop(x, z, w, d, h, rng, G, back) {
    // every corner store is walk-in now: open front, three walls, lit interior
    const shopCol = pick(SHOP_COLS), t = 0.35, dz = back ? -1 : 1;
    const wallMat = mat(shopCol, { emissive: shopCol, emissiveIntensity: 0.16 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), mat(0x423d4e, { emissive: 0x423d4e, emissiveIntensity: 0.3 })); floor.position.set(x, 0.12, z); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, t, d + 0.6), wallMat); roof.position.set(x, h, z); roof.castShadow = true; G.add(roof);
    const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMat); backW.position.set(x, h / 2, z - dz * d / 2); backW.castShadow = true; backW.receiveShadow = true; G.add(backW);
    this.boxes.push({ x, z: z - dz * d / 2, hw: w / 2 + 0.25, hd: t / 2 + 0.25 });
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), wallMat); side.position.set(x + sx * w / 2, h / 2, z); side.castShadow = true; side.receiveShadow = true; G.add(side); this.boxes.push({ x: x + sx * w / 2, z, hw: t / 2 + 0.25, hd: d / 2 + 0.25 }); }
    // interior: counter + register glow + shelf + ceiling light
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.0, 1.0), mat(0x5f4530)); counter.position.set(x - w * 0.14, 0.75, z - dz * d * 0.22); counter.castShadow = true; G.add(counter);
    this.boxes.push({ x: x - w * 0.14, z: z - dz * d * 0.22, hw: w * 0.25 + 0.2, hd: 0.7, h: 1.3 });
    this.workposts.push({ x: x - w * 0.14, z: z - dz * (d * 0.22 + 1.3), yaw: dz > 0 ? 0 : Math.PI });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, d * 0.5), mat(0x46414d)); shelf.position.set(x + w / 2 - 0.85, 1.05, z); G.add(shelf);
    const lamp2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, d * 0.4), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.25 })); lamp2.position.set(x, h - 0.35, z); G.add(lamp2);
    // bodega fit-out: a stocked centre gondola + products + a floor mat in muted tones (no more empty cartoon box)
    const gond = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, d * 0.5), mat(0x55504a, { emissive: 0x22201d, emissiveIntensity: 0.2 })); gond.position.set(x + w * 0.08, 0.78, z); gond.castShadow = true; G.add(gond); this.boxes.push({ x: x + w * 0.08, z, hw: 0.55, hd: d * 0.25, h: 1.5 });
    for (let i = 0; i < 5; i++) { const pr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.42), mat(pick([0xb3423a, 0x3a7e5e, 0xc9a23a, 0x4a6c8a]))); pr.position.set(x + w * 0.08, 0.55 + (i % 2) * 0.44, z - d * 0.22 + i * d * 0.1); G.add(pr); }
    const fmat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.05, d * 0.32), mat(0x33373f)); fmat.position.set(x, 0.16, z + dz * d * 0.06); fmat.receiveShadow = true; G.add(fmat);
    const fz = z + dz * (d / 2 + 0.06);
    for (const sx of [-1, 1]) { const glassW = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.6, 0.08), mat(0x18243a, { emissive: pick(WIN_GLOW), emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })); glassW.position.set(x + sx * w * 0.32, 1.6, fz - dz * 0.06); G.add(glassW); this.boxes.push({ x: x + sx * w * 0.32, z: fz - dz * 0.06, hw: w * 0.15, hd: 0.2, h: 2.6 }); }
    // storefront header + doorframe: close the top of the front and frame the central doorway (no more hollow gap)
    const dtop = 2.7; if (h > dtop + 0.2) { const hdr = new THREE.Mesh(new THREE.BoxGeometry(w, h - dtop, t), wallMat); hdr.position.set(x, dtop + (h - dtop) / 2, fz - dz * 0.03); hdr.castShadow = true; G.add(hdr); }
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, dtop, 0.2), mat(0x2a2e36)); post.position.set(x + s * w * 0.17, dtop / 2, fz - dz * 0.02); G.add(post); }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.24), mat(0x2a2e36)); sill.position.set(x, dtop, fz - dz * 0.02); G.add(sill);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, 1.0), mat(pick(NEONS))); awn.position.set(x, 2.85, fz + dz * 0.5); G.add(awn);
    const sign = this._neonSign(pick(BIZ), pick(NEONS), x, h + 0.45, fz + dz * 0.1, Math.min(w * 0.92, 7), G); if (back) sign.rotation.y = Math.PI;
    if (this._lod) this._lod.push({ x, z, w, d, h, c: shopCol });
  }
  _block(cx, cz, LOT, rng, hs, G) {
    const n = 3 + (rng() * 2 | 0), sw = (LOT - 8) / n;
    for (let i = 0; i < n; i++) {
      const sx = cx - (LOT - 8) / 2 + sw * (i + 0.5);
      this._smallShop(sx, cz + LOT / 2 - 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, false);
      this._smallShop(sx, cz - LOT / 2 + 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, true);
    }
    const towers = rng() < 0.5 ? 1 : 2, bw = (LOT - 6) / towers;
    for (let t = 0; t < towers; t++) { const bx = cx + (towers === 1 ? 0 : (t === 0 ? -1 : 1) * (LOT / 4)); this._tower(bx, cz, bw - 3, LOT - 22, (24 + rng() * 84) * hs, FACADES[(rng() * FACADES.length) | 0], rng, G); }
  }
  _props(cx, cz, LOT, rng, G) {
    const edge = LOT / 2 - 2.6;
    for (const sz of [-edge, edge]) for (let i = 0, n = 2 + (rng() * 2 | 0); i < n; i++) {
      const px = cx + rnd(-LOT / 2 + 5, LOT / 2 - 5), z = cz + sz, r = rng();
      if (r < 0.34) { const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.7), mat(0x6a4a2e)); seat.position.set(px, 0.7, z); seat.castShadow = true; G.add(seat); const bk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.12), mat(0x6a4a2e)); bk.position.set(px, 1.0, z - 0.28); G.add(bk); }
      else if (r < 0.55) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 8), mat(0xd23b3b)); h.position.set(px, 0.35, z); G.add(h); }
      else if (r < 0.75) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), mat(0x2f3a33)); t.position.set(px, 0.45, z); G.add(t); }
      else if (r < 0.9) { const pb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), mat(0x8a8f98)); pb.position.set(px, 0.25, z); G.add(pb); const bush = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mat(0x3f8f4a)); bush.position.set(px, 0.9, z); G.add(bush); }
      else { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat(0x3a3f48)); pole.position.set(px, 1.3, z); G.add(pole); const sgn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.06), mat(0x2f74d0, { emissive: 0x2f74d0, emissiveIntensity: 0.9 })); sgn.position.set(px, 2.4, z); G.add(sgn); }
    }
  }
  _park(cx, cz, LOT, rng, G) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.35, LOT), mat(0x3f7e44)); lawn.position.set(cx, 0.14, cz); lawn.receiveShadow = true; G.add(lawn);
    const n = 3 + (rng() * 3 | 0); for (let i = 0; i < n; i++) this.palm(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), cz + rnd(-LOT / 2 + 4, LOT / 2 - 4), G);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.8, 18), mat(0x808a97)); f.position.set(cx, 0.5, cz); f.castShadow = true; G.add(f);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 18), mat(0x2fe6ff, { emissive: 0x2fe6ff, emissiveIntensity: 1.1, transparent: true, opacity: 0.9 })); w.position.set(cx, 0.85, cz); G.add(w);
  }
  // ---- downtown civic plaza: paved square, tiered fountain, monument column, benches, planters ----
  _plaza(cx, cz, LOT, rng, G) {
    const pave = new THREE.Mesh(new THREE.BoxGeometry(LOT - 2, 0.24, LOT - 2), mat(0xb4b9c3, { emissive: 0xb4b9c3, emissiveIntensity: 0.12 })); pave.position.set(cx, 0.13, cz); pave.receiveShadow = true; G.add(pave);
    const inlay = new THREE.Mesh(new THREE.CylinderGeometry(LOT * 0.32, LOT * 0.32, 0.26, 28), mat(0x969ba8)); inlay.position.set(cx, 0.15, cz); G.add(inlay);
    // tiered fountain at the centre
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.7, 24), mat(0x8a8f98)); b1.position.set(cx, 0.5, cz); b1.castShadow = true; G.add(b1);
    const w1 = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.3, 24), mat(0x2fbfe0, { emissive: 0x2fa8d0, emissiveIntensity: 0.9 })); w1.position.set(cx, 0.85, cz); G.add(w1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 0.6, 20), mat(0x8a8f98)); b2.position.set(cx, 1.15, cz); b2.castShadow = true; G.add(b2);
    const w2 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.25, 20), mat(0x2fbfe0, { emissive: 0x2fa8d0, emissiveIntensity: 0.9 })); w2.position.set(cx, 1.42, cz); G.add(w2);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 2.4, 10), mat(0xbfeaf6, { emissive: 0x9fe0f0, emissiveIntensity: 1.1, transparent: true, opacity: 0.6 })); jet.position.set(cx, 2.6, cz); G.add(jet);
    this.boxes.push({ x: cx, z: cz, hw: 4.7, hd: 4.7, h: 1.6 });
    // monument column to one side
    const mx = cx, mz = cz - LOT * 0.3;
    const mbase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 2.4), mat(0xa8adb6)); mbase.position.set(mx, 0.5, mz); mbase.castShadow = true; G.add(mbase);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6.5, 16), mat(0xd6d2c6)); col.position.set(mx, 4.0, mz); col.castShadow = true; G.add(col);
    const fig = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.7), mat(0xc9c3b6)); fig.position.set(mx, 7.7, mz); fig.castShadow = true; G.add(fig);
    this.boxes.push({ x: mx, z: mz, hw: 1.3, hd: 1.3, h: 8.4 });
    // benches ringing the fountain, planters + palms at the corners
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, rr = LOT * 0.34, bxp = cx + Math.cos(a) * rr, bzp = cz + Math.sin(a) * rr;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.7), mat(0x6a4a2e)); seat.position.set(bxp, 0.62, bzp); seat.rotation.y = a; seat.castShadow = true; G.add(seat);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.12), mat(0x6a4a2e)); bk.position.set(bxp - Math.sin(a) * 0.28, 0.92, bzp + Math.cos(a) * 0.28); bk.rotation.y = a; G.add(bk);
    }
    for (const cc of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = cx + cc[0] * (LOT * 0.38), pz = cz + cc[1] * (LOT * 0.38);
      const planter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), mat(0x7a6a58)); planter.position.set(px, 0.5, pz); planter.castShadow = true; G.add(planter);
      this.boxes.push({ x: px, z: pz, hw: 1.2, hd: 1.2, h: 0.9 }); this.palm(px, pz, G);
    }
    this._lamp(cx - LOT * 0.4, cz); this._lamp(cx + LOT * 0.4, cz);
    this.errands.push({ x: cx, z: cz + LOT * 0.32 }); // people gather at the plaza
    if (this._lod) this._lod.push({ x: cx, z: cz, w: LOT - 2, d: LOT - 2, h: 1, c: 0xb4b9c3 });
    this.plaza = { x: cx, z: cz };
  }
  palm(x, z, G) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 6.5, 10), mat(0x835530)); trunk.position.y = 3.2; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 6), mat(0x2f8f48)); f.position.set(Math.cos(i / 7 * TAU) * 1.7, 6.4, Math.sin(i / 7 * TAU) * 1.7); f.rotation.z = Math.cos(i / 7 * TAU); f.rotation.x = Math.sin(i / 7 * TAU); f.castShadow = true; g.add(f); }
    g.position.set(x, 0.2 + this.groundH(x, z), z); (G || this.group).add(g);
  }
  _camp(cx, cz, LOT, rng, G) {
    // homeless encampment: dirt lot, tents, cardboard, barrel fires
    this.camps = this.camps || [];
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.3, LOT), mat(0x6e6053, { map: noiseTexture(112, 98, 84, 16) })); dirt.position.set(cx, 0.12, cz); dirt.receiveShadow = true; G.add(dirt);
    const tentCols = [0x4a6c8a, 0x6d8a4a, 0x8a6b4a, 0x7a4a5a, 0x5a5a66];
    for (let i = 0; i < 4 + (rng() * 3 | 0); i++) {
      const tx = cx + rnd(-LOT / 2 + 5, LOT / 2 - 5), tz = cz + rnd(-LOT / 2 + 5, LOT / 2 - 5);
      const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 2.0, 2.2, 4), mat(pick(tentCols))); tent.position.set(tx, 1.1, tz); tent.rotation.y = rnd(TAU); tent.castShadow = true; G.add(tent);
      this.boxes.push({ x: tx, z: tz, hw: 1.5, hd: 1.5, h: 2.4 });
    }
    for (let i = 0; i < 3; i++) { const cb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), mat(0xa8906a)); cb.position.set(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), 0.3, cz + rnd(-LOT / 2 + 4, LOT / 2 - 4)); cb.rotation.y = rnd(TAU); G.add(cb); }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), mat(0x4a3c30)); barrel.position.set(cx, 0.62, cz); barrel.castShadow = true; G.add(barrel);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), mat(0xff8a3a, { emissive: 0xff6a1a, emissiveIntensity: 2.4 })); fire.position.set(cx, 1.35, cz); G.add(fire);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.7), mat(0x9aa0aa)); cart.position.set(cx + 3, 0.75, cz + 2); cart.rotation.y = 0.4; G.add(cart);
    this.boxes.push({ x: cx, z: cz, hw: 0.6, hd: 0.6, h: 1.6 });
    this.camps.push({ x: cx, z: cz, r: LOT / 2 - 4 });
  }
  _vendorStall(x, z) {
    const G = this.group;
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.2), mat(0x8a5a3a)); cart.position.set(x, 0.6, z); cart.castShadow = true; G.add(cart);
    const goods = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.9), mat(pick([0xd23b3b, 0x2fb85e, 0xf0b83a, 0xe0683a]))); goods.position.set(x, 1.2, z); G.add(goods);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.5), mat(pick([0xff5a5a, 0x4fd0ff, 0xffd23a, 0x4dff9e]))); top.position.set(x, 1.75, z); G.add(top);
    for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 6), mat(0x2a2e36)); pole.position.set(x + sx * 1.15, 0.87, z); G.add(pole); }
    this.boxes.push({ x, z, hw: 1.4, hd: 0.8, h: 2.0 });
  }
  _lamp(x, z, yaw) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8), mat(0x272b33)); pole.position.y = 3.25; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), mat(0x272b33)); arm.position.set(0.7, 6.3, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(0xffe0a8, { emissive: 0xffb46b, emissiveIntensity: 3.4 })); head.position.set(1.4, 6.2, 0); g.add(head);
    // warm pool of light on the wet asphalt below the head
    const pool = lightPool(6.5, 0xffb46b, 0.7); pool.position.set(1.4, 0.08, 0); g.add(pool);
    g.position.set(x, 0, z); g.rotation.y = yaw || 0; this.group.add(g);
  }
  // ---- streetlights lining the arterials/boulevards: emissive heads + wet-road pools every ~34m ----
  _streetLights() {
    const net = this.net;
    for (const e of net.edges) {
      const cl = e.class; if (cl === 'alley' || cl === 'residential') continue;
      const a = net.nodes[e.a].position, b = net.nodes[e.b].position, seg = b.clone().sub(a), len = seg.length(); if (len < 20) continue;
      const dir = seg.clone().multiplyScalar(1 / len), perp = new THREE.Vector3(dir.z, 0, -dir.x), off = ROAD_CLASS[cl].width / 2 + 1.6, yaw = Math.atan2(dir.x, dir.z);
      const n = Math.max(1, Math.floor(len / 34));
      for (let i = 1; i <= n; i++) { const t = (i - 0.5) / n, p = a.clone().addScaledVector(dir, t * len), side = (i % 2 === 0 ? 1 : -1); const lx = p.x + perp.x * off * side, lz = p.z + perp.z * off * side; if (!net.isLand(lx, lz)) continue; this._lamp(lx, lz, yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2)); }
    }
  }
  collide(px, pz, radius) {
    for (const b of this.boxes) { const dx = px - b.x, dz = pz - b.z, ex = b.hw + radius, ez = b.hd + radius; if (Math.abs(dx) < ex && Math.abs(dz) < ez) { const ox = ex - Math.abs(dx), oz = ez - Math.abs(dz); if (ox < oz) px = b.x + Math.sign(dx || 1) * ex; else pz = b.z + Math.sign(dz || 1) * ez; } }
    return [px, pz];
  }
  // distance from a coordinate to the nearest road edge (network, not a grid)
  distToRoad(x, z) { const ne = this.net.nearestEdge(x, z); return ne ? ne.dist : 1e9; }
  onRoad(x, z) { const ne = this.net.nearestEdge(x, z); return !!ne && ne.dist < ROAD_CLASS[ne.edge.class].width * 0.5 + 1.2; }
  // snap a loose point onto the sidewalk beside the nearest road (used to place peds, packages, carts)
  snapSidewalk(x, z) {
    const ne = this.net.nearestEdge(x, z); if (!ne) return [x, z];
    const e = ne.edge, a = this.net.nodes[e.a].position, b = this.net.nodes[e.b].position, dir = b.clone().sub(a).normalize(), perp = new THREE.Vector3(dir.z, 0, -dir.x);
    const off = ROAD_CLASS[e.class].width / 2 + 2.2;
    let cand = ne.point.clone().addScaledVector(perp, off);
    if (!this.net.isLand(cand.x, cand.z)) cand = ne.point.clone().addScaledVector(perp, -off);
    return [cand.x, cand.z];
  }
}

// ---------------------------------------------------------------------------
// Higher-poly cartoon human (rigged) + bouncy procedural animation.
// ---------------------------------------------------------------------------
