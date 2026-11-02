// GETAWAY! — real 3D car models (.glb / .gltf binary) dropped into the game.
// Import from the garage (stored in the browser, IndexedDB) or place assets/cars/<id>.glb next to index.html.
// The model is fitted to the car: turned so its length runs along +z, scaled to the car's real length, sat on the
// ground, its own wheels found by name and wired to steer / spin / suspension, paint + glass materials exposed.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeLightMaterial, KEEP_GEO } from './models.js';

export const CUSTOM = {}; // id -> { scene, flip, name }
const DB = 'getaway-cars', STORE = 'models';
function db() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function dbGet(key) { const d = await db(); return new Promise((res) => { const t = d.transaction(STORE).objectStore(STORE).get(key); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); }); }
async function dbPut(key, val) { const d = await db(); return new Promise((res) => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(val, key); t.oncomplete = () => res(true); t.onerror = () => res(false); }); }
async function dbDel(key) { const d = await db(); return new Promise((res) => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(key); t.oncomplete = () => res(true); }); }
async function dbKeys() { const d = await db(); return new Promise((res) => { const t = d.transaction(STORE).objectStore(STORE).getAllKeys(); t.onsuccess = () => res(t.result || []); t.onerror = () => res([]); }); }

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
function parse(buf) { return new Promise((res, rej) => loader.parse(buf, '', (g) => { g.scene.traverse((o) => { if (o.geometry) KEEP_GEO.add(o.geometry); }); res(g.scene); }, (e) => rej(e))); }

export async function loadCustomCars(ids) {
  try { for (const key of await dbKeys()) { const rec = await dbGet(key); if (rec && rec.buf) { try { CUSTOM[key] = { scene: await parse(rec.buf), flip: !!rec.flip, name: rec.name || key }; } catch (e) { console.warn('custom car parse failed', key, e); } } } } catch (e) { /* no IndexedDB (private mode) */ }
  const EMB = window.__EMBED_CARS || {}; for (const id in EMB) { if (CUSTOM[id]) continue; try { const bin = atob(EMB[id]); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); CUSTOM[id] = { scene: await parse(u8.buffer), flip: false, name: `${id} (built-in model)`, builtin: true }; } catch (e) { console.warn('embedded car failed', id, e); } }
  if (location.protocol.startsWith('http')) for (const id of ids) { if (CUSTOM[id]) continue; for (const pre of ['assets/cars/', '../assets/cars/']) { try { const r = await fetch(`${pre}${id}.glb`); if (r.ok) { CUSTOM[id] = { scene: await parse(await r.arrayBuffer()), flip: false, name: `${id}.glb` }; break; } } catch (e) {} } }
}
export async function importCar(id, file) { const buf = await file.arrayBuffer(); const scene = await parse(buf); await dbPut(id, { buf, flip: false, name: file.name }); CUSTOM[id] = { scene, flip: false, name: file.name }; }
export async function flipCar(id) { const c = CUSTOM[id]; if (!c) return; c.flip = !c.flip; const rec = await dbGet(id); if (rec) { rec.flip = c.flip; await dbPut(id, rec); } }
export async function removeCar(id) { delete CUSTOM[id]; await dbDel(id); }

const WHEEL_RE = /wheel|tire|tyre|rim|rotor|disc|disk|brake|caliper|hub|spoke|lug/i, CALIPER_RE = /caliper/i, GLASS_RE = /glass|window|windshield|windscreen/i, PAINT_RE = /paint|body|carpaint|exterior|shell/i;
function nameChain(o) { let s = ''; for (let p = o; p; p = p.parent) s += ' ' + (p.name || '') + ' ' + (p.material && !Array.isArray(p.material) ? p.material.name || '' : ''); return s; }

