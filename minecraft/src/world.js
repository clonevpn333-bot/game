// ============================================================================
//  World: chunk streaming, generation & mesh scheduling, block edits, queries
// ============================================================================
import * as THREE from 'three';
import { CHUNK_SX, CHUNK_SZ, WORLD_HEIGHT, RENDER_DISTANCE, DIM } from './constants.js';
import { BLOCK } from './ids.js';
import { Chunk, computeLight, buildGeometry, MAT } from './chunk.js';
import { getBlock, isOpaque } from './blocks.js';

export class World {
  constructor(scene, gen, materials, uvs, dim = DIM.OVERWORLD) {
    this.scene = scene;
    this.gen = gen;
    this.materials = materials; // {0:opaque,1:transparent,2:liquid}
    this.uvs = uvs;
    this.dim = dim;
    this.chunks = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.genQueue = [];
    this.meshQueue = [];
    this._fallbackUV = [0, 0, 1, 1];
    this.modified = {}; // key -> {localIndex:id} player edits for persistence
  }

  key(cx, cz) { return cx + ',' + cz; }
  getChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)); }

  // ---- block queries ----
  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return BLOCK.AIR;
    const cx = Math.floor(wx / CHUNK_SX), cz = Math.floor(wz / CHUNK_SZ);
    const c = this.getChunk(cx, cz);
    if (!c || c.state === 'empty') return BLOCK.AIR;
    return c.get(wx - cx * CHUNK_SX, wy, wz - cz * CHUNK_SZ);
  }
  getSky(wx, wy, wz) {
    if (wy >= WORLD_HEIGHT) return 15;
    if (wy < 0) return 0;
    const cx = Math.floor(wx / CHUNK_SX), cz = Math.floor(wz / CHUNK_SZ);
    const c = this.getChunk(cx, cz);
    if (!c || c.state === 'empty') return 15;
    return c.sky[(wy * 256) + ((wz - cz * CHUNK_SZ) * CHUNK_SX) + (wx - cx * CHUNK_SX)];
  }
  getBlockLight(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return 0;
    const cx = Math.floor(wx / CHUNK_SX), cz = Math.floor(wz / CHUNK_SZ);
    const c = this.getChunk(cx, cz);
    if (!c || c.state === 'empty') return 0;
    return c.block[(wy * 256) + ((wz - cz * CHUNK_SZ) * CHUNK_SX) + (wx - cx * CHUNK_SX)];
  }
  tintAt(wx, wz, type) { return this.gen.tintAt(wx, wz, type, this.dim); }
  uv(name) { return this.uvs.get(name) || this._fallbackUV; }

  // light combined value for entity/sky use 0..1
  lightLevelAt(wx, wy, wz, dayLight) {
    const s = this.getSky(wx, wy, wz) / 15;
    const b = this.getBlockLight(wx, wy, wz) / 15;
    return Math.max(b, s * dayLight);
  }

  // ---- editing ----
  setBlock(wx, wy, wz, id, relight = true) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const cx = Math.floor(wx / CHUNK_SX), cz = Math.floor(wz / CHUNK_SZ);
    const c = this.getChunk(cx, cz);
    if (!c || c.state === 'empty') return;
    const lx = wx - cx * CHUNK_SX, lz = wz - cz * CHUNK_SZ;
    c.set(lx, wy, wz - cz * CHUNK_SZ, id);
    // record modification for save
    const k = this.key(cx, cz);
    (this.modified[k] || (this.modified[k] = {}))[lx + lz * CHUNK_SX + wy * 256] = id;

    if (relight) {
      computeLight(c);
      this._markDirty(cx, cz);
      // border neighbors need relight + remesh for light bleed & face culling
      if (lx === 0) this._relightNeighbor(cx - 1, cz);
      if (lx === CHUNK_SX - 1) this._relightNeighbor(cx + 1, cz);
      if (lz === 0) this._relightNeighbor(cx, cz - 1);
      if (lz === CHUNK_SZ - 1) this._relightNeighbor(cx, cz + 1);
    }
  }
  _relightNeighbor(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c && c.state !== 'empty') { computeLight(c); this._markDirty(cx, cz); }
  }
  _markDirty(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (c && !c._queuedMesh) { c.dirty = true; c._queuedMesh = true; this.meshQueue.push(c); }
  }

  // ---- streaming ----
  update(px, pz, budget = { gen: 2, mesh: 2 }) {
    const pcx = Math.floor(px / CHUNK_SX), pcz = Math.floor(pz / CHUNK_SZ);
    const rd = RENDER_DISTANCE.value;

    // ensure chunks exist, sorted by distance
    const needed = [];
    for (let dz = -rd; dz <= rd; dz++)
      for (let dx = -rd; dx <= rd; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        const d2 = dx * dx + dz * dz;
        if (d2 > (rd + 0.5) * (rd + 0.5)) continue;
        needed.push([cx, cz, d2]);
      }
    needed.sort((a, b) => a[2] - b[2]);

    for (const [cx, cz] of needed) {
      const k = this.key(cx, cz);
      if (!this.chunks.has(k)) {
        const c = new Chunk(cx, cz);
        this.chunks.set(k, c);
        this.genQueue.push(c);
      }
    }
    this.genQueue.sort((a, b) => dist2(a, pcx, pcz) - dist2(b, pcx, pcz));

    // generate
    let g = 0;
    while (this.genQueue.length && g < budget.gen) {
      const c = this.genQueue.shift();
      if (c.state !== 'empty') continue;
      this.gen.generateChunk(c, this.dim);
      this._applyModifications(c);
      computeLight(c);
      c.state = 'generated';
      g++;
      // schedule meshing for this + neighbors once neighbors are generated
      this._tryQueueMesh(c.cx, c.cz);
      this._tryQueueMesh(c.cx + 1, c.cz); this._tryQueueMesh(c.cx - 1, c.cz);
      this._tryQueueMesh(c.cx, c.cz + 1); this._tryQueueMesh(c.cx, c.cz - 1);
    }

    // mesh
    this.meshQueue.sort((a, b) => dist2(a, pcx, pcz) - dist2(b, pcx, pcz));
    let m = 0;
    while (this.meshQueue.length && m < budget.mesh) {
      const c = this.meshQueue.shift();
      c._queuedMesh = false;
      if (c.state === 'empty') continue;
      this.meshChunk(c);
      m++;
    }

    // unload far chunks
    const maxD = (rd + 2) * (rd + 2);
    for (const [k, c] of this.chunks) {
      const d = (c.cx - pcx) ** 2 + (c.cz - pcz) ** 2;
      if (d > maxD) this._unload(k, c);
    }
  }

  _tryQueueMesh(cx, cz) {
    const c = this.getChunk(cx, cz);
    if (!c || c.state === 'empty') return;
    if (!this._neighborsReady(cx, cz)) return;
    if (c.state === 'generated' || c.dirty) {
      if (!c._queuedMesh) { c._queuedMesh = true; this.meshQueue.push(c); }
    }
  }
  _neighborsReady(cx, cz) {
    for (const [dx, dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
      const c = this.getChunk(cx + dx, cz + dz);
      if (!c || c.state === 'empty') return false;
    }
    return true;
  }

  meshChunk(c) {
    if (!this._neighborsReady(c.cx, c.cz)) { this._markDirty(c.cx, c.cz); return; }
    const geo = buildGeometry(c, this);
    for (const bucket of [MAT.OPAQUE, MAT.TRANSPARENT, MAT.LIQUID]) {
      const b = geo[bucket];
      const existing = c.meshes[bucket];
      if (b.count === 0) {
        if (existing) { this.group.remove(existing); existing.geometry.dispose(); delete c.meshes[bucket]; }
        continue;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('alight', new THREE.Float32BufferAttribute(b.lit, 2));
      g.setAttribute('ao', new THREE.Float32BufferAttribute(b.ao, 1));
      g.setAttribute('wave', new THREE.Float32BufferAttribute(b.wav, 1));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      if (existing) {
        existing.geometry.dispose();
        existing.geometry = g;
      } else {
        const mesh = new THREE.Mesh(g, this.materials[bucket]);
        mesh.position.set(c.cx * CHUNK_SX, 0, c.cz * CHUNK_SZ);
        mesh.frustumCulled = true;
        mesh.renderOrder = bucket === MAT.LIQUID ? 2 : (bucket === MAT.TRANSPARENT ? 1 : 0);
        c.meshes[bucket] = mesh;
        this.group.add(mesh);
      }
    }
    c.state = 'meshed';
    c.dirty = false;
  }

  _unload(k, c) {
    for (const bucket in c.meshes) {
      const mesh = c.meshes[bucket];
      this.group.remove(mesh);
      mesh.geometry.dispose();
    }
    c.meshes = {};
    this.chunks.delete(k);
  }

  _applyModifications(c) {
    const m = this.modified[this.key(c.cx, c.cz)];
    if (!m) return;
    for (const i in m) c.blocks[i] = m[i];
  }

  // remesh everything (e.g. after settings change)
  remeshAll() {
    for (const [, c] of this.chunks) if (c.state !== 'empty') this._markDirty(c.cx, c.cz);
  }

  clear() {
    for (const [k, c] of this.chunks) this._unload(k, c);
    this.chunks.clear();
    this.genQueue.length = 0;
    this.meshQueue.length = 0;
  }

  // highest solid block at column (for spawn / mob placement)
  highestY(wx, wz) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      const id = this.getBlock(wx, y, wz);
      if (id !== BLOCK.AIR && isOpaque(id)) return y;
    }
    return 0;
  }

  isLoaded(wx, wz) {
    const cx = Math.floor(wx / CHUNK_SX), cz = Math.floor(wz / CHUNK_SZ);
    const c = this.getChunk(cx, cz);
    return c && c.state === 'meshed';
  }
}

function dist2(c, pcx, pcz) { return (c.cx - pcx) ** 2 + (c.cz - pcz) ** 2; }
