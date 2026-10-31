// @ts-nocheck
// ROADSTER GHOST · clay props: the new Roadster (glossy red, light bars, cold-gas thrusters), a see-through ghost,
// the cemetery (gate, iron fence, tombstones, crypt), a night road and the curved flip ramp.
import { THREE, rng, canvasTex } from "./base.js";
import { clay, glossy, glow, mesh, ball, limb, boxG, cylG, sphG, textTex, makeChar, SKIN } from "./clay.js";
import { halo, pumpkin, tree } from "./sets.js";

const U = [];
export const tick2 = (T) => U.forEach((f) => f(T));

// ------------------------------------------------------------------ THE ROADSTER (faithful to the 2026 reveal car)
// A low faceted wedge: satin silver-white body with hard creases, flat hood between raised fenders, one huge dark-tinted
// glass canopy running into a fastback, black lower band + sills + splitter, a single thin light bar across the nose,
// thin red tail bar, ducktail lip, black angular 5-spoke wheels. Faces +z, wheels on y=0, ~4.4 m long.
/** loft: sections [{z, pts:[[x,y],...]}] (half profile, x>=0, ordered bottom-centre → top-centre); mirrored, flat-shaded */
function loft(sections, m, cap = true) {
  const pos = [];
  const full = sections.map(({ z, pts }) => { const L = pts.map(([x, y]) => [x, y, z]); const R = pts.slice().reverse().map(([x, y]) => [-x, y, z]); return L.concat(R.slice(1, -1)); });
  const n = full[0].length;
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < full.length - 1; i++) for (let j = 0; j < n; j++) { const a = full[i][j], b = full[i][(j + 1) % n], c = full[i + 1][(j + 1) % n], d = full[i + 1][j]; tri(a, d, c); tri(a, c, b); }
  if (cap) for (const [k, flipF] of [[0, true], [full.length - 1, false]]) { const f = full[k]; const cz = f.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n, s[2] + p[2] / n], [0, 0, 0]); for (let j = 0; j < n; j++) flipF ? tri(cz, f[(j + 1) % n], f[j]) : tri(cz, f[j], f[(j + 1) % n]); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o;
}
export function roadster(color = 0xdadad6) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.15, flatShading: true, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.45, metalness: 0.1, flatShading: true, side: THREE.DoubleSide });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.06, metalness: 0.5, transparent: true, opacity: 0.88, flatShading: true });
  // body shell: [x,y] half profile per station: bottom, lower crease, shoulder crease, fender top, hood/deck centre
  const S = (z, w, yb, ys, yf, yc, wf = 0.9) => ({ z, pts: [[0, yb], [w * 0.93, yb], [w, ys], [w * wf, yf], [w * 0.62, yc + 0.02], [0, yc]] });
  body.add(loft([
    S(2.2, 0.62, 0.3, 0.42, 0.47, 0.47, 0.9), S(2.05, 0.9, 0.28, 0.46, 0.6, 0.55), S(1.6, 0.99, 0.28, 0.55, 0.78, 0.66), S(1.0, 1.0, 0.28, 0.6, 0.84, 0.72),
    S(0.6, 1.0, 0.28, 0.62, 0.85, 0.8), S(-0.4, 0.98, 0.28, 0.63, 0.86, 0.84), S(-1.3, 1.04, 0.28, 0.66, 0.9, 0.88), S(-1.95, 1.0, 0.3, 0.7, 0.96, 0.95), S(-2.2, 0.9, 0.36, 0.72, 0.98, 0.98),
  ], paint));
  // black lower band (front fascia, sills, rear diffuser) + splitter
  const B = (z, w, y0, y1) => ({ z, pts: [[0, y0], [w, y0], [w + 0.02, y1], [0, y1 + 0.001]] });
  body.add(loft([B(2.22, 0.6, 0.14, 0.31), B(2.0, 0.9, 0.12, 0.3), B(1.0, 1.0, 0.12, 0.3), B(-1.3, 1.03, 0.12, 0.3), B(-2.2, 0.88, 0.16, 0.38)], black));
  body.add(loft([{ z: 2.3, pts: [[0, 0.1], [0.62, 0.1], [0.62, 0.14], [0, 0.14]] }, { z: 1.9, pts: [[0, 0.1], [0.92, 0.1], [0.92, 0.14], [0, 0.14]] }], black));
  // the greenhouse: one dark tinted canopy (windshield + roof + fastback), wraps to the side glass
  const Gs = (z, wb, yb, wt, yt) => ({ z, pts: [[wb, yb], [wt, yt], [0, yt + 0.015]] });
  const glass = loft([Gs(0.95, 0.66, 0.73, 0.5, 0.735), Gs(0.55, 0.86, 0.82, 0.6, 1.05), Gs(0.0, 0.9, 0.85, 0.63, 1.2), Gs(-0.6, 0.9, 0.86, 0.62, 1.2), Gs(-1.2, 0.92, 0.89, 0.6, 1.1), Gs(-1.85, 0.9, 0.95, 0.5, 0.99)], glassM);
  body.add(glass);
  // silver roof rails (the satin strips framing the canopy) + B-pillar
  const rail = paint;
  for (const s of [-1, 1]) { body.add(limb(rail, [s * 0.6, 1.05, 0.55], [s * 0.63, 1.2, 0.0], 0.018)); body.add(limb(rail, [s * 0.63, 1.2, 0.0], [s * 0.62, 1.2, -0.6], 0.018)); body.add(limb(rail, [s * 0.62, 1.2, -0.6], [s * 0.5, 0.99, -1.85], 0.018)); body.add(limb(rail, [s * 0.9, 0.86, -0.75], [s * 0.62, 1.19, -0.75], 0.02)); }
  // ducktail lip
  body.add(loft([{ z: -1.9, pts: [[0, 0.96], [0.98, 0.96], [0.98, 1.0], [0, 1.0]] }, { z: -2.28, pts: [[0, 1.02], [0.88, 1.02], [0.88, 1.05], [0, 1.05]] }], paint));
  // lights: ONE thin bar across the nose crease; thin red tail bar
  const head = glow(0xf2f6ff, 2.6), tail = glow(0xff2030, 2.4);
  body.add(limb(head, [-0.6, 0.445, 2.205], [0.6, 0.445, 2.205], 0.012));
  for (const s of [-1, 1]) body.add(limb(head, [s * 0.6, 0.445, 2.205], [s * 0.86, 0.5, 2.06], 0.012));
  const hh = [-1, 1].map((s) => { const h = halo(0xd8e8ff, 1.1, 0.4); h.position.set(s * 0.45, 0.45, 2.3); body.add(h); return h; });
  body.add(limb(tail, [-0.86, 0.73, -2.21], [0.86, 0.73, -2.21], 0.014));
  const th = halo(0xff2030, 1.4, 0.35); th.position.set(0, 0.73, -2.3); body.add(th);
  // amber side marker + door handle notch (detail from the reveal photos)
  for (const s of [-1, 1]) { body.add(ball(glow(0xffa030, 1.6), s * 1.0, 0.62, 0.72, 0.012, 0.03, 0.06)); body.add(mesh(boxG(0.01, 0.03, 0.18, 0.005), black, s * 1.0, 0.6, 0.35)); }
  // wheels: black angular 5-spoke
  const wheels = [];
  const tyreM = clay(0x0e0e10, { rough: 0.85 }), rimM = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.3, metalness: 0.6, flatShading: true }), hubM = new THREE.MeshStandardMaterial({ color: 0x5a5c62, roughness: 0.3, metalness: 0.7 });
  for (const [x, z] of [[-0.9, 1.36], [0.9, 1.36], [-0.92, -1.38], [0.92, -1.38]]) {
    const w = new THREE.Group(); w.position.set(x, 0.38, z); g.add(w);
    const sp = new THREE.Group(); w.add(sp);
    const tyre = mesh(cylG(0.38, 0.38, 0.3, 32), tyreM); tyre.rotation.z = Math.PI / 2; sp.add(tyre);
    const disc = mesh(cylG(0.28, 0.28, 0.305, 30), hubM); disc.rotation.z = Math.PI / 2; sp.add(disc);
    for (let k = 0; k < 5; k++) { const arm = new THREE.Group(); arm.rotation.x = (k / 5) * Math.PI * 2; const bl = mesh(boxG(0.32, 0.27, 0.07, 0.01), rimM, 0, 0.14, 0); bl.rotation.x = 0.35; arm.add(bl); sp.add(arm); }
    sp.add(mesh(cylG(0.05, 0.05, 0.33, 12), rimM)); sp.children[sp.children.length - 1].rotation.z = Math.PI / 2;
    w.userData.spin = sp; wheels.push(w);
  }
  // wheel arches: black inner liners so the wheels sit in shadow
  for (const [x, z] of [[-0.9, 1.36], [0.9, 1.36], [-0.92, -1.38], [0.92, -1.38]]) { const a = mesh(cylG(0.44, 0.44, 0.24, 24, 1), black, x * 0.97, 0.38, z); a.rotation.z = Math.PI / 2; body.add(a); }
  // cold-gas thrusters: small hidden nozzles; plumes only when firing
  const plumes = [];
  for (const [x, y, z, dir] of [[-0.45, 0.32, -2.2, -1], [0.45, 0.32, -2.2, -1], [-0.6, 0.12, 1.6, 0], [0.6, 0.12, 1.6, 0], [-0.6, 0.12, -1.0, 0], [0.6, 0.12, -1.0, 0]]) {
    const pl = new THREE.Group(); pl.position.set(x, y, z); body.add(pl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.geometry.translate(0, -0.8, 0); cone.rotation.x = dir ? -Math.PI / 2 : 0; pl.add(cone);
    const hl = halo(0xcfe8ff, 1.1, 0.8); pl.add(hl);
    pl.visible = false; plumes.push({ pl, cone, hl });
  }
  // interior: seats (2+2), yoke-style wheel, centre screen (passenger count)
  const seatM = clay(0x2a2a30);
  for (const [x, z] of [[-0.34, -0.3], [0.34, -0.3], [-0.32, -1.05], [0.32, -1.05]]) { body.add(mesh(boxG(0.42, 0.12, 0.45, 0.06), seatM, x, 0.32, z)); body.add(mesh(boxG(0.42, 0.5, 0.12, 0.06), seatM, x, 0.6, z - 0.25)); }
  const sw = new THREE.Group(); sw.position.set(-0.34, 0.74, 0.32); sw.rotation.x = -1.1; body.add(sw);
  const trim = clay(0x1a1a1e, { rough: 0.4 });
  sw.add(mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 30, Math.PI * 1.2), trim)); sw.children[0].rotation.z = -Math.PI * 0.1;
  sw.add(limb(trim, [-0.15, 0, 0], [0.15, 0, 0], 0.02));
  const scrTex = canvasTex(512, 320, () => {});
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  scr.position.set(0.02, 0.8, 0.42); scr.rotation.x = -0.6; body.add(scr);
  const drawScreen = (speed, pax, warn) => {
    const c = scrTex.userData.ctx; c.fillStyle = "#0a0e16"; c.fillRect(0, 0, 512, 320);
    c.fillStyle = "#fff"; c.textAlign = "center"; c.font = "900 120px Arial"; c.fillText(String(Math.round(speed)), 256, 150);
    c.font = "700 34px Arial"; c.fillStyle = "#8a9ab0"; c.fillText("MPH", 256, 196);
    c.fillStyle = warn ? "#ff3040" : "#60d0ff"; c.font = "800 40px Arial"; c.fillText(`PASSENGERS: ${pax}`, 256, 270);
    scrTex.needsUpdate = true;
  };
  drawScreen(0, 1, false);
  let last = "";
  return {
    root: g, body, wheels, plumes, glass, seatsY: 0.32,
    set({ roll = 0, thrust = 0, speed = 0, pax = 1, warn = false, tilt = 0, glassOp = 0.88 }) {
      wheels.forEach((w) => (w.userData.spin.rotation.x = roll));
      plumes.forEach(({ pl, cone, hl }, i) => { pl.visible = thrust > 0.01; cone.scale.set(1, 0.6 + thrust * (0.8 + 0.3 * Math.sin(roll * 7 + i)), 1); cone.material.opacity = 0.55 * thrust; hl.material.opacity = 0.8 * thrust; });
      body.rotation.x = tilt;
      glassM.opacity = glassOp;
      const key = `${Math.round(speed)}|${pax}|${warn}`; if (key !== last) { drawScreen(speed, pax, warn); last = key; }
    },
  };
}

