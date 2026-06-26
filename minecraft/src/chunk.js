// ============================================================================
//  Chunk: voxel storage, per-chunk lighting, and geometry meshing
//  (face-culling + ambient occlusion + biome tint + baked light)
// ============================================================================
import { CHUNK_SX, CHUNK_SZ, WORLD_HEIGHT, CHUNK_VOL, idx } from './constants.js';
import { BLOCK } from './ids.js';
import { getBlock, isOpaque, isLiquid, lightOf, filterOf, RENDER } from './blocks.js';

export const MAT = { OPAQUE: 0, TRANSPARENT: 1, LIQUID: 2 };

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.blocks = new Uint16Array(CHUNK_VOL);
    this.sky = new Uint8Array(CHUNK_VOL);
    this.block = new Uint8Array(CHUNK_VOL);  // emitted/propagated block light
    this.state = 'empty'; // empty -> generated -> meshed
    this.dirty = false;
    this.meshes = {};      // bucket -> THREE.Mesh
    this.heightmap = new Int16Array(CHUNK_SX * CHUNK_SZ);
    this.entities = [];
  }
  inRange(y) { return y >= 0 && y < WORLD_HEIGHT; }
  get(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;
    return this.blocks[idx(x, y, z)];
  }
  set(x, y, z, id) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    this.blocks[idx(x, y, z)] = id;
  }
}

// ---- per-chunk lighting ----------------------------------------------------
export function computeLight(chunk) {
  const { blocks, sky, block } = chunk;
  sky.fill(0); block.fill(0);

  // Sky light: vertical attenuation per column + heightmap
  for (let z = 0; z < CHUNK_SZ; z++) {
    for (let x = 0; x < CHUNK_SX; x++) {
      let light = 15;
      let top = 0;
      for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
        const i = idx(x, y, z);
        const id = blocks[i];
        sky[i] = light;
        if (light === 15 && id !== BLOCK.AIR && isOpaque(id) && top === 0) top = y + 1;
        const f = filterOf(id);
        light = Math.max(0, light - (f === 0 ? 0 : (id === BLOCK.AIR ? 0 : f)));
        if (light <= 0) { light = 0; }
      }
      chunk.heightmap[x + z * CHUNK_SX] = top;
    }
  }

  // Skylight horizontal spread (a few BFS passes so cave mouths / overhangs glow)
  spread(chunk, sky);

  // Block light: seed sources, then BFS
  const queue = [];
  for (let y = 0; y < WORLD_HEIGHT; y++)
    for (let z = 0; z < CHUNK_SZ; z++)
      for (let x = 0; x < CHUNK_SX; x++) {
        const i = idx(x, y, z);
        const l = lightOf(blocks[i]);
        if (l > 0) { block[i] = l; queue.push(i); }
      }
  bfsLight(chunk, block, queue);
}

function spread(chunk, arr) {
  const { blocks } = chunk;
  const get = (x, y, z) => (x < 0 || z < 0 || x >= CHUNK_SX || z >= CHUNK_SZ || y < 0 || y >= WORLD_HEIGHT) ? -1 : arr[idx(x, y, z)];
  for (let pass = 0; pass < 2; pass++) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--)
      for (let z = 0; z < CHUNK_SZ; z++)
        for (let x = 0; x < CHUNK_SX; x++) {
          const i = idx(x, y, z);
          if (isOpaque(blocks[i])) continue;
          let m = arr[i];
          const n = [get(x+1,y,z),get(x-1,y,z),get(x,y+1,z),get(x,y-1,z),get(x,y,z+1),get(x,y,z-1)];
          for (const v of n) if (v - 1 > m) m = v - 1;
          if (m > arr[i]) arr[i] = m;
        }
  }
}

function bfsLight(chunk, arr, queue) {
  const { blocks } = chunk;
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const level = arr[i];
    if (level <= 1) continue;
    const y = (i / 256) | 0;
    const rem = i - y * 256;
    const z = (rem / CHUNK_SX) | 0;
    const x = rem - z * CHUNK_SX;
    const nb = [[x+1,y,z],[x-1,y,z],[x,y+1,z],[x,y-1,z],[x,y,z+1],[x,y,z-1]];
    for (const [nx, ny, nz] of nb) {
      if (nx < 0 || nz < 0 || nx >= CHUNK_SX || nz >= CHUNK_SZ || ny < 0 || ny >= WORLD_HEIGHT) continue;
      const ni = idx(nx, ny, nz);
      if (isOpaque(blocks[ni])) continue;
      if (arr[ni] + 1 < level) { arr[ni] = level - 1; queue.push(ni); }
    }
  }
}

