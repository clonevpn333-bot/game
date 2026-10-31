// @ts-nocheck
// HAUNTED SHIFT · clay sets and props. Each set is a Group you add to a scene; animated bits expose update(T).
import { THREE, canvasTex, rng, clamp } from "./base.js";
import { clay, glossy, glow, mesh, ball, limb, boxG, cylG, sphG, textTex } from "./clay.js";

const U = []; // animated updaters registered by props: f(T)
export const tick = (T) => U.forEach((f) => f(T));

// ------------------------------------------------------------------ glow sprite (fake bloom around lights)
const GLOWT = () => canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.45)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
let GT = null;
export function halo(color, size, op = 0.6) {
  if (!GT) GT = GLOWT();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

// ------------------------------------------------------------------ jack-o'-lantern
const faceTex = (seed) => canvasTex(256, 256, (c) => {
  const r = rng(seed); c.fillStyle = "#000"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#fff";
  const tri = (x, y, s, f) => { c.beginPath(); c.moveTo(x - s, y + s * 0.6 * f); c.lineTo(x + s, y + s * 0.6 * f); c.lineTo(x, y - s * 0.7 * f); c.fill(); };
  tri(88, 104, 24 + r() * 6, 1); tri(168, 104, 24 + r() * 6, 1); tri(128, 140, 12, 1);
  c.beginPath(); c.moveTo(64, 168); for (let i = 0; i <= 8; i++) c.lineTo(64 + i * 16, 168 + (i % 2 ? 22 : 0) + (r() - 0.5) * 6); c.lineTo(192, 168); c.quadraticCurveTo(128, 236, 64, 168); c.fill();
});
export function pumpkin(s = 1, seed = 1, lit = true) {
  const g = new THREE.Group(), m = clay(0xe8761c, { unique: lit, emap: lit ? faceTex(seed) : null, emissive: lit ? 0xffb030 : 0x000000, ei: 0 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const b = ball(m, Math.sin(a) * 0.1 * s, 0.17 * s, Math.cos(a) * 0.1 * s, 0.17 * s, 0.17 * s, 0.17 * s); if (i !== 0) b.material = clay(0xe8761c); g.add(b); }
  const front = ball(m, 0, 0.17 * s, 0.06 * s, 0.2 * s, 0.17 * s, 0.17 * s); g.add(front);
  g.add(mesh(cylG(0.025 * s, 0.035 * s, 0.1 * s), clay(0x4f6a2a), 0, 0.36 * s, 0));
  if (lit) { const h = halo(0xffa040, 0.9 * s, 0.55); h.position.set(0, 0.17 * s, 0.25 * s); g.add(h); U.push((T) => { const f = 0.75 + 0.25 * Math.sin(T * 13 + seed) * Math.sin(T * 7.3 + seed * 2); m.emissiveIntensity = 2.4 * f; h.material.opacity = 0.5 * f; }); }
  return g;
}

// ------------------------------------------------------------------ dead tree
export function tree(h = 3, seed = 1) {
  const r = rng(seed), g = new THREE.Group(), m = clay(0x2a2030);
  const branch = (a, b, rad, d) => { g.add(limb(m, a, b, rad)); if (d <= 0) return; for (let i = 0; i < 2; i++) { const ang = (r() - 0.5) * 2.2, len = (b[1] - a[1]) * 0.7 + 0.3; branch(b, [b[0] + Math.sin(ang) * len * 0.7, b[1] + len * 0.6, b[2] + (r() - 0.5) * 0.4], rad * 0.6, d - 1); } };
  branch([0, 0, 0], [0.1, h * 0.55, 0], 0.13, 3);
  return g;
}

// ------------------------------------------------------------------ SCREAM MANOR exterior
export function manor() {
  const g = new THREE.Group(), r = rng(9);
  const wall = clay(0x4b3a5c), trim = clay(0x2a1f36), roof = clay(0x2b2238), win = glow(0xffa94a, 1.6);
  g.add(mesh(boxG(5, 3.2, 3, 0.1), wall, 0, 1.6, -1.5));
  g.add(mesh(boxG(2.2, 2.4, 2.2, 0.1), wall, -1.6, 4.1, -1.5));            // tower
  const rf = mesh(new THREE.ConeGeometry(1.75, 1.8, 4), roof, -1.6, 6.2, -1.5); rf.rotation.y = Math.PI / 4; g.add(rf);
  const rf2 = mesh(new THREE.CylinderGeometry(0.01, 2.0, 1.4, 4), roof, 1.0, 3.9, -1.5, 1.3, 1, 0.9); rf2.rotation.y = Math.PI / 4; g.add(rf2);
  for (const [x, y] of [[-1.6, 1.9], [1.5, 1.9], [-1.6, 4.3], [1.0, 3.6]]) {
    g.add(mesh(boxG(0.8, 1.0, 0.1, 0.04), trim, x, y, 0.02));
    const w = mesh(boxG(0.62, 0.82, 0.06, 0.03), win, x, y, 0.06); w.castShadow = false; g.add(w);
    const h = halo(0xffa040, 1.8, 0.45); h.position.set(x, y, 0.3); g.add(h);
    U.push((T) => { const f = 0.8 + 0.2 * Math.sin(T * 9 + x * 3); h.material.opacity = 0.45 * f; });
  }
  // door + red light
  g.add(mesh(boxG(1.0, 1.7, 0.12, 0.05), clay(0x5a1a1a), 0, 0.85, 0.02));
  const dl = halo(0xff3030, 1.4, 0.5); dl.position.set(0, 1.9, 0.3); g.add(dl);
  // the sign
  const sign = new THREE.Group(); sign.position.set(0, 3.55, 0.25);
  sign.add(mesh(boxG(3.4, 0.9, 0.14, 0.06), clay(0x1a1218), 0, 0, 0));
  const st = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: textTex([{ t: "SCREAM MANOR", size: 150, c: "#ff7a1e", stroke: 14, sc: "#3a0808" }], { w: 1024, h: 256 }), transparent: true, toneMapped: false }));
  st.position.z = 0.08; sign.add(st);
  const sh = halo(0xff7a1e, 4.2, 0.35); sh.position.z = 0.2; sign.add(sh);
  U.push((T) => { const f = Math.sin(T * 23) > -0.85 ? 1 : 0.3; st.material.opacity = f; sh.material.opacity = 0.35 * f; });
  g.add(sign);
  // fence + bunting + pumpkins on steps
  for (let i = -6; i <= 6; i++) { if (Math.abs(i) < 2) continue; g.add(mesh(boxG(0.09, 0.9 + (i % 2) * 0.15, 0.09, 0.03), trim, i * 0.45, 0.45, 1.6)); }
  g.add(mesh(boxG(5.6, 0.07, 0.07, 0.02), trim, 0, 0.72, 1.6));
  [[-0.9, 0, 0.5, 1.2], [0.9, 0, 0.5, 1.0], [-2.4, 0, 1.9, 1.5], [2.3, 0, 1.9, 1.3]].forEach(([x, y, z, s], i) => { const p = pumpkin(s, 30 + i); p.position.set(x, y, z); g.add(p); });
  return g;
}

