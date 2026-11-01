// @ts-nocheck
// ROADSTER GHOST v2 · fast ghost-chase wrapper around three surprising bits of physics:
// ~3 G (double a rocket liftoff), thrust without grip (the balloon), and why a car sticks upside down on a loop (~20 mph).
import { THREE, makeRenderer, makeCamera, aim, V3, clamp, lerp, seg, eio, eo, ei, back, rng } from "./base.js";
import { makeChar, SKIN, clay, glossy, glow, mesh, ball, limb, boxG, cylG, textTex } from "./clay.js";
import { tick, pumpkin, tree, skyDome, fogCard, halo, car as toyCar } from "./sets.js";
import { roadster, ghost, cemetery, road, flipRamp, rampAt, tick2 } from "./roadster.js";
import LIPS from "./lips.json";

const FPS = 30;
const lip = (who, T) => { const a = LIPS[who]; if (!a) return 0; const f = T * FPS, i = Math.floor(f), k = f - i; return lerp(a[i] || 0, a[i + 1] || 0, k); };
const blinkAt = (T, seed = 0) => { const p = (T + seed * 1.37) % 3.1; return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0; };
const wob = (T, a = 1, f = 1, s = 0) => a * (Math.sin(T * f * 1.3 + s) * 0.6 + Math.sin(T * f * 2.9 + s * 2) * 0.4);
const RZ = -70, R = 4.5, ATOP = 1 / 1.15; // ramp base z; ramp radius; arc fraction at the very top (upside down)

function arrow(color, label) {
  const g = new THREE.Group(), m = clay(color, { rough: 0.35 });
  const shaft = mesh(cylG(0.09, 0.09, 1, 18), m); shaft.position.y = 0.5; g.add(shaft);
  const head = mesh(new THREE.ConeGeometry(0.22, 0.4, 20), m); g.add(head);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex([{ t: label, size: 100, c: "#ffffff", stroke: 16, sc: "#12081a" }], { w: 1024, h: 180 }), depthTest: false, transparent: true }));
  tag.scale.set(2.6, 0.46, 1); g.add(tag);
  g.set = (from, dir, len, k = 1, tagOff = 0.4) => {
    g.visible = k > 0.01; const L = Math.max(0.01, len * k);
    g.position.copy(from); g.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
    shaft.scale.set(1, L, 1); head.position.y = L + 0.18; tag.position.set(0, L + 0.25 + tagOff, 0); tag.material.opacity = clamp(k * 2 - 0.6);
  };
  return g;
}
function loopTrack(Rl, color = 0xe8761c) { // a full vertical loop of track segments, centred at (0, Rl, 0), in the y-z plane
  const g = new THREE.Group(), m = clay(color, { rough: 0.4 }), n = 36;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const s = mesh(boxG(2.4, 0.14, (Math.PI * 2 * Rl) / n + 0.05, 0.03), m, 0, Rl - Math.cos(a) * Rl, -Math.sin(a) * Rl); s.rotation.x = a; g.add(s); }
  for (const s of [-1, 1]) g.add(limb(clay(0x3a3a44), [s * 1.4, 0, 0], [s * 1.4, Rl, 0], 0.08));
  return g;
}

