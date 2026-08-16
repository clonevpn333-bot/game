<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 07 — WORLD GEOMETRY STREAMING
   Two co-operating LOD tiers that never overlap, so nothing ever z-fights and
   nothing ever pops in silhouette:
     SECTOR (400 m) — building shells, terrain, roads, viaducts. Always drawn.
     CHUNK  (200 m) — decoration only: greebles, signage, street furniture,
                      fire escapes, awnings, railings. Drawn within 340 m.
   Because the chunk tier adds strictly *new* surfaces rather than replacing
   the shell, LOD transitions are additive and invisible.
   ========================================================================== */
const WORLD = {
  sectors: new Map(), chunks: new Map(),
  L: {}, lightHash: null, staticLights: [],
  budgetMs: 6.5, queue: [], _tmp: [],
  stats: { sectors: 0, chunks: 0, verts: 0 },

  init() {
    const T = TEX;
    this.L = {
      concrete: T.id("concrete"), concreteWet: T.id("concreteWet"), asphalt: T.id("asphalt"),
      sidewalk: T.id("sidewalk"), brick: T.id("brick"), corrugated: T.id("corrugated"),
      rust: T.id("rust"), metal: T.id("metalPanel"), glass: T.id("glassPanel"),
      paint: T.id("paintKitsch"), stucco: T.id("stucco"), graffiti: T.id("graffiti"),
      sign: T.id("signBoard"), floor: T.id("floorPolish"), marble: T.id("marble"),
      sand: T.id("sand"), scrub: T.id("scrub"), skin: T.id("skin"), fabric: T.id("fabric"),
      leather: T.id("leather"), gun: T.id("gunmetal"), car: T.id("carPaint"),
      rubber: T.id("rubber"), tech: T.id("tech"), holo: T.id("holoPanel"),
      water: T.id("water"), tile: T.id("tile"), perf: T.id("perf"), hair: T.id("hair"),
      platform: T.id("platform"),
    };
    this.lightHash = new SpatialHash(48);
    return this;
  },

  /* Tile keys must round-trip for negative coordinates — Night City spans
     negative X and Z, and the old i*8192+j aliased there, which made evict()
     decode neighbouring tiles as thousands of metres away and bin them. */
  KOFF: 4096,
  key(i, j) { return (i + this.KOFF) * 8192 + (j + this.KOFF); },
  unkey(k, out) { const i = floor(k / 8192); out[0] = i - this.KOFF; out[1] = k - i*8192 - this.KOFF; return out; },

  /* ---------------------------------------------------------------------- */
  ensure(camX, camZ, budgetMs) {
    const t0 = performance.now();
    const budget = budgetMs || this.budgetMs;
    const S = CITY.SECTOR, C = CITY.CHUNK;
    const si = floor(camX/S), sj = floor(camZ/S);
    const ci = floor(camX/C), cj = floor(camZ/C);

    /* Detail chunks first: they carry the street furniture, the signage and
       every neon light source, so starving them costs far more visually than
       a late-arriving distant sector. They get 55% of the frame budget. */
    const chunkBudget = budget * 0.55;
    for (let r = 0; r <= 2; r++) {
      for (let i = ci-r; i <= ci+r; i++) for (let j = cj-r; j <= cj+r; j++) {
        if (max(abs(i-ci), abs(j-cj)) !== r) continue;
        const k = this.key(i, j);
        if (this.chunks.has(k)) continue;
        this.buildChunk(i, j);
        if (performance.now() - t0 > chunkBudget) { r = 99; break; }
      }
    }
    /* Sectors expand outward from the camera with whatever budget is left. */
    const RS = 7;
    for (let r = 0; r <= RS; r++) {
      let any = false;
      for (let i = si-r; i <= si+r; i++) for (let j = sj-r; j <= sj+r; j++) {
        if (max(abs(i-si), abs(j-sj)) !== r) continue;
        const k = this.key(i, j);
        if (this.sectors.has(k)) continue;
        this.buildSector(i, j);
        any = true;
        if (performance.now() - t0 > budget) { r = 99; break; }
      }
    }
    /* Eviction runs unconditionally — it used to sit after an early return, so
       tiles built during the menu flythrough were never reclaimed. */
    if (this.sectors.size > 260) this.evict(this.sectors, si, sj, 9);
    if (this.chunks.size > 64) this.evict(this.chunks, ci, cj, 4);
  },
  evict(map, ci, cj, r) {
    const ij = this._ij || (this._ij = [0,0]);
    for (const [k, v] of map) {
      this.unkey(k, ij);
      const i = ij[0], j = ij[1];
      if (max(abs(i-ci), abs(j-cj)) > r) {
        if (v.solid) GX.freeMesh(v.solid);
        if (v.glass) GX.freeMesh(v.glass);
        if (v.detail) GX.freeMesh(v.detail);
        if (v.neon) GX.freeMesh(v.neon);
        map.delete(k);
      }
    }
  },

/* ==========================================================================
   SECTOR: terrain + roads + building shells + viaducts
   ======================================================================== */
buildSector(si, sj) {
  const S = CITY.SECTOR;
  const x0 = si*S, z0 = sj*S, x1 = x0+S, z1 = z0+S;
  const B = new MeshBuilder(), G = new MeshBuilder();
  const R = rng((si*73856093 ^ sj*19349663) >>> 0);

  this.terrain(B, x0, z0, x1, z1, R);
  this.roadSurfaces(B, x0, z0, x1, z1);

  const list = CITY.bldGrid.query((x0+x1)*.5, (z0+z1)*.5, S*.75, this._tmp);
  const seen = new Set();
  for (const b of list) {
    if (seen.has(b.id)) continue; seen.add(b.id);
    if (b.x < x0 || b.x >= x1 || b.z < z0 || b.z >= z1) continue;
    this.shell(B, G, b);
  }
  this.viaduct(B, x0, z0, x1, z1);
  this.metroStations(B, G, x0, z0, x1, z1);

  const rec = { solid: B.build(), glass: G.build(), i: si, j: sj,
                x0, z0, x1, z1, cx:(x0+x1)*.5, cz:(z0+z1)*.5,
                ymin: -10, ymax: 40 };
  /* real vertical bounds for the frustum test */
  if (rec.solid) { rec.ymin = min(rec.ymin, rec.solid.bmin[1]); rec.ymax = max(rec.ymax, rec.solid.bmax[1]); }
  if (rec.glass) { rec.ymin = min(rec.ymin, rec.glass.bmin[1]); rec.ymax = max(rec.ymax, rec.glass.bmax[1]); }
  this.sectors.set(this.key(si, sj), rec);
  this.stats.sectors++;
  return rec;
},

/* -------------------------------- terrain -------------------------------- */
terrain(B, x0, z0, x1, z1, R) {
  const N = 26, step = (x1-x0)/N;
  const Lc = this.L;
  /* Rasterise the road network into an N x N mask once, by walking each nearby
     segment and stamping the cells it covers. This is O(segments) rather than
     the O(texels x segments) point test it replaces. */
  const mask = this._mask || (this._mask = new Uint8Array(N*N));
  mask.fill(0);
  const cands = CITY.roadGrid.query((x0+x1)*.5, (z0+z1)*.5, CITY.SECTOR*.9,
                                    this._roadTmp || (this._roadTmp = []));
  const seenR = this._seenR || (this._seenR = new Set());
  seenR.clear();
  for (const r of cands) {
    if (seenR.has(r)) continue; seenR.add(r);
    const dx = r.x1-r.x0, dz = r.z1-r.z0;
    const len = hypot(dx, dz); if (len < 1) continue;
    const steps = ceil(len/(step*0.5));
    const rad = r.w*0.5 + step*0.35;
    const cr = ceil(rad/step);
    for (let s2 = 0; s2 <= steps; s2++) {
      const t = s2/steps;
      const px = r.x0+dx*t, pz = r.z0+dz*t;
      const ci0 = floor((px-x0)/step), cj0 = floor((pz-z0)/step);
      for (let a = -cr; a <= cr; a++) for (let bq = -cr; bq <= cr; bq++) {
        const ii = ci0+a, jj = cj0+bq;
        if (ii < 0 || ii >= N || jj < 0 || jj >= N) continue;
        const cxm = x0+(ii+.5)*step, czm = z0+(jj+.5)*step;
        if (hypot(cxm-px, czm-pz) <= rad) mask[jj*N+ii] = 1;
      }
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const ax = x0+i*step, az = z0+j*step, bx = ax+step, bz = az+step;
    const mx = ax+step*.5, mz = az+step*.5;
    if (CITY.inWater(mx, mz)) continue;
    const cf = CITY.cityFalloff(mx, mz);
    let layer, tint, rough = 1;
    if (cf > .45) { layer = R() < .55 ? Lc.sand : Lc.scrub; tint = [.94,.9,.84]; }
    else if (mask[j*N+i]) { layer = Lc.asphalt; tint = [1,1,1]; }
    else { layer = Lc.sidewalk; tint = [.96,.96,.97]; }
    B.mat(layer, 1, 1, 0).colv(tint, 0).uv(.14);
    const y00 = CITY.height(ax,az), y10 = CITY.height(bx,az),
          y11 = CITY.height(bx,bz), y01 = CITY.height(ax,bz);
    B.quad([ax,y01,bz],[bx,y11,bz],[bx,y10,az],[ax,y00,az], step*.14, step*.14);
  }
  /* shoreline + open water plane handled by the dedicated water pass */
},

/* ------------------------------- roads ---------------------------------- */
roadSurfaces(B, x0, z0, x1, z1) {
  const Lc = this.L;
  const cands = CITY.roadGrid.query((x0+x1)*.5, (z0+z1)*.5, CITY.SECTOR*.85, this._tmp);
  const done = new Set();
  for (const r of cands) {
    if (done.has(r)) continue; done.add(r);
    const dx = r.x1-r.x0, dz = r.z1-r.z0;
    const len = hypot(dx,dz); if (len < 1) continue;
    const ux = dx/len, uz = dz/len, px = -uz, pz = ux;
    const hw = r.w*.5;
    const steps = max(1, ceil(len/20));
    for (let s = 0; s < steps; s++) {
      const t0 = s/steps, t1 = (s+1)/steps;
      const ax = r.x0+dx*t0, az = r.z0+dz*t0, bx = r.x0+dx*t1, bz = r.z0+dz*t1;
      const mx = (ax+bx)*.5, mz = (az+bz)*.5;
      if (mx < x0-12 || mx >= x1+12 || mz < z0-12 || mz >= z1+12) continue;
      if (CITY.inWater(mx, mz)) continue;
      const ya = CITY.height(ax,az)+.06, yb = CITY.height(bx,bz)+.06;
      /* carriageway */
      B.mat(Lc.asphalt, 1, 1, 0).col(1,1,1,0).uv(.13);
      B.quad([ax+px*hw, ya, az+pz*hw], [bx+px*hw, yb, bz+pz*hw],
             [bx-px*hw, yb, bz-pz*hw], [ax-px*hw, ya, az-pz*hw], r.w*.13, (len/steps)*.13);
      /* kerb + sidewalk shoulder */
      B.mat(Lc.sidewalk, 1, 1, 0).col(.94,.94,.95,0).uv(.16);
      for (let side = -1; side <= 1; side += 2) {
        const o1 = hw, o2 = hw+3.4;
        B.quad([ax+px*o2*side, ya+.16, az+pz*o2*side], [bx+px*o2*side, yb+.16, bz+pz*o2*side],
               [bx+px*o1*side, yb+.16, bz+pz*o1*side], [ax+px*o1*side, ya+.16, az+pz*o1*side],
               3.4*.16, (len/steps)*.16);
        /* kerb face */
        B.mat(Lc.concrete, 1, 1, 0).col(.8,.8,.8,0).uv(.3);
        B.quad([ax+px*o1*side, ya, az+pz*o1*side], [bx+px*o1*side, yb, bz+pz*o1*side],
               [bx+px*o1*side, yb+.16, bz+pz*o1*side], [ax+px*o1*side, ya+.16, az+pz*o1*side], .5, (len/steps)*.3);
        B.mat(Lc.sidewalk, 1, 1, 0).col(.94,.94,.95,0).uv(.16);
      }
      /* centre line on arterials — thin emissive-free painted strip */
      if (r.w >= CITY.ROADW.arterial && s % 2 === 0) {
        B.mat(Lc.concrete, .55, 0, 0).col(.95,.85,.12,0).uv(.4);
        B.quad([ax+px*.18, ya+.012, az+pz*.18], [bx+px*.18, yb+.012, bz+pz*.18],
               [bx-px*.18, yb+.012, bz-pz*.18], [ax-px*.18, ya+.012, az-pz*.18], .3, (len/steps)*.4);
      }
    }
  }
},

/* ====================== BUILDING SHELLS (LOD-independent) ================ */
shell(B, G, b) {
  const Lc = this.L;
  const y = b.y;
  const seed = b.seed >>> 0, R = rng(seed);
  /* facade material selection follows the district's architectural style */
  let wallLayer, glassy = false;
  switch (b.style) {
    case STYLE.NEOMIL:    wallLayer = Lc.metal;      glassy = true; break;
    case STYLE.KITSCH:    wallLayer = Lc.paint;      glassy = R() < .45; break;
    case STYLE.NEOKITSCH: wallLayer = R()<.5?Lc.marble:Lc.stucco; glassy = R() < .6; break;
    case STYLE.INDUSTRIAL:wallLayer = R()<.6?Lc.corrugated:Lc.concrete; break;
    case STYLE.SLUM:      wallLayer = R()<.45?Lc.corrugated:Lc.stucco; break;
    default:              wallLayer = R()<.4?Lc.brick:(R()<.5?Lc.concreteWet:Lc.concrete);
  }
  const tint = b.tint || [.4,.4,.4];
  const F = b.form;

  /* helper: emit one massing box, glass band facades on the glassy styles */
  const massing = (cx, cz, hw, hd, y0, y1, rot, forceWall) => {
    const useGlass = glassy && !forceWall && (y1-y0) > 6;
    if (useGlass) {
      G.mat(Lc.glass, 1, 1, 0).colv(tint, 0).uv(1/12, 0, 0, 1/21.6);
      G.boxYaw(cx, (y0+y1)*.5, cz, hw, (y1-y0)*.5, hd, rot, 1|2|16|32, 1);
      /* structural frame reads through the glazing */
      B.mat(wallLayer, 1, 1, 0).colv(tint, 0).uv(.2);
      B.boxYaw(cx, (y0+y1)*.5, cz, hw*1.008, (y1-y0)*.5, hd*1.008, rot, 4, 1);
    } else {
      B.mat(wallLayer, 1, 1, 0).colv(tint, 0).uv(.16, 0, 0, 1/3.6*.55);
      B.boxYaw(cx, (y0+y1)*.5, cz, hw, (y1-y0)*.5, hd, rot, 1|2|16|32, 1);
      /* punched window band per floor, dark recessed glazing */
      const floors = max(1, ((y1-y0)/3.6)|0);
      G.mat(Lc.glass, 1, 1, 0).colv(tint, 0).uv(1/12, 0, 0, 1/21.6);
      for (let f = 0; f < floors; f++) {
        const fy = y0 + f*3.6;
        if (fy + 2.4 > y1) break;
        G.boxYaw(cx, fy+1.75, cz, hw*1.002, 1.05, hd*1.002, rot, 1|2|16|32, 1);
      }
    }
    B.mat(Lc.concrete, 1, 1, 0).colv(tint, 0).uv(.12);
    B.boxYaw(cx, y1+.001, cz, hw*1.02, .001, hd*1.02, rot, 4, 1);
  };

  if (F === "arasaka") return this.formArasaka(B, G, b);
  if (F === "stadium") return this.formStadium(B, G, b);
  if (F === "reactor") return this.formReactor(B, G, b);
  if (F === "pagoda")  return this.formPagoda(B, G, b);
  if (F === "mall")    return this.formMall(B, G, b);
  if (F === "mega")    return this.formMega(B, G, b, massing);
  if (F === "markethall") return this.formMarket(B, G, b);

  switch (F) {
    case "slab":
      massing(b.x, b.z, b.hw, b.hd, y, y+b.h, b.rot);
      break;
    case "setback": {
      const n = 2 + (R()*3|0);
      let hw = b.hw, hd = b.hd, cy = y;
      for (let i = 0; i < n; i++) {
        const seg = b.h * (i === n-1 ? 1 : (0.28 + R()*0.22));
        const top = min(y+b.h, cy + seg);
        massing(b.x, b.z, hw, hd, cy, top, b.rot);
        cy = top; hw *= .74+R()*.13; hd *= .74+R()*.13;
        if (cy >= y+b.h-1) break;
      }
      break; }
    case "tower": {
      const podH = min(b.h*.14, 18);
      massing(b.x, b.z, b.hw, b.hd, y, y+podH, b.rot, true);
      massing(b.x, b.z, b.hw*.82, b.hd*.82, y+podH, y+b.h, b.rot);
      /* crown */
      B.mat(Lc.metal, .7, 1, 0).col(.3,.32,.36,0).uv(.2);
      B.boxYaw(b.x, y+b.h+3, b.z, b.hw*.5, 3, b.hd*.5, b.rot);
      B.mat(Lc.metal, .8, 1, 0).col(.45,.46,.5,0);
      B.cylinder(b.x, y+b.h+6, b.z, .45, .12, 14+R()*22, 6, false, 1);
      break; }
    case "twist": {
      const n = max(3, (b.h/16)|0);
      for (let i = 0; i < n; i++) {
        const t0 = i/n, t1 = (i+1)/n;
        const s = 1 - t0*.24;
        massing(b.x, b.z, b.hw*s, b.hd*s, y+b.h*t0, y+b.h*t1, b.rot + t0*.62);
      }
      break; }
    case "podium": {
      const podH = min(b.h*.3, 22);
      massing(b.x, b.z, b.hw, b.hd, y, y+podH, b.rot, true);
      if (b.h > podH+6) {
        const ox = (R()-.5)*b.hw*.4, oz = (R()-.5)*b.hd*.4;
        massing(b.x+ox, b.z+oz, b.hw*.6, b.hd*.6, y+podH, y+b.h, b.rot);
      }
      break; }
    case "stack": {
      /* informal vertical accretion — the Vista Del Rey / Pacifica signature */
      let cy = y, i = 0;
      while (cy < y+b.h-2 && i < 9) {
        const hgt = 2.8 + R()*3.4;
        const sx = b.hw*(.72+R()*.3), sz = b.hd*(.72+R()*.3);
        const ox = (R()-.5)*b.hw*.42, oz = (R()-.5)*b.hd*.42;
        B.mat(R()<.4?Lc.corrugated:wallLayer, 1, 1, 0)
         .col(tint[0]*(.8+R()*.4), tint[1]*(.8+R()*.4), tint[2]*(.8+R()*.4), 0).uv(.2);
        B.boxYaw(b.x+ox, cy+hgt*.5, b.z+oz, sx, hgt*.5, sz, b.rot+(R()-.5)*.18);
        G.mat(Lc.glass, 1, 1, 0).colv(tint,0).uv(1/9, 0, 0, 1/12);
        G.boxYaw(b.x+ox, cy+hgt*.55, b.z+oz, sx*1.004, hgt*.26, sz*1.004, b.rot+(R()-.5)*.18, 1|2|16|32, 1);
        cy += hgt; i++;
      }
      break; }
    case "shed": {
      const h = min(b.h, 16);
      B.mat(Lc.corrugated, 1, 1, 0).colv(tint,0).uv(.24);
      B.boxYaw(b.x, y+h*.5, b.z, b.hw, h*.5, b.hd, b.rot, 1|2|16|32);
      /* saw-tooth north-light roof */
      const teeth = max(2, (b.hw*2/9)|0);
      for (let i = 0; i < teeth; i++) {
        const u0 = -b.hw + (i*2*b.hw/teeth), u1 = u0 + 2*b.hw/teeth;
        const c = cos(b.rot), s = sin(b.rot);
        const P = (u,v,yy) => [b.x+u*c-v*s, yy, b.z+u*s+v*c];
        B.mat(Lc.corrugated, 1, 1, 0).colv(tint,0).uv(.24);
        B.quad(P(u0,-b.hd,y+h), P(u1,-b.hd,y+h+2.4), P(u1,b.hd,y+h+2.4), P(u0,b.hd,y+h));
        G.mat(Lc.glass, 1, 1, 0).col(.5,.55,.6,0).uv(1/6,0,0,1/6);
        G.quad(P(u1,-b.hd,y+h+2.4), P(u1,-b.hd,y+h), P(u1,b.hd,y+h), P(u1,b.hd,y+h+2.4));
      }
      break; }
    case "silo": {
      const n = 1 + (R()*3|0);
      for (let i = 0; i < n; i++) {
        const rr = min(b.hw, b.hd)/max(1,n) * .82;
        const ox = (i - (n-1)*.5) * rr*2.2;
        const c = cos(b.rot), s = sin(b.rot);
        B.mat(Lc.metal, 1, 1, 0).col(.55,.55,.53,0).uv(.2);
        B.cylinder(b.x+ox*c, y, b.z+ox*s, rr, rr, b.h, 16, true, .18);
        B.mat(Lc.rust, 1, 1, 0).col(.9,.85,.8,0);
        B.cylinder(b.x+ox*c, y, b.z+ox*s, rr*1.02, rr*1.02, 2.2, 16, false, .3);
      }
      break; }
    case "villa": {
      const h = min(b.h, 11);
      B.mat(Lc.stucco, 1, 1, 0).colv(tint,0).uv(.18);
      B.boxYaw(b.x, y+h*.5, b.z, b.hw, h*.5, b.hd, b.rot, 1|2|16|32);
      B.mat(Lc.concrete, 1, 1, 0).col(.30,.28,.27,0).uv(.2);
      B.boxYaw(b.x, y+h+.35, b.z, b.hw*1.14, .35, b.hd*1.14, b.rot);
      G.mat(Lc.glass, 1, 1, 0).colv(tint,0).uv(1/8,0,0,1/9);
      G.boxYaw(b.x, y+h*.55, b.z, b.hw*1.004, h*.24, b.hd*1.004, b.rot, 1|2|16|32, 1);
      break; }
    default:
      massing(b.x, b.z, b.hw, b.hd, y, y+b.h, b.rot);
  }
  /* ground-floor retail base: darker plinth + shopfront glazing */
  if (b.h > 8 && b.style !== STYLE.INDUSTRIAL) {
    B.mat(Lc.concrete, 1, 1, 0).col(tint[0]*.6, tint[1]*.6, tint[2]*.6, 0).uv(.24);
    B.boxYaw(b.x, y+2.1, b.z, b.hw*1.03, 2.1, b.hd*1.03, b.rot, 1|2|16|32|4);
    G.mat(Lc.glass, 1, 1, 0).col(.7,.72,.75,0).uv(1/6, 0, 0, 1/9);
    G.boxYaw(b.x, y+2.6, b.z, b.hw*1.036, 1.3, b.hd*1.036, b.rot, 1|2|16|32, 1);
  }
},

/* ------------------------------ hero forms ------------------------------ */
formArasaka(B, G, b) {
  const Lc = this.L, y = b.y, tint = b.tint;
  /* Tapered, slotted, brutally symmetrical: the neo-militarist ideal.
     620 m to the tip, per published figures. */
  const seg = 9;
  for (let i = 0; i < seg; i++) {
    const t0 = i/seg, t1 = (i+1)/seg;
    const s0 = 1 - t0*.52, s1 = 1 - t1*.52;
    const hw = b.hw*(s0+s1)*.5, hd = b.hd*(s0+s1)*.5;
    const y0 = y + b.h*t0*.92, y1 = y + b.h*t1*.92;
    G.mat(Lc.glass, .9, 1, 0).colv(tint, 0).uv(1/14, 0, 0, 1/21.6);
    G.boxYaw(b.x, (y0+y1)*.5, b.z, hw, (y1-y0)*.5, hd, 0, 1|2|16|32, 1);
    B.mat(Lc.metal, .8, 1, 0).col(.16,.17,.20,0).uv(.16);
    /* corner piers */
    for (let cxs = -1; cxs <= 1; cxs += 2) for (let czs = -1; czs <= 1; czs += 2)
      B.box(b.x+cxs*hw-2.6*(cxs>0?1:0)-1.3, y0, b.z+czs*hd-2.6*(czs>0?1:0)-1.3,
            b.x+cxs*hw+1.3-2.6*(cxs>0?0:-1)*0, y1, b.z+czs*hd+1.3);
    /* the vertical light slot that reads from 3 km away */
    B.mat(Lc.metal, .5, 1, 0).col(.1,.11,.13,0);
    B.box(b.x-1.6, y0, b.z-hd-.5, b.x+1.6, y1, b.z-hd+.4);
    B.box(b.x-1.6, y0, b.z+hd-.4, b.x+1.6, y1, b.z+hd+.5);
  }
  const top = y + b.h*.92;
  B.mat(Lc.metal, .55, 1, 0).col(.20,.21,.24,0).uv(.2);
  B.box(b.x-b.hw*.4, top, b.z-b.hd*.4, b.x+b.hw*.4, top+b.h*.055, b.z+b.hd*.4);
  B.mat(Lc.metal, .5, 1, 0).col(.32,.33,.36,0);
  B.cylinder(b.x, top+b.h*.055, b.z, 1.5, .3, b.h*.028, 8, false, .5);
  /* base podium + plaza colonnade */
  B.mat(Lc.marble, .7, 1, 0).col(.24,.25,.28,0).uv(.1);
  B.box(b.x-b.hw*2.3, y, b.z-b.hd*2.3, b.x+b.hw*2.3, y+13, b.z+b.hd*2.3);
  B.mat(Lc.marble, .6, 1, 0).col(.5,.5,.53,0).uv(.12);
  for (let i = 0; i < 16; i++) {
    const a = i/16*TAU, rr = b.hw*2.05;
    B.cylinder(b.x+cos(a)*rr, y, b.z+sin(a)*rr, 1.5, 1.5, 15, 10, true, .25);
  }
  B.mat(Lc.marble, .5, 1, 0).col(.42,.43,.46,0).uv(.06);
  B.box(b.x-b.hw*2.6, y, b.z-b.hd*2.6, b.x+b.hw*2.6, y+.4, b.z+b.hd*2.6);
},
formMega(B, G, b, massing) {
  const Lc = this.L, y = b.y;
  /* A megabuilding is a stack of habitation decks around an open light-well */
  const wellW = b.hw*.28, wellD = b.hd*.28;
  const parts = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const p of parts) {
    const cx = b.x + p[0]*(b.hw*.66), cz = b.z + p[1]*(b.hd*.66);
    const hw = p[0] ? b.hw*.34 : b.hw, hd = p[1] ? b.hd*.34 : b.hd;
    B.mat(Lc.concreteWet, 1, 1, 0).colv(b.tint, 0).uv(.13, 0, 0, .09);
    B.boxYaw(cx, y+b.h*.5, cz, hw, b.h*.5, hd, b.rot, 1|2|16|32);
    G.mat(Lc.glass, 1, 1, 0).colv(b.tint, 0).uv(1/9, 0, 0, 1/21.6);
    const floors = (b.h/3.6)|0;
    for (let f = 1; f < floors; f++)
      G.boxYaw(cx, y+f*3.6+1.6, cz, hw*1.004, 1.15, hd*1.004, b.rot, 1|2|16|32, 1);
  }
  /* deck slabs every 6 floors — the horizontal reading of a megablock */
  for (let f = 6; f < (b.h/3.6); f += 6) {
    B.mat(Lc.concrete, 1, 1, 0).col(.30,.30,.30,0).uv(.13);
    B.boxYaw(b.x, y+f*3.6, b.z, b.hw*1.06, .5, b.hd*1.06, b.rot);
  }
  B.mat(Lc.concrete, 1, 1, 0).col(.26,.26,.26,0).uv(.11);
  B.boxYaw(b.x, y+b.h+.6, b.z, b.hw*1.02, .6, b.hd*1.02, b.rot);
  /* lobby cut into the base */
  B.mat(Lc.floor, 1, 1, 0).col(.20,.20,.22,0).uv(.14);
  B.box(b.x-b.hw*.5, y+.05, b.z-b.hd*1.02, b.x+b.hw*.5, y+.06, b.z-b.hd*.7);
},
formStadium(B, G, b) {
  const Lc = this.L, y = b.y, seg = 28;
  for (let i = 0; i < seg; i++) {
    const a0 = i/seg*TAU, a1 = (i+1)/seg*TAU;
    const ro = 1, ri = .72;
    const P = (a, r, yy) => [b.x + cos(a)*b.hw*r, yy, b.z + sin(a)*b.hd*r];
    B.mat(Lc.concrete, 1, 1, 0).colv(b.tint,0).uv(.1);
    B.quad(P(a0,ro,y), P(a1,ro,y), P(a1,ro,y+b.h), P(a0,ro,y+b.h));
    B.quad(P(a0,ri,y+b.h*.35), P(a0,ro,y+b.h), P(a1,ro,y+b.h), P(a1,ri,y+b.h*.35));
    /* every third bay is a collapsed void — the resort was never finished */
    if (i % 3 !== 1) {
      B.mat(Lc.concrete, 1, 1, 0).col(.34,.33,.31,0);
      B.quad(P(a0,ri,y), P(a1,ri,y), P(a1,ri,y+b.h*.35), P(a0,ri,y+b.h*.35));
    }
  }
  B.mat(Lc.scrub, 1, 1, 0).col(.6,.62,.5,0).uv(.06);
  B.cylinder(b.x, y+.1, b.z, b.hw*.7, b.hw*.7, .02, 24, true, .06);
},
formReactor(B, G, b) {
  const Lc = this.L, y = b.y;
  B.mat(Lc.concrete, 1, 1, 0).col(.46,.45,.42,0).uv(.1);
  B.box(b.x-b.hw, y, b.z-b.hd, b.x+b.hw, y+26, b.z+b.hd);
  for (let i = 0; i < 2; i++) {
    const ox = (i?1:-1)*b.hw*.5;
    /* hyperboloid cooling tower */
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = k/10, yy = t*b.h;
      const r = b.hw*.42*(1 - 0.42*sin(t*PI*.86) + t*.22);
      pts.push(r, yy);
    }
    B.mat(Lc.concrete, 1, 1, 0).col(.52,.51,.48,0).uv(.09);
    B.lathe(pts, 20, b.x+ox, y, b.z, 1, 1, 0);
  }
  B.mat(Lc.metal, 1, 1, 0).col(.4,.4,.42,0).uv(.2);
  for (let i = 0; i < 4; i++)
    B.cylinder(b.x-b.hw+i*b.hw*.6, y+26, b.z+b.hd*.5, 1.4, 1.4, 22, 10, true, .3);
},
formPagoda(B, G, b) {
  const Lc = this.L, y = b.y, tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const t = i/tiers;
    const s = 1 - t*.55;
    const y0 = y + b.h*t, y1 = y + b.h*(i+1)/tiers;
    B.mat(Lc.paint, 1, 1, 0).col(.42,.10,.14,0).uv(.2);
    B.boxYaw(b.x, (y0+y1)*.5, b.z, b.hw*s, (y1-y0)*.5, b.hd*s, b.rot, 1|2|16|32);
    G.mat(Lc.glass, 1, 1, 0).col(.5,.3,.35,0).uv(1/7,0,0,1/9);
    G.boxYaw(b.x, (y0+y1)*.5, b.z, b.hw*s*1.006, (y1-y0)*.34, b.hd*s*1.006, b.rot, 1|2|16|32, 1);
    /* flared eave */
    B.mat(Lc.metal, .8, 1, 0).col(.16,.16,.18,0).uv(.24);
    B.boxYaw(b.x, y1+.3, b.z, b.hw*s*1.34, .3, b.hd*s*1.34, b.rot);
  }
  B.mat(Lc.metal, .5, 1, 0).col(.7,.55,.15,0);
  B.cylinder(b.x, y+b.h, b.z, .5, .05, 9, 8, false, 1);
},
formMall(B, G, b) {
  const Lc = this.L, y = b.y;
  B.mat(Lc.concrete, 1, 1, 0).colv(b.tint,0).uv(.1);
  B.box(b.x-b.hw, y, b.z-b.hd, b.x+b.hw, y+b.h, b.z+b.hd, 1|2|16|32|4);
  /* barrel-vault atrium, half its panels missing */
  const seg = 16;
  for (let i = 0; i < seg; i++) {
    const a0 = PI*i/seg, a1 = PI*(i+1)/seg;
    const P = (a, zz) => [b.x + cos(a)*b.hw*.55, y+b.h+sin(a)*b.hw*.34, zz];
    if (i % 4 === 2) continue;
    G.mat(Lc.glass, 1, 1, 0).col(.42,.46,.44,0).uv(1/5,0,0,1/5);
    G.quad(P(a0,b.z-b.hd*.8), P(a1,b.z-b.hd*.8), P(a1,b.z+b.hd*.8), P(a0,b.z+b.hd*.8));
  }
  B.mat(Lc.graffiti, 1, 1, 0).col(.9,.9,.9,0).uv(.12);
  B.box(b.x-b.hw*1.01, y, b.z-b.hd*1.01, b.x-b.hw*.99, y+8, b.z+b.hd*1.01);
},
formMarket(B, G, b) {
  const Lc = this.L, y = b.y;
  B.mat(Lc.corrugated, 1, 1, 0).col(.36,.34,.33,0).uv(.24);
  B.boxYaw(b.x, y+b.h*.5, b.z, b.hw, b.h*.5, b.hd, b.rot, 1|2|32);
  /* open frontage under a deep canopy */
  B.mat(Lc.metal, 1, 1, 0).col(.28,.27,.26,0).uv(.2);
  B.boxYaw(b.x, y+b.h+.4, b.z, b.hw*1.2, .4, b.hd*1.2, b.rot);
  for (let i = -3; i <= 3; i++)
    B.cylinder(b.x+i*b.hw*.3, y, b.z+b.hd*1.1, .2, .2, b.h, 8, false, .4);
},

