// Boats: the interceptor (Kai's car, rewritten into a deep-V gunboat), the
// ATLAS patrol RIBs, and the research vessel Meridian.
import * as THREE from 'three';
import { pbr } from '../engine/assets.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const curve = (keys) => (z) => {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [z0, v0] = keys[i], [z1, v1] = keys[i + 1]; if (z <= z1) { const t = (z - z0) / (z1 - z0); const s = t * t * (3 - 2 * t); return v0 + (v1 - v0) * s; } }
  return keys[keys.length - 1][1];
};

/** Deep-V hull loft from keel → chine → sheer. Returns { geo, sheer(z), width(z) }. */
export function hullGeometry(h) {
  const L = h.length, NZ = 60, NS = 14;
  const w = curve(h.width), ys = curve(h.sheer), yk = curve(h.keel);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= NZ; i++) {
    const t = i / NZ, z = -L / 2 + L * t;
    const bow = sstep(L / 2 - h.bowRound, L / 2, z);
    const ww = w(z) * Math.sqrt(Math.max(0.0005, 1 - bow * bow)), top = ys(z), keel = yk(z);
    const chineX = ww * 0.82, chineY = keel + (top - keel) * 0.32 + h.deadrise * (1 - bow);
    for (let k = 0; k <= NS; k++) {
      const s = k / NS;
      let x, y;
      if (s < 0.45) { const u = s / 0.45; x = chineX * u; y = keel + (chineY - keel) * Math.pow(u, 0.9); }
      else if (s < 0.55) { const u = (s - 0.45) / 0.1; x = chineX + (ww * 0.86 - chineX) * u; y = chineY + 0.02 * Math.sin(u * Math.PI) - 0.03 * u; }
      else { const u = (s - 0.55) / 0.45; x = ww * (0.86 + 0.14 * Math.sin(u * Math.PI / 2)); y = chineY - 0.03 + (top - chineY + 0.03) * u; }
      pos.push(x, y, z); uv.push(t, s * 0.5);
    }
  }
  const rows = NZ + 1, per = NS + 1, cols = per * 2 - 1;
  const P2 = [], U2 = [];
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < per; k++) { const j = (i * per + k) * 3; P2.push(pos[j], pos[j + 1], pos[j + 2]); U2.push(uv[(i * per + k) * 2], uv[(i * per + k) * 2 + 1]); }
    for (let k = per - 2; k >= 0; k--) { const j = (i * per + k) * 3; P2.push(-pos[j], pos[j + 1], pos[j + 2]); U2.push(uv[(i * per + k) * 2], 1 - uv[(i * per + k) * 2 + 1]); }
  }
  for (let i = 0; i < rows - 1; i++) for (let k = 0; k < cols - 1; k++) { const a = i * cols + k, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  // transom (stern plate)
  const sh = new THREE.Shape();
  const z0 = -L / 2;
  const n0 = []; for (let k = 0; k <= NS; k++) n0.push([pos[k * 3], pos[k * 3 + 1]]);
  sh.moveTo(0, n0[0][1]); for (const [x, y] of n0) sh.lineTo(x, y); for (let k = NS; k >= 0; k--) sh.lineTo(-n0[k][0], n0[k][1]);
  const transom = new THREE.ShapeGeometry(sh); transom.translate(0, 0, z0); transom.rotateY(Math.PI); transom.rotateY(Math.PI);
  // deck outline (sheer line) for the deck plate
  const deck = new THREE.Shape();
  const outline = [];
  for (let i = 0; i <= NZ; i++) { const j = (i * per + NS) * 3; outline.push([pos[j] - 0.04, pos[j + 2]]); }
  deck.moveTo(-outline[0][0], outline[0][1]);
  for (const [x, z] of outline) deck.lineTo(-x, z);
  for (let i = outline.length - 1; i >= 0; i--) deck.lineTo(outline[i][0], outline[i][1]);
  return { geo, transom, deck, sheer: ys, width: (z) => w(z) * Math.sqrt(Math.max(0, 1 - sstep(L / 2 - h.bowRound, L / 2, z) ** 2)), keel: yk };
}

