/* =========================================================================
 * WORLD — chunk storage, the generation worker pool, the light engine and
 * the meshing queue.  Three dimensions share one implementation.
 * ========================================================================= */

function Chunk(dim, cx, cz) {
  this.dim = dim; this.cx = cx; this.cz = cz;
  this.sections = new Array(N_SECT);
  this.light = new Array(N_SECT);
  for (var i = 0; i < N_SECT; i++) { this.sections[i] = null; this.light[i] = null; }
  this.biomes = null;
  this.heights = null;
  this.loaded = false;
  this.lit = false;
  this.meshed = false;
  this.dirty = new Uint8Array(N_SECT);
  this.mesh = new Array(N_SECT);
  this.blockEntities = {};      // "x,y,z" -> {type, items, ...}
  this.entities = [];
  this.lastUse = 0;
  this.emptyAbove = 0;
}
Chunk.prototype.get = function (x, y, z) {
  if (y < 0 || y >= CH_H) return 0;
  var s = this.sections[y >> 4];
  return s ? s[((y & 15) << 8) | (z << 4) | x] : 0;
};
Chunk.prototype.set = function (x, y, z, v) {
  if (y < 0 || y >= CH_H) return;
  var si = y >> 4, s = this.sections[si];
  if (!s) { if (v === 0) return; s = this.sections[si] = new Uint16Array(4096); }
  s[((y & 15) << 8) | (z << 4) | x] = v;
};
Chunk.prototype.getL = function (x, y, z) {
  if (y < 0) return 0;
  if (y >= CH_H) return 0xF0;
  var s = this.light[y >> 4];
  return s ? s[((y & 15) << 8) | (z << 4) | x] : (this.lit ? 0 : 0xF0);
};
Chunk.prototype.setL = function (x, y, z, v) {
  if (y < 0 || y >= CH_H) return;
  var si = y >> 4, s = this.light[si];
  if (!s) s = this.light[si] = new Uint8Array(4096);
  s[((y & 15) << 8) | (z << 4) | x] = v;
};

/* --------------------------------------------------------- light queue -- */
function LQueue(cap) {
  this.x = new Int32Array(cap); this.y = new Int32Array(cap);
  this.z = new Int32Array(cap); this.v = new Int32Array(cap);
  this.head = 0; this.tail = 0; this.cap = cap;
}
LQueue.prototype.push = function (x, y, z, v) {
  if (this.tail >= this.cap) {
    if (this.head > this.cap * 0.4) {
      var n = this.tail - this.head;
      this.x.copyWithin(0, this.head, this.tail); this.y.copyWithin(0, this.head, this.tail);
      this.z.copyWithin(0, this.head, this.tail); this.v.copyWithin(0, this.head, this.tail);
      this.head = 0; this.tail = n;
    } else {
      var cap2 = this.cap * 2;
      var nx = new Int32Array(cap2); nx.set(this.x); this.x = nx;
      var ny = new Int32Array(cap2); ny.set(this.y); this.y = ny;
      var nz = new Int32Array(cap2); nz.set(this.z); this.z = nz;
      var nv = new Int32Array(cap2); nv.set(this.v); this.v = nv;
      this.cap = cap2;
    }
  }
  this.x[this.tail] = x; this.y[this.tail] = y; this.z[this.tail] = z; this.v[this.tail] = v;
  this.tail++;
};
LQueue.prototype.size = function () { return this.tail - this.head; };
LQueue.prototype.clear = function () { this.head = this.tail = 0; };

/* =============================== WORLD ================================== */
function World(seed) {
  this.seed = seed;
  this.dims = [{}, {}, {}];             // dim -> key -> Chunk
  this.pending = [{}, {}, {}];
  this.meshQueue = [];
  this.lightQueue = [new LQueue(1 << 14), new LQueue(1 << 14), new LQueue(1 << 14)];
  this.skyQueue = [new LQueue(1 << 14), new LQueue(1 << 14), new LQueue(1 << 14)];
  this.removeQueue = [new LQueue(1 << 12), new LQueue(1 << 12), new LQueue(1 << 12)];
  this.skyRemoveQueue = [new LQueue(1 << 12), new LQueue(1 << 12), new LQueue(1 << 12)];
  this.workers = [];
  this.jobs = 0;
  this.maxJobs = 6;
  this.requestList = [];
  this.stats = { gen: 0, meshed: 0, lit: 0, chunks: 0 };
  this.tickQueue = [];
  this.landmarks = [];
  this.pendingMobs = [];
}

