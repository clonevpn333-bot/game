// Chapter 4 world: rolling dusk terrain, a burning village along the road, the battlefield
// before the walls, and the castle (curtain wall, towers, gatehouse, courtyard, keep).
// Every texture is drawn procedurally on a canvas — nothing downloaded.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const GATE_Z = 120, WALL_T = 7, COURT = { minX: -26, maxX: 26, minZ: 130, maxZ: 178 };

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- terrain
export function roadX(z) { return z < -20 ? Math.sin((z + 20) * 0.014) * 16 : 0; }
export function groundH(x, z) {
  let h = Math.sin(x * 0.018) * 2.2 + Math.cos(z * 0.013 + 1) * 2.5 + Math.sin((x + z) * 0.031) * 0.9 + Math.sin(x * 0.07 + z * 0.05) * 0.35;
  h += Math.max(0, Math.abs(x) - 70) ** 1.35 * 0.06; // the valley sides rise and hide the edge of the world
  const flatRoad = sstep(13, 4, Math.abs(x - roadX(z)));
  const base = Math.cos(z * 0.013 + 1) * 2.0;
  h = lerp(h, base, flatRoad * 0.85);
  // the field before the walls is trampled flat; the castle sits on a low rise
  h = lerp(h, 1.2 + Math.sin(x * 0.05) * 0.4, sstep(-30, -5, z) * (1 - sstep(95, 115, z)) * (1 - sstep(60, 110, Math.abs(x))) * 0.8);
  h = lerp(h, 2.4, sstep(98, 118, z));
  return h;
}

// ---------------------------------------------------------------- procedural textures
function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.repeat.set(repeat, repeat);
  return t;
}
function noiseFill(g, w, h, base, vary, n = 2200, r = 2, seed = 1) {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const R = rng(seed);
  for (let i = 0; i < n; i++) { const v = (R() - 0.5) * vary; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`; g.fillRect(R() * w, R() * h, r + R() * r, r + R() * r); }
}
export const TEX = {
  stone: () => canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#77746c', 0.12, 3000, 2, 3); const R = rng(7);
    let y = 0; while (y < h) { const rh = 34 + R() * 26; let x = -R() * 60; while (x < w) { const rw = 50 + R() * 70, s = 100 + R() * 40 | 0; g.fillStyle = `rgb(${s},${s - 4},${s - 12})`; g.fillRect(x + 3, y + 3, rw - 6, rh - 6); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 3, y + 3, rw - 6, 4); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 3, y + rh - 8, rw - 6, 5); x += rw; } y += rh; }
    noiseFill(g, w, h, 'rgba(0,0,0,0)', 0.1, 4000, 1.5, 9);
  }),
  plaster: () => canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#c9bba0', 0.08, 2500, 3, 4);
    g.fillStyle = '#3b2a1c';
    g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 24, h); g.fillRect(w - 24, 0, 24, h); g.fillRect(w / 2 - 12, 0, 24, h);
    g.save(); g.translate(w / 4, h / 2); g.rotate(0.7); g.fillRect(-170, -11, 340, 22); g.restore();
    g.save(); g.translate((3 * w) / 4, h / 2); g.rotate(-0.7); g.fillRect(-170, -11, 340, 22); g.restore();
  }),
  thatch: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6b5532'; g.fillRect(0, 0, w, h); const R = rng(5);
    for (let i = 0; i < 1600; i++) { const x = R() * w, y = R() * h, s = 70 + R() * 70 | 0; g.strokeStyle = `rgb(${s + 30},${s + 10},${s - 30})`; g.lineWidth = 1 + R(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 4, y + 10 + R() * 14); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, y, w, 4); }
  }),
  wood: () => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a3e26'; g.fillRect(0, 0, w, h); const R = rng(11);
    for (let x = 0; x < w; x += 32) { g.fillStyle = `rgba(0,0,0,${0.15 + R() * 0.15})`; g.fillRect(x, 0, 3, h); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,220,180' : '0,0,0'},0.06)`; g.fillRect(x + 4 + R() * 26, R() * h, 1, 20 + R() * 60); } }
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(20,12,6,0.6)'; g.beginPath(); g.arc(R() * w, R() * h, 2 + R() * 3, 0, 7); g.fill(); }
  }),
  banner: (color, emblem) => canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
    g.fillStyle = emblem; g.fillRect(w / 2 - 8, 40, 16, 140); g.fillRect(w / 2 - 40, 80, 80, 16);
    g.beginPath(); g.moveTo(0, h); g.lineTo(w / 2, h - 40); g.lineTo(w, h); g.fillStyle = '#000'; g.globalCompositeOperation = 'destination-out'; g.fill();
  }),
};