/* --------------------------- metro viaducts ----------------------------- */
viaduct(B, x0, z0, x1, z1) {
  const Lc = this.L;
  if (!CITY.metroTracks) return;
  for (const t of CITY.metroTracks) {
    const mx = (t.x0+t.x1)*.5, mz = (t.z0+t.z1)*.5;
    if (mx < x0 || mx >= x1 || mz < z0 || mz >= z1) continue;
    const dx = t.x1-t.x0, dz = t.z1-t.z0, len = hypot(dx,dz);
    const ux = dx/len, uz = dz/len, px = -uz, pz = ux;
    const y = t.y;
    /* deck */
    B.mat(Lc.concrete, 1, 1, 0).col(.34,.34,.35,0).uv(.14);
    B.quad([t.x0+px*4.2, y, t.z0+pz*4.2], [t.x1+px*4.2, y, t.z1+pz*4.2],
           [t.x1-px*4.2, y, t.z1-pz*4.2], [t.x0-px*4.2, y, t.z0-pz*4.2], 8.4*.14, len*.14);
    B.quad([t.x0-px*4.2, y-1.5, t.z0-pz*4.2], [t.x1-px*4.2, y-1.5, t.z1-pz*4.2],
           [t.x1+px*4.2, y-1.5, t.z1+pz*4.2], [t.x0+px*4.2, y-1.5, t.z0+pz*4.2], 8.4*.14, len*.14);
    for (let s = -1; s <= 1; s += 2) {
      B.quad([t.x0+px*4.2*s, y-1.5, t.z0+pz*4.2*s], [t.x1+px*4.2*s, y-1.5, t.z1+pz*4.2*s],
             [t.x1+px*4.2*s, y, t.z1+pz*4.2*s], [t.x0+px*4.2*s, y, t.z0+pz*4.2*s], len*.14, 1.5*.3);
      /* rails */
      B.mat(Lc.metal, .35, 1, 0).col(.55,.56,.58,0).uv(.5);
      B.box(min(t.x0,t.x1)+px*1.6*s-.09, y, min(t.z0,t.z1)+pz*1.6*s-.09,
            max(t.x0,t.x1)+px*1.6*s+.09, y+.16, max(t.z0,t.z1)+pz*1.6*s+.09);
      /* parapet */
      B.mat(Lc.perf, 1, 1, 0).col(.3,.31,.32,0).uv(.3);
      B.quad([t.x0+px*4.2*s, y, t.z0+pz*4.2*s], [t.x1+px*4.2*s, y, t.z1+pz*4.2*s],
             [t.x1+px*4.2*s, y+1.1, t.z1+pz*4.2*s], [t.x0+px*4.2*s, y+1.1, t.z0+pz*4.2*s], len*.3, 1.1*.3);
    }
    /* pier every other segment */
    if (((mx/28)|0) % 2 === 0) {
      const g = CITY.height(mx, mz);
      B.mat(Lc.concrete, 1, 1, 0).col(.36,.36,.37,0).uv(.14);
      B.box(mx-1.6, g, mz-1.6, mx+1.6, y-1.5, mz+1.6);
      B.box(mx-3.2, y-2.4, mz-3.2, mx+3.2, y-1.5, mz+3.2);
    }
  }
},
metroStations(B, G, x0, z0, x1, z1) {
  const Lc = this.L;
  for (const s of CITY.metro.stations) {
    if (s.x < x0 || s.x >= x1 || s.z < z0 || s.z >= z1) continue;
    const y = s.y, py = y + 15;
    B.mat(Lc.platform, 1, 1, 0).col(.9,.9,.9,0).uv(.2);
    B.box(s.x-16, py-.4, s.z-7, s.x+16, py, s.z+7);
    B.mat(Lc.metal, .7, 1, 0).col(.32,.33,.36,0).uv(.2);
    B.box(s.x-17, py+5.4, s.z-8.5, s.x+17, py+6.1, s.z+8.5);
    for (let i = -3; i <= 3; i++) {
      B.cylinder(s.x+i*5, py, s.z-6.4, .2, .2, 5.4, 8, false, .5);
      B.cylinder(s.x+i*5, py, s.z+6.4, .2, .2, 5.4, 8, false, .5);
    }
    G.mat(Lc.glass, 1, 1, 0).col(.55,.6,.62,0).uv(1/6,0,0,1/5);
    B.mat(Lc.concrete, 1, 1, 0).col(.32,.32,.33,0).uv(.14);
    B.box(s.x-4, y, s.z-4, s.x+4, py-.4, s.z+4);          // stair core
    B.mat(Lc.tile, 1, 1, 0).col(.7,.72,.74,0).uv(.24);
    B.box(s.x-4.6, y, s.z-4.6, s.x+4.6, y+4.2, s.z+4.6, 1|2|16|32);
  }
},

