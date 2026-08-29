/* Deterministic prop scattering. Every client places the same tree on the same
 * rock because placement is a pure function of the world seed and the cell. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { flora } from './flora.js';
import { rng, hash32, clamp } from '../../shared/rng.js';
import { biomeIndexAt } from '../../shared/constants.js';

const CELL = 40;

/* per biome: [type, weightPerCell, minSlope, maxAltJitter] */
const DENSITY = [
  // shore
  [['palm', 0.95, 0.84], ['grass', 3.0, 0.78], ['driftwood', 0.30, 0.88], ['boulderS', 0.6, 0.80], ['boulderM', 0.18, 0.82]],
  // jungle
  [['jungleTree', 3.4, 0.70], ['smallTree', 2.6, 0.68], ['fern', 4.0, 0.66], ['grass', 2.6, 0.70], ['boulderM', 0.5, 0.74], ['boulderL', 0.22, 0.76]],
  // rock face
  [['boulderL', 0.75, 0.62], ['boulderM', 1.1, 0.60], ['boulderS', 1.6, 0.58], ['deadTree', 0.22, 0.80], ['tussock', 0.7, 0.74]],
  // alpine
  [['pine', 0.5, 0.76], ['boulderM', 0.8, 0.62], ['boulderS', 1.3, 0.60], ['tussock', 0.9, 0.78], ['deadTree', 0.12, 0.82]],
  // caldera
  [['obsidian', 1.1, 0.60], ['boulderS', 1.5, 0.58], ['boulderM', 0.6, 0.62]],
];

const RANGE = {
  palm: 340, jungleTree: 340, smallTree: 300, pine: 340, deadTree: 300,
  boulderL: 300, boulderM: 240, boulderS: 170, obsidian: 260, driftwood: 220,
  fern: 130, grass: 95, tussock: 110,
};
const CAP = {
  palm: 320, jungleTree: 620, smallTree: 520, pine: 260, deadTree: 140,
  boulderL: 260, boulderM: 380, boulderS: 460, obsidian: 300, driftwood: 120,
  fern: 700, grass: 900, tussock: 520,
};

export class Scatter {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.lib = flora();
    this.groups = new Map();
    this.lastX = 1e9; this.lastZ = 1e9;
    this.rebuildQueue = [];

    for (const [name, def] of Object.entries(this.lib)) {
      const cap = CAP[name] || 200;
      const meshes = def.parts.map((part) => {
        const im = new THREE.InstancedMesh(part.geo, part.mat, cap);
        im.castShadow = !def.noShadow;
        im.receiveShadow = true;
        im.frustumCulled = false;
        im.count = 0;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(im);
        return im;
      });
      this.groups.set(name, { meshes, cap, range: RANGE[name] || 240, def });
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);
    this._n = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  /** Rebuilds one prop type's instance list around (px,pz). */
  rebuildType(name, px, pz) {
    const g = this.groups.get(name);
    const world = this.world;
    const R = g.range;
    const c0x = Math.floor((px - R) / CELL), c1x = Math.floor((px + R) / CELL);
    const c0z = Math.floor((pz - R) / CELL), c1z = Math.floor((pz + R) / CELL);
    let n = 0;
    const nrm = { x: 0, y: 1, z: 0 };

    for (let cz = c0z; cz <= c1z && n < g.cap; cz++) {
      for (let cx = c0x; cx <= c1x && n < g.cap; cx++) {
        const r = rng(hash32(hash32(cx * 73856093) ^ hash32(cz * 19349663) ^ world.seed));
        // deterministic per-cell: walk the full biome table so every type sees the
        // same random stream regardless of which type is being rebuilt
        for (let b = 0; b < DENSITY.length; b++) {
          for (const [type, weight, minSlope] of DENSITY[b]) {
            const tries = Math.floor(weight) + (r() < weight % 1 ? 1 : 0);
            for (let i = 0; i < tries; i++) {
              const ox = r(), oz = r(), rot = r(), sc = r(), tilt = r();
              if (type !== name) continue;
              const x = (cx + ox) * CELL, z = (cz + oz) * CELL;
              const dx = x - px, dz = z - pz;
              if (dx * dx + dz * dz > R * R) continue;
              const y = world.height(x, z);
              if (biomeIndexAt(y) !== b) continue;
              world.normal(x, z, nrm);
              if (nrm.y < minSlope) continue;
              if (world.routeInfluence(x, z) > 0.55 && !(type === 'grass' || type === 'tussock' || type === 'fern')) continue;
              if (n >= g.cap) break;
              this.place(g, n++, x, y, z, nrm, rot, sc, tilt, type);
            }
          }
        }
      }
    }
    for (const m of g.meshes) { m.count = n; m.instanceMatrix.needsUpdate = true; }
  }

  place(g, i, x, y, z, nrm, rot, sc, tilt, type) {
    const rocky = type.startsWith('boulder') || type === 'obsidian' || type === 'driftwood';
    this._n.set(nrm.x, nrm.y, nrm.z);
    this._q.setFromUnitVectors(this._up, this._n);
    if (!rocky) this._q.slerp(new THREE.Quaternion(), 0.62);   // plants stand up straighter than rocks lie
    const spin = new THREE.Quaternion().setFromAxisAngle(this._up, rot * Math.PI * 2);
    this._q.multiply(spin);
    const scale = 0.72 + sc * 0.62;
    this._p.set(x, y - (rocky ? 0.25 : 0.12) * scale, z);
    this._s.set(scale, scale * (0.85 + tilt * 0.35), scale);
    this._m.compose(this._p, this._q, this._s);
    for (const m of g.meshes) m.setMatrixAt(i, this._m);
  }

  /** Call every frame; spreads rebuild work across frames after the player moves. */
  update(px, pz) {
    if (Math.hypot(px - this.lastX, pz - this.lastZ) > CELL * 0.55) {
      this.lastX = px; this.lastZ = pz;
      this.rebuildQueue = [...this.groups.keys()];
    }
    if (this.rebuildQueue.length) this.rebuildType(this.rebuildQueue.shift(), this.lastX, this.lastZ);
  }

  primeAll(px, pz) {
    this.lastX = px; this.lastZ = pz;
    for (const name of this.groups.keys()) this.rebuildType(name, px, pz);
    this.rebuildQueue = [];
  }

  setWind(strength) {
    for (const [, g] of this.groups) {
      for (const m of g.meshes) if (m.material.userData.wind) m.material.userData.wind.value = strength;
    }
  }

  dispose() {
    for (const [, g] of this.groups) for (const m of g.meshes) { this.scene.remove(m); m.dispose(); }
    this.groups.clear();
  }
}
