// RIN — high-detail form. A jointed skeleton (hips → spine → chest → neck →
// head, shoulders → elbows → wrists → fingers, hips → knees → ankles) with
// separately modelled clothing layers and a face that blinks, looks and
// emotes. Legs are solved with two-bone IK so feet plant on the ground.
import * as THREE from 'three';

const M = (color, rough = 0.7, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);

export function buildRin3D(fabricTex) {
  const root = new THREE.Group(), B = {};
  const jacket = M('#27b8ae', 0.82, 0, { bumpMap: fabricTex, bumpScale: 0.6 }), jacketD = M('#178a86', 0.85, 0, { bumpMap: fabricTex, bumpScale: 0.6 }), pants = M('#34406e', 0.9, 0, { bumpMap: fabricTex, bumpScale: 0.8 }), skin = M('#f2c09a', 0.6), hair = M('#f1f2f6', 0.55), boot = M('#e9e6df', 0.5), sole = M('#2a2d3a', 0.9), orange = M('#ff9a3c', 0.8, 0, { bumpMap: fabricTex, bumpScale: 1 }), leather = M('#4a3528', 0.6), steel = M('#c9d1e6', 0.3, 0.9), dark = M('#1a1f3a', 0.6);
  B.hips = J(root, 0, 0.98, 0);
  B.hips.add(mesh(cap(0.155, 0.12), pants, 0, 0, 0)); const belt = mesh(new THREE.TorusGeometry(0.165, 0.028, 8, 20), leather, 0, 0.08, 0); belt.rotation.x = Math.PI / 2; B.hips.add(belt); B.hips.add(mesh(new THREE.BoxGeometry(0.07, 0.06, 0.03), steel, 0, 0.08, 0.17));
  for (const s of [-1, 1]) { B.hips.add(mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), leather, s * 0.17, -0.02, 0.02)); B.hips.add(mesh(new THREE.BoxGeometry(0.095, 0.03, 0.055), dark, s * 0.17, 0.04, 0.02)); } // belt pouches
  B.spine = J(B.hips, 0, 0.12, 0); B.spine.add(mesh(cap(0.15, 0.14), jacketD, 0, 0.1, 0));
  B.chest = J(B.spine, 0, 0.2, 0); const torso = mesh(cap(0.175, 0.16), jacket, 0, 0.12, 0); torso.scale.set(1.08, 1, 0.82); B.chest.add(torso);
  B.chest.add(mesh(new THREE.BoxGeometry(0.014, 0.36, 0.02), steel, 0, 0.1, 0.148));                                   // zipper
  for (const s of [-1, 1]) { B.chest.add(mesh(new THREE.BoxGeometry(0.1, 0.09, 0.02), jacketD, s * 0.09, 0.02, 0.14)); const st = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.012), leather, s * 0.1, 0.12, 0.15); st.rotation.z = -s * 0.22; B.chest.add(st); B.chest.add(mesh(new THREE.BoxGeometry(0.045, 0.03, 0.02), steel, s * 0.075, 0.22, 0.158)); } // pockets, straps, buckles
  const pack = mesh(new THREE.BoxGeometry(0.24, 0.3, 0.1), leather, 0, 0.12, -0.17); B.chest.add(pack); B.chest.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.11), dark, 0, 0.2, -0.17)); // tool pack
  // scarf: wrap + trailing chain
  const wrap = mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 18), orange, 0, 0.32, 0); wrap.rotation.x = Math.PI / 2; wrap.scale.set(1.1, 1, 1); B.chest.add(wrap);
  B.scarf = []; let sp = J(B.chest, -0.06, 0.32, -0.13); for (let i = 0; i < 5; i++) { sp.add(mesh(new THREE.BoxGeometry(0.11 - i * 0.012, 0.03, 0.17), orange, 0, 0, -0.085)); B.scarf.push(sp); sp = J(sp, 0, 0, -0.16); }
  B.neck = J(B.chest, 0, 0.36, 0); B.neck.add(mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.1, 10), skin, 0, 0.03, 0));
  // ---- head
  B.head = J(B.neck, 0, 0.1, 0); const skull = mesh(new THREE.SphereGeometry(0.125, 20, 16), skin, 0, 0.1, 0); skull.scale.set(0.92, 1.05, 1); B.head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(0.095, 16, 12), skin, 0, 0.035, 0.022); jaw.scale.set(0.9, 0.75, 0.95); B.head.add(jaw);
  const nose = mesh(new THREE.ConeGeometry(0.02, 0.05, 8), skin, 0, 0.085, 0.128); nose.rotation.x = Math.PI / 2 + 0.5; B.head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.03, 8, 8), skin, s * 0.115, 0.09, -0.01); ear.scale.set(0.45, 1, 0.75); B.head.add(ear);
    const eye = J(B.head, s * 0.045, 0.115, 0.098); eye.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), M('#f6f6f2', 0.25))); const iris = mesh(new THREE.SphereGeometry(0.0125, 10, 8), M('#2a6f8a', 0.2), 0, 0, 0.013); eye.add(iris); eye.add(mesh(new THREE.SphereGeometry(0.006, 8, 6), dark, 0, 0, 0.021)); (B.eyes ||= []).push(eye);
    const lid = J(B.head, s * 0.045, 0.115, 0.098); const lm = mesh(new THREE.SphereGeometry(0.0245, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.add(lm); lid.rotation.x = -0.9; (B.lids ||= []).push(lid);
    const brow = mesh(new THREE.BoxGeometry(0.042, 0.009, 0.012), hair, s * 0.047, 0.152, 0.112); (B.brows ||= []).push(brow); B.head.add(brow);
  }
  B.mouth = mesh(new THREE.BoxGeometry(0.042, 0.008, 0.01), M('#b0655a', 0.5), 0, 0.045, 0.108); B.head.add(B.mouth);
  // hair: layered tufts
  const cap2 = mesh(new THREE.SphereGeometry(0.133, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.115, -0.012); B.head.add(cap2);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, up = i % 3 === 0, t = mesh(new THREE.ConeGeometry(0.035, up ? 0.14 : 0.1, 6), hair, Math.sin(a) * 0.1, 0.17 + (up ? 0.05 : 0), Math.cos(a) * 0.1 - 0.02); t.rotation.set(Math.cos(a) * 0.9 - 0.3, 0, -Math.sin(a) * 0.9); if (Math.cos(a) > 0.6) { t.position.y -= 0.03; t.rotation.x += 0.9; } B.head.add(t); }
  const gb = mesh(new THREE.TorusGeometry(0.125, 0.014, 6, 22), orange, 0, 0.165, 0); gb.rotation.x = Math.PI / 2 - 0.15; B.head.add(gb);
  for (const s of [-1, 1]) { const gl = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.022, 14), steel, s * 0.045, 0.178, 0.112); gl.rotation.x = Math.PI / 2 - 0.25; B.head.add(gl); const lens = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.024, 14), M('#ffd166', 0.1, 0.2, { emissive: '#7a4a05' }), s * 0.045, 0.178, 0.114); lens.rotation.x = Math.PI / 2 - 0.25; B.head.add(lens); }
  // ---- arms with hands and fingers
  B.arm = []; for (const s of [-1, 1]) {
    const sh = J(B.chest, s * 0.2, 0.25, 0); sh.add(mesh(new THREE.SphereGeometry(0.075, 12, 10), jacket)); sh.add(mesh(cap(0.058, 0.2), jacket, 0, -0.15, 0));
    const el = J(sh, 0, -0.29, 0); el.add(mesh(new THREE.SphereGeometry(0.052, 10, 8), jacketD)); el.add(mesh(cap(0.048, 0.18), jacket, 0, -0.13, 0)); el.add(mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.04, 12), jacketD, 0, -0.23, 0)); // cuff
    const wr = J(el, 0, -0.27, 0); wr.add(mesh(new THREE.BoxGeometry(0.07, 0.08, 0.03), dark, 0, -0.035, 0)); const fingers = [];
    for (let f = 0; f < 4; f++) { const k = J(wr, (f - 1.5) * 0.017, -0.075, 0); k.add(mesh(cap(0.008, 0.022), skin, 0, -0.018, 0)); const k2 = J(k, 0, -0.038, 0); k2.add(mesh(cap(0.0075, 0.018), skin, 0, -0.014, 0)); fingers.push(k, k2); }
    const th = J(wr, s * 0.036, -0.03, 0.01); th.rotation.z = s * 0.7; th.add(mesh(cap(0.009, 0.024), skin, 0, -0.018, 0)); fingers.push(th);
    B.arm.push({ sh, el, wr, fingers });
  }
  // ---- legs (IK driven)
  B.leg = []; for (const s of [-1, 1]) {
    const hip = J(B.hips, s * 0.09, -0.04, 0); hip.add(mesh(cap(0.078, 0.3), pants, 0, -0.21, 0)); hip.add(mesh(new THREE.BoxGeometry(0.09, 0.11, 0.03), M('#2a3358', 0.9), s * 0.06, -0.2, 0.04)); // cargo pocket
    const knee = J(hip, 0, -0.44, 0); knee.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), pants)); knee.add(mesh(cap(0.06, 0.26), pants, 0, -0.19, 0)); knee.add(mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), dark, 0, 0, 0.05)); // knee pad
    const ankle = J(knee, 0, -0.44, 0); ankle.add(mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.16, 12), boot, 0, 0.04, 0)); const shoe = mesh(new THREE.BoxGeometry(0.11, 0.08, 0.26), boot, 0, -0.045, 0.05); ankle.add(shoe); ankle.add(mesh(new THREE.BoxGeometry(0.118, 0.03, 0.27), sole, 0, -0.085, 0.05)); ankle.add(mesh(new THREE.BoxGeometry(0.115, 0.02, 0.03), orange, 0, 0.0, 0.1)); // lace band
    B.leg.push({ hip, knee, ankle });
  }
  // ---- second pass of modelled detail: hood, collar, pads, cuffs, holster, boot caps, lashes, side locks
  const hood = mesh(new THREE.SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), jacketD, 0, 0.3, -0.12); hood.rotation.x = -1.9; hood.scale.set(1, 0.8, 1.15); B.chest.add(hood);
  const collar = mesh(new THREE.TorusGeometry(0.115, 0.035, 8, 18, Math.PI * 1.5), jacketD, 0, 0.36, 0.01); collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.75); B.chest.add(collar);
  B.chest.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 10), leather, 0, 0.3, -0.21)).rotation.z = Math.PI / 2; B.chest.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), steel, 0.1, 0.4, -0.2)); B.chest.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), M('#111', 0.4, 0, { emissive: '#ff5a3c', emissiveIntensity: 3 }), 0.1, 0.52, -0.2));
  B.arm.forEach((A, i) => { const s = i ? 1 : -1; const pad = mesh(new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark, s * 0.01, 0.02, 0); pad.scale.set(1.05, 0.7, 1.15); A.sh.add(pad); A.el.add(mesh(new THREE.BoxGeometry(0.075, 0.07, 0.03), leather, 0, -0.02, -0.045)); A.el.add(mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.03, 12), orange, 0, -0.2, 0)); if (!i) { A.el.add(mesh(new THREE.BoxGeometry(0.07, 0.09, 0.025), dark, 0, -0.14, 0.05)); A.el.add(mesh(new THREE.BoxGeometry(0.05, 0.06, 0.006), M('#111', 0.3, 0, { emissive: '#2fd3c6', emissiveIntensity: 2.5 }), 0, -0.14, 0.064)); } A.wr.add(mesh(new THREE.BoxGeometry(0.074, 0.03, 0.034), orange, 0, -0.012, 0)); });
  B.leg.forEach((L, i) => { const s = i ? 1 : -1; const strap = mesh(new THREE.TorusGeometry(0.082, 0.012, 6, 16), leather, 0, -0.14, 0); strap.rotation.x = Math.PI / 2; L.hip.add(strap); if (i) { L.hip.add(mesh(new THREE.BoxGeometry(0.05, 0.16, 0.09), leather, s * 0.09, -0.2, 0)); L.hip.add(mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), steel, s * 0.1, -0.1, 0.01)); } L.knee.add(mesh(new THREE.TorusGeometry(0.066, 0.01, 6, 14), dark, 0, -0.3, 0)).rotation.x = Math.PI / 2; L.ankle.add(mesh(new THREE.BoxGeometry(0.115, 0.06, 0.08), sole, 0, -0.03, 0.16)); L.ankle.add(mesh(new THREE.BoxGeometry(0.115, 0.07, 0.05), sole, 0, -0.05, -0.07)); L.ankle.add(mesh(new THREE.TorusGeometry(0.074, 0.011, 6, 14), leather, 0, 0.09, 0)).rotation.x = Math.PI / 2; });
  for (const s of [-1, 1]) { const lash = mesh(new THREE.BoxGeometry(0.046, 0.006, 0.008), dark, s * 0.045, 0.134, 0.117); lash.rotation.z = -s * 0.12; B.head.add(lash); const lock = mesh(new THREE.ConeGeometry(0.028, 0.13, 6), hair, s * 0.108, 0.1, 0.04); lock.rotation.set(Math.PI, 0, s * 0.18); B.head.add(lock); B.head.add(mesh(new THREE.SphereGeometry(0.012, 6, 6), M('#e8a892', 0.7), s * 0.062, 0.07, 0.108)); }
  for (let i = 0; i < 5; i++) { const t2 = mesh(new THREE.ConeGeometry(0.04, 0.16, 6), hair, (i - 2) * 0.04, 0.11 - Math.abs(i - 2) * 0.015, -0.13); t2.rotation.x = -2.2 + Math.abs(i - 2) * 0.1; t2.rotation.z = (i - 2) * -0.2; B.head.add(t2); }
  B.lipU = mesh(new THREE.BoxGeometry(0.036, 0.005, 0.008), M('#c97a6c', 0.5), 0, 0.05, 0.11); B.head.add(B.lipU);
  root.userData.B = B; root.userData.state = { phase: 0, blink: 0, look: new THREE.Vector3() };
  return root;
}