// ------------------------------------------------------------------ night ground + sky
export function nightGround(w = 40, d = 40, color = 0x2a3a2e) {
  const g = new THREE.Group();
  const gr = mesh(boxG(w, 0.2, d, 0.05), clay(color), 0, -0.1, 0); g.add(gr);
  return g;
}
export function skyDome(top = 0x1a1036, bottom = 0x4a2a5a, moon = true) {
  const tex = canvasTex(16, 256, (c) => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#" + new THREE.Color(top).getHexString()); g.addColorStop(1, "#" + new THREE.Color(bottom).getHexString()); c.fillStyle = g; c.fillRect(0, 0, 16, 256); });
  const m = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  const g = new THREE.Group(); g.add(m);
  if (moon) { const mo = ball(new THREE.MeshBasicMaterial({ color: 0xfff0c8, fog: false }), -30, 55, -100, 9); mo.castShadow = false; g.add(mo); const h = halo(0xffe0b0, 60, 0.35); h.material.fog = false; h.position.set(-30, 55, -98); g.add(h); }
  return g;
}

// ------------------------------------------------------------------ haunted corridor (interior)
const wallpaper = () => canvasTex(256, 256, (c) => { c.fillStyle = "#3a2448"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#2a1838"; for (let i = 0; i < 8; i++) c.fillRect(i * 32, 0, 14, 256); c.fillStyle = "rgba(160,90,190,0.25)"; for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) { c.beginPath(); c.arc(x + 32, y + 32, 9, 0, 6.28); c.fill(); } }, { repeat: true });
export function corridor(len = 14) {
  const g = new THREE.Group(), wp = wallpaper(); wp.repeat.set(len / 2, 1.5);
  const wm = clay(0x8a6aa0, { map: wp, unique: true });
  g.add(mesh(boxG(3.4, 0.2, len, 0.04), clay(0x4a3020), 0, -0.1, -len / 2 + 2));
  for (let i = 0; i < len * 2.4; i++) g.add(mesh(boxG(3.3, 0.02, 0.02, 0.005), clay(0x2a1a10), 0, 0.005, 2 - i * 0.42));
  for (const s of [-1, 1]) g.add(mesh(boxG(0.2, 3.2, len, 0.04), wm, s * 1.7, 1.6, -len / 2 + 2));
  g.add(mesh(boxG(3.4, 0.2, len, 0.04), clay(0x1a1220), 0, 3.2, -len / 2 + 2));
  // hanging bulbs that flicker
  const lights = [];
  for (let i = 0; i < 4; i++) {
    const z = 1 - i * 3.6, b = ball(glow(0xffc070, 2), 0, 2.6, z, 0.07); b.castShadow = false; g.add(b);
    g.add(limb(clay(0x111111), [0, 3.1, z], [0, 2.67, z], 0.008));
    const h = halo(0xffb060, 1.6, 0.5); h.position.set(0, 2.6, z); g.add(h);
    const pl = new THREE.PointLight(0xffa850, 3.0, 6, 1.6); pl.position.set(0, 2.45, z); g.add(pl);
    lights.push({ b, h, pl, i });
  }
  U.push((T) => lights.forEach(({ h, pl, i }) => { const f = Math.sin(T * 31 + i * 7) > 0.92 ? 0.25 : 0.85 + 0.15 * Math.sin(T * 11 + i); pl.intensity = 3.0 * f; h.material.opacity = 0.5 * f; }));
  // portraits, cobwebs, coffin, candles
  for (const [s, z] of [[-1, -1.5], [1, -4], [-1, -7.5]]) {
    const f = new THREE.Group(); f.position.set(s * 1.58, 1.7, z); f.rotation.y = -s * Math.PI / 2;
    f.add(mesh(boxG(0.8, 1.0, 0.08, 0.03), clay(0x8a6420, { rough: 0.35, coat: 0.6 }), 0, 0, 0));
    f.add(mesh(boxG(0.62, 0.82, 0.04, 0.02), clay(0x2a2a34), 0, 0, 0.04));
    f.add(ball(clay(0x6a6a7a), 0, 0.05, 0.07, 0.17, 0.22, 0.05));
    for (const e of [-1, 1]) { const ey = ball(glow(0xff3020, 2), e * 0.06, 0.1, 0.12, 0.022); f.add(ey); }
    g.add(f);
  }
  const web = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd8d0e0, transparent: true, opacity: 0.55 }));
  { const p = [], r = rng(4); for (const [cx, cz, s] of [[-1.6, 0.5, 1], [1.6, -3, -1], [-1.6, -6, 1]]) { for (let k = 0; k < 6; k++) { const a = (k / 5) * Math.PI / 2; p.push(cx, 3.1, cz, cx + s * Math.sin(a) * -0.7, 3.1 - Math.cos(a) * 0.7, cz); } for (let ring = 1; ring < 4; ring++) for (let k = 0; k < 5; k++) { const a0 = (k / 5) * Math.PI / 2, a1 = ((k + 1) / 5) * Math.PI / 2, rr = ring * 0.2; p.push(cx + s * Math.sin(a0) * -rr, 3.1 - Math.cos(a0) * rr, cz, cx + s * Math.sin(a1) * -rr, 3.1 - Math.cos(a1) * rr, cz); } } web.geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); }
  g.add(web);
  const coffin = new THREE.Group(); coffin.position.set(1.15, 0, -2.2); coffin.rotation.y = -0.25;
  coffin.add(mesh(new THREE.CylinderGeometry(0.42, 0.3, 2.1, 6, 1), clay(0x3a2418), 0, 1.05, 0, 1, 1, 0.45));
  coffin.add(limb(clay(0xc8a040), [0, 1.3, 0.2], [0, 1.0, 0.2], 0.03)); coffin.add(limb(clay(0xc8a040), [-0.12, 1.2, 0.2], [0.12, 1.2, 0.2], 0.03));
  g.add(coffin); g.userData.coffin = coffin;
  const curtain = new THREE.Group(); curtain.position.set(0, 0, -len + 2.2);
  for (let i = 0; i < 9; i++) curtain.add(mesh(capG2(), clay(0x8a1420), -1.5 + i * 0.37, 1.55, 0, 0.2, 1.6, 0.12));
  g.add(curtain);
  for (const [x, z] of [[-1.3, 0.2], [1.3, -5], [-1.3, -8]]) { const p = pumpkin(0.8, 60 + z); p.position.set(x, 0, z); g.add(p); }
  // green EXIT sign on the side wall (for the back door)
  const ex = new THREE.Group(); ex.position.set(-1.58, 2.35, -9.6); ex.rotation.y = Math.PI / 2;
  ex.add(mesh(boxG(0.7, 0.28, 0.06, 0.02), new THREE.MeshBasicMaterial({ map: textTex([{ t: "EXIT", size: 150, c: "#ffffff" }], { w: 512, h: 200, bg: "#13a04a" }), toneMapped: false })));
  const eh = halo(0x30ff70, 1.4, 0.4); eh.position.z = 0.1; ex.add(eh); g.add(ex);
  const door = mesh(boxG(1.0, 2.1, 0.1, 0.03), clay(0x5a5a62, { rough: 0.35 }), -1.58, 1.05, -9.6); door.rotation.y = Math.PI / 2; g.add(door);
  door.add(mesh(boxG(0.8, 0.08, 0.06, 0.02), clay(0xb8b8c0, { rough: 0.2, coat: 1 }), 0, 0.05, 0.08));
  g.userData.door = door;
  return g;
}
function capG2() { return sphG(24); }

