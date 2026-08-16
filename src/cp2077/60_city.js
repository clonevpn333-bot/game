<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 06 — NIGHT CITY LAYOUT
   Reconstructed to the published geography of Night City, at 1:1 metric scale.

   Reference notes driving these numbers (gathered from published map/lore
   material during development):
     * six city districts — Watson (N), City Center (W/central), Westbrook
       (E/NE), Heywood (S-central), Santo Domingo (E/SE), Pacifica (SW coast),
       with the Badlands wrapping the landward sides.
     * playable footprint is roughly 4 x 6 km with a large water share; total
       bounds here are 5.2 x 6.4 km, ~16 km2 of it land.
     * four architectural styles: ENTROPISM (necessity over style, grey and
       decayed), KITSCH (bold colour, plastic, rounded), NEOMILITARISM
       (monolithic, minimal, corporate), NEOKITSCH (rich, ornamented excess).
     * Arasaka Tower — 620 m — is the tallest structure and anchors the
       Corpo Plaza skyline. Megabuilding H10 sits in Little China, Watson.
     * NCART runs five lines (A-E) over 19 stations, elevated across most of
       the city, and does not serve the Badlands.
   ========================================================================== */
const STYLE = { ENTROPISM: 0, KITSCH: 1, NEOMIL: 2, NEOKITSCH: 3, INDUSTRIAL: 4, SLUM: 5 };
const STYLE_NAME = ["Entropism", "Kitsch", "Neo-Militarism", "Neo-Kitsch", "Industrial", "Informal"];