/* ==========================================================================
   CHUNK: decoration, signage, street furniture, lights
   ======================================================================== */
buildChunk(ci, cj) {
  const C = CITY.CHUNK;
  const x0 = ci*C, z0 = cj*C, x1 = x0+C, z1 = z0+C;
  const D = new MeshBuilder(), N = new MeshBuilder();
  const lights = [];
  const R = rng((ci*83492791 ^ cj*29349677) >>> 0);

  const bl = CITY.bldGrid.query((x0+x1)*.5, (z0+z1)*.5, C*.75, this._tmp);
  const seen = new Set();
  for (const b of bl) {
    if (seen.has(b.id)) continue; seen.add(b.id);
    if (b.x < x0 || b.x >= x1 || b.z < z0 || b.z >= z1) continue;
    this.detail(D, N, b, lights);
  }
  const pr = CITY.propGrid ? CITY.propGrid.query((x0+x1)*.5, (z0+z1)*.5, C*.75, []) : [];
  for (const p of pr) {
    if (p.x < x0 || p.x >= x1 || p.z < z0 || p.z >= z1) continue;
    this.prop(D, N, p, lights);
  }
  const rec = { detail: D.build(), neon: N.build(), lights, i: ci, j: cj,
                x0, z0, x1, z1, cx:(x0+x1)*.5, cz:(z0+z1)*.5, ymin:-6, ymax:60 };
  if (rec.detail) { rec.ymin = rec.detail.bmin[1]; rec.ymax = rec.detail.bmax[1]; }
  if (rec.neon) { rec.ymin = min(rec.ymin, rec.neon.bmin[1]); rec.ymax = max(rec.ymax, rec.neon.bmax[1]); }
  for (const l of lights) this.lightHash.add(l.x, l.z, l);
  this.chunks.set(this.key(ci, cj), rec);
  this.stats.chunks++;
  return rec;
},

