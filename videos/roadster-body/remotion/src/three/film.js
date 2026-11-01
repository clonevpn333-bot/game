// @ts-nocheck
// ROADSTER BODY · "What 0–60 in under a second does to your body". One clay world, every move keyframed with snap easing.
import { THREE, makeRenderer, makeCamera, aim, V3, clamp, lerp, rng } from "./base.js";
import { makeChar, SKIN, clay, glossy, glow, mesh, ball, limb, boxG, cylG } from "./clay.js";
import { tick, halo, fogCard } from "./sets.js";
import { roadster, tick2 } from "./roadster.js";
import { E, K, spring, kick, nightEnv, makeComposer, track, nightSky, cyc, xrayPerson, pilotSeat, carSeat, busOutline, phoneProp, cupProp } from "./kit.js";
import LIPS from "./lips.json";

const blinkAt = (T, seed = 0) => { const p = (T + seed * 1.37) % 3.4; return p < 0.11 ? Math.sin((p / 0.11) * Math.PI) : 0; };
const LAB = 400; // x offset of the cyclorama stage

export function makeFilm(canvas) {
  const { renderer } = makeRenderer(canvas, { exposure: 1.0, shadows: true });
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x05050a, 1);
  const scene = new THREE.Scene();
  scene.environment = nightEnv(renderer); scene.environmentIntensity = 1.0;
  const cam = makeCamera(34);
  const comp = makeComposer(renderer, scene, cam, { strength: 0.6, radius: 0.6, threshold: 0.8 });
  // lights: low-key, coloured — a warm key from the towers, a cool rim, a whisper of fill
  const hemi = new THREE.HemisphereLight(0x5a6aa8, 0x0a0a10, 0.35); scene.add(hemi);
  const key = new THREE.SpotLight(0xffd8a8, 260, 60, 0.55, 0.65, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003; scene.add(key, key.target);
  const rim = new THREE.SpotLight(0x6aa8ff, 200, 50, 0.6, 0.7, 1.6); scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(0x8a7ab8, 0.25); scene.add(fill, fill.target);
  const moon = new THREE.DirectionalLight(0x8aa0e0, 0.0); scene.add(moon, moon.target);

  // ---- sets
  const trk = track(); scene.add(trk);
  const sky = nightSky(); scene.add(sky);
  const fog1 = fogCard(80, 6, 0x6a70a0, 0.22); fog1.position.set(0, 1.5, -60); trk.add(fog1);
  const fog2 = fogCard(120, 8, 0x5a6090, 0.25); fog2.position.set(0, 2, -120); trk.add(fog2);
  const stage = cyc(); stage.position.x = LAB; scene.add(stage);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshBasicMaterial({ color: 0x6fe0ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(scan);
  const scanLine = new THREE.Group(); { const m = glow(0x8fe8ff, 1.6); for (const [w, h, x, y] of [[2.7, 0.02, 0, 0.75], [2.7, 0.02, 0, -0.75], [0.02, 1.5, 1.35, 0], [0.02, 1.5, -1.35, 0]]) { const b = mesh(boxG(w, h, 0.02, 0.005), m, x, y, 0); b.castShadow = false; scanLine.add(b); } } scene.add(scanLine);
  { const g = new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.7, 1.5)); }
  const bus = busOutline(); scene.add(bus);

  // ---- cast
  const car = roadster(0xd8d8d4); scene.add(car.root);
  const cabin = new THREE.PointLight(0xa8c8ff, 0.9, 2.4, 1.6); cabin.position.set(0, 1.0, 0.3); car.body.add(cabin);
  const you = makeChar({ seed: 51, outfit: "hoodie", shirt: 0x2a8a5a, pants: 0x2a2f45, hair: "short", hairColor: 0x3a2418, skin: SKIN.tan, h: 0.6 });
  car.body.add(you.root);
  const phone = phoneProp(), cup = cupProp(); car.body.add(phone, cup);
  const xp = xrayPerson({ seed: 72 }), seatP = carSeat(); scene.add(xp.root, seatP);       // the passenger, x-ray, reclined
  const xpi = xrayPerson({ seed: 73, outfit: "soldier", hair: "helmet" }), seatJ = pilotSeat(); scene.add(xpi.root, seatJ); // the pilot, upright
  const weights = [0, 1, 2].map((i) => { const g = new THREE.Group(); g.add(ball(clay(0xe8d6c0), 0, 0.2, 0, 0.21, 0.2, 0.2)); g.add(mesh(cylG(0.22, 0.22, 0.03, 32), clay(0x2a2a30), 0, 0.02, 0)); scene.add(g); return g; });
  const scale = new THREE.Group(); scale.add(mesh(boxG(0.7, 0.12, 0.7, 0.04), clay(0x2a2c34), 0, 0.06, 0)); scale.add(mesh(cylG(0.05, 0.05, 0.75, 16), clay(0x3a3c44), 0, 0.5, 0)); scale.add(mesh(cylG(0.32, 0.32, 0.05, 32), clay(0xb8bcc8, { rough: 0.25 }), 0, 0.9, 0)); scene.add(scale);
  const smoke = Array.from({ length: 16 }, () => { const s = ball(clay(0x9a9aa8, { transparent: true, opacity: 0.5, unique: true }), 0, 0, 0, 0.3); s.castShadow = false; scene.add(s); return s; });

  // ---- helpers
  let TT = 0;
  const seat = (p = {}) => { const [x, z] = car.seatAt[0]; you.root.visible = true; you.root.position.set(x, 0.05, z + 0.04); you.root.rotation.set(0, 0, 0); you.pose({ T: TT, legL: 1.45, legR: 1.45, kneeL: 1.45, kneeR: 1.45, armL: [1.05, 0.05, 0], armR: [1.05, 0.05, 0], elL: 0.55, elR: 0.55, smile: 0.4, blink: blinkAt(TT, 51), ...p }); };
  const carAt = (z, o = {}) => { car.root.visible = true; car.root.position.set(0, 0, z); car.root.rotation.set(0, Math.PI, 0); car.set({ roll: -z * 2.6, glassOp: 0.9, ...o }); };
  const W = (v) => { car.root.updateMatrixWorld(true); return car.body.localToWorld(V3(...v)); };
  const shot = (pos, look, fov = 34, roll = 0) => aim(cam, V3(...pos), V3(...look), fov, roll);
  const inCar = (from, to, fov = 46, roll = 0) => aim(cam, W(from), W(to), fov, roll);
  const shakeV = (t, ts, amp = 0.04) => { let x = 0, y = 0; ts.forEach((t0) => { x += kick(t, t0, amp, 31, 8); y += kick(t, t0 + 0.03, amp * 0.8, 27, 8); }); return [x, y]; };
  const lightTrack = (cx, cz, o = {}) => { // towers: warm key high + front, cool rim behind
    key.position.set(cx + (o.kx ?? -9), o.ky ?? 13, cz + (o.kz ?? 6)); key.target.position.set(cx, 0.5, cz); key.intensity = (o.ki ?? 260) * 2.2; key.color.set(o.kc ?? 0xffd8a8);
    rim.position.set(cx + (o.rx ?? 8), 6, cz + (o.rz ?? -10)); rim.target.position.set(cx, 0.8, cz); rim.intensity = (o.ri ?? 200) * 1.8;
    fill.position.set(cx + 4, 3, cz + 8); fill.target.position.set(cx, 0.5, cz);
    hemi.intensity = o.hemi ?? 0.6; moon.intensity = 0.7; moon.position.set(cx - 20, 30, cz - 30); moon.target.position.set(cx, 0, cz); renderer.toneMappingExposure = o.exp ?? 1.15; scene.fog = new THREE.FogExp2(0x0c0e1c, o.fd ?? 0.01);
  };
  const lightLab = (cx, o = {}) => {
    key.position.set(LAB + cx - 3, 6, 4); key.target.position.set(LAB + cx, 1, 0); key.intensity = (o.ki ?? 120) * 2; key.color.set(o.kc ?? 0xffe0c0);
    rim.position.set(LAB + cx + 3, 4, -4); rim.target.position.set(LAB + cx, 1.2, 0); rim.intensity = (o.ri ?? 140) * 1.6;
    fill.position.set(LAB + cx, 2, 6); fill.target.position.set(LAB + cx, 1, 0);
    hemi.intensity = 0.45; moon.intensity = 0; renderer.toneMappingExposure = o.exp ?? 1.15; scene.fog = null;
  };
  const puff = (at, t, dir = 1, k = 1) => smoke.forEach((s, i) => { const u = ((t * 0.8 + i / smoke.length) % 1); s.visible = t > 0; s.position.copy(at).add(V3(Math.sin(i * 2.3) * 0.6 * u, 0.15 + u * 0.7, dir * u * 3)); s.scale.setScalar((0.2 + u * 0.7) * k); s.material.opacity = 0.5 * (1 - u); });
  // the real launch: 2.7 G from rest → z(τ) = -½·26.5·τ² for τ ≤ 0.9 s, then 26.8 m/s
  const launchZ = (tau) => (tau <= 0 ? 0 : tau <= 0.9 ? -0.5 * 26.5 * tau * tau : -10.7 - 26.8 * (tau - 0.9));

  const S = [];
  const add = (a, b, f) => S.push({ a, b, f });

  // ===== A 0.0 — FRAME 1: the car is already a blur, ripping past a low camera; whip-pan follows, shake on the pass
  add(0, 1.25, (t, T) => {
    const z = -9 - t * 22; carAt(z, { speed: 60 });
    lightTrack(0, -16, { ki: 320 });
    const passK = E.expoInOut(clamp((t - 0.2) / 0.35)), [sx, sy] = shakeV(t, [0.36], 0.06);
    shot([3.4 + sx, 0.55 + sy, -17], [lerp(0, -0.4, passK), 0.6, lerp(z + 2, z - 1, passK)], 40, -0.04);
  });
  // ===== B 1.25 — inside: snap zoom on your face, cheeks rippling; the screen races 0 → 60
  add(1.25, 3.34, (t, T) => {
    carAt(-40 - t * 27, { speed: K(t, [[0.05, 0], [1.0, 60, "expoOut"]]), glassOp: 0.35 });
    lightTrack(0, -45, { ki: 240 });
    seat({ sq: 0.45 + 0.08 * Math.sin(T * 40), wide: 0.8, brow: 0.9, open: 0.35, headPitch: -0.25, lids: -0.3 });
    const fov = K(t, [[0, 56], [0.16, 34], [1.36, 34], [1.5, 30, "expoOut"]]), [sx, sy] = shakeV(t, [0.0, 1.36], 0.012);
    aim(cam, W([-0.36 + sx, 1.0 + sy, 0.62]), W([-0.42, 0.9, -0.3]), fov, 0.02 * Math.sin(T * 30));
  });
  // ===== C 3.34 — "But what would that do to your body?" REWIND to the start line (expo), hold, then an x-ray scan sweeps the car
  add(3.34, 5.08, (t, T) => {
    const rw = K(t, [[0, 1], [0.55, 0, "expoIn"]]), z = -12 * rw;
    carAt(z, { speed: 0, glassOp: K(t, [[0.8, 0.9], [1.3, 0.2, "expoOut"]]) });
    seat({ smile: 0.3, lookX: 0.3 });
    lightTrack(0, 0, { ki: 280 });
    const sk = clamp((t - 0.7) / 0.7); scan.visible = sk > 0 && sk < 1; scan.position.set(0, 0.9, 2.6 - E.expoInOut(sk) * 5.2); scan.material.opacity = 0.06 * Math.sin(sk * Math.PI); scanLine.visible = scan.visible; scanLine.position.copy(scan.position);
    shot(K(t, [[0, [5.5, 1.6, -9]], [0.55, [4.2, 1.4, 4.4], "expoOut"], [1.74, [3.6, 1.35, 4.0], "quintOut"]]), [0, 0.7, -0.3], 36);
  });
  // ===== D 5.08 — "At launch, you'd feel almost three G's." squat (anticipation) → SNAP off the line, smoke, shake
  add(5.08, 7.38, (t, T) => {
    const tl = 0.95, tau = Math.max(0, t - tl) * 1.0;
    const squat = t < tl ? K(t, [[0.5, 0], [tl, 0.055, E.anticip]]) : 0.055 * (1 - spring(t, tl, 7, 0.4));
    carAt(launchZ(tau), { speed: Math.min(60, tau * 60 / 0.9), tilt: -squat, glassOp: 0.9 });
    seat({ sq: t > tl ? 0.4 : 0 });
    if (t > tl) puff(V3(0, 0.1, launchZ(tau) + 1.6), (t - tl) * 1.2, 1, 1.2);
    lightTrack(0, 0, { ki: 300 });
    const [sx, sy] = shakeV(t, [tl], 0.07);
    const look = t < tl ? [0, 0.6, 0] : [0, 0.6, lerp(0, launchZ(tau), E.expoOut(clamp((t - tl) / 0.35)))];
    shot([-3.4 + sx, 0.35 + sy, -4.6], look, K(t, [[tl, 38], [tl + 0.12, 46, "expoOut"]]), -0.06);
  });
  // ===== E 7.38 — "Your head snaps back." profile: head whips into the rest with overshoot, then HOLDS (float)
  add(7.38, 8.54, (t, T) => {
    carAt(-60 - t * 10, { speed: 30, glassOp: 0.2 });
    lightTrack(0, -60, { ki: 220 });
    const ts = 0.5, hp = -0.6 * spring(t, ts, 6, 0.38);
    seat({ headPitch: hp, sq: 0.3 * spring(t, ts, 6, 0.5), wide: t > ts ? 1 : 0, brow: t > ts ? 1 : 0.2, open: t > ts ? 0.4 : 0 });
    const [sx, sy] = shakeV(t, [ts], 0.015);
    inCar([0.45 + sx, 1.02 + sy, 0.42], [-0.42, 0.95, -0.28], K(t, [[ts, 52], [ts + 0.12, 44, "expoOut"]]));
  });
  // ===== F 8.54 — "11 lb head feels like 33 lb": x-ray, reclined seat on the stage; head weights SLAM onto a scale on the beats
  add(8.54, 12.47, (t, T) => {
    lightLab(0, { ki: 60, ri: 120 }); const cx = LAB;
    seatP.visible = true; seatP.position.set(cx - 0.5, 0, 0); seatP.rotation.y = Math.PI / 2;
    xp.root.visible = true; xp.root.position.set(cx - 0.5, 0.03, 0); xp.root.rotation.y = Math.PI / 2;
    xp.pose({ T, legL: 1.4, legR: 1.4, kneeL: 1.3, kneeR: 1.3, lean: -0.38, headPitch: -0.5, armL: [0.5, 0.1, 0], armR: [0.5, 0.1, 0], elL: 0.4, elR: 0.4, smile: -0.2 });
    xp.drain(0); xp.oxy(0.5); xp.xr.skull.material.opacity = 0.35 + 0.25 * Math.sin(T * 4);
    scale.visible = true; scale.position.set(cx + 0.9, 0, 0.1);
    const drops = [0.26, 2.64, 3.1];
    weights.forEach((w, i) => { const d = t - drops[i]; w.visible = d > -0.05; w.position.set(cx + 0.9 + (i - 1) * 0.0, 0.93 + i * 0.4 + (d < 0 ? 3 : 3 * (1 - E.bounceOut(clamp(d / 0.45)))), 0.1); w.scale.setScalar(1 + kick(t, drops[i] + 0.4, 0.08, 30, 9)); });
    const [sx, sy] = shakeV(t, drops.map((d) => d + 0.42), 0.02);
    shot([cx - 0.05 + sx, 1.5 + sy, K(t, [[0, 6.6], [3.9, 5.8, "quintOut"]])], [cx - 0.05, 1.15, 0], 42);
  });
  // ===== G 12.47 — "Your organs lag behind. Your stomach squishes back toward your spine." — ECU torso, stomach lag + jiggle
  add(12.47, 16.86, (t, T) => {
    lightLab(0, { ki: 60, ri: 150 }); const cx = LAB;
    seatP.visible = true; seatP.position.set(cx - 0.5, 0, 0); seatP.rotation.y = Math.PI / 2;
    xp.root.visible = true; xp.root.position.set(cx - 0.5, 0.03, 0); xp.root.rotation.y = Math.PI / 2;
    xp.pose({ T, legL: 1.4, legR: 1.4, kneeL: 1.3, kneeR: 1.3, lean: -0.38, headPitch: -0.3, armL: [0.5, 0.1, 0], armR: [0.5, 0.1, 0], elL: 0.4, elR: 0.4 });
    const lag = spring(t, 0.7, 4, 0.22), sq = spring(t, 2.2, 6, 0.25);
    xp.xr.stomachG.position.z = 0.05 - 0.06 * lag - 0.03 * sq; xp.xr.stomach.scale.set(0.085 * (1 + 0.25 * sq), 0.065 * (1 + 0.15 * sq), 0.07 * (1 - 0.35 * sq));
    xp.xr.heart.scale.setScalar(0.05 * (1 + 0.12 * Math.abs(Math.sin(T * 7))));
    xp.drain(0); xp.oxy(0.4);
    const p = new THREE.Vector3(); xp.spine.updateWorldMatrix(true, false); xp.spine.localToWorld(p.set(0.04, 0.25, 0.05));
    const fov = K(t, [[0, 40], [0.25, 26, "expoOut"]]);
    aim(cam, p.clone().add(V3(0, 0.12, 1.35)), p, fov);
  });
  // ===== H 16.86 — "Here's the surprise. You won't black out." — back in the car: a blink, then a snapped grin + thumbs up
  add(16.86, 19.11, (t, T) => {
    carAt(-90 - t * 8, { speed: 40, glassOp: 0.3 });
    lightTrack(0, -90, { ki: 220 });
    const up = E.backOut(clamp((t - 1.15) / 0.22));
    seat({ smile: lerp(0.1, 1, up), wide: 0.3 * up, brow: 0.5 * up, blink: t > 0.5 && t < 0.62 ? 1 : 0, armR: [lerp(1.05, 1.6, up), lerp(0.05, 0.5, up), 0], elR: lerp(0.55, 1.7, up) });
    inCar([-0.3, 1.02, 0.55], [-0.42, 0.92, -0.3], K(t, [[1.1, 44], [1.3, 38, "expoOut"]]));
  });
  // ===== I 19.11 — fighter pilot, upright: blood drains to the feet on "drains down", the brain goes dark (tunnel vision in overlay)
  add(19.11, 23.2, (t, T) => {
    lightLab(-2.2, { ki: 120, kc: 0xb8c8ff }); const cx = LAB - 2.2;
    seatJ.visible = true; seatJ.position.set(cx, 0, 0); seatJ.rotation.y = 0.5;
    xpi.root.visible = true; xpi.root.position.set(cx, 0.08, -0.05); xpi.root.rotation.y = 0.5;
    xpi.pose({ T, legL: 1.5, legR: 1.5, kneeL: 1.4, kneeR: 1.4, armL: [0.9, 0.15, 0], armR: [0.9, 0.15, 0], elL: 0.8, elR: 0.8, headPitch: K(t, [[2.0, 0], [3.4, 0.35, "expoIn"]]) });
    const dr = K(t, [[1.65, 0], [3.4, 1, "expoInOut"]]); xpi.drain(dr); xpi.oxy(0.7 * (1 - dr));
    shot([cx + K(t, [[0, 2.6], [4.0, 2.1, "quintOut"]]), 1.5, 3.6], [cx, 1.2, 0], 36);
  });
  // ===== J 23.2 — "But sitting back, your blood stays level with your head." whip across to the reclined passenger; brain lights up on "oxygen"
  add(23.2, 28.51, (t, T) => {
    lightLab(0, { ki: 70 });
    seatJ.visible = true; seatJ.position.set(LAB - 2.2, 0, 0); seatJ.rotation.y = 0.5;
    xpi.root.visible = true; xpi.root.position.set(LAB - 2.2, 0.08, -0.05); xpi.root.rotation.y = 0.5;
    xpi.pose({ T, legL: 1.5, legR: 1.5, kneeL: 1.4, kneeR: 1.4, armL: [0.9, 0.15, 0], armR: [0.9, 0.15, 0], elL: 0.8, elR: 0.8, headPitch: 0.35 }); xpi.drain(1); xpi.oxy(0);
    seatP.visible = true; seatP.position.set(LAB + 1.6, 0, 0); seatP.rotation.y = Math.PI / 2;
    xp.root.visible = true; xp.root.position.set(LAB + 1.6, 0.03, 0); xp.root.rotation.y = Math.PI / 2;
    xp.pose({ T, legL: 1.4, legR: 1.4, kneeL: 1.3, kneeR: 1.3, lean: -0.38, headPitch: -0.2, armL: [0.5, 0.1, 0], armR: [0.5, 0.1, 0], elL: 0.4, elR: 0.4, smile: 0.5 });
    xp.drain(0); xp.oxy(K(t, [[3.9, 0.3], [4.25, 1.0, E.backOut]]));
    const w = E.expoInOut(clamp(t / 0.55)), cx = lerp(LAB - 2.2, LAB + 1.3, w);
    shot([cx + 0.4, 1.5, K(t, [[0, 3.6], [0.55, 3.9, "expoOut"], [5.3, 3.4, "quintOut"]])], [cx, 1.2, 0], 38);
  });
  // ===== K 28.51 — "Less than a second later, you're at sixty… about forty feet. One city bus." top-down: SNAP to 12 m, hold; the bus pops in
  add(28.51, 33.74, (t, T) => {
    const tau = K(t, [[0.6, 0], [1.95, 0.9, "expoOut"]]); const z = launchZ(tau);
    carAt(z, { speed: tau / 0.9 * 60, glassOp: 0.9 });
    lightTrack(0, -6, { ki: 320, kx: -6, ky: 16, kz: 2 });
    const bk = E.backOut(clamp((t - 2.86) / 0.35)); bus.visible = bk > 0.01; bus.position.set(2.4, 0, -6.1); bus.scale.set(1, Math.max(0.01, bk), Math.max(0.01, K(t, [[2.86, 0.02], [3.6, 1, "expoOut"]])));
    bus.userData.edges.material.opacity = 0.95;
    shot([K(t, [[0, 4], [1.95, 1.6, "quintOut"]]), K(t, [[0, 8], [1.95, 17, "quintOut"]]), K(t, [[0, 3], [1.95, -1.0, "quintOut"]])], [1.0, 0, K(t, [[0, -2], [1.95, -6.4, "quintOut"]])], 46);
  });
  // ===== L 33.74 — "The scary part isn't going. It's stopping." cruising → SLAM the brakes (nose dives, overshoot) → loose things float… then snap
  add(33.74, 35.95, (t, T) => {
    const tb = 1.87, z = t < tb ? -120 - t * 26 : -120 - tb * 26 - 4 * E.expoOut(clamp((t - tb) / 0.5));
    const dive = t > tb ? 0.07 * (spring(t, tb, 5, 0.3) - 0.0) : 0;
    carAt(z, { speed: t < tb ? 60 : 60 * (1 - E.expoOut(clamp((t - tb) / 0.5))), tilt: dive, glassOp: 0.9 });
    lightTrack(0, z, { ki: 260 });
    const [sx, sy] = shakeV(t, [tb], 0.05);
    shot([3.6 + sx, 0.7 + sy, z + 2.6], [0, 0.6, z], 38);
  });
  add(35.95, 38.87, (t, T) => {
    carAt(-170, { speed: 0, glassOp: 0.25 });
    lightTrack(0, -170, { ki: 220 });
    const fly = (t0, t1, a, b, u = t) => { const k = clamp((u - t0) / (t1 - t0)); const f = k < 0.7 ? 0.25 * E.expoOut(k / 0.7) : 0.25 + 0.75 * E.expoIn((k - 0.7) / 0.3); return a.map((v, i) => lerp(v, b[i], f)); };
    const hit = 1.42;
    const pp = fly(0.0, hit, [0.0, 0.6, -0.35], [0.05, 0.86, 0.6]); phone.visible = true; phone.position.set(...pp); phone.rotation.set(t * 6, t * 3.5, t * 2);
    const cp = fly(0.1, hit + 0.06, [0.25, 0.52, -0.4], [0.3, 0.8, 0.62]); cup.visible = true; cup.position.set(...cp); cup.rotation.set(t * 4, 0, t * 3);
    seat({ lean: 0.35 * spring(t, 0.0, 3, 0.3), headPitch: 0.25 * spring(t, 0.0, 3, 0.3), wide: 1, brow: 1, open: t > hit ? 0.6 : 0.2 });
    const [sx, sy] = shakeV(t, [hit + 0.02], 0.02);
    inCar([0.02 + sx, 1.14 + sy, -1.35], [0.05, 0.8, 0.4], K(t, [[hit, 52], [hit + 0.1, 44, "expoOut"]]));
  });
  // ===== M 38.87 — "Would your neck survive?" — hero: the car under a light tower, you rubbing your neck
  add(38.87, 43.0, (t, T) => {
    carAt(-170, { speed: 0, glassOp: 0.4 });
    lightTrack(0, -170, { ki: 300, kx: -5, ky: 14, kz: 3 });
    seat({ armL: [2.5, -0.1, 0], elL: 2.3, headTilt: 0.25 + 0.1 * Math.sin(T * 3), smile: -0.3, lids: 0.3, brow: 0.6 });
    const o = K(t, [[0, 0], [4.1, 1, "quintOut"]]);
    shot([lerp(4.6, 3.2, o), lerp(1.0, 1.5, o), -170 + lerp(4.2, 5.4, o)], [0, 0.75, -170.2], 36);
  });

  const HIDE = [scan, scanLine, bus, seatP, seatJ, xp.root, xpi.root, scale, ...weights];
  return { render(T) {
    TT = T;
    HIDE.forEach((o) => (o.visible = false)); smoke.forEach((s) => (s.visible = false));
    you.root.visible = false; car.root.visible = false; phone.visible = false; cup.visible = false;
    tick(T); tick2(T);
    const s = S.find((x) => T >= x.a && T < x.b) || S[S.length - 1];
    s.f(T - s.a, T);
    sky.position.copy(cam.position);
    comp.render();
  } };
}
