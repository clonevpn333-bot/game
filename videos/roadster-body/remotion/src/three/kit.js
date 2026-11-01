// @ts-nocheck
// ROADSTER BODY · motion + look kit: snappy easing/keyframes, impulses, a dark night env map, bloom composer,
// the polished night test track, the cyclorama stage, x-ray people, the pilot seat, the bus outline, props.
import { THREE, canvasTex, rng, clamp, lerp, V3 } from "./base.js";
import { clay, glossy, glow, mesh, ball, limb, boxG, cylG, textTex, makeChar, SKIN } from "./clay.js";
import { halo } from "./sets.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ------------------------------------------------------------------ EASING (snappy, never linear)
export const E = {
  lin: (k) => k,
  expoOut: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  expoIn: (k) => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
  expoInOut: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
  backOut: (k, s = 2.2) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  anticip: (k, s = 2.0) => (s + 1) * k * k * k - s * k * k,          // pull back, then go
  quintOut: (k) => 1 - Math.pow(1 - k, 5),
  hold: () => 0,                                                    // stays on the previous key until the next key time
  bounceOut: (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; },
};
/** K(t, [[t0, v0], [t1, v1, ease], ...]) — the ease belongs to the segment arriving at that key. v: number | number[] */
export function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ez] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1], k = clamp((t - t0) / Math.max(1e-6, t1 - t0)), e = (typeof ez === "function" ? ez : E[ez || "expoOut"])(k);
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], e)) : lerp(v0, v1, e);
    }
  }
  return keys[keys.length - 1][1];
}
/** damped spring step response: 0 before t0, overshoots to 1 and settles */
export const spring = (t, t0, f = 9, z = 0.32) => { const u = t - t0; if (u <= 0) return 0; const w = f * 2 * Math.PI * 0.16; return 1 - Math.exp(-z * w * u) * Math.cos(w * Math.sqrt(1 - z * z) * u); };
/** an impulse that kicks then rings out (for shakes / jolts) */
export const kick = (t, t0, amp = 1, f = 26, d = 7) => (t < t0 ? 0 : amp * Math.sin((t - t0) * f) * Math.exp(-(t - t0) * d));

// ------------------------------------------------------------------ dark night environment (reflections = soft strip lights)
export function nightEnv(renderer) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020206);
  const strip = (x, y, z, w, h, c, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; m.lookAt(0, 0, 0); s.add(m); };
  strip(0, 8, 0, 14, 1.2, 0x8a90b0); strip(-9, 3, 4, 3, 7, 0x3a5a9a); strip(9, 3, -4, 3, 7, 0xb07040); strip(0, 2, -10, 10, 0.6, 0x5a6aa0); strip(0, -6, 0, 30, 30, 0x050508);
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(s, 0.02).texture;
}
export function makeComposer(renderer, scene, cam, o = {}) {
  const c = new EffectComposer(renderer);
  c.setPixelRatio(1); c.setSize(1080, 1920);
  c.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), o.strength ?? 0.55, o.radius ?? 0.55, o.threshold ?? 0.82);
  c.addPass(bloom); c.addPass(new OutputPass());
  c.bloom = bloom;
  return c;
}

