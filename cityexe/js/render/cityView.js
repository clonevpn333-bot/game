// Static + slowly-changing city visuals: ground, roads, markings, sidewalks, river,
// bridges, expressway, park, buildings (instanced), streetlights, trees, signals.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C, nodeX, nodeZ, BRIDGE_ROWS } from '../sim/config.js';
import { makeBuildingMaterial, makeInstMaterial, ModelKit, canvasTexture } from './materials.js';
import { hash01 } from '../core/rng.js';
import { makePolyline, samplePolyline } from '../core/math.js';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// --------- geometry helpers ---------
class GeoBuf {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; }
  quad(a, b, c, d, color, nrm = [0, 1, 0]) {
    // a,b,c,d as [x,y,z] counter-clockwise viewed from normal side
    const col = color instanceof THREE.Color ? color : new THREE.Color(color);
    for (const v of [a, b, c, a, c, d]) { this.p.push(v[0], v[1], v[2]); this.n.push(...nrm); this.c.push(col.r, col.g, col.b); this.uv.push(v[0] * 0.12, v[2] * 0.12); }
  }
  // horizontal rect
  rect(x0, z0, x1, z1, y, color) { this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], color); }
  box(x0, y0, z0, x1, y1, z1, color, topOnly = false) {
    this.rect(x0, z0, x1, z1, y1, color);
    if (topOnly) return;
    const c = new THREE.Color(color).multiplyScalar(0.8);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c, [0, 0, 1]);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], c, [0, 0, -1]);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], c, [1, 0, 0]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], c, [-1, 0, 0]);
  }
  // strip along polyline pts [[x,z]], ys per point, width w, at y offset dy
  strip(pts, ys, w, color, dy = 0, off = 0) {
    const n = pts.length;
    const L = [];
    for (let i = 0; i < n; i++) {
      let dx = 0, dz = 0;
      if (i > 0) { dx += pts[i][0] - pts[i - 1][0]; dz += pts[i][1] - pts[i - 1][1]; }
      if (i < n - 1) { dx += pts[i + 1][0] - pts[i][0]; dz += pts[i + 1][1] - pts[i][1]; }
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const rx = -dz, rz = dx;
      L.push([pts[i][0] + rx * (off - w / 2), pts[i][1] + rz * (off - w / 2), pts[i][0] + rx * (off + w / 2), pts[i][1] + rz * (off + w / 2)]);
    }
    for (let i = 1; i < n; i++) {
      const a = L[i - 1], b = L[i];
      const ya = ys[i - 1] + dy, yb = ys[i] + dy;
      this.quad([a[2], ya, a[3]], [b[2], yb, b[3]], [b[0], yb, b[1]], [a[0], ya, a[1]], color);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

function patchWet(mat, U, opts = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform float uWet; uniform float uSnow;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 1.0 - uWet * ${opts.darken ?? 0.35};
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9,0.92,0.95), uSnow * ${opts.snow ?? 0.7});`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, uWet * ${opts.gloss ?? 0.9});`);
  };
  mat.customProgramCacheKey = () => 'wet' + (opts.key || '');
  return mat;
}

export class CityView {
  constructor(renderer, world) {
    this.R = renderer;
    this.world = world;
    this.city = world.city;
    this.U = renderer.U;
    this.group = new THREE.Group();
    renderer.scene.add(this.group);
    this.riverX = [nodeX(2) + C.CURB + C.SIDEWALK_W + 0.4, nodeX(3) - C.CURB - C.SIDEWALK_W - 0.4];
    this.buildTextures();
    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildWater();
    this.buildStructures();
    this.buildBuildings();
    this.buildProps();
    this.buildSignals();
    this.dirty = true;
  }