// ---- face definitions for meshing ------------------------------------------
// corners listed CCW from outside; dir-axis component already set
const FACE = [
  { dir: [1, 0, 0],  corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], uAxis: 2, vAxis: 1 }, // +X east
  { dir: [-1, 0, 0], corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], uAxis: 2, vAxis: 1 }, // -X west
  { dir: [0, 1, 0],  corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uAxis: 0, vAxis: 2 }, // +Y top
  { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uAxis: 0, vAxis: 2 }, // -Y bottom
  { dir: [0, 0, 1],  corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], uAxis: 0, vAxis: 1 }, // +Z south
  { dir: [0, 0, -1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], uAxis: 0, vAxis: 1 }, // -Z north
];
const AXIS = [[1,0,0],[0,1,0],[0,0,1]];
const AO_BRIGHT = [0.42, 0.62, 0.82, 1.0];
// directional face shading (top brightest)
const FACE_SHADE = [0.80, 0.80, 1.0, 0.55, 0.90, 0.70];

function shouldDraw(selfId, nId) {
  if (nId === BLOCK.AIR) return true;
  const nb = getBlock(nId);
  const sb = getBlock(selfId);
  if (nb.opaque) return false;
  if (sb.liquid) {
    if (nId === selfId) return false;
    return true;
  }
  if (isLiquid(nId)) return true;
  if (nId === selfId && nb.transparent) return false; // merge same translucent (glass/leaves)
  return true;
}

function bucketOf(id) {
  const b = getBlock(id);
  if (b.liquid) return MAT.LIQUID;
  if (id === BLOCK.GLASS || id === BLOCK.GLASS_PANE || id === BLOCK.ICE) return MAT.TRANSPARENT;
  return MAT.OPAQUE;
}

function waveOf(id) {
  const b = getBlock(id);
  if (b.liquid) return 2;
  if (b.waves) return 1;
  return 0;
}

// ---- mesher ----------------------------------------------------------------
// world provides: getBlock(wx,wy,wz), getSky(wx,wy,wz), getBlockLight, tintAt(wx,wz,tintType), uv(name)
export function buildGeometry(chunk, world) {
  const baseX = chunk.cx * CHUNK_SX;
  const baseZ = chunk.cz * CHUNK_SZ;
  const out = {
    [MAT.OPAQUE]: newBuf(),
    [MAT.TRANSPARENT]: newBuf(),
    [MAT.LIQUID]: newBuf(),
  };

  const wget = (x, y, z) => world.getBlock(baseX + x, y, baseZ + z);
  const isOpAt = (x, y, z) => { const id = wget(x, y, z); return id !== BLOCK.AIR && isOpaque(id); };

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SZ; z++) {
      for (let x = 0; x < CHUNK_SX; x++) {
        const id = chunk.blocks[idx(x, y, z)];
        if (id === BLOCK.AIR) continue;
        const b = getBlock(id);
        const wx = baseX + x, wz = baseZ + z;

        if (b.render === RENDER.CROSS || b.render === RENDER.TORCH) {
          emitCross(out[MAT.OPAQUE], x, y, z, wx, wz, b, world);
          continue;
        }

        const bucket = out[bucketOf(id)];
        for (let f = 0; f < 6; f++) {
          const dir = FACE[f].dir;
          const nx = x + dir[0], ny = y + dir[1], nz = z + dir[2];
          const nId = wget(nx, ny, nz);
          if (!shouldDraw(id, nId)) continue;
          // liquid: only render top + sides exposed to air, not internal
          emitFace(bucket, f, x, y, z, wx, wz, b, id, world, isOpAt);
        }
      }
    }
  }
  return out;
}

function newBuf() { return { pos: [], nor: [], uv: [], col: [], lit: [], ao: [], wav: [], idx: [], count: 0 }; }

function tintColor(b, wx, wz, world) {
  if (b.tint === 1) return world.tintAt(wx, wz, 'grass');
  if (b.tint === 2) return world.tintAt(wx, wz, 'foliage');
  if (b.tint === 3) return world.tintAt(wx, wz, 'water');
  return [1, 1, 1];
}

