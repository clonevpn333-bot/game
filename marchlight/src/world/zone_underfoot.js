// CHAPTER ONE — UNDERFOOT. The ground below Meridian's starboard bow while the city holds at the edge
// of the Gray Fork: old fields under the legs, an overgrown highway full of the last traffic jam, a
// Stillness hollow where a harvester stopped mid-swing, a scav salvage yard around a fallen tower, and
// the old relay building whose mast can still hear Callow Reach.
import * as THREE from 'three';
import { Zone, car, bus, bush, tree, grass, shell } from './surface.js';
import { crate, barrel } from './props.js';
import { rng } from '../core/util.js';
import { Builder } from './builder.js';
import { shearerModel } from '../combat/enemies.js';

export function buildUnderfoot(game) {
  const Z = new Zone(game, 'underfoot'), b = Z.b, r = rng(2026), V = (x, dy, z) => Z.v(x, dy, z);
  // ---- the walkable ground (terrain collider) for the whole zone
  Z.terrain(194, 640, -720, -170, 4);
  const HW = { x: 308, y: 7, z0: -372, z1: -498, w: 16 }; // the highway
  Z.HW = HW;

  // ================================================================== landing, beside Leg Two
  // the Mule comes down on its own line from a boom over the Runner Bay door; the line stays hanging
  const L = V(214, 0, -196); Z.spots.landing = L; Z.spots.mulePark = V(213, 0, -192);
  const boomTip = new THREE.Vector3(209.5, -24.4, -190);
  b.box('darkSteel', [203.2, -24.4, -190], [13, 0.6, 0.8], { color: 0x3a3a3a, collide: false });
  b.tube('steel', [197, -31, -190], [205, -24.6, -190], 0.12, { color: 0x6a6a64 });
  b.cyl('darkSteel', [boomTip.x, boomTip.y - 0.3, boomTip.z], 0.35, 0.5, { color: 0x2a2a2a, seg: 12 });
  Z.cableLine = cableLine(Z, boomTip.clone().setY(boomTip.y - 0.6), new THREE.Vector3(boomTip.x, L.y + 0.2, boomTip.z));
  Z.spots.boomTip = boomTip; Z.spots.cableFoot = new THREE.Vector3(boomTip.x, L.y, boomTip.z);
  // a fence line, an old tractor, wildflowers
  for (let z = -250; z > -330; z -= 3.2) b.box('wood', [252, Z.gy(252, z) + 0.55, z], [0.12, 1.1, 0.12], { color: 0x5a4a3a, collide: false });
  b.box('wood', [252, Z.gy(252, -290) + 0.9, -290], [0.06, 0.08, 80], { color: 0x5a4a3a, collide: false });
  { const t = V(285, 0, -262); b.box('rust', [t.x, t.y + 1.0, t.z], [2.2, 1.4, 3.4], { color: 0x8a4a2a, round: 0.1, tex: 1.5 }); b.box('rust', [t.x, t.y + 2.0, t.z - 0.6], [1.6, 1.0, 1.6], { color: 0x8a4a2a, collide: false, round: 0.08 });
    b.cyl('rubber', [t.x - 1.2, t.y + 0.9, t.z + 1], 0.9, 0.5, { rz: Math.PI / 2, color: 0x1e1e1e, seg: 14 }); b.cyl('rubber', [t.x + 1.2, t.y + 0.9, t.z + 1], 0.9, 0.5, { rz: Math.PI / 2, color: 0x1e1e1e, seg: 14 });
    bush(Z, t.x + 0.5, t.y + 2.6, t.z, 0.6); }
  grass(Z, 200, 345, -330, -180, 3000, { skip: (x, z) => Math.hypot(x - 213, z - 192) < 7 });
  for (let i = 0; i < 14; i++) tree(Z, 236 + r() * 30, -220 - r() * 110, 7 + r() * 6);

  // ================================================================== the overgrown highway
  const deckY = (z) => Z.gy(HW.x, z) + HW.y;
  // on-ramp up from the fields
  const r0 = Z.gy(HW.x, -340), r1 = deckY(HW.z0), rampLen = Math.abs(HW.z0 + 340), ang = Math.atan2(r1 - r0, rampLen);
  b.box('concrete', [HW.x, (r0 + r1) / 2 - 0.3, (HW.z0 - 340) / 2], [HW.w * 0.6, 0.6, Math.hypot(rampLen, r1 - r0)], { rx: ang, color: 0x8a867c, tex: 3 });
  for (const sx of [-1, 1]) b.box('concrete', [HW.x + sx * HW.w * 0.3, (r0 + r1) / 2 + 0.25, (HW.z0 - 340) / 2], [0.4, 0.9, Math.hypot(rampLen, r1 - r0)], { rx: ang, color: 0x9a968c, tex: 2 });
  // the deck in spans, with a collapsed span (a V you climb down into and out of) and a broken end
  const span = (za, zb, drop = 0) => {
    const y = deckY((za + zb) / 2) - drop;
    b.box('concrete', [HW.x, y - 0.35, (za + zb) / 2], [HW.w, 0.7, Math.abs(zb - za)], { color: 0x8a867c, tex: 4 });
    b.box('concrete', [HW.x, y - 1.1, (za + zb) / 2], [HW.w - 2, 0.8, Math.abs(zb - za)], { color: 0x6a665e, collide: false, tex: 3 });
    for (const sx of [-1, 1]) b.box('concrete', [HW.x + sx * (HW.w / 2 - 0.25), y + 0.45, (za + zb) / 2], [0.5, 0.9, Math.abs(zb - za)], { color: 0x9a968c, tex: 2 });
    b.box('paint', [HW.x, y + 0.005, (za + zb) / 2], [0.15, 0.01, Math.abs(zb - za)], { color: 0xc8b878, collide: false });
  };
  span(HW.z0, -428); span(-436, HW.z1);
  { // the collapsed span: two slabs broken in the middle, tilted down to a ledge 3 m below
    const yA = deckY(-428), yB = deckY(-436), low = Math.min(yA, yB) - 3;
    const sl = (za, zb, ya, yb) => { const len = Math.hypot(zb - za, yb - ya), a = Math.atan2(yb - ya, Math.abs(zb - za)) * (zb < za ? 1 : -1);
      b.box('concrete', [HW.x, (ya + yb) / 2 - 0.35, (za + zb) / 2], [HW.w - 1, 0.7, len], { rx: a, color: 0x7a766c, tex: 3 }); };
    sl(-428, -432, yA, low); sl(-432, -436, low, yB);
    for (let i = 0; i < 6; i++) b.box('concrete', [HW.x + (r() - 0.5) * 12, low + 0.3, -432 + (r() - 0.5) * 2], [1 + r() * 1.5, 0.6 + r() * 0.6, 1 + r()], { rx: r(), ry: r() * 3, color: 0x6a665e, collide: false });
    Z.spots.collapse = new THREE.Vector3(HW.x, low, -432);
  }
  // piers, hanging vines, light poles (some bent)
  for (let z = HW.z0 - 6; z > HW.z1; z -= 18) for (const sx of [-1, 1]) {
    const gy = Z.gy(HW.x + sx * 5, z); b.box('concrete', [HW.x + sx * 5, (gy + deckY(z) - 1.4) / 2, z], [1.6, deckY(z) - 1.4 - gy, 1.6], { color: 0x7a766c, tex: 3 });
    if (r() < 0.7) for (let k = 0; k < 3; k++) b.box('leaf', [HW.x + sx * (HW.w / 2 + 0.1), deckY(z) - 1.6 - k * 0.6, z + (k - 1) * 1.4], [0.08, 2.4 - k * 0.5, 0.5], { color: 0x3a5a2a, collide: false });
  }
  for (let z = HW.z0 - 10; z > HW.z1; z -= 24) { const sx = (z / 24 | 0) % 2 ? 1 : -1, bent = r() < 0.4;
    b.tube('steel', [HW.x + sx * 7.4, deckY(z) + 0.9, z], [HW.x + sx * 7.4 + (bent ? -sx * 1.8 : 0), deckY(z) + 7, z + (bent ? 1.4 : 0)], 0.09, { color: 0x6a6a64 }); }
  // the last traffic jam
  const lanes = [-5.8, -2.2, 2.2, 5.8];
  for (let z = HW.z0 - 6; z > HW.z1 + 4; z -= 7 + r() * 5) {
    if (z < -424 && z > -440) continue;
    for (const lx of lanes) if (r() < 0.45) car(Z, HW.x + lx + (r() - 0.5) * 0.6, deckY(z), z, (lx < 0 ? 0 : Math.PI) + (r() - 0.5) * 0.4);
  }
  bus(Z, HW.x + 4, deckY(-462), -462, Math.PI + 0.12);
  for (let i = 0; i < 26; i++) { const z = HW.z0 - r() * (HW.z0 - HW.z1); if (z < -424 && z > -440) continue; bush(Z, HW.x + (r() - 0.5) * 13, deckY(z) + 0.4, z, 0.5 + r() * 0.8); }
  // the broken end: a rubble slope down into the hollow
  { const ye = deckY(HW.z1), yg = Z.gy(HW.x, -522), len = Math.hypot(24, ye - yg), a = Math.atan2(ye - yg, 24);
    b.box('concrete', [HW.x, (ye + yg) / 2 - 0.6, HW.z1 - 12], [HW.w - 3, 1.2, len], { rx: -a, color: 0x6a665e, tex: 3 });
    for (let i = 0; i < 10; i++) b.box('concrete', [HW.x + (r() - 0.5) * 12, (ye + yg) / 2 + (r() - 0.5) * 3, HW.z1 - 6 - r() * 14], [1 + r() * 2, 0.8 + r(), 1 + r() * 2], { rx: r(), ry: r() * 3, color: 0x7a766c, collide: false }); }

  // ================================================================== the Stillness hollow
  // a corridor between two collapsed walls of rubble: the way on runs through a field that breathes
  const C0 = new THREE.Vector3(326, 0, -528), C1 = new THREE.Vector3(404, 0, -588), cdir = C1.clone().sub(C0).normalize(), cperp = new THREE.Vector3(-cdir.z, 0, cdir.x), clen = C0.distanceTo(C1), cry = Math.atan2(cdir.x, cdir.z);
  for (const s of [-1, 1]) for (let t = 0; t < clen; t += 6) {
    const p = C0.clone().addScaledVector(cdir, t + 3).addScaledVector(cperp, s * (11 + r() * 1.5)), gy = Z.gy(p.x, p.z), h = 4.5 + r() * 2.5;
    b.box('concrete', [p.x, gy + h / 2 - 0.5, p.z], [3 + r(), h, 6.5], { ry: cry + (r() - 0.5) * 0.3, color: 0x6a665e, tex: 3 });
    if (r() < 0.5) bush(Z, p.x, gy + h - 0.2, p.z, 0.7 + r() * 0.5);
  }
  const SC = C0.clone().lerp(C1, 0.5); SC.y = Z.gy(SC.x, SC.z); Z.spots.stillCentre = SC; Z.stillR = 24;
  // the harvester that stopped mid-swing: reel blades frozen at an angle, chaff hanging in the air
  { const h = SC.clone().addScaledVector(cperp, -4).addScaledVector(cdir, -5);
    b.box('rust', [h.x, h.y + 1.6, h.z], [3.4, 2.6, 6], { ry: cry, color: 0x9a7a2a, round: 0.15, tex: 2 });
    b.box('glassDark', [h.x, h.y + 3.4, h.z - 1], [2.2, 1.2, 1.8], { ry: cry, collide: false });
    const reel = new THREE.Group(); reel.position.set(h.x + cdir.x * 4, h.y + 1.4, h.z + cdir.z * 4); reel.rotation.y = cry; Z.root.add(reel);
    const rb = new BuilderLite(game, reel); rb.box('darkSteel', [0, 0, 0], [5.4, 0.25, 0.25], { color: 0x3a3a3a, collide: false });
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; rb.box('rust', [0, Math.cos(a) * 1.1, Math.sin(a) * 1.1], [5.2, 0.12, 0.5], { rx: a, color: 0xb88a3a, collide: false }); }
    rb.finalize(); b.box('rust', [h.x + cdir.x * 3.8, h.y + 0.5, h.z + cdir.z * 3.8], [5.6, 0.8, 1.2], { ry: cry, color: 0x8a6a2a });
  }
  // birds held in the air, a dog mid-leap, dust that doesn't fall
  { const birdGeo = new THREE.ConeGeometry(0.25, 0.9, 3); birdGeo.rotateX(Math.PI / 2); const bm = new THREE.MeshLambertMaterial({ color: 0x3a3836 });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(birdGeo, bm); const p = SC.clone().addScaledVector(cdir, (r() - 0.5) * 30).addScaledVector(cperp, (r() - 0.5) * 16); m.position.set(p.x, SC.y + 4 + r() * 7, p.z); m.rotation.set(r() * 0.4, r() * 6, (r() - 0.5) * 0.8); m.scale.set(1.6, 0.4, 1); Z.root.add(m); }
    Z.disposers.push(() => { birdGeo.dispose(); bm.dispose(); });
    const dog = SC.clone().addScaledVector(cdir, 7).addScaledVector(cperp, 3);
    b.box('wood', [dog.x, dog.y + 1.2, dog.z], [0.35, 0.4, 1.0], { ry: cry, rx: -0.4, color: 0x6a4a30, collide: false, round: 0.08 });
    b.box('wood', [dog.x + cdir.x * 0.6, dog.y + 1.55, dog.z + cdir.z * 0.6], [0.28, 0.3, 0.4], { ry: cry, color: 0x6a4a30, collide: false, round: 0.06 });
    const dg = new THREE.BufferGeometry(), dp = [];
    for (let i = 0; i < 700; i++) { const p = SC.clone().addScaledVector(cdir, (r() - 0.5) * 46).addScaledVector(cperp, (r() - 0.5) * 20); dp.push(p.x, SC.y + r() * 9, p.z); }
    dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xdfe4ec, size: 0.12, transparent: true, opacity: 0.8 })); Z.root.add(dust);
    Z.disposers.push(() => { dg.dispose(); dust.material.dispose(); });
  }
  // the dome: faint, breathing, readable at a distance
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.82, 1), transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  dome.position.copy(SC); dome.scale.setScalar(Z.stillR); Z.root.add(dome); Z.dome = dome; Z.disposers.push(() => { dome.geometry.dispose(); dome.material.dispose(); });
  grass(Z, 300, 430, -600, -510, 1500, { lean: 0.5, dry: true });
  // a wind pump at the corridor's mouth, still turning (outside the field): momentum to take in with you
  Z.windmill = windmill(Z, 333, -516, 11);

  // ================================================================== the salvage yard and the fallen tower
  const Y0 = new THREE.Vector3(470, 0, -622);
  for (const [x, z, ry, c] of [[440, -598, 0.3, 0x2f5a6a], [452, -640, -0.2, 0x8a3a22], [430, -626, 1.4, 0x5a6a3a], [478, -604, 0.9, 0x6a5a3a]]) container(Z, x, z, ry, c);
  for (let i = 0; i < 7; i++) car(Z, 420 + r() * 70, Z.gy(440, -620), -590 - r() * 60, r() * 6);
  for (let i = 0; i < 8; i++) { const x = 425 + r() * 70, z = -595 - r() * 55; b.box('concrete', [x, Z.gy(x, z) + 0.6, z], [2.4, 1.2, 1.2], { ry: r() * 3, color: 0x8a867c, tex: 2 }); }
  for (let i = 0; i < 6; i++) { const x = 430 + r() * 60, z = -600 - r() * 50; crate(b, [x, Z.gy(x, z), z], 1.1, { ry: r() * 3 }); if (r() < 0.5) barrel(b, [x + 1.5, Z.gy(x, z), z]); }
  grass(Z, 410, 520, -665, -585, 900, { dry: true });
  { // a harvest-line unit, long dead, picked half clean: the same maker's plate as the Shearer's
    const hk = shearerModel({ serial: 'H-3' }), u = hk.userData, p = V(458, 0, -618);
    hk.position.copy(p).add(new THREE.Vector3(0, -0.9, 0)); hk.rotation.set(0.18, 2.3, 0.42); hk.scale.setScalar(1.12);
    u.core.material = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 }); u.shield.visible = false; u.lights?.forEach?.(l => (l.visible = false));
    u.plates.forEach((pl, i) => { if (i !== 1) pl.hinge.rotation[pl.axis] = pl.open * 1.3; });
    u.legs.forEach((lg, i) => { lg.hip.rotation.z = (lg.sx > 0 ? 1 : -1) * (0.9 + i * 0.1); lg.knee.rotation.z = -(lg.sx > 0 ? 1 : -1) * 1.6; });
    hk.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    Z.root.add(hk); Z.husk = hk; Z.spots.husk = p;
    b.solid([p.x, p.y + 1.2, p.z], [3.4, 2.4, 4.4], { ry: 2.3 });
  }
  Z.spots.yard = Y0.clone().setY(Z.gy(Y0.x, Y0.z));
  Z.spots.yardEnemies = [V(448, 0, -612), V(462, 0, -630), V(440, 3.5, -634), V(470, 4, -606), V(456, 5, -598)];
  // the relay building (the mast is on its roof) and the tower that fell against it
  const B = { x: 545, z: -664, w: 22, d: 20, floors: 4 };
  const RB = shell(Z, B.x, B.z, B.w, B.d, B.floors, { seed: 31, open: ['w0:2', 'w1:2', 's0:2', 's0:3', 'w2:1'], broken: 0.18, color: 0x8a847a });
  Z.relay = RB; Z.B = B;
  const f2 = RB.levels[2];
  { // the fallen tower: an office block lying on its side, its top resting on the second floor — a ramp
    const foot = V(497, 0, -632), top = new THREE.Vector3(B.x - B.w / 2 + 1, f2 + 0.1, -660), mid = foot.clone().lerp(top, 0.5), len = foot.distanceTo(top);
    const yaw = Math.atan2(top.x - foot.x, top.z - foot.z), pitch = Math.asin((top.y - foot.y) / len);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, yaw, 0, 'YXZ')), e = new THREE.Euler().setFromQuaternion(q);
    b.box('concrete', [mid.x, mid.y - 2.2, mid.z], [9, 4.4, len], { rx: e.x, ry: e.y, rz: e.z, color: 0x7a7a74, tex: 3 });
    for (let k = 0; k < 8; k++) { const p = foot.clone().lerp(top, (k + 0.5) / 8); b.box('glassDark', [p.x, p.y - 2.2, p.z], [9.1, 2.2, 1.2], { rx: e.x, ry: e.y, rz: e.z, collide: false }); }
    Z.spots.towerFoot = foot; Z.spots.towerTop = top;
  }
  // the mast on the roof, its dynamo, and the wind turbine on the next roof over
  const roof = RB.top, mastP = new THREE.Vector3(B.x + 3, roof, B.z - 3);
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) b.tube('steel', [mastP.x + dx, roof, mastP.z + dz], [mastP.x + dx * 0.15, roof + 22, mastP.z + dz * 0.15], 0.1, { color: 0x9a9a92 });
  for (let h = 3; h < 22; h += 3) { const k = 1 - h / 26; b.tube('steel', [mastP.x - 1.2 * k, roof + h, mastP.z - 1.2 * k], [mastP.x + 1.2 * k, roof + h, mastP.z + 1.2 * k], 0.05, { color: 0x9a9a92 }); }
  b.box('darkSteel', [mastP.x, roof + 22.4, mastP.z], [0.4, 0.8, 0.4], { color: 0x3a3a3a, collide: false });
  Z.mastLamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.05, 0.03) })); Z.mastLamp.position.set(mastP.x, roof + 23, mastP.z); Z.root.add(Z.mastLamp);
  const dyn = new THREE.Vector3(B.x - 4, roof, B.z + 4);
  b.box('paint', [dyn.x, dyn.y + 0.9, dyn.z], [1.6, 1.8, 1.2], { color: 0x5a6a5a, round: 0.05 });
  b.cyl('darkSteel', [dyn.x, dyn.y + 1.0, dyn.z + 0.75], 0.45, 0.3, { rx: Math.PI / 2, color: 0x2a2a2a, seg: 16 });
  Z.dynamo = dyn.clone().add(new THREE.Vector3(0, 1.0, 0.8));
  Z.dynLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.05, 0.03) })); Z.dynLamp.position.set(dyn.x + 0.5, dyn.y + 1.7, dyn.z + 0.62); Z.root.add(Z.dynLamp);
  b.railing([B.x - B.w / 2 + 0.3, roof, B.z - B.d / 2 + 0.3], [B.x + B.w / 2 - 0.3, roof, B.z - B.d / 2 + 0.3], { h: 1.0 });
  b.railing([B.x + B.w / 2 - 0.3, roof, B.z - B.d / 2 + 0.3], [B.x + B.w / 2 - 0.3, roof, B.z + B.d / 2 - 0.3], { h: 1.0 });
  // a lower block next door with the turbine (seen and tethered from the relay roof)
  shell(Z, 572, -650, 14, 14, 2, { seed: 32, broken: 0.25, stairs: false });
  Z.turbine = turbine(Z, 572, -650, Z.gy(572, -650) - 0.3 + 7, 14);
  // the east face has fallen out: a rubble slope from the first floor to the ground (the quick way down)
  { const y1 = RB.levels[1], top = new THREE.Vector3(B.x + B.w / 2 - 1, y1, B.z + 2), foot = V(B.x + B.w / 2 + 12, 0, B.z + 4), len = foot.distanceTo(top), a = Math.asin((top.y - foot.y) / len), yaw = Math.atan2(top.x - foot.x, top.z - foot.z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-a, yaw, 0, 'YXZ')), e = new THREE.Euler().setFromQuaternion(q), mid = top.clone().lerp(foot, 0.5);
    b.box('concrete', [mid.x, mid.y - 0.6, mid.z], [6, 1.2, len], { rx: e.x, ry: e.y, rz: e.z, color: 0x6a665e, tex: 3 });
    for (let i = 0; i < 12; i++) { const p = top.clone().lerp(foot, r()); b.box('concrete', [p.x + (r() - 0.5) * 5, p.y + 0.2, p.z + (r() - 0.5) * 3], [0.8 + r() * 1.4, 0.6 + r(), 0.8 + r() * 1.4], { rx: r(), ry: r() * 3, color: 0x7a766c, collide: false }); }
    Z.spots.rubbleFoot = foot; }
  Z.spots.pickup = V(586, 0, -626);
  Z.spots.roof = new THREE.Vector3(B.x - 2, roof, B.z + 1);
  grass(Z, 520, 630, -700, -600, 900);
  for (let i = 0; i < 10; i++) tree(Z, 590 + r() * 40, -600 - r() * 100, 8 + r() * 6);

  Z.finalize();
  return Z;
}