World.prototype.initWorkers = function (srcText, count) {
  var blob = new Blob([srcText], { type: 'application/javascript' });
  var url = URL.createObjectURL(blob);
  var self = this;
  for (var i = 0; i < count; i++) {
    var w = new Worker(url);
    w.onmessage = function (e) { self.onWorkerMsg(e.data); };
    w.postMessage({ cmd: 'init', seed: this.seed });
    w.busy = 0;
    this.workers.push(w);
  }
};
World.prototype.onWorkerMsg = function (m) {
  if (m.cmd === 'ready') return;
  if (m.cmd !== 'chunk') return;
  this.jobs--;
  var dim = m.dim;
  delete this.pending[dim][m.key];
  var c = new Chunk(dim, m.cx, m.cz);
  for (var i = 0; i < N_SECT; i++) c.sections[i] = m.data[i];
  c.heights = m.heights;
  c.biomes = m.biomes;
  c.loaded = true;
  this.dims[dim][m.key] = c;
  this.stats.gen++;
  if (m.structures) this.applyStructureData(dim, m.structures);
};
/* The generator hands back a list of things it could not place itself:
   chest contents, mob spawners and the mobs that live in the structure. */
World.prototype.applyStructureData = function (dim, list) {
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (s.t === 'mark') { this.landmarks.push({ x: s.x, z: s.z, name: s.name, dim: dim }); continue; }
    if (s.t === 'mob') { this.pendingMobs.push({ dim: dim, x: s.x + 0.5, y: s.y, z: s.z + 0.5, mob: s.mob }); continue; }
    var c = this.dims[dim][(s.x >> 4) + ',' + (s.z >> 4)];
    if (!c) continue;
    var key = s.x + ',' + s.y + ',' + s.z;
    if (s.t === 'chest') {
      var be = makeBlockEntity('chest', s.x, s.y, s.z);
      be.dim = dim;
      be.name = 'Chest';
      var rng = makeRNG(hash3(s.x, s.y, s.z, (this.seed ^ 0x1f2e) >>> 0) >>> 0);
      var items = rollLoot(s.loot, rng);
      for (var k = 0; k < items.length && k < 27; k++) {
        var slot = Math.floor(rng() * 27);
        if (be.items[slot]) slot = k;
        be.items[slot] = items[k];
      }
      c.blockEntities[key] = be;
    } else if (s.t === 'spawner') {
      var sp = makeBlockEntity('spawner', s.x, s.y, s.z);
      sp.dim = dim;
      sp.mob = s.mob;
      c.blockEntities[key] = sp;
    }
  }
};

World.prototype.chunkAt = function (dim, cx, cz) {
  return this.dims[dim][cx + ',' + cz];
};
World.prototype.getRaw = function (dim, x, y, z) {
  if (y < 0 || y >= CH_H) return 0;
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c) return 0;
  var s = c.sections[y >> 4];
  return s ? s[((y & 15) << 8) | ((z & 15) << 4) | (x & 15)] : 0;
};
World.prototype.getId = function (dim, x, y, z) { return this.getRaw(dim, x, y, z) & ID_MASK; };
World.prototype.getState = function (dim, x, y, z) { return (this.getRaw(dim, x, y, z) >>> ST_SHIFT) & 15; };
World.prototype.getLight = function (dim, x, y, z) {
  if (y < 0) return 0;
  if (y >= CH_H) return 0xF0;
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c) return 0xF0;
  var s = c.light[y >> 4];
  return s ? s[((y & 15) << 8) | ((z & 15) << 4) | (x & 15)] : (c.lit ? 0 : 0xF0);
};
World.prototype.setLightRaw = function (dim, x, y, z, v) {
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c) return;
  var si = y >> 4;
  var s = c.light[si];
  if (!s) s = c.light[si] = new Uint8Array(4096);
  s[((y & 15) << 8) | ((z & 15) << 4) | (x & 15)] = v;
};
World.prototype.getBiome = function (dim, x, z) {
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c || !c.biomes) return BIOMES[BIOME_ID.plains];
  return BIOMES[c.biomes[(z & 15) * 16 + (x & 15)]];
};
World.prototype.getHeight = function (dim, x, z) {
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c || !c.heights) return SEA;
  return c.heights[(z & 15) * 16 + (x & 15)];
};