// two-bone IK in the leg's sagittal plane: hip at origin, target (y down, z fwd)
function legIK(L, ty, tz, lean) { const a = 0.44, b = 0.44, d = Math.min(a + b - 0.001, Math.hypot(ty, tz)), base = Math.atan2(tz, -ty), k = Math.acos((a * a + d * d - b * b) / (2 * a * d)), kn = Math.PI - Math.acos((a * a + b * b - d * d) / (2 * a * b)); L.hip.rotation.x = -(base + k); L.knee.rotation.x = kn; L.ankle.rotation.x = base + k - kn + lean; }

// p: { speed (m/s), ground, vy, slide, climb (0..1), grapple, strike (0..1), hurt, t, dt, lookAt:Vector3|null, talk }
export function animateRin(root, p) {
  const B = root.userData.B, st = root.userData.state, dt = p.dt, run = Math.min(1, p.speed / 7.5), spr = Math.max(0, (p.speed - 5) / 4);
  st.phase += dt * (3.5 + p.speed * 1.25); const ph = st.phase, air = !p.ground && !p.climb;
  const stride = 0.12 + run * 0.34, lift = 0.05 + run * 0.16, bob = Math.abs(Math.sin(ph)) * 0.035 * run;
  let hipY = 0.98 - 0.05 * run + bob, lean = 0.06 + run * 0.2 + spr * 0.1;
  B.hips.rotation.set(0, Math.sin(ph) * 0.12 * run, Math.sin(ph) * 0.035 * run); B.spine.rotation.set(lean * 0.5, -Math.sin(ph) * 0.1 * run, 0); B.chest.rotation.set(lean * 0.5, -Math.sin(ph) * 0.14 * run, 0);
  B.leg.forEach((L, i) => { const a = ph + (i ? Math.PI : 0); let fz = Math.sin(a) * stride * (p.speed > 0.3 ? 1 : 0), fy = -(hipY - 0.1) + Math.max(0, Math.cos(a)) * lift * (p.speed > 0.3 ? 1 : 0); if (air) { fz = i ? -0.18 : 0.22; fy = -0.62 - (i ? 0.1 : 0) + Math.min(0.15, Math.max(-0.1, p.vy * 0.012)); } if (p.slide) { fz = 0.55 - i * 0.12; fy = -0.38 - i * 0.1; } if (p.climb) { fz = 0.2; fy = -0.5 + (i ? p.climb * 0.3 : -p.climb * 0.2); } legIK(L, fy, fz, air ? 0.5 : -lean * 0.3); });
  B.arm.forEach((A, i) => { const a = ph + (i ? 0 : Math.PI), sw = Math.sin(a) * (0.35 + run * 0.75); let sx = sw * (p.speed > 0.3 ? 1 : 0.08), ex = -0.25 - run * 1.1, sz = (i ? -1 : 1) * 0.1; if (air) { sx = -0.6 + (i ? 0.5 : 0); sz = (i ? -1 : 1) * 0.7; ex = -0.5; } if (p.slide) { sx = i ? 0.9 : -0.5; ex = -0.6; } if (p.climb) { sx = -2.6 + p.climb * 1.6; ex = -1.2 * (1 - p.climb); sz = 0; } if (p.grapple && i === 1) { sx = -2.9; ex = -0.1; sz = -0.2; } if (p.strike > 0 && i === 1) { sx = -1.6 * Math.sin(p.strike * Math.PI); ex = -0.3; }
    A.sh.rotation.set(sx, 0, sz); A.el.rotation.x = ex; A.wr.rotation.x = -0.1; const curl = p.grapple && i === 1 ? 1.3 : run * 0.9 + 0.25; A.fingers.forEach((f, k) => { if (k < 8) f.rotation.x = k % 2 ? -curl : -curl * 0.6; }); });
  if (p.slide) { hipY = 0.42; B.hips.rotation.x = -0.9; B.spine.rotation.x = 0.5; } if (p.climb) hipY = 0.98; if (air) B.hips.rotation.x = -0.15 + Math.max(-0.3, Math.min(0.3, p.vy * 0.02));
  B.hips.position.y = hipY;
  // head: counter the body sway, then look at the point of interest; eyes lead
  const hx = -lean * 0.8 + (p.hurt > 0 ? 0.4 : 0); let yaw = Math.sin(ph) * 0.1 * run, pitch = hx;
  if (p.lookAt) { const l = root.worldToLocal(p.lookAt.clone()); yaw += Math.max(-0.9, Math.min(0.9, Math.atan2(l.x, l.z))); pitch -= Math.max(-0.4, Math.min(0.5, Math.atan2(l.y - 1.6, Math.hypot(l.x, l.z)))); }
  B.neck.rotation.set(pitch * 0.4, yaw * 0.4, 0); B.head.rotation.set(pitch * 0.6, yaw * 0.6, Math.sin(p.t * 0.7) * 0.03);
  B.eyes.forEach((e) => e.rotation.set(0, Math.max(-0.4, Math.min(0.4, yaw * 0.5)), 0));
  st.blink -= dt; if (st.blink < -0.12) st.blink = 1.5 + Math.random() * 3; const closed = st.blink < 0 || p.hurt > 0; B.lids.forEach((l) => (l.rotation.x = closed ? 0.1 : -0.9 - spr * 0.2));
  const effort = spr > 0.3 || p.climb || p.grapple || p.strike > 0; B.brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * (effort ? -0.35 : p.hurt > 0 ? 0.4 : 0.05); b.position.y = 0.152 + (p.talk ? Math.sin(p.t * 9) * 0.004 : 0); });
  B.mouth.scale.set(effort ? 0.8 : 1, p.talk ? 1 + Math.abs(Math.sin(p.t * 14)) * 3 : effort ? 2.2 : 1, 1);
  // layered secondary motion: landing compression, idle breathing and weight shift, lean into turns
  if (st.wasAir && p.ground) st.land = 1; st.wasAir = air; st.land = Math.max(0, (st.land || 0) - dt * 3.5); hipY -= st.land * st.land * 0.2; B.spine.rotation.x += st.land * 0.35; B.leg.forEach((L) => { L.knee.rotation.x += st.land * 0.25; });
  const idle = p.ground && p.speed < 0.4 && !p.slide && !p.climb; if (idle) { const br = Math.sin(p.t * 1.7); B.chest.rotation.x += br * 0.018; B.chest.position.y = 0.2 + br * 0.004; B.hips.rotation.z = Math.sin(p.t * 0.45) * 0.045; B.hips.rotation.y = Math.sin(p.t * 0.3) * 0.06; B.spine.rotation.z = -Math.sin(p.t * 0.45) * 0.03; B.arm.forEach((A, i) => { A.sh.rotation.x += Math.sin(p.t * 1.1 + i * 2) * 0.03; A.sh.rotation.z += (i ? -1 : 1) * 0.03; A.el.rotation.x = -0.18 + br * 0.02; }); if (!p.lookAt) { B.head.rotation.y += Math.sin(p.t * 0.37) * 0.35 * Math.max(0, Math.sin(p.t * 0.11)); B.eyes.forEach((e) => (e.rotation.y = Math.sin(p.t * 0.37) * 0.3)); } }
  { const yw = root.rotation.y; let dy = yw - (st.py ?? yw); dy = Math.atan2(Math.sin(dy), Math.cos(dy)); st.py = yw; st.lean = (st.lean || 0) + (Math.max(-0.3, Math.min(0.3, (dy / Math.max(dt, 0.001)) * 0.05)) * run - (st.lean || 0)) * Math.min(1, dt * 6); B.hips.rotation.z -= st.lean; B.spine.rotation.z -= st.lean * 0.5; B.head.rotation.z += st.lean * 0.6; }
  if (B.lipU) B.lipU.position.y = 0.05 + (p.talk ? Math.abs(Math.sin(p.t * 14)) * 0.004 : 0);
  const a = 1 - Math.exp(-16 * dt), JN = (st.J ||= [B.hips, B.spine, B.chest, B.neck, B.head, ...B.arm.flatMap((A) => [A.sh, A.el, A.wr]), ...B.leg.flatMap((L) => [L.hip, L.knee, L.ankle])]);
  for (const j of JN) { if (!j.userData.q) j.userData.q = j.quaternion.clone(); else { const tq = j.quaternion.clone(); j.quaternion.copy(j.userData.q).slerp(tq, a); j.userData.q.copy(j.quaternion); } }
  st.hy = st.hy == null ? hipY : st.hy + (hipY - st.hy) * a; B.hips.position.y = st.hy;
  B.scarf.forEach((s, i) => { s.rotation.x = -0.25 - run * 0.5 + Math.sin(p.t * 7 - i * 0.9) * (0.1 + run * 0.12) + (air ? p.vy * 0.03 : 0); s.rotation.y = Math.sin(p.t * 5 - i) * 0.12; });
}