/* ----------------------- per-building decoration ------------------------ */
detail(D, N, b, lights) {
  const Lc = this.L, y = b.y, R = rng((b.seed ^ 0xA5A5) >>> 0);
  const layers = { metal: Lc.metal, perf: Lc.perf, rust: Lc.rust, wall: Lc.concrete, sign: Lc.sign };

  /* --- rooftop mechanical plant ---------------------------------------- */
  if (b.roofClutter && b.h < 240)
    GREEBLE.roof(D, b.x, b.z, b.hw*.85, b.hd*.85, y+b.h, R, layers);

  /* --- aviation warning strobes on anything tall ----------------------- */
  if (b.h > 90) {
    N.matRaw(3*64/255, .2, 0, 6/8).col(1, .06, .1, 1);
    N.box(b.x-.5, y+b.h+1, b.z-.5, b.x+.5, y+b.h+1.8, b.z+.5);
    lights.push({ x:b.x, y:y+b.h+1.5, z:b.z, r:26, cr:1.6, cg:.1, cb:.15, kind:1, blink:.9 });
  }

  /* --- fire escapes ---------------------------------------------------- */
  if (b.hasFireEscape) {
    const floors = min(b.floors, 12);
    GREEBLE.fireEscape(D, b.x+b.hw, y+3.6, b.z, b.hd*1.2, floors, 3.6, 1, layers);
  }
  /* --- wall-mounted AC condensers -------------------------------------- */
  if (b.style === STYLE.ENTROPISM || b.style === STYLE.SLUM || b.style === STYLE.KITSCH) {
    GREEBLE.acUnits(D, b.z-b.hd, b.z+b.hd, y+4, y+min(b.h, 40), b.x+b.hw, 1, R, layers, .02);
    GREEBLE.acUnits(D, b.z-b.hd, b.z+b.hd, y+4, y+min(b.h, 40), b.x-b.hw-.6, 1, R, layers, .02);
  }
  /* --- balconies -------------------------------------------------------- */
  if (b.hasBalcony) {
    const floors = min(b.floors, 16);
    for (let f = 1; f < floors; f++) {
      if (R() < .35) continue;
      const yy = y + f*3.6;
      const side = R() < .5 ? 1 : -1;
      D.mat(Lc.concrete, 1, 1, 0).col(.5,.5,.5,0).uv(.24);
      D.box(b.x-b.hw*.6, yy, b.z+b.hd*side, b.x+b.hw*.6, yy+.16, b.z+(b.hd+1.4)*side);
      D.mat(Lc.perf, 1, 1, 0).col(.3,.3,.32,0).uv(.35);
      D.box(b.x-b.hw*.6, yy, b.z+(b.hd+1.35)*side, b.x+b.hw*.6, yy+1.0, b.z+(b.hd+1.4)*side);
      /* laundry / clutter — the human signal on a facade */
      if (R() < .4) { D.mat(Lc.fabric, 1, 0, 0).col(R()*.7+.3, R()*.7+.3, R()*.7+.3, 0).uv(.6);
        D.box(b.x-b.hw*.4, yy+.6, b.z+(b.hd+1.0)*side, b.x+b.hw*.4, yy+1.5, b.z+(b.hd+1.05)*side); }
    }
  }
  /* --- ground-floor awnings + shopfront glow --------------------------- */
  if (b.hasAwning) {
    const c = cos(b.rot), s = sin(b.rot);
    for (let side = 0; side < 4; side++) {
      if (R() < .45) continue;
      const nx = [1,-1,0,0][side], nz = [0,0,1,-1][side];
      const ex = nx ? b.hw : b.hd;
      const ox = (nx*b.hw)*c - (nz*b.hd)*s, oz = (nx*b.hw)*s + (nz*b.hd)*c;
      const hue = R();
      const col = hsl(hue, .85, .55);
      D.mat(Lc.fabric, 1, 0, 0).colv(col, 0).uv(.5);
      D.boxYaw(b.x+ox*1.12, y+3.4, b.z+oz*1.12, nx?1.1:b.hw*.8, .1, nz?1.1:b.hd*.8, b.rot);
      /* under-awning strip light */
      N.matRaw(0, R(), 0, 3/8).colv(col, 1);
      N.boxYaw(b.x+ox*1.10, y+3.2, b.z+oz*1.10, nx?.9:b.hw*.7, .07, nz?.9:b.hd*.7, b.rot);
      lights.push({ x:b.x+ox*1.2, y:y+3.1, z:b.z+oz*1.2, r:11,
                    cr:col[0]*2.4, cg:col[1]*2.4, cb:col[2]*2.4, kind:0 });
    }
  }
  /* --- signage: the single biggest contributor to the Night City read --- */
  if (b.hasSigns) this.signage(D, N, b, lights, R);
  /* --- ground-floor doorway ------------------------------------------- */
  D.mat(Lc.metal, .8, 1, 0).col(.22,.23,.25,0).uv(.4);
  const dc = cos(b.rot), ds = sin(b.rot);
  D.boxYaw(b.x - b.hd*ds*1.03, y+1.35, b.z + b.hd*dc*1.03, 1.1, 1.35, .12, b.rot);
  N.matRaw(0, R()*.4, 0, 2/8).col(.1,.95,1,1);
  N.boxYaw(b.x - b.hd*ds*1.06, y+2.85, b.z + b.hd*dc*1.06, 1.15, .06, .05, b.rot);
},