// ---------------------------------------------------------------- helpers
function box(w, h, d, x, y, z, ry = 0, uvScale = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  // metre-based UVs so textures keep their scale on every face
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const u = nx > 0.5 ? pz : px, v = ny > 0.5 ? pz : py;
    uv.setXY(i, (u + (nx > 0.5 ? d : w)) * uvScale / 4, (v + (ny > 0.5 ? d : h)) * uvScale / 4);
  }
  g.rotateY(ry); g.translate(x, y, z); return g;
}
function prism(w, h, d, x, y, z, ry = 0) { // gable roof along z
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 3, p.getY(i) / 2);
  g.rotateY(ry); g.translate(x, y, z); return g;
}
function mesh(geos, mat, { cast = true, receive = true } = {}) { const m = new THREE.Mesh(mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g))), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

// ---------------------------------------------------------------- build
export function buildWorld(scene, quality = 1) {
  const W = { boxes: [], fires: [], lights: [], banners: [], gate: null, wallSegments: [], courtWall: null };
  const R = rng(1234);
  const mats = {
    stone: new THREE.MeshStandardMaterial({ map: TEX.stone(), roughness: 0.92, color: 0xb8b0a4 }),
    stoneDark: new THREE.MeshStandardMaterial({ map: TEX.stone(), roughness: 0.95, color: 0x7a746c }),
    plaster: new THREE.MeshStandardMaterial({ map: TEX.plaster(), roughness: 0.9 }),
    thatch: new THREE.MeshStandardMaterial({ map: TEX.thatch(), roughness: 1, color: 0xb09878 }),
    wood: new THREE.MeshStandardMaterial({ map: TEX.wood(), roughness: 0.85 }),
    charred: new THREE.MeshStandardMaterial({ color: 0x1e1a17, roughness: 1 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.8 }),
  };
  W.mats = mats;

  // terrain with painted grass / mud / trampled field and per-pixel variation
  const SIZE = 640, SEG = quality > 0.8 ? 256 : 180;
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, 20);
  const tp = tg.attributes.position, cols = new Float32Array(tp.count * 3);
  const grass = new THREE.Color(0x4a5a2c), dry = new THREE.Color(0x76703c), mud = new THREE.Color(0x4a3a2a), field = new THREE.Color(0x5e4e36), c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, groundH(x, z));
    const road = sstep(6, 2.5, Math.abs(x - roadX(z))) * (z < GATE_Z ? 1 : 0);
    const fld = sstep(-35, -10, z) * (1 - sstep(100, 118, z)) * (1 - sstep(55, 95, Math.abs(x)));
    c.copy(grass).lerp(dry, (Math.sin(x * 0.09) * Math.cos(z * 0.07) * 0.5 + 0.5) * 0.6).lerp(field, fld * 0.85).lerp(mud, road);
    if (z > 118) c.lerp(new THREE.Color(0x6a6458), 0.8);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 });
  gm.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float n1 = gn(vWP.xz * 0.9) * 0.6 + gn(vWP.xz * 3.7) * 0.4, n2 = gn(vWP.xz * 0.12);
        diffuseColor.rgb *= 0.78 + n1 * 0.4;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.15, 1.05, 0.8), smoothstep(0.55, 0.8, n2) * 0.5);
        // grass blades: fine dark/light speckle
        diffuseColor.rgb *= 0.9 + gh(floor(vWP.xz * 18.0)) * 0.2;`);
  };
  const terrain = new THREE.Mesh(tg, gm); terrain.receiveShadow = true; scene.add(terrain); W.terrain = terrain;

  // ---- the village along the road
  const walls = [], roofs = [], woods = [], chars = [];
  const houseAt = (x, z, ry, burnt, burning) => {
    const w = 6 + R() * 3, d = 7 + R() * 4, h = 3.4 + R() * 1.2, y = groundH(x, z) - 0.4;
    (burnt ? chars : walls).push(box(w, h, d, x, y + h / 2, z, ry, 1));
    if (!burnt) roofs.push(prism(w + 1.2, 2.6 + R(), d + 1.2, x, y + h, z, ry));
    else woods.push(box(0.4, 2.5, d, x, y + h + 0.6, z, ry), box(w * 0.7, 0.3, 0.3, x, y + h + 0.2, z + d / 3, ry + 0.3));
    woods.push(box(0.9, 1.8, 0.12, x + Math.sin(ry) * (d / 2 + 0.02), y + 0.9, z + Math.cos(ry) * (d / 2 + 0.02), ry)); // door
    // collision (axis-aligned around the rotated box)
    const ex = Math.abs(Math.cos(ry)) * w / 2 + Math.abs(Math.sin(ry)) * d / 2, ez = Math.abs(Math.sin(ry)) * w / 2 + Math.abs(Math.cos(ry)) * d / 2;
    W.boxes.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez });
    if (burning) W.fires.push({ pos: new THREE.Vector3(x, y + h + 1.2, z), size: 1 + R() * 0.6 });
  };
  let k = 0;
  for (let z = -165; z < -40; z += 15 + R() * 6) for (const side of [-1, 1]) {
    if (R() < 0.15) continue;
    const x = roadX(z) + side * (12 + R() * 8);
    const face = Math.atan2(roadX(z) - x, 0); // face the road
    houseAt(x, z, face + (R() - 0.5) * 0.2, R() < 0.25, (k++ % 3) === 0);
  }
  // fences and carts
  for (let z = -160; z < -45; z += 3.2) for (const side of [-1, 1]) if (R() < 0.55) { const x = roadX(z) + side * 7.5; woods.push(box(0.12, 0.9, 3.1, x, groundH(x, z) + 0.45, z), box(0.15, 1.2, 0.15, x, groundH(x, z) + 0.6, z - 1.5)); }
  for (let i = 0; i < 5; i++) { const z = -150 + i * 24 + R() * 8, x = roadX(z) + (R() < 0.5 ? -5 : 5); const y = groundH(x, z); woods.push(box(1.6, 0.5, 3, x, y + 0.9, z, R()), box(0.2, 1.1, 1.1, x - 0.9, y + 0.55, z - 0.8), box(0.2, 1.1, 1.1, x + 0.9, y + 0.55, z - 0.8)); W.boxes.push({ minX: x - 1.4, maxX: x + 1.4, minZ: z - 1.9, maxZ: z + 1.9 }); if (i % 2) W.fires.push({ pos: new THREE.Vector3(x, y + 1.2, z), size: 0.7 }); }
  // the watchtower that collapses across the road during the second fight
  { const z = -95, x = roadX(z) + 9, y = groundH(x, z);
    const t = new THREE.Group();
    const parts = [box(0.4, 9, 0.4, -1.4, 4.5, -1.4), box(0.4, 9, 0.4, 1.4, 4.5, -1.4), box(0.4, 9, 0.4, -1.4, 4.5, 1.4), box(0.4, 9, 0.4, 1.4, 4.5, 1.4), box(3.6, 0.3, 3.6, 0, 7.5, 0), box(3.6, 1.0, 0.15, 0, 8.2, 1.8), box(3.6, 1.0, 0.15, 0, 8.2, -1.8), box(0.15, 1.0, 3.6, 1.8, 8.2, 0), box(0.15, 1.0, 3.6, -1.8, 8.2, 0)];
    for (let i = 0; i < 4; i++) parts.push(box(0.15, 0.15, 4.2, 0, 1.5 + i * 1.6, 0, Math.PI / 4 * (i % 2 ? 1 : -1)));
    const m = mesh(parts, mats.wood); t.add(m);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.2, 4), mats.thatch); rf.position.y = 9.8; rf.rotation.y = Math.PI / 4; rf.castShadow = true; t.add(rf);
    t.position.set(x, y, z); scene.add(t);
    W.tower = { group: t, pivot: new THREE.Vector3(x, y, z), fallDir: -1, t: 0, falling: false, box: { minX: x - 1.8, maxX: x + 1.8, minZ: z - 1.8, maxZ: z + 1.8 } };
    W.boxes.push(W.tower.box);
    W.fires.push({ pos: new THREE.Vector3(x, y + 8.5, z), size: 1.1, follow: t, local: new THREE.Vector3(0, 8.5, 0) });
  }
  if (walls.length) scene.add(mesh(walls, mats.plaster));
  if (roofs.length) scene.add(mesh(roofs, mats.thatch));
  if (woods.length) scene.add(mesh(woods, mats.wood));
  if (chars.length) scene.add(mesh(chars, mats.charred));

  // ---- the battlefield: stake barricades, a siege tower, craters
  const stakes = [];
  for (let i = 0; i < 9; i++) {
    const cx = (i % 2 ? -1 : 1) * (18 + R() * 30), cz = -10 + i * 11;
    for (let j = 0; j < 6; j++) { const x = cx + j * 1.1, z = cz + Math.sin(j) * 0.4, y = groundH(x, z); const g = box(0.18, 2.4, 0.18, 0, 0, 0); g.rotateX(-0.6); g.translate(x, y + 0.8, z); stakes.push(g); }
    W.boxes.push({ minX: cx - 0.4, maxX: cx + 6.4, minZ: cz - 0.6, maxZ: cz + 0.6 });
  }
  scene.add(mesh(stakes, mats.wood));
  { const x = -38, z = 70, y = groundH(x, z); const st = [box(5, 14, 5, x, y + 7, z), box(5.6, 0.4, 5.6, x, y + 14.2, z)]; for (let i = 0; i < 6; i++) st.push(box(5.4, 0.25, 0.25, x, y + 2 + i * 2.2, z + 2.6)); const m = mesh(st, mats.wood); scene.add(m); W.boxes.push({ minX: x - 2.7, maxX: x + 2.7, minZ: z - 2.7, maxZ: z + 2.7 }); W.fires.push({ pos: new THREE.Vector3(x, y + 12, z), size: 1.6 }); }

  // ---- the castle
  const sw = [], merl = [], dark = [];
  const wallY = 2.4, wallH = 14;
  const segs = [[-120, -14], [14, 120]];
  for (const [x0, x1] of segs) {
    sw.push(box(x1 - x0, wallH, WALL_T, (x0 + x1) / 2, wallY + wallH / 2 - 1, GATE_Z + WALL_T / 2));
    for (let x = x0 + 1; x < x1; x += 2.4) merl.push(box(1.3, 1.6, WALL_T * 0.35, x, wallY + wallH - 0.2, GATE_Z + 0.6));
    W.boxes.push({ minX: x0, maxX: x1, minZ: GATE_Z, maxZ: GATE_Z + WALL_T });
  }
  const tower = (x, z, r, h) => { const g = new THREE.CylinderGeometry(r, r * 1.08, h, 16); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, Math.atan2(p.getX(i), p.getZ(i)) * r / 4, (p.getY(i) + h / 2) / 4); g.translate(x, wallY + h / 2 - 1, z); sw.push(g); for (let a = 0; a < 12; a++) { const an = (a / 12) * Math.PI * 2; merl.push(box(1.1, 1.5, 0.8, x + Math.sin(an) * r * 0.95, wallY + h - 0.3, z + Math.cos(an) * r * 0.95, an)); } W.boxes.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r }); };
  for (const x of [-120, -80, -40, 40, 80, 120]) tower(x, GATE_Z + WALL_T / 2, 5, 19);
  // gatehouse: two towers and the arch over the gate
  tower(-10, GATE_Z + 3, 5.5, 22); tower(10, GATE_Z + 3, 5.5, 22);
  sw.push(box(14, 7, WALL_T + 2, 0, wallY + wallH - 3.5 + 1, GATE_Z + WALL_T / 2));
  for (let x = -6; x <= 6; x += 2.4) merl.push(box(1.3, 1.6, 2, x, wallY + wallH + 1.8, GATE_Z - 0.2));
  dark.push(box(10, 8.5, WALL_T + 1, 0, wallY + 3.2, GATE_Z + WALL_T / 2)); // the dark passage behind the gate
  // courtyard walls (sides and back), with one section that collapses during the duel
  for (const s of [-1, 1]) { sw.push(box(4, 11, 60, s * 30, wallY + 4.5, 155)); W.boxes.push({ minX: s * 30 - 2, maxX: s * 30 + 2, minZ: 126, maxZ: 186 }); }
  // the keep
  sw.push(box(40, 26, 18, 0, wallY + 12, 196)); W.boxes.push({ minX: -20, maxX: 20, minZ: 187, maxZ: 205 });
  tower(-20, 188, 6, 34); tower(20, 188, 6, 34);
  for (let i = 0; i < 6; i++) sw.push(box(14 - i * 0.6, 0.6, 2.2, 0, wallY + 0.3 + i * 0.6, 185 - i * 1.8)); // stairs up to the keep door
  dark.push(box(6, 7, 1, 0, wallY + 6.6, 186.5));
  const cwMesh = mesh(sw, mats.stone); scene.add(cwMesh);
  scene.add(mesh(merl, mats.stone));
  const darkM = new THREE.Mesh(mergeGeometries(dark.map((g) => g.toNonIndexed())), new THREE.MeshBasicMaterial({ color: 0x050403 })); scene.add(darkM);
  // conical roofs
  for (const [x, z, r, h] of [[-10, GATE_Z + 3, 6.2, 22], [10, GATE_Z + 3, 6.2, 22], [-20, 188, 6.8, 34], [20, 188, 6.8, 34]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(r, 9, 16), mats.slate); c.position.set(x, wallY + h - 1 + 4.5, z); c.castShadow = true; scene.add(c); }
  // the back wall section of the courtyard that falls in phase two
  { const g = new THREE.Group(); const blocks = [];
    for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.6, 4), mats.stoneDark); b.position.set(-13.6 + (i % 9) * 3.4, wallY + 1.8 + Math.floor(i / 9) * 3.7, 0); b.castShadow = b.receiveShadow = true; g.add(b); blocks.push({ m: b, v: new THREE.Vector3(), w: new THREE.Vector3() }); }
    g.position.set(0, 0, 180); scene.add(g); W.courtWall = { group: g, blocks, down: false, t: 0 };
  }
  // the gate doors
  { const g = new THREE.Group(); const doors = [];
    for (const s of [-1, 1]) { const d = new THREE.Group(); const planks = []; for (let i = 0; i < 5; i++) planks.push(box(0.95, 8, 0.4, s * (0.5 + i * 0.95), 4, 0)); planks.push(box(4.8, 0.4, 0.5, s * 2.4, 2, -0.3), box(4.8, 0.4, 0.5, s * 2.4, 6, -0.3)); const m = mesh(planks, mats.wood); d.add(m); d.position.set(s * 0, 0, 0); g.add(d); doors.push(d); }
    g.position.set(0, wallY - 0.6, GATE_Z - 0.4); scene.add(g);
    W.gate = { group: g, doors, hp: 1, broken: false, box: { minX: -5, maxX: 5, minZ: GATE_Z - 1, maxZ: GATE_Z + WALL_T } };
    W.boxes.push(W.gate.box);
  }
  // banners on the walls (red: the King) and the camp (blue: the besiegers)
  const bannerMat = (col, emb) => new THREE.MeshStandardMaterial({ map: TEX.banner(col, emb), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  const redM = bannerMat('#7a1e1e', '#1a1a1a'), blueM = bannerMat('#2c4a7a', '#d8b45a');
  for (const x of [-100, -60, -26, 26, 60, 100]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 7, 1, 8), redM); b.position.set(x, wallY + wallH - 4.5, GATE_Z - 0.1); scene.add(b); W.banners.push(b); }
  for (let i = 0; i < 6; i++) { const x = (i % 2 ? -1 : 1) * (14 + i * 4), z = -40 + i * 6, y = groundH(x, z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7), mats.wood); pole.position.set(x, y + 3.5, z); scene.add(pole); const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3, 1, 8), blueM); b.position.set(x + 0.7, y + 5.2, z); scene.add(b); W.banners.push(b); }
  for (const b of W.banners) { const p = b.geometry.attributes.position; b.userData.base = Float32Array.from(p.array); }

  // the courtyard: braziers, barrels, flagstones, banners on the keep
  { const props = [], flags = [];
    for (const [x, z] of [[-22, 134], [22, 134], [-22, 176], [22, 176], [-8, 183], [8, 183]]) {
      const y = groundH(x, z);
      props.push(box(0.5, 1.1, 0.5, x, y + 0.55, z), box(1.1, 0.35, 1.1, x, y + 1.25, z));
      W.fires.push({ pos: new THREE.Vector3(x, y + 1.5, z), size: 0.55 });
    }
    for (let i = 0; i < 9; i++) { const x = (i % 2 ? -1 : 1) * (24 + (i % 3)), z = 140 + i * 4, y = groundH(x, z); const c = new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10); c.translate(x, y + 0.55, z); props.push(c); }
    for (let x = -24; x <= 24; x += 3) for (let z = 128; z <= 184; z += 3) { const y = groundH(x, z); flags.push(box(3.0, 0.12 + ((x * 7 + z * 3) % 5) * 0.008, 3.0, x, y + 0.02, z)); }
    scene.add(mesh(props, mats.wood));
    const fl = mesh(flags, mats.stoneDark, { cast: false }); scene.add(fl);
    for (const x of [-12, 12]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9, 1, 8), new THREE.MeshStandardMaterial({ map: TEX.banner('#7a1e1e', '#c8a24a'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 })); b.position.set(x, 2.4 + 15, 186.8); b.rotation.y = Math.PI; scene.add(b); W.banners.push(b); }
  }

  // a ring of distant hills/forest silhouettes
  const trees = [];
  for (let i = 0; i < (quality > 0.8 ? 420 : 240); i++) {
    const a = R() * Math.PI * 2, rr = 150 + R() * 140, x = Math.sin(a) * rr, z = 20 + Math.cos(a) * rr;
    if (Math.abs(x) < 60 && z > -180 && z < 130) continue;
    const h = 6 + R() * 7, y = groundH(x, z);
    const c = new THREE.ConeGeometry(1.8 + R(), h, 6); c.translate(x, y + h / 2 + 1, z); trees.push(c);
  }
  const treeM = new THREE.Mesh(mergeGeometries(trees), new THREE.MeshStandardMaterial({ color: 0x24301c, roughness: 1, flatShading: true })); treeM.castShadow = false; treeM.receiveShadow = true; scene.add(treeM);
  return W;
}

/** Banners ripple in the wind. */
export function animateBanners(W, t) {
  for (const b of W.banners) {
    const p = b.geometry.attributes.position, base = b.userData.base ??= Float32Array.from(p.array);
    for (let i = 0; i < p.count; i++) { const y = base[i * 3 + 1], x = base[i * 3]; p.setZ(i, Math.sin(t * 3 + y * 1.3 + x) * 0.12 * (1 - (y + 3.5) / 7)); }
    p.needsUpdate = true;
  }
}