// ------------------------------------------------------------------ THE NIGHT TEST TRACK (complete, clean, moody)
const asphaltTex = () => canvasTex(512, 512, (c) => { const r = rng(3); c.fillStyle = "#16161c"; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 18 + r() * 26; c.fillStyle = `rgb(${v},${v},${v + 4})`; c.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); } for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(8,8,12,${0.25 + r() * 0.3})`; c.beginPath(); c.ellipse(r() * 512, r() * 512, 20 + r() * 70, 8 + r() * 30, r() * 3, 0, 6.3); c.fill(); } }, { repeat: true });
const checkerTex = () => canvasTex(256, 64, (c) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? "#f2f2ee" : "#141418"; c.fillRect(x * 16, y * 16, 16, 16); } });
export function track() {
  const g = new THREE.Group(), r = rng(11), U = [];
  const at = asphaltTex(); at.repeat.set(30, 60);
  const wet = new THREE.MeshStandardMaterial({ color: 0x5a5a66, map: at, roughness: 0.16, metalness: 0.35 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 480), wet); ground.rotation.x = -Math.PI / 2; ground.position.z = -150; ground.receiveShadow = true; g.add(ground);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: 0x0c120e, roughness: 0.95 })); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, -150); g.add(grass);
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e6dc, roughness: 0.4 }), yel = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.4 });
  for (const x of [-7.6, 7.6]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 420), paint); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.006, -170); g.add(l); }
  for (let i = 0; i < 70; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3), yel); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.006, 20 - i * 6); g.add(d); }
  const st = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 1.6), new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.35 })); st.rotation.x = -Math.PI / 2; st.position.set(0, 0.007, 0); g.add(st);
  // distance markers every 10 ft (3.05 m) from the start (for the bus beat)
  for (let i = 1; i <= 5; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.12), paint); m.rotation.x = -Math.PI / 2; m.position.set(-6.4, 0.007, -i * 3.05); g.add(m); }
  // tyre marks
  for (const x of [-0.92, 0.92]) for (let k = 0; k < 3; k++) { const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 9 - k * 2), new THREE.MeshBasicMaterial({ color: 0x050506, transparent: true, opacity: 0.55 - k * 0.12 })); tm.rotation.x = -Math.PI / 2; tm.position.set(x + (k - 1) * 0.05, 0.008, -5 - k); g.add(tm); }
  // edge lights: two rows of small lamps + halos
  const lampM = glow(0xffd9a0, 2.6), lampB = glow(0x7ab8ff, 2.4);
  for (let i = 0; i < 40; i++) for (const x of [-8.6, 8.6]) { const z = 24 - i * 7; const b = mesh(cylG(0.09, 0.11, 0.18, 12), clay(0x22222a), x, 0.09, z); g.add(b); const l = ball(i % 6 === 0 ? lampB : lampM, x, 0.22, z, 0.07, 0.05, 0.07, 12); l.castShadow = false; g.add(l); const h = halo(i % 6 === 0 ? 0x7ab8ff : 0xffc98a, 0.9, 0.55); h.position.set(x, 0.24, z); g.add(h); }
  // light towers with volumetric cones
  const coneM = new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
    const z = 10 - i * 40, x = s * 14;
    g.add(limb(clay(0x2a2a32), [x, 0, z], [x, 14, z], 0.18)); g.add(mesh(boxG(2.2, 0.6, 0.8, 0.08), clay(0x2a2a32), x - s * 0.6, 14.2, z));
    const lh = mesh(boxG(2.0, 0.08, 0.6, 0.02), glow(0xe8eeff, 2.4), x - s * 0.6, 13.88, z); lh.castShadow = false; g.add(lh);
    const c = new THREE.Mesh(new THREE.ConeGeometry(7, 14, 32, 1, true), coneM); c.position.set(x - s * 2.4, 6.9, z); c.rotation.z = s * 0.26; g.add(c);
    const hh = halo(0xdfe8ff, 6, 0.35); hh.position.set(x - s * 0.6, 13.7, z); g.add(hh);
  }
  // cones by the start
  for (let i = 0; i < 6; i++) { const cn = new THREE.Group(); cn.position.set((i % 2 ? 1 : -1) * 6.6, 0, 4 - Math.floor(i / 2) * 3); cn.add(mesh(new THREE.ConeGeometry(0.22, 0.7, 24), clay(0xff6a1a), 0, 0.36, 0)); cn.add(mesh(cylG(0.13, 0.155, 0.12, 24), clay(0xf2f2ee), 0, 0.42, 0)); cn.add(mesh(boxG(0.55, 0.05, 0.55, 0.02), clay(0x1a1a1e), 0, 0.025, 0)); g.add(cn); }
  // hangar + sign
  const hg = new THREE.Group(); hg.position.set(-34, 0, -70); hg.rotation.y = 0.5; g.add(hg);
  const hm = clay(0x2c2e36);
  hg.add(mesh(boxG(28, 9, 20, 0.2), hm, 0, 4.5, 0));
  const roof = mesh(new THREE.CylinderGeometry(10, 10, 28, 32, 1, false, 0, Math.PI), clay(0x24262e), 0, 9, 0); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.scale.set(1, 1, 0.45); hg.add(roof);
  const door = mesh(boxG(14, 7, 0.1, 0.02), glow(0xffb070, 1.3), 0, 3.5, 10.06); door.castShadow = false; hg.add(door);
  const dh = halo(0xffa060, 22, 0.25); dh.position.set(0, 3.5, 11); hg.add(dh);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: textTex([{ t: "TEST TRACK  04", size: 96, c: "#e8eef8", font: "Arial Black, sans-serif" }], { w: 1024, h: 160 }), transparent: true, toneMapped: false }));
  sign.position.set(0, 8.2, 10.1); hg.add(sign);
  // skyline silhouettes far away, a few lit windows
  for (let i = 0; i < 40; i++) { const w = 6 + r() * 10, h = 8 + r() * 40, x = -200 + i * 10 + r() * 4; const b = mesh(boxG(w, h, 8, 0.1), clay(0x0e0f16), x, h / 2, -330 - r() * 30); b.castShadow = false; g.add(b); for (let k = 0; k < 4; k++) if (r() < 0.6) { const wl = mesh(boxG(0.9, 0.6, 0.05, 0.01), glow(r() < 0.5 ? 0xffc070 : 0x9ac8ff, 1.2), x + (r() - 0.5) * w * 0.7, 2 + r() * (h - 3), -326 - r() * 3); wl.castShadow = false; g.add(wl); } }
  return g;
}
export function nightSky() {
  const tex = canvasTex(16, 256, (c) => { const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#04040c"); gr.addColorStop(0.62, "#0e1226"); gr.addColorStop(1, "#22203a"); c.fillStyle = gr; c.fillRect(0, 0, 16, 256); });
  const m = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  const g = new THREE.Group(); g.add(m);
  const r = rng(5), pos = []; for (let i = 0; i < 500; i++) { const a = r() * Math.PI * 2, e = 0.15 + r() * 1.2; pos.push(Math.cos(a) * Math.cos(e) * 480, Math.sin(e) * 480, Math.sin(a) * Math.cos(e) * 480); }
  const st = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 }));
  g.add(st);
  return g;
}

// ------------------------------------------------------------------ CYCLORAMA STAGE (seamless dark studio for the x-ray beats)
export function cyc() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x15141c, roughness: 0.85 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), m); fl.rotation.x = -Math.PI / 2; fl.position.z = 2; fl.receiveShadow = true; g.add(fl);
  const curve = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 40, 32, 1, true, Math.PI, Math.PI / 2), m); curve.rotation.z = Math.PI / 2; curve.position.set(0, 4, -8); curve.receiveShadow = true; g.add(curve);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), m); wall.position.set(0, 14, -12); g.add(wall);
  // soft floor pools
  for (const [x, c] of [[-2.2, 0x3a6aff], [2.2, 0xffa050]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.01, 0); g.add(p); g.userData["pool" + x] = p; }
  return g;
}

// ------------------------------------------------------------------ X-RAY PERSON: translucent shell + clay organs + a blood column
const XRAY = (c) => c.root.traverse((m) => { if (m.isMesh) { m.material = new THREE.MeshStandardMaterial({ color: 0x7fd8ff, emissive: 0x1a6a90, emissiveIntensity: 0.5, roughness: 0.3, transparent: true, opacity: 0.16, depthWrite: false }); m.castShadow = false; } });
export function xrayPerson(o = {}) {
  const c = makeChar({ seed: o.seed || 71, outfit: o.outfit || "hoodie", hair: o.hair || "short", h: o.h ?? 1 });
  XRAY(c);
  const bone = clay(0xf2ecdc, { rough: 0.4 }), pink = clay(0xf08a9a, { rough: 0.35 }), red = clay(0xd02838, { rough: 0.3 });
  const skull = ball(new THREE.MeshStandardMaterial({ color: 0xf2ecdc, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.4 }), 0, 0.2, 0, 0.2, 0.21, 0.19); c.head.add(skull);
  const brainM = new THREE.MeshStandardMaterial({ color: 0xf2a0b8, emissive: 0xff6080, emissiveIntensity: 0.2, roughness: 0.4 });
  const brain = ball(brainM, 0, 0.25, -0.01, 0.15, 0.12, 0.16); c.head.add(brain);
  for (let i = 0; i < 4; i++) c.neck.add(mesh(boxG(0.07, 0.03, 0.06, 0.012), bone, 0, 0.02 + i * 0.035, -0.02));
  for (let i = 0; i < 9; i++) c.spine.add(mesh(boxG(0.08, 0.04, 0.07, 0.015), bone, 0, 0.04 + i * 0.055, -0.08));
  for (let i = 0; i < 5; i++) { const rib = mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24, Math.PI * 1.4), bone, 0, 0.26 + i * 0.045, 0); rib.rotation.x = Math.PI / 2; rib.rotation.z = Math.PI * 0.8; rib.scale.set(1, 0.75, 1); c.spine.add(rib); }
  const lungs = [-1, 1].map((s) => { const l = ball(pink, s * 0.08, 0.36, 0.01, 0.07, 0.11, 0.06); c.spine.add(l); return l; });
  const heart = ball(red, 0.03, 0.33, 0.05, 0.05, 0.055, 0.045); c.spine.add(heart);
  const stomachG = new THREE.Group(); stomachG.position.set(0.04, 0.17, 0.05); c.spine.add(stomachG);
  const stomach = ball(clay(0xf2a0a0, { rough: 0.3 }), 0, 0, 0, 0.085, 0.065, 0.07); stomachG.add(stomach);
  // the blood column: a chain of glowing red beads head → feet
  const beads = [];
  const bm = (k) => new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 0.8, transparent: true, opacity: 0.9, depthWrite: false });
  const parts = [[c.head, [0, 0.24, 0.0], 3], [c.neck, [0, 0.05, 0.03], 1], [c.spine, [0.0, 0.42, 0.09], 3], [c.spine, [0.0, 0.14, 0.09], 2], [c.LL.hip, [0, -0.2, 0.05], 2], [c.LL.knee, [0, -0.2, 0.04], 2]];
  parts.forEach(([par, p, n], j) => { for (let i = 0; i < n; i++) { const b = ball(bm(), p[0] + (i - (n - 1) / 2) * 0.04, p[1] - i * 0.05, p[2], 0.032); b.castShadow = false; par.add(b); beads.push({ b, level: j / (parts.length - 1) }); } });
  c.xr = { brain, brainM, stomachG, stomach, heart, beads, skull };
  // drain(k): 0 = blood evenly spread; 1 = drained to the feet (head dark). glow(k): brain oxygen glow
  c.drain = (k) => beads.forEach(({ b, level }) => { const s = clamp(1 - k * (1 - level) * 1.4); b.scale.setScalar(0.032 * (0.25 + 0.75 * s) * (1 + k * level * 0.6)); b.material.opacity = 0.9 * (0.2 + 0.8 * s); });
  c.oxy = (k) => { brainM.emissiveIntensity = 0.15 + 0.9 * k; };
  return c;
}
export function pilotSeat() {
  const g = new THREE.Group(), m = clay(0x2a2c34), dk = clay(0x1a1a20);
  g.add(mesh(boxG(0.7, 0.12, 0.6, 0.05), m, 0, 0.5, 0)); g.add(mesh(boxG(0.7, 1.2, 0.14, 0.05), m, 0, 1.1, -0.3));
  g.add(mesh(boxG(0.8, 0.5, 0.8, 0.08), dk, 0, 0.22, 0));
  g.add(mesh(boxG(0.18, 0.5, 0.08, 0.03), clay(0xf2c230), 0, 0.58, 0.36));                // ejection handle stripe
  const can = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.3, depthWrite: false }));
  can.scale.set(0.75, 1.0, 1.4); can.position.set(0, 1.05, 0.15); g.add(can);
  g.add(mesh(boxG(1.6, 0.5, 2.6, 0.2), clay(0x5a6470), 0, -0.05, 0.3));                  // fuselage slice
  return g;
}
export function carSeat() {
  const g = new THREE.Group(), m = clay(0xece6da, { rough: 0.5 });
  g.add(mesh(boxG(0.6, 0.14, 0.6, 0.06), m, 0, 0.45, 0)); const bk = mesh(boxG(0.6, 0.95, 0.14, 0.07), m, 0, 0.92, -0.34); bk.rotation.x = -0.38; g.add(bk);
  g.add(mesh(boxG(0.32, 0.2, 0.12, 0.05), m, 0, 1.45, -0.55));
  g.add(mesh(boxG(0.7, 0.4, 0.8, 0.08), clay(0x1a1a20), 0, 0.2, 0));
  return g;
}
/** a translucent city bus outline (40 ft) with glowing edges */
export function busOutline() {
  const g = new THREE.Group(), L = 12.2, W = 2.6, H = 3.1;
  const fill = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.08, depthWrite: false }));
  fill.position.y = H / 2; g.add(fill);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, L)), new THREE.LineBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.95 }));
  edges.position.y = H / 2; g.add(edges);
  for (let i = 0; i < 6; i++) { const w = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.02, 1.0, 1.4)), edges.material); w.position.set(W / 2, 2.0, -L / 2 + 1.4 + i * 1.8); g.add(w); }
  for (const z of [-L / 2 + 2.2, L / 2 - 2.6]) { const wh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 20)), edges.material); wh.rotation.z = Math.PI / 2; wh.position.set(W / 2, 0.5, z); g.add(wh); }
  g.userData.edges = edges; g.userData.fill = fill;
  return g;
}
export function phoneProp() {
  const g = new THREE.Group();
  g.add(mesh(boxG(0.075, 0.155, 0.01, 0.012), glossy(0x1a1a20), 0, 0, 0));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.14), new THREE.MeshBasicMaterial({ color: 0x5ab0ff, toneMapped: false })); s.position.z = 0.0055; g.add(s);
  return g;
}
export function cupProp() {
  const g = new THREE.Group();
  g.add(mesh(cylG(0.045, 0.035, 0.12, 20), clay(0xe8e4dc), 0, 0.06, 0)); g.add(mesh(cylG(0.048, 0.048, 0.015, 20), clay(0x2a2a30), 0, 0.125, 0));
  return g;
}