/* ------------------------------------------------------ chunk requests -- */
World.prototype.request = function (dim, cx, cz) {
  var key = cx + ',' + cz;
  if (this.dims[dim][key] || this.pending[dim][key]) return;
  if (this.jobs >= this.maxJobs * this.workers.length) { return false; }
  this.pending[dim][key] = 1;
  var w = this.workers[this.jobs % this.workers.length];
  w.postMessage({ cmd: 'gen', dim: dim, cx: cx, cz: cz, key: key });
  this.jobs++;
  return true;
};

/* =========================== LIGHT ENGINE =============================== */
World.prototype.initChunkLight = function (c) {
  var dim = c.dim, bx = c.cx * 16, bz = c.cz * 16;
  var sq = this.skyQueue[dim], bq = this.lightQueue[dim];
  var noSky = (dim === DIM_NETHER);
  for (var z = 0; z < 16; z++) {
    for (var x = 0; x < 16; x++) {
      var lv = noSky ? 0 : 15;
      var y = CH_H - 1;
      for (; y >= 0; y--) {
        var id = c.get(x, y, z) & ID_MASK;
        var ab = LIGHT_ABSORB[id];
        if (ab >= 15) { lv = 0; }
        else if (ab > 0) lv = Math.max(0, lv - ab);
        if (lv > 0) c.setL(x, y, z, lv << 4);
        if (lv === 0) break;
      }
      /* seed the horizontal spread wherever a column is open next to a
         taller one — far cheaper than seeding every lit cell */
      if (!noSky) {
        var openTo = y;
        for (var yy = CH_H - 1; yy > openTo; yy--) {
          var l = (c.getL(x, yy, z) >> 4) & 15;
          if (l === 0) continue;
          if (x === 0 || x === 15 || z === 0 || z === 15) { sq.push(bx + x, yy, bz + z, l); continue; }
          if (((c.getL(x - 1, yy, z) >> 4) & 15) < l - 0 || ((c.getL(x + 1, yy, z) >> 4) & 15) < l ||
            ((c.getL(x, yy, z - 1) >> 4) & 15) < l || ((c.getL(x, yy, z + 1) >> 4) & 15) < l) {
            sq.push(bx + x, yy, bz + z, l);
          }
        }
      }
      /* block light emitters */
      for (var ey = 0; ey < CH_H; ey++) {
        var s = c.sections[ey >> 4];
        if (!s) { ey |= 15; continue; }
        var eid = s[((ey & 15) << 8) | (z << 4) | x] & ID_MASK;
        if (LIGHT_EMIT[eid] > 0) {
          var cur = c.getL(x, ey, z);
          c.setL(x, ey, z, (cur & 0xF0) | LIGHT_EMIT[eid]);
          bq.push(bx + x, ey, bz + z, LIGHT_EMIT[eid]);
        }
      }
    }
  }
  c.lit = true;
};