function emitFace(buf, f, x, y, z, wx, wz, b, id, world, isOpAt) {
  const face = FACE[f];
  const dir = face.dir;
  const texName = b.tex[['px', 'nx', 'py', 'ny', 'pz', 'nz'][f]];
  const uv = world.uv(texName);
  const tint = tintColor(b, wx, wz, world);
  const shade = FACE_SHADE[f];

  // neighbour light (the cell the face looks into)
  const nx = x + dir[0], ny = y + dir[1], nz = z + dir[2];
  const skyL = world.getSky(wx + dir[0], ny, wz + dir[2]) / 15;
  const blkL = world.getBlockLight(wx + dir[0], ny, wz + dir[2]) / 15;

  const aoVals = [0, 0, 0, 0];
  const baseIndex = buf.count;
  const t1 = face.uAxis === 0 ? 0 : (face.vAxis === 0 ? 0 : 0);

  // tangent axes (the two not equal to dir axis)
  const dirAxis = dir[0] !== 0 ? 0 : (dir[1] !== 0 ? 1 : 2);
  const tangents = [0, 1, 2].filter(a => a !== dirAxis);

  for (let c = 0; c < 4; c++) {
    const corner = face.corners[c];
    const px = x + corner[0], py = y + corner[1], pz = z + corner[2];
    buf.pos.push(px, py, pz);
    buf.nor.push(dir[0], dir[1], dir[2]);

    // ao sampling
    const su = corner[tangents[0]] === 1 ? 1 : -1;
    const sv = corner[tangents[1]] === 1 ? 1 : -1;
    const a1 = AXIS[tangents[0]], a2 = AXIS[tangents[1]];
    const nbx = x + dir[0], nby = y + dir[1], nbz = z + dir[2];
    const side1 = isOpAt(nbx + su * a1[0], nby + su * a1[1], nbz + su * a1[2]) ? 1 : 0;
    const side2 = isOpAt(nbx + sv * a2[0], nby + sv * a2[1], nbz + sv * a2[2]) ? 1 : 0;
    const cor = isOpAt(nbx + su * a1[0] + sv * a2[0], nby + su * a1[1] + sv * a2[1], nbz + su * a1[2] + sv * a2[2]) ? 1 : 0;
    const aoLevel = (side1 && side2) ? 0 : (3 - (side1 + side2 + cor));
    const aoB = AO_BRIGHT[aoLevel];
    aoVals[c] = aoB;
    buf.ao.push(aoB * shade);

    // uv
    const uu = corner[face.uAxis];
    const vv = corner[face.vAxis];
    buf.uv.push(uv[0] + uu * (uv[2] - uv[0]), uv[3] - vv * (uv[3] - uv[1]));

    buf.col.push(tint[0], tint[1], tint[2]);
    buf.lit.push(skyL, blkL);
    buf.wav.push(waveOf(id) === 2 ? 1 : 0);
  }
  buf.count += 4;

  // triangulation with AO-aware flip
  if (aoVals[0] + aoVals[2] > aoVals[1] + aoVals[3]) {
    buf.idx.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
  } else {
    buf.idx.push(baseIndex + 1, baseIndex + 2, baseIndex + 3, baseIndex + 1, baseIndex + 3, baseIndex);
  }
}

// cross-shaped plants/torches: two intersecting quads, emitted double (both sides)
function emitCross(buf, x, y, z, wx, wz, b, world) {
  const uv = world.uv(b.tex.pz);
  const tint = tintColor(b, wx, wz, world);
  const skyL = world.getSky(wx, y, wz) / 15;
  const blkL = world.getBlockLight(wx, y, wz) / 15;
  const wav = b.waves ? 1 : 0;
  const inset = 0.15;
  const h = b.render === RENDER.TORCH ? 0.6 : 1.0;
  const yoff = b.render === RENDER.TORCH ? 0.0 : 0.0;
  // four planes (two diagonals, each rendered front and back)
  const planes = [
    [[inset,0,inset],[1-inset,0,1-inset]],
    [[1-inset,0,1-inset],[inset,0,inset]],
    [[1-inset,0,inset],[inset,0,1-inset]],
    [[inset,0,1-inset],[1-inset,0,inset]],
  ];
  for (const [a, c] of planes) {
    const base = buf.count;
    const pts = [
      [a[0], 0, a[2]], [a[0], h, a[2]], [c[0], h, c[2]], [c[0], 0, c[2]],
    ];
    const uvc = [[uv[0], uv[3]], [uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]]];
    const nrm = [c[2] - a[2], 0, a[0] - c[0]];
    for (let i = 0; i < 4; i++) {
      buf.pos.push(x + pts[i][0], y + yoff + pts[i][1], z + pts[i][2]);
      buf.nor.push(nrm[0], 0, nrm[2]);
      buf.uv.push(uvc[i][0], uvc[i][1]);
      buf.col.push(tint[0], tint[1], tint[2]);
      buf.lit.push(skyL, blkL);
      buf.ao.push(0.95);
      buf.wav.push((i === 1 || i === 2) ? wav : 0); // only top verts sway
    }
    buf.count += 4;
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