const CITY = {
  MINX: -2600, MAXX: 2600, MINZ: -3200, MAXZ: 3200,
  SEA: -2.2,                 // sea level; the city plateau sits at +0
  SECTOR: 400, CHUNK: 200,
  buildings: [], roads: [], nodes: [], edges: [], blocks: [], props: [],
  lights: [], signs: [], spawns: [], water: [],
  nodeGrid: null, bldGrid: null,

/* ---------------------------------------------------------------------------
   DISTRICTS — rect list, resolved front-to-back so sub-districts win.
   grid: [spacing along local X, along local Z], rot: street-grid bearing.
   ------------------------------------------------------------------------- */
districts: [
  /* ---- WATSON — the northern district, player's home turf --------------- */
  { id:"northside", name:"Northside", parent:"Watson", x0:-1980, z0:-3200, x1:-880, z1:-2140,
    style:STYLE.INDUSTRIAL, rot:0.0, grid:[168,150], hmin:9, hmax:38, dens:.72,
    gang:"Maelstrom", pal:[.34,.33,.31], neon:[[.95,.16,.12],[1,.62,.05]], wealth:.15 },
  { id:"kabuki", name:"Kabuki", parent:"Watson", x0:-980, z0:-2680, x1:120, z1:-1760,
    style:STYLE.ENTROPISM, rot:0.041, grid:[96,84], hmin:16, hmax:78, dens:.95,
    gang:"Tyger Claws", pal:[.30,.29,.30], neon:[[1,.06,.42],[.1,.95,1],[1,.75,.05]], wealth:.25 },
  { id:"littlechina", name:"Little China", parent:"Watson", x0:-980, z0:-1760, x1:220, z1:-1080,
    style:STYLE.ENTROPISM, rot:0.0, grid:[104,96], hmin:20, hmax:96, dens:.93,
    gang:"Tyger Claws", pal:[.33,.31,.30], neon:[[1,.10,.26],[.05,1,.85],[1,.86,.08]], wealth:.30 },
  { id:"arasakawf", name:"Arasaka Waterfront", parent:"Watson", x0:220, z0:-2760, x1:980, z1:-1420,
    style:STYLE.NEOMIL, rot:0.0, grid:[184,168], hmin:14, hmax:120, dens:.55,
    gang:"Arasaka Security", pal:[.26,.27,.30], neon:[[.9,.05,.12],[.2,.5,1]], wealth:.75 },
  { id:"watson", name:"Watson", parent:"Watson", x0:-1980, z0:-3200, x1:980, z1:-1080,
    style:STYLE.ENTROPISM, rot:0.0, grid:[128,116], hmin:14, hmax:70, dens:.8,
    gang:"Maelstrom", pal:[.32,.31,.30], neon:[[1,.12,.3],[.1,.9,1]], wealth:.28 },

  /* ---- CITY CENTER — corporate core, tallest towers -------------------- */
  { id:"corpoplaza", name:"Corpo Plaza", parent:"City Center", x0:-1420, z0:-880, x1:-700, z1:-260,
    style:STYLE.NEOMIL, rot:0.0, grid:[176,168], hmin:150, hmax:390, dens:.62,
    gang:"Corporate", pal:[.20,.21,.24], neon:[[.15,.55,1],[1,.92,.2]], wealth:1.0 },
  { id:"downtown", name:"Downtown", parent:"City Center", x0:-1760, z0:-1080, x1:-460, z1:140,
    style:STYLE.NEOMIL, rot:0.0, grid:[140,132], hmin:78, hmax:266, dens:.8,
    gang:"Corporate", pal:[.24,.25,.28], neon:[[.1,.6,1],[1,.9,.15],[1,.2,.5]], wealth:.9 },

  /* ---- WESTBROOK — entertainment + old money --------------------------- */
  { id:"japantown", name:"Japantown", parent:"Westbrook", x0:480, z0:-1620, x1:1320, z1:-760,
    style:STYLE.KITSCH, rot:-0.052, grid:[92,88], hmin:22, hmax:104, dens:.97,
    gang:"Tyger Claws", pal:[.28,.24,.30], neon:[[1,.04,.48],[.65,.1,1],[.05,1,.9],[1,.5,.02]], wealth:.6 },
  { id:"charterhill", name:"Charter Hill", parent:"Westbrook", x0:1320, z0:-1360, x1:2140, z1:-480,
    style:STYLE.NEOKITSCH, rot:0.0, grid:[132,124], hmin:52, hmax:172, dens:.7,
    gang:"Tyger Claws", pal:[.30,.28,.32], neon:[[1,.72,.1],[.75,.2,1]], wealth:.82 },
  { id:"northoaks", name:"North Oaks", parent:"Westbrook", x0:1300, z0:-2260, x1:2440, z1:-1360,
    style:STYLE.NEOKITSCH, rot:0.14, grid:[164,152], hmin:8, hmax:26, dens:.30,
    gang:"Private Security", pal:[.44,.42,.38], neon:[[1,.85,.5]], wealth:1.0 },
  { id:"westbrook", name:"Westbrook", parent:"Westbrook", x0:480, z0:-2260, x1:2440, z1:220,
    style:STYLE.KITSCH, rot:0.0, grid:[124,116], hmin:26, hmax:112, dens:.8,
    gang:"Tyger Claws", pal:[.30,.27,.31], neon:[[1,.08,.45],[.1,.95,.95]], wealth:.62 },

  /* ---- HEYWOOD — working/middle class, Valentino heartland ------------- */
  { id:"theglen", name:"The Glen", parent:"Heywood", x0:-1440, z0:120, x1:-520, z1:900,
    style:STYLE.NEOMIL, rot:0.0, grid:[130,120], hmin:40, hmax:158, dens:.78,
    gang:"Valentinos", pal:[.31,.30,.30], neon:[[.2,.7,1],[1,.55,.1]], wealth:.58 },
  { id:"wellsprings", name:"Wellsprings", parent:"Heywood", x0:-520, z0:120, x1:260, z1:900,
    style:STYLE.KITSCH, rot:0.033, grid:[100,94], hmin:22, hmax:88, dens:.9,
    gang:"Valentinos", pal:[.42,.35,.28], neon:[[1,.25,.12],[1,.8,.1],[.6,.15,1]], wealth:.42 },
  { id:"vistadelrey", name:"Vista Del Rey", parent:"Heywood", x0:-220, z0:760, x1:760, z1:1560,
    style:STYLE.SLUM, rot:0.0, grid:[92,86], hmin:12, hmax:58, dens:.94,
    gang:"Valentinos", pal:[.45,.36,.27], neon:[[1,.3,.1],[1,.75,.12],[.2,.9,.5]], wealth:.28 },
  { id:"heywood", name:"Heywood", parent:"Heywood", x0:-1440, z0:120, x1:760, z1:1560,
    style:STYLE.KITSCH, rot:0.0, grid:[112,104], hmin:18, hmax:74, dens:.85,
    gang:"Valentinos", pal:[.40,.34,.28], neon:[[1,.28,.12],[1,.78,.1]], wealth:.38 },

  /* ---- SANTO DOMINGO — factories, reactors, 6th Street ----------------- */
  { id:"arroyo", name:"Arroyo", parent:"Santo Domingo", x0:760, z0:200, x1:1640, z1:1220,
    style:STYLE.INDUSTRIAL, rot:0.0, grid:[196,180], hmin:8, hmax:52, dens:.6,
    gang:"6th Street", pal:[.36,.34,.30], neon:[[1,.45,.05],[.15,.85,.4]], wealth:.22 },
  { id:"rancho", name:"Rancho Coronado", parent:"Santo Domingo", x0:1440, z0:900, x1:2440, z1:2220,
    style:STYLE.ENTROPISM, rot:-0.028, grid:[118,110], hmin:10, hmax:44, dens:.8,
    gang:"6th Street", pal:[.40,.37,.32], neon:[[1,.55,.1],[.2,.75,1]], wealth:.34 },
  { id:"santodomingo", name:"Santo Domingo", parent:"Santo Domingo", x0:760, z0:200, x1:2440, z1:2220,
    style:STYLE.INDUSTRIAL, rot:0.0, grid:[170,156], hmin:9, hmax:46, dens:.66,
    gang:"6th Street", pal:[.37,.35,.31], neon:[[1,.5,.08]], wealth:.26 },

  /* ---- PACIFICA — the abandoned resort, Voodoo Boys territory ---------- */
  { id:"coastview", name:"Coastview", parent:"Pacifica", x0:-2140, z0:1180, x1:-1300, z1:2240,
    style:STYLE.NEOKITSCH, rot:0.062, grid:[148,138], hmin:24, hmax:132, dens:.55,
    gang:"Voodoo Boys", pal:[.40,.38,.34], neon:[[.1,1,.55],[.55,.1,1]], wealth:.12 },
  { id:"westwind", name:"West Wind Estate", parent:"Pacifica", x0:-1540, z0:1680, x1:-700, z1:2640,
    style:STYLE.SLUM, rot:0.0, grid:[112,104], hmin:10, hmax:62, dens:.72,
    gang:"Animals", pal:[.42,.39,.34], neon:[[.15,.95,.5],[1,.35,.1]], wealth:.10 },
  { id:"pacifica", name:"Pacifica", parent:"Pacifica", x0:-2140, z0:1180, x1:-700, z1:2640,
    style:STYLE.NEOKITSCH, rot:0.0, grid:[136,126], hmin:16, hmax:110, dens:.6,
    gang:"Voodoo Boys", pal:[.41,.38,.34], neon:[[.1,1,.55]], wealth:.12 },

  /* ---- BADLANDS — everything outside the city limits ------------------- */
  { id:"badlands", name:"The Badlands", parent:"Badlands", x0:-2600, z0:-3200, x1:2600, z1:3200,
    style:STYLE.SLUM, rot:0.0, grid:[560,520], hmin:4, hmax:13, dens:.05,
    gang:"Wraiths", pal:[.52,.44,.32], neon:[[1,.5,.1]], wealth:.05 },
],

/* ---- water: Pacific to the west, Del Coronado Bay biting in from N/NE --- */
waterRects: [
  { x0:-2600, z0:-3200, x1:-2020, z1:3200 },              // Pacific shelf
  { x0:-2600, z0:2500,  x1:-1450, z1:3200 },              // south bay
  { x0:-160,  z0:-3200, x1:1180,  z1:-2720 },             // Del Coronado Bay
  { x0:980,   z0:-2760, x1:1420,  z1:-2180 },             // bay inlet
],

/* ------------------------------------------------------------------------- */
inWater(x, z) {
  for (const w of this.waterRects)
    if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) return true;
  return false;
},
/* land elevation — flat city plateau, hills to the NE, coastal fall to the W */
height(x, z) {
  if (this.inWater(x, z)) return this.SEA - 3.2;
  let h = 0;
  /* North Oaks ridge */
  const nx = (x - 1900) / 700, nz = (z + 1800) / 620;
  h += 46 * Math.exp(-(nx*nx + nz*nz)) ;
  /* Charter Hill rise */
  const cx = (x - 1700) / 620, cz = (z + 900) / 560;
  h += 20 * Math.exp(-(cx*cx + cz*cz));
  /* gentle inland tilt away from the ocean */
  h += sat((x + 2020) / 1500) * 7;
  /* badlands relief, only outside the built limits */
  const d = this.cityFalloff(x, z);
  if (d > 0) h += (ridge(x*0.0016, z*0.0016, 4) - .5) * 74 * d + fbm(x*0.006, z*0.006, 3) * 9 * d;
  /* micro-relief keeps roads from looking laser-flat */
  h += (fbm(x*0.013, z*0.013, 2) - .5) * 1.1;
  /* coastal cliff into the Pacific */
  const beach = sat((-1960 - x) / 90);
  h = lerp(h, this.SEA - 4.5, beach);
  return h;
},
/* 0 inside the city, ramping to 1 in the badlands */
cityFalloff(x, z) {
  const lim = this.cityLimits;
  const dx = max(lim.x0 - x, x - lim.x1), dz = max(lim.z0 - z, z - lim.z1);
  const d = max(dx, dz);
  return sat(d / 420);
},
cityLimits: { x0:-2140, z0:-3200, x1:2440, z1:2640 },