// ------------------------------------------------------------------ the ghost (a clay girl, see-through and glowing)
export function ghost() {
  const c = makeChar({ seed: 31, outfit: "dress", shirt: 0xdfeaff, skin: 0xd8e6ff, hair: "long", hairColor: 0xb8c8e8, h: 0.9, girth: 0.88, eyeR: 0.064, pants: 0xdfeaff });
  c.root.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.62; if (m.material.isMeshStandardMaterial) { m.material.emissive.set(0x6a9aff); m.material.emissiveIntensity = 0.55; } m.material.depthWrite = false; m.castShadow = false; } });
  const h = halo(0x9ac0ff, 3.2, 0.35); h.position.y = 1.0; c.root.add(h);
  c.setFade = (k) => c.root.traverse((m) => { if (m.isMesh) m.material.opacity = 0.62 * k; if (m.isSprite) m.material.opacity = 0.35 * k; });
  return c;
}

// ------------------------------------------------------------------ cemetery road
export function tombstone(seed = 1) {
  const r = rng(seed), g = new THREE.Group(), m = clay([0x7a7a88, 0x6a6a78, 0x8a8a94][Math.floor(r() * 3)]);
  const kind = Math.floor(r() * 3), h = 0.6 + r() * 0.4;
  if (kind === 0) { g.add(mesh(boxG(0.5, h, 0.14, 0.05), m, 0, h / 2, 0)); g.add(mesh(cylG(0.25, 0.25, 0.14, 24), m, 0, h, 0)); g.children[1].rotation.x = Math.PI / 2; }
  if (kind === 1) { g.add(mesh(boxG(0.12, h + 0.3, 0.12, 0.03), m, 0, (h + 0.3) / 2, 0)); g.add(mesh(boxG(0.5, 0.12, 0.12, 0.03), m, 0, h * 0.85, 0)); }
  if (kind === 2) g.add(mesh(boxG(0.55, h * 0.8, 0.18, 0.08), m, 0, h * 0.4, 0));
  g.add(ball(clay(0x3a4a2e), 0, 0, 0.3, 0.32, 0.06, 0.45));
  g.rotation.set((r() - 0.5) * 0.15, (r() - 0.5) * 0.4, (r() - 0.5) * 0.18);
  return g;
}
export function cemetery() {
  const g = new THREE.Group(), r = rng(41), iron = clay(0x15151a, { rough: 0.35 });
  g.add(mesh(boxG(40, 0.2, 30, 0.05), clay(0x24301f), 0, -0.1, -8));
  // fence along the road (z = 0 line, x from -12..12) with a gate arch at x = 0
  for (let x = -12; x <= 12; x += 0.35) { if (Math.abs(x) < 1.2) continue; g.add(limb(iron, [x, 0, -2], [x, 1.5, -2], 0.025)); g.add(mesh(new THREE.ConeGeometry(0.05, 0.14, 8), iron, x, 1.56, -2)); }
  for (const y of [0.4, 1.3]) for (const s of [-1, 1]) g.add(limb(iron, [s * 1.2, y, -2], [s * 12, y, -2], 0.02));
  for (const s of [-1, 1]) { g.add(mesh(boxG(0.4, 2.4, 0.4, 0.05), clay(0x5a5a64), s * 1.35, 1.2, -2)); g.add(ball(clay(0x5a5a64), s * 1.35, 2.5, -2, 0.22)); }
  const arch = mesh(new THREE.TorusGeometry(1.35, 0.05, 8, 30, Math.PI), iron, 0, 2.3, -2); g.add(arch);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: textTex([{ t: "HOLLOW HILL", size: 110, c: "#c8c8d0", stroke: 10, sc: "#111" }], { w: 768, h: 160 }), transparent: true }));
  sign.position.set(0, 3.05, -1.98); g.add(sign);
  for (let i = 0; i < 46; i++) { const t = tombstone(i + 1); t.position.set((r() - 0.5) * 22, 0, -3.5 - r() * 16); if (Math.abs(t.position.x) < 1.2 && t.position.z > -6) continue; g.add(t); }
  const crypt = new THREE.Group(); crypt.position.set(-5, 0, -12);
  crypt.add(mesh(boxG(3, 2.4, 2.6, 0.08), clay(0x6a6a74), 0, 1.2, 0)); const rf = mesh(new THREE.ConeGeometry(2.2, 1.0, 4), clay(0x4a4a54), 0, 2.9, 0); rf.rotation.y = Math.PI / 4; crypt.add(rf);
  crypt.add(mesh(boxG(1.0, 1.6, 0.1, 0.03), clay(0x1a1a20), 0, 0.8, 1.31)); g.add(crypt);
  [[-8, -6, 3.4, 1], [7, -9, 3.0, 2], [3.5, -15, 3.6, 3], [-10, -16, 2.8, 4], [10, -4, 2.6, 5]].forEach(([x, z, h, s]) => { const t = tree(h, s); t.position.set(x, 0, z); g.add(t); });
  // a lantern on the gate
  const ln = ball(glow(0xffc070, 2), 1.35, 2.15, -1.7, 0.08); g.add(ln); const lh = halo(0xffb060, 1.6, 0.5); lh.position.copy(ln.position); g.add(lh);
  U.push((T) => { lh.material.opacity = 0.4 + 0.15 * Math.sin(T * 9); });
  return g;
}
/** a straight night road along z with yellow dashes; length L from z=+10 to z=10-L */
export function road(L = 140) {
  const g = new THREE.Group();
  g.add(mesh(boxG(7, 0.2, L, 0.04), clay(0x26262e), 0, -0.1, 10 - L / 2));
  for (let i = 0; i < L / 4; i++) g.add(mesh(boxG(0.16, 0.02, 1.4, 0.01), clay(0xe8d070), 0, 0.005, 9 - i * 4));
  for (const s of [-1, 1]) g.add(mesh(boxG(0.12, 0.02, L, 0.01), clay(0xd8d8d0), s * 3.2, 0.005, 10 - L / 2));
  g.add(mesh(boxG(60, 0.18, L, 0.04), clay(0x1e2a1a), 0, -0.13, 10 - L / 2));
  return g;
}
/** the flip ramp: a curved quarter-pipe that bends up and over (like the reveal's curved ramp) — rises along -z */
export function flipRamp() {
  const g = new THREE.Group(), m = clay(0x8a8a94, { rough: 0.45 }), stripe = clay(0xf2c230);
  const R = 4.5, n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 1.15, y = R - Math.cos(a) * R, z = -Math.sin(a) * R;
    const seg = mesh(boxG(3.4, 0.18, (Math.PI * 1.15 * R) / n + 0.05, 0.03), i % 4 === 0 ? stripe : m, 0, y, z);
    seg.rotation.x = a; g.add(seg);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; g.add(limb(clay(0x3a3a44), [s * 1.6, 0, -Math.sin(a) * R], [s * 1.6, R - Math.cos(a) * R, -Math.sin(a) * R], 0.06)); }
  g.userData.R = R;
  return g;
}
/** position on the ramp arc: u in 0..1 → {y, z, ang} */
export const rampAt = (u, R = 4.5) => { const a = u * Math.PI * 1.15; return { y: R - Math.cos(a) * (R - 0.0), z: -Math.sin(a) * R, ang: a }; };