World.prototype.propagate = function (dim, budget) {
  var done = 0;
  done += this.runRemoval(dim, this.removeQueue[dim], this.lightQueue[dim], false, budget);
  done += this.runRemoval(dim, this.skyRemoveQueue[dim], this.skyQueue[dim], true, budget);
  done += this.runSpread(dim, this.lightQueue[dim], false, budget - done);
  done += this.runSpread(dim, this.skyQueue[dim], true, budget - done);
  return done;
};
World.prototype.runSpread = function (dim, q, sky, budget) {
  var n = 0;
  while (q.size() > 0 && n < budget) {
    var h = q.head++;
    var x = q.x[h], y = q.y[h], z = q.z[h], lv = q.v[h];
    n++;
    var cur = this.getLight(dim, x, y, z);
    var have = sky ? (cur >> 4) & 15 : cur & 15;
    if (have !== lv) continue;
    if (lv <= 0) continue;
    for (var f = 0; f < 6; f++) {
      var d = FACE_DIR[f];
      var nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (ny < 0 || ny >= CH_H) continue;
      var c = this.dims[dim][(nx >> 4) + ',' + (nz >> 4)];
      if (!c || !c.lit) continue;
      var nid = this.getRaw(dim, nx, ny, nz) & ID_MASK;
      var ab = LIGHT_ABSORB[nid];
      if (ab >= 15) continue;
      var next = lv - 1 - ab;
      if (sky && f === 3 && lv === 15 && ab === 0) next = 15;
      if (next <= 0) continue;
      var nl = this.getLight(dim, nx, ny, nz);
      var nh = sky ? (nl >> 4) & 15 : nl & 15;
      if (nh >= next) continue;
      this.setLightRaw(dim, nx, ny, nz, sky ? ((next << 4) | (nl & 15)) : ((nl & 0xF0) | next));
      this.markDirtyAt(dim, nx, ny, nz);
      q.push(nx, ny, nz, next);
    }
  }
  if (q.head === q.tail) q.clear();
  return n;
};
World.prototype.runRemoval = function (dim, rq, aq, sky, budget) {
  var n = 0;
  while (rq.size() > 0 && n < budget) {
    var h = rq.head++;
    var x = rq.x[h], y = rq.y[h], z = rq.z[h], lv = rq.v[h];
    n++;
    for (var f = 0; f < 6; f++) {
      var d = FACE_DIR[f];
      var nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (ny < 0 || ny >= CH_H) continue;
      var c = this.dims[dim][(nx >> 4) + ',' + (nz >> 4)];
      if (!c || !c.lit) continue;
      var nl = this.getLight(dim, nx, ny, nz);
      var nh = sky ? (nl >> 4) & 15 : nl & 15;
      if (nh === 0) continue;
      if (nh < lv || (sky && f === 3 && lv === 15)) {
        this.setLightRaw(dim, nx, ny, nz, sky ? (nl & 15) : (nl & 0xF0));
        this.markDirtyAt(dim, nx, ny, nz);
        rq.push(nx, ny, nz, nh);
      } else if (nh >= lv) {
        aq.push(nx, ny, nz, nh);
      }
    }
  }
  if (rq.head === rq.tail) rq.clear();
  return n;
};

/* ------------------------------------------------------- block changes -- */
World.prototype.markDirtyAt = function (dim, x, y, z) {
  var cx = x >> 4, cz = z >> 4, sy = y >> 4;
  this.markSection(dim, cx, cz, sy);
  var lx = x & 15, lz = z & 15, ly = y & 15;
  if (lx === 0) this.markSection(dim, cx - 1, cz, sy);
  if (lx === 15) this.markSection(dim, cx + 1, cz, sy);
  if (lz === 0) this.markSection(dim, cx, cz - 1, sy);
  if (lz === 15) this.markSection(dim, cx, cz + 1, sy);
  if (ly === 0) this.markSection(dim, cx, cz, sy - 1);
  if (ly === 15) this.markSection(dim, cx, cz, sy + 1);
  if (lx === 0 && lz === 0) this.markSection(dim, cx - 1, cz - 1, sy);
  if (lx === 15 && lz === 0) this.markSection(dim, cx + 1, cz - 1, sy);
  if (lx === 0 && lz === 15) this.markSection(dim, cx - 1, cz + 1, sy);
  if (lx === 15 && lz === 15) this.markSection(dim, cx + 1, cz + 1, sy);
};
World.prototype.markSection = function (dim, cx, cz, sy) {
  if (sy < 0 || sy >= N_SECT) return;
  var c = this.dims[dim][cx + ',' + cz];
  if (!c || !c.meshed) return;
  if (c.dirty[sy]) return;
  c.dirty[sy] = 1;
  this.meshQueue.push([dim, cx, cz, sy, 0]);
};