districtAt(x, z) {
  for (let i = 0; i < this.districts.length; i++) {
    const d = this.districts[i];
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return this.districts[this.districts.length-1];
},
districtName(x, z) { const d = this.districtAt(x, z); return d.name; },

/* =========================================================================
   ROAD NETWORK
   Each district lays a rotated lattice; arterials trace district boundaries;
   a freeway ring stitches the whole thing together. Intersections become
   graph nodes for traffic, pathfinding and the minimap.
   ======================================================================= */
ROADW: { local: 9, street: 14, arterial: 22, highway: 32 },

buildRoads() {
  const nodes = this.nodes, edges = this.edges;
  const key = new Map();
  const SNAP = 9;
  const addNode = (x, z, kind) => {
    const kx = round(x/SNAP), kz = round(z/SNAP), k = kx + "," + kz;
    let i = key.get(k);
    if (i === undefined) {
      i = nodes.length;
      nodes.push({ x, z, y: 0, e: [], kind: kind||0, id: i });
      key.set(k, i);
    } else if (kind > nodes[i].kind) nodes[i].kind = kind;
    return i;
  };
  const addEdge = (a, b, w, kind) => {
    if (a === b) return;
    const na = nodes[a], nb = nodes[b];
    const len = hypot(nb.x-na.x, nb.z-na.z);
    if (len < 6) return;
    for (const ei of na.e) if (edges[ei].a === b || edges[ei].b === b) return;
    const i = edges.length;
    edges.push({ a, b, w, kind, len, id: i });
    na.e.push(i); nb.e.push(i);
  };

  /* ---- 1. arterial ring roads along every district boundary ------------ */
  const arts = [];
  for (const d of this.districts) {
    if (d.id === "badlands") continue;
    arts.push([d.x0, d.z0, d.x1, d.z0], [d.x0, d.z1, d.x1, d.z1],
              [d.x0, d.z0, d.x0, d.z1], [d.x1, d.z0, d.x1, d.z1]);
  }
  /* ---- 2. district street lattices ------------------------------------ */
  for (const d of this.districts) {
    if (d.id === "badlands") continue;
    const cx = (d.x0+d.x1)*.5, cz = (d.z0+d.z1)*.5;
    const hw = (d.x1-d.x0)*.5, hd = (d.z1-d.z0)*.5;
    const R = hypot(hw, hd);
    const c = cos(d.rot), s = sin(d.rot);
    const toW = (u, v) => [cx + u*c - v*s, cz + u*s + v*c];
    const nu = ceil(R/d.grid[0]), nv = ceil(R/d.grid[1]);
    const clipRect = (x0,z0,x1,z1) => {
      /* Liang-Barsky against the district rect, with a small inset */
      const pad = 3;
      let t0 = 0, t1 = 1;
      const dx = x1-x0, dz = z1-z0;
      const p = [-dx, dx, -dz, dz];
      const q = [x0-(d.x0+pad), (d.x1-pad)-x0, z0-(d.z0+pad), (d.z1-pad)-z0];
      for (let i = 0; i < 4; i++) {
        if (abs(p[i]) < 1e-9) { if (q[i] < 0) return null; continue; }
        const r = q[i]/p[i];
        if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
        else { if (r < t0) return null; if (r < t1) t1 = r; }
      }
      return [x0+dx*t0, z0+dz*t0, x0+dx*t1, z0+dz*t1];
    };
    for (let i = -nu; i <= nu; i++) {
      const u = i*d.grid[0];
      const A = toW(u, -R), Bp = toW(u, R);
      const seg = clipRect(A[0], A[1], Bp[0], Bp[1]);
      if (!seg) continue;
      const w = (abs(i) % 4 === 0) ? this.ROADW.arterial : this.ROADW.street;
      this.roads.push({ x0:seg[0], z0:seg[1], x1:seg[2], z1:seg[3], w, d: d.id, ax: 0 });
    }
    for (let j = -nv; j <= nv; j++) {
      const v = j*d.grid[1];
      const A = toW(-R, v), Bp = toW(R, v);
      const seg = clipRect(A[0], A[1], Bp[0], Bp[1]);
      if (!seg) continue;
      const w = (abs(j) % 4 === 0) ? this.ROADW.arterial : this.ROADW.street;
      this.roads.push({ x0:seg[0], z0:seg[1], x1:seg[2], z1:seg[3], w, d: d.id, ax: 1 });
    }
  }
  for (const a of arts)
    this.roads.push({ x0:a[0], z0:a[1], x1:a[2], z1:a[3], w:this.ROADW.arterial, d:"arterial", ax:2 });

  /* ---- 3. elevated freeway: coastal spine + cross-town + east loop ----- */
  this.highways = [
    { pts:[[-1980,-3060],[-1900,-2200],[-1830,-1200],[-1800,-200],[-1720,700],[-1580,1560],[-1460,2280]], h:16, w:34, name:"Pacific Spine" },
    { pts:[[-2020,-1120],[-1200,-1080],[-400,-1000],[420,-980],[1240,-940],[2100,-880]], h:20, w:32, name:"Trans-City Viaduct" },
    { pts:[[2380,-1900],[2420,-800],[2400,300],[2280,1300],[1900,2100],[1200,2320]], h:14, w:30, name:"Eastern Loop" },
    { pts:[[-1500,1720],[-700,1820],[200,1760],[1100,1700],[1900,1640]], h:18, w:30, name:"Southbound Connector" },
  ];

  /* ---- 4. build the traffic graph from road intersections -------------- */
  for (const r of this.roads) {
    const len = hypot(r.x1-r.x0, r.z1-r.z0);
    const steps = max(1, round(len/48));
    let prev = addNode(r.x0, r.z0, r.w >= this.ROADW.arterial ? 2 : 1);
    for (let i = 1; i <= steps; i++) {
      const t = i/steps;
      const cur = addNode(lerp(r.x0,r.x1,t), lerp(r.z0,r.z1,t), r.w >= this.ROADW.arterial ? 2 : 1);
      addEdge(prev, cur, r.w, r.w >= this.ROADW.arterial ? 2 : 1);
      prev = cur;
    }
  }
  for (const n of nodes) n.y = this.height(n.x, n.z);
  /* spatial hash for O(1) nearest-node queries during driving/traffic */
  this.nodeGrid = new SpatialHash(120);
  for (const n of nodes) this.nodeGrid.add(n.x, n.z, n);
  return this;
},

/* road surface test. `cands` lets a caller hoist the spatial-hash query out of
   an inner loop — the sector terrain pass does this and it is worth ~9 ms. */
onRoad(x, z, out, cands) {
  cands = cands || (this.roadGrid ? this.roadGrid.query(x, z, 40, this._orTmp || (this._orTmp = [])) : this.roads);
  for (const r of cands) {
    const dx = r.x1-r.x0, dz = r.z1-r.z0;
    const L2 = dx*dx+dz*dz; if (L2 < 1) continue;
    let t = ((x-r.x0)*dx + (z-r.z0)*dz)/L2;
    t = clamp(t, 0, 1);
    const px = r.x0+dx*t, pz = r.z0+dz*t;
    const d = hypot(x-px, z-pz);
    if (d < r.w*.5) { if (out) { out.r = r; out.t = t; out.d = d; } return true; }
  }
  return false;
},

/* =========================================================================
   BLOCKS AND BUILDINGS
   ======================================================================= */
buildBlocks() {
  const R = rng(0x4E43); // 'NC'
  this.roadGrid = new SpatialHash(64);
  for (const r of this.roads) {
    const steps = max(1, ceil(hypot(r.x1-r.x0, r.z1-r.z0)/48));
    for (let i = 0; i <= steps; i++)
      this.roadGrid.add(lerp(r.x0,r.x1,i/steps), lerp(r.z0,r.z1,i/steps), r);
  }
  for (const d of this.districts) {
    if (d.id === "badlands") { this.buildBadlands(d, R); continue; }
    const cx = (d.x0+d.x1)*.5, cz = (d.z0+d.z1)*.5;
    const hw = (d.x1-d.x0)*.5, hd = (d.z1-d.z0)*.5;
    const Rr = hypot(hw, hd);
    const c = cos(d.rot), s = sin(d.rot);
    const nu = ceil(Rr/d.grid[0]), nv = ceil(Rr/d.grid[1]);
    for (let i = -nu; i < nu; i++) for (let j = -nv; j < nv; j++) {
      const u0 = i*d.grid[0], v0 = j*d.grid[1];
      const u1 = u0+d.grid[0], v1 = v0+d.grid[1];
      /* inset by the flanking road half-widths + a sidewalk */
      const wIn = ((abs(i)%4===0)?this.ROADW.arterial:this.ROADW.street)*.5 + 4.5;
      const wJn = ((abs(j)%4===0)?this.ROADW.arterial:this.ROADW.street)*.5 + 4.5;
      const bu0 = u0+wIn, bu1 = u1-wIn, bv0 = v0+wJn, bv1 = v1-wJn;
      if (bu1-bu0 < 16 || bv1-bv0 < 16) continue;
      const mu = (bu0+bu1)*.5, mv = (bv0+bv1)*.5;
      const wx = cx + mu*c - mv*s, wz = cz + mu*s + mv*c;
      if (wx < d.x0+10 || wx > d.x1-10 || wz < d.z0+10 || wz > d.z1-10) continue;
      if (this.districtAt(wx, wz) !== d) continue;
      if (this.inWater(wx, wz)) continue;
      const blk = { cx: wx, cz: wz, hw:(bu1-bu0)*.5, hd:(bv1-bv0)*.5, rot: d.rot, d, i, j,
                    y: this.height(wx, wz) };
      this.blocks.push(blk);
      if (R() > d.dens) { blk.empty = true; this.makeLot(blk, R); continue; }
      this.subdivide(blk, R);
    }
  }
  /* ---- hero landmarks placed by hand, to real published dimensions ----- */
  this.placeLandmarks();
  this.bldGrid = new SpatialHash(64);
  for (const b of this.buildings) this.bldGrid.add(b.x, b.z, b);
  return this;
},

/* an empty block still gets treatment: parking, market, lot, park */
makeLot(blk, R) {
  const t = R();
  blk.lotKind = t < .34 ? "parking" : t < .55 ? "market" : t < .74 ? "vacant" : t < .9 ? "park" : "pad";
},

subdivide(blk, R) {
  const d = blk.d;
  /* how many buildings this block carries, by district character */
  let nx = 1, nz = 1;
  const W = blk.hw*2, D = blk.hd*2;
  const target = d.style === STYLE.NEOMIL ? 46 : d.style === STYLE.INDUSTRIAL ? 60
               : d.style === STYLE.NEOKITSCH ? 40 : 26;
  nx = max(1, round(W/target)); nz = max(1, round(D/target));
  /* megablocks: one tower fills the plot */
  if (R() < (d.style === STYLE.NEOMIL ? .38 : .12)) { nx = 1; nz = 1; }
  const cw = W/nx, cd = D/nz;
  const c = cos(blk.rot), s = sin(blk.rot);
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
    if (nx*nz > 1 && R() < .07) continue;                 // gap / alley
    const lu = -blk.hw + cw*(a+.5), lv = -blk.hd + cd*(b+.5);
    const x = blk.cx + lu*c - lv*s, z = blk.cz + lu*s + lv*c;
    if (this.inWater(x, z)) continue;
    const shrink = .5 + R()*.16;
    this.makeBuilding(x, z, cw*(.5-.04) - R()*2, cd*(.5-.04) - R()*2, blk, R);
  }
},