// a throwaway Builder for small moving groups inside the zone (visual only, never given colliders)
class BuilderLite extends Builder { constructor(game, parent) { super(game, parent, { cell: 1000 }); } }

function container(Z, x, z, ry, color) {
  const y = Z.gy(x, z); Z.b.box('corrugated', [x, y + 1.3, z], [2.5, 2.6, 6.1], { ry, color, tex: 2 });
  bush(Z, x, y + 2.8, z + 1, 0.5);
}
// an old farm wind pump: the wheel turns with the wind; the tether can take its spin
function windmill(Z, x, z, h) {
  const b = Z.b, y = Z.gy(x, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.tube('steel', [x + dx * 1.4, y, z + dz * 1.4], [x + dx * 0.2, y + h, z + dz * 0.2], 0.08, { color: 0x8a8a84 });
  const hub = new THREE.Group(); hub.position.set(x, y + h + 0.4, z + 0.5); Z.root.add(hub);
  const wb = new BuilderLite(Z.game, hub);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; wb.box('paint', [Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0], [0.35, 1.6, 0.04], { rz: a - Math.PI / 2, color: 0xc8c0b0, collide: false }); }
  wb.finalize();
  const W = { hub, pos: new THREE.Vector3(x, y + h + 0.4, z + 0.5), spin: 2.2 };
  Z.offs.push(Z.game.add((dt) => { W.spin += (2.2 - W.spin) * dt * 0.15; hub.rotation.z += W.spin * dt; }));
  return W;
}
function turbine(Z, x, z, y, h) {
  const b = Z.b;
  b.tube('steel', [x, y, z], [x, y + h, z], 0.45, { r2: 0.28, color: 0xd8d4c8 });
  b.box('paint', [x, y + h + 0.5, z - 0.5], [1.2, 1.1, 2.6], { color: 0xe0dcd0, collide: false, round: 0.2 });
  const rotor = new THREE.Group(); rotor.position.set(x, y + h + 0.5, z + 0.9); Z.root.add(rotor);
  const tb = new BuilderLite(Z.game, rotor);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; tb.box('paint', [Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0], [0.5, 6.2, 0.12], { rz: a - Math.PI / 2, color: 0xe8e4d8, collide: false }); }
  tb.finalize();
  const T = { rotor, pos: new THREE.Vector3(x, y + h + 0.5, z + 0.9), spin: 1.6 };
  Z.offs.push(Z.game.add((dt) => { T.spin += (1.6 - T.spin) * dt * 0.12; rotor.rotation.z += T.spin * dt; }));
  return T;
}

// a hanging line (thin, slightly swaying) — the Mule's cable down from the boom
function cableLine(Z, top, foot) {
  const N = 16, pts = []; for (let i = 0; i < N; i++) pts.push(top.clone().lerp(foot, i / (N - 1)));
  const geo = new THREE.BufferGeometry().setFromPoints(pts), line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
  line.frustumCulled = false; Z.root.add(line); Z.disposers.push(() => line.material.dispose());
  const C = { line, top: top.clone(), foot: foot.clone(), sway: 1 };
  Z.offs.push(Z.game.add(() => { const P = geo.attributes.position, t = Z.game.time;
    for (let i = 0; i < N; i++) { const u = i / (N - 1), w = Math.sin(u * Math.PI) * C.sway * Math.sin(t * 0.6 + u * 2); P.setXYZ(i, C.top.x + (C.foot.x - C.top.x) * u + w, C.top.y + (C.foot.y - C.top.y) * u, C.top.z + (C.foot.z - C.top.z) * u + w * 0.5); }
    P.needsUpdate = true; }));
  return C;
}
