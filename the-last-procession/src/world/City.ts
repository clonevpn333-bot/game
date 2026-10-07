import * as THREE from 'three';
import { cobbleTexture, facadeTexture, roofTexture, stoneTexture } from '../gfx/Materials';
import { addOutline, ghibli, toonMaterial } from '../gfx/Toon';
import { bell, box, cyl, merge, xf } from './Kit';
import { Terrain, Trees, Grass, mountains } from './Nature';
import { Crowd } from './Crowd';
import { Birds, fogBank, lamps, makeBanner } from './Props';
import { fbm } from '../util/math';

/**
 * Aurel, the capital — a hill-town of plaster, timber and terracotta.
 * Layout (metres):
 *  - Plaza of Saint Aldric centred at origin (r 34), cathedral to the west.
 *  - North wall at z = 70; the Pilgrim kneels beyond it.
 *  - The avenue runs east (+x) from the plaza to the East Gate at x = 420,
 *    crossing the canal on a bridge between x = 250 and 298.
 */
export const AUREL = {
  plazaR: 34,
  wallZ: 70,
  avenueHalf: 8,
  canal0: 250,
  canal1: 298,
  gateX: 420,
  bridgeSections: 12,
};

export interface BuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot?: number;
  tint?: number;
}

/**
 * Instanced box material whose texture coordinates are computed in metres
 * from the instance scale, so a facade texture keeps real proportions on
 * every building (and stays sane when a building is crushed).
 */
function worldUvMaterial(map: THREE.Texture, period: [number, number], roof = false): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ map });
  m.onBeforeCompile = (s) => {
    s.uniforms.uPeriod = { value: new THREE.Vector2(...period) };
    ghibli(s, {
      brushScale: 2,
      vertDecl: 'uniform vec2 uPeriod; varying vec2 vWUv;',
      vertBody: `
        vec3 isc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec3 lp = position * isc;
        vec3 an = abs(normal);
        ${roof ? 'vec2 wuv = vec2(lp.x, lp.y + abs(lp.z));' : 'vec2 wuv = an.x > 0.5 ? vec2(lp.z, lp.y) : (an.z > 0.5 ? vec2(lp.x, lp.y) : lp.xz);'}
        vWUv = wuv / uPeriod;`,
      fragDecl: 'varying vec2 vWUv;',
    });
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = texture2D(map, vWUv); diffuseColor *= sampledDiffuseColor;');
  };
  m.customProgramCacheKey = () => `worlduv-${roof ? 1 : 0}`;
  return m;
}

/** Instanced townhouses (plaster walls + tiled gables). Buildings can be crushed. */
export class CityBlocks {
  readonly group = new THREE.Group();
  readonly walls: THREE.InstancedMesh;
  readonly roofs: THREE.InstancedMesh;
  readonly specs: BuildingSpec[];
  readonly alive: boolean[];