makeBuilding(x, z, hw, hd, blk, R) {
  if (hw < 5 || hd < 5) return;
  const d = blk.d;
  const y = this.height(x, z);
  /* height distribution: a power curve so towers are rare, plus a downtown
     bias that lifts everything near Corpo Plaza */
  const distCore = hypot(x + 1060, z + 560) / 1400;
  const coreBias = sat(1 - distCore) * (d.parent === "City Center" ? 1 : .45);
  let t = Math.pow(R(), 2.15 - coreBias);
  let h = lerp(d.hmin, d.hmax, t) * (1 + coreBias*.35);
  /* footprint drives plausibility: a 12x12 m plot never carries 200 m */
  const foot = min(hw, hd);
  h = min(h, foot * (d.style === STYLE.NEOMIL ? 13 : 7.5) + 8);
  h = max(h, d.hmin*.6);
  const floors = max(1, round(h/3.6));
  h = floors*3.6;
  const seed = (x*73856093 ^ z*19349663) >>> 0;
  const r2 = rng(seed);
  const b = {
    x, z, y, hw, hd, h, floors, rot: blk.rot + (r2()-.5)*(d.style===STYLE.SLUM?.28:.04),
    style: d.style, d, seed,
    /* massing archetype */
    form: wpick(d.style === STYLE.NEOMIL
      ? [["slab",3],["setback",4],["tower",3],["twist",1],["podium",3]]
      : d.style === STYLE.INDUSTRIAL
      ? [["shed",5],["silo",1],["stack",2],["slab",2]]
      : d.style === STYLE.NEOKITSCH
      ? [["podium",3],["setback",3],["villa",3],["tower",2]]
      : d.style === STYLE.SLUM
      ? [["stack",4],["shed",3],["slab",2]]
      : [["slab",5],["stack",3],["podium",2],["setback",2]], r2),
    hasFireEscape: (d.style===STYLE.ENTROPISM||d.style===STYLE.SLUM) && r2() < .62,
    hasAwning: r2() < (d.style===STYLE.KITSCH?.7:.34),
    hasSigns: r2() < (d.style===STYLE.KITSCH?.95:d.style===STYLE.ENTROPISM?.8:.42),
    hasBalcony: (d.style===STYLE.KITSCH||d.style===STYLE.NEOKITSCH) && r2() < .55,
    roofClutter: d.style !== STYLE.NEOMIL || r2() < .5,
    tint: null, chunk: 0, sector: 0, interior: null, id: this.buildings.length,
  };
  /* palette: district base hue with per-building drift */
  const pal = d.pal;
  const drift = (r2()-.5)*.10;
  b.tint = [sat(pal[0]+drift), sat(pal[1]+drift*.9), sat(pal[2]+drift*1.1)];
  if (d.style === STYLE.KITSCH && r2() < .5) {
    const hh = r2();
    b.tint = hsl(hh, .55, .42);
  }
  if (d.style === STYLE.NEOKITSCH && r2() < .35) b.tint = hsl(.09+r2()*.06, .35, .48);
  this.buildings.push(b);
  return b;
},

