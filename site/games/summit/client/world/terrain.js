/* Chunked terrain with LOD rings around the player plus one static far mesh that
 * holds the whole mountain's silhouette — so you can always look down at every
 * metre you have already climbed. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { terrainMaterial } from '../gfx/materials.js';
import { BIOMES, WORLD } from '../../shared/constants.js';
import { clamp, smoothstep, lerp } from '../../shared/rng.js';

const CS = 160;                       // chunk size (m)
const RES = [56, 28, 14, 7];          // segments per chunk by LOD
const RING = [1, 2, 4, 7];            // chunk radius per LOD
const SKIRT = 9;

const C = {
  sand:   [0.72, 0.62, 0.46],
  jungle: [0.13, 0.29, 0.09],
  jungle2:[0.22, 0.40, 0.13],
  rock:   [0.34, 0.33, 0.32],
  rockHi: [0.46, 0.44, 0.41],
  snow:   [0.92, 0.94, 0.98],
  ash:    [0.19, 0.16, 0.16],
  ember:  [0.42, 0.16, 0.09],
  path:   [0.44, 0.38, 0.30],
};
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Macro colour + snow mask for one vertex. */
function paint(world, x, y, z, ny, out) {
  const n = world.noise.detail;
  const v = n.fbm(x * 0.0042, z * 0.0042, 4);
  const fine = n.fbm(x * 0.031, z * 0.031, 3);
  const steep = 1 - smoothstep(0.52, 0.86, ny);

  let col;
  if (y < 26) col = mixc(C.sand, C.jungle, smoothstep(4, 30, y));
  else if (y < BIOMES[1].to) col = mixc(mixc(C.jungle, C.jungle2, v * 0.5 + 0.5), C.rock, smoothstep(200, 360, y) * 0.7);
  else if (y < BIOMES[2].to) col = mixc(C.rock, C.rockHi, v * 0.5 + 0.5);
  else if (y < BIOMES[3].to) col = mixc(C.rock, C.snow, smoothstep(660, 800, y));
  else col = mixc(C.ash, C.ember, Math.pow(clamp(v * 0.6 + 0.4, 0, 1), 3) * smoothstep(1120, 1360, y));

  // bare rock wherever it is too steep to hold anything
  col = mixc(col, C.rockHi, steep * (y > BIOMES[1].to ? 0.55 : 0.8));
  // the trodden line up the mountain
  const wear = world.routeInfluence(x, z);
  if (wear > 0.01) col = mixc(col, C.path, wear * 0.42 * (1 - steep));

  const shade = 0.86 + fine * 0.2 + v * 0.08;
  out[0] = clamp(col[0] * shade, 0, 1);
  out[1] = clamp(col[1] * shade, 0, 1);
  out[2] = clamp(col[2] * shade, 0, 1);

  // snow coverage: high, flat, and not on the trodden path
  let snow = smoothstep(700, 860, y) * smoothstep(0.42, 0.78, ny);
  snow *= 1 - smoothstep(1120, 1240, y);              // ash burns it off at the caldera
  snow = Math.max(snow, smoothstep(980, 1080, y) * smoothstep(0.6, 0.9, ny) * 0.7);
  out[3] = clamp(snow * (1 - wear * 0.5) + fine * 0.05 * snow, 0, 1);
}