// ------------------------------------------------------------------ backstage mirror
export function mirror() {
  const g = new THREE.Group();
  g.add(mesh(boxG(1.6, 1.2, 0.08, 0.04), clay(0x2a2228), 0, 1.6, -0.6));
  const glass = mesh(boxG(1.4, 1.0, 0.03, 0.02), glossy(0x9aa6b8, { rough: 0.05 }), 0, 1.6, -0.55); g.add(glass);
  for (let i = 0; i < 6; i++) { const x = -0.7 + (i / 5) * 1.4; for (const y of [2.15, 1.05]) { const b = ball(glow(0xfff2c0, 2.4), x, y, -0.52, 0.045); b.castShadow = false; g.add(b); const h = halo(0xffe0a0, 0.5, 0.5); h.position.set(x, y, -0.48); g.add(h); } }
  g.add(mesh(boxG(1.8, 0.08, 0.6, 0.03), clay(0x6a4a3a), 0, 0.95, -0.35));
  const jar = mesh(cylG(0.07, 0.07, 0.08), clay(0x7fd05a, { coat: 0.6 }), 0.45, 1.03, -0.3); g.add(jar);
  return g;
}

// ------------------------------------------------------------------ town street (chaos)
export function street() {
  const g = new THREE.Group(), r = rng(21);
  g.add(mesh(boxG(8, 0.2, 60, 0.05), clay(0x2c2c36), 0, -0.1, -20));
  for (const s of [-1, 1]) g.add(mesh(boxG(3, 0.32, 60, 0.06), clay(0x5a5660), s * 5.5, -0.04, -20));
  for (let i = 0; i < 12; i++) g.add(mesh(boxG(0.18, 0.02, 1.2, 0.01), clay(0xe8d070), 0, 0.005, 8 - i * 4.5));
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const hw = 3.2 + r() * 1.2, hh = 3 + r() * 2.2, z = 4 - i * 8.5 - r() * 2, x = s * (8.5 + hw / 2);
    const col = [0x5a4a6a, 0x4a5a6a, 0x6a4a4a, 0x4a4a3a, 0x3a4a5a][Math.floor(r() * 5)];
    g.add(mesh(boxG(hw, hh, 6, 0.12), clay(col), x, hh / 2, z));
    const rf = mesh(new THREE.ConeGeometry(hw * 0.78, 1.6, 4), clay(0x2a2232), x, hh + 0.8, z, 1, 1, 1.6); rf.rotation.y = Math.PI / 4; g.add(rf);
    for (let k = 0; k < 2; k++) { const wz = z - 1.3 + k * 2.6, lit = r() < 0.8; const w = mesh(boxG(0.1, 0.9, 0.8, 0.03), lit ? glow(r() < 0.5 ? 0xffa94a : 0xffe08a, 1.5) : clay(0x15121a), x - s * hw / 2, hh * 0.55, wz); w.castShadow = false; g.add(w); if (lit) { const h = halo(0xffa040, 1.6, 0.35); h.position.set(x - s * (hw / 2 + 0.2), hh * 0.55, wz); g.add(h); } }
    const p = pumpkin(0.9, 70 + i * 2 + (s > 0 ? 1 : 0)); p.position.set(s * 4.6, 0.12, z + 1.5); g.add(p);
  }
  for (let i = 0; i < 5; i++) { const z = 6 - i * 10; for (const s of [-1, 1]) { g.add(limb(clay(0x1a1a22), [s * 4.4, 0, z], [s * 4.4, 4.2, z], 0.06)); g.add(limb(clay(0x1a1a22), [s * 4.4, 4.2, z], [s * 3.7, 4.3, z], 0.05)); const b = ball(glow(0xffe0a0, 1.8), s * 3.65, 4.2, z, 0.12); b.castShadow = false; g.add(b); const h = halo(0xffd8a0, 2.4, 0.4); h.position.set(s * 3.65, 4.1, z); g.add(h); } }
  return g;
}
export function car(color = 0xc83a2a, crashed = false) {
  const g = new THREE.Group(), m = glossy(color, { rough: 0.3 });
  g.add(mesh(boxG(1.9, 0.6, 4.0, 0.25), m, 0, 0.6, 0));
  g.add(mesh(boxG(1.7, 0.6, 2.1, 0.25), m, 0, 1.15, -0.2));
  for (const s of [-1, 1]) g.add(mesh(boxG(0.03, 0.42, 1.8, 0.02), glossy(0x1a2230, { rough: 0.05 }), s * 0.86, 1.16, -0.2));
  g.add(mesh(boxG(1.5, 0.45, 0.03, 0.02), glossy(0x1a2230, { rough: 0.05 }), 0, 1.18, 0.86));
  for (const [x, z] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) { const w = mesh(cylG(0.34, 0.34, 0.26, 20), clay(0x15151a), x, 0.34, z); w.rotation.z = Math.PI / 2; g.add(w); }
  for (const s of [-1, 1]) { const hl = ball(glow(0xfff4d0, 2), s * 0.6, 0.66, 2.0, 0.13, 0.09, 0.04); g.add(hl); }
  if (crashed) g.rotation.set(0.04, 0.5, 0.12);
  return g;
}
/** a clay fire: flickering flame blobs + light */
export function fire(s = 1, seed = 1) {
  const g = new THREE.Group(), r = rng(seed), fl = [];
  const ms = [glow(0xff5a10, 1.6), glow(0xffa020, 1.8), glow(0xffe070, 2)];
  for (let i = 0; i < 9; i++) { const k = i % 3; const b = ball(ms[k], (r() - 0.5) * 0.5 * s, 0, (r() - 0.5) * 0.4 * s, 0.18 * s * (1 - k * 0.25)); b.castShadow = false; g.add(b); fl.push({ b, ph: r() * 6, sp: 2 + r() * 3, k }); }
  const h = halo(0xff8020, 3.2 * s, 0.55); h.position.y = 0.4 * s; g.add(h);
  const pl = new THREE.PointLight(0xff7a20, 6 * s, 9 * s, 1.5); pl.position.y = 0.6 * s; g.add(pl);
  U.push((T) => { fl.forEach(({ b, ph, sp, k }) => { const u = ((T * sp * 0.6 + ph) % 1); b.position.y = u * 0.9 * s * (1 - k * 0.15); const sc = (1 - u) * 0.2 * s * (1 - k * 0.2); b.scale.set(sc, sc * 1.5, sc); }); pl.intensity = 6 * s * (0.8 + 0.2 * Math.sin(T * 17 + seed)); });
  return g;
}