signage(D, N, b, lights, R) {
  const Lc = this.L, y = b.y;
  const pal = b.d.neon || [[1,.1,.4]];
  const nSigns = 1 + (R() * (b.style===STYLE.KITSCH ? 5 : 3))|0;
  for (let i = 0; i < nSigns; i++) {
    const col = pal[(R()*pal.length)|0];
    const side = (R()*4)|0;
    const nx = [1,-1,0,0][side], nz = [0,0,1,-1][side];
    const c = cos(b.rot), s = sin(b.rot);
    const ex = nx ? b.hw : b.hd, ez = nz ? b.hd : b.hw;
    const ox = (nx*b.hw*1.06)*c - (nz*b.hd*1.06)*s;
    const oz = (nx*b.hw*1.06)*s + (nz*b.hd*1.06)*c;
    const sy = y + 4 + R()*max(2, min(b.h-9, 46));
    const kind = R();
    if (kind < .34) {
      /* vertical blade sign — Kabuki / Japantown staple */
      const hgt = 3.5 + R()*8, wid = .85 + R()*.7;
      D.mat(Lc.sign, 1, 1, 0).col(.09,.09,.1,0).uv(.5);
      D.boxYaw(b.x+ox, sy+hgt*.5, b.z+oz, nx?.14:wid, hgt*.5, nz?.14:wid, b.rot);
      N.matRaw(1*64/255, R(), .3+R()*.7, (3+R()*3)/8).colv(col, 1);
      N.boxYaw(b.x+ox*1.03, sy+hgt*.5, b.z+oz*1.03, nx?.05:wid*.9, hgt*.46, nz?.05:wid*.9, b.rot);
      lights.push({ x:b.x+ox*1.3, y:sy+hgt*.5, z:b.z+oz*1.3, r:15+hgt,
        cr:col[0]*3.4, cg:col[1]*3.4, cb:col[2]*3.4, kind:0 });
    } else if (kind < .62) {
      /* horizontal tube band */
      const wid = min(ex*.9, 3+R()*7), hgt = .5+R()*.7;
      N.matRaw(0, R(), 0, (3.5+R()*3)/8).colv(col, 1);
      N.boxYaw(b.x+ox*1.02, sy, b.z+oz*1.02, nx?.06:wid, hgt*.5, nz?.06:wid, b.rot);
      lights.push({ x:b.x+ox*1.3, y:sy, z:b.z+oz*1.3, r:13+wid,
        cr:col[0]*3.0, cg:col[1]*3.0, cb:col[2]*3.0, kind:0 });
    } else if (kind < .86) {
      /* big holo ad plate */
      const wid = min(ex*1.0, 4+R()*9), hgt = 3+R()*7;
      D.mat(Lc.holo, .4, 1, 0).col(.05,.05,.06,0).uv(.3);
      D.boxYaw(b.x+ox, sy+hgt*.5, b.z+oz, nx?.16:wid, hgt*.5, nz?.16:wid, b.rot);
      N.matRaw(2*64/255, R()*.5, .2+R()*.5, (2.2+R()*2.4)/8).colv(col, 1);
      N.boxYaw(b.x+ox*1.04, sy+hgt*.5, b.z+oz*1.04, nx?.05:wid*.94, hgt*.46, nz?.05:wid*.94, b.rot);
      lights.push({ x:b.x+ox*1.6, y:sy+hgt*.5, z:b.z+oz*1.6, r:18+wid,
        cr:col[0]*2.6, cg:col[1]*2.6, cb:col[2]*2.6, kind:0 });
    } else {
      /* rooftop crown sign */
      const wid = b.hw*.9, hgt = 2.6+R()*3;
      D.mat(Lc.sign, 1, 1, 0).col(.08,.08,.09,0).uv(.4);
      D.boxYaw(b.x, y+b.h+hgt*.5+1, b.z, wid, hgt*.5, .2, b.rot);
      N.matRaw(1*64/255, R()*.6, .4+R()*.6, (4+R()*3)/8).colv(col, 1);
      N.boxYaw(b.x, y+b.h+hgt*.5+1, b.z-.16, wid*.94, hgt*.44, .06, b.rot);
      lights.push({ x:b.x, y:y+b.h+hgt*.5+1, z:b.z-1.2, r:26+wid,
        cr:col[0]*3.2, cg:col[1]*3.2, cb:col[2]*3.2, kind:0 });
    }
  }
},

