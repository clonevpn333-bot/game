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
export function roadster(color = 0xdcdcd8) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2, flatShading: true, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: 0x131316, roughness: 0.45, metalness: 0.1, flatShading: true, side: THREE.DoubleSide });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x1e1612, roughness: 0.05, metalness: 0.55, transparent: true, opacity: 0.9, flatShading: true, depthWrite: false });
  const inner = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
  const cream = clay(0xece6da, { rough: 0.5 });
  // ---- outer shell: nose/hood (ends in the firewall), cabin tub (open top), rear deck
  const S = (z, ws, w, ysh, wf, yf, yc) => ({ z, pts: [[0, 0.3], [ws, 0.3], [w, ysh], [wf, yf], [wf * 0.62, yc + (yf - yc) * 0.25], [0, yc]] });
  body.add(loft([S(2.24, 0.52, 0.58, 0.44, 0.5, 0.465, 0.455), S(2.06, 0.84, 0.9, 0.5, 0.82, 0.6, 0.55), S(1.7, 0.93, 0.99, 0.58, 0.91, 0.75, 0.64), S(1.36, 0.95, 1.01, 0.62, 0.93, 0.81, 0.7), S(1.0, 0.94, 0.99, 0.63, 0.91, 0.83, 0.75), S(0.76, 0.94, 0.98, 0.64, 0.91, 0.845, 0.8)], paint));
  const U = (z, ws, w, ysh, wb, yb) => ({ z, pts: [[0, 0.3], [ws, 0.3], [w, ysh], [wb, yb], [wb - 0.07, yb - 0.01], [wb - 0.09, 0.34], [0, 0.34]] });
  body.add(loft([U(0.77, 0.94, 0.98, 0.64, 0.91, 0.845), U(0.0, 0.93, 0.97, 0.64, 0.91, 0.86), U(-0.9, 0.97, 1.02, 0.66, 0.95, 0.88), U(-1.46, 1.0, 1.04, 0.67, 0.97, 0.9)], paint, false));
  body.add(loft([S(-1.45, 1.0, 1.04, 0.67, 0.97, 0.9, 0.89), S(-1.85, 0.98, 1.03, 0.7, 0.95, 0.95, 0.94), S(-2.12, 0.92, 0.96, 0.72, 0.9, 0.98, 0.98), S(-2.26, 0.85, 0.88, 0.72, 0.83, 0.97, 0.97)], paint));
  // door seam + sill crease lines (thin black inlays)
  for (const s of [-1, 1]) { body.add(limb(black, [s * 0.985, 0.36, 0.55], [s * 0.985, 0.82, 0.62], 0.006)); body.add(limb(black, [s * 1.0, 0.36, -0.95], [s * 0.965, 0.86, -0.8], 0.006)); }
  // ---- black lower band (tall nose fascia), sills, diffuser + splitter blade
  const B = (z, w, y0, y1) => ({ z, pts: [[0, y0], [w, y0], [w + 0.02, y1], [0, y1 + 0.001]] });
  body.add(loft([B(2.25, 0.52, 0.15, 0.31), B(2.0, 0.88, 0.12, 0.3), B(1.0, 0.98, 0.12, 0.3), B(-1.3, 1.03, 0.12, 0.3), B(-2.25, 0.85, 0.16, 0.36)], black));
  body.add(loft([{ z: 2.36, pts: [[0, 0.1], [0.55, 0.1], [0.55, 0.135], [0, 0.135]] }, { z: 1.9, pts: [[0, 0.1], [0.93, 0.1], [0.93, 0.135], [0, 0.135]] }], black));
  // ---- the canopy: one dark glass greenhouse, long rake into the fastback
  const Gs = (z, wb, yb, wt, yt) => ({ z, pts: [[wb, yb], [wt, yt], [0, yt + 0.012]] });
  const glass = loft([Gs(0.8, 0.9, 0.845, 0.72, 0.85), Gs(0.35, 0.91, 0.855, 0.63, 1.06), Gs(-0.1, 0.91, 0.86, 0.6, 1.19), Gs(-0.85, 0.94, 0.88, 0.6, 1.19), Gs(-1.45, 0.97, 0.9, 0.55, 1.06), Gs(-1.98, 0.94, 0.95, 0.44, 0.985)], glassM, false);
  glass.castShadow = false; body.add(glass);
  for (const s of [-1, 1]) { body.add(limb(paint, [s * 0.72, 0.85, 0.8], [s * 0.63, 1.06, 0.35], 0.016)); body.add(limb(paint, [s * 0.63, 1.06, 0.35], [s * 0.6, 1.19, -0.1], 0.016)); body.add(limb(paint, [s * 0.6, 1.19, -0.1], [s * 0.6, 1.19, -0.85], 0.016)); body.add(limb(paint, [s * 0.6, 1.19, -0.85], [s * 0.44, 0.985, -1.98], 0.016)); body.add(limb(paint, [s * 0.94, 0.88, -0.85], [s * 0.6, 1.18, -0.85], 0.02)); }
  // ducktail lip
  body.add(loft([{ z: -1.92, pts: [[0, 0.96], [0.97, 0.96], [0.97, 1.0], [0, 1.0]] }, { z: -2.3, pts: [[0, 1.03], [0.86, 1.03], [0.86, 1.06], [0, 1.06]] }], paint));
  // ---- lights: one thin bar on the nose crease, wrapping slightly; thin red tail bar; amber side markers
  const head = glow(0xf2f6ff, 2.8), tail = glow(0xff2030, 2.4);
  body.add(limb(head, [-0.5, 0.443, 2.245], [0.5, 0.443, 2.245], 0.011));
  for (const s of [-1, 1]) body.add(limb(head, [s * 0.5, 0.443, 2.245], [s * 0.86, 0.5, 2.06], 0.011));
  const hh = [-1, 1].map((s) => { const h = halo(0xd8e8ff, 1.0, 0.35); h.position.set(s * 0.4, 0.45, 2.33); body.add(h); return h; });
  body.add(limb(tail, [-0.84, 0.735, -2.265], [0.84, 0.735, -2.265], 0.013));
  const th = halo(0xff2030, 1.3, 0.35); th.position.set(0, 0.73, -2.33); body.add(th);
  for (const s of [-1, 1]) body.add(ball(glow(0xffa030, 1.6), s * 0.995, 0.63, 0.7, 0.01, 0.026, 0.05));
  // ---- interior: tub floor, dashboard, screen, yoke, console, door cards, white 2+2 seats
  body.add(mesh(boxG(1.7, 0.04, 2.2, 0.02), inner, 0, 0.35, -0.35));
  body.add(mesh(boxG(1.72, 0.16, 0.24, 0.05), inner, 0, 0.7, 0.62));                     // dash
  body.add(mesh(boxG(1.6, 0.03, 0.2, 0.01), cream, 0, 0.79, 0.6));                        // dash top trim
  for (const s of [-1, 1]) body.add(mesh(boxG(0.04, 0.38, 2.1, 0.02), inner, s * 0.82, 0.6, -0.35));  // door cards
  body.add(mesh(boxG(0.22, 0.2, 1.3, 0.05), inner, 0, 0.45, -0.25));                      // centre console
  const seatAt = [[-0.42, -0.28], [0.42, -0.28], [-0.36, -1.08], [0.36, -1.08]];
  for (const [x, z] of seatAt) { body.add(mesh(boxG(0.44, 0.1, 0.48, 0.05), cream, x, 0.42, z)); const bk = mesh(boxG(0.44, 0.52, 0.11, 0.06), cream, x, 0.7, z - 0.27); bk.rotation.x = -0.18; body.add(bk); body.add(mesh(boxG(0.2, 0.12, 0.08, 0.04), cream, x, 1.0, z - 0.32)); }
  const trim = clay(0x1a1a1e, { rough: 0.4 });
  const yoke = new THREE.Group(); yoke.position.set(-0.42, 0.78, 0.38); yoke.rotation.x = -1.15; body.add(yoke);
  yoke.add(limb(trim, [-0.16, 0, 0], [0.16, 0, 0], 0.024)); for (const s of [-1, 1]) yoke.add(limb(trim, [s * 0.16, 0, 0], [s * 0.15, -0.12, 0], 0.024));
  yoke.add(limb(trim, [0, 0, 0], [0, 0, -0.2], 0.03));
  const scrTex = canvasTex(512, 320, () => {});
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
  scr.position.set(0.05, 0.92, 0.54); scr.rotation.set(0.35, Math.PI, 0); body.add(scr);
  { const bk = mesh(boxG(0.45, 0.29, 0.02, 0.01), trim, 0.05, 0.92, 0.552); bk.rotation.set(0.35, Math.PI, 0); body.add(bk); }
  const drawScreen = (speed, pax, warn) => {
    const c = scrTex.userData.ctx; c.fillStyle = "#0a0e16"; c.fillRect(0, 0, 512, 320);
    c.fillStyle = "#fff"; c.textAlign = "center"; c.font = "900 120px Arial"; c.fillText(String(Math.round(speed)), 256, 150);
    c.font = "700 34px Arial"; c.fillStyle = "#8a9ab0"; c.fillText("MPH", 256, 196);
    c.fillStyle = warn ? "#ff3040" : "#60d0ff"; c.font = "800 40px Arial"; c.fillText(`PASSENGERS: ${pax}`, 256, 270);
    scrTex.needsUpdate = true;
  };
  drawScreen(0, 1, false);
  // ---- wheels: black flat twin-spoke, low-profile tyres, set in black arches
  const wheels = [];
  const tyreM = clay(0x0e0e10, { rough: 0.85 }), rimM = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.28, metalness: 0.6 }), faceM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.5 });
  for (const [x, z] of [[-0.9, 1.36], [0.9, 1.36], [-0.93, -1.38], [0.93, -1.38]]) {
    const w = new THREE.Group(); w.position.set(x, 0.38, z); g.add(w);
    const sp = new THREE.Group(); w.add(sp); const sx = Math.sign(x);
    const tyre = mesh(cylG(0.38, 0.38, 0.3, 36), tyreM); tyre.rotation.z = Math.PI / 2; sp.add(tyre);
    const barrel = mesh(cylG(0.31, 0.31, 0.302, 36), faceM); barrel.rotation.z = Math.PI / 2; sp.add(barrel);
    const lip = mesh(new THREE.TorusGeometry(0.31, 0.012, 8, 40), rimM, sx * 0.152, 0, 0); lip.rotation.y = Math.PI / 2; sp.add(lip);
    for (let k = 0; k < 5; k++) for (const d of [-0.07, 0.07]) { const arm = new THREE.Group(); arm.rotation.x = (k / 5) * Math.PI * 2 + d; arm.add(mesh(boxG(0.04, 0.3, 0.028, 0.008), rimM, sx * 0.155, 0.155, 0)); sp.add(arm); }
    const hub = mesh(cylG(0.055, 0.055, 0.04, 16), rimM, sx * 0.16, 0, 0); hub.rotation.z = Math.PI / 2; sp.add(hub);
    w.userData.spin = sp; wheels.push(w);
    const arch = mesh(cylG(0.43, 0.43, 0.26, 28, 1, true), black, x * 0.96, 0.38, z); arch.rotation.z = Math.PI / 2; body.add(arch);
  }
  // ---- cold-gas thrusters: hidden nozzles; plumes when firing
  const plumes = [];
  for (const [x, y, z, dir] of [[-0.45, 0.3, -2.26, -1], [0.45, 0.3, -2.26, -1], [-0.62, 0.11, 1.6, 0], [0.62, 0.11, 1.6, 0], [-0.62, 0.11, -1.0, 0], [0.62, 0.11, -1.0, 0]]) {
    const pl = new THREE.Group(); pl.position.set(x, y, z); body.add(pl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.geometry.translate(0, -0.8, 0); cone.rotation.x = dir ? -Math.PI / 2 : 0; pl.add(cone);
    const hl = halo(0xcfe8ff, 1.1, 0.8); pl.add(hl);
    pl.visible = false; plumes.push({ pl, cone, hl });
  }
  g.traverse((m) => { if (m.isMesh && m !== glass) { m.castShadow = true; m.receiveShadow = true; } });
  let last = "";
  return {
    root: g, body, wheels, plumes, glass, seatAt,
    set({ roll = 0, thrust = 0, speed = 0, pax = 1, warn = false, tilt = 0, glassOp = 0.9 }) {
      wheels.forEach((w) => (w.userData.spin.rotation.x = roll));
      plumes.forEach(({ pl, cone, hl }, i) => { pl.visible = thrust > 0.01; cone.scale.set(1, 0.6 + thrust * (0.8 + 0.3 * Math.sin(roll * 7 + i)), 1); cone.material.opacity = 0.55 * thrust; hl.material.opacity = 0.8 * thrust; });
      body.rotation.x = tilt;
      glassM.opacity = glassOp;
      const key = `${Math.round(speed)}|${pax}|${warn}`; if (key !== last) { drawScreen(speed, pax, warn); last = key; }
    },
  };
}

// ------------------------------------------------------------------ the ghost (a clay girl, see-through and glowing)
export function ghost(h = 0.9) {
  const c = makeChar({ seed: 31, outfit: "dress", shirt: 0xdfeaff, skin: 0xd8e6ff, hair: "long", hairColor: 0xb8c8e8, h, girth: 0.88, eyeR: 0.064, pants: 0xdfeaff });
  c.root.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.62; if (m.material.isMeshStandardMaterial) { m.material.emissive.set(0x6a9aff); m.material.emissiveIntensity = 0.55; } m.material.depthWrite = false; m.castShadow = false; } });
  const hl = halo(0x9ac0ff, 3.2, 0.35); hl.position.y = 1.0; c.root.add(hl);
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
