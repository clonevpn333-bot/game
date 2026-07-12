/* ============================================================
 * World: heightmapped terrain, house construction system with
 * enterable interiors + war damage, clutter factory, map builder
 * with colliders / cover points / walkable platforms.
 * ============================================================ */

/* ---------------- Terrain ---------------- */
RT.Terrain = class {
  /* opts: {size, segs, seed, amp, palette:{lush,dirt,rock}, roads:[[x,z]...],
   *        flats:[{x,z,r}], craters:[{x,z,r,d}], riverPath, riverDepth, riverWidth} */
  constructor(opts) {
    this.size = opts.size || 400;
    this.segs = opts.segs || 128;
    this.opts = opts;
    const S = this.segs + 1;
    this.grid = new Float32Array(S * S);
    const rnd = RNG(opts.seed || 7);
    const off1 = rnd() * 100, off2 = rnd() * 100;
    const amp = opts.amp != null ? opts.amp : 6;
    for (let iz = 0; iz < S; iz++) {
      for (let ix = 0; ix < S; ix++) {
        const x = (ix / this.segs - 0.5) * this.size;
        const z = (iz / this.segs - 0.5) * this.size;
        let h = RT.fbm(x * 0.008 + off1, z * 0.008 + off1, 4, 2.1, 0.5) * amp;
        h += RT.fbm(x * 0.035 + off2, z * 0.035 + off2, 3, 2, 0.5) * amp * 0.22;
        h += RT.noise(x * 0.11 + off2, z * 0.11 + off1) * amp * 0.06;   // small bumpy detail
        if (opts.tiltZ) h += z * opts.tiltZ;
        if (opts.tiltX) h += x * opts.tiltX;
        // gentle bowl rim so map edges rise (natural boundary)
        const edge = Math.max(Math.abs(x), Math.abs(z)) / (this.size / 2);
        h += smoothstep(0.78, 1.0, edge) * (opts.rim != null ? opts.rim : 14);
        this.grid[iz * S + ix] = h;
      }
    }
    if (opts.riverPath) this._carveRiver(opts.riverPath, opts.riverWidth || 14, opts.riverDepth || 5);
    if (opts.roads) for (const r of opts.roads) this._carveRoad(r, opts.roadWidth || 5);
    if (opts.flats) for (const f of opts.flats) this._flatten(f.x, f.z, f.r, f.h);
    if (opts.craters) for (const c of opts.craters) this._crater(c.x, c.z, c.r, c.d);
    /* mesh is built in MapBuilder.finalize(), after building pads are flattened */
  }
  _idx(ix, iz) { const S = this.segs + 1; return clamp(iz, 0, this.segs) * S + clamp(ix, 0, this.segs); }
  _worldToGrid(x, z) { return [(x / this.size + 0.5) * this.segs, (z / this.size + 0.5) * this.segs]; }
  _flatten(x, z, r, hOverride) {
    const [gx, gz] = this._worldToGrid(x, z);
    const gr = r / this.size * this.segs;
    const base = hOverride != null ? hOverride : this.grid[this._idx(Math.round(gx), Math.round(gz))];
    for (let iz = Math.floor(gz - gr * 2); iz <= Math.ceil(gz + gr * 2); iz++)
      for (let ix = Math.floor(gx - gr * 2); ix <= Math.ceil(gx + gr * 2); ix++) {
        const d = Math.hypot(ix - gx, iz - gz) / gr;
        if (d < 2) {
          const k = smoothstep(2, 0.85, d);
          const i = this._idx(ix, iz);
          this.grid[i] = lerp(this.grid[i], base, k);
        }
      }
    return base;
  }
  _crater(x, z, r, depth) {
    const [gx, gz] = this._worldToGrid(x, z);
    const gr = r / this.size * this.segs;
    for (let iz = Math.floor(gz - gr * 1.6); iz <= Math.ceil(gz + gr * 1.6); iz++)
      for (let ix = Math.floor(gx - gr * 1.6); ix <= Math.ceil(gx + gr * 1.6); ix++) {
        const d = Math.hypot(ix - gx, iz - gz) / gr;
        const i = this._idx(ix, iz);
        if (d < 1) this.grid[i] -= Math.cos(d * Math.PI / 2) * depth;
        else if (d < 1.5) this.grid[i] += (1.5 - d) * depth * 0.28; // rim lip
        if (d < 0.85) (this.scorch = this.scorch || []).push([ix, iz]);
      }
  }
  _carveRoad(path, width) {
    this.roadCells = this.roadCells || new Set();
    this.rutCells = this.rutCells || new Set();
    this.roadEdgeCells = this.roadEdgeCells || new Set();
    for (let s = 0; s < path.length - 1; s++) {
      const [x0, z0] = path[s], [x1, z1] = path[s + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.ceil(len / (this.size / this.segs) * 1.6);
      for (let i = 0; i <= steps; i++) {
        const x = lerp(x0, x1, i / steps), z = lerp(z0, z1, i / steps);
        const [gx, gz] = this._worldToGrid(x, z);
        const gr = width / this.size * this.segs;
        const h = this.grid[this._idx(Math.round(gx), Math.round(gz))];
        for (let iz = Math.floor(gz - gr * 2.2); iz <= Math.ceil(gz + gr * 2.2); iz++)
          for (let ix = Math.floor(gx - gr * 2.2); ix <= Math.ceil(gx + gr * 2.2); ix++) {
            const d = Math.hypot(ix - gx, iz - gz) / gr;
            if (d < 2.2) {
              const idx2 = this._idx(ix, iz);
              this.grid[idx2] = lerp(this.grid[idx2], h, smoothstep(2.2, 0.7, d) * 0.85);
              if (d < 1) {
                this.grid[idx2] -= (1 - d) * 0.09;          // slightly recessed
                this.roadCells.add(idx2);
                if (d > 0.32 && d < 0.62) this.rutCells.add(idx2);  // tire ruts
              } else if (d < 1.45) this.roadEdgeCells.add(idx2);    // blend band
            }
          }
      }
    }
  }
  _carveRiver(path, width, depth) {
    this.waterCells = new Set();
    /* accumulate the max dig per cell, then apply once (idempotent) */
    const digs = new Float32Array(this.grid.length);
    for (let s = 0; s < path.length - 1; s++) {
      const [x0, z0] = path[s], [x1, z1] = path[s + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.ceil(len / (this.size / this.segs) * 1.6);
      for (let i = 0; i <= steps; i++) {
        const x = lerp(x0, x1, i / steps), z = lerp(z0, z1, i / steps);
        const [gx, gz] = this._worldToGrid(x, z);
        const gr = width / this.size * this.segs / 2;
        for (let iz = Math.floor(gz - gr * 1.5); iz <= Math.ceil(gz + gr * 1.5); iz++)
          for (let ix = Math.floor(gx - gr * 1.5); ix <= Math.ceil(gx + gr * 1.5); ix++) {
            const d = Math.hypot(ix - gx, iz - gz) / gr;
            if (d < 1.5) {
              const idx2 = this._idx(ix, iz);
              const dig = Math.cos(Math.min(1, d / 1.5) * Math.PI / 2) * depth;
              if (dig > digs[idx2]) digs[idx2] = dig;
              if (d < 0.6) this.waterCells.add(idx2);
            }
          }
      }
    }
    for (let i = 0; i < digs.length; i++) this.grid[i] -= digs[i];
  }
  heightAt(x, z) {
    const [gx, gz] = this._worldToGrid(x, z);
    const x0 = Math.floor(gx), z0 = Math.floor(gz);
    const fx = gx - x0, fz = gz - z0;
    const h00 = this.grid[this._idx(x0, z0)], h10 = this.grid[this._idx(x0 + 1, z0)];
    const h01 = this.grid[this._idx(x0, z0 + 1)], h11 = this.grid[this._idx(x0 + 1, z0 + 1)];
    return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fz);
  }
  _buildMesh(pal) {
    const S = this.segs + 1;
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segs, this.segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const lush = RT.lin(pal.lush || 0x5d6b38);
    const lush2 = RT.lin(pal.lush2 || 0x6e7a42);
    const dirt = RT.lin(pal.dirt || 0x77664a);
    const rock = RT.lin(pal.rock || 0x74705f);
    const road = RT.lin(pal.road || 0x6d6354);
    const scorchC = RT.lin(0x2e2a24);
    const c = new THREE.Color();
    const scorchSet = new Set((this.scorch || []).map(([ix, iz]) => this._idx(ix, iz)));
    for (let i = 0; i < pos.count; i++) {
      const ix = i % S, iz = Math.floor(i / S);
      const h = this.grid[iz * S + ix];
      pos.setY(i, h);
      // slope from neighbors
      const hx = this.grid[this._idx(ix + 1, iz)] - this.grid[this._idx(ix - 1, iz)];
      const hz = this.grid[this._idx(ix, iz + 1)] - this.grid[this._idx(ix, iz - 1)];
      const slope = Math.min(1, Math.hypot(hx, hz) * 0.55);
      const n = RT.noise(ix * 0.35, iz * 0.35) * 0.5 + 0.5;
      c.copy(lush).lerp(lush2, n);
      c.lerp(dirt, smoothstep(0.25, 0.7, slope + RT.noise(ix * 0.13, iz * 0.13) * 0.18));
      c.lerp(rock, smoothstep(0.55, 0.95, slope));
      const gi = iz * S + ix;
      if (this.roadEdgeCells && this.roadEdgeCells.has(gi)) c.lerp(road, 0.45);        // worn edge blend
      if (this.roadCells && this.roadCells.has(gi)) c.copy(road).multiplyScalar(0.92 + n * 0.16);
      if (this.rutCells && this.rutCells.has(gi)) c.multiplyScalar(0.78);              // packed tire ruts
      if (this.waterCells && this.waterCells.has(gi)) c.multiplyScalar(0.6);
      if (scorchSet.has(gi)) c.lerp(scorchC, 0.5);
      // low wet areas darker
      if (h < -1.5) c.multiplyScalar(clamp(1 + (h + 1.5) * 0.06, 0.72, 1));
      const vr = 0.93 + RT.noise(ix * 1.7, iz * 1.7) * 0.12;
      cols[i * 3] = c.r * vr; cols[i * 3 + 1] = c.g * vr; cols[i * 3 + 2] = c.b * vr;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    /* mandatory ground detail texture: mottled tone map × vertex colors */
    if (!RT.Terrain._groundTex) {
      RT.Terrain._groundTex = RT.canvasTex(1024, (ctx, s) => {
        ctx.fillStyle = '#cfcbc2';
        ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 900; i++) {     // large soft mottling
          const r = 14 + Math.random() * 46;
          const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          const tone = Math.random();
          const cc = tone < 0.55 ? [186 + Math.random() * 30, 188 + Math.random() * 26, 172 + Math.random() * 22]
            : (tone < 0.8 ? [172 + Math.random() * 20, 160 + Math.random() * 18, 138 + Math.random() * 16]      // dirt patches
              : [206 + Math.random() * 28, 208 + Math.random() * 24, 190 + Math.random() * 20]);                 // light dry grass
          g2.addColorStop(0, `rgba(${cc[0] | 0},${cc[1] | 0},${cc[2] | 0},${0.25 + Math.random() * 0.3})`);
          g2.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.save();
          ctx.translate(Math.random() * s, Math.random() * s);
          ctx.fillStyle = g2;
          ctx.fillRect(-r, -r, r * 2, r * 2);
          ctx.restore();
        }
        for (let i = 0; i < 9000; i++) {    // darker speckle noise
          const v = 105 + (Math.random() * 90) | 0;
          ctx.fillStyle = `rgba(${v},${v + 4},${v - 8},${0.2 + Math.random() * 0.35})`;
          ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        for (let i = 0; i < 380; i++) {     // grass-blade flecks
          const v = 150 + (Math.random() * 70) | 0;
          ctx.strokeStyle = `rgba(${v - 30},${v},${v - 45},0.4)`;
          const x = Math.random() * s, y = Math.random() * s;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 7, y - 3 - Math.random() * 6); ctx.stroke();
        }
      });
      RT.Terrain._groundTex.wrapS = RT.Terrain._groundTex.wrapT = THREE.RepeatWrapping;
      RT.Terrain._groundTex.repeat.set(11, 11);
      RT.Terrain._groundMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.95, metalness: 0.0, map: RT.Terrain._groundTex,
      });
    }
    this.mesh = new THREE.Mesh(geo, RT.Terrain._groundMat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }
};