  constructor(specs: BuildingSpec[], seed = 1) {
    this.specs = specs;
    this.alive = specs.map(() => true);
    const fac = facadeTexture(seed);
    fac.wrapS = fac.wrapT = THREE.RepeatWrapping;
    const roofT = roofTexture(seed + 1);
    roofT.wrapS = roofT.wrapT = THREE.RepeatWrapping;
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    wallGeo.translate(0, 0.5, 0);
    // gable prism (ridge along x)
    const roofGeo = new THREE.BufferGeometry();
    const P = [
      [-0.52, 0, -0.55], [0.52, 0, -0.55], [0.52, 1, 0], [-0.52, 1, 0],
      [0.52, 0, 0.55], [-0.52, 0, 0.55], [-0.52, 1, 0], [0.52, 1, 0],
      [-0.52, 0, 0.55], [-0.52, 0, -0.55], [-0.52, 1, 0],
      [0.52, 0, -0.55], [0.52, 0, 0.55], [0.52, 1, 0],
    ];
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
    roofGeo.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6, 8, 10, 9, 11, 13, 12]);
    roofGeo.computeVertexNormals();
    this.walls = new THREE.InstancedMesh(wallGeo, worldUvMaterial(fac, [9, 12]), specs.length);
    this.roofs = new THREE.InstancedMesh(roofGeo, worldUvMaterial(roofT, [4, 4], true), specs.length);
    this.walls.castShadow = this.roofs.castShadow = true;
    this.walls.receiveShadow = this.roofs.receiveShadow = true;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const plaster = ['#fff4e0', '#f6e0c0', '#ffe8d6', '#e8eef0', '#f8e6b8', '#f0d8c8'];
    const roofC = ['#ffffff', '#ffffff', '#ffd2b8', '#9ab4cc', '#b8d0b0', '#ffe0c0'];
    specs.forEach((s, i) => {
      this.setMatrix(i, 1, m);
      const t = s.tint ?? Math.abs(Math.sin(i * 91.7));
      c.set(plaster[Math.floor(t * plaster.length) % plaster.length]);
      this.walls.setColorAt(i, c);
      c.set(roofC[Math.floor(Math.abs(Math.sin(i * 13.1)) * roofC.length) % roofC.length]);
      this.roofs.setColorAt(i, c);
    });
    this.group.add(this.walls, this.roofs);
    addOutline(this.walls, 0.08, 1);
    addOutline(this.roofs, 0.08, 1);
  }

  private setMatrix(i: number, k: number, m: THREE.Matrix4): void {
    const s = this.specs[i];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot ?? 0);
    m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.w, s.h * k, s.d));
    this.walls.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(s.x, s.h * k, s.z), q, new THREE.Vector3(s.w, Math.min(s.w, s.d) * 0.62 * k, s.d));
    this.roofs.setMatrixAt(i, m);
  }

  /** Crush buildings inside a radius; returns crushed centres for debris FX. */
  crush(x: number, z: number, r: number): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    const m = new THREE.Matrix4();
    this.specs.forEach((s, i) => {
      if (!this.alive[i]) return;
      if (Math.hypot(s.x - x, s.z - z) < r + Math.max(s.w, s.d) * 0.4) {
        this.alive[i] = false;
        this.setMatrix(i, 0.12, m);
        out.push(new THREE.Vector3(s.x, s.h * 0.5, s.z));
      }
    });
    if (out.length) {
      this.walls.instanceMatrix.needsUpdate = true;
      this.roofs.instanceMatrix.needsUpdate = true;
    }
    return out;
  }

  rects(pad = 0): { x0: number; x1: number; z0: number; z1: number; i: number }[] {
    return this.specs
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.rot || Math.abs(Math.sin(s.rot * 2)) < 0.01)
      .map(({ s, i }) => {
        const swap = s.rot && Math.abs(Math.sin(s.rot)) > 0.5;
        const w = swap ? s.d : s.w;
        const d = swap ? s.w : s.d;
        return { x0: s.x - w / 2 - pad, x1: s.x + w / 2 + pad, z0: s.z - d / 2 - pad, z1: s.z + d / 2 + pad, i };
      });
  }
}

function outlined(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, w = 0.08): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  addOutline(m, w, 1);
  return m;
}

/** The cathedral of Saint Aldric with its bell tower. */
export function makeCathedral(): THREE.Group {
  const g = new THREE.Group();
  const stone = toonMaterial({ map: stoneTexture('#efe2c8', 5, 10), brushScale: 3 });
  const slate = toonMaterial({ color: '#56788c', brushScale: 3 });
  const gold = toonMaterial({ color: '#e8b45a', metal: true, brushScale: 2 });
  const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb45a').multiplyScalar(1.4) });
  outlined(merge([xf(box(30, 26, 56), [0, 13, 0]), xf(box(52, 18, 16), [0, 9, 6]), xf(box(14, 62, 14), [0, 31, -32]), xf(box(10, 30, 10), [-18, 15, 26]), xf(box(10, 30, 10), [18, 15, 26])]), stone, g);
  outlined(merge([xf(new THREE.CylinderGeometry(0.6, 22, 12, 4), [0, 32, 0], [Math.PI / 2, 0, Math.PI / 4], [1, 2.6, 0.75]), xf(new THREE.ConeGeometry(10, 34, 4), [0, 79, -32], [0, Math.PI / 4, 0]), xf(new THREE.ConeGeometry(7.5, 16, 4), [-18, 38, 26], [0, Math.PI / 4, 0]), xf(new THREE.ConeGeometry(7.5, 16, 4), [18, 38, 26], [0, Math.PI / 4, 0])]), slate, g);
  const gl = new THREE.Mesh(merge([xf(cyl(5.5, 5.5, 1.2, 24), [0, 16, 28.4], [Math.PI / 2, 0, 0]), xf(box(3, 10, 0.6), [-9, 14, 28.2]), xf(box(3, 10, 0.6), [9, 14, 28.2]), xf(box(4, 8, 0.6), [0, 50, -24.8])]), glass);
  g.add(gl);
  outlined(merge([xf(new THREE.SphereGeometry(1.2, 10, 8), [0, 97, -32]), xf(bell(3.2), [0, 41, -32])]), gold, g);
  return g;
}