export function makeFilm(canvas) {
  const { renderer, env } = makeRenderer(canvas, { exposure: 1.0, shadows: true });
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0a0814, 1);
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.6;
  const hemi = new THREE.HemisphereLight(0x8a90e8, 0x1a2018, 0.6); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xbcd0ff, 2.0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 80 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xff9a50, 0.8); scene.add(fill, fill.target);
  const rim = new THREE.DirectionalLight(0xb080ff, 1.5); scene.add(rim, rim.target);
  const cam = makeCamera(34);
  // ---- night world: road, cemetery, trees, pumpkins, the flip ramp
  const world = new THREE.Group(); scene.add(world);
  world.add(road(170));
  const cem = cemetery(); cem.position.set(9, 0, -6); cem.rotation.y = -Math.PI / 2; world.add(cem);
  const cem2 = cemetery(); cem2.position.set(-9, -0.02, RZ + 22); cem2.rotation.y = Math.PI / 2; world.add(cem2);
  [[-6, 4], [-7, -16], [-6.5, -30], [7, -36], [-6, -48], [6.5, -52]].forEach(([x, z], i) => { const t = tree(3 + (i % 3) * 0.5, 10 + i); t.position.set(x, 0, z); world.add(t); });
  [[-3.8, -3], [-3.6, 1.5], [3.9, -20], [-3.8, -26], [3.7, -44]].forEach(([x, z], i) => { const p = pumpkin(0.9, 80 + i); p.position.set(x, 0, z); world.add(p); });
  const ramp = flipRamp(); ramp.position.set(0, 0, RZ); world.add(ramp);
  const fogA = fogCard(40, 3, 0x9a90d8, 0.35); fogA.position.set(0, 0.6, -20); world.add(fogA);
  const sky = skyDome(0x0e0a28, 0x3a2058); scene.add(sky);
  // ---- lab: dark studio floor with a second ramp (side views), the rocket, the balloon, the 2012 loops
  const lab = new THREE.Group(); lab.position.x = 300; scene.add(lab);
  lab.add(mesh(boxG(80, 0.2, 60, 0.05), clay(0x1c1a2a), 0, -0.1, 0));
  const ramp2 = flipRamp(); lab.add(ramp2);
  const rocket = new THREE.Group(); rocket.position.set(-12, 0, -2); lab.add(rocket);
  { const w = clay(0xeeeeee), k = clay(0x1a1a1e); rocket.add(mesh(cylG(0.35, 0.35, 5, 24), w, 0, 2.7, 0)); rocket.add(mesh(new THREE.ConeGeometry(0.35, 0.9, 24), k, 0, 5.65, 0)); rocket.add(mesh(cylG(0.36, 0.36, 0.5, 24), k, 0, 4.0, 0));
    for (let i = 0; i < 4; i++) { const f = mesh(boxG(0.06, 0.7, 0.5, 0.02), k, 0, 0.55, 0); const fg = new THREE.Group(); fg.rotation.y = (i / 4) * Math.PI * 2; f.position.z = 0.4; fg.add(f); rocket.add(fg); } }
  const rflame = new THREE.Group(); rocket.add(rflame);
  for (let i = 0; i < 6; i++) { const b = ball(glow([0xffe070, 0xffa020, 0xff5a10][i % 3], 1.8), 0, -0.2 - i * 0.25, 0, 0.3 - i * 0.03); b.castShadow = false; rflame.add(b); }
  const balloon = new THREE.Group(); lab.add(balloon);
  balloon.add(ball(glossy(0xe8342a, { rough: 0.2 }), 0, 0, 0, 0.45, 0.55, 0.45)); balloon.add(ball(glossy(0xe8342a), 0, -0.6, 0, 0.07));
  const loops = [loopTrack(5, 0xe8761c), loopTrack(5, 0xe8761c)]; loops.forEach((l, i) => { l.position.set(-30 + i * 3.2, 0, -10); lab.add(l); });
  const lc = [toyCar(0xe8761c), toyCar(0x2a6ad8)]; lc.forEach((c) => { c.scale.setScalar(0.5); lab.add(c); });
  // ---- cast
  const car = roadster(); world.add(car.root);
  const cabinLight = new THREE.PointLight(0xbfdcff, 1.4, 2.6, 1.5); cabinLight.position.set(0, 1.0, 0.25); car.body.add(cabinLight);
  const you = makeChar({ seed: 51, outfit: "hoodie", shirt: 0x2a8a5a, pants: 0x2a2f45, hair: "short", hairColor: 0x3a2418, skin: SKIN.tan, h: 0.6 });
  car.body.add(you.root);
  const gh = ghost(0.9); scene.add(gh.root);
  const ghBack = ghost(0.6); car.body.add(ghBack.root);
  const kid = makeChar({ seed: 61, outfit: "pumpkin", hair: "stem", skin: SKIN.pink, h: 0.62 }); world.add(kid.root);
  const kid2 = makeChar({ seed: 62, outfit: "dress", shirt: 0x1a1a22, hair: "long", hairColor: 0x1a1a1a, skin: SKIN.brown, h: 0.66 }); world.add(kid2.root);
  const aIn = arrow(0xf2c230, "TRACK PUSHES IN"), aStr = arrow(0xe8342a, "WANTS TO GO STRAIGHT"), aGas = arrow(0x9fe6ff, "GAS OUT"), aGo = arrow(0x30d070, "CAR GOES"), aG = arrow(0xe8342a, "GRAVITY");
  [aIn, aStr, aGas, aGo, aG].forEach((a) => scene.add(a));
  const smoke = Array.from({ length: 14 }, () => { const s = ball(clay(0xb8b8c8, { transparent: true, opacity: 0.6, unique: true }), 0, 0, 0, 0.3); s.castShadow = false; scene.add(s); return s; });
  const sparks = Array.from({ length: 24 }, () => { const s = ball(glow(0xffd070, 2.2), 0, 0, 0, 0.035); s.castShadow = false; scene.add(s); return s; });
  const streaks = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.5 })); streaks.frustumCulled = false; scene.add(streaks);
  const years = new THREE.Group(); lab.add(years);
  const yr = ["2020", "2022", "2024", "2026", "2028?"].map((t, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: textTex([{ t, size: 150, c: i < 4 ? "#ffffff" : "#f2c230", stroke: 16, sc: "#12081a" }], { w: 512, h: 230, bg: i < 4 ? "#3a2a4a" : "#1a1228" }) })); years.add(p); return p; });
  const xs = yr.slice(0, 4).map((p) => { const x = new THREE.Group(); const m = clay(0xe8342a); x.add(limb(m, [-0.8, -0.35, 0.05], [0.8, 0.35, 0.05], 0.06)); x.add(limb(m, [-0.8, 0.35, 0.05], [0.8, -0.35, 0.05], 0.06)); p.add(x); return x; });
  years.position.set(0, 0, 30);

  // ---- helpers
  let TT = 0;
  const seat = (c, i, p = {}) => { const [x, z] = car.seatAt[i]; c.root.visible = true; c.root.position.set(x, 0.05, z + 0.04); c.root.rotation.set(0, 0, 0); c.pose({ T: TT, legL: 1.45, legR: 1.45, kneeL: 1.45, kneeR: 1.45, armL: [1.05, 0.05, 0], armR: [1.05, 0.05, 0], elL: 0.55, elR: 0.55, smile: 0.4, blink: blinkAt(TT, c.o.seed), ...p }); };
  const put = (c, x, y, z, ry = 0, p = {}) => { c.root.visible = true; c.root.position.set(x, y, z); c.root.rotation.set(0, ry, 0); c.pose({ T: TT, smile: 0.4, blink: blinkAt(TT, c.o.seed), ...p }); };
  const carAt = (x, z, o = {}) => { car.root.visible = true; car.root.position.set(x, o.y ?? 0, z); car.root.rotation.set(o.rx ?? 0, o.ry ?? Math.PI, o.rz ?? 0); car.set({ roll: -z * 2.6, ...o }); };
  const shot = (pos, look, fov = 34, roll = 0) => aim(cam, V3(...pos), V3(...look), fov, roll);
  const W = (v) => { car.root.updateMatrixWorld(true); return car.body.localToWorld(v.clone()); };
  const inCar = (from, to, fov = 48, roll = 0) => aim(cam, W(V3(...from)), W(V3(...to)), fov, roll);
  const light = (o = {}) => {
    hemi.intensity = o.hemi ?? 0.6; key.intensity = o.ki ?? 2.0; key.color.set(o.key ?? 0xbcd0ff);
    const c = o.at || cam.position; key.position.set(c.x - 6, 12, c.z + 6); key.target.position.set(c.x, 0, c.z - 6);
    fill.position.set(c.x + 5, 2, c.z); fill.target.position.set(c.x, 1, c.z - 5); fill.intensity = o.fi ?? 0.7;
    rim.position.set(c.x + 3, 5, c.z - 12); rim.target.position.set(c.x, 1, c.z - 4);
    renderer.toneMappingExposure = o.exp ?? 1.1; scene.fog = o.fog === false ? null : new THREE.FogExp2(0x1a1236, o.fd ?? 0.02);
  };
  // the stunt, in real time: tt = seconds since the car hits the ramp base. 0→0.62 s up and over (upside down at the top);
  // then airborne inverted toward +z, a thruster barrel-roll to upright in ~0.5 s, flying low over the road.
  const TUP = 0.62;
  const stunt = (tt, ox = 0, baseZ = RZ, o = {}) => {
    car.root.visible = true;
    if (tt < 0) { car.root.position.set(ox, 0, baseZ - tt * 22); car.root.rotation.set(0, Math.PI, 0); car.set({ roll: tt * 60, speed: 50, thrust: o.thrust ?? 0.5, ...o }); return { phase: 0 }; }
    if (tt < TUP) { const a = (tt / TUP) * ATOP, p = rampAt(a, R); car.root.position.set(ox, p.y, baseZ + p.z); car.root.rotation.set(p.ang, Math.PI, 0); car.set({ roll: tt * 60, speed: 48, thrust: 1, ...o }); return { phase: 1, a }; }
    const u = tt - TUP, rollK = eio(clamp(u / 0.5));
    const y = 2 * R + 1.6 * u - 0.6 * u * u, z = baseZ + 19 * u;
    car.root.position.set(ox, Math.max(0, y - Math.max(0, u - 1.2) * 3.2), z); car.root.rotation.set(Math.PI, Math.PI, Math.PI * rollK); car.set({ roll: tt * 50, speed: 52, thrust: 1, ...o });
    return { phase: 2, u };
  };
  const burst = (at, t, n = 24) => sparks.forEach((s, i) => { if (i >= n || t < 0 || t > 0.9) { s.visible = false; return; } const r = rng(i + 7); const v = V3((r() - 0.5) * 6, r() * 5, (r() - 0.5) * 6); s.visible = true; s.position.copy(at).addScaledVector(v, t).add(V3(0, -4.9 * t * t, 0)); });
  const puff = (at, t, dir = 1, k = 1) => smoke.forEach((s, i) => { const u = ((t * 0.9 + i / smoke.length) % 1); s.visible = t > 0; s.position.copy(at).add(V3(Math.sin(i * 2.3) * 0.4 * u, 0.2 + u * 0.9, dir * u * 2.2)); s.scale.setScalar((0.15 + u * 0.55) * k); s.material.opacity = 0.65 * (1 - u); });
  const speedLines = (center, T, k = 1) => { const r = rng(9), pos = []; for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 10, y = r() * 5, z0 = ((r() * 30 - T * 40 * (0.7 + r())) % 30 + 30) % 30 - 15; pos.push(center.x + x, center.y + y, center.z + z0, center.x + x, center.y + y, center.z + z0 + 2.5); } streaks.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); streaks.material.opacity = 0.5 * k; streaks.visible = k > 0.01; };

  const S = [];
  const add = (a, b, f) => S.push({ a, b, f });
  // ===== HOOK 0.0 — FRAME 1 the car is already rocketing up the ramp; over the top, thrusters, barrel roll — real time
  add(0, 1.0, (t, T) => {
    light({ ki: 2.4, at: V3(0, 5, RZ) }); const tt = 0.18 + t * 0.62; const st = stunt(tt);
    burst(V3(0, 0.3, RZ - 1), tt);
    shot([7.5, 2.2, RZ + 6], [0, 4.5 + t * 3, RZ - 2], 46, -0.05 + wob(T, 0.01, 6));
  });
  add(1.0, 1.97, (t, T) => {
    light({ ki: 2.2, at: V3(0, 5, RZ + 8) }); const tt = TUP + 0.18 + t * 0.9; stunt(tt);
    const p = car.root.position; speedLines(V3(0, 0, p.z), T, 0.8);
    shot([-4.5, 5.5, p.z + 9 - t * 2], [p.x, p.y, p.z], 44);
  });
  // ===== SECOND HOOK 1.97 "And the crazy part? It barely needs any speed." — inside, upside down, the screen reads 20
  add(1.97, 3.6, (t, T) => {
    light({ at: V3(0, 8, RZ) }); const p = rampAt(ATOP, R); car.root.visible = true; car.root.position.set(0, p.y, RZ + p.z); car.root.rotation.set(Math.PI, Math.PI, 0); car.set({ speed: 20, glassOp: 0.35, roll: T * 8 });
    seat(you, 0, { wide: 1, brow: 1, open: 0.5, smile: 0.2, lookX: 0.5 });
    inCar([0.35, 1.0, 0.42], [-0.15, 0.9, -0.2], 52);
  });
  add(3.6, 5.31, (t, T) => {
    light({ at: V3(0, 8, RZ) }); const a = ATOP - 0.08 + t * 0.06, p = rampAt(a, R); car.root.visible = true; car.root.position.set(0, p.y, RZ + p.z); car.root.rotation.set(p.ang, Math.PI, 0); car.set({ speed: 20, roll: T * 8 });
    aG.set(V3(0, p.y - 0.9, RZ + p.z), V3(0, -1, 0), 2.2, eo(clamp(t / 0.3)), 0.2);
    shot([6.0, 6.0, RZ + 6.5], [0, 7.6, RZ - 0.5], 42);
  });
  // ===== 5.31 "Imagine you're driving it, on Halloween night." — past the cemetery, costumed kids; then inside
  add(5.31, 6.55, (t, T) => {
    light({}); const z = 6 - t * 9; carAt(0, z, { speed: 25, glassOp: 0.6 }); seat(you, 0, { smile: 0.8 });
    put(kid, -3.9, 0, -1.2, Math.PI / 2, { armR: [1.8, 0.4, 0], elR: 0.6 + 0.4 * Math.abs(Math.sin(T * 7)), smile: 1 }); put(kid2, -4.4, 0, -1.8, Math.PI / 2, { armL: [1.5, 0.2, 0], smile: 0.8 });
    shot([-5.2, 1.1, 4.0 - t * 6], [0, 0.7, z - 1.5], 38);
  });
  add(6.55, 7.86, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(0, -6 - t * 6, { speed: 25, glassOp: 0.3 });
    seat(you, 0, { smile: 0.7, headYaw: 0.3 * Math.sin(T * 1.5), lookX: 0.4, armR: [1.05, 0.05, 0] });
    inCar([-0.2, 1.05, 0.5], [-0.42, 0.9, -0.3], 54);
  });
  // ===== 7.86 "Can you drive me home?" — the ghost in the headlights
  add(7.86, 9.45, (t, T) => {
    light({ ki: 1.4, fi: 1.1, at: V3(0, 1, -16) }); carAt(0, -11.5, { speed: 0 });
    gh.root.visible = true; gh.root.position.set(0.3, 0.05 * Math.sin(T * 2), -16.5); gh.root.rotation.set(0, 0, 0);
    gh.pose({ T, smile: -0.05, lids: 0.15, open: lip("ghost", T) * 0.6, headTilt: 0.25, lookY: 0.15, armL: [0.2, 0.2, 0], armR: [0.2, 0.2, 0] }); gh.setFade(0.9 + 0.1 * Math.sin(T * 9));
    shot([0.6, 1.25, -12.8 + t * 0.4], [0.3, 1.15, -16.5], 38);
  });
  // ===== 9.49 "Nope!"
  add(9.45, 10.16, (t, T) => {
    light({ at: V3(0, 1, -8) }); carAt(0, -11.5, { speed: 0, glassOp: 0.3 });
    seat(you, 0, { wide: 1, brow: 1, open: 0.2 + lip("you", T) * 0.8, smile: -0.4, sq: 0.1, headYaw: 0.15 });
    inCar([-0.38, 0.98, 0.5], [-0.42, 0.92, -0.3], 46);
  });
  // ===== 10.16 "You floor it. Tesla claims 0–60 in under a second." — launch; screen 0→60
  add(10.16, 11.3, (t, T) => {
    light({ at: V3(0, 1, -14) }); const k = ei(clamp(t / 0.9)), z = -11.5 - k * 7;
    carAt(0, z, { speed: lerp(0, 60, clamp(t / 0.9)), thrust: 1, tilt: -0.05 * Math.exp(-t * 3) });
    puff(V3(0, 0.1, -10.5), t * 1.4, 1);
    gh.root.visible = true; gh.root.position.set(0.3, 0.1, -16.5 + t * 0.2); gh.pose({ T, armL: [1.8, 0.3, 0], armR: [1.8, 0.3, 0], open: 0.3, wide: 0.5, brow: 0.6 }); gh.setFade(0.9);
    shot([2.4, 0.8, -8.0], [0, 0.8, -14 - t * 6], 40, wob(T, 0.02, 5));
  });
  add(11.3, 12.6, (t, T) => {
    light({ at: V3(0, 1, -30) }); carAt(0, -30 - t * 26, { speed: lerp(30, 60, clamp(t / 0.6)), glassOp: 0.3, thrust: 1 });
    seat(you, 0, { sq: 0.3, wide: 0.6, brow: 0.8, open: 0.4 });
    inCar([0.15, 1.08, 0.1], [0.05, 0.92, 0.54], 40);
  });
  add(12.6, 13.77, (t, T) => {
    light({ at: V3(0, 1, -40) }); carAt(0, -40 - t * 26, { speed: 60, glassOp: 0.3 });
    seat(you, 0, { sq: 0.5 + 0.1 * Math.sin(T * 30), lids: 0.6, brow: -0.4, open: 0.15, headPitch: -0.3 });
    inCar([-0.38, 1.0, 0.48], [-0.42, 0.92, -0.3], 44, wob(T, 0.03, 8));
  });
  // ===== 13.77 "Almost three G's. About double what astronauts feel at liftoff." — a race: rocket vs the car
  add(13.77, 17.89, (t, T) => {
    light({ at: V3(300 - 6, 2, 0), fog: false, hemi: 0.8 });
    rocket.visible = true; const ry = 0.5 * 1.3 * 9.8 * 0.08 * t * t; rocket.position.set(-6, ry, -2); rflame.scale.setScalar(1 + 0.15 * Math.sin(T * 30));
    const cz = 0.5 * 2.7 * 9.8 * 0.08 * t * t; car.root.visible = true; car.root.position.set(300 - 1.5, 0, -cz); car.root.rotation.set(0, Math.PI, 0); car.set({ thrust: 1, roll: cz * 3, speed: Math.min(60, t * 60) });
    puff(V3(300 - 6, 0.1, -2), t, 0.2, 1.4);
    shot([300 + 6, 3.0, 10 - t * 0.5], [300 - 4, 2.4, -2 - cz * 0.3], 44);
  });
  // ===== 17.89 "No tire can grip that hard. So it cheats, with thrusters." — tyre spinning in smoke; then the nozzles light
  add(17.89, 19.5, (t, T) => {
    light({ at: V3(0, 1, -50) }); carAt(0, -50, { roll: T * 60, speed: 0 });
    const wp = W(V3(0.93, 0.3, -1.38)); puff(W(V3(1.1, 0.1, -1.6)), t, -1);
    aim(cam, W(V3(3.2, 0.7, -2.6)), wp, 38, wob(T, 0.02, 9));
  });
  add(19.5, 21.35, (t, T) => {
    light({ at: V3(0, 1, -50) }); carAt(0, -50 - ei(clamp((t - 0.5) / 0.8)) * 6, { thrust: eo(clamp((t - 0.4) / 0.15)), speed: 0 });
    aim(cam, W(V3(1.6, 0.55, -7.5)), W(V3(0, 0.4, -2.2)), 40);
  });
  // ===== 21.35 "Cold gas blasts out the back, like letting go of a balloon." — action/reaction arrows; the balloon zips away
  add(21.35, 22.85, (t, T) => {
    light({ at: V3(300, 1, 6), fog: false, hemi: 0.8 }); car.root.visible = true; car.root.position.set(300 - t * 1.4, 0.1, 6); car.root.rotation.set(0, -Math.PI / 2, 0); car.set({ thrust: 1 });
    aGas.set(V3(300 - t * 1.4 + 2.5, 0.6, 6), V3(1, 0, 0), 1.8, eo(clamp(t / 0.3)), 0.35); aGo.set(V3(300 - t * 1.4 - 2.6, 0.6, 6), V3(-1, 0, 0), 1.8, eo(clamp((t - 0.35) / 0.3)), 0.35);
    shot([300 - t * 1.4, 1.8, 14], [300 - t * 1.4, 0.8, 6], 40);
  });
  add(22.85, 24.86, (t, T) => {
    light({ at: V3(310, 2, 0), fog: false, hemi: 0.9 }); balloon.visible = true;
    const u = clamp(t / 1.6), x = 10 - u * 9 + 0.5 * Math.sin(u * 14), y = 2 + 1.5 * u + 0.6 * Math.sin(u * 9);
    balloon.position.set(x, y, 0); balloon.rotation.z = -1.2 + 0.4 * Math.sin(u * 12); balloon.scale.setScalar(1 - u * 0.5);
    puff(V3(300 + x + 0.6, y - 0.4, 0), t * 1.5, 0.2, 0.6);
    shot([310 - 4, 2.4, 9], [300 + x, y, 0], 40);
  });
  // ===== 24.86 "But the ghost is gaining. So you aim for the ramp."
  add(24.86, 26.1, (t, T) => {
    light({ at: V3(0, 1, -40) }); const z = -38 - t * 12; carAt(0, z, { speed: 60, thrust: 0.6 });
    gh.root.visible = true; gh.root.position.set(0.6 * Math.sin(T * 3), 1.0 + 0.3 * Math.sin(T * 5), z + 6 - t * 2.5); gh.root.rotation.set(-0.5, Math.PI, 0); gh.pose({ T, armL: [2.8, 0.2, 0], armR: [2.8, 0.2, 0], open: 0.7, wide: 1, brow: -0.8, smile: -0.5 }); gh.setFade(0.85);
    speedLines(V3(0, 0, z), T, 0.6);
    shot([1.8, 1.8, z + 11], [0, 1, z - 2], 42);
  });
  add(26.1, 27.59, (t, T) => {
    light({ at: V3(0, 3, RZ + 6) }); const z = RZ + 22 - t * 14; carAt(0, z, { speed: 60, thrust: 0.6 });
    speedLines(V3(0, 0, z), T, 0.6);
    shot([0.9, 1.1, z + 5], [0, 4, RZ - 2], 44);
  });
  // ===== 27.59 "On a curve, the car wants to fly straight. So it presses into the track." — lab side view, arrows
  add(27.59, 31.46, (t, T) => {
    light({ at: V3(300, 4, 0), fog: false, hemi: 0.85 }); ramp2.visible = true;
    const a = 0.32 + 0.06 * Math.sin(t * 0.6), p = rampAt(a, R);
    car.root.visible = true; car.root.position.set(300, p.y, p.z); car.root.rotation.set(p.ang, Math.PI, 0); car.set({ roll: T * 20, speed: 30 });
    const c = V3(300, p.y, p.z), tan = V3(0, Math.sin(p.ang), -Math.cos(p.ang)), toC = V3(0, Math.cos(p.ang), Math.sin(p.ang));
    aStr.set(c.clone().addScaledVector(toC, 1.3), tan, 3.0, eo(clamp((t - 0.6) / 0.4)), 0.4);
    aIn.set(c.clone().addScaledVector(toC, 4.2), toC.clone().negate(), 2.4, eo(clamp((t - 2.4) / 0.4)), 0.5);
    shot([300 + 17, 4.4, -2.2], [300, 4.2, -2.4], 42);
  });
  // ===== 31.46 "Even upside down. At the top of a small loop, 20 mph is enough." — over the top, gravity vs the push
  add(31.46, 36.38, (t, T) => {
    light({ at: V3(300, 4, 0), fog: false, hemi: 0.85 }); ramp2.visible = true;
    const a = ATOP - 0.12 + clamp(t / 4.6) * 0.16, p = rampAt(a, R);
    car.root.visible = true; car.root.position.set(300, p.y, p.z); car.root.rotation.set(p.ang, Math.PI, 0); car.set({ roll: T * 12, speed: 20 });
    const c = V3(300, p.y, p.z), toC = V3(0, Math.cos(p.ang), Math.sin(p.ang));
    aIn.set(c.clone().addScaledVector(toC, -1.4), toC.clone(), 1.6, eo(clamp(t / 0.4)), 0.3);
    aG.set(c.clone().add(V3(0, -1.0, 0)), V3(0, -1, 0), 1.4, eo(clamp((t - 0.5) / 0.4)), 0.2);
    shot([300 + 12, 5.5, -1.5], [300, 7.0, -0.8], 40);
  });
  // ===== 36.38 "In 2012, stunt drivers looped two real cars at once." — side-by-side loops
  add(36.38, 40.57, (t, T) => {
    light({ at: V3(270, 4, -10), fog: false, hemi: 0.85 }); loops.forEach((l) => (l.visible = true));
    lc.forEach((c, i) => { const u = ((t * 0.55 + 0.1) % 1.25), a = clamp(u) * Math.PI * 2; c.visible = true; c.position.set(-30 + i * 3.2, 5 - Math.cos(a) * 4.82, -10 - Math.sin(a) * 4.82 + (u > 1 ? -(u - 1) * 30 : 0) - (u < 0 ? 0 : 0)); c.rotation.set(a, Math.PI, 0); });
    shot([300 - 28.4 + 22, 5.5, -10 + 3], [300 - 28.4, 5, -10], 42);
  });
  // ===== 40.57 "So why the thrusters? To launch. Flip. And fly." — real-time stunt, a cut on every word
  add(40.57, 41.76, (t, T) => {
    light({ at: V3(0, 2, RZ + 10) }); stunt(-1.2 + t * 0.6 - 0.4, 0, RZ, { thrust: 0.4 });
    gh.root.visible = true; const cz = car.root.position.z; gh.root.position.set(0.4, 1.2, cz + 5); gh.root.rotation.set(-0.5, Math.PI, 0); gh.pose({ T, armL: [2.8, 0.2, 0], armR: [2.8, 0.2, 0], open: 0.7, wide: 1 }); gh.setFade(0.85);
    speedLines(V3(0, 0, cz), T, 0.7);
    shot([-1.6, 0.8, cz + 7], [0, 1.2, cz - 4], 44);
  });
  add(41.76, 42.32, (t, T) => { // LAUNCH
    light({ ki: 2.4, at: V3(0, 4, RZ) }); stunt(t * 0.62 / 0.56 * 0.55, 0, RZ, { thrust: 1 });
    burst(V3(0, 0.3, RZ), t); shot([6.5, 1.5, RZ + 5], [0, 3.5, RZ - 2], 46, wob(T, 0.02, 8));
  });
  add(42.32, 42.87, (t, T) => { // FLIP
    light({ ki: 2.4, at: V3(0, 8, RZ) }); stunt(0.5 + t * 0.6, 0, RZ, { thrust: 1 });
    const p = car.root.position; shot([5.5, 6.5, RZ + 7], [0, p.y, p.z], 46, -0.1);
  });
  add(42.87, 44.09, (t, T) => { // FLY — barrel roll over the ghost, the graveyard below
    light({ ki: 2.0, at: V3(0, 6, RZ + 12) }); stunt(TUP + 0.05 + t * 1.0, 0, RZ, { thrust: 1 });
    const p = car.root.position;
    gh.root.visible = true; gh.root.position.set(0.4, 1.0, RZ + 12); gh.root.rotation.set(0, Math.PI, 0); gh.pose({ T, armL: [2.4, 0.4, 0], armR: [2.4, 0.4, 0], open: 0.8, wide: 1, lookY: 0.9, headPitch: -0.5 }); gh.setFade(0.8);
    shot([-7.5, 2.2, RZ + 18], [p.x, p.y, p.z], 48);
  });
  // ===== 44.09 "You lost her." / 45.2 "Nice car." / 46.53 "She's in the back seat."
  add(44.09, 45.2, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(0, -6 - t * 8, { speed: 45, glassOp: 0.3, ry: Math.PI });
    seat(you, 0, { smile: 0.8, lids: 0.3, sq: -0.15 * Math.sin(Math.min(t * 3, Math.PI)) });
    inCar([-0.38, 1.0, 0.48], [-0.42, 0.92, -0.3], 46);
  });
  add(45.2, 46.53, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(0, -10 - t * 8, { speed: 45, glassOp: 0.3 });
    seat(you, 0, { smile: 0.6, lids: 0.3 });
    seat(ghBack, 3, { smile: 0.5, open: lip("ghost", T) * 0.6, lids: 0.2, headTilt: 0.2, armL: [0.5, 0.1, 0], armR: [0.5, 0.1, 0] }); ghBack.setFade(0.9);
    inCar([0.0, 1.05, 0.2], [0.36, 0.88, -1.05], 50);
  });
  add(46.53, 47.89, (t, T) => {
    light({ at: V3(0, 1, -6) }); carAt(0, -14 - t * 8, { speed: 45, glassOp: 0.3, pax: t > 0.4 ? 2 : 1, warn: t > 0.4 });
    seat(you, 0, { wide: 1, brow: 1, open: 0.7, smile: -0.6, lookX: 0.6, headYaw: 0.6 * eo(clamp(t / 0.25)) });
    seat(ghBack, 3, { smile: 0.8, lids: 0.1, armR: [2.6, 0.3, 0], elR: 0.4 + 0.4 * Math.abs(Math.sin(T * 6)) }); ghBack.setFade(0.9);
    inCar([-0.15, 1.02, 0.5], [0.1, 0.9, -1.0], 56);
  });
  // ===== 47.89 "Tesla says it ships in 2028. It's missed dates before. Would you ride it?"
  add(47.89, 51.7, (t, T) => {
    light({ at: V3(300, 2, 30), fog: false, hemi: 0.9 }); years.visible = true;
    yr.forEach((p, i) => { const k = back(clamp((i === 4 ? t - 1.4 : t - 2.1 - i * 0.22) / 0.25)); p.position.set(i === 4 ? 0 : -1.3 + (i % 2) * 2.6, i === 4 ? 0.9 : 4.4 - Math.floor(i / 2) * 1.3, 0); p.scale.setScalar(Math.max(0.001, k)); if (i < 4) xs[i].scale.setScalar(Math.max(0.001, back(clamp((t - 2.35 - i * 0.22) / 0.18)))); });
    shot([300, 3.0, 30 + 10.5], [300, 2.9, 30], 44);
  });
  add(51.7, 55.0, (t, T) => {
    light({}); const z = -4 - t * 4; carAt(0, z, { speed: 30, glassOp: 0.45 });
    seat(you, 0, { smile: -0.2, brow: 0.7 });
    seat(ghBack, 3, { smile: 0.9, armR: [2.7, 0.4, 0], elR: 0.4 + 0.4 * Math.abs(Math.sin(T * 6)) }); ghBack.setFade(0.9);
    shot([2.0, 1.6, z - 6 + t * 0.6], [0, 0.9, z], 38);
  });

  const HIDE = [aIn, aStr, aGas, aGo, aG, years, ramp2, rocket, balloon, streaks, ...loops, ...lc];
  return { render(T) {
    TT = T;
    HIDE.forEach((o) => (o.visible = false));
    smoke.forEach((s) => (s.visible = false)); sparks.forEach((s) => (s.visible = false));
    [you, gh, ghBack, kid, kid2].forEach((c) => (c.root.visible = false)); car.root.visible = false;
    tick(T); tick2(T);
    const s = S.find((x) => T >= x.a && T < x.b) || S[S.length - 1];
    s.f(T - s.a, T);
    sky.position.copy(cam.position);
    renderer.render(scene, cam);
  } };
}