  buildTextures() {
    this.asphaltTex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#5a5c60'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 50; g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
      for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(30,30,32,0.25)'; g.lineWidth = 1; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    }, { repeat: true });
    this.groundTex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#7a8a5a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12000; i++) { const r = 90 + Math.random() * 40, gg = 110 + Math.random() * 50; g.fillStyle = `rgba(${r},${gg},${70 + Math.random() * 30},0.4)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }, { repeat: true });
    this.paveTex = canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#b0aca4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,78,74,0.35)'; g.lineWidth = 1;
      for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); }
      for (let i = 0; i < 1500; i++) { const v = 150 + Math.random() * 40; g.fillStyle = `rgba(${v},${v},${v - 6},0.3)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    }, { repeat: true });
    this.poolTex = canvasTexture(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,220,160,1)'); gr.addColorStop(0.5, 'rgba(255,200,130,0.35)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }

  buildGround() {
    const m = patchWet(new THREE.MeshStandardMaterial({ map: this.groundTex, color: '#a8b08c', roughness: 0.95 }), this.U, { darken: 0.2, gloss: 0.2, snow: 0.95, key: 'g' });
    const [rx0, rx1] = this.riverX;
    for (const [a, b] of [[-3000, rx0], [rx1, 3000]]) {
      const g = new THREE.PlaneGeometry(b - a, 6000);
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (b - a) / 15, uv.getY(i) * 400);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((a + b) / 2, -0.05, 0);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    // distant hills ring for depth
    const hills = new THREE.Group();
    const hm = new THREE.MeshStandardMaterial({ color: '#5a6a50', roughness: 1, flatShading: true });
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const r = 1500 + hash01(k, 3) * 600;
      if (Math.abs(Math.cos(a)) < 0.06 && Math.sin(a) > 0) continue;
      const h = 60 + hash01(k, 9) * 220;
      const geo = new THREE.ConeGeometry(180 + hash01(k, 4) * 260, h, 7, 1);
      const mm = new THREE.Mesh(geo, hm);
      mm.position.set(Math.cos(a) * r, h / 2 - 10, Math.sin(a) * r);
      mm.rotation.y = hash01(k, 7) * 3;
      hills.add(mm);
    }
    this.group.add(hills);
  }

  buildRoads() {
    const net = this.city.net;
    const surf = new GeoBuf();
    const marks = new GeoBuf();
    const asphalt = new THREE.Color('#ffffff');
    const yellow = new THREE.Color('#e0b830'), white = new THREE.Color('#e8e8e4');
    for (const r of net.roads) {
      const w = r.width;
      surf.strip(r.pts, r.ys, w, asphalt, 0.02);
      const pl = makePolyline(r.pts);
      if (r.kind === 'street' || r.kind === 'bridge') {
        // dashed center line + parking edge lines, trimmed near intersections
        const A = net.nodes[r.a], B = net.nodes[r.b];
        const s0 = A.trim + 2, s1 = pl.length - B.trim - 2;
        const s = { x: 0, z: 0, h: 0 };
        for (let t = s0; t < s1; t += 6) {
          const e = Math.min(t + 3, s1);
          const p0 = samplePolyline(pl, t, { ...s }), p1 = samplePolyline(pl, e, { ...s });
          marks.strip([[p0.x, p0.z], [p1.x, p1.z]], [0, 0], 0.16, yellow, 0.045);
        }
        for (const side of [-1, 1]) {
          const p0 = samplePolyline(pl, s0, { ...s }), p1 = samplePolyline(pl, s1, { ...s });
          if (r.kind === 'street' && r.parking) marks.strip([[p0.x, p0.z], [p1.x, p1.z]], [0, 0], 0.12, white, 0.045, side * 3.6);
        }
      } else if (r.kind === 'highway' || r.kind === 'ramp') {
        marks.strip(r.pts, r.ys, 0.18, white, 0.06, r.width / 2 - 0.8);
        marks.strip(r.pts, r.ys, 0.18, yellow, 0.06, -r.width / 2 + 0.8);
      }
    }
    // intersections: squares + stop lines + crosswalks
    for (const n of net.nodes) {
      if (n.kind !== 'grid') continue;
      const hw = C.ROAD_W / 2;
      surf.rect(n.x - hw, n.z - hw, n.x + hw, n.z + hw, 0.021, asphalt);
      if (n.control === 'pass') {
        // fill the corner so the turn has asphalt
        continue;
      }
      // crosswalks on each arm
      for (const rid of n.arms) {
        const r = net.roads[rid];
        if (r.kind === 'ramp') continue;
        const other = r.a === n.id ? net.nodes[r.b] : net.nodes[r.a];
        const dx = Math.sign(other.x - n.x), dz = Math.sign(other.z - n.z);
        const cx = n.x + dx * 7.6, cz = n.z + dz * 7.6;
        for (let k = -5; k <= 5; k++) {
          const ox = dz !== 0 ? k * 1.05 : 0, oz = dx !== 0 ? k * 1.05 : 0;
          const ax = cx + ox, az = cz + oz;
          if (dx !== 0) marks.rect(ax - 1.4, az - 0.3, ax + 1.4, az + 0.3, 0.046, white);
          else marks.rect(ax - 0.3, az - 1.4, ax + 0.3, az + 1.4, 0.046, white);
        }
      }
      // stop lines at the end of each incoming lane
      for (const lid of n.inLanes) {
        const lane = net.links[lid];
        const p = lane.pl, k = p.n - 1;
        const ex = p.pts[k * 2], ez = p.pts[k * 2 + 1];
        const dx = ex - p.pts[(k - 1) * 2], dz = ez - p.pts[(k - 1) * 2 + 1];
        const L = Math.hypot(dx, dz) || 1;
        const ux = dx / L, uz = dz / L;
        const rx = -uz, rz = ux;
        marks.strip([[ex - rx * 1.6 - ux * 0.3, ez - rz * 1.6 - uz * 0.3], [ex + rx * 1.6 - ux * 0.3, ez + rz * 1.6 - uz * 0.3]], [0, 0], 0.45, white, 0.046);
      }
    }
    const roadMat = patchWet(new THREE.MeshStandardMaterial({ map: this.asphaltTex, color: '#8a8c90', roughness: 0.92, vertexColors: true }), this.U, { key: 'road', snow: 0.55 });
    const roads = new THREE.Mesh(surf.build(), roadMat);
    roads.receiveShadow = true;
    this.group.add(roads);
    const markMat = patchWet(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), this.U, { key: 'mark', darken: 0.15, snow: 0.6 });
    const mm = new THREE.Mesh(marks.build(), markMat);
    mm.receiveShadow = true;
    this.group.add(mm);
  }

  buildBlocks() {
    const pave = new GeoBuf();
    const lots = new GeoBuf();
    const plazas = new GeoBuf();
    const grass = new THREE.Color('#6e8a4a'), plaza = new THREE.Color('#b8b2a6'), dirt = new THREE.Color('#7a7064'), asph = new THREE.Color('#6a6a6a');
    const CURB_H = 0.16;
    for (const b of this.city.blocks) {
      const o = C.CURB;
      if (b.water) {
        // promenades along both banks
        pave.box(b.X0 + o, -0.1, b.Z0 + (b.sides.N != null ? o : -o), b.X0 + C.CURB + C.SIDEWALK_W + 0.4, CURB_H, b.Z1 - (b.sides.S != null ? o : -o), '#c0bab0');
        pave.box(b.X1 - C.CURB - C.SIDEWALK_W - 0.4, -0.1, b.Z0 + (b.sides.N != null ? o : -o), b.X1 - o, CURB_H, b.Z1 - (b.sides.S != null ? o : -o), '#c0bab0');
        continue;
      }
      // extend slab over missing road sides (park interior)
      const x0 = b.X0 + (b.sides.W != null ? o : -o), x1 = b.X1 - (b.sides.E != null ? o : -o);
      const z0 = b.Z0 + (b.sides.N != null ? o : -o), z1 = b.Z1 - (b.sides.S != null ? o : -o);
      pave.box(x0, -0.1, z0, x1, CURB_H, z1, '#c4c0b8');
      let col = plaza;
      if (b.code === 'SE' || b.code === 'SW' || b.code === 'P') col = grass;
      if (b.code === 'I' || b.code === 'H') col = asph;
      if (b.code === 'O') col = new THREE.Color('#a49a8a');
      const ix0 = b.code === 'P' ? x0 + 3.5 : b.x0, iz0 = b.code === 'P' ? z0 + 3.5 : b.z0, ix1 = b.code === 'P' ? x1 - 3.5 : b.x1, iz1 = b.code === 'P' ? z1 - 3.5 : b.z1;
      (col === grass ? lots : plazas).rect(ix0, iz0, ix1, iz1, CURB_H + 0.04, col);
      if (b.code === 'SE' || b.code === 'SW') {
        // driveways / front walks
        for (const bid of b.buildings) {
          const bd = this.city.buildings[bid];
          if (bd.kind !== 'house') continue;
          const [dx, dz] = bd.door, [sx, sz] = bd.sw;
          if (bd.front === 'N' || bd.front === 'S') plazas.rect(dx - 0.8, Math.min(dz, sz), dx + 0.8, Math.max(dz, sz), CURB_H + 0.08, '#b4aea4');
          else plazas.rect(Math.min(dx, sx), dz - 0.8, Math.max(dx, sx), dz + 0.8, CURB_H + 0.08, '#b4aea4');
        }
      }
    }
    // park paths + plazas
    const P = this.city.park;
    if (P) {
      const mx = (P.x0 + P.x1) / 2, mz = (P.z0 + P.z1) / 2;
      plazas.rect(P.x0, mz - 2.2, P.x1, mz + 2.2, CURB_H + 0.08, '#c8b898');
      plazas.rect(mx - 2.2, P.z0, mx + 2.2, P.z1, CURB_H + 0.08, '#c8b898');
      plazas.rect(mx - 9, mz - 9, mx + 9, mz + 9, CURB_H + 0.09, '#c8b898');
      // zoo ground
      plazas.rect(P.zoo.x0, P.zoo.z0, P.zoo.x1, P.zoo.z1, CURB_H + 0.08, '#a89060');
    }
    const pm = patchWet(new THREE.MeshStandardMaterial({ map: this.paveTex, vertexColors: true, roughness: 0.9 }), this.U, { key: 'pave', darken: 0.25, snow: 0.85 });
    const pmesh = new THREE.Mesh(pave.build(), pm);
    pmesh.receiveShadow = true;
    this.group.add(pmesh);
    const lm = patchWet(new THREE.MeshStandardMaterial({ map: this.groundTex, vertexColors: true, roughness: 0.95 }), this.U, { key: 'lot', darken: 0.25, snow: 0.9 });
    const lmesh = new THREE.Mesh(lots.build(), lm);
    lmesh.receiveShadow = true;
    this.group.add(lmesh);
    const plm = patchWet(new THREE.MeshStandardMaterial({ map: this.paveTex, vertexColors: true, roughness: 0.85 }), this.U, { key: 'plaza', darken: 0.3, snow: 0.85 });
    const plmesh = new THREE.Mesh(plazas.build(), plm);
    plmesh.receiveShadow = true;
    this.group.add(plmesh);
  }

  buildWater() {
    const river = this.city.blocks.filter((b) => b.water);
    const [x0, x1] = this.riverX;
    const U = this.U;
    this.waterU = { uLevel: { value: 0 } };
    const wm = new THREE.MeshStandardMaterial({ color: '#2a5a78', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 });
    wm.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = 'uniform float uTime; uniform float uNight; uniform float uSnow; varying vec3 vWp;\n' + sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          float w1 = sin(vWp.x*0.35 + uTime*1.3) * cos(vWp.z*0.21 - uTime*0.9);
          float w2 = sin(vWp.z*0.9 + uTime*2.1 + vWp.x*0.3);
          vec3 pn = normalize(vec3(w1*0.12 + w2*0.05, 1.0, w2*0.1 + w1*0.04));
          normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75,0.8,0.85), uSnow*0.3);`);
    };
    this.waterMat = wm;
    const g = new THREE.PlaneGeometry(x1 - x0, 3000, 1, 1);
    g.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(g, wm);
    water.position.set((x0 + x1) / 2, -2.2, 0);
    water.receiveShadow = true;
    this.water = water;
    this.group.add(water);
    // embankment walls (extend beyond map)
    const wall = new GeoBuf();
    const stone = '#8a8478';
    wall.box(x0 - 0.6, -4, -1500, x0, 0.16, 1500, stone);
    wall.box(x1, -4, -1500, x1 + 0.6, 0.16, 1500, stone);
    // ground strips beyond the grid along the river banks
    const wmesh = new THREE.Mesh(wall.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    wmesh.receiveShadow = true;
    this.group.add(wmesh);
    // river bed (dark) to hide ground plane under water
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a2a30', roughness: 1 }));
    bed.position.set((x0 + x1) / 2, -4, 0);
    this.group.add(bed);
    // pond in park
    const P = this.city.park;
    if (P) {
      const pg = new THREE.CircleGeometry(P.pond.r, 32).rotateX(-Math.PI / 2);
      const pond = new THREE.Mesh(pg, wm);
      pond.position.set(P.pond.x, 0.2, P.pond.z);
      this.group.add(pond);
      const rim = new THREE.Mesh(new THREE.RingGeometry(P.pond.r, P.pond.r + 1.2, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#9a9488', roughness: 0.9 }));
      rim.position.set(P.pond.x, 0.21, P.pond.z);
      this.group.add(rim);
    }
  }

  buildStructures() {
    // bridges: decks, railings, arches; expressway decks and pillars
    const net = this.city.net;
    const kit = new GeoBuf();
    const concrete = '#9a9890', dark = '#5a5a58', rail = '#c8c4bc';
    for (const r of net.roads) {
      if (r.kind === 'bridge') {
        const [ax, az] = r.pts[0], [bx, bz] = r.pts[1];
        const z = az;
        const xa = this.riverX[0] - 2, xb = this.riverX[1] + 2;
        kit.box(xa, -1.4, z - 9.6, xb, 0.0, z + 9.6, concrete);
        kit.box(xa, 0.16, z - 9.6, xb, 1.25, z - 9.2, rail);
        kit.box(xa, 0.16, z + 9.2, xb, 1.25, z + 9.6, rail);
        // sidewalks on bridge
        kit.box(xa, 0, z - 9.2, xb, 0.16, z - 6, '#c0bab0');
        kit.box(xa, 0, z + 6, xb, 0.16, z + 9.2, '#c0bab0');
        // arches underneath
        const mid = (xa + xb) / 2;
        for (let k = 0; k < 10; k++) {
          const t0 = k / 10, t1 = (k + 1) / 10;
          const xa0 = xa + (xb - xa) * t0, xa1 = xa + (xb - xa) * t1;
          const h0 = -1.4 - 2.6 * (1 - Math.pow((t0 - 0.5) * 2, 2)) * 0 - 2.2 * Math.pow((t0 - 0.5) * 2, 2);
          const h1 = -1.4 - 2.2 * Math.pow((t1 - 0.5) * 2, 2);
          kit.quad([xa0, h0, z - 9.6], [xa1, h1, z - 9.6], [xa1, -1.4, z - 9.6], [xa0, -1.4, z - 9.6], dark, [0, 0, -1]);
          kit.quad([xa1, h1, z + 9.6], [xa0, h0, z + 9.6], [xa0, -1.4, z + 9.6], [xa1, -1.4, z + 9.6], dark, [0, 0, 1]);
        }
        kit.box(mid - 1.5, -4, z - 8, mid + 1.5, -1.4, z + 8, dark);
      }
      if (r.kind === 'highway' || r.kind === 'ramp') {
        const pl = makePolyline(r.pts);
        const half = r.width / 2;
        const s = { x: 0, z: 0, h: 0 };
        // deck thickness under the road strip
        const deck = new GeoBuf();
        for (let i = 1; i < r.pts.length; i++) {
          const [x0, z0] = r.pts[i - 1], [x1, z1] = r.pts[i];
          const y0 = r.ys[i - 1], y1 = r.ys[i];
          const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1;
          const nx = -dz / L * half, nz = dx / L * half;
          // underside + sides
          if (Math.max(y0, y1) > 0.3) {
            kit.quad([x0 + nx, y0 - 1.2, z0 + nz], [x1 + nx, y1 - 1.2, z1 + nz], [x1 + nx, y1 + 0.02, z1 + nz], [x0 + nx, y0 + 0.02, z0 + nz], concrete, [nx / half, 0, nz / half]);
            kit.quad([x1 - nx, y1 - 1.2, z1 - nz], [x0 - nx, y0 - 1.2, z0 - nz], [x0 - nx, y0 + 0.02, z0 - nz], [x1 - nx, y1 + 0.02, z1 - nz], concrete, [-nx / half, 0, -nz / half]);
            kit.quad([x0 - nx, y0 - 1.2, z0 - nz], [x1 - nx, y1 - 1.2, z1 - nz], [x1 + nx, y1 - 1.2, z1 + nz], [x0 + nx, y0 - 1.2, z0 + nz], dark, [0, -1, 0]);
            // jersey barriers
            kit.quad([x0 + nx, y0, z0 + nz], [x1 + nx, y1, z1 + nz], [x1 + nx * 1.0, y1 + 0.95, z1 + nz * 1.0], [x0 + nx * 1.0, y0 + 0.95, z0 + nz * 1.0], rail, [-nx / half, 0, -nz / half]);
            kit.quad([x1 - nx, y1, z1 - nz], [x0 - nx, y0, z0 - nz], [x0 - nx, y0 + 0.95, z0 - nz], [x1 - nx, y1 + 0.95, z1 - nz], rail, [nx / half, 0, nz / half]);
          }
        }
        for (let t = 10; t < pl.length - 5; t += 28) {
          samplePolyline(pl, t, s);
          const y = this.city.net.roadY(r, s.x, s.z);
          if (y < 3) continue;
          kit.box(s.x - 1.1, -0.1, s.z - 1.1, s.x + 1.1, y - 1.2, s.z + 1.1, '#8a8880');
          const nx = Math.cos(s.h), nz = -Math.sin(s.h);
          kit.box(s.x - 1.4 - Math.abs(nx) * (half - 1.6), y - 2.2, s.z - 1.4 - Math.abs(nz) * (half - 1.6), s.x + 1.4 + Math.abs(nx) * (half - 1.6), y - 1.2, s.z + 1.4 + Math.abs(nz) * (half - 1.6), '#8a8880');
        }
      }
    }
    const mesh = new THREE.Mesh(kit.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    // harbor cranes & docks
    const hk = new ModelKit();
    for (const b of this.city.blocks) {
      if (b.code !== 'H') continue;
      const x = this.riverX[1] - 3, z = b.cz;
      hk.box(x - 1, 0.1, z - 30, x + 2, 0.4, z + 30, '#7a6a5a');
      for (const dz of [-14, 14]) {
        hk.box(x + 4, 9, z + dz - 3, 1.2, 18, 1.2, '#d08a2a');
        hk.box(x + 4, 9, z + dz + 3, 1.2, 18, 1.2, '#d08a2a');
        hk.box(x - 4, 18.5, z + dz, 22, 1.6, 2, '#d08a2a');
        hk.box(x + 6, 17, z + dz, 3, 3, 3.6, '#c0c0b8');
      }
    }
    if (hk.pos.length) {
      const g = hk.build();
      const m = makeInstMaterial(this.U, { key: 'static' });
      const im = new THREE.InstancedMesh(g, m, 1);
      im.setMatrixAt(0, new THREE.Matrix4());
      const geo = im.geometry;
      geo.setAttribute('iCol1', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
      geo.setAttribute('iCol2', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1]), 3));
      geo.setAttribute('iState', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 0, 0]), 4));
      im.castShadow = true;
      this.group.add(im);
    }
  }

  buildBuildings() {
    const city = this.city;
    const parts = [], gables = { x: [], z: [] }, doors = [];
    for (const b of city.buildings) {
      b._parts = [];
      for (const p of b.parts) {
        if (p.cooling) continue;
        if (p.gable) { gables[p.gable].push({ b, p }); continue; }
        parts.push({ b, p });
      }
      // door
      if (b.kind !== 'substation') {
        const [dx, dz] = b.door;
        const w = b.civic === 'fire' ? 0 : (b.kind === 'house' ? 1.2 : 2.2), h = b.kind === 'house' ? 2.3 : 2.7;
        if (w > 0) {
          if (b.front === 'N' || b.front === 'S') doors.push({ b, p: { x: dx, z: dz + (b.front === 'N' ? -0.06 : 0.06), y: h / 2, w, d: 0.14, h, style: 15, color: '#222' } });
          else doors.push({ b, p: { x: dx + (b.front === 'W' ? -0.06 : 0.06), z: dz, y: h / 2, w: 0.14, d: w, h, style: 15, color: '#222' } });
        }
        if (b.civic === 'fire') {
          // garage doors
          for (const k of [-8, 0, 8]) {
            if (b.front === 'N' || b.front === 'S') doors.push({ b, p: { x: b.x + k, z: dz + (b.front === 'N' ? -0.06 : 0.06), y: 2.4, w: 6, d: 0.14, h: 4.8, style: 5, color: '#c8c0b0' } });
            else doors.push({ b, p: { x: dx + (b.front === 'W' ? -0.06 : 0.06), z: b.z + k, y: 2.4, w: 0.14, d: 6, h: 4.8, style: 5, color: '#c8c0b0' } });
          }
        }
      }
    }
    const all = parts.concat(doors);
    const mat = makeBuildingMaterial(this.U);
    this.bMat = mat;
    const mk = (geo, list, yIsBase) => {
      const n = list.length;
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
      const iCol = new Float32Array(n * 3), iCol2 = new Float32Array(n * 3), iFx = new Float32Array(n * 4), iFx2 = new Float32Array(n * 4);
      const col = new THREE.Color();
      list.forEach(({ b, p }, i) => {
        tmpM.compose(tmpV.set(p.x, yIsBase ? p.y : p.y, p.z), tmpQ.identity(), tmpS.set(p.w, p.h, p.d));
        im.setMatrixAt(i, tmpM);
        col.set(p.color);
        iCol[i * 3] = col.r; iCol[i * 3 + 1] = col.g; iCol[i * 3 + 2] = col.b;
        col.set(b.signColor || '#d8a040');
        iCol2[i * 3] = col.r; iCol2[i * 3 + 1] = col.g; iCol2[i * 3 + 2] = col.b;
        iFx[i * 4] = p.style; iFx[i * 4 + 1] = (b.seed % 997) + i * 0.0; iFx[i * 4 + 2] = 0.5; iFx[i * 4 + 3] = 0;
        b._parts.push({ mesh: im, i, p });
      });
      const a1 = new THREE.InstancedBufferAttribute(iCol, 3), a2 = new THREE.InstancedBufferAttribute(iCol2, 3), a3 = new THREE.InstancedBufferAttribute(iFx, 4), a4 = new THREE.InstancedBufferAttribute(iFx2, 4);
      geo.setAttribute('iCol', a1); geo.setAttribute('iCol2', a2); geo.setAttribute('iFx', a3); geo.setAttribute('iFx2', a4);
      im.userData.attrs = { iCol: a1, iCol2: a2, iFx: a3, iFx2: a4 };
      im.castShadow = true; im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
      return im;
    };
    this.bMeshes = [];
    this.bMeshes.push(mk(new THREE.BoxGeometry(1, 1, 1), all, false));
    // gable prisms: base at y, ridge along x or z
    const prism = (axis) => {
      const g = new THREE.BufferGeometry();
      // ridge along x: vertices
      let v;
      if (axis === 'x') v = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 1, 0], [-0.5, 1, 0], [-0.5, 0, 0.5], [0.5, 0, 0.5]];
      else v = [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0, 1, 0.5], [0, 1, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5]];
      const tris = axis === 'x'
        ? [[0, 3, 2], [0, 2, 1], [4, 5, 2], [4, 2, 3], [0, 4, 3], [1, 2, 5]]
        : [[0, 1, 2], [0, 2, 3], [4, 3, 2], [4, 2, 5], [0, 3, 4], [1, 5, 2]];
      const pos = [];
      for (const t of tris) for (const k of t) pos.push(...v[k]);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      // fix winding by checking normals point outward
      const p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i += 3) {
        const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 - 0.3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        if (cx * n.getX(i) + cy * n.getY(i) + cz * n.getZ(i) < 0) {
          const x1 = p.getX(i + 1), y1 = p.getY(i + 1), z1 = p.getZ(i + 1);
          p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
          p.setXYZ(i + 2, x1, y1, z1);
        }
      }
      g.computeVertexNormals();
      return g;
    };
    if (gables.x.length) this.bMeshes.push(mk(prism('x'), gables.x, true));
    if (gables.z.length) this.bMeshes.push(mk(prism('z'), gables.z, true));
    // cooling towers
    for (const b of city.buildings) for (const p of b.parts) if (p.cooling) {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(p.w / 2 * (0.62 + 0.38 * Math.pow((t - 0.62) * 1.6, 2)), t * p.h)); }
      const ct = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: '#c8c4bc', roughness: 0.9, side: THREE.DoubleSide }));
      ct.position.set(p.x, 0, p.z);
      ct.castShadow = true;
      this.group.add(ct);
      this.coolingTowers = (this.coolingTowers || []).concat({ x: p.x, z: p.z, y: p.h, b });
    }
    // business signs (text) on storefronts
    this.signGroup = new THREE.Group();
    this.group.add(this.signGroup);
    this.signs = new Map();
  }

  // Refresh per-building visual state from the simulation
  updateBuildings(world) {
    const night = this.U.uNight.value;
    for (const b of this.city.buildings) {
      if (!b._parts) continue;
      const v = world.buildingVisual(b);
      const key = `${v.light.toFixed(2)}|${v.shop}|${v.damage.toFixed(2)}|${v.fire.toFixed(2)}|${v.boarded}|${v.constr.toFixed(2)}|${v.scaleY.toFixed(2)}|${v.sign}`;
      if (b._vkey === key) continue;
      b._vkey = key;
      for (const pr of b._parts) {
        const at = pr.mesh.userData.attrs;
        at.iFx.array[pr.i * 4 + 2] = v.light;
        at.iFx.array[pr.i * 4 + 3] = v.damage;
        at.iFx2.array[pr.i * 4] = v.shop;
        at.iFx2.array[pr.i * 4 + 1] = v.fire;
        at.iFx2.array[pr.i * 4 + 2] = v.boarded;
        at.iFx2.array[pr.i * 4 + 3] = v.constr;
        if (v.sign) { const c = new THREE.Color(v.sign); at.iCol2.array[pr.i * 3] = c.r; at.iCol2.array[pr.i * 3 + 1] = c.g; at.iCol2.array[pr.i * 3 + 2] = c.b; at.iCol2.needsUpdate = true; }
        // construction / ruin scaling
        const p = pr.p;
        const sy = v.scaleY;
        const isBase = pr.mesh !== this.bMeshes[0];
        let h = p.h, y = p.y;
        if (sy < 0.999) {
          const top = isBase ? p.y + p.h : p.y + p.h / 2;
          const bot = isBase ? p.y : p.y - p.h / 2;
          const maxTop = Math.max(0.6, b.h * sy);
          const nt = Math.min(top, maxTop + (p.style === 15 ? 99 : 0));
          if (nt <= bot) { h = 0.001; y = isBase ? 0 : -50; }
          else { h = nt - bot; y = isBase ? bot : (bot + nt) / 2; }
        }
        tmpM.compose(tmpV.set(p.x, y, p.z), tmpQ.identity(), tmpS.set(p.w, h, p.d));
        pr.mesh.setMatrixAt(pr.i, tmpM);
        pr.mesh.instanceMatrix.needsUpdate = true;
        at.iFx.needsUpdate = true; at.iFx2.needsUpdate = true;
      }
      this.updateSign(b, world);
    }
  }

  updateSign(b, world) {
    const biz = b.bizId != null ? world.economy.biz[b.bizId] : null;
    const name = (biz && biz.status !== 'closed') ? biz.name : (b.civic && b.kind !== 'substation' ? b.name : '');
    const prev = this.signs.get(b.id);
    if (prev && prev.name === name) return;
    if (prev) { this.signGroup.remove(prev.mesh); prev.mesh.material.map.dispose(); prev.mesh.material.dispose(); prev.mesh.geometry.dispose(); this.signs.delete(b.id); }
    if (!name) return;
    const color = b.signColor || (biz ? biz.color : '#d8a040');
    const tex = canvasTexture(512, 96, (g, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
      g.font = 'bold 60px "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.shadowColor = color; g.shadowBlur = 8;
      g.fillText(name.toUpperCase(), w / 2, h / 2 + 3, w - 20);
    });
    const width = Math.min(b.front === 'N' || b.front === 'S' ? b.w - 2 : b.d - 2, 10 + name.length * 0.15);
    const geo = new THREE.PlaneGeometry(Math.max(4, width), Math.max(4, width) * 0.19);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
    const mesh = new THREE.Mesh(geo, mat);
    const y = b.civic ? Math.min(b.h - 1.6, 7) : 3.85;
    const off = 0.08;
    if (b.front === 'N') { mesh.position.set(b.x, y, b.z0 - off); mesh.rotation.y = Math.PI; }
    if (b.front === 'S') { mesh.position.set(b.x, y, b.z1 + off); }
    if (b.front === 'W') { mesh.position.set(b.x0 - off, y, b.z); mesh.rotation.y = -Math.PI / 2; }
    if (b.front === 'E') { mesh.position.set(b.x1 + off, y, b.z); mesh.rotation.y = Math.PI / 2; }
    if (b.kind === 'house') return;
    this.signGroup.add(mesh);
    this.signs.set(b.id, { name, mesh });
  }

  buildProps() {
    const city = this.city;
    const U = this.U;
    // streetlights
    const lk = new ModelKit();
    lk.cyl(0, 3.6, 0, 0.09, 7.2, '#3a3d42', 6);
    lk.box(0, 7.1, 0.8, 0.12, 0.12, 1.7, '#3a3d42');
    lk.box(0, 7.0, 1.6, 0.4, 0.16, 0.7, '#2a2c30');
    lk.box(0, 6.9, 1.6, 0.3, 0.04, 0.55, '#ffe8c0', 1, 9);
    const lg = lk.build();
    const lm = makeInstMaterial(U, { key: 'light', snow: true });
    const lights = city.props.lights;
    this.lightMesh = this.staticInst(lg, lm, lights.map((l) => ({ x: l.x, y: 0, z: l.z, ry: l.h })), true);
    // light pools
    const poolGeo = new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({ map: this.poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, color: '#ffcf96' });
    const pools = new THREE.InstancedMesh(poolGeo, this.poolMat, lights.length);
    lights.forEach((l, i) => {
      const ox = Math.sin(l.h) * 1.6, oz = Math.cos(l.h) * 1.6;
      tmpM.makeTranslation(l.x + ox, 0.25, l.z + oz);
      pools.setMatrixAt(i, tmpM);
    });
    pools.frustumCulled = false;
    pools.renderOrder = 2;
    this.pools = pools;
    this.group.add(pools);
    // trees: kinds 0 round deciduous, 1 yard tree, 2 conifer
    const tk = new ModelKit();
    tk.cyl(0, 1.4, 0, 0.18, 2.8, '#5a4030', 6, 0);
    tk.sphere(0, 4.0, 0, 2.2, '#ffffff', 1, 0, 1, 0.9, 1, 1);
    tk.sphere(0.9, 3.3, 0.5, 1.5, '#ffffff', 1, 0, 1, 0.9, 1, 1);
    tk.sphere(-0.8, 3.5, -0.6, 1.6, '#ffffff', 1, 0, 1, 0.9, 1, 1);
    const treeGeo = tk.build();
    const ck = new ModelKit();
    ck.cyl(0, 1.0, 0, 0.2, 2, '#4a3428', 6, 0);
    ck.cyl(0, 3.4, 0, 2.2, 3.6, '#ffffff', 8, 1, 0, null, 0.1);
    ck.cyl(0, 5.4, 0, 1.6, 3.0, '#ffffff', 8, 1, 0, null, 0.05);
    const conGeo = ck.build();
    const tm = makeInstMaterial(U, { key: 'tree', roughness: 0.9, snow: true });
    const decid = city.props.trees.filter((t) => t.kind !== 2), con = city.props.trees.filter((t) => t.kind === 2);
    this.treeDecid = this.staticInst(treeGeo, tm, decid.map((t) => ({ x: t.x, y: 0.15, z: t.z, s: t.s, ry: hash01(t.x * 10, t.z * 10) * 6 })), true, decid);
    this.treeCon = this.staticInst(conGeo, tm, con.map((t) => ({ x: t.x, y: 0.15, z: t.z, s: t.s, ry: 0 })), true, con);
    this.trees = { decid, con };
    this.setSeasonColors(0);
    // benches
    const bk = new ModelKit();
    bk.box(0, 0.45, 0, 1.8, 0.08, 0.5, '#7a5a3a');
    bk.box(0, 0.8, -0.22, 1.8, 0.45, 0.06, '#7a5a3a');
    bk.box(-0.8, 0.22, 0, 0.08, 0.45, 0.5, '#2a2a2a');
    bk.box(0.8, 0.22, 0, 0.08, 0.45, 0.5, '#2a2a2a');
    this.staticInst(bk.build(), makeInstMaterial(U, { key: 'bench', snow: true }), city.props.benches.map((b) => ({ x: b.x, y: 0.16, z: b.z, ry: b.h })), true);
    // hydrants
    const hk = new ModelKit();
    hk.cyl(0, 0.35, 0, 0.14, 0.7, '#c03028', 8);
    hk.sphere(0, 0.72, 0, 0.15, '#c03028');
    hk.cyl(0, 0.45, 0, 0.06, 0.45, '#c03028', 6, 0, 0, [0, 0, Math.PI / 2]);
    this.staticInst(hk.build(), makeInstMaterial(U, { key: 'hyd', snow: true }), city.props.hydrants.map((h) => ({ x: h.x, y: 0.16, z: h.z })), false);
    // zoo enclosure fence & shelters
    const P = city.park;
    if (P) {
      const fk = new ModelKit();
      const z = P.zoo;
      const fc = '#5a4a3a';
      fk.box((z.x0 + z.x1) / 2, 1.1, z.z0, z.x1 - z.x0, 2.2, 0.2, fc);
      fk.box((z.x0 + z.x1) / 2, 1.1, z.z1, z.x1 - z.x0, 2.2, 0.2, fc);
      fk.box(z.x0, 1.1, (z.z0 + z.z1) / 2, 0.2, 2.2, z.z1 - z.z0, fc);
      fk.box(z.x1, 1.1, (z.z0 + z.z1) / 2, 0.2, 2.2, z.z1 - z.z0, fc);
      fk.box(z.x0 + 8, 2, z.z0 + 8, 8, 4, 6, '#8a7050');
      fk.taper(z.x0 + 8, 4, z.z0 + 8, 9, 7, 0.5, 7, 2, '#5a3a2a');
      fk.box((z.x0 + z.x1) / 2, 0.3, (z.z0 + z.z1) / 2 + 6, 12, 0.3, 8, '#3a6a88');
      this.staticInst(fk.build(), makeInstMaterial(U, { key: 'zoo', snow: true }), [{ x: 0, y: 0, z: 0 }], true);
    }
    // bus stop shelters are created by transit view
  }

  setSeasonColors(season) {
    const pal = [
      ['#6aa04a', '#5a9440', '#7ab050', '#4e8a3c'],
      ['#4a8a34', '#3e7a2e', '#5a9a3a', '#447e30'],
      ['#d08a2a', '#c05a24', '#e0a83a', '#a8682a', '#8a9a3a'],
      ['#7a6a58', '#6a5a4a', '#8a7a68', '#5a5048'],
    ][season];
    const cpal = ['#2e5a34', '#2a5230', '#34603a'];
    const col = new THREE.Color();
    const set = (mesh, list, palette) => {
      if (!mesh) return;
      const a = mesh.geometry.getAttribute('iCol1');
      list.forEach((t, i) => {
        col.set(palette[Math.floor(hash01(i, 77) * palette.length)]);
        a.array[i * 3] = col.r; a.array[i * 3 + 1] = col.g; a.array[i * 3 + 2] = col.b;
      });
      a.needsUpdate = true;
    };
    set(this.treeDecid, this.trees.decid, pal);
    set(this.treeCon, this.trees.con, cpal);
    this.season = season;
  }

  staticInst(geo, mat, items, shadow, src) {
    const n = items.length;
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
    const c1 = new Float32Array(Math.max(1, n) * 3).fill(1), c2 = new Float32Array(Math.max(1, n) * 3).fill(1), st = new Float32Array(Math.max(1, n) * 4);
    items.forEach((it, i) => {
      tmpQ.setFromAxisAngle(UP, it.ry || 0);
      const s = it.s || 1;
      tmpM.compose(tmpV.set(it.x, it.y || 0, it.z), tmpQ, tmpS.set(s, s, s));
      im.setMatrixAt(i, tmpM);
    });
    im.count = n;
    geo.setAttribute('iCol1', new THREE.InstancedBufferAttribute(c1, 3));
    geo.setAttribute('iCol2', new THREE.InstancedBufferAttribute(c2, 3));
    geo.setAttribute('iState', new THREE.InstancedBufferAttribute(st, 4));
    im.castShadow = !!shadow;
    im.receiveShadow = true;
    im.frustumCulled = false;
    this.group.add(im);
    return im;
  }

  buildSignals() {
    // one head per incoming lane at signalized nodes, three lamps each
    const net = this.city.net;
    const heads = [];
    for (const n of net.nodes) {
      if (!n.signal) continue;
      for (const lid of n.inLanes) {
        const lane = net.links[lid];
        const p = lane.pl, k = p.n - 1;
        const ex = p.pts[k * 2], ez = p.pts[k * 2 + 1];
        const dx = ex - p.pts[(k - 1) * 2], dz = ez - p.pts[(k - 1) * 2 + 1];
        const L = Math.hypot(dx, dz) || 1;
        const ux = dx / L, uz = dz / L;
        const rx = -uz, rz = ux;
        const y = p.ys[k];
        // pole on the far right corner beyond the stop line
        const px = ex + rx * 4.6 + ux * 1.2, pz = ez + rz * 4.6 + uz * 1.2;
        heads.push({ node: n.id, lane: lid, x: px, z: pz, y, h: Math.atan2(-ux, -uz), group: lane.group });
      }
    }
    this.sigHeads = heads;
    const pk = new ModelKit();
    pk.cyl(0, 2.9, 0, 0.1, 5.8, '#2a2c30', 6);
    pk.box(-1.6, 5.5, 0, 3.2, 0.12, 0.12, '#2a2c30');
    pk.box(-3.0, 5.0, 0.05, 0.42, 1.25, 0.32, '#1a1c1e');
    const poleMesh = this.staticInst(pk.build(), makeInstMaterial(this.U, { key: 'sig', snow: true }), heads.map((h) => ({ x: h.x, y: h.y, z: h.z, ry: h.h + Math.PI / 2 })), true);
    // lamps
    const lampGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const lampMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, heads.length * 3);
    heads.forEach((h, i) => {
      for (let k = 0; k < 3; k++) {
        const ry = h.h + Math.PI / 2;
        const lx = -3.0, ly = 5.4 - k * 0.38, lz = 0.23;
        const cx = Math.cos(ry), sx = Math.sin(ry);
        const wx = h.x + lx * cx + lz * sx, wz = h.z - lx * sx + lz * cx;
        tmpM.makeTranslation(wx, h.y + ly, wz);
        lamps.setMatrixAt(i * 3 + k, tmpM);
        lamps.setColorAt(i * 3 + k, new THREE.Color('#202020'));
      }
    });
    lamps.frustumCulled = false;
    this.lamps = lamps;
    this.group.add(lamps);
    this.updateSignals(0);
  }

  updateSignals(time) {
    const net = this.city.net;
    const off = new THREE.Color('#1a1a1a'), red = new THREE.Color(4, 0.15, 0.1), yel = new THREE.Color(4, 2.4, 0.1), grn = new THREE.Color(0.2, 4, 1.2);
    const blink = Math.floor(time * 1.5) % 2 === 0;
    this.sigHeads.forEach((h, i) => {
      const n = net.nodes[h.node];
      const st = n.signal.state[h.group];
      this.lamps.setColorAt(i * 3, st === 'R' ? red : off);
      this.lamps.setColorAt(i * 3 + 1, st === 'Y' || (st === 'X' && n.failed && blink && n.powered) ? yel : off);
      this.lamps.setColorAt(i * 3 + 2, st === 'G' ? grn : off);
    });
    this.lamps.instanceColor.needsUpdate = true;
  }

  update(dt, world) {
    const night = this.U.uNight.value;
    // streetlights follow power zones; light pools fade in at night
    this.poolMat.opacity = Math.min(1, night * 1.15) * 0.55;
    if (this._powerKey !== world.power.key) {
      this._powerKey = world.power.key;
      const st = this.lightMesh.geometry.getAttribute('iCol1');
      const lights = this.city.props.lights;
      lights.forEach((l, i) => {
        const on = world.power.isPoweredAt(l.x, l.z);
        st.array[i * 3] = on ? 1 : 0.05; st.array[i * 3 + 1] = on ? 1 : 0.05; st.array[i * 3 + 2] = on ? 1 : 0.05;
        tmpM.makeTranslation(l.x + Math.sin(l.h) * 1.6, on ? 0.25 : -50, l.z + Math.cos(l.h) * 1.6);
        this.pools.setMatrixAt(i, tmpM);
      });
      st.needsUpdate = true;
      this.pools.instanceMatrix.needsUpdate = true;
    }
  }
}