export function buildCustomCar(spec, paintColor, id) {
  const C = CUSTOM[id]; const src = C.scene.clone(true); const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  // 1) orient: length along z, optional 180° flip
  const holder = new THREE.Group(); holder.add(src); src.updateMatrixWorld(true); let bb = new THREE.Box3().setFromObject(src); const sz = bb.getSize(new THREE.Vector3());
  if (sz.x > sz.z) holder.rotation.y = Math.PI / 2;
  { // which end is the front? named front/rear parts, else red (tail-light) materials sit at the back
    holder.updateMatrixWorld(true); const FR = /front|_f[lr]\b|\bf[lr]_|\bf[lr]\b|head ?light|headlamp/i, RR = /rear|back|_r[lr]\b|\br[lr]_|\br[lr]\b|tail ?light|brake ?light/i; let fz = 0, fn = 0, rz = 0, rn = 0;
    src.traverse((o) => { if (!o.isMesh) return; const nm = nameChain(o); const c0 = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).z; if (FR.test(nm)) { fz += c0; fn++; } else if (RR.test(nm)) { rz += c0; rn++; } else { const m = Array.isArray(o.material) ? o.material[0] : o.material; const e = m && m.emissive; if (e && e.r > 0.4 && e.g < 0.2 && e.b < 0.2) { rz += c0; rn++; } } });
    const front = fn ? fz / fn : null, rear = rn ? rz / rn : null; if ((front !== null && rear !== null && front < rear) || (front === null && rear !== null && rear > 0) || (rear === null && front !== null && front < 0)) holder.rotation.y += Math.PI;
  }
  if (C.flip) holder.rotation.y += Math.PI;
  holder.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(holder); const len = bb.max.z - bb.min.z;
  // 2) scale to the real length, centre on x/z, sit on the ground
  const k = spec.L / len; holder.scale.setScalar(k); holder.updateMatrixWorld(true); bb = new THREE.Box3().setFromObject(holder); const c = bb.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -bb.min.y, -c.z); holder.updateMatrixWorld(true); body.add(holder);
  // 3) materials: per-instance paint + glass, shadows
  const mats = new Map(); let paint = null, glass = null, bestArea = 0; const area = new Map();
  holder.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; o.material = (Array.isArray(o.material) ? ms : [ms[0]]).map((m) => { if (!mats.has(m)) mats.set(m, m.clone()); return mats.get(m); }); if (!Array.isArray(ms) || ms.length === 1) o.material = o.material[0];
    const g = o.geometry; g.computeBoundingBox(); const s = g.boundingBox.getSize(new THREE.Vector3()); const a = (s.x * s.y + s.y * s.z + s.x * s.z) * (g.index ? g.index.count : g.attributes.position.count) ** 0.25; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) area.set(m, (area.get(m) || 0) + a); });
  for (const [m, a] of area) { const n = nameChain({ material: m, name: '' }); if (GLASS_RE.test(m.name || '') || (m.transparent && m.opacity < 0.9)) { glass = glass || m; continue; } const score = a * (PAINT_RE.test(m.name || '') ? 50 : 1) * ((m.metalness ?? 0) > 0.95 && (m.roughness ?? 1) < 0.1 ? 0.2 : 1); if (score > bestArea) { bestArea = score; paint = m; } }
  if (!paint) paint = new THREE.MeshPhysicalMaterial({ color: paintColor });
  if (paint.color && paintColor !== spec.colors[0]) paint.color.set(paintColor);
  // 4) wheels: group wheel-ish meshes into 4 corners, re-parent into steer/spin pivots
  const wheelMeshes = []; holder.traverse((o) => { if (o.isMesh && WHEEL_RE.test(nameChain(o))) wheelMeshes.push(o); });
  const wheels = []; const hw = spec.W / 2; const wh = spec.wheels;
  const corners = { '1,1': [], '-1,1': [], '1,-1': [], '-1,-1': [] };
  for (const o of wheelMeshes) { const b = new THREE.Box3().setFromObject(o); const cc = b.getCenter(new THREE.Vector3()); if (cc.y > spec.H * 0.6) continue; corners[`${cc.x >= 0 ? 1 : -1},${cc.z >= 0 ? 1 : -1}`].push(o); }
  const found = Object.values(corners).every((l) => l.length);
  for (const key of ['1,1', '-1,1', '1,-1', '-1,-1']) {
    const [sx, sz2] = key.split(',').map(Number); let w;
    if (found) {
      const b = new THREE.Box3(); for (const o of corners[key]) b.union(new THREE.Box3().setFromObject(o)); const cc = b.getCenter(new THREE.Vector3()); const s = b.getSize(new THREE.Vector3());
      const r = Math.max(s.y, s.z) / 2; const pivot = new THREE.Group(); pivot.position.set(cc.x, cc.y, cc.z); root.add(pivot); const spin = new THREE.Group(); pivot.add(spin); root.updateMatrixWorld(true);
      for (const o of corners[key]) { const keep = new THREE.Matrix4().copy(o.matrixWorld); const target = CALIPER_RE.test(nameChain(o)) ? pivot : spin; target.updateMatrixWorld(true); o.removeFromParent(); target.add(o); o.matrix.copy(new THREE.Matrix4().copy(target.matrixWorld).invert().multiply(keep)); o.matrix.decompose(o.position, o.quaternion, o.scale); }
      w = { x: cc.x, z: cc.z, r: cc.y, w: Math.max(0.2, s.x), pivot, spinner: spin, baseY: cc.y };
    } else w = { x: sx * wh.track * hw, z: (sz2 > 0 ? wh.f - 0.5 : wh.b - 0.5) * spec.L, r: wh.r, w: wh.w };
    wheels.push({ ...w, front: sz2 > 0, side: sx, spin: 0, comp: 0, lastP: null, skid: false });
  }
  // dentable body: every non-wheel mesh gets its own geometry copy (shared source stays pristine) + rest pose
  const deformList = []; holder.traverse((o) => { if (!o.isMesh || WHEEL_RE.test(nameChain(o)) || GLASS_RE.test(nameChain(o))) return; o.geometry = o.geometry.clone(); deformList.push([o, o.geometry.attributes.position.array.slice()]); });
  // glTF lights stay as modelled; the light uniform array keeps brake/indicator logic happy
  const lmat = makeLightMaterial();
  // modelled lights: emissive materials named light_* follow the game's light groups (head, brake, indicators, reverse)
  const LG = { light_head: 0, light_tail: 1, light_ind_l: 2, light_ind_r: 3, light_rev: 4, light_drl: 7 }; const glow = [];
  for (const m of mats.values()) { const k = Object.keys(LG).find((n) => (m.name || '').startsWith(n)); if (k && m.emissive) glow.push({ m, g: LG[k], base: m.emissiveIntensity || 1 }); }
  const dummy = () => { const m = new THREE.Object3D(); body.add(m); return m; };
  return { root, body, bodyMesh: null, cabMesh: null, paint, glass, detail: null, lights: null, lightU: lmat.uniforms.L.value, bumpers: [dummy(), dummy()], doors: [], wheels, interior: null, custom: true, hideWheels: found, glow, deformList };
}
