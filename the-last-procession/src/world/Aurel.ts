import * as THREE from 'three';
import { G, merge, xf, bellGeo } from '../render/Geo';
import { cobbleTexture, stoneTexture, toon } from '../render/Materials';
import { CityBlocks, Crowd, makeCathedral, makeMountainRing, makeTerrain, makeBanner, makeTrees, type BuildingSpec, Birds, fogBank } from './World';
import { fbm } from '../utils/math';

/**
 * Aurel, the capital. Layout (meters):
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

export interface AurelSet {
  root: THREE.Group;
  city: CityBlocks;
  crowd: Crowd;
  birds: Birds;
  banners: THREE.Mesh[];
  bridge: THREE.Mesh[];
  bridgeAlive: boolean[];
  water: THREE.Mesh;
  gate: THREE.Group;
}

export function buildAurel(withCrowd: boolean): AurelSet {
  const root = new THREE.Group();
  const A = AUREL;

  // ground: farmland beyond, cobbles inside the city
  const ground = makeTerrain({
    size: 5200,
    seg: 120,
    center: new THREE.Vector2(150, 0),
    height: (x, z) => {
      const inCity = x > -260 && x < 480 && z > -260 && z < A.wallZ + 10;
      if (inCity) return 0;
      const d = Math.max(0, Math.hypot(x - 100, z) - 520);
      return fbm(x * 0.004, z * 0.004, 4) * 30 * Math.min(1, d / 400) + Math.max(0, d - 900) * 0.05;
    },
    color: (x, z, h) => {
      const inCity = x > -260 && x < 480 && z > -260 && z < A.wallZ + 10;
      if (inCity) return new THREE.Color('#9a8a78');
      const n = fbm(x * 0.01, z * 0.01, 3);
      const field = Math.sin(x * 0.02) * Math.cos(z * 0.017) > 0 ? 1 : 0;
      return new THREE.Color().setHSL(0.11 + field * 0.08 + n * 0.03, 0.42, 0.42 + n * 0.08 + h * 0.002);
    },
  });
  root.add(ground);

  // cobbled plaza + avenue overlay
  const cob = new THREE.MeshStandardMaterial({ map: cobbleTexture(3, 18), roughness: 0.92 });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(A.plazaR + 6, 64), cob);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.03;
  plaza.receiveShadow = true;
  root.add(plaza);
  const avTex = cobbleTexture(4, 1);
  avTex.repeat.set(90, 4);
  const avenue = new THREE.Mesh(new THREE.PlaneGeometry(A.gateX + 60, A.avenueHalf * 2 + 4), new THREE.MeshStandardMaterial({ map: avTex, roughness: 0.92 }));
  avenue.rotation.x = -Math.PI / 2;
  avenue.position.set((A.gateX + 60) / 2, 0.04, 0);
  avenue.receiveShadow = true;
  root.add(avenue);
  // north road from plaza to the wall
  const nr = new THREE.Mesh(new THREE.PlaneGeometry(14, A.wallZ - A.plazaR + 10), cob);
  nr.rotation.x = -Math.PI / 2;
  nr.position.set(0, 0.035, (A.wallZ + A.plazaR) / 2);
  root.add(nr);

  // fountain with the bell-saint statue
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTexture('#d9cbb0', 2, 6), roughness: 0.85 });
  const fountain = new THREE.Mesh(merge([xf(G.cyl(7, 7.4, 1.2, 24), [0, 0.6, 0]), xf(G.cyl(1.6, 2, 4, 10), [0, 2.6, 0]), xf(G.cyl(3.2, 2.4, 0.6, 16), [0, 4.6, 0]), xf(G.box(1.2, 3.2, 1), [0, 6.4, 0])]), stoneM);
  fountain.castShadow = fountain.receiveShadow = true;
  root.add(fountain);
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b25a', metalness: 0.9, roughness: 0.3 });
  const statueBell = new THREE.Mesh(bellGeo(1.4), gold);
  statueBell.position.set(0, 7.6, 0);
  statueBell.castShadow = true;
  root.add(statueBell);
  const water = new THREE.Mesh(new THREE.CircleGeometry(6.6, 32), new THREE.MeshStandardMaterial({ color: '#3b6a7a', roughness: 0.1, metalness: 0.3, emissive: '#10303a' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 1.0;
  root.add(water);

  // cathedral (west side, facing the plaza)
  const cath = makeCathedral();
  cath.rotation.y = Math.PI / 2;
  cath.position.set(-74, 0, 0);
  root.add(cath);

  // ---- buildings
  const specs: BuildingSpec[] = [];
  const rnd = (i: number) => Math.sin(i * 127.1) * 0.5 + 0.5;
  let k = 0;
  // ring around the plaza (leave gaps east for the avenue, north for the road, west for the cathedral)
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const deg = ((a * 180) / Math.PI + 360) % 360;
    if (deg < 14 || deg > 346) continue; // north road (a ~ 0 => +z)
    if (deg > 72 && deg < 108) continue; // east avenue (+x)
    if (deg > 245 && deg < 295) continue; // cathedral
    const r = A.plazaR + 12 + rnd(k) * 4;
    specs.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, w: 12 + rnd(k + 1) * 4, d: 11, h: 12 + rnd(k + 2) * 10, rot: a });
    k += 3;
  }
  // avenue frontage: both sides, two rows deep
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
  // dense quarters north of the avenue (the Pilgrim's path) and south
  for (let x = -200; x < 470; x += 16) {
    for (let z = -240; z < A.wallZ - 6; z += 16) {
      if (Math.abs(z) < 52 && x > 40) continue; // avenue band
      if (Math.hypot(x, z) < A.plazaR + 32) continue;
      if (x < -40 && x > -110 && Math.abs(z) < 40) continue; // cathedral close
      if (x > A.canal0 - 14 && x < A.canal1 + 10) continue; // canal
      if (Math.abs(x) < 10 && z > 0) continue; // north road
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

  // a few towers for the skyline
  const towerM = new THREE.MeshStandardMaterial({ map: stoneTexture('#e3d3b4', 9, 12), roughness: 0.85 });
  const roofM = new THREE.MeshStandardMaterial({ color: '#4d6c80', roughness: 0.55, metalness: 0.3 });
  const towers: THREE.BufferGeometry[] = [];
  const spires: THREE.BufferGeometry[] = [];
  for (const [x, z, h] of [[120, -70, 46], [-130, 90, 52], [200, 56, 40], [360, -60, 44], [-160, -120, 50], [60, -160, 38]] as const) {
    towers.push(xf(G.cyl(5, 6, h, 8), [x, h / 2, z]));
    spires.push(xf(G.cone(6.5, 18, 8), [x, h + 9, z]));
  }
  const tm = new THREE.Mesh(merge(towers), towerM);
  const sm = new THREE.Mesh(merge(spires), roofM);
  tm.castShadow = sm.castShadow = true;
  root.add(tm, sm);

  // city wall (north) with towers
  const wallParts: THREE.BufferGeometry[] = [];
  for (let x = -260; x <= 480; x += 40) {
    wallParts.push(xf(G.box(40, 16, 6), [x + 20, 8, A.wallZ + 4]));
    wallParts.push(xf(G.cyl(6, 7, 24, 8), [x, 12, A.wallZ + 4]));
    for (let c = 0; c < 6; c++) wallParts.push(xf(G.box(3, 2.4, 6.4), [x + 4 + c * 6.4, 17, A.wallZ + 4]));
  }
  // east wall + gatehouse
  for (let z = -240; z <= A.wallZ; z += 40) {
    if (Math.abs(z + 20) < 30) continue;
    wallParts.push(xf(G.box(6, 16, 40), [A.gateX + 20, 8, z + 20]));
  }
  const wall = new THREE.Mesh(merge(wallParts), towerM);
  wall.castShadow = wall.receiveShadow = true;
  root.add(wall);
  const gate = new THREE.Group();
  gate.position.set(A.gateX + 20, 0, 0);
  const gh = new THREE.Mesh(merge([xf(G.box(10, 26, 10), [0, 13, -16]), xf(G.box(10, 26, 10), [0, 13, 16]), xf(G.box(10, 8, 22), [0, 22, 0])]), towerM);
  const gr = new THREE.Mesh(merge([xf(G.cone(8, 14, 4), [0, 33, -16], [0, Math.PI / 4, 0]), xf(G.cone(8, 14, 4), [0, 33, 16], [0, Math.PI / 4, 0])]), roofM);
  gh.castShadow = gr.castShadow = true;
  gate.add(gh, gr);
  root.add(gate);

  // canal + bridge sections
  const canalWalls = new THREE.Mesh(merge([xf(G.box(4, 22, 520), [A.canal0, -11, -60]), xf(G.box(4, 22, 520), [A.canal1, -11, -60])]), towerM);
  root.add(canalWalls);
  const waterM = new THREE.MeshStandardMaterial({ color: '#3d6f80', roughness: 0.08, metalness: 0.4, emissive: '#0c2a33' });
  const canalWater = new THREE.Mesh(new THREE.PlaneGeometry(A.canal1 - A.canal0, 520), waterM);
  canalWater.rotation.x = -Math.PI / 2;
  canalWater.position.set((A.canal0 + A.canal1) / 2, -14, -60);
  root.add(canalWater);
  // canal cut in the ground: dark pit faces
  const pit = new THREE.Mesh(new THREE.BoxGeometry(A.canal1 - A.canal0 - 4, 14, 520), new THREE.MeshStandardMaterial({ color: '#4a4038', side: THREE.BackSide }));
  pit.position.set((A.canal0 + A.canal1) / 2, -7, -60);
  root.add(pit);
  const bridge: THREE.Mesh[] = [];
  const secLen = (A.canal1 - A.canal0) / A.bridgeSections;
  const deckGeo = merge([xf(G.box(secLen - 0.3, 1.6, 16), [0, -0.8, 0]), xf(G.box(secLen - 0.3, 1.2, 0.8), [0, 0.6, 7.6]), xf(G.box(secLen - 0.3, 1.2, 0.8), [0, 0.6, -7.6]), xf(G.box(secLen * 0.6, 4, 3), [0, -3, 0])]);
  for (let i = 0; i < A.bridgeSections; i++) {
    const m = new THREE.Mesh(deckGeo, towerM);
    m.position.set(A.canal0 + secLen * (i + 0.5), 0, 0);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
    bridge.push(m);
  }

  // banners along the avenue
  const banners: THREE.Mesh[] = [];
  for (let x = 46; x < A.gateX; x += 36) {
    for (const side of [-1, 1]) {
      const b = makeBanner(side > 0 ? '#2a4f8c' : '#b8862e', 1.6, 5);
      b.group.position.set(x, 0, side * (A.avenueHalf + 0.6));
      b.group.rotation.y = side > 0 ? 0 : Math.PI;
      root.add(b.group);
      banners.push(b.cloth);
    }
  }

  // hedgerows and copses across the farmland beyond the walls (scale cues for the giants)
  const treePts: THREE.Vector3[] = [];
  for (let i = 0; i < 420; i++) {
    const row = i % 14;
    const x = -1300 + ((i * 0.618034) % 1) * 2600;
    const z = 160 + row * 75 + Math.sin(i * 3.7) * 12;
    if (Math.abs(x - 100) < 30 && z < 400) continue;
    treePts.push(new THREE.Vector3(x, 0, z));
  }
  for (let i = 0; i < 160; i++) {
    const a = i * 2.39996;
    const r = 520 + Math.sqrt(i) * 40;
    const p = new THREE.Vector3(150 + Math.cos(a) * r, 0, Math.sin(a) * r);
    if (p.z < -300 || p.z > 60) treePts.push(p);
  }
  root.add(makeTrees(treePts, { leaf: '#5e6b38', trunk: '#4a3020' }, 1.8));

  // far mountains + haze banks
  root.add(makeMountainRing(2600, 28, 520, '#7a6a8a', 1));
  root.add(fogBank(16, new THREE.Vector3(150, 40, 700), new THREE.Vector3(2400, 60, 600), 600, '#f2c6a4', 0.22));

  // crowd in the plaza (looking north toward the wall)
  const pts: THREE.Vector3[] = [];
  if (withCrowd) {
    for (let i = 0; i < 260; i++) {
      const a = (i * 2.399) % (Math.PI * 2);
      const r = 9 + Math.sqrt(i / 260) * 24;
      const p = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
      if (Math.abs(p.x) < 4 && p.z > 4) continue; // keep the run lane open
      if (p.z > 18 && Math.abs(p.x) < 9) continue;
      pts.push(p);
    }
  }
  const crowd = new Crowd(pts);
  crowd.lookAt = new THREE.Vector3(0, 0, 160);
  root.add(crowd.group);
  const birds = new Birds(40, new THREE.Vector3(0, 0, 60), 160, 90);
  root.add(birds.mesh);

  // lamp posts (practical warm lights read as scale cues)
  const lampGeo = merge([xf(G.cyl(0.12, 0.16, 4.4, 6), [0, 2.2, 0]), xf(G.box(0.6, 0.7, 0.6), [0, 4.6, 0])]);
  const lampM = toon('#2a2220');
  const lampGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(2) });
  const lampPos: [number, number][] = [];
  for (let x = 46; x < A.gateX; x += 18) lampPos.push([x, 9.6], [x + 9, -9.6]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lampPos.push([Math.sin(a) * (A.plazaR + 2), Math.cos(a) * (A.plazaR + 2)]);
  }
  const lamps = new THREE.InstancedMesh(lampGeo, lampM, lampPos.length);
  const glows = new THREE.InstancedMesh(xf(G.box(0.4, 0.45, 0.4), [0, 4.6, 0]), lampGlow, lampPos.length);
  const m = new THREE.Matrix4();
  lampPos.forEach(([x, z], i) => {
    m.makeTranslation(x, 0, z);
    lamps.setMatrixAt(i, m);
    glows.setMatrixAt(i, m);
  });
  root.add(lamps, glows);

  return { root, city, crowd, birds, banners, bridge, bridgeAlive: bridge.map(() => true), water: canalWater, gate };
}

export function aurelGround(set: AurelSet, x: number, z: number): number {
  const A = AUREL;
  if (x > A.canal0 && x < A.canal1) {
    if (Math.abs(z) < 7.6) {
      const i = Math.floor(((x - A.canal0) / (A.canal1 - A.canal0)) * A.bridgeSections);
      const sec = set.bridge[Math.max(0, Math.min(A.bridgeSections - 1, i))];
      if (set.bridgeAlive[i]) return sec.position.y;
    }
    return -40;
  }
  return 0;
}