World.prototype.setBlock = function (dim, x, y, z, v, noLight) {
  if (y < 0 || y >= CH_H) return;
  var c = this.dims[dim][(x >> 4) + ',' + (z >> 4)];
  if (!c) return;
  var old = c.get(x & 15, y, z & 15);
  if (old === v) return;
  c.set(x & 15, y, z & 15, v);
  var oldId = old & ID_MASK, newId = v & ID_MASK;
  /* keep the surface heightmap current for spawning and weather */
  var hi = (z & 15) * 16 + (x & 15);
  if (c.heights) {
    if (newId !== 0 && y > c.heights[hi]) c.heights[hi] = y;
    else if (newId === 0 && y === c.heights[hi]) {
      for (var yy = y; yy >= 0; yy--) { if ((c.get(x & 15, yy, z & 15) & ID_MASK) !== 0) { c.heights[hi] = yy; break; } }
    }
  }
  this.markDirtyAt(dim, x, y, z);
  if (noLight) return;
  this.updateLightAt(dim, x, y, z, oldId, newId);
};
World.prototype.updateLightAt = function (dim, x, y, z, oldId, newId) {
  var cur = this.getLight(dim, x, y, z);
  var oldBlock = cur & 15, oldSky = (cur >> 4) & 15;
  /* block light */
  if (LIGHT_EMIT[oldId] > 0 || LIGHT_ABSORB[newId] > LIGHT_ABSORB[oldId]) {
    this.setLightRaw(dim, x, y, z, cur & 0xF0);
    this.removeQueue[dim].push(x, y, z, oldBlock);
  }
  if (LIGHT_EMIT[newId] > 0) {
    var l2 = this.getLight(dim, x, y, z);
    this.setLightRaw(dim, x, y, z, (l2 & 0xF0) | LIGHT_EMIT[newId]);
    this.lightQueue[dim].push(x, y, z, LIGHT_EMIT[newId]);
  } else if (LIGHT_ABSORB[newId] < LIGHT_ABSORB[oldId]) {
    for (var f = 0; f < 6; f++) {
      var d = FACE_DIR[f];
      var nl = this.getLight(dim, x + d[0], y + d[1], z + d[2]) & 15;
      if (nl > 1) this.lightQueue[dim].push(x + d[0], y + d[1], z + d[2], nl);
    }
  }
  /* sky light */
  if (LIGHT_ABSORB[newId] > LIGHT_ABSORB[oldId]) {
    var l3 = this.getLight(dim, x, y, z);
    this.setLightRaw(dim, x, y, z, l3 & 15);
    this.skyRemoveQueue[dim].push(x, y, z, oldSky);
    /* a new blocker shadows the whole column below it */
    for (var yy2 = y - 1; yy2 >= 0; yy2--) {
      var lc = this.getLight(dim, x, yy2, z);
      var sk = (lc >> 4) & 15;
      if (sk === 0) break;
      if ((this.getRaw(dim, x, yy2, z) & ID_MASK) !== 0 && LIGHT_ABSORB[this.getRaw(dim, x, yy2, z) & ID_MASK] >= 15) break;
      this.setLightRaw(dim, x, yy2, z, lc & 15);
      this.skyRemoveQueue[dim].push(x, yy2, z, sk);
      this.markDirtyAt(dim, x, yy2, z);
    }
  } else if (LIGHT_ABSORB[newId] < LIGHT_ABSORB[oldId]) {
    for (var f2 = 0; f2 < 6; f2++) {
      var d2 = FACE_DIR[f2];
      var ns = (this.getLight(dim, x + d2[0], y + d2[1], z + d2[2]) >> 4) & 15;
      if (ns > 0) this.skyQueue[dim].push(x + d2[0], y + d2[1], z + d2[2], ns);
    }
  }
};