/* ---------------- Map builder ---------------- */
RT.MapBuilder = class {
  constructor(terrain, seed) {
    this.terrain = terrain;
    this.rnd = RNG(seed || 42);
    this.static = [];        // merged world geometry buckets
    this.colliders = [];     // {min:{x,y,z}, max:{x,y,z}, door?:ref}
    this.platforms = [];     // walkable {x0,z0,x1,z1,y}
    this.cover = [];         // {x,z,y, dir:{x,z}, low:bool}
    this.doors = [];         // {pivot, open, closed collider}
    this.destructibles = []; // explosive barrels + breakable glass (live meshes)
    this.interact = [];      // {x,z,y,r, label, fn, once}
    this.waypointObjs = [];
    this.group = new THREE.Group();
    this.buckets = { std: [], wood: [] };
  }
  h(x, z) { return this.terrain.heightAt(x, z); }
  addGeo(geo) { this.buckets.std.push(geo); }
  box(w, h, d, c, o) { this.buckets.std.push(RT.G.box(w, h, d, c, o)); }
  collide(x, y, z, w, h, d) {
    this.colliders.push({ min: { x: x - w / 2, y: y - h / 2, z: z - d / 2 }, max: { x: x + w / 2, y: y + h / 2, z: z + d / 2 } });
    return this.colliders[this.colliders.length - 1];
  }
  collideRot(cx, cy, cz, w, h, d, ry) {
    // approximate rotated box with AABB (fine for near-axis) or split into strips for long walls
    if (Math.abs(Math.sin(ry)) < 0.05 || Math.abs(Math.cos(ry)) < 0.05) {
      const along = Math.abs(Math.cos(ry)) > 0.5 ? [w, d] : [d, w];
      return this.collide(cx, cy, cz, along[0], h, along[1]);
    }
    const steps = Math.max(1, Math.ceil(w / 1.2));
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps - 0.5;
      this.collide(cx + cs * t * w, cy, cz - sn * t * w, w / steps + d, h, w / steps + d);
    }
  }
  addCover(x, z, dirX, dirZ, low) {
    this.cover.push({ x, z, y: this.h(x, z), dir: { x: dirX, z: dirZ }, low: !!low, claimed: null });
  }
  platform(x0, z0, x1, z1, y) { this.platforms.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y }); }

  /* ground height incl. platforms (for player/AI standing) */
  groundAt(x, z, feetY) {
    let g = this.terrain.heightAt(x, z);
    for (const p of this.platforms) {
      if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && p.y <= feetY + 0.55 && p.y > g) g = p.y;
    }
    return g;
  }

  /* segment raycast vs colliders + terrain. returns {dist, point, normal} or null */
  raycast(ox, oy, oz, dx, dy, dz, maxDist, skipDoors) {
    let best = maxDist, bestN = null, bestCol = null, bestExit = 0;
    for (const c of this.colliders) {
      if (c.disabled) continue;
      let tmin = 0, tmax = 1e9, nx = 0, ny = 0, nz = 0;
      let hit = true;
      const o = [ox, oy, oz], d = [dx, dy, dz], mn = [c.min.x, c.min.y, c.min.z], mx = [c.max.x, c.max.y, c.max.z];
      let axis = -1, sign = 0;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(d[a]) < 1e-8) {
          if (o[a] < mn[a] || o[a] > mx[a]) { hit = false; break; }
        } else {
          let t1 = (mn[a] - o[a]) / d[a], t2 = (mx[a] - o[a]) / d[a];
          let s = -1;
          if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
          if (t1 > tmin) { tmin = t1; axis = a; sign = s; }
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) { hit = false; break; }
        }
      }
      if (hit && tmin > 0.01 && tmin < best) {
        best = tmin;
        nx = ny = nz = 0;
        if (axis === 0) nx = sign; else if (axis === 1) ny = sign; else nz = sign;
        bestN = { x: nx, y: ny, z: nz };
        bestCol = c; bestExit = tmax;
      }
    }
    // terrain march
    let t = 1, lastH = oy - this.terrain.heightAt(ox, oz);
    const step = 1.4;
    while (t < best) {
      const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
      if (Math.abs(px) > this.terrain.size / 2 || Math.abs(pz) > this.terrain.size / 2) break;
      const dh = py - this.terrain.heightAt(px, pz);
      if (dh <= 0) {
        // refine between t-step and t
        let lo = Math.max(0, t - step), hi = t;
        for (let i = 0; i < 5; i++) {
          const mid = (lo + hi) / 2;
          const mh = (oy + dy * mid) - this.terrain.heightAt(ox + dx * mid, oz + dz * mid);
          if (mh > 0) lo = mid; else hi = mid;
        }
        if (hi < best) { best = hi; bestN = { x: 0, y: 1, z: 0, terrain: true }; }
        break;
      }
      t += Math.max(0.35, Math.min(step, dh * 1.8));
      lastH = dh;
    }
    if (!bestN || best >= maxDist) return null;
    return { dist: best, point: { x: ox + dx * best, y: oy + dy * best, z: oz + dz * best }, normal: bestN, col: bestCol, exit: bestExit };
  }

  finalize() {
    this.terrain._buildMesh(this.terrain.opts.palette || {});
    this.group.add(this.terrain.mesh);
    if (this.buckets.std.length) {
      // chunk merge for frustum culling: 3x3 grid
      const chunks = {};
      const cs = this.terrain.size / 3;
      for (const g of this.buckets.std) {
        g.computeBoundingSphere();
        const c = g.boundingSphere.center;
        const key = Math.floor((c.x + this.terrain.size / 2) / cs) + '_' + Math.floor((c.z + this.terrain.size / 2) / cs);
        (chunks[key] = chunks[key] || []).push(g);
      }
      for (const key in chunks) {
        const m = RT.meshOf(RT.mergeGeos(chunks[key]), RT.MAT.std);
        m.frustumCulled = false;   // never pop whole prop clusters out when the camera turns
        this.group.add(m);
      }
      this.buckets.std = [];
    }
    return this.group;
  }
};