// ------------------------------------------------------------------ army truck + searchlight
export function armyTruck() {
  const g = new THREE.Group(), m = clay(0x4c5a34), dk = clay(0x2c3420);
  g.add(mesh(boxG(2.3, 1.1, 5.4, 0.12), m, 0, 1.1, 0));
  g.add(mesh(boxG(2.2, 1.0, 1.6, 0.14), m, 0, 2.0, 1.7));
  g.add(mesh(boxG(1.9, 0.5, 0.04, 0.02), glossy(0x1a2230, { rough: 0.05 }), 0, 2.15, 2.51));
  const cover = mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.6, 20, 1, false, -Math.PI / 2, Math.PI), clay(0x6a7048), 0, 1.65, -0.85); cover.rotation.x = Math.PI / 2; cover.rotation.z = Math.PI / 2; cover.scale.set(1, 1, 0.75); g.add(cover);
  for (const [x, z] of [[-1.1, 1.8], [1.1, 1.8], [-1.1, -1.5], [1.1, -1.5], [-1.1, -2.4], [1.1, -2.4]]) { const w = mesh(cylG(0.48, 0.48, 0.38, 20), clay(0x15151a), x, 0.48, z); w.rotation.z = Math.PI / 2; g.add(w); }
  for (const s of [-1, 1]) { g.add(ball(glow(0xfff4d0, 2.2), s * 0.75, 1.3, 2.72, 0.15, 0.15, 0.05)); const h = halo(0xfff0c0, 2.2, 0.55); h.position.set(s * 0.75, 1.3, 2.9); g.add(h); }
  const star = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: textTex([{ t: "★", size: 220, c: "#e8e4d0" }], { w: 256, h: 256 }), transparent: true }));
  star.position.set(1.16, 1.1, 0.4); star.rotation.y = Math.PI / 2; g.add(star);
  return g;
}
export function searchBeam(len = 30, color = 0xdfe8ff) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const c = new THREE.Mesh(new THREE.ConeGeometry(len * 0.12, len, 24, 1, true), m);
  c.geometry.translate(0, -len / 2, 0);
  return c;
}