buildBadlands(d, R) {
  /* sparse: solar farms, gas stations, trailer clusters, wind turbines */
  for (let i = 0; i < 320; i++) {
    const x = lerp(this.MINX+80, this.MAXX-80, R());
    const z = lerp(this.MINZ+80, this.MAXZ-80, R());
    if (this.cityFalloff(x, z) < .55) continue;
    if (this.inWater(x, z)) continue;
    const y = this.height(x, z);
    const t = R();
    this.props.push({ kind: t < .3 ? "trailer" : t < .5 ? "turbine" : t < .68 ? "solar"
                       : t < .8 ? "gasstation" : t < .92 ? "wreck" : "shack",
                      x, y, z, rot: R()*TAU, seed: (R()*1e9)|0, big: true });
  }
},

/* ---------------- hand-placed hero structures --------------------------- */
placeLandmarks() {
  const L = (o) => { o.landmark = true; o.id = this.buildings.length;
    o.y = this.height(o.x, o.z); o.d = this.districtAt(o.x, o.z);
    o.floors = max(1, round(o.h/3.6)); o.seed = (o.x*7919 ^ o.z*104729)>>>0;
    this.buildings.push(o); this.landmarks.push(o); return o; };
  /* Arasaka Tower — 620 m, the tallest thing in Night City */
  L({ x:-1040, z:-560, hw:46, hd:46, h:620, rot:0, style:STYLE.NEOMIL, form:"arasaka",
      tint:[.13,.14,.17], name:"Arasaka Tower", roofClutter:false, hasSigns:false, key:"arasaka" });
  /* the twin corporate slabs flanking Corpo Plaza */
  L({ x:-1260, z:-720, hw:34, hd:34, h:352, rot:0, style:STYLE.NEOMIL, form:"tower",
      tint:[.17,.19,.23], name:"Kanto Financial", roofClutter:false, key:"kanto" });
  L({ x:-820,  z:-760, hw:30, hd:38, h:296, rot:0, style:STYLE.NEOMIL, form:"setback",
      tint:[.19,.20,.22], name:"Meridian Trust", roofClutter:false, key:"meridian" });
  L({ x:-1280, z:-330, hw:38, hd:30, h:268, rot:0, style:STYLE.NEOMIL, form:"twist",
      tint:[.16,.18,.21], name:"Sendo Global Tower", roofClutter:false, key:"sendo" });
  /* Megabuilding H10, Little China — V's block in the source material */
  L({ x:-620, z:-1420, hw:52, hd:44, h:186, rot:0, style:STYLE.ENTROPISM, form:"mega",
      tint:[.30,.29,.28], name:"Megabuilding H10", roofClutter:true, hasSigns:true, key:"h10" });
  L({ x:1180, z:1080, hw:56, hd:48, h:168, rot:0, style:STYLE.ENTROPISM, form:"mega",
      tint:[.32,.30,.27], name:"Megabuilding H7", roofClutter:true, key:"h7" });
  L({ x:-260, z:520, hw:50, hd:46, h:174, rot:0, style:STYLE.ENTROPISM, form:"mega",
      tint:[.34,.30,.26], name:"Megabuilding H4", roofClutter:true, key:"h4" });
  /* Pacifica's abandoned Grand Imperial Mall + unfinished stadium */
  L({ x:-1760, z:1780, hw:88, hd:64, h:46, rot:0, style:STYLE.NEOKITSCH, form:"mall",
      tint:[.44,.41,.36], name:"Grand Imperial Mall", roofClutter:true, key:"mall" });
  L({ x:-1180, z:2180, hw:104, hd:96, h:62, rot:0, style:STYLE.NEOKITSCH, form:"stadium",
      tint:[.40,.38,.35], name:"Pacifica Stadium", roofClutter:false, key:"stadium" });
  /* Santo Domingo's reactor stacks */
  L({ x:1520, z:640, hw:34, hd:34, h:140, rot:0, style:STYLE.INDUSTRIAL, form:"reactor",
      tint:[.42,.41,.38], name:"Arroyo Thermal Plant", roofClutter:false, key:"reactor" });
  /* Kabuki market hall + Japantown pagoda tower */
  L({ x:-540, z:-2180, hw:44, hd:36, h:28, rot:.041, style:STYLE.ENTROPISM, form:"markethall",
      tint:[.33,.30,.29], name:"Kabuki Market", roofClutter:true, key:"kabukimarket" });
  L({ x:880, z:-1180, hw:26, hd:26, h:118, rot:-.052, style:STYLE.KITSCH, form:"pagoda",
      tint:[.36,.16,.20], name:"Kitsune Tower", roofClutter:false, key:"kitsune" });
  /* NCPD Watson precinct + the clinic the story opens in */
  L({ x:-380, z:-1620, hw:26, hd:22, h:34, rot:0, style:STYLE.NEOMIL, form:"podium",
      tint:[.22,.24,.28], name:"NCPD Watson Precinct", key:"ncpd" });
  L({ x:-760, z:-1900, hw:22, hd:20, h:26, rot:.041, style:STYLE.ENTROPISM, form:"podium",
      tint:[.28,.30,.31], name:"Kabuki Cold Storage", key:"clinic" });
  return this;
},
landmarks: [],