/* ---------------- Prop & building factory ---------------- */
RT.props = (() => {
  const P = {};
  const G = RT.G;
  function adjc(hex, mul) { const c = new THREE.Color(hex); c.multiplyScalar(mul); return c.getHex(); }

  /* ---------- house construction system ----------
   * o: {x,z,ry, w,d, floors, roof:'gable'|'hip'|'flat', wallC, roofC, trimC,
   *     damage:0-2, interior:true, ajar, stairs, porch} */
  P.house = function (B, o) {
    const rnd = RNG((o.seed != null ? o.seed : (o.x * 131 + o.z * 17)) | 0);
    const w = o.w || rnd.range(7, 10), d = o.d || rnd.range(6, 9);
    const floors = o.floors || 1;
    const fh = 2.75;                       // per-floor height
    const H = floors * fh;
    const wallC = o.wallC != null ? o.wallC : rnd.pick([0xb5a68c, 0xa89a80, 0x9d8f78, 0xb8a998, 0x8f8064]);
    const trimC = o.trimC != null ? o.trimC : adjc(wallC, 0.72);
    const roofC = o.roofC != null ? o.roofC : rnd.pick([0x6e4434, 0x5c4a3a, 0x536052, 0x62555e]);
    const dmg = o.damage || 0;
    const T = 0.24;                        // wall thickness
    const gy = B.terrain instanceof RT.Terrain ? B._flattenFor(o, w, d) : 0;
    const cs = Math.cos(o.ry || 0), sn = Math.sin(o.ry || 0);
    const L2W = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
    const geos = [];
    const woodC = 0x5e4630;

    /* geometry is built in LOCAL space (origin = house center at ground),
     * then rotated/translated once at the end */
    const wallBox = (lx, ly, lz, ww, hh, dd, col) => {
      geos.push(G.box(ww, hh, dd, col || wallC, { x: lx, y: ly, z: lz, vary: 0.05 }));
    };
    const solid = (lx, ly, lz, ww, hh, dd) => {
      const [wx, wz] = L2W(lx, lz);
      B.collideRot(wx, gy + ly, wz, ww, hh, dd, o.ry || 0);
    };

    /* one exterior wall with openings.
     * axis: 'x' (wall runs along x) or 'z'; sign: which side.
     * openings: [{c:center along wall, w, type:'door'|'win', broken}] */
    const mkWall = (axis, sign, openings) => {
      const len = axis === 'x' ? w : d;
      const off = (axis === 'x' ? d : w) / 2 - T / 2;
      const place = (c, ww, y0, y1, col) => {
        const mid = (y0 + y1) / 2, hh = y1 - y0;
        if (hh <= 0.01 || ww <= 0.01) return;
        if (axis === 'x') { wallBox(c, mid, off * sign, ww, hh, T, col); solid(c, mid, off * sign, ww, hh, T); }
        else { wallBox(off * sign, mid, c, T, hh, ww, col); solid(off * sign, mid, c, T, hh, ww); }
      };
      const sorted = (openings || []).slice().sort((a, b) => a.c - b.c);
      let cursor = -len / 2;
      for (const op of sorted) {
        const x0 = op.c - op.w / 2, x1 = op.c + op.w / 2;
        place((cursor + x0) / 2, x0 - cursor, 0, H);            // segment before opening
        if (op.type === 'door') {
          place(op.c, op.w, 2.15, H);                            // lintel above door
        } else {
          const sy0 = op.y0 != null ? op.y0 : 0.95, sy1 = op.y1 != null ? op.y1 : 2.15;
          place(op.c, op.w, 0, sy0);                             // below sill
          place(op.c, op.w, sy1, H);                             // above lintel
          // window frame + cross bar
          const fr = trimC;
          if (axis === 'x') {
            wallBox(op.c - op.w / 2 + 0.04, (sy0 + sy1) / 2, off * sign, 0.08, sy1 - sy0, T + 0.06, fr);
            wallBox(op.c + op.w / 2 - 0.04, (sy0 + sy1) / 2, off * sign, 0.08, sy1 - sy0, T + 0.06, fr);
            wallBox(op.c, sy0 + 0.04, off * sign, op.w, 0.08, T + 0.09, fr);
            wallBox(op.c, sy1 - 0.04, off * sign, op.w, 0.08, T + 0.06, fr);
            if (!op.broken) wallBox(op.c, (sy0 + sy1) / 2, off * sign, 0.05, sy1 - sy0 - 0.1, 0.04, 0x2d3438);
            else wallBox(op.c - op.w * 0.2, sy0 + 0.3, off * sign, 0.05, 0.5, 0.04, 0x2d3438);
            // shutters (some crooked)
            if (op.shutter) {
              wallBox(op.c - op.w / 2 - 0.24, (sy0 + sy1) / 2 - (op.crooked ? 0.15 : 0), off * sign + sign * 0.05, 0.4, sy1 - sy0 - 0.15, 0.05, adjc(roofC, 0.85));
              if (!op.crooked) wallBox(op.c + op.w / 2 + 0.24, (sy0 + sy1) / 2, off * sign + sign * 0.05, 0.4, sy1 - sy0 - 0.15, 0.05, adjc(roofC, 0.85));
            }
          } else {
            wallBox(off * sign, (sy0 + sy1) / 2, op.c - op.w / 2 + 0.04, T + 0.06, sy1 - sy0, 0.08, fr);
            wallBox(off * sign, (sy0 + sy1) / 2, op.c + op.w / 2 - 0.04, T + 0.06, sy1 - sy0, 0.08, fr);
            wallBox(off * sign, sy0 + 0.04, op.c, T + 0.09, 0.08, op.w, fr);
            wallBox(off * sign, sy1 - 0.04, op.c, T + 0.06, 0.08, op.w, fr);
            if (!op.broken) wallBox(off * sign, (sy0 + sy1) / 2, op.c, 0.04, sy1 - sy0 - 0.1, 0.05, 0x2d3438);
          }
          if (axis === 'x') solid(op.c, sy0 / 2, off * sign, op.w, sy0, T); else solid(off * sign, sy0 / 2, op.c, T, sy0, op.w);
        }
        cursor = x1;
      }
      place((cursor + len / 2) / 2, len / 2 - cursor, 0, H);     // tail segment
      // door meshes on hinge pivots
      for (const op of sorted) {
        if (op.type !== 'door') continue;
        const dw = op.w - 0.08;
        const doorGeos = [G.box(dw, 2.06, 0.07, op.doorC || woodC, { x: dw / 2, y: 1.03, vary: 0.1 }),
          G.box(dw - 0.16, 0.7, 0.09, adjc(op.doorC || woodC, 0.85), { x: dw / 2, y: 1.55 }),
          G.box(dw - 0.16, 0.7, 0.09, adjc(op.doorC || woodC, 0.85), { x: dw / 2, y: 0.55 }),
          G.sph(0.035, 8, 6, 0x8a8578, { x: dw - 0.12, y: 1.02, z: 0.06 })];
        const doorMesh = RT.meshOf(doorGeos, RT.MAT.std);
        const pivot = new THREE.Object3D();
        let wx, wz, wry = o.ry || 0;
        if (axis === 'x') { [wx, wz] = L2W(op.c - dw / 2, off * sign); }
        else { [wx, wz] = L2W(off * sign, op.c - dw / 2); wry += Math.PI / 2; }
        pivot.position.set(wx, gy, wz);
        pivot.rotation.y = wry;
        pivot.add(doorMesh);
        B.group.add(pivot);
        const doorCol = { min: {}, max: {}, disabled: false };
        const updateCol = () => {
          const a = pivot.rotation.y - wry; // open angle
          const ex = Math.cos(a) * dw, ez = -Math.sin(a) * dw;
          const p1x = wx + Math.cos(wry) * ex + Math.sin(wry) * ez;
          const p1z = wz - Math.sin(wry) * ex + Math.cos(wry) * ez;
          doorCol.min.x = Math.min(wx, p1x) - 0.06; doorCol.max.x = Math.max(wx, p1x) + 0.06;
          doorCol.min.z = Math.min(wz, p1z) - 0.06; doorCol.max.z = Math.max(wz, p1z) + 0.06;
          doorCol.min.y = gy; doorCol.max.y = gy + 2.1;
        };
        updateCol();
        B.colliders.push(doorCol);
        const door = { pivot, baseRy: wry, open: !!op.ajar, t: op.ajar ? 0.55 : 0, target: op.ajar ? 0.55 : 0, updateCol, breach: op.breach };
        B.doors.push(door);
        if (op.ajar) { pivot.rotation.y = wry + 0.9; updateCol(); }
        if (!op.locked) {
          B.interact.push({
            getPos: () => { const [ix, iz] = axis === 'x' ? L2W(op.c, off * sign) : L2W(off * sign, op.c); return { x: ix, y: gy + 1.2, z: iz }; },
            r: 1.7, label: op.breach ? 'BREACH' : 'OPEN', door,
          });
        }
      }
    };

    /* generate openings */
    const front = o.front || 'S'; // door side (local +z = S)
    const winW = 1.15;
    const doorWall = { S: ['x', 1], N: ['x', -1], E: ['z', 1], W: ['z', -1] }[front];
    const walls = { S: ['x', 1], N: ['x', -1], E: ['z', 1], W: ['z', -1] };
    for (const key in walls) {
      const [axis, sign] = walls[key];
      const len = axis === 'x' ? w : d;
      const ops = [];
      if (key === front) {
        const dc = o.doorAt != null ? o.doorAt : rnd.range(-len / 4, len / 4);
        ops.push({ c: dc, w: 1.06, type: 'door', ajar: o.ajar != null ? o.ajar : rnd.chance(0.4), breach: o.breach, locked: o.locked });
        if (len > 6.5) ops.push({ c: dc + (dc > 0 ? -len / 3.1 : len / 3.1), w: winW, type: 'win', shutter: rnd.chance(0.6), crooked: rnd.chance(0.3), broken: dmg > 0 && rnd.chance(0.5) });
      } else {
        const n = len > 8 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          ops.push({ c: (i - (n - 1) / 2) * len / (n + 0.4), w: winW, type: 'win', shutter: rnd.chance(0.5), crooked: rnd.chance(0.25), broken: dmg > 0 && rnd.chance(0.45) });
        }
      }
      mkWall(axis, sign, ops);
    }
    /* second floor windows */
    if (floors > 1) {
      for (const key in walls) {
        const [axis, sign] = walls[key];
        const len = axis === 'x' ? w : d;
        const n = len > 8 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const c = (i - (n - 1) / 2) * len / (n + 0.6);
          const off = (axis === 'x' ? d : w) / 2 - T / 2;
          const y0 = fh + 0.9, y1 = fh + 2.0;
          // punch handled by wall builder only for floor 1; add framed opening look for floor 2
          if (axis === 'x') {
            wallBox(c, (y0 + y1) / 2, off * sign + sign * 0.02, winW, y1 - y0, 0.1, 0x22282c);
            wallBox(c - winW / 2, (y0 + y1) / 2, off * sign + sign * 0.05, 0.08, y1 - y0, 0.08, trimC);
            wallBox(c + winW / 2, (y0 + y1) / 2, off * sign + sign * 0.05, 0.08, y1 - y0, 0.08, trimC);
            wallBox(c, y0, off * sign + sign * 0.05, winW, 0.08, 0.09, trimC);
          } else {
            wallBox(off * sign + sign * 0.02, (y0 + y1) / 2, c, 0.1, y1 - y0, winW, 0x22282c);
            wallBox(off * sign + sign * 0.05, (y0 + y1) / 2, c - winW / 2, 0.08, y1 - y0, 0.08, trimC);
            wallBox(off * sign + sign * 0.05, (y0 + y1) / 2, c + winW / 2, 0.08, y1 - y0, 0.08, trimC);
            wallBox(off * sign + sign * 0.05, y0, c, 0.09, 0.08, winW, trimC);
          }
        }
      }
    }

    /* foundation + interior floor */
    wallBox(0, -0.22, 0, w + 0.5, 0.6, d + 0.5, adjc(wallC, 0.6));
    wallBox(0, 0.06, 0, w - 0.2, 0.12, d - 0.2, 0x7a6a52);
    B.platform(...(() => { const [ax, az] = L2W(-w / 2, -d / 2); const [bx, bz] = L2W(w / 2, d / 2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + 0.12);

    /* roof */
    const roofDrop = dmg >= 2 ? 1 : 0; // collapsed corner
    if (o.roof === 'flat') {
      wallBox(0, H + 0.1, 0, w + 0.7, 0.22, d + 0.7, adjc(roofC, 0.9));
      wallBox(0, H + 0.35, 0, w + 0.2, 0.5, 0.2, wallC); // parapet front/back
      wallBox(0, H + 0.35, 0, 0.2, 0.5, d + 0.2, wallC);
      solid(0, H + 0.1, 0, w + 0.7, 0.22, d + 0.7);
      B.platform(...(() => { const [ax, az] = L2W(-w / 2, -d / 2); const [bx, bz] = L2W(w / 2, d / 2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + H + 0.22);
    } else {
      const rise = w * 0.3, ov = 0.55;
      const slopeL = Math.hypot(w / 2 + ov, rise);
      const ang = Math.atan2(rise, w / 2 + ov);
      // two slopes with shingle rows
      for (const s of [-1, 1]) {
        if (roofDrop && s === 1) {
          // collapsed corner: half slope + exposed rafters + rubble
          geos.push(G.box(slopeL * 0.55, 0.16, d * 0.55 + ov, roofC, {
            x: s * (w / 4 + ov / 2) * Math.cos(ang) * 0.9, y: H + rise / 2 + 0.28 - rise * 0.28, z: -d * 0.22,
            rz: -s * ang, vary: 0.09,
          }));
          for (let i = 0; i < 5; i++) {
            geos.push(G.box(0.09, 0.14, d * 0.5, 0x4a3826, {
              x: s * (w / 2 - i * w / 9), y: H + rise - i * rise / 5 - rise * 0.3, z: d * 0.24,
              rz: -s * ang * 0.9, vary: 0.15,
            }));
          }
          // rubble pile at the collapse
          const [rx, rz2] = L2W(s * w / 3, d / 3);
          P.rubble(B, { x: rx, z: rz2, r: 2.4, seed: rnd.int(0, 999) });
          continue;
        }
        const cx = s * (w / 4 + ov / 4);
        geos.push(G.box(slopeL, 0.14, d + ov * 2, roofC, {
          x: cx, y: H + rise / 2 + 0.14, z: 0, rz: -s * ang, vary: 0.07,
        }));
        // shingle rows (thin strips)
        const rows = 4;
        for (let i = 0; i < rows; i++) {
          const t = (i + 0.5) / rows;
          geos.push(G.box(0.06, 0.05, d + ov * 2 + 0.05, adjc(roofC, 0.8 + 0.1 * (i % 2)), {
            x: s * ((w / 2 + ov) * (1 - t)) * 0.98, y: H + rise * t + 0.2, z: 0,
          }));
        }
        const covW = Math.cos(ang) * slopeL, covH = Math.sin(ang) * slopeL;
        B.collideRot(...L2W(cx, 0), gy + H + rise / 2 + 0.14, covW, covH + 0.3, d + ov * 2, o.ry || 0);
      }
      // ridge cap
      if (!roofDrop) geos.push(G.box(0.3, 0.12, d + ov * 2 + 0.1, adjc(roofC, 0.7), { y: H + rise + 0.2 }));
      // gable end triangles
      for (const s of [-1, 1]) {
        geos.push(G.wedge(w, rise, T, wallC, { x: 0, y: H, z: s * (d / 2 - T / 2), vary: 0.05 }));
      }
      // chimney with crown
      if (rnd.chance(0.7) && !roofDrop) {
        const chx = rnd.range(-w / 4, w / 4);
        geos.push(G.box(0.7, rise + 1.6, 0.7, adjc(wallC, 0.78), { x: chx, y: H + rise / 2 + 0.6, z: d / 4, vary: 0.12 }));
        geos.push(G.box(0.9, 0.18, 0.9, adjc(wallC, 0.62), { x: chx, y: H + rise + 1.45, z: d / 4 }));
      }
    }
    /* gutters */
    geos.push(G.box(0.1, 0.1, d + 1, adjc(trimC, 0.8), { x: -w / 2 - 0.5, y: H + 0.12 }));
    geos.push(G.box(0.1, 0.1, d + 1, adjc(trimC, 0.8), { x: w / 2 + 0.5, y: H + 0.12 }));

    /* porch + steps */
    if (o.porch !== false && front === 'S') {
      const pw = Math.min(3.4, w * 0.5);
      const px = o.doorAt != null ? o.doorAt : 0;
      wallBox(px, 0.02, d / 2 + 0.8, pw, 0.14, 1.6, 0x6b5a42);
      for (let i = 0; i < 2; i++) wallBox(px, -0.1 - i * 0.14, d / 2 + 1.7 + i * 0.34, pw * 0.7, 0.14, 0.36, 0x6b5a42);
      geos.push(G.cyl(0.07, 0.08, 2.3, 8, woodC, { x: px - pw / 2 + 0.15, y: 1.15, z: d / 2 + 1.5 }));
      geos.push(G.cyl(0.07, 0.08, 2.3, 8, woodC, { x: px + pw / 2 - 0.15, y: 1.15, z: d / 2 + 1.5 }));
      wallBox(px, 2.35, d / 2 + 1.15, pw + 0.4, 0.12, 2.1, adjc(roofC, 0.95));
    }

    /* interior */
    if (o.interior !== false) {
      const IC = adjc(wallC, 1.12);
      // one dividing wall with doorway
      const divZ = rnd.range(-d / 6, d / 6);
      const dwx = rnd.range(-w / 4, 0);
      wallBox((dwx - w / 2) / 2 - 0.55, fh / 2, divZ, (dwx - (-w / 2)) - 1.1, fh, 0.16, IC);
      solid((dwx - w / 2) / 2 - 0.55, fh / 2, divZ, (dwx - (-w / 2)) - 1.1, fh, 0.16);
      wallBox((dwx + 1.1 + w / 2) / 2, fh / 2, divZ, (w / 2 - dwx - 1.1), fh, 0.16, IC);
      solid((dwx + 1.1 + w / 2) / 2, fh / 2, divZ, (w / 2 - dwx - 1.1), fh, 0.16);
      wallBox(dwx + 0.55, fh - 0.3, divZ, 1.1, 0.6, 0.16, IC); // doorway lintel
      P.furnishRoom(B, o, gy, w, d, divZ, rnd, L2W);
      if (floors > 1) {
        // ceiling slab with stair hole
        const holeW = 1.2, holeD = 3.2, hx = w / 2 - 0.9, hz = -d / 2 + 2.1;
        wallBox(-(w - (w / 2 - hx + holeW / 2)) / 2 + 0 - 0.6, fh + 0.09, 0, w - (w / 2 - hx) - holeW, 0.18, d - 0.3, 0x7a6a52);
        wallBox(hx, fh + 0.09, (hz + holeD / 2 + d / 2) / 2 + 0.3, holeW + 0.7, 0.18, d - (d / 2 - hz) - holeD + 1, 0x7a6a52);
        B.platform(...(() => { const [ax, az] = L2W(-w / 2 + 0.2, -d / 2 + 0.2); const [bx, bz] = L2W(w / 2 - 0.2, d / 2 - 0.2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + fh + 0.18);
        // stairs
        const steps = 10, sw = 1.1;
        for (let i = 0; i < steps; i++) {
          const sy = (i + 1) * fh / steps, sz = hz + holeD / 2 - (i + 0.5) * holeD / steps;
          wallBox(hx, sy - 0.07, sz, sw, 0.14, holeD / steps + 0.04, 0x6b5a42);
          const [sxw, szw] = L2W(hx, sz);
          B.platform(sxw - sw / 2, szw - holeD / steps / 2, sxw + sw / 2, szw + holeD / steps / 2, gy + sy);
        }
        // upstairs furniture: bed + shelf near window (sniper spot)
        P.bed(B, ...L2W(-w / 4, d / 4), gy + fh + 0.18, o.ry || 0, rnd);
        B.addCover(...L2W(0, d / 2 - 1.2), 0 * cs + 1 * sn, 1 * cs, true);
      }
    }
    /* single final transform: rotate about house origin, then translate */
    const fm = new THREE.Matrix4().makeRotationY(o.ry || 0);
    fm.setPosition(o.x, gy, o.z);
    for (const gg of geos) {
      gg.applyMatrix4(fm);
      /* weathering: grime-darken wall bases (bottom ~0.55m above grade) */
      const pp = gg.attributes.position.array, cc = gg.attributes.color.array;
      for (let vi = 0; vi < pp.length / 3; vi++) {
        const hAbove = pp[vi * 3 + 1] - gy;
        if (hAbove < 0.55 && hAbove > -0.4) {
          const k = 0.72 + 0.28 * smoothstep(0.05, 0.55, hAbove);
          cc[vi * 3] *= k; cc[vi * 3 + 1] *= k; cc[vi * 3 + 2] *= k * 0.97;
        }
      }
    }
    B.buckets.std.push(...geos);
    /* bushes hugging the foundation */
    const brnd = RNG((o.seed || 1) * 3 + 11);
    if (brnd.chance(0.75)) P.bush(B, ...L2W(w / 2 + 0.8, brnd.range(-d / 3, d / 3)), {});
    if (brnd.chance(0.55)) P.bush(B, ...L2W(-w / 2 - 0.9, brnd.range(-d / 3, d / 3)), {});
    return { gy };
  };

  /* room furniture */
  P.furnishRoom = function (B, o, gy, w, d, divZ, rnd, L2W) {
    const items = rnd.int(2, 4);
    if (rnd.chance(0.85)) P.table(B, ...L2W(rnd.range(-w / 4, w / 4), divZ + d / 5), gy, o.ry || 0, rnd);
    if (rnd.chance(0.7)) P.shelf(B, ...L2W(-w / 2 + 0.45, divZ - d / 5), gy, (o.ry || 0) + Math.PI / 2, rnd);
    if (rnd.chance(0.5)) P.bed(B, ...L2W(w / 4, -d / 4), gy, o.ry || 0, rnd);
    if (rnd.chance(0.5)) P.cabinetFallen(B, ...L2W(rnd.range(-w / 5, w / 5), -d / 3), gy, o.ry || 0, rnd);
  };
  P.table = function (B, x, z, gy, ry, rnd) {
    const g = [];
    g.push(G.box(1.5, 0.07, 0.9, 0x6b5138, { x: 0, y: 0.74, z: 0, vary: 0.08 }));
    for (const [lx, lz] of [[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]]) {
      g.push(G.cyl(0.035, 0.05, 0.72, 7, 0x5e4630, { x: lx, y: 0.37, z: lz }));
      g.push(G.sph(0.05, 6, 5, 0x5e4630, { x: lx, y: 0.55, z: lz, sy: 1.6 }));  // turned bulge
    }
    // chairs
    for (const s of [-1, 1]) {
      if (rnd && rnd.chance(0.3)) continue;
      g.push(G.box(0.45, 0.05, 0.45, 0x6b5138, { x: 0, y: 0.46, z: s * 0.85 }));
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
        g.push(G.box(0.045, 0.46, 0.045, 0x5e4630, { x: lx, y: 0.23, z: s * 0.85 + lz }));
      g.push(G.box(0.45, 0.55, 0.05, 0x5e4630, { x: 0, y: 0.75, z: s * (0.85 + 0.2) }));
    }
    const merged = g.map(gg => { const m = new THREE.Matrix4().makeRotationY(ry); gg.applyMatrix4(m); gg.translate(x, gy, z); return gg; });
    B.buckets.std.push(...merged);
    B.collide(x, gy + 0.4, z, 1.6, 0.8, 1.0);
    B.addCover(x, z + 1.4, 0, -1, true);
  };
  P.shelf = function (B, x, z, gy, ry, rnd) {
    const g = [];
    g.push(G.box(1.4, 2.0, 0.36, 0x5e4630, { y: 1.0, vary: 0.08 }));
    for (let i = 0; i < 4; i++) {
      g.push(G.box(1.28, 0.05, 0.3, 0x6b5138, { y: 0.3 + i * 0.5, z: 0.02 }));
      // clutter items
      const n = rnd ? rnd.int(1, 3) : 2;
      for (let k = 0; k < n; k++) {
        const cx = (k - n / 2) * 0.4 + 0.1;
        if ((i + k) % 3 === 0) g.push(G.box(0.12, 0.22, 0.18, 0x8a4a38, { x: cx, y: 0.42 + i * 0.5, z: 0 }));
        else if ((i + k) % 3 === 1) g.push(G.cyl(0.07, 0.07, 0.18, 7, 0x7a8a68, { x: cx, y: 0.41 + i * 0.5 }));
        else g.push(G.box(0.2, 0.14, 0.14, 0x9a8a62, { x: cx, y: 0.38 + i * 0.5, ry: 0.4 }));
      }
    }
    const m4r = new THREE.Matrix4().makeRotationY(ry);
    g.forEach(gg => { gg.applyMatrix4(m4r); gg.translate(x, gy, z); });
    B.buckets.std.push(...g);
    B.collide(x, gy + 1, z, 1.4, 2, 0.5);
  };
  P.bed = function (B, x, z, gy, ry, rnd) {
    const g = [];
    g.push(G.box(1.05, 0.28, 2.1, 0x5e4630, { y: 0.32 }));
    g.push(G.box(1.0, 0.16, 2.0, 0xb0a890, { y: 0.5, vary: 0.08 }));
    g.push(G.box(0.9, 0.1, 0.5, 0xcac2ae, { y: 0.58, z: -0.7 }));
    g.push(G.box(1.05, 0.75, 0.08, 0x5e4630, { y: 0.55, z: -1.06 }));
    for (const [lx, lz] of [[-0.48, -1], [0.48, -1], [-0.48, 1], [0.48, 1]])
      g.push(G.box(0.07, 0.34, 0.07, 0x4a3826, { x: lx, y: 0.17, z: lz }));
    const m4r = new THREE.Matrix4().makeRotationY(ry);
    g.forEach(gg => { gg.applyMatrix4(m4r); gg.translate(x, gy, z); });
    B.buckets.std.push(...g);
    B.collide(x, gy + 0.3, z, 1.1, 0.6, 2.1);
  };
  P.cabinetFallen = function (B, x, z, gy, ry, rnd) {
    const g = [];
    g.push(G.box(0.9, 0.4, 1.8, 0x5e4630, { y: 0.2, rz: 0.04, vary: 0.1 }));
    g.push(G.box(0.8, 0.06, 0.5, 0x6b5138, { x: 0.5, y: 0.05, z: 0.4, ry: 0.5 }));
    g.push(G.box(0.14, 0.2, 0.2, 0x8a4a38, { x: -0.7, y: 0.1, z: -0.3, ry: 0.8 }));
    const m4r = new THREE.Matrix4().makeRotationY(ry);
    g.forEach(gg => { gg.applyMatrix4(m4r); gg.translate(x, gy, z); });
    B.buckets.std.push(...g);
    B.collide(x, gy + 0.25, z, 1.1, 0.5, 1.9);
    B.addCover(x, z, Math.sin(ry), Math.cos(ry), true);
  };
  P.rubble = function (B, o) {
    const rnd = RNG(o.seed || 5);
    const g = [];
    const n = Math.floor(o.r * 5);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, rr = rnd() * o.r;
      g.push(G.box(rnd.range(0.2, 0.6), rnd.range(0.15, 0.4), rnd.range(0.2, 0.55), rnd.pick([0x8a7f6c, 0x9d8f78, 0x6e6152, 0x5a5044]), {
        x: o.x + Math.cos(a) * rr, y: (RT.map ? 0 : 0) + (o.y != null ? o.y : 0) + rnd.range(0.05, 0.35 * (1 - rr / o.r)), z: o.z + Math.sin(a) * rr,
        rx: rnd.spread(0.5), ry: rnd() * TAU, rz: rnd.spread(0.5), vary: 0.15,
      }));
    }
    // fix y to terrain
    B.buckets.std.push(...g.map(gg => { gg.translate(0, B.h(o.x, o.z), 0); return gg; }));
    B.collide(o.x, B.h(o.x, o.z) + 0.3, o.z, o.r * 1.2, 0.6, o.r * 1.2);
    B.addCover(o.x + o.r * 1.1, o.z, -1, 0, true);
  };

  /* ---------- barn (mission 1 setpiece) ---------- */
  P.barn = function (B, o) {
    const w = 11, d = 15, H = 4.2, rise = 3;
    const gy = B._flattenFor(o, w, d);
    const wallC = o.wallC || 0x8a4a38, trimC = 0x5e3626;
    const T = 0.26;
    const geos = [];
    const wb = (lx, ly, lz, ww, hh, dd, col) => geos.push(G.box(ww, hh, dd, col || wallC, { x: lx, y: ly, z: lz, vary: 0.09 }));
    const cs = Math.cos(o.ry || 0), sn = Math.sin(o.ry || 0);
    const L2W = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
    const solid = (lx, ly, lz, ww, hh, dd) => { const [wx, wz] = L2W(lx, lz); B.collideRot(wx, gy + ly, wz, ww, hh, dd, o.ry || 0); };
    // side walls with plank stripes
    for (const s of [-1, 1]) {
      wb(s * (w / 2 - T / 2), H / 2, 0, T, H, d);
      solid(s * (w / 2 - T / 2), H / 2, 0, T, H, d);
      for (let i = 0; i < 6; i++) wb(s * (w / 2 - T / 2 + s * 0.04), H / 2, -d / 2 + (i + 0.5) * d / 6, 0.06, H - 0.4, 0.09, trimC);
    }
    // front/back with big opening
    for (const s of [-1, 1]) {
      const opW = s === 1 ? 3.4 : 0;
      if (opW) {
        wb(-(w / 4 + opW / 4), H / 2, s * (d / 2 - T / 2), w / 2 - opW / 2, H, T);
        wb(w / 4 + opW / 4, H / 2, s * (d / 2 - T / 2), w / 2 - opW / 2, H, T);
        wb(0, H - 0.35, s * (d / 2 - T / 2), opW, 0.7, T);
        solid(-(w / 4 + opW / 4), H / 2, s * (d / 2 - T / 2), w / 2 - opW / 2, H, T);
        solid(w / 4 + opW / 4, H / 2, s * (d / 2 - T / 2), w / 2 - opW / 2, H, T);
        // sliding door half-open
        wb(-opW / 2 - 0.8, H / 2 - 0.3, s * (d / 2 + 0.12), 2.4, H - 0.7, 0.1, trimC);
        solid(-opW / 2 - 0.8, H / 2 - 0.3, s * (d / 2 + 0.12), 2.4, H - 0.7, 0.1);
      } else {
        wb(0, H / 2, s * (d / 2 - T / 2), w, H, T);
        solid(0, H / 2, s * (d / 2 - T / 2), w, H, T);
      }
      geos.push(G.wedge(w, rise, T, wallC, { x: 0, y: H, z: s * (d / 2 - T / 2), vary: 0.07 }));
    }
    // roof slopes
    const ov = 0.7, slopeL = Math.hypot(w / 2 + ov, rise), ang = Math.atan2(rise, w / 2 + ov);
    for (const s of [-1, 1]) {
      geos.push(G.box(slopeL, 0.16, d + ov * 2, 0x5c4a3a, { x: s * (w / 4 + ov / 4), y: H + rise / 2 + 0.15, rz: -s * ang, vary: 0.08 }));
      B.collideRot(...L2W(s * (w / 4 + ov / 4), 0), gy + H + rise / 2 + 0.15, Math.cos(ang) * slopeL, Math.sin(ang) * slopeL + 0.3, d + ov * 2, o.ry || 0);
    }
    geos.push(G.box(0.34, 0.14, d + ov * 2, 0x4a3a2e, { y: H + rise + 0.2 }));
    // hay loft + bales inside
    wb(0, 2.5, -d / 4, w - 1, 0.16, d / 2 - 1, 0x6b5a42);
    B.platform(...(() => { const [ax, az] = L2W(-(w - 1) / 2, -d / 4 - (d / 2 - 1) / 2); const [bx, bz] = L2W((w - 1) / 2, -d / 4 + (d / 2 - 1) / 2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + 2.58);
    // ladder to loft
    for (let i = 0; i < 6; i++) wb(1.2, 0.3 + i * 0.42, -d / 4 + (d / 2 - 1) / 2 + 0.3, 0.5, 0.05, 0.05, 0x6b5a42);
    for (const s of [-1, 1]) wb(1.2 + s * 0.25, 1.3, -d / 4 + (d / 2 - 1) / 2 + 0.3, 0.06, 2.6, 0.06, 0x5e4630);
    B.platform(...(() => { const [ax, az] = L2W(0.8, -d / 4 + (d / 2 - 1) / 2 - 0.2); const [bx, bz] = L2W(1.6, -d / 4 + (d / 2 - 1) / 2 + 0.5); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + 2.58);
    for (let i = 0; i < 4; i++) {
      const [hx, hz] = L2W(-w / 4 + (i % 2) * 1.6, -d / 4 + Math.floor(i / 2) * 1.7);
      P.hayBale(B, { x: hx, z: hz, y: gy + 2.58 + 0.45, ry: (o.ry || 0) + i });
    }
    P.hayBale(B, { x: o.x + cs * 2.4, z: o.z - sn * 2.4, ry: 0.4 });
    const fm = new THREE.Matrix4().makeRotationY(o.ry || 0);
    fm.setPosition(o.x, gy, o.z);
    for (const gg of geos) gg.applyMatrix4(fm);
    B.buckets.std.push(...geos);
    B.addCover(...L2W(0, d / 2 + 1.4), sn, cs, false);
    B.addCover(...L2W(-w / 2 - 1.2, 2), 1, 0, false);
    return { gy, L2W };
  };

  /* ---------- clutter ---------- */
  P.fence = function (B, x0, z0, x1, z1, opts) {
    const rnd = RNG(((x0 * 31 + z1 * 7) | 0) ^ 991);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.floor(len / 0.42);
    const dirX = (x1 - x0) / len, dirZ = (z1 - z0) / len;
    const ry = Math.atan2(dirX, dirZ) + Math.PI / 2;
    const g = [];
    let post = 0;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t);
      const gy = B.h(x, z);
      if (opts && opts.gapAt != null && Math.abs(t - opts.gapAt) < 0.09) continue;
      if (rnd.chance(opts && opts.broken ? 0.18 : 0.05)) {
        if (rnd.chance(0.5)) g.push(G.box(0.09, 0.9, 0.035, 0x6e5a40, { x, y: gy + 0.3, z, rz: rnd.spread(1), ry, vary: 0.2 }));
        continue;
      }
      g.push(G.box(0.09, rnd.range(0.85, 1), 0.035, 0x7a6448, { x, y: gy + 0.46, z, ry, rz: rnd.spread(0.06), vary: 0.25 }));
      if (i % 5 === 0) { g.push(G.box(0.12, 1.15, 0.12, 0x5e4a34, { x, y: gy + 0.5, z, ry, vary: 0.2 })); post++; }
    }
    // rails
    const segs2 = Math.ceil(len / 3);
    for (let i = 0; i < segs2; i++) {
      const t0 = i / segs2, t1 = (i + 1) / segs2;
      const xa = lerp(x0, x1, (t0 + t1) / 2), za = lerp(z0, z1, (t0 + t1) / 2);
      const gy = (B.h(lerp(x0, x1, t0), lerp(z0, z1, t0)) + B.h(lerp(x0, x1, t1), lerp(z0, z1, t1))) / 2;
      for (const hy of [0.35, 0.78])
        g.push(G.box(len / segs2 + 0.05, 0.07, 0.05, 0x6e5a40, { x: xa, y: gy + hy, z: za, ry: ry + Math.PI / 2, vary: 0.2 }));
    }
    B.buckets.std.push(...g);
  };
  P.powerPole = function (B, x, z, prev) {
    const gy = B.h(x, z);
    const g = [G.cyl(0.09, 0.13, 7.2, 8, 0x4e4032, { x, y: gy + 3.6, z, vary: 0.12 }),
      G.box(1.7, 0.09, 0.09, 0x4e4032, { x, y: gy + 6.7, z }),
      G.box(0.08, 0.35, 0.08, 0x3a2f24, { x: -0.6 + x, y: gy + 6.9, z }),
      G.box(0.08, 0.35, 0.08, 0x3a2f24, { x: 0.6 + x, y: gy + 6.9, z })];
    B.buckets.std.push(...g);
    B.collide(x, gy + 3.6, z, 0.3, 7.2, 0.3);
    const top = { x, y: gy + 6.85, z };
    if (prev) {
      // sagging catenary wires
      for (const off of [-0.6, 0.6]) {
        const a = new THREE.Vector3(prev.x + off * 0.9, prev.y, prev.z);
        const b = new THREE.Vector3(x + off * 0.9, top.y, z);
        const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * 0.07;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        let tg = new THREE.TubeGeometry(curve, 8, 0.016, 4);
        tg = tg.index ? tg.toNonIndexed() : tg;
        const n2 = tg.attributes.position.count;
        const cols = new Float32Array(n2 * 3);
        for (let i = 0; i < n2; i++) { cols[i * 3] = 0.07; cols[i * 3 + 1] = 0.07; cols[i * 3 + 2] = 0.07; }
        tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        B.buckets.std.push(tg);
      }
    }
    return top;
  };
  P.sandbags = function (B, x, z, ry, len, o) {
    const rnd = RNG(((x * 13 + z * 7) | 0) ^ 313);
    const gy = B.h(x, z);
    const g = [];
    const rows = (o && o.rows) || 3;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let r = 0; r < rows; r++) {
      const n = Math.floor(len / 0.52) - (r % 2);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5 + (r % 2) * 0.5) / n - 0.5;
        const lx = t * len, ly = 0.14 + r * 0.23, lz = rnd.spread(0.03);
        g.push(G.sph(0.26, 8, 6, rnd.pick([0x8a7a5c, 0x817252, 0x93825f]), {
          x: x + cs * lx + sn * lz, y: gy + ly, z: z - sn * lx + cs * lz,
          sx: 1.05, sy: 0.52, sz: 0.72, ry: ry + rnd.spread(0.15), vary: 0.12,
        }));
      }
    }
    B.buckets.std.push(...g);
    B.collideRot(x, gy + rows * 0.23 / 2 + 0.05, z, len, rows * 0.23 + 0.15, 0.55, ry);
    B.addCover(x + sn * 0.9, z + cs * 0.9, -sn, -cs, true);
    B.addCover(x - sn * 0.9, z - cs * 0.9, sn, cs, true);
  };
  P.drum = function (B, x, z, o) {
    const rnd = RNG(((x * 7 + z * 3) | 0) ^ 77);
    const gy = B.h(x, z);
    const col = (o && o.col) || rnd.pick([0x5a6b48, 0x8a4a38, 0x4a5568, 0x6e6152]);
    const tip = o && o.tipped;
    const g = [G.cyl(0.3, 0.3, 0.88, 12, col, tip ? { x, y: gy + 0.3, z, rz: Math.PI / 2, vary: 0.15 } : { x, y: gy + 0.44, z, vary: 0.15 })];
    for (const hy of [-0.28, 0, 0.28])
      g.push(G.torus(0.305, 0.012, 5, 12, adjc(col, 0.8), tip ? { x: x + hy, y: gy + 0.3, z, ry: 0, rz: 0, rx: 0 } : { x, y: gy + 0.44 + hy, z, rx: Math.PI / 2 }));
    B.buckets.std.push(...g);
    B.collide(x, gy + 0.44, z, 0.62, 0.9, 0.62);
    B.addCover(x, z, rnd.spread(1) > 0 ? 1 : -1, rnd.spread(1), true);
  };
  /* explosive red drum — live mesh so it can vanish on detonation */
  P.explosiveBarrel = function (B, x, z, o) {
    const gy = B.h(x, z);
    const body = 0x9a3327, ring = 0x35201a, band = 0xc9a53a, cap = 0x2a1712;
    const g = [G.cyl(0.3, 0.3, 0.88, 14, body, { x, y: gy + 0.44, z, vary: 0.05 })];
    for (const hy of [-0.3, 0.3]) g.push(G.torus(0.305, 0.02, 5, 14, ring, { x, y: gy + 0.44 + hy, z, rx: Math.PI / 2 }));
    g.push(G.cyl(0.307, 0.307, 0.16, 14, band, { x, y: gy + 0.44, z }));         // hazard band
    g.push(G.cyl(0.24, 0.24, 0.05, 12, cap, { x, y: gy + 0.885, z }));           // lid
    g.push(G.cyl(0.06, 0.06, 0.08, 8, cap, { x, y: gy + 0.92, z }));             // bung
    const mesh = RT.meshOf(g, RT.MAT.std);
    B.group.add(mesh);
    const col = B.collide(x, gy + 0.44, z, 0.62, 0.9, 0.62);
    const d = { kind: 'barrel', x, y: gy + 0.5, z, r: 0.5, hp: 26, mesh, col, exploded: false };
    col.barrel = d; col.pen = false;
    B.destructibles.push(d);
    return d;
  };
  /* pop-up steel target (firing range): swings down when hit, resets after a beat */
  P.steelTarget = function (B, x, z, o) {
    o = o || {};
    const gy = B.h(x, z), ry = o.ry || 0, s = o.s || 1;
    const post = 0x4a4c4e, plate = 0xb03a2e;
    B.buckets.std.push(G.cyl(0.04, 0.05, 0.5 * s, 8, post, { x, y: gy + 0.25 * s, z }));   // stand post
    const pivot = new THREE.Group();
    pivot.position.set(x, gy + 0.5 * s, z); pivot.rotation.y = ry;
    const pl = RT.meshOf([
      G.cyl(0.22 * s, 0.22 * s, 0.05, 16, plate, { y: 0.22 * s, rx: Math.PI / 2 }),
      G.torus(0.22 * s, 0.02, 4, 16, 0xe8e2d4, { y: 0.22 * s, rx: 0 }),
      G.cyl(0.07 * s, 0.07 * s, 0.052, 12, 0xe8e2d4, { y: 0.22 * s, rx: Math.PI / 2 }),
    ], RT.MAT.std);
    pivot.add(pl); B.group.add(pivot);
    const col = B.collide(x, gy + 0.5 * s + 0.22 * s, z, 0.44 * s, 0.44 * s, 0.14);
    const d = { kind: 'target', x, y: gy + 0.5 * s + 0.22 * s, z, pivot, col, down: 0, hits: 0 };
    col.target = d;
    (B.targets = B.targets || []).push(d);
    B.destructibles.push(d);
    return d;
  };
  /* breakable window pane — translucent, no collider, shatters when shot */
  P.glassPane = function (B, x, y, z, ry, w, h) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: 0xa8ccd4, transparent: true, opacity: 0.28, roughness: 0.06, metalness: 0.15, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    B.group.add(mesh);
    const hw = w / 2, th = 0.06, cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
    const ex = cs * hw + sn * th, ez = sn * hw + cs * th;
    const d = { kind: 'glass', x, y, z, min: { x: x - ex, y: y - h / 2, z: z - ez }, max: { x: x + ex, y: y + h / 2, z: z + ez }, mesh, broken: false };
    B.destructibles.push(d);
    return d;
  };
  /* framed breakable window (frame boxes + glass pane) at a world position */
  P.window = function (B, x, y, z, ry, w, h, o) {
    const fr = (o && o.frame) || 0x4a4038, T = 0.09, cs = Math.cos(ry), sn = Math.sin(ry);
    const along = (dx) => [x + cs * dx, z - sn * dx];
    const post = (dx, ww, hh) => { const [px, pz] = along(dx); B.buckets.std.push(G.box(ww, hh, T, fr, { x: px, y, z: pz, ry })); };
    post(-w / 2, 0.1, h + 0.16); post(w / 2, 0.1, h + 0.16);         // side posts
    B.buckets.std.push(G.box(w + 0.16, 0.1, T, fr, { x, y: y + h / 2, z, ry }));   // header
    B.buckets.std.push(G.box(w + 0.16, 0.1, T, fr, { x, y: y - h / 2, z, ry }));   // sill
    P.glassPane(B, x, y, z, ry, w - 0.06, h - 0.06);
    return { x, y, z };
  };
  P.crate = function (B, x, z, o) {
    const rnd = RNG(((x * 3 + z * 11) | 0) ^ 55);
    const gy = B.h(x, z);
    const s = (o && o.s) || rnd.range(0.7, 1.1);
    const ry = (o && o.ry) || rnd() * TAU;
    const col = 0x7a6448;
    const g = [G.box(s, s * 0.9, s, col, { x, y: gy + s * 0.45, z, ry, vary: 0.12 })];
    // edge slats
    for (const e of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      g.push(G.box(0.07, s * 0.92, 0.07, adjc(col, 0.75), { x: x + Math.cos(ry) * e[0] * s / 2 + Math.sin(ry) * e[1] * s / 2, y: gy + s * 0.45, z: z - Math.sin(ry) * e[0] * s / 2 + Math.cos(ry) * e[1] * s / 2, ry }));
    g.push(G.box(s * 0.7, 0.04, s * 0.7, adjc(col, 0.85), { x, y: gy + s * 0.92, z, ry: ry + 0.5 }));
    B.buckets.std.push(...g);
    B.collide(x, gy + s * 0.45, z, s, s * 0.9, s);
    B.addCover(x, z, Math.sin(ry), Math.cos(ry), true);
    if (o && o.stack) {
      B.buckets.std.push(G.box(s * 0.75, s * 0.68, s * 0.75, col, { x: x + 0.1, y: gy + s * 0.9 + s * 0.34, z, ry: ry + 0.3, vary: 0.12 }));
      B.collide(x, gy + s * 0.9 + s * 0.35, z, s * 0.75, s * 0.7, s * 0.75);
    }
  };
  P.tires = function (B, x, z) {
    const rnd = RNG(((x * 5 + z * 13) | 0) ^ 44);
    const gy = B.h(x, z);
    const g = [];
    const n = rnd.int(2, 4);
    for (let i = 0; i < n; i++)
      g.push(G.torus(0.3, 0.12, 7, 14, 0x22221f, { x: x + rnd.spread(0.15), y: gy + 0.12 + i * 0.24, z: z + rnd.spread(0.15), rx: Math.PI / 2, ry: rnd() }));
    B.buckets.std.push(...g);
    B.collide(x, gy + 0.4, z, 0.8, 0.9, 0.8);
  };
  P.husk = function (B, x, z, ry) {
    const gy = B.h(x, z);
    const C = 0x3f3a34, C2 = 0x2e2a26;
    const g = [];
    const T = (gg) => { gg.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0)); gg.translate(x, gy, z); return gg; };
    g.push(T(G.box(1.75, 0.5, 4.1, C, { y: 0.62, vary: 0.15 })));                    // body
    g.push(T(G.box(1.6, 0.42, 1.9, C2, { y: 1.05, z: -0.3, vary: 0.15 })));          // cabin (burnt)
    g.push(T(G.box(0.1, 0.3, 1.7, C2, { x: -0.78, y: 1.06, z: -0.3, rz: 0.2 })));
    g.push(T(G.box(0.1, 0.3, 1.7, C2, { x: 0.78, y: 1.06, z: -0.3, rz: -0.2 })));
    g.push(T(G.box(1.7, 0.24, 1.2, C, { y: 0.75, z: 1.6, rx: -0.12 })));             // crumpled hood
    for (const [sx, sz] of [[-0.8, 1.45], [0.8, 1.45], [-0.8, -1.5], [0.8, -1.5]]) {
      g.push(T(G.torus(0.32, 0.1, 6, 12, 0x1d1c1a, { x: sx, y: 0.34, z: sz, ry: Math.PI / 2 })));
    }
    g.push(T(G.cyl(0.05, 0.03, 0.7, 6, C2, { x: -0.5, y: 1.4, z: 1.2, rx: 0.4 })));  // twisted metal
    g.push(T(G.cyl(0.04, 0.02, 0.5, 6, C2, { x: 0.4, y: 1.35, z: 0.9, rz: 0.5 })));
    B.buckets.std.push(...g);
    B.collideRot(x, gy + 0.7, z, 1.9, 1.5, 4.2, ry || 0);
    const sn2 = Math.sin(ry || 0), cs2 = Math.cos(ry || 0);
    B.addCover(x + cs2 * 1.6, z - sn2 * 1.6, -cs2, sn2, true);
    B.addCover(x - cs2 * 1.6, z + sn2 * 1.6, cs2, -sn2, true);
  };
  P.lamp = function (B, x, z, o) {
    const gy = B.h(x, z);
    const g = [G.cyl(0.06, 0.09, 4.6, 8, 0x3a3d40, { x, y: gy + 2.3, z, vary: 0.1 }),
      G.cyl(0.05, 0.06, 1.1, 6, 0x3a3d40, { x: x + 0.5, y: gy + 4.55, z, rz: Math.PI / 2.3 }),
      G.box(0.34, 0.12, 0.2, 0x2e3134, { x: x + 1.0, y: gy + 4.72, z })];
    B.buckets.std.push(...g);
    B.collide(x, gy + 2.3, z, 0.25, 4.6, 0.25);
    if (o && o.lit) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
      bulb.position.set(x + 1.0, gy + 4.64, z);
      B.group.add(bulb);
      const li = new THREE.PointLight(0xffc070, 1.5, 14, 2);
      li.position.set(x + 1.0, gy + 4.5, z);
      B.group.add(li);
    }
  };
  P.sign = function (B, x, z, ry) {
    const gy = B.h(x, z);
    B.buckets.std.push(
      G.cyl(0.04, 0.05, 2.4, 6, 0x5a5f63, { x, y: gy + 1.2, z }),
      G.box(0.9, 0.5, 0.04, 0x8a8578, { x, y: gy + 2.2, z, ry: ry || 0, vary: 0.1 }),
      G.box(0.86, 0.08, 0.05, 0x5a544a, { x, y: gy + 2.28, z, ry: ry || 0 }),
      G.box(0.5, 0.07, 0.05, 0x5a544a, { x, y: gy + 2.12, z, ry: ry || 0 }));
  };
  P.hayBale = function (B, o) {
    const gy = o.y != null ? o.y : B.h(o.x, o.z) + 0.45;
    B.buckets.std.push(G.cyl(0.45, 0.45, 0.85, 12, 0xa89452, { x: o.x, y: gy, z: o.z, rz: Math.PI / 2, ry: o.ry || 0, vary: 0.18 }));
    B.buckets.std.push(G.torus(0.46, 0.015, 4, 12, 0x8a7a42, { x: o.x, y: gy, z: o.z, ry: (o.ry || 0) + Math.PI / 2, rz: 0 }));
    if (o.y == null) {
      B.collide(o.x, gy, o.z, 0.95, 0.9, 0.95);
      B.addCover(o.x, o.z, 1, 0, true);
    }
  };
  P.well = function (B, x, z) {
    const gy = B.h(x, z);
    const g = [G.cylo(0.75, 0.8, 0.9, 12, 0x8a8072, { x, y: gy + 0.45, z, vary: 0.15 })];
    g.push(G.cyl(0.06, 0.06, 2.1, 6, 0x5e4630, { x: x - 0.7, y: gy + 1.0, z }));
    g.push(G.cyl(0.06, 0.06, 2.1, 6, 0x5e4630, { x: x + 0.7, y: gy + 1.0, z }));
    g.push(G.wedge(2.1, 0.55, 1.3, 0x6e4434, { x, y: gy + 2.05, z }));
    g.push(G.cyl(0.04, 0.04, 1.3, 6, 0x4a3826, { x, y: gy + 1.6, z, rz: Math.PI / 2 }));
    g.push(G.box(0.22, 0.25, 0.22, 0x6b5a42, { x, y: gy + 1.1, z }));
    B.buckets.std.push(...g);
    B.collide(x, gy + 0.5, z, 1.7, 1, 1.7);
    B.addCover(x, z, 0, 1, true);
  };
  /* water tower: navigation landmark visible across the map */
  P.waterTower = function (B, x, z) {
    const gy = B.h(x, z);
    const g = [];
    const H = 9, tankR = 2.2, tankH = 3;
    for (const [sx, sz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
      g.push(G.box(0.22, H, 0.22, 0x5a4a38, { x: x + sx * 0.8, y: gy + H / 2, z: z + sz * 0.8, rx: sz * 0.09, rz: -sx * 0.09, vary: 0.12 }));
    }
    for (let lv = 0; lv < 3; lv++) {
      const yy = gy + 2 + lv * 2.6, sp = 1.0 + (1 - lv / 3) * 0.32;
      g.push(G.box(0.1, 0.12, sp * 2.4, 0x4a3c2c, { x: x - sp, y: yy, z, vary: 0.15 }));
      g.push(G.box(0.1, 0.12, sp * 2.4, 0x4a3c2c, { x: x + sp, y: yy, z, vary: 0.15 }));
      g.push(G.box(sp * 2.4, 0.12, 0.1, 0x4a3c2c, { x, y: yy, z: z - sp, vary: 0.15 }));
      g.push(G.box(sp * 2.4, 0.12, 0.1, 0x4a3c2c, { x, y: yy, z: z + sp, vary: 0.15 }));
    }
    g.push(G.cyl(tankR, tankR * 0.92, tankH, 14, 0x6e5a44, { x, y: gy + H + tankH / 2 - 0.4, z, vary: 0.1 }));
    for (const hy of [-1, 0, 1])
      g.push(G.torus(tankR + 0.03, 0.05, 5, 16, 0x3f352a, { x, y: gy + H + tankH / 2 - 0.4 + hy, z, rx: Math.PI / 2 }));
    g.push(G.cone(tankR * 1.12, 1.3, 14, 0x53422f, { x, y: gy + H + tankH + 0.75, z, vary: 0.1 }));
    for (let i = 0; i < 7; i++) g.push(G.box(0.5, 0.06, 0.06, 0x4a3c2c, { x: x + 1.15, y: gy + 1.2 + i * 1.15, z: z + 0.2 }));
    B.buckets.std.push(...g);
    B.collide(x, gy + H / 2, z, 2.6, H + tankH, 2.6);
    B.addCover(x - 1.8, z, 1, 0, false);
    return { gy };
  };
  /* smoke column: navigation beacon (burning wreck etc.) */
  P.smokeColumn = function (B, x, z, y) {
    (RT.map.smokeSources = RT.map.smokeSources || []).push({ x, y: y != null ? y : B.h(x, z) + 0.8, z, t: 0 });
  };

  P.waterPump = function (B, x, z) {
    const gy = B.h(x, z);
    B.buckets.std.push(
      G.cyl(0.09, 0.11, 1.1, 8, 0x3f5545, { x, y: gy + 0.55, z, vary: 0.1 }),
      G.cyl(0.05, 0.05, 0.4, 6, 0x3f5545, { x: x + 0.18, y: gy + 0.95, z, rz: Math.PI / 2 }),
      G.box(0.5, 0.05, 0.07, 0x2e4034, { x: x - 0.2, y: gy + 1.18, z, rz: 0.35 }),
      G.box(0.5, 0.3, 0.5, 0x8a8072, { x, y: gy + 0.06, z }));
    B.collide(x, gy + 0.5, z, 0.4, 1.1, 0.4);
  };
  /* ---------- trees: 3 species, multi-blob canopies, root flare ---------- */
  function icoBlob(r, c, o, mul) {
    const geo = new THREE.IcosahedronGeometry(r, 0);
    const g = geo.toNonIndexed();
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    const cc = new THREE.Color(c).multiplyScalar(mul || 1).convertSRGBToLinear();
    for (let i = 0; i < n; i++) {
      const vr = 0.86 + ((i * 61) % 23) / 80;
      cols[i * 3] = cc.r * vr; cols[i * 3 + 1] = cc.g * vr; cols[i * 3 + 2] = cc.b * vr;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Matrix4();
    const e = new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0);
    m.makeRotationFromEuler(e);
    m.setPosition(o.x || 0, o.y || 0, o.z || 0);
    const sc = new THREE.Matrix4().makeScale(o.sx || 1, o.sy || 1, o.sz || 1);
    g.applyMatrix4(sc).applyMatrix4(m);
    return g;
  }
  P.tree = function (B, x, z, o) {
    o = o || {};
    const rnd = RNG(((x * 17 + z * 23) | 0) ^ 3);
    const gy = B.h(x, z);
    const s = o.s || rnd.range(0.8, 1.4);
    const species = o.species || (rnd() < 0.55 ? 'oak' : (rnd() < 0.72 ? 'pine' : 'sapling'));
    const trunkC = species === 'pine' ? 0x4a382a : 0x584434;
    const g = [];
    if (species === 'oak') {
      const leafC = o.leafC || rnd.pick([0x4a5d2e, 0x556635, 0x3f5229, 0x5d6b30]);
      // tapered, slightly bent trunk + root flare + branch stubs
      g.push(G.loft([
        { y: 0, rx: 0.26 * s, rz: 0.26 * s },
        { y: 0.5 * s, rx: 0.17 * s, rz: 0.17 * s, x: 0.03 * s },
        { y: 1.4 * s, rx: 0.135 * s, rz: 0.135 * s, x: 0.09 * s },
        { y: 2.6 * s, rx: 0.1 * s, rz: 0.1 * s, x: 0.16 * s },
      ], 8, trunkC, { x, y: gy, z, vary: 0.15 }));
      for (let i = 0; i < 4; i++) {  // root flare
        const a = i / 4 * TAU + rnd();
        g.push(G.wedge(0.16 * s, 0.3 * s, 0.5 * s, adjc(trunkC, 0.9), { x: x + Math.cos(a) * 0.22 * s, y: gy, z: z + Math.sin(a) * 0.22 * s, ry: -a + Math.PI / 2, vary: 0.15 }));
      }
      for (const [bx, by, ang] of [[0.4, 2.2, -0.8], [-0.35, 2.5, 0.9]])
        g.push(G.cyl(0.045 * s, 0.075 * s, 1.1 * s, 6, trunkC, { x: x + bx * s * 0.6, y: gy + by * s, z: z + rnd.spread(0.2), rz: ang, vary: 0.15 }));
      // canopy: 6-9 irregular blobs, darker low/inner, lighter sun-side
      const lobes = rnd.int(6, 9);
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * TAU + rnd.spread(0.6);
        const rr = rnd.range(0.55, 0.95) * s;
        const lx = Math.cos(a) * rnd.range(0.5, 0.95) * s, lz = Math.sin(a) * rnd.range(0.5, 0.95) * s;
        const ly = (3.0 + rnd.spread(0.55)) * s;
        const mul = 0.78 + (ly - 2.6 * s) / (1.4 * s) * 0.3 + (lx + lz) * 0.04;
        g.push(icoBlob(rr, leafC, {
          x: x + lx, y: gy + ly, z: z + lz,
          sx: rnd.range(0.85, 1.25), sy: rnd.range(0.6, 0.85), sz: rnd.range(0.85, 1.25),
          rx: rnd() * 3, ry: rnd() * 3, rz: rnd() * 3,
        }, mul));
      }
      g.push(icoBlob(0.85 * s, leafC, { x, y: gy + 3.75 * s, z, sy: 0.7, ry: rnd() * 3 }, 1.22));
    } else if (species === 'pine') {
      const leafC = o.leafC || rnd.pick([0x2e4426, 0x35502c, 0x2a3d22]);
      g.push(G.loft([
        { y: 0, rx: 0.2 * s, rz: 0.2 * s },
        { y: 1.2 * s, rx: 0.12 * s, rz: 0.12 * s, x: 0.02 * s },
        { y: 3.4 * s, rx: 0.06 * s, rz: 0.06 * s, x: 0.05 * s },
      ], 7, trunkC, { x, y: gy, z, vary: 0.15 }));
      const tiers = rnd.int(3, 4);
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        g.push(G.cone((1.35 - t * 0.85) * s, (1.5 - t * 0.35) * s, 8, adjc(leafC, 0.85 + t * 0.35), {
          x: x + rnd.spread(0.05), y: gy + (1.5 + i * 1.05) * s, z: z + rnd.spread(0.05), vary: 0.18,
        }));
      }
      g.push(G.cone(0.32 * s, 0.85 * s, 7, adjc(leafC, 1.25), { x, y: gy + (1.5 + tiers * 1.05) * s, z, vary: 0.15 }));
    } else { // sapling
      const leafC = o.leafC || 0x5d6b30;
      g.push(G.cyl(0.035 * s, 0.06 * s, 1.9 * s, 6, trunkC, { x, y: gy + 0.95 * s, z, rz: rnd.spread(0.08), vary: 0.15 }));
      g.push(icoBlob(0.42 * s, leafC, { x: x + 0.05, y: gy + 2.1 * s, z, sy: 0.85, ry: rnd() * 3 }, 1.05));
      g.push(icoBlob(0.3 * s, leafC, { x: x - 0.18 * s, y: gy + 1.7 * s, z: z + 0.12 * s, sy: 0.8, ry: rnd() }, 0.85));
    }
    B.buckets.std.push(...g);
    B.collide(x, gy + 1.4, z, 0.5, 2.8 * s, 0.5);
  };
  P.bush = function (B, x, z, o) {
    const rnd = RNG(((x * 41 + z * 13) | 0) ^ 6);
    const gy = B.h(x, z);
    const s = (o && o.s) || rnd.range(0.7, 1.2);
    const leafC = (o && o.leafC) || rnd.pick([0x46542a, 0x51602f, 0x3d4a26]);
    const n = rnd.int(2, 3);
    const g = [];
    for (let i = 0; i < n; i++) {
      g.push(icoBlob(rnd.range(0.35, 0.6) * s, leafC, {
        x: x + rnd.spread(0.4) * s, y: gy + 0.32 * s + rnd.spread(0.1), z: z + rnd.spread(0.4) * s,
        sy: rnd.range(0.55, 0.75), rx: rnd() * 3, ry: rnd() * 3,
      }, 0.85 + i * 0.18));
    }
    B.buckets.std.push(...g);
  };
  /* treeline ring boundary + interior copses */
  P.edgeForest = function (B, count, rMin, rMax, opts) {
    const rnd = RNG(5150);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rnd.spread(0.1);
      const r = rnd.range(rMin, rMax);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (opts && opts.skip && opts.skip(x, z)) continue;
      const [gx, gz] = B.terrain._worldToGrid(x, z);
      if (B.terrain.roadCells && B.terrain.roadCells.has(B.terrain._idx(Math.round(gx), Math.round(gz)))) continue;
      P.tree(B, x, z, { s: rnd.range(0.9, 1.6), species: opts && opts.species });
      if (rnd.chance(0.4)) P.bush(B, x + rnd.spread(3), z + rnd.spread(3), {});
    }
  };
  P.copse = function (B, cx, cz, n, spread) {
    const rnd = RNG(((cx * 3 + cz * 7) | 0) ^ 21);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, r = rnd() * spread;
      P.tree(B, cx + Math.cos(a) * r, cz + Math.sin(a) * r, { s: rnd.range(0.8, 1.4) });
    }
    for (let i = 0; i < Math.ceil(n / 2); i++) P.bush(B, cx + rnd.spread(spread * 1.2), cz + rnd.spread(spread * 1.2), {});
  };
  /* ---- instanced solid-3D forest: dense, dark, gritty, never culls ---- */
  function treeInstGeo(kind, rnd) {
    const g = [];
    if (kind === 'pine') {
      const bark = 0x33261b, nd = rnd.pick([0x223318, 0x28401d, 0x1c2c14]);
      g.push(G.cyl(0.13, 0.22, 3.6, 6, bark, { y: 1.8, vary: 0.2 }));
      const tiers = 5;
      for (let i = 0; i < tiers; i++) { const t = i / tiers; g.push(G.cone((1.75 - t * 1.2), (1.55 - t * 0.16), 7, adjc(nd, 0.78 + t * 0.42), { y: 1.5 + i * 0.85, vary: 0.22 })); }
      g.push(G.cone(0.3, 0.85, 6, adjc(nd, 1.3), { y: 1.5 + tiers * 0.85, vary: 0.2 }));
    } else {
      const bark = 0x352819, lf = rnd.pick([0x2a3a1c, 0x32421d, 0x243214, 0x374826]);
      g.push(G.loft([{ y: 0, rx: 0.3, rz: 0.3 }, { y: 1.0, rx: 0.19, rz: 0.19 }, { y: 2.5, rx: 0.12, rz: 0.12, x: 0.1 }], 7, bark, { vary: 0.2 }));
      for (const [a, by] of [[0.5, 1.9], [2.3, 2.2], [4.1, 2.0], [5.5, 1.7]])
        g.push(G.cyl(0.05, 0.09, 1.35, 5, bark, { x: Math.cos(a) * 0.35, y: by, z: Math.sin(a) * 0.35, rz: Math.cos(a) * 0.8, rx: -Math.sin(a) * 0.8, vary: 0.2 }));
      const lobes = 7;
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * TAU + rnd.spread(0.5), rr = 0.98 + rnd() * 0.55;
        g.push(icoBlob(rr, lf, { x: Math.cos(a) * 1.08, y: 3.3 + rnd.spread(0.7), z: Math.sin(a) * 1.08, sy: 0.82, rx: rnd() * 3, ry: rnd() * 3 }, 0.78 + rnd() * 0.32));
      }
      g.push(icoBlob(1.3, lf, { y: 4.2, sy: 0.75 }, 1.15));
    }
    const merged = RT.mergeGeos(g);
    merged.deleteAttribute('uv');       // instanced tree material has no map → drop the uv dependency
    merged.computeVertexNormals();
    return merged;
  }
  let _treeMat = null;
  function treeMat() { return _treeMat || (_treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0.0 })); }
  /* opts: { seed, clusters:[{x,z,r,n}], scatter, skip(x,z), collide:[{x,z,r}], collideMax } */
  P.forest = function (B, opts) {
    opts = opts || {};
    const rnd = RNG(opts.seed || 4242);
    const half = B.terrain.size / 2 - 8;
    const variants = [treeInstGeo('oak', rnd), treeInstGeo('pine', rnd), treeInstGeo('oak', rnd), treeInstGeo('pine', rnd)];
    const positions = [];
    for (const cl of (opts.clusters || [])) {
      for (let i = 0; i < (cl.n || 200); i++) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * cl.r;
        const x = cl.x + Math.cos(a) * r, z = cl.z + Math.sin(a) * r;
        if (Math.abs(x) > half || Math.abs(z) > half) continue;
        if (opts.skip && opts.skip(x, z)) continue;
        positions.push([x, z, 0.9 + rnd() * 0.8]);
      }
    }
    for (let i = 0; i < (opts.scatter || 0); i++) {
      const x = rnd.spread(half), z = rnd.spread(half);
      if (opts.skip && opts.skip(x, z)) continue;
      const gi = B.terrain._idx ? B.terrain._idx(...B.terrain._worldToGrid(x, z).map(Math.round)) : -1;
      if (B.terrain.roadCells && B.terrain.roadCells.has(gi)) continue;
      if (B.terrain.waterCells && B.terrain.waterCells.has(gi)) continue;
      positions.push([x, z, 0.85 + rnd() * 0.9]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const buckets = variants.map(() => []);
    for (const p of positions) buckets[rnd.int(0, variants.length - 1)].push(p);
    variants.forEach((geo, vi) => {
      const pts = buckets[vi]; if (!pts.length) return;
      const im = new THREE.InstancedMesh(geo, treeMat(), pts.length);
      im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
      let idx = 0;
      for (const [x, z, s] of pts) {
        v.set(x, B.h(x, z) - 0.1, z);
        e.set(0, rnd() * TAU, rnd.spread(0.05)); q.setFromEuler(e);
        sc.set(s * (0.9 + rnd() * 0.3), s * (0.95 + rnd() * 0.4), s * (0.9 + rnd() * 0.3));
        m4.compose(v, q, sc); im.setMatrixAt(idx, m4);
        col.setScalar(0.72 + rnd() * 0.5); im.setColorAt(idx, col);
        idx++;
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      B.group.add(im);
    });
    /* trunk colliders in the requested zones (capped so collision stays cheap) */
    let added = 0; const cap = opts.collideMax || 500;
    if (opts.collide) for (const p of positions) {
      if (added >= cap) break;
      for (const z2 of opts.collide) { if (Math.hypot(p[0] - z2.x, p[1] - z2.z) < z2.r) { B.collide(p[0], B.h(p[0], p[1]) + 1.4, p[1], 0.55, 3.0, 0.55); added++; break; } }
    }
    return positions.length;
  };
  P.deadTree = function (B, x, z) {
    const rnd = RNG(((x * 29 + z * 31) | 0) ^ 9);
    const gy = B.h(x, z);
    const g = [G.cyl(0.1, 0.2, 3.4, 7, 0x4a423a, { x, y: gy + 1.7, z, rz: rnd.spread(0.1), vary: 0.2 })];
    for (let i = 0; i < 3; i++) {
      const a = rnd() * TAU;
      g.push(G.cyl(0.03, 0.07, rnd.range(1, 1.8), 5, 0x443c34, {
        x: x + Math.cos(a) * 0.4, y: gy + rnd.range(2, 3.2), z: z + Math.sin(a) * 0.4,
        rz: rnd.spread(1.2), rx: rnd.spread(1.2), vary: 0.2,
      }));
    }
    B.buckets.std.push(...g);
    B.collide(x, gy + 1.7, z, 0.4, 3.4, 0.4);
  };

  /* ---------- bridge over gorge (mission 3) ---------- */
  P.bridge = function (B, o) {
    // deck along z from z0 to z1 at height y, width w
    const { x, z0, z1, y, w } = o;
    const len = z1 - z0, zc = (z0 + z1) / 2;
    const g = [];
    const cg = [];  // center-span bucket (separate mesh so a cutscene can drop it)
    const cz0 = zc - len / 6, cz1 = zc + len / 6;
    const inCenter = (z) => o.centerSpan && z > cz0 && z < cz1;
    const push = (geo, z) => (inCenter(z) ? cg : g).push(geo);
    const deckC = 0x6e6a60, steelC = 0x4a4e55, railC = 0x3c4046;
    // deck in three sections so the middle can detach
    g.push(G.box(w, 0.35, cz0 - z0, deckC, { x, y: y - 0.18, z: (z0 + cz0) / 2, vary: 0.08 }));
    cg.push(G.box(w, 0.35, cz1 - cz0, deckC, { x, y: y - 0.18, z: zc, vary: 0.08 }));
    g.push(G.box(w, 0.35, z1 - cz1, deckC, { x, y: y - 0.18, z: (cz1 + z1) / 2, vary: 0.08 }));
    // deck planks
    for (let i = 0; i < Math.floor(len / 2.2); i++) {
      const pz = z0 + 1 + i * 2.2;
      push(G.box(w + 0.15, 0.05, 0.16, adjc(deckC, 0.8), { x, y: y + 0.02, z: pz }), pz);
    }
    // side trusses: posts + diagonals + top chord
    for (const s of [-1, 1]) {
      const tx = x + s * (w / 2 - 0.1);
      g.push(G.box(0.16, 0.14, cz0 - z0, steelC, { x: tx, y: y + 1.35, z: (z0 + cz0) / 2 }));
      cg.push(G.box(0.16, 0.14, cz1 - cz0, steelC, { x: tx, y: y + 1.35, z: zc }));
      g.push(G.box(0.16, 0.14, z1 - cz1, steelC, { x: tx, y: y + 1.35, z: (cz1 + z1) / 2 }));
      for (let i = 0; i <= Math.floor(len / 4); i++) {
        const pz = Math.min(z0 + i * 4, z1);
        push(G.box(0.14, 1.45, 0.14, steelC, { x: tx, y: y + 0.68, z: pz }), pz);
        if (z0 + i * 4 + 4 <= z1)
          push(G.box(0.1, 0.1, 4.35, steelC, { x: tx, y: y + 0.68, z: z0 + i * 4 + 2, rx: (i % 2 ? -1 : 1) * 0.34 }), z0 + i * 4 + 2);
      }
      // guard rail
      g.push(G.box(0.06, 0.05, len, railC, { x: tx, y: y + 0.95, z: zc }));
    }
    // piers down to the gorge floor
    const nP = Math.max(2, Math.floor(len / 18));
    for (let i = 0; i < nP; i++) {
      const pz = z0 + (i + 0.5) * len / nP;
      const gy = B.h(x, pz);
      const ph = y - gy;
      if (ph > 1) {
        g.push(G.box(w * 0.5, ph, 1.6, 0x7a756a, { x, y: gy + ph / 2 - 0.2, z: pz, vary: 0.12 }));
        g.push(G.box(w * 0.62, 0.5, 2, 0x6a655c, { x, y: gy + 0.3, z: pz, vary: 0.12 }));
      }
    }
    B.buckets.std.push(...g);
    B.platform(x - w / 2, z0, x + w / 2, z1, y + 0.02);
    // truss colliders (block walking off the sides)
    B.collide(x - w / 2 + 0.1, y + 0.8, zc, 0.25, 1.8, len);
    B.collide(x + w / 2 - 0.1, y + 0.8, zc, 0.25, 1.8, len);
    let centerMesh = null;
    if (o.centerSpan) {
      centerMesh = RT.meshOf(RT.mergeGeos(cg), RT.MAT.std);
      B.group.add(centerMesh);
    }
    return { zc, centerMesh };
  };

  /* ---------- fortress stone wall segment ---------- */
  P.stoneWall = function (B, x0, z0, x1, z1, h, opts) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const gy = Math.min(B.h(x0, z0), B.h(x1, z1));
    const g = [];
    const c = (opts && opts.c) || 0x6e6a60;
    g.push(G.box(1.1, h, len, c, { x: cx, y: gy + h / 2, z: cz, ry, vary: 0.13 }));
    // crenellation
    const nC = Math.floor(len / 1.6);
    for (let i = 0; i < nC; i++) {
      if (i % 2) continue;
      const t = (i + 0.5) / nC - 0.5;
      g.push(G.box(1.2, 0.55, 0.8, adjc(c, 0.88), {
        x: cx + Math.sin(ry) * t * len, y: gy + h + 0.26, z: cz + Math.cos(ry) * t * len, ry, vary: 0.12,
      }));
    }
    // base skirt
    g.push(G.box(1.5, 0.8, len, adjc(c, 0.8), { x: cx, y: gy + 0.3, z: cz, ry, vary: 0.15 }));
    B.buckets.std.push(...g);
    B.collideRot(cx, gy + h / 2, cz, 1.15, h + 0.8, len, ry + Math.PI / 2);
    return { gy };
  };

  /* ---------- MG nest: sandbag ring + tripod gun ---------- */
  P.mgNest = function (B, x, z, faceRy) {
    const gy = B.h(x, z);
    P.sandbags(B, x + Math.sin(faceRy) * 1.2, z + Math.cos(faceRy) * 1.2, faceRy + Math.PI / 2, 3.6, { rows: 3 });
    P.sandbags(B, x + Math.sin(faceRy + 1.1) * 1.5, z + Math.cos(faceRy + 1.1) * 1.5, faceRy + Math.PI / 2 + 1.1, 2.4, { rows: 2 });
    P.sandbags(B, x + Math.sin(faceRy - 1.1) * 1.5, z + Math.cos(faceRy - 1.1) * 1.5, faceRy + Math.PI / 2 - 1.1, 2.4, { rows: 2 });
    const g = [];
    const T = (gg) => { gg.applyMatrix4(new THREE.Matrix4().makeRotationY(faceRy)); gg.translate(x, gy, z); return gg; };
    g.push(T(G.cyl(0.03, 0.03, 0.9, 6, 0x2e3134, { y: 0.55, rx: 0.5 })));
    g.push(T(G.cyl(0.03, 0.03, 0.9, 6, 0x2e3134, { y: 0.55, rx: 0.5, rz: 2.1 })));
    g.push(T(G.cyl(0.03, 0.03, 0.9, 6, 0x2e3134, { y: 0.55, rx: 0.5, rz: -2.1 })));
    g.push(T(G.cbox(0.09, 0.14, 0.9, 0.02, 0x33363a, { y: 0.98, z: 0.1 })));
    g.push(T(G.cyl(0.022, 0.022, 0.75, 8, 0x26282c, { y: 1.0, z: 0.72, rx: Math.PI / 2 })));
    g.push(T(G.box(0.02, 0.08, 0.5, 0x26282c, { x: 0.0, y: 1.06, z: 0.5, rx: 0 })));
    g.push(T(G.cbox(0.16, 0.18, 0.22, 0.02, 0x3a3e30, { x: -0.14, y: 0.98, z: 0.02 })));
    B.buckets.std.push(...g);
    B.addCover(x, z, Math.sin(faceRy), Math.cos(faceRy), true);
    return { gy, gunY: gy + 1.0 };
  };

  /* ---------- urban ruin block: flat-roof shell, collapsed sections ---------- */
  P.ruinBlock = function (B, o) {
    const rnd = RNG((o.seed || (o.x * 7 + o.z * 3)) | 0);
    const w = o.w || 10, d = o.d || 8, H = o.h || 6;
    const gy = B._flattenFor(o, w, d);
    const c = o.c != null ? o.c : rnd.pick([0x8d8578, 0x9a8f7d, 0x7d766a]);
    const T = 0.3;
    const geos = [];
    const wb = (lx, ly, lz, ww, hh, dd, col) => geos.push(G.box(ww, hh, dd, col || c, { x: lx, y: ly, z: lz, vary: 0.12 }));
    const cs = Math.cos(o.ry || 0), sn = Math.sin(o.ry || 0);
    const L2W = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
    const solid = (lx, ly, lz, ww, hh, dd) => { const [wx, wz] = L2W(lx, lz); B.collideRot(wx, gy + ly, wz, ww, hh, dd, o.ry || 0); };
    /* four walls with big window grid + one collapsed corner */
    for (const [axis, sign] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      const len = axis === 'x' ? w : d;
      const off = (axis === 'x' ? d : w) / 2 - T / 2;
      const collapsed = o.damage && axis === 'x' && sign === 1;
      const floors = Math.floor(H / 3);
      for (let f = 0; f < floors; f++) {
        const y0 = f * 3;
        const hFrac = collapsed && f === floors - 1 ? 0.4 : 1;
        // spandrel
        if (axis === 'x') { wb(collapsed && f === floors - 1 ? -len * 0.2 : 0, y0 + 0.5, off * sign, len * (collapsed && f === floors - 1 ? 0.6 : 1), 1, T); }
        else wb(off * sign, y0 + 0.5, 0, T, 1, len);
        // columns + lintel band
        const nW = Math.floor(len / 2.4);
        for (let k = 0; k <= nW; k++) {
          const wx = (k / nW - 0.5) * (len - 0.7);
          if (collapsed && f === floors - 1 && wx > 0) continue;
          if (axis === 'x') wb(wx, y0 + 1.75, off * sign, 0.5, 1.5, T);
          else wb(off * sign, y0 + 1.75, wx, T, 1.5, 0.5);
        }
        if (axis === 'x') { if (!(collapsed && f === floors - 1)) wb(0, y0 + 2.75, off * sign, len, 0.5, T); }
        else wb(off * sign, y0 + 2.75, 0, T, 0.5, len);
        if (hFrac === 1) solid(axis === 'x' ? 0 : off * sign, y0 + 1.5, axis === 'x' ? off * sign : 0, axis === 'x' ? len : T, 3, axis === 'x' ? T : len);
        else solid(axis === 'x' ? -len * 0.2 : off * sign, y0 + 0.7, axis === 'x' ? off * sign : 0, axis === 'x' ? len * 0.6 : T, 1.4, axis === 'x' ? T : len);
      }
    }
    /* floor slabs */
    wb(0, 0.08, 0, w - 0.2, 0.16, d - 0.2, 0x6a655c);
    B.platform(...(() => { const [ax, az] = L2W(-w / 2, -d / 2); const [bx, bz] = L2W(w / 2, d / 2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + 0.16);
    if (!o.noRoof) {
      wb(0, H + 0.05, 0, w + 0.4, 0.25, d + 0.4, adjc(c, 0.85));
      solid(0, H + 0.05, 0, w + 0.4, 0.25, d + 0.4);
    }
    /* interior clutter + rubble spill */
    const fm = new THREE.Matrix4().makeRotationY(o.ry || 0);
    fm.setPosition(o.x, gy, o.z);
    for (const gg of geos) gg.applyMatrix4(fm);
    B.buckets.std.push(...geos);
    if (o.damage) {
      const [rx, rz] = L2W(w * 0.4, d * 0.55);
      P.rubble(B, { x: rx, z: rz, r: 2.8, seed: rnd.int(0, 99) });
    }
    P.cabinetFallen(B, ...L2W(rnd.range(-w / 4, w / 4), rnd.range(-d / 4, d / 4)), gy, rnd() * 3, rnd);
    return { gy, L2W };
  };

  /* ---------- command bunker (mission 5) ---------- */
  P.bunker = function (B, o) {
    const w = 12, d = 9, H = 3.2, T = 0.5;
    const gy = B._flattenFor(o, w + 2, d + 2);
    const c = 0x5f6058;
    const geos = [];
    const wb = (lx, ly, lz, ww, hh, dd, col) => geos.push(G.box(ww, hh, dd, col || c, { x: lx, y: ly, z: lz, vary: 0.1 }));
    const cs = Math.cos(o.ry || 0), sn = Math.sin(o.ry || 0);
    const L2W = (lx, lz) => [o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs];
    const solid = (lx, ly, lz, ww, hh, dd) => { const [wx, wz] = L2W(lx, lz); B.collideRot(wx, gy + ly, wz, ww, hh, dd, o.ry || 0); };
    /* front wall with door gap + firing slits */
    wb(-w / 4 - 0.55, H / 2, d / 2 - T / 2, w / 2 - 1.1, H, T); solid(-w / 4 - 0.55, H / 2, d / 2 - T / 2, w / 2 - 1.1, H, T);
    wb(w / 4 + 0.55, H / 2, d / 2 - T / 2, w / 2 - 1.1, H, T); solid(w / 4 + 0.55, H / 2, d / 2 - T / 2, w / 2 - 1.1, H, T);
    wb(0, H - 0.35, d / 2 - T / 2, 1.2, 0.7, T);
    /* side + back walls with slits */
    for (const s of [-1, 1]) {
      wb(s * (w / 2 - T / 2), H / 2, 0, T, H, d); solid(s * (w / 2 - T / 2), H / 2, 0, T, H, d);
      wb(s * (w / 2 - T / 2 - 0.02), 1.7, 0, T + 0.1, 0.35, 1.6, 0x14161a);
    }
    wb(0, H / 2, -d / 2 + T / 2, w, H, T); solid(0, H / 2, -d / 2 + T / 2, w, H, T);
    /* heavy roof slab + antenna mast */
    wb(0, H + 0.3, 0, w + 1.2, 0.65, d + 1.2, adjc(c, 0.85)); solid(0, H + 0.3, 0, w + 1.2, 0.65, d + 1.2);
    geos.push(G.cyl(0.05, 0.07, 4.5, 6, 0x3a3d40, { x: -w / 3, y: H + 2.8, z: -d / 4 }));
    geos.push(G.box(0.7, 0.06, 0.06, 0x3a3d40, { x: -w / 3, y: H + 4.2, z: -d / 4 }));
    /* interior: map table, radio rack, crates, lamp glow */
    wb(0, 0.06, 0, w - T * 2, 0.12, d - T * 2, 0x4c4c46);
    B.platform(...(() => { const [ax, az] = L2W(-w / 2, -d / 2); const [bx, bz] = L2W(w / 2, d / 2); return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)]; })(), gy + 0.12);
    const fm = new THREE.Matrix4().makeRotationY(o.ry || 0);
    fm.setPosition(o.x, gy, o.z);
    for (const gg of geos) gg.applyMatrix4(fm);
    B.buckets.std.push(...geos);
    P.table(B, ...L2W(-1.5, -1), gy, o.ry || 0, RNG(9));
    P.shelf(B, ...L2W(w / 2 - 1, -d / 2 + 1.4), gy, (o.ry || 0) + Math.PI / 2, RNG(10));
    P.crate(B, ...L2W(2.5, -2.2), { s: 0.9 });
    const glow = new THREE.PointLight(0xffb060, 1.1, 9, 2);
    const [lx2, lz2] = L2W(0, 0);
    glow.position.set(lx2, gy + 2.4, lz2);
    B.group.add(glow);
    return { gy, L2W };
  };

  /* window glow plane (night missions) */
  P.windowGlow = function (B, x, y, z, ry, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 1.0, h || 1.1),
      new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    B.group.add(m);
  };

  /* instanced vegetation & rocks */
  /* build one grass tuft: n bent tapered blades, dark root → light tip */
  function tuftGeo(nBlades, rnd) {
    const pos = [], col = [];
    for (let b = 0; b < nBlades; b++) {
      const a = (b / nBlades) * TAU + rnd.spread(0.5);
      const dx = Math.cos(a), dz = Math.sin(a);
      const w = 0.016 + rnd() * 0.014, h = 0.3 + rnd() * 0.24;
      const lean = 0.1 + rnd() * 0.16;
      const px = -dz, pz = dx; // blade width axis
      const bx = dx * 0.05, bz = dz * 0.05; // base offset from tuft center
      // two stacked quads (4 tris) per blade with a mid bend
      const midX = bx + dx * lean * 0.4, midY = h * 0.55, midZ = bz + dz * lean * 0.4;
      const tipX = bx + dx * lean, tipY = h, tipZ = bz + dz * lean;
      const quad = (x0, y0, z0, w0, x1, y1, z1, w1, c0, c1) => {
        pos.push(x0 - px * w0, y0, z0 - pz * w0, x0 + px * w0, y0, z0 + pz * w0, x1 + px * w1, y1, z1 + pz * w1);
        pos.push(x0 - px * w0, y0, z0 - pz * w0, x1 + px * w1, y1, z1 + pz * w1, x1 - px * w1, y1, z1 - pz * w1);
        for (let k = 0; k < 3; k++) col.push(k < 2 ? c0 : c1);
        for (let k = 0; k < 3; k++) col.push(k === 0 ? c0 : c1);
      };
      quad(bx, 0, bz, w, midX, midY, midZ, w * 0.6, 0.5, 0.95);
      quad(midX, midY, midZ, w * 0.6, tipX, tipY, tipZ, 0.004, 0.95, 1.3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    const cols = new Float32Array(col.length * 3);
    for (let i = 0; i < col.length; i++) { cols[i * 3] = col[i]; cols[i * 3 + 1] = col[i]; cols[i * 3 + 2] = col[i]; }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }
  function windMaterial(opts) {
    const mat = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, opts));
    mat.userData.uTime = { value: 0 };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = mat.userData.uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '#ifdef USE_INSTANCING\n' +
        'float wPh = instanceMatrix[3][0] * 0.8 + instanceMatrix[3][2] * 1.1;\n' +
        'transformed.x += sin(uTime * 1.9 + wPh) * position.y * 0.22;\n' +
        'transformed.z += cos(uTime * 1.4 + wPh * 1.3) * position.y * 0.13;\n' +
        '#endif');
    };
    (RT.windMats = RT.windMats || []).push(mat);
    return mat;
  }
  function scatterPositions(B, count, area, rnd, densityNoise) {
    const out = [];
    let tries = 0;
    while (out.length < count && tries < count * 4) {
      tries++;
      const x = rnd.spread(area), z = rnd.spread(area);
      if (densityNoise && RT.fbm(x * 0.02 + 31, z * 0.02 + 7, 2, 2, 0.5) < densityNoise) continue;
      const [gx, gz] = B.terrain._worldToGrid(x, z);
      const gi = B.terrain._idx(Math.round(gx), Math.round(gz));
      if (B.terrain.waterCells && B.terrain.waterCells.has(gi)) continue;
      if (B.terrain.roadCells && B.terrain.roadCells.has(gi)) continue;
      out.push([x, z]);
    }
    return out;
  }
  P.scatterGrass = function (B, count, area, palette) {
    const rnd = RNG(999);
    const variants = [tuftGeo(5, rnd), tuftGeo(7, rnd), tuftGeo(4, rnd)];
    const per = Math.ceil(count / variants.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const c = new THREE.Color();
    const base = new THREE.Color(palette || 0x5d6b38);
    for (const geo of variants) {
      const mat = windMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const im = new THREE.InstancedMesh(geo, mat, per);
      const pts = scatterPositions(B, per, area, rnd, -0.28); // noise-based density (fields thick, patches bare)
      let idx = 0;
      for (const [x, z] of pts) {
        const gy = B.h(x, z);
        const s = rnd.range(0.7, 1.4);
        e.set(rnd.spread(0.1), rnd() * TAU, rnd.spread(0.1)); q.setFromEuler(e);
        v.set(x, gy - 0.015, z); sc.set(s, s * rnd.range(0.75, 1.2), s);
        m4.compose(v, q, sc);
        im.setMatrixAt(idx, m4);
        c.copy(base).multiplyScalar(rnd.range(0.85, 1.35));
        c.g *= rnd.range(0.95, 1.12);
        c.convertSRGBToLinear();
        im.setColorAt(idx, c);
        idx++;
      }
      im.count = idx;
      im.castShadow = false; im.receiveShadow = true;
      B.group.add(im);
    }
    /* wildflower patches: tiny bright quads among the grass */
    {
      const fg = new THREE.PlaneGeometry(0.09, 0.09);
      fg.translate(0, 0.16, 0);
      const mat = windMaterial({ color: 0xffffff, side: THREE.DoubleSide });
      const fCount = Math.max(160, count / 18) | 0;
      const im = new THREE.InstancedMesh(fg, mat, fCount);
      const pts = scatterPositions(B, fCount, area * 0.85, rnd, -0.05);
      let idx = 0;
      for (const [x, z] of pts) {
        v.set(x, B.h(x, z), z);
        e.set(rnd.spread(0.4), rnd() * TAU, rnd.spread(0.4)); q.setFromEuler(e);
        sc.setScalar(rnd.range(0.7, 1.3));
        m4.compose(v, q, sc);
        im.setMatrixAt(idx, m4);
        c.set(rnd.chance(0.55) ? 0xf5f2dd : 0xe8c84a).convertSRGBToLinear();
        im.setColorAt(idx, c);
        idx++;
      }
      im.count = idx;
      im.castShadow = false;
      B.group.add(im);
    }
    /* fallen branches */
    {
      const bg = RT.mergeGeos([
        RT.G.cyl(0.018, 0.026, 0.5, 5, 0x4a3c2c, { rz: Math.PI / 2, vary: 0.2 }),
        RT.G.cyl(0.012, 0.018, 0.3, 5, 0x453828, { x: 0.32, rz: Math.PI / 2 + 0.5, vary: 0.2 }),
      ]);
      const im = new THREE.InstancedMesh(bg, RT.MAT.std, 70);
      const pts = scatterPositions(B, 70, area, rnd, 0);
      let idx = 0;
      for (const [x, z] of pts) {
        v.set(x, B.h(x, z) + 0.02, z);
        e.set(0, rnd() * TAU, rnd.spread(0.06)); q.setFromEuler(e);
        sc.setScalar(rnd.range(0.7, 1.5));
        m4.compose(v, q, sc);
        im.setMatrixAt(idx++, m4);
      }
      im.count = idx;
      B.group.add(im);
    }
  };
  P.scatterRocks = function (B, count, area) {
    const rnd = RNG(777);
    const variants = [
      new THREE.DodecahedronGeometry(0.4, 0),
      (() => { const g = new THREE.IcosahedronGeometry(0.42, 0); g.scale(1.2, 0.55, 0.9); return g; })(),
      (() => { const g = new THREE.DodecahedronGeometry(0.36, 0); g.scale(0.7, 0.8, 1.5); return g; })(),
    ];
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const c = new THREE.Color();
    const per = Math.ceil(count / variants.length);
    for (const geo of variants) {
      const im = new THREE.InstancedMesh(geo, mat, per);
      for (let i = 0; i < per; i++) {
        const x = rnd.spread(area), z = rnd.spread(area);
        const gy = B.h(x, z);
        e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
        const s = rnd.range(0.2, 1.4);
        v.set(x, gy + 0.05 * s, z); sc.set(s, s * rnd.range(0.5, 0.8), s);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
        c.setHex(0x7d7768).multiplyScalar(rnd.range(0.75, 1.1)).convertSRGBToLinear();
        im.setColorAt(i, c);
      }
      im.castShadow = false; im.receiveShadow = true;
      B.group.add(im);
    }
  };

  return P;
})();

/* helper: flatten terrain pad for a building */
RT.MapBuilder.prototype._flattenFor = function (o, w, d) {
  const r = Math.max(w, d) * 0.62;
  return this.terrain._flatten(o.x, o.z, r);
};
