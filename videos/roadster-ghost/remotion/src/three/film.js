// @ts-nocheck
// ROADSTER GHOST · the clay world: a ghost-chase wrapper around the real physics (grip limit, thrust, downforce).
import { THREE, makeRenderer, makeCamera, aim, V3, clamp, lerp, seg, eio, eo, ei, back, rng } from "./base.js";
import { makeChar, SKIN, clay, glossy, glow, mesh, ball, limb, boxG, cylG, textTex } from "./clay.js";
import { tick, pumpkin, tree, nightGround, skyDome, fogCard, halo } from "./sets.js";
import { roadster, ghost, cemetery, road, flipRamp, rampAt, tick2 } from "./roadster.js";
import LIPS from "./lips.json";

const FPS = 30;
const lip = (who, T) => { const a = LIPS[who]; if (!a) return 0; const f = T * FPS, i = Math.floor(f), k = f - i; return lerp(a[i] || 0, a[i + 1] || 0, k); };
const blinkAt = (T, seed = 0) => { const p = (T + seed * 1.37) % 3.1; return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0; };
const wob = (T, a = 1, f = 1, s = 0) => a * (Math.sin(T * f * 1.3 + s) * 0.6 + Math.sin(T * f * 2.9 + s * 2) * 0.4);
const RZ = -70; // the ramp's base, down the road

// a clay force arrow with a label that always faces the camera
function arrow(color, label) {
  const g = new THREE.Group(), m = clay(color, { rough: 0.35 });
  const shaft = mesh(cylG(0.09, 0.09, 1, 18), m); shaft.position.y = 0.5; g.add(shaft);
  const head = mesh(new THREE.ConeGeometry(0.22, 0.4, 20), m); g.add(head);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex([{ t: label, size: 110, c: "#ffffff", stroke: 16, sc: "#12081a" }], { w: 768, h: 180 }), depthTest: false, transparent: true }));
  tag.scale.set(1.9, 0.45, 1); g.add(tag);
  g.userData = { shaft, head, tag };
  // set(from, dir, len, k): grows with k
  g.set = (from, dir, len, k = 1, tagOff = 0.4) => {
    g.visible = k > 0.01; const L = Math.max(0.01, len * k);
    g.position.copy(from); g.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
    shaft.scale.set(1, L, 1); head.position.y = L + 0.18; tag.position.set(0, L + 0.25 + tagOff, 0); tag.material.opacity = clamp(k * 2 - 0.6);
  };
  return g;
}
// streamlines of air flowing over a car (animated dashes)
function airflow(n = 7) {
  const g = new THREE.Group(), lines = [];
  for (let i = 0; i < n; i++) { const L = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x9fe6ff, dashSize: 0.35, gapSize: 0.2, transparent: true, opacity: 0.85 })); g.add(L); lines.push(L); }
  g.set = (T, k = 1) => lines.forEach((L, i) => {
    const y0 = 0.35 + i * 0.12, pts = [];
    for (let s = 0; s <= 40; s++) { const z = 4 - s * 0.2; const bump = Math.exp(-((z - 0.0) ** 2) / 2.2) * (0.55 - i * 0.03) * (i < 5 ? 1 : 0.5); pts.push(V3((i % 2 ? 0.25 : -0.25), y0 + bump + (z < -2 ? (z + 2) * 0.12 * (i < 4 ? 1 : 0) : 0), z)); }
    L.geometry.setFromPoints(pts); L.computeLineDistances(); L.material.dashOffset = -T * 3; L.material.opacity = 0.85 * k; L.visible = k > 0.01;
  });
  return g;
}