/* =========================================================================
   NCART — five lines, nineteen stations, mostly elevated
   ======================================================================= */
metro: {
  stations: [
    { id:"eisenhower",  name:"Eisenhower St",    x:-1520, z:-2560, dist:"Watson" },
    { id:"northside",   name:"Northside",        x:-1560, z:-2900, dist:"Watson" },
    { id:"kabuki",      name:"Kabuki",           x:-520,  z:-2260, dist:"Watson" },
    { id:"littlechina", name:"Little China",     x:-560,  z:-1360, dist:"Watson" },
    { id:"medcenter",   name:"MedCenter",        x:-160,  z:-1720, dist:"Watson" },
    { id:"arasakawf",   name:"Arasaka Waterfront",x:560,  z:-2020, dist:"Watson" },
    { id:"newharbor",   name:"New Harbor",       x:820,   z:-2540, dist:"Watson" },
    { id:"citycenter",  name:"City Center",      x:-1160, z:-900,  dist:"City Center" },
    { id:"corpoplaza",  name:"Corpo Plaza",      x:-1060, z:-420,  dist:"City Center" },
    { id:"downtown",    name:"Downtown",         x:-1500, z:-620,  dist:"City Center" },
    { id:"japantown",   name:"Japantown",        x:900,   z:-1420, dist:"Westbrook" },
    { id:"charterhill", name:"Charter Hill",     x:1700,  z:-960,  dist:"Westbrook" },
    { id:"northoaks",   name:"North Oaks",       x:1820,  z:-1800, dist:"Westbrook" },
    { id:"theglen",     name:"The Glen",         x:-980,  z:520,   dist:"Heywood" },
    { id:"wellsprings", name:"Wellsprings",      x:-140,  z:500,   dist:"Heywood" },
    { id:"vistadelrey", name:"Vista Del Rey",    x:280,   z:1160,  dist:"Heywood" },
    { id:"arroyo",      name:"Arroyo",           x:1180,  z:700,   dist:"Santo Domingo" },
    { id:"megah7",      name:"Megabuilding H7",  x:1320,  z:1240,  dist:"Santo Domingo" },
    { id:"rancho",      name:"Rancho Coronado",  x:2000,  z:1560,  dist:"Santo Domingo" },
    { id:"stadium",     name:"Pacifica Stadium", x:-1240, z:2060,  dist:"Pacifica" },
    { id:"coastview",   name:"Coastview",        x:-1760, z:1560,  dist:"Pacifica" },
  ],
  lines: [
    { id:"A", name:"Line A", col:"#ff2b45", stops:["eisenhower","kabuki","littlechina","citycenter","theglen","wellsprings","megah7"] },
    { id:"B", name:"Line B", col:"#ffcc00", stops:["megah7","arroyo","vistadelrey","wellsprings","corpoplaza","downtown","coastview","stadium"] },
    { id:"C", name:"Line C", col:"#2f9dff", stops:["citycenter","corpoplaza","theglen","stadium"] },
    { id:"D", name:"Line D", col:"#2fd97a", stops:["littlechina","medcenter","japantown","charterhill","arroyo","vistadelrey","theglen","downtown","citycenter","littlechina"], loop:true },
    { id:"E", name:"Line E", col:"#ff8a1f", stops:["northside","eisenhower","kabuki","medcenter","arasakawf","newharbor","japantown","northoaks","charterhill","rancho"] },
  ],
  byId: {},
  init() {
    for (const s of this.stations) { this.byId[s.id] = s; s.lines = []; s.y = 0; }
    for (const l of this.lines) for (const s of l.stops)
      if (this.byId[s] && this.byId[s].lines.indexOf(l.id) < 0) this.byId[s].lines.push(l.id);
    return this;
  },
  /* the physical track: a polyline through each line's stops, elevated */
  tracks() {
    const out = [];
    for (const l of this.lines) {
      const pts = [];
      for (const sid of l.stops) { const s = this.byId[sid]; if (s) pts.push([s.x, s.z]); }
      out.push({ line: l, pts });
    }
    return out;
  },
},