export interface AurelSet {
  root: THREE.Group;
  terrain: Terrain;
  grass: Grass;
  city: CityBlocks;
  crowd: Crowd;
  birds: Birds;
  banners: THREE.Mesh[];
  bridge: THREE.Mesh[];
  bridgeAlive: boolean[];
  water: THREE.Mesh;
  gate: THREE.Group;
}

const inCity = (x: number, z: number) => x > -262 && x < 482 && z > -262 && z < AUREL.wallZ + 12;

export function aurelHeight(x: number, z: number): number {
  if (inCity(x, z)) return 0;
  const d = Math.max(0, Math.hypot(x - 100, z) - 520);
  const edge = Math.min(1, Math.max(Math.abs(x - 110) - 372, z - AUREL.wallZ - 12, -262 - z) / 40);
  return (fbm(x * 0.004, z * 0.004, 4) * 30 * Math.min(1, d / 400) + Math.max(0, d - 900) * 0.05) * Math.max(0, edge);
}

export function buildAurel(withCrowd: boolean): AurelSet {
  const root = new THREE.Group();
  const A = AUREL;

  // ---- ground: patchwork farmland beyond the walls, paving inside
  const terrain = new Terrain({
    size: 5200,
    seg: 180,
    center: [150, 0],
    height: aurelHeight,
    color: (x, z, h) => {
      if (inCity(x, z)) return new THREE.Color('#b4a48c');
      const n = fbm(x * 0.01, z * 0.01, 3);
      const fx = Math.floor((x + 3000) / 90);
      const fz = Math.floor((z + 3000) / 70);
      const f = Math.abs(Math.sin(fx * 12.9898 + fz * 78.233)) % 1;
      const fields = ['#c8a850', '#9aae4a', '#d4b860', '#7e9a40', '#b49a58', '#a8b860'];
      return new THREE.Color(fields[Math.floor(f * fields.length)]).lerp(new THREE.Color('#6a7a40'), Math.max(0, n * 0.6) + Math.min(0.3, h * 0.004));
    },
    grass: (x, z) => (inCity(x, z) ? 0 : 0.9),
    grassColor: '#8a9a40',
  });
  root.add(terrain.mesh);
  const grass = new Grass(terrain, { root: '#5a6a26', tip: '#d8c870', patch: '#a8c060', height: 0.9, flowers: ['#ffffff', '#f2d040', '#e86060'] });
  root.add(grass.group);

  // ---- paving
  const cobT = cobbleTexture(3, 18);
  const cob = toonMaterial({ map: cobT, brushScale: 3 });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(A.plazaR + 6, 64), cob);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.03;
  plaza.receiveShadow = true;
  root.add(plaza);
  const avT = cobbleTexture(4, 1);
  avT.repeat.set(90, 4);
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(A.gateX + 60, A.avenueHalf * 2 + 4), toonMaterial({ map: avT, brushScale: 3 }));
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set((A.gateX + 60) / 2, 0.04, 0);
  avenue.receiveShadow = true;
  root.add(avenue);
  const nr = new THREE.Mesh(new THREE.PlaneGeometry(14, A.wallZ - A.plazaR + 10), cob);
  nr.rotation.x = -Math.PI / 2;
  nr.position.set(0, 0.035, (A.wallZ + A.plazaR) / 2);
  nr.receiveShadow = true;
  root.add(nr);

  // ---- fountain with the bell-saint
  const stoneM = toonMaterial({ map: stoneTexture('#e6d8bc', 2, 6), brushScale: 2 });
  outlined(merge([xf(cyl(7, 7.4, 1.2, 32), [0, 0.6, 0]), xf(cyl(1.6, 2, 4, 12), [0, 2.6, 0]), xf(cyl(3.2, 2.4, 0.6, 20), [0, 4.6, 0]), xf(box(1.2, 3.2, 1), [0, 6.4, 0])]), stoneM, root, 0.04);
  outlined(xf(bell(1.4, 20), [0, 7.6, 0]), toonMaterial({ color: '#e8b45a', metal: true }), root, 0.03);
  const water = new THREE.Mesh(new THREE.CircleGeometry(6.6, 40), toonMaterial({ color: '#5aa0b4', emissive: '#14404a' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.0;
  root.add(water);

  const cath = makeCathedral();
  cath.rotation.y = Math.PI / 2;
  cath.position.set(-74, 0, 0);
  root.add(cath);

  // ---- buildings
  const specs: BuildingSpec[] = [];
  const rnd = (i: number) => Math.sin(i * 127.1) * 0.5 + 0.5;
  let k = 0;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const deg = ((a * 180) / Math.PI + 360) % 360;
    if (deg < 14 || deg > 346) continue;
    if (deg > 72 && deg < 108) continue;
    if (deg > 245 && deg < 295) continue;
    const r = A.plazaR + 12 + rnd(k) * 4;
    specs.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, w: 12 + rnd(k + 1) * 4, d: 11, h: 12 + rnd(k + 2) * 10, rot: a });
    k += 3;
  }
  for (let x = 52; x < A.gateX - 14; x += 14) {
    if (x > A.canal0 - 10 && x < A.canal1 + 8) continue;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const w = 11 + rnd(k) * 3;
        specs.push({ x: x + rnd(k + 1) * 2, z: side * (A.avenueHalf + 7 + row * 15), w, d: 12, h: 10 + rnd(k + 2) * 12 + (row === 2 ? 6 : 0) });
        k += 3;
      }
    }
  }
  for (let x = -200; x < 470; x += 16) {
    for (let z = -240; z < A.wallZ - 6; z += 16) {
      if (Math.abs(z) < 52 && x > 40) continue;
      if (Math.hypot(x, z) < A.plazaR + 32) continue;
      if (x < -40 && x > -110 && Math.abs(z) < 40) continue;
      if (x > A.canal0 - 14 && x < A.canal1 + 10) continue;
      if (Math.abs(x) < 10 && z > 0) continue;
      if (rnd(k) < 0.18) {
        k++;
        continue;
      }
      specs.push({ x: x + rnd(k) * 3, z: z + rnd(k + 1) * 3, w: 11 + rnd(k + 2) * 3, d: 11 + rnd(k + 3) * 3, h: 9 + rnd(k + 4) * 14 });
      k += 5;
    }
  }
  const city = new CityBlocks(specs, 7);
  root.add(city.group);

  // skyline towers
  const towerM = toonMaterial({ map: stoneTexture('#ecdcbc', 9, 12), brushScale: 3 });
  const roofM = toonMaterial({ color: '#4d7088', brushScale: 3 });
  const towers: THREE.BufferGeometry[] = [];
  const spires: THREE.BufferGeometry[] = [];
  for (const [x, z, h] of [[120, -70, 46], [-130, 90, 52], [200, 56, 40], [360, -60, 44], [-160, -120, 50], [60, -160, 38]] as const) {
    towers.push(xf(cyl(5, 6, h, 10), [x, h / 2, z]));
    spires.push(xf(new THREE.ConeGeometry(6.5, 18, 10), [x, h + 9, z]));
  }
  outlined(merge(towers), towerM, root);
  outlined(merge(spires), roofM, root);

  // walls + gate
  const wallParts: THREE.BufferGeometry[] = [];
  for (let x = -260; x <= 480; x += 40) {
    wallParts.push(xf(box(40, 16, 6), [x + 20, 8, A.wallZ + 4]));
    wallParts.push(xf(cyl(6, 7, 24, 10), [x, 12, A.wallZ + 4]));
    for (let c = 0; c < 6; c++) wallParts.push(xf(box(3, 2.4, 6.4), [x + 4 + c * 6.4, 17, A.wallZ + 4]));
  }
  for (let z = -240; z <= A.wallZ; z += 40) {
    if (Math.abs(z + 20) < 30) continue;
    wallParts.push(xf(box(6, 16, 40), [A.gateX + 20, 8, z + 20]));
  }
  outlined(merge(wallParts), towerM, root);
  const gate = new THREE.Group();
  gate.position.set(A.gateX + 20, 0, 0);
  outlined(merge([xf(box(10, 26, 10), [0, 13, -16]), xf(box(10, 26, 10), [0, 13, 16]), xf(box(10, 8, 22), [0, 22, 0])]), towerM, gate);
  outlined(merge([xf(new THREE.ConeGeometry(8, 14, 4), [0, 33, -16], [0, Math.PI / 4, 0]), xf(new THREE.ConeGeometry(8, 14, 4), [0, 33, 16], [0, Math.PI / 4, 0])]), roofM, gate);
  root.add(gate);

  // canal + bridge
  outlined(merge([xf(box(4, 22, 520), [A.canal0, -11, -60]), xf(box(4, 22, 520), [A.canal1, -11, -60])]), towerM, root);
  const canalWater = new THREE.Mesh(new THREE.PlaneGeometry(A.canal1 - A.canal0, 520), toonMaterial({ color: '#4a8aa0', emissive: '#103844' }));
  canalWater.rotation.x = -Math.PI / 2;
  canalWater.position.set((A.canal0 + A.canal1) / 2, -14, -60);
  root.add(canalWater);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(A.canal1 - A.canal0 - 4, 14, 520), toonMaterial({ color: '#6a5a4a', side: THREE.BackSide }));
  pit.position.set((A.canal0 + A.canal1) / 2, -7, -60);
  root.add(pit);
  const bridge: THREE.Mesh[] = [];
  const secLen = (A.canal1 - A.canal0) / A.bridgeSections;
  const deckGeo = merge([xf(box(secLen - 0.3, 1.6, 16), [0, -0.8, 0]), xf(box(secLen - 0.3, 1.2, 0.8), [0, 0.6, 7.6]), xf(box(secLen - 0.3, 1.2, 0.8), [0, 0.6, -7.6]), xf(box(secLen * 0.6, 4, 3), [0, -3, 0])]);
  for (let i = 0; i < A.bridgeSections; i++) {
    const m = new THREE.Mesh(deckGeo, towerM);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    addOutline(m, 0.05, 1, undefined, true);
    m.position.set(A.canal0 + secLen * (i + 0.5), 0, 0);
    bridge.push(m);
  }

  // banners
  const banners: THREE.Mesh[] = [];
  for (let x = 46; x < A.gateX; x += 36) {
    for (const side of [-1, 1]) {
      const b = makeBanner(side > 0 ? '#2a5aa0' : '#c8902e', 1.6, 5);
      b.group.position.set(x, 0, side * (A.avenueHalf + 0.6));
      b.group.rotation.y = side > 0 ? 0 : Math.PI;
      root.add(b.group);
      banners.push(b.cloth);
    }
  }

  // hedgerows & copses across the farmland (scale cues for the giants)
  const treePts: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const row = i % 14;
    const x = -1300 + ((i * 0.618034) % 1) * 2600;
    const z = 160 + row * 75 + Math.sin(i * 3.7) * 12;
    if (Math.abs(x - 100) < 30 && z < 400) continue;
    treePts.push({ x, y: aurelHeight(x, z), z, s: 1.7 });
  }
  for (let i = 0; i < 160; i++) {
    const a = i * 2.39996;
    const r = 520 + Math.sqrt(i) * 40;
    const x = 150 + Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z < -300 || z > 60) treePts.push({ x, y: aurelHeight(x, z), z, s: 1.8 });
  }
  root.add(new Trees(treePts, { leaf: '#7a9a3e', leafDark: '#33502a', trunk: '#5a3e2a', shape: 'round' }, 4).group);

  root.add(mountains({ radius: 2700, height: 460, colors: ['#7a8aa8', '#98a8c4', '#b4c2d8'], snow: 0.9, seed: 3 }));
  root.add(fogBank(16, new THREE.Vector3(150, 40, 700), new THREE.Vector3(2400, 60, 600), 600, '#f6d4b4', 0.18));

  // crowd in the plaza, facing north
  const pts: THREE.Vector3[] = [];
  if (withCrowd) {
    for (let i = 0; i < 240; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = 9 + Math.sqrt(i / 240) * 24;
      const p = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
      if (Math.abs(p.x) < 4 && p.z > 4) continue;
      if (p.z > 18 && Math.abs(p.x) < 9) continue;
      if (Math.hypot(p.x, p.z) < 8.5) continue;
      pts.push(p);
    }
  }
  const crowd = new Crowd(pts);
  crowd.lookAt = new THREE.Vector3(0, 0, 160);
  root.add(crowd.group);
  const birds = new Birds(40, new THREE.Vector3(0, 0, 60), 160, 90);
  root.add(birds.mesh);

  const lampPos: [number, number][] = [];
  for (let x = 46; x < A.gateX; x += 18) lampPos.push([x, 9.6], [x + 9, -9.6]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lampPos.push([Math.sin(a) * (A.plazaR + 2), Math.cos(a) * (A.plazaR + 2)]);
  }
  root.add(lamps(lampPos));

  return { root, terrain, grass, city, crowd, birds, banners, bridge, bridgeAlive: bridge.map(() => true), water: canalWater, gate };
}

export function aurelGround(set: AurelSet, x: number, z: number): number {
  const A = AUREL;
  if (x > A.canal0 && x < A.canal1) {
    if (Math.abs(z) < 7.6) {
      const i = Math.floor(((x - A.canal0) / (A.canal1 - A.canal0)) * A.bridgeSections);
      const sec = set.bridge[Math.max(0, Math.min(A.bridgeSections - 1, i))];
      if (set.bridgeAlive[Math.max(0, Math.min(A.bridgeSections - 1, i))]) return sec.position.y;
    }
    return -40;
  }
  return aurelHeight(x, z);
}