// ------------------------------------------------------------------ rain (streaks, deterministic in T)
export function rain(n = 1400, box = [14, 14, 22], cx = 0, cz = 0) {
  const pos = new Float32Array(n * 6), r = rng(77), base = [];
  for (let i = 0; i < n; i++) base.push([cx + (r() - 0.5) * box[0], r(), cz + (r() - 0.5) * box[2], 0.7 + r() * 0.6]);
  const geoR = new THREE.BufferGeometry(); geoR.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const L = new THREE.LineSegments(geoR, new THREE.LineBasicMaterial({ color: 0xb8c8e8, transparent: true, opacity: 0.55 }));
  L.frustumCulled = false;
  L.userData.set = (T, k = 1) => {
    const H = box[1];
    for (let i = 0; i < n; i++) { const [x, y0, z, sp] = base[i]; const y = H - (((y0 * H + T * 14 * sp) % H) + H) % H; const j = i * 6, len = 0.35 * sp; pos[j] = x; pos[j + 1] = y; pos[j + 2] = z; pos[j + 3] = x + 0.03; pos[j + 4] = y - len; pos[j + 5] = z; }
    geoR.attributes.position.needsUpdate = true; L.material.opacity = 0.55 * k; L.visible = k > 0.01;
  };
  return L;
}