/* =========================================================================
   BUILD ORCHESTRATION
   ======================================================================= */
generate(progress) {
  const t0 = performance.now();
  this.metro.init();
  progress && progress(.05, "SURVEYING DISTRICTS");
  this.buildRoads();
  progress && progress(.35, "LAYING ROAD NETWORK");
  this.buildBlocks();
  progress && progress(.7, "ZONING " + this.buildings.length + " STRUCTURES");
  this.buildMetroLine();
  this.placeStreetProps();
  progress && progress(.95, "DRESSING STREETS");
  this.genMs = performance.now() - t0;
  return this;
},

buildMetroLine() {
  /* elevated viaduct geometry descriptors; the mesh is emitted per-sector */
  this.metroTracks = [];
  for (const t of this.metro.tracks()) {
    const pts = t.pts;
    for (let i = 0; i < pts.length-1; i++) {
      const a = pts[i], b = pts[i+1];
      const len = hypot(b[0]-a[0], b[1]-a[1]);
      const steps = max(1, ceil(len/28));
      for (let s = 0; s < steps; s++) {
        const t0 = s/steps, t1 = (s+1)/steps;
        const x0 = lerp(a[0],b[0],t0), z0 = lerp(a[1],b[1],t0);
        const x1 = lerp(a[0],b[0],t1), z1 = lerp(a[1],b[1],t1);
        if (this.inWater((x0+x1)*.5, (z0+z1)*.5)) continue;
        this.metroTracks.push({ x0, z0, x1, z1, line: t.line.id, col: t.line.col,
          y: max(this.height(x0,z0), this.height(x1,z1)) + 15 });
      }
    }
  }
  for (const s of this.metro.stations) s.y = this.height(s.x, s.z);
},