/* ------------------------------- props ---------------------------------- */
prop(D, N, p, lights) {
  const Lc = this.L, x = p.x, y = p.y, z = p.z, rot = p.rot || 0;
  const R = rng((p.seed || (x*7919 ^ z*104729)) >>> 0);
  switch (p.kind) {
    case "streetlight": {
      const h = 8.2;
      D.mat(Lc.metal, .75, 1, 0).col(.24,.25,.26,0).uv(.4);
      D.cylinder(x, y, z, .17, .12, h, 8, false, .6);
      const ax = cos(rot)*1.9, az = sin(rot)*1.9;
      D.box(min(x,x+ax)-.08, y+h-.16, min(z,z+az)-.08, max(x,x+ax)+.08, y+h, max(z,z+az)+.08);
      N.matRaw(3*64/255, R()*.55, 0, 5/8).col(1,.72,.36,1);
      N.box(x+ax-.42, y+h-.34, z+az-.28, x+ax+.42, y+h-.16, z+az+.28);
      lights.push({ x:x+ax, y:y+h-.4, z:z+az, r:20, cr:2.9, cg:2.0, cb:1.05,
                    kind:2, dx:0, dy:-1, dz:0, cone:.42 });
      /* half of them carry a district banner or a traffic cam */
      if (R() < .3) { D.mat(Lc.fabric, 1, 0, 0).colv(hsl(R(), .7, .45), 0).uv(.5);
        D.box(x+.18, y+5, z-.02, x+.22, y+7, z+1.1); }
      break; }
    case "hydrant":
      D.mat(Lc.paint, 1, 0, 0).col(.85,.15,.1,0).uv(1.6);
      D.cylinder(x, y, z, .17, .14, .72, 8, true, 1.4);
      D.sphere(x, y+.78, z, .16, 8, 6, 1);
      D.box(x-.32, y+.42, z-.07, x+.32, y+.56, z+.07);
      break;
    case "bin":
      D.mat(Lc.metal, 1, 1, 0).col(.22,.24,.23,0).uv(.7);
      D.cylinder(x, y, z, .34, .38, 1.0, 10, true, .8);
      D.mat(Lc.rust, 1, 1, 0).col(.7,.7,.7,0);
      D.cylinder(x, y+1.0, z, .40, .36, .1, 10, true, .8);
      break;
    case "vending": {
      D.mat(Lc.metal, .8, 1, 0).col(.2,.21,.24,0).uv(.45);
      D.boxYaw(x, y+1.0, z, .62, 1.0, .38, rot);
      const c = hsl(R(), .9, .55);
      N.matRaw(2*64/255, R()*.5, .3, 3.2/8).colv(c, 1);
      D.mat(Lc.holo, .3, 1, 0).col(.04,.04,.05,0).uv(.4);
      const dx = -sin(rot)*.4, dz = cos(rot)*.4;
      N.boxYaw(x+dx, y+1.2, z+dz, .5, .72, .03, rot);
      lights.push({ x:x+dx*1.4, y:y+1.2, z:z+dz*1.4, r:7, cr:c[0]*2.2, cg:c[1]*2.2, cb:c[2]*2.2, kind:0 });
      break; }
    case "bench":
      D.mat(Lc.metal, 1, 1, 0).col(.26,.26,.27,0).uv(.6);
      D.boxYaw(x, y+.44, z, .9, .05, .28, rot);
      D.boxYaw(x, y+.22, z, .05, .22, .24, rot);
      D.boxYaw(x, y+.75, z, .9, .28, .05, rot);
      break;
    case "planter":
      D.mat(Lc.concrete, 1, 1, 0).col(.42,.42,.42,0).uv(.6);
      D.boxYaw(x, y+.34, z, .6, .34, .6, rot);
      D.mat(Lc.scrub, 1, 0, 0).col(.4,.5,.3,0).uv(.7);
      D.sphere(x, y+.9, z, .5, 8, 6, .8);
      break;
    case "barrier":
      D.mat(Lc.concrete, 1, 1, 0).col(.62,.6,.55,0).uv(.6);
      D.boxYaw(x, y+.42, z, 1.1, .42, .32, rot);
      D.mat(Lc.paint, 1, 0, 0).col(.9,.75,.05,0).uv(1.2);
      D.boxYaw(x, y+.72, z, 1.05, .1, .34, rot);
      break;
    case "dumpster":
      D.mat(Lc.metal, 1, 1, 0).col(.16,.26,.20,0).uv(.4);
      D.boxYaw(x, y+.65, z, 1.05, .65, .62, rot);
      D.mat(Lc.rust, 1, 1, 0).col(.8,.8,.8,0).uv(.4);
      D.boxYaw(x, y+1.34, z, 1.08, .05, .64, rot);
      break;
    case "crates":
      for (let i = 0; i < 3; i++) { D.mat(Lc.metal, 1, .4, 0).col(.4,.38,.33,0).uv(.7);
        D.boxYaw(x+(R()-.5)*.5, y+.35+i*.66, z+(R()-.5)*.5, .34, .33, .34, rot+R()); }
      break;
    case "barrel":
      D.mat(Lc.rust, 1, 1, 0).col(.7,.45,.2,0).uv(.9);
      D.cylinder(x, y, z, .29, .29, .88, 10, true, .9);
      break;
    case "pallet":
      D.mat(Lc.metal, 1, .2, 0).col(.42,.36,.28,0).uv(1);
      D.boxYaw(x, y+.08, z, .6, .08, .5, rot);
      break;
    case "cardboard":
      D.mat(Lc.metal, 1, .1, 0).col(.44,.38,.3,0).uv(.8);
      D.boxYaw(x, y+.28, z, .5, .28, .4, rot);
      break;
    /* ---- badlands set dressing ---------------------------------------- */
    case "trailer":
      D.mat(Lc.metal, .85, 1, 0).col(.62,.6,.56,0).uv(.3);
      D.boxYaw(x, y+1.4, z, 3.4, 1.3, 1.3, rot);
      D.mat(Lc.rust, 1, 1, 0).col(.75,.7,.65,0).uv(.4);
      D.boxYaw(x, y+.3, z, 3.2, .3, 1.2, rot);
      break;
    case "turbine": {
      const h = 34 + R()*26;
      D.mat(Lc.metal, .5, 1, 0).col(.82,.82,.83,0).uv(.12);
      D.cylinder(x, y, z, 1.5, .7, h, 12, false, .2);
      D.sphere(x, y+h, z, 1.3, 10, 8, 1);
      for (let i = 0; i < 3; i++) { const a = i/3*TAU + R();
        D.boxYaw(x+cos(a)*11, y+h+sin(a)*11, z, 11, .55, .18, a); }
      N.matRaw(3*64/255, .3, 0, 4/8).col(1,.1,.12,1);
      N.box(x-.3, y+h+1.5, z-.3, x+.3, y+h+2, z+.3);
      break; }
    case "solar":
      for (let i = 0; i < 8; i++) { D.mat(Lc.holo, .25, .8, 0).col(.05,.07,.14,0).uv(.2);
        D.boxYaw(x+(i%4)*4.4, y+1.3, z+((i/4)|0)*3.2, 2, .06, 1.3, rot+.5); }
      break;
    case "gasstation":
      D.mat(Lc.metal, .8, 1, 0).col(.7,.7,.68,0).uv(.2);
      D.boxYaw(x, y+5.2, z, 7, .35, 5, rot);
      for (let i = -1; i <= 1; i += 2) D.cylinder(x+i*5.6, y, z, .3, .3, 5.2, 8, false, .5);
      N.matRaw(1*64/255, .3, .6, 4/8).col(1,.5,.05,1);
      N.boxYaw(x, y+5.9, z, 5, .6, .1, rot);
      lights.push({ x, y:y+5, z, r:28, cr:2.4, cg:2.0, cb:1.4, kind:0 });
      break;
    case "wreck":
      D.mat(Lc.rust, 1, 1, 0).col(.7,.66,.6,0).uv(.5);
      D.boxYaw(x, y+.6, z, 2.1, .5, .9, rot);
      D.boxYaw(x-.3, y+1.2, z, 1.0, .35, .85, rot);
      break;
    case "shack":
      D.mat(Lc.corrugated, 1, 1, 0).col(.55,.5,.42,0).uv(.35);
      D.boxYaw(x, y+1.4, z, 2.6, 1.4, 2.2, rot);
      D.mat(Lc.rust, 1, 1, 0).col(.7,.6,.5,0).uv(.4);
      D.boxYaw(x, y+2.9, z, 2.9, .1, 2.5, rot);
      break;
  }
},
};
</script>