// ------------------------------------------------------------------ phone with an emergency alert
export function phone(alert = true) {
  const g = new THREE.Group();
  g.add(mesh(boxG(0.075, 0.15, 0.012, 0.012), glossy(0x1a1a20), 0, 0, 0));
  const scr = textTex([
    { t: "⚠ EMERGENCY ALERT", size: 40, c: "#ffffff", y: 70 },
    { t: "Outbreak reported.", size: 34, c: "#ffffff", y: 140, weight: 700, font: "Arial" },
    { t: "STAY INDOORS.", size: 44, c: "#ffd040", y: 200 },
    { t: "Avoid anyone acting", size: 30, c: "#ffffff", y: 262, weight: 600, font: "Arial" },
    { t: "strange.", size: 30, c: "#ffffff", y: 300, weight: 600, font: "Arial" },
  ], { w: 400, h: 400, bg: "#c81818" });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.066), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }));
  s.position.set(0, 0.02, 0.0065); g.add(s);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.13), new THREE.MeshBasicMaterial({ color: 0x0a0a14, toneMapped: false })); top.position.z = 0.006; g.add(top);
  s.position.z = 0.0068; s.visible = alert; g.userData.screen = s;
  const h = halo(0xff4030, 0.4, 0.35); h.position.z = 0.03; g.add(h); g.userData.halo = h;
  return g;
}

// ------------------------------------------------------------------ fog cards (soft volumetric layers)
const fogT = () => canvasTex(256, 128, (c) => { const r = rng(5); for (let i = 0; i < 40; i++) { const x = r() * 256, y = 40 + r() * 60, rad = 20 + r() * 50; const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(255,255,255,0.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 256, 128); } });
let FT = null;
export function fogCard(w = 10, h = 3, color = 0xb8a8d8, op = 0.5) {
  if (!FT) FT = fogT();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: FT, color, transparent: true, opacity: op, depthWrite: false }));
  return m;
}