placeStreetProps() {
  const R = rng(0x5052);
  /* street lights, hydrants, bins, benches, vending, phone poles along roads */
  for (const r of this.roads) {
    if (r.w < this.ROADW.street) continue;
    const len = hypot(r.x1-r.x0, r.z1-r.z0);
    const dx = (r.x1-r.x0)/len, dz = (r.z1-r.z0)/len;
    const px = -dz, pz = dx;
    const spacing = r.w >= this.ROADW.arterial ? 34 : 46;
    const n = (len/spacing)|0;
    for (let i = 1; i < n; i++) {
      const t = i*spacing;
      for (let sideI = 0; sideI < 2; sideI++) {
        const side = sideI ? 1 : -1;
        const off = r.w*.5 + 2.2;
        const x = r.x0 + dx*t + px*off*side, z = r.z0 + dz*t + pz*off*side;
        if (this.inWater(x, z)) continue;
        const cf = this.cityFalloff(x, z);
        if (cf > .5) continue;
        const y = this.height(x, z);
        const d = this.districtAt(x, z);
        const q = R();
        if (q < .55) this.props.push({ kind:"streetlight", x, y, z, rot: atan2(pz*side, px*side), d, seed:(R()*1e9)|0 });
        else if (q < .64) this.props.push({ kind:"hydrant", x, y, z, rot:R()*TAU, d });
        else if (q < .74) this.props.push({ kind:"bin", x, y, z, rot:R()*TAU, d });
        else if (q < .82) this.props.push({ kind:"vending", x, y, z, rot: atan2(-px*side,-pz*side), d, seed:(R()*1e9)|0 });
        else if (q < .88) this.props.push({ kind:"bench", x, y, z, rot: atan2(pz*side, px*side), d });
        else if (q < .94) this.props.push({ kind:"planter", x, y, z, rot:R()*TAU, d });
        else this.props.push({ kind:"barrier", x, y, z, rot: atan2(dz,dx), d });
      }
    }
  }
  /* alley clutter behind buildings */
  for (const b of this.buildings) {
    if (b.landmark) continue;
    const r = rng(b.seed ^ 0x9e37);
    if (r() > .3) continue;
    const a = r()*TAU, dd = max(b.hw, b.hd)+2.5;
    const x = b.x + cos(a)*dd, z = b.z + sin(a)*dd;
    if (this.inWater(x, z)) continue;
    const t = r();
    this.props.push({ kind: t<.4?"dumpster":t<.6?"crates":t<.75?"barrel":t<.9?"pallet":"cardboard",
      x, y:this.height(x,z), z, rot:r()*TAU, d:b.d });
  }
  this.propGrid = new SpatialHash(64);
  for (const p of this.props) this.propGrid.add(p.x, p.z, p);
},
};

/* ------------------------------------------------------------------------ */
class SpatialHash {
  constructor(cell) { this.c = cell; this.m = new Map(); }
  _k(x, z) { return (floor(x/this.c)) + "," + (floor(z/this.c)); }
  add(x, z, v) { const k = this._k(x,z); let a = this.m.get(k); if (!a) { a=[]; this.m.set(k,a); } a.push(v); }
  query(x, z, r, out) {
    out = out || [];
    out.length = 0;
    const c = this.c, i0 = floor((x-r)/c), i1 = floor((x+r)/c), j0 = floor((z-r)/c), j1 = floor((z+r)/c);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = this.m.get(i + "," + j);
      if (a) for (let k = 0; k < a.length; k++) out.push(a[k]);
    }
    return out;
  }
  cellAt(x, z) { return this.m.get(this._k(x,z)); }
}
</script>