export function makeFilm(canvas) {
  const { renderer, env } = makeRenderer(canvas, { exposure: 1.0, shadows: true });
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0a0814, 1);
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.5;
  const hemi = new THREE.HemisphereLight(0x8a90e8, 0x1a2018, 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xbcd0ff, 2.0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 80 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xff9a50, 0.8); scene.add(fill, fill.target);
  const rim = new THREE.DirectionalLight(0xb080ff, 1.5); scene.add(rim, rim.target);
  const cam = makeCamera(34);
  // world: one long road; the cemetery beside it at z≈-8; the ramp at RZ; a lab stage (x=300) for the diagrams
  const world = new THREE.Group(); scene.add(world);
  world.add(road(170));
  const cem = cemetery(); cem.position.set(9, 0, -6); cem.rotation.y = -Math.PI / 2; world.add(cem);
  const cem2 = cemetery(); cem2.position.set(0, -0.02, RZ - 14); world.add(cem2);
  [[-6, 4], [-7, -16], [-6.5, -30], [7, -36], [-6, -48], [6.5, -52]].forEach(([x, z], i) => { const t = tree(3 + (i % 3) * 0.5, 10 + i); t.position.set(x, 0, z); world.add(t); });
  [[-3.8, -3], [-3.6, 1.5], [3.9, -20], [-3.8, -26], [3.7, -44]].forEach(([x, z], i) => { const p = pumpkin(0.9, 80 + i); p.position.set(x, 0, z); world.add(p); });
  const ramp = flipRamp(); ramp.position.set(0, 0, RZ); world.add(ramp);
  const fogA = fogCard(40, 3, 0x9a90d8, 0.35); fogA.position.set(0, 0.6, -20); world.add(fogA);
  const fogB = fogCard(40, 3, 0x9a90d8, 0.35); fogB.position.set(0, 0.6, RZ - 8); world.add(fogB);
  const sky = skyDome(0x0e0a28, 0x3a2058); scene.add(sky);
  // lab stage: a dark studio floor + a tunnel (for the race car on the ceiling)
  const lab = new THREE.Group(); lab.position.x = 300; scene.add(lab);
  lab.add(mesh(boxG(30, 0.2, 30, 0.05), clay(0x1c1a2a), 0, -0.1, 0));
  const tunnel = new THREE.Group(); lab.add(tunnel);
  tunnel.add(mesh(boxG(5, 0.2, 30, 0.05), clay(0x3a3a48), 0, 4.2, 0)); // ceiling
  for (let i = 0; i < 8; i++) { const b = ball(glow(0xfff0c0, 1.6), 0, 4.05, 12 - i * 4, 0.12); b.castShadow = false; tunnel.add(b); }
  const f1 = new THREE.Group(); tunnel.add(f1); // a clay race car (upside down on the ceiling)
  { const p = glossy(0x1f5fd8, { rough: 0.2 }); f1.add(ball(p, 0, 0.35, 0, 0.42, 0.22, 1.9)); f1.add(mesh(boxG(1.6, 0.06, 0.35, 0.02), p, 0, 0.4, 1.85)); f1.add(mesh(boxG(1.3, 0.35, 0.08, 0.03), p, 0, 0.75, -1.75)); f1.add(mesh(boxG(1.3, 0.06, 0.4, 0.02), p, 0, 0.95, -1.75)); f1.add(ball(glossy(0x101014), 0, 0.55, 0.1, 0.22, 0.16, 0.4));
    for (const [x, z] of [[-0.7, 1.1], [0.7, 1.1], [-0.72, -1.15], [0.72, -1.15]]) { const w = mesh(cylG(0.32, 0.32, 0.34, 22), clay(0x111114)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); f1.add(w); } }

  // cast
  const car = roadster(); world.add(car.root);
  const you = makeChar({ seed: 51, outfit: "hoodie", shirt: 0x2a8a5a, pants: 0x2a2f45, hair: "short", hairColor: 0x3a2418, skin: SKIN.tan, h: 0.72 });
  car.body.add(you.root);
  const gh = ghost(); scene.add(gh.root);
  const ghBack = ghost(); car.body.add(ghBack.root);
  const kid = makeChar({ seed: 61, outfit: "pumpkin", hair: "stem", skin: SKIN.pink, h: 0.62 }); world.add(kid.root);
  const kid2 = makeChar({ seed: 62, outfit: "dress", shirt: 0x1a1a22, hair: "long", hairColor: 0x1a1a1a, skin: SKIN.brown, h: 0.66 }); world.add(kid2.root);
  // diagram pieces
  const aG = arrow(0xe8342a, "GRAVITY"), aT = arrow(0x30b8ff, "THRUST"), aD = arrow(0x9fe6ff, "DOWNFORCE"), aD2 = arrow(0x9fe6ff, "DOWNFORCE"), aGrip = arrow(0xf2c230, "GRIP LIMIT");
  [aG, aT, aD, aD2, aGrip].forEach((a) => scene.add(a));
  const air = airflow(); scene.add(air);
  const smoke = Array.from({ length: 14 }, (_, i) => { const s = ball(clay(0xb8b8c8, { transparent: true, opacity: 0.6, unique: true }), 0, 0, 0, 0.3); s.castShadow = false; scene.add(s); return s; });
  const sparks = Array.from({ length: 24 }, () => { const s = ball(glow(0xffd070, 2.2), 0, 0, 0, 0.035); s.castShadow = false; scene.add(s); return s; });
  const qm = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex([{ t: "?", size: 230, c: "#f2c230", stroke: 22, sc: "#12081a" }], { w: 256, h: 256 }), transparent: true, depthTest: false })); scene.add(qm);
  const years = new THREE.Group(); lab.add(years);
  const yr = ["2020", "2022", "2024", "2026", "2028?"].map((t, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: textTex([{ t, size: 150, c: i < 4 ? "#ffffff" : "#f2c230", stroke: 16, sc: "#12081a" }], { w: 512, h: 230, bg: i < 4 ? "#3a2a4a" : "#1a1228" }) })); years.add(p); return p; });
  const xs = yr.slice(0, 4).map((p) => { const x = new THREE.Group(); const m = clay(0xe8342a); x.add(limb(m, [-0.8, -0.35, 0.05], [0.8, 0.35, 0.05], 0.06)); x.add(limb(m, [-0.8, 0.35, 0.05], [0.8, -0.35, 0.05], 0.06)); p.add(x); return x; });

  // helpers
  let TT = 0;
  const seat = (c, x, z, p = {}) => { c.root.visible = true; c.root.position.set(x, -0.2, z); c.root.rotation.set(0, 0, 0); c.pose({ T: TT, legL: 1.45, legR: 1.45, kneeL: 1.45, kneeR: 1.45, armL: [1.05, 0.05, 0], armR: [1.05, 0.05, 0], elL: 0.55, elR: 0.55, smile: 0.4, blink: blinkAt(TT, c.o.seed), ...p }); };
  const put = (c, x, y, z, ry = 0, p = {}) => { c.root.visible = true; c.root.position.set(x, y, z); c.root.rotation.set(0, ry, 0); c.pose({ T: TT, smile: 0.4, blink: blinkAt(TT, c.o.seed), ...p }); };
  const carAt = (z, o = {}) => { car.root.visible = true; car.root.position.set(o.x ?? 0, o.y ?? 0, z); car.root.rotation.set(o.rx ?? 0, o.ry ?? Math.PI, o.rz ?? 0); car.set({ roll: z * 2.8, ...o }); };
  const shot = (pos, look, fov = 34, roll = 0) => aim(cam, V3(...pos), V3(...look), fov, roll);
  const W = (v) => car.root.localToWorld(v.clone()); // car-local → world
  const light = (o = {}) => {
    hemi.intensity = o.hemi ?? 0.6; key.intensity = o.ki ?? 2.0; key.color.set(o.key ?? 0xbcd0ff);
    const c = o.at || cam.position; key.position.set(c.x - 6, 12, c.z + 6); key.target.position.set(c.x, 0, c.z - 6);
    fill.position.set(c.x + 5, 2, c.z); fill.target.position.set(c.x, 1, c.z - 5); fill.intensity = o.fi ?? 0.7;
    rim.position.set(c.x + 3, 5, c.z - 12); rim.target.position.set(c.x, 1, c.z - 4);
    renderer.toneMappingExposure = o.exp ?? 1.1; scene.fog = o.fog === false ? null : new THREE.FogExp2(0x1a1236, o.fd ?? 0.022);
  };
  const flip = (a, o = {}) => { // the car on the ramp arc at angle u (0..1)
    const p = rampAt(a); car.root.visible = true; car.root.position.set(0, p.y + Math.cos(p.ang) * 0.0, RZ + p.z);
    car.root.rotation.set(p.ang, Math.PI, 0); car.root.rotation.order = "XYZ"; car.set({ roll: a * 40, ...o });
  };
  const burst = (at, t, n = 24) => sparks.forEach((s, i) => { if (i >= n || t < 0 || t > 0.9) { s.visible = false; return; } const r = rng(i + 7); const v = V3((r() - 0.5) * 6, r() * 5, (r() - 0.5) * 6); s.visible = true; s.position.copy(at).addScaledVector(v, t).add(V3(0, -4.9 * t * t, 0)); });
  const puff = (at, t, dir = 1) => smoke.forEach((s, i) => { const u = ((t * 0.9 + i / smoke.length) % 1); s.visible = t > 0; s.position.copy(at).add(V3(Math.sin(i * 2.3) * 0.4 * u, 0.2 + u * 0.9, dir * u * 2.2)); s.scale.setScalar(0.15 + u * 0.55); s.material.opacity = 0.65 * (1 - u); });

  const S = [];
  const add = (a, b, f) => S.push({ a, b, f });
  // A · 0.0 FRAME 1: the Roadster upside down at the top of the curved ramp, thrusters blazing, sparks
  add(0, 2.3, (t, T) => {
    light({ ki: 2.4, at: V3(0, 5, RZ) });
    const a = 0.84 + t * 0.03; flip(a, { thrust: 1, speed: 92 }); const p = rampAt(a);
    burst(V3(0, p.y - 0.2, RZ + p.z), (t * 1.6) % 0.9);
    shot([8.5 - t * 0.8, 3.4 + t * 0.4, RZ + 8.5], [0, 7.0, RZ - 1.0], 44, -0.06);
  });
  // B · 2.3 "A car should fall off the ceiling" — freeze-ish slow-mo, GRAVITY arrow pulls it down
  add(2.3, 4.05, (t, T) => {
    light({ at: V3(0, 5, RZ) }); const a = 0.87 + t * 0.006; flip(a, { thrust: 0.4, speed: 92 }); const p = rampAt(a);
    aG.set(V3(0, p.y - 0.6, RZ + p.z), V3(0, -1, 0), 3.0, eo(clamp(t / 0.4)), 0.3);
    shot([6.5, 7.2, RZ + 8.5], [0, 7.0, RZ - 0.6], 42);
  });
  // C · 4.05 "So how did it stay up?" — push in on the hanging car, a big question mark
  add(4.05, 6.15, (t, T) => {
    light({ at: V3(0, 5, RZ) }); const a = 0.88; flip(a, { thrust: 0.2, speed: 92 }); const p = rampAt(a);
    aG.set(V3(0, p.y - 0.6, RZ + p.z), V3(0, -1, 0), 3.0, 1, 0.3);
    qm.visible = true; qm.position.set(1.8, p.y - 1.2, RZ + p.z + 1.2); const qs = back(clamp((t - 0.4) / 0.3)) * 1.5; qm.scale.set(qs, qs, 1);
    shot([5.5 - t * 0.6, 7.0, RZ + 7.5 - t * 0.8], [0.4, 7.2, RZ - 1.0], 40);
  });
  // D · 6.15 "Imagine you're driving it... on Halloween night." — cruising past the cemetery, kids in costumes
  add(6.15, 7.7, (t, T) => {
    light({}); const z = 6 - t * 9; carAt(z, { speed: 25 });
    seat(you, -0.32, -0.3, { smile: 0.8 });
    put(kid, -3.9, 0, -1.2, Math.PI / 2, { armR: [1.8, 0.4, 0], elR: 0.6 + 0.4 * Math.abs(Math.sin(T * 7)), smile: 1 }); put(kid2, -4.4, 0, -1.8, Math.PI / 2, { armL: [1.5, 0.2, 0], smile: 0.8 });
    shot([-5.5, 1.2, 4.5 - t * 6], [0, 0.7, z - 2], 36);
  });
  add(7.7, 9.2, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(-8 - t * 6, { speed: 25, glassOp: 0.18 });
    seat(you, -0.32, -0.3, { smile: 0.6, headYaw: 0.25 * Math.sin(T * 1.5), lookX: 0.4, brow: 0.2 });
    const h = W(V3(-0.32, 0.95, 0.9));
    aim(cam, h, W(V3(-0.32, 0.95, -0.4)), 44);
  });
  // E · 9.2 "Can you drive me home?" — the ghost girl in the headlights by the cemetery gate
  add(9.2, 10.95, (t, T) => {
    light({ ki: 1.4, fi: 1.1, at: V3(0, 1, -16) }); carAt(-11.5, { speed: 0 });
    gh.root.visible = true; gh.root.position.set(0.3, 0.05 * Math.sin(T * 2), -16.5); gh.root.rotation.set(0, 0, 0);
    gh.pose({ T, smile: -0.05, lids: 0.15, open: lip("ghost", T) * 0.6, headTilt: 0.25, lookY: 0.15, armL: [0.2, 0.2, 0], armR: [0.2, 0.2, 0] }); gh.setFade(0.9 + 0.1 * Math.sin(T * 9));
    shot([0.6, 1.3, -12.6 + t * 0.2], [0.3, 1.15, -16.5], 38);
  });
  // F · 10.95 "Nope!" — your face, through the windscreen
  add(10.95, 11.75, (t, T) => {
    light({ at: V3(0, 1, -8) }); carAt(-11.5, { speed: 0, glassOp: 0.12 });
    seat(you, -0.32, -0.3, { wide: 1, brow: 1, open: 0.2 + lip("you", T) * 0.8, smile: -0.4, sq: 0.1, headYaw: 0.15 });
    aim(cam, W(V3(-0.3, 0.98, 1.1)), W(V3(-0.32, 0.92, -0.3)), 36);
  });
  // G · 11.75 "You floor it. Tesla claims 0–60 in under one second." — launch, thrusters, the ghost left behind; then the screen
  add(11.75, 14.0, (t, T) => {
    light({ at: V3(0, 1, -14) }); const k = ei(clamp(t / 1.0)), z = -11.5 - k * 6 - Math.max(0, t - 1.0) * 30;
    carAt(z, { speed: lerp(0, 60, clamp(t / 0.95)), thrust: t < 1.6 ? 1 : 0.4, tilt: -0.04 * Math.exp(-t * 3) });
    seat(you, -0.32, -0.3, { sq: 0.25, wide: 0.6, brow: 0.8, open: 0.4 });
    puff(V3(0, 0.1, -10.5), t * 1.4, 1);
    gh.root.visible = true; gh.root.position.set(0.3, 0.1, -16.5 + t * 0.2); gh.pose({ T, armL: [1.8, 0.3, 0], armR: [1.8, 0.3, 0], open: 0.3, wide: 0.5, brow: 0.6 }); gh.setFade(0.9);
    shot([2.6, 0.9, -8.5], [0, 0.8, -15 - t * 6], 38, wob(T, 0.02, 4));
  });
  add(14.0, 15.95, (t, T) => {
    light({ at: V3(0, 1, -40) }); carAt(-40, { speed: 60, glassOp: 0.12 });
    seat(you, -0.32, -0.3, { sq: 0.2, wide: 0.6, brow: 0.6, open: 0.3 });
    aim(cam, W(V3(0.12, 1.25, 1.25)), W(V3(0.02, 0.86, 0.42)), 34);
  });
  // H · 15.95 "Almost three G's. Normal tires can't grip that hard. They'd just spin." — face squashed, then the tyre spinning in smoke
  add(15.95, 18.0, (t, T) => {
    light({ at: V3(0, 1, -40) }); carAt(-40, { speed: 60, glassOp: 0.12 });
    seat(you, -0.32, -0.3, { sq: 0.45 + 0.1 * Math.sin(T * 30), wide: 0.3, lids: 0.6, brow: -0.4, open: 0.15, headPitch: -0.3 });
    aim(cam, W(V3(-0.32, 1.05, 0.75)), W(V3(-0.32, 0.95, -0.3)), 38, wob(T, 0.03, 8));
  });
  add(18.0, 20.95, (t, T) => {
    light({ at: V3(300, 1, 0), fog: false, hemi: 0.8 }); car.root.visible = true; car.root.position.set(300, 0, 0); car.root.rotation.set(0, Math.PI / 2, 0); car.set({ roll: T * 40, speed: 0 });
    puff(V3(300 - 1.35, 0.1, 0.95), t * 0.8, 0.5);
    aGrip.set(V3(300 - 1.35, 0.05, 1.4), V3(-1, 0, 0), 1.2 + 0.25 * Math.sin(T * 25), eo(clamp((t - 0.6) / 0.4)), 0.35);
    shot([300 - 0.2, 1.0, 5.0], [300 - 1.1, 0.45, 0.9], 38);
  });
  // I · 21.0 "So it has thrusters, like a tiny rocket. They push the car without needing grip." — the nozzles fire, THRUST arrow
  add(21.0, 23.5, (t, T) => {
    light({ at: V3(0, 1, -50) }); carAt(-50 - t * 4, { speed: 60, thrust: eo(clamp(t / 0.3)) });
    const n = W(V3(0, 0.4, -2.4)); aT.set(W(V3(0, 1.3, -1.0)), W(V3(0, 1.3, 1)).sub(W(V3(0, 1.3, -1))), 2.2, eo(clamp((t - 0.6) / 0.4)), 0.4);
    shot([n.x + 3.6, 1.5, n.z - 5.0], [n.x, 0.7, n.z + 1.6], 40);
  });
  add(23.5, 25.95, (t, T) => {
    light({ at: V3(300, 1, 0), fog: false, hemi: 0.8 }); car.root.visible = true; car.root.position.set(300 - t * 1.2, 0.12, 0); car.root.rotation.set(0, -Math.PI / 2, 0); car.set({ roll: 0, speed: 0, thrust: 1 });
    aT.set(V3(300 - t * 1.2 + 1.2, 1.55, 0), V3(-1, 0, 0), 2.4, 1, 0.4);
    aGrip.set(V3(300 - t * 1.2 - 1.35, 0.05, 1.3), V3(-1, 0, 0), 0.6, eo(clamp(t / 0.3)) * 0.6, 0.35);
    shot([300 - 0.6 - t * 1.2, 1.8, 9.0], [300 - t * 1.2, 1.0, 0], 42);
  });
  // J · 26.0 "But the ghost is still gaining. Then you see a ramp." — she flies after you; the ramp looms ahead
  add(26.0, 27.6, (t, T) => {
    light({ at: V3(0, 1, -40) }); const z = -38 - t * 10; carAt(z, { speed: 60, thrust: 0.6 });
    gh.root.visible = true; gh.root.position.set(0.6 * Math.sin(T * 3), 1.0 + 0.3 * Math.sin(T * 5), z + 7 - t * 2.5); gh.root.rotation.set(-0.5, Math.PI, 0); gh.pose({ T, armL: [2.8, 0.2, 0], armR: [2.8, 0.2, 0], open: 0.7, wide: 1, brow: -0.8, smile: -0.5 }); gh.setFade(0.85);
    shot([1.8, 1.8, z + 12], [0, 1, z - 2], 40);
  });
  add(27.6, 29.1, (t, T) => {
    light({ at: V3(0, 3, RZ + 6) }); const z = RZ + 24 - t * 12; carAt(z, { speed: 60, thrust: 0.6 });
    shot([0.9, 1.1, z + 5], [0, 4, RZ - 2], 42);
  });
  // K · 29.1 "Here's the trick. Fast cars make downforce. The air pushes them into the road." — airflow + DOWNFORCE arrows
  add(29.1, 34.15, (t, T) => {
    light({ at: V3(300, 1, 0), fog: false, hemi: 0.8 }); car.root.visible = true; car.root.position.set(300, 0, 0); car.root.rotation.set(0, 0, 0); car.set({ roll: T * 40, speed: 0 });
    air.visible = true; air.position.set(300, 0, 0); air.set(T, eo(clamp((t - 0.3) / 0.6)));
    const k = eo(clamp((t - 1.6) / 0.5));
    aD.set(V3(300, 3.0, 1.0), V3(0, -1, 0), 1.6, k, 0.3); aD2.set(V3(300, 3.0, -1.2), V3(0, -1, 0), 1.6, k, 0.3);
    aG.set(V3(300, 0.4, 0), V3(0, -1, 0), 1.0, eo(clamp((t - 3.2) / 0.4)), -1.6);
    shot([300 + 6.8, 2.0, 0.6], [300, 1.0, 0], 40);
  });
  // L · 34.15 "Go fast enough, and that push beats gravity. In theory, a race car could drive on a ceiling."
  add(34.15, 36.8, (t, T) => {
    light({ at: V3(300, 1, 0), fog: false, hemi: 0.8 }); car.root.visible = true; car.root.position.set(300, 0, 0); car.root.rotation.set(0, 0, 0); car.set({ roll: T * 40 });
    air.visible = true; air.position.set(300, 0, 0); air.set(T * 2, 1);
    const g = 1.0 - eo(clamp((t - 0.4) / 0.8)) * 0.3, d = 1.4 + eo(clamp((t - 0.4) / 0.8)) * 1.6;
    aD.set(V3(300, 1.25 + d + 0.6, 0), V3(0, -1, 0), d, 1, 0.3); aG.set(V3(300, 0.4, 0), V3(0, -1, 0), g, 1, -1.6);
    shot([300 + 6.8, 2.2, 0.6], [300, 1.4, 0], 42);
  });
  add(36.8, 40.25, (t, T) => {
    light({ at: V3(300, 2, 0), fog: false, hemi: 0.7 }); f1.visible = true; tunnel.visible = true;
    f1.position.set(0, 4.1, 10 - ((t * 9) % 24)); f1.rotation.set(0, 0, Math.PI);
    aD.set(V3(300, 2.0, f1.position.z), V3(0, 1, 0), 1.6, eo(clamp((t - 0.3) / 0.4)), 0.3); aG.set(V3(300, 3.2, f1.position.z - 0.2), V3(0, -1, 0), 0.9, eo(clamp((t - 0.5) / 0.4)), -1.4);
    shot([300 + 3.5, 1.2, f1.position.z + 8.5], [300, 3.4, f1.position.z], 42);
  });
  // M · 40.25 "Thrusters can add that push. So on the curved ramp, it sticks... even upside down."
  add(40.25, 45.8, (t, T) => {
    light({ ki: 2.2, at: V3(0, 5, RZ) });
    const a = t < 1.0 ? -0.05 + t * 0.05 : clamp((t - 1.0) / 4.0) * 0.98;
    if (a < 0) { carAt(RZ + 6 - t * 6, { speed: 60, thrust: 1 }); } else flip(a, { thrust: 1, speed: 60 });
    const p = rampAt(Math.max(0, a)), c = V3(0, p.y, RZ + p.z), toC = V3(0, Math.cos(p.ang), Math.sin(p.ang));
    aT.set(c.clone().addScaledVector(toC, 3.4), toC.clone().negate(), 2.0, eo(clamp((t - 1.4) / 0.4)), 0.4);
    shot([7.5, 4.0 + p.y * 0.3, RZ + 6.5], [0, 2.0 + p.y * 0.6, RZ - 2.5], 44);
  });
  // N · 45.8 "You flip, and fly over the graveyard. You lost her." — airborne over the tombstones under the moon
  add(45.8, 49.3, (t, T) => {
    light({ ki: 1.8, at: V3(0, 4, RZ - 12) });
    const u = clamp(t / 3.5), y = 9 + 4 * Math.sin(u * Math.PI) - u * 6, z = RZ - 2 - u * 26;
    car.root.visible = true; car.root.position.set(0, y, z); car.root.rotation.set(Math.PI * (1 - eo(clamp(t / 1.2))) + 0.15 * Math.sin(u * 3), Math.PI, 0); car.set({ roll: T * 30, thrust: 0.8, speed: 120 });
    gh.root.visible = true; gh.root.position.set(1.2, 1.0 + t * 0.4, RZ + 2 - t * 2); gh.root.rotation.set(0, Math.PI, 0); gh.pose({ T, armL: [2.4, 0.4, 0], armR: [2.4, 0.4, 0], open: 0.4, brow: 0.8 }); gh.setFade(0.8 - t * 0.15);
    shot([-6, 3.0, RZ - 14], [0, y, z], 46);
  });
  // O · 49.3 "Nice car." — the ghost, calmly, in the back seat
  add(49.3, 50.9, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(-6, { speed: 30, glassOp: 0.12 });
    seat(you, -0.32, -0.3, { smile: 0.7, lids: 0.3 });
    seat(ghBack, 0.3, -1.05, { smile: 0.5, open: lip("ghost", T) * 0.6, lids: 0.2, headTilt: 0.2, armL: [0.5, 0.1, 0], armR: [0.5, 0.1, 0] }); ghBack.setFade(0.9);
    aim(cam, W(V3(-0.1, 1.3, 0.95)), W(V3(0.3, 0.98, -1.05)), 46);
  });
  // P · 50.9 "She's in the back seat." — your face, the screen flips: PASSENGERS: 2
  add(50.9, 52.6, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(-6, { speed: 30, glassOp: 0.12, pax: t > 0.5 ? 2 : 1, warn: t > 0.5 });
    seat(you, -0.32, -0.3, { wide: 1, brow: 1, open: 0.7, smile: -0.6, lookX: 0.6, headYaw: 0.5 * eo(clamp(t / 0.3)) });
    seat(ghBack, 0.3, -1.05, { smile: 0.8, lids: 0.1 }); ghBack.setFade(0.9);
    aim(cam, W(V3(0.2, 1.08, 0.95)), W(V3(-0.15, 0.92, 0.0)), 40);
  });
  // Q · 52.6 "Tesla says it ships in 2028. It's missed dates before." — years crossed out; then she waves as you drive off
  add(52.6, 56.0, (t, T) => {
    light({ at: V3(300, 2, 0), fog: false, hemi: 0.9 }); years.visible = true;
    yr.forEach((p, i) => { const k = back(clamp((t - i * 0.35) / 0.25)); p.position.set((i - 2) * 0.0, 3.2 - i * 0.0, -i * 0.02); p.position.set(-1.3 + (i % 2) * 2.6, 4.4 - Math.floor(i / 2) * 1.3, 0); if (i === 4) p.position.set(0, 0.7, 0.2); p.scale.setScalar(Math.max(0.001, k)); if (i < 4) xs[i].scale.setScalar(Math.max(0.001, back(clamp((t - 0.25 - i * 0.35) / 0.2)))); });
    shot([300, 3.1, 10.5], [300, 3.0, 0], 44);
  });
  add(56.0, 61.0, (t, T) => {
    light({}); const z = -4 - t * 3; carAt(z, { speed: 30, glassOp: 0.5 });
    seat(you, -0.32, -0.3, { smile: -0.2, brow: 0.7 });
    seat(ghBack, 0.3, -1.05, { smile: 0.9, armR: [2.7, 0.4, 0], elR: 0.4 + 0.4 * Math.abs(Math.sin(T * 6)) }); ghBack.setFade(0.9);
    shot([2.0, 1.6, z - 6 + t * 0.4], [0, 0.9, z], 38);
  });

  return { render(T) {
    TT = T;
    [aG, aT, aD, aD2, aGrip, air, qm, years, tunnel, f1].forEach((o) => (o.visible = false));
    smoke.forEach((s) => (s.visible = false)); sparks.forEach((s) => (s.visible = false));
    [you, gh, ghBack, kid, kid2].forEach((c) => (c.root.visible = false)); car.root.visible = false;
    tick(T); tick2(T);
    const s = S.find((x) => T >= x.a && T < x.b) || S[S.length - 1];
    s.f(T - s.a, T);
    sky.position.copy(cam.position);
    renderer.render(scene, cam);
  } };
}