function hullTexture({ top = '#7a1a16', boot = '#e9e4da', bottom = '#1d1f22', text = 'VOSS 7', stripe = '#d9b04a' }) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  // v: 0 = keel (left half) .. 0.5 = sheer .. 1 = keel (right half)
  const V = (v) => v * 256;
  g.fillStyle = bottom; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = boot; g.fillRect(0, V(0.26), 1024, V(0.06)); g.fillRect(0, V(0.68), 1024, V(0.06));
  g.fillStyle = top; g.fillRect(0, V(0.32), 1024, V(0.36));
  g.fillStyle = stripe; g.fillRect(0, V(0.43), 1024, 5); g.fillRect(0, V(0.57) - 5, 1024, 5);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 22px Rajdhani, sans-serif';
  g.save(); g.translate(700, V(0.39)); g.scale(1, -1); g.fillText(text, 0, 0); g.restore();
  g.fillText(text, 700, V(0.64));
  // grime at the waterline and weeping rust streaks
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(40,30,20,${Math.random() * 0.15})`; g.fillRect(Math.random() * 1024, V(0.3) + Math.random() * V(0.4), 2, 10 + Math.random() * 30); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

const M = () => ({
  steel: new THREE.MeshStandardMaterial({ color: 0xa8acb0, metalness: 1, roughness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.6, metalness: 0.4 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.5 }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xe8e6e0, roughness: 0.35, clearcoat: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1418, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1, side: THREE.DoubleSide }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe86a1a, roughness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: 0x400404, emissive: 0xff2010, emissiveIntensity: 3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x044004, emissive: 0x20ff40, emissiveIntensity: 3 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2d8, emissiveIntensity: 5 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.75 }),
});

function tubeAlong(points, r, mat, closed = false) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
  return new THREE.Mesh(new THREE.TubeGeometry(c, points.length * 8, r, 8, closed), mat);
}

function outboard(m) {
  const g = new THREE.Group();
  const cowl = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 6, 12), m.dark); cowl.scale.set(1, 1, 1.35); cowl.position.y = 0.35; g.add(cowl);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.9), m.steel); stripe.position.y = 0.2; g.add(stripe);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.3), m.dark); shaft.position.set(0, -0.5, 0.05); g.add(shaft);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.45), m.dark); plate.position.set(0, -0.75, 0); g.add(plate);
  const prop = new THREE.Group(); prop.position.set(0, -0.95, -0.22);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.26, 0.1), m.steel); b.position.y = 0.13; const arm = new THREE.Group(); arm.add(b); arm.rotation.z = (i / 3) * Math.PI * 2; b.rotation.y = 0.5; prop.add(arm); }
  g.add(prop); g.userData.prop = prop;
  return g;
}

/** Twin-barrel bow gun on a pedestal. Returns {group, yaw, pitch, muzzle}. */
export function bowGun(m, scale = 1) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.7, 12), m.dark); ped.position.y = 0.35; g.add(ped);
  const yaw = new THREE.Group(); yaw.position.y = 0.75; g.add(yaw);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), m.steel); yaw.add(ring);
  const pitch = new THREE.Group(); pitch.position.y = 0.25; yaw.add(pitch);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.7), m.dark); body.position.z = 0.1; pitch.add(body);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.05), m.dark); shield.position.set(0, 0.1, 0.42); shield.rotation.x = -0.15; pitch.add(shield);
  const muzzles = [];
  for (const sx of [-0.1, 0.1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.2, 10), m.steel); b.rotation.x = Math.PI / 2; b.position.set(sx, 0.02, 0.85); pitch.add(b);
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8), m.dark); brake.rotation.x = Math.PI / 2; brake.position.set(sx, 0.02, 1.45); pitch.add(brake);
    const mz = new THREE.Object3D(); mz.position.set(sx, 0.02, 1.55); pitch.add(mz); muzzles.push(mz);
  }
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.3), m.dark); box.position.set(0.32, -0.05, 0); pitch.add(box);
  const handles = tubeAlong([[-0.25, -0.1, -0.35], [-0.25, -0.1, -0.5], [0.25, -0.1, -0.5], [0.25, -0.1, -0.35]], 0.02, m.black); pitch.add(handles);
  g.scale.setScalar(scale);
  return { group: g, yaw, pitch, muzzles };
}

// ---------------------------------------------------------------------------
export function buildInterceptor() {
  const m = M();
  const boat = new THREE.Group(); boat.name = 'interceptor';
  const H = { length: 9.2, width: [[-4.6, 1.32], [0, 1.38], [2.6, 1.1], [4.6, 0.2]], sheer: [[-4.6, 1.05], [0, 1.12], [3.0, 1.32], [4.6, 1.45]], keel: [[-4.6, -0.35], [1.5, -0.38], [3.6, 0.0], [4.6, 0.9]], deadrise: 0.05, bowRound: 0.9 };
  const hull = hullGeometry(H);
  const tex = hullTexture({});
  const hullMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const hm = new THREE.Mesh(hull.geo, hullMat); hm.castShadow = hm.receiveShadow = true; boat.add(hm);
  const tr = new THREE.Mesh(hull.transom, new THREE.MeshPhysicalMaterial({ color: 0x5e1410, roughness: 0.3, clearcoat: 1, side: THREE.DoubleSide })); boat.add(tr);
  const deckGeo = new THREE.ShapeGeometry(hull.deck, 2); deckGeo.rotateX(Math.PI / 2); deckGeo.translate(0, 0.95, 0);
  const uvs = deckGeo.attributes.uv; const dp = deckGeo.attributes.position; for (let i = 0; i < dp.count; i++) uvs.setXY(i, dp.getX(i), dp.getZ(i));
  const deck = new THREE.Mesh(deckGeo, pbr('teak', { size: 1.5, color: 0xc9b49a, side: THREE.DoubleSide })); deck.receiveShadow = true; boat.add(deck);
  // gunwale cap
  const cap = []; for (let i = 0; i <= 30; i++) { const z = -4.55 + (i / 30) * 9.0; cap.push([hull.width(z) - 0.02, hull.sheer(z) + 0.02, z]); }
  boat.add(tubeAlong(cap, 0.045, m.white)); boat.add(tubeAlong(cap.map(([x, y, z]) => [-x, y, z]), 0.045, m.white));
  // bow rails
  const rail = []; for (let i = 0; i <= 12; i++) { const z = 1.8 + (i / 12) * 2.6; rail.push([Math.max(0.05, hull.width(z) - 0.12), hull.sheer(z) + 0.55, z]); }
  boat.add(tubeAlong(rail, 0.022, m.steel)); boat.add(tubeAlong(rail.map(([x, y, z]) => [-x, y, z]), 0.022, m.steel));
  for (let i = 0; i <= 12; i += 3) for (const sx of [1, -1]) { const [x, y, z] = rail[i]; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), m.steel); st.position.set(sx * x, y - 0.27, z); boat.add(st); }
  // centre console with wrap-around windscreen
  const console_ = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1.3), m.white); console_.position.set(0, 1.47, 0.2); boat.add(console_);
  const front = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 1.05, 20, 1, false, -Math.PI / 2, Math.PI), m.white); front.scale.z = 0.5; front.position.set(0, 1.47, 0.85); boat.add(front);
  const screen = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.55, 24, 1, true, -Math.PI / 1.7, Math.PI * 1.18), m.glass); screen.scale.z = 0.6; screen.position.set(0, 2.25, 0.62); screen.rotation.x = -0.12; boat.add(screen);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.4), m.black); dash.position.set(0, 2.0, 0.55); dash.rotation.x = 0.4; boat.add(dash);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshStandardMaterial({ color: 0, emissive: 0x3fd6ff, emissiveIntensity: 1.2 })); display.position.set(0.2, 2.03, 0.54); display.rotation.x = -Math.PI / 2 + 0.4; boat.add(display);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 24), m.black); wheel.position.set(-0.15, 2.05, 0.35); wheel.rotation.x = -0.6; boat.add(wheel);
  const throttle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), m.steel); throttle.position.set(0.35, 2.1, 0.3); boat.add(throttle);
  // leaning post / seat
  const post = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.55), m.white); post.position.set(0, 1.32, -0.95); boat.add(post);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.5), m.seat); cushion.position.set(0, 1.76, -0.95); boat.add(cushion);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 0.12), m.seat); back.position.set(0, 2.05, -1.2); boat.add(back);
  // T-top: tubes + hardtop with lights and radar
  const tt = [];
  for (const sx of [-0.6, 0.6]) for (const z of [-1.35, 0.95]) tt.push(tubeAlong([[sx, 1.0, z], [sx * 1.02, 2.2, z], [sx * 0.98, 3.05, z + (z > 0 ? -0.15 : 0.1)]], 0.035, m.steel));
  tt.forEach((t) => boat.add(t));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 2.7), m.white); roof.position.set(0, 3.08, -0.2); boat.add(roof);
  const radar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.2, 18), m.white); radar.position.set(0, 3.25, -0.6); boat.add(radar);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.6, 6), m.white); ant.position.set(0.6, 3.9, -1.2); boat.add(ant);
  const flood = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), m.lamp); flood.position.set(0, 3.0, 1.12); boat.add(flood);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.red); navR.position.set(-0.8, 3.12, 0.9); boat.add(navR);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.green); navG.position.set(0.8, 3.12, 0.9); boat.add(navG);
  // twin outboards
  const engines = [];
  for (const sx of [-0.55, 0.55]) { const o = outboard(m); o.position.set(sx, 1.0, -4.85); boat.add(o); engines.push(o); }
  // bow gun
  const gun = bowGun(m, 1); gun.group.position.set(0, 1.1, 2.8); boat.add(gun.group);
  // fenders, cleats
  for (const z of [-2.5, -0.8, 1.0]) for (const sx of [1, -1]) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 10), m.white); f.position.set(sx * (hull.width(z) + 0.05), 0.75, z); boat.add(f); }
  boat.traverse((o) => { if (o.isMesh && o.material !== m.glass) { o.castShadow = true; o.receiveShadow = true; } });
  boat.userData = { gun, engines, hull, helm: new THREE.Vector3(-0.15, 0.97, -0.2) };
  return boat;
}

export function buildRIB() {
  const m = M();
  const boat = new THREE.Group(); boat.name = 'rib';
  const H = { length: 7.6, width: [[-3.8, 1.05], [0, 1.1], [2.2, 0.9], [3.8, 0.15]], sheer: [[-3.8, 0.75], [0, 0.8], [3.8, 1.0]], keel: [[-3.8, -0.3], [1.2, -0.32], [3.0, 0.0], [3.8, 0.7]], deadrise: 0.04, bowRound: 0.8 };
  const hull = hullGeometry(H);
  const hm = new THREE.Mesh(hull.geo, new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.6, side: THREE.DoubleSide })); boat.add(hm);
  // inflatable collar: tube along a stadium-shaped path around the gunwale
  const path = [];
  for (let i = 0; i <= 40; i++) { const z = -3.7 + (i / 40) * 7.2; path.push([hull.width(z) + 0.12, hull.sheer(z) + 0.22, z]); }
  const back = [...path].reverse().map(([x, y, z]) => [-x, y, z]);
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x3b3f44, roughness: 0.72 });
  const collar = tubeAlong([...path, ...back], 0.3, collarMat); boat.add(collar);
  const stripe = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.5 });
  boat.add(tubeAlong(path.map(([x, y, z]) => [x + 0.27, y + 0.08, z]), 0.03, stripe)); boat.add(tubeAlong(back.map(([x, y, z]) => [x - 0.27, y + 0.08, z]), 0.03, stripe));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 6.4), new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.9 })); deck.position.y = 0.7; boat.add(deck);
  const cons = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), m.dark); cons.position.set(0, 1.15, -0.3); boat.add(cons);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), m.glass); scr.position.set(0, 1.75, 0.08); scr.rotation.x = -0.4; boat.add(scr);
  const arch = tubeAlong([[-0.8, 0.8, -2.6], [-0.8, 2.4, -2.6], [0.8, 2.4, -2.6], [0.8, 0.8, -2.6]], 0.05, m.steel); boat.add(arch);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.15), m.lamp); lamp.position.set(0, 2.45, -2.5); boat.add(lamp);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({ color: 0x100010, emissive: 0xb34dff, emissiveIntensity: 0 })); strobe.position.set(0, 2.55, -2.6); boat.add(strobe);
  const o = outboard(m); o.position.set(0, 0.8, -3.95); boat.add(o);
  const gun = bowGun(m, 0.8); gun.group.position.set(0, 0.72, 1.6); boat.add(gun.group);
  // ATLAS logo on the collar
  const logoTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#d7e7ea'; g.font = 'bold 44px Rajdhani, sans-serif'; g.fillText('ATLAS · M-3', 10, 46); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const sx of [1, -1]) { const lg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true })); lg.position.set(sx * (hull.width(0) + 0.43), 1.02, 0); lg.rotation.y = sx * Math.PI / 2; boat.add(lg); }
  boat.traverse((x) => { if (x.isMesh) { x.castShadow = true; } });
  boat.userData = { gun, engines: [o], strobe };
  return boat;
}

/** The research vessel MERIDIAN (≈150 m). Returns group + named parts. */
export function buildResearchShip(facadeMat) {
  const m = M();
  const ship = new THREE.Group(); ship.name = 'meridian';
  const L = 150;
  const H = { length: L, width: [[-75, 10.5], [-40, 11.5], [20, 11.5], [55, 8], [75, 0.5]], sheer: [[-75, 12], [0, 12], [50, 13.5], [75, 16]], keel: [[-75, -6], [40, -7], [65, -3], [75, 6]], deadrise: 0.8, bowRound: 14 };
  const hull = hullGeometry(H);
  const ht = hullTexture({ top: '#1b2b3d', boot: '#d8d4cc', bottom: '#5a1a14', text: '', stripe: '#c9a43a' });
  ht.repeat.set(1, 1);
  const hullMat = new THREE.MeshStandardMaterial({ map: ht, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const hm = new THREE.Mesh(hull.geo, hullMat); hm.castShadow = hm.receiveShadow = true; ship.add(hm);
  const deckGeo = new THREE.ShapeGeometry(hull.deck, 4); deckGeo.rotateX(Math.PI / 2); deckGeo.translate(0, 11.6, 0);
  const du = deckGeo.attributes.uv, dp = deckGeo.attributes.position; for (let i = 0; i < dp.count; i++) du.setXY(i, dp.getX(i), dp.getZ(i));
  const deckMat = pbr('ship_deck', { size: 3, color: 0x6a7a74, metal: true, roughness: 0.7 }); deckMat.side = THREE.DoubleSide;
  const deck = new THREE.Mesh(deckGeo, deckMat); deck.receiveShadow = true; ship.add(deck);
  // name on the bow
  const nameTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#e9e5dc'; g.font = 'bold 96px Rajdhani, sans-serif'; g.fillText('MERIDIAN · ATLAS', 20, 100); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const sx of [1, -1]) { const n = new THREE.Mesh(new THREE.PlaneGeometry(36, 4.5), new THREE.MeshStandardMaterial({ map: nameTex, transparent: true })); n.position.set(sx * (hull.width(45) + 0.15), 10, 45); n.rotation.y = sx * Math.PI / 2 * (sx > 0 ? 1 : 1); if (sx < 0) n.rotation.y = -Math.PI / 2; ship.add(n); }
  // superstructure (uses the city facade shader for windows)
  const blocks = [[0, 12, 10, 18, 9, 22], [0, 21, 12, 15, 4, 16], [0, 25, 13, 13, 3.6, 9]];
  const sup = new THREE.Group(); ship.add(sup);
  for (const [x, y, z, w, h, d] of blocks) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.white); b.position.set(x, y + h / 2, z); b.castShadow = b.receiveShadow = true; sup.add(b);
    // window band
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 1.1, d + 0.05), new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.05, emissive: 0x2a2010, emissiveIntensity: 0.5 }));
    band.position.set(x, y + h * 0.62, z); sup.add(band);
  }
  // bridge wings + windows
  const wing = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 4), m.white); wing.position.set(0, 28.2, 17); sup.add(wing);
  // funnel + mast + rotating radar
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 8, 16), new THREE.MeshStandardMaterial({ color: 0x1b2b3d, roughness: 0.5 })); funnel.scale.z = 1.6; funnel.position.set(0, 29, -2); ship.add(funnel);
  const funnelBand = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.5, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x4fe3ff, emissive: 0x1a6070, emissiveIntensity: 0.6 })); funnelBand.scale.z = 1.6; funnelBand.position.set(0, 31.5, -2); ship.add(funnelBand);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 16, 8), m.white); mast.position.set(0, 36, 10); ship.add(mast);
  const radar = new THREE.Group(); radar.position.set(0, 40, 10); ship.add(radar);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.5), m.dark); radar.add(bar);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), m.white); dome.position.set(0, 4.5, 10); mast.add(dome);
  // stern A-frame crane + deck containers + lifeboats
  const af = new THREE.Group(); af.position.set(0, 12, -66);
  for (const sx of [-7, 7]) af.add(tubeAlong([[sx, 0, 0], [sx * 0.8, 14, -3]], 0.6, m.orange));
  af.add(tubeAlong([[-5.6, 14, -3], [5.6, 14, -3]], 0.6, m.orange));
  ship.add(af);
  const cols = [0x8c3b2a, 0x2f5a7a, 0x6e7a3a, 0xcccccc];
  for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.6, 6.1), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.7, metalness: 0.4 })); c.position.set((i % 2 ? -1 : 1) * 4, 13.3 + (i > 5 ? 2.6 : 0), -20 - Math.floor(i / 2) * 7); c.castShadow = true; ship.add(c); }
  for (const sx of [1, -1]) for (const z of [-4, 6]) { const lb = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 5, 6, 12), m.orange); lb.rotation.x = Math.PI / 2; lb.scale.y = 1; lb.position.set(sx * 9.5, 18, z); ship.add(lb); }
  // helipad at the bow
  const padTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#3a4a44'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#e9d36a'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke(); g.fillStyle = '#ffffff'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.fillText('H', 128, 182); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.8 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 13.0, 50); ship.add(pad);
  // deck railings
  for (const sx of [1, -1]) { const pts = []; for (let i = 0; i <= 30; i++) { const z = -72 + i * 4.6; pts.push([sx * (hull.width(z) - 0.4), hull.sheer(z) + 1.1, z]); } ship.add(tubeAlong(pts, 0.06, m.steel)); }
  // stern well-deck ramp (the boarding point)
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 14), new THREE.MeshStandardMaterial({ color: 0x4a5450, roughness: 0.8, metalness: 0.5 }));
  ramp.position.set(0, 4, -80); ramp.rotation.x = -0.32; ship.add(ramp);
  const rampLights = [];
  for (const sx of [-4.2, 4.2]) for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshStandardMaterial({ color: 0x002010, emissive: 0x30ff90, emissiveIntensity: 4 })); l.position.set(sx, 2.0 + i * 0.95, -86 + i * 2.8); ship.add(l); rampLights.push(l); }
  // automated turrets with exposed coolant tanks (weak points)
  const turrets = [];
  for (const [x, z] of [[-6.5, -10], [6.5, 28]]) {
    const t = bowGun(m, 2.2);
    t.group.position.set(x, 12, z); ship.add(t.group);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 14), new THREE.MeshStandardMaterial({ color: 0x103038, emissive: 0x4fe3ff, emissiveIntensity: 2.5 }));
    tank.rotation.z = Math.PI / 2; tank.position.set(0, 1.0, -0.8); t.yaw.add(tank);
    turrets.push({ ...t, tank, hp: 1, alive: true });
  }
  // running lights
  const deckLights = [];
  for (let i = 0; i < 6; i++) { const pl = new THREE.PointLight(0xffd9a0, 0, 30, 2); pl.position.set(i % 2 ? 8 : -8, 15, -60 + i * 22); ship.add(pl); deckLights.push(pl); }
  ship.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow || false; o.receiveShadow = true; } });
  ship.userData = { hull, radar, turrets, ramp, rampLights, deckLights, length: L };
  return ship;
}