function buildChunk(world, cx, cz, lod) {
  const seg = RES[lod];
  const step = CS / seg;
  const n = seg + 1;
  const count = n * n + (seg + 1) * 4;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const col = new Float32Array(count * 4);
  const idx = [];
  const ox = cx * CS, oz = cz * CS;
  const c4 = [0, 0, 0, 0];

  // One extended height grid with a one-vertex border. Normals and curvature AO
  // both come from it, so chunk edges match their neighbours exactly and the
  // expensive height() function is called once per sample instead of five times.
  const gn = n + 2;
  const hg = new Float32Array(gn * gn);
  for (let j = 0; j < gn; j++) {
    const z = oz + (j - 1) * step;
    for (let i = 0; i < gn; i++) hg[j * gn + i] = world.height(ox + (i - 1) * step, z);
  }
  const H = (i, j) => hg[(j + 1) * gn + (i + 1)];

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const x = ox + i * step, z = oz + j * step;
      const y = H(i, j);
      let nx = H(i - 1, j) - H(i + 1, j), ny = 2 * step, nz = H(i, j - 1) - H(i, j + 1);
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv; ny *= inv; nz *= inv;
      pos[k * 3] = x - ox; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z - oz;
      nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
      paint(world, x, y, z, ny, c4);
      // curvature ambient occlusion: gullies darken, ridges catch the light
      const avg = (H(i - 1, j) + H(i + 1, j) + H(i, j - 1) + H(i, j + 1)) * 0.25;
      const ao = clamp(0.78 + (y - avg) * (1.1 / Math.max(2, step)), 0.44, 1.14);
      col[k * 4] = c4[0] * ao; col[k * 4 + 1] = c4[1] * ao; col[k * 4 + 2] = c4[2] * ao; col[k * 4 + 3] = c4[3];
    }
  }
  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // skirt: a curtain around the edge that hides cracks between LOD levels
  let sk = n * n;
  const edges = [
    { get: (i) => i, dir: 0 },
    { get: (i) => (n - 1) * n + i, dir: 1 },
    { get: (i) => i * n, dir: 2 },
    { get: (i) => i * n + (n - 1), dir: 3 },
  ];
  for (const e of edges) {
    const start = sk;
    for (let i = 0; i < n; i++) {
      const src = e.get(i);
      pos[sk * 3] = pos[src * 3]; pos[sk * 3 + 1] = pos[src * 3 + 1] - SKIRT; pos[sk * 3 + 2] = pos[src * 3 + 2];
      nor[sk * 3] = 0; nor[sk * 3 + 1] = 1; nor[sk * 3 + 2] = 0;
      col[sk * 4] = col[src * 4]; col[sk * 4 + 1] = col[src * 4 + 1];
      col[sk * 4 + 2] = col[src * 4 + 2]; col[sk * 4 + 3] = col[src * 4 + 3];
      sk++;
    }
    for (let i = 0; i < seg; i++) {
      const a = e.get(i), b = e.get(i + 1), c = start + i, d = start + i + 1;
      if (e.dir === 0 || e.dir === 3) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

export class Terrain {
  constructor(world, scene, budget = 2) {
    this.world = world;
    this.scene = scene;
    this.material = terrainMaterial();
    this.chunks = new Map();
    this.queue = [];
    this.budget = budget;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.far = this.buildFar();
    scene.add(this.far);
  }

  /** One static low-resolution mesh of the entire mountain and its shoreline. */
  buildFar() {
    const rings = 150, sectors = 190, maxR = WORLD.beachRadius * 2.3;
    const pos = new Float32Array((rings + 1) * sectors * 3);
    const nor = new Float32Array((rings + 1) * sectors * 3);
    const col = new Float32Array((rings + 1) * sectors * 4);
    const idx = [];
    const c4 = [0, 0, 0, 0];
    const nrm = { x: 0, y: 1, z: 0 };
    for (let r = 0; r <= rings; r++) {
      const rad = Math.pow(r / rings, 1.35) * maxR;
      for (let s = 0; s < sectors; s++) {
        const a = (s / sectors) * Math.PI * 2;
        const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        const y = this.world.height(x, z) - 6.0;   // sits just under the detailed chunks
        const k = r * sectors + s;
        this.world.normal(x, z, nrm);
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        nor[k * 3] = nrm.x; nor[k * 3 + 1] = nrm.y; nor[k * 3 + 2] = nrm.z;
        paint(this.world, x, y, z, nrm.y, c4);
        col[k * 4] = c4[0]; col[k * 4 + 1] = c4[1]; col[k * 4 + 2] = c4[2]; col[k * 4 + 3] = c4[3];
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const s2 = (s + 1) % sectors;
        const a = r * sectors + s, b = r * sectors + s2;
        const c = (r + 1) * sectors + s, d = (r + 1) * sectors + s2;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.renderOrder = -5;
    return mesh;
  }

  lodFor(dist) {
    for (let i = 0; i < RING.length; i++) if (dist <= RING[i]) return i;
    return -1;
  }

  update(camX, camZ) {
    const ccx = Math.floor(camX / CS), ccz = Math.floor(camZ / CS);
    const wanted = new Set();
    const R = RING[RING.length - 1];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dz));
        const lod = this.lodFor(d);
        if (lod < 0) continue;
        const cx = ccx + dx, cz = ccz + dz;
        const key = `${cx},${cz}`;
        wanted.add(key);
        const have = this.chunks.get(key);
        if (!have) this.queue.push({ key, cx, cz, lod, d });
        else if (have.lod !== lod && !have.pending) { have.pending = lod; this.queue.push({ key, cx, cz, lod, d, replace: true }); }
      }
    }
    for (const [key, ch] of this.chunks) {
      if (!wanted.has(key)) { this.group.remove(ch.mesh); ch.mesh.geometry.dispose(); this.chunks.delete(key); }
    }
    this.queue.sort((a, b) => a.d - b.d);
    let made = 0;
    while (this.queue.length && made < this.budget) {
      const job = this.queue.shift();
      if (!wanted.has(job.key)) continue;
      const existing = this.chunks.get(job.key);
      if (existing && existing.lod === job.lod) { existing.pending = null; continue; }
      const geo = buildChunk(this.world, job.cx, job.cz, job.lod);
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.position.set(job.cx * CS, 0, job.cz * CS);
      mesh.castShadow = job.lod <= 1;
      mesh.receiveShadow = job.lod <= 2;
      this.group.add(mesh);
      if (existing) { this.group.remove(existing.mesh); existing.mesh.geometry.dispose(); }
      this.chunks.set(job.key, { mesh, lod: job.lod, pending: null });
      made++;
    }
    return this.queue.length;
  }

  /** Fills in the highest-detail ring immediately — used on load and after a teleport. */
  prime(camX, camZ, passes = 40) {
    const before = this.budget;
    this.budget = 999;
    for (let i = 0; i < 2; i++) this.update(camX, camZ);
    this.budget = before;
  }

  dispose() {
    for (const [, ch] of this.chunks) { this.group.remove(ch.mesh); ch.mesh.geometry.dispose(); }
    this.chunks.clear();
    this.scene.remove(this.group, this.far);
    this.far.geometry.dispose();
    this.material.dispose();
  }
}
